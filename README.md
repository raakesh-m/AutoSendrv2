# AutoSendr - Automated Email Outreach Platform

AutoSendr is a full-stack email automation platform designed for job seekers and professionals who want to automate their outreach campaigns while maintaining personalization. Built with Next.js, PostgreSQL, and powered by AI customization through Groq API.

## Features

- **📧 Smart Email Automation**: Send personalized emails using customizable templates
- **🤖 AI-Powered Customization**: Leverage Groq API to enhance email personalization with configurable rules
- **📊 Contact Management**: Upload and manage contact databases from CSV, JSON, or TXT files
- **📎 Attachment Management**: Upload and manage resumes, portfolios, and documents for email campaigns
- **🔐 Secure SMTP Integration**: Use Gmail's app passwords for secure email sending
- **📈 Campaign Analytics**: Track email sends, successes, and failures with real-time progress
- **🎨 Modern UI**: Clean, responsive interface built with shadcn/ui components
- **🐳 Docker Support**: Easy deployment with Docker and PostgreSQL
- **🧠 AI Rules Management**: Control AI behavior with customizable enhancement rules

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL, Nodemailer
- **AI Integration**: Groq SDK for email customization
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Database**: PostgreSQL with connection pooling
- **File Storage**: Local filesystem with database metadata
- **Deployment**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker Desktop
- Git
- Gmail account with app password enabled (optional)
- Groq API key (optional, for AI customization)

### One-Command Setup 🚀

```bash
# Clone the repository
git clone <repository-url>
cd autosendr

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration (see Configuration section below)
nano .env

# Start everything with Docker
./start.sh
```

That's it! The script will:

- ✅ Check if Docker is running
- 🔧 Build the Next.js application
- 🗄️ Start PostgreSQL database with schema
- 🌐 Launch the web application
- 📊 Set up all necessary volumes and networks

**Alternative Docker Commands:**

```bash
# Start full stack (build + run)
docker-compose up --build

# Start in background
docker-compose up --build -d

# Stop everything
docker-compose down

# Reset database (removes all data)
docker-compose down -v
```

### Manual Development Setup

If you prefer to run the frontend locally for development:

```bash
# Start only the database
docker-compose up db -d

# Install dependencies and run frontend
pnpm install
pnpm dev
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration (automatically configured in Docker)
DATABASE_URL=postgresql://autosendr_user:autosendr_password@localhost:5432/autosendr

# Gmail Configuration (required for sending emails)
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Groq API Configuration (optional, for AI features)
GROQ_API_KEY=your-groq-api-key-here
```

### Gmail App Password Setup

1. Enable 2-factor authentication on your Google account
2. Go to Google Account settings → Security → App passwords
3. Generate a new app password for "Mail"
4. Use this password in AutoSendr (not your regular Gmail password)

### Groq API Key Setup

1. Sign up at [Groq Console](https://console.groq.com/)
2. Create a new API key
3. Add it to your `.env` file

### Access the Application

- **Web Interface**: http://localhost:3000
- **Database**: localhost:5432 (autosendr_user/autosendr_password)

## Data Storage

### Where Your Data is Stored

1. **Templates**: Stored in PostgreSQL database (`email_templates` table)
2. **AI Rules**: Stored in PostgreSQL database (`ai_rules` table)
3. **Contacts**: Stored in PostgreSQL database (`contacts` table)
4. **Attachments/Resumes**:
   - Files stored in Docker volume: `autosendr_uploads_data`
   - Metadata stored in PostgreSQL database (`attachments` table)
5. **Email History**: Stored in PostgreSQL database (`email_sends` table)
6. **SMTP Configuration**: Stored in PostgreSQL database (`smtp_config` table)

### Data Persistence

- **Database**: Persisted in Docker volume `autosendr_postgres_data`
- **Uploaded Files**: Persisted in Docker volume `autosendr_uploads_data`
- **Configuration**: Environment variables in `.env` file

### Backup Your Data

```bash
# Backup database
docker-compose exec db pg_dump -U autosendr_user autosendr > backup.sql

# Backup uploaded files
docker cp autosendr-app-1:/app/uploads ./uploads-backup

# Restore database
docker-compose exec -T db psql -U autosendr_user autosendr < backup.sql
```

## Usage Guide

### 1. Configure Email Settings

1. Navigate to **Attachments & Templates** → **SMTP Configuration**
2. Enter your Gmail address and app password
3. Test the connection to ensure it works

### 2. Manage AI Enhancement Rules

1. Go to **Attachments & Templates** → **AI Enhancement Rules**
2. Edit the default rules or create new ones
3. Control how AI enhances your emails:
   - What AI can fix (grammar, flow)
   - What AI cannot do (add content, change links)

### 3. Upload Contact Data

1. Go to **Dashboard** → **Upload Contact Data**
2. Upload files in supported formats:

**CSV Format:**

```csv
email,name,company_name,role,recruiter_name
john@company.com,John Doe,TechCorp,Software Engineer,Jane Smith
```

**JSON Format:**

```json
[
  {
    "email": "john@company.com",
    "name": "John Doe",
    "company_name": "TechCorp",
    "role": "Software Engineer",
    "recruiter_name": "Jane Smith"
  }
]
```

### 4. Manage Attachments

1. Go to **Attachments & Templates** page
2. Upload files by drag & drop or clicking to select
3. Organize files by categories:
   - **Resume/CV**: Your resume files
   - **Portfolio**: Portfolio pieces and work samples
   - **Cover Letter**: Customized cover letters
   - **Certificate**: Certifications and credentials
   - **Document**: General documents
   - **Image**: Images and visual content

### 5. Send Email Campaigns

**Single Email:**

1. Go to **Single Email Sender**
2. Fill in company details
3. Preview and send

**Bulk Campaigns:**

1. Go to **Dashboard** → **Contacts Table**
2. Select contacts to email
3. Choose AI enhancement options
4. Monitor real-time progress

## Email Template System

The default email template includes:

- Subject: `Application for [Role] Opportunity at [CompanyName] – Raakesh`
- Personalized content with project showcases
- Automatic variable replacement:
  - `[Role]` → Contact's role
  - `[CompanyName]` → Contact's company
  - `[RecruiterName]` → Contact's recruiter name

## Development

### Project Structure

```
autosendr/
├── app/                    # Next.js app router
│   ├── api/               # API endpoints
│   │   ├── ai-rules/      # AI rules management
│   │   ├── attachments/   # File attachment management
│   │   ├── contacts/      # Contact management
│   │   ├── email/         # Email sending & optimization
│   │   ├── smtp/          # SMTP configuration
│   │   ├── templates/     # Email template management
│   │   └── upload/        # File processing
│   ├── attachments/       # Attachments & templates page
│   ├── database/          # Database management page
│   ├── single-email-sender/ # Single email interface
│   └── email-tester/      # Email testing & preview
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── ai-rules-manager.tsx # AI rules management
│   ├── attachments-manager.tsx # File management
│   ├── contacts-table.tsx # Contact management
│   ├── email-tester-form.tsx # Single email sender
│   └── template-manager.tsx # Email template editor
├── lib/                   # Utility functions
│   ├── db.ts             # Database connection
│   ├── email-enhancement.ts # Shared AI enhancement
│   └── utils.ts          # General utilities
├── hooks/                 # Custom React hooks
├── uploads/              # File upload directory (auto-created)
├── docker-compose.yml     # Docker services
├── init.sql              # Database schema
└── Dockerfile            # Application container
```

### API Endpoints

- `GET/POST/PUT/DELETE /api/ai-rules` - AI rules management
- `GET /api/ai-rules/active` - Get active AI rules
- `GET/POST/DELETE /api/contacts` - Contact CRUD operations
- `POST /api/upload` - Process uploaded files
- `GET/POST/DELETE /api/attachments` - File attachment management
- `GET/POST/PUT/DELETE /api/templates` - Email template management
- `POST /api/email/send` - Send bulk email campaigns
- `POST /api/email/optimize` - AI email enhancement
- `POST /api/email/test` - Send single test email
- `GET/POST/PUT /api/smtp` - SMTP configuration

### Database Schema

```sql
-- Core tables
contacts              # Contact information
email_templates       # Email templates with variables
ai_rules             # AI enhancement rules
attachments          # File metadata
smtp_config          # Email configuration

-- Campaign tracking
email_campaigns      # Campaign metadata
email_sends          # Individual email logs
email_attachments    # Email-attachment relationships
```

## Security & Privacy

- **Environment Variables**: Sensitive data stored in `.env` (not committed to Git)
- **Gmail App Passwords**: Secure authentication without exposing main password
- **File Validation**: Strict file type and size limits
- **SQL Injection Protection**: Parameterized queries
- **Data Isolation**: Docker containers with network isolation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

1. Check the GitHub Issues page
2. Review the documentation
3. Create a new issue with detailed information

---

**Note**: This is a personal project designed for job search automation. Please use responsibly and in accordance with email best practices and anti-spam regulations.
