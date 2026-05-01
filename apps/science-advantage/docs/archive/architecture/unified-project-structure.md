---
title: Unified Project Structure
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, architecture, project-structure, file-organization, conventions]
description: Definition of the standard directory structure and file organization for the project.
---

# Unified Project Structure

## Overview

Science Advantage leverages Next.js 15 App Router's unified monorepo structure, providing seamless integration between frontend and backend components. This architecture eliminates the traditional separation between client and server, enabling code sharing, type safety, and optimized developer experience.

## Directory Structure

```
science-advantage/
├── app/                          # Next.js App Router (pages + API routes)
│   ├── (auth)/                   # Route group for authentication pages
│   │   └── signin/
│   │       └── page.tsx          # Sign-in page
│   ├── (dashboard)/              # Route group for dashboard pages
│   │   ├── classes/
│   │   │   └── [classId]/        # Dynamic class pages
│   │   │       ├── page.tsx      # Class overview
│   │   │       └── lessons/
│   │   │           └── [slug]/    # Dynamic lesson pages
│   │   │               ├── page.tsx          # Lesson viewer
│   │   │               ├── quiz/
│   │   │               │   └── page.tsx      # Quiz interface
│   │   │               └── experiment/
│   │   │                   └── page.tsx      # Experiment interface
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Main dashboard
│   │   │   └── page.test.tsx     # Dashboard tests
│   │   └── lessons/
│   │       └── [slug]/           # Public lesson pages
│   │           └── page.tsx
│   ├── api/                      # API routes (serverless functions)
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts      # NextAuth.js configuration
│   │   ├── classes/
│   │   │   └── [classId]/
│   │   │       ├── lessons/
│   │   │       │   └── [slug]/
│   │   │       │       ├── completions/
│   │   │       │       │   └── route.ts
│   │   │       │       ├── experiment-submissions/
│   │   │       │       │   └── route.ts
│   │   │       │       └── scores/
│   │   │       │           └── route.ts
│   │   │       └── route.ts      # Class management
│   │   ├── demo/
│   │   │   └── join/
│   │   │       └── route.ts      # Demo class enrollment
│   │   ├── dev/
│   │   │   └── auth/
│   │   │       └── impersonate/
│   │   │           └── route.ts  # Development auth override
│   │   └── lessons/
│   │       └── [slug]/
│   │           ├── completion/
│   │           │   └── route.ts
│   │           ├── experiment-submissions/
│   │           │   └── route.ts
│   │           └── quiz/
│   │               └── route.ts
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout component
│   ├── page.tsx                  # Home page
│   └── favicon.ico               # Site favicon
├── components/                   # Reusable React components
│   ├── features/                 # Feature-specific components
│   │   ├── auth/
│   │   │   ├── dev-auth-panel.tsx
│   │   │   ├── sign-in-button.tsx
│   │   │   └── user-menu.tsx
│   │   ├── demo/
│   │   │   └── join-demo-class-button.tsx
│   │   ├── experiments/
│   │   │   ├── experiment-data-form.tsx
│   │   │   ├── experiment-viewer.tsx
│   │   │   └── submission-history.tsx
│   │   ├── lessons/
│   │   │   ├── lesson-completion-toggle.tsx
│   │   │   ├── lesson-content.tsx
│   │   │   ├── lesson-navigation.tsx
│   │   │   ├── quiz-component.tsx
│   │   │   └── video-player.tsx
│   │   └── ui/                    # Shared UI components (shadcn/ui)
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── textarea.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       └── toast.tsx
│   └── layout/                   # Layout components
│       ├── header.tsx
│       ├── sidebar.tsx
│       └── footer.tsx
├── lib/                          # Shared utilities and configurations
│   ├── auth.ts                   # NextAuth.js configuration
│   ├── class-context.server.ts   # Class context server utilities
│   ├── dev-auth.server.ts        # Development auth utilities
│   ├── dev-auth.ts               # Development auth client utilities
│   ├── env.ts                    # Environment variable validation
│   ├── experiments.ts            # Experiment data handling
│   ├── prisma.ts                 # Prisma client configuration
│   ├── quiz.ts                   # Quiz logic and validation
│   └── utils.ts                  # General utility functions
├── prisma/                       # Database schema and migrations
│   ├── schema.prisma             # Prisma database schema
│   ├── seed.ts                   # Database seeding script
│   └── migrations/               # Database migration files
├── public/                       # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── scripts/                      # Build and utility scripts
│   └── seed-issues.sh            # GitHub issue seeding script
├── tests/                        # Test files
│   ├── e2e/                      # End-to-end tests
│   │   ├── dev-auth-override.test.ts
│   │   ├── experiment-submission-flow.test.ts
│   │   └── lesson-completion-flow.test.ts
│   └── integration/              # Integration tests
│       ├── class-experiment-submissions-route.test.ts
│       ├── class-lesson-completions-route.test.ts
│       ├── class-lesson-scores-route.test.ts
│       ├── demo-join-route.test.ts
│       ├── dev-auth-impersonate-route.test.ts
│       ├── lesson-completion-route.test.ts
│       ├── lesson-experiment-submission-route.test.ts
│       └── lesson-quiz-route.test.ts
├── docs/                         # Documentation
│   ├── architecture/             # Architecture documentation
│   │   ├── api-spec.md
│   │   ├── backend-architecture.md
│   │   ├── components.md
│   │   ├── core-workflows.md
│   │   ├── data-models.md
│   │   ├── database-schema.md
│   │   ├── external-apis.md
│   │   ├── frontend-architecture.md
│   │   └── unified-project-structure.md
│   ├── competitor-analysis/      # Competitive analysis documents
│   ├── front-end-spec/           # Frontend specifications
│   ├── prd/                      # Product requirements documentation
│   ├── project-brief/            # Project brief documents
│   └── sprint/                   # Sprint planning documents
├── .bmad-core/                   # BMad-Method configuration and templates
├── .github/                      # GitHub configuration
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── data/                         # Static data files
│   └── db.json                   # Sample data for development
├── .env.example                  # Environment variable template
├── .gitignore                    # Git ignore rules
├── .prettierignore               # Prettier ignore rules
├── .prettierrc                   # Prettier configuration
├── components.json               # shadcn/ui configuration
├── docker-compose.yml            # Docker configuration for local development
├── eslint.config.mjs             # ESLint configuration
├── next.config.ts                # Next.js configuration
├── opencode.jsonc                # OpenCode configuration
├── package-lock.json             # NPM lock file
├── package.json                  # NPM package configuration
├── postcss.config.mjs            # PostCSS configuration
├── prisma.config.ts              # Prisma configuration
├── README.md                     # Project documentation
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Vitest configuration
└── vitest.setup.ts               # Vitest setup file
```

## Key Directory Explanations

### `/app` - Next.js App Router

The heart of our application, combining frontend pages and API routes in a unified structure:

- **Route Groups `()`**: Organizational folders that don't affect URL structure
  - `(auth)`: Authentication-related pages
  - `(dashboard)`: Protected dashboard pages
- **Dynamic Routes `[param]`**: Handle dynamic content like class IDs and lesson slugs
- **API Routes `/api`**: Serverless functions for backend functionality
- **Layout Files**: Shared UI components that wrap route segments

### `/components` - React Components

Organized by feature and reusability:

- **`features/`**: Business logic components organized by domain
- **`ui/`**: Reusable UI primitives (shadcn/ui components)
- **`layout/`**: Layout-specific components

### `/lib` - Shared Utilities

Server and client utilities that bridge frontend and backend:

- **`auth.ts`**: NextAuth.js configuration
- **`prisma.ts`**: Database client configuration
- **`*.server.ts`**: Server-only utilities
- **`*.ts`**: Client-safe utilities

### `/prisma` - Database Layer

Complete database management:

- **`schema.prisma`**: Database schema definition
- **`seed.ts`**: Development data seeding
- **`migrations/`**: Version-controlled database changes

### `/tests` - Testing Structure

Comprehensive testing organization:

- **`e2e/`**: Full application flow tests
- **`integration/`**: API route and database integration tests
- **Co-located tests**: Component tests alongside components

## File Naming Conventions

### Components

- **PascalCase**: `LessonContent.tsx`, `UserMenu.tsx`
- **Feature folders**: Group related components together
- **Index files**: `components/features/auth/index.ts` for clean imports

### API Routes

- **`route.ts`**: Standard Next.js API route filename
- **Dynamic segments**: `[classId]/[slug]/route.ts`
- **HTTP method functions**: `GET()`, `POST()`, `PUT()`, `DELETE()`

### Utilities

- **kebab-case for files**: `class-context.server.ts`
- **camelCase for functions**: `getUserSession()`, `validateQuizData()`

## Import Path Strategy

### Absolute Imports

```typescript
// Components
import { Button } from '@/components/ui/button';
import { LessonContent } from '@/components/features/lessons';

// Utilities
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// Types (if extracted)
import { User, Class } from '@/types';
```

### Server/Client Separation

```typescript
// Server-only utilities
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Client-safe utilities
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
```

## Environment Configuration

### Environment Variables

```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_CLOUD_STORAGE_BUCKET: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

### Development vs Production

- **Development**: Local PostgreSQL, Redis optional, mock external services
- **Production**: Vercel Postgres, Vercel KV, full external service integration

## Build and Deployment Structure

### Vercel Optimization

```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  images: {
    domains: ['storage.googleapis.com'],
  },
};
```

### Build Process

1. **TypeScript compilation**: Type checking across the entire codebase
2. **Prisma generation**: Database client generation
3. **Asset optimization**: Image, font, and script optimization
4. **Serverless bundling**: API routes prepared for Vercel Functions

## Scaling Considerations

### Monorepo Benefits

- **Code sharing**: Types, utilities, and components shared seamlessly
- **Type safety**: End-to-end TypeScript coverage
- **Co-location**: Related files grouped together
- **Simplified deployment**: Single deployment target

### Future Expansion

- **Micro-frontend extraction**: Feature boundaries already established
- **Service splitting**: API routes can be extracted to separate services
- **Team scaling**: Clear ownership boundaries in directory structure

## Development Workflow Integration

### Local Development

```bash
# Database setup
npx prisma generate
npx prisma db push
npx prisma db seed

# Development server
npm run dev

# Testing
npm run test          # Unit tests
npm run test:integration  # API tests
npm run test:e2e      # End-to-end tests
```

### Code Quality

- **ESLint**: Consistent code style and error detection
- **Prettier**: Automatic code formatting
- **TypeScript**: Static type checking
- **Husky**: Pre-commit hooks for quality gates

This unified structure provides a solid foundation for our educational platform, supporting both current requirements and future growth while maintaining developer productivity and code quality.
