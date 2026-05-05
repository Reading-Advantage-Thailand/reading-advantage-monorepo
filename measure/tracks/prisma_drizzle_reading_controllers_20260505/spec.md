# Specification: reading-advantage Controllers — Prisma → Drizzle

## Overview

Migrate every Prisma reference in `apps/reading-advantage/` (controllers, actions, lib, scripts, app pages, API route handlers) to consume the unified Drizzle schema and domain layer produced by `prisma_drizzle_schema_unification_20260505`. End state: zero Prisma imports in the app, Prisma client and `prisma/` directory deleted, Prisma deps and `prebuild: prisma generate` removed.

This is the **second of 4 tracks** in the Prisma → Drizzle migration program.

**Blocked on:** `prisma_drizzle_schema_unification_20260505` must complete first. Audit findings from that track may reshape the controller groupings below.

## Inventory (audit baseline, 2026-05-05)

- 141 files reference Prisma in `apps/reading-advantage/`.
- 54 controller files in `apps/reading-advantage/server/controllers/`.
- Direct importers also present in `actions/`, `lib/cache/`, `lib/pagination/`, `lib/classroom-utils.ts`, `contexts/userRole-context.tsx`, `types/`, `scripts/`, `app/[locale]/.../page.tsx` (server components), and `app/api/v1/.../route.ts`.

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
- Existing Jest suites continue passing.
- New unit tests for migrated controllers where prior coverage was thin (target ≥80% on touched code).

## Acceptance Criteria

1. `grep -r "from.*['\"]@/lib/prisma['\"]\|from.*['\"]@prisma" apps/reading-advantage/` returns zero matches.
2. `apps/reading-advantage/lib/prisma.ts` and `apps/reading-advantage/prisma/` no longer exist.
3. Prisma packages absent from `apps/reading-advantage/package.json` and root `pnpm-lock.yaml` (for this app's resolution).
4. `pnpm --filter reading-advantage build` succeeds without `ignoreBuildErrors` regressions.
5. `pnpm --filter reading-advantage test` green.
6. Tech-debt entries firestore_drizzle (2026-05-03) closed.

## Out of Scope

- Changes to schema or `packages/db/` (handled in track 1).
- science-advantage migration (track 3).
- Non-generalizable feature slices (track 4) — anything that cannot consume the unified Drizzle schema is deferred there.
- Removing app-level `ignoreBuildErrors` is tracked separately by `reading_advantage_build_remediation_20260503`.
