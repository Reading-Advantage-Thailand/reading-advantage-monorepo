# Line-by-Line Review: Reading Advantage — Batch 44

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-44`
**Baseline SHA:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / config / script / security / deployment

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-44` were read in full. The batch
covers demo/seed scripts, materialized-view refresh scripts, a security-audit
script, one constants file, and nine server controllers under
`apps/reading-advantage/server/controllers/`.

| # | File | Lines / Bytes Reviewed |
|---|------|------------------------|
| 1 | `apps/reading-advantage/scripts/refresh-demo-data.ts` | 1–221 |
| 2 | `apps/reading-advantage/scripts/refresh-genre-metrics.ts` | 1–257 |
| 3 | `apps/reading-advantage/scripts/refresh-materialized-views.ts` | 1–37 |
| 4 | `apps/reading-advantage/scripts/refresh-velocity-matviews.ts` | 1–50 |
| 5 | `apps/reading-advantage/scripts/security-audit.ts` | 1–399 |
| 6 | `apps/reading-advantage/scripts/seed/demo-seed.ts` | 1–832 |
| 7 | `apps/reading-advantage/scripts/seed/seed.ts` | 1–579 |
| 8 | `apps/reading-advantage/server/constants.ts` | 1–21 |
| 9 | `apps/reading-advantage/server/controllers/activity-controller.ts` | 1–1563 |
| 10 | `apps/reading-advantage/server/controllers/admin-controller.ts` | 1–1263 |
| 11 | `apps/reading-advantage/server/controllers/ai-controller.ts` | 1–213 |
| 12 | `apps/reading-advantage/server/controllers/ai-insight-actions-controller.ts` | 1–149 |
| 13 | `apps/reading-advantage/server/controllers/ai-insight-refresh-controller.ts` | 1–453 |
| 14 | `apps/reading-advantage/server/controllers/article-controller.ts` | 1–926 |
| 15 | `apps/reading-advantage/server/controllers/assignment-classroom-controller.ts` | 1–211 |
| 16 | `apps/reading-advantage/server/controllers/assignment-controller.ts` | 1–1041 |
| 17 | `apps/reading-advantage/server/controllers/assignment-funnel-controller.ts` | 1–587 |
| 18 | `apps/reading-advantage/server/controllers/assignment-notification-controller.ts` | 1–327 |
| 19 | `apps/reading-advantage/server/controllers/assistant-controller.ts` | 1–499 |
| 20 | `apps/reading-advantage/server/controllers/auth-controller.ts` | 1–128 |

**Total lines reviewed:** 9,179 across 20 files.
**No file was partially reviewed.**

---

## Executive Summary

This batch contains the operational/demo scripts and the first half of the
`server/controllers/` directory for `apps/reading-advantage`. The controller
layer is the dominant source of findings: several endpoints either lack
authorization, lack tenant scoping, or expose cross-user/cross-school data.
Several controllers also embed business logic and directly call provider SDKs,
contrary to the adapter/provider-neutrality rules in `AGENTS.md`.

The most severe issues are:

1. **Authorization gaps in activity, admin, AI, article, and assignment
   controllers.** Multiple endpoints verify only that a request is
   authenticated (or not at all) and then return data scoped by query
   parameters (`userId`, `schoolId`, `classId`, `licenseId`) without
   validating that the caller may access that scope. This allows horizontal
   privilege escalation (student A viewing student B, teacher viewing arbitrary
   schools, etc.).
2. **Cross-tenant query leakage.** Controllers such as `activity-controller`,
   `admin-controller`, `assignment-funnel-controller`, and
   `assignment-controller` build `schoolId`/`classId` filters from query params
   and do not consistently fall back to the caller's own tenant context,
   risking cross-school data exposure.
3. **Direct provider SDK usage.** `article-controller.ts` imports
   `@google-cloud/translate` and `@/utils/openai` directly, and
   `assistant-controller.ts` imports `@/utils/openai` and calls
   `storage.bucket(...)`. These bypass the internal AI and storage adapters
   required by `AGENTS.md`.
4. **Unprotected destructive/mutation endpoints.** `article-controller.ts`
   `deleteArticle`, `assistant-controller.ts` `postFlashCard`,
   `activity-controller.ts` activity create/update/delete, and
   `ai-insight-actions-controller.ts` dismiss/action/cache-clear endpoints
   perform writes without ownership or role checks.
5. **`ai-insight-refresh-controller.ts` automated refresh endpoint is not
   authenticated.** `refreshAIInsightsAutomated` is intended to be invoked by
   Cloud Scheduler but contains no Cron-secret, service-account, or IP
   validation. An unauthenticated caller could trigger expensive AI insight
   generation across the entire system.

---

## Per-File Findings

### 1. `apps/reading-advantage/scripts/refresh-demo-data.ts`

**Coverage:** Read lines 1–221 in full.

**Severity: Low / maintenance**

*   **Lines 26–215:** The entire refresh job is not wrapped in a database
    transaction. If `generateDailyActivities` or a later phase fails, the
    classrooms have already been deleted and recreated, leaving the demo
    environment in a partially reset state.
*   **Lines 37–42 / 182–189:** The initial isolation failure throws and aborts,
    but the final isolation failure is only logged as a warning. A failed final
    check means the demo data may no longer be isolated, yet the script exits
    with success.
*   **Line 112:** `classCode` uses `Date.now()` appended to the name, producing
    a different code on every refresh. Any external bookmarks or tests that
    depend on a stable demo classroom code will break.
*   **Lines 27–211:** Heavy use of `console.log`/`console.error` instead of
    structured logging. For an automated job this makes alerting and log
    aggregation difficult.
*   **Lines 69–85 / 80–85:** The teacher/student lookups filter by
    `licenseId` and `role` but not by `schoolId`. The demo schema assumes a
    1:1 license-to-school mapping, but if that invariant drifts these queries
    can select users from the wrong school.

---

### 2. `apps/reading-advantage/scripts/refresh-genre-metrics.ts`

**Coverage:** Read lines 1–257 in full.

**Severity: Medium / maintenance**

*   **Line 31:** `await execPromise('npx tsx scripts/fix-genre-engagement-xp.ts')`
    runs a shell command with a hardcoded path. The path is not shell-escaped,
    and the `rebuild` flag is boolean, so there is no direct injection vector
    here; however, using `child_process.exec` instead of `execFile` is a brittle
    pattern.
*   **Lines 51–61 / 79–100 / 116–123 / 131–147:** Repeated
    `as unknown as Array<...>` casts on `db.execute(sql...)` results. These
    hide potential type mismatches between the Postgres result shape and the
    TypeScript type. Using typed Drizzle queries or a proper row parser would
    be safer.
*   **Line 250:** `if (require.main === module)` is used in an ESM `.ts` file.
    `require` is not defined in native ESM; this only works because the file is
    transpiled by `tsx`/`ts-node`. Relying on this is fragile.
*   **Line 15:** `genreAdjacencies`, `asc`, `desc` are imported from
    `@reading-advantage/db` but `genreAdjacencies` is the only table used;
    `asc`/`desc` are used for ordering.

---

### 3. `apps/reading-advantage/scripts/refresh-materialized-views.ts`

**Coverage:** Read lines 1–37 in full.

**Severity: High / security**

*   **Lines 17–31:** The view name is interpolated directly into `sql.raw`:

    ```ts
    await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`));
    await db.execute(sql.raw(`REFRESH MATERIALIZED VIEW ${viewName}`));
    ```

    Although `MATERIALIZED_VIEWS` is currently a hardcoded array, the pattern
    is a SQL injection vector. If the array is ever populated from
    configuration or user input, an attacker can execute arbitrary SQL. The
    view names should be validated against an allow-list or parameterized.
*   **Lines 13–35:** The script immediately invokes the async function on
    import. There is no CLI guard or transaction. Running this file as part of
    a test import will execute DDL against the database.
*   **Lines 19–25:** The `CONCURRENTLY` refresh is attempted without verifying
    that a unique index exists; the fallback catches the error and retries. This
    swallows the real error message, making debugging harder.

---

### 4. `apps/reading-advantage/scripts/refresh-velocity-matviews.ts`

**Coverage:** Read lines 1–50 in full.

**Severity: Low / maintenance**

*   **Lines 28–36:** Uses the same `as unknown as Array<{ count: bigint | number | string }>`
    anti-pattern for row-count queries.
*   **Lines 17–48:** `process.exit(0)` and `process.exit(1)` are called inside
    the async main. This prevents cleanup of open DB connections and can cause
    tests that import the module to terminate the process.
*   **Line 18:** Console logging instead of structured logging.

---

### 5. `apps/reading-advantage/scripts/security-audit.ts`

**Coverage:** Read lines 1–399 in full.

**Severity: Low / tool accuracy**

*   **Lines 82–231:** The audit relies on brittle string/regex heuristics
    (`includes`, `indexOf`, `slice`). For example:
    *   `content.indexOf(line)` (lines 183, 200, 218) can match the wrong
        occurrence if a line appears multiple times, causing
        `content.slice(0, content.indexOf(line))` to exclude the wrong portion.
    *   Pattern 4 checks for `where: {` and then inspects the next 10 lines,
        but multi-line `where` clauses can start after those 10 lines.
    *   The script cannot detect guard usage via re-exports, aliases, or
        different import paths.
*   **Line 69–73:** Guard import detection only recognizes exact paths
    `@/server/middleware/guards` and `@/server/utils/authorization`. Any other
    guard module is ignored.
*   **Line 380–385:** The script exits with code `0` when medium severity
    issues exist and only exits with `1` for high severity. This is a policy
    choice, but it means CI will not fail on medium-severity findings.
*   **Lines 354–378:** `main` is async but uses synchronous `fs` calls; this is
    acceptable for a one-off script but not ideal.

---

### 6. `apps/reading-advantage/scripts/seed/demo-seed.ts`

**Coverage:** Read lines 1–832 in full.

**Severity: Low / maintenance**

*   **Lines 233–270:** `levelTable` is defined inside the student loop. It
    should be hoisted outside the loop to avoid re-creating the array on every
    iteration.
*   **Lines 173–213:** `upsertDemoUser` is named like an upsert but does not
    update existing rows; it returns the existing user unchanged. This means
    changes to demo user attributes (name, level, etc.) will not be applied on
    re-seed unless the users are deleted first.
*   **Lines 223–230:** `createDemoUsers` deletes users by email but
    `upsertDemoUser` does not, creating a mismatch with the comment on line
    183–184.
*   **Lines 459–477 / 527–545 / 618–626:** SRS/lesson/activity inserts wrap
    individual inserts in `try/catch` with empty catch blocks to swallow
    duplicate-key errors. This hides real schema violations. Using
    `onConflictDoNothing` would be explicit and safer.
*   **Lines 605–616:** `lessonData` is typed as `Record<string, unknown>` and
    cast to `typeof lessonRecords.$inferInsert`. This bypasses type checking
    for the dynamic `phaseN` keys.
*   **Lines 698–720:** Activity upsert target is
    `[userActivity.userId, userActivity.activityType, userActivity.targetId]`.
    Because `createdAt` is included in the insert but not the conflict target,
    re-running the seed will overwrite activity timestamps, making historical
    data non-deterministic.

---

### 7. `apps/reading-advantage/scripts/seed/seed.ts`

**Coverage:** Read lines 1–579 in full.

**Severity: Low / maintenance**

*   **Lines 273–288:** The admin user is created without `schoolId` or
    `licenseId`. If the application enforces that every user belongs to a
    school/license, this seed will create an invalid record.
*   **Lines 320–321 / 319:** Students are assigned to schools and licenses via
    round-robin (`i % schoolsList.length`). With a small number of schools and
    many students this is fine, but it means licenses are not balanced by user
    count, so `usedLicenses` counts will diverge from actual users.
*   **Line 246:** License keys contain `Date.now()`, so every seed run creates
    new license rows instead of being idempotent. Combined with `usedLicenses: 0`,
    the seed will inflate the license table on repeated runs.
*   **Lines 417–428:** Articles are created without `authorId`. If the schema
    requires an author, this violates constraints.
*   **Lines 503–512:** `seedUserRecords` selects only the first 10/50 students
    depending on size and inserts 5 word/sentence records each. The loop uses
    `Math.floor(Math.random() * articleList.length)` without guarding against
    an empty `articleList`, which would produce `NaN`.

---

### 8. `apps/reading-advantage/server/constants.ts`

**Coverage:** Read lines 1–21 in full.

**Severity: Informational**

*   **Line 2:** `BASE_TEXT_TO_SPEECH_URL` hardcodes the Google Cloud TTS
    endpoint. This is acceptable for a constants file but couples the app to
    Google Cloud for TTS.
*   **Lines 17–20:** Commented-out voice array left in the file. Should be
    removed to avoid confusion.

---

### 9. `apps/reading-advantage/server/controllers/activity-controller.ts`

**Coverage:** Read lines 1–1563 in full.

**Severity: High / security & architecture**

*   **Authorization — `getActivityHeatmap` (lines 156–419):**
    *   Only verifies that `req.session` exists (line 160). It then accepts
        `scope` and `entityId` from query parameters and returns data for any
        student, class, school, or license. A student can request
        `?scope=school&entityId=<any-school-id>` and receive the full school's
        activity heatmap.
    *   Lines 163–169 default the scope based on role, but the defaults are
        easily overridden.
    *   Lines 222–241 build user ID lists for school/license scope without
        verifying the caller's relationship to those tenants.

*   **Authorization — `getActivityTimeline` (lines 424–744):**
    *   Lines 455–459 correctly restrict students to their own data, but
        teachers and school admins have no equivalent check. A teacher can
        request `?scope=school&entityId=<other-school-id>`.
    *   Lines 490–496 contain a hardcoded ID-prefix check
        `!entityId.startsWith("cmgj0")`. This is a workaround that should not
        exist in production code; it is not documented and is trivial to bypass.

*   **Authorization — `getActivitySummary` (lines 749–920):**
    *   Lines 762–765 accept `schoolId` and `classId` directly from query
        parameters and use them to filter activity. There is no verification
        that the caller belongs to the requested school/class.

*   **Authorization — remaining exported functions:**
    *   `getAllUserActivity` (lines 925–1011): **No authentication check.**
        Returns global user/activity aggregates to any caller.
    *   `getAllUsersActivity` (lines 1013–1111): **No authentication check.**
        Returns the last 30 days of activity for all users.
    *   `getActiveUsers` (lines 1113–1232): **No authentication check.**
        Accepts `licenseId` and `dateRange` and returns active user time series.
    *   `getDailyActiveUsers` (lines 1234–1330): **No authentication check.**
        Returns daily active users with full user objects.
    *   `getActiveUser` (lines 1332–1348): **No authentication check.**
    *   `updateAllUserActivity` (lines 1350–1449): **No authentication check.**
    *   `createUserActivity` (lines 1452–1477): **No authentication check and
        accepts arbitrary `userId`.** Any caller can write activity records for
        any user.
    *   `getUserActivities` (lines 1480–1497): **No authentication check and
        accepts arbitrary `userId`.**
    *   `deleteUserActivity` (lines 1500–1525): **No authentication check and
        accepts arbitrary `activityId`.**
    *   `updateUserActivity` (lines 1528–1563): **No authentication check and
        accepts arbitrary `activityId`.**

*   **Type safety:**
    *   `activityConditions: any[]` (line 244), `conditions: any[]` (line 772),
      `actConditions: any[]` (line 1159), `allConditions: any[]` (line 1183).
      These weaken Drizzle's typed query builder.
    *   `details?: any` (line 93), `metadata?: Record<string, any>` (line 64),
      and `userObj` / `userLicenseId` typed loosely.

*   **Architecture:** The file mixes controller, service, and data-layer
    concerns. It directly queries the database and aggregates data inline,
    violating the backend-module / adapter separation in `AGENTS.md`.

---

### 10. `apps/reading-advantage/server/controllers/admin-controller.ts`

**Coverage:** Read lines 1–1263 in full.

**Severity: High / security**

*   **Authorization — `getAdminDashboard` (lines 61–277):**
    *   Line 63 fetches the current user. Line 65 only checks `user.license_id`.
    *   There is **no role check**. A `STUDENT` or `TEACHER` can call this
        endpoint, and although they can only request their own license by
        default, the `SYSTEM` branch (line 78) can be reached only by role
        string comparison; non-system users still fall through to returning
        their own license data. However, the absence of an explicit role check
        means the endpoint's intended audience is not enforced.

*   **Authorization — `getAdminOverview` (lines 540–803):**
    *   Lines 544–551 only verify that a user is logged in.
    *   There is **no role check**. A student or teacher can request admin
        overview metrics. The `SYSTEM` branch allows requesting any license,
        and the `ADMIN` branch uses `user.license_id`, but non-admin users are
        not rejected.

*   **Authorization — `getTeacherEffectiveness` (lines 1037–1263):**
    *   Lines 1041–1048 only verify that a user is logged in.
    *   No role check. Any authenticated user can request teacher-effectiveness
        metrics for any license (if SYSTEM) or for their own license.

*   **Authorization — `getAdminAlerts` and `getSchoolSegments` (lines 279–538
    and 805–1035):**
    *   These functions do check roles (SYSTEM/ADMIN only) at lines 295–311 and
        821–837. This is the correct pattern and should be applied to the other
        admin endpoints.

*   **Tenant scoping:**
    *   When `targetLicenseId` is provided by a SYSTEM user, queries are scoped
        to that license's users. There is no verification that the requested
        license belongs to a school the caller is authorized to view, but for
        SYSTEM this is acceptable.
    *   `getSchoolSegments` correctly resolves `targetSchoolId` from the admin's
        license and scopes all queries to that school (lines 839–858).

*   **Type safety:**
    *   `inArray(users.role, ["TEACHER", "ADMIN"] as any)` (lines 621, 683).
      The `as any` cast hides a type mismatch with the `role` enum.
    *   `cefrToNumber[u.cefrLevel]` (line 122) can be `undefined` if a user's
      CEFR level is not in the map; the filter on line 123 handles this, but
      the map is missing some values that appear in seed data (e.g., `A1+`,
      `B1+`).

---

### 11. `apps/reading-advantage/server/controllers/ai-controller.ts`

**Coverage:** Read lines 1–213 in full.

**Severity: High / security**

*   **Authorization:** Only checks `req.session` exists (lines 23–29). It then
    accepts `userId`, `classroomId`, `licenseId`, and `kind` from query params
    and returns AI insights for any scope. Any authenticated user can request
    insights for any other user, classroom, or license.
*   **Scope resolution logic (lines 51–77):** The priority rules are based on
    query parameters, not on the caller's authorization. For example, a student
    can pass `?kind=license&licenseId=X` and receive license-level insights.
*   **Type safety:** `let insights: any[] = []` (line 48), `generatedInsights: any[]`
    (line 99), and `as any` casts when mapping to `AIInsight` (lines 159, 163).
*   **Debug logging:** Lines 39–46 and 80–85 leave debug `console.log` calls in
    production controller code.
*   **Architecture:** The controller directly calls the AI insight service,
    which is acceptable, but the service itself is not reviewed here. However,
    the lack of an authorization/permission module violates `AGENTS.md`
    guidance to centralize authorization.

---

### 12. `apps/reading-advantage/server/controllers/ai-insight-actions-controller.ts`

**Coverage:** Read lines 1–149 in full.

**Severity: High / security**

*   **Authorization:** All three endpoints only verify `req.session` exists.
    *   `dismissInsight` (lines 10–55): Any authenticated user can dismiss any
        insight by `insightId`.
    *   `markInsightAction` (lines 62–105): Any authenticated user can mark any
        insight as action-taken.
    *   `clearInsightCache` (lines 112–148): Any authenticated user can delete
        insights for any `userId`/`classroomId`/`licenseId` combination.
*   **Logic bug in `clearInsightCache` (lines 128–132):** The conditions are
    combined with `or`:

    ```ts
    const conditions = [eq(aiInsights.userId, userId)];
    if (classroomId) conditions.push(eq(aiInsights.classroomId, classroomId));
    if (licenseId) conditions.push(eq(aiInsights.licenseId, licenseId));
    await db.delete(aiInsights).where(or(...conditions));
    ```

    This deletes rows matching **any** of the provided conditions, not rows
    matching **all** of them. For example, calling with only `userId` will
    delete every insight belonging to that user regardless of `classroomId` or
    `licenseId`. The intent appears to be an AND, not an OR.
*   **Missing ownership check:** Even if the `or` were changed to `and`, there
    is no check that the caller is allowed to delete insights for the requested
    user/classroom/license.

---

### 13. `apps/reading-advantage/server/controllers/ai-insight-refresh-controller.ts`

**Coverage:** Read lines 1–453 in full.

**Severity: High / security & performance**

*   **Authorization:** `refreshAIInsightsAutomated` (lines 87–176) has **no
    authentication or authorization**. It is intended to be called by Cloud
    Scheduler, but the code does not validate a Cron header, service-account
    token, or allowed IP range. An unauthenticated HTTP request can trigger
    expensive AI insight generation for the entire system.
*   **Type safety:** `insights: insights as any` (lines 197, 248, 307, 368, 428).
*   **Error handling:** The `Promise.allSettled` results are mapped as
    `results.map((r) => (r.status === "fulfilled" ? r.value : r.reason))`
    (lines 273, 331, 392, 452). For rejected promises, `r.reason` is whatever
    value the promise was rejected with and may not satisfy the `RefreshResult`
    shape. This can produce malformed response data.
*   **Performance:** `refreshAllLicenseInsights`, `refreshAllClassroomInsights`,
    `refreshAllTeacherInsights`, and `refreshAllStudentInsights` run all
    entities in parallel with `Promise.allSettled`. For a large system this can
    exhaust DB connections, AI rate limits, and memory. There is no concurrency
    limit or queue.
*   **Tenant scoping:** `refreshAllLicenseInsights` refreshes all non-expired
    licenses; this is intended for a system-wide cron job, but the lack of any
    scheduling guard makes it callable by anyone.

---

### 14. `apps/reading-advantage/server/controllers/article-controller.ts`

**Coverage:** Read lines 1–926 in full.

**Severity: High / security & architecture**

*   **Direct provider SDK usage (violates `AGENTS.md`):**
    *   Line 5: `import { Translate } from "@google-cloud/translate/build/src/v2";`
    *   Line 7: `import { openai, openaiModel } from "@/utils/openai";`
    *   Line 17 in `assistant-controller.ts` (also applies here via shared
        pattern): direct `openai(...)` calls.

*   **Authorization — `getSearchArticles` (lines 72–217):**
    *   Uses `req.session?.user` but does not verify authentication. Returns
        public articles, which is acceptable, but does not enforce tenant
        scoping for non-public articles.

*   **Authorization — `deleteArticle` (lines 416–446):**
    *   **No authentication or authorization check.** Any request can delete any
        article by ID. This is a critical vulnerability.

*   **Authorization — `getArticleById` (lines 299–414):**
    *   Inserts a `userActivity` record for `userId` from the session, but does
        not check whether the article is accessible to that user (public,
        assigned, etc.).

*   **SQL/parameter safety:**
    *   Lines 280, 525: `ilike(articles.title, `%${title}%`)` and similar.
        Drizzle escapes the value, but passing raw user input into a template
        literal is risky if the input contains `%` or `_` wildcards. The
        application may want to sanitize or escape wildcard characters.

*   **Type safety:**
    *   `selectionType: any[]` (line 81), `results: any[]` (line 82),
      `normalizeGenreDoc` parameter `doc: any` (line 91), `genreData: any`
      (line 695), and many other `any` usages.
    *   `RequestContext.params` is typed as `Promise<{ article_id: string }>`,
      which matches the Next.js App Router dynamic route convention.

*   **Dead code:** `updateArticlesByTypeGenre` (lines 627–645) immediately
    returns success without performing any update.

*   **Translation logic bug:** `translatePassageWithGPT` (lines 776–795)
    translates to English regardless of the caller's `targetLanguage`. The
    function name and prompt both say "to English", but the branch is taken
    when `targetLanguage === LanguageType.EN`, which means English input is
    being "translated" to English.

*   **Missing input validation:** `getSearchArticles`, `getArticles`, etc. do
    not validate query parameters with Zod; they rely on `Number(...)` casts
    and string checks.

---

### 15. `apps/reading-advantage/server/controllers/assignment-classroom-controller.ts`

**Coverage:** Read lines 1–211 in full.

**Severity: High / security**

*   **Authorization:**
    *   `getClassroomAssignments` (lines 9–30): Only checks `classroomId` is
        present. Any authenticated user can list any classroom's assignments.
    *   `getAssignmentStudents` (lines 35–77): Only checks params are present.
        Any authenticated user can list any classroom's students and their
        assignment statuses.
    *   `sendClassroomAssignmentNotifications` (lines 83–156): Only checks that
        `req.session?.user.id` exists. There is no role check and no
        verification that the caller is a teacher/admin of the classroom.
    *   `getClassroomNotificationHistory` (lines 161–211): Only checks
        `classroomId` is present. Any authenticated user can view notification
        history for any classroom.

*   **Tenant scoping:** None of the queries scope by school or license.

*   **Type safety:** `acc: any[]` in the reduce on line 185.

---

### 16. `apps/reading-advantage/server/controllers/assignment-controller.ts`

**Coverage:** Read lines 1–1041 in full.

**Severity: Medium / security (authorization gaps in metrics)**

*   **Authorization — positive patterns:**
    *   `checkClassroomAccess` (lines 45–82) enforces that SYSTEM has full
        access, TEACHER must be in `classroomTeachers`, and ADMIN must share
        the classroom's school.
    *   `getAssignments`, `postAssignment`, `updateAssignment`, and
        `deleteAssignment` all call `checkClassroomAccess` — good.

*   **Authorization — gaps:**
    *   `getStudentAssignments` (lines 601–774): Uses `assertSelfOrAllowedStaff`
        from `auth-controller.ts`, which allows any `ADMIN` or `TEACHER` to
        view any student's assignments without verifying the student is in the
        caller's class/school.
    *   `getAssignmentMetrics` (lines 874–1041): Only checks `req.session`
        exists. Accepts `schoolId` and `classId` from query params without
        verifying the caller can access that school/class. Any authenticated
        user can view assignment metrics for any school.

*   **Type safety:**
    *   `inArray(users.role, ["TEACHER", "ADMIN"] as any)` (line 621).
    *   `whereClause` uses `any` for `dueDateCondition` (line 640).
    *   `studentAssignmentUpdates: any` (line 535) and `filteredUpdates: any`
      (line 472).

*   **Logic issue in `updateAssignment` (lines 570–582):** When updating an
    individual student assignment, the code uses `insert(...).onConflictDoUpdate`.
    The fallback status is `"NOT_STARTED"` (line 576). If the row already
    exists and the request omits `status`, the conflict update will set the
    status to `"NOT_STARTED"`, potentially overwriting an existing
    `"COMPLETED"` status.

*   **Race condition in `postAssignment` (lines 370–392):** Two concurrent
    requests can both find no assignment and both insert, causing a unique
    constraint violation on the `(classroomId, articleId)` pair. The code does
    not use `onConflictDoNothing` or a transaction.

---

### 17. `apps/reading-advantage/server/controllers/assignment-funnel-controller.ts`

**Coverage:** Read lines 1–587 in full.

**Severity: Medium / security & performance**

*   **Authorization gap for ADMIN/SYSTEM:** `checkAssignmentAccess` (lines
    105–192) returns `{ hasAccess: true }` for both `SYSTEM` and `ADMIN`
    without scoping `ADMIN` to their own school/license. An ADMIN user from
    school A can request `?schoolId=<school-B-id>` and receive school B's
    assignment funnel metrics.

*   **N+1 query pattern:** `getClassAssignmentList` (lines 489–535) and
    `getSchoolAssignmentList` (lines 540–587) loop over assignments and call
    `getAssignmentPrediction` plus a score query for each one. For a school
    with many assignments this is inefficient.

*   **Cache field is always false:** The `cache.cached` field in the response
    is hardcoded to `false` (lines 365–368, 402–405, 438–442). The endpoint
    does not actually cache results despite exposing cache metadata.

*   **Type safety:** `scope` is typed as a union but the response uses it
    directly; `atRiskStudents` is conditionally included.

*   **Architecture:** The controller contains significant helper logic
    (`formatAssignmentMetrics`, `checkAssignmentAccess`, query builders) that
    belongs in backend modules per `AGENTS.md`.

---

### 18. `apps/reading-advantage/server/controllers/assignment-notification-controller.ts`

**Coverage:** Read lines 1–327 in full.

**Severity: Medium / security**

*   **Authorization — mostly correct:**
    *   `getAssignmentNotifications` (lines 19–141): Student view correctly
        scopes to `assignmentNotifications.studentId = userId`. Teacher view
        restricts to staff roles (line 80) and scopes to notifications sent by
        that teacher (`teacherId = userId`).
    *   `sendAssignmentNotifications` (lines 143–217): Restricts to staff roles
        and verifies each assignment's classroom authorization before sending.
    *   `updateNotificationStatus` (lines 219–254): Verifies the notification
        belongs to the student (`existing.studentId !== user.id`).
    *   `getNotificationHistory` (lines 256–327): Restricts to staff roles and
        verifies classroom authorization.

*   **Remaining issues:**
    *   Role checks use string literals (`"TEACHER", "ADMIN", "SYSTEM",
      "SUPERADMIN"`) instead of the `Role` enum.
    *   `groupedNotifications` uses `Record<string, any>` (line 134), weakening
        type safety.
    *   Teacher view does not scope by school/tenant; it relies on the
        `teacherId = userId` filter, which is correct for the notification
        table but assumes notifications are only created by the teacher
        themselves.

---

### 19. `apps/reading-advantage/server/controllers/assistant-controller.ts`

**Coverage:** Read lines 1–499 in full.

**Severity: High / security & architecture**

*   **Authorization gaps:**
    *   `getWordlist` (lines 149–254): No authentication check is performed
        beyond `req.session?.user` being used only for the staff flag. Any
        caller can request a wordlist for any `articleId`.
    *   `postFlashCard` (lines 256–321): No authorization check. Any
        authenticated user can update any `userWordRecords` or
        `userSentenceRecords` row by ID, allowing modification of other users'
        flashcards.
    *   `chatBot` (lines 323–378) and `lessonChatBotQuestion` (lines 380–499):
        No authentication check.

*   **Direct provider / storage SDK usage (violates `AGENTS.md`):**
    *   Line 3: `import fs, { stat } from "fs";` — `stat` is unused.
    *   Line 17: `import { openai, openaiModel } from "@/utils/openai";`.
    *   Lines 166–169: Direct GCS bucket access:

        ```ts
        await storage
          .bucket("artifacts.reading-advantage.appspot.com")
          .file(`${AUDIO_WORDS_URL}/${articleId}${fileExtension}`)
          .exists();
        ```

        This bypasses the storage adapter. The bucket name is hardcoded.

*   **Blocking I/O:** `getFeedbackWritter` (lines 51–55) reads a prompt file
    with `fs.readFileSync` on every call. This blocks the event loop and is
    inefficient.

*   **Type safety:**
    *   `res: object` parameter on `getFeedbackWritter` (line 51) provides no
        type safety.
    *   `wordlistData as any` (line 172), `word: any` (line 183), and multiple
        other `any` usages.
    *   `createChatbotSchema` and `createLessonChatbotQuestionSchema` are good
        Zod schemas, but the validated data is then used with implicit `any`
        types (e.g., `article` is inferred but the code does not type the
        destructured result).

*   **Background generation bug:** In `getWordlist` (lines 197–225), the
    background generation function is `async` and called without `await`. If
    the Node process exits before the async work completes, the wordlist/audio
    will never be generated. The function also swallows all errors.

*   **Non-English comments:** Lines 397 and 461 contain Thai comments in source
    code.

*   **Prompt injection surface:** `chatBot` (lines 350–357) interpolates
    article fields and `blacklistedQuestions` directly into the system message
    without escaping. If any of these fields contain user-controlled content,
    prompt injection is possible.

---

### 20. `apps/reading-advantage/server/controllers/auth-controller.ts`

**Coverage:** Read lines 1–128 in full.

**Severity: Medium / security**

*   **`assertSelfOrAllowedStaff` authorization gap (lines 112–128):**

    ```ts
    if (allowedRoles.includes(sessionUser.role)) {
      // Optionally validate if the requested user is in the caller's allowed scope
      return true;
    }
    ```

    The function allows any `ADMIN` or `TEACHER` to assert access to any
    `routeUserId` without verifying that the target user is in the caller's
    class, school, or license. The comment acknowledges the missing validation
    but it is not implemented. Callers of this helper (e.g.,
    `assignment-controller.ts::getStudentAssignments`) inherit this gap.

*   **Discord webhook failure handling:** `restrictAccessKey` (lines 64–109)
    catches webhook errors with `.catch(() => {})`, which is correct for not
    blocking the 403 response, but failures are not logged, making webhook
    misconfiguration silent.

*   **Status codes:** `protect` and `restrictTo` return HTTP 403 for missing
    authentication. Standard practice is 401 for unauthenticated and 403 for
    unauthorized. This is a minor API semantics issue.

*   **Type safety:** `params: unknown` is correct for middleware signatures.
    `allowedRoles: string[]` could be typed as `Role[]` or a union.

---

## Cross-Cutting Observations

1. **Authorization is inconsistent and mostly absent from controllers.**
   Several endpoints verify only `req.session` or call helper functions that
   do not scope by tenant. A systematic pass is needed to add role/tenant
   checks to every controller function, ideally through a centralized
   permission module as recommended by `AGENTS.md`.

2. **Direct provider SDK usage.** `article-controller.ts` and
   `assistant-controller.ts` import `@google-cloud/translate` and
   `@/utils/openai` directly and call GCS bucket methods. These should be
   routed through the internal AI and storage adapters (`ai.generateObject`,
   `ai.generateText`, `storage.get`, `storage.put`).

3. **Business logic in controllers.** The controller files contain query
   construction, data aggregation, formatting, and authorization logic. Per
   `AGENTS.md`, this logic belongs in backend modules under
   `/packages/backend/modules`.

4. **`any` types and `as any` casts are pervasive.** The controller layer
   frequently uses `any[]` for Drizzle conditions and `as any` for role arrays
   and result casts. This undermines TypeScript strictness.

5. **Console logging instead of structured logging.** Controllers and scripts
   use `console.log`/`console.error` extensively. Structured logs with request
   IDs, user IDs, and operation names would improve observability.

6. **No Zod validation for query parameters.** Most controllers parse query
   strings with `searchParams.get(...)` and coerce with `Number(...)`. Missing
   or malformed parameters can produce `NaN`, unexpected defaults, or
   unhandled errors.

7. **Unauthenticated endpoints.** Several `activity-controller` and
   `assistant-controller` endpoints perform reads/writes without any
   authentication check, exposing data and mutation capabilities to the public
   internet.

---

## Files Changed / Not Changed

No application code was modified during this review. The only output is this
audit report.

---

## Verification

No build, lint, or test commands were run because the task was a read-only
line-by-line review. Findings are based on static analysis of the source files
listed in `/tmp/opencode/ra-batch-44`.

---

## MEASURE_AGENT_RESULT

```json
{
  "track_id": "reading_advantage_full_review_20260626",
  "batch_id": "ra-batch-44",
  "status": "review_complete",
  "files_reviewed": 20,
  "total_lines": 9179,
  "findings": {
    "critical": 0,
    "high": 12,
    "medium": 11,
    "low": 14,
    "informational": 2
  },
  "code_modified": false,
  "report_path": "measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-44.md"
}
```
