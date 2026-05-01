---
title: Environment Setup Guide (Archived)
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, onboarding, environment, setup, dev-guide]
description: Legacy guide for setting up the development environment. Refer to the root README.md for current instructions.
---

# Environment Setup Guide

This guide helps you set up your development environment for the Science Advantage platform.

## Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd science-advantage
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Environment Variables

### Required Variables

These variables are required for the application to run:

| Variable               | Purpose                      | How to Get                                                                |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`      | JWT signing secret           | `openssl rand -base64 32`                                                 |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID       | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret   | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `DATABASE_URL`         | PostgreSQL connection string | Local PostgreSQL or cloud provider                                        |

### Optional Variables

These variables enable additional features:

| Variable                      | Purpose             | Feature              |
| ----------------------------- | ------------------- | -------------------- |
| `OPENAI_API_KEY`              | AI-powered features | OpenAI integration   |
| `GOOGLE_CLOUD_PROJECT_ID`     | File storage        | Google Cloud Storage |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | File storage        | Google Cloud Storage |
| `REDIS_URL`                   | Caching & sessions  | Redis caching        |
| `GOOGLE_ANALYTICS_ID`         | Usage analytics     | Google Analytics     |
| `SENTRY_DSN`                  | Error monitoring    | Sentry               |

## Service Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
4. Copy the Client ID and Client Secret to your `.env.local`

### Database

#### Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb science_advantage

# Create user (optional)
createuser science_advantage
```

#### Cloud Database Options

- **Supabase**: Free PostgreSQL with connection strings
- **Neon**: Serverless PostgreSQL
- **Railway**: Simple PostgreSQL hosting
- **AWS RDS**: Enterprise PostgreSQL

### Redis (Optional)

#### Local Redis

```bash
# Install Redis (macOS)
brew install redis
brew services start redis
```

#### Cloud Redis Options

- **Upstash**: Serverless Redis with free tier
- **Redis Cloud**: Managed Redis service
- **AWS ElastiCache**: Enterprise Redis

## Development Features

### Development Authentication

For local development, you can bypass Google OAuth:

```env
NEXT_PUBLIC_DEV_AUTH=true
```

This adds a development panel on the sign-in page where you can impersonate teacher or student roles.

**⚠️ Security Warning**: Never set `NEXT_PUBLIC_DEV_AUTH=true` in production!

### Environment Validation

The application automatically validates environment variables on startup. If required variables are missing:

- **Development**: Shows warnings but continues running
- **Production**: Stops with detailed error messages

You can also validate manually:

```bash
npx tsx scripts/validate-env.ts
```

## Common Issues

### "Missing required environment variable"

1. Check that `.env.local` exists in the project root
2. Verify all required variables are set
3. Restart your development server after changes

### Google OAuth "redirect_uri_mismatch"

1. Ensure the redirect URI in Google Console matches your `NEXTAUTH_URL`
2. Include the full path: `http://localhost:3000/api/auth/callback/google`
3. Wait a few minutes after changes in Google Console

### Database connection failed

1. Verify PostgreSQL is running: `brew services list | grep postgresql`
2. Check connection string format: `postgresql://user:password@host:port/database`
3. Ensure database exists: `psql -l | grep science_advantage`

### Port already in use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or use a different port
PORT=3001 npm run dev
```

## Security Best Practices

### Environment Variables

- ✅ Use `.env.local` for local development
- ✅ Never commit `.env*` files to version control
- ✅ Use different values for development and production
- ✅ Rotate secrets regularly
- ✅ Use strong, unique secrets

### Production Deployment

- ✅ Set `NODE_ENV=production`
- ✅ Use environment-specific secrets
- ✅ Enable SSL/TLS
- ✅ Set up proper CORS origins
- ✅ Configure rate limiting
- ✅ Monitor error logs

## Troubleshooting

### Validate Your Setup

Run this command to check your environment:

```bash
npm run validate-env
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

### Clean Reset

If you're having issues, try a clean reset:

```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset database
npm run dev:reset

# Clear Next.js cache
rm -rf .next
```

## Getting Help

- 📖 Check the [main documentation](../README.md)
- 🐛 [Report an issue](https://github.com/your-org/science-advantage/issues)
- 💬 Join our [Discord community](https://discord.gg/your-server)
- 📧 Email support@science-advantage.com

## Environment Variable Reference

For a complete list of all environment variables and their purposes, see [`.env.example`](../../.env.example) in the project root.
