import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// POST - Send test email using environment variables
export async function POST(request: NextRequest) {
  try {
    const { to, subject, body } = await request.json();

    // Validate required fields
    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
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

    // Create mail options
    const mailOptions = {
      from: `"Raakesh" <${process.env.GMAIL_EMAIL}>`,
      to: to,
      subject: subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
    };

    // Create transporter using environment variables
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      message: "Test email sent successfully",
      to: to,
      subject: subject,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending test email:", errorMessage);

    return NextResponse.json(
      {
        error: "Failed to send test email",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
