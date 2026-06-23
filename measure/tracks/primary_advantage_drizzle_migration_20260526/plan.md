# Implementation Plan: primary-advantage Prisma → Drizzle Migration

> **Status:** Ready. Carved out from `prisma_drizzle_slice_cleanup_20260505` Track 4.
> Inherits Track 2 shape (per-controller phases, schema unification, test parity).

## Phase 0: Pre-flight [checkpoint: 4e918a50]

- [x] Task: Audit all 56 Prisma-touching files; categorize by layer (actions, routes, models, components, lib, types). _(Green evidence: see `audit/phase0-preflight-report.md` — Prisma File Audit section, 56 files inventoried across 10 layers; SHA `4e918a50`.)_
- [x] Task: Map Prisma schema models to existing `packages/db/src/schema/` tables; identify primary-advantage-specific tables. _(Green evidence: see `audit/phase0-preflight-report.md` — Schema Mapping section, 30 models → 9 shared + 13 shared-partial + 8 needs porting; 5 enums → 1 shared + 4 needs porting; SHA `4e918a50`.)_
- [x] Task: Confirm primary-advantage build baseline (`pnpm --filter primary-advantage build`). _(Green evidence: see `audit/phase0-preflight-report.md` — Build Baseline section. Result: FAIL — Turbopack reports 14 module-resolution errors (13× `@reading-advantage/ai`, 1× `child_process`). Pre-existing baseline failure unrelated to Prisma; SHA `4e918a50`.)_
- [x] Task: Confirm shared schema already covers common models (users, classrooms, etc.). _(Green evidence: see `audit/phase0-preflight-report.md` — Shared Schema Coverage section. 9 models directly reusable, 13 partial-coverage with column additions, 8 need porting; SHA `4e918a50`.)_

> **Phase 0 Red evidence** (commit `92ca45af`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase0-preflight.test.mjs`
> Result: 6/8 assertions failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 0 heading;
> missing `audit/phase0-preflight-report.md`; missing report sections (Prisma File Audit, Schema Mapping,
> Build Baseline, Shared Schema Coverage). Live proofs passed: 44 Prisma-touching files detected;
> `apps/primary-advantage/prisma/schema.prisma` exists.

## Phase 1: Schema Port (FR-1) [checkpoint: 31056ab5]

[checkpoint: 31056ab5]

## Phase 1: Schema Port (FR-1)

- [x] Task: Add primary-advantage-specific tables to `packages/db/src/schema/` (or a new `primary.ts` file). _(Green evidence: see `audit/phase1-schema-port-report.md` — Schema Changes → New Tables Ported section; 9 needs-porting models ported (`verificationTokens`, `userRoles`, `roles`, `articleActivityLogs`, `sentencsAndWordsForFlashcards`, `cardReviews`, `clozeTestGames`, `schoolAdmins`, `leaderboards`); SHA `31056ab5`.)_
- [x] Task: Generate Drizzle migration for new tables. _(Green evidence: see `audit/phase1-schema-port-report.md` — Migration Verification → Migration Generated section; `packages/db/drizzle/0022_flowery_black_tarantula.sql` generated cleanly via `pnpm --filter @reading-advantage/db generate`; 122 statements; SHA `31056ab5`.)_
- [x] Task: Verify fresh-DB migration applies cleanly. _(Green evidence: see `audit/phase1-schema-port-report.md` — Migration Verification → Fresh-DB Verification section; 23 migrations applied to `primary_advantage_fresh` via `psql -f`; 92 tables + 17 enum types confirmed; SHA `31056ab5`.)_
- [x] Task: Update `packages/db/src/schema/index.ts` barrel exports. _(Green evidence: see `audit/phase1-schema-port-report.md` — Barrel Export Updates section; `export * from "./primary.js"` added; 13 pgTable/pgEnum exports in `primary.ts` (≥8 required); SHA `31056ab5`.)_

> **Phase 1 Red evidence** (commit `e1f5a0ea`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase1-schema-port.test.mjs`
> Result: 1/9 passed, 8/9 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 1 heading;
> missing `audit/phase1-schema-port-report.md` and its required sections; missing new table definitions
> for 8 needs-porting models (VerificationToken, UserRole, ArticleActivityLog,
> SentencsAndWordsForFlashcard, CardReview, ClozeTestGame, SchoolAdmins, Leaderboard); missing new
> pgEnum definitions for 4 enums (activityType, flashcardType, cardState, subscriptionType); missing
> `./primary.js` re-export in `packages/db/src/schema/index.ts`; Phase 1 tasks still `[~]` without
> SHA evidence; missing `packages/db/src/schema/primary.ts`. Live proof passed: existing Drizzle
> migrations already reference table names covered by this phase.

## Phase 2: lib/prisma.ts Replacement (FR-4) [checkpoint: ac0eea77]

[checkpoint: ac0eea77]

## Phase 2: lib/prisma.ts Replacement (FR-4)

- [x] Task: Replace all `import { prisma } from '@/lib/prisma'` with `import { db } from '@reading-advantage/db'` (or the app-local db client). _(Green evidence: see `audit/phase2-prisma-replacement-report.md` — Files Migrated section; 47 source files re-wired in a single mechanical pass (import + `\bprisma\.` → `db.` rename); 0 remaining `@/lib/prisma` source matches; SHA `ac0eea77`.)_
- [x] Task: Delete `apps/primary-advantage/lib/prisma.ts`. _(Green evidence: see `audit/phase2-prisma-replacement-report.md` — lib/prisma.ts Deletion section; deleted via `git rm` (staged `D`); original PrismaClient singleton captured in report; SHA `ac0eea77`.)_

> **Phase 2 Red evidence** (commit `a0d19a71`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase2-prisma-replacement.test.mjs`
> Result: 0/7 passed, 7/7 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 2 heading;
> missing `audit/phase2-prisma-replacement-report.md` and its required sections (`Files Migrated`,
> `lib/prisma.ts Deletion`, `Import Pattern Verification`, `Build Status`); `apps/primary-advantage/lib/prisma.ts`
> still exists; 47 remaining `@/lib/prisma` imports across primary-advantage source files; no db client
> replacement wired (`lib/db.ts` absent and zero `@reading-advantage/db` imports); Phase 2 tasks still
> `[~]` without SHA evidence; live proof confirms 47 `@/lib/prisma` source matches.

## Phase 3: Server Models Migration (FR-2) [checkpoint: f5ff6745]

[checkpoint: f5ff6745]

## Phase 3: Server Models Migration (FR-2)

- [x] Task: Migrate `server/models/userModel.ts` to Drizzle. _(Green evidence: see `audit/phase3-models-report.md` — userModel.ts section; 10 Prisma calls → 0; 18 Drizzle query-builder calls; SHA `f5ff6745`.)_
- [x] Task: Migrate `server/models/classroomModel.ts` to Drizzle. _(Green evidence: see `audit/phase3-models-report.md` — classroomModel.ts section; 29 Prisma calls → 0; 38 Drizzle calls; SHA `f5ff6745`.)_
- [x] Task: Migrate `server/models/articleModel.ts` to Drizzle. _(Green evidence: see `audit/phase3-models-report.md` — articleModel.ts section; 24 Prisma calls → 0; 27 Drizzle calls; SHA `f5ff6745`.)_
- [x] Task: Migrate `server/models/assignmentModel.ts` to Drizzle. _(Green evidence: see `audit/phase3-models-report.md` — assignmentModel.ts section; 10 Prisma calls → 0; 17 Drizzle calls; SHA `f5ff6745`.)_
- [x] Task: Migrate `server/models/lessonModel.ts` to Drizzle. _(Green evidence: see `audit/phase3-models-report.md` — lessonModel.ts section; 5 Prisma calls → 0; 8 Drizzle calls; SHA `f5ff6745`.)_
- [x] Task: Migrate `server/models/schoolModel.ts` to Drizzle. _(Green evidence: see `audit/phase3-models-report.md` — schoolModel.ts section; 9 Prisma calls → 0; 12 Drizzle calls; SHA `f5ff6745`.)_
- [x] Task: Migrate `server/models/studentModel.ts` to Drizzle. _(Green evidence: see `audit/phase3-models-report.md` — studentModel.ts section; 21 Prisma calls → 0; 19 Drizzle calls; SHA `f5ff6745`.)_
- [x] Task: Migrate `server/models/teacherModel.ts` to Drizzle. _(Green evidence: see `audit/phase3-models-report.md` — teacherModel.ts section; 16 Prisma calls → 0; 21 Drizzle calls; SHA `f5ff6745`.)_
- [x] Task: Migrate `server/controllers/assignmentController.ts` to Drizzle. _(Green evidence: see `audit/phase3-models-report.md` — assignmentController.ts section; 3 Prisma calls → 0; 3 Drizzle calls; SHA `f5ff6745`.)_

> **Phase 3 Red evidence** (baseline HEAD `7abee8d1`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase3-models.test.mjs`
> Result: 1/7 passed, 6/7 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 3 heading;
> missing `audit/phase3-models-report.md` and required per-file + summary sections; Prisma-shaped
> `db.<table>.<method>` calls remain in all 9 files (userModel.ts:10, classroomModel.ts:29,
> articleModel.ts:24, assignmentModel.ts:10, lessonModel.ts:5, schoolModel.ts:9, studentModel.ts:21,
> teacherModel.ts:16, assignmentController.ts:3); no Drizzle query-builder patterns in any of the 9
> files; Phase 3 tasks still `[~]` without SHA evidence; live proof confirms 114 Prisma-shaped calls
> remain across `server/models/` and `server/controllers/`.

## Phase 4: Actions Migration (FR-2) [checkpoint: pending]

- [x] Task: Migrate `actions/article.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — article.ts section; 2 Prisma calls → 0, 2 `db.select().from(...)` patterns confirmed; SHA `pending`.)_
- [x] Task: Migrate `actions/flashcard.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — flashcard.ts section; 26 Prisma calls → 0, 30 select + 2 insert + 1 update + 1 delete + 30 from() patterns confirmed; SHA `pending`.)_
- [x] Task: Migrate `actions/pratice.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — pratice.ts section; 2 Prisma calls → 0, 2 `db.select().from(...)` patterns confirmed; SHA `pending`.)_
- [x] Task: Migrate `actions/question.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — question.ts section; 9 Prisma calls → 0, 3 select + 2 insert + 1 update + 1 delete + 3 from() patterns confirmed; SHA `pending`.)_
- [x] Task: Migrate `actions/test.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — test.ts section; 3 Prisma calls → 0, 2 select + 1 delete + 2 from() patterns confirmed; SHA `pending`.)_
- [x] Task: Migrate `actions/user.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — user.ts section; 7 Prisma calls → 0, 2 select + 2 insert + 1 update + 2 from() patterns confirmed; SHA `pending`.)_

> **Phase 4 Red evidence** (baseline HEAD `3587ba30`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase4-actions.test.mjs`
> Result: 1/7 passed, 6/7 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 4 heading;
> missing `audit/phase4-actions-report.md` and required per-file + summary + deferred sections; Prisma-shaped
> `db.<table>.<method>` calls remain in all 6 files (article.ts:2, flashcard.ts:26, pratice.ts:2,
> question.ts:9, test.ts:3, user.ts:7); no Drizzle query-builder patterns in any of the 6 files;
> Phase 4 tasks still `[~]` without SHA evidence; live proof confirms 45 Prisma-shaped calls remain
> across `apps/primary-advantage/actions/`. Passing assertion: all 6 action files exist and are non-empty.

## Phase 5: API Routes Migration (FR-2)

- [ ] Task: Migrate 16 `app/api/**/route.ts` files to Drizzle (batch by feature: classrooms, flashcard, licenses, schools, students, upload, users).

## Phase 6: Component/UI Migration (FR-3)

- [ ] Task: Migrate 5 component files importing Prisma types to Drizzle-inferred or domain types.

## Phase 7: Utils & Types Migration (FR-2, FR-4)

- [ ] Task: Migrate `server/utils/auth.ts`, `server/utils/assistant.ts` to Drizzle.
- [ ] Task: Migrate 4 `server/utils/genaretors/*.ts` files to Drizzle.
- [ ] Task: Migrate `lib/fsrs-service.ts` to Drizzle.
- [ ] Task: Update `types/index.d.ts` to remove Prisma type references.
- [ ] Task: Migrate `prisma/seed.ts` to Drizzle seed script.

## Phase 8: Cleanup & Dependency Removal (FR-4)

- [ ] Task: Delete `apps/primary-advantage/prisma/` directory.
- [ ] Task: Remove `@prisma/client`, `prisma`, `@prisma/adapter-pg` from `apps/primary-advantage/package.json`.
- [ ] Task: Remove `prisma`/`@prisma/client` from root `package.json` `onlyBuiltDependencies`.
- [ ] Task: Run `pnpm install` to clean lockfile.
- [ ] Task: Update `apps/primary-advantage/AGENTS.md` to reflect Drizzle reality.

## Phase 9: Verification & Sign-Off

- [ ] Task: Run FR-2 audit command; confirm zero Prisma matches in `apps/primary-advantage/`.
- [ ] Task: `pnpm --filter primary-advantage build` passes.
- [ ] Task: `pnpm --filter primary-advantage test` passes (or matches pre-existing baseline).
- [ ] Task: Update `measure/tracks.md` — archive this track, mark Prisma→Drizzle program complete.
- [ ] Task: Archive this track to `measure/archive/primary_advantage_drizzle_migration_20260526/`.
