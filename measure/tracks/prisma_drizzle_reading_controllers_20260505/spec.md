# Specification: reading-advantage Controllers — Prisma → Drizzle

## Overview

Migrate every Prisma reference in `apps/reading-advantage/` (controllers, actions, lib, scripts, app pages, API route handlers) to consume the unified Drizzle schema and domain layer produced by `prisma_drizzle_schema_unification_20260505`. End state: zero Prisma imports in the app, Prisma client and `prisma/` directory deleted, Prisma deps and `prebuild: prisma generate` removed.

This is the **second of 4 tracks** in the Prisma → Drizzle migration program.

**Blocked on:** `prisma_drizzle_schema_unification_20260505` must complete first. Audit findings from that track may reshape the controller groupings below.

## Inventory (audit baseline — re-verify at track start)

The 2026-05-05 baseline was stale. A 2026-05-23 re-grep showed **147 files**. Re-run the inventory grep as Task 0.0 of the plan and work from fresh numbers.

- 147 files reference Prisma in `apps/reading-advantage/` — `grep -rln "@prisma\|lib/prisma" apps/reading-advantage/` excluding `node_modules`, `.next/`, `dist/`, `prisma/generated`.
- 50 controller files in `apps/reading-advantage/server/controllers/`; 11 in `server/services/`; 5 in `server/utils/` + `server/middleware/`.
- Direct importers also present in `actions/`, `lib/cache/`, `lib/pagination/`, `lib/classroom-utils.ts`, `lib/session.ts`, `contexts/userRole-context.tsx`, `components/`, `middleware.ts`, `types/`, 11 `scripts/`, 2 `prisma/` seeds, ~16 `app/[locale]/.../page.tsx` server components, and 26 `app/api/v1/.../route.ts` handlers.
- See `plan.md` for the full per-file inventory and the Prisma-model → Drizzle-table map.

## Functional Requirements

### FR-1: Controller Migration
- Every controller in `apps/reading-advantage/server/controllers/` calls only the unified Drizzle domain layer (`packages/domain/`) or `packages/db/` — no `prisma.*`.
- Controllers preserve existing public signatures (callers in tRPC routers, server actions, and API routes do not change unless their imports do).

### FR-2: Action / Script / Lib Migration
- `actions/`, `lib/cache/`, `lib/pagination/`, `lib/classroom-utils.ts`, `scripts/refresh-*.ts`, `scripts/check-*.ts`, `scripts/backfill-*.ts` all use Drizzle.
- Materialized-view refresh scripts continue to work; document any SQL ergonomics differences.

### FR-3: Page / Route-Handler Migration
- All `app/[locale]/.../page.tsx` server components and `app/api/v1/.../route.ts` route handlers are Prisma-free.

### FR-4: Prisma Removal
- `apps/reading-advantage/lib/prisma.ts` deleted.
- `apps/reading-advantage/prisma/` directory deleted (schema, migrations, generated client).
- `prisma`, `@prisma/client`, `prisma-zod-generator`, etc. removed from `apps/reading-advantage/package.json`.
- `prebuild: prisma generate` removed from package.json.
- `pnpm install` clean; build succeeds without Prisma artifacts.

### FR-5: Test Coverage
- This track is a **behavior-preserving refactor**, not a feature change — standard red/green TDD does not apply. Use **characterization tests**: before touching a controller, ensure a test captures its current observable behavior (return shape, side effects); if none exists, write one against the *current Prisma* code and confirm it passes. Then swap to Drizzle and keep that test green. The regression you are preventing *is* the test.
- Existing test suites continue passing. (reading-advantage runs on **Jest**.)
- New characterization/unit tests for migrated controllers where prior coverage was thin (target ≥80% on touched code).

### FR-6: Read/Write Seam (forward-compatibility for reactivity)

A later track adds reactive queries by instrumenting the domain layer, so this migration must leave that layer in an instrumentable shape. Two rules, applied as each controller is migrated — neither requires building any reactivity now:

- **Purity.** Every domain helper is *either* a pure read (only `SELECT`s — no `INSERT`/`UPDATE`/`DELETE`) *or* a write. No helper does both. Where a controller path currently mixes them (a "get" that lazily creates a row, a read that bumps a counter), split it into a separate read helper and write helper during migration.
- **Explicit classification.** A helper's kind is discoverable without running it: reads are named `get*` / `list*` / `count*` / `exists*` / `find*`; all other helpers are writes. Where a name is ambiguous, add a `@kind read` or `@kind write` JSDoc tag.

## Acceptance Criteria

1. `grep -r "from.*['\"]@/lib/prisma['\"]\|from.*['\"]@prisma" apps/reading-advantage/` returns zero matches.
2. `apps/reading-advantage/lib/prisma.ts` and `apps/reading-advantage/prisma/` no longer exist.
3. Prisma packages absent from `apps/reading-advantage/package.json` and root `pnpm-lock.yaml` (for this app's resolution).
4. `pnpm --filter reading-advantage build` succeeds without `ignoreBuildErrors` regressions.
5. `pnpm --filter reading-advantage test` green.
6. Tech-debt entries firestore_drizzle (2026-05-03) closed.
7. Every domain helper added or touched is a pure read or a pure write (FR-6); no mixed-effect read helpers remain on migrated paths.

## Out of Scope

- Changes to schema or `packages/db/` (handled in track 1).
- science-advantage migration (track 3).
- Non-generalizable feature slices (track 4) — anything that cannot consume the unified Drizzle schema is deferred there.
- Removing app-level `ignoreBuildErrors` is tracked separately by `reading_advantage_build_remediation_20260503`.
