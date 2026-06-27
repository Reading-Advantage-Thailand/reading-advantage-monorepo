# Line Review: sa-batch-04

**Track:** `science_advantage_review_20260626`  
**Batch:** `sa-batch-04`  
**Reviewer:** DeepSeek V4 Flash  
**Date:** 2026-06-27  
**Scope:** 20 files — API route handlers and integration tests  
**Mode:** Read-only; no app code edited.

---

## Summary

20 files reviewed across 8 route groups. 16 findings: 2 CRITICAL, 2 HIGH, 6 MEDIUM, 6 LOW. The dominant concerns are (a) a likely-broken integration test in the analytics suite that omits `schoolId` in every fixture insert, (b) an analytics route using `requireAuth()` (redirect-based) instead of `getCurrentSession` (JSON-returning), (c) one route handler that bypasses the domain layer entirely, and (d) a systemic test-seed gap where `users.schoolId` is `null`, rendering TenantDB tenant-isolation a no-op under test.

---

## Files Reviewed

| # | File | Lines | Type |
|---|------|-------|------|
| 1 | `apps/science-advantage/app/api/classes/[classId]/route.integration.test.ts` | 428 | Integration test |
| 2 | `apps/science-advantage/app/api/classes/[classId]/route.ts` | 123 | Route handler |
| 3 | `apps/science-advantage/app/api/classes/join/route.integration.test.ts` | 222 | Integration test |
| 4 | `apps/science-advantage/app/api/classes/join/route.ts` | 64 | Route handler |
| 5 | `apps/science-advantage/app/api/classes/route.integration.test.ts` | 363 | Integration test |
| 6 | `apps/science-advantage/app/api/classes/route.ts` | 129 | Route handler |
| 7 | `apps/science-advantage/app/api/lessons/[lessonSlug]/quiz/route.integration.test.ts` | 554 | Integration test |
| 8 | `apps/science-advantage/app/api/lessons/[lessonSlug]/quiz/route.test.ts` | 254 | Unit test |
| 9 | `apps/science-advantage/app/api/lessons/[lessonSlug]/quiz/route.ts` | 80 | Route handler |
| 10 | `apps/science-advantage/app/api/lessons/[lessonSlug]/route.integration.test.ts` | 263 | Integration test |
| 11 | `apps/science-advantage/app/api/lessons/[lessonSlug]/route.ts` | 42 | Route handler |
| 12 | `apps/science-advantage/app/api/student/classes/route.integration.test.ts` | 133 | Integration test |
| 13 | `apps/science-advantage/app/api/student/classes/route.ts` | 57 | Route handler |
| 14 | `apps/science-advantage/app/api/students/[studentId]/achievements/route.integration.test.ts` | 209 | Integration test |
| 15 | `apps/science-advantage/app/api/students/[studentId]/achievements/route.ts` | 39 | Route handler |
| 16 | `apps/science-advantage/app/api/students/[studentId]/assignments/route.integration.test.ts` | 343 | Integration test |
| 17 | `apps/science-advantage/app/api/students/[studentId]/assignments/route.ts` | 39 | Route handler |
| 18 | `apps/science-advantage/app/api/students/[studentId]/classes/[classId]/analytics/route.integration.test.ts` | 309 | Integration test |
| 19 | `apps/science-advantage/app/api/students/[studentId]/classes/[classId]/analytics/route.ts` | 44 | Route handler |
| 20 | `apps/science-advantage/app/api/students/[studentId]/gamification-profile/route.integration.test.ts` | 221 | Integration test |

---

## Findings

### F-SA-B04-001 — CRITICAL — Analytics test `seedScenario` omits `schoolId` on all fixture inserts

**Files:** `route.integration.test.ts` (file 18), lines 80–166

**Severity:** CRITICAL — test will fail at runtime with NOT NULL violations.

The `seedScenario` helper (defined at line 74 and called in every test within the suite) inserts rows into `scienceClasses`, `scienceStandards`, `scienceLessons`, `scienceCurriculumUnits`, and `scienceQuizQuestions` **without** a `schoolId` value. The Drizzle schemas for all these tables define `schoolId` as:

```ts
schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
```

`.notNull()` with **no `.default()`** means every `db.insert(...).values(...)` call that omits `schoolId` will throw a PostgreSQL NOT NULL violation. Additionally the test file does not import the `schools` table, so no school record is ever seeded (every table above has a FK referencing `schools.id`).

**Specific locations:**
- Line 86: `scienceClasses` insert — missing `schoolId`
- Line 99: `scienceCurriculumUnits` insert — missing `schoolId`
- Line 117: `scienceLessons` insert (lesson1) — missing `schoolId`
- Line 129: `scienceLessons` insert (lesson2) — missing `schoolId`
- Line 144: `scienceStandards` insert — missing `schoolId`
- Line 153: `scienceQuizQuestions` insert — missing `schoolId`

**Recommendation:** Add `schoolId: TEST_SCHOOL_ID` to every insert values object and seed the school (like all other integration tests in this batch do). Import `schools` from `@reading-advantage/db/schema`.

---

### F-SA-B04-002 — CRITICAL — Analytics route uses `requireAuth()` which redirects instead of returning JSON 401

**File:** `route.ts` (file 19), line 25

**Severity:** CRITICAL — API consumers (mobile, SPA, third-party) will receive an HTML redirect response instead of a JSON error.

```ts
const session = await requireAuth();
```

`requireAuth()` (defined in `lib/auth/server.ts`) calls `redirect('/signin')` when no session is found. This is a Next.js navigation redirect that returns a 307/308 HTML response. Every other route in this batch uses `getCurrentSession()` and returns `NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })`.

**Additional consequence:** The catch block at line 33 handles `AuthError` from `@reading-advantage/auth`, but `requireAuth()` does not throw `AuthError` — it calls `redirect()`. The catch block is dead code for the unauthenticated case.

**Recommendation:** Replace `requireAuth()` with the same `getCurrentSession()` + manual 401 response pattern used by all sibling routes.

---

### F-SA-B04-003 — HIGH — Student classes route bypasses domain layer

**File:** `route.ts` (file 13), line 8

```ts
import { getStudentEnrolledClasses } from '@/lib/services/classes/get-student-classes';
```

**Severity:** HIGH — violates AGENTS.md "business logic in `@reading-advantage/domain`" golden path.

The handler calls `getStudentEnrolledClasses` directly from `lib/services` (not from `@reading-advantage/domain`). The called function (`lib/services/classes/get-student-classes.ts`) uses the raw `db` without any tenant scoping via `createTenantDB`. There is no `schoolId` filter, no `TenantDB` proxy, and no owner-FK join through `users.schoolId`. The only protection is the route-level `assertCan(session.user, 'student:read:own')`, which gates on role but does not scope the query to a school.

**Recommendation:** Move the data-access logic into a domain function in `@reading-advantage/domain/students` that accepts `{ user, tenant, input }` and uses `createTenantDB`. The route should delegate to it.

---

### F-SA-B04-004 — HIGH — Test users seeded without `schoolId` → TenantDB tenant isolation is a no-op in tests

**Files:** All integration test files in this batch

**Severity:** HIGH — tests provide false confidence in tenant isolation.

Every test file's `seedUser` inserts a user row without setting `users.schoolId`. Because `users.schoolId` is nullable (no `.notNull()`), the column defaults to `NULL`. At session creation time, `validateSession` reads `users.schoolId` and returns it as `session.user.schoolId = null`. Route handlers then call domain functions with `tenant: { schoolId: session.user.schoolId }` = `tenant: { schoolId: null }`.

In `createTenantDB`, when `tenant.schoolId` is null (line 302–308 of `db-contract.ts`):
```ts
if (!tenant.schoolId) {
  console.warn("[TenantDB] Created with null/undefined schoolId — ... query across ALL schools.");
}
```

No `schoolId` filter is injected. Every query through `tenantDb` operates across all schools. Tests still pass because all test data shares the same `schoolId` constant, but cross-tenant leakage bugs would not be caught.

**Recommendation:** Seed `schoolId` on test users (e.g., `schoolId: TEST_SCHOOL_ID`). This will make TenantDB correctly scope queries under test and catch real tenant-isolation bugs.

---

### F-SA-B04-005 — MEDIUM — Quiz POST handler ignores `lessonSlug` path parameter

**File:** `route.ts` (file 9), line 62

```ts
void context;
```

**Severity:** MEDIUM — the `lessonSlug` from the URL path is discarded. The `submitAttempt` domain function receives the attempt and lesson identifiers from the request body (via `body.attemptId`), not from the route parameter. This means a request to `/api/lessons/ANY_SLUG/quiz` with a valid `attemptId` from a different lesson would pass Next.js routing but the slug validation is never exercised.

**Recommendation:** Either validate that `context.params.lessonSlug` matches the lesson the attempt belongs to (cross-reference in the domain function), or remove the path parameter and use a flatter route. At minimum, document why the parameter is intentionally ignored.

---

### F-SA-B04-006 — MEDIUM — Analytics test cleanup uses fragile raw SQL by description

**File:** `route.integration.test.ts` (file 18), lines 47–49

```ts
await db.execute(
  sql`DELETE FROM science_standards WHERE description = 'SC analytics standard'`
);
```

**Severity:** MEDIUM — brittle cleanup strategy.

Deleting by a hardcoded description string will:
- Miss rows if the description is edited or slightly different.
- Delete unintended rows from other tests if they happen to share the same description string.
- Not clean up other related data (lesson_standards junction entries).

Every other test file in this batch uses a `TEST_PREFIX`-based LIKE pattern on user IDs, which is scoped and unlikely to collide.

**Recommendation:** Use a `LIKE` pattern on the `code` column (which includes `TEST_PREFIX`), or track the seeded record IDs in a `Set` and delete by ID in `afterEach`.

---

### F-SA-B04-007 — MEDIUM — Achievements test uses fragile `vi.doMock`/`vi.doUnmock` for `DEV_AUTH_ENABLED`

**File:** `route.integration.test.ts` (file 14), lines 174–208

```ts
vi.resetModules();
vi.doMock('@/lib/env', () => ({ env: { ... DEV_AUTH_ENABLED: true } }));
const { GET: GETDev } = await import('./route');
// ... test body ...
vi.doUnmock('@/lib/env');
vi.resetModules();
```

**Severity:** MEDIUM — the `vi.doMock`/`doUnmock`/`resetModules` dance is fragile and can interfere with other tests in the same file via module cache side effects. The test also calls `vi.resetModules()` twice (lines 176 and 207), which may have unexpected interactions with Vitest's hoisted mock system.

**Recommendation:** Inline the DEV_AUTH test into a separate test file, or restructure the env mock into a top-level `vi.mock` that is configured per-test via a setter function or environment variable override. Avoid runtime dynamic `vi.doMock` in integration tests.

---

### F-SA-B04-008 — MEDIUM — Response shape inconsistency across routes

**Files:** Multiple route handlers

**Severity:** MEDIUM — API consumers must handle two different error/response shapes.

Some routes return `{ success: false, error: '...' }` while others return `{ error: '...' }` without `success`. Specifically:

| Route | Error shape | Success shape |
|-------|------------|---------------|
| `GET /api/classes/[classId]` | `{ success: false, error }` | `{ success: true, data }` |
| `GET /api/lessons/[lessonSlug]` | `{ error }` (no `success`) | Raw result object |
| `GET /api/lessons/[lessonSlug]/quiz` | `{ error }` | `{ quizId, questions }` (no `success`) |
| `GET /api/student/classes` | `{ error }` | `{ classes }` (no `success`) |

All routes should agree on a common envelope. The domain layer already returns `{ success, data }` for many operations but the route handlers strip or transform it inconsistently.

**Recommendation:** Normalize all API responses to `{ success: boolean, data?: ..., error?: ... }` or adopt a consistent envelope. Document in the Zod contract.

---

### F-SA-B04-009 — MEDIUM — Quiz route error responses omit `success: false`

**File:** `route.ts` (file 9), lines 33, 42, 64, 74, 77

**Severity:** MEDIUM — API consumers cannot distinguish successful data from error objects without string-checking the response.

All error returns use `NextResponse.json({ error: '...' })` without `success: false`. Compare with other routes in the batch (e.g., achievements, assignments) that consistently use `{ success: false, error: '...' }`.

---

### F-SA-B04-010 — LOW — Error handling via string matching on `error.message` is fragile

**Files:** `route.ts` (file 2), lines 79–83; `route.ts` (file 19), lines 34–38

```ts
if (error instanceof Error) {
  if (error.message === 'Class not found') return ...
  if (error.message === 'Forbidden') return ...
  if (error.message === 'No valid fields to update') return ...
}
```

**Severity:** LOW — string matching couples the API layer to the exact wording of domain error messages. If the domain changes an error message (e.g., "Forbidden" → "Access denied"), the route handler silently falls through to a 500 response.

**Recommendation:** Define typed error classes in the domain package (e.g., `NotFoundError`, `ForbiddenError`) and use `instanceof` checks. This also aligns with AGENTS.md "structured error behavior" requirement.

---

### F-SA-B04-011 — LOW — Hardcoded `TEST_SCHOOL_ID` UUID constant duplicated across tests

**Files:** All integration test files

```ts
const TEST_SCHOOL_ID = '00000000-0000-0000-0000-000000000099';
```

**Severity:** LOW — duplication, not a correctness issue. 9 of 10 integration test files define this constant identically.

**Recommendation:** Export `TEST_SCHOOL_ID` from a shared test helper package or `@reading-advantage/db/test-utils` to reduce duplication and ensure consistency.

---

### F-SA-B04-012 — LOW — Join route catches PG-specific error code `23505`

**File:** `route.ts` (file 4), line 56

```ts
if (error && typeof error === 'object' && 'code' in error && (error as any).code === '23505') {
```

**Severity:** LOW — Postgres-specific error code leaks through the adapter boundary. The domain layer in `join-class.ts` already wraps unique violations in `AlreadyEnrollRor` (line 68), making this catch redundant for the primary path. It serves as a belt-and-suspenders guard.

**Recommendation:** Remove the Postgres error code check from the route handler since the domain layer already handles it. If retained, move it into the domain layer's `isUniqueViolation` helper.

---

### F-SA-B04-013 — LOW — `setRequestContextUserId` called inconsistently across route handlers

**Files:** `route.ts` (file 9, quiz), lines 34 and 65

**Severity:** LOW — observability inconsistency.

Only the quiz route calls `setRequestContextUserId(session.user.id)` after getting the session. All other routes do not set the user ID on the request context, so structured log lines from those handlers will lack a `userId` field. The logger conditionally includes `userId` only when `ctx.userId !== undefined`.

**Recommendation:** Set `setRequestContextUserId` in every route handler, or move the call into a shared `getCurrentSession` wrapper so it fires automatically.

---

### F-SA-B04-014 — LOW — `joinClass` domain function uses raw DB for cross-school code lookup

**File:** `route.ts` (file 4) → domain: `join-class.ts`, line 47

```ts
const [classRow] = await db.select(...) // raw db, not tenantDb
```

**Severity:** LOW — by design (per the inline comment), but notable.

The comment on line 46–47 explains: "Use raw db (not tenantDb) so join-code lookup works across schools. The join-code model permits cross-school enrollment." This is an intentional design choice, but it means the domain function bypasses TenantDB isolation for the first query. This is worth documenting as a known architectural decision; the subsequent insert into `scienceClassStudents` goes through `db.transaction` and uses the raw `tx` (not TenantDB), so `schoolId` is explicitly set.

**Recommendation:** At minimum, add a JSDoc `@remark` noting that cross-school enrollment is an intentional feature and that the raw DB bypass is deliberate.

---

### F-SA-B04-015 — LOW — Analytics test uses bare `Request` instead of `NextRequest`

**File:** `route.integration.test.ts` (file 18), lines 193, 209, 220, 268, 304

```ts
const res = await GET(new Request('http://localhost'), { params: {...} });
```

**Severity:** LOW — `NextRequest` extends `Request` so the handler accepts both, but the inconsistency with the rest of the batch (which uses `new NextRequest(...)`) may cause confusion.

The request URL also lacks a port (`'http://localhost'` vs `'http://localhost:3000/api/...'` used in other tests).

**Recommendation:** Use `new NextRequest(...)` for consistency and include the full route path in the URL for realistic request construction.

---

### F-SA-B04-016 — LOW — Gamification-profile test mocks `@/lib/env` but other tests do not

**File:** `route.integration.test.ts` (file 20), lines 28–35

```ts
vi.mock('@/lib/env', () => ({
  env: { DATABASE_URL: '...', NODE_ENV: 'test', ... }
}));
```

**Severity:** LOW — the mock is present only in the gamification-profile and achievements tests but absent from other integration tests. If test execution order or module hoisting ever causes cross-file contamination, this inconsistency could produce flakes.

**Recommendation:** Either add the mock to all integration tests that use `@/lib/env` transitively, or remove it if the fallback behavior is acceptable.

---

## Positive Observations

- **TenantDB adoption:** Most domain functions correctly use `createTenantDB` and `assertCan`, following the golden-path pattern.
- **Zod boundaries:** All route handlers validate input at the boundary using `parseBody`/`parsePath`. No external input enters the system unvalidated.
- **Clean session pattern:** Most routes use `getCurrentSession()` with consistent 401/403 return patterns.
- **Integration test quality:** Test coverage is generally thorough — auth failure, permission denial, data existence, boundary values, and happy paths are covered.
- **Observability wrap:** All route handlers are wrapped in `runWithRequestContext`, ensuring structured logging context is available on every request path.
- **Cleanup hygiene:** All integration tests clean up after themselves using `beforeEach`/`afterEach` with scoped DELETE patterns (except the analytics test noted above).

---

## Limitations

- **No runtime execution:** Findings are based on static analysis only. Some issues flagged as "test will fail" (e.g., F-SA-B04-001) depend on whether the test suite actually exercises these code paths or whether they are skipped.
- **Domain layer not fully reviewed:** Domain functions called by these routes were consulted for understanding but were not the primary review target. Findings about domain-layer patterns (F-SA-B04-003, F-SA-B04-014) are scoped to their interface with these route handlers.
- **`session.user.schoolId` source:** The finding that `users.schoolId` defaults to `null` in test seeds presumes that no global test setup script sets it. If such a script exists outside this batch's scope, F-SA-B04-004 may be partially mitigated.
- **No CI/logs consulted:** Findings do not incorporate CI run logs or past test failures. A test that structurally appears broken (F-SA-B04-001) may pass if there is a runtime default or schema migration we did not detect.

---

## Unreviewed (out of scope)

- `route.ts` file for gamification-profile (file 20 is the test only; the route handler was consulted but was not in the batch list)
- `lib/services/classes/get-student-classes.ts` — referenced by file 13 but not in batch
- `@reading-advantage/domain/students/*` — referenced domain functions
- `@reading-advantage/domain/classes/*` — referenced domain functions
- `lib/observability/context.ts` — reviewed for understanding only
- `lib/auth/server.ts` — reviewed for understanding only
- `packages/db/src/schema/*` — reviewed for understanding only

---

## File-by-File Checklist

| # | File | Findings | Status |
|---|------|----------|--------|
| 1 | `classes/[classId]/route.integration.test.ts` | Minor: B04-004, B04-011 | ✅ |
| 2 | `classes/[classId]/route.ts` | B04-010 (string error matching) | ✅ |
| 3 | `classes/join/route.integration.test.ts` | B04-004, B04-011 | ✅ |
| 4 | `classes/join/route.ts` | B04-012 (PG code leak) | ✅ |
| 5 | `classes/route.integration.test.ts` | B04-004, B04-011 | ✅ |
| 6 | `classes/route.ts` | B04-010 (string matching) | ✅ |
| 7 | `lessons/[lessonSlug]/quiz/route.integration.test.ts` | B04-004 | ✅ |
| 8 | `lessons/[lessonSlug]/quiz/route.test.ts` | No findings | ✅ |
| 9 | `lessons/[lessonSlug]/quiz/route.ts` | B04-005 (void context), B04-009 (missing success field), B04-013 (inconsistent userId) | ✅ |
| 10 | `lessons/[lessonSlug]/route.integration.test.ts` | B04-004 | ✅ |
| 11 | `lessons/[lessonSlug]/route.ts` | B04-008 (response shape) | ✅ |
| 12 | `student/classes/route.integration.test.ts` | B04-004, B04-011 | ✅ |
| 13 | `student/classes/route.ts` | B04-003 (bypasses domain layer) | ✅ |
| 14 | `students/[studentId]/achievements/route.integration.test.ts` | B04-004, B04-007 (fragile doMock) | ✅ |
| 15 | `students/[studentId]/achievements/route.ts` | No findings | ✅ |
| 16 | `students/[studentId]/assignments/route.integration.test.ts` | B04-004, B04-011 | ✅ |
| 17 | `students/[studentId]/assignments/route.ts` | No findings | ✅ |
| 18 | `students/[studentId]/classes/[classId]/analytics/route.integration.test.ts` | B04-001 (CRITICAL: missing schoolId), B04-006 (SQL cleanup), B04-015 (bare Request) | ❌ |
| 19 | `students/[studentId]/classes/[classId]/analytics/route.ts` | B04-002 (CRITICAL: requireAuth), B04-008 (response shape), B04-010 (string matching) | ❌ |
| 20 | `students/[studentId]/gamification-profile/route.integration.test.ts` | B04-004, B04-016 (env mock) | ✅ |

---

## Finding ID Index

| ID | Severity | Short Title |
|----|----------|-------------|
| F-SA-B04-001 | CRITICAL | Analytics test seedScenario missing schoolId |
| F-SA-B04-002 | CRITICAL | Analytics route uses redirect-based auth |
| F-SA-B04-003 | HIGH | Student classes route bypasses domain layer |
| F-SA-B04-004 | HIGH | Test users seeded without schoolId (TenantDB no-op) |
| F-SA-B04-005 | MEDIUM | Quiz POST ignores lessonSlug path param |
| F-SA-B04-006 | MEDIUM | Analytics test cleanup uses fragile raw SQL |
| F-SA-B04-007 | MEDIUM | Achievements test uses fragile doMock |
| F-SA-B04-008 | MEDIUM | Response shape inconsistency across routes |
| F-SA-B04-009 | MEDIUM | Quiz route error responses omit success field |
| F-SA-B04-010 | LOW | Error handling via string matching on message |
| F-SA-B04-011 | LOW | TEST_SCHOOL_ID UUID duplicated across 9 files |
| F-SA-B04-012 | LOW | PG error code 23505 in join route handler |
| F-SA-B04-013 | LOW | setRequestContextUserId called inconsistently |
| F-SA-B04-014 | LOW | joinClass uses raw DB (by design, documented) |
| F-SA-B04-015 | LOW | Analytics test uses bare Request not NextRequest |
| F-SA-B04-016 | LOW | @/lib/env mock only in 2 of 10 test files |

---

*End of report. 20 of 20 files reviewed. No acceptance or closeout claims made.*
