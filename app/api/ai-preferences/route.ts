import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { PROVIDER_CONFIGS, type AIProvider } from "@/lib/ai-key-manager";

// GET - Fetch user's AI preferences
export async function GET() {
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

    // Get user preferences, create if doesn't exist
    let result = await query(
      "SELECT * FROM ai_user_preferences WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default preferences
      await query(
        `INSERT INTO ai_user_preferences (user_id, enable_global_rotation, preferred_provider, fallback_enabled) 
         VALUES ($1, $2, $3, $4)`,
        [userId, false, "groq", true]
      );

      result = await query(
        "SELECT * FROM ai_user_preferences WHERE user_id = $1",
        [userId]
      );
    }

    // Get statistics about user's keys
    const statsResult = await query(
      `
      SELECT 
        provider,
        COUNT(*) as total_keys,
        COUNT(CASE WHEN is_active THEN 1 END) as active_keys,
        COUNT(CASE WHEN enable_rotation THEN 1 END) as rotation_enabled_keys,
        SUM(usage_count) as total_usage,
        MAX(last_used_at) as last_used
      FROM ai_api_keys 
      WHERE user_id = $1
      GROUP BY provider
      ORDER BY provider
    `,
      [userId]
    );

    return NextResponse.json({
      preferences: result.rows[0],
      keyStats: statsResult.rows,
      availableProviders: PROVIDER_CONFIGS,
    });
  } catch (error) {
    console.error("Error fetching AI preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI preferences" },
      { status: 500 }
    );
  }
}

// PUT - Update user's AI preferences
export async function PUT(request: NextRequest) {
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
    const { enable_global_rotation, preferred_provider, fallback_enabled } =
      await request.json();

    // Validate preferred_provider if provided
    if (
      preferred_provider &&
      !PROVIDER_CONFIGS[preferred_provider as AIProvider]
    ) {
      return NextResponse.json(
        { error: "Invalid preferred provider" },
        { status: 400 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (enable_global_rotation !== undefined) {
      updates.push(`enable_global_rotation = $${paramIndex++}`);
      values.push(enable_global_rotation);
    }

    if (preferred_provider !== undefined) {
      updates.push(`preferred_provider = $${paramIndex++}`);
      values.push(preferred_provider);
    }

    if (fallback_enabled !== undefined) {
      updates.push(`fallback_enabled = $${paramIndex++}`);
      values.push(fallback_enabled);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Add updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Check if preferences exist, if not create them
    const existingPrefs = await query(
      "SELECT id FROM ai_user_preferences WHERE user_id = $1",
      [userId]
    );

    let result;
    if (existingPrefs.rows.length === 0) {
      // Create new preferences
      result = await query(
        `INSERT INTO ai_user_preferences (
          user_id, enable_global_rotation, preferred_provider, fallback_enabled
        ) VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [
          userId,
          enable_global_rotation ?? false,
          preferred_provider ?? "groq",
          fallback_enabled ?? true,
        ]
      );
    } else {
      // Update existing preferences
      values.push(userId);
      const sql = `
        UPDATE ai_user_preferences 
        SET ${updates.join(", ")}
        WHERE user_id = $${paramIndex++}
        RETURNING *
      `;
      result = await query(sql, values);
    }

    return NextResponse.json({
      message: "AI preferences updated successfully",
      preferences: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating AI preferences:", error);
    return NextResponse.json(
      { error: "Failed to update AI preferences" },
      { status: 500 }
    );
  }
}
