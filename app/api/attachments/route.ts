import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { r2Storage } from "@/lib/r2-storage";

// GET - Fetch attachments for authenticated user
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

    // Get attachments with R2 keys
    const result = await query(
      "SELECT * FROM attachments WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC",
      [userId]
    );

    // Get storage quota information
    const quota = await r2Storage.getUserStorageQuota(userId);

    return NextResponse.json({
      attachments: result.rows,
      quota,
    });
  } catch (error) {
    console.error("Error fetching attachments:", error);
    return NextResponse.json(
      { error: "Failed to fetch attachments" },
      { status: 500 }
    );
  }
}

// POST - Upload new attachment for authenticated user using R2
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
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "general";
    const description = (formData.get("description") as string) || "";
    const name = (formData.get("name") as string) || file.name;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check if user can upload this file (includes size and quota checks)
    const uploadCheck = await r2Storage.canUserUploadFile(userId, file.size);
    if (!uploadCheck.canUpload) {
      return NextResponse.json(
        {
          error: "Upload not allowed",
          message: uploadCheck.reason,
        },
        { status: 413 }
      );
    }

    // Upload file to R2
    const uploadResult = await r2Storage.uploadFile(userId, file, {
      category,
      description,
    });

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          error: "Upload failed",
          message: uploadResult.error,
        },
        { status: 500 }
      );
    }

    // Save file info to database with R2 key
    const result = await query(
      `INSERT INTO attachments (user_id, name, original_name, file_path, r2_key, file_size, mime_type, category, description) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        userId,
        name,
        file.name,
        null, // NULL for file_path since we're using R2
        uploadResult.key, // Store R2 key instead of file path
        file.size,
        file.type,
        category,
        description,
      ]
    );

    // Get updated quota information
    const quota = await r2Storage.getUserStorageQuota(userId);

    return NextResponse.json({
      message: "File uploaded successfully to R2 storage",
      attachment: result.rows[0],
      quota,
    });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an attachment for authenticated user
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
        { error: "Attachment ID required" },
        { status: 400 }
      );
    }

    // Get attachment info before deletion (user-scoped)
    const attachmentResult = await query(
      "SELECT r2_key FROM attachments WHERE id = $1 AND user_id = $2 AND is_active = true",
      [id, userId]
    );

    if (attachmentResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

    const r2Key = attachmentResult.rows[0].r2_key;

    // Delete from R2 storage (only if not a legacy file)
    if (!r2Key.startsWith("legacy/")) {
      const deleteSuccess = await r2Storage.deleteFile(r2Key);
      if (!deleteSuccess) {
        console.warn(`Failed to delete file from R2: ${r2Key}`);
        // Continue with database deletion even if R2 deletion fails
      }
    }

    // Soft delete in database - mark as inactive (user-scoped)
    await query(
      "UPDATE attachments SET is_active = false WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    // Get updated quota information
    const quota = await r2Storage.getUserStorageQuota(userId);

    return NextResponse.json({
      message: "Attachment deleted successfully",
      quota,
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 500 }
    );
  }
}
