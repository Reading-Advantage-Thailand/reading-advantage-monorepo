# Specification: TenantDB & schoolId Adoption

## Overview

Decide and implement the multi-tenancy model for `apps/science-advantage/`. The app currently has 0 `schoolId` predicates in any of its 27 `route.ts` files, and 19 of 68 schema tables have no `schoolId` column at all. This track resolves the architectural gap and either implements AGENTS.md §Multi-Tenancy compliance or documents an intentional deviation.

## Problem

Audited 2026-06-03. Findings F-501 (Critical) + F-502 (Critical) merged into F-305 root cause:

- **0 `schoolId` predicates** in any of the 27 `app/api/**/route.ts` files. Whole-app grep: 9 hits, 0 in production code (3 in test fixtures, 6 in archived docs).
- **19 of 68 schema tables have no `schoolId` column.** The 19 `science_*` tables in `packages/db/src/schema/science.ts` (`scienceClasses`, `scienceLessons`, `scienceCurriculumUnits`, `scienceQuizQuestions`, `scienceStandardMastery`, `scienceAttempts`, `scienceQuestionResponses`, `scienceLessonCompletions`, `scienceMasteryRuns`, `scienceAssignments`, `gamificationProfiles`, `achievements`, etc.) lack the column.
- The app does **not** use `createTenantDB` from `packages/domain/src/db-contract.ts:167`. The 16+ sites in `packages/api/src/routers/*.ts` and `packages/webhooks/src/github.ts` use it correctly.
- Science-advantage uses a **user-centric model** instead: teachers own classes via `eq(scienceClasses.teacherId, session.user.id)`; students are scoped via `scienceClassStudents.studentId` membership. This is functionally acceptable for the join-code pilot but is not AGENTS.md compliant.

Two concrete risks per the audit:
1. **Stale teacher ownership**: if a teacher's `users.schoolId` is changed (e.g. transfer to another school), their previous `scienceClasses` ownership persists — they retain full read/write access to all prior classes' data. There is no school-scoped invalidation.
2. **Cross-school student access**: if a student has `users.schoolId = schoolA` and is enrolled in a class owned by a `schoolB` teacher (which the join-code model permits), the student can read `scienceQuestionResponses` and `scienceStandardMastery` for that class. The model cannot enforce a "students are isolated to their school's classes" rule.

## Why

Without this track:
- The compliance gap documented in the 2026-05-26 audit (`audit_20260526` row in `measure/tech-debt.md`) and the 2026-06-03 re-audit (`audit_20260603_tenancy_gap`) cannot be closed.
- District procurement (which requires SOC 2-equivalent data isolation per school) cannot proceed for the science product.
- Track 1 (App → Domain Migration) lands domain functions but those functions cannot enforce tenancy structurally — every domain author has to remember the predicate.

## Functional Requirements

### FR-1: Phase 1 Architectural Decision

The track owner (with maintainer sign-off) picks one of two paths:

**Path (a) — AGENTS.md Compliant Migration** (recommended for the long term)
- Add `schoolId NOT NULL` columns to the 19 `science_*` tables via a single Drizzle migration.
- Backfill: derive `schoolId` for each row from the related `users.schoolId` (via `scienceClasses.teacherId → users.schoolId` for class-scoped tables; via `scienceClassStudents.studentId → users.schoolId` for student-scoped tables).
- Migrate every `apps/science-advantage/lib/services/*` and (post-Track 1) `packages/domain/src/<module>/*` function to use `createTenantDB({ schoolId, ... })` from `packages/domain/src/db-contract.ts:167`.
- `packages/db/src/schema/science.ts` adds `schoolIdIndex` composite indexes on `(schoolId, <other-fk>)` for hot queries.

**Path (b) — Documented Deviation** (interim; addresses compliance gap without schema change)
- Add a `### Multi-Tenancy Deviation` section to `apps/science-advantage/AGENTS.md` that:
  - Acknowledges science-advantage uses a user-centric model (teacher ownership + enrollment membership), not `schoolId` predicates.
  - References the 2026-06-03 audit (`audit_20260603_tenancy_gap`) and lists 3 concrete scenarios where `schoolId` isolation would be needed (cross-school student access; teacher transfer; district procurement).
  - States the decision is interim and lists the trigger for revisiting: "the first time a school admin needs to view data scoped only to their school."
- Re-classify F-501 / F-502 to Medium in `measure/tech-debt.md` (downgrade from Critical since the gap is documented).
- Create a follow-up track placeholder for the eventual path (a) migration.

### FR-2: `createTenantDB` Adoption (Path a only)

- All `apps/science-advantage/lib/services/*` and (post-Track 1) `packages/domain/src/<module>/*` functions that touch the 19 `science_*` tables must use `createTenantDB({ schoolId, ... })`.
- The `schoolId` is derived from the authenticated user's session, never from the request body or query string.
- For functions that don't have a tenant context (cron jobs, backfill scripts), an explicit `withSchoolContext(schoolId, fn)` wrapper is required.
- `createTenantDB` throws `TenantContextMissingError` if called without a `schoolId` (defensive guard).

### FR-3: Schema Changes (Path a only)

- Drizzle migration `00XX_science_school_id.sql` adds `schoolId UUID NOT NULL REFERENCES users(schoolId)` to each of the 19 tables.
- Composite indexes added for hot queries: `(schoolId, teacherId)` on `scienceClasses`; `(schoolId, studentId)` on `scienceClassStudents`; `(schoolId, lessonId)` on `scienceStandardMastery`; etc.
- The migration is reversible: a down migration drops the columns + indexes.
- The migration is tested against `science_advantage_test` DB.

### FR-4: Backfill (Path a only)

- `scripts/backfill-school-id.ts` runs the backfill. For each row in each of the 19 tables:
  - Class-scoped tables (e.g. `scienceClasses`): `schoolId = users.schoolId WHERE users.id = scienceClasses.teacherId`
  - Student-scoped tables (e.g. `scienceAttempts`): `schoolId = users.schoolId WHERE users.id = scienceAttempts.studentId`
  - Lesson/curriculum tables (e.g. `scienceLessons`, `scienceCurriculumUnits`): `schoolId = users.schoolId WHERE users.id = (SELECT teacherId FROM scienceClasses WHERE id = <row>.classId)` — but these tables are lesson- or unit-scoped, not class-scoped, so the join is via the curriculum-unit-to-class mapping. Verify with the maintainer.
- Backfill is idempotent and can be re-run if interrupted.
- Backfill emits per-table counts to the structured logger (Track 9 prerequisite, but the script can use `console.info` for now).

### FR-5: Tenant Predicate Coverage Test (Path a only)

- New test suite `packages/domain/src/__tests__/tenant-coverage.test.ts` asserts that every exported function in `packages/domain/src/<module>/` either (a) uses `createTenantDB`, or (b) is a pure helper (e.g. `validateSchema`) that has no DB access.
- `rg -L "createTenantDB|withSchoolContext" packages/domain/src/` returns only pure helpers.
- The test fails the build if a new module is added without a tenant guard.

### FR-6: Acceptance Test (Both Paths)

- A 2-school test fixture (`school-a-fixture.ts`, `school-b-fixture.ts`) creates a teacher in school A, a teacher in school B, a class for each, and a student in each school.
- A test asserts:
  - School A's teacher cannot see school B's class via any domain function (path a) OR the deviation note documents this as a known limitation (path b).
  - A student in school A cannot read `scienceQuestionResponses` for school B's class via any domain function (path a) OR the deviation note documents this (path b).

## Non-Functional Requirements

- **No data loss** in the backfill. Every row that had a valid `users.schoolId` upstream retains a valid `schoolId` after the migration.
- **Zero downtime** for path (a). The migration is online: add nullable column → backfill → make NOT NULL in a separate transaction. Frontend reads continue to work throughout.
- **Reversibility**. The down migration drops the columns + indexes cleanly.
- **Linter / type-check gate**: the new `TenantContextMissingError` is exported from `packages/domain/src/db-contract.ts`; consumers that import the function must also import the error type (a `@typescript-eslint/no-unused-vars` baseline).
- **Track 1 dependency**: this track assumes the new domain functions exist in `packages/domain/src/`. Path (a) Phase 2 cannot start until Track 1 Phase 3 is complete. Path (b) can start immediately (deviation note is a doc change).

## Acceptance Criteria

1. Phase 1 architectural decision documented in `measure/tracks/tenant_db_school_id_20260603/decisions.md` (path a or path b, with rationale).
2. **Path (a) AC:**
   - 1. The Drizzle migration exists in `packages/db/drizzle/` and is reversible.
   - 2. The 19 `science_*` tables have `schoolId NOT NULL`.
   - 3. `createTenantDB` is called from every domain function in `packages/domain/src/<module>/` that touches those tables.
   - 4. The 2-school test fixture confirms cross-school access is denied.
   - 5. The tenant-coverage test suite passes.
3. **Path (b) AC:**
   - 1. `apps/science-advantage/AGENTS.md` has a `### Multi-Tenancy Deviation` section.
   - 2. The deviation references the 2026-06-03 audit and lists 3 concrete scenarios.
   - 3. A follow-up track placeholder exists in `measure/tracks.md` under Pending Tracks.
4. `pnpm turbo run check-types --filter=@reading-advantage/domain` exits 0
5. `pnpm turbo run test --filter=@reading-advantage/domain` exits 0
6. `pnpm turbo run test --filter=science-advantage` exits 0
7. `pnpm turbo run build --filter=science-advantage` exits 0

## Out of Scope

- Backfill for the 19 `science_*` tables that are lesson/unit-scoped (not class-scoped) — separate sub-track if path (a) is chosen. The maintainer must sign off on the join strategy.
- Migrating the 3 tables that already have `schoolId` (`users`, `classrooms`, `licenses`) to `createTenantDB` — separate sub-track; Track 2 covers only the 19 new tables.
- The "Reading-Advantage Multi-Tenant" track (a separate concern; reading-advantage has 209 `route.ts` files that bypass the domain layer per `audit_20260526`).
- Tenant-scoped data export or GDPR data-access requests — separate track (depends on F-404/F-901 audit log infrastructure landing first).
- Per-IP throttling of cross-school data access — separate track (Track 10 covers per-IP rate limit for login; not the same concern).

## Constraints & Risks

- **Path (a) is a 2-4 week track with a Drizzle migration that touches 19 tables.** Risk: backfill joins on tables with NULL `users.schoolId` for legacy data. Mitigation: pre-migration data audit (find rows where `users.schoolId IS NULL`); quarantine before backfill.
- **Path (a) requires `createTenantDB` to be called from seed scripts and backfill scripts.** Risk: the 14 scripts that import `db` directly (F-207) need a tenant context, but the script's user is the script itself, not a session. Mitigation: `withSchoolContext` for cron/backfill; documented in `packages/domain/src/db-contract.ts`.
- **Path (b) is a temporary deviation that may need to be re-litigated.** Risk: a year from now, the maintainer forgets the deviation and re-introduces the gap. Mitigation: add a CI gate that fails if a science_*.ts file gets a `schoolId` column (preventing the deviation from accidentally becoming permanent).
- **Cross-track dependency**: Track 1 (App → Domain) must be in flight before Track 2 path (a) Phase 2. If Track 1 is not started, path (a) cannot start.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 5 (F-501, F-502, F-503, F-504)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 2
- `packages/domain/src/db-contract.ts:167` (`createTenantDB`)
- `packages/db/src/schema/science.ts` (the 19 tables to migrate)
- `packages/db/src/schema/{users,classrooms,licenses}.ts` (the 3 tables that already have `schoolId`)
- AGENTS.md §Multi-Tenancy: "Every query must be scoped by `schoolId`. Check `user.schoolId` or `tenant.schoolId`. Never trust tenant IDs from the frontend without verifying the user has access."
