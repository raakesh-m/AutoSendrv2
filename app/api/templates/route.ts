import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Fetch all email templates
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        id,
        name,
        subject,
        body,
        variables,
        created_at,
        updated_at
      FROM email_templates 
      ORDER BY created_at DESC
    `);

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

// POST - Create a new email template
export async function POST(request: NextRequest) {
  try {
    const { name, subject, body, variables } = await request.json();

    if (!name || !subject || !body) {
      return NextResponse.json(
        { error: "Name, subject, and body are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO email_templates (name, subject, body, variables) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, subject, body, variables || []]
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

// PUT - Update an existing email template
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const { name, subject, body, variables } = await request.json();

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
       SET name = $1, subject = $2, body = $3, variables = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [name, subject, body, variables || [], id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Template not found" },
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

// DELETE - Delete an email template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Template ID required" },
        { status: 400 }
      );
    }

    await query("DELETE FROM email_templates WHERE id = $1", [id]);
    return NextResponse.json({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}
