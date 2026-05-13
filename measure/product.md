# Initial Concept

Create a monorepo (`reading-advantage-monorepo`) that consolidates four student-facing educational web applications under the Reading Advantage umbrella:

- **advantage-games** — Vocabulary games built with Next.js, React-Konva, Zustand
- **science-advantage** — Science learning platform built with Next.js, Prisma, AI SDK
- **reading-advantage** — Reading comprehension platform (web + Firebase functions)
- **primary-advantage** — Primary education app built with Next.js

The goal is to unify shared infrastructure, component libraries, CI/CD, and deployment pipelines while preserving each app's independent deployability.

---

# Product Definition

## Vision

Unify Reading Advantage's student-facing learning applications into a single, maintainable monorepo that accelerates development, enforces consistency, and reduces operational overhead across all educational products.

## Target Users

- **Primary:** Students (K-12) using learning applications
- **Secondary:** Teachers and administrators managing classrooms
- **Tertiary:** Developers building and maintaining the platform

## Key Goals

1. **Shared Component Library** — Unify UI components (Radix-based design system) across all apps
2. **Shared Tooling** — Single TypeScript, ESLint, Prettier, Tailwind configuration
3. **Independent Deployability** — Each app retains its own deployment pipeline and environment variables
4. **Dependency Deduplication** — Centralize common dependencies (Next.js, React, AI SDK, Prisma, etc.)
5. **Cross-App Code Sharing** — Enable shared utilities, hooks, types, and API clients
6. **Simplified Onboarding** — One `git clone`, one `npm install`, one dev command to rule them all

## Products in Scope

| App | Framework | Key Technologies | Purpose |
|-----|-----------|------------------|---------|
| advantage-games | Next.js 15.5 | React-Konva, Zustand, Tailwind 4 | Vocabulary games |
| science-advantage | Next.js 16.0 | Prisma, AI SDK, Radix UI, Recharts | Science learning |
| reading-advantage | Next.js (web) | Prisma, Firebase Functions, AI SDK | Reading comprehension |
| primary-advantage | Next.js 15.2 | Prisma, NextAuth, AI SDK, Framer Motion | Primary education |
| www-reading-advantage | Next.js 15.5 | MDX, Radix UI, Tailwind, i18n | Company website / marketing |
| codecamp-advantage | Next.js 16.0 | tRPC, Drizzle, AI SDK, next-intl | Intern training (Next.js + monorepo patterns) |

## Migration Notes

- **www-reading-advantage** will be upgraded from React 18 → React 19 as part of the monorepo migration to ensure compatibility with shared packages.

## Out of Scope

- **Workbooks** — Teacher-facing workbook generation tool (different deployment target, different user base)
- **advantage-pr** — Marketing documentation and playbooks (no code, not buildable)

## Success Criteria

- All four apps build successfully from the monorepo root
- Shared packages (`@reading-advantage/ui`, `@reading-advantage/utils`, etc.) are consumed by ≥2 apps
- CI/CD pipeline runs unified lint, test, and build across affected apps
- Developer setup time reduced from 4 separate clones to 1
