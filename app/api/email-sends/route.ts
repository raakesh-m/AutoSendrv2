import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// GET - Fetch all email sends/logs for authenticated user
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
        es.id,
        es.subject,
        es.status,
        es.sent_at,
        es.error_message,
        c.email as recipient,
        c.name as recipient_name,
        c.company_name
      FROM email_sends es
      LEFT JOIN contacts c ON es.contact_id = c.id
      WHERE es.user_id = $1
      ORDER BY es.sent_at DESC
    `,
      [userId]
    );

    return NextResponse.json({
      emailSends: result.rows.map((row) => ({
        ...row,
        sent_at: row.sent_at ? new Date(row.sent_at).toLocaleString() : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching email sends:", error);
    return NextResponse.json(
      { error: "Failed to fetch email sends" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an email send record for authenticated user
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
        { error: "Email send ID required" },
        { status: 400 }
      );
    }

    // Only delete if it belongs to the authenticated user
    await query("DELETE FROM email_sends WHERE id = $1 AND user_id = $2", [
      id,
      userId,
    ]);
    return NextResponse.json({
      message: "Email send record deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting email send:", error);
    return NextResponse.json(
      { error: "Failed to delete email send record" },
      { status: 500 }
    );
  }
}
