# Specification: Audit Remediation (Past 15 Hours)

## Overview

Remediate defects found during an in-depth audit of the past 15 hours of commits
(roughly `1a49678` through `314a4fc`), covering the `tech_debt_resolution_20260503`,
`unified_auth_20260502`, `last_12h_review_fix_20260503`, `firestore_to_drizzle_migration_20260503`,
and `science_auth_migration_20260503` tracks.

Review methods used:
- Enumerated every file changed by `git diff --name-only HEAD~8..HEAD`
- Read all 4 track plans and specs for recently-touched tracks
- Audited every auth route handler (login, register, impersonate, session)
- Audited every domain function for articles, assignments, users
- Audited all test files across api/auth/domain/auth-client/db packages
- Scanned for `console.error`, `as any`, dead imports, TODO/FIXME, skipped tests
- Inspected all 4 Drizzle migration files for column-ordering conflicts
- Searched for remaining Firestore/Firebase imports in server controllers
- Audited reading-advantage middleware, session.ts, and science signin form

## Findings to Fix

### 1. Broken Migration 0002 (Critical)

`packages/db/drizzle/0002_quick_skreet.sql` adds a unique constraint on
`accounts("user_id","provider_id")`, but the column `provider_id` does not
exist until migration 0003 (`ALTER TABLE "accounts" ADD COLUMN "provider_id"`).
The original schema (0000) uses `provider` (without `_id`).

Running 0000→0001→0002→0003 sequentially on a fresh database will fail at 0002
with "column `provider_id` does not exist."

The test `migration-sql.test.ts` (line 16) asserts that 0002 contains
`"user_id","provider_id"` — verifying the buggy constraint instead of catching it.

### 2. Dead Firestore Import in audio-words-generator.ts (High)

Phase 3 of `tech_debt_resolution_20260503` claimed cleanup of
`audio-words-generator.ts` (deleted dead `saveWordList` function), but
left `import db from "@/configs/firestore-config"` on line 9.
The `db` variable is never used in the file — dead import.

### 3. `as any` Casts in session.ts (High)

`apps/reading-advantage/lib/session.ts` lines 107 and 110 use `(tc: any)`
and `(sc: any)` type casts on Prisma result arrays. This is production
auth code that circumvents type safety. The expected return types
(`teacherClassrooms` as `{ classroomId: string }[]`) are known.

### 4. Registration Test Gaps (High)

`packages/api/src/__tests__/auth-routes.test.ts` has 3 issues:
- Test "rejects registration without a tenant school" actually tests
  "school UUID not found in DB" — not missing/invalid schoolId field.
- No test for the successful registration happy path (valid school,
  new username → user + account + session created).
- No test for the specific edge case from finding #7: login where the
  user has multiple `accounts` rows and the credential row is not first.

### 5. console.error Leaks in Auth Routes (Medium)

Three files log raw error objects in catch blocks:
- `packages/api/src/routes/auth/login.ts:116`
- `packages/api/src/routes/auth/register.ts:114`
- `packages/api/src/routes/auth/impersonate.ts:127`

These leak stack traces and request data via `console.error` in production.
Replace with structured, sanitized error logging.

## Functional Requirements

- Migration 0002 must reference only columns that exist at the time it runs.
  Either: (a) remove the `accounts_user_provider_unique` constraint from 0002
  (it's re-added in 0003), or (b) split 0002 so it only adds the 4 valid
  constraints and let 0003 handle the accounts constraint.
- Remove dead `import db from "@/configs/firestore-config"` from
  `audio-words-generator.ts`.
- Replace `(tc: any)` / `(sc: any)` casts in session.ts with proper types.
- Add happy-path registration test and fix misleading test name.
- Add multi-provider-account login test (user has both "credential" and
  "google" accounts; login still succeeds).
- Replace raw `console.error(error)` in auth routes with sanitized logging
  that does not leak the error object.

## Acceptance Criteria

- `pnpm turbo run test --filter=@reading-advantage/db` passes
- `pnpm turbo run test --filter=@reading-advantage/api` passes (including new tests)
- Migration 0002 runs against a fresh `0000+0001` schema without errors
- No dead `firestore-config` imported where `db` is unused
- No `as any` casts in `apps/reading-advantage/lib/session.ts`
- Registration test correctly validates schoolId enforcement
- Login test validates multi-provider-account resilience
- Auth route handlers do not log raw error objects

## Out of Scope

- Completing the Prisma→Drizzle controller migration (48 controllers) — deferred
- Migrating remaining Firestore callers (validator-controller, OAuth2 route,
  deleteStories) — already deferred in tech_debt_resolution
- Fixing reading-advantage build errors / test suite failures — track exists
- Fixing primary-advantage lint errors — track exists
- ESLint v9 migration — track exists
- Science-advantage non-auth Prisma migration — explicit deferred
