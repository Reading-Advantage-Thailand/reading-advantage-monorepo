# Implementation Plan: Prisma → Drizzle Schema Unification

> Track Type: Chore (schema/infra). TDD applies to domain helpers and parity tests; schema modules driven by audit findings.

## Phase 1: Audit & Inventory

- [ ] Task: Build cross-schema inventory
    - [ ] Sub-task: Generate model list from both `schema.prisma` files
    - [ ] Sub-task: Cross-reference each model against `packages/db/src/schema/`
    - [ ] Sub-task: For each Prisma-only model, grep for usage across apps + scripts + tests; mark as live or dead
    - [ ] Sub-task: Classify each model: port-as-is | port+reshape | unify | drop
    - [ ] Sub-task: Document column-shape mismatches (`userActivity`, `xpLog`) with explicit reshape decisions
    - [ ] Sub-task: Identify name collisions across apps (`Class`/`Classroom`, both `Assignment`s, both `Lesson*`) and propose unified table names
- [ ] Task: Write audit artifact
    - [ ] Sub-task: Commit `audit.md` with classification table and reshape/unification decisions
    - [ ] Sub-task: List dead tables for cleanup follow-up
- [ ] Task: Measure - User Manual Verification 'Audit & Inventory' (Protocol in workflow.md)

## Phase 2: Drizzle Schema Modules

- [ ] Task: Reshape existing analytics modules
    - [ ] Sub-task: Write parity-failing test for reshaped `userActivity` columns
    - [ ] Sub-task: Reshape `userActivity` in `analytics.ts` to absorb Prisma's column set
    - [ ] Sub-task: Write parity-failing test for reshaped `xpLog` columns
    - [ ] Sub-task: Reshape `xpLog` to absorb Prisma's column set
- [ ] Task: Add reading-advantage Prisma-only modules
    - [ ] Sub-task: Write `licenses.ts` (License, LicenseOnUser) with insert/select Zod schemas
    - [ ] Sub-task: Write `stories.ts` (Story, Chapter, StoryTimepoint, StoryRecord, ChapterTracking, StoryAssignment)
    - [ ] Sub-task: Write `taxonomy.ts` (RACEFRMapping, GenreAdjacency)
    - [ ] Sub-task: Write `lessons-reading.ts` (LessonRecord) — coordinate naming with science Lesson via audit decision
- [ ] Task: Add science-advantage Prisma-only modules
    - [ ] Sub-task: Write `gamification.ts` (GamificationProfile, Achievement)
    - [ ] Sub-task: Write `curriculum.ts` (Standard, StandardMastery, CurriculumUnit, Lesson)
    - [ ] Sub-task: Write `quiz.ts` (QuizQuestion, Attempt, QuestionResponse, LessonCompletion, MasteryRun)
- [ ] Task: Unify cross-app collisions per audit decisions
    - [ ] Sub-task: Decide & implement unified `assignments` (or two tables w/ explicit names)
    - [ ] Sub-task: Decide & implement unified `classes` vs `classrooms`
- [ ] Task: Wire exports
    - [ ] Sub-task: Re-export new modules from `packages/db/src/schema/index.ts`
    - [ ] Sub-task: Re-export Zod insert/select types from `packages/types/`
- [ ] Task: Measure - User Manual Verification 'Schema Modules' (Protocol in workflow.md)

## Phase 3: Migrations

- [ ] Task: Generate migration
    - [ ] Sub-task: Run `pnpm --filter @reading-advantage/db db:generate`
    - [ ] Sub-task: If drizzle-kit prompts on column conflicts, hand-write SQL following `0003_slow_firebrand.sql` precedent
    - [ ] Sub-task: Add data-transform SQL for reshapes (`userActivity`, `xpLog`)
- [ ] Task: Verify clean apply
    - [ ] Sub-task: `docker-compose down -v && pnpm db:migrate` from a fresh DB
    - [ ] Sub-task: Re-run migrations against existing dev DB; confirm idempotency
- [ ] Task: Measure - User Manual Verification 'Migrations' (Protocol in workflow.md)

## Phase 4: Domain & Types Layer

- [ ] Task: Add domain helpers for ported tables
    - [ ] Sub-task: Write tests for license domain helpers (`createLicense`, `attachUser`, `listUserLicenses`)
    - [ ] Sub-task: Implement license domain module
    - [ ] Sub-task: Write tests + implement story/chapter domain module
    - [ ] Sub-task: Write tests + implement gamification domain module
    - [ ] Sub-task: Write tests + implement curriculum domain module
    - [ ] Sub-task: Write tests + implement quiz domain module
- [ ] Task: Apply tenant scoping & branded types
    - [ ] Sub-task: Wrap new domain queries in `TenantDB` where multi-tenant
    - [ ] Sub-task: Add branded ID types per existing pattern
- [ ] Task: Coverage check
    - [ ] Sub-task: Confirm new code ≥80% per Workflow gate
- [ ] Task: Measure - User Manual Verification 'Domain Layer' (Protocol in workflow.md)

## Phase 5: Schema Parity & Tests

- [ ] Task: Schema parity test
    - [ ] Sub-task: Extend `db-contract.test.ts` (or new `schema-parity.test.ts`) to assert every audit-classified `port*`/`unify` model exists in Drizzle with expected columns
    - [ ] Sub-task: Assert `drop` classification matches reality (no live importers)
- [ ] Task: Regression sweep
    - [ ] Sub-task: `pnpm --filter @reading-advantage/db test`
    - [ ] Sub-task: `pnpm --filter @reading-advantage/domain test`
    - [ ] Sub-task: `pnpm --filter @reading-advantage/api test`
- [ ] Task: Measure - User Manual Verification 'Parity & Regression' (Protocol in workflow.md)

## Phase 6: Track Decomposition & Tech-Debt Updates

- [ ] Task: Refresh sibling track plans with audit findings
    - [ ] Sub-task: Update `prisma_drizzle_reading_controllers_20260505/plan.md` with controller groupings informed by audit
    - [ ] Sub-task: Update `prisma_drizzle_science_controllers_20260505/plan.md` with controller groupings informed by audit
    - [ ] Sub-task: Update `prisma_drizzle_slice_cleanup_20260505/spec.md` with explicit non-generalizable surface list
- [ ] Task: Update tech-debt registry
    - [ ] Sub-task: Append status notes to firestore_drizzle and science_auth entries pointing at this track
    - [ ] Sub-task: File new entries for each `drop` classification
- [ ] Task: Retrospective insights
    - [ ] Sub-task: Add lessons-learned entries (≤50 line cap) for any non-obvious reshape decisions
- [ ] Task: Measure - User Manual Verification 'Decomposition & Cleanup' (Protocol in workflow.md)
