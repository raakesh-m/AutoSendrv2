import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { r2Storage } from "@/lib/r2-storage";

// GET - Download attachment file from R2
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Attachment ID required" },
        { status: 400 }
      );
    }

    // Get attachment info (user-scoped)
    const attachmentResult = await query(
      "SELECT r2_key, original_name, mime_type FROM attachments WHERE id = $1 AND user_id = $2 AND is_active = true",
      [id, userId]
    );

    if (attachmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    const { r2_key, original_name, mime_type } = attachmentResult.rows[0];

    // Handle legacy files (not in R2)
    if (r2_key.startsWith("legacy/")) {
      return NextResponse.json(
        { error: "Legacy file not available for download" },
        { status: 410 } // Gone
      );
    }

    // Generate presigned URL for download (expires in 1 hour)
    const downloadUrl = await r2Storage.getDownloadUrl(r2_key, 3600);

    // Return the presigned URL for client-side download
    return NextResponse.json({
      downloadUrl,
      filename: original_name,
      contentType: mime_type,
      message: "Download URL generated successfully",
    });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
