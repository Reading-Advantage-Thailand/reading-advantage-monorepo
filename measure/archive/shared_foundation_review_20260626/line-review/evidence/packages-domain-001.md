# Line Review Evidence: packages-domain-001

Reviewer: measure-review-a
Files assigned: 7
Lines assigned: 1056

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---:|---:|
| packages/domain/eslint.config.mjs | 1-3 | reviewed | 0 |
| packages/domain/package.json | 1-100 | reviewed | 1 |
| packages/domain/src/__tests__/2-school-acceptance.test.ts | 1-162 | reviewed | 1 |
| packages/domain/src/__tests__/articles.test.ts | 1-204 | reviewed | 1 |
| packages/domain/src/__tests__/assignments.test.ts | 1-351 | reviewed | 2 |
| packages/domain/src/__tests__/audit.test.ts | 1-109 | reviewed | 1 |
| packages/domain/src/__tests__/classes.test.ts | 1-127 | reviewed | 1 |

## Findings

### LR-packages-domain-001-001 — package.json devDependency version specifiers are not pinned

- Severity: Low
- File: `packages/domain/package.json:91-98`
- Evidence: Runtime and dev dependencies use caret ranges: `"zod": "^3.25.76"`, `"@types/node": "^20.0.0"`, `"typescript": "^5.8.0"`, `"vitest": "^4.1.8"`. Only `drizzle-orm` is pinned to an exact version.
- Impact: Violates the repository Version Policy (`AGENTS.md`) which requires current stable versions to be pinned in `package.json` and lockfiles. Caret ranges allow unintended minor/patch drift across installs and CI caches.
- Recommendation: Pin all dependency versions to exact versions in this package.json.

### LR-packages-domain-001-002 — 2-school acceptance test verifies Proxy activity but not the injected schoolId condition

- Severity: High
- File: `packages/domain/src/__tests__/2-school-acceptance.test.ts:29-50`, `packages/domain/src/__tests__/2-school-acceptance.test.ts:75-87`
- Evidence: `createMockQueryBuilder` captures the WHERE clause in `state.whereClause`, but its `then()` method ignores the captured clause and resolves the full `results` array. The test titled "tenantDb.select().from() applies schoolId condition via Proxy" only asserts `expect(mockDb.select).toHaveBeenCalled()` and never inspects `state.whereClause` or the resolved value's filtering.
- Impact: This is a vacuous-pass risk (A4). The test passes even if the TenantDB proxy fails to inject the `schoolId` condition, giving false confidence in cross-school isolation.
- Recommendation: Make the mock query builder actually filter on the injected `schoolId` condition, or assert that `state.whereClause` references the correct tenant id before resolving.

### LR-packages-domain-001-003 — listArticles test ignores tenant-scoped WHERE clause

- Severity: Medium
- File: `packages/domain/src/__tests__/articles.test.ts:82-102`
- Evidence: The test wraps the database with `createTenantDB(db, tenant)` but asserts that the `where` mock is called with only the topic and CEFR filters. It does not account for the `schoolId` condition that `createTenantDB` is expected to inject into every scoped query.
- Impact: If tenant scoping is bypassed or broken in `listArticles`, this test still passes because it only verifies the two explicit user filters.
- Recommendation: Update the assertion to include the tenant `schoolId` condition, or verify the query builder received an additional `.where()` call with the injected tenant filter.

### LR-packages-domain-001-004 — cross-tenant assignment tests use wrong-shape mocks that do not exercise the real tenant check

- Severity: High
- File: `packages/domain/src/__tests__/assignments.test.ts:73-81`, `packages/domain/src/__tests__/assignments.test.ts:247-259`, `packages/domain/src/__tests__/assignments.test.ts:291-303`, `packages/domain/src/__tests__/assignments.test.ts:338-350`
- Evidence: `mockClassroomSelect` replaces `db.select` so that every call returns `queryResult([{ schoolId: "s2" }])`. In `updateAssignment`, `deleteAssignment`, and `submitAssignment`, the code first looks up the assignment row; under this mock the assignment lookup itself receives a classroom-shaped row, so the "different tenant" code path is never reached. The tests pass because the wrong-shape result causes an early throw rather than because tenant isolation works.
- Impact: These tests do not prove that cross-tenant assignments are rejected. A regression that removes the tenant check could still pass if the lookup shape happens to mismatch.
- Recommendation: Provide distinct mock return values for the assignment lookup and the classroom/school lookup so the tenant check is evaluated against the correct rows.

### LR-packages-domain-001-005 — submitAssignment success test mocks an unrealistic assignment row shape

- Severity: Medium
- File: `packages/domain/src/__tests__/assignments.test.ts:307-336`
- Evidence: The first mocked `select` call returns `[{ classroomId: "c1" }]`, which does not resemble an assignment or student-assignment row. The test then relies on `updateReturning` to produce the final result without asserting what the update `set` or `where` clauses received.
- Impact: The test does not reflect the real query flow and could mask bugs in how the assignment is identified before the score update.
- Recommendation: Mock a realistic assignment/student-assignment row (including `id`, `studentId`, `assignmentId`) and assert that the update call targets the correct record.

### LR-packages-domain-001-006 — audit nextCursor test does not verify the returned event slice

- Severity: Low
- File: `packages/domain/src/__tests__/audit.test.ts:51-74`
- Evidence: The test creates 51 events and asserts `result.events` has length 50 and `result.nextCursor` is `"e49"`. It does not assert that the returned events are `events.slice(0, 50)`.
- Impact: If `queryAuditEvents` returns the wrong 50 events (for example, events 1-51) while still setting `nextCursor` to `"e49"`, the test passes but pagination is broken.
- Recommendation: Add `expect(result.events).toEqual(events.slice(0, 50))` to ensure the cursor aligns with the returned page.

### LR-packages-domain-001-007 — listClasses tests do not verify teacher or admin scoping filters

- Severity: Medium
- File: `packages/domain/src/__tests__/classes.test.ts:45-127`
- Evidence: Tests for teacher and admin `listClasses` compare the result to the mocked rows and assert `db.select` was called, but no assertion inspects the WHERE clause. The test "filters by teacherId for teacher role" only checks `db.select` was called once.
- Impact: `listClasses` could omit the `teacherId` or `schoolId` filter and still pass these tests, undermining tenant isolation.
- Recommendation: Assert the actual WHERE conditions passed to the query, or use fixtures that would fail without proper role-based scoping.

## No-Finding Notes

- `packages/domain/eslint.config.mjs`: reviewed line-by-line; no findings.
