import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// PUT - Update Groq API key
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { key_name, api_key, notes, is_active } = await request.json();
    const keyId = parseInt(params.id);

    if (!key_name || !api_key) {
      return NextResponse.json(
        { error: "Key name and API key are required" },
        { status: 400 }
      );
    }

    // Check if another key with the same name exists (excluding current key)
    const existingKey = await query(
      "SELECT id FROM groq_api_keys WHERE key_name = $1 AND id != $2",
      [key_name, keyId]
    );

    if (existingKey.rows.length > 0) {
      return NextResponse.json(
        { error: "A key with this name already exists" },
        { status: 400 }
      );
    }

    // Update the API key
    const result = await query(
      `UPDATE groq_api_keys 
       SET key_name = $1, api_key = $2, notes = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING id, key_name, is_active`,
      [
        key_name,
        api_key,
        notes || null,
        is_active !== undefined ? is_active : true,
        keyId,
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

// DELETE - Remove Groq API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const keyId = parseInt(params.id);

    // Check if this is the last active key
    const activeKeysCount = await query(
      "SELECT COUNT(*) as count FROM groq_api_keys WHERE is_active = true"
    );

    const currentKey = await query(
      "SELECT is_active FROM groq_api_keys WHERE id = $1",
      [keyId]
    );

    if (currentKey.rows.length === 0) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    // Prevent deletion of the last active key
    if (
      currentKey.rows[0].is_active &&
      parseInt(activeKeysCount.rows[0].count) === 1
    ) {
      return NextResponse.json(
        { error: "Cannot delete the last active API key" },
        { status: 400 }
      );
    }

    // Delete the API key
    const result = await query(
      "DELETE FROM groq_api_keys WHERE id = $1 RETURNING id, key_name",
      [keyId]
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
