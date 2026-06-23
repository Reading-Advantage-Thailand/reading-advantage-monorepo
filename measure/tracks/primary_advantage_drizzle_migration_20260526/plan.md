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

## Phase 4: Actions Migration (FR-2) [checkpoint: f5eee08d]

## Phase 4: Actions Migration (FR-2)

- [x] Task: Migrate `actions/article.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — article.ts section; 2 Prisma calls → 0, 2 `db.select().from(...)` patterns confirmed; SHA `f5eee08d`.)_
- [x] Task: Migrate `actions/flashcard.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — flashcard.ts section; 26 Prisma calls → 0, 30 select + 2 insert + 1 update + 1 delete + 30 from() patterns confirmed; SHA `f5eee08d`.)_
- [x] Task: Migrate `actions/pratice.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — pratice.ts section; 2 Prisma calls → 0, 2 `db.select().from(...)` patterns confirmed; SHA `f5eee08d`.)_
- [x] Task: Migrate `actions/question.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — question.ts section; 9 Prisma calls → 0, 3 select + 2 insert + 1 update + 1 delete + 3 from() patterns confirmed; SHA `f5eee08d`.)_
- [x] Task: Migrate `actions/test.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — test.ts section; 3 Prisma calls → 0, 2 select + 1 delete + 2 from() patterns confirmed; SHA `f5eee08d`.)_
- [x] Task: Migrate `actions/user.ts` to Drizzle. _(Green evidence: see `audit/phase4-actions-report.md` — user.ts section; 7 Prisma calls → 0, 2 select + 2 insert + 1 update + 2 from() patterns confirmed; SHA `f5eee08d`.)_

> **Phase 4 Red evidence** (baseline HEAD `3587ba30`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase4-actions.test.mjs`
> Result: 1/7 passed, 6/7 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 4 heading;
> missing `audit/phase4-actions-report.md` and required per-file + summary + deferred sections; Prisma-shaped
> `db.<table>.<method>` calls remain in all 6 files (article.ts:2, flashcard.ts:26, pratice.ts:2,
> question.ts:9, test.ts:3, user.ts:7); no Drizzle query-builder patterns in any of the 6 files;
> Phase 4 tasks still `[~]` without SHA evidence; live proof confirms 45 Prisma-shaped calls remain
> across `apps/primary-advantage/actions/`. Passing assertion: all 6 action files exist and are non-empty.

## Phase 5: API Routes Migration (FR-2) [checkpoint: f594c345]

[checkpoint: f594c345]

## Phase 5: API Routes Migration (FR-2)

- [x] Task: Migrate all `app/api/**/route.ts` files with Prisma-shaped calls to Drizzle (batch by feature: classrooms, flashcard, licenses, schools, students, upload, users; dynamic grep at the red baseline discovered 24 files with 108 Prisma-shaped calls — phase 0 plan's "25 files" count was a stale off-by-one). _(Green evidence: see `audit/phase5-routes-report.md` — Summary section; 108 Prisma calls → 0 across 24 route files (classrooms: 1, debug: 3, flashcard: 7, licenses: 2, schools: 2, students: 1, upload: 2, users: 6); SHA `f594c345`.)_

> **Phase 5 Red evidence** (baseline HEAD `8066b2d8`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase5-routes.test.mjs`
> Result: 1/7 passed, 6/7 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 5 heading;
> missing `audit/phase5-routes-report.md` and required summary + per-file/grouped-by-feature +
> Drizzle API Patterns Used + Deferred Items sections; Prisma-shaped `db.<table>.<method>` calls
> remain in all 25 target route files (108 total, e.g., upload/classes/route.ts:16, users/me/school/route.ts:24);
> no Drizzle query-builder patterns in any of the 25 target files; Phase 5 task still `[~]` without
> SHA evidence; live proof confirms 108 Prisma-shaped calls remain across `apps/primary-advantage/app/api/`.
> Passing assertion: all 25 target route files exist and are non-empty.

## Phase 6: Component/UI Migration (FR-3) [checkpoint: 659bb1fc]

[checkpoint: 659bb1fc]

## Phase 6: Component/UI Migration (FR-3)

- [x] Task: Migrate 5 component files importing Prisma types to Drizzle-inferred or domain types. _(5 files: `articles/questions/mc-question-card.tsx`, `student-assignment-table.tsx`, `system/edit-license-form.tsx`, `system/license-table.tsx`, `dashboard/user-reading-chart.tsx`.) _(Green evidence: see `audit/phase6-components-report.md` — Summary section; 5 files migrated, 0 `@prisma/client` imports remain, 5 `@reading-advantage/db` imports added; live grep proof: `grep -r "from \"@prisma/client\"" apps/primary-advantage/components/ | wc -l` → 0; Drizzle patterns: `InferSelectModel<typeof licenses>` (×2), `InferSelectModel<typeof assignmentStudents>` (×1), `activityType` pgEnum aliased as `ActivityType` (×2); SHA `659bb1fc`.)_

> **Phase 6 Red evidence** (baseline HEAD `19641340`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase6-components.test.mjs`
> Result: 2/8 passed, 6/8 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 6 heading;
> missing `audit/phase6-components-report.md` and required sections (Summary + per-file + Drizzle Type Patterns
> Used + Deferred Items); `@prisma/client` imports remain in all 5 target component files
> (`mc-question-card.tsx`, `student-assignment-table.tsx`, `edit-license-form.tsx`, `license-table.tsx`,
> `user-reading-chart.tsx`); no Drizzle-inferred type patterns (`InferSelectModel`, `InferInsertModel`,
> `@reading-advantage/db`) in any of the 5 files; Phase 6 task still `[~]` without SHA evidence; live proof
> confirms 5 `@prisma/client` imports remain across `apps/primary-advantage/components/`. Passing assertions:
> all 5 component files exist and are non-empty; no `@/lib/prisma` imports in the target files.

## Phase 7: Utils & Types Migration (FR-2, FR-4) [checkpoint: 94bb9ead]

[checkpoint: 94bb9ead]

## Phase 7: Utils & Types Migration (FR-2, FR-4)

- [x] Task: Migrate `server/utils/auth.ts`, `server/utils/assistant.ts` to Drizzle. _(Green evidence: see `audit/phase7-utils-report.md` — server/utils section; `auth.ts` (3 Prisma calls → 0; 6 select + 1 userRoles⨝roles join + 1 schoolAdmins lookup); `assistant.ts` (2 Prisma calls → 0; 2 select+from+eq+limit(1) patterns); SHA `94bb9ead`.)_
- [x] Task: Migrate 4 `server/utils/genaretors/*.ts` files to Drizzle. _(Green evidence: see `audit/phase7-utils-report.md` — server/utils/genaretors section; `audio-generator.ts` (1 update), `audio-flashcard-generator.ts` (1 insert into `sentencsAndWordsForFlashcards`), `audio-word-generator.ts` (1 select + 1 update), `sentence-translator.ts` (1 select + 1 update); 4 Prisma calls → 0; SHA `94bb9ead`.)_
- [x] Task: Migrate `lib/fsrs-service.ts` to Drizzle. _(Green evidence: see `audit/phase7-utils-report.md` — lib/fsrs-service.ts section; 0 Prisma calls, 1 `@prisma/client` import → 0; `CardState` enum derived via `(typeof cardState.enumValues)[number]` from the Phase-1 `card_state` pgEnum; SHA `94bb9ead`.)_
- [x] Task: Update `types/index.d.ts` to remove Prisma type references. _(Green evidence: see `audit/phase7-utils-report.md` — types/index.d.ts section; 0 Prisma calls, 1 `@prisma/client` import → 0; `Prisma.JsonValue` → `unknown`; new `LicenseRow = InferSelectModel<typeof licenses>` added; SHA `94bb9ead`.)_
- [x] Task: Migrate `prisma/seed.ts` to Drizzle seed script. _(Green evidence: see `audit/phase7-utils-report.md` — prisma/seed.ts section; 1 `@prisma/client` import → 0; replaced with `import { db } from "@reading-advantage/db"` + `TODO: implement with Drizzle` no-op body (Phase 8 deletes the directory); SHA `94bb9ead`.)_

> **Phase 7 Red evidence** (commit `44ae15dc`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase7-utils.test.mjs`
> Result: 1/9 passed, 8/9 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 7 heading;
> missing `audit/phase7-utils-report.md` and required sections (Summary, grouped-by-subdirectory,
> Drizzle API Patterns Used, Deferred Items); Prisma-shaped `db.<table>.<method>` calls remain in 6 target
> files (`server/utils/auth.ts`, `server/utils/assistant.ts`, `server/utils/genaretors/audio-flashcard-generator.ts`,
> `server/utils/genaretors/audio-generator.ts`, `server/utils/genaretors/audio-word-generator.ts`,
> `server/utils/genaretors/sentence-translator.ts`); `@prisma/client` imports remain in 4 target files
> (`lib/fsrs-service.ts`, `prisma/seed.ts`, `server/utils/genaretors/audio-generator.ts`, `types/index.d.ts`);
> 3 target files lack Drizzle patterns or pure-types status; Phase 7 tasks still `[~]` without SHA evidence;
> live proof confirms 19 Prisma-shaped calls and 5 `@prisma/client` imports remain across Phase 7 directories.
> Passing assertion: all 9 dynamic target files exist and are non-empty.

## Phase 8: Cleanup & Dependency Removal (FR-4) [checkpoint: 37198c76]

[checkpoint: 37198c76]

## Phase 8: Cleanup & Dependency Removal (FR-4)

- [x] Task: Delete `apps/primary-advantage/prisma/` directory. _(Green evidence: see `audit/phase8-cleanup-report.md` — `Delete prisma/ directory` section; 48 files removed via `git rm -rf` (`schema.prisma`, `seed.ts`, `_legacy-marker.ts`, `migrations/migration_lock.toml`, 44 × `migrations/*/migration.sql`); live proof `find apps/primary-advantage/prisma -type f | wc -l` → 0; SHA `37198c76`.)_
- [x] Task: Remove `@prisma/client`, `prisma`, `@prisma/adapter-pg` from `apps/primary-advantage/package.json`. _(Green evidence: see `audit/phase8-cleanup-report.md` — `Remove @prisma/client dependencies` section; `@prisma/client`, `prisma`, `@prisma/adapter-pg` removed from `dependencies`/`devDependencies`; `prisma:generate`/`prisma:migrate-dev`/`prisma:migrate-deploy` scripts removed; `"prisma": { "seed": "..." }` config block removed; live proof `grep -E "(\"@prisma/client\"|\"prisma\"|\"@prisma/adapter-pg\")" apps/primary-advantage/package.json | wc -l` → 0; SHA `37198c76`.)_
- [x] Task: Remove `prisma`/`@prisma/client` from root `package.json` `onlyBuiltDependencies`. _(Green evidence: see `audit/phase8-cleanup-report.md` — `Remove root onlyBuiltDependencies` section; root `package.json` had no `onlyBuiltDependencies` (vacuous pass); `pnpm-workspace.yaml` `allowBuilds` had `@prisma/client`, `@prisma/engines`, `prisma` removed; `peerDependencyRules.ignoreMissing`/`allowAny` arrays collapsed to empty (their only entries were prisma); live proof `grep -nE "prisma" pnpm-workspace.yaml` → no output; SHA `37198c76`.)_
- [x] Task: Run `pnpm install` to clean lockfile. _(Green evidence: see `audit/phase8-cleanup-report.md` — `Run pnpm install` section; `pnpm install --no-frozen-lockfile` reported `Packages: +5 -361`, lockfile now has zero `prisma` references (`grep -nE "prisma" pnpm-lock.yaml` → no output); benign `[ERR_PNPM_IGNORED_BUILDS]` line refers to a stale `node_modules/.bin/prisma` symlink, not a missing dep; SHA `37198c76`.)_
- [x] Task: Update `apps/primary-advantage/AGENTS.md` to reflect Drizzle reality. _(Green evidence: see `audit/phase8-cleanup-report.md` — `Update AGENTS.md` and `AGENTS.md Update` sections; `apps/primary-advantage/AGENTS.md` created with Stack / Database Access / Schema layout / Migrations / Forbidden patterns / Project layout / Testing / Migration history sections; `Drizzle` referenced; `lib/prisma.ts`, `@prisma/client`, and `prisma/` directory explicitly forbidden; SHA `37198c76`.)_

> **Phase 8 Red evidence** (commit `02e35ed8`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase8-cleanup.test.mjs`
> Result: 0/9 passed, 9/9 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 8 heading;
> missing `audit/phase8-cleanup-report.md` and required sections (Summary + each cleanup step +
> Verification + AGENTS.md Update); `apps/primary-advantage/prisma/` directory still exists (48 files);
> `apps/primary-advantage/package.json` still references `@prisma/client`, `prisma`, `@prisma/adapter-pg`
> and contains a `prisma.seed` config block; `apps/primary-advantage/AGENTS.md` does not exist;
> `pnpm-workspace.yaml` `allowBuilds` still lists `@prisma/client`, `@prisma/engines`, and `prisma`;
> Phase 8 tasks still `[~]` without SHA evidence.

## Phase 9: Verification & Sign-Off

- [~] Task: Run FR-2 audit command; confirm zero Prisma matches in `apps/primary-advantage/`.
- [~] Task: `pnpm --filter primary-advantage build` passes.
- [~] Task: `pnpm --filter primary-advantage test` passes (or matches pre-existing baseline).
- [~] Task: Update `measure/tracks.md` — archive this track, mark Prisma→Drizzle program complete.
- [~] Task: Archive this track to `measure/archive/primary_advantage_drizzle_migration_20260526/`.

> **Phase 9 Red evidence** (baseline HEAD `741b850c`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase9-verification.test.mjs`
> Result: 2/9 passed, 7/9 failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 9 heading;
> missing `audit/phase9-verification-report.md` and required sections (Summary, FR-2 Audit Result,
> Build Baseline, Test Baseline, Archive Confirmation, Final Status); Phase 9 tasks still `[~]` without
> SHA evidence; report missing so build/test/archive confirmation status cannot be documented.
> Live proofs: 3 `@prisma/client` imports remain in `apps/primary-advantage/`
> (`actions/flashcard.ts`, `app/api/licenses/[id]/route.ts`, `app/api/licenses/route.ts`);
> `measure/tracks.md` still lists the track as in-progress; commit log contains checkpoint references
> for Phases 0–8.
