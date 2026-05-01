# Science Advantage Tech Stack

This document separates the stack we are committed to using from the parts of
the repository that have drifted and need alignment work.

## Locked Platform Stack

### Application

- **Language**: TypeScript 5.8+
- **Framework**: Next.js 16 App Router on React 19
- **Styling/UI**: Tailwind CSS 4, Radix UI primitives, shadcn-style component
  composition, React Hook Form for forms
- **Validation**: Zod plus generated Prisma Zod schemas where useful

### Data

- **Primary database**: PostgreSQL 16
- **ORM**: Prisma 6
- **Primary content model**: structured JSON lesson content stored on `Lesson`
  records and validated with explicit Zod schemas

### AI and Content Services

- **LLM integration**: Vercel AI SDK (`ai`) with Google and OpenAI providers
- **Image generation**: model-driven lesson asset generation routed through the
  existing AI image service
- **Fallback strategy**: deterministic rules whenever AI output is optional but
  not required for baseline product correctness

### Infrastructure

- **Deployment target**: Vercel-hosted Next.js application
- **Asset/storage contract**: Google Cloud Storage for managed content/media as
  the platform target; local/public assets remain acceptable only as transitional
  MVP storage
- **Cache/rate-limit contract**: Redis-backed shared services for cache and rate
  limiting where cross-instance behavior matters
- **Local development**: Docker Compose PostgreSQL plus `.env.local`

### Authentication Contract

- **Required production auth**: Google OAuth only
- **Required local QA support**: dev-only impersonation when
  `DEV_AUTH_ENABLED=true`
- **Security rule**: no dev-only override may leak into production behavior

## Current Repository Reality (2026-03-11)

- The app is correctly using Next.js, React, TypeScript, Tailwind, Prisma,
  PostgreSQL, Zod, and the Vercel AI SDK.
- The app currently uses route handlers plus `fetch` for most mutations; server
  actions are not the main mutation pattern today.
- Authentication has drifted into a custom credential/session flow backed by
  Prisma `account` and `session` tables.
- Redis is documented in env and planning but is not wired into runtime
  dependencies.
- `npm run test:e2e` is still a placeholder, so browser regression coverage does
  not yet exist.
- Some lesson media still lives under `public/` and some route slugs still reuse
  IDs.

## Planning Rules

1. New roadmap tracks must stay inside the locked platform stack above.
2. When implementation drift conflicts with the auth, cache, storage, or testing
   contract, the roadmap should realign the implementation instead of changing
   the declared stack by convenience.
3. Do not describe a technology as delivered unless it is both present in the
   repository and part of a tested production path.
