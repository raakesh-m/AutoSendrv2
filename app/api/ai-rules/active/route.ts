import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch active AI rules
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
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // Return default rules if none found
      return NextResponse.json({
        rules: {
          id: 0,
          name: "Default Rules",
          description: "Fallback AI rules",
          rules_text: `You are an email enhancement assistant. Your job is to improve job application emails while following these strict rules:

RULES:
1. NEVER add new content, projects, or information not already present
2. ONLY fix grammar, spelling, and awkward phrasing from placeholder replacements
3. Keep the same tone, style, and personality
4. Maintain all existing links, projects, and specific details exactly as they are
5. Do not make the email longer - keep it concise
6. Do not change the core message or structure
7. Only improve readability and flow

WHAT TO FIX:
- Grammar errors from placeholder replacements
- Awkward transitions between sentences
- Minor spelling mistakes
- Improve sentence flow without changing meaning

WHAT NOT TO DO:
- Add new sentences or paragraphs
- Change project descriptions
- Add new qualifications or skills
- Modify links or contact information
- Change the greeting or closing
- Add buzzwords or corporate speak

Keep the email authentic and personal. Only make minimal improvements.`,
          is_active: true,
        },
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
