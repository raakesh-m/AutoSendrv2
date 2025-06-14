import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// GET - Fetch the default email template for authenticated user
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
      `SELECT id, name, subject, body, variables, created_at, updated_at
       FROM email_templates 
       WHERE user_id = $1 AND is_default = true
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // If no default template exists for this user, create one
      const createResult = await query(
        `INSERT INTO email_templates (user_id, name, subject, body, variables, is_default) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          userId,
          "Default Application Template",
          "Application for [Role] at [CompanyName]",
          `Hi [RecruiterName],

I hope you're doing well. I recently came across [CompanyName] and found the opportunity for a [Role] very interesting.

I'm reaching out to express my interest in the [Role] position. With experience in relevant domain/skills , I believe I can contribute meaningfully to your team.

I've attached my resume for your reference and would love to connect if the opportunity is still open in [CompanyName].

Thank you for your time,  
Your Name`,
          ["CompanyName", "RecruiterName", "Role"],
          true,
        ]
      );

      return NextResponse.json({
        template: {
          ...createResult.rows[0],
          created_at: new Date(
            createResult.rows[0].created_at
          ).toLocaleString(),
          updated_at: new Date(
            createResult.rows[0].updated_at
          ).toLocaleString(),
        },
      });
    }

    return NextResponse.json({
      template: {
        ...result.rows[0],
        created_at: new Date(result.rows[0].created_at).toLocaleString(),
        updated_at: new Date(result.rows[0].updated_at).toLocaleString(),
      },
    });
  } catch (error) {
    console.error("Error fetching default template:", error);
    return NextResponse.json(
      { error: "Failed to fetch default template" },
      { status: 500 }
    );
  }
}
