# ra-batch-07 — Line-by-Line Review

**Track:** `reading_advantage_full_review_20260626`
**Baseline SHA:** `6921fda0ee45012232bdd71c444d4e9523a10ab6`
**Batch:** 07
**Files:** 20
**Reviewer:** Measure Review B (security and data handling)
**Date:** 2026-06-27

---

## Scope

20 route files under `apps/reading-advantage/app/api/v1/`:

| # | File | Method(s) | Auth Guard | Controller |
|---|------|-----------|------------|------------|
| 1 | `trpc/[trpc]/route.ts` | GET, POST | tRPC createContext | Internal |
| 2 | `activity/active-users/route.ts` | GET | `protect` | `getActiveUser` |
| 3 | `activity/all/route.ts` | GET | `protect` | `getAllUsersActivity` |
| 4 | `activity/daily-active-users/route.ts` | GET | `protect` | `getDailyActiveUsers` |
| 5 | `activity/route.ts` | GET | `protect` | `getAllUserActivity` |
| 6 | `activity/update-all-activity/route.ts` | POST | `restrictAccessKey` | `updateAllUserActivity` |
| 7 | `admin/alerts/route.ts` | GET | `restrictTo(SYSTEM,ADMIN)` | `getAdminAlerts` |
| 8 | `admin/dashboard/route.ts` | GET, POST | `protect` | `getAdminDashboard` |
| 9 | `admin/overview/route.ts` | GET | `restrictTo(SYSTEM,ADMIN)` | `getAdminOverview` |
| 10 | `admin/segments/route.ts` | GET | `restrictTo(SYSTEM,ADMIN)` | `getSchoolSegments` |
| 11 | `admin/teacher-assignments/route.ts` | GET | `protect` | `getTeacherAssignments` |
| 12 | `admin/teacher-effectiveness/route.ts` | GET | `restrictTo(SYSTEM,ADMIN)` | `getTeacherEffectiveness` |
| 13 | `ai/insights/action/route.ts` | POST | `protect` | `markInsightAction` |
| 14 | `ai/insights/cache/route.ts` | DELETE | `protect` | `clearInsightCache` |
| 15 | `ai/insights/dismiss/route.ts` | POST | `protect` | `dismissInsight` |
| 16 | `ai/insights/refresh/route.ts` | GET, POST | `restrictAccessKey` | `getAIInsightsRefreshStatus` / `refreshAIInsightsAutomated` |
| 17 | `ai/summary/route.ts` | GET | `protect` | `getAISummary` |
| 18 | `articles/[article_id]/export-workbook/route.ts` | GET | `restrictTo(ADMIN,SYSTEM,TEACHER)` | Inline handler (direct DB) |
| 19 | `articles/[article_id]/questions/laq/[question_id]/feedback/route.ts` | GET, POST | `protect` | `getFeedbackLAquestion` |
| 20 | `articles/[article_id]/questions/laq/[question_id]/getxp/route.ts` | GET, POST | `protect` | `getLAQuestionXP` |

---

## Auth Infrastructure Baseline

All routes depend on `@/server/controllers/auth-controller.ts`, which provides three middleware guards:

- **`protect`** — validates session cookie via `getCurrentUser()` (→ `@reading-advantage/auth` `validateSession`). Sets `req.session.user`. Does **NOT** check roles.
- **`restrictTo(...roles)`** — same as `protect` plus role whitelist check against `user.role`. Skips `protect` (does its own session fetch).
- **`restrictAccessKey`** — header-based API key check (`Access-Key` header vs `process.env.ACCESS_KEY`). No user session required. On failure, sends Discord webhook.

Session enrichment (`lib/session.ts`) uses `@reading-advantage/auth` `validateSession` and enriches with reading-advantage-specific fields including `school_id`, `license_id`, and classroom memberships.

---

## Findings

### F-07-001 — CRITICAL: Cross-Tenant Data Leak in Activity Controllers

**Files:** `activity/route.ts` (#5), `activity/all/route.ts` (#3)

**Root cause:** Controller functions `getAllUserActivity` and `getAllUsersActivity` in `activity-controller.ts` query the `userActivity` and `users` tables with **no tenant (schoolId/licenseId) scoping whatsoever**.

`getAllUserActivity` (line 925–1011):
```ts
const activityCounts = await db
  .select({ activityType: userActivity.activityType, count: sql<number>`count(*)::int` })
  .from(userActivity)
  .groupBy(userActivity.activityType);

const [{ totalUsers }] = await db
  .select({ totalUsers: sql<number>`count(*)::int` })
  .from(users);
```

This returns aggregate activity counts **across all schools/licenses**. Any authenticated user (student, teacher, admin) can call this endpoint because only `protect` middleware is applied.

`getAllUsersActivity` (line 1013–1111) leaks:
- Recent 1000 activity rows with user names and emails
- Activity type, target article IDs, completion status
- Aggregated per-user activity counts

No `schoolId`, `licenseId`, or role-based filtering.

**Risk:** A student or teacher from School A can enumerate system-wide activity data, including user counts, activity patterns, and per-user activity summaries from School B.

**Route-level auth:** `protect` only (any authenticated user).

---

### F-07-002 — HIGH: Admin Dashboard Route Missing Role Gate

**File:** `admin/dashboard/route.ts` (#8)

**Root cause:** The route file applies only `protect` middleware, not `restrictTo(ADMIN, SYSTEM)`. This means **any authenticated user** (student, teacher) can reach the `getAdminDashboard` controller.

**Mitigation (partial):** The controller does its own `getCurrentUser()` call and checks `user.license_id`, and allows `SYSTEM` users to override `licenseId` via query param. However:
1. A non-admin user with a valid `license_id` will see their license's dashboard data (user list, XP, activity log), which is still an unintended data exposure for students/teachers who shouldn't see admin dashboards.
2. No `schoolId` scoping beyond the user's own `license_id`.

**Risk:** Elevated data exposure — a student can access aggregated license-level metrics and user listings they should not see.

**Comparison:** Peer routes `admin/overview`, `admin/alerts`, `admin/segments`, `admin/teacher-effectiveness` all use `restrictTo(ADMIN, SYSTEM)`. This route is the outlier.

---

### F-07-003 — HIGH: Teacher Assignments Route Missing Role Gate

**File:** `admin/teacher-assignments/route.ts` (#11)

**Root cause:** Route uses only `protect` middleware. The controller `getTeacherAssignments` does its own role check at line 32 (`user.role !== "ADMIN" && user.role !== "TEACHER" && user.role !== "SYSTEM"`), but:

1. A student hitting this endpoint will get a 403, but the route surface is wider than intended.
2. The endpoint path is under `/admin/` — all other admin routes use `restrictTo`; this one doesn't.
3. If the controller's role check is ever relaxed or has a logic bug, unprotected data exposure occurs.

**Risk:** Inconsistency in admin route hardening; defense-in-depth gap.

---

### F-07-004 — HIGH: Direct Database Bypass (Domain Anti-Pattern) in Workbook Export

**File:** `articles/[article_id]/export-workbook/route.ts` (#18)

**Root cause:** The route file directly imports and uses `db`, `eq` from `@reading-advantage/db` (line 2–3) and runs raw Drizzle queries against `articles`, `chapters`, `multipleChoiceQuestions`, `shortAnswerQuestions`, `longAnswerQuestions` tables.

```ts
import { db, eq } from "@reading-advantage/db";
...
const articleRows = await db.select().from(articles).where(eq(articles.id, article_id)).limit(1);
```

**Issues:**
1. **Domain bypass** — no domain function layer, no `assertCan`, no `TenantDB` scoping.
2. **No tenant scoping** — queries articles and questions directly without `schoolId` filter. Any authorized user (ADMIN, SYSTEM, TEACHER) can export any article's workbook, regardless of school/license ownership.
3. **No input validation** — `article_id` from params is used directly in queries without Zod schema validation. If `article_id` is not a valid format, it passes through to PostgreSQL verbatim.
4. **Error detail exposure** — the catch block returns `{ message: "Internal server error", error }`, leaking error objects including potential stack traces to the client (line 416–419).
5. **Hardcoded production URLs** — lines 391–395 embed `https://app.reading-advantage.com` and `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com` as string literals. Not a security issue per se, but a portability/config concern.
6. **`as any` casts** — pervasive throughout (line 27, 108, 421, etc.), defeating TypeScript type checking on the inline handler and vocabulary/mcq/question data shapes.

---

### F-07-005 — HIGH: AI Insight Dismiss Without Ownership Check

**File:** `ai/insights/dismiss/route.ts` (#15)

**Root cause:** The controller `dismissInsight` in `ai-insight-actions-controller.ts` (line 30–38) updates any insight by ID with **no user, school, or tenant ownership verification**:

```ts
const [insight] = await db
  .update(aiInsights)
  .set({ dismissed: true, dismissedAt: new Date() })
  .where(eq(aiInsights.id, insightId))
  .returning();
```

**Risk:** Any authenticated user (protect-only route) can dismiss any AI insight in the system by guessing/iterating insight IDs, including insights generated for other schools, teachers, or students.

The `ai/insights/cache/route.ts` (#14) similarly allows any authenticated user to clear the insight cache with no ownership check.

---

### F-07-006 — MEDIUM: AI Summary Cross-User Data Access

**File:** `ai/summary/route.ts` (#17)

**Root cause:** The controller `getAISummary` allows a caller to specify `?userId=<any_id>&kind=student` to generate/view AI insights for **any user ID**. For non-SYSTEM roles, the controller determines scope by parameters and user role, but:

1. A student can set `?userId=<otherStudentId>&kind=student` — the controller does NOT verify that the requested `userId` matches `session.user.id` when scope is STUDENT.
2. A teacher can set `?userId=<studentId>&kind=student` to potentially access another teacher's students.

The lack of ownership verification on the `userId` parameter means AI-generated insights (which may contain sensitive learning analysis) are accessible cross-user.

---

### F-07-007 — MEDIUM: Long-answer XP/Feedback Route Method Mismatch

**Files:** `articles/[article_id]/questions/laq/[question_id]/feedback/route.ts` (#19), `articles/[article_id]/questions/laq/[question_id]/getxp/route.ts` (#20)

**Root cause:** Both route files:
- Register only `router.post(...)` handlers on the router
- Export both `GET` and `POST` handlers

The `GET` handler runs `router.run()` against a router that has no GET handler registered. This returns in a `NextResponse` not being produced by the router, causing the `throw new Error("Expected a NextResponse...")` — a 500 error to the client.

This is a latent API contract inconsistency: the files advertise GET support but crash when called with GET.

---

### F-07-008 — LOW: `getFeedbackLAquestion` No Input Validation for AI Call

**File:** `articles/[article_id]/questions/laq/[question_id]/feedback/route.ts` (#19)

**Root cause:** The controller `getFeedbackLAquestion` (question-controller.ts, line 1120–1214):
1. No Zod validation on the request body (`answer`, `preferredLanguage`).
2. The `preferredLanguage` parameter is passed through to `getFeedbackWritter` which presumably makes an AI/LLM call. No sanitization or language code validation.
3. No rate limiting visible at the route or controller level — AI feedback generation is expensive and could be abused.

---

### F-07-009 — LOW: `getLAQuestionXP` No Rate Limiting / Idempotency Check Timing

**File:** `articles/[article_id]/questions/laq/[question_id]/getxp/route.ts` (#20)

**Root cause:** The controller `getLAQuestionXP` (question-controller.ts, line 1248–1340) checks for an existing XP log but does so after looking up the user and user activity. The insert path (`insert into xpLogs`) has no database-level uniqueness constraint visible in this code path. If two requests arrive simultaneously, both could pass the existence check and double-award XP.

---

### F-07-010 — LOW: Activity Endpoints No Tenant Scoping on licenseId Parameter

**Files:** `activity/active-users/route.ts` (#2), `activity/daily-active-users/route.ts` (#4)

**Root cause:** Controllers `getActiveUser` and `getDailyActiveUsers` accept a `licenseId` query parameter with **no verification that the calling user is authorized to view that license's data**. Any authenticated user can pass any `licenseId` to enumerate active users and daily active users for any license in the system.

Compare with admin controllers that verify `user.license_id` alignment for ADMIN roles.

---

### F-07-011 — LOW: Hardcoded Magic ID Prefix in Activity Timeline

**File:** Activity controller called by routes #2–#5

**Root cause:** In `activity-controller.ts` line 490:
```ts
if (entityId === session.user.id && !entityId.startsWith("cmgj0")) {
```
The hardcoded prefix `"cmgj0"` appears to be a magic string for a specific school or user ID prefix. This logic change in behavior based on ID format is fragile and undocumented.

---

### F-07-012 — INFO: AI Insights Refresh Accessible on GET Without Additional Auth

**File:** `ai/insights/refresh/route.ts` (#16)

**Context:** This endpoint uses `restrictAccessKey` (API key auth only — designed for Cloud Scheduler). Both GET and POST are guarded by `restrictAccessKey`. The GET endpoint returns aggregate insight counts for the last 24 hours, which is appropriate monitoring data for an API-key-protected endpoint.

**Observation:** `restrictAccessKey` reads from `process.env.ACCESS_KEY` — a simple string comparison against a single environment variable. While sufficient for Cloud Scheduler, it provides no key rotation, no per-client keys, and no audit trail of which key was used.

---

## Anti-Pattern Cross-Reference

### A2 — Consent-blind publish gate

**Status: Not applicable to this batch.** None of the 20 files involve a draft→published status flip. Activity, admin, AI insight, and question routes are either read-only or non-publishing mutations.

### A6 — Registry-note overstatement

**Status: Not triggered.** The `measure/tracks.md` entry for `reading_advantage_full_review_20260626` (line 31–33) accurately describes the track as "Reviews the oldest and largest legacy app, including direct DB/domain-bypass risk..." — this is a truthful statement of intent, not a resolved-state claim. The commit being reviewed (`6921fda`) is pre-remediation; no "resolved" claim is being made about these files.

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| CRITICAL | 1 | F-07-001 |
| HIGH | 4 | F-07-002, F-07-003, F-07-004, F-07-005 |
| MEDIUM | 2 | F-07-006, F-07-007 |
| LOW | 4 | F-07-008, F-07-009, F-07-010, F-07-011 |
| INFO | 1 | F-07-012 |

**Total findings: 12**

### Top Risks

1. **F-07-001 (CRITICAL):** `getAllUserActivity` and `getAllUsersActivity` controllers query activity data across all tenants with zero school/license scoping. Only `protect` middleware. Any authenticated user can see system-wide activity aggregates and per-user activity data with emails.

2. **F-07-004 (HIGH):** Workbook export route directly imports `@reading-advantage/db` and bypasses domain functions, TenantDB scoping, and input validation. Classic domain-bypass anti-pattern.

3. **F-07-005 (HIGH):** AI insight dismissal has no ownership check — any authenticated user can dismiss any insight in the system by ID.

### Defense-in-Depth Gaps

- **F-07-002 + F-07-003:** Two admin-scoped routes (#8, #11) use weaker `protect` middleware while peers use `restrictTo(ADMIN, SYSTEM)`.
- **F-07-010:** Activity endpoints accept `licenseId` param without verifying caller authorization.

### Code Quality

- **F-07-007:** Method export mismatch (routes: POST only, exports: GET+POST) causing latent 500 errors.
- **F-07-011:** Magic ID prefix `"cmgj0"` in timeline scoping logic.

### Input Validation

None of the 20 route files apply Zod-based input validation at the route boundary. Controllers parse query params and body data directly. The workbook export route (#18) passes `article_id` directly to Drizzle without any validation.

### Tenant Scoping

Of the 20 files, only the tRPC adapter (#1) and the `restrictAccessKey`-protected endpoints (#6, #16) have no tenant-scoping concerns. Every controller-backed route either:
- Has no tenant scoping (F-07-001)
- Relies on the user's own `license_id`/`school_id` without verifying the requested entity belongs to the user's scope (F-07-010)
- Bypasses domain entirely (F-07-004)

### AI/Privacy

- **F-07-005 + F-07-006:** AI insight access control gaps allow cross-user/school insight viewing and dismissal.
- **F-07-008:** AI feedback generation endpoint has no input sanitization or rate limiting.
- The `ai/summary` route (#17) could potentially surface AI-generated analysis about other users' learning data.

### API Contract Consistency

- All 20 files use the `next-connect` `createEdgeRouter` pattern consistently.
- Route file structure is uniform: middleware registration, handler export, router.run + NextResponse check.
- However, routes #19 and #20 export handlers for methods they don't register (F-07-007).

---

## File-by-File Quick Reference

| # | File | DB Bypass | Tenant Scope | Input Val. | Auth Adequate | Notes |
|---|------|-----------|-------------|------------|---------------|-------|
| 1 | trpc/[trpc]/route.ts | ✅ (via tRPC) | ✅ (via tRPC) | ✅ (via tRPC) | ✅ | Clean adapter |
| 2 | activity/active-users/route.ts | Via controller | ❌ licenseId unchecked | ❌ | ⚠️ protect only | F-07-010 |
| 3 | activity/all/route.ts | Via controller | ❌ un-scoped query | ❌ | ⚠️ protect only | F-07-001 |
| 4 | activity/daily-active-users/route.ts | Via controller | ❌ licenseId unchecked | ❌ | ⚠️ protect only | F-07-010 |
| 5 | activity/route.ts | Via controller | ❌ un-scoped query | ❌ | ⚠️ protect only | F-07-001 |
| 6 | activity/update-all-activity/route.ts | Via controller | ✅ global agg | ❌ | ✅ (API key) | Acceptable |
| 7 | admin/alerts/route.ts | Via controller | ⚠️ license-based | ❌ | ✅ | F-07-002 peer |
| 8 | admin/dashboard/route.ts | Via controller | ⚠️ license-based | ❌ | ❌ protect only | F-07-002 |
| 9 | admin/overview/route.ts | Via controller | ⚠️ license-based | ❌ | ✅ | OK |
| 10 | admin/segments/route.ts | Via controller | ⚠️ license-based | ❌ | ✅ | OK |
| 11 | admin/teacher-assignments/route.ts | Via controller | ⚠️ role-based | ❌ | ❌ protect only | F-07-003 |
| 12 | admin/teacher-effectiveness/route.ts | Via controller | ⚠️ license-based | ❌ | ✅ | OK |
| 13 | ai/insights/action/route.ts | Via controller | ❌ | ❌ | ⚠️ protect only | Needs audit |
| 14 | ai/insights/cache/route.ts | Via controller | ❌ | ❌ | ⚠️ protect only | No ownership check |
| 15 | ai/insights/dismiss/route.ts | Via controller | ❌ | ❌ | ⚠️ protect only | F-07-005 |
| 16 | ai/insights/refresh/route.ts | Via controller | ✅ global | ❌ | ✅ (API key) | F-07-012 |
| 17 | ai/summary/route.ts | Via controller | ⚠️ partial | ❌ | ⚠️ protect only | F-07-006 |
| 18 | articles/.../export-workbook/route.ts | **❌ DIRECT** | ❌ | ❌ | ✅ | F-07-004 |
| 19 | articles/.../feedback/route.ts | Via controller | ❌ | ❌ | ⚠️ protect only | F-07-007, F-07-008 |
| 20 | articles/.../getxp/route.ts | Via controller | ❌ | ❌ | ⚠️ protect only | F-07-007, F-07-009 |

---

## Remediation Priority

1. **Immediate:** Apply `schoolId`/`licenseId` scoping to F-07-001 controllers; change route auth to `restrictTo(ADMIN, SYSTEM)` for F-07-002 and F-07-003.
2. **Short-term:** Migrate workbook export (#18) to a domain function with TenantDB scoping; add ownership checks to AI insight dismissal/cache routes; add Zod validation to all route inputs.
3. **Medium-term:** Add rate limiting to AI endpoints (#17, #19); fix method export mismatch (#19, #20); remove magic ID prefix (F-07-011); add XP idempotency constraint.

---

*No acceptance claims. All findings require independent verification and remediation tracking.*
