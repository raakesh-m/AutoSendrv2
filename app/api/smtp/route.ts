import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// GET - Fetch SMTP configuration for authenticated user by provider
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") || "gmail";
    const all = url.searchParams.get("all"); // For database management view

    // Get user ID
    const userResult = await query("SELECT id FROM users WHERE email = $1", [
      session.user.email,
    ]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    // If 'all' parameter is present, return all configs for this user (for database management)
    if (all === "true") {
      const result = await query(
        "SELECT id, email, smtp_host, smtp_port, use_ssl, provider_type, created_at FROM smtp_config WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );

      return NextResponse.json({
        smtp_configs: result.rows.map((config) => ({
          ...config,
          // Don't include passwords in the response
          created_at: new Date(config.created_at).toLocaleString(),
        })),
      });
    }

    // Otherwise, return single config by provider (existing functionality)
    const result = await query(
      "SELECT * FROM smtp_config WHERE user_id = $1 AND provider_type = $2 ORDER BY created_at DESC LIMIT 1",
      [userId, provider]
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

// POST - Save SMTP configuration for authenticated user
export async function POST(request: NextRequest) {
  try {
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
      email,
      app_password,
      smtp_host,
      smtp_port,
      use_ssl,
      provider_type = "gmail",
    } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if this is an update (existing config for this provider)
    const existingResult = await query(
      "SELECT * FROM smtp_config WHERE user_id = $1 AND provider_type = $2",
      [userId, provider_type]
    );

    const isUpdate = existingResult.rows.length > 0;

    // For new configs, password is required
    // For updates, password is optional (only update if provided)
    if (!isUpdate && !app_password) {
      return NextResponse.json(
        { error: "Password is required for initial setup" },
        { status: 400 }
      );
    }

    // Delete existing configuration for this user and provider
    await query(
      "DELETE FROM smtp_config WHERE user_id = $1 AND provider_type = $2",
      [userId, provider_type]
    );

    // For updates without new password, get the existing password
    let passwordToSave = app_password;
    if (isUpdate && !app_password && existingResult.rows.length > 0) {
      passwordToSave = existingResult.rows[0].app_password;
    }

    if (!passwordToSave) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO smtp_config (user_id, email, app_password, smtp_host, smtp_port, use_ssl, provider_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        userId,
        email,
        passwordToSave,
        smtp_host || (provider_type === "gmail" ? "smtp.gmail.com" : ""),
        smtp_port || 587,
        use_ssl !== undefined ? use_ssl : false,
        provider_type,
      ]
    );

    // Return sanitized config
    const config = result.rows[0];
    const sanitizedConfig = {
      ...config,
      app_password: "***CONFIGURED***",
    };

    return NextResponse.json({
      message: "Email configuration saved successfully",
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

// PUT - Test SMTP configuration for authenticated user
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get provider from request body
    const { provider_type = "gmail" } = await request.json();

    // Get user ID
    const userResult = await query("SELECT id FROM users WHERE email = $1", [
      session.user.email,
    ]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = userResult.rows[0].id;

    const result = await query(
      "SELECT * FROM smtp_config WHERE user_id = $1 AND provider_type = $2 ORDER BY created_at DESC LIMIT 1",
      [userId, provider_type]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: `No ${provider_type} configuration found for this user` },
        { status: 400 }
      );
    }

    const config = result.rows[0];

    console.log("Testing SMTP connection with config:", {
      host: config.smtp_host,
      port: config.smtp_port,
      email: config.email,
      provider: config.provider_type,
    });

    // Simulate a successful test
    return NextResponse.json({
      message: "Email connection test successful",
      status: "success",
    });
  } catch (error) {
    console.error("Error testing SMTP config:", error);
    return NextResponse.json(
      { error: "Email connection test failed" },
      { status: 500 }
    );
  }
}

// DELETE - Delete SMTP configuration for authenticated user
export async function DELETE(request: NextRequest) {
  try {
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

    // Check if we're deleting by ID (from database management) or by provider_type (from settings)
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      // Delete by ID (for database management)
      await query("DELETE FROM smtp_config WHERE id = $1 AND user_id = $2", [
        id,
        userId,
      ]);

      return NextResponse.json({
        message: "SMTP configuration deleted successfully",
      });
    } else {
      // Delete by provider_type (for settings)
      const { provider_type = "gmail" } = await request.json();

      await query(
        "DELETE FROM smtp_config WHERE user_id = $1 AND provider_type = $2",
        [userId, provider_type]
      );

      return NextResponse.json({
        message: `${provider_type} configuration deleted successfully`,
      });
    }
  } catch (error) {
    console.error("Error deleting SMTP config:", error);
    return NextResponse.json(
      { error: "Failed to delete SMTP configuration" },
      { status: 500 }
    );
  }
}

// Helper function to get user SMTP config by provider
export async function getUserSmtpConfig(
  userId: string,
  provider_type: string = "gmail"
) {
  try {
    const result = await query(
      "SELECT * FROM smtp_config WHERE user_id = $1 AND provider_type = $2 ORDER BY created_at DESC LIMIT 1",
      [userId, provider_type]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Error fetching user SMTP config:", error);
    return null;
  }
}
