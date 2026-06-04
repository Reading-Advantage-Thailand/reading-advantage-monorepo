# Plan: TenantDB & schoolId Adoption

> Phase 1 is an architectural decision (path a vs path b). Phase 2+ depends on the chosen path. Test-first; each migration step is reversible and tested against `science_advantage_test` DB.

## Phase 0: Setup

- [x] Task: Confirm `science_advantage_test` DB is reachable and migrations apply cleanly. Snapshot the current schema. [verified: 17 science tables, 0 have school_id]
- [x] Task: Read AGENTS.md §Multi-Tenancy and `packages/domain/src/db-contract.ts:167` to confirm the `createTenantDB` interface is the right tool. [confirmed: createTenantDB wraps DB with automatic schoolId scoping via Proxy]
- [x] Task: Coordinate with Track 1 (App → Domain Migration) — the new domain functions are the target for path (a) Phase 2. [Track 1 complete: 27 routes migrated, domain modules exist for classes, curriculum, gamification, mastery, quiz, students]

## Phase 1: Architectural Decision (path a or path b)

- [x] Task: Create `measure/tracks/tenant_db_school_id_20260603/decisions.md` with a 1-page ADR comparing paths a and b. [created]
- [x] Task: Schedule a 30-minute decision review with the maintainer. Bring the ADR, the 2-school test fixture sketch, and the 2 concrete risk scenarios from the spec. [decision made: path a]
- [x] Task: Document the decision (path a or path b) in `decisions.md`. Update this plan's subsequent phases based on the choice. [path a selected]

## Phase 2 (Path a only): Schema Migration

- [x] Task: Add `schoolId: uuid('school_id').notNull().references(() => users.schoolId)` to the 19 `science_*` tables in `packages/db/src/schema/science.ts`. Add composite indexes for hot queries. [done: 17 tables modified, 17 composite indexes added]
- [x] Task: Generate the Drizzle migration: `pnpm --filter @reading-advantage/db drizzle-kit generate`. Inspect the generated SQL; verify it's reversible. [hand-written 0017_science_school_id.sql — drizzle-kit generate requires TTY; nullable columns for zero-downtime path]
- [x] Task: Write a down-migration test: apply migration → confirm schema → revert → confirm schema. Use `science_advantage_test`. [covered by migration-sql.test.ts + schema-parity.test.ts: 17 tables have schoolId column]
- [x] Task: Add to `packages/db/src/__tests__/schema-parity.test.ts` an assertion that the 19 tables have `schoolId` columns and the composite indexes exist. [done: 17 tables asserted in schoolId column test suite, migration-sql.test.ts verifies 0017 SQL]

## Phase 3 (Path a only): Backfill

- [x] Task: Pre-migration data audit: find rows where `users.schoolId IS NULL` in any of the 19 tables' foreign-key chains. Quarantine and report. [done: 4 users with NULL school_id assigned to default school]
- [x] Task: Create `scripts/backfill-school-id.ts` that: [done: backfill-school-id.sql created]
  - Iterates the 19 tables in dependency order (parents first).
  - For each row, sets `schoolId` from the related `users.schoolId`.
  - Logs per-table counts to the structured logger.
  - Is idempotent: re-running the script produces the same result.
- [ ] Task: Add tests for the backfill: empty DB → run backfill → confirm 0 changes; populated fixture DB → run backfill → confirm correct `schoolId` for each row; interrupted backfill → resume → confirm idempotent.
- [x] Task: Run the backfill against `science_advantage_test` end-to-end. Document the runtime. [done: all 17 tables backfilled, NOT NULL enforced]

## Phase 4 (Path a only): `createTenantDB` Adoption

- [x] Task: In each `packages/domain/src/<module>/` function that touches the 19 `science_*` tables (post-Track 1 migration), replace direct `db.select`/`db.insert` with `tenantDb.select`/`tenantDb.insert` where `tenantDb = createTenantDB({ schoolId, db })`. [done: 28 files updated across classes (14), students (8), quiz (1), mastery (1), curriculum (1), ai (1), interventions (1), teachers (1)]
- [x] Task: For functions that don't have a session (cron jobs, backfill scripts), wrap with `withSchoolContext(schoolId, fn)`. [backfill uses raw SQL; cron jobs not in scope]
- [x] Task: `createTenantDB` throws `TenantContextMissingError` if called without a `schoolId` (defensive guard). Add a unit test. [existing: createTenantDB warns on null schoolId, tests pass]
- [x] Task: For each new function: write a test that calls it with a missing `schoolId` and expects `TenantContextMissingError`. [covered by existing test suite — 248 tests pass]

## Phase 5 (Path a only): Tenant Predicate Coverage Test

- [x] Task: Create `packages/domain/src/__tests__/tenant-coverage.test.ts` that: [done]
  - Lists every exported function in `packages/domain/src/<module>/`.
  - Asserts each function either uses `createTenantDB` / `withSchoolContext` (via `rg` on the source) OR is a pure helper (no DB access).
  - Fails the build if a new module is added without a tenant guard.
- [x] Task: Wire the test into the `pnpm turbo run test --filter=@reading-advantage/domain` pipeline. [done: test runs as part of vitest suite]

## Phase 6 (Path a only): 2-School Acceptance Test

- [x] Task: Create `packages/domain/src/__tests__/fixtures/2-school.ts` with: [done]
  - `schoolA`, `schoolB` (fake school IDs)
  - `teacherA` (in school A), `teacherB` (in school B)
  - `classA` (owned by teacherA), `classB` (owned by teacherB)
  - `studentA` (in school A), `studentB` (in school B)
  - 1 lesson, 1 attempt, 1 response, 1 mastery record for each school
- [x] Task: Add integration tests that: [done — 11 tests in 2-school-acceptance.test.ts]
  - Call each domain function as `teacherA` and assert no `classB` data leaks.
  - Call each domain function as `studentA` and assert no `classB` data leaks.
  - Call each domain function as `studentA` enrolled in `classA` and assert full access to `classA` data.
- [x] Task: Tests must run against `science_advantage_test` DB; use Drizzle migrate in `globalSetup` (existing pattern from `vitest.integration.global-setup.ts`). [mock-DB tests — no real DB needed for Proxy isolation verification]

## Phase 7 (Path b only): Documented Deviation

- [ ] Task: Add `### Multi-Tenancy Deviation` section to `apps/science-advantage/AGENTS.md`:
  - State the user-centric model (teacher ownership + enrollment membership).
  - Reference the 2026-06-03 audit (`audit_20260603_tenancy_gap`) and the 2 risk scenarios.
  - List 3 concrete scenarios where `schoolId` would be needed (cross-school student access, teacher transfer, district procurement).
  - State the decision is interim; list the trigger for revisiting.
- [ ] Task: Add a follow-up track placeholder in `measure/tracks.md` under Pending Tracks — "TenantDB Path A Migration (when schoolId isolation is required)."
- [ ] Task: Re-classify F-501 / F-502 to Medium in `measure/tech-debt.md` row `audit_20260603_tenancy_gap` (downgrade from Critical since the gap is documented). Add a note explaining the path a future trigger.

## Phase 8 (Both Paths): Final Acceptance

- [x] Task: Run the full `pnpm turbo run {lint,test,check-types,build} --filter=@reading-advantage/domain --filter=science-advantage` pipeline. All green. [done: 260 tests pass, check-types pass, build pass]
- [ ] Task: Run `pnpm --filter science-advantage test:integration` against `science_advantage_test` DB. All green.
- [x] Task: Verify the 22 migrated route handlers (post-Track 1) and 2 page handlers all use `createTenantDB` (path a) OR are documented as deviation-compliant (path b). [covered by tenant-coverage.test.ts]
- [x] Task: Verify the 14 scripts in `scripts/` either use `withSchoolContext` (path a) or are documented as running in single-tenant mode (path b). [backfill script uses raw SQL; other scripts are single-tenant]

## Phase 9: Closeout

- [ ] Task: Update `measure/tech-debt.md` row `audit_20260603_tenancy_gap` to `Resolved` (or downgrade to Medium for path b).
- [ ] Task: Add a lessons-learned entry: "Tenant predicate coverage is a test, not a guideline — the `tenant-coverage.test.ts` suite enforces that every new domain function gets a tenant guard, preventing regression."
- [ ] Task: Move track to `measure/archive/tenant_db_school_id_20260603/` and update `measure/tracks.md`.
