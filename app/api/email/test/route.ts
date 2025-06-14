import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import nodemailer from "nodemailer";
import { enhanceEmail } from "@/lib/email-enhancement";
import { join } from "path";
import { getServerSession } from "next-auth/next";

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

    console.log(`📧 Fetching email template...`);
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
    console.log(`📋 Using template: ${emailTemplate.name}`);

    console.log(`📎 Fetching attachments...`);
    // Get active attachments for this user
    const attachmentsResult = await query(
      "SELECT id, name, original_name, file_path, file_size, mime_type FROM attachments WHERE user_id = $1 AND is_active = true",
      [userId]
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
          userId: userId,
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

    // Create mail options using user's SMTP config
    const mailOptions = {
      from: `"${smtpConfig.email.split("@")[0]}" <${smtpConfig.email}>`,
      to: to,
      subject: personalizedSubject,
      text: personalizedBody,
      html: personalizedBody.replace(/\n/g, "<br>"),
      attachments: mailAttachments,
    };

    // Send email using user's SMTP configuration
    const transporter = nodemailer.createTransport({
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
