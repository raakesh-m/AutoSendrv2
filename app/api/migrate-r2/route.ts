import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth/next";

// POST - Migrate database schema for R2 storage
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (basic security)
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔄 Starting R2 migration...");

    // Check if the column already exists
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attachments' 
      AND column_name = 'r2_key'
    `);

    if (checkColumn.rows.length > 0) {
      return NextResponse.json({
        message: "Migration already completed - r2_key column exists",
        status: "already_migrated",
      });
    }

    // Add r2_key column to attachments table
    await query(`
      ALTER TABLE attachments 
      ADD COLUMN r2_key VARCHAR(500)
    `);

    console.log("✅ Added r2_key column to attachments table");

    // Update existing records to have a placeholder r2_key based on file_path
    // This is for backward compatibility - existing files will need manual migration
    await query(`
      UPDATE attachments 
      SET r2_key = CONCAT('legacy/', file_path) 
      WHERE r2_key IS NULL AND file_path IS NOT NULL
    `);

    console.log("✅ Updated existing records with legacy r2_key values");

    // Make r2_key NOT NULL after updating existing records
    await query(`
      ALTER TABLE attachments 
      ALTER COLUMN r2_key SET NOT NULL
    `);

    console.log("✅ Set r2_key column as NOT NULL");

    return NextResponse.json({
      message: "R2 migration completed successfully",
      status: "migrated",
      changes: [
        "Added r2_key column to attachments table",
        "Updated existing records with legacy r2_key values",
        "Set r2_key as NOT NULL",
      ],
    });
  } catch (error) {
    console.error("❌ R2 migration failed:", error);
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET - Check migration status
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if r2_key column exists
    const checkColumn = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attachments' 
      AND column_name = 'r2_key'
    `);

    const migrated = checkColumn.rows.length > 0;

    return NextResponse.json({
      migrated,
      status: migrated ? "ready" : "needs_migration",
    });
  } catch (error) {
    console.error("Error checking migration status:", error);
    return NextResponse.json(
      { error: "Failed to check migration status" },
      { status: 500 }
    );
  }
}
