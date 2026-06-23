# Implementation Plan: primary-advantage Prisma → Drizzle Migration

> **Status:** Ready. Carved out from `prisma_drizzle_slice_cleanup_20260505` Track 4.
> Inherits Track 2 shape (per-controller phases, schema unification, test parity).

## Phase 0: Pre-flight

- [~] Task: Audit all 56 Prisma-touching files; categorize by layer (actions, routes, models, components, lib, types).
- [~] Task: Map Prisma schema models to existing `packages/db/src/schema/` tables; identify primary-advantage-specific tables.
- [~] Task: Confirm primary-advantage build baseline (`pnpm --filter primary-advantage build`).
- [~] Task: Confirm shared schema already covers common models (users, classrooms, etc.).

> **Phase 0 Red evidence** (commit `92ca45af`):
> `node --test measure/tracks/primary_advantage_drizzle_migration_20260526/__tests__/phase0-preflight.test.mjs`
> Result: 6/8 assertions failed as expected. Failures: missing `[checkpoint: <sha>]` in Phase 0 heading;
> missing `audit/phase0-preflight-report.md`; missing report sections (Prisma File Audit, Schema Mapping,
> Build Baseline, Shared Schema Coverage). Live proofs passed: 44 Prisma-touching files detected;
> `apps/primary-advantage/prisma/schema.prisma` exists.

## Phase 1: Schema Port (FR-1)

- [ ] Task: Add primary-advantage-specific tables to `packages/db/src/schema/` (or a new `primary.ts` file).
- [ ] Task: Generate Drizzle migration for new tables.
- [ ] Task: Verify fresh-DB migration applies cleanly.
- [ ] Task: Update `packages/db/src/schema/index.ts` barrel exports.

## Phase 2: lib/prisma.ts Replacement (FR-4)

- [ ] Task: Replace all `import { prisma } from '@/lib/prisma'` with `import { db } from '@reading-advantage/db'` (or the app-local db client).
- [ ] Task: Delete `apps/primary-advantage/lib/prisma.ts`.

## Phase 3: Server Models Migration (FR-2)

- [ ] Task: Migrate `server/models/userModel.ts` to Drizzle.
- [ ] Task: Migrate `server/models/classroomModel.ts` to Drizzle.
- [ ] Task: Migrate `server/models/articleModel.ts` to Drizzle.
- [ ] Task: Migrate `server/models/assignmentModel.ts` to Drizzle.
- [ ] Task: Migrate `server/models/lessonModel.ts` to Drizzle.
- [ ] Task: Migrate `server/models/schoolModel.ts` to Drizzle.
- [ ] Task: Migrate `server/models/studentModel.ts` to Drizzle.
- [ ] Task: Migrate `server/models/teacherModel.ts` to Drizzle.
- [ ] Task: Migrate `server/controllers/assignmentController.ts` to Drizzle.

## Phase 4: Actions Migration (FR-2)

- [ ] Task: Migrate `actions/article.ts` to Drizzle.
- [ ] Task: Migrate `actions/flashcard.ts` to Drizzle.
- [ ] Task: Migrate `actions/pratice.ts` to Drizzle.
- [ ] Task: Migrate `actions/question.ts` to Drizzle.
- [ ] Task: Migrate `actions/test.ts` to Drizzle.
- [ ] Task: Migrate `actions/user.ts` to Drizzle.

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
