# AutoSendr Production Deployment Guide

This guide will help you deploy AutoSendr to production using Vercel and Neon PostgreSQL.

## Prerequisites

- **Git** (required)
- **Vercel account** (for hosting)
- **Neon account** (for PostgreSQL database)
- **Google Cloud Console access** (for OAuth)
- **Groq API account** (optional, for AI features)

## Production Setup (10 minutes)

### 1. Database Setup (Neon PostgreSQL)

1. **Create Neon Project**:

   - Go to [Neon Console](https://console.neon.tech/)
   - Create a new project
   - Copy the connection string

2. **Database Schema**:
   - The application will automatically create tables on first run
   - No manual schema setup required

### 2. Environment Configuration

Create a `.env.local` file for local development:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host/database?sslmode=require

# Authentication (NextAuth.js)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Features (Optional)
GROQ_API_KEY=your-groq-api-key
```

### 3. Google OAuth Setup

1. **Create OAuth Credentials**:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials

2. **Configure Redirect URIs**:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-app.vercel.app/api/auth/callback/google`

### 4. Deploy to Vercel

1. **Connect Repository**:

   ```bash
   # Push to GitHub
   git add .
   git commit -m "Production deployment"
   git push origin main
   ```

2. **Deploy on Vercel**:

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Deploy

3. **Environment Variables for Production**:
   Set these in your Vercel dashboard:
   ```
   DATABASE_URL=your-neon-connection-string
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-generated-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GROQ_API_KEY=your-groq-api-key
   ```

### 5. Post-Deployment Setup

1. **Test Authentication**:

   - Visit your deployed app
   - Sign in with Google
   - Verify user creation works

2. **Configure Email Settings**:
   - Each user configures their own email credentials
   - Go to Settings → Email Setup
   - Test email sending functionality

## Configuration Details

### Neon PostgreSQL Setup

1. **Create Database**:

   - Sign up at [Neon](https://neon.tech/)
   - Create a new project
   - Note the connection string

2. **Connection String Format**:

   ```
   postgresql://username:password@host/database?sslmode=require
   ```

3. **Database Features**:
   - Automatic scaling
   - Built-in connection pooling
   - Serverless architecture
   - No maintenance required

### Security Configuration

1. **NextAuth Secret**:

   ```bash
   # Generate a secure secret
   openssl rand -base64 32
   ```

2. **Environment Variables**:
   - Never commit `.env` files to version control
   - Use Vercel's environment variable management
   - Separate development and production configs

### AI Features Setup (Optional)

1. **Groq API**:

   - Sign up at [Groq Console](https://console.groq.com/)
   - Create API key
   - Add to environment variables

2. **AI Rules Management**:
   - Users can customize AI behavior
   - Default rules created automatically
   - Per-user AI rule isolation

## Data Storage & Architecture

### Multi-User Data Isolation

- **Users**: Each user has isolated data
- **Templates**: User-specific email templates
- **Contacts**: User-specific contact lists
- **Attachments**: User-specific file uploads
- **Email History**: User-specific send logs
- **SMTP Config**: User-specific email credentials

### File Storage

- **Attachments**: Stored in `/uploads` directory
- **Metadata**: Stored in Neon PostgreSQL
- **Persistence**: Files persist across deployments

## Monitoring & Maintenance

### Application Health

1. **Health Check Endpoint**:

   - Visit `/health` to check system status
   - Monitors database connectivity
   - Verifies essential services

2. **Error Monitoring**:
   - Check Vercel function logs
   - Monitor database performance in Neon console
   - Track email delivery rates

### Database Management

1. **Backup Strategy**:

   - Neon provides automatic backups
   - Point-in-time recovery available
   - No manual backup required

2. **Performance Monitoring**:
   - Monitor query performance in Neon console
   - Track connection usage
   - Scale compute as needed

## Troubleshooting

### Common Issues

1. **Database Connection**:

   ```bash
   # Test connection string
   psql "your-connection-string" -c "SELECT 1;"
   ```

2. **Authentication Issues**:

   - Verify Google OAuth redirect URIs
   - Check NEXTAUTH_URL matches deployment URL
   - Ensure NEXTAUTH_SECRET is set

3. **Email Sending**:
   - Users must configure individual email settings
   - Test with Settings → Email Setup
   - Verify Gmail app passwords are correct

### Performance Optimization

1. **Database Optimization**:

   - Neon auto-scales compute
   - Connection pooling enabled by default
   - Monitor query performance

2. **Vercel Optimization**:
   - Functions auto-scale
   - Edge caching for static assets
   - Monitor function execution time

## Scaling Considerations

### User Growth

- **Database**: Neon scales automatically
- **Compute**: Vercel functions scale on demand
- **Storage**: Monitor file upload usage
- **Email**: Rate limiting per user

### Cost Management

1. **Neon Costs**:

   - Pay for compute time used
   - Storage costs scale with data
   - Connection pooling reduces costs

2. **Vercel Costs**:
   - Function execution time
   - Bandwidth usage
   - Build minutes

## Security Best Practices

1. **Environment Variables**:

   - Use Vercel's secure environment management
   - Rotate secrets regularly
   - Separate dev/prod configurations

2. **Database Security**:

   - Neon provides SSL by default
   - Connection string includes SSL mode
   - No direct database access needed

3. **User Data**:
   - Complete data isolation between users
   - Secure credential storage
   - No shared resources

## Support & Updates

### Getting Help

- Check Vercel deployment logs
- Monitor Neon database performance
- Review application health endpoint
- Check GitHub issues for known problems

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Deploy updates
git push origin main
# Vercel auto-deploys on push
```

### Rollback Strategy

- Vercel provides instant rollback to previous deployments
- Database migrations are forward-compatible
- User data remains intact during updates
