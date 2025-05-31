import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { readFile } from "fs/promises";
import { join } from "path";

// GET - Download/serve a specific attachment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get attachment info from database
    const result = await query(
      "SELECT * FROM attachments WHERE id = $1 AND is_active = true",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    const attachment = result.rows[0];
    const filePath = join(process.cwd(), "uploads", attachment.file_path);

    try {
      // Read file from filesystem
      const fileBuffer = await readFile(filePath);

      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": attachment.mime_type,
          "Content-Disposition": `attachment; filename="${attachment.original_name}"`,
          "Content-Length": attachment.file_size.toString(),
        },
      });
    } catch (fileError) {
      console.error("Error reading file:", fileError);
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error serving attachment:", error);
    return NextResponse.json(
      { error: "Failed to serve attachment" },
      { status: 500 }
    );
  }
}
