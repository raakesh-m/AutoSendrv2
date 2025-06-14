import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";

// GET - Fetch AI rules for the authenticated user
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

    // Check if user has any AI rules
    const result = await query(
      `
      SELECT 
        id,
        name,
        description,
        rules_text,
        is_active,
        created_at,
        updated_at
      FROM ai_rules 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
      [userId]
    );

    // If no AI rules exist, create default ones
    if (result.rows.length === 0) {
      console.log("🤖 Creating default AI rules for user:", session.user.email);

      await query(
        `INSERT INTO ai_rules (user_id, name, description, rules_text, is_active) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          userId,
          "Strict Template Rules",
          "Strict rules that only replace placeholders without altering template structure",
          `You are a template placeholder replacement assistant. Follow these rules EXACTLY:

Do not alter the structure or layout of the template in any way.
Only replace the placeholders: [CompanyName], [RecruiterName], and [Role].
Do not add new content such as achievements, skills, compliments, or projects.
Do not remove any line, word, or punctuation from the original template.
If [RecruiterName] is missing or empty, replace the greeting line with:
       → "Hi [CompanyName] team,"
If [CompanyName] is also missing, replace greeting line with:
       → "Hi there,"
If [Role] is missing or empty, use the generic phrase:
       → "this position"
Preserve all original line breaks, spacing, and punctuation exactly as provided.
Maintain capitalization consistency between inserted values and surrounding text.
Do not change or add to the sender signature or closing lines.
Do not include any extra text, comments, or instructions in the final output.

CRITICAL: Your job is ONLY to replace placeholders. Do not enhance, improve, or modify anything else.`,
          true,
        ]
      );

      // Fetch the newly created rules
      const newResult = await query(
        `
        SELECT 
          id,
          name,
          description,
          rules_text,
          is_active,
          created_at,
          updated_at
        FROM ai_rules 
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
        [userId]
      );

      return NextResponse.json({
        rules: newResult.rows.map((row) => ({
          ...row,
          created_at: new Date(row.created_at).toLocaleString(),
          updated_at: new Date(row.updated_at).toLocaleString(),
        })),
      });
    }

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

// POST - Create new AI rules for the authenticated user
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
    const { name, description, rules_text, is_active } = await request.json();

    if (!name || !rules_text) {
      return NextResponse.json(
        { error: "Name and rules text are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO ai_rules (user_id, name, description, rules_text, is_active) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [userId, name, description || null, rules_text, is_active !== false]
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

// PUT - Update AI rules for the authenticated user
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
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [name, description || null, rules_text, is_active !== false, id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "AI rules not found or access denied" },
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

// DELETE - Delete AI rules for the authenticated user
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "AI rules ID required" },
        { status: 400 }
      );
    }

    const result = await query(
      "DELETE FROM ai_rules WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "AI rules not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "AI rules deleted successfully" });
  } catch (error) {
    console.error("Error deleting AI rules:", error);
    return NextResponse.json(
      { error: "Failed to delete AI rules" },
      { status: 500 }
    );
  }
}
