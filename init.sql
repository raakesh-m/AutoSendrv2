-- Create contacts table
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    company_name VARCHAR(255),
    role VARCHAR(255),
    recruiter_name VARCHAR(255),
    additional_info JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_templates table
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create ai_rules table for controlling AI behavior
CREATE TABLE ai_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_campaigns table
CREATE TABLE email_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_id INTEGER REFERENCES email_templates(id),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_sends table
CREATE TABLE email_sends (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES email_campaigns(id),
    contact_id INTEGER REFERENCES contacts(id),
    subject TEXT,
    body TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create smtp_config table
CREATE TABLE smtp_config (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    app_password VARCHAR(255) NOT NULL,
    smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com',
    smtp_port INTEGER DEFAULT 587,
    use_ssl BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create attachments table
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_attachments junction table (for tracking which attachments were sent with which emails)
CREATE TABLE email_attachments (
    id SERIAL PRIMARY KEY,
    email_send_id INTEGER REFERENCES email_sends(id) ON DELETE CASCADE,
    attachment_id INTEGER REFERENCES attachments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default email template based on template.md
INSERT INTO email_templates (name, subject, body, variables) VALUES (
    'Default Application Template',
    'Application for [Role] Opportunity at [CompanyName] – Raakesh',
    'Hi [RecruiterName],

I''m Raakesh, a frontend developer with around 3 years of experience building clean, responsive, and full-stack web apps. I came across your company and would love to apply for a role on your team.

Design, develop, deliver — that''s my cycle. I focus on clean UI, performance, and building real-world products with modern tools.

Here are a couple of recent projects:
• Prodpix – My first complete full-stack application from design to deployment, an AI product imagery platform that''s generated 1,000+ images: https://prodpix.com
• AIChat – Polished chatbot interface with intuitive UI/UX powered by LLaMA models: https://cyberpunkchat.vercel.app/

Portfolio & resume: https://raakesh.space
GitHub: https://github.com/raakesh-m

Happy to connect if this aligns with what you''re looking for in [CompanyName].

Looking forward to your thoughts,
Raakesh',
    ARRAY['Role', 'CompanyName', 'RecruiterName']
);

-- Insert default AI rules
INSERT INTO ai_rules (name, description, rules_text, is_active) VALUES (
    'Default Email Enhancement Rules',
    'Conservative AI rules that only fix grammar and improve flow without adding content',
    'You are an email enhancement assistant. Your job is to improve job application emails while following these strict rules:

RULES:
1. NEVER add new content, projects, or information not already present
2. ONLY fix grammar, spelling, and awkward phrasing from placeholder replacements
3. Keep the same tone, style, and personality
4. Maintain all existing links, projects, and specific details exactly as they are
5. Do not make the email longer - keep it concise
6. Do not change the core message or structure
7. Only improve readability and flow

WHAT TO FIX:
- Grammar errors from placeholder replacements
- Awkward transitions between sentences
- Minor spelling mistakes
- Improve sentence flow without changing meaning

WHAT NOT TO DO:
- Add new sentences or paragraphs
- Change project descriptions
- Add new qualifications or skills
- Modify links or contact information
- Change the greeting or closing
- Add buzzwords or corporate speak

Keep the email authentic and personal. Only make minimal improvements.',
    true
); 