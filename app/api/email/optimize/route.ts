import { NextRequest, NextResponse } from "next/server";
import { enhanceEmail } from "@/lib/email-enhancement";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// POST - Optimize email content using shared enhancement function
export async function POST(request: NextRequest) {
  try {
    // Check authentication
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

    const { subject, body, companyName, position, recruiterName, minimal } =
      await request.json();

    if (!subject || !body || !companyName) {
      return NextResponse.json(
        { error: "Missing required fields: subject, body, companyName" },
        { status: 400 }
      );
    }

    // Use the shared enhancement function
    const result = await enhanceEmail({
      subject,
      body,
      companyName,
      position,
      recruiterName,
      useAi: true, // Always try AI for single emails
      userId: userId,
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
          fallback: true,
          details: result.message,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      optimizedSubject: result.subject,
      optimizedBody: result.body,
      message: result.message,
      aiEnhanced: result.aiEnhanced,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error optimizing email:", errorMessage);

    // Generic error - still allow email to be sent
    return NextResponse.json(
      {
        error: "AI enhancement failed",
        message:
          "AI enhancement temporarily unavailable. Email sent with basic template personalization.",
        fallback: true,
        details: errorMessage,
      },
      { status: 200 }
    );
  }
}
