# AutoSendr Deployment Guide

This guide will help you deploy AutoSendr on your local machine or server.

## Prerequisites

- **Docker Desktop** (required)
- **Git** (required)
- **Gmail account** with 2FA enabled (for email sending)
- **Groq API account** (optional, for AI features)

## Quick Setup (5 minutes)

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-username/autosendr.git
cd autosendr

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit the `.env` file with your settings:

```bash
# Required: Database (leave as-is for Docker setup)
DATABASE_URL=postgresql://autosendr_user:autosendr_password@localhost:5432/autosendr

# Required: Gmail Configuration
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

# Optional: AI Features
GROQ_API_KEY=your-groq-api-key-here
```

### 3. Start the Application

```bash
# Make start script executable
chmod +x start.sh

# Start everything
./start.sh
```

**Alternative:**

```bash
docker-compose up --build -d
```

### 4. Access the Application

- **Web Interface**: http://localhost:3000
- **Database**: localhost:5432

## Configuration Details

### Gmail App Password Setup

1. **Enable 2-Factor Authentication**:

   - Go to Google Account → Security
   - Turn on 2-Step Verification

2. **Generate App Password**:
   - Go to Google Account → Security → App passwords
   - Select "Mail" as the app
   - Copy the generated 16-character password
   - Use this in your `.env` file (not your regular Gmail password)

### Groq API Setup (Optional)

1. **Sign up**: Visit [Groq Console](https://console.groq.com/)
2. **Create API Key**: Generate a new API key
3. **Add to .env**: Paste the key in your `.env` file

## Data Storage Locations

### Your Data is Stored In:

1. **Database**: Docker volume `autosendr_postgres_data`

   - Templates, AI rules, contacts, email history
   - Persists between container restarts

2. **Uploaded Files**: Docker volume `autosendr_uploads_data`

   - Resumes, portfolios, attachments
   - Persists between container restarts

3. **Configuration**: `.env` file
   - Email settings, API keys
   - Keep this file secure and private

### Backup Your Data

```bash
# Backup database
docker-compose exec db pg_dump -U autosendr_user autosendr > autosendr-backup.sql

# Backup uploaded files
docker cp autosendr-app-1:/app/uploads ./uploads-backup

# Restore database (if needed)
docker-compose exec -T db psql -U autosendr_user autosendr < autosendr-backup.sql
```

## Troubleshooting

### Application Won't Start

```bash
# Check if Docker is running
docker --version

# Check container logs
docker-compose logs app
docker-compose logs db

# Restart everything
docker-compose down
docker-compose up --build
```

### Database Issues

```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up --build

# Check database connection
docker-compose exec db psql -U autosendr_user -d autosendr -c "SELECT 1;"
```

### Email Sending Issues

1. **Check Gmail Settings**:

   - Verify 2FA is enabled
   - Confirm app password is correct
   - Test in Single Email Sender first

2. **Check SMTP Configuration**:
   - Go to Attachments & Templates → SMTP Configuration
   - Test connection

### AI Features Not Working

1. **Check Groq API Key**:

   - Verify key is correct in `.env`
   - Check Groq Console for usage limits

2. **Check AI Rules**:
   - Go to Attachments & Templates → AI Enhancement Rules
   - Ensure rules are active

## Production Deployment

### Security Considerations

1. **Environment Variables**:

   - Use strong database passwords
   - Keep API keys secure
   - Don't commit `.env` to version control

2. **Network Security**:

   - Use HTTPS in production
   - Configure firewall rules
   - Limit database access

3. **Data Backup**:
   - Schedule regular database backups
   - Backup uploaded files
   - Test restore procedures

### Docker Production Setup

```bash
# Production environment
export NODE_ENV=production

# Use production database
export DATABASE_URL=postgresql://user:password@prod-db:5432/autosendr

# Start in production mode
docker-compose up --build -d
```

## Updating AutoSendr

```bash
# Stop the application
docker-compose down

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up --build -d
```

## Uninstalling

```bash
# Stop and remove containers
docker-compose down

# Remove all data (WARNING: permanent)
docker-compose down -v

# Remove Docker images
docker rmi autosendr-app postgres:15
```

## Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the main README.md
- **Email Problems**: Verify Gmail app password setup
- **AI Issues**: Check Groq API documentation

---

**Need Help?** Create an issue on GitHub with:

- Your operating system
- Docker version
- Error messages
- Steps you've tried
