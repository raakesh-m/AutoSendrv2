import { Pool } from "pg";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://autosendr_user:autosendr_password@localhost:5432/autosendr",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export { pool };

// Database query helper
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Contact interface
export interface Contact {
  id?: number;
  email: string;
  name?: string;
  company_name?: string;
  role?: string;
  recruiter_name?: string;
  additional_info?: any;
  created_at?: Date;
  updated_at?: Date;
}

// Email template interface
export interface EmailTemplate {
  id?: number;
  name: string;
  subject: string;
  body: string;
  variables?: string[];
  created_at?: Date;
  updated_at?: Date;
}

// AI rules interface
export interface AiRules {
  id?: number;
  name: string;
  description?: string;
  rules_text: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// SMTP config interface
export interface SmtpConfig {
  id?: number;
  email: string;
  app_password: string;
  smtp_host: string;
  smtp_port: number;
  use_ssl: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Attachment interface
export interface Attachment {
  id?: number;
  name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  category: string;
  description?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}
