import { neon, neonConfig } from "@neondatabase/serverless";

// Configure Neon for optimal performance
neonConfig.fetchConnectionCache = true;

// Create the SQL function using Neon's serverless driver
const sql = neon(process.env.DATABASE_URL!);

export { sql };

// Database query helper function (compatible with existing code)
export async function query(text: string, params?: any[]) {
  try {
    console.log(`🔍 Executing query: ${text.substring(0, 50)}...`);
    const result = await sql(text, params);
    console.log(
      `✅ Query successful, returned ${
        Array.isArray(result) ? result.length : 0
      } rows`
    );
    // Format result to match pg interface
    return {
      rows: result,
      rowCount: Array.isArray(result) ? result.length : 0,
    };
  } catch (error) {
    console.error("❌ Database query error:", error);
    console.error("Query was:", text);
    console.error("Params were:", params);

    // Check if it's a connection timeout
    if (error instanceof Error && error.message.includes("timeout")) {
      console.error(
        "🕐 This appears to be a connection timeout. Check your internet connection and Neon database status."
      );
    }

    throw error;
  }
}

// Updated interfaces for multi-user support
export interface User {
  id: string;
  email: string;
  name?: string;
  created_at?: Date;
  updated_at?: Date;
}

// Contact interface with user association
export interface Contact {
  id?: number;
  user_id: string;
  email: string;
  name?: string;
  company_name?: string;
  role?: string;
  recruiter_name?: string;
  additional_info?: any;
  created_at?: Date;
  updated_at?: Date;
}

// Email template interface with user association
export interface EmailTemplate {
  id?: number;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  variables?: string[];
  is_default?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// AI rules interface with user association
export interface AiRules {
  id?: number;
  user_id: string;
  name: string;
  description?: string;
  rules_text: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// SMTP config interface with user association
export interface SmtpConfig {
  id?: number;
  user_id: string;
  email: string;
  app_password: string;
  smtp_host: string;
  smtp_port: number;
  use_ssl: boolean;
  provider_type: string;
  created_at?: Date;
  updated_at?: Date;
}

// Attachment interface with user association (updated for R2 storage)
export interface Attachment {
  id?: number;
  user_id: string;
  name: string;
  original_name: string;
  r2_key: string; // R2 storage key instead of file_path
  file_size: number;
  mime_type: string;
  category: string;
  description?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}
