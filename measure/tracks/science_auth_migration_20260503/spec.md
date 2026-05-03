# Specification: Science-Advantage Auth Migration

## Overview

Migrate science-advantage's standalone Prisma-based authentication system to use the shared monorepo auth packages (`@reading-advantage/auth`, `@reading-advantage/auth-client`, `@reading-advantage/db`). This completes the Unified Auth track's deferred Phase 5c, bringing science-advantage in line with reading-advantage and primary-advantage.

## Background

Science-advantage currently has its own auth system built on Prisma:
- Own `schema.prisma` with user, account, session, verification models
- Custom cookie-based session management (`lib/auth/session.ts`)
- Google OAuth via custom route handlers (`app/api/auth/google/`)
- Username/password login (dev-only) via `app/api/auth/login/`
- Dev impersonation panel (`app/api/auth/impersonate/`)
- No shared auth packages — no dependency on `@reading-advantage/auth`, `auth-client`, or `db`

The shared auth system provides:
- Drizzle-based DB layer (`@reading-advantage/db`) with users, accounts, sessions tables
- Session management (`createSession`, `validateSession`, `deleteSession`) via `@reading-advantage/auth`
- Password hashing via bcrypt through `@reading-advantage/auth`
- React auth context (`AuthProvider`, `useAuth`, `useSession`) via `@reading-advantage/auth-client`
- Shared API route handlers for login, session, logout, impersonate via `@reading-advantage/api`

## Functional Requirements

1. **Route Handler Migration**: Replace science-advantage's local auth route handlers with shared handlers from `@reading-advantage/api/routes/auth` for login, session, logout, and impersonate
2. **Google OAuth Rewrite**: Rewrite Google OAuth route handlers to use Drizzle (`@reading-advantage/db`) instead of Prisma, while preserving the Google OAuth flow
3. **Client Auth Migration**: Wrap root layout with `AuthProvider` from `@reading-advantage/auth-client`; update signin form and user menu to use `useAuth()` hooks
4. **Prisma Removal**: Remove Prisma dependency from science-advantage for auth-related tables; delete `lib/auth/` directory, `lib/prisma.ts`, `prisma/schema.prisma` (auth tables only)
5. **Import Updates**: Update all imports from `@/lib/auth/*` to `@reading-advantage/auth`

## Schema Alignment

The science-advantage Prisma schema and shared Drizzle schema have differences that must be resolved:

| Field | Science Prisma | Shared Drizzle | Resolution |
|-------|---------------|----------------|------------|
| `user.schoolId` | Absent | Present (UUID FK) | Add `schoolId` to science user queries; use dev school for existing users |
| `user.gradeLevel` | Present (Int?) | Absent | Keep in science-specific domain logic; not an auth concern |
| `user.xp/level/cefrLevel` | Absent (in GamificationProfile) | Present on users | Not needed for auth migration; skip |
| `account.accountId` | Present | Absent | Drop — use `id` as primary key |
| `account.scope/idToken` | Present | Absent | Store OAuth tokens in a science-specific table or drop if not needed |
| `verification` table | Present | Absent | Drop — unused |

## Non-Functional Requirements

- Build passes: `pnpm turbo run build --filter=science-advantage`
- Lint passes: `pnpm turbo run lint --filter=science-advantage`
- Google OAuth flow works end-to-end after migration
- Dev impersonation works after migration
- Session cookie (`session_token`) behavior unchanged

## Acceptance Criteria

1. [ ] `package.json` includes `@reading-advantage/auth`, `@reading-advantage/auth-client`, `@reading-advantage/db`, `@reading-advantage/api`
2. [ ] `package.json` removes `@prisma/client`, `prisma`, `prisma-zod-generator` from auth-related deps
3. [ ] Login, session, logout route handlers use shared handlers
4. [ ] Google OAuth routes use Drizzle instead of Prisma
5. [ ] Root layout wrapped with `<AuthProvider>`
6. [ ] Signin form uses `useAuth().login()` from auth-client
7. [ ] `lib/auth/` directory deleted
8. [ ] `lib/prisma.ts` deleted
9. [ ] Build passes with `pnpm turbo run build --filter=science-advantage`
10. [ ] Existing Prisma usage for non-auth features (curriculum, lessons) preserved

## Out of Scope

- Migrating science-advantage's non-auth Prisma usage to Drizzle (curriculum, lessons, etc.)
- Multi-tenancy enforcement (science has no real users yet)
- Migrating `GamificationProfile` to shared schema
- Unit tests for Google OAuth (manual verification sufficient)
