# Shared Foundation Review — Findings

> **Track:** `shared_foundation_review_20260626`  
> **Baseline SHA:** `86da18263307ac8dd2b5e2986cdeb33095af062d`  
> **Synthesis phase:** Phase 6-7 Reporting and Acceptance

Findings are deduplicated across Phase 1 database/tenancy, Phase 2 auth/security, Phase 3 domain/API, and Phase 4-5 adapter/UI reviews. IDs are track-level (`F-SF-*`) and cross-reference phase-local IDs where applicable.

---

## Critical

### F-SF-001 — Tenant registry is stale: 9 exported Drizzle tables are unclassified

- **Severity:** Critical
- **Phase-local IDs:** F-DB-001, F-DAPI-001
- **Surfaces:** `packages/db`, `packages/domain`, tenancy
- **Evidence:** `packages/domain/src/__tests__/tenant-coverage.test.ts` fails on unclassified tables: `verificationTokens`, `userRoles`, `roles`, `articleActivityLogs`, `sentencsAndWordsForFlashcards`, `cardReviews`, `clozeTestGames`, `schoolAdmins`, `leaderboards`.
- **Impact:** The tenant-coverage gate fails. Any domain code that touches these tables through `TenantDB` can throw or bypass the intended classification review. App reviews cannot trust tenant isolation coverage until fixed.
- **Blocked downstream:** `primary_advantage_full_review_20260626`; all app reviews relying on shared tenant isolation.
- **Owner proposal:** M-SF-1.

### F-SF-002 — API/type contract drift breaks `@reading-advantage/api` type-check

- **Severity:** Critical
- **Phase-local IDs:** F-DAPI-002
- **Surfaces:** `packages/api`, `packages/types`, `packages/domain`, validation/contracts
- **Evidence:** Phase 3 `pnpm turbo run check-types --filter=@reading-advantage/domain --filter=@reading-advantage/api` exits 2. Reported mismatches: `packages/api/src/routers/sales.ts:131` returns `audioStorageKey: string | null` where schema requires `string`; `packages/api/src/routers/users.ts` returns roles including `SALES_REP`/`SALES_ADMIN` while `userResponseSchema` allows only legacy roles.
- **Impact:** Shared tRPC outputs can reject valid runtime responses and sales users cannot rely on the users router contract.
- **Blocked downstream:** `sales_advantage_full_review_20260626`; any app review consuming shared users/sales routers.
- **Owner proposal:** M-SF-1.

### F-SF-003 — `reports.teacherDashboard` queries the DB inside the API router

- **Severity:** Critical
- **Phase-local IDs:** F-DAPI-003
- **Surfaces:** `packages/api`, `packages/domain`, API/domain boundary
- **Evidence:** `packages/api/src/routers/reports.ts` imports Drizzle/schema and builds the teacher-dashboard query inline instead of delegating to domain.
- **Impact:** Business logic lives in the transport layer, cannot be reused by workers/CLI/app route handlers, and manually implements tenant scoping outside the domain contract.
- **Blocked downstream:** Reading/Primary/Science teacher-dashboard reviews; all app reviews that evaluate thin transport boundaries.
- **Owner proposal:** M-SF-3.

### F-SF-004 — API context can create a tenant-branded DB with `schoolId: null`

- **Severity:** Critical
- **Phase-local IDs:** F-DAPI-004
- **Surfaces:** `packages/api`, `packages/domain`, tenancy
- **Evidence:** `packages/api/src/context.ts` constructs `createTenantDB(db, auth?.tenant ?? { schoolId: null })`; fallback path also uses `{ schoolId: null }`. `packages/domain/src/db-contract.ts` warns but still returns a `TenantDB` object.
- **Impact:** A public procedure or missed auth check can pass a tenant-branded DB without an actual tenant to domain code, creating cross-tenant leak potential.
- **Blocked downstream:** All app reviews with mixed public/authenticated routers.
- **Owner proposal:** M-SF-2.

---

## High

### F-SF-005 — Referential-scoping static check is vacuous

- **Severity:** High
- **Phase-local IDs:** F-DB-002
- **Surfaces:** `packages/domain`, tenancy tests
- **Evidence:** Phase 1 proved `hasBareTenantDbOnReferential()` in `tenant-coverage.test.ts` unconditionally returns false and can miss a temporary fixture that queries a referential table through `createTenantDB`.
- **Impact:** A test that appears to enforce referential scoping does not actually detect the class of misuse it claims to cover.
- **Owner proposal:** M-SF-2.

### F-SF-006 — Missing migration sentinel probes for `0022` and `0023`

- **Severity:** High
- **Phase-local IDs:** F-DB-004
- **Surfaces:** `packages/db`, migrations
- **Evidence:** Phase 1 `journal-integrity.test.ts` fails because `0022_flowery_black_tarantula` and `0023_cultured_sunspot` have no sentinel probes in `packages/db/src/sentinels.ts`.
- **Impact:** Migration ledger integrity can regress without a sentinel asserting expected schema state.
- **Owner proposal:** M-SF-7.

### F-SF-007 — API routers duplicate contracts and map errors by strings

- **Severity:** High
- **Phase-local IDs:** F-DAPI-005, F-DAPI-006
- **Surfaces:** `packages/api`, `packages/domain`, `packages/types`
- **Evidence:** Users and articles routers redefine input schemas instead of importing domain contracts. Codecamp/sales routers map domain errors via `err.message ===`, `.startsWith()`, and `.includes("not found")`; `packages/domain/src/users/queries.ts` still throws plain `Error("User not found")` despite a typed error existing.
- **Impact:** Input and error contracts drift silently; refactoring message text can change tRPC status codes.
- **Owner proposal:** M-SF-4.

### F-SF-008 — Authorization logic remains scattered across API and domain

- **Severity:** High
- **Phase-local IDs:** F-DAPI-007, F-DAPI-009
- **Surfaces:** `packages/api`, `packages/domain`, auth/permissions
- **Evidence:** `packages/api/src/trpc.ts` hardcodes `ADMIN`/`SYSTEM`; `packages/api/src/routers/sales.ts` defines local sales middleware; domain functions in classes/students/curriculum/ai/interventions contain inline `role ===` checks.
- **Impact:** Permission changes require edits across transport and domain files and cannot be centrally audited.
- **Owner proposal:** M-SF-4.

### F-SF-009 — Duplicate GitHub client implementations split webhook and shared integration behavior

- **Severity:** High
- **Phase-local IDs:** F-A4-01
- **Surfaces:** `packages/webhooks`, `packages/integrations/github`, GitHub integration
- **Evidence:** `packages/webhooks/src/github-client.ts` duplicates JWT/auth/signature/PR operations also implemented by `packages/integrations/github/src/drivers/rest.ts` and related client/factory files.
- **Impact:** Security or retry changes can be fixed in one GitHub client and missed in the other; CodeCamp PR review reliability depends on both paths staying aligned.
- **Blocked downstream:** `codecamp_advantage_review_20260626`.
- **Owner proposal:** M-SF-9.

### F-SF-010 — Auth rate limiting is in-memory and not deployment-wide

- **Severity:** High
- **Phase-local IDs:** F-AUTH-001
- **Surfaces:** `packages/auth`, auth boundary
- **Evidence:** `packages/auth/src/rate-limit.ts` uses an in-memory `Map`. Phase 2 notes the pending `rate_limiter_v2_20260603` track.
- **Impact:** Login throttling resets on process restart and does not coordinate across multiple app instances.
- **Owner proposal:** M-SF-5.

### F-SF-011 — Auth CSRF/cookie security has monitor gaps

- **Severity:** High
- **Phase-local IDs:** F-AUTH-002, F-AUTH-003
- **Surfaces:** `packages/api` auth routes, auth boundary
- **Evidence:** Login/logout routes rely on `sameSite: "lax"` rather than explicit CSRF tokens. Cookie `secure` flag is gated on `NODE_ENV === "production"`, which can be wrong in HTTPS staging.
- **Impact:** Security posture depends on deployment naming and browser SameSite behavior rather than explicit environment/security configuration.
- **Owner proposal:** M-SF-5.

---

## Medium

### F-SF-012 — Domain module decomposition is inconsistent

- **Severity:** Medium
- **Phase-local IDs:** F-DAPI-008
- **Surfaces:** `packages/domain`
- **Evidence:** Classes and students have business logic in `index.ts`; codecamp remains split into domain-specific monolith files; AI/mastery/interventions/audit functions are single-file modules instead of the expected schema/contracts/queries/mutations/permissions/errors/index pattern.
- **Impact:** Reviews and refactors take longer; permission/contract placement is inconsistent.
- **Owner proposal:** M-SF-6.

### F-SF-013 — Domain code leaks environment, logging, and HTTP concerns

- **Severity:** Medium
- **Phase-local IDs:** F-DAPI-010, F-DAPI-011, F-DAPI-012, F-DAPI-013
- **Surfaces:** `packages/domain`, `packages/api`, AI/config/transport boundaries
- **Evidence:** `sales/roleplay-evaluator.ts` reads model env vars; domain code logs with `console.warn/error`; `mastery/record-run.ts` returns `{ status, body, headers }`; `codecamp.reviewExercise` assembles AI adapter lifecycle in the router.
- **Impact:** Domain functions are harder to test and less portable across CLI/workers/routes.
- **Owner proposal:** M-SF-6.

### F-SF-014 — Drizzle ORM declarations are inconsistent across workspace packages

- **Severity:** Medium
- **Phase-local IDs:** F-DB-003
- **Surfaces:** `package.json`, `packages/db`, `packages/domain`, `packages/auth`, `packages/api`
- **Evidence:** Phase 1 found declared versions: db `^0.45.0`, domain `0.44.7`, auth/api `^0.44.0`; root has no override. Version/lockfile tests fail.
- **Impact:** Type/runtime mismatch risk across schema, query builders, and generated migrations.
- **Owner proposal:** M-SF-1.

### F-SF-015 — Webhooks package exposes raw TypeScript and has ESM import risk

- **Severity:** Medium
- **Phase-local IDs:** F-A4-02, F-A4-04
- **Surfaces:** `packages/webhooks`, package boundary
- **Evidence:** `packages/webhooks/package.json` exports `./src/index.ts` and `./src/github.ts` rather than `dist`; `github.ts` imports `./github-client` without `.js` extension.
- **Impact:** Consumers outside tsx/bundler-aware contexts can fail at runtime; package boundary differs from other shared packages.
- **Owner proposal:** M-SF-7.

### F-SF-016 — Webhooks use unstructured production logging

- **Severity:** Medium
- **Phase-local IDs:** F-A4-03
- **Surfaces:** `packages/webhooks`, observability
- **Evidence:** Phase 4-5 counted production `console.*` calls in `packages/webhooks/src/github.ts` and `github-client.ts`.
- **Impact:** Logs lack request IDs/structured fields and are harder to trace in webhook incidents.
- **Owner proposal:** M-SF-7.

### F-SF-017 — `@reading-advantage/types` has zero tests despite owning shared contracts

- **Severity:** Medium
- **Phase-local IDs:** F-A5-02
- **Surfaces:** `packages/types`, validation/contracts
- **Evidence:** `packages/types/package.json` has no `test` script and no test directory.
- **Impact:** Contract drift like the sales roles/audio nullability mismatch can reach API type-check/runtime before a package-local test catches it.
- **Owner proposal:** M-SF-8.

### F-SF-018 — Shared UI test coverage is partial

- **Severity:** Medium
- **Phase-local IDs:** F-A5-03
- **Surfaces:** `packages/ui`, UI/a11y
- **Evidence:** 10 tests cover Button, Card, Dialog, Input, and Tabs; 10 component families lack direct tests.
- **Impact:** Accessibility and API regressions in less-used shared components can affect app reviews/imports.
- **Owner proposal:** M-SF-8.

### F-SF-019 — `@reading-advantage/ai` aggregate test gate has 13 pre-existing failures

- **Severity:** Medium
- **Phase-local IDs:** Phase 4-5 gate note
- **Surfaces:** `packages/ai`, AI adapter tests
- **Evidence:** Phase 4-5 result: 196 core adapter tests pass, but 13 failures remain from phase-0 setup, phase-11 lockfile, and phase-12 closeout tests from a prior SDK migration track.
- **Impact:** AI package aggregate test signal is noisy; future adapter regressions can be masked by known red tests.
- **Owner proposal:** M-SF-7.

### F-SF-020 — `cn()` utility is duplicated outside the shared utils package

- **Severity:** Medium
- **Phase-local IDs:** F-A5-01
- **Surfaces:** `packages/utils`, `apps/www-reading-advantage`
- **Evidence:** `packages/utils/src/cn.ts` and `apps/www-reading-advantage/src/lib/utils.ts` contain duplicate implementations.
- **Impact:** Shared styling helper can diverge across apps.
- **Blocked downstream:** `www_reading_advantage_review_20260626`.
- **Owner proposal:** M-SF-8 or website app review.

### F-SF-021 — Legacy reading scripts bypass AI/storage adapters

- **Severity:** Medium
- **Phase-local IDs:** F-X-01
- **Surfaces:** `packages/reading-advantage-scripts`, legacy scripts, AI/storage
- **Evidence:** `generateArticle.js` and related scripts use old `openai` v4 and direct `@google-cloud/storage`; package is CommonJS and uses `jest --passWithNoTests`.
- **Impact:** Legacy content-generation scripts remain outside provider-neutral architecture and quality gates.
- **Owner proposal:** M-SF-10.

---

## Low

### F-SF-022 — `StorageClient` interface has no `get()` download/read method

- **Severity:** Low
- **Phase-local IDs:** F-X-02
- **Surfaces:** `packages/storage`
- **Evidence:** `StorageClient` defines `put`, `getUrl`, `getSignedUrl`, `delete`, and `exists`, but no object read/download method.
- **Impact:** May be intentional if all reads are URL-based, but apps needing server-side reads will bypass or extend the adapter.
- **Owner proposal:** M-SF-10 or storage hardening track.

### F-SF-023 — Auth client login response is not Zod-validated before state update

- **Severity:** Low
- **Phase-local IDs:** F-AUTH-007
- **Surfaces:** `packages/auth-client`, auth client boundary
- **Evidence:** Phase 2 cites `packages/auth-client/src/provider.tsx:76-82`.
- **Impact:** Server/client contract drift can populate incomplete auth state.
- **Owner proposal:** M-SF-5.

### F-SF-024 — Transitional auth cleanup and nested redaction gaps remain

- **Severity:** Low
- **Phase-local IDs:** F-AUTH-004, F-AUTH-005, F-AUTH-006
- **Surfaces:** `packages/auth`
- **Evidence:** `bcryptjs` remains for legacy hash verification; session token hashing uses unsalted SHA-256 (mitigated by 256-bit CSPRNG tokens); `safeMetadata()` redacts only top-level PII keys.
- **Impact:** Mostly monitor/cleanup items; nested audit metadata redaction can leak PII if callers pass nested objects.
- **Owner proposal:** M-SF-5.

### F-SF-025 — Table name typo in primary schema

- **Severity:** Low
- **Phase-local IDs:** F-DB-005
- **Surfaces:** `packages/db`, primary schema
- **Evidence:** `packages/db/src/schema/primary.ts` and migration `0022_flowery_black_tarantula.sql` use `sentencsAndWordsForFlashcards` / `sentencs_and_words_for_flashcard`.
- **Impact:** Typo increases future migration and API confusion; renaming is potentially breaking and should be deliberate.
- **Blocked downstream:** `primary_advantage_full_review_20260626`.
- **Owner proposal:** M-SF-1 or Primary review remediation.

### F-SF-026 — API lint warnings and unused imports add noise

- **Severity:** Low
- **Phase-local IDs:** F-DAPI-014
- **Surfaces:** `packages/api`
- **Evidence:** Phase 3 identified unused imports in `routers/sales.ts` and `reset-password.test.ts`.
- **Impact:** Low functional risk, but noisy gates hide more important warnings.
- **Owner proposal:** opportunistic cleanup in M-SF-3/M-SF-4.

---

## Finding count summary

| Severity | Count |
|---|---:|
| Critical | 4 |
| High | 7 |
| Medium | 10 |
| Low | 5 |
| **Total** | **26** |

---

## Root-cause groups

| Root cause | Findings |
|---|---|
| Tenant/schema/registry drift | F-SF-001, F-SF-002, F-SF-004, F-SF-005, F-SF-014, F-SF-025 |
| Business logic or provider lifecycle in transport | F-SF-003, F-SF-013 |
| Authorization not centralized | F-SF-008 |
| Contracts not shared/tested | F-SF-002, F-SF-007, F-SF-017, F-SF-023 |
| Migration/test gate integrity | F-SF-006, F-SF-019, F-SF-026 |
| Adapter duplication/adoption gaps | F-SF-009, F-SF-020, F-SF-021, F-SF-022 |
| Security monitor items | F-SF-010, F-SF-011, F-SF-024 |
| Package boundary/observability hygiene | F-SF-012, F-SF-015, F-SF-016, F-SF-018 |
