# Specification: science-advantage Non-Auth Prisma → Drizzle

## Overview

Migrate every non-auth Prisma reference in `apps/science-advantage/` onto the unified Drizzle schema produced by `prisma_drizzle_schema_unification_20260505`. End state: zero Prisma imports, `lib/prisma.ts`, `prisma/`, `lib/generated/zod/` and Prisma deps deleted, `prisma.config.ts` removed.

This is the **third of 4 tracks** in the Prisma → Drizzle migration program. Auth tables already migrated (closed by `science_auth_migration_20260503`).

**Blocked on:** `prisma_drizzle_schema_unification_20260505`.

## Inventory (re-verified 2026-05-23)

- 96 files reference Prisma in `apps/science-advantage/` (excluding the auto-generated `lib/generated/zod/`, which has several hundred mostly-dead files).
- Domains in use: curriculum, lessons, classes, gamification (profile/achievements/mastery), quiz attempts, question responses, lesson completion, mastery runs, standards, assignments.
- `lib/generated/zod/` is an auto-generated Prisma-Zod artifact that disappears with Prisma removal — only **two** files import it (`lib/validations/class.ts`, `lib/validations/student-classes.ts`).
- `apps/science-advantage` does **not** yet depend on `@reading-advantage/domain` — Phase 0 adds it.
- See `plan.md` for the full per-file inventory and the Prisma-model → Drizzle-table map.

## Functional Requirements

### FR-1: Curriculum & Lesson Migration
- Curriculum units, lessons, and standards reads/writes go through unified Drizzle domain helpers.
- `lib/schemas/validate-json.ts` and JSON validation paths consume unified Zod schemas.

### FR-2: Quiz / Attempt / Mastery Migration
- Quiz questions, attempts, question responses, lesson completion, mastery runs all use Drizzle.

### FR-3: Gamification Migration
- Gamification profile, achievements, badges (`lib/gamification/`) all use Drizzle.

### FR-4: Class & Assignment Migration
- Science classes and assignments use the unified Drizzle tables (decision driven by audit — possibly merged with reading-advantage's classroom/assignment tables).

### FR-5: Test Migration
- This track is a **behavior-preserving refactor**: use **characterization tests** — capture each migrated path's current output against the Prisma implementation, then keep that test green through the Drizzle swap. Do not treat it as red/green feature TDD.
- `lib/gamification/badges.test.ts`, `lib/schemas/__tests__/curriculum-identifiers.integration.test.ts`, and any other Prisma-mocked tests rewritten against Drizzle. (science-advantage runs on **Vitest**.)

### FR-6: Prisma Removal
- `apps/science-advantage/lib/prisma.ts`, `prisma/`, `lib/generated/zod/`, `prisma.config.ts`, `seed.ts`, `seed-users.ts`, `create-test-users.ts`, `seed-demo-users.ts` retired or rewritten against Drizzle.
- Prisma deps removed from `package.json`.
- App-level `ignoreBuildErrors` (tech debt 2026-05-03 auth_strategy_review) re-evaluated; remove if unblocked.

### FR-7: Read/Write Seam (forward-compatibility for reactivity)

A later track adds reactive queries by instrumenting the domain layer, so this migration must leave that layer in an instrumentable shape. Two rules, applied as each path is migrated — neither requires building any reactivity now:

- **Purity.** Every domain helper is *either* a pure read (only `SELECT`s — no `INSERT`/`UPDATE`/`DELETE`) *or* a write. No helper does both. Where a path currently mixes them, split it into a separate read helper and write helper during migration.
- **Explicit classification.** A helper's kind is discoverable without running it: reads are named `get*` / `list*` / `count*` / `exists*` / `find*`; all other helpers are writes. Where a name is ambiguous, add a `@kind read` or `@kind write` JSDoc tag.

## Acceptance Criteria

1. `grep -rln "from.*['\"]@/lib/prisma['\"]\|from.*['\"]@prisma" apps/science-advantage/ | grep -v lib/generated` returns zero.
2. Prisma surface deleted; `pnpm install` clean.
3. `pnpm --filter science-advantage build` succeeds.
4. `pnpm --filter science-advantage test` (Vitest) green.
5. Tech-debt entry science_auth (non-auth Prisma still in use) closed.
6. Every domain helper added or touched is a pure read or a pure write (FR-7); no mixed-effect read helpers remain on migrated paths.

## Out of Scope

- Schema/migrations changes (track 1).
- reading-advantage migration (track 2).
- Non-generalizable feature slices (track 4).
- Auth migration (already done).
