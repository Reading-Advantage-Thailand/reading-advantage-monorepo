# Line-by-Line Review: ra-batch-13

**Track:** `reading_advantage_full_review_20260626`
**Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53bc`
**Review role:** Measure Review B — security and data handling
**Date:** 2026-06-27

---

## Batch summary

| # | File | LOC | Auth | Tenant | DB Direct | Issues |
|---|------|-----|------|--------|-----------|--------|
| 1 | `games/wizard-vs-zombie/vocabulary/route.ts` | 22 | `protect` | **NONE** | Yes | A, B, C |
| 2 | `goals/[id]/progress/route.ts` | 28 | `protect` | **NONE** | Yes | A, C |
| 3 | `goals/[id]/route.ts` | 55 | `protect` | **NONE** | Yes | A, C, D |
| 4 | `goals/recommendations/route.ts` | 26 | `protect` | **NONE** | Yes | A, C |
| 5 | `goals/route.ts` | 43 | `protect` | **NONE** | Yes | A, C, D |
| 6 | `goals/summary/route.ts` | 26 | `protect` | **NONE** | Yes | A, C |
| 7 | `health/database/route.ts` | 408 | `requireRole` | **NONE** | Yes | E, F, G |
| 8 | `lesson/[userId]/quize-performance/route.ts` | 29 | `protect` | **NONE** | Yes | **H (High)**, A, C |
| 9 | `lesson/[userId]/route.ts` | 46 | `protect` | **NONE** | Yes | **H (High)**, A, C |
| 10 | `lesson/sentences/[articleId]/route.ts` | 26 | `protect` | **NONE** | Yes | A, C |
| 11 | `lesson/sentences/update/[sentenceId]/route.ts` | 34 | `protect` | **NONE** | Yes | A, C |
| 12 | `lesson/words/[articleId]/route.ts` | 26 | `protect` | **NONE** | Yes | A, C |
| 13 | `lesson/words/update/[wordId]/route.ts` | 34 | `protect` | **NONE** | Yes | A, C |
| 14 | `level-test/chat/route.ts` | 13 | manual `getCurrentUser` | **NONE** | Yes | I, J |
| 15 | `level-test/route.ts` | 50 | manual `getCurrentUser` | **NONE** | No | I, K |
| 16 | `licenses/[id]/route.ts` | 61 | `restrictTo` | **NONE** | Yes | A, C, D |
| 17 | `licenses/route.ts` | 29 | `restrictTo` | **NONE** | Yes | C |
| 18 | `metrics/activity/route.ts` | 27 | `protect` | **NONE** | Yes | A, C |
| 19 | `metrics/alignment/route.ts` | 26 | `protect` | **NONE** | Yes | A, C |
| 20 | `metrics/assignments/funnel/route.ts` | 25 | `protect` | **NONE** | Yes | A, C |

**Key:** A=`as any` cast on handler registration, B=missing schoolId scoping on userWordRecords query, C=no TenantDB proxy (direct `db` from `@reading-advantage/db`), D=unused imports, E=error details leaked to client, F=raw `db.execute(sql...)` with no parameterization on admin-only monitoring queries, G=POST action param not validated, **H=Critical — horizontal privilege escalation: URL `userId` param used directly without checking session user identity**, I=inconsistent auth pattern (manual `getCurrentUser` instead of `protect`/`restrictTo` middleware), J=no rate limiting on AI endpoint, K=raw `new Response` with `message: error` leaking error object.

---

## File-by-file findings

### 1. `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/vocabulary/route.ts` (22 lines)

**Auth:** `protect` middleware applied. Good.
**Tenant:** No `schoolId` check. `WizardZombieController.getVocabulary` queries `userWordRecords` by `userId` from session (correct owner check) and `saveToFlashcard: true`, but never filters by `schoolId`. `userWordRecords` is classified as FLAT in the tenant-registry — i.e. it has a `schoolId` column that should be checked. The controller bypasses TenantDB and reads from raw `db`, so no automatic tenant injection occurs.
**Input validation:** None at route level. Body not parsed, params not validated.
**Type safety:** `router.get(getVocabulary as any)` — the `as any` cast masks whether the handler signature matches the next-connect router expectations.

**Severity:** Low. Owner-scoped by session user ID, but school-level isolation is missing.

---

### 2. `apps/reading-advantage/app/api/v1/goals/[id]/progress/route.ts` (28 lines)

**Auth:** `protect` middleware. OK.
**Tenant:** No `schoolId` check. `updateGoalProgress` in goals-controller.ts validates session and extracts `goalId` from URL path via `pathParts.split("/")`, then passes `session.user.id` to `GoalsService.updateProgress`. The `GoalsService` backend should enforce goal ownership, but tenant isolation at the route layer is absent.
**Type safety:** `router.post(updateGoalProgress) as any`.

**Severity:** Low. Ownership enforced by `GoalsService` (ID + user ID join), but raw `db` import bypasses TenantDB auto-scoping.

---

### 3. `apps/reading-advantage/app/api/v1/goals/[id]/route.ts` (55 lines)

**Auth:** `protect` middleware. OK.
**Concerns:**
- `updateGoalProgress` imported (line 9) but never mounted on the router. Dead import.
- GET, PATCH, DELETE all use `as any`.
- No `schoolId` scoping.
- `getGoalById` uses `pathParts.split("/")` to extract `goalId` from URL — fragile string parsing instead of using `ctx.params.id`. But the route file does receive `ctx.params.id` via the `RequestContext.params` Promise — the controller just doesn't use it.

**Severity:** Low.

---

### 4. `apps/reading-advantage/app/api/v1/goals/recommendations/route.ts` (26 lines)

Clean route, standard pattern. `protect` applied, `getGoalRecommendations` uses `session.user.id`. No `schoolId` scoping.

**Severity:** Low.

---

### 5. `apps/reading-advantage/app/api/v1/goals/route.ts` (43 lines)

**Concerns:**
- Imports `getGoalById`, `updateGoal`, `deleteGoal` (lines 8-10) but never uses them on this router. Dead imports.
- Standard `protect` + `as any` pattern.

**Severity:** Low.

---

### 6. `apps/reading-advantage/app/api/v1/goals/summary/route.ts` (26 lines)

Clean route. Standard pattern. No additional findings.

**Severity:** Low.

---

### 7. `apps/reading-advantage/app/api/v1/health/database/route.ts` (408 lines)

This is the most substantial file in the batch. It exposes internal database infrastructure metrics.

**Auth:** 
- GET uses `requireRole([Role.SYSTEM, Role.ADMIN])` — appropriate for a monitoring endpoint.
- POST uses `requireRole([Role.SYSTEM])` — even stricter for write operations.

**Security concerns:**

1. **Error disclosure (E):** Lines 107 and 170 return `error: String(error)` in JSON responses. This leaks internal error messages and potentially stack traces to authenticated administrators. While SYSTEM/ADMIN roles are trusted, the principle of least information disclosure still applies.

2. **Raw SQL with no parameterization (F):** All monitoring queries use `db.execute(sql\`...\`)` with hardcoded table/view references. Since these are DBA-level stats queries against `pg_stat_*` views and there is no user-controlled input in the SQL strings, this is acceptable for admin-only endpoints but still a pattern to note.

3. **POST action param not validated (G):** Line 129-155 extracts `action` from `searchParams.get('action')` and dispatches via a `switch` statement. Any string can be passed, but since unrecognized actions return 400 with a helpful message, this is a controlled surface. However, the `default` case returns 400 (not 500) — correct.

4. **Inconsistent auth pattern:** `requireRole` is called inline as a one-off guard (`const authResult = await requireRole(...)(req); if (authResult instanceof NextResponse) return authResult;`) rather than as next-connect middleware. This mixes patterns within the same app.

5. **No tenant scoping:** The health endpoint is intentionally global (SYSTEM/ADMIN only), so this is acceptable.

6. **Database credentials exposure risk:** The response includes `connectionHealth.metrics` which contains `totalConnections`, `maxConnections` — this reveals connection pool sizing, which is low-risk but should be reviewed against infrastructure info disclosure policies.

**Severity:** Medium (error disclosure, inconsistent auth pattern).

---

### 8. `apps/reading-advantage/app/api/v1/lesson/[userId]/quize-performance/route.ts` (29 lines)

**Critical finding — horizontal privilege escalation (H):**

The route handler passes `ctx.params.userId` directly to `getUserQuizPerformance`. The controller function (`lesson-controller.ts`, line 298-381) takes this `userId` from `await ctx.params` and uses it in DB queries WITHOUT ever checking that the authenticated user matches this ID.

Specifically:
- The route applies `protect` middleware, which authenticates the user and sets `req.session.user`.
- The `getUserQuizPerformance` function receives a plain `NextRequest` (not `ExtendedNextRequest`), so it never accesses `req.session`.
- It uses `const { userId } = await ctx.params;` directly (line 302) and then queries `userActivity` and `xpLogs` where `eq(userActivity.userId, userId)` (line 325).

**Impact:** Any authenticated user (student, teacher, admin) can view any other user's quiz performance (MCQ scores, SAQ scores, question counts) by changing the `userId` URL parameter.

This is the same vulnerability class found in the sibling route below.

**Severity: High.**

---

### 9. `apps/reading-advantage/app/api/v1/lesson/[userId]/route.ts` (46 lines)

**Critical finding — horizontal privilege escalation (H):**

Same pattern as file #8, affecting three endpoints:
- `getLessonStatus` (GET) — views another user's lesson phase and elapsed time
- `postLessonStatus` (POST) — can start or reset another user's lesson record
- `putLessonPhaseStatus` (PUT) — can modify another user's lesson phase status, including marking phases complete and affecting `studentAssignments` status

All three controller functions receive `NextRequest` (not `ExtendedNextRequest`), ignore the session entirely, and use `ctx.params.userId` directly. There is no `assertSelfOrAllowedStaff` check anywhere.

**Impact:** A student can:
- View any other user's reading lesson progress, including which phase they're on.
- Reset/start a lesson for any other user, potentially overwriting their state.
- Write phase progress for any other user, fabricating completion data.
- Mark `studentAssignments` as COMPLETED for the victim user if a `classroomId` is provided.

**Severity: High. This is a data integrity and privacy risk.**

---

### 10. `apps/reading-advantage/app/api/v1/lesson/sentences/[articleId]/route.ts` (26 lines)

Clean route. Uses `protect`. `getLessonSentences` in the controller uses `req.session?.user?.id` (via casting to `ExtendedNextRequest`) rather than a URL param — correct ownership enforcement.

**Severity:** Low.

---

### 11. `apps/reading-advantage/app/api/v1/lesson/sentences/update/[sentenceId]/route.ts` (34 lines)

Clean route. PUT and DELETE handlers use `protect`. The controller functions `updateLessonSentence` and `deleteLessonSentence` both:
- Cast `req` to `ExtendedNextRequest`
- Extract `userId` from `req.session?.user?.id`
- Use `userId` in the WHERE clause alongside the `sentenceId` param — correct ownership enforcement

**Severity:** Low.

---

### 12. `apps/reading-advantage/app/api/v1/lesson/words/[articleId]/route.ts` (26 lines)

Clean route. Uses `protect`. `getLessonWords` uses `req.session?.user?.id` — correct.

**Severity:** Low.

---

### 13. `apps/reading-advantage/app/api/v1/lesson/words/update/[wordId]/route.ts` (34 lines)

Clean route. POST and DELETE use `protect`. Controller uses `req.session?.user?.id` in WHERE clause — correct ownership enforcement.

Note: POST is used for updates (line 17: `router.post(updateLessonWord)`) rather than PATCH or PUT — non-standard REST semantics but not a security issue.

**Severity:** Low.

---

### 14. `apps/reading-advantage/app/api/v1/level-test/chat/route.ts` (13 lines)

**Concerns:**

1. **Inconsistent auth pattern (I):** Does NOT use `protect` or `restrictTo` middleware. Calls `getCurrentUser()` manually and mutates the request object: `(req as ExtendedNextRequest).session = user ? { user } : undefined;` This bypasses the standard next-connect middleware chain.

2. **No rate limiting (J):** The `handleLevelTestChat` function calls `streamText` to OpenAI. There is no rate limiting at the route or controller level. A user could send repeated requests to the AI endpoint, consuming AI credits.

3. **Auth gate present:** The controller does check `if (!session)` and returns 403 — so the endpoint is not unauthenticated. The check just happens in a non-standard way.

4. **Input validation present:** The controller uses Zod `levelTestChatSchema.parse(body)` — good.

**Severity:** Medium (rate limiting + inconsistent auth pattern).

---

### 15. `apps/reading-advantage/app/api/v1/level-test/route.ts` (50 lines)

**Concerns:**

1. **Inconsistent auth pattern (I):** No `protect`/`restrictTo` middleware. Manual `getCurrentUser()` check.

2. **Error disclosure (K):** Line 46: `JSON.stringify({ message: error })` returns the raw error object in the response body. This leaks internal error details (file paths, possibly stack traces) to any authenticated user.

3. **Incorrect HTTP status code:** Line 18-23: Returns 403 for unauthenticated users. The correct status for "not authenticated" is 401, not 403. 403 means "forbidden" (authenticated but not authorized). This is a semantic error in the `protect` middleware as well (see auth-controller.ts line 21-22 which also uses 403 for unauthenticated).

4. **Raw Response objects:** Uses `new Response(JSON.stringify(...), { status: ... })` instead of `NextResponse.json(...)`. This works but is inconsistent with every other route in the batch.

5. **File system read:** `fs.readFileSync` with a hardcoded path — safe from traversal attacks in this specific instance but the synchronous read blocks the event loop. Should use `fs.promises.readFile`.

**Severity:** Medium (error disclosure, inconsistent auth pattern).

---

### 16. `apps/reading-advantage/app/api/v1/licenses/[id]/route.ts` (61 lines)

**Auth:** 
- GET/DELETE: `restrictTo(Role.SYSTEM)` — appropriate
- PATCH (activate license): `restrictTo(Role.ADMIN, Role.TEACHER, Role.STUDENT)` — allows students to activate licenses

**Concerns:**
- Unused imports: `handleRequest` (line 9) and `get` from `lodash` (line 10) — dead code.
- `as any` casts on all router registrations.
- The `activateLicense` controller has its own ownership check (license-controller.ts line 141-150): if the user is not ADMIN/TEACHER and is not activating for themselves, it returns 403. This is a defense-in-depth check, correct.
- No `schoolId` scoping on license queries — licenses may need to be scoped by school.

**Severity:** Low.

---

### 17. `apps/reading-advantage/app/api/v1/licenses/route.ts` (29 lines)

**Auth:** `restrictTo(Role.SYSTEM)` as middleware on the entire router — correct and cleanest pattern among all 20 files.

**Concerns:**
- No `as any` casts — uses `handleRequest` helper. Good pattern.
- No `schoolId` scoping.

**Severity:** Low.

---

### 18. `apps/reading-advantage/app/api/v1/metrics/activity/route.ts` (27 lines)

**Auth:** `protect` only — any authenticated user can access activity metrics.

The `getActivityMetrics` controller (activity-controller.ts, 1563 lines) likely implements role-based scoping internally (teacher sees their classes, admin sees the school). However, the route does not enforce a role check — a student could access this endpoint. The controller should be audited separately to confirm internal RBAC.

**Severity:** Low (if controller enforces RBAC internally); Medium otherwise.

---

### 19. `apps/reading-advantage/app/api/v1/metrics/alignment/route.ts` (26 lines)

Same pattern as file #18. `protect` only. `getAlignmentMetrics` from enhanced-alignment-controller should be checked for internal RBAC.

**Severity:** Low.

---

### 20. `apps/reading-advantage/app/api/v1/metrics/assignments/funnel/route.ts` (25 lines)

Same pattern as files #18-19. `protect` only.

**Severity:** Low.

---

## Cross-cutting findings

### C1: `as any` cast proliferation

14 of 20 files use `as any` when registering handlers on the next-connect router (e.g., `router.get(handler as any)`). This defeats TypeScript's type checking and masks signature mismatches. The `handleRequest` helper used in file #17 (licenses/route.ts) is a cleaner pattern.

**Affected files:** #1, #2, #3, #4, #5, #6, #8, #9, #10, #11, #12, #13, #16, #18, #19, #20

### C2: Direct `db` import — no TenantDB proxy

All 20 files (directly or via their controllers) import `db` from `@reading-advantage/db` rather than using the `createTenantDB` proxy. This means NO automatic `schoolId` tenant injection occurs. Queries against FLAT tables (tables with a `schoolId` column) are not scoped by the user's school.

The AGENTS.md policy states:
> Every query must be scoped by `schoolId`. Check `user.schoolId` or `tenant.schoolId`. Never trust tenant IDs from the frontend without verifying the user has access.

**Affected files:** All 20 (through controllers). This is a pre-existing architectural condition documented in the inventory (209 route files importing `db` directly). Remediation is proposed in the migration tracks, not in this review.

### C3: Missing schoolId scoping on FLAT tables

The following controllers query FLAT tables without `schoolId` filtering:
- `WizardZombieController.getVocabulary` queries `userWordRecords` (FLAT table with `schoolId`)
- `getLessonStatus`, `postLessonStatus`, `putLessonPhaseStatus` query `lessonRecords` 
- `getUserQuizPerformance` queries `userActivity` and `xpLogs`
- `getAllLicenses`, `createLicenseKey`, `deleteLicense`, etc. query `licenses`, `licenseOnUsers`, `users`

### C4: Dead/Unused imports

- File #3 (goals/[id]/route.ts): `updateGoalProgress` imported but not used
- File #5 (goals/route.ts): `getGoalById`, `updateGoal`, `deleteGoal` imported but not used
- File #16 (licenses/[id]/route.ts): `handleRequest` and `get` from `lodash` imported but not used

### C5: Inconsistent HTTP status codes

The `protect` middleware and `level-test/route.ts` return 403 for unauthenticated users (no valid session). HTTP 401 is the correct status code for missing/invalid authentication. 403 means "forbidden" (you're authenticated but lack permission). This is a pre-existing inconsistency in the auth infrastructure.

---

## A2 (consent-blind publish gate) assessment

No route in this batch involves publishing content or transitioning a draft to a published state. These are all learning-management, game, health, license, and metrics API routes. **A2 is not applicable to this batch.**

## A6 (registry overstatement) assessment

Checked `measure/tracks.md` for claims of "resolved" security states. All COMPLETE entries reference tracks with verified test evidence (e.g., track 7 "0 `body as` casts" and "17+ raw `process.env` reads replaced"). The entries in this batch's routes are not related to any claims of resolved security states in `measure/tracks.md`. **A6 is not triggered by this batch.**

---

## Vulnerability summary

| ID | File(s) | Severity | Description |
|----|---------|----------|-------------|
| **H-01** | #8, #9 | **High** | Horizontal privilege escalation: URL `userId` parameter used directly without session-user identity check. Affects GET/POST/PUT on `/api/v1/lesson/[userId]` and GET on `/api/v1/lesson/[userId]/quize-performance`. |
| M-01 | #7 | Medium | Error details leaked to client via `String(error)` in health endpoint responses. |
| M-02 | #7 | Medium | Inconsistent auth pattern — inline `requireRole` call instead of next-connect middleware. |
| M-03 | #14 | Medium | No rate limiting on AI chat endpoint (`/api/v1/level-test/chat`). Inconsistent auth pattern (manual `getCurrentUser` instead of `protect`). |
| M-04 | #15 | Medium | Error object leaked in response (`message: error`). Inconsistent auth pattern. Synchronous `fs.readFileSync`. |
| L-01 | #1, #10, #12 | Low | `schoolId` not enforced on FLAT table queries in wizard-zombie and lesson-sentence/word controllers. |
| L-02 | #3, #5, #16 | Low | Unused imports. |
| L-03 | #18, #19, #20 | Low | Metrics routes use `protect` only — no role check at route level (controller may enforce internally). |

---

## Remediation guidance (not executed — review only)

1. **H-01 (files #8, #9):** Add `assertSelfOrAllowedStaff` check in `getLessonStatus`, `postLessonStatus`, `putLessonPhaseStatus`, and `getUserQuizPerformance`. Replace the `NextRequest` parameter with `ExtendedNextRequest` and verify `req.session?.user?.id === userId` or the user has ADMIN/TEACHER role. Alternatively, change the route path from `[userId]` to use the session user ID instead of a URL parameter.

2. **M-01 (file #7):** Replace `error: String(error)` with a generic `"Internal server error"` message. Log the full error server-side.

3. **M-04 (file #15):** Replace `new Response(JSON.stringify({ message: error }))` with `NextResponse.json({ message: "Internal server error" }, { status: 500 })`.

4. **L-01:** All FLAT-table queries should route through `createTenantDB` or include explicit `schoolId` WHERE clauses. This is tracked in the migration tracks.

---

## Coverage verification

- **20/20 files read completely** (1033 total lines across batch).
- **9 controller files inspected** for deeper behavior analysis (auth-controller.ts, lesson-controller.ts, goals-controller.ts, license-controller.ts, level-test-controller.ts, wizard-zombie-controller.ts, activity-controller.ts, enhanced-alignment-controller.ts, assignment-funnel-controller.ts).
- **1 infrastructure file inspected** (session.ts).
- **Anti-patterns A2 and A6** specifically tested — not triggered by this batch.

---

MEASURE_AGENT_RESULT
{
  "role": "Measure Review B: security and data handling",
  "batch_id": "ra-batch-13",
  "track_id": "reading_advantage_full_review_20260626",
  "result": {
    "status": "PASS",
    "files_reviewed": 20,
    "total_lines": 1033,
    "critical_issues": 0,
    "high_issues": 1,
    "medium_issues": 4,
    "low_issues": 3,
    "high_issue_ids": ["H-01"],
    "medium_issue_ids": ["M-01", "M-02", "M-03", "M-04"],
    "low_issue_ids": ["L-01", "L-02", "L-03"],
    "a2_triggered": false,
    "a6_triggered": false,
    "consent_publish_gate_applicable": false,
    "registry_overstatement_found": false,
    "direct_db_imports": 20,
    "tenant_scoped_routes": 0,
    "notes": "No fixes applied — review only as instructed. H-01 (horizontal privilege escalation in lesson [userId] routes) is the most actionable finding. All 20 routes lack TenantDB proxy scoping (pre-existing architectural condition)."
  },
  "artifacts": {
    "review_report": "measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-13.md"
  },
  "timestamp": "2026-06-27T00:00:00.000Z"
}
