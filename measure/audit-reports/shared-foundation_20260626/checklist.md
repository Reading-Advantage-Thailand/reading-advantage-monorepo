# Shared Foundation Review Checklist — Track-Level Scores

> **Track:** `shared_foundation_review_20260626`  
> **Scoring:** ✅ Pass | ⚠️ Partial / monitor | ❌ Fail | N/A Not applicable  
> **Evidence sources:** Phase 1-5 audit artifacts and result JSONs. Measure docs are treated as evidence to verify, not proof by themselves.

---

## Required boundary scores

| Boundary | Score | Evidence | Required follow-up |
|---|---|---|---|
| Database | ❌ Fail | `@reading-advantage/db` lint/check-types passed in Phase 1, but tests fail: 139 failures including Drizzle version/lockfile/sentinel failures. Migration sentinel probes for `0022`/`0023` are missing. Historical migration `0013` has high blast radius. | M-SF-1, M-SF-7 |
| Tenancy | ❌ Fail | Tenant registry is stale with 9 unclassified exported tables; `tenant-coverage.test.ts` fails. Referential scoping static check is vacuous. `createContext` can construct `TenantDB` with `schoolId: null`. | M-SF-1, M-SF-2 |
| Auth | ⚠️ Partial | Phase 2 verified no Critical/High auth findings and no JWT/Firebase remnants in shared auth. Residual medium items: in-memory rate limiter, no CSRF tokens, cookie secure flag tied to `NODE_ENV`. | M-SF-5 |
| Validation / contracts | ❌ Fail | `@reading-advantage/api` type-check exits 2: sales role and nullable `audioStorageKey` drift between domain/API/types. API routers redefine schemas instead of importing domain contracts. `@reading-advantage/types` has no test script. | M-SF-1, M-SF-3, M-SF-8 |
| Domain | ⚠️ Partial | Domain is the primary business layer and mostly reusable, but module decomposition is inconsistent, inline `role ===` checks remain, env reads and console logging exist, and `mastery/record-run.ts` returns HTTP-shaped responses. | M-SF-3, M-SF-4, M-SF-6 |
| API | ❌ Fail | `reports.teacherDashboard` imports Drizzle/schema and runs query logic in the router. API error mapping relies on string matching. `adminProcedure` and sales router middleware hardcode roles. | M-SF-3, M-SF-4 |
| AI | ⚠️ Partial | Provider-neutral `AIClient` seam is strong and app SDK imports are mostly blocked, but aggregate `@reading-advantage/ai` tests have 13 pre-existing failures. One app direct OpenAI SDK import was found and legacy scripts bypass adapters. | M-SF-7, M-SF-10 |
| Storage | ⚠️ Partial | S3 adapter seam is clean and package tests pass. Interface lacks `get()` download/read method; adoption gaps/direct provider use remain outside the package. | M-SF-10 |
| Webhooks | ⚠️ Partial | HMAC signature verification, replay protection, and Zod payload validation pass. Package exports raw TS, logs with `console.*`, and duplicates GitHub client behavior. | M-SF-7, M-SF-9 |
| GitHub | ⚠️ Partial | `@reading-advantage/integrations-github` is a clean no-SDK adapter, but `packages/webhooks` maintains a parallel GitHub client. | M-SF-9 |
| UI | ⚠️ Partial | Shared components use Radix patterns, `forwardRef`, `displayName`, and `cn`. Test coverage covers 5 of 15 component families. | M-SF-8 |
| Utils / types / config | ⚠️ Partial | Utils and config are small and mostly clean. `cn()` is duplicated in `www-reading-advantage`; `types` has zero tests; config has no lint/check-types/build scripts. | M-SF-8 |
| Legacy scripts | ❌ Fail | `packages/reading-advantage-scripts` uses CommonJS, old OpenAI SDK v4, direct `@google-cloud/storage`, direct env reads, and `jest --passWithNoTests`. | M-SF-10 |

---

## Package checklist

| Package | Inventory present | Boundary hygiene | Tests meaningful | Gate truth recorded | Score |
|---|---:|---:|---:|---:|---|
| `@reading-advantage/db` | ✅ | ⚠️ | ❌ | ✅ | ❌ |
| `@reading-advantage/auth` | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| `@reading-advantage/auth-client` | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| `@reading-advantage/domain` | ✅ | ⚠️ | ❌ | ✅ | ❌ |
| `@reading-advantage/api` | ✅ | ❌ | ⚠️ | ✅ | ❌ |
| `@reading-advantage/ai` | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| `@reading-advantage/storage` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ |
| `@reading-advantage/webhooks` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ |
| `@reading-advantage/integrations-github` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `@reading-advantage/types` | ✅ | ⚠️ | ❌ | ✅ | ⚠️ |
| `@reading-advantage/ui` | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| `@reading-advantage/utils` | ✅ | ⚠️ | ✅ | ✅ | ⚠️ |
| `@reading-advantage/config` | ✅ | ⚠️ | ⚠️ | ✅ | ⚠️ |
| `@reading-advantage/scripts` | ✅ | ❌ | ❌ | ✅ | ❌ |

---

## Detailed checklist by review area

### Database and tenancy

| # | Criterion | Score | Evidence |
|---|---|---|---|
| DB-1 | Drizzle schema exports are inventoried | ✅ | `00-inventory.md` `@reading-advantage/db` entry |
| DB-2 | All tenant-scoped tables are classified | ❌ | F-SF-001 / Phase 1 F-DB-001 / Phase 3 F-DAPI-001: 9 unclassified tables |
| DB-3 | Tenant registry coverage test is live and meaningful | ⚠️ | It fails on missing tables, but referential check is vacuous (F-SF-005) |
| DB-4 | Migration journal/sentinels are complete | ❌ | F-SF-006: `0022`/`0023` missing sentinel probes |
| DB-5 | Workspace Drizzle versions are consistent | ❌ | F-SF-014: db uses `^0.45.0`, domain `0.44.7`, auth/api `^0.44.0` |
| DB-6 | Seed/export surface is captured | ✅ | `@reading-advantage/db` inventory includes seed export and `seed:codecamp` script |

### Auth, sessions, permissions, audit

| # | Criterion | Score | Evidence |
|---|---|---|---|
| AUTH-1 | Password hashing uses Argon2id with legacy bcrypt transition | ✅ | Phase 2 result: hardening FRs verified; F-SF-024 tracks scheduled bcrypt removal only |
| AUTH-2 | Sessions are DB-backed and hardened | ✅ | Phase 2 source review verified session cap/token hardening remains |
| AUTH-3 | Rate limiting is production-distributed | ❌ | F-SF-010: in-memory rate limiter; existing `rate_limiter_v2_20260603` pending |
| AUTH-4 | Login/logout/reset/register audit events exist | ✅ | Phase 2 result verified audit utilities and hardening FRs |
| AUTH-5 | CSRF defense is explicit token-based | ⚠️ | F-SF-011: relies on SameSite Lax only |
| AUTH-6 | Auth client validates server responses | ⚠️ | F-SF-023: login response not Zod-validated before setting state |
| AUTH-7 | JWT/Firebase remnants are absent from shared auth | ✅ | Phase 2 anti-pattern note verified none found in shared packages |

### Domain and API boundaries

| # | Criterion | Score | Evidence |
|---|---|---|---|
| DAPI-1 | API routers delegate business logic to domain | ❌ | F-SF-003: `reports.teacherDashboard` runs Drizzle query in router |
| DAPI-2 | API output contracts match domain return shapes | ❌ | F-SF-002: `@reading-advantage/api` type-check fails |
| DAPI-3 | API context cannot create unsafe tenant DB for unauthenticated requests | ❌ | F-SF-004: `schoolId: null` TenantDB is constructed |
| DAPI-4 | Router input schemas reuse domain contracts | ⚠️ | F-SF-007: routers redefine schemas |
| DAPI-5 | Error mapping uses typed errors, not strings | ⚠️ | F-SF-007: string matching in routers |
| DAPI-6 | Authorization is centralized in permissions | ⚠️ | F-SF-008: inline role checks in API/domain |
| DAPI-7 | Domain modules follow expected decomposition | ⚠️ | F-SF-012: classes/students/codecamp/etc. are inconsistent |
| DAPI-8 | Domain avoids env/logging/HTTP transport leakage | ⚠️ | F-SF-013: env reads, console logging, HTTP-shaped return |

### Provider adapters: AI, storage, webhooks, GitHub

| # | Criterion | Score | Evidence |
|---|---|---|---|
| ADAPT-1 | AI provider-neutral interface exists | ✅ | `AIClient` interface with provider implementations |
| ADAPT-2 | AI provider config is validated at factory boundary | ✅ | Zod config schema in `packages/ai` |
| ADAPT-3 | AI package aggregate tests are green | ❌ | F-SF-019: 13 pre-existing failures in `@reading-advantage/ai` package tests |
| ADAPT-4 | Storage provider SDK is behind adapter | ✅ | AWS SDK confined to S3 driver |
| ADAPT-5 | Storage interface covers upload/download/delete/existence needs | ⚠️ | F-SF-022: no `get()` read/download method |
| ADAPT-6 | GitHub integration has a single shared client seam | ❌ | F-SF-009: webhooks duplicates GitHub client logic |
| ADAPT-7 | Webhook signature and replay protection exist | ✅ | HMAC-SHA256 timing-safe verification and timestamp skew check |
| ADAPT-8 | Webhook package boundary is compiled/dist-safe | ❌ | F-SF-015: raw TS exports and ESM extension risk |
| ADAPT-9 | Webhooks use structured logging | ❌ | F-SF-016: production `console.*` calls |

### Shared UI, utils, types, config, scripts

| # | Criterion | Score | Evidence |
|---|---|---|---|
| SHARED-1 | Shared UI components use accessible primitives | ✅ | Radix components, focus-visible styles, alert role |
| SHARED-2 | Shared UI component tests cover all families | ⚠️ | F-SF-018: 5/15 families covered |
| SHARED-3 | `cn()` has one source of truth | ❌ | F-SF-020: duplicated in `apps/www-reading-advantage` |
| SHARED-4 | Shared type contracts have behavioral/schema tests | ❌ | F-SF-017: no `test` script or tests in `types` |
| SHARED-5 | Shared config package has complete quality gates | ⚠️ | Config has tests only; no lint/check/build scripts |
| SHARED-6 | Legacy scripts use shared adapters | ❌ | F-SF-021: direct OpenAI/GCS SDKs and direct env reads |
| SHARED-7 | Legacy script tests prove behavior | ❌ | `jest --passWithNoTests` is vacuous |

---

## Anti-pattern acceptance checks

| Anti-pattern | Status | Evidence |
|---|---|---|
| A1 substring-as-signal | Pass | `automation-supervisor.py` uses task regex `^- \[([~xb])\]` and `is_task_structurally_blocked()` recognizes `[b]` and `deferred:<owner>`. |
| A3 digit-only count | Pass | No `rg -q '[0-9]+'` pattern found in shell tests during acceptance grep. |
| A4 vacuous markers pass | Pass | No marker-consistency shell test pattern found; plan now contains no `[ ]` or `[~]` tasks. |
| A5 false claim text | Pass | Current plan does not claim `PASS=N, FAIL=0` or `all checks pass`. Gate failures are explicitly recorded. |
| A6 registry overstatement | Monitor | `measure/tracks.md` has historical resolved/green claims outside this track; this acceptance did not find a new shared-foundation overstatement. The current track records failures honestly. |
| A7 over-broad filter | Pass | No over-broad banned-term `rg -v` shell-test filter found during acceptance grep. |
