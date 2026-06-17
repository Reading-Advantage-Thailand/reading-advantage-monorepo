# Specification: primary-advantage Prisma → Drizzle Migration

## Overview

Migrate primary-advantage from Prisma ORM to Drizzle, completing the Prisma → Drizzle migration program across all monorepo apps. This track was carved out from `prisma_drizzle_slice_cleanup_20260505` (Track 4) because primary-advantage has a full active Prisma surface — 56 files importing `@prisma/client`, a `prisma/schema.prisma`, migrations directory, and `lib/prisma.ts` — far exceeding a "comment-only cleanup."

**Upstream decision:** `prisma_drizzle_slice_cleanup_20260505` FR-4 carve-out.

## Scope

### In Scope
- Port all 56 Prisma-touching files to Drizzle (actions, API routes, server models, components, lib, types).
- Delete `apps/primary-advantage/prisma/` directory (schema, migrations, seed).
- Delete `apps/primary-advantage/lib/prisma.ts`.
- Remove `@prisma/client`, `prisma`, `@prisma/adapter-pg` from `apps/primary-advantage/package.json`.
- Migrate seed script to use Drizzle.
- Port Prisma schema models to `packages/db/src/schema/` (or reuse existing shared schema where applicable).
- Update `apps/primary-advantage/AGENTS.md` to reflect Drizzle reality.
- Remove `prisma`/`@prisma/client` from root `package.json` `onlyBuiltDependencies`.
- Remove `@prisma/*` lockfile entries (after all apps migrated).

### Out of Scope
- Reading-advantage, science-advantage, codecamp-advantage (already migrated).
- Auth migration (primary-advantage still uses NextAuth — separate track).
- Domain layer migration (primary-advantage routes still import `db` directly — separate track).

## Functional Requirements

### FR-1: Schema Port
- All primary-advantage Prisma models ported to Drizzle schema in `packages/db/src/schema/`.
- Shared models (users, classrooms, etc.) reuse existing shared schema; primary-advantage-specific models get new tables.
- Migration generated and verified against a fresh database.

### FR-2: Controller/Action Migration
- All 6 `actions/*.ts` files migrated from Prisma to Drizzle.
- All 16 `app/api/**/route.ts` files migrated.
- All 8 `server/models/*.ts` files migrated or deleted (if logic moves to domain).
- `server/controllers/assignmentController.ts` migrated.
- `server/utils/` files (6) migrated.

### FR-3: Component/UI Migration
- 5 component files that import Prisma types migrated to use Drizzle-inferred types or shared domain types.

### FR-4: Cleanup
- `lib/prisma.ts` deleted.
- `prisma/` directory deleted.
- `package.json` Prisma deps removed.
- Root `package.json` `onlyBuiltDependencies` Prisma entries removed.
- `types/index.d.ts` Prisma type references removed.

### FR-5: Test Parity
- Existing tests pass against Drizzle.
- New tests for migrated controllers/actions following Track 2 patterns.

## Acceptance Criteria

1. `grep -rnE "@prisma|@/lib/prisma" apps/primary-advantage --include='*.ts' --include='*.tsx'` returns zero.
2. `apps/primary-advantage/prisma/` directory does not exist.
3. `apps/primary-advantage/lib/prisma.ts` does not exist.
4. `pnpm --filter primary-advantage build` passes.
5. `pnpm --filter primary-advantage test` passes (or matches pre-existing baseline).
6. `packages/db/src/schema/` contains all primary-advantage tables.
7. Fresh DB `pnpm --filter @reading-advantage/db migrate` applies all migrations including primary-advantage tables.
