import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { PROVIDER_CONFIGS, type AIProvider } from "@/lib/ai-providers";

// PUT - Update an existing AI API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: keyId } = await params;

    // Verify the key belongs to the user
    const keyCheck = await query(
      "SELECT id, provider FROM ai_api_keys WHERE id = $1 AND user_id = $2",
      [keyId, userId]
    );

    if (keyCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "API key not found or access denied" },
        { status: 404 }
      );
    }

    const {
      key_name,
      api_key,
      model_preference,
      is_active,
      enable_rotation,
      notes,
    } = await request.json();

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (key_name !== undefined) {
      updates.push(`key_name = $${paramIndex++}`);
      values.push(key_name);
    }

    if (api_key !== undefined) {
      updates.push(`api_key = $${paramIndex++}`);
      values.push(api_key);
    }

    if (model_preference !== undefined) {
      updates.push(`model_preference = $${paramIndex++}`);
      values.push(model_preference);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (enable_rotation !== undefined) {
      updates.push(`enable_rotation = $${paramIndex++}`);
      values.push(enable_rotation);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    // Add updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause parameters
    values.push(keyId, userId);

    const sql = `
      UPDATE ai_api_keys 
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING id, provider, key_name, model_preference, is_active, enable_rotation, updated_at
    `;

    const result = await query(sql, values);

    return NextResponse.json({
      message: "AI API key updated successfully",
      key: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating AI API key:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

// DELETE - Remove an AI API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: keyId } = await params;

    // Verify the key belongs to the user and get key info
    const keyCheck = await query(
      "SELECT id, key_name, provider FROM ai_api_keys WHERE id = $1 AND user_id = $2",
      [keyId, userId]
    );

    if (keyCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "API key not found or access denied" },
        { status: 404 }
      );
    }

    const keyInfo = keyCheck.rows[0];

    // Delete the key
    await query("DELETE FROM ai_api_keys WHERE id = $1 AND user_id = $2", [
      keyId,
      userId,
    ]);

    return NextResponse.json({
      message: "AI API key deleted successfully",
      deletedKey: {
        id: keyInfo.id,
        name: keyInfo.key_name,
        provider: keyInfo.provider,
      },
    });
  } catch (error) {
    console.error("Error deleting AI API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
