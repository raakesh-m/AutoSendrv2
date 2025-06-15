const { neon } = require("@neondatabase/serverless");

// Load environment variables
require("dotenv").config();

const sql = neon(process.env.DATABASE_URL);

async function migrateToR2() {
  try {
    console.log("🔄 Starting R2 migration...");

    // Check if the column already exists
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attachments' 
      AND column_name = 'r2_key'
    `;

    if (checkColumn.length > 0) {
      console.log("✅ Migration already completed - r2_key column exists");
      return;
    }

    // Add r2_key column to attachments table
    await sql`
      ALTER TABLE attachments 
      ADD COLUMN r2_key VARCHAR(500)
    `;

    console.log("✅ Added r2_key column to attachments table");

    // Make file_path column nullable since R2 files don't need it
    await sql`
      ALTER TABLE attachments 
      ALTER COLUMN file_path DROP NOT NULL
    `;

    console.log("✅ Made file_path column nullable for R2 compatibility");

    // Update existing records to have a placeholder r2_key based on file_path
    // This is for backward compatibility - existing files will need manual migration
    await sql`
      UPDATE attachments 
      SET r2_key = CONCAT('legacy/', file_path) 
      WHERE r2_key IS NULL AND file_path IS NOT NULL
    `;

    console.log("✅ Updated existing records with legacy r2_key values");

    // Make r2_key NOT NULL after updating existing records
    await sql`
      ALTER TABLE attachments 
      ALTER COLUMN r2_key SET NOT NULL
    `;

    console.log("✅ Set r2_key column as NOT NULL");

    console.log("🎉 R2 migration completed successfully!");
  } catch (error) {
    console.error("❌ R2 migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateToR2();
