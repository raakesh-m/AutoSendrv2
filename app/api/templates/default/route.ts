import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch the default email template (id = 1)
export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, subject, body, variables, created_at, updated_at
       FROM email_templates 
       WHERE id = 1`
    );

    if (result.rows.length === 0) {
      // If no default template exists, return the hardcoded one
      return NextResponse.json({
        template: {
          id: 1,
          name: "Default Application Template",
          subject:
            "Application for [Role] Opportunity at [CompanyName] – Raakesh",
          body: `Hi [RecruiterName],

I'm Raakesh, a frontend developer with around 3 years of experience building clean, responsive, and full-stack web apps. I came across your company and would love to apply for a role on your team.

Design, develop, deliver — that's my cycle. I focus on clean UI, performance, and building real-world products with modern tools.

Here are a couple of recent projects:
• Prodpix – My first complete full-stack application from design to deployment, an AI product imagery platform that's generated 1,000+ images: https://prodpix.com
• AIChat – Polished chatbot interface with intuitive UI/UX powered by LLaMA models: https://cyberpunkchat.vercel.app/

Portfolio & resume: https://raakesh.space
GitHub: https://github.com/raakesh-m

Happy to connect if this aligns with what you're looking for in [CompanyName].

Looking forward to your thoughts,
Raakesh`,
          variables: ["Role", "CompanyName", "RecruiterName"],
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
