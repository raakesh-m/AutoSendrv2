import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// PUT - Update Groq API key for authenticated user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { key_name, api_key, notes, is_active } = await request.json();
    const keyId = parseInt(params.id);

    if (!key_name || !api_key) {
      return NextResponse.json(
        { error: "Key name and API key are required" },
        { status: 400 }
      );
    }

    // Check if another key with the same name exists for this user (excluding current key)
    const existingKey = await query(
      "SELECT id FROM groq_api_keys WHERE key_name = $1 AND id != $2 AND user_id = $3",
      [key_name, keyId, userId]
    );

    if (existingKey.rows.length > 0) {
      return NextResponse.json(
        { error: "A key with this name already exists" },
        { status: 400 }
      );
    }

    // Update the API key (user-scoped)
    const result = await query(
      `UPDATE groq_api_keys 
       SET key_name = $1, api_key = $2, notes = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING id, key_name, is_active`,
      [
        key_name,
        api_key,
        notes || null,
        is_active !== undefined ? is_active : true,
        keyId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "API key updated successfully",
      key: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating Groq API key:", error);
    return NextResponse.json(
      { error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

// DELETE - Remove Groq API key for authenticated user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const keyId = parseInt(params.id);

    // Check if this is the last active key for this user
    const activeKeysCount = await query(
      "SELECT COUNT(*) as count FROM groq_api_keys WHERE is_active = true AND user_id = $1",
      [userId]
    );

    const currentKey = await query(
      "SELECT is_active FROM groq_api_keys WHERE id = $1 AND user_id = $2",
      [keyId, userId]
    );

    if (currentKey.rows.length === 0) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Prevent deletion of the last active key for this user
    if (
      currentKey.rows[0].is_active &&
      parseInt(activeKeysCount.rows[0].count) === 1
    ) {
      return NextResponse.json(
        { error: "Cannot delete the last active API key" },
        { status: 400 }
      );
    }

    // Delete the API key (user-scoped)
    const result = await query(
      "DELETE FROM groq_api_keys WHERE id = $1 AND user_id = $2 RETURNING id, key_name",
      [keyId, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "API key deleted successfully",
      deleted_key: result.rows[0],
    });
  } catch (error) {
    console.error("Error deleting Groq API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
