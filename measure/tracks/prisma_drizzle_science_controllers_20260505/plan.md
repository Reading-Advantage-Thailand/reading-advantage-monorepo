# Implementation Plan: science-advantage Non-Auth Prisma → Drizzle

> **Blocked on** `prisma_drizzle_schema_unification_20260505`. Plan refined with audit findings during that track's Phase 6.

## Phase 1: Curriculum & Lessons (read-heavy)

- [ ] Task: Migrate curriculum read paths to Drizzle (units, standards, lessons)
- [ ] Task: Migrate `lib/schemas/validate-json.ts` and JSON identifier validation
- [ ] Task: Update integration test `lib/schemas/__tests__/curriculum-identifiers.integration.test.ts` against Drizzle
- [ ] Task: Measure - User Manual Verification 'Curriculum & Lessons' (Protocol in workflow.md)

## Phase 2: Quiz, Attempts, Mastery

- [ ] Task: Migrate quiz question reads & writes
- [ ] Task: Migrate attempt + question-response writes
- [ ] Task: Migrate lesson completion + mastery run logic
- [ ] Task: Measure - User Manual Verification 'Quiz/Mastery' (Protocol in workflow.md)

## Phase 3: Gamification

- [ ] Task: Migrate gamification profile reads/writes
- [ ] Task: Migrate achievement award path
- [ ] Task: Update `lib/gamification/badges.test.ts` against Drizzle
- [ ] Task: Measure - User Manual Verification 'Gamification' (Protocol in workflow.md)

## Phase 4: Classes & Assignments

- [ ] Task: Migrate class CRUD onto unified Drizzle table
- [ ] Task: Migrate assignment CRUD onto unified Drizzle table
- [ ] Task: Measure - User Manual Verification 'Classes & Assignments' (Protocol in workflow.md)

## Phase 5: Seeds, Scripts, Generated Artifacts

- [ ] Task: Rewrite or retire `seed.ts`, `seed-users.ts`, `seed-demo-users.ts`, `create-test-users.ts` against Drizzle
- [ ] Task: Delete `lib/generated/zod/` (replaced by Drizzle Zod inference from track 1)
- [ ] Task: Remove `prisma.config.ts`
- [ ] Task: Measure - User Manual Verification 'Seeds & Generated' (Protocol in workflow.md)

## Phase 6: Prisma Removal

- [ ] Task: Verify zero non-generated Prisma references
- [ ] Task: Delete `apps/science-advantage/lib/prisma.ts`, `apps/science-advantage/prisma/`
- [ ] Task: Strip Prisma deps from `package.json`
- [ ] Task: Re-evaluate `ignoreBuildErrors` (tech debt 2026-05-03 auth_strategy_review)
- [ ] Task: Run full build + test sweep (`pnpm --filter science-advantage build|test`)
- [ ] Task: Close tech-debt entry
- [ ] Task: Measure - User Manual Verification 'Prisma Removal' (Protocol in workflow.md)
