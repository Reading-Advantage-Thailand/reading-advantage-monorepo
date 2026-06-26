# Shared Foundation Review — Executive Summary

> Track: `shared_foundation_review_20260626`  
> Phase: **Phase 3: Domain and API Boundaries**  
> Baseline: `86da18263307ac8dd2b5e2986cdeb33095af062d`

## Bottom line

The shared domain and API packages are **functionally rich but structurally fragile**. Most routers correctly delegate to domain functions, and the domain layer is free of tRPC/Next/provider-SDK coupling. However, three Critical issues block the CI gates and create real correctness risks:

1. The tenant table registry is stale — 9 exported Drizzle tables are unclassified, causing the tenant-coverage test to fail.
2. The API package fails type-check because output schemas in `@reading-advantage/types` do not match the shapes returned by domain code (SALES roles, nullability).
3. `reports.teacherDashboard` bypasses the domain layer entirely and queries the database from the router.

## Key risks

| Risk | Severity | Why it matters |
|------|----------|----------------|
| Tenant registry drift | Critical | Any code touching unclassified tables through `TenantDB` throws; CI gate fails; tenant isolation contract is broken. |
| Type/schema drift | Critical | Runtime output validation will reject valid responses for SALES users and nullable audio keys. |
| Business logic in transport | Critical | Teacher-dashboard logic cannot be reused by workers, other apps, or CLI tools; tenant scoping is manually reimplemented. |
| Null-tenant `TenantDB` | High | Unauthenticated requests receive a tenant-branded DB that does not scope queries, creating cross-tenant leak potential. |
| Hardcoded roles in API | High | Authorization is scattered and not reusable; new roles require transport-layer edits. |
| Fractured module structure | Medium | Several modules keep logic in `index.ts` or monolithic files, slowing reuse and review. |

## Gate results

| Gate | Result | Detail |
|------|--------|--------|
| Lint (domain + api) | ✅ Pass | Warnings only (16 total) |
| Type check (domain + api) | ❌ Fail | API has schema mismatches; dependency `@reading-advantage/db` check-types also fails |
| Tests (domain + api) | ❌ Fail | Domain `tenant-coverage.test.ts` fails (3/331); API tests pass standalone (168/168) |

## Findings summary

- **Critical:** 3
- **High:** 4
- **Medium:** 6
- **Low:** 2
- **Total:** 15

## Proposed remediation tracks

1. **M-DAPI-1** — Repair tenant registry and type contract drift (Critical).
2. **M-DAPI-2** — Lift remaining business logic out of API transport (Critical/High).
3. **M-DAPI-3** — Centralize authorization in domain permissions (High).
4. **M-DAPI-4** — Share domain contracts with API routers (High).
5. **M-DAPI-5** — Harden null-tenant safety and context tests (High).
6. **M-DAPI-6** — Complete domain module decomposition (Medium).
7. **M-DAPI-7** — Remove env coupling and console logging from domain (Medium).

## Downstream impact

The findings in this phase directly block or complicate the following planned app reviews:

- `sales_advantage_full_review_20260626` (SALES role schema mismatches, env-coupled evaluator)
- `reading_advantage_full_review_20260610` (direct DB use in reports, permission drift)
- `primary_advantage_full_review_20260626`
- `science_advantage_review_20260626`
- `codecamp_advantage_review_20260626` (codecamp module monolith, AI wiring in router)

## Recommendation

Do **not** begin deep app reviews until **M-DAPI-1** and **M-DAPI-5** are complete. M-DAPI-2 should follow immediately so app reviewers can trust that any business logic they find in app route handlers is a true app-level gap, not a shared-package leak.
