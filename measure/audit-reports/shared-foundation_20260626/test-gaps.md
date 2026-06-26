# Shared Foundation Review — Test Gaps

> Track: `shared_foundation_review_20260626`  
> Phase: **Phase 3: Domain and API Boundaries**

This file lists missing or shallow tests that allowed the findings in `findings.md` to exist undetected.

---

## Vacuous-pass / shallow tests

### TG-DAPI-001 — Tenant-coverage test is a build gate, not a behavioral test

- **Finding:** `tenant-coverage.test.ts` correctly fails when the registry is stale, but it does not prove that `TenantDB` actually injects `schoolId` at runtime. It only checks static registration.
- **Risk:** A table could be registered as FLAT but `createTenantDB` could still fail to scope it (e.g., due to a proxy bug).
- **Recommendation:** Add SQL-level integration tests that execute `tenantDb.select().from(table)` against a real Postgres instance and assert the generated SQL contains the tenant condition.

### TG-DAPI-002 — API router tests mock the DB and do not verify tenant scoping

- **Finding:** Tests such as `packages/api/src/__tests__/users.test.ts` mock `@reading-advantage/db/schema` and pass a mocked `tenantDb`. They verify procedure wiring, not actual tenant isolation.
- **Risk:** A router that accidentally uses raw `ctx.db` instead of `ctx.tenantDb` would still pass.
- **Recommendation:** Add at least one API-level integration test per router that uses a real `TenantDB` and asserts cross-tenant reads are blocked.

### TG-DAPI-003 — `context.test.ts` only validates `roleSchema`

- **Finding:** `packages/api/src/__tests__/context.test.ts` has 2 tests, both for the role enum schema.
- **Risk:** `createContext` can return a `tenantDb` with `schoolId: null` for unauthenticated requests; no test fails on this.
- **Recommendation:** Add tests for:
  - `createContext()` with no token returns `auth: null` and `tenantDb` that rejects FLAT-table queries or is identical to raw `db`.
  - `createContext()` with valid token scopes `tenantDb` to the session's `schoolId`.
  - `createContext()` fallback path does not silently continue with tenant scoping enabled.

---

## Missing tests for anti-patterns

### TG-DAPI-004 — No test that domain functions reject cross-tenant access

- **Finding:** No adversarial test attempts to call `getUser`, `listUsers`, `listClasses`, etc. with a user whose `schoolId` differs from the target record.
- **Risk:** Regression in tenant isolation when code paths are refactored.
- **Recommendation:** Port the `2-school-acceptance.test.ts` pattern to each FLAT-table domain module.

### TG-DAPI-005 — No test for error-message stability

- **Finding:** Routers map domain errors to TRPCError by string matching (`err.message === "..."`). There is no test that asserts the exact message remains stable.
- **Risk:** Refactoring domain error text changes HTTP status codes.
- **Recommendation:** Replace string matching with typed error classes and add contract tests that verify each typed error maps to the expected tRPC code.

### TG-DAPI-006 — No test that API routers use domain contracts

- **Finding:** No test asserts that the Zod input schema of a router matches the domain contract schema.
- **Risk:** Input validation drifts between domain and API.
- **Recommendation:** Either import domain contracts into routers (preferred) or add snapshot/parity tests comparing router input schemas to domain contracts.

### TG-DAPI-007 — No test for `reports.teacherDashboard` using domain

- **Finding:** `packages/api/src/__tests__/reports.test.ts` tests the current inline query but does not fail if the logic lives in the router.
- **Risk:** The boundary violation is encoded as passing tests.
- **Recommendation:** Rewrite tests to assert the endpoint delegates to a domain function; add a lint rule forbidding `drizzle-orm` / `@reading-advantage/db/schema` imports in `packages/api/src/routers`.

### TG-DAPI-008 — No test for null-tenant `tenantDb` safety

- **Finding:** `createTenantDB(db, { schoolId: null })` only warns. No test verifies that a null-tenant DB cannot be used to read cross-school data.
- **Risk:** A missing auth check in a router could expose all schools' data.
- **Recommendation:** Add a fail-closed test: `createTenantDB(db, { schoolId: null }).select().from(users)` should throw or return no rows.

### TG-DAPI-009 — No test for `sales` roleplay evaluator env coupling

- **Finding:** `roleplay-evaluator.ts` selects models via `process.env`. No test verifies the fallback chain or injects a config object.
- **Risk:** Production model selection is untested.
- **Recommendation:** Refactor to accept a config object and add unit tests for primary/fallback model resolution.

---

## A3 / A4 / A5 anti-pattern checks

| Anti-pattern | Check | Result |
|--------------|-------|--------|
| A3 digit-only count | No digit-only assertions found in domain/api tests | ✅ Pass |
| A4 vacuous pass on nothing-done | No "markers consistent" style checks in this track | ✅ Pass |
| A5 false claim text vs test reality | `plan.md` tasks are marked `[b]` deferred; no false "all checks pass" claims | ✅ Pass |

---

## Recommended test additions (priority order)

1. Fix and extend `tenant-coverage.test.ts` to cover the 9 unclassified tables (Critical).
2. Add SQL-level `TenantDB` integration tests for select/update/delete/insert scoping (High).
3. Add API-level integration tests that verify cross-tenant isolation for each router (High).
4. Expand `context.test.ts` to cover null-tenant and valid-tenant behavior (High).
5. Add contract parity tests between domain Zod schemas and router input schemas (Medium).
6. Replace error-string tests with typed error class tests (Medium).
7. Add lint/test rule preventing direct `drizzle-orm`/`@reading-advantage/db/schema` imports in routers (Medium).
