# Shared Foundation Review — Executive Summary

> **Track:** `shared_foundation_review_20260626`  
> **Baseline:** `86da18263307ac8dd2b5e2986cdeb33095af062d`  
> **Acceptance synthesis:** Phase 6-7 Reporting and Acceptance

## Bottom line

The Shared Foundation Review is **complete as a review track** and should be accepted, but the shared foundation itself is **not green**. The final artifact set now covers every in-scope package and every required boundary: database, tenancy, auth, validation/contracts, domain, API, AI, storage, webhooks, GitHub, UI, utils/types/config, and legacy scripts.

The highest-risk conclusion is that app reviews can proceed only with explicit caveats. Tenant registry drift, null-tenant behavior, API/type contract drift, and API business-logic leakage are shared root causes that can invalidate downstream app-level conclusions if ignored.

## Scope covered

| Required scope | Coverage |
|---|---|
| `packages/db` | Covered: schema/migrations/sentinels/version declarations/gates |
| `packages/auth` | Covered: password/session/rate-limit/audit/permissions/security monitor items |
| `packages/auth-client` | Covered: provider/login state and response-validation gap |
| `packages/domain` | Covered: TenantDB, registry, module structure, permissions, env/logging/transport leakage |
| `packages/api` | Covered: tRPC routers, auth routes, context, contracts, error mapping, transport/domain split |
| `packages/ai` | Covered: provider-neutral adapter, providers, aggregate test failures |
| `packages/storage` | Covered: S3 adapter, interface completeness, error/read semantics |
| `packages/webhooks` | Covered: GitHub webhook verification, replay, payload validation, logging/package boundary |
| `packages/types` | Covered: Zod contracts, role/schema drift, zero tests |
| `packages/ui` | Covered: component inventory, accessibility posture, test gaps |
| `packages/utils` | Covered: `cn`, hooks, ffmpeg utilities, duplicate helper risk |
| `packages/config` | Covered: tsconfig/eslint/tailwind exports and limited gates |
| `packages/integrations/github` | Covered: GitHubClient seam, REST driver, duplication with webhooks |
| `packages/reading-advantage-scripts` | Covered: legacy CommonJS/provider-SDK bypass and vacuous tests |

## Key risks

| Risk | Severity | Why it matters |
|---|---|---|
| Tenant registry drift | Critical | 9 exported tables are unclassified; tenant coverage fails and tenant guarantees are not trustworthy. |
| API/type contract drift | Critical | `@reading-advantage/api` type-check fails; sales roles/nullability do not match shared schemas. |
| API business logic leakage | Critical | `reports.teacherDashboard` queries DB inside the tRPC router instead of the domain layer. |
| Null-tenant `TenantDB` | Critical | Unauthenticated paths can receive a tenant-branded DB with `schoolId: null`. |
| Vacuous referential-scope test | High | A test that appears to guard REFERENTIAL table misuse can miss it. |
| Auth rate-limit/CSRF monitor items | High | Rate limiting is per-process; CSRF/cookie security relies on weaker deployment/browser assumptions. |
| Duplicate GitHub clients | High | Webhook and shared integration paths can drift in security/retry behavior. |
| Stale aggregate tests | Medium | `@reading-advantage/ai` has 13 known red tests; legacy scripts pass with no tests. |

## Finding counts

| Severity | Count |
|---|---:|
| Critical | 4 |
| High | 7 |
| Medium | 10 |
| Low | 5 |
| **Total** | **26** |

## Gate results

Gate evidence is cited from phase result JSONs. Failures are recorded as findings, not hidden.

| Gate / package area | Result | Detail |
|---|---|---|
| `db` + `domain` lint | Pass | Phase 1 direct package lint passed with warnings only. |
| `db` + `domain` check-types | Pass in Phase 1 direct run | Phase 3 later reported a db check-types lifecycle failure in dependency chain; recorded as a finding. |
| `db` + `domain` tests | Fail | `db`: 139 failed, 957 passed, 12 skipped; `domain`: tenant coverage fails on unclassified tables/full suite timed out. |
| `auth` + `auth-client` tests | Timeout / not fully rerun | Phase 2 tests timed out at 120s; source review found no Critical/High shared-auth findings. |
| `domain` + `api` lint | Pass | Phase 3 passed with warnings only. |
| `domain` + `api` check-types | Fail | `@reading-advantage/api` exits 2 due to schema drift. |
| `domain` + `api` tests | Fail combined | Domain tenant coverage fails; API standalone tests pass 168/168. |
| Adapters/UI/types/config lint/check-types | Mostly pass | Phase 4-5 reports pass/cached pass for in-scope packages where scripts exist. |
| Adapters/UI/types/config tests | Partial | Storage 12/12, webhooks 78/78, UI 10/10, utils 22/22, integrations-github 5/5 pass; AI has 13 pre-existing failures; types has no test script. |
| Legacy scripts | Not meaningful | `jest --passWithNoTests` is vacuous. |

## Proposed remediation tracks

1. **M-SF-1 — Tenant registry, schema contract, and Drizzle alignment** (Critical).
2. **M-SF-2 — Fail-closed TenantDB and referential-scope test hardening** (Critical).
3. **M-SF-3 — Move remaining business logic out of API transport** (Critical).
4. **M-SF-4 — Centralize permissions and typed error/contract mapping** (High).
5. **M-SF-5 — Auth monitor hardening batch** (High).
6. **M-SF-6 — Domain structure and portability cleanup** (Medium).
7. **M-SF-7 — Package gate integrity and compiled webhook boundary** (High).
8. **M-SF-8 — Shared contract/UI utility test coverage** (Medium).
9. **M-SF-9 — Consolidate GitHub integration and webhook review pipeline seam** (High).
10. **M-SF-10 — Legacy provider-adapter adoption for scripts and app exceptions** (Medium).

## Downstream impact

| Downstream review | Status |
|---|---|
| `reading_advantage_full_review_20260626` | Proceed only with caveats for API business-logic leakage, null-tenant safety, permissions, and legacy scripts. |
| `primary_advantage_full_review_20260626` | Blocked/caveated by tenant registry drift, schema drift, Drizzle alignment, primary schema typo, legacy scripts, and a direct OpenAI app exception. |
| `science_advantage_review_20260626` | Caveated by API/domain boundary and null-tenant risks. |
| `codecamp_advantage_review_20260626` | Caveated by duplicate GitHub clients, webhook package/logging issues, and AI aggregate test failures. |
| `sales_advantage_review_20260626` | Blocked/caveated by sales role/schema drift, auth monitor items, and sales evaluator env coupling. |
| `marketing_app_review_20260626` | Caveated by AI aggregate test signal if shared AI is used. |
| `advantage_games_review_20260626` | No hard shared blocker identified, but shared UI/types caveats apply if imported. |
| `www_reading_advantage_review_20260626` | Caveated by duplicate `cn()` and shared UI test gaps. |
| `cross_app_workflows_review_20260626` | Must consume all Critical/High shared-foundation findings as cross-app root causes. |

## Acceptance decision

**Review acceptance: PASS.** The track's acceptance criteria are met:

- Every in-scope package has inventory coverage.
- Every required boundary is explicitly scored.
- Findings are deduplicated into shared root causes.
- Proposed migration tracks identify blocked/caveated downstream app reviews.
- Gate failures are reported honestly and treated as review findings.

**Product readiness: FAIL / remediation required.** The shared packages should not be described as fully green until the Critical and High remediation tracks are completed.
