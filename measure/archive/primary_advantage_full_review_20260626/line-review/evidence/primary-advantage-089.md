# Line Review Evidence: primary-advantage-089

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-089
Files assigned: 4
Lines assigned: 1150

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/server/controllers/articleController.ts` | 1-297 | reviewed | 1 |
| `apps/primary-advantage/server/controllers/assignmentController.ts` | 1-398 | reviewed | 2 |
| `apps/primary-advantage/server/controllers/classroomController.ts` | 1-415 | reviewed | 2 |
| `apps/primary-advantage/server/controllers/schoolController.ts` | 1-40 | reviewed | 1 |

## Findings

### LR-primary-advantage-089-001 — Classroom role checks use inconsistent string casing, blocking legitimate teachers/system

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/classroomController.ts:232`
- Evidence: `enrollStudentController` (line 232), `unenrollStudentController` (line 282), and `getAvailableStudentsController` (line 336) gate access with uppercase role strings `user.role !== "TEACHER" && user.role !== "SYSTEM"`. Meanwhile `fetchStudentsByRole` (lines 188–201) switches on lowercase `"system"`, `"admin"`, `"teacher"`, and `generateClassCodeController` (line 384) compares against lowercase `"user"`/`"student"`. The same controller file therefore uses two different role vocabularies. If the canonical role value is lowercase (as the majority of this file and the session layer assume), the uppercase comparisons can never be true and every teacher/system caller is rejected with 403; if uppercase is canonical, the lowercase branches misroute. Either way the casing is internally contradictory.
- Impact: Enroll/unenroll/available-student endpoints are either fully broken (always 403) or silently bypass intended role gating, depending on the true canonical role casing. Authorization correctness cannot be guaranteed.
- Recommendation: In a remediation track, normalize role comparisons to a single source-of-truth enum/helper and add a unit test asserting teacher/system access for these three handlers.

### LR-primary-advantage-089-002 — Classroom ownership/tenant scoping never enforced (teacherId always undefined; enroll ignores it)

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/classroomController.ts:250`
- Evidence: The ownership guard `const teacherId = user.role === "teacher" ? user.id : undefined;` appears at lines 65, 250, 300, and 346 using lowercase `"teacher"`, but the surrounding handlers already gated on uppercase `"TEACHER"` (lines 232, 282, 336), so `teacherId` resolves to `undefined` for every caller that passes the gate. Worse, `enrollStudentController` calls `enrollStudentInClassroom(studentId, classroomId)` (line 252) without passing `teacherId` at all, so the computed ownership value is discarded. No `schoolId` scoping is applied anywhere; `classroomId` and `studentId` are taken directly from the request body.
- Impact: A teacher (or any caller who clears the role gate) can enroll/unenroll students into classrooms they do not own and across tenants, because ownership and `schoolId` are never verified at the controller boundary. This violates the multi-tenancy requirement in AGENTS.md (every query scoped by `schoolId`, never trust frontend tenant IDs).
- Recommendation: Pass and enforce `teacherId`/`schoolId` into the model layer for enroll/unenroll, verify classroom ownership, and add tenant-scoping tests.

### LR-primary-advantage-089-003 — Assignment endpoints lack authentication and tenant scoping; trust frontend classroomId

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/controllers/assignmentController.ts:26`
- Evidence: `fetchAssignments` (line 26) and `postAssignment` (line 236) perform no `currentUser()` authentication and no authorization check. Both read `classroomId`/`articleId` straight from the request (lines 29–30, 238) and query/create assignments with no `schoolId` filter (e.g. queries at lines 47–71 and 124–148 join only on the supplied `classroomId`). Any unauthenticated caller can enumerate assignments for an arbitrary `classroomId` or create assignments in any classroom.
- Impact: Cross-tenant data disclosure and unauthorized assignment creation. Violates multi-tenancy and auth-boundary requirements. The pattern mirrors copied Reading Advantage controller flows, so it is likely a shared root cause rather than a fork-only defect.
- Recommendation: Add `currentUser()` auth, role authorization, and `schoolId`-scoped queries to both handlers; add negative-path tests asserting 401/403 and tenant isolation.

### LR-primary-advantage-089-004 — Stray debug log left in production path

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/controllers/assignmentController.ts:38`
- Evidence: `console.log("Do we get here?");` is a leftover debugging statement in the `fetchAssignments` request path. AGENTS.md requires structured logging and discourages free-form console logging in production code.
- Impact: Log noise and a small information/maintenance smell in a request-handling hot path.
- Recommendation: Remove the debug statement (and prefer structured logging for any retained diagnostics).

### LR-primary-advantage-089-005 — Article generation/delete/publish lack authorization (and carry dead code)

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/controllers/articleController.ts:153`
- Evidence: `deleteArticleById` (line 153), `fetchArticles` (line 100), and `fetchArticleById` (line 120) perform no authentication or authorization. `generateAllArticle`/`generateAllArticleNew` (lines 29, 56) are expensive AI generation entry points with no auth. `saveArticleAndPublish` (line 224) authenticates but performs no role/authorization check before publishing content. The file also carries dead/unused code: unused locals `totalArticles`/`articles`/`completedArticles` (lines 39–41, 65–67) and a commented-out block at lines 130–151.
- Impact: Destructive (delete) and content-publishing operations are reachable without role enforcement; uncontrolled invocation of AI generation could be abused for cost/abuse. Dead code reduces maintainability. The shape matches inherited Reading Advantage controllers, so treat as shared root cause pending fork comparison.
- Recommendation: Add role-based authorization to delete/publish/generate handlers and remove dead code in a cleanup track; add authz tests.

### LR-primary-advantage-089-006 — School leaderboard accepts caller-supplied schoolId/userId without ownership verification

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/controllers/schoolController.ts:21`
- Evidence: `getSchoolLeaderboardController(schoolId?, userId?)` (lines 21–39) forwards caller-supplied `schoolId` and `userId` directly to `getSchoolLeaderboardModel` with no `currentUser()` check and no verification that the caller belongs to the requested school. `updateSchoolRankingController` (lines 6–19) likewise has no auth gate.
- Impact: Potential cross-tenant leaderboard disclosure if the route handler does not enforce scoping; ranking-update entry point is unauthenticated at the controller layer. Trusting a frontend-supplied tenant ID violates the multi-tenancy rule.
- Recommendation: Resolve `schoolId` from the authenticated session/tenant rather than parameters, or verify membership before querying; add tenant-isolation tests.

## No-Finding Notes

All four assigned files were read line-by-line in full (articleController.ts 1-297, assignmentController.ts 1-398, classroomController.ts 1-415, schoolController.ts 1-40). Findings above capture all material issues; remaining lines are conventional controller plumbing (imports, NextResponse wrappers, try/catch error mapping) with no additional findings.
