---
title: Development Workflow
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, architecture, workflow, git, process]
description: Guide to the software development lifecycle, git workflow, and release process.
---

# Development Workflow

## Overview

The Science Advantage platform uses a streamlined development workflow that leverages Next.js 15, TypeScript, and modern tooling to provide an efficient development experience. This section outlines the complete setup process, environment configuration, and development commands needed to run the platform locally.

## Local Development Setup

### Prerequisites

Before setting up the development environment, ensure you have the following installed:

#### Required Tools

- **Node.js**: Version 20.x or higher

  ```bash
  # Check current version
  node --version

  # Install via nvm (recommended)
  nvm install 20
  nvm use 20
  ```

- **npm**: Version 10.x or higher (comes with Node.js)

  ```bash
  npm --version
  ```

- **PostgreSQL**: Version 16 or higher

  ```bash
  # macOS
  brew install postgresql@16

  # Ubuntu/Debian
  sudo apt-get install postgresql-16

  # Windows: Download from postgresql.org
  ```

- **Git**: For version control
  ```bash
  git --version
  ```

#### Optional Tools

- **Docker & Docker Compose**: For containerized database

  ```bash
  docker --version
  docker-compose --version
  ```

- **Redis**: For caching and session storage (optional for development)

  ```bash
  # macOS
  brew install redis

  # Ubuntu/Debian
  sudo apt-get install redis-server
  ```

### Initial Setup Commands

Follow these steps to set up the development environment:

#### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd science-advantage

# Install dependencies
npm install
```

#### 2. Database Setup

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait for database to be ready (check health status)
docker-compose ps postgres

# The database will be available at: postgresql://postgres:postgres@localhost:5433/science_advantage
```

**Option B: Local PostgreSQL Installation**

```bash
# Create database
createdb science_advantage

# Create user (if needed)
createuser --interactive
```

#### 3. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit the environment file
nano .env.local
```

#### 4. Database Schema and Seeding

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database with initial data
npm run seed
```

> **IMPORTANT**: Environment variables must be explicitly passed to Prisma commands in some environments. If you encounter "Environment variable not found" errors, use:
> 
> ```bash
> # Load environment variables explicitly
> DATABASE_URL="postgresql://postgres:postgres@localhost:5433/science_advantage" npx prisma generate
> DATABASE_URL="postgresql://postgres:postgres@localhost:5433/science_advantage" npx prisma db push
> 
> # Or load all environment variables from .env.local
> set -a && source .env.local && set +a && npx prisma generate
> set -a && source .env.local && set +a && npx prisma db push
> ```

#### 5. Start Development Server

```bash
# Start the development server with Turbopack
npm run dev
```

The application will be available at `http://localhost:3000`.

### Development Commands

#### Core Development

```bash
# Start development server with hot reload
npm run dev

# Build for production (with Turbopack)
npm run build

# Start production server locally
npm run start
```

#### Database Management

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push

# Create and apply migrations (for production)
npx prisma migrate dev --name <migration-name>

# Reset database (destructive)
npm run dev:reset

# View database in Prisma Studio
npx prisma studio
```

#### Testing

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run all tests
npm run test:integration && npm run test:e2e
```

#### Code Quality

```bash
# Lint code
npm run lint

# Check code formatting
npm run format

# Format code automatically
npm run format:write
```

## Environment Configuration

### Environment Variables Structure

The platform uses a structured approach to environment variables with validation through `lib/env.ts`.

#### Required Environment Variables

Create a `.env.local` file with the following required variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/science_advantage"

# NextAuth.js Configuration
NEXTAUTH_SECRET="your-super-secret-key-at-least-32-characters-long"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-oauth-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

#### Optional Environment Variables

```bash
# OpenAI Integration (for AI-powered features)
OPENAI_API_KEY="sk-your-openai-api-key"

# Google Cloud Storage (for file uploads)
GOOGLE_CLOUD_STORAGE_BUCKET="your-gcs-bucket-name"
GOOGLE_CLOUD_PROJECT_ID="your-gcp-project-id"

# Redis Configuration (for caching and sessions)
REDIS_URL="redis://localhost:6379"

# Development Features
NEXT_PUBLIC_DEV_AUTH="true"  # Enable development auth override
```

### Frontend Environment Variables

Variables accessible on the client side (must be prefixed with `NEXT_PUBLIC_`):

```typescript
// lib/env.ts - Client-side accessible variables
export const publicEnv = {
  NEXT_PUBLIC_APP_NAME: 'Science Advantage',
  NEXT_PUBLIC_DEV_AUTH: process.env.NEXT_PUBLIC_DEV_AUTH === 'true',
  NEXT_PUBLIC_API_URL:
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
};
```

### Backend Environment Variables

Server-only environment variables:

```typescript
// lib/env.ts - Server-only variables
export const serverEnv = {
  DATABASE_URL: required('DATABASE_URL'),
  NEXTAUTH_SECRET: required('NEXTAUTH_SECRET'),
  GOOGLE_CLIENT_ID: required('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: required('GOOGLE_CLIENT_SECRET'),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GOOGLE_CLOUD_STORAGE_BUCKET: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
  REDIS_URL: process.env.REDIS_URL,
};
```

### External Services Configuration

#### Google OAuth Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Configure OAuth Consent Screen**
   - Navigate to "APIs & Services" > "OAuth consent screen"
   - Choose "External" and configure required fields
   - Add authorized domains: `localhost`, `yourdomain.com`

3. **Create OAuth Credentials**
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://yourdomain.com/api/auth/callback/google`

4. **Copy Credentials to Environment**
   ```bash
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```

#### OpenAI Integration (Optional)

1. **Create OpenAI Account**
   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Generate API key

2. **Configure Environment**
   ```bash
   OPENAI_API_KEY="sk-your-openai-api-key"
   ```

#### Google Cloud Storage (Optional)

1. **Create GCS Bucket**

   ```bash
   # Using gcloud CLI
   gsutil mb gs://your-bucket-name

   # Make bucket public (if needed)
   gsutil iam ch allUsers:objectViewer gs://your-bucket-name
   ```

2. **Configure Environment**
   ```bash
   GOOGLE_CLOUD_STORAGE_BUCKET="your-bucket-name"
   GOOGLE_CLOUD_PROJECT_ID="your-project-id"
   ```

## Development Workflow Features

### Hot Module Replacement

The development server includes:

- **Fast Refresh**: React components update without losing state
- **API Route Hot Reload**: Serverless functions update automatically
- **CSS Updates**: Tailwind CSS changes apply instantly

### Database Seeding

The platform includes comprehensive database seeding for development:

```typescript
// prisma/seed.ts
async function main() {
  // Create demo teacher
  const teacher = await prisma.user.create({
    data: {
      email: 'teacher@scienceadvantage.com',
      name: 'Demo Teacher',
      role: 'TEACHER',
    },
  });

  // Create demo class
  const demoClass = await prisma.class.create({
    data: {
      name: 'Introduction to Biology',
      description: 'Basic biology concepts for beginners',
      joinCode: 'DEMO123',
      teacherId: teacher.id,
    },
  });

  // Create sample lessons
  await prisma.lesson.createMany({
    data: [
      {
        title: 'Cell Structure',
        slug: 'cell-structure',
        type: 'LESSON',
        content: 'Lesson content about cells...',
        order: 1,
      },
      {
        title: 'Photosynthesis Experiment',
        slug: 'photosynthesis-experiment',
        type: 'EXPERIMENT',
        content: 'Experiment instructions...',
        order: 2,
      },
    ],
  });
}
```

### Development Authentication

For local development, the platform includes a development authentication override:

```typescript
// Enable dev auth by setting
NEXT_PUBLIC_DEV_AUTH="true"

// Access dev auth panel at
http://localhost:3000/signin
```

This allows:

- Impersonation of teacher/student roles
- Bypassing Google OAuth in development
- Testing different user scenarios

### Error Handling and Debugging

#### Development Error Pages

- **Next.js Error Overlay**: Detailed error information in development
- **API Route Errors**: Full stack traces and request details
- **Database Errors**: Prisma query logging and error details

#### Debug Configuration

```typescript
// next.config.ts
const nextConfig = {
  // Enable detailed logging in development
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Development-specific configurations
  ...(process.env.NODE_ENV === 'development' && {
    reactStrictMode: true,
    swcMinify: false,
  }),
};
```

## Testing Workflow

### Unit Testing

```bash
# Run unit tests with Vitest
npm run test

# Watch mode for development
npm run test:watch
```

Unit tests are co-located with components:

```typescript
// components/features/auth/sign-in-button.test.tsx
import { render, screen } from '@testing-library/react';
import { SignInButton } from './sign-in-button';

describe('SignInButton', () => {
  it('renders sign in text', () => {
    render(<SignInButton />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });
});
```

### Integration Testing

```bash
# Run API route tests
npm run test:integration
```

Integration tests cover API routes and database operations:

```typescript
// tests/integration/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/[...nextauth]/route';

describe('Authentication API', () => {
  it('handles sign in requests', async () => {
    const request = new Request('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

### End-to-End Testing

```bash
# Run E2E tests
npm run test:e2e
```

E2E tests cover complete user workflows:

```typescript
// tests/e2e/lesson-completion-flow.test.ts
import { test, expect } from '@testing-library/test';

test('complete lesson workflow', async () => {
  // Sign in
  await page.goto('/signin');
  await page.fill('input[type="email"]', 'student@example.com');
  await page.click('button[type="submit"]');

  // Navigate to lesson
  await page.goto('/dashboard/classes/demo-class/lessons/cell-structure');

  // Complete lesson
  await page.click('[data-testid="complete-lesson"]');

  // Verify completion
  expect(await page.textContent('[data-testid="lesson-status"]')).toBe(
    'Completed'
  );
});
```

## Performance Optimization

### Development Performance

- **Turbopack**: Fast bundling and hot reload
- **SWC Minification**: Fast JavaScript compilation
- **CSS Optimization**: Tailwind CSS with JIT compilation

### Build Optimization

```bash
# Analyze bundle size
npm run build

# Check production build locally
npm run start
```

### Database Performance

```typescript
// prisma/config.ts - Connection pooling
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
});
```

## Deployment Preparation

### Environment-Specific Configurations

```typescript
// lib/env.ts - Environment detection
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  isDevelopment,
  isProduction,
  databaseUrl: isDevelopment
    ? process.env.DATABASE_URL
    : process.env.PRODUCTION_DATABASE_URL,
};
```

### Build Verification

```bash
# Full build and test suite
npm run build
npm run test:integration
npm run test:e2e

# Check for production issues
npm run lint
npm run format:check
```

This development workflow provides a comprehensive foundation for building, testing, and deploying the Science Advantage educational platform while maintaining high code quality and developer productivity.
