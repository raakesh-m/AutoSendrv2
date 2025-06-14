import { NextRequest, NextResponse } from "next/server";
import { query, Contact } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// GET - Fetch contacts for authenticated user
export async function GET(request: NextRequest) {
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
      "SELECT * FROM contacts WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return NextResponse.json({ contacts: result.rows });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

// POST - Create contacts from uploaded data for authenticated user
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
    const { contacts } = await request.json();

    if (!Array.isArray(contacts)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    const insertedContacts = [];

    for (const contact of contacts) {
      try {
        const result = await query(
          `INSERT INTO contacts (user_id, email, name, company_name, role, recruiter_name, additional_info) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           ON CONFLICT (user_id, email) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, contacts.name),
           company_name = COALESCE(EXCLUDED.company_name, contacts.company_name),
           role = COALESCE(EXCLUDED.role, contacts.role),
           recruiter_name = COALESCE(EXCLUDED.recruiter_name, contacts.recruiter_name),
           additional_info = COALESCE(EXCLUDED.additional_info, contacts.additional_info),
           updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [
            userId,
            contact.email,
            contact.name || null,
            contact.company_name || contact.companyName || null,
            contact.role || contact.position || null,
            contact.recruiter_name || contact.recruiterName || null,
            contact.additional_info || {},
          ]
        );
        insertedContacts.push(result.rows[0]);
      } catch (error) {
        console.error("Error inserting contact:", contact.email, error);
      }
    }

    return NextResponse.json({
      message: `Successfully processed ${insertedContacts.length} contacts`,
      contacts: insertedContacts,
    });
  } catch (error) {
    console.error("Error processing contacts:", error);
    return NextResponse.json(
      { error: "Failed to process contacts" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a contact for authenticated user
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
        { error: "Contact ID required" },
        { status: 400 }
      );
    }

    // Check if contact has email sends
    const emailSendsCheck = await query(
      "SELECT COUNT(*) as count FROM email_sends WHERE contact_id = $1 AND user_id = $2",
      [id, userId]
    );

    const emailSendCount = parseInt(emailSendsCheck.rows[0].count);

    if (emailSendCount > 0) {
      // Delete related email sends first (user-scoped)
      await query(
        "DELETE FROM email_sends WHERE contact_id = $1 AND user_id = $2",
        [id, userId]
      );
      console.log(
        `Deleted ${emailSendCount} email send records for contact ${id}`
      );
    }

    // Delete the contact (user-scoped)
    const deleteResult = await query(
      "DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Contact deleted successfully",
      emailSendsDeleted: emailSendCount,
    });
  } catch (error) {
    console.error("Error deleting contact:", error);

    // Handle specific PostgreSQL foreign key constraint errors
    if (error instanceof Error && error.message.includes("23503")) {
      return NextResponse.json(
        {
          error:
            "Cannot delete contact because it has associated email records. Please contact support.",
          code: "FOREIGN_KEY_CONSTRAINT",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
