# Specification: Drizzle 0.45 Major Migration

## Background

The monorepo uses Drizzle ORM for schema definitions, migrations, and
typed queries. Drizzle 0.45 introduces breaking changes to the schema
API, migration format, and query builder.

**Prisma 7 is explicitly rejected.** primary-advantage will migrate
off Prisma to Drizzle (not upgrade to Prisma 7). This aligns with
the monorepo's direction of consolidating on a single ORM.

## Acceptance Criteria

1. Drizzle upgraded to 0.45 across all workspaces.
2. All schema definitions compile under the new API.
3. All migrations run cleanly against a fresh database.
4. All existing tests pass.
5. `drizzle-zod` integration updated for the new schema API.
6. Prisma 7 is NOT adopted — primary-advantage continues its
   Prisma-to-Drizzle migration path.
7. `pnpm outdated -r` shows Drizzle at the target version.
8. Documentation updated in `measure/tech-stack.md`.
