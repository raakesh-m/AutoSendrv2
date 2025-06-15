import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { r2Storage } from "@/lib/r2-storage";

// GET - Get user's storage quota information
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

    // Get storage quota information
    const quota = await r2Storage.getUserStorageQuota(userId);

    return NextResponse.json({
      quota,
      message: "Storage quota retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting storage quota:", error);
    return NextResponse.json(
      { error: "Failed to get storage quota" },
      { status: 500 }
    );
  }
}
