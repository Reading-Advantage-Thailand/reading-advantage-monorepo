# Specification: CodeCamp Advantage — Local QA/QC Testing

## Overview

Execute a comprehensive manual QA/QC test pass of `apps/codecamp-advantage` on the local development server. The goal is to verify every user-facing feature, integration point, and edge case before deployment or release. Testing covers the full student/intern flow, admin flow, AI tutor, GitHub PR workflow, i18n, and performance/regression checks.

## Context

- App: `apps/codecamp-advantage` (Next.js 16, App Router, tRPC, Drizzle, Postgres)
- Local DB: Docker Postgres on port 5432 (`reading_advantage` database)
- Start command: `pnpm dev` (starts all apps) or `pnpm turbo run dev --filter=codecamp-advantage`
- Default locale: `th` (Thai)
- Available locales: `th`, `en`
- Roles: `INTERN`, `ADMIN`

## Prerequisites

- [ ] Docker Postgres is running (`pnpm db:start`)
- [ ] Database is migrated and seeded with curriculum data
- [ ] At least one `ADMIN` account exists in the database
- [ ] At least one `INTERN` account exists in the database
- [ ] `OPENROUTER_API_KEY` is configured in `.env.local` (for AI chat tests)
- [ ] `GITHUB_WEBHOOK_SECRET` is configured (for webhook validation tests)
- [ ] App is running on `http://localhost:3001` (or default port)

## Scope

### In Scope

- Authentication & session management (login, logout, roles, middleware)
- Internationalization (locale switching, Thai font, message parity, chat locale)
- Dashboard (progress stats, module locking, phase grouping, PR badges)
- Module detail pages (slug routing, lesson lists, exercise repos, quiz averages)
- Lesson pages (theory/exercise/quiz content, code blocks, submissions, scoring)
- AI Tutor chat (lesson-scoped and full-page, streaming, persistence, rate limits)
- Fork-based exercises & PR workflow (URL validation, duplicate prevention, status tracking)
- Admin panel (role gating, intern creation, stats, detail pages)
- GitHub webhook (signature verification, payload parsing, graceful degradation)
- Performance & UX (skeleton states, responsive design, loading states)
- Edge cases & data integrity (empty states, long inputs, concurrent actions)

### Out of Scope

- Automated E2E test suite creation (this track is manual QA only)
- Production Cloud Run deployment verification (covered by `codecamp_deployment_20260516`)
- Creating real GitHub repos or live PR reviews (mock/validation only)
- Security penetration testing (focus is functional QA)
- Load/stress testing beyond basic rate-limit checks

## Acceptance Criteria

- [ ] All P0 (Critical) test cases pass
- [ ] All P1 (High) test cases pass
- [ ] P2 (Medium) and P3 (Low) test cases are executed with findings documented
- [ ] Any failures are logged with reproduction steps, screenshots, and severity
- [ ] A summary report is produced with pass/fail counts per area
- [ ] Blockers are flagged before any production deployment
