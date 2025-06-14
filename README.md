# AutoSendr - Automated Email Outreach Platform

AutoSendr is a full-stack email automation platform designed for job seekers and professionals who want to automate their outreach campaigns while maintaining personalization. Built with Next.js, Neon PostgreSQL, and powered by AI customization through Groq API.

## Features

- **📧 Smart Email Automation**: Send personalized emails using customizable templates
- **🤖 AI-Powered Customization**: Leverage Groq API to enhance email personalization with configurable rules
- **📊 Contact Management**: Upload and manage contact databases from CSV, JSON, or TXT files
- **📎 Attachment Management**: Upload and manage resumes, portfolios, and documents for email campaigns
- **🔐 Secure Authentication**: Google OAuth for secure user management
- **👥 Multi-User Support**: Each user has their own isolated data and settings
- **🔐 Secure SMTP Integration**: User-specific email configurations with secure credential storage
- **📈 Campaign Analytics**: Track email sends, successes, and failures with real-time progress
- **🎨 Modern UI**: Clean, responsive interface built with shadcn/ui components
- **☁️ Cloud-Native**: Deployed on Vercel with Neon PostgreSQL
- **🧠 AI Rules Management**: Control AI behavior with customizable enhancement rules

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Neon PostgreSQL, Nodemailer
- **Authentication**: NextAuth.js with Google OAuth
- **AI Integration**: Groq SDK for email customization
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Database**: Neon PostgreSQL (serverless)
- **Deployment**: Vercel
- **File Storage**: Local filesystem with database metadata

## Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Git
- Gmail account with app password enabled (configured per user)
- Google OAuth credentials (for authentication)
- Groq API key (optional, for AI customization)

### Local Development Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd autosendr
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure Environment Variables**

   Copy `.env.example` to `.env` and update with your credentials:

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with:

   ```bash
   # Database (Neon PostgreSQL)
   DATABASE_URL=your-neon-connection-string

   # Authentication (NextAuth.js)
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-generated-secret

   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # AI (Optional)
   GROQ_API_KEY=your-groq-api-key
   ```

4. **Run the development server**

   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.vercel.app/api/auth/callback/google` (production)

### Gmail App Password Setup (Per User)

Each user configures their own email credentials in the application:

1. Enable 2-factor authentication on your Google account
2. Go to Google Account settings → Security → App passwords
3. Generate a new app password for "Mail"
4. Configure in AutoSendr: Settings → Email Setup
5. Use the app password (not your regular Gmail password)

### Groq API Key Setup

1. Sign up at [Groq Console](https://console.groq.com/)
2. Create a new API key
3. Add it to your `.env` file

## Deployment to Vercel

1. **Push to GitHub**

   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**

   - Connect your GitHub repository on [Vercel](https://vercel.com)
   - Set environment variables in Vercel dashboard
   - Deploy automatically

3. **Environment Variables for Production**
   Set these in your Vercel dashboard:
   - `DATABASE_URL` - Your Neon connection string
   - `NEXTAUTH_URL` - Your production URL (https://your-app.vercel.app)
   - `NEXTAUTH_SECRET` - Generated secret key
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
   - `GROQ_API_KEY` - Groq API key (optional)

## Data Storage

### Multi-User Architecture

AutoSendr supports multiple users with complete data isolation:

1. **User Authentication**: Google OAuth with NextAuth.js
2. **Data Isolation**: All data is scoped to individual users
3. **Default Setup**: New users automatically get default templates and AI rules

### Where Your Data is Stored

1. **Users**: Stored in Neon PostgreSQL (`users` table)
2. **Templates**: User-specific templates (`email_templates` table)
3. **AI Rules**: User-specific AI rules (`ai_rules` table)
4. **Contacts**: User-specific contacts (`contacts` table)
5. **Attachments/Resumes**: Files stored locally, metadata in database (`attachments` table)
6. **Email History**: User-specific email history (`email_sends` table)
7. **SMTP Configuration**: User-specific SMTP settings (`smtp_config` table)

## Usage Guide

### 1. Sign In

- Visit the application URL
- Click "Sign in with Google"
- Authorize the application

### 2. Configure Email Settings

1. Navigate to **Settings** → **Email Setup**
2. Enter your Gmail address and app password
3. Test the connection to ensure it works

### 3. Manage AI Enhancement Rules

1. Go to **Settings** → **AI Rules**
2. Edit the default rules or create new ones
3. Control how AI enhances your emails

### 4. Upload Contact Data

1. Go to **Dashboard** → **Upload Contact Data**
2. Upload files in supported formats (CSV, JSON, TXT)

### 5. Manage Attachments

1. Go to **Settings** → **Attachments**
2. Upload files by drag & drop
3. Organize by categories (Resume, Portfolio, etc.)

### 6. Send Email Campaigns

1. Go to **Dashboard** → **Contacts Table**
2. Select contacts to email
3. Choose AI enhancement options
4. Monitor real-time progress

## Development

### Project Structure

```
autosendr/
├── app/                    # Next.js app router
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication pages
│   └── ...                # Other pages
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
└── styles/               # CSS styles
```

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Support

For issues and questions:

- Create an issue on GitHub
- Check the documentation
- Review environment variable setup

## License

[Your License Here]
