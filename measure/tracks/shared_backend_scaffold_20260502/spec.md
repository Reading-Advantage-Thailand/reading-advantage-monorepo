# Specification: Shared Backend Scaffold + Schema Unification

## Context

The monorepo has three apps (reading-advantage, primary-advantage, science-advantage) each with their own Prisma schema and database client. reading-advantage and primary-advantage share a Google CloudSQL instance with separate databases. science-advantage uses a local PostgreSQL database.

The target architecture (per senior backend advice) is:

```
Next.js apps → tRPC → domain functions → Drizzle → Postgres
External systems (webhooks) → Hono → domain functions → Drizzle → Postgres
```

Key decisions:
- **Drizzle** replaces Prisma for schema, migrations, and queries
- **tRPC** is the primary backend interface (not REST/Hono)
- **Hono** only for external HTTP boundaries (webhooks, health checks, legacy)
- **Domain layer** (`packages/domain/`) holds business logic outside tRPC routers
- **Multi-tenant** by default — all queries scoped by school/class/user context
- **Zod** for input validation on every procedure

This track scaffolds the packages, writes the unified Drizzle schema, sets up tRPC with authenticated multi-tenant context, and establishes the domain layer pattern.

## Goals

1. Create `packages/db/` with Drizzle schema, migrations, and typed client
2. Create `packages/api/` with tRPC setup, authenticated context, and multi-tenant scoping
3. Create `packages/auth/` with roles, permissions, and tenant resolution
4. Create `packages/domain/` skeleton with example domain functions
5. Create `packages/webhooks/` with Hono for external HTTP boundaries
6. Create `packages/types/` for shared API contract types
7. Write unified Drizzle schema covering all models from the 3 Prisma schemas (~83 models)
8. Remove CloudSQL-specific connection handling from reading-advantage

## Acceptance Criteria

- [ ] `packages/db/` has Drizzle schema files organized by domain
- [ ] `packages/db/` exports typed `db` client connected to local PostgreSQL
- [ ] `packages/db/` can run `drizzle-kit generate` and `drizzle-kit migrate` cleanly
- [ ] `packages/api/` has tRPC setup with `createTRPCContext` providing `{ db, user, tenant }`
- [ ] `packages/api/` has `protectedProcedure` with auth + tenant middleware
- [ ] `packages/api/` has example routers: `classes`, `students` (thin, calling domain functions)
- [ ] `packages/auth/` exports `assertCan(permission, tenant)` and role definitions
- [ ] `packages/domain/classes/` has `create()` and `list()` domain functions
- [ ] `packages/webhooks/` has Hono app with health check endpoint
- [ ] All packages build with `pnpm turbo run build`
- [ ] All packages pass `pnpm turbo run lint`
- [ ] CloudSQL Unix socket code removed from reading-advantage

## Out of Scope

- Migrating existing API routes to tRPC (Track: Shared Backend API Route Migration)
- Migrating auth flows to the new backend (Track: Shared Backend Auth Migration)
- Frontend integration (apps still call their own API routes during this track)
- Data migration from CloudSQL to local Docker Postgres
- Background jobs, realtime, or email integration

## References

- `apps/reading-advantage/prisma/schema.prisma` — 36 models (base for merge)
- `apps/primary-advantage/prisma/schema.prisma` — 30 models
- `apps/science-advantage/prisma/schema.prisma` — 17 models
- `apps/reading-advantage/lib/prisma.ts` — CloudSQL-specific client to be removed
- Senior backend spec: tRPC + Drizzle + domain layer architecture
- `measure/tech-stack.md` — to be updated with Drizzle/tRPC decisions
