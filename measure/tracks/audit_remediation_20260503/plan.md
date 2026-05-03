# Implementation Plan: Audit Remediation (Past 15 Hours)

---

## Phase 1: Migration Integrity

*Severity: Critical. Fresh DB setup must not fail.*

- [x] Task: Fix migration 0002 column-ordering bug
    - [x] Remove `ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_provider_unique"` from 0002
      (the constraint is correctly re-added in 0003 after `provider_id` column is created)
    - [x] Verify remaining 4 constraints in 0002 only reference columns that exist in the 0000 schema:
      `classroom_students(classroom_id, student_id)`, `student_assignments(assignment_id, student_id)`,
      `lesson_progress(user_id, lesson_id)`, `student_answers(user_id, question_id, question_type)`
    - [x] Run `pnpm turbo run test --filter=@reading-advantage/db` — 8/8 tests pass
    - [x] Manual check: verified all 4 remaining constraints reference columns in 0000 schema
    - [x] Commit fix
- [x] Task: Update migration-sql.test.ts
    - [x] Remove assertion that expects `"user_id","provider_id"` in 0002
    - [x] Add assertion that 0002 does NOT reference `accounts` table at all
    - [x] Add assertion that 0003 DOES contain the `accounts_user_provider_unique` constraint
- [x] Task: Measure — User Manual Verification 'Phase 1' (Protocol in workflow.md)

---

## Phase 2: Auth Code Quality

*Severity: High. Fix production auth shortcuts.*

- [x] Task: Remove `as any` casts from session.ts
    - [x] Replace `(tc: any)` → proper Prisma type `{ classroomId: string }` on line 107
    - [x] Replace `(sc: any)` → proper Prisma type `{ classroomId: string }` on line 110
    - [x] Verified casts removed from file
- [x] Task: Remove dead firestore-config import from audio-words-generator.ts
    - [x] Delete `import db from "@/configs/firestore-config"` line 9
    - [x] Verified file has no other `db.` usage
- [x] Task: Sanitize auth route error logging
    - [x] In `login.ts:116`: replaced with `error instanceof Error ? error.message : "Unknown"`
    - [x] In `register.ts:114`: replaced with same pattern
    - [x] In `impersonate.ts:127`: replaced with same pattern
    - [x] Verified no raw error objects are logged in auth routes
- [x] Task: Measure — User Manual Verification 'Phase 2' (Protocol in workflow.md)

---

## Phase 3: Test Coverage Gaps

*Severity: High. Add missing tests identified by review findings.*

- [x] Task: Fix registration test in auth-routes.test.ts
    - [x] Rename "rejects registration without a tenant school" → "rejects registration with unknown school ID"
    - [x] Add test: "rejects registration when schoolId field is missing" (validates Zod schema rejects)
    - [x] Add test: "creates user and account atomically for valid registration" (happy path —
      mock school found, user not found, verifies insert + session creation)
- [x] Task: Add multi-provider login test to auth-routes.test.ts
    - [x] Add test: "succeeds with credential login when user has multiple provider accounts"
      (first select returns user, second select returns credential account,
      verify login succeeds even if a "google" account also exists in the table)
- [x] Task: Run targeted test suites
    - [x] `pnpm turbo run test --filter=@reading-advantage/api` — 23/23 pass
    - [x] `pnpm turbo run test --filter=@reading-advantage/auth` — 64/64 pass
    - [x] `pnpm turbo run test --filter=@reading-advantage/domain` — 24/24 pass
    - [x] `pnpm turbo run test --filter=@reading-advantage/db` — 8/8 pass
- [x] Task: Measure — User Manual Verification 'Phase 3' (Protocol in workflow.md)

---

## Phase 4: Bookkeeping

*Severity: Low. Keep project memory current.*

- [x] Task: Update tech-debt.md
    - [x] Mark migration 0002 column-ordering issue resolved after fix
    - [x] Mark `as any` casts in session.ts resolved after fix
    - [x] Mark unused firestore-config import resolved after fix
- [x] Task: Update measure/tracks.md
    - [x] Track registered as pending
    - [x] Marked as complete

---

## Total Tasks: 12
## Status: Complete
## Verification

- `pnpm turbo run test --filter=@reading-advantage/db` — 8/8 pass
- `pnpm turbo run test --filter=@reading-advantage/api` — 23/23 pass (6 auth-routes, +3 new)
- `pnpm turbo run test --filter=@reading-advantage/auth` — 64/64 pass
- `pnpm turbo run test --filter=@reading-advantage/domain` — 24/24 pass
- Total: **119/119 tests** across 19 test files
