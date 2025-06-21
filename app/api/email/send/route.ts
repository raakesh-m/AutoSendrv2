import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";
import { enhanceEmail } from "@/lib/email-enhancement";
import { updateProgress, getProgress } from "./progress/route";
import { join } from "path";
import { getServerSession } from "next-auth/next";
import { r2Storage } from "@/lib/r2-storage";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

// Add helper function after imports
function addProgressLog(sessionId: string, message: string) {
  const existingProgress = getProgress(sessionId) || { logs: [] };
  const updatedLogs = [...(existingProgress.logs || []), message];

  // Immediately update progress to send real-time log
  updateProgress(sessionId, {
    ...existingProgress,
    logs: updatedLogs,
    timestamp: Date.now(),
  });

  return updatedLogs;
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

async function processBulkEmailCampaign({
  userId,
  campaignSessionId,
  contacts,
  emailTemplate,
  smtpConfig,
  useAiCustomization,
  attachments,
}: {
  userId: string;
  campaignSessionId: string;
  contacts: any[];
  emailTemplate: any;
  smtpConfig: any;
  useAiCustomization: boolean;
  attachments: any[];
}) {
  const totalContacts = contacts.length;
  const emailResults: any[] = [];
  let skippedCount = 0;
  const startTime = Date.now();
  let aiQuotaExhausted = false;

  try {
    // Process each contact asynchronously to allow real-time updates
    for (let i = 0; i < totalContacts; i++) {
      // Use setTimeout to yield control back to event loop for real-time updates
      await new Promise((resolve) => setTimeout(resolve, 0));

      const contact = contacts[i];
      const currentIndex = i + 1;

      console.log(
        `📤 [${currentIndex}/${totalContacts}] Processing ${contact.email}`
      );

      // Add real-time progress log for this contact
      addProgressLog(
        campaignSessionId,
        `📤 [${currentIndex}/${totalContacts}] Processing ${contact.email}`
      );

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
        logs: getProgress(campaignSessionId)?.logs || [],
        completed: false,
      });

      // Small delay to ensure real-time visibility
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Initialize variables outside try block
      let personalizedSubject = emailTemplate.subject;
      let personalizedBody = emailTemplate.body;
      let tempFiles: string[] = []; // Track temp files for cleanup

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

            addProgressLog(
              campaignSessionId,
              `   🚫 Skipped - AI quota exhausted`
            );

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
              logs: getProgress(campaignSessionId)?.logs || [],
              completed: false,
            });
            continue;
          } else {
            // Try AI enhancement
            try {
              console.log(`🤖 Starting AI enhancement for ${contact.name}...`);

              // Check if AI keys are available
              const { aiKeyManager } = await import("@/lib/ai-key-manager");
              const bestKey = await aiKeyManager.getBestAvailableKey(userId);

              if (!bestKey) {
                console.log(
                  `❌ No API keys available - skipping ${contact.name}`
                );
                addProgressLog(
                  campaignSessionId,
                  `❌ Skipped ${contact.name} - No API keys available`
                );
                updateProgress(campaignSessionId, {
                  type: "progress",
                  progress: Math.round((currentIndex / totalContacts) * 100),
                  currentEmail: `Skipped: ${contact.name} (no API keys)`,
                  sent: emailResults.filter((r) => r.status === "sent").length,
                  failed: emailResults.filter((r) => r.status === "failed")
                    .length,
                  skipped: skippedCount + 1,
                  total: totalContacts,
                  aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
                  estimatedTimeRemaining: estimateTimeRemaining(
                    currentIndex,
                    totalContacts,
                    startTime
                  ),
                  logs: getProgress(campaignSessionId)?.logs || [],
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
                aiEnhanced = true;
                console.log(`✅ AI enhancement completed for ${contact.name}`);
                console.log(`   📝 Subject: "${personalizedSubject}"`);

                addProgressLog(
                  campaignSessionId,
                  `✅ AI enhanced email for ${contact.name}`
                );

                updateProgress(campaignSessionId, {
                  type: "progress",
                  progress: Math.round(
                    ((currentIndex - 0.5) / totalContacts) * 100
                  ),
                  currentEmail: `🤖 AI enhanced email for ${contact.name}`,
                  sent: emailResults.filter((r) => r.status === "sent").length,
                  failed: emailResults.filter((r) => r.status === "failed")
                    .length,
                  skipped: skippedCount,
                  total: totalContacts,
                  aiEnhanced:
                    emailResults.filter((r) => r.aiEnhanced).length + 1,
                  estimatedTimeRemaining: estimateTimeRemaining(
                    currentIndex - 0.5,
                    totalContacts,
                    startTime
                  ),
                  logs: getProgress(campaignSessionId)?.logs || [],
                  completed: false,
                });

                // Small delay to ensure real-time visibility
                await new Promise((resolve) => setTimeout(resolve, 200));
              } else {
                console.log(
                  `❌ AI enhancement failed for ${contact.name} - ${
                    enhancementResult.error || "Unknown error"
                  }`
                );

                addProgressLog(
                  campaignSessionId,
                  `❌ Skipped ${contact.name} - AI enhancement failed`
                );

                updateProgress(campaignSessionId, {
                  type: "progress",
                  progress: Math.round((currentIndex / totalContacts) * 100),
                  currentEmail: `Skipped: ${contact.name} (AI failed)`,
                  sent: emailResults.filter((r) => r.status === "sent").length,
                  failed: emailResults.filter((r) => r.status === "failed")
                    .length,
                  skipped: skippedCount + 1,
                  total: totalContacts,
                  aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
                  estimatedTimeRemaining: estimateTimeRemaining(
                    currentIndex,
                    totalContacts,
                    startTime
                  ),
                  logs: getProgress(campaignSessionId)?.logs || [],
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

              addProgressLog(
                campaignSessionId,
                `💥 Error enhancing ${contact.name}: ${
                  error instanceof Error ? error.message : "Unknown error"
                }`
              );

              updateProgress(campaignSessionId, {
                type: "progress",
                progress: Math.round((currentIndex / totalContacts) * 100),
                currentEmail: `Skipped: ${contact.name} (AI error)`,
                sent: emailResults.filter((r) => r.status === "sent").length,
                failed: emailResults.filter((r) => r.status === "failed")
                  .length,
                skipped: skippedCount + 1,
                total: totalContacts,
                aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
                estimatedTimeRemaining: estimateTimeRemaining(
                  currentIndex,
                  totalContacts,
                  startTime
                ),
                logs: getProgress(campaignSessionId)?.logs || [],
                completed: false,
              });
              skippedCount++;
              continue;
            }
          }
        } else {
          console.log(`   📋 Using template personalization only`);
        }

        if (shouldSendEmail) {
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
            currentEmail: `Sending to ${contact.email}...`,
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
            logs: addProgressLog(campaignSessionId, `   📨 Sending email...`),
            completed: false,
          });

          const mailAttachments = [];

          for (const attachment of attachments) {
            if (attachment.r2_key.startsWith("legacy/")) {
              const legacyPath = attachment.r2_key.replace("legacy/", "");
              mailAttachments.push({
                filename: attachment.original_name,
                path: join(process.cwd(), "uploads", legacyPath),
                contentType: attachment.mime_type,
              });
            } else {
              try {
                const downloadUrl = await r2Storage.getDownloadUrl(
                  attachment.r2_key,
                  3600
                );
                const response = await fetch(downloadUrl);
                if (!response.ok) {
                  throw new Error(
                    `Failed to download ${attachment.name} from R2`
                  );
                }
                const buffer = Buffer.from(await response.arrayBuffer());
                const tempDir = join(process.cwd(), "temp");
                if (!existsSync(tempDir)) {
                  await mkdir(tempDir, { recursive: true });
                }
                const tempFileName = `temp_${Date.now()}_${
                  attachment.original_name
                }`;
                const tempPath = join(tempDir, tempFileName);
                await writeFile(tempPath, buffer);
                tempFiles.push(tempPath);
                mailAttachments.push({
                  filename: attachment.original_name,
                  path: tempPath,
                  contentType: attachment.mime_type,
                });
                console.log(
                  `   📥 Downloaded ${attachment.name} from R2 for email`
                );
              } catch (error) {
                console.error(
                  `   ❌ Failed to download ${attachment.name} from R2:`,
                  error
                );
              }
            }
          }

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
              secure: smtpConfig.smtp_port === 465,
              auth: {
                user: smtpConfig.email,
                pass: smtpConfig.app_password,
              },
              requireTLS: smtpConfig.smtp_port === 587,
              tls: {
                rejectUnauthorized: false,
              },
            })
            .sendMail(mailOptions);

          const emailSendResult = await query(
            `INSERT INTO email_sends (user_id, contact_id, subject, body, status, sent_at) 
             VALUES ($1, $2, $3, $4, 'sent', CURRENT_TIMESTAMP) RETURNING id`,
            [userId, contact.id, personalizedSubject, personalizedBody]
          );

          if (attachments.length > 0 && emailSendResult.rows[0]) {
            const emailSendId = emailSendResult.rows[0].id;
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

          addProgressLog(
            campaignSessionId,
            `   ✅ Email sent successfully to ${contact.email}`
          );

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
            logs: getProgress(campaignSessionId)?.logs || [],
            completed: false,
          });

          await new Promise((resolve) => setTimeout(resolve, 200));

          for (const tempFile of tempFiles) {
            try {
              await unlink(tempFile);
              console.log(`   🗑️ Cleaned up temp file: ${tempFile}`);
            } catch (error) {
              console.warn(`   ⚠️ Failed to cleanup temp file: ${tempFile}`);
            }
          }

          if (currentIndex < totalContacts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.log(`   ❌ Failed to send: ${errorMessage}`);

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

        for (const tempFile of tempFiles) {
          try {
            await unlink(tempFile);
            console.log(`   🗑️ Cleaned up temp file after error: ${tempFile}`);
          } catch (cleanupError) {
            console.warn(
              `   ⚠️ Failed to cleanup temp file after error: ${tempFile}`
            );
          }
        }

        emailResults.push({
          contact: contact.email,
          status: "failed",
          error: errorMessage,
          aiEnhanced: false,
        });

        addProgressLog(
          campaignSessionId,
          `   ❌ Failed to send: ${errorMessage}`
        );

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
          logs: getProgress(campaignSessionId)?.logs || [],
          completed: false,
        });
      }
    }
  } catch (campaignError) {
    console.error("Error in bulk email campaign process:", campaignError);
    addProgressLog(
      campaignSessionId,
      `💥 A critical error occurred during the campaign.`
    );
  } finally {
    const finalSent = emailResults.filter((r) => r.status === "sent").length;
    const finalFailed = emailResults.filter(
      (r) => r.status === "failed"
    ).length;
    const finalSkipped = emailResults.filter(
      (r) => r.status === "skipped"
    ).length;
    const finalAiEnhanced = emailResults.filter((r) => r.aiEnhanced).length;

    addProgressLog(campaignSessionId, `🏁 Processing: Campaign completed!`);
    addProgressLog(
      campaignSessionId,
      `🎉 Campaign completed! Sent: ${finalSent}, Failed: ${finalFailed}, Skipped: ${finalSkipped}`
    );

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
      logs: getProgress(campaignSessionId)?.logs || [],
      completed: true,
    });

    console.log(`\n🎉 Bulk email campaign completed!`);
    console.log(`📧 ${finalSent} emails sent successfully`);
    console.log(`❌ ${finalFailed} emails failed`);
    console.log(`⏭️ ${finalSkipped} emails skipped`);
    console.log(`🤖 ${finalAiEnhanced} emails AI-enhanced`);
    console.log(`⏰ Completed at: ${new Date().toLocaleTimeString()}\n`);
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
          )} KB) [${attachment.r2_key.startsWith("legacy/") ? "Legacy" : "R2"}]`
        );
      }
    }

    if (contactsResult.rows.length === 0) {
      return NextResponse.json({ error: "No contacts found" }, { status: 400 });
    }

    const totalContacts = contactsResult.rows.length;

    // Initialize progress tracking
    updateProgress(campaignSessionId, {
      type: "progress",
      progress: 0,
      currentEmail: "Initializing campaign...",
      sent: 0,
      failed: 0,
      skipped: 0,
      total: totalContacts,
      aiEnhanced: 0,
      estimatedTimeRemaining: "Calculating...",
      logs: addProgressLog(
        campaignSessionId,
        `🚀 Starting bulk email campaign for ${totalContacts} contacts`
      ),
      completed: false,
    });

    // Fire-and-forget the actual email sending process
    processBulkEmailCampaign({
      userId,
      campaignSessionId,
      contacts: contactsResult.rows,
      emailTemplate,
      smtpConfig,
      useAiCustomization,
      attachments,
    });

    // Immediately return a response to the client
    return NextResponse.json(
      {
        message: "Campaign started successfully",
        sessionId: campaignSessionId,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Error starting bulk email campaign:", error);
    return NextResponse.json(
      { error: "Failed to start bulk email campaign" },
      { status: 500 }
    );
  }
}
