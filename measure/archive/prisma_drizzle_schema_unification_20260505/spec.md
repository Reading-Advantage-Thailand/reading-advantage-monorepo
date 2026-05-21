# Specification: Prisma → Drizzle Schema Unification

## Overview

Unify all non-auth schema currently defined in Prisma (`apps/reading-advantage/prisma/schema.prisma`, `apps/science-advantage/prisma/schema.prisma`) into the shared Drizzle schema package (`packages/db/src/schema/`) so that subsequent per-app tracks can incrementally refactor controllers off Prisma.

This is the **first of 4 tracks** in the Prisma → Drizzle migration program. It does **not** modify any controllers, scripts, or app code — only the shared schema, migrations, and supporting domain helpers. Per-app controller refactors are sibling tracks (one per app, plus a final per-feature-slice track for non-generalizable surface).

Apps are not live; database content is restorable from backups. Hard cutover with no uptime concerns.

## Functional Requirements

### FR-1: Schema Audit
- Inventory every model/enum in both `schema.prisma` files against `packages/db/src/schema/`.
- For each Prisma-only table, classify as: **port-as-is**, **port + reshape** (align column shape with existing Drizzle conventions, e.g., `userActivity`, `xpLog`), **unify** (single Drizzle table replaces both apps' Prisma versions, e.g., `Assignment`, `Class`/`Classroom`), or **drop** (dead — no app/script/test references).
- Audit results recorded in the track's `audit.md` artifact.

### FR-2: Drizzle Schema Additions & Reshapes
- Add new Drizzle schema modules for ported tables (License/LicenseOnUser, Story/Chapter/StoryTimepoint/StoryRecord/ChapterTracking/StoryAssignment, RACEFRMapping, GenreAdjacency, GamificationProfile, Achievement, Standard/StandardMastery/Lesson/CurriculumUnit/MasteryRun, QuizQuestion/Attempt/QuestionResponse/LessonCompletion, LessonRecord).
- Reshape `userActivity` and `xpLog` to align with existing Drizzle analytics columns; document column-mapping decisions.
- Where models exist in both apps under different names (e.g., `Classroom` vs `Class`, `Assignment` vs `Assignment`), consolidate to a single Drizzle table consumable by both apps.
- Apply Zod inference (`createInsertSchema` / `createSelectSchema`) and export from `packages/db/src/schema/index.ts`.
- Add unique indexes/FK constraints noted as gaps in prior reviews.

### FR-3: Migrations
- Generate Drizzle migrations via `drizzle-kit generate`. Where the tool requires interactive prompts (column conflicts, identity columns), write SQL manually following the pattern from `0003_slow_firebrand.sql`.
- Migrations apply cleanly to a fresh local Postgres (verified by `docker-compose down -v && pnpm db:migrate`).
- Migrations include data-transform SQL where reshapes change column semantics.

### FR-4: Domain & Type Surface for Follow-up Tracks
- Each newly-ported/reshaped Drizzle table gets at least a thin domain module in `packages/domain/` (CRUD-shaped helpers used by tRPC routers and controllers in follow-up tracks).
- Branded types and tenant-scope helpers added where the existing strict-contracts pattern applies.
- Export shared types from `packages/types/`.

### FR-5: Schema Parity Verification
- Add a `db-contract.test.ts`-style parity test asserting Drizzle schema covers every Prisma model not classified as `drop`.
- All existing `packages/db`, `packages/domain`, `packages/api` tests continue to pass.
- New unit tests for new domain modules (target ≥80% coverage on net-new code).

### FR-6: Tech-Debt Updates
- Update tech-debt entries 2026-05-03 (firestore_drizzle, science_auth) with status notes referencing this track. Closure stays deferred to per-app tracks.
- File new tech-debt entries for any tables explicitly classified as **drop** (so the deletion is captured for cleanup tracks).

## Non-Functional Requirements

- No controller, script, or app-page code changes in this track.
- Both Prisma clients continue to function during this track (no Prisma uninstall, no `prisma/schema.prisma` deletion).
- Migrations must be idempotent on re-run via Drizzle's migration journal.
- Follow Workflow's TDD: write schema parity tests before adding Drizzle modules; write domain tests before domain helpers.

## Acceptance Criteria

1. Audit document committed at `measure/tracks/prisma_drizzle_schema_unification_20260505/audit.md` covering every Prisma model in both apps.
2. `packages/db/src/schema/` exports all ported tables; `packages/db/src/schema/index.ts` re-exports new modules.
3. `pnpm --filter @reading-advantage/db db:generate` produces a clean migration; manual SQL committed where needed.
4. Fresh DB run (`docker-compose down -v && pnpm db:migrate`) succeeds end-to-end.
5. All existing `packages/db`, `packages/domain`, `packages/api` test suites green; new domain tests added for ported tables.
6. Schema parity test passes.
7. `measure/tech-debt.md` updated with status notes; new entries filed for dropped-table cleanup.
8. Three follow-up tracks scoped and listed in `measure/tracks.md` Pending Tracks: (a) reading-advantage controllers, (b) science-advantage controllers, (c) per-feature-slice cleanup for non-generalizable surface.

## Out of Scope

- Refactoring any controller, route handler, action, script, or page off Prisma. (Sibling tracks.)
- Removing `apps/*/lib/prisma.ts`, `apps/*/prisma/`, Prisma deps, or `prebuild: prisma generate`. (Final per-app tracks.)
- Migrating Firebase/Firestore stubs (separate concern).
- Visual regression / E2E test additions.
- Cross-app data unification beyond shared schema (e.g., merging the two `User` tables into one is already done by unified-auth and is not revisited here).
- Dropping any auth tables (already migrated).
