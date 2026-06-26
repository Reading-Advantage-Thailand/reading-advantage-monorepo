# Shared Foundation Review — Test Gaps

> **Track:** `shared_foundation_review_20260626`  
> **Synthesis phase:** Phase 6-7 Reporting and Acceptance

This file lists gaps where existing tests are missing, shallow, stale, or aggregate-red in ways that reduce trust in shared package boundaries.

---

## Critical / high-priority gaps

### TG-SF-001 — Tenant registry test fails, and referential-scoping test is partly vacuous

- **Findings:** F-SF-001, F-SF-005
- **Current evidence:** `tenant-coverage.test.ts` catches 9 unclassified tables, but Phase 1 proved the referential-table misuse detector can return false unconditionally.
- **Risk:** The suite both blocks CI and overstates referential-scope coverage.
- **Recommended tests:**
  - Fix table classification first so the test can return green for the right reason.
  - Add a fixture or static scan that demonstrably fails when a REFERENTIAL table is accessed through `TenantDB` without `unscoped("reason")`.
  - Add behavioral tests for representative FLAT/REFERENTIAL/EXEMPT tables.

### TG-SF-002 — Null-tenant `TenantDB` safety is untested

- **Findings:** F-SF-004
- **Current evidence:** `packages/api/src/__tests__/context.test.ts` only covers `roleSchema` behavior per Phase 3.
- **Risk:** Public/auth routes can accidentally pass an unsafe tenant DB into domain functions.
- **Recommended tests:**
  - `createContext()` without token returns no usable tenant-scoped DB or one that fails closed.
  - Auth-failure fallback does not silently create `TenantDB({ schoolId: null })`.
  - Valid token scopes `tenantDb` to the session school.

### TG-SF-003 — API router tests use mocks and do not prove tenant isolation

- **Findings:** F-SF-003, F-SF-004, F-SF-007, F-SF-008
- **Current evidence:** Phase 3 notes router tests pass with mocked DB/TenantDB and can encode current boundary violations as passing behavior.
- **Risk:** Raw DB usage or tenant bypass in routers can pass unit tests.
- **Recommended tests:**
  - Add at least one integration-style test per shared router using a real or high-fidelity `TenantDB` fixture.
  - Add a static/lint test forbidding `drizzle-orm` and `@reading-advantage/db/schema` imports from router files.

### TG-SF-004 — Type contract package has no package-local tests

- **Findings:** F-SF-002, F-SF-017
- **Current evidence:** `packages/types` has no `test` script.
- **Risk:** Role/nullability/schema drift is caught only downstream by API type-check or runtime validation.
- **Recommended tests:**
  - Add Zod parse tests for user role schemas, sales roleplay attempt outputs, auth user/session payloads, and science class contracts.
  - Include negative tests for invalid roles/nullability.

### TG-SF-005 — API/domain contract parity is not tested

- **Findings:** F-SF-002, F-SF-007
- **Current evidence:** Routers redefine schemas; no parity tests compare domain contracts to router inputs/outputs.
- **Risk:** API schemas drift from domain contracts even after one mismatch is fixed.
- **Recommended tests:**
  - Prefer importing domain contracts into routers.
  - If schemas remain separate, add type-level or runtime parity tests for each router.

### TG-SF-006 — Error mapping is not protected by typed-error contract tests

- **Findings:** F-SF-007
- **Current evidence:** Routers inspect `err.message` strings.
- **Risk:** A harmless domain message change can alter HTTP/tRPC codes.
- **Recommended tests:**
  - Introduce typed error classes and tests mapping each class to expected tRPC code.
  - Add a negative test that changing message text does not change status mapping.

### TG-SF-007 — Migration sentinel coverage is incomplete

- **Findings:** F-SF-006
- **Current evidence:** `journal-integrity.test.ts` fails because `0022`/`0023` lack sentinel probes.
- **Risk:** Migration ledger/schema drift can be missed for recent migrations.
- **Recommended tests:**
  - Add sentinels for `0022_flowery_black_tarantula` and `0023_cultured_sunspot`.
  - Keep a test that fails when a new migration is added without a sentinel or explicit exemption.

### TG-SF-008 — `@reading-advantage/ai` has stale red tests in its aggregate suite

- **Findings:** F-SF-019
- **Current evidence:** Phase 4-5 reports 196 core adapter tests pass but 13 prior migration phase/closeout tests fail.
- **Risk:** Aggregate package test failures can mask new AI adapter regressions.
- **Recommended tests:**
  - Move prior-track artifact/closeout tests out of the package aggregate if they are no longer live package contracts.
  - Fix any still-valid SDK migration tests so `pnpm turbo run test --filter=@reading-advantage/ai` exits 0.

---

## Medium-priority gaps

### TG-SF-009 — Auth gates were not fully rerun; rate-limit/CSRF behavior needs targeted tests

- **Findings:** F-SF-010, F-SF-011, F-SF-023, F-SF-024
- **Current evidence:** Phase 2 source review passed but package tests timed out at 120s; lint/check-types were not rerun for review-only policy.
- **Risk:** Security behavior relies on source inspection and prior track evidence rather than current live package gates.
- **Recommended tests:**
  - Add fast unit tests for rate-limit decisions independent of live Postgres.
  - Add route tests for CSRF/cookie secure configuration.
  - Add auth-client response validation tests.
  - Add nested `safeMetadata()` redaction tests.

### TG-SF-010 — Webhook package tests do not enforce single GitHub client seam

- **Findings:** F-SF-009
- **Current evidence:** Webhooks and integration tests pass independently while duplicated clients remain.
- **Risk:** Two implementations drift while both test suites stay green.
- **Recommended tests:**
  - Add an architectural test that webhooks consume `@reading-advantage/integrations-github` for GitHub API operations.
  - Preserve dedicated HMAC/replay tests for webhook-specific security behavior.

### TG-SF-011 — Webhook runtime packaging is not smoke-tested from `dist`

- **Findings:** F-SF-015
- **Current evidence:** Package exports raw TypeScript; tests run through TS-aware tooling.
- **Risk:** Runtime consumers fail after `tsc` build despite tests passing.
- **Recommended tests:**
  - Add a build smoke test that imports `dist/index.js` and starts or instantiates the Hono app under Node.
  - Add ESM import-extension checks for compiled output.

### TG-SF-012 — Shared UI has shallow component-family coverage

- **Findings:** F-SF-018
- **Current evidence:** 5 test files cover 5 of 15 component families.
- **Risk:** Accessibility/ref/className regressions in untested primitives can propagate to all apps.
- **Recommended tests:**
  - Smoke render every exported component family.
  - Add interaction/a11y tests for AlertDialog, Checkbox, Tooltip, Progress, and Avatar.

### TG-SF-013 — Shared utility duplication is not guarded

- **Findings:** F-SF-020
- **Current evidence:** Duplicate `cn()` exists in app code.
- **Risk:** Duplication can recur after cleanup.
- **Recommended tests:**
  - Add a static guard or lint rule against app-local `cn()` definitions where `@reading-advantage/utils/cn` is available.

### TG-SF-014 — Legacy scripts have vacuous tests

- **Findings:** F-SF-021
- **Current evidence:** `packages/reading-advantage-scripts` only runs `jest --passWithNoTests`.
- **Risk:** Provider SDK migration or script behavior can break without detection.
- **Recommended tests:**
  - If scripts remain supported, add real tests for prompt generation, readability calculation, provider-adapter calls, and storage upload behavior.
  - If scripts are unsupported, quarantine them and stop including them in quality claims.

### TG-SF-015 — Storage read/error semantics are under-specified

- **Findings:** F-SF-022
- **Current evidence:** Storage package tests pass for current methods, but there is no `get()` method and `exists()` error semantics are a known hardening concern.
- **Risk:** Consumers that need reads or accurate infra errors bypass the adapter.
- **Recommended tests:**
  - Add contract tests for chosen read semantics: URL-only or server-side `get()`.
  - Add tests that distinguish missing object from infrastructure/auth failure.

---

## Gate gaps and truthfulness notes

- Gate failures are accepted findings for this review track, not blockers to documenting the review.
- The shared foundation aggregate is **not** green:
  - `@reading-advantage/db` tests fail.
  - `@reading-advantage/domain` tenant coverage fails.
  - `@reading-advantage/api` type-check fails.
  - `@reading-advantage/ai` aggregate tests have 13 stale/pre-existing failures.
  - `@reading-advantage/auth` tests timed out in Phase 2.
- `@reading-advantage/types` and `@reading-advantage/scripts` have no meaningful test signal.

---

## Anti-pattern checks for this review track

| Anti-pattern | Acceptance result | Evidence |
|---|---|---|
| A1 substring-as-signal | Pass | Supervisor regex is `[~xb]`; helper recognizes `[b]` and `deferred:<owner>`. |
| A3 digit-only count | Pass | Acceptance grep found no `rg -q '[0-9]+'` shell-test count assertion. |
| A4 vacuous pass | Pass | No marker-consistency shell test pattern found; current plan has no `[~]` or `[ ]` tasks. |
| A5 false claim text | Pass | Plan and artifacts explicitly record failing/timed-out gates; no false `all checks pass` claim. |
| A6 registry overstatement | Monitor | Historical registry claims exist, but no new shared-foundation resolved claim was added without evidence. |
| A7 over-broad filter | Pass | Acceptance grep found no banned-term over-broad `rg -v` shell-test filter. |

---

## Recommended test additions in priority order

1. Fix tenant classifications and replace the vacuous referential-scoping detector.
2. Add null-tenant fail-closed `TenantDB` and API context tests.
3. Fix `@reading-advantage/api`/`@reading-advantage/types` schema drift and add package-local type-contract tests.
4. Add router static/import guards and API/domain delegation tests.
5. Restore db migration sentinel and AI aggregate test signal.
6. Add auth rate-limit/CSRF/cookie/auth-client validation tests.
7. Add webhook dist import and single-GitHub-client seam tests.
8. Add shared UI component-family coverage.
9. Replace legacy script vacuous tests with real tests or quarantine the scripts.
