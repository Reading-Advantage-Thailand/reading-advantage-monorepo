# Shared Foundation Review — Proposed Migration Tracks

> Track: `shared_foundation_review_20260626`  
> Phase: **Phase 3: Domain and API Boundaries**

These tracks are **proposals** for remediation. Each proposal references the findings in `findings.md` and identifies downstream app reviews that are blocked until the issue is resolved.

---

## Track M-DAPI-1: Repair tenant registry and type contract drift

- **Resolves:** F-DAPI-001, F-DAPI-002, F-DAPI-015
- **Severity:** Critical
- **Scope:**
  1. Classify the 9 missing tables in `packages/domain/src/tenant-registry.ts` (verify each has/does-not-have `schoolId`).
  2. Update `userResponseSchema` in `@reading-advantage/types` to include `SALES_REP` and `SALES_ADMIN`.
  3. Fix `salesRoleplayAttempt` output schema nullability (`audioStorageKey`).
  4. Investigate and fix `@reading-advantage/db` check-types lifecycle failure.
- **Acceptance criteria:**
  - `pnpm turbo run test --filter=@reading-advantage/domain` passes.
  - `pnpm turbo run check-types --filter=@reading-advantage/api` passes.
- **Blocked downstream app reviews:**
  - `sales_advantage_full_review_20260626` (user router failures for sales roles)
  - All app reviews relying on tenant isolation guarantees

---

## Track M-DAPI-2: Lift remaining business logic out of API transport

- **Resolves:** F-DAPI-003, F-DAPI-012, F-DAPI-013
- **Severity:** Critical / High
- **Scope:**
  1. Move `reports.teacherDashboard` query into a new `teachers/get-teacher-dashboard.ts` domain function (or extend existing one).
  2. Refactor `mastery/record-run.ts` to return a domain result object; let the caller (route handler) map to HTTP response.
  3. Encapsulate `reviewExercise` AI adapter wiring inside `packages/domain/codecamp` so the router only passes config/context.
  4. Add a lint rule or test that fails on `drizzle-orm` / `@reading-advantage/db/schema` imports in `packages/api/src/routers`.
- **Acceptance criteria:**
  - No router contains Drizzle query builders except through `ctx.tenantDb` passed to domain.
  - `pnpm turbo run lint --filter=@reading-advantage/api` clean.
- **Blocked downstream app reviews:**
  - `reading_advantage_full_review_20260610`
  - `primary_advantage_full_review_20260626`
  - `science_advantage_review_20260626`
  - `codecamp_advantage_review_20260626`

---

## Track M-DAPI-3: Centralize authorization in domain permissions

- **Resolves:** F-DAPI-007, F-DAPI-009
- **Severity:** High
- **Scope:**
  1. Create `permissions.ts` for `classes`, `students`, `ai`, `mastery`, `interventions`, `audit`.
  2. Replace inline `role ===` checks in domain with `assertCan` calls using new permission keys.
  3. Replace `adminProcedure` and `sales.ts` local role middleware with domain permission checks.
  4. Register all new permission keys via `registerDomainModulePermissions`.
- **Acceptance criteria:**
  - `rg "role ===|role !==" packages/domain/src` returns only legitimate non-auth conditionals.
  - `rg "role !==|role ===" packages/api/src/routers` returns zero hits.
- **Blocked downstream app reviews:**
  - All app reviews with role-based admin/teacher flows

---

## Track M-DAPI-4: Share domain contracts with API routers

- **Resolves:** F-DAPI-005, F-DAPI-006
- **Severity:** High
- **Scope:**
  1. Export input schemas from every domain module that lacks them (`classes`, `students`, `codecamp`, `reports`, `stories`, `ai`, `mastery`, `interventions`, `audit`).
  2. Import those schemas in API routers instead of redefining them inline.
  3. Convert domain error throwing to typed error classes (e.g., `UserNotFoundError`) and map routers by `instanceof`.
  4. Add parity tests or type-level checks that keep schemas in sync.
- **Acceptance criteria:**
  - Every tRPC input schema is imported from `@reading-advantage/domain/*`.
  - Router error mapping uses `instanceof` typed errors only.
- **Blocked downstream app reviews:**
  - All app reviews consuming shared tRPC routers

---

## Track M-DAPI-5: Harden null-tenant safety and context tests

- **Resolves:** F-DAPI-004, TG-DAPI-003, TG-DAPI-008
- **Severity:** High
- **Scope:**
  1. Decide fail-closed behavior for `createTenantDB` with null `schoolId`: either throw or return a non-scoping raw-DB brand that cannot be passed to domain functions expecting `TenantDB`.
  2. Update `createContext` so unauthenticated requests receive `tenantDb: null` or a clearly unsafe raw DB, not a branded `TenantDB`.
  3. Expand `packages/api/src/__tests__/context.test.ts` to cover tokenless, valid-token, and error-fallback paths.
- **Acceptance criteria:**
  - No warning about null `schoolId` emitted during normal unauthenticated requests.
  - Public procedures cannot accidentally call domain functions with a scoped DB.
- **Blocked downstream app reviews:**
  - All app reviews with public/authenticated mixed routers

---

## Track M-DAPI-6: Complete domain module decomposition

- **Resolves:** F-DAPI-008
- **Severity:** Medium
- **Scope:**
  1. Decompose `classes`, `students`, `codecamp`, `ai`, `mastery`, `interventions`, `audit` into the standard 7-file structure where applicable.
  2. Move logic from `index.ts` into `queries.ts` / `mutations.ts`.
  3. Add `contracts.ts` and `schema.ts` (re-exporting or wrapping DB schema) to incomplete modules.
- **Acceptance criteria:**
  - All domain module `index.ts` files are pure barrels.
  - `packages/domain/src/**/index.ts` contains no business logic except re-exports.
- **Blocked downstream app reviews:**
  - Less urgent; can proceed in parallel if boundary contracts are stable.

---

## Track M-DAPI-7: Remove env coupling and console logging from domain

- **Resolves:** F-DAPI-010, F-DAPI-011
- **Severity:** Medium
- **Scope:**
  1. Inject model selection config into `sales/roleplay-evaluator.ts` instead of reading `process.env`.
  2. Replace domain `console.warn/error` calls with typed errors or logger injection.
  3. Keep the `null schoolId` warning only in debug/development builds if needed.
- **Acceptance criteria:**
  - `rg "process\.env" packages/domain/src` returns only test fixtures.
  - `rg "console\.(warn|error|log)" packages/domain/src` returns only test files.
- **Blocked downstream app reviews:**
  - `sales_advantage_full_review_20260626`

---

## Recommended execution order

1. **M-DAPI-1** (Critical) — unblock CI gates before any other work.
2. **M-DAPI-5** (High) — closes a cross-tenant data-leak risk.
3. **M-DAPI-2** (Critical/High) — restore domain/API boundary.
4. **M-DAPI-3** and **M-DAPI-4** (High) — can run in parallel.
5. **M-DAPI-6** (Medium) — refactoring hygiene.
6. **M-DAPI-7** (Medium) — observability/config hygiene.
