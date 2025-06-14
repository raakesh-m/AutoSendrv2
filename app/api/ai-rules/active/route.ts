import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// GET - Fetch active AI rules for authenticated user
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
        name,
        description,
        rules_text,
        is_active,
        created_at,
        updated_at
      FROM ai_rules 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default rules if none found for this user
      const createResult = await query(
        `INSERT INTO ai_rules (user_id, name, description, rules_text, is_active) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
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

      return NextResponse.json({
        rules: createResult.rows[0],
      });
    }

    return NextResponse.json({
      rules: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching active AI rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch active AI rules" },
      { status: 500 }
    );
  }
}
