# Line-Review Report: sa-batch-03

**Track:** `science_advantage_review_20260626`
**Date:** 2026-06-27
**Reviewer:** automated code review
**Scope:** 20 files — auth routes, assignment/curriculum/analytics/roster handlers, mastery pipeline

---

## Summary

| Metric | Count |
|--------|-------|
| Files reviewed | 20/20 |
| Total findings | 14 |
| Critical | 3 |
| High | 3 |
| Medium | 5 |
| Low | 3 |
| Info | 0 |

---

## Findings

### F-SA-B03-001 — `update-mastery/route.ts` catch-all maps unknown errors to 202/QUEUED

**File:** `apps/science-advantage/app/api/ai/update-mastery/route.ts`
**Line:** 54
**Severity:** **Critical**

```ts
return NextResponse.json({ success: false, reason: 'QUEUED' }, { status: 202, headers: { 'retry-after': '30' } });
```

The catch block (lines 38–55) handles `RateLimitError`, `ZodError`, and `AuthError` with appropriate status codes, but **all other errors** fall through to this default response with status 202 and `reason: 'QUEUED'`. This means genuine internal failures (TypeError during DB access, JSON parse errors, promise rejections) are swallowed and presented as a queued-async-success to the caller. Downstream code might poll `retry-after` indefinitely, never seeing a real processing result.

**Recommendation:** The final fallback should return 500 with a generic error message. The 202/QUEUED path should only be returned when the route positively determines that processing is in-flight (e.g., the existing-mastery-run-is-PROCESSING case, which is already handled inside `recordRun`).

---

### F-SA-B03-002 — `update-mastery/route.ts` fragile request body cloning

**File:** `apps/science-advantage/app/api/ai/update-mastery/route.ts`
**Lines:** 24, 43–52
**Severity:** **High**

```ts
const requestClone = request.clone();   // line 24
// ...
try {
  const result = await recordRun({ ... request, ... }); // recordRun calls request.json()
  // ...
} catch (error) {
  // ...
  const body = await requestClone.json();  // line 44 — tries to re-read body from clone
  const attemptId = body?.attemptId;
  // ...
}
```

The route clones `request` at line 24 so the catch block can re-read the JSON body for best-effort failure recording. However, `recordRun` (in `packages/domain/src/mastery/record-run.ts` line 152) calls `request.json()` on the **original** request object. If `recordRun` throws **after** consuming `request.json()`, the clone read succeeds. If `recordRun` throws **before** consuming the body (e.g., inside `assertCan` which throws `AuthError`), the clone still works. If a non-JSON parse error happens inside `recordRun` after partial body consumption, the clone read may succeed with the "wrong" body. The coupling between the route's clone strategy and the domain function's body-consumption timing is fragile and undocumented.

**Recommendation:** Either (a) have `recordRun` not consume the body itself but accept a parsed `{ attemptId }` input, or (b) have the route parse the body first and pass the parsed value to `recordRun`. The current pattern is an implicit cross-layer contract that is easy to break.

---

### F-SA-B03-003 — `record-run.ts` in-memory rate limit store is unscalable

**File:** `packages/domain/src/mastery/record-run.ts`
**Line:** 17
**Severity:** **High**

```ts
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
```

The rate limit store is an in-memory `Map`. In multi-process or multi-instance deployments (e.g., multiple Cloud Run instances), each process has its own independent store, making rate limiting ineffective. Additionally, the `Map` never evicts stale entries, causing a slow memory leak under sustained load.

**Recommendation:** Use a shared store (Redis or a database-backed rate limiter) or at minimum a TTL-based eviction scheme. For the scope of this review, if this is short-term infrastructure, document the limitation.

---

### F-SA-B03-004 — `get-class-analytics-overview.ts` duplicated and likely incorrect `averageScorePercentage`

**File:** `packages/domain/src/classes/get-class-analytics-overview.ts`
**Line:** 86
**Severity:** **High**

```ts
averageScore: Math.round(averageScore * 10) / 10,
averageScorePercentage: Math.round(averageScore * 10) / 10,
```

`averageScorePercentage` is computed identically to `averageScore`. The variable `averageScore` is computed on line 79 as the mean of `mostRecentScorePercentage` values (which are already percentages 0–100), so it is already a percentage. The field `averageScorePercentage` is therefore a strict duplicate. API consumers expecting different semantics (e.g., averageScore as raw points, averageScorePercentage as 0–100) will get misleading data.

The integration test at `analytics/overview/route.integration.test.ts` line 264 asserts `data.lessons[0].averageScore === 88.5` but does **not** assert on `averageScorePercentage`, so the duplication is undetected.

**Recommendation:** Remove the redundant `averageScorePercentage` field or, if it is part of a published contract, document the exact semantics. Update the integration test to assert the chosen shape.

---

### F-SA-B03-005 — `get-class-roster.ts` uses `assertCan("class:roster")` but route-level auth check is non-standard

**File:** `packages/domain/src/classes/get-class-roster.ts`
**Lines:** 23, 29–31
**Severity:** **Medium**

```ts
assertCan(user, "class:roster", tenant);   // line 23
// ...
const isTeacherOwner = classRecord.teacherId === user.id;   // line 29
const isAdmin = user.role === "ADMIN";                       // line 30
if (!isTeacherOwner && !isAdmin) throw new Error("Forbidden"); // line 31
```

The function calls `assertCan` with the `class:roster` permission, then immediately performs a secondary manual authorization check (teacher-owner-or-admin). This is redundant with the `assertCan` call if `class:roster` already encodes the same logic. More importantly, the secondary check is a string-match on `error.message === 'Forbidden'` in the route handler (roster/route.ts line 34), which is brittle.

**Recommendation:** Either encode the full authorization policy entirely in `assertCan` (preferred) or remove the `assertCan` call and rely solely on the explicit check. String-matching error messages for control flow is discouraged by AGENTS.md.

---

### F-SA-B03-006 — `get-class-curriculum.ts` string-matches error messages in route handler

**File:** `apps/science-advantage/app/api/classes/[classId]/curriculum/route.ts`
**Lines:** 34–35
**Severity:** **Medium**

```ts
if (error instanceof Error && error.message === 'Class not found') return NextResponse.json({ error: 'Class not found' }, { status: 404 });
if (error instanceof Error && error.message === 'Not enrolled in this class') return NextResponse.json({ error: 'Not enrolled in this class' }, { status: 403 });
```

The route handler relies on comparing `error.message` to specific strings thrown by domain functions. This creates a brittle contract between layers. A refactor of the domain function that changes error message text silently changes HTTP response behavior. The same pattern appears in `analytics/overview/route.ts` (line 34–35), `lesson-analytics/route.ts` (lines 35–37), and `roster/route.ts` (lines 33–34, 67–68).

**Recommendation:** Define proper error classes (e.g., `NotFoundError`, `ForbiddenError`) in a shared errors module and use `instanceof` checks in the route handler. This is already done for `ValidationError` and `AuthError` — the pattern should be extended to domain errors.

---

### F-SA-B03-007 — `create-assignment.ts` does not verify lesson belongs to class curriculum

**File:** `packages/domain/src/classes/create-assignment.ts`
**Lines:** 53–61
**Severity:** **Medium**

```ts
const [lesson] = await tenantDb
  .select({ id: scienceLessons.id })
  .from(scienceLessons)
  .where(eq(scienceLessons.id, lessonId))
  .limit(1);

if (!lesson) {
  return { error: "Lesson not found", status: 404 };
}
```

The function verifies that the lesson **exists** but does **not** verify that the lesson belongs to the class's curriculum (i.e., is linked via `scienceUnitLessons` + `scienceCurriculumUnits`). This means a teacher could assign a lesson from a completely different class or school.

**Recommendation:** Add a check that verifies the lesson is linked to the class's curriculum. Join through `scienceUnitLessons` and `scienceCurriculumUnits` to confirm the association.

---

### F-SA-B03-008 — `list-assignment.ts` returns `{ error, status }` instead of throwing for 404/403

**File:** `packages/domain/src/classes/list-assignment.ts`
**Lines:** 45, 65
**Severity:** **Medium**

```ts
if (!classRecord) {
  return { error: "Class not found", status: 404 };
}
// ...
if (!isTeacherOwner && !isEnrolledStudent) {
  return { error: "Forbidden", status: 403 };
}
```

`listAssignments` returns a result object with `{ error, status }` for non-success cases, while other domain functions in the same `classes/` directory (e.g., `getClassCurriculum`, `getClassRoster`) throw `new Error(...)`. This inconsistency forces the route handler at `assignments/route.ts` line 31 to use `if ('error' in result)` for only this function, while other routes rely on catch-block `instanceof Error` checks. 

**Recommendation:** Standardize the pattern. Either all domain functions throw typed errors (preferred, consistent with AGENTS.md "structured error behavior") or all return result objects. The current mixed approach is confusing.

---

### F-SA-B03-009 — `list-assignment.ts` uses `tenantDb.select()` directly — correctly tenant-scoped

**File:** `packages/domain/src/classes/list-assignment.ts`
**Lines:** 38, 51, 68
**Severity:** **Info** (positive finding)

The function uses `createTenantDB(db, tenant)` and all queries go through the tenant-scoped client. This is correct per the multi-tenancy rules in AGENTS.md ("Every query must be scoped by `schoolId`").

This pattern is consistently applied across all domain functions in this batch.

---

### F-SA-B03-010 — analytics integration test seeds school but does not clean it up

**File:** `apps/science-advantage/app/api/classes/[classId]/analytics/overview/route.integration.test.ts`
**Lines:** 136, 154
**Severity:** **Low**

```ts
await db.insert(schools).values({ id: TEST_SCHOOL_ID, name: 'Test School' }).onConflictDoNothing();
```

The `schools` row is inserted in `beforeEach` with `onConflictDoNothing`, but is **never cleaned up** in `cleanup()`. While `onConflictDoNothing` prevents duplicate-insert errors, the `schools` table accumulates rows over repeated test runs. The same pattern appears in all integration tests in this batch.

**Recommendation:** Add `schools` cleanup to the `cleanup()` function, or at minimum use a unique test-specific school ID. The current `TEST_SCHOOL_ID` (`00000000-0000-0000-0000-000000000099`) is static across all tests, so parallel runs could conflict.

---

### F-SA-B03-011 — Phase 5 test comments claim wrap is "not present" but route already has it

**File:** `apps/science-advantage/app/api/classes/[classId]/assignments/route.test.ts`
**Lines:** 33–37, 196–213
**Severity:** **Medium**

The test file's prologue comment states:

> "Intentionally red at MID handoff: The route handler is not wrapped in `runWithRequestContext` at HEAD"

However, the actual `route.ts` file (lines 19–38) **does** have the `runWithRequestContext` wrapper. This means either:
1. The route has already been modified by a prior task (FR-6 implementation landed), in which case the test should pass (green, not red).
2. The comment is stale and no longer reflects reality.

If (1), the `vi.mock`-ed domain functions in the test throw errors, and the `runWithRequestContext` wrapper is indeed present, the test's first assertion (ctx propagation) should succeed, but the second assertion (`res.status === 500`) will also succeed because the domain mock throws. The test may pass, but the comments are misleading for future reviewers.

The same issue exists in `lesson-analytics/route.test.ts` (lines 32–37) and `update-mastery/route.test.ts` (lines 38–44).

**Recommendation:** Update the prologue comments to reflect the current state of the route handlers. If FR-6 is landed, the "intentionally red" language should be removed.

---

### F-SA-B03-012 — `assignments/route.integration.test.ts` uses `setTimeout(5)` for temporal ordering

**File:** `apps/science-advantage/app/api/classes/[classId]/assignments/route.integration.test.ts`
**Line:** 171
**Severity:** **Low**

```ts
// Force assignmentB.assignedAt to be later than assignmentA's.
await new Promise((r) => setTimeout(r, 5));
```

Using a `setTimeout` of 5ms to guarantee temporal ordering is a flaky test pattern. On a heavily loaded test runner, 5ms may not be sufficient to ensure `assignedAt` timestamps differ. The test at line 231 asserts `first.id === assignmentB.id` (ordered by `assignedAt` desc).

**Recommendation:** Instead of relying on wall-clock timing, set explicit `assignedAt` timestamps in the seed function for deterministic ordering.

---

### F-SA-B03-013 — `reset-password/route.ts` lacks JSDoc

**File:** `apps/science-advantage/app/api/auth/reset-password/route.ts`
**Lines:** 1–17
**Severity:** **Low**

All other auth route handlers in this batch (`login`, `logout`, `session`, `impersonate`) have JSDoc comments. `reset-password` does not. AGENTS.md requires JSDoc for all exported functions.

**Recommendation:** Add a JSDoc comment to the exported `POST` function, consistent with sibling auth route files.

---

### F-SA-B03-014 — `update-mastery/route.ts` re-calls `getCurrentSession()` in catch block unnecessarily

**File:** `apps/science-advantage/app/api/ai/update-mastery/route.ts`
**Line:** 46
**Severity:** **Low**

```ts
const session = await getCurrentSession();
if (attemptId && session?.user?.id) {
  await recordRunFailure({ ... });
}
```

In the catch block, the handler calls `getCurrentSession()` again to obtain the user ID for failure recording. The session is already available from line 26–28 (`session = await getCurrentSession()` in the try block). If the error was thrown before or during `getCurrentSession()`, this call will also fail. If the session was obtained successfully, the variable is already in scope.

**Recommendation:** Use the `session` variable from the try block. Capturing `session.user.id` before the catch block (e.g., in a let variable) would avoid the redundant call and potential for a second failure.

---

## Coverage Summary

| Category | Files | Coverage type | Adequate? |
|----------|-------|---------------|-----------|
| Auth routes (login, logout, session, impersonate, reset-password) | 5 | No route-level tests in batch (tested via shared package tests) | Acceptable — thin delegation handlers |
| update-mastery POST | 3 | Integration + Phase 5 unit test | Yes |
| assignments GET/POST/DELETE | 3 | Integration + Phase 5 unit test | Yes |
| curriculum GET | 2 | Integration test only | Adequate |
| analytics/overview GET | 2 | Integration test only | Adequate |
| lesson-analytics GET | 3 | Integration + Phase 5 unit test | Yes |
| roster GET/DELETE | 2 | Integration test only | Adequate |

---

## Deviations from AGENTS.md Golden Path

| Rule | Status | Files affected |
|------|--------|---------------|
| Business logic in backend modules | ✅ Compliant | All routes delegate to `@reading-advantage/domain/*` |
| `schoolId` scoping on every query | ✅ Compliant | All domain functions use `createTenantDB(db, tenant)` |
| Zod validation at boundaries | ✅ Compliant | Routes use `parseBody`/`parsePath` with Zod schemas |
| Auth from session, not params | ✅ Compliant | All routes use `getCurrentSession()` / `requireAuth()` |
| JSDoc on all exported functions | ⚠️ 1 violation | `reset-password/route.ts` missing JSDoc |
| Structured error behavior | ⚠️ Partial | String-matching error messages — should use typed error classes |
| Command wrapper pattern | ⚠️ Not used | Routes use `runWithRequestContext` but domain functions use free functions, not `command()` wrappers |
| Provider-neutral adapters | ✅ Compliant | No direct SDK calls in reviewed files |

---

## Limitations

1. **No runtime execution.** All findings are based on static analysis of source code. No tests were run to confirm assertions.
2. **Domain function scope.** Some findings (F-SA-B03-003, F-SA-B03-004, F-SA-B03-005) relate to functions in `packages/domain/` that are imported by the reviewed routes, included because they are directly relevant to route correctness.
3. **Phase 5 test state unknown.** The Phase 5 test comments suggest the tests are designed to be red before FR-6 lands. The actual pass/fail status at `HEAD` was not verified.
4. **Cross-batch dependencies.** Some issues (e.g., the error-class standardization in F-SA-B03-006) may be addressed in other batches or tracks.

---

## File-by-File Index

| # | File | Findings |
|---|------|----------|
| 1 | `.../ai/update-mastery/route.integration.test.ts` | F-SA-B03-010 |
| 2 | `.../ai/update-mastery/route.test.ts` | F-SA-B03-011 |
| 3 | `.../ai/update-mastery/route.ts` | F-SA-B03-001, F-SA-B03-002, F-SA-B03-014 |
| 4 | `.../auth/impersonate/route.ts` | — |
| 5 | `.../auth/login/route.ts` | — |
| 6 | `.../auth/logout/route.ts` | — |
| 7 | `.../auth/reset-password/route.ts` | F-SA-B03-013 |
| 8 | `.../auth/session/route.ts` | — |
| 9 | `.../classes/[classId]/analytics/overview/route.integration.test.ts` | F-SA-B03-004, F-SA-B03-010 |
| 10 | `.../classes/[classId]/analytics/overview/route.ts` | F-SA-B03-006 |
| 11 | `.../classes/[classId]/assignments/route.integration.test.ts` | F-SA-B03-010, F-SA-B03-012 |
| 12 | `.../classes/[classId]/assignments/route.test.ts` | F-SA-B03-011 |
| 13 | `.../classes/[classId]/assignments/route.ts` | F-SA-B03-006, F-SA-B03-008 |
| 14 | `.../classes/[classId]/curriculum/route.integration.test.ts` | F-SA-B03-010 |
| 15 | `.../classes/[classId]/curriculum/route.ts` | F-SA-B03-006 |
| 16 | `.../classes/[classId]/lessons/[lessonId]/analytics/route.integration.test.ts` | F-SA-B03-010 |
| 17 | `.../classes/[classId]/lessons/[lessonId]/analytics/route.test.ts` | F-SA-B03-011 |
| 18 | `.../classes/[classId]/lessons/[lessonId]/analytics/route.ts` | F-SA-B03-006 |
| 19 | `.../classes/[classId]/roster/route.integration.test.ts` | F-SA-B03-010 |
| 20 | `.../classes/[classId]/roster/route.ts` | F-SA-B03-005, F-SA-B03-006 |

---

*Report generated by automated line review. No acceptance or closeout claims are made.*
