import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";
import { enhanceEmail } from "@/lib/email-enhancement";
import { updateProgress } from "./progress/route";
import { join } from "path";
import { getServerSession } from "next-auth/next";

// Function to fetch the default email template
async function getDefaultTemplate() {
  try {
    const result = await query(
      `SELECT id, name, subject, body, variables 
       FROM email_templates 
       WHERE id = 1`
    );

    if (result.rows.length === 0) {
      // Return fallback template if database template not found
      return {
        id: 1,
        name: "Default Application Template",
        subject: "Application for [Role] at [CompanyName]",
        body: `Hi [RecruiterName],

I hope you're doing well. I recently came across [CompanyName] and found the opportunity for a [Role] very interesting.

I'm reaching out to express my interest in the [Role] position. With experience in relevant domain/skills, I believe I can contribute meaningfully to your team.

I've attached my resume for your reference and would love to connect if the opportunity is still open in [CompanyName].

Thank you for your time,
Your Name`,
        variables: ["Role", "CompanyName", "RecruiterName"],
      };
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching template:", error);
    // Return fallback template on error
    return {
      id: 1,
      name: "Default Application Template",
      subject: "Application for [Role] at [CompanyName]",
      body: `Hi [RecruiterName],

I hope you're doing well. I recently came across [CompanyName] and found the opportunity for a [Role] very interesting.

I'm reaching out to express my interest in the [Role] position. With experience in relevant domain/skills, I believe I can contribute meaningfully to your team.

I've attached my resume for your reference and would love to connect if the opportunity is still open in [CompanyName].

Thank you for your time,
Your Name`,
      variables: ["Role", "CompanyName", "RecruiterName"],
    };
  }
}

// Utility function to estimate time remaining
function estimateTimeRemaining(
  completed: number,
  total: number,
  startTime: number
): string {
  if (completed === 0) return "Calculating...";

  const elapsed = Date.now() - startTime;
  const avgTimePerEmail = elapsed / completed;
  const remaining = (total - completed) * avgTimePerEmail;

  if (remaining < 60000) {
    return `~${Math.round(remaining / 1000)} seconds remaining`;
  } else {
    return `~${Math.round(remaining / 60000)} minutes remaining`;
  }
}

// POST - Send emails to contacts using efficient template approach with real-time progress tracking
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user ID
    const userResult = await query("SELECT id FROM users WHERE email = $1", [
      session.user.email,
    ]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    const {
      contactIds,
      useAiCustomization = false,
      sessionId,
      attachmentIds = [],
    } = await request.json();

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: "Contact IDs required" },
        { status: 400 }
      );
    }

    // Generate session ID if not provided
    const campaignSessionId =
      sessionId ||
      `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get user's SMTP configuration from database (try Gmail first, then Other)
    let smtpConfigResult = await query(
      "SELECT * FROM smtp_config WHERE user_id = $1 AND provider_type = 'gmail' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    // If no Gmail config, try Other provider
    if (smtpConfigResult.rows.length === 0) {
      smtpConfigResult = await query(
        "SELECT * FROM smtp_config WHERE user_id = $1 AND provider_type = 'other' ORDER BY created_at DESC LIMIT 1",
        [userId]
      );
    }

    if (smtpConfigResult.rows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Email configuration not found. Please configure your email settings in the Email Setup section.",
        },
        { status: 400 }
      );
    }

    const smtpConfig = smtpConfigResult.rows[0];

    // Get the default template from database (user-scoped)
    const templateResult = await query(
      "SELECT * FROM email_templates WHERE user_id = $1 AND is_default = true ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (templateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "No default email template found for this user" },
        { status: 400 }
      );
    }

    const emailTemplate = templateResult.rows[0];

    // Get contacts (user-scoped)
    const contactsResult = await query(
      "SELECT * FROM contacts WHERE id = ANY($1) AND user_id = $2",
      [contactIds, userId]
    );

    // Get attachments if provided (user-scoped)
    let attachments: any[] = [];
    if (attachmentIds.length > 0) {
      const attachmentsResult = await query(
        "SELECT * FROM attachments WHERE id = ANY($1) AND user_id = $2 AND is_active = true",
        [attachmentIds, userId]
      );
      attachments = attachmentsResult.rows;

      console.log(`📎 ${attachments.length} attachment(s) will be included`);
      for (const attachment of attachments) {
        console.log(
          `   - ${attachment.name} (${Math.round(
            attachment.file_size / 1024
          )} KB)`
        );
      }
    }

    if (contactsResult.rows.length === 0) {
      return NextResponse.json({ error: "No contacts found" }, { status: 400 });
    }

    const totalContacts = contactsResult.rows.length;
    const emailResults = [];
    let aiUsageCount = 0;
    let skippedCount = 0;
    // AI enhancement is mandatory - emails are only sent if AI enhancement succeeds
    const startTime = Date.now();
    let aiQuotaExhausted = false; // Track if we've hit daily/rate limits

    // Initialize progress tracking
    updateProgress(campaignSessionId, {
      type: "progress",
      progress: 0,
      currentEmail: "Starting campaign...",
      sent: 0,
      failed: 0,
      skipped: 0,
      total: totalContacts,
      aiEnhanced: 0,
      estimatedTimeRemaining: "Calculating...",
      logs: [`🚀 Starting bulk email campaign for ${totalContacts} contacts`],
      completed: false,
    });

    // Small delay to ensure SSE connection is established
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log(
      `\n🚀 Starting bulk email campaign for ${totalContacts} contacts`
    );
    console.log(`📧 Template: ${emailTemplate.name}`);
    console.log(
      `🤖 AI Enhancement: ${
        useAiCustomization
          ? `MANDATORY - emails only sent if AI succeeds`
          : "Disabled"
      }`
    );

    if (useAiCustomization) {
      // Log API key status at campaign start
      const { groqKeyManager } = await import("@/lib/groq-key-manager");
      const keyStats = await groqKeyManager.getKeyStats();
      console.log(`🔑 API Key Status:`);
      console.log(
        `   📊 Total Keys: ${keyStats.totalKeys} | Active: ${keyStats.activeKeys} | Rate Limited: ${keyStats.rateLimitedKeys}`
      );
      console.log(
        `   📈 Daily Capacity: ${keyStats.usedToday}/${keyStats.totalDailyCapacity} requests used`
      );
      console.log(
        `   🎯 Available today: ${
          keyStats.totalDailyCapacity - keyStats.usedToday
        } requests`
      );

      // Add key info to progress logs
      updateProgress(campaignSessionId, {
        type: "progress",
        progress: 0,
        currentEmail: "Initializing API keys...",
        sent: 0,
        failed: 0,
        skipped: 0,
        total: totalContacts,
        aiEnhanced: 0,
        estimatedTimeRemaining: "Calculating...",
        logs: [
          `🚀 Starting bulk email campaign for ${totalContacts} contacts`,
          `🔑 ${keyStats.activeKeys} API keys available (${
            keyStats.totalDailyCapacity - keyStats.usedToday
          } requests remaining today)`,
          keyStats.rateLimitedKeys > 0
            ? `⚠️ ${keyStats.rateLimitedKeys} keys currently rate limited`
            : `✅ All keys ready for use`,
        ],
        completed: false,
      });
    }

    console.log(`⏰ Started at: ${new Date().toLocaleTimeString()}\n`);

    // Process each contact
    for (let i = 0; i < contactsResult.rows.length; i++) {
      const contact = contactsResult.rows[i];
      const currentIndex = i + 1;
      const progressPercent = Math.round((currentIndex / totalContacts) * 100);

      console.log(
        `📤 [${currentIndex}/${totalContacts}] Processing ${contact.email} (${progressPercent}%)`
      );

      // Update real-time progress
      let currentLogs = [
        `📤 [${currentIndex}/${totalContacts}] Processing ${contact.email} (${progressPercent}%)`,
      ];

      updateProgress(campaignSessionId, {
        type: "progress",
        progress: Math.round(((currentIndex - 1) / totalContacts) * 100),
        currentEmail: `Processing ${contact.email}...`,
        sent: emailResults.filter((r) => r.status === "sent").length,
        failed: emailResults.filter((r) => r.status === "failed").length,
        skipped: skippedCount,
        total: totalContacts,
        aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
        estimatedTimeRemaining: estimateTimeRemaining(
          currentIndex - 1,
          totalContacts,
          startTime
        ),
        logs: currentLogs,
        completed: false,
      });

      // Initialize variables outside try block
      let personalizedSubject = emailTemplate.subject;
      let personalizedBody = emailTemplate.body;

      try {
        // Replace template variables with contact data
        const role = contact.role || "Software Developer";
        const companyName = contact.company_name || "your company";
        const recruiterName = contact.recruiter_name || contact.name || "there";

        personalizedSubject = emailTemplate.subject
          .replace(/\[Role\]/g, role)
          .replace(/\[CompanyName\]/g, companyName);

        personalizedBody = emailTemplate.body
          .replace(/\[Role\]/g, role)
          .replace(/\[CompanyName\]/g, companyName)
          .replace(/\[RecruiterName\]/g, recruiterName);

        // AI enhancement is mandatory when enabled - skip email if AI fails
        let aiEnhanced = false;
        let shouldSendEmail = true; // Flag to determine if email should be sent

        if (useAiCustomization) {
          // If quota is exhausted, skip remaining emails
          if (aiQuotaExhausted) {
            console.log(`   🚫 Skipping ${contact.email} - AI quota exhausted`);
            skippedCount++;
            shouldSendEmail = false;

            emailResults.push({
              contact: contact.email,
              status: "skipped",
              reason: "AI quota exhausted",
              aiEnhanced: false,
            });

            updateProgress(campaignSessionId, {
              type: "progress",
              progress: Math.round((currentIndex / totalContacts) * 100),
              currentEmail: `⏭️ Skipped: ${contact.email} (AI quota exhausted)`,
              sent: emailResults.filter((r) => r.status === "sent").length,
              failed: emailResults.filter((r) => r.status === "failed").length,
              skipped: skippedCount,
              total: totalContacts,
              aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
              estimatedTimeRemaining: estimateTimeRemaining(
                currentIndex,
                totalContacts,
                startTime
              ),
              logs: [...currentLogs, `   🚫 Skipped - AI quota exhausted`],
              completed: false,
            });
          } else {
            // Try AI enhancement
            try {
              console.log(
                `🤖 Starting AI enhancement for ${contact.name} (${contact.email})...`
              );

              // Log which key will be used (before the call)
              const { groqKeyManager } = await import("@/lib/groq-key-manager");
              const selectedKey = await groqKeyManager.getAvailableKey();

              if (!selectedKey) {
                console.log(
                  `❌ No API keys available - skipping ${contact.name}`
                );
                updateProgress(campaignSessionId, {
                  type: "progress",
                  progress: Math.round((i / totalContacts) * 100),
                  currentEmail: `Skipped: ${contact.name} (no API keys)`,
                  sent: emailResults.filter((r) => r.status === "sent").length,
                  failed: emailResults.filter((r) => r.status === "failed")
                    .length,
                  skipped: skippedCount + 1,
                  total: totalContacts,
                  aiEnhanced: aiEnhanced,
                  estimatedTimeRemaining: estimateTimeRemaining(
                    startTime,
                    i,
                    totalContacts
                  ),
                  logs: currentLogs
                    .slice(-4)
                    .concat([
                      `❌ Skipped ${contact.name} - No API keys available`,
                      `📊 Total skipped due to rate limits: ${
                        skippedCount + 1
                      }`,
                    ]),
                  completed: false,
                });
                skippedCount++;
                continue;
              }

              const enhancementResult = await enhanceEmail({
                subject: personalizedSubject,
                body: personalizedBody,
                companyName,
                position: role,
                recruiterName,
                useAi: true,
                userId: userId,
              });

              if (enhancementResult.aiEnhanced) {
                personalizedSubject = enhancementResult.subject;
                personalizedBody = enhancementResult.body;
                aiUsageCount++;
                aiEnhanced = true;
                console.log(`✅ AI enhancement completed for ${contact.name}`);
                console.log(`   📝 Subject: "${personalizedSubject}"`);

                // Update progress with key rotation info
                currentLogs = currentLogs
                  .slice(-4)
                  .concat([
                    `✅ AI enhanced email for ${contact.name}`,
                    `🎯 Key rotation working smoothly`,
                    `📈 AI Success Rate: ${Math.round(
                      (aiUsageCount / (i + 1)) * 100
                    )}%`,
                  ]);
              } else {
                console.log(
                  `❌ AI enhancement failed for ${contact.name} - ${
                    enhancementResult.error || "Unknown error"
                  }`
                );

                currentLogs = currentLogs
                  .slice(-4)
                  .concat([
                    `❌ Skipped ${contact.name} - AI enhancement failed`,
                    `🔧 Reason: ${enhancementResult.error || "Unknown error"}`,
                    `📊 Skipped count: ${skippedCount + 1}`,
                  ]);

                updateProgress(campaignSessionId, {
                  type: "progress",
                  progress: Math.round((i / totalContacts) * 100),
                  currentEmail: `Skipped: ${contact.name} (AI failed)`,
                  sent: emailResults.filter((r) => r.status === "sent").length,
                  failed: emailResults.filter((r) => r.status === "failed")
                    .length,
                  skipped: skippedCount + 1,
                  total: totalContacts,
                  aiEnhanced: aiEnhanced,
                  estimatedTimeRemaining: estimateTimeRemaining(
                    startTime,
                    i,
                    totalContacts
                  ),
                  logs: currentLogs,
                  completed: false,
                });
                skippedCount++;
                continue;
              }
            } catch (error) {
              console.error(
                `💥 AI enhancement error for ${contact.name}:`,
                error
              );

              currentLogs = currentLogs
                .slice(-4)
                .concat([
                  `💥 Error enhancing ${contact.name}`,
                  `🔧 Error: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`,
                  `📊 Skipped count: ${skippedCount + 1}`,
                ]);

              updateProgress(campaignSessionId, {
                type: "progress",
                progress: Math.round((i / totalContacts) * 100),
                currentEmail: `Skipped: ${contact.name} (AI error)`,
                sent: emailResults.filter((r) => r.status === "sent").length,
                failed: emailResults.filter((r) => r.status === "failed")
                  .length,
                skipped: skippedCount + 1,
                total: totalContacts,
                aiEnhanced: aiEnhanced,
                estimatedTimeRemaining: estimateTimeRemaining(
                  startTime,
                  i,
                  totalContacts
                ),
                logs: currentLogs,
                completed: false,
              });
              skippedCount++;
              continue;
            }
          }
        } else if (!useAiCustomization) {
          // AI is disabled, send with template personalization only
          console.log(`   📋 Using template personalization (AI disabled)`);
        } else {
          // No API key
          console.log(`   ⚠️ No Groq API key found, using template only`);
        }

        // Only send email if AI succeeded (when AI is enabled) or AI is disabled
        if (shouldSendEmail) {
          // Send email using environment variables
          console.log(
            `   📨 Sending email${
              attachments.length > 0
                ? ` with ${attachments.length} attachment(s)`
                : ""
            }...`
          );

          updateProgress(campaignSessionId, {
            type: "progress",
            progress: Math.round(((currentIndex - 0.2) / totalContacts) * 100),
            currentEmail: `Sending to ${contact.email}${
              attachments.length > 0
                ? ` with ${attachments.length} attachment(s)`
                : ""
            }...`,
            sent: emailResults.filter((r) => r.status === "sent").length,
            failed: emailResults.filter((r) => r.status === "failed").length,
            skipped: skippedCount,
            total: totalContacts,
            aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
            estimatedTimeRemaining: estimateTimeRemaining(
              currentIndex - 1,
              totalContacts,
              startTime
            ),
            logs: [
              ...currentLogs,
              `   📨 Sending email${
                attachments.length > 0
                  ? ` with ${attachments.length} attachment(s)`
                  : ""
              }...`,
            ],
            completed: false,
          });

          // Prepare attachments for nodemailer
          const mailAttachments = attachments.map((attachment) => ({
            filename: attachment.original_name,
            path: join(process.cwd(), "uploads", attachment.file_path),
            contentType: attachment.mime_type,
          }));

          const mailOptions = {
            from: `"${smtpConfig.email.split("@")[0]}" <${smtpConfig.email}>`,
            to: contact.email,
            subject: personalizedSubject,
            text: personalizedBody,
            html: personalizedBody.replace(/\n/g, "<br>"),
            attachments: mailAttachments,
          };

          await nodemailer
            .createTransport({
              host: smtpConfig.smtp_host,
              port: smtpConfig.smtp_port,
              secure: smtpConfig.smtp_port === 465, // true for 465, false for other ports like 587
              auth: {
                user: smtpConfig.email,
                pass: smtpConfig.app_password,
              },
              // Enable STARTTLS for port 587 (Gmail default)
              requireTLS: smtpConfig.smtp_port === 587,
              tls: {
                // Allow less secure TLS configurations if needed
                rejectUnauthorized: false,
              },
            })
            .sendMail(mailOptions);

          // Log successful send
          const emailSendResult = await query(
            `INSERT INTO email_sends (user_id, contact_id, subject, body, status, sent_at) 
             VALUES ($1, $2, $3, $4, 'sent', CURRENT_TIMESTAMP) RETURNING id`,
            [userId, contact.id, personalizedSubject, personalizedBody]
          );

          // Record attachments if any
          if (attachments.length > 0 && emailSendResult.rows[0]) {
            const emailSendId = emailSendResult.rows[0].id;

            // Insert into email_attachments junction table
            for (const attachment of attachments) {
              await query(
                `INSERT INTO email_attachments (email_send_id, attachment_id) 
                 VALUES ($1, $2)`,
                [emailSendId, attachment.id]
              );
            }
          }

          console.log(`   ✅ Email sent successfully`);

          emailResults.push({
            contact: contact.email,
            status: "sent",
            subject: personalizedSubject,
            aiEnhanced: aiEnhanced,
          });

          // Update progress after successful send
          updateProgress(campaignSessionId, {
            type: "progress",
            progress: Math.round((currentIndex / totalContacts) * 100),
            currentEmail: `✅ Sent to ${contact.email}`,
            sent: emailResults.filter((r) => r.status === "sent").length,
            failed: emailResults.filter((r) => r.status === "failed").length,
            skipped: skippedCount,
            total: totalContacts,
            aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
            estimatedTimeRemaining: estimateTimeRemaining(
              currentIndex,
              totalContacts,
              startTime
            ),
            logs: [...currentLogs, `   ✅ Email sent successfully`],
            completed: false,
          });

          // Add small delay to avoid overwhelming the SMTP server
          if (currentIndex < totalContacts) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
          }

          // Log progress every 5 emails or at milestones
          if (currentIndex % 5 === 0 || currentIndex === totalContacts) {
            const timeEstimate = estimateTimeRemaining(
              currentIndex,
              totalContacts,
              startTime
            );
            console.log(
              `\n📊 Progress Update: ${currentIndex}/${totalContacts} emails sent (${progressPercent}%)`
            );
            console.log(`⏱️ ${timeEstimate}`);
            console.log(
              `🤖 AI Enhanced: ${
                emailResults.filter((r) => r.aiEnhanced).length
              } emails\n`
            );
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.log(`   ❌ Failed to send: ${errorMessage}`);

        // Log failed send
        await query(
          `INSERT INTO email_sends (user_id, contact_id, subject, body, status, error_message) 
           VALUES ($1, $2, $3, $4, 'failed', $5)`,
          [
            userId,
            contact.id,
            personalizedSubject,
            personalizedBody,
            errorMessage,
          ]
        );

        emailResults.push({
          contact: contact.email,
          status: "failed",
          error: errorMessage,
          aiEnhanced: false,
        });

        // Update progress after failed send
        updateProgress(campaignSessionId, {
          type: "progress",
          progress: Math.round((currentIndex / totalContacts) * 100),
          currentEmail: `❌ Failed: ${contact.email}`,
          sent: emailResults.filter((r) => r.status === "sent").length,
          failed: emailResults.filter((r) => r.status === "failed").length,
          skipped: skippedCount,
          total: totalContacts,
          aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
          estimatedTimeRemaining: estimateTimeRemaining(
            currentIndex,
            totalContacts,
            startTime
          ),
          logs: [...currentLogs, `   ❌ Failed to send: ${errorMessage}`],
          completed: false,
        });
      }
    }

    // Final completion update
    const finalSent = emailResults.filter((r) => r.status === "sent").length;
    const finalFailed = emailResults.filter(
      (r) => r.status === "failed"
    ).length;
    const finalSkipped = emailResults.filter(
      (r) => r.status === "skipped"
    ).length;
    const finalAiEnhanced = emailResults.filter((r) => r.aiEnhanced).length;

    updateProgress(campaignSessionId, {
      type: "completed",
      progress: 100,
      currentEmail: "Campaign completed!",
      sent: finalSent,
      failed: finalFailed,
      skipped: finalSkipped,
      total: totalContacts,
      aiEnhanced: finalAiEnhanced,
      estimatedTimeRemaining: "Completed",
      logs: [
        `🎉 Campaign completed!`,
        `📧 ${finalSent} emails sent successfully`,
        `❌ ${finalFailed} emails failed`,
        `⏭️ ${finalSkipped} emails skipped (AI required but failed)`,
        `🤖 ${finalAiEnhanced} emails AI-enhanced`,
      ],
      completed: true,
    });

    console.log(`\n🎉 Bulk email campaign completed!`);
    console.log(`📧 ${finalSent} emails sent successfully`);
    console.log(`❌ ${finalFailed} emails failed`);
    console.log(`⏭️ ${finalSkipped} emails skipped (AI required but failed)`);
    console.log(`🤖 ${finalAiEnhanced} emails AI-enhanced`);
    console.log(`⏰ Completed at: ${new Date().toLocaleTimeString()}\n`);

    return NextResponse.json({
      message: "Bulk email campaign completed",
      results: {
        total: totalContacts,
        sent: finalSent,
        failed: finalFailed,
        skipped: finalSkipped,
        aiEnhanced: finalAiEnhanced,
      },
      sessionId: campaignSessionId,
    });
  } catch (error) {
    console.error("Error in bulk email campaign:", error);
    return NextResponse.json(
      { error: "Failed to send bulk emails" },
      { status: 500 }
    );
  }
}
