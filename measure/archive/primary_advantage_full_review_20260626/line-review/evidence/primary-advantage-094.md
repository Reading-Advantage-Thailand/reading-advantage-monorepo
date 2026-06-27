# Line Review Evidence: primary-advantage-094

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-094
Files assigned: 2
Lines assigned: 613

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/primary-advantage/server/models/lessonModel.ts | 1-224 | reviewed | 3 |
| apps/primary-advantage/server/models/schoolModel.ts | 1-389 | reviewed | 4 |

## Findings

### LR-primary-advantage-094-001 — Standalone lesson article fetch has no tenant/school scoping

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/lessonModel.ts:18-41`
- Evidence: `getArticleForLesson` authenticates via `currentUser()` (lines 13-16) but then selects the article by `eq(articles.id, articleId)` only (lines 18-22), and the four related-content queries (lines 31-41) filter solely on `articleId`. There is no `schoolId`/tenant predicate and no check that the authenticated user is entitled to the article. Any authenticated user can read any article and its full flashcard/MCQ/SAQ/LAQ payload by guessing an `articleId`.
- Impact: Cross-tenant content disclosure. The root AGENTS.md multi-tenancy rule requires every read to be scoped by `schoolId`; this read trusts only the caller-supplied `articleId`.
- Recommendation: In a remediation track, scope the article query by the caller's `schoolId` (or verify article ownership/assignment) before returning content.

### LR-primary-advantage-094-002 — Progress/activity models trust caller-supplied userId (IDOR)

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/models/lessonModel.ts:72-90`
- Evidence: `updateStandaloneLessonProgress(userId, ...)` (lines 72-132), `getStandaloneLessonProgress(userId, ...)` (lines 147-162), and `getArticleActivity(articleId, userId)` (lines 188-204) accept `userId` as a plain argument and query/mutate `lessonProgress`/`articleActivityLogs` on it with no `currentUser()` check and no assertion that the argument matches the session user. If any caller forwards a client-supplied id, a user can read or overwrite another student's progress.
- Impact: Potential horizontal privilege escalation over children's learning-progress data. Authorization is delegated entirely to callers with no defense-in-depth at the model boundary.
- Recommendation: Verify the `userId` against the authenticated session (or pass the resolved session user) inside these models, or document the authorization contract enforced by every caller.

### LR-primary-advantage-094-003 — Free-form console logging in model error paths

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/models/lessonModel.ts:51`
- Evidence: Error handlers use `console.error("Model Error - ...", error)` at lines 51, 136, 175, and 218 instead of structured logging. The root AGENTS.md observability section says to avoid free-form console logging in production code.
- Impact: Inconsistent/unstructured observability; harder to trace and alert on model failures.
- Recommendation: Route through the shared structured logger when one is adopted; track as shared legacy logging cleanup.

### LR-primary-advantage-094-004 — School leaderboard read trusts caller-supplied schoolId with no access check

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/schoolModel.ts:241-254`
- Evidence: `getSchoolLeaderboardModel(schoolId?, userId?)` selects the leaderboard via `eq(leaderboards.schoolId, schoolId as string)` (lines 246-254) with no authentication and no verification that the requesting user belongs to `schoolId`. The downstream rank computation (lines 286-371) likewise queries any school's students by the supplied `schoolId`. The id originates from the caller/frontend.
- Impact: Any caller can enumerate any school's leaderboard, student names, and XP by passing an arbitrary `schoolId` — a multi-tenancy boundary violation (root AGENTS.md: never trust tenant IDs from the frontend).
- Recommendation: Resolve/verify `schoolId` from the authenticated user's session and assert membership before returning leaderboard data.

### LR-primary-advantage-094-005 — Unsafe `schoolId as string` cast on optional parameter

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/schoolModel.ts:253`
- Evidence: `schoolId` is typed optional (`schoolId?: string`, line 242) but is cast `schoolId as string` at lines 253 and 295. If invoked without `schoolId`, the query compares against `undefined` cast to string rather than failing fast, masking a programming error.
- Impact: Silent incorrect query / runtime ambiguity instead of an explicit validation error.
- Recommendation: Validate `schoolId` (Zod or guard) at the boundary and return a typed error when absent.

### LR-primary-advantage-094-006 — Leaderboard JSON written/read with `as any`

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/server/models/schoolModel.ts:214`
- Evidence: `details: leaderboardData as any` is used for both update (line 214) and insert (line 226), and the read path casts `leaderboard.details as unknown as SchoolLeaderboardData` (line 261). The `as any` erases type checking on the persisted JSON payload shape.
- Impact: Schema drift between writer and reader goes undetected at compile time.
- Recommendation: Type the `details` column with the Drizzle `$type<SchoolLeaderboardData>()` helper or validate with Zod on read/write.

### LR-primary-advantage-094-007 — Dead `sql` import retained via `void sql`

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/server/models/schoolModel.ts:385-389`
- Evidence: `sql` is imported (line 9) but unused; lines 385-389 intentionally keep it alive with `void sql;` and a comment explaining it is retained "to avoid an unused-import lint failure should the package adopt such rules later."
- Impact: A migration-era artifact that imports an unused symbol; mildly misleading and a lint-suppression workaround rather than removing the import.
- Recommendation: Remove the unused `sql` import (and the `void sql;` line) unless a concrete near-term use exists; if intentional, document it in the migration notes rather than inline.

## No-Finding Notes

- Both assigned files produced findings; no no-finding files in this batch.
