import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";
import { enhanceEmail } from "@/lib/email-enhancement";
import { join } from "path";

// Function to fetch the default email template (same as bulk email)
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

// POST - Send single email using same system as bulk emails
export async function POST(request: NextRequest) {
  try {
    const {
      to,
      companyName,
      position,
      recruiterName,
      useAiCustomization = true, // Default to true for single emails
    } = await request.json();

    console.log(`\n🚀 Starting single email send to ${to}`);
    console.log(
      `🏢 Company: ${companyName}, Position: ${position || "N/A"}, Recruiter: ${
        recruiterName || "N/A"
      }`
    );

    // Validate required fields
    if (!to || !companyName) {
      return NextResponse.json(
        { error: "Recipient email and company name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

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

    console.log(`📧 Fetching email template...`);
    // Get the default template from database (same as bulk email)
    const emailTemplate = await getDefaultTemplate();
    console.log(`📋 Using template: ${emailTemplate.name}`);

    console.log(`📎 Fetching attachments...`);
    // Get active attachments (same as bulk email)
    const attachmentsResult = await query(
      "SELECT id, name, original_name, file_path, file_size, mime_type FROM attachments WHERE is_active = true"
    );
    const attachments = attachmentsResult.rows;
    console.log(`📎 Found ${attachments.length} active attachments`);

    // Personalize template with contact data (same as bulk email)
    const role = position || "Software Developer";
    const actualCompanyName = companyName || "your company";
    const actualRecruiterName = recruiterName || "there";

    console.log(`🎯 Template personalized for ${actualCompanyName}`);

    let personalizedSubject = emailTemplate.subject
      .replace(/\[Role\]/g, role)
      .replace(/\[CompanyName\]/g, actualCompanyName);

    let personalizedBody = emailTemplate.body
      .replace(/\[Role\]/g, role)
      .replace(/\[CompanyName\]/g, actualCompanyName)
      .replace(/\[RecruiterName\]/g, actualRecruiterName);

    // AI Enhancement (same system as bulk email)
    let aiEnhanced = false;
    let shouldSendEmail = true;

    if (useAiCustomization) {
      try {
        console.log(`🤖 Starting AI enhancement...`);

        const aiResult = await enhanceEmail({
          subject: personalizedSubject,
          body: personalizedBody,
          companyName: actualCompanyName,
          position: role,
          recruiterName: actualRecruiterName,
          useAi: true,
        });

        if (aiResult.aiEnhanced && !aiResult.error) {
          personalizedSubject = aiResult.subject;
          personalizedBody = aiResult.body;
          aiEnhanced = true;
          console.log(`✨ AI enhancement completed successfully`);
        } else {
          // AI enhancement is mandatory for single emails too - skip if it fails
          console.log(
            `❌ AI enhancement failed: ${aiResult.error || aiResult.message}`
          );
          console.log(`⏭️ Skipping email send (AI enhancement required)`);
          shouldSendEmail = false;
        }
      } catch (aiError) {
        console.log(`❌ AI enhancement error: ${aiError}`);
        console.log(`⏭️ Skipping email send (AI enhancement required)`);
        shouldSendEmail = false;
      }
    } else {
      console.log(`🔧 Using template without AI enhancement`);
    }

    if (!shouldSendEmail) {
      return NextResponse.json(
        {
          error: "AI enhancement failed",
          message:
            "Email not sent - AI enhancement is required but failed. Please try again or check your API keys in settings.",
          aiEnhanced: false,
        },
        { status: 400 }
      );
    }

    console.log(`📮 Preparing email with ${attachments.length} attachments...`);

    // Prepare attachments for nodemailer (same as bulk email)
    const mailAttachments = attachments.map((attachment) => ({
      filename: attachment.original_name,
      path: join(process.cwd(), "uploads", attachment.file_path),
      contentType: attachment.mime_type,
    }));

    // Create mail options (same as bulk email)
    const mailOptions = {
      from: `"Raakesh" <${process.env.GMAIL_EMAIL}>`,
      to: to,
      subject: personalizedSubject,
      text: personalizedBody,
      html: personalizedBody.replace(/\n/g, "<br>"),
      attachments: mailAttachments,
    };

    // Send email using same transporter as bulk email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully to ${to}`);
    console.log(
      `📊 Final stats: AI Enhanced: ${aiEnhanced}, Attachments: ${attachments.length}`
    );

    return NextResponse.json({
      message: "Email sent successfully",
      to: to,
      subject: personalizedSubject,
      aiEnhanced: aiEnhanced,
      attachments: attachments.length,
      companyName: actualCompanyName,
      template: emailTemplate.name,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error sending single email:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to send email",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
