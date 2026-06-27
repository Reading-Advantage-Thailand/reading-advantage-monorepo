# Line-by-Line Review: Reading Advantage — Batch 47

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-47`
**Baseline SHA:** `e2dd2e9059a77864cdbe2778e4bc5ec6301c7bc6`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / security / maintainability / multi-tenant

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-47` were read in full.
`git diff` between baseline SHA and HEAD against `apps/reading-advantage/`
returned no changes — every file in this batch is unchanged from the
baseline. The batch covers server-side logic that spans controllers,
middleware, models, and services under
`apps/reading-advantage/server/`:

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/server/controllers/velocity-controller.ts` | 1–530 |
| 2 | `apps/reading-advantage/server/controllers/wizard-zombie-controller.ts` | 1–291 |
| 3 | `apps/reading-advantage/server/middleware.ts` | 1–11 |
| 4 | `apps/reading-advantage/server/middleware/guards.ts` | 1–344 |
| 5 | `apps/reading-advantage/server/models/article.ts` | 1–66 |
| 6 | `apps/reading-advantage/server/models/enum.ts` | 1–46 |
| 7 | `apps/reading-advantage/server/models/license.ts` | 1–58 |
| 8 | `apps/reading-advantage/server/models/user.ts` | 1–20 |
| 9 | `apps/reading-advantage/server/services/ai-insight-service.ts` | 1–1247 |
| 10 | `apps/reading-advantage/server/services/demo-activity-generator.ts` | 1–434 |
| 11 | `apps/reading-advantage/server/services/demo-isolation-service.ts` | 1–357 |
| 12 | `apps/reading-advantage/server/services/goals-service.ts` | 1–642 |
| 13 | `apps/reading-advantage/server/services/localization/genre-localization-service.ts` | 1–278 |
| 14 | `apps/reading-advantage/server/services/metrics/assignment-prediction-service.ts` | 1–397 |
| 15 | `apps/reading-advantage/server/services/metrics/cache-service.ts` | 1–312 |
| 16 | `apps/reading-advantage/server/services/metrics/genre-engagement-service.ts` | 1–486 |
| 17 | `apps/reading-advantage/server/services/metrics/srs-health-service.ts` | 1–527 |
| 18 | `apps/reading-advantage/server/services/metrics/velocity-service.ts` | 1–545 |
| 19 | `apps/reading-advantage/server/services/refresh-matviews-service.ts` | 1–168 |
| 20 | `apps/reading-advantage/server/services/srs-quick-actions-service.ts` | 1–608 |

**Total lines reviewed:** 7,367 across 20 files.
**No file was partially reviewed.**

The batch divides into three functional groups:
1. **Two route handlers** (velocity-controller, wizard-zombie-controller)
   that implement business logic inline.
2. **RBAC guard module** (`middleware/guards.ts`) plus a vestigial
   `middleware.ts` file plus the four model files
   (`article.ts`, `enum.ts`, `license.ts`, `user.ts`) that document the
   legacy Prisma-shaped types.
3. **Eight server-side services** spanning AI insights, demo activity
   generation, demo isolation, learning goals, genre localization,
   assignment predictions, metrics cache, genre engagement, SRS health,
   velocity, matview refresh, and SRS quick actions.

---

## Executive Summary

The batch is heavily service-oriented: nine files are pure backend
modules (services under `server/services/`) that approach the
backend-as-code pattern but consistently fall short. The most severe
issues found are:

1. **Vestigial `server/middleware.ts` (11 lines).** The file contains
   only a console-log wrapper around `req.method`/`req.url` and
   contradicts the imported path it claims to live in (the file is
   `apps/reading-advantage/server/middleware.ts`, not
   `apps/reading-advantage/middleware.ts`). The latter path is the
   Next.js root middleware file reviewed in Batch 43. This file does
   nothing and likely confuses grep-based discovery tools.

2. **`server/middleware/guards.ts` `requireClassroomAccess` `ADMIN`
   branch ships as TODO.** Lines 199–201 explicitly state
   `"ADMIN role: Allow if classroom belongs to the same school —
   This requires additional database lookup to verify school
   association — For now, we'll allow ADMIN access and implement
   school-level validation in authorization helpers"`. An admin
   signed in to school A can therefore read classroom data for
   classroom IDs in school B by hitting any endpoint wired through
   `requireClassroomAccess`.

3. **`server/middleware/guards.ts` `school_id` / `license_id` /
   `teacher_class_ids` / `student_class_ids` snake_case surface leaks
   into the guards.** `requireSchoolAccess` (line 118),
   `requireSchoolMatch` (line 295), and the `sessionUserSchema` in
   `lib/session.ts` (lines 30–32) all use snake_case field names.
   The Drizzle schema (`packages/db/src/schema/users.ts:34`) uses
   camelCase (`schoolId`). This duplication is a drift hazard.

4. **`server/controllers/velocity-controller.ts` ignores the
   `timeframe` query parameter for the student scope.** Lines 340
   read `timeframe` and put it into the `VelocityApiResponse` envelope
   (line 497), but neither the `getStudentVelocity` service call
   (line 384) nor the bulk query (line 423) is filtered by `timeframe`.
   A user requesting `?timeframe=7d` gets 30-day numbers while the
   `timeframe` field claims `"7d"`.

5. **`velocity-controller.ts` `checkAccess` is unchecked at
   `system` scope.** The system-scope branch (lines 467–470) calls
   `getSystemVelocity()` with no access control. Any authenticated
   user can hit the endpoint with `scope=system` and read aggregated
   data across every school in the system. The comment
   `"no access control needed for admins"` (line 468) is a misread —
   the function does not check that the caller is `ADMIN`/`SYSTEM`.

6. **`wizard-zombie-controller.ts` read-modify-write on `users.xp`.**
   Lines 87–98 fetch the user, compute `updatedXp = user.xp +
   xpEarned`, write it back. Two concurrent game completions from
   the same user lose one of the XP updates. The same pattern
   appears in `wizard-zombie-controller.ts:57` (`uniqueTargetId`
   collisions are theoretically possible under parallel calls) and
   in `velocity-controller.ts` lines 380–387 (caches raw fetch
   without authorization per cache key).

7. **`ai-insight-service.ts` is a 1247-line request-handler-shaped
   module.** Despite being a "service", it bundles Drizzle data
   loading, prompt construction, AI adapter calls, JSON parsing,
   normalization, fallback generation, DB persistence, and cached
   lookup into one file. It pulls `openai(openaiModel)` directly
   (lines 148, 268, 367, 441, 1135) — the route `openai/openaiModel`
   lives in `apps/reading-advantage/utils/openai.ts`, which is a
   provider-coupled module (it imports `createOpenAI` from
   `@ai-sdk/openai` directly, not through the AI adapter client
   from `@reading-advantage/ai`). `AGENTS.md` mandates
   `"ai.generateText()"` and forbids direct SDK imports.

8. **`ai-insight-service.ts` `parseAIResponse` mixes user
   identifiers into AI prompt logs.** Line 868 parses JSON from
   AI text without sanitizing tokens or PII; if the AI echoes back
   user identifiers they end up in the insight `data` field, which
   is then persisted to `aiInsights.data` (lines 1192–1207). No
   redaction occurs.

9. **`ai-insight-service.ts` `void scope/userId/classroomId/licenseId`
   on line 857–860.** These suppress lint rules but signal a real
   bug: the function receives IDs it never uses. The persisted
   `aiInsights` rows are keyed by `(scope, userId?, classroomId?,
   licenseId?)` filters; if the `saveInsights` call (lines 1181–1187)
   relies on those IDs but `parseAIResponse` has dropped them, the
   filter is fine — the IDs were never needed for parsing. The
   `void`s are dead-weight.

10. **`ai-insight-service.ts` `generateSystemInsights` is
    O(schools × users × (xpLogs+activityLogs)) on every call.**
    Lines 993–1042 issue per-license, per-user queries inside a
    `Promise.all`. For a multi-tenant platform with thousands of
    users this serializes thousands of DB round-trips and emits one
    AI call per system-wide invocation. The materialized views
    referenced in other services (`mv_student_velocity`,
    `mv_school_velocity`) are not reused here.

11. **`demo-isolation-service.ts` has 12 `sql` template operators
    applied with non-null assertion `!`.** Lines 108, 188, 202, 257,
    276 — every `or(...)`, `and(...)`, and `inArray(...)` invocation
    is followed by `!`. This bypasses Drizzle's null check (these
    helpers return `SQL | undefined`). If a Drizzle upgrade ever
    changes the return type to `SQL<unknown> | null`, the file
    fails at compile time or, worse, silently produces wrong SQL.

12. **`demo-isolation-service.ts` `verifyDemoLicense` uses school
    name `"Reading Advantage Academy"` as a sentinel.** Lines 37, 54,
    67. Renaming the demo school silently disables all isolation
    checks. There is no `id`/`slug` flag on the `licenses` or
    `schools` table; the relationship is name-based.

13. **`goals-service.ts` `loadProgressLogsForGoal` builds an `any`
    chain via `let q = db.select()... as any` (line 63).** This
    discards Drizzle's inferred row type. The `take` parameter
    narrowing at line 64–66 silently returns the wrong type if
    `take` is `undefined` (the limit is omitted but the return type
    is still `Promise<GoalProgressLogRow[]>` — fine, but a future
    refactor that adds `.offset()` after the `as any` will break
    silently).

14. **`goals-service.ts` `getGoalRecommendations` inlines CEFR
    ladder** (line 462): `["A1-", "A1", "A1+", ..., "C2-", "C2"]`
    (no `C2+`). This list duplicates
    `server/models/article.ts:4-22`'s `ArticleCefrLevel` enum.
    Two sources of truth for CEFR ordering.

15. **`goals-service.ts` `getUserGoalSummary` `for` loop fetches
    progress per active goal** (lines 373–380). Each call to
    `calculateProgress` (line 374) hits the database once. For a
    user with 10 active goals that's 10 round-trips, and each
    `calculateProgress` itself does another fetch (`learningGoals`
    at line 301–305). Easy N+1.

16. **`goals-service.ts` `syncProgressFromActivities` has no
    per-goal transaction wrapper.** Lines 498–640 iterate goals and
    issue one update per goal; a failure mid-loop leaves some
    goals updated and others stale. No `db.transaction`.

17. **`goals-service.ts` `updateProgress` ignores `isRecurring`
    goal semantics.** Lines 235–290 add `value` to `currentValue`
    unconditionally. A `DAILY` recurring goal that exceeds the
    target is simply marked `COMPLETED` (line 247); a recurring
    goal should reset to 0 and start a new cycle.

18. **`localization/genre-localization-service.ts` uses
    `import('@/locales/en').then(m => m.default)` inside an
    in-memory `Map` cache.** Lines 15–22, 30–44. The cache is
    never invalidated on locale file changes during dev. For a
    Next.js dev server this means hot-reloads of the dictionary
    require a process restart. Also, dynamic `import()` of a
    `.ts` file from a server-side service runs through ts-node/tsx
    in some setups — slower than a static import.

19. **`localization/genre-localization-service.ts` `getUserLocale`
    maps by `schools.country`** (lines 208–213). This maps
    `"Thailand" → "th"`, `"China" → "cn"`, `"Taiwan" → "tw"`,
    `"Vietnam" → "vi"`. A Thai student whose school happens to
    store `"thailand"` (lowercase) silently falls back to `"en"`.
    The map is case-sensitive.

20. **`metrics/assignment-prediction-service.ts` raw SQL on every
    call.** All four query functions use `db.execute(sql\`...\`)` —
    no Drizzle types, no schema validation. `mv_assignment_funnel`,
    `mv_class_assignment_funnel`, `mv_school_assignment_funnel`
    are referenced by string. A schema rename breaks the service
    silently (runtime error only when the endpoint is called).

21. **`metrics/assignment-prediction-service.ts` `getAtRiskStudents`
    risk-score CASE is evaluated in SQL but uses `EXTRACT(EPOCH
    FROM (NOW() - a.created_at)) / (24 * 3600) > 14` three times**
    (lines 279, 290, 291). The `NOW()` call is repeated inside
    `CASE` expressions; Postgres evaluates it once per CASE
    branch. Consider a `now()` CTE or `INTERVAL '14 days'` literal.

22. **`metrics/assignment-prediction-service.ts` `WHERE` clause is
    constructed without parentheses around the dynamic SQL.** Line
    270 builds `sql.join([sql\`WHERE\`, sql.join(conditions,
    sql\` AND \`)], sql\` \`)`. If `conditions` is empty (e.g. no
    `assignmentId`, `classroomId`, `schoolId`, AND no always-on
    risk condition), the result is the literal string `"WHERE "`
    which Postgres rejects. The always-on risk condition at lines
    264–268 ensures `conditions` is never empty in practice, but
    this is fragile.

23. **`metrics/assignment-prediction-service.ts` time delta in
    `NOW() - a.due_date` is computed twice** (lines 265, 281–283).
    Postgres deduplicates `NOW()` per query, but the expression
    tree still duplicates the calculation. Minor performance.

24. **`metrics/assignment-prediction-service.ts` `getHistoricalCompletionTime`
    joins `articles art` (line 382) but the unified Drizzle schema
    uses plural `articles` (per the migration track referenced in
    the JSDoc).** The query text references the legacy singular
    alias. The migration may have aliased the table, but if not
    this query breaks against the unified schema.

25. **`metrics/cache-service.ts` `MetricsCache.generateKey`
    parameter concatenation is collision-prone.** Lines 45–58. The
    key is `${type}:${scope}:${id}${paramStr ? ':' + paramStr : ''}`
    where `paramStr` is `k1=v1&k2=v2&...` (sorted by key). If a
    `params.k` value contains a `&`, `=`, or `:`, the key may
    collide with another entry. E.g. `{a: 'b&c=d'}` and
    `{a: 'b', c: 'd'}` produce the same key.

26. **`metrics/cache-service.ts` `metricsCache` is a module-level
    singleton** (line 218). In serverless / multi-instance
    deployments each cold-start gets its own cache; `invalidate`
    on one instance does not propagate. The `MetricsNotifier`
    singleton (line 219) has the same issue.

27. **`metrics/cache-service.ts` `cleanExpired` runs on
    `setInterval` (line 273) but the returned `NodeJS.Timeout`
    handle is not held anywhere.** If `startCacheCleanup` is
    called once per process (typical), the interval keeps Node.js
    alive even when no requests are being served. Should `.unref()`
    the timer (line 273).

28. **`metrics/genre-engagement-service.ts` uses `sql\`...from
    mv_genre_engagement_metrics\`` (line 132) with a column-list
    projection that includes `MAX(last_activity_date)` and
    `MIN(first_activity_date)` (lines 127–128).** This aggregates
    raw dates into a `MIN`/`MAX` of strings. Drizzle's
    `db.execute(sql\`...\`)` returns the dates as strings (or
    `Date` objects depending on driver settings); the consumer
    `formatEngagementData` at line 412 calls `new
    Date(raw.lastActivityDate)` (line 424) which assumes the
    string is parseable. Postgres returns dates as ISO strings in
    raw queries; non-ISO locale formats could break this.

29. **`metrics/genre-engagement-service.ts` `checkGenreCefrAlignment`
    uses `like(articles.cefrLevel, '${studentCefrBucket}%')`
    (line 346).** The `studentCefrBucket` is computed at line 222
    as `user.cefrLevel.substring(0, 2)`. For a user with
    `cefrLevel = "A1-"`, the substring is `"A"`; for `"A1+"` it's
    `"A1"`. The bucket is therefore inconsistent (2 chars vs 1
    char). This means students at `"A1-"` match all A1/A2/B1...
    articles; students at `"B1"` match B1/B1+/B1- only. The
    alignment is not symmetric.

30. **`metrics/genre-engagement-service.ts` `import { chapters }`
    (line 13) is from `@reading-advantage/db/schema`.** Need to
    confirm `chapters` is exported there. If not, the service
    fails to compile.

31. **`metrics/srs-health-service.ts` `getClassSRSHealth` adds
    `Number(data.avg_due_per_student) * Number(data.total_students)`
    for `totalReviewsNeeded`** (line 293). If either column is
    `null`/`undefined`, the multiplication yields `NaN`. There is
    no defensive `|| 0` (the `|| 0` is applied per-number, but the
    *result* `Math.round(NaN * 1)` is `NaN`).

32. **`metrics/srs-health-service.ts` `getSchoolOverloadThresholds`
    always returns `DEFAULT_OVERLOAD_THRESHOLDS`** (lines 522–527)
    and ignores `_schoolId`. The function exists as if
    per-school overrides will be added; the `as any` / `_schoolId`
    pattern indicates dead code.

33. **`metrics/srs-health-service.ts` `generateSuggestedActions`
    signature has `_thresholds` parameter** (line 427) that is
    unused inside the function. The function only reads
    `healthData.*` fields. The threshold object is passed in but
    ignored — the consumer's customization intent is dropped.

34. **`metrics/srs-health-service.ts` `getSchoolSRSHealth` returns
    `schoolHealthStatus` directly from the view** (line 338). No
    mapping/validation against the declared
    `'critical' | 'disengaged' | 'underperforming' | 'high_performing' | 'stable'`
    union type (line 141). If the view is updated to include a new
    status the type narrows wrongly.

35. **`metrics/velocity-service.ts` `getStudentVelocity`
    `confidenceBand` falls back to `'none'` in the bulk path**
    (line 462) but the inferred return type union (line 54) is
    `'high' | 'medium' | 'low' | 'none'`. With `includeConfidence =
    false` (line 416), the function returns `confidenceBand: 'none'`
    for every row — semantically misleading.

36. **`metrics/velocity-service.ts` `calculateEMA` uses
    `dailyLogs[0].xpEarned` to seed `ema`** (line 164). The first
    day's value is treated as the prior EMA. For sparse data the
    EMA is dominated by that single point for the smoothing window.

37. **`metrics/velocity-service.ts` `calculateETA` `velocityLow` is
    clamped to `Math.max(0.1, velocity - 1.96 * stdDev)`** (line
    230). The lower bound `0.1` is a magic number; with very low
    velocities the confidence interval widens significantly.

38. **`metrics/velocity-service.ts` `getSystemVelocity` issues two
    separate raw SQL queries** (lines 477–509) when a single
    `LEFT JOIN mv_class_velocity` could yield both aggregates. Two
    round-trips for one response.

39. **`refresh-matviews-service.ts` `MATERIALIZED_VIEWS` is a
    hard-coded `as const` array** (lines 6–28). New views added to
    the database are not refreshed by this service. There is no
    reflection over `pg_matviews` to auto-discover.

40. **`refresh-matviews-service.ts` `refreshView` falls back from
    `CONCURRENTLY` to a regular refresh** (lines 80–115). The
    fallback blocks reads on the view (regular `REFRESH MATERIALIZED
    VIEW` takes an `ACCESS EXCLUSIVE` lock). For a high-traffic
    dashboard this can stall velocity queries for tens of seconds.

41. **`refresh-matviews-service.ts` `viewExists` swallows errors**
    (line 52). A connection error is treated as "view does not
    exist" — which masks transient infrastructure failures.

42. **`refresh-matviews-service.ts` `MATERIALIZED_VIEWS` includes
    `mv_activity_heatmap` and `mv_class_activity_heatmap` and
    `mv_daily_activity_rollups` (lines 11, 19, 27)** which are not
    referenced elsewhere in this batch's services. Need to
    confirm those views exist in the database; if not, every
    refresh logs them as `skipped`.

43. **`srs-quick-actions-service.ts` `actionId` is `Date.now()`-based
    and is *not* persisted** (lines 85, 217, 293, 349). The
    `isIdempotent: true` claim (lines 160, 193, 235, 271, 323,
    337, 365, 401, 429) is false: nothing prevents two calls within
    the same millisecond from producing the same `actionId` and
    double-creating sessions/alerts.

44. **`srs-quick-actions-service.ts` `logQuickAction` is
    `console.log` only** (lines 449–480). The persistence path is
    commented out (lines 466–475). The service therefore cannot
    be idempotent, audited, or replayed.

45. **`srs-quick-actions-service.ts` `executeQuickAction` switch
    on `actionType` ignores `parameters.cardLimit` and
    `parameters.targetFilter` in the `review_session` branch**
    (lines 527–538): the case reads
    `parameters.cardLimit || 25`, which is correct, but
    `parameters.targetFilter` (line 535) defaults to `'due'` even
    if the user requested `'overdue'`. The default-or pattern
    only fires on `undefined`; an empty-string `targetFilter`
    would fail in `buildFilter` (line 104 returns `undefined`),
    silently returning all cards.

46. **`srs-quick-actions-service.ts` `sendPracticeReminders`
    validates `users.role === Role.STUDENT`** (line 226) but
    constructs `reminderEntries` from the validated users and
    only logs them (line 259). No notification adapter is
    invoked. Comment at line 241 explicitly acknowledges this:
    `"in a real implementation, this would integrate with
    email/notification services"`.

47. **`srs-quick-actions-service.ts` `createTeacherAlert` hard-codes
    `alertType: 'overload'` (line 603) regardless of the request**
    in the `teacher_alert` branch of `executeQuickAction`. The
    `request.parameters` is not propagated. The function signature
    accepts `alertType: 'overload' | 'inactive' | 'critical_backlog'`
    but the only call site ignores it.

48. **`srs-quick-actions-service.ts` `userWordRecords.due` and
    `userWordRecords.state` are typed `any`** (line 91, 93, 109).
    Drizzle's `date()` column infers `Date`; the `state` integer
    column infers `number`. The `any` casts are unnecessary and
    defeat type checking.

49. **`models/enum.ts` `Role` enum uses lowercase values
    (`"user"`, `"student"`, `"teacher"`, `"admin"`,
    `"system"`).** Lines 15–21. The Drizzle schema
    (`packages/db/src/schema/users.ts:5`) declares
    `roleEnum("role", ["INTERN", "STUDENT", "TEACHER", "ADMIN",
    "SYSTEM", ...])` — uppercase. The legacy Prisma enum in the
    model file diverges from the live Drizzle enum.

50. **`models/enum.ts` `LicenseExpirationDate` keys are string
    numbers `"180"` and `"360"`** (lines 43–46). A typo
    (`"365"`) would silently fail to match the Drizzle
    `licenses` enum (which is text-typed in
    `packages/db/src/schema/licenses.ts`). No runtime validation.

51. **`models/article.ts` `ArticleTimepoint` and `Article` use
    snake_case field names** (lines 24–47) consistent with the
    legacy Prisma schema. The Drizzle schema
    (`packages/db/src/schema/content.ts`) uses camelCase. Two
    different shapes for the same domain entity.

52. **`models/license.ts` `License` interface declares
    `maxUsers`, `usedLicenses`, `licenseType`, `ownerUserId`,
    `expiresAt`, `createdAt`, `updatedAt`** (lines 6–14), but
    `createLicenseModel` returns `total_licenses`, `used_licenses`,
    `subscription_level`, `expiration_date`, `user_id`,
    `admin_id`, `school_name` (lines 48–56). The return type
    is declared as `Omit<License, "id">` (line 39) which
    structurally mismatches the implementation. TypeScript
    would only catch this if the build runs.

53. **`models/user.ts` declares `display_name`, `email_verified`,
    `expired_date`, `expired`, `license_id`, `onborda`, `picture`
    (lines 6–19).** The Drizzle `users` schema (line 25–47)
    does not have these columns. The model file documents a
    shape that no longer exists in the database. Either
    Drizzle was migrated without renaming or the model file is
    dead.

54. **`controllers/velocity-controller.ts` `actualScope =
    scope || "system"`** (line 358). The HTTP query parameter
    `scope` defaults to `null`. The endpoint then accepts
    `?scope=student` with no `id`, `classId`, or `schoolId` and
    falls into the `else` branch (line 424–432) returning
    `MISSING_ID`. But a request with no `scope` at all skips the
    `scope` validation (line 347 returns true) and silently
    returns system-wide aggregates. The default is `system`,
    which is a sensitive scope.

55. **`controllers/velocity-controller.ts` `checkAccess` does not
    return `SYSTEM`-scope case** (lines 220–302). The function
    uses an early-return pattern: `ADMIN`/`SYSTEM` → allowed;
    otherwise check by `scope`. The `scope === "system"` branch
    is never tested. The caller (`actualScope === "system"` at
    line 467) bypasses `checkAccess` entirely. Every
    authenticated user can read system aggregates.

56. **`controllers/velocity-controller.ts` `convertToCSV` does not
    escape commas, quotes, or newlines in field values** (lines
    67–203). Classroom names containing `,` will break CSV
    format. The only escaping is the inline `|| ""` fallback for
    nullable values. No RFC 4180 quoting.

57. **`controllers/velocity-controller.ts` `Cache-Control` is set
    to `private, max-age=300, stale-while-revalidate=600`** (line
    509) but the response body includes `cache.cached: false`
    (line 500) — implying the body was not actually cached. The
    `Cache-Control` header contradicts the body.

58. **`controllers/wizard-zombie-controller.ts` `xpEarned` is
    derived from client-supplied `score`** (line 55): `Math.max(0,
    score || Math.floor(correctAnswers * 10))`. The client can
    send any `score`. If `score` is omitted, fallback is
    `correctAnswers * 10` (still client-controlled). No
    re-computation on server.

59. **`controllers/wizard-zombie-controller.ts` body validation
    requires `correctAnswers`, `totalAttempts`, `accuracy` but
    not `score`** (lines 38–50). `score` can be `undefined`,
    null, or a string, and the `Math.max(0, score || ...)`
    pattern will coerce. No type safety.

60. **`controllers/wizard-zombie-controller.ts`
    `getVocabulary` extracts `term` and `translation` from
    `vocab.word`** (lines 181–198) using `wordData.vocabulary ||
    ""` and `wordData.definition.th || ...`. The `vocab.word`
    column is `jsonb` and `as any` cast (line 181). No Zod
    validation.

61. **`controllers/wizard-zombie-controller.ts` `getRanking`
    filters rankings by `users.licenseId` or `users.schoolId`**
    (lines 247–255). A user whose license/school has changed
    since the ranking was earned will see rankings for their new
    tenant. The historical tenant-snapshot is lost.

62. **`controllers/wizard-zombie-controller.ts` `gameRankings`
    upsert key is `(userId, gameType, difficulty)`** (line 115).
    The schema
    `packages/db/src/schema/analytics.ts:22` for `gameRankings`
    needs to be verified to confirm this composite unique
    constraint exists. If only `(userId, gameType)` is unique,
    difficulty-tier rankings will collide.

63. **`server/middleware/guards.ts` `GuardContext["user"]` is
    `NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>`**
    (line 23). This requires `getCurrentUser` to return a
    non-null user; if it ever returns `null`, the type system
    surfaces an error rather than letting the consumer crash at
    runtime. The guards themselves handle the null case
    correctly (return `NextResponse.json` with 401). Pattern is
    good.

64. **`server/middleware/guards.ts` `requireSchoolAccess(schoolId)`
    is a closure factory** (lines 102–133). The `schoolId` is
    captured at definition time; if the route handler changes
    the resource owner at runtime, the guard does not adapt.

65. **`server/middleware/guards.ts` `requireSchoolMatch` returns
    a 403 for `targetSchoolId == null`** (lines 284–293). This is
    correct for security but the error message
    `"Target resource has no school association"` is unhelpful —
    most clients will treat this as "forbidden" without knowing
    why.

66. **`server/middleware/guards.ts` `combineGuards` initializes
    `result` to `{ user: null as any }`** (line 333). If the
    caller passes an empty `guards` array, the function returns
    `result` with a `null` user — silently bypassing every guard.

67. **`server/middleware/guards.ts` `requireRole` accepts an
    array of `Role` strings** (line 61). The `Role` enum from
    `lib/enums.ts` is typed `as const` and `Role.ADMIN` is the
    literal `"ADMIN"`. `allowedRoles.includes(user.role)` works
    only if `user.role` is also one of the literal strings. The
    `sessionUserSchema.role: z.nativeEnum(Role)` (lib/session.ts:19)
    validates this; OK.

68. **`server/middleware.ts` file is essentially dead.** 11 lines
    exporting `logRequest`. No callers in this batch; grep over
    `apps/reading-advantage/` to verify.

---

## Cross-Cutting Findings

### XF-001 — Business logic in route handlers (architecture)

**Applies to:** `velocity-controller.ts`, `wizard-zombie-controller.ts`.

`AGENTS.md` states:

> Business logic must not live in React components, Next.js pages,
> Route Handlers, Server Actions.

Both controllers in this batch embed domain behavior — RBAC, XP
calculation, session mutation, ranking upserts, query construction,
CSV serialization — directly in `NextResponse`-returning functions.
`velocity-controller.ts` is 530 lines; the `getVelocityMetrics`
function (lines 321–529) handles auth, scope resolution, query
delegation, CSV format, and JSON shaping all in one handler.

**Risk:** Reuse via worker / tRPC / CLI / OpenAPI is impossible
without extraction. Testing requires standing up the full Next.js
request pipeline.

### XF-002 — Direct provider SDK imports in "service" modules

**Applies to:** `ai-insight-service.ts`, `genre-localization-service.ts`.

`AGENTS.md`:

> Application code must not depend directly on provider SDKs.

- `ai-insight-service.ts:1-2`: imports `generateText` from
  `@reading-advantage/ai` and `openai, openaiModel` from
  `@/utils/openai`. The `@/utils/openai.ts` file imports
  `createOpenAI` from `@ai-sdk/openai` (provider SDK) directly
  (not through `@reading-advantage/ai`'s `OpenAIProvider`). Lines
  148, 268, 367, 441, 1135 all call `openai(openaiModel)`,
  bypassing the AI adapter client.

- `genre-localization-service.ts:16-20`: dynamic imports of
  locale dictionaries by path. Locale files live under
  `apps/reading-advantage/locales/` and were reviewed in Batch 43;
  `en.ts`, `th.ts`, `tw.ts`, `vi.ts` all import a Next.js route
  page (`AssignmentPage`), a React server component, and
  unused lodash/lucide dependencies. Importing them at runtime
  on the server drags React, lodash, lucide, and the teacher
  assignments route module into the server bundle for every
  genre recommendation.

### XF-003 — Inconsistent Role / enum string casing

**Applies to:** `models/enum.ts`, `middleware/guards.ts`,
`services/*.ts`.

`models/enum.ts:15-21` declares `Role` enum values as
lowercase (`"user"`, `"student"`, `"teacher"`, `"admin"`,
`"system"`). The Drizzle schema
(`packages/db/src/schema/users.ts:5`) declares uppercase.
`lib/enums.ts:4-10` (referenced by `ai-insight-service.ts`,
`demo-activity-generator.ts`, `velocity-controller.ts`,
`srs-quick-actions-service.ts`) declares uppercase.

Code that uses `eq(users.role, Role.STUDENT)` (e.g.
`velocity-controller.ts:419`,
`demo-activity-generator.ts:362`,
`srs-quick-actions-service.ts:566`) compares against the
uppercase string. Code that uses the legacy `models/enum.ts`
enum compares against lowercase. The two will never match.

`wizard-zombie-controller.ts:362` uses `eq(users.role, "STUDENT")`
(literal) which matches the uppercase lib/enums.ts but not the
lowercase models/enum.ts.

### XF-004 — Read-modify-write races on counters

**Applies to:** `wizard-zombie-controller.ts`, `velocity-controller.ts`.

`wizard-zombie-controller.ts:87-98`: read `user.xp`, add
`xpEarned`, write back. Concurrent game completions lose updates.
This is identical to the pattern Batch 45 flagged in
`castle-defense-controller.ts`, `dragon-flight-controller.ts`,
etc.

`velocity-controller.ts:380-387`: caches student velocity for
5 minutes via `getCachedVelocity`. The cache key
`${type}:${scope}:${id}:${params}` is constructed without
including the requester's `schoolId`. If two students from
different schools happen to have the same user ID (unlikely but
possible during data migration), they will share cache entries.
The `cache.cached: false` always-emitted response (line 500)
contradicts the actual cache behavior.

### XF-005 — Tenant / school scoping gaps

**Applies to:** `velocity-controller.ts`, `wizard-zombie-controller.ts`,
`ai-insight-service.ts`.

- `velocity-controller.ts:467-470`: `getSystemVelocity()` is
  called for any `actualScope === "system"` request, with no
  authorization.
- `wizard-zombie-controller.ts:30-36`: server logs the entire
  game payload (`score`, `correctAnswers`, etc.) to
  `console.log`. Logs may include user PII or computed XP. No
  redaction.
- `ai-insight-service.ts:990-1148`: `generateSystemInsights`
  reads every license, every user, every XP log, every activity
  log across the entire database to produce a single AI prompt.
  No tenant scoping. A single bad or unauthorized request can
  extract cross-tenant aggregates.

### XF-006 — Direct SQL on materialized views without contract

**Applies to:** `metrics/velocity-service.ts`,
`metrics/srs-health-service.ts`,
`metrics/genre-engagement-service.ts`,
`metrics/assignment-prediction-service.ts`,
`refresh-matviews-service.ts`.

Every metrics service issues
`(await db.execute(sql\`SELECT * FROM mv_xyz WHERE ...\`)) as
unknown as any[]` and trusts the column names. Schema renames
in the materialized view definitions will surface as runtime
errors only when the endpoint is hit, not at compile time. The
`as unknown as any[]` cast is a deliberate type erasure.

`refresh-matviews-service.ts:6-28` hard-codes the materialized
view names. New views added to the database are not refreshed
by this service.

---

## File-by-File Findings

### `controllers/velocity-controller.ts`

| Line | Finding |
|------|---------|
| 1–6 | File-level JSDoc describes "Enhanced Velocity Metrics Controller"; consistent with Batch 45's pattern. |
| 8 | Imports `NextRequest` but uses `ExtendedNextRequest`; `NextRequest` import is unused. |
| 9 | Imports `ExtendedNextRequest` type from `./auth-controller`; correct typing pattern. |
| 10–20 | Imports 8 functions/types from `@/server/services/metrics/velocity-service`. |
| 22 | `db, and, eq, inArray` from `@reading-advantage/db`; `db` and `eq` are used; `and` and `inArray` are used. |
| 23 | Schema imports for `classroomStudents`, `classroomTeachers`, `users`. |
| 24 | `Role` from `@/lib/enums` — uppercase enum, consistent with schema. |
| 30–44 | `VelocityApiResponse` interface with `data` union of 5 different types. The discriminator is missing; consumers cannot narrow. |
| 53–207 | `convertToCSV` does not escape commas/quotes/newlines. |
| 67–91 | Student CSV headers are correct snake-cased-ish names; no RFC 4180 quoting. |
| 117 | `lastActivityAt?.toISOString() || ""` — `toISOString()` is fine but the `|| ""` produces an empty CSV cell. |
| 122–165 | Class CSV path: same lack of escaping. |
| 166–205 | School CSV path: same. |
| 167 | The `else` branch covers BOTH `scope === "school"` AND `scope === "system"`; the system row shape would also be a `SchoolVelocityMetrics` — wrong, but unreachable because `actualScope === "system"` is handled separately at line 467. |
| 212–303 | `checkAccess` is an inner async function taking `session: any`. The `any` defeats type checking on `session.user.role`. |
| 217 | `const userRole = session.user.role as Role;` — `as Role` cast bypasses Zod validation that the value is in the enum. |
| 220–222 | `if (userRole === Role.ADMIN || userRole === Role.SYSTEM) return { allowed: true };` — bails before any scope check. |
| 224–261 | `scope === "student"` branch: students can only access their own data (correct), teachers access students in their classes (correct, but two queries). |
| 234–258 | Teachers verify classroom membership via `classroomTeachers` join + `classroomStudents` lookup. N+1 (one query per scope). |
| 263–283 | `scope === "class"` branch: only checks teacher-of-class relationship; does not check school membership. A teacher at school A can read class data at school B if they are somehow on the teacher list for that class. |
| 285–300 | `scope === "school"` branch: only checks `user.schoolId === scopeId`. Admins bypass (line 220), but teacher-of-school check is correct. |
| 302 | `return { allowed: false, reason: "Invalid scope" };` — for `scope === "system"` this would also return false, but `system` is never passed to `checkAccess` (line 467). |
| 321–529 | `getVelocityMetrics` route handler. |
| 325–331 | Session check returns 401 if missing. |
| 333 | `new URL(req.url)` to parse query — fine. |
| 334–344 | Query params parsed without Zod; `timeframe` cast to `"7d" | "30d"` (line 340) but no validation that the value is actually one of those. |
| 347–355 | Scope validation: `["student", "class", "school", "system"]`. Fine. |
| 358 | `actualScope = scope || "system"` — `null` scope becomes `"system"`. Anyone hitting the endpoint with no query param gets system aggregates. |
| 369–432 | `actualScope === "student"` branch. |
| 380–387 | `getCachedVelocity` for single-student queries with 5-min TTL. |
| 389–421 | Bulk student query by `classId` or `schoolId`. |
| 402–405 | `classId` lookup returns all student IDs; no pagination. |
| 416–419 | `schoolId` lookup joins `users.role === Role.STUDENT` — uppercase, consistent with Drizzle enum. |
| 423 | Bulk velocity computed; no per-student access check beyond `schoolId`. |
| 433–449 | `actualScope === "class"` branch. `getClassVelocity(id)` is called after `checkAccess`. |
| 450–466 | `actualScope === "school"` branch. `getSchoolVelocity(id)`. |
| 467–470 | `actualScope === "system"` branch. **No access control**. |
| 472–477 | 404 if data is null. |
| 480–491 | CSV export. `filename = `velocity-${scope}-${id || "bulk"}-...`. No sanitization of `scope` or `id` for filenames. |
| 494–503 | `VelocityApiResponse` envelope built. `cache.cached: false` is hard-coded — but the controller cached a few lines up. |
| 505–512 | `Cache-Control: private, max-age=300, stale-while-revalidate=600` but `cache.cached: false`. Contradicts body. |
| 514 | `console.error(...)` — fine. |
| 516–528 | Error response shape inconsistent with success shape (no `cache` envelope). |

### `controllers/wizard-zombie-controller.ts`

| Line | Finding |
|------|---------|
| 1–10 | Imports `db`, `gameRankings`, `userActivity`, `users`, `userWordRecords`, `xpLogs`. `and, asc, desc, eq, sql` from `@reading-advantage/db`. |
| 12 | `WizardZombieController` static class. |
| 13–148 | `completeGame` static method. |
| 15 | `const userId = req.session?.user?.id;` — graceful session check. |
| 17–19 | 401 if no `userId`. |
| 21–28 | `await req.json()` then destructure `score`, `correctAnswers`, `totalAttempts`, `accuracy`, `difficulty = "normal"`. No Zod. |
| 30–36 | `console.log("WizardZombie Complete:", { ... })` — game payload to logs. PII risk. |
| 38–50 | Validation that `correctAnswers`, `totalAttempts`, `accuracy` are defined. Does not validate type, range, or sign. |
| 52–55 | `xpEarned = Math.max(0, score || Math.floor(correctAnswers * 10))`. Client-controlled `score`. |
| 57 | `uniqueTargetId = `wizard-zombie-${userId}-${Date.now()}`. Two calls in the same ms collide. |
| 60–77 | Insert `userActivity` with `details` payload including raw client values. |
| 79–103 | If `xpEarned > 0`: insert `xpLogs`, fetch user, read-modify-write `users.xp`, mutate session. |
| 87–91 | `db.select().from(users).where(eq(users.id, userId)).limit(1)` — SELECT `*` selects all columns including `password`, `email`, etc. (PG-side, the column list is set by Drizzle). |
| 93–103 | If user exists, `user.xp + xpEarned` written back. Read-modify-write race. |
| 100–102 | `req.session.user.xp = updatedXp` — direct session mutation, transport-layer detail leaks. |
| 106–120 | `gameRankings` upsert with onConflictDoUpdate on `(userId, gameType, difficulty)`. Need to verify composite unique constraint exists on the table. |
| 117 | `sql``${gameRankings.totalXp} + ${xpEarned}``` — parameterized safely. |
| 118 | `updatedAt: new Date()` — explicit; Drizzle has `defaultNow()` on the column? Verify. |
| 122–127 | Success response with `xpEarned`, `activityId`, `status: 200`. `status` inside body is non-standard. |
| 128–137 | Inner catch returns 500; outer catch returns 500. Two-tier error handling. |
| 138–147 | Outer catch swallows error with `console.error`. |
| 150–224 | `getVocabulary` static method. |
| 152 | Session check. |
| 158–168 | Query `userWordRecords` where `userId = ...`, `saveToFlashcard = true`, ordered by `due asc, createdAt desc`, limit 50. |
| 170–177 | Empty-vocab path returns 200 with empty list. |
| 179–198 | Map `vocab.word` (jsonb) to `{ term, translation }`. `as any` cast on `wordData`. |
| 184–192 | Translation fallback chain: `th → en → cn → tw → vi`. Hard-coded order. |
| 200–207 | Less than 5 words: return 200 with warning. |
| 209–213 | Success response. |
| 214–223 | Catch returns 500. |
| 226–290 | `getRanking` static method. |
| 228 | Session check. |
| 234–242 | Fetch current user's `licenseId`/`schoolId` from `users`. |
| 244 | `new URL(req.url)` to parse query. |
| 245 | `difficulty` parsed without Zod. |
| 247–250 | Always-on `eq(gameRankings.gameType, "WIZARD_VS_ZOMBIE")`. |
| 251–255 | Tenant filter: prefer `licenseId`, fall back to `schoolId`. |
| 257–269 | Ranking query joins `gameRankings` to `users`. |
| 271–277 | Map ranking rows to `{ userId, name, xp, difficulty }`. `name` defaults to `"Unknown Survivor"`. |
| 279 | Return rankings array. |
| 280–289 | Catch returns 500. |

### `server/middleware.ts`

| Line | Finding |
|------|---------|
| 1 | `import { type NextRequest } from "next/server.js";` — note `.js` extension (deep import path). |
| 3 | Comment "Middleware to log requests" — describes behavior, not contract. |
| 4–10 | `logRequest` middleware factory. `(req, params, next)` — the `params` and `next` parameter pattern is the legacy `connect`-style middleware, not the Next.js Edge middleware pattern. |
| 9 | `console.log(` `${req.method} ${req.url}` `)` — logs every request. No rate limiting, no redaction. |
| 10 | `return next()` — returns the callback result, but `next()` is typed `() => void` (line 7), so the return value is `void`. The `NextResponse` from downstream is dropped. |
| Whole file | This 11-line file is essentially a logging shim that does not integrate with the Edge middleware runtime. The actual Next.js root middleware is `apps/reading-advantage/middleware.ts` (reviewed in Batch 43, 205 lines). |

### `server/middleware/guards.ts`

| Line | Finding |
|------|---------|
| 1–15 | Module-level JSDoc describes RBAC guard utilities. |
| 17 | Imports `NextRequest`, `NextResponse` from `next/server`. |
| 18 | `getCurrentUser` from `@/lib/session`. |
| 19 | `Role` from `@/lib/enums` — uppercase. |
| 21–23 | `GuardContext` interface; `user` is `NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>`. |
| 29–46 | `requireAuth` returns `{ user }` or `NextResponse` (401). |
| 32 | `const user = await getCurrentUser();` — no error handling. |
| 35–42 | 401 response with `code: "AUTH_REQUIRED"`. |
| 61–87 | `requireRole(allowedRoles)` factory. |
| 65 | Inner async function takes `req`. |
| 72 | `if (!allowedRoles.includes(user.role))` — `includes` on array of strings. |
| 73–82 | 403 response with `code: "ROLE_FORBIDDEN"`. |
| 89–133 | `requireSchoolAccess(schoolId)` factory. |
| 114 | `if (user.role === Role.SYSTEM) return { user };` — bypass for SYSTEM. |
| 118 | `if (user.school_id !== schoolId)` — `school_id` snake_case matches `sessionUserSchema.school_id` (lib/session.ts:30) but not Drizzle schema (`schoolId`). |
| 119–128 | 403 with `code: "SCHOOL_FORBIDDEN"`, includes `requestedSchool` and `userSchool`. |
| 135–212 | `requireClassroomAccess(classroomId)` factory. |
| 156–158 | SYSTEM bypass. |
| 161–176 | TEACHER branch: checks `user.teacher_class_ids?.includes(classroomId)`. |
| 162 | `user.teacher_class_ids?.includes(classroomId)` — `teacher_class_ids` snake_case, array of strings. |
| 179–194 | STUDENT branch: `user.student_class_ids?.includes(classroomId)`. |
| 196–201 | ADMIN branch — **TODO marker**. Comment at lines 197–198: `"ADMIN role: Allow if classroom belongs to the same school — This requires additional database lookup to verify school association — For now, we'll allow ADMIN access and implement school-level validation in authorization helpers"`. Admins bypass classroom access check. |
| 203–210 | Fallback: 403. |
| 215–258 | `requireStudentSelf(userId)` factory. |
| 233 | SYSTEM/ADMIN bypass. |
| 238 | TEACHER bypass — but the comment says `"validated elsewhere"`. The "elsewhere" code is not visible in this batch. |
| 243–254 | STUDENT path: `user.id !== userId` → 403. |
| 267–310 | `requireSchoolMatch(targetSchoolId)` factory. |
| 279 | SYSTEM bypass. |
| 284–293 | If `targetSchoolId == null` → 403. |
| 295 | `if (user.school_id !== targetSchoolId)` — same snake_case issue. |
| 296–305 | 403 with `userSchool`, `targetSchool`. |
| 327–343 | `combineGuards(guards)` factory. |
| 333 | `let result: { user: GuardContext["user"] } | NextResponse = { user: null as any };` — `null as any` initial value. |
| 335–340 | Iterate guards, short-circuit on `NextResponse`. |
| 342 | `return result` — if guards array is empty, returns `{ user: null as any }`, bypassing all guards. |

### `models/article.ts`

| Line | Finding |
|------|---------|
| 1 | `import { ArticleType } from "./enum";` |
| 3–22 | `ArticleCefrLevel` enum: A1-, A1, A1+, ... C2-. No C2+ variant. |
| 24–29 | `ArticleTimepoint` interface: `file`, `index`, `markName`, `timeSeconds`. |
| 31–47 | `Article` interface: `average_rating`, `cefr_level`, `created_at`, `genre`, `id`, `image_description`, `passage`, `ra_level`, `read_count`, `subgenre`, `summary`, `thead_id?`, `timepoints`, `title`, `type`. snake_case fields. |
| 49–51 | `ArticleQuestion` interface: `question: string`. |
| 53 | `ArticleLAQuestion extends ArticleQuestion {}` — empty extension. |
| 55–61 | `ArticleMCQuestion` extends with `correct_answer`, `distractor_1..3`, `question_number`. |
| 63–66 | `ArticleSAQuestion` extends with `question_number`, `suggested_answer`. |

### `models/enum.ts`

| Line | Finding |
|------|---------|
| 1–13 | `DBCollection` enum: `NEWARTICLES`, `NEWARTICLES_MC`, `NEWARTICLES_SA`, `NEWARTICLES_LA`, `USERS`, `USER_ACTIVITY_LOGS`, `LICENSES`, `LICENSE_RECORDS`. These look like legacy Firebase/Firestore collection names — none of the services in this batch reference them. |
| 15–21 | `Role` enum: USER, STUDENT, TEACHER, ADMIN, SYSTEM. **Lowercase values.** Diverges from `lib/enums.ts` (uppercase) and Drizzle `roleEnum` (uppercase). |
| 23–26 | `ArticleType`: FICTION, NONFICTION. Lowercase values. |
| 28–35 | `ArticleBaseCefrLevel`: A1, A2, B1, B2, C1, C2. No `+`/`-` variants. |
| 37–41 | `LicenseSubScriptionLevel`: BASIC, PREMIUM, ENTERPRISE. Note the typo "SubScription" (capital S in the middle). Lowercase values. |
| 43–46 | `LicenseExpirationDate`: `"180"`, `"360"`. String-typed numbers. |

### `models/license.ts`

| Line | Finding |
|------|---------|
| 1 | `import { LicenseExpirationDate, LicenseSubScriptionLevel } from "./enum";` — uses lowercase enum values. |
| 2 | `import { randomUUID } from "crypto";` |
| 4–15 | `License` interface: `id`, `key`, `schoolName`, `maxUsers`, `usedLicenses`, `licenseType`, `ownerUserId`, `expiresAt`, `createdAt`, `updatedAt`. camelCase. |
| 17–22 | `LicenseRecord` interface: `id`, `license_key`, `activated_at`. snake_case. |
| 24–58 | `createLicenseModel` factory. |
| 39 | Return type `Omit<License, "id">` — but the implementation returns snake_case fields (`total_licenses`, `used_licenses`, `subscription_level`, `expiration_date`, `user_id`, `admin_id`, `school_name`). Structural mismatch. |
| 41–44 | `newDate = new Date(now.getTime() + Number(expirationDate) * 24 * 60 * 60 * 1000)` — `expirationDate` is `string` (per the type signature), `Number(...)` returns `NaN` for non-numeric strings. |
| 47 | `randomUUID()` for license key. |
| 48–56 | Return object with snake_case fields despite camelCase interface. |

### `models/user.ts`

| Line | Finding |
|------|---------|
| 1 | `import { Role } from "./enum";` — uses lowercase `Role`. |
| 3–19 | `User` interface: `id`, `email`, `display_name`, `role`, `created_at`, `updated_at`, `level`, `email_verified`, `picture`, `xp`, `cefr_level`, `sign_in_provider?`, `expired_date`, `expired`, `license_id?`, `onborda`. snake_case fields. |
| Whole file | Documents a user shape that does not match the Drizzle `users` schema. Dead documentation. |

### `services/ai-insight-service.ts`

| Line | Finding |
|------|---------|
| 1 | `import { generateText } from "@reading-advantage/ai";` |
| 2 | `import { openai, openaiModel } from "@/utils/openai";` — direct provider access. |
| 3 | `import { db, and, eq, gte, lt, desc } from "@reading-advantage/db";` |
| 4–19 | Schema imports for `users`, `licenses`, `licenseOnUsers`, `classrooms`, `classroomTeachers`, `classroomStudents`, `articles`, `assignments`, `studentAssignments`, `userActivity`, `xpLogs`, `lessonRecords`, `learningGoals`, `aiInsights`. |
| 20–24 | Enum imports `AIInsightType`, `AIInsightScope`, `AIInsightPriority` from `@/lib/enums` (uppercase). |
| 31–37 | `InsightGenerationContext` interface with `metrics: any`. |
| 39–47 | `GeneratedInsight` interface. |
| 52–162 | `generateStudentInsights(userId)`. |
| 57–65 | Fetch user or throw "Student not found". |
| 68–130 | Parallel fetch of lesson records (with article join), user activity, student assignments (with assignment join), XP logs, learning goals. |
| 132–139 | Assemble `student` object with all relations — mirrors Prisma include shape. |
| 142 | `calculateStudentMetrics(student)` — function defined below. |
| 145 | `buildStudentInsightPrompt(student, metrics)`. |
| 147–152 | `generateText({ model: openai(openaiModel), prompt, temperature: 0.7, maxTokens: 1500 })`. Direct provider call. |
| 155 | `parseAIResponse(text, "STUDENT", userId)`. |
| 158–161 | Catch: log error, return fallback insights. |
| 167–282 | `generateTeacherInsights(userId)`. |
| 172–188 | Fetch teacher + classrooms. |
| 189–190 | `teacherClassroomRows.map((tc) => tc.classroom)` then `classroomList.map((c) => c.id)`. |
| 193–253 | Per-classroom nested loop. For each classroom, fetch students; for each student, fetch activities + assignments; for each assignment, fetch student assignments. Classic N+1. |
| 230–243 | Per-classroom, per-assignment: another nested loop. |
| 255–258 | Assemble teacher object. |
| 259 | `void classroomIds;` — `classroomIds` is computed but never used (it's only used to extract IDs, then `classroomList` is iterated separately). |
| 287–381 | `generateClassroomInsights(classroomId)`. |
| 291–299 | Fetch classroom or throw. |
| 301–354 | Per-student nested loop fetching activities, assignments, lesson records. |
| 356–362 | Assemble classroom object; explicitly maps `classroomName` from `classroomRow.name` for prompt builder compatibility. |
| 386–461 | `generateLicenseInsights(licenseId)`. |
| 390–398 | Fetch license or throw. |
| 400–431 | Per-license-user nested loop fetching XP + activities. |
| 433–436 | Assemble license object. |
| 466–536 | `calculateStudentMetrics(student)`. |
| 471–473 | `recentActivities` filtered to last 7 days. |
| 475–477 | `recentLessons` filtered. |
| 479–482 | `recentXP` summed. |
| 488–491 | Articles read counts. |
| 494–498 | Genre diversity set. |
| 501–506 | Completion rate. |
| 509–515 | Days since last activity. |
| 517 | `void recentActivities;` — declared, never used (only `recentLessons`, `recentXP` are consumed). |
| 541–604 | `calculateTeacherMetrics(teacher)`. |
| 551–561 | Active students across classrooms. |
| 563–576 | Inactive students. |
| 578–593 | Total / pending assignments. |
| 609–646 | `calculateClassroomMetrics(classroom)`. |
| 627–635 | `strugglingStudents`: students with ≥3 assignments, avg of last 3 scores < 0.6. |
| 651–682 | `calculateLicenseMetrics(license)`. |
| 663 | `totalXP = usersList.reduce(...)`. |
| 665–670 | `recentXP` reduced from XP logs. |
| 687–732 | `buildStudentInsightPrompt`. |
| 738–774 | `buildTeacherInsightPrompt`. |
| 779–805 | `buildClassroomInsightPrompt`. |
| 810–845 | `buildLicenseInsightPrompt`. |
| 850–920 | `parseAIResponse`. |
| 857–860 | `void scope; void userId; void classroomId; void licenseId;` — IDs and scope unused inside parser. |
| 863 | `response.match(/\[[\s\S]*\]/)` — extracts first JSON array. Greedy. If AI returns `[1,2,3] and [4,5,6]`, the regex matches the outer array `[1,2,3] and [4,5,6]` (with the prose in between), not valid JSON. |
| 868 | `JSON.parse(jsonMatch[0])` — if regex matched invalid JSON, throws. |
| 871–888 | `normalizeType` maps invalid types to valid `AIInsightType`. Returns `string`, not `AIInsightType` (line 906 casts back). |
| 891–900 | `normalizePriority` — same pattern. |
| 903–913 | Map parsed items to `GeneratedInsight[]`. |
| 910 | `Math.min(Math.max(item.confidence || 0.7, 0), 1)` — clamp to [0, 1]. |
| 911 | `data: item.data || {}` — falsy fallback to `{}`. |
| 912 | `validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)`. |
| 925–938 | `generateFallbackStudentInsights`. |
| 940–953 | `generateFallbackTeacherInsights`. |
| 955–970 | `generateFallbackClassroomInsights`. |
| 972–985 | `generateFallbackLicenseInsights`. |
| 990–1148 | `generateSystemInsights`. |
| 993 | `db.select().from(licenses)` — every license in the database. |
| 997–1042 | Per-license, per-user nested loop. For each license, fetch users; for each user, fetch XP + activity in last 30 days. |
| 1049–1076 | Aggregate metrics across all licenses. |
| 1082–1132 | Build system-wide prompt. |
| 1134–1139 | AI call. |
| 1141 | Parse response. |
| 1150–1162 | `generateFallbackSystemInsights`. |
| 1167–1213 | `saveInsights`. |
| 1174–1187 | Build conditions array; insert empty-condition check missing — `conditions` always has at least `scope` and `createdAt` filter (lines 1178–1180). |
| 1187 | `db.delete(aiInsights).where(and(...conditions))`. |
| 1190 | Early return if `insights.length === 0`. |
| 1192–1208 | Bulk insert. |
| 1218–1246 | `getCachedInsights`. |
| 1228 | `gte(aiInsights.validUntil, new Date())` — filters out expired insights. |

### `services/demo-activity-generator.ts`

| Line | Finding |
|------|---------|
| 1 | `import { db, and, eq, asc } from "@reading-advantage/db";` |
| 2–7 | Schema imports: `users`, `articles`, `userActivity`, `xpLogs`. |
| 8 | `ActivityType` from `@/lib/enums`. |
| 13–17 | `StudentProfile` enum: LAZY, AVERAGE, HARDWORKING. |
| 22–38 | `PROFILE_CONFIG` constant. |
| 43–49 | `ACTIVITY_DISTRIBUTION` constant. |
| 55–72 | `generateStudentProfile(studentIndex, totalStudents)`. |
| 61–71 | Bins students by ratio: 0–33% LAZY, 33–83% AVERAGE, 83–100% HARDWORKING. |
| 77–79 | `randomBetween(min, max)` — inclusive. |
| 84–98 | `selectActivityType()` — weighted random over `ACTIVITY_DISTRIBUTION`. |
| 103–132 | `generateArticleReadActivity` — inserts `userActivity` + `xpLogs`. |
| 116 | `timer: randomBetween(60, 360)` — 1–6 minutes. |
| 137–196 | `generateQuestionActivity` — accuracy depends on profile. |
| 154–159 | Question count depends on type. |
| 161 | `correctAnswers = Math.floor((totalQuestions * baseAccuracy) / 100)`. |
| 201–234 | `generateFlashcardActivity` — inserts `userActivity` + `xpLogs`. |
| 217–219 | `details: { cardsReviewed, correctAnswers }`. |
| 239–279 | `createActivity` dispatcher. |
| 284–340 | `generateStudentDailyActivities` — per-student per-day generator. |
| 310 | `articleList[Math.floor(Math.random() * articleList.length)]` — biased by `length`; if `length === 0`, returns `undefined`, throws. |
| 322–326 | Hour offset between 8 AM and 8 PM. |
| 345–413 | `generateDailyActivities` — per-day generator. |
| 355–365 | Fetch demo students by `licenseId`, `schoolId`, `role === "STUDENT"`. The role is `"STUDENT"` literal (uppercase) — matches Drizzle but does not match the lowercase `models/enum.ts`. |
| 367–370 | Empty students path. |
| 373–377 | Fetch public articles (limit 50). `articles.isPublic` — verify column exists. |
| 388–406 | Loop through students, call `generateStudentDailyActivities`. |
| 418–433 | `generateMultiDayActivities` — loop `days` days backward. |

### `services/demo-isolation-service.ts`

| Line | Finding |
|------|---------|
| 1 | `import { db, and, eq, or, ne, gte, ilike, inArray } from "@reading-advantage/db";` |
| 2–10 | Schema imports. |
| 15–19 | `IsolationCheckResult` interface. |
| 24–38 | `verifyDemoLicense` — checks if school's name is `"Reading Advantage Academy"`. |
| 43–55 | `verifyDemoSchool` — same name check. |
| 60–87 | `getDemoIds` — returns first license for the demo school. |
| 92–131 | `checkDemoUsersBelongToDemoLicense`. |
| 100–109 | Find users with email matching `ilike(...%demo-student%`, `ilike(...%demo-teacher%`, `ilike(...%demo-admin%)`. The `or(...)!` non-null assertion at line 108. |
| 112–124 | Per-user check that `user.licenseId === demoLicenseId` and `user.schoolId === demoSchoolId`. |
| 136–171 | `checkDemoClassesHaveOnlyDemoUsers`. |
| 144–147 | Fetch demo classrooms by `schoolId`. |
| 151–155 | Per-classroom, fetch enrolled students. N+1. |
| 176–216 | `checkCrossLicenseData`. |
| 184–189 | `and(eq, ne)!` non-null assertion. |
| 198–203 | `and(eq, ne)!` again. |
| 221–291 | `checkDemoActivitiesIsolation`. |
| 242 | `activityConds = [inArray(userActivity.userId, demoUserIds)]` |
| 245 | `xpConds = [inArray(xpLogs.userId, demoUserIds)]` |
| 257 | `and(...activityConds)!` — non-null assertion. |
| 276 | `and(...xpConds)!` — non-null assertion. |
| 296–357 | `runAllIsolationChecks`. |
| 307–336 | Run each check, accumulate errors/warnings. |
| 340–350 | Print results. |

### `services/goals-service.ts`

| Line | Finding |
|------|---------|
| 1 | `import { db, eq, and, asc, desc, gte, lte, inArray, count, sql } from "@reading-advantage/db";` |
| 2–10 | Schema imports: `learningGoals`, `goalMilestones`, `goalProgressLogs`, `users`, `userActivity`, `xpLogs`, `lessonRecords`. |
| 11–17 | Type imports from `@/types/learning-goals`. |
| 18 | Enum imports. |
| 22–29 | Type aliases for goal rows. |
| 33–48 | `loadMilestonesForGoals(goalIds)` — bulk-fetch milestones for many goals. |
| 50–68 | `loadProgressLogsForGoal(goalId, take?, order?)`. |
| 63 | `let q = ... as any` — type erasure. |
| 70 | `GoalsService` static class. |
| 74–108 | `createGoal(userId, input)` — wrapped in `db.transaction`. |
| 95–103 | Insert milestones if provided. |
| 113–154 | `getUserGoals(userId, status?, includeProgress = false)`. |
| 117–131 | Fetch goals filtered by status. |
| 133–134 | Bulk-load milestones. |
| 137–145 | Per-goal `loadProgressLogsForGoal` — **N+1**. |
| 159–180 | `getGoalById(goalId, userId)`. |
| 185–197 | `updateGoal` — spread `input` as `any`. No field-level validation. |
| 202–209 | `deleteGoal`. |
| 214–292 | `updateProgress(goalId, userId, value, activityId?, activityType?, note?)`. Wrapped in transaction. |
| 235 | `previousValue = goal.currentValue`. |
| 238 | `shouldComplete = newValue >= targetValue && status === ACTIVE`. |
| 247–250 | Set `status: COMPLETED, completedAt: new Date()` if `shouldComplete`. |
| 256–264 | Insert progress log. |
| 267–271 | Load milestones. |
| 273–281 | Mark achieved milestones. |
| 284–288 | Reload milestones. |
| 297–353 | `calculateProgress(goalId, userId)`. |
| 312 | Comment: `"progressLogs were fetched in the original Prisma include but never used in the calculation — preserve that behavior and skip the query."` |
| 314–317 | `progressPercentage = Math.min((currentValue / targetValue) * 100, 100)`. |
| 318 | `remainingValue = Math.max(targetValue - currentValue, 0)`. |
| 320–324 | `daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / 86400000)`. |
| 326–329 | `daysSinceStart`. |
| 331 | `averageDailyProgress = currentValue / daysSinceStart`. |
| 333 | `requiredDailyProgress = remainingValue / daysRemaining`. |
| 334 | `isOnTrack = averageDailyProgress >= requiredDailyProgress || currentValue >= targetValue`. |
| 336–338 | `estimatedDaysToComplete`. |
| 340 | `estimatedCompletionDate`. |
| 358–393 | `getUserGoalSummary(userId)`. |
| 373–380 | Per-active-goal `calculateProgress` call — **N+1**. |
| 398–492 | `getGoalRecommendations(userId)`. |
| 399–407 | Fetch user CEFR. |
| 410–415 | Recent XP logs. |
| 417–422 | Recent activities. |
| 427–443 | XP-based recommendation. |
| 446–458 | Reading-streak recommendation. |
| 461–477 | CEFR level advancement. **Hard-codes the ladder.** |
| 462 | `cefrLevels = ["A1-", "A1", "A1+", "A2-", "A2", "A2+", "B1-", "B1", "B1+", "B2-", "B2", "B2+", "C1-", "C1", "C1+", "C2-", "C2"]`. No `C2+`. Diverges from `ArticleCefrLevel` enum. |
| 480–489 | Articles reading recommendation (always pushed regardless of state). |
| 497–641 | `syncProgressFromActivities(userId)`. |
| 513–545 | `GoalType.XP_DAILY` branch. |
| 547–579 | `GoalType.XP_WEEKLY` branch. |
| 581–610 | `GoalType.XP_TOTAL` branch. |
| 612–636 | `GoalType.ARTICLES_READ` branch. |
| 638 | Comment: `// Add more sync logic for other goal types`. The `switch` has no `default`, so unknown types are silently skipped. |

### `services/localization/genre-localization-service.ts`

| Line | Finding |
|------|---------|
| 8 | `import { db, eq } from '@reading-advantage/db';` — single quotes. Inconsistent with double-quote style elsewhere in the batch. |
| 9 | Schema imports. |
| 12 | `SupportedLocale = 'en' | 'th' | 'cn' | 'tw' | 'vi'`. |
| 15–21 | `LOCALES` constant with dynamic imports of locale dictionaries. |
| 24 | `localeCache = new Map<string, any>()` — module-level cache. |
| 29–45 | `getLocaleDictionary(locale)`. |
| 30–32 | Cache hit short-circuit. |
| 35 | Dynamic `import('@/locales/en')`. |
| 38–43 | Failure path: fall back to English, or throw if English fails. |
| 50–61 | `getLocalizedGenreName(genre, locale = 'en')`. |
| 56 | `dictionary.genreEngagement?.genres?.[genre] || genre` — fallback to the raw genre key. |
| 66–99 | `getLocalizedRationale(type, sourceGenre, targetGenre, locale = 'en')`. |
| 76–84 | Fallback templates. |
| 91–93 | Replace `{sourceGenre}` and `{targetGenre}` placeholders. |
| 97 | `return getLocalizedRationale(type, sourceGenre, targetGenre, 'en');` — recursive call on error. |
| 104–115 | `getLocalizedRecommendationType(type, locale = 'en')`. |
| 120–131 | `getLocalizedMetricLabel(metric, locale = 'en')`. |
| 136–147 | `getLocalizedTimeframe(timeframe, locale = 'en')`. |
| 152–163 | `getLocalizedScope(scope, locale = 'en')`. |
| 168–191 | `getLocalizedInsight(insightKey, variables, locale = 'en')`. |
| 175 | `dictionary.genreEngagement?.insights?.[insightKey]`. |
| 178 | `return `Insight: ${insightKey}`;` — fallback. |
| 182–184 | Iterate variables and replace. |
| 196–221 | `getUserLocale(userId)`. |
| 200–205 | Fetch user's school country. |
| 208–213 | `countryLocaleMap` hard-coded. Case-sensitive. |
| 215–216 | `return countryLocaleMap[country || ''] || 'en';` |
| 226–255 | `localizeGenreRecommendation(recommendation, sourceGenre, locale = 'en')`. |
| 260–272 | `localizeGenreList(genres, locale = 'en')`. |
| 277–279 | `clearLocaleCache()` — exists but no caller in this batch. |

### `services/metrics/assignment-prediction-service.ts`

| Line | Finding |
|------|---------|
| 11 | `import { db, sql } from '@reading-advantage/db';` |
| 17–46 | `CompletionPrediction` interface. |
| 48–67 | `ClassAssignmentMetrics` interface. |
| 69–81 | `SchoolAssignmentMetrics` interface. |
| 83–92 | `AtRiskStudent` interface. |
| 101–170 | `getAssignmentPrediction(assignmentId)`. |
| 104–106 | Raw SQL on `mv_assignment_funnel`. |
| 117–131 | Risk factor detection (assignment_age_days, due_date, engagement, overdue_count). |
| 134–143 | Confidence level based on `basedOnSamples`. |
| 156–158 | `data.median_completion_hours ? Number(...) : null` — ternary on numeric value. If `0` is valid, returns `null`. |
| 175–208 | `getClassAssignmentMetrics(classroomId)`. |
| 213–239 | `getSchoolAssignmentMetrics(schoolId)`. |
| 244–319 | `getAtRiskStudents(classroomId?, schoolId?, assignmentId?, limit = 20)`. |
| 251 | `const conditions = [] as ReturnType<typeof sql>[];` |
| 254 | `conditions.push(sql`a.id = ${assignmentId}`);` |
| 257–261 | `classroomId` or `schoolId` condition. |
| 264–268 | Always-on risk condition (overdue, not started > 7d, in_progress > 3d). |
| 270 | `whereClause = sql.join([sql`WHERE`, sql.join(conditions, sql` AND `)], sql` `);` |
| 272–307 | Raw SQL `SELECT ... FROM assignments ... ${whereClause}`. |
| 280–284 | `days_overdue` computed inline. |
| 285–299 | `risk_score` computed inline (10 + 8 + 5 + 6 + 4 max). |
| 309–318 | Map result rows. |
| 324–328 | `refreshAssignmentFunnelMetrics` — three `REFRESH MATERIALIZED VIEW CONCURRENTLY`. |
| 338–397 | `getHistoricalCompletionTime(articleId?, cefrLevel?, raLevel?)`. |
| 347 | Conditions array. |
| 349–358 | If `articleId`, use `a.article_id = ${articleId}`; else use `art.cefr_level` and `art.ra_level` filters. |
| 360–366 | Always-on completion + duration filter. |
| 370–384 | Raw SQL with `PERCENTILE_CONT(0.5)` and `PERCENTILE_CONT(0.8)`. |
| 382 | `JOIN articles art ON a.article_id = art.id` — `articles` plural alias. |
| 386–396 | Map result. |

### `services/metrics/cache-service.ts`

| Line | Finding |
|------|---------|
| 8 | `import { EventEmitter } from 'events';` |
| 14–20 | `MetricsUpdateEvent` type union. |
| 22–26 | `CacheEntry<T>` type. |
| 32–161 | `MetricsCache` class. |
| 36 | `constructor(defaultTTL: number = 5 * 60 * 1000)` — 5-minute default. |
| 45–58 | `generateKey(type, scope, id, params?)`. |
| 51–56 | `paramStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')`. |
| 57 | Key assembly. |
| 63–81 | `get<T>(type, scope, id, params?)` — expiry check. |
| 86–100 | `set<T>(type, scope, id, data, params?, ttl?)`. |
| 105–108 | `invalidate(type, scope, id, params?)`. |
| 113–122 | `invalidatePattern(pattern: RegExp)`. |
| 127–129 | `clear()`. |
| 134–143 | `getStats()` — returns size and keys. |
| 148–160 | `cleanExpired()`. |
| 167–212 | `MetricsNotifier` extends `EventEmitter`. |
| 171–176 | `emitUpdate(event)` — emits multiple event names. |
| 181–204 | `onUpdate(callback, filter?)` — returns unsubscribe function. |
| 209–211 | `getSubscriberCount(eventName)`. |
| 218 | `metricsCache = new MetricsCache()` — module-level singleton. |
| 219 | `metricsNotifier = new MetricsNotifier()` — module-level singleton. |
| 228–248 | `getCachedVelocity<T>(scope, id, fetcher, params?, ttl?)`. |
| 236 | `const cached = metricsCache.get<T>(...)`. |
| 242 | `const data = await fetcher()`. |
| 245 | Cache the result. |
| 253–267 | `invalidateVelocityCache(scope, id)`. |
| 258 | `metricsCache.invalidatePattern(new RegExp(`^velocity:${scope}:${id}`));` |
| 272–279 | `startCacheCleanup(intervalMs = 5 * 60 * 1000)`. |
| 273 | `return setInterval(...)` — handle returned but not held. |
| 284–312 | `getMetricsCacheHealth()`. |

### `services/metrics/genre-engagement-service.ts`

| Line | Finding |
|------|---------|
| 9 | `import { db, sql, eq, and, gte, isNotNull, like } from '@reading-advantage/db';` |
| 10–15 | Schema imports: `users`, `articles`, `chapters`, `genreAdjacencies`. |
| 16–20 | Localization service imports. |
| 23–39 | `GenreEngagementData` interface. |
| 41–48 | `GenreRecommendation` interface. |
| 50–59 | `GenreMetricsResponse` interface. |
| 62–81 | `RECOMMENDATION_CONFIG` constant. |
| 84–85 | `CEFR_LEVELS` array and `CEFR_LEVEL_INDEX` lookup. |
| 90–94 | `getCefrDistance(level1, level2)`. |
| 101–104 | `isCefrAppropriate` — exported but unused inside this module. |
| 109–140 | `getStudentGenreEngagement(userId, timeframe = '30d')`. |
| 113 | `getTimeframeFilter(timeframe)` — helper defined below. |
| 115–137 | Raw SQL on `mv_genre_engagement_metrics`. |
| 145–171 | `getClassGenreEngagement(classroomId, timeframe = '30d')`. |
| 151–168 | Raw SQL on `mv_class_genre_engagement` joined to `mv_genre_engagement_metrics`. |
| 176–202 | `getSchoolGenreEngagement(schoolId, timeframe = '30d')`. |
| 207–309 | `generateStudentGenreRecommendations(userId, currentEngagement)`. |
| 220 | `getUserLocale(userId)` — fetches locale. |
| 222 | `studentCefrBucket = user.cefrLevel.substring(0, 2)`. Inconsistent substring length. |
| 227–230 | Fetch adjacencies. |
| 232–257 | Type 1: high engagement similar genres. |
| 259–280 | Type 2: underexplored adjacent genres. |
| 282–303 | Type 3: level-appropriate new genres. |
| 314–334 | `generateRationale(type, sourceGenre, targetGenre, locale = 'en')`. |
| 339–366 | `checkGenreCefrAlignment(genre, studentCefrBucket)`. |
| 371–388 | `getAllAvailableGenres()`. |
| 393–407 | `getTimeframeFilter(timeframe)` switch. |
| 412–430 | `formatEngagementData(raw)`. |
| 416 | `parseInt(raw.totalReads) || 0`. |
| 423 | `parseFloat(raw.weightedEngagementScore) || 0`. |
| 435–439 | `refreshGenreEngagementMetrics`. |
| 444–486 | `getGenreMetrics(scope, scopeId, timeframe = '30d')`. |

### `services/metrics/srs-health-service.ts`

| Line | Finding |
|------|---------|
| 12 | `import { db, sql } from '@reading-advantage/db';` |
| 18–79 | `SRSHealthMetrics` interface. |
| 81–115 | `ClassSRSHealthMetrics` interface. |
| 117–144 | `SchoolSRSHealthMetrics` interface. |
| 146–153 | `SuggestedAction` interface. |
| 155–161 | `OverloadThresholds` interface. |
| 164–170 | `DEFAULT_OVERLOAD_THRESHOLDS` constant. |
| 179–250 | `getStudentSRSHealth(userId, thresholds = DEFAULT_OVERLOAD_THRESHOLDS)`. |
| 183–185 | Raw SQL on `mv_srs_health`. |
| 194 | `generateSuggestedActions(data, thresholds)`. |
| 196–249 | Map result. |
| 255–299 | `getClassSRSHealth(classroomId)`. |
| 258–260 | Raw SQL on `mv_srs_health_class`. |
| 292 | `Number(data.overloaded_students) + Number(data.critical_backlog_students)` — NaN if either is null. |
| 293 | `Math.round(Number(data.avg_due_per_student) * Number(data.total_students))` — NaN risk. |
| 304–342 | `getSchoolSRSHealth(schoolId)`. |
| 307–309 | Raw SQL on `mv_srs_health_school`. |
| 347–420 | `getAtRiskStudents(classroomId?, schoolId?, limit = 20)`. |
| 363–367 | `conditions.push(sql`h.user_id IN (SELECT cs.student_id FROM classroom_students cs WHERE cs.classroom_id = ${classroomId})`);` |
| 425–510 | `generateSuggestedActions(healthData, _thresholds)`. |
| 427 | `_thresholds` parameter unused. |
| 432–442 | Critical backlog action. |
| 445–462 | Overloaded + due cards actions. |
| 465–473 | High lapse rate action. |
| 476–493 | Inactive student actions. |
| 496–507 | Regular maintenance action. |
| 515–517 | `refreshSRSHealthMetrics` — single function call. |
| 522–527 | `getSchoolOverloadThresholds(_schoolId)` — always returns defaults; `_schoolId` ignored. |

### `services/metrics/velocity-service.ts`

| Line | Finding |
|------|---------|
| 10 | `import { db, sql } from '@reading-advantage/db';` |
| 16–55 | `VelocityMetrics` interface. |
| 57–77 | `ClassVelocityMetrics` interface. |
| 79–97 | `SchoolVelocityMetrics` interface. |
| 99–116 | `SystemVelocityMetrics` interface. |
| 118–121 | `DailyXpLog` interface. |
| 128 | `MIN_VELOCITY_THRESHOLD = 0.5`. |
| 131 | `MIN_ACTIVE_DAYS = 3`. |
| 134 | `EMA_ALPHA = 0.2`. |
| 137 | `CONFIDENCE_MULTIPLIER = 1.96`. |
| 147–172 | `calculateEMA(userId, days = 30)`. |
| 151–160 | Raw SQL on `xp_logs`. |
| 164 | `ema = Number(dailyLogs[0].xpEarned)` — first day seeds EMA. |
| 177–198 | `calculateStdDev(userId, days = 30)`. |
| 204–261 | `calculateETA(xpToNextLevel, velocity, stdDev, activeDays)`. |
| 217 | `if (activeDays < MIN_ACTIVE_DAYS || velocity < MIN_VELOCITY_THRESHOLD || xpToNextLevel <= 0)` — low-signal short-circuit. |
| 230 | `velocityLow = Math.max(0.1, velocity - CONFIDENCE_MULTIPLIER * stdDev)`. |
| 240–252 | Confidence band based on coefficient of variation. |
| 270–337 | `getStudentVelocity(userId, includeConfidence = true)`. |
| 274–276 | Raw SQL on `mv_student_velocity`. |
| 285 | `emaVelocity = Number(data.xp_per_calendar_day_30d) || 0`. |
| 289–292 | If `includeConfidence`, parallel `calculateEMA` + `calculateStdDev`. |
| 296–301 | `calculateETA(...)`. |
| 303–336 | Map result. |
| 342–374 | `getClassVelocity(classroomId)`. |
| 343–345 | Raw SQL on `mv_class_velocity`. |
| 379–409 | `getSchoolVelocity(schoolId)`. |
| 414–470 | `getBulkStudentVelocity(userIds, includeConfidence = false)`. |
| 420–422 | Raw SQL with `WHERE user_id = ANY(${userIds})`. |
| 429–464 | Bulk path without confidence. |
| 467–469 | Bulk path with confidence — Promise.all of `getStudentVelocity` per user. |
| 475–536 | `getSystemVelocity`. |
| 477–503 | Raw SQL aggregating `mv_school_velocity`. |
| 506–509 | Second raw SQL counting classrooms in `mv_class_velocity`. |
| 516 | `const totalClasses = classData?.[0]?.total_classes || 0;` — OK. |
| 541–545 | `refreshVelocityMatviews` — three `CONCURRENTLY` refreshes. |

### `services/refresh-matviews-service.ts`

| Line | Finding |
|------|---------|
| 1 | `import { db, sql } from "@reading-advantage/db";` |
| 6–28 | `MATERIALIZED_VIEWS` array with `name` and `level` (1, 2, 3). |
| 30–36 | `RefreshResult` interface. |
| 41–56 | `viewExists(viewName)`. |
| 43–50 | Raw SQL on `pg_matviews`. |
| 52 | `catch (error: any)` — `any` type. |
| 53 | `console.error(...)`. |
| 54 | `return false`. |
| 61–116 | `refreshView(viewName, level)`. |
| 68–78 | Check existence; return `skipped` if missing. |
| 82–84 | `sql.raw(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}`)`. Template literal concatenation of view name. If viewName contains SQL injection characters, vulnerable. The view names are hard-coded constants so safe in practice. |
| 96 | Fallback to non-concurrent refresh. |
| 121–168 | `refreshAllMaterializedViews`. |
| 132–139 | Group views by level. |
| 142–152 | Refresh each level in order, parallel within level. |
| 154–160 | Aggregate stats. |

### `services/srs-quick-actions-service.ts`

| Line | Finding |
|------|---------|
| 11 | `import { db, eq, and, inArray, asc, desc, lt, lte } from '@reading-advantage/db';` |
| 12–19 | Schema imports. |
| 20 | `Role` from `@/lib/enums`. |
| 26–38 | `QuickActionRequest` interface. |
| 40–52 | `QuickActionResponse` interface. |
| 54–60 | `ReviewSessionConfig` interface. |
| 62–67 | `ReminderConfig` interface. |
| 69–73 | `LoadReductionConfig` interface. |
| 82–209 | `createReviewSession(config)`. |
| 85 | `const actionId = `review_${config.userId}_${Date.now()}`;`. |
| 88–106 | `buildFilter(due, state)` — switch on `targetFilter`. |
| 109–125 | Fetch vocabulary cards. `vocabFilter = buildFilter(userWordRecords.due, userWordRecords.state)`. |
| 128–147 | Fetch sentence cards. |
| 149 | `const totalCards = vocabCards.length + sentenceCards.length;` |
| 166–171 | Build session URL. |
| 176–180 | `logQuickAction(actionId, 'review_session', config.userId, {...})`. |
| 214–285 | `sendPracticeReminders(config)`. |
| 217 | `const actionId = `reminder_${Date.now()}`;`. |
| 221–227 | Validate user IDs. |
| 242–249 | Build `reminderEntries` array. |
| 252–256 | `logQuickAction`. |
| 259 | `console.log('[QuickAction] Reminders would be sent:', reminderEntries);` |
| 290–338 | `reduceCardLoad(config)`. |
| 293 | `const actionId = `reduce_load_${config.userId}_${Date.now()}`;`. |
| 300–303 | `logQuickAction`. |
| 306–313 | Comment block describes Prisma implementation that is not active. |
| 343–444 | `createTeacherAlert(teacherId, studentIds, alertType, message)`. |
| 349 | `const actionId = `teacher_alert_${teacherId}_${Date.now()}`;`. |
| 353–357 | Fetch teacher role. |
| 359–368 | If not teacher, return `failed`. |
| 370–374 | Fetch teacher's classrooms. |
| 377–392 | Validate students are in teacher's classes. |
| 405–418 | Log action. |
| 449–480 | `logQuickAction(actionId, actionType, userId, metadata)`. |
| 455–464 | `console.log` only. |
| 466–475 | Commented-out Prisma implementation. |
| 485–515 | `checkActionIdempotency(actionId)`. |
| 487–509 | Always returns `null`. |
| 520–608 | `executeQuickAction(request, executorId)`. |
| 527–538 | `review_session` case. |
| 532 | `return createReviewSession({ userId, cardLimit: parameters.cardLimit || 25, targetFilter: parameters.targetFilter || 'due', sessionDuration: parameters.sessionDuration || 15, priority: parameters.priority || 'medium' });` |
| 540–549 | `reduce_load` case. Hard-codes `reductionPercentage: 50, duration: 7`. |
| 551–575 | `send_reminder` case. Resolves target users by `userId`, `classroomId`, or `schoolId`. |
| 577–604 | `teacher_alert` case. Hard-codes `alertType: 'overload'` (line 603). |

---

## Severity Summary

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 8 | ADMIN bypass in `requireClassroomAccess`; `getSystemVelocity` accessible without auth; client-controlled XP in `wizard-zombie`; AI provider SDK direct usage; tenant-name sentinel in `verifyDemoLicense`; inconsistent `Role` enum casing across files; missing `C2+` in CEFR ladder in `goals-service`; `gameRankings` composite unique constraint unverified. |
| High | 19 | Vestigial `server/middleware.ts`; N+1 queries in `ai-insight-service.ts`, `goals-service.ts`, `demo-isolation-service.ts`; raw `execute` on every metrics query; read-modify-write XP race in `wizard-zombie`; `timeframe` ignored in `velocity-controller.ts`; CSV injection in `convertToCSV`; `isIdempotent: true` is a lie (`actionId` not persisted); `logQuickAction` is `console.log` only; `void scope/userId/classroomId/licenseId` in `parseAIResponse`; `parseAIResponse` regex greedy; `velocityLow = Math.max(0.1, ...)` magic; hard-coded `gameRankings` upsert key; missing `SYSTEM`-scope check in `velocity-controller`; `server/middleware.ts` `logRequest` returns void; `combineGuards` empty-guard bypass; `MATERIALIZED_VIEWS` hard-coded list. |
| Medium | 22 | Module-level singletons in `cache-service`; timer not `.unref()`'d in `startCacheCleanup`; `checkGenreCefrAlignment` substring inconsistency; `genre-localization` dynamic imports; snake_case field names across model files vs camelCase in Drizzle; `getUserLocale` case-sensitive country map; `recentActivities` `void`'d; `classroomId` N+1 in `wizard-zombie.getRanking`; `getAtRiskStudents` always-on risk condition duplication; `getClassSRSHealth` NaN risk; `generateSuggestedActions` ignores `_thresholds`; `getSchoolOverloadThresholds` ignores `_schoolId`; `checkAccess` `session: any`; `session.user.role as Role` cast; `bulk path confidenceBand: 'none'`; `Cache-Control` contradicts body `cache.cached: false`; `School.csv` covers `system` shape incorrectly; `actualScope = scope || "system"` default; `genre-localization` cache not invalidated in dev; `chapters` import unverified. |
| Low | 19 | Console.log debug in `wizard-zombie` line 30–36; `viewExists` swallows errors; `Student` enum `StudentProfile`; `pronunciation` typos; `flashcards` reading score as accuracy; `License` `Omit<...>` mismatch; `License` interface vs implementation field mismatch; `models/user.ts` documents dead shape; `models/enum.ts` lowercase Role; `models/enum.ts` `LicenseSubScriptionLevel` typo; `models/enum.ts` `LicenseExpirationDate` string-typed numbers; `velocity-controller.ts` filename injection; `school_id` vs `schoolId`; `console.error` only on errors; `Class.csv` school not escaped; `void classroomIds` in `ai-insight-service`; `void recentActivities`; `getStudentGoalSummary` no role check; `velocity-controller.ts` `Cache-Control` on private body; `gameRankings` `sql``...``` operator. |

---

## Recommendations (Not Acceptance)

1. **Remove or wire `server/middleware.ts`.** The 11-line file is
   disconnected from the actual Next.js middleware at
   `apps/reading-advantage/middleware.ts` (reviewed in Batch 43).
   Either delete it or integrate it.

2. **Move business logic out of route handlers.** `velocity-controller.ts`
   and `wizard-zombie-controller.ts` should delegate to backend
   modules per `AGENTS.md`. The services in this batch
   (`velocity-service.ts`, `goals-service.ts`, etc.) are a good
   template — the controllers should call them.

3. **Centralize RBAC.** Replace inline role checks in
   `velocity-controller.ts:212-303` and `wizard-zombie-controller.ts`
   with calls to `requireRole`, `requireSchoolAccess`,
   `requireClassroomAccess` from `server/middleware/guards.ts`.

4. **Finish the `requireClassroomAccess` ADMIN branch.** Lines
   199–201 of `guards.ts` ship as TODO; admins currently bypass
   classroom-school scoping.

5. **Add system-scope authorization.** `velocity-controller.ts:467-470`
   calls `getSystemVelocity()` for any caller. Verify the caller
   is `ADMIN` or `SYSTEM` first.

6. **Resolve the `Role` enum divergence.** `models/enum.ts:15-21`
   uses lowercase values; `lib/enums.ts` uses uppercase; Drizzle
   `roleEnum` uses uppercase. Pick one. The lowercase variant
   appears unused outside `models/user.ts`.

7. **Replace direct OpenAI SDK usage in `ai-insight-service.ts`.**
   `openai(openaiModel)` (lines 148, 268, 367, 441, 1135) bypasses
   the AI adapter. Use `getAIClient()` from `@reading-advantage/ai`.

8. **Use a Zod schema for AI insight parsing.** `parseAIResponse`
   at `ai-insight-service.ts:850-920` extracts a JSON array via
   regex; validate with `z.array(...)`.

9. **Persist `quickAction` log.** `srs-quick-actions-service.ts`
   has `isIdempotent: true` claims but no persistent log table.
   Either persist or remove the idempotency promise.

10. **Scope every metrics query to a tenant.** The `db.execute(sql)`
    pattern in `velocity-service`, `srs-health-service`,
    `genre-engagement-service`, `assignment-prediction-service`
    bypasses tenant scoping. Inject `schoolId` / `classroomId`
    filters consistently.

11. **Refresh `MATERIALIZED_VIEWS` automatically.** Hard-coded list
    in `refresh-matviews-service.ts` is a maintenance hazard.
    Reflect over `pg_matviews` and skip non-existent views.

12. **Hold the `setInterval` handle in `cache-service.ts`.** Add
    `.unref()` to the timer to avoid blocking Node.js shutdown.

13. **Use a transaction wrapper in `syncProgressFromActivities`.**
    `goals-service.ts:497-641` issues N updates without a
    transaction. A failure mid-loop leaves goals stale.

14. **De-duplicate the CEFR ladder.** `goals-service.ts:462`
    hard-codes the ladder; `models/article.ts:3-22` defines
    `ArticleCefrLevel`. Move to `@/lib/enums` or
    `packages/types`.

15. **Replace `let q = ... as any` in `goals-service.ts:63`.** The
    cast erases Drizzle's inferred row type. Use conditional
    builder methods instead.

16. **Map snake_case fields out of `sessionUserSchema`.** The
    `school_id`, `teacher_class_ids`, etc. surface in
    `middleware/guards.ts` matches the session but not the
    Drizzle schema. A small mapper would let the rest of the
    codebase use camelCase consistently.

17. **CSV-escape fields in `velocity-controller.ts:convertToCSV`.**
    Quoting commas/quotes/newlines per RFC 4180.

18. **Run CSRF/session-mutation checks before `req.session.user.xp = updatedXp`.**
    `wizard-zombie-controller.ts:100-102` mutates the request
    session directly.

---

*This report documents coverage and findings only. It makes no
acceptance claims and does not assert that the listed issues are
complete.*

MEASURE_AGENT_RESULT