# Line-By-Line Review: ra-batch-15

**Track:** `reading_advantage_full_review_20260626`
**Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`
**Batch ID:** `ra-batch-15`
**Reviewer:** Measure Review B (security and data handling)
**Files reviewed:** 20
**Date:** 2026-06-27

---

## Batch Summary

| Files | Critical | High | Medium | Low | OK |
|-------|----------|------|--------|-----|-----|
| 20 | 1 | 1 | 1 | 7 | 10 |

**Dominant theme:** Route-thin controller-delegation pattern with `protect` middleware is consistent; two files break the pattern with direct DB access and missing or inconsistent auth gates.

---

## File-by-File Findings

---

### File 1: `apps/reading-advantage/app/api/v1/stories/[storyId]/[chapterNumber]/question/sa/[questionNumber]/rate/route.ts`

**Lines:** 39
**Auth:** `protect` middleware (line 18)
**Routes:** `GET` (line 21), `POST` (line 31) → `rateStory` controller (line 19)

**Finding F-RA-B15-001 — Severity: LOW**
**Ghost GET handler.** The `next-connect` router registers only `router.post(rateStory)` (line 19). The exported `GET` function (lines 21–29) calls `router.run(request, ctx)`, but the router has no GET handler registered. In `next-connect`, this typically returns a 405 Method Not Allowed or passes through to the error handler. The `GET` export should either be removed or explicitly 405-d.

**Finding F-RA-B15-002 — Severity: LOW**
**`as any` type assertion on router.post.** Line 19: `router.post(rateStory) as any`. The handler function signature isn't validated against the expected `next-connect` handler type at compile time. This is a type-safety gap; a controller returning `void` instead of `NextResponse` would not be caught.

**Verdict:** PASS with advisories. The `protect` gate is present. The orphan GET is a correctness risk, not a security risk in this context.

---

### File 2: `apps/reading-advantage/app/api/v1/stories/[storyId]/[chapterNumber]/question/sa/[questionNumber]/route.ts`

**Lines:** 39
**Auth:** `protect` middleware (line 18)
**Routes:** `GET` (line 21), `POST` (line 31) → `answerStorySAQuestion` controller (line 19)

**Finding F-RA-B15-003 — Severity: LOW**
**Ghost GET handler.** Same pattern as File 1. Router registers only `router.post(answerStorySAQuestion)` (line 19) but `GET` is exported (lines 21–29). The GET handler will fail at the router level.

**Finding F-RA-B15-004 — Severity: LOW**
**`as any` type assertion on router.post.** Line 19.

**Verdict:** PASS with advisories. Same ghost-GET pattern.

---

### File 3: `apps/reading-advantage/app/api/v1/stories/[storyId]/[chapterNumber]/question/sa/route.ts`

**Lines:** 38
**Auth:** `protect` middleware (line 17)
**Routes:** `GET` (line 20), `POST` (line 30) → `getStorySAQuestion` controller (line 18, GET only)

**Finding F-RA-B15-005 — Severity: LOW**
**Ghost POST handler.** Inverse of Files 1–2. Router registers only `router.get(getStorySAQuestion)` (line 18) but `POST` is exported (lines 30–37). POST requests will fail at the router level.

**Verdict:** PASS with advisories. Auth gate present. Ghost handler is a correctness issue.

---

### File 4: `apps/reading-advantage/app/api/v1/stories/[storyId]/[chapterNumber]/route.ts`

**Lines:** 49
**Auth:** `protect` middleware (line 18)
**Routes:** `GET` → `getChapter` (line 19), `PUT` → `updateAverageRating` (line 20), `POST` → `logChapterRead` (line 21)

**Finding F-RA-B15-006 — Severity: LOW**
**Inconsistent `as any` usage.** Line 24 uses `as any` on `router.run()` result but lines 34, 44 do not. Minor inconsistency; no security impact.

**Finding F-RA-B15-007 — Severity: LOW**
**`as any` on all router method registrations.** Lines 19–21. Controller signatures unchecked at type level.

**Comment:** This is the first file in the batch that properly maps HTTP verbs to distinct controllers. The `PUT` for rating updates and `POST` for chapter-read logging are appropriate separations.

**Verdict:** PASS. All routes protected by `protect`. Controller-side auth/z enforcement depends on implementation.

---

### File 5: `apps/reading-advantage/app/api/v1/stories/[storyId]/route.ts`

**Lines:** 46
**Auth:** `protect` middleware (line 20)
**Routes:** `GET` → `getStoryById` (line 23), `DELETE` → `deleteStories` (line 26)

**Finding F-RA-B15-008 — Severity: LOW**
**Unused imports.** Line 4: `Role` imported but never referenced. Line 5: `handleRequest` imported but never used (the route uses its own inline `router.run()` logic).

**Comment:** The `DELETE` endpoint for story deletion is a destructive action. This route delegates to the `deleteStories` controller; the controller's internal authorization (role check, ownership check) must be verified separately.

**Verdict:** PASS. Auth present. Dead imports are a lint hygiene issue.

---

### File 6: `apps/reading-advantage/app/api/v1/stories/generate/route.ts`

**Lines:** 30
**Auth:** `restrictAccessKey` middleware (line 16) — API-key based authentication
**Routes:** `POST` only → `generateStories`

**Comment:** This endpoint uses `restrictAccessKey` rather than `protect`, which is appropriate for an automated content-generation endpoint that is called by a scheduler rather than a logged-in user. The `restrictAccessKey` middleware (from `auth-controller.ts` line 64) checks the `Access-Key` header against `process.env.ACCESS_KEY`.

**Finding F-RA-B15-009 — Severity: LOW**
**No input validation visible at route level.** The comment on line 19 documents the expected body shape (`{ amountPerGenre: number }`) but there is no Zod schema or explicit validation in the route file. The `generateStories` controller must handle validation internally.

**Finding F-RA-B15-010 — Severity: LOW**
**Discord webhook on auth failure may leak origin IP.** The `restrictAccessKey` middleware sends a Discord webhook with `userAgent` and `url` on auth failure (auth-controller.ts lines 75–99). While this is informational, the webhook URL is hardcoded in `sendDiscordWebhook` and could be a side-channel for unauthorized access attempts if webhook delivery is unreliable.

**Verdict:** PASS. API-key gate is correct for this endpoint's purpose.

---

### File 7: `apps/reading-advantage/app/api/v1/stories/route.ts`

**Lines:** 30
**Auth:** `protect` middleware (line 17)
**Routes:** `GET` → `getAllStories`

**Finding F-RA-B15-011 — Severity: LOW**
**Unused imports.** Line 4: `Role` imported but unused. Line 5: `handleRequest` imported but unused.

**Comment:** `getAllStories` likely returns all stories without tenant scoping — this is a known pattern in the legacy codebase. The controller's implementation determines whether school-level filtering is applied.

**Verdict:** PASS. Auth present. Dead imports.

---

### File 8: `apps/reading-advantage/app/api/v1/student/me/route.ts`

**Lines:** 27
**Auth:** `protect` middleware (line 15)
**Routes:** `GET` → `getStudentDashboard`

**Comment:** Clean, minimal route. Only `GET` exported (line 20), no ghost handlers. The `protect` middleware attaches the session user to the request, which the controller uses for scoping the dashboard to the authenticated student.

**Verdict:** PASS. Clean.

---

### File 9: `apps/reading-advantage/app/api/v1/system/dashboard/getArticleByTypeGenre/route.ts`

**Lines:** 26
**Auth:** `protect` middleware (line 15)
**Routes:** `GET` → `getArticlesByTypeGenre`

**Comment:** Clean route. The path prefix `/system/` suggests admin-level access; whether `protect` alone is sufficient depends on the controller's internal role check.

**Verdict:** PASS. Auth present.

---

### File 10: `apps/reading-advantage/app/api/v1/system/dashboard/route.ts`

**Lines:** 26
**Auth:** `protect` middleware (line 14)
**Routes:** `GET` → `getSystemDashboard`

**Comment:** Clean, thin route. Only GET exported (line 19). Delegates to `getSystemDashboard` controller.

**Verdict:** PASS.

---

### File 11: `apps/reading-advantage/app/api/v1/system/dashboard/xpBySchools/route.ts`

**Lines:** 27
**Auth:** `protect` middleware (line 14)
**Routes:** `GET` → `getTopSchoolsXp`

**Comment:** Clean route. Only GET exported (line 19).

**Verdict:** PASS.

---

### File 12: `apps/reading-advantage/app/api/v1/system/licenses/route.ts`

**Lines:** 29
**Auth:** `protect` middleware (line 17)
**Routes:** `GET` → `getSystemLicenses`

**Finding F-RA-B15-012 — Severity: LOW**
**Misleading `ExtendedNextRequest` params type.** Lines 7–11 declare `params: Promise<{ userId?: string }>` but the route path `/system/licenses` has no `[userId]` dynamic segment. The `userId` in params is vestigial/unused.

**Verdict:** PASS. No security impact.

---

### File 13: `apps/reading-advantage/app/api/v1/system/lowest-rated-articles/route.ts`

**Lines:** 68
**Auth:** `protect` middleware (line 11)
**Routes:** `GET` → inline `getLowestRatedArticles` handler (lines 15–58)

#### ⚠️ Finding F-RA-B15-013 — Severity: CRITICAL
**Direct DB access without tenant scoping.** Lines 19–31 perform a raw `db.select()` from the `articles` table with no school/tenant filtering:

```ts
const rows = await db
  .select({ ... })
  .from(articles)
  .where(isNotNull(articles.rating))
  .orderBy(asc(articles.rating))
  .limit(limit);
```

The `articles` table is classified as `REFERENTIAL` in the tenant registry (no `schoolId` column). It is scoped via the `authorId` FK → `users.schoolId`. This query does not join through that FK chain, so it **returns articles from ALL schools across the entire platform**, regardless of the authenticated user's school affiliation.

**Impact:** Any authenticated user (student, teacher, admin) can view the lowest-rated articles across all tenant schools. This is a cross-tenant data leak.

**Evidence:**
- `articles` table schema: `packages/db/src/schema/content.ts` line 7 — no `schoolId` column
- Tenant registry: `packages/domain/src/tenant-registry.ts` line 194 — `register(articles, "REFERENTIAL")`
- Route: uses raw `db` import (line 2), not `TenantDB`

#### Finding F-RA-B15-014 — Severity: HIGH
**Direct DB import bypasses `TenantDB` entirely.** Line 2 imports `db` directly from `@reading-advantage/db`. This is the only file in this batch (besides File 16) that does not delegate to a controller. The entire `reading-advantage` app has a known pattern of ~209 route files with direct DB access (per `measure/tracks.md` line 168). This file is a concrete example of the risk.

#### Finding F-RA-B15-015 — Severity: MEDIUM
**Unvalidated query parameter.** Line 17: `Number(req.nextUrl.searchParams.get("limit")) || 10`. If `limit` is a non-numeric string, `Number("abc")` returns `NaN`, which falls through to the default `10`. However, if `limit` is `"0"`, `Number("0")` is falsy and also defaults to `10`. A user intentionally requesting `limit=0` would still get 10 results. No upper bound or Zod validation.

#### Finding F-RA-B15-016 — Severity: LOW
**Error message exposure.** Lines 48–57: On error, the route returns `error.message` to the client. This could leak internal database error details (table names, column names, query structure) to an attacker.

```ts
error: error instanceof Error ? error.message : "Unknown error"
```

**Verdict:** FAIL. The cross-tenant data leak (F-RA-B15-013) is a **blocker**. This route must either:
1. Join through `authorId → users.schoolId` and filter by `user.schoolId`, or
2. Delegate to a controller/domain function that uses `TenantDB` with proper unscoped() handling.

---

### File 14: `apps/reading-advantage/app/api/v1/system/refresh-views/manual/route.ts`

**Lines:** 47
**Auth:** `protect` middleware (line 25)
**Routes:** `GET` → `getMaterializedViewsStatus` (line 28), `POST` → `refreshMaterializedViews` (line 31)

**Finding F-RA-B15-017 — Severity: MEDIUM**
**Comment claims SYSTEM role enforcement but `protect` doesn't enforce it.** The JSDoc on line 4 states "This endpoint requires SYSTEM role authentication." However, the middleware chain (lines 24–25) uses only `logRequest` + `protect`. The `protect` middleware (auth-controller.ts lines 13–29) authenticates **any valid user** regardless of role. The SYSTEM role enforcement, if it exists, must live inside `getMaterializedViewsStatus` and `refreshMaterializedViews` controllers. If the controllers don't check for `SYSTEM` role, any authenticated user could trigger materialized view refreshes — a potentially expensive operation.

**Verdict:** CONDITIONAL PASS. The route file itself is thin. The risk is on the controller implementation. Recommend adding `restrictTo("SYSTEM")` middleware (auth-controller.ts line 33) to make the role enforcement visible and enforceable at the route level.

---

### File 15: `apps/reading-advantage/app/api/v1/system/refresh-views/route.ts`

**Lines:** 52
**Auth:** `restrictAccessKey` (API-key based, line 30)
**Routes:** `GET` → `getAutomatedRefreshStatus` (line 33), `POST` → `refreshMaterializedViewsAutomated` (line 36)

**Comment:** Correctly uses `restrictAccessKey` for a Cloud Scheduler endpoint. The JSDoc (lines 1–11) clearly documents the design intent. No user session required.

**Finding F-RA-B15-018 — Severity: LOW**
**No rate limiting visible at route level.** A Cloud Scheduler calling this every 15 minutes is the expected usage, but there is no defense against more frequent calls if the access key is leaked. The controller should enforce rate limiting or idempotency.

**Verdict:** PASS. API-key gate is appropriate for automated infrastructure calls.

---

### File 16: `apps/reading-advantage/app/api/v1/system/school-classrooms/route.ts`

**Lines:** 336
**Auth:** Manual — `getCurrentUser()` call (line 19), role check (line 25)
**Routes:** `GET` only (line 17)
**Pattern:** Direct DB access throughout (no controller delegation)

#### ⚠️ Finding F-RA-B15-019 — Severity: HIGH
**Bypasses `protect` middleware.** This route does not use the `next-connect` router pattern with `protect` middleware. Instead, it directly calls `getCurrentUser()` (line 19) from `@/lib/session` and performs its own manual role check (line 25). While functionally equivalent, this bypasses the standardized auth pipeline used by every other route in this batch. If `protect` is later enhanced (e.g., to add audit logging, rate limiting, or session validation improvements), this route would not inherit those changes.

#### ⚠️ Finding F-RA-B15-020 — Severity: HIGH
**Direct DB access without `TenantDB` scoping.** Lines 40–153 contain 7+ raw `db.select()`/`db.Promise.all()` calls. None use `TenantDB`. The `licenseId` query parameter (line 30) is used for scoping, but:
- No validation on `licenseId` format (string, could be anything)
- The SYSTEM role user can query any school's classrooms — this may be intentional but should be explicit
- Tables like `classroomStudents`, `classroomTeachers`, `xpLogs` are queried without tenant verification

#### Finding F-RA-B15-021 — Severity: MEDIUM
**Student email exposure.** Lines 314–318 return student emails (`sc.email`) in the response payload. Student PII exposure to SYSTEM admins may be acceptable in this context, but it should be documented and audited.

#### Finding F-RA-B15-022 — Severity: MEDIUM
**Complex `.or()` clause with `undefined` fallback.** Lines 78–86:
```ts
.where(
  or(
    teacherClassroomIds.length > 0
      ? inArray(classrooms.id, teacherClassroomIds)
      : undefined,
    inArray(classrooms.teacherId, userIds),
    inArray(classrooms.createdBy, userIds)
  )
);
```
Passing `undefined` to `or()` inside Drizzle may produce unexpected SQL or a runtime error. This should use conditional `.where()` chaining instead.

#### Finding F-RA-B15-023 — Severity: MEDIUM
**No transaction boundary.** Lines 97–153 perform multiple parallel DB queries with `Promise.all` but no transaction. Between the license lookup (line 40) and the classroom queries (line 75), the license or user associations could change. This is a TOCTOU risk.

#### Finding F-RA-B15-024 — Severity: LOW
**Hardcoded `isOwner: true`.** Line 312: `isOwner: true` is hardcoded for all classrooms in the system view. This is misleading if the SYSTEM admin is not actually the owner of every classroom.

#### Finding F-RA-B15-025 — Severity: LOW
**Error message exposure.** Lines 330–334 return a generic "Internal server error" on catch, which is better than File 13's error.message leak. However, the `console.error` on line 330 logs the full error to the server console, which is acceptable.

**Verdict:** FAIL with reservations. The auth bypass pattern (F-RA-B15-019) and direct DB access (F-RA-B15-020) are significant findings. This is one of the ~209 "thick route handlers" identified in the monorepo audit stub (`measure/tracks.md` line 168). It should be migrated to a controller/domain function using `TenantDB`.

---

### File 17: `apps/reading-advantage/app/api/v1/system/school-xp/route.ts`

**Lines:** 29
**Auth:** `protect` middleware (line 17)
**Routes:** `GET` → `getSchoolXpData`

**Finding F-RA-B15-026 — Severity: LOW**
**Misleading `ExtendedNextRequest` params type.** Lines 7–11 declare `params: Promise<{ userId?: string }>` but the route path `/system/school-xp` has no `[userId]` dynamic segment. Same issue as File 12.

**Verdict:** PASS.

---

### File 18: `apps/reading-advantage/app/api/v1/teacher/class/[classroomId]/accuracy/route.ts`

**Lines:** 27
**Auth:** `protect` middleware (line 18)
**Routes:** `GET` → `getClassAccuracy` (line 20)

**Finding F-RA-B15-027 — Severity: LOW**
**Unique params attachment pattern.** Lines 24–25 manually attach `ctx.params` to the request object before calling `router.run`:
```ts
const requestWithParams = req as RequestWithParams;
requestWithParams.params = await ctx.params;
```
This is the only file in the batch that uses this pattern. All other routes rely on `next-connect`'s built-in `RequestContext` params resolution. The custom `RequestWithParams` interface (lines 11–13) also redundantly declares `params` that conflicts with `ExtendedNextRequest`'s existing `session` property. This works but is fragile — if `next-connect` changes how it resolves params, this could break silently.

**Finding F-RA-B15-028 — Severity: LOW**
**No `as any` on router registration.** Line 20: `router.get(getClassAccuracy)` — notably, this file does NOT use `as any` on the handler registration, unlike 14 other files in this batch.

**Verdict:** PASS. Functionally correct but pattern-inconsistent.

---

### File 19: `apps/reading-advantage/app/api/v1/teacher/class/[classroomId]/export/route.ts`

**Lines:** 35
**Auth:** `protect` middleware (line 24)
**Routes:** `GET` → `exportClassData` (line 27)

**Comment:** Clean, thin route. The JSDoc (lines 1–6) documents the export endpoint purpose. Only `GET` exported (line 29).

**Verdict:** PASS.

---

### File 20: `apps/reading-advantage/app/api/v1/teacher/class/[classroomId]/overview/route.ts`

**Lines:** 36
**Auth:** `protect` middleware (line 24)
**Routes:** `GET` → `getClassOverview` (line 27)

**Comment:** Clean, thin route. The JSDoc (lines 1–6) documents the overview endpoint purpose.

**Verdict:** PASS.

---

## Cross-Cutting Observations

### 1. `as any` Proliferation (14 of 20 files)

Most route files use `as any` to suppress TypeScript errors when registering handlers with `next-connect`. This masks type mismatches between controller signatures and expected handler types. A mis-typed controller (e.g., returning `void` instead of `NextResponse`) would not be caught at compile time.

**Affected files:** 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17, 19, 20
**Not affected:** 14 (unknown, used `as any` on line 28/31), 15 (unknown), 16 (no next-connect), 18 (no `as any`)

### 2. Ghost HTTP Method Handlers (Files 1–3)

Three files export HTTP method handlers that don't match any registered router method. This is not a security issue per se but indicates code that was never tested or exercised.

### 3. Auth Pipeline Consistency

15 of 20 files use `protect` middleware via `next-connect`. Two files (6, 15) use `restrictAccessKey` (API-key auth). One file (16) bypasses the pipeline entirely with manual `getCurrentUser()`. The auth surface is large and heterogeneous.

### 4. Tenant Scoping

Only 2 of 20 files access the database directly (13, 16). Of those, **neither** uses `TenantDB`. File 13 has a verified cross-tenant data leak. File 16 uses `licenseId` for manual scoping but is still fragile.

### 5. A2 Check (Consent-Blind Publish Gate)

None of the 20 files in this batch implement a publish/draft-status transition. The `articles` table has `isDraft` and `isPublished` columns, but the `lowest-rated-articles` route (File 13) only queries on `rating IS NOT NULL` — it does not filter by `isPublished`. This means draft/unpublished articles could appear in the "lowest rated" list, which is a data-quality issue but not a consent-blindness issue in the A2 sense (the publish gate itself is in a different route).

### 6. A6 Check (Registry Overstatement)

The track plan (`measure/tracks/reading_advantage_full_review_20260626/plan.md`) lists all 7 phases as `[x]` complete. The `phase-acceptance-result.json` is recorded as `pass`. This review batch (ra-batch-15) is part of Phase 1 (Auth, Roles, Tenant Boundaries) and Phase 3 (Teacher/Admin Features). The findings F-RA-B15-013 (cross-tenant data leak) and F-RA-B15-019 (auth pipeline bypass) confirm that the Phase 1 task "Quantify direct DB access in app routes and classify by risk" (plan.md line 20) correctly identified the problem class. The registry statement "209 route.ts files import db directly" (tracks.md line 168) is accurate — File 13 and File 16 are concrete examples. **No A6 overstatement detected in this batch.**

---

## Findings Summary

| ID | File | Severity | Description |
|----|------|----------|-------------|
| F-RA-B15-013 | 13 (lowest-rated-articles) | **CRITICAL** | Direct DB query on `articles` without tenant scoping — cross-tenant data leak |
| F-RA-B15-014 | 13 (lowest-rated-articles) | HIGH | Direct `db` import bypasses `TenantDB` |
| F-RA-B15-019 | 16 (school-classrooms) | HIGH | Bypasses `protect` middleware auth pipeline |
| F-RA-B15-020 | 16 (school-classrooms) | HIGH | Direct DB access without `TenantDB` scoping (7+ raw queries) |
| F-RA-B15-015 | 13 (lowest-rated-articles) | MEDIUM | Unvalidated `limit` query parameter |
| F-RA-B15-017 | 14 (refresh-views/manual) | MEDIUM | Comment claims SYSTEM role enforcement; `protect` alone doesn't enforce it |
| F-RA-B15-021 | 16 (school-classrooms) | MEDIUM | Student email exposure in response |
| F-RA-B15-022 | 16 (school-classrooms) | MEDIUM | `or()` with `undefined` fallback may produce unexpected SQL |
| F-RA-B15-023 | 16 (school-classrooms) | MEDIUM | No transaction boundary across multi-query operation |
| F-RA-B15-001 | 1 (rate) | LOW | Ghost GET handler for POST-only router |
| F-RA-B15-002 | 1 (rate) | LOW | `as any` on router registration |
| F-RA-B15-003 | 2 (questionNumber) | LOW | Ghost GET handler for POST-only router |
| F-RA-B15-005 | 3 (sa) | LOW | Ghost POST handler for GET-only router |
| F-RA-B15-008 | 5 ([storyId]) | LOW | Unused imports (`Role`, `handleRequest`) |
| F-RA-B15-011 | 7 (stories) | LOW | Unused imports (`Role`, `handleRequest`) |
| F-RA-B15-012 | 12 (licenses) | LOW | Vestigial `userId` in params type |
| F-RA-B15-016 | 13 (lowest-rated-articles) | LOW | Error message exposure (`error.message`) |
| F-RA-B15-018 | 15 (refresh-views) | LOW | No rate limiting at route level |
| F-RA-B15-024 | 16 (school-classrooms) | LOW | Hardcoded `isOwner: true` |
| F-RA-B15-026 | 17 (school-xp) | LOW | Vestigial `userId` in params type |
| F-RA-B15-027 | 18 (accuracy) | LOW | Non-standard params attachment pattern |

**Total findings:** 22 (1 Critical, 3 High, 5 Medium, 13 Low)

---

## Remediation Recommendations (Prioritized)

1. **[CRITICAL — File 13]** Add tenant scoping to `lowest-rated-articles` route: join `articles.authorId → users.schoolId` and filter by the authenticated user's `schoolId`. Or delegate to a domain function using `TenantDB` with `unscoped()`.

2. **[HIGH — File 16]** Migrate `school-classrooms` route to use the `next-connect` + `protect` middleware pattern. Move DB queries into a controller or domain function using `TenantDB`.

3. **[MEDIUM — File 13]** Add Zod validation for the `limit` query parameter with an upper bound.

4. **[MEDIUM — File 14]** Add explicit `restrictTo("SYSTEM")` middleware to `refresh-views/manual` to make role enforcement visible.

5. **[LOW — Files 1, 2, 3]** Remove ghost HTTP method exports or add proper 405 handling.

6. **[LOW — All files with `as any`]** Replace `as any` with proper type-safe handler registration.

---

MEASURE_AGENT_RESULT
