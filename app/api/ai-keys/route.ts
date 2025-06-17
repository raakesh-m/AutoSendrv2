import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { PROVIDER_CONFIGS, type AIProvider } from "@/lib/ai-providers";

// GET - Fetch all AI API keys for the authenticated user
export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider") as AIProvider | null;

    let sql = `
      SELECT 
        id,
        provider,
        key_name,
        api_key,
        model_preference,
        is_active,
        enable_rotation,
        usage_count,
        daily_limit,
        last_used_at,
        daily_reset_at,
        rate_limit_hit_at,
        notes,
        created_at,
        updated_at
      FROM ai_api_keys 
      WHERE user_id = $1
    `;
    const params = [userId];

    if (provider) {
      sql += " AND provider = $2";
      params.push(provider);
    }

    sql += " ORDER BY provider, created_at DESC";

    const result = await query(sql, params);

    return NextResponse.json({
      keys: result.rows,
      providers: PROVIDER_CONFIGS,
    });
  } catch (error) {
    console.error("Error fetching AI API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST - Add new AI API key for authenticated user
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
      provider,
      key_name,
      api_key,
      model_preference,
      enable_rotation,
      notes,
    } = await request.json();

    // Validate required fields
    if (!provider || !key_name || !api_key) {
      return NextResponse.json(
        { error: "Provider, key name, and API key are required" },
        { status: 400 }
      );
    }

    // Validate provider
    if (!PROVIDER_CONFIGS[provider as AIProvider]) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Check if key name already exists for this user and provider
    const existingKey = await query(
      "SELECT id FROM ai_api_keys WHERE key_name = $1 AND user_id = $2 AND provider = $3",
      [key_name, userId, provider]
    );

    if (existingKey.rows.length > 0) {
      return NextResponse.json(
        { error: "A key with this name already exists for this provider" },
        { status: 400 }
      );
    }

    // Get provider config for default daily limit
    const providerConfig = PROVIDER_CONFIGS[provider as AIProvider];

    // Insert new API key
    const result = await query(
      `INSERT INTO ai_api_keys (
        user_id, provider, key_name, api_key, model_preference, 
        enable_rotation, daily_limit, notes
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, key_name, provider, created_at`,
      [
        userId,
        provider,
        key_name,
        api_key,
        model_preference || providerConfig.defaultModel,
        enable_rotation || false,
        providerConfig.defaultDailyLimit,
        notes || null,
      ]
    );

    return NextResponse.json({
      message: "AI API key added successfully",
      key: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding AI API key:", error);
    return NextResponse.json(
      { error: "Failed to add API key" },
      { status: 500 }
    );
  }
}
