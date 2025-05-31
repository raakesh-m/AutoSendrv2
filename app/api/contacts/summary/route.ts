import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Get total contacts
    const totalContactsResult = await query(
      "SELECT COUNT(*) as count FROM contacts"
    );
    const totalContacts = parseInt(totalContactsResult.rows[0].count);

    // Get unique emails
    const uniqueEmailsResult = await query(
      "SELECT COUNT(DISTINCT email) as count FROM contacts"
    );
    const uniqueEmails = parseInt(uniqueEmailsResult.rows[0].count);

    // Get unique companies
    const uniqueCompaniesResult = await query(
      "SELECT COUNT(DISTINCT company_name) as count FROM contacts WHERE company_name IS NOT NULL AND company_name != ''"
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
