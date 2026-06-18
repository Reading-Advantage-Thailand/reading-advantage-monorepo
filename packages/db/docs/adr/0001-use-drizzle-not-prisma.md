# ADR 0001: Use Drizzle instead of Prisma

**Date:** 2026-05

**Status:** Accepted

**Context**

The monorepo originally used Prisma as its ORM across reading-advantage, science-advantage, and primary-advantage. Prisma introduced several pain points:

- Separate `schema.prisma` files per app caused schema drift and duplication.
- Prisma Client generation required a build step before every schema change.
- Multi-file schema support was limited, making it hard to share table definitions across apps.
- The generated Zod types (`lib/generated/zod/`) were large, hard to audit, and often stale.
- Prisma's migration engine lacked fine-grained control over destructive operations (DROP COLUMN, DROP TABLE).

**Decision**

We chose Drizzle ORM as the replacement. Drizzle provides:

- TypeScript-native schema definitions with inferred types — no code generation.
- Programmatic query building with full type safety.
- Fine-grained migration control via raw SQL files.
- A single shared schema package (`packages/db`) serving all apps.

**Consequences**

- All Prisma runtime artifacts (`schema.prisma`, `lib/prisma.ts`, `lib/generated/zod/`) were removed.
- The unification migration `0013_prisma_drizzle_schema_unification.sql` ports all non-auth Prisma models into the shared Drizzle schema.
- Domain helpers in `packages/domain/` use TenantDB (Drizzle) for all data access.
- Seed scripts use Drizzle for data insertion; legacy Prisma seed paths were relocated (see F-205 / Phase 1 of `housekeeping_batch_20260603`).

**References**

- Migration: `packages/db/drizzle/0013_prisma_drizzle_schema_unification.sql`
- Track: `measure/archive/prisma_drizzle_schema_unification_20260505/`
- App migration tracks: `measure/archive/prisma_drizzle_science_controllers_20260505/`, `measure/archive/prisma_drizzle_reading_controllers_20260505/`
