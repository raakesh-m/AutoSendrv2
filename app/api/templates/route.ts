import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// GET - Fetch all email templates for authenticated user
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
        user_id,
        name,
        subject,
        body,
        variables,
        is_default,
        created_at,
        updated_at
      FROM email_templates 
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
      [userId]
    );

    return NextResponse.json({
      templates: result.rows.map((row) => ({
        ...row,
        created_at: new Date(row.created_at).toLocaleString(),
        updated_at: new Date(row.updated_at).toLocaleString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// POST - Create a new email template for authenticated user
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
    const { name, subject, body, variables, is_default } = await request.json();

    if (!name || !subject || !body) {
      return NextResponse.json(
        { error: "Name, subject, and body are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO email_templates (user_id, name, subject, body, variables, is_default) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [userId, name, subject, body, variables || [], is_default || false]
    );

    return NextResponse.json({
      message: "Template created successfully",
      template: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing email template for authenticated user
export async function PUT(request: NextRequest) {
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
    const { name, subject, body, variables, is_default } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Template ID required" },
        { status: 400 }
      );
    }

    if (!name || !subject || !body) {
      return NextResponse.json(
        { error: "Name, subject, and body are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE email_templates 
       SET name = $1, subject = $2, body = $3, variables = $4, is_default = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, subject, body, variables || [], is_default || false, id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Template not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Template updated successfully",
      template: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an email template for authenticated user
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
        { error: "Template ID required" },
        { status: 400 }
      );
    }

    const deleteResult = await query(
      "DELETE FROM email_templates WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Template not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
