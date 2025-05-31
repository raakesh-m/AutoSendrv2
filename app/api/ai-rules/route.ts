import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch AI rules
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        description,
        rules_text,
        is_active,
        created_at,
        updated_at
      FROM ai_rules 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({
      rules: result.rows.map((row) => ({
        ...row,
        created_at: new Date(row.created_at).toLocaleString(),
        updated_at: new Date(row.updated_at).toLocaleString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching AI rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI rules" },
      { status: 500 }
    );
  }
}

// POST - Create new AI rules
export async function POST(request: NextRequest) {
  try {
    const { name, description, rules_text, is_active } = await request.json();

    if (!name || !rules_text) {
      return NextResponse.json(
        { error: "Name and rules text are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO ai_rules (name, description, rules_text, is_active) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, description || null, rules_text, is_active !== false]
    );

    return NextResponse.json({
      message: "AI rules created successfully",
      rules: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating AI rules:", error);
    return NextResponse.json(
      { error: "Failed to create AI rules" },
      { status: 500 }
    );
  }
}

// PUT - Update AI rules
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const { name, description, rules_text, is_active } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "AI rules ID required" },
        { status: 400 }
      );
    }

    if (!name || !rules_text) {
      return NextResponse.json(
        { error: "Name and rules text are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE ai_rules 
       SET name = $1, description = $2, rules_text = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [name, description || null, rules_text, is_active !== false, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "AI rules not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "AI rules updated successfully",
      rules: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating AI rules:", error);
    return NextResponse.json(
      { error: "Failed to update AI rules" },
      { status: 500 }
    );
  }
}

// DELETE - Delete AI rules
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "AI rules ID required" },
        { status: 400 }
      );
    }

    await query("DELETE FROM ai_rules WHERE id = $1", [id]);
    return NextResponse.json({ message: "AI rules deleted successfully" });
  } catch (error) {
    console.error("Error deleting AI rules:", error);
    return NextResponse.json(
      { error: "Failed to delete AI rules" },
      { status: 500 }
    );
  }
}
