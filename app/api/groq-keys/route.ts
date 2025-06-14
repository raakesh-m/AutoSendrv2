import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// GET - Fetch all Groq API keys for the authenticated user
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

    const result = await query(
      `
      SELECT 
        id,
        key_name,
        api_key,
        is_active,
        usage_count,
        last_used_at,
        daily_reset_at,
        rate_limit_hit_at,
        notes,
        created_at,
        updated_at
      FROM groq_api_keys 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
      [userId]
    );

    return NextResponse.json({
      keys: result.rows,
    });
  } catch (error) {
    console.error("Error fetching Groq API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST - Add new Groq API key for authenticated user
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
    const { key_name, api_key, notes } = await request.json();

    if (!key_name || !api_key) {
      return NextResponse.json(
        { error: "Key name and API key are required" },
        { status: 400 }
      );
    }

    // Check if key name already exists for this user
    const existingKey = await query(
      "SELECT id FROM groq_api_keys WHERE key_name = $1 AND user_id = $2",
      [key_name, userId]
    );

    if (existingKey.rows.length > 0) {
      return NextResponse.json(
        { error: "A key with this name already exists" },
        { status: 400 }
      );
    }

    // Insert new API key with user_id
    const result = await query(
      `INSERT INTO groq_api_keys (user_id, key_name, api_key, notes) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, key_name, created_at`,
      [userId, key_name, api_key, notes || null]
    );

    return NextResponse.json({
      message: "API key added successfully",
      key: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding Groq API key:", error);
    return NextResponse.json(
      { error: "Failed to add API key" },
      { status: 500 }
    );
  }
}
