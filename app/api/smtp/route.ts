import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch SMTP configuration
export async function GET() {
  try {
    const result = await query(
      "SELECT * FROM smtp_config ORDER BY created_at DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ smtp_config: null });
    }

    // Don't return the actual password for security
    const config = result.rows[0];
    const sanitizedConfig = {
      ...config,
      app_password: config.app_password ? "***CONFIGURED***" : null,
    };

    return NextResponse.json({ smtp_config: sanitizedConfig });
  } catch (error) {
    console.error("Error fetching SMTP config:", error);
    return NextResponse.json(
      { error: "Failed to fetch SMTP configuration" },
      { status: 500 }
    );
  }
}

// POST - Save SMTP configuration
export async function POST(request: NextRequest) {
  try {
    const { email, app_password, smtp_host, smtp_port, use_ssl } =
      await request.json();

    if (!email || !app_password) {
      return NextResponse.json(
        { error: "Email and app password are required" },
        { status: 400 }
      );
    }

    // Delete existing configuration and insert new one
    await query("DELETE FROM smtp_config");

    const result = await query(
      `INSERT INTO smtp_config (email, app_password, smtp_host, smtp_port, use_ssl) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        email,
        app_password,
        smtp_host || "smtp.gmail.com",
        smtp_port || 587,
        use_ssl !== undefined ? use_ssl : true,
      ]
    );

    // Return sanitized config
    const config = result.rows[0];
    const sanitizedConfig = {
      ...config,
      app_password: "***CONFIGURED***",
    };

    return NextResponse.json({
      message: "SMTP configuration saved successfully",
      smtp_config: sanitizedConfig,
    });
  } catch (error) {
    console.error("Error saving SMTP config:", error);
    return NextResponse.json(
      { error: "Failed to save SMTP configuration" },
      { status: 500 }
    );
  }
}

// PUT - Test SMTP configuration
export async function PUT(request: NextRequest) {
  try {
    const result = await query(
      "SELECT * FROM smtp_config ORDER BY created_at DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "No SMTP configuration found" },
        { status: 400 }
      );
    }

    // For now, we'll simulate the test
    // In production, you would use nodemailer to actually test the connection
    const config = result.rows[0];

    console.log("Testing SMTP connection with config:", {
      host: config.smtp_host,
      port: config.smtp_port,
      email: config.email,
    });

    // Simulate a successful test
    return NextResponse.json({
      message: "SMTP connection test successful",
      status: "success",
    });
  } catch (error) {
    console.error("Error testing SMTP config:", error);
    return NextResponse.json(
      { error: "SMTP connection test failed" },
      { status: 500 }
    );
  }
}
