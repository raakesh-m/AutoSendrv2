import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch all Groq API keys
export async function GET() {
  try {
    const result = await query(`
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
      ORDER BY created_at DESC
    `);

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

// POST - Add new Groq API key
export async function POST(request: NextRequest) {
  try {
    const { key_name, api_key, notes } = await request.json();

    if (!key_name || !api_key) {
      return NextResponse.json(
        { error: "Key name and API key are required" },
        { status: 400 }
      );
    }

    // Check if key name already exists
    const existingKey = await query(
      "SELECT id FROM groq_api_keys WHERE key_name = $1",
      [key_name]
    );

    if (existingKey.rows.length > 0) {
      return NextResponse.json(
        { error: "A key with this name already exists" },
        { status: 400 }
      );
    }

    // Insert new API key
    const result = await query(
      `INSERT INTO groq_api_keys (key_name, api_key, notes) 
       VALUES ($1, $2, $3) 
       RETURNING id, key_name, created_at`,
      [key_name, api_key, notes || null]
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
