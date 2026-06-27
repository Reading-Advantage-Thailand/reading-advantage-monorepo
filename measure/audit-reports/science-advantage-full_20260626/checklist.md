# Compliance Checklist: Science Advantage

> **Track:** `science_advantage_review_20260626`
> **Source:** 37 batch reports under `line-review/`
> **Status:** Verification state recorded per item. Items needing runtime are **PENDING** (Phase 4 gates not run). No remediation performed.

Legend: ✅ verified present (static) · ⚠️ partial / deviations found · ❌ verified absent/violated (static) · ⏳ PENDING runtime/gate.

## 1. Authentication & Authorization

| # | Check | State | Evidence |
|---|---|---|---|
| 1.1 | All role-gated pages call `requireRole()` server-side | ⚠️ | 01 (19/20 ok; F-SA-B01-001 outlier); 02 (pages 1, 9 delegate to client) |
| 1.2 | Settings page uses role guard not bare `requireAuth()` | ❌ | 01 F-SA-B01-003 |
| 1.3 | API routes return JSON 401, not redirect | ⚠️ | 04 F-SA-B04-002 (analytics route redirects) |
| 1.4 | Class-ownership verified for teacher class pages | ⚠️ | 02 F-SA-B02-009 (lesson preview skips ownership) |
| 1.5 | Backend/lib functions declare auth requirement | ❌ | 22 F-SA-B22-019/-003; 24 F-SA-B24-036/044/051/057; 25 F-SA-B25-005 |
| 1.6 | Auth via shared `@reading-advantage/auth` (no app-local auth) | ✅ | 20; 01 baseline observations |

## 2. Multi-Tenancy (`schoolId` scoping)

| # | Check | State | Evidence |
|---|---|---|---|
| 2.1 | Queries scoped via `createTenantDB` for FLAT tables | ⚠️ | golden in 02 (files 10,12); deviations in 02/21/22/24 |
| 2.2 | `tenant.schoolId` sourced from session not client | ✅ | 05 summary |
| 2.3 | `lib/services/**` tenant-scoped | ❌ | 24 F-SA-B24-056 |
| 2.4 | `lib/gamification/**` tenant-scoped | ❌ | 22 F-SA-B22-001/020/061 |
| 2.5 | Test/seed fixtures populate `schoolId` | ❌ | 04 F-SA-B04-001/004; 25 F-SA-B25-001; 32 F-SA-B32-004; 35 F-SA-B35-006 |
| 2.6 | New tables classified in tenant-registry | ⏳ | not assessable from app-only batches |

## 3. Validation (Zod at boundaries)

| # | Check | State | Evidence |
|---|---|---|---|
| 3.1 | Route inputs validated with Zod | ✅ | 02 (DSAR), 05 (parseQuery/parsePath) |
| 3.2 | URL params validated | ⚠️ | 01 F-SA-B01-004 (analytics page unvalidated) |
| 3.3 | Backend fn inputs use Zod not TS-only types | ⚠️ | 25 F-SA-B25-004 |
| 3.4 | Content/seed validation uses Zod not hand-rolled | ❌ | 24 F-SA-B24-026/059; 32 F-SA-B32-001 |
| 3.5 | Route schema matches domain contract | ❌ | 05 F-SA-B05-001/002 (UUID vs `"me"`; limit clamp) |

## 4. Provider Neutrality / Adapters

| # | Check | State | Evidence |
|---|---|---|---|
| 4.1 | AI via `@reading-advantage/ai` adapter | ✅ | 19 |
| 4.2 | No direct provider SDK in app code | ❌ | 02 F-SA-B02-084 (`@sentry/nextjs`); 18 F-SA-B18-003 (otel at root, documented) |
| 4.3 | Observability via logger adapter | ⚠️ | 02 (Sentry direct), 10 F-SA-B10-022 (client-logger gags in prod) |
| 4.4 | Storage via `@reading-advantage/storage` | ✅ | 00 (.env.example references) |

## 5. Architecture / Golden Path

| # | Check | State | Evidence |
|---|---|---|---|
| 5.1 | Business logic in domain/backend, not components | ❌ | 07, 08 F-SA-B08-002 |
| 5.2 | Thin route handlers | ✅ | 02, 05 |
| 5.3 | Domain layer not bypassed by routes | ⚠️ | 04 F-SA-B04-003 (student-classes route bypasses domain) |
| 5.4 | Redis/cache via real shared adapter | ❌ | 23 F-SA-B23-015/016 (stub) |

## 6. Documentation Standards (JSDoc)

| # | Check | State | Evidence |
|---|---|---|---|
| 6.1 | Exported functions/components have JSDoc | ❌ | 08 F-SA-B08-001 (systemic); 02 F-SA-B02-002; 03 F-SA-B03-013; 24 F-SA-B24-058 |

## 7. Tooling / Build / Deploy

| # | Check | State | Evidence |
|---|---|---|---|
| 7.1 | No Prisma in build/deploy | ❌ | 36 F-SA-B36-001 (vercel.json) |
| 7.2 | Docs reference Drizzle + pnpm | ❌ | 00, 12, 17, 27 (Prisma/npm stale refs) |
| 7.3 | Integration harness uses isolated `_test` DB | ✅ | 36 |
| 7.4 | `tsconfig` includes test files in type-check | ⚠️ | 36 F-SA-B36-003 |
| 7.5 | Seed scripts guard against non-test DB | ❌ | 32 F-SA-B32-003; 35 F-SA-B35-001 |

## 8. Testing

| # | Check | State | Evidence |
|---|---|---|---|
| 8.1 | New backend code has tests | ⚠️ | 21 F-SA-B21-035 (from-zod.ts); 26 F-SA-B26-005/006/010 |
| 8.2 | Tenant-isolation tests are non-vacuous | ❌ | 04 (no-op due to missing schoolId); 21 F-SA-B21-044 |
| 8.3 | No false-pass conditional guards | ❌ | 02 F-SA-B02-031; 17 F-SA-B17-017 |
| 8.4 | Seed data matches seeder contract | ❌ | 33 F-SA-B33-001/002 |
| 8.5 | Lint/type/test/build gates pass | ⏳ | Phase 4 gate not run — PENDING |

## 9. Anti-Pattern Checks (Measure)

| # | Check | State | Evidence |
|---|---|---|---|
| 9.1 | A2 consent-blind publish gate | ✅ not triggered | 01 |
| 9.2 | A6 registry overstatement | ✅ not triggered | 01 (registry accurately describes review track) |
| 9.3 | Checked acceptance criteria reflect reality | ❌ | 26 F-SA-B26-025 (Google-OAuth AC checked but not deployed) |

*Checklist complete. Runtime-dependent items remain PENDING. No remediation performed.*
