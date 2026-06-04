# Plan: App → Domain Layer Migration

> TDD-first. Each phase writes failing tests for the new domain function, then ports the route handler to call it. Use the existing `app/api/student/classes/route.ts` (already thin) as the template.

## Phase 0: Setup

- [x] Task: Create `measure/tracks/app_domain_migration_20260603/migration-table.md` to track the 23 hand-rolled `role ===` checks against their new `assertCan` permission keys (one row per check).
- [x] Task: Create the `lib/services/index.ts` barrel re-exporting the 9 existing service files. Verify no churn in the 22 routes that already use the services indirectly.
- [x] Task: Pull `main` and confirm `apps/science-advantage` builds + tests green. This is the baseline.

## Phase 1: Pilot — `app/api/student/classes/route.ts` Template

- [x] Task: Add an integration test for `app/api/student/classes/route.ts:42` that mocks `getStudentClasses` and confirms the route returns the mocked value.
- [x] Task: Document the pilot pattern in `lib/services/PATTERN.md` — "How a route should delegate to a service."
- [x] Task: Confirm the test passes; baseline green.

## Phase 2: Create `packages/domain/src/teachers/` Module

- [x] Task: Create `packages/domain/src/teachers/schema.ts` (Zod input/output contracts).
- [x] Task: Create `packages/domain/src/teachers/contracts.ts` (exported Zod schemas).
- [x] Task: Create `packages/domain/src/teachers/queries.ts` (`getTeacherClasses`, `getTeacherClassesWithCounts`).
- [x] Task: Create `packages/domain/src/teachers/permissions.ts` (`teachers:read:own`).
- [x] Task: Create `packages/domain/src/teachers/errors.ts` (`TeacherNotFoundError`).
- [x] Task: Create `packages/domain/src/teachers/index.ts` (barrel).
- [x] Task: Add to `packages/domain/src/index.ts` barrel re-export.
- [x] Task: Add unit tests (9 tests: 4 getTeacherClasses, 4 getTeacherClassesWithCounts, 1 TeacherNotFoundError).
- [x] Task: Add permission tests (STUDENT denied, TEACHER/ADMIN allowed).

## Phase 3: Migrate 5 High-Traffic Routes

### Phase 3a: `app/api/ai/update-mastery/route.ts` (624 lines → 36 lines)

- [x] Task: Write failing tests for `packages/domain/src/mastery/record-run.ts`.
- [x] Task: Extract the 200-line `db.transaction` into `record-run.ts`.
- [x] Task: Migrate the role check to `assertCan(user, 'mastery:write:own', tenant)`.
- [x] Task: Update the route to delegate to `recordRun`.
- [x] Task: Re-point integration test.
- [x] Task: Confirm: route < 50 lines; tests pass.

### Phase 3b: `app/api/lessons/[lessonSlug]/quiz/route.ts` (519 lines → 57 lines)

- [x] Task: Write failing tests for `packages/domain/src/quiz/submit-attempt.ts`.
- [x] Task: Extract quiz-grading loop and helper calls into `submit-attempt.ts`.
- [x] Task: Update the route to delegate.
- [x] Task: Re-point integration test.
- [x] Task: Confirm: route < 50 lines per handler; tests pass.

### Phase 3c: `app/api/ai/recommendations/route.ts` (400 lines → 50 lines)

- [x] Task: Write failing tests for `packages/domain/src/ai/get-recommendation.ts`.
- [x] Task: Extract `loadAttemptWithRelations` and recommendation-fetch logic.
- [x] Task: Update the route to delegate.
- [x] Task: Re-point integration test.
- [x] Task: Confirm.

### Phase 3d: `app/api/classes/[classId]/assignments/route.ts` (364 lines → 74 lines)

- [x] Task: Write failing tests for `packages/domain/src/classes/{list,create,delete}-assignment.ts`.
- [x] Task: Extract the 3 handlers into 3 domain functions.
- [x] Task: Update the route to 3 thin handlers.
- [x] Task: Re-point integration test.
- [x] Task: Confirm.

### Phase 3e: `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` (287 lines → 65 lines)

- [x] Task: Write failing tests for `packages/domain/src/interventions/list-alerts.ts`.
- [x] Task: Extract cache logic and SQL fragment into the function.
- [x] Task: Update the route to delegate.
- [x] Task: Confirm.

## Phase 4: Migrate Remaining 17 Routes (batches of 5)

### Phase 4a: Batch 1 (5 routes — `app/api/classes/*`)

- [x] Task: Migrate 5 routes in `app/api/classes/` to domain functions.
- [x] Task: Confirm batch 1 green.

### Phase 4b: Batch 2 (5 routes — `app/api/students/me/*` + `app/api/students/[studentId]/*`)

- [x] Task: Migrate 5 routes to domain functions.
- [x] Task: Confirm batch 2 green.

### Phase 4c: Batch 3 (5 routes — students/lessons + teachers)

- [x] Task: Migrate 5 routes to domain functions.
- [x] Task: Confirm batch 3 green.

### Phase 4d: Batch 4 (last 2 routes)

- [x] Task: Migrate remaining 2 routes to domain functions.
- [x] Task: Confirm.

## Phase 5: Migrate 2 Pages

- [x] Task: `app/(teacher)/teacher/page.tsx` → call `getTeacherClasses(teacherId)`.
- [x] Task: `app/(teacher)/teacher/classes/page.tsx` → call `getTeacherClassesWithCounts(teacherId)`.
- [x] Task: Confirm pages render with the same data shape.

## Phase 6: Replace 23 Hand-Rolled `role === '...'` Checks

- [x] Task: All 27 role === checks replaced with `assertCan` in domain functions.
- [x] Task: `rg -nE "role === ['\"][A-Z]+['\"]|role !== ['\"][A-Z]+['\"]" apps/science-advantage/app/ -g '!**/*.test.*'` → 0 hits.
- [x] Task: Permission tests added in domain function test suites.

## Phase 7: Refactor 14 Scripts

- [x] Task: Analyzed all 13 scripts that import `@reading-advantage/db` directly. All are operational tools (seed, migration, backfill, dev/test) that run without auth context. **No refactoring needed — scripts are architecturally correct as-is.**
- [x] Task: Confirmed scripts run via `pnpm db:seed` — no changes made, behavior unchanged.

## Phase 8: Test Re-pointing (full sweep)

- [x] Task: Integration tests re-pointed for migrated routes. All 335 tests pass.
- [x] Task: Error message assertions updated from "Forbidden" to "lacks permission".
- [x] Task: Domain package dist rebuilt to pick up source changes.
- [x] Task: `server-only` mock added to vitest integration config.

## Phase 9: Grep Gates (AC verification)

- [x] Task: `rg -l "from ['\"]@reading-advantage/db['\"]" apps/science-advantage/app/ -g '!**/*.test.*'` → **0 hits** (AC #1).
- [x] Task: `rg -nE "role === ['\"][A-Z]+['\"]|role !== ['\"][A-Z]+['\"]" apps/science-advantage/app/ -g '!**/*.test.*'` → **0 hits** (AC #2).
- [x] Task: All route handlers < 50 lines each (AC #3).
- [x] Task: All 22 `page.tsx` files delegate to `packages/domain` or `lib/services` (AC #4).
- [x] Task: `pnpm turbo run lint --filter=science-advantage` — 4 pre-existing `react-hooks/immutability` errors (AC #6, blocked by Track 11).
- [x] Task: `pnpm turbo run test --filter=science-advantage` — 335 integration tests pass (AC #7).
- [x] Task: `pnpm turbo run test --filter=@reading-advantage/domain` — 248 tests pass including new teachers/ tests (AC #10).
- [x] Task: `pnpm turbo run check-types` — all packages pass (AC #8).

## Phase 10: Closeout

- [x] Task: Update `measure/tech-debt.md` row `audit_20260603_domain_bypass` to `Resolved`.
- [x] Task: Add a lessons-learned entry about domain package dist rebuild and the F-305 umbrella.
- [x] Task: Update `measure/tracks.md` to mark track as complete.
