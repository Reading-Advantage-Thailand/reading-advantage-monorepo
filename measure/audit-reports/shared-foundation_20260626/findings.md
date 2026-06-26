# Shared Foundation Review — Findings

> Track: `shared_foundation_review_20260626`  
> Phase: **Phase 3: Domain and API Boundaries**

Findings are severity-ordered and deduplicated by root cause. Each entry includes file/line evidence where possible.

---

## Critical

### F-DAPI-001 — Tenant registry is stale: 9 exported Drizzle tables are unclassified

- **Severity:** Critical
- **Root cause:** New tables were added to `packages/db/schema` without updating `packages/domain/src/tenant-registry.ts`.
- **Evidence:**
  - `packages/domain/src/__tests__/tenant-coverage.test.ts:55,61,78` fails with:
    - `verificationTokens`, `userRoles`, `roles`, `articleActivityLogs`, `sentencsAndWordsForFlashcards`, `cardReviews`, `clozeTestGames`, `schoolAdmins`, `leaderboards`
- **Impact:** The FR-6 coverage gate fails; any domain code that touches these tables through `TenantDB` will throw "not classified". This blocks the CI test gate for `@reading-advantage/domain`.
- **Blocked downstream:** All app reviews that rely on tenant isolation guarantees.

### F-DAPI-002 — `packages/api` type-check fails due to schema drift

- **Severity:** Critical
- **Root cause:** Output contracts in `@reading-advantage/types` do not match the actual shapes returned by `@reading-advantage/domain`.
- **Evidence:**
  - `packages/api/src/routers/sales.ts:131` — `audioStorageKey: string | null` from domain is not assignable to `audioStorageKey: string` in output schema.
  - `packages/api/src/routers/users.ts:10,24,50,75` — domain returns roles including `SALES_REP`/`SALES_ADMIN`; `userResponseSchema` only accepts `INTERN|STUDENT|TEACHER|ADMIN|SYSTEM`.
- **Impact:** `pnpm turbo run check-types --filter=@reading-advantage/api` exits 2. Any SALES user calling `users.me`/`users.get`/`users.list` would fail output validation at runtime.
- **Blocked downstream:** `sales-advantage` MVP track cannot rely on the shared `users` router until fixed.

### F-DAPI-003 — `reports.teacherDashboard` bypasses the domain layer and queries the DB directly

- **Severity:** Critical
- **Root cause:** Transport adapter contains query/business logic instead of delegating to `packages/domain`.
- **Evidence:**
  - `packages/api/src/routers/reports.ts:2-3` imports `eq` from `drizzle-orm` and `classrooms` from `@reading-advantage/db/schema`.
  - `packages/api/src/routers/reports.ts:36-47` builds and executes the teacher-dashboard query inline.
- **Impact:** Violates the backend-as-code boundary. A new app or worker cannot reuse this logic. Tenant scoping is manually implemented in the router instead of via `TenantDB`.
- **Blocked downstream:** Reading/Primary/Science teacher-dashboard reviews must verify this logic is lifted to domain.

---

## High

### F-DAPI-004 — `createContext` builds a `TenantDB` with `schoolId: null` for unauthenticated requests

- **Severity:** High
- **Root cause:** `createContext` always creates `tenantDb` even when there is no authenticated tenant, and the fallback path at `:82` also uses `schoolId: null`.
- **Evidence:**
  - `packages/api/src/context.ts:71` — `createTenantDB(db, auth?.tenant ?? { schoolId: null })`.
  - `packages/api/src/context.ts:82` — fallback `createTenantDB(db, { schoolId: null })`.
  - `packages/domain/src/db-contract.ts:302-308` — only warns; still returns a `TenantDB` that will not scope FLAT tables.
- **Impact:** Any public procedure or auth-route bug that accidentally passes `tenantDb` to a domain function could query across all schools. The warning is logged but not blocked.
- **Test gap:** `packages/api/src/__tests__/context.test.ts` only tests `roleSchema`; no null-tenant test.

### F-DAPI-005 — API routers redefine input schemas instead of importing domain contracts

- **Severity:** High
- **Root cause:** Domain contracts (`users/contracts.ts`, `articles/contracts.ts`, etc.) exist but are not consumed by API routers.
- **Evidence:**
  - `packages/api/src/routers/users.ts:22-23,41-47,67-73` redefines `id`, `schoolId`, `role`, `limit`, `offset`, `name`, `image` schemas.
  - `packages/api/src/routers/articles.ts:14-19,33-43,51-58` redefines article input schemas.
- **Impact:** Input validation can drift between domain and API. A domain contract change will not automatically update the transport boundary.
- **Blocked downstream:** App reviews cannot assume tRPC inputs match domain contracts.

### F-DAPI-006 — Error mapping in routers relies on fragile string matching

- **Severity:** High
- **Root cause:** Domain errors are not consistently typed/exported; routers map to TRPCError by inspecting `err.message`.
- **Evidence:**
  - `packages/api/src/routers/codecamp.ts:56-61` — long `err.message === ... || err.message.startsWith(...)` chain.
  - `packages/api/src/routers/sales.ts:31-44` — `.includes("not found")` matches any "not found" substring.
  - `packages/domain/src/users/queries.ts:39,76` throws plain `Error("User not found")` despite `UserNotFoundError` being exported.
- **Impact:** Changing an error message in domain can change the HTTP status code returned by tRPC. Risk of accidental `INTERNAL_SERVER_ERROR` for user-facing validation errors.

### F-DAPI-007 — Hardcoded role checks in API layer bypass domain permissions

- **Severity:** High
- **Root cause:** Authorization is implemented with inline role comparisons rather than `assertCan` or domain `permissions.ts`.
- **Evidence:**
  - `packages/api/src/trpc.ts:94` — `adminProcedure` checks `ctx.auth.user.role !== "ADMIN" && ctx.auth.user.role !== "SYSTEM"`.
  - `packages/api/src/routers/sales.ts:50-69` — local `salesRepOrAdmin` / `salesAdminOnly` middleware.
- **Impact:** Permission logic is scattered and cannot be centrally audited. New roles (e.g., `SALES_MANAGER`) require editing transport code.

---

## Medium

### F-DAPI-008 — Domain module decomposition is inconsistent

- **Severity:** Medium
- **Root cause:** Several modules were not fully refactored into the 7-file structure (`schema/contracts/queries/mutations/permissions/errors/index`).
- **Evidence:**
  - `packages/domain/src/classes/index.ts:36-96` defines `createClass` and `listClasses` inline.
  - `packages/domain/src/students/index.ts:34-160` defines `listStudents` and `importRoster` inline.
  - `packages/domain/src/codecamp/*.ts` uses monolithic files (`modules.ts`, `lessons.ts`, `exercises.ts`, etc.) instead of queries/mutations split.
  - `packages/domain/src/ai/get-recommendation.ts`, `packages/domain/src/mastery/record-run.ts`, `packages/domain/src/interventions/list-alerts.ts`, `packages/domain/src/audit/dsar.ts` are single-file modules.
- **Impact:** Harder to locate logic, reuse queries/mutations, and enforce per-module permissions/tests.

### F-DAPI-009 — Many domain functions contain inline `role ===` checks

- **Severity:** Medium
- **Root cause:** Permission logic is embedded in handlers instead of `permissions.ts`.
- **Evidence:**
  - `packages/domain/src/classes/get-class.ts:31`
  - `packages/domain/src/classes/get-class-roster.ts:30,80`
  - `packages/domain/src/classes/index.ts:88`
  - `packages/domain/src/students/index.ts:108-109`
  - `packages/domain/src/students/get-student-class-analytics.ts:26`
  - `packages/domain/src/curriculum/get-lesson-by-slug.ts:28`
  - `packages/domain/src/ai/get-recommendation.ts:265-267`
  - `packages/domain/src/interventions/list-alerts.ts:108-110`
- **Impact:** Authorization rules are not reusable and are easy to bypass or duplicate inconsistently.

### F-DAPI-010 — `sales/roleplay-evaluator.ts` reads `process.env` directly

- **Severity:** Medium
- **Root cause:** Domain code depends on environment variables instead of injected config.
- **Evidence:**
  - `packages/domain/src/sales/roleplay-evaluator.ts:134-139` reads `SALES_AUDIO_EVAL_MODEL`, `SALES_AUDIO_EVAL_FALLBACK_STT_MODEL`, `SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL`.
- **Impact:** Breaks testability and portability; violates provider-neutrality rule for AI model selection.

### F-DAPI-011 — Console logging in domain production code

- **Severity:** Low-Medium
- **Root cause:** Domain functions use `console.warn`/`console.error` instead of returning typed errors or logging through an adapter.
- **Evidence:**
  - `packages/domain/src/db-contract.ts:304-308` warns on null `schoolId`.
  - `packages/domain/src/codecamp/github-issues.ts:24` warns on GitHub API errors.
  - `packages/domain/src/sales/roleplay-evaluator.ts:179,184` errors on fallback failures.
- **Impact:** Pollutes production logs and couples domain to stderr.

### F-DAPI-012 — `mastery/record-run.ts` returns HTTP-shaped response from domain

- **Severity:** Medium
- **Root cause:** Transport concern (`status`, `body`, `headers`) leaks into domain return type.
- **Evidence:**
  - `packages/domain/src/mastery/record-run.ts:115,127,169,241` — returns `{ status, body, headers }`.
- **Impact:** Domain function is not reusable outside an HTTP response path.

### F-DAPI-013 — `codecamp.reviewExercise` wires AI provider in the router

- **Severity:** Medium
- **Root cause:** `getAIClient()` and `aiClientToGenerateReview` are assembled in the transport layer.
- **Evidence:**
  - `packages/api/src/routers/codecamp.ts:456-478` — constructs `generateReview` and passes it into domain.
- **Impact:** Slightly better than direct SDK use, but the router still owns the adapter lifecycle; harder to test and swap providers.

---

## Low

### F-DAPI-014 — Unused imports and lint warnings in `packages/api`

- **Severity:** Low
- **Evidence:**
  - `packages/api/src/routers/sales.ts:8-10` imports `lessonOutputSchema`, `roleplayScenarioOutputSchema`, `rubricOutputSchema` that are never used.
  - `packages/api/src/__tests__/reset-password.test.ts:31` imports unused `requireAuth`, `hashPassword`.
- **Impact:** Noise; no functional impact.

### F-DAPI-015 — `packages/db` check-types fails in dependency chain

- **Severity:** Low (for this phase)
- **Evidence:** `pnpm turbo run check-types` log shows `@reading-advantage/db:check-types: [ELIFECYCLE] Command failed.` (no detailed error in captured output).
- **Impact:** Blocks full dependency-chain type checking; Phase 1 (Database/Tenancy) should investigate root cause.

---

## Findings → Root-cause groups

| Root cause | Findings |
|------------|----------|
| Schema/registry drift | F-DAPI-001, F-DAPI-002, F-DAPI-015 |
| Business logic in transport | F-DAPI-003, F-DAPI-012, F-DAPI-013 |
| Authorization not centralized | F-DAPI-007, F-DAPI-009 |
| Contracts not shared between domain and API | F-DAPI-005, F-DAPI-006 |
| Null-tenant safety gap | F-DAPI-004 |
| Incomplete module decomposition | F-DAPI-008 |
| Env/config coupling in domain | F-DAPI-010, F-DAPI-011 |
