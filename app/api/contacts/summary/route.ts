import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

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

    // Get total contacts for this user
    const totalContactsResult = await query(
      "SELECT COUNT(*) as count FROM contacts WHERE user_id = $1",
      [userId]
    );
    const totalContacts = parseInt(totalContactsResult.rows[0].count);

    // Get unique emails for this user
    const uniqueEmailsResult = await query(
      "SELECT COUNT(DISTINCT email) as count FROM contacts WHERE user_id = $1",
      [userId]
    );
    const uniqueEmails = parseInt(uniqueEmailsResult.rows[0].count);

    // Get unique companies for this user
    const uniqueCompaniesResult = await query(
      "SELECT COUNT(DISTINCT company_name) as count FROM contacts WHERE user_id = $1 AND company_name IS NOT NULL AND company_name != ''",
      [userId]
    );
    const uniqueCompanies = parseInt(uniqueCompaniesResult.rows[0].count);

    return NextResponse.json({
      totalContacts,
      uniqueEmails,
      uniqueCompanies,
    });
  } catch (error) {
    console.error("Error fetching contacts summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts summary" },
      { status: 500 }
    );
  }
}
