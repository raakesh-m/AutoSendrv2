import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch all email sends/logs
export async function GET() {
  try {
    const result = await query(`
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
      ORDER BY es.created_at DESC
    `);

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

// DELETE - Delete an email send record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Email send ID required" },
        { status: 400 }
      );
    }

    await query("DELETE FROM email_sends WHERE id = $1", [id]);
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
