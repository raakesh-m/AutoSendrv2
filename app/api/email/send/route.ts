import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";
import { enhanceEmail } from "@/lib/email-enhancement";
import { updateProgress } from "./progress/route";

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
        subject:
          "Application for [Role] Opportunity at [CompanyName] – Raakesh",
        body: `Hi [RecruiterName],

I'm Raakesh, a frontend developer with around 3 years of experience building clean, responsive, and full-stack web apps. I came across your company and would love to apply for a role on your team.

Design, develop, deliver — that's my cycle. I focus on clean UI, performance, and building real-world products with modern tools.

Here are a couple of recent projects:
• Prodpix – My first complete full-stack application from design to deployment, an AI product imagery platform that's generated 1,000+ images: https://prodpix.com
• AIChat – Polished chatbot interface with intuitive UI/UX powered by LLaMA models: https://cyberpunkchat.vercel.app/

Portfolio & resume: https://raakesh.space
GitHub: https://github.com/raakesh-m

Happy to connect if this aligns with what you're looking for in [CompanyName].

Looking forward to your thoughts,
Raakesh`,
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
      subject: "Application for [Role] Opportunity at [CompanyName] – Raakesh",
      body: `Hi [RecruiterName],

I'm Raakesh, a frontend developer with around 3 years of experience building clean, responsive, and full-stack web apps. I came across your company and would love to apply for a role on your team.

Design, develop, deliver — that's my cycle. I focus on clean UI, performance, and building real-world products with modern tools.

Here are a couple of recent projects:
• Prodpix – My first complete full-stack application from design to deployment, an AI product imagery platform that's generated 1,000+ images: https://prodpix.com
• AIChat – Polished chatbot interface with intuitive UI/UX powered by LLaMA models: https://cyberpunkchat.vercel.app/

Portfolio & resume: https://raakesh.space
GitHub: https://github.com/raakesh-m

Happy to connect if this aligns with what you're looking for in [CompanyName].

Looking forward to your thoughts,
Raakesh`,
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
    const {
      contactIds,
      useAiCustomization = false,
      sessionId,
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

    // Check if environment variables are set
    if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        {
          error:
            "Email configuration not found. Please set GMAIL_EMAIL and GMAIL_APP_PASSWORD environment variables.",
        },
        { status: 500 }
      );
    }

    // Get the default template from database
    const emailTemplate = await getDefaultTemplate();

    // Get contacts
    const contactsResult = await query(
      "SELECT * FROM contacts WHERE id = ANY($1)",
      [contactIds]
    );

    if (contactsResult.rows.length === 0) {
      return NextResponse.json({ error: "No contacts found" }, { status: 400 });
    }

    const totalContacts = contactsResult.rows.length;
    const emailResults = [];
    let aiUsageCount = 0;
    const maxAiUsage = Math.min(5, totalContacts); // Limit AI usage for rate limits
    const startTime = Date.now();

    // Initialize progress tracking
    updateProgress(campaignSessionId, {
      type: "progress",
      progress: 0,
      currentEmail: "Starting campaign...",
      sent: 0,
      failed: 0,
      total: totalContacts,
      aiEnhanced: 0,
      estimatedTimeRemaining: "Calculating...",
      logs: [`🚀 Starting bulk email campaign for ${totalContacts} contacts`],
      completed: false,
    });

    console.log(
      `\n🚀 Starting bulk email campaign for ${totalContacts} contacts`
    );
    console.log(`📧 Template: ${emailTemplate.name}`);
    console.log(
      `🤖 AI Enhancement: ${
        useAiCustomization ? `Enabled (max ${maxAiUsage} emails)` : "Disabled"
      }`
    );
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
      const currentLogs = [
        `📤 [${currentIndex}/${totalContacts}] Processing ${contact.email} (${progressPercent}%)`,
      ];

      updateProgress(campaignSessionId, {
        type: "progress",
        progress: Math.round(((currentIndex - 1) / totalContacts) * 100),
        currentEmail: `Processing ${contact.email}...`,
        sent: emailResults.filter((r) => r.status === "sent").length,
        failed: emailResults.filter((r) => r.status === "failed").length,
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

        // Use AI sparingly for only first few emails to avoid rate limits
        let aiEnhanced = false;
        if (
          useAiCustomization &&
          process.env.GROQ_API_KEY &&
          aiUsageCount < maxAiUsage
        ) {
          try {
            console.log(`   🤖 Applying AI enhancement...`);

            updateProgress(campaignSessionId, {
              type: "progress",
              progress: Math.round(
                ((currentIndex - 0.5) / totalContacts) * 100
              ),
              currentEmail: `AI enhancing for ${contact.email}...`,
              sent: emailResults.filter((r) => r.status === "sent").length,
              failed: emailResults.filter((r) => r.status === "failed").length,
              total: totalContacts,
              aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
              estimatedTimeRemaining: estimateTimeRemaining(
                currentIndex - 1,
                totalContacts,
                startTime
              ),
              logs: [...currentLogs, `   🤖 Applying AI enhancement...`],
              completed: false,
            });

            // Use the shared enhancement function for consistency
            const enhancementResult = await enhanceEmail({
              subject: personalizedSubject,
              body: personalizedBody,
              companyName,
              position: role,
              recruiterName,
              useAi: true,
            });

            if (enhancementResult.aiEnhanced) {
              personalizedSubject = enhancementResult.subject;
              personalizedBody = enhancementResult.body;
              aiUsageCount++;
              aiEnhanced = true;
              console.log(
                `   ✨ AI enhancement applied (${aiUsageCount}/${maxAiUsage})`
              );
            } else {
              console.log(
                `   ⚠️ AI enhancement failed: ${enhancementResult.message}`
              );
            }
          } catch (aiError) {
            console.log(
              `   ⚠️ AI enhancement failed: ${
                aiError instanceof Error ? aiError.message : "Unknown AI error"
              }`
            );
            // Continue with template version
          }
        } else if (useAiCustomization && aiUsageCount >= maxAiUsage) {
          console.log(`   📋 Using template only (AI limit reached)`);
        }

        // Send email using environment variables
        console.log(`   📨 Sending email...`);

        updateProgress(campaignSessionId, {
          type: "progress",
          progress: Math.round(((currentIndex - 0.2) / totalContacts) * 100),
          currentEmail: `Sending to ${contact.email}...`,
          sent: emailResults.filter((r) => r.status === "sent").length,
          failed: emailResults.filter((r) => r.status === "failed").length,
          total: totalContacts,
          aiEnhanced: emailResults.filter((r) => r.aiEnhanced).length,
          estimatedTimeRemaining: estimateTimeRemaining(
            currentIndex - 1,
            totalContacts,
            startTime
          ),
          logs: [...currentLogs, `   📨 Sending email...`],
          completed: false,
        });

        const mailOptions = {
          from: `"Raakesh" <${process.env.GMAIL_EMAIL}>`,
          to: contact.email,
          subject: personalizedSubject,
          text: personalizedBody,
          html: personalizedBody.replace(/\n/g, "<br>"),
        };

        await nodemailer
          .createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: process.env.GMAIL_EMAIL,
              pass: process.env.GMAIL_APP_PASSWORD,
            },
          })
          .sendMail(mailOptions);

        // Log successful send
        await query(
          `INSERT INTO email_sends (contact_id, subject, body, status, sent_at) 
           VALUES ($1, $2, $3, 'sent', CURRENT_TIMESTAMP)`,
          [contact.id, personalizedSubject, personalizedBody]
        );

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
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.log(`   ❌ Failed to send: ${errorMessage}`);

        // Log failed send
        await query(
          `INSERT INTO email_sends (contact_id, subject, body, status, error_message) 
           VALUES ($1, $2, $3, 'failed', $4)`,
          [contact.id, personalizedSubject, personalizedBody, errorMessage]
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
    const finalAiEnhanced = emailResults.filter((r) => r.aiEnhanced).length;

    updateProgress(campaignSessionId, {
      type: "completed",
      progress: 100,
      currentEmail: "Campaign completed!",
      sent: finalSent,
      failed: finalFailed,
      total: totalContacts,
      aiEnhanced: finalAiEnhanced,
      estimatedTimeRemaining: "Completed",
      logs: [
        `🎉 Campaign completed!`,
        `📧 ${finalSent} emails sent successfully`,
        `❌ ${finalFailed} emails failed`,
        `🤖 ${finalAiEnhanced} emails AI-enhanced`,
      ],
      completed: true,
    });

    console.log(`\n🎉 Bulk email campaign completed!`);
    console.log(`📧 ${finalSent} emails sent successfully`);
    console.log(`❌ ${finalFailed} emails failed`);
    console.log(`🤖 ${finalAiEnhanced} emails AI-enhanced`);
    console.log(`⏰ Completed at: ${new Date().toLocaleTimeString()}\n`);

    return NextResponse.json({
      message: "Bulk email campaign completed",
      results: {
        total: totalContacts,
        sent: finalSent,
        failed: finalFailed,
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
