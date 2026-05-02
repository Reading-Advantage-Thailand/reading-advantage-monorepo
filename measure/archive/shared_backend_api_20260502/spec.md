# Specification: Shared Backend API Route Migration

## Context

The three apps have 294 Next.js API route files (reading: 205, primary: 60, science: 29) that directly access the database. With the tRPC + domain layer backend in place, these routes must be converted to tRPC procedures with domain functions.

The migration converts:
```
Next.js route handler → direct Prisma query → JSON response
```
into:
```
tRPC procedure → Zod validation → domain function → Drizzle query → typed response
```

## Goals

1. Audit and categorize all 294 routes by domain, cross-app usage, and complexity
2. Migrate shared routes first (users, classes, assignments) — highest cross-app value
3. Migrate app-specific routes in priority order
4. Update frontend apps to call tRPC procedures instead of `fetch('/api/...')`
5. Remove migrated API route files from apps
6. Ensure all procedures follow the thin-router + domain-function pattern

## Acceptance Criteria

- [ ] All 294 routes are categorized: shared vs app-specific, with priority ranking
- [ ] Tier 1 routes (users, classes, assignments) implemented as tRPC procedures + domain functions
- [ ] Tier 2 routes (articles, flashcards, reports) implemented
- [ ] Tier 3 routes (app-specific) implemented
- [ ] Tier 4 routes (AI/complex) implemented
- [ ] Frontend apps call tRPC procedures (no more `fetch('/api/...')` for internal operations)
- [ ] No app directly imports Drizzle `db` (all DB access through domain functions)
- [ ] `pnpm turbo run build` passes for all apps
- [ ] All procedures have Zod input validation
- [ ] All mutations use transactions for multi-row writes
- [ ] All procedures are scoped by tenant (schoolId/classId)

## Out of Scope

- WebSocket/SSE endpoints (separate track)
- Firebase Functions migration (legacy, separate track)
- API versioning
- Rate limiting, caching, CDN
- Background jobs (separate track)

## References

- `apps/reading-advantage/app/api/` — 205 route files
- `apps/primary-advantage/app/api/` — 60 route files
- `apps/science-advantage/app/api/` — 29 route files
- `packages/api/` — tRPC setup (from scaffold track)
- `packages/domain/` — domain functions (from scaffold track)
- Track dependency: `shared_backend_scaffold_20260502` and `shared_backend_auth_20260502`
