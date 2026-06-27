# Line-by-Line Review: Reading Advantage — Batch 46

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-46`
**Baseline SHA:** `e2dd2e9059a77864cdbe2778e4bc5ec6301c7bc6`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / SQL / static-asset / privacy / security

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-46` were read in full. The batch
covers server-side route controllers under `apps/reading-advantage/server/controllers/`
for metrics, games, questions, stories, dashboards, notifications, system
operations, translations, users, and validation.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/server/controllers/metrics-controller.ts` | 1–388 |
| 2 | `apps/reading-advantage/server/controllers/metrics-extended-controller.ts` | 1–446 |
| 3 | `apps/reading-advantage/server/controllers/potion-rush-controller.ts` | 1–358 |
| 4 | `apps/reading-advantage/server/controllers/question-controller.ts` | 1–1428 |
| 5 | `apps/reading-advantage/server/controllers/rpg-battle-controller.ts` | 1–319 |
| 6 | `apps/reading-advantage/server/controllers/rune-match-controller.ts` | 1–310 |
| 7 | `apps/reading-advantage/server/controllers/srs-health-controller.ts` | 1–617 |
| 8 | `apps/reading-advantage/server/controllers/srs-quick-actions-controller.ts` | 1–273 |
| 9 | `apps/reading-advantage/server/controllers/stories-assistant-controller.ts` | 1–318 |
| 10 | `apps/reading-advantage/server/controllers/stories-controller.ts` | 1–880 |
| 11 | `apps/reading-advantage/server/controllers/stories-question-controller.ts` | 1–1910 |
| 12 | `apps/reading-advantage/server/controllers/student-dashboard-controller.ts` | 1–148 |
| 13 | `apps/reading-advantage/server/controllers/student-notification-controller.ts` | 1–145 |
| 14 | `apps/reading-advantage/server/controllers/system-controller.ts` | 1–740 |
| 15 | `apps/reading-advantage/server/controllers/system-dashboard-controller.ts` | 1–64 |
| 16 | `apps/reading-advantage/server/controllers/teacher-assignment-controller.ts` | 1–216 |
| 17 | `apps/reading-advantage/server/controllers/teacher-dashboard-controller.ts` | 1–277 |
| 18 | `apps/reading-advantage/server/controllers/translation-controller.ts` | 1–723 |
| 19 | `apps/reading-advantage/server/controllers/user-controller.ts` | 1–1504 |
| 20 | `apps/reading-advantage/server/controllers/validator-controller.ts` | 1–454 |

**Total lines reviewed:** 11,290.

---

## Cross-Cutting Findings

The following issues appear repeatedly across nearly every file in the batch.
They are noted per-file only where most relevant.

1. **Business logic lives in Next.js route controllers.** AGENTS.md requires
   domain behavior in `/packages/backend` modules. These controllers perform
   direct DB mutations, XP arithmetic, ranking updates, aggregation, and
   authorization inline.
2. **No Zod input validation.** `req.json()` and `searchParams` values are
   cast or used directly. No input schemas, output schemas, or typed contracts
   are defined for the controller entrypoints.
3. **Tenant IDs are accepted from the frontend.** `schoolId`, `classroomId`,
   and `studentId` are read from query/body without verifying that the caller
   has access to that tenant. A few controllers (SRS health, quick actions)
   perform RBAC checks, but the majority do not.
4. **Race conditions on XP updates.** The common pattern is: `select users.xp`,
   compute `updatedXp = user.xp + delta`, then `update users set xp = updatedXp`.
   Concurrent game completions or question answers can overwrite each other.
   `gameRankings.onConflictDoUpdate` with `sql"totalXp + ..."` is atomic, but
   the user XP update is not.
5. **Raw `console.log` / `console.error` in production paths.** Timing logs,
   debug objects, and error dumps are emitted without structured logging.
6. **`any` casts and `as` assertions** are used throughout, especially for
   `activity.details`, request bodies, and loosely-typed DB JSON columns.
7. **Storage and AI provider SDKs are used directly.** Multiple files call
   `storage.bucket(...)`, `@google-cloud/translate`, and provider-specific
   model constructors rather than the internal adapter interfaces described in
   AGENTS.md.
8. **Dead / unreachable code.** `validator-controller.ts` returns 501 at the
   top of `validateArticle`; the remainder of the function and its helpers are
   dead. `stories-controller.ts` contains a `try` block that issues queries
   whose results are never used.

---

## File 1 — `apps/reading-advantage/server/controllers/metrics-controller.ts`

### Imports and exports (lines 1–21)
- L1 `import { NextResponse } from "next/server"` — standard Next.js response.
- L2 `ExtendedNextRequest` imported from `auth-controller`. Tight coupling to
  auth implementation; not a backend module boundary.
- L3–14 Imports a large list of dashboard response types from `@/types/dashboard`.
- L15–16 Direct DB import from `@reading-advantage/db` and schema tables.
- L18 Imports `advancedCache, createCachedQuery` but only `createCachedQuery` is
  used; `advancedCache` is dead.
- L21 Re-exports `getEnhancedAlignmentMetrics` as `getAlignmentMetrics` from
  another controller. Re-exporting controller functions is unusual; the
  consumer should import from the source controller.

### `fetchActivityData` (lines 26–76)
- L26 Signature accepts `schoolId?: string | null, classId?: string | null`
  from caller without validation.
- L29 `timeframe` only recognizes `'7d'`, `'90d'`; anything else falls through
  to 30 days. No schema validation.
- L33–35 Builds base conditions. When `schoolId` is provided, the condition is
  `gte(userActivity.createdAt, startDate) AND eq(users.schoolId, schoolId)`.
  This trusts the query-param `schoolId` and does not verify the caller's
  membership in that school.
- L37–63 Two near-identical query branches for `classId` present vs absent.
  The duplication could be collapsed by making the classroom join conditional.
- L47 `.innerJoin(users, ...)` is required even when `classId` is absent
  because the `schoolId` branch references `users.schoolId`.
- L65–73 Maps DB rows into a synthetic `filteredActivities` shape with a
  `user.studentClassrooms` array. This is presentational transformation that
  belongs closer to the response contract than the DB fetch.

### `getActivityMetrics` (lines 83–228)
- L86–93 Session check returns 401. Role/authorization beyond authentication
  is not checked.
- L96–98 `timeframe`, `schoolId`, `classId` read directly from `searchParams`.
- L101 Cache key includes the raw `session.user.id`, which is fine for
  private caching, but the key never contains the literal `'cached'`.
- L113 `console.log(...cacheKey.includes('cached') ? 'HIT' : 'MISS'...)` will
  always print `MISS` because `'cached'` is not inserted into the key. This
  is dead logic and misleading telemetry.
- L116–132 Initializes a date map by mutating `startDate` in a `for` loop.
  `startDate` is reused later in the response but is mutated to exceed `now`.
- L135 `filteredActivities.forEach((activity: any) => { ... })` — `any` cast
  bypasses the mapped type.
- L142 `data.sessions += 1` counts every activity row as one session. If a
  user has multiple activities on the same day, the session count equals the
  activity count, not unique sessions.
- L147–149 New-user detection compares the activity date to the user's
  `createdAt`. A user created before the range can still be "new" on the day
  they first appear in the range, which is intentional but worth noting.
- L161–163 `averageSessionLength` rounds to one decimal by `Math.round(... * 10) / 10`.
- L168–170 `totalActiveUsers` recomputes a set from `filteredActivities`.
- L178–180 Overall average session length recomputes from raw activities,
  which is consistent with the per-day values.
- L182–184 `peakDay` reducer has a verbose fallback literal.
- L195–198 Cache metadata hardcodes `cached: false`. The cached query helper
  is used but the response never reflects a cache hit.
- L207 Caches with `private, max-age=60, stale-while-revalidate=240`.
- L211–226 Error response includes `error.message` in `details`, which may
  leak internal DB or environment information.

### `getAssignmentMetrics` (lines 235–387)
- L247–250 Same unvalidated query parameters.
- L257–263 Builds assignment conditions. `schoolId` is applied via
  `classrooms.schoolId`, trusting the frontend-provided value.
- L265–276 Selects assignments joined to classrooms.
- L278–288 Fetches student assignments only if `assignmentRows.length > 0`,
  using `inArray`. Good batching.
- L297–332 Maps per-assignment metrics. `averageScore` and `completionRate`
  are computed in memory.
- L310–312 `scores` array filters nulls and asserts non-null with `sa.score!`.
- L347–359 Response shape matches `MetricsAssignmentsResponse`.
- L371–386 Error handling mirrors `getActivityMetrics`.

---

## File 2 — `apps/reading-advantage/server/controllers/metrics-extended-controller.ts`

### `getGenreMetrics` (lines 21–198)
- L21–198 Repeats the controller-as-business-logic pattern.
- L34–36 Same unvalidated `timeframe`, `schoolId`, `classId`.
- L39–46 Timeframe fallback chain defaults to 365 days.
- L50–52 `genreBaseConditions` again trusts `schoolId` from query params.
- L54–85 Two query branches. When `classId` is absent, `classroomStudents` is
  `leftJoin`ed without a filter. A student in multiple classrooms will produce
  duplicate lesson records, inflating counts.
- L87–98 Maps rows into a synthetic shape with `user.studentClassrooms`.
- L110 `forEach((record: any) => ...)` — `any` cast.
- L122 Uses non-null assertion `genreMap.get(genre)!`.
- L129 `totalReads` is `filteredRecords.length`. If duplicates exist from the
  left join, the denominator is inflated.
- L147–157 Shannon-entropy diversity calculation. `maxEntropy` clamps to 10
  genres. This is arbitrary but documented only by code.
- L159–171 Response includes hardcoded `cached: false`.

### `getSRSMetrics` (lines 205–209)
- L207 Dynamic import of `./srs-health-controller` then delegates to
  `getSRSHealthMetrics`. Dynamic import inside every request adds latency and
  complicates tracing; a static import would suffice.

### `getVelocityMetrics` (lines 216–445)
- L229–232 `timeframe`, `studentId`, `schoolId`, `classId` from query params.
- L235–263 If `studentId` is provided, calls `getStudentVelocity` and returns
  early. No RBAC check on `studentId`.
- L277–279 Same tenant-id trust issue.
- L281–312 Query branches. The no-class branch uses `leftJoin(classroomStudents)`
  which can duplicate rows.
- L314–325 Maps rows to synthetic shape.
- L338–347 Initializes date map by mutating `startDate`.
- L349 `forEach((record: any) => ...)` — `any` cast.
- L356–359 Word count uses `split(/\s+/)` and reading time assumes 200 wpm.
  Both are crude heuristics.
- L380–384 `averagePerDay = totalArticles / daysAgo`. If the range has zero
  articles this produces 0 as expected.
- L385–403 Trend is computed by splitting the date range in half. This is a
  simple before/after comparison, not a true trend model.
- L405–419 Response matches `MetricsVelocityResponse` with `cached: false`.

---

## File 3 — `apps/reading-advantage/server/controllers/potion-rush-controller.ts`

### `completeGame` (lines 14–165)
- L16 `const userId = req.session?.user?.id;` — relies on session middleware.
- L22–30 `req.json()` destructured without validation. `score`, `correctAnswers`,
  `totalAttempts`, `accuracy`, `difficulty`, `gameTime` are all unvalidated.
- L33–45 Checks only that three fields are not `undefined`; does not check
  types, ranges, or that `accuracy` is a number.
- L50–54 Difficulty multipliers are hardcoded. `easy` and `normal` both yield
  multiplier 1, which is suspicious.
- L56–58 `xpEarned = Math.floor(correctAnswers * accuracy * difficultyMultiplier)`.
  In `rune-match-controller.ts` accuracy is divided by 100; here it is used
  directly, suggesting inconsistent units across game controllers.
- L61 `uniqueTargetId` based on `Date.now()` is fine for uniqueness within a
  millisecond but not cryptographically random.
- L65–83 Inserts `userActivity` record.
- L86–136 XP update block:
  - L94–99 Select user row.
  - L102 Compute `updatedXp = user.xp + xpEarned`.
  - L103–106 Update user XP in separate statement — not atomic.
  - L109–111 Mutate `req.session.user.xp` — side effect on request object.
  - L114–135 Upsert `gameRankings`. This uses atomic `onConflictDoUpdate`
    with `sql"totalXp + ..."`, which is correct.
- L130–135 Ranking update failure is caught and warned but the endpoint still
  returns success. This is acceptable for a non-critical leaderboard but may
  hide data inconsistency.

### `getRanking` (lines 167–248)
- L176–184 Fetches current user's `licenseId` and `schoolId`.
- L187–192 Ranking scope uses license first, then school. No explicit check
  that the caller belongs to the returned license/school.
- L194–205 Joins `gameRankings` to `users` and orders by `totalXp` DESC.
- L207–235 Groups in memory and limits each difficulty to top 20. Doing the
  limit in JS after sorting the whole table is inefficient.
- L237 Returns `{ rankings: sortedRankings }` without the caller's own rank.

### `getSentences` (lines 250–357)
- L260–270 Selects from `userSentenceRecords` where `saveToFlashcard = true`,
  ordered by due date and stability.
- L282–299 Locale detection from query param and `accept-language`. Hardcodes
  mapping for `cn`, `tw`, `zh`. No canonical locale normalization.
- L305–319 Parses `translation` JSON with `as any` and a fallback chain of
  language keys. If no key matches, falls back to `record.sentence`, which may
  defeat the game purpose.
- L329 `filter((item) => item.term && item.translation)` removes blanks after
  mapping.
- L331–340 If fewer than 5 sentences, returns a warning response with
  `status: 200`. The caller must inspect `warning` to detect the shortfall.

---

## File 4 — `apps/reading-advantage/server/controllers/question-controller.ts`

### `getUserLicenseLevel` (lines 25–63)
- L25–63 Duplicates the same helper in `user-controller.ts`. This should be a
  shared domain function.
- L37 Falls back to `BASIC` if user not found.
- L49–58 Expired-date logic treats no expiration as enterprise, matching the
  duplicate in `user-controller.ts`.

### `checkAndUpdateArticleCompletion` (lines 65–166)
- L73–82 Selects **all** `MC_QUESTION` activities for the user, then filters
  by `articleId` in JS (L84–87). This loads an unbounded history.
- L89–113 Separate queries for SAQ and LAQ. Uses string literals
  `"SA_QUESTION"`, `"LA_QUESTION"`, `"ARTICLE_READ"` instead of the
  `ActivityType` enum in places.
- L119–127 License-level gating: enterprise requires MCQ + SAQ + LAQ; others
  require MCQ + SAQ.
- L142–161 Upserts an `ARTICLE_READ` activity when all questions complete.

### `getMCQuestions` (lines 181–476)
- L185 `const { article_id } = await ctx.params;` — route param not validated.
- L187 `const userId = req.session?.user.id as string;` — casts, no null check
  beyond L189.
- L208–211 Selects existing MC questions for the article.
- L213–259 If none exist, generates 5 MC questions sequentially via
  `generateMCQuestion`, then inserts each question in a separate `insert` call.
  Batch insert would reduce round-trips.
- L227 `cefrlevel` is cast `as any`.
- L263–273 Loads **all** user MC activities again, filters by article in JS.
- L295–331 Builds `progress`, `answeredQuestionIds`, `questionData` by iterating
  sorted activities.
- L309–310 Handles stringified JSON details with `JSON.parse` and catches
  errors silently.
- L334–336 Fills remaining slots with `UNANSWERED`.
- L388–390 Shuffles unanswered questions with `Math.random() - 0.5`. This is a
  biased shuffle (Fisher-Yates is preferred) and produces non-deterministic
  output.
- L419–433 Maps response. L425 re-shuffles options with the same biased sort.
- L446–461 Includes a `summary` even in `INCOMPLETE` state.

### `getSAQuestion` / `answerSAQuestion` (lines 478–717)
- L478–597 Loads or generates short-answer questions. Returns a random one.
- L552 `cefrlevel` cast `as any`.
- L599–717 `answerSAQuestion`:
  - L604–605 `answer`, `timeRecorded` not validated.
  - L621–671 Upserts `userActivity` with targetId = article_id.
  - L680–686 Always awards exactly 3 XP if user exists, regardless of answer
    quality or correctness.
  - L698 Calls `checkAndUpdateArticleCompletion`.

### `getLAQuestion` / `answerLAQuestion` (lines 719–1118)
- L752 Returns `status: 400` when user already answered, while `getSAQuestion`
  returns `status: 200` for the same condition. Inconsistent HTTP semantics.
- L775 `cefrlevel` cast `as any`.
- L1047–1079 `answerLAQuestion` inserts/upserts activity but does **not** award
  XP. XP is awarded separately by `getLAQuestionXP`.
- L1091–1097 `scores` values summed with `reduce<number>`.
- L1099 Calls `checkAndUpdateArticleCompletion`.

### `answerMCQuestion` (lines 819–947)
- L825 `selectedAnswer`, `timeRecorded` unvalidated.
- L841 `const isCorrect = selectedAnswer === question.answer;` — `selectedAnswer`
  is whatever the client sent. `question.answer` is the correct answer string
  stored at insert time. `question.correctAnswer` is hardcoded to 0 during
  generation. The comparison is string equality, so a client sending the text
  of the correct option will succeed.
- L843–897 Upserts `userActivity` by `targetId = question_id`.
- L899–924 Awards 1 XP (`UserXpEarned.MC_Question`) only if correct.
- L926 Calls `checkAndUpdateArticleCompletion`.

### `retakeMCQuestion` (lines 949–1023)
- L957–966 Loads all user MC activities, filters by articleId in JS.
- L975–1003 Deletes XP logs for those activities, then recomputes total XP
  from **all** remaining XP logs and updates the user. This is correct but
  expensive.
- L1006–1010 Deletes user activities.

### `getLAQuestionXP` (lines 1248–1340)
- L1254 `rating` from body, unvalidated.
- L1306 `xpEarned = Math.max(1, Math.floor(rating / 2))` — allows arbitrary
  XP from client-provided rating.
- L1308–1323 Updates user XP and inserts XP log.

### `rateSAQuestion` (lines 1342–1428)
- L1348 `rating` from body.
- L1394–1396 `updatedXp = user.xp + rating` — adds raw client rating directly
  to XP. Potential abuse if a large number is sent; no range check.

---

## File 5 — `apps/reading-advantage/server/controllers/rpg-battle-controller.ts`

### `completeGame` (lines 14–157)
- L16–20 Session check.
- L22–32 `req.json()` destructured without validation.
- L35–50 Checks only presence of five fields.
- L53 `uniqueTargetId` uses `Date.now()`.
- L57–77 Inserts `userActivity` with activity type string literal `"RPG_BATTLE"`
  (L61) instead of `GameType.RPG_BATTLE` enum.
- L79–128 XP update block mirrors `potion-rush-controller.ts`:
  - L91–102 Non-atomic user XP update.
  - L105–107 Session mutation.
  - L111–127 Upsert `gameRankings` using `enemyId` as `difficulty`.

### `getRanking` (lines 159–237)
- L178–184 Scope by license/school, trusting caller's own membership.
- L186–197 Join and order by XP.
- L207–224 Groups by `enemyId` in memory, limits to top 10 per enemy.

### `getVocabulary` (lines 239–318)
- L248–258 Selects `userWordRecords` with `saveToFlashcard = true`.
- L271 `const wordData = vocab.word as any;`.
- L273–283 Extracts term and translation with hardcoded fallback order.
- L294–301 Returns warning if fewer than 5 words.
- L303 Imports `battleHeroes` but it is never used in this file.

---

## File 6 — `apps/reading-advantage/server/controllers/rune-match-controller.ts`

### `completeGame` (lines 14–159)
- L22–28 `req.json()` destructured without validation.
- L31–37 Debug `console.log` of raw input.
- L40–52 Same minimal presence checks.
- L56 `const xpEarned = score || Math.floor(correctAnswers * (accuracy / 100));`.
  If `accuracy` is already a decimal (0–1), this divides by 100 again and
  produces near-zero XP. Inconsistent with `potion-rush-controller.ts`.
- L58–61 Another debug `console.log`.
- L68–85 Inserts `userActivity` with `"RUNE_MATCH"` string literal (L72).
- L88–115 XP update block: non-atomic user XP update, session mutation.
- L118–132 Upsert `gameRankings` even when `xpEarned` is 0. This is fine but
  differs from potion-rush, which only ranks on `xpEarned > 0`.

### `getVocabulary` (lines 162–237)
- Mirrors `rpg-battle-controller.ts` vocabulary loader. Hardcoded fallback
  order, `as any`, threshold of 10 words.

### `getRanking` (lines 239–309)
- L259–264 Optional `difficulty` filter from query params, unvalidated.
- L272–284 Join and order, limit 50.
- L290–296 Maps to flat ranking list including `difficulty`.

---

## File 7 — `apps/reading-advantage/server/controllers/srs-health-controller.ts`

### Types and helpers (lines 12–159)
- L12–27 Imports from `@reading-advantage/db` and schema.
- L34–87 Defines large response interfaces inline in the controller.
- L96–159 `checkSRSAccess` implements RBAC:
  - L103 SYSTEM/ADMIN bypass.
  - L107–111 Fetches user row; uses `userRole` from session and `userRow.role`
    from DB redundantly.
  - L120–156 TEACHER branch queries `classroomTeachers`, then validates
    `studentId`, `classroomId`, or `schoolId`. When a teacher has no
    classrooms, it uses `eq(classroomStudents.classroomId, "")`, which
    correctly yields no matches but is an odd construct.
  - L158 Falls through to deny.

### Quick-action and status helpers (lines 164–339)
- L164–267 `generateQuickActions` returns hardcoded suggestions. `actionUrl`
  paths are frontend routes embedded in the backend.
- L272–304 `calculateOverallHealthStatus` maps service-level statuses to
  simplified statuses. Uses `any` for `healthData`.
- L309–339 `generatePrimaryRecommendation` returns strings based on status.

### `getSRSHealthMetrics` (lines 354–559)
- L358–364 Session check.
- L366–375 Reads query params without Zod validation.
- L378–381 Determines scope from query params.
- L384–397 Calls `checkSRSAccess` and returns 403 if denied. This is one of
  the few controllers in the batch with explicit authorization.
- L400–402 Applies scoped IDs from access check.
- L408–440 Student scope.
- L442–481 Class scope; optionally fetches at-risk students.
- L483–523 School scope.
- L525–529 Returns 400 for invalid scope.
- L537 Caches with `private, max-age=300`.

### `refreshSRSHealthViews` (lines 564–617)
- L569–575 Session check.
- L577–582 Admin-only role check.
- L584 Calls `refreshSRSHealthMetrics()` service function.

---

## File 8 — `apps/reading-advantage/server/controllers/srs-quick-actions-controller.ts`

### `checkQuickActionAccess` (lines 25–91)
- L30 SYSTEM/ADMIN bypass.
- L34–38 Fetches user row.
- L42–53 STUDENT/USER branch restricts to own data and action types.
- L55–88 TEACHER branch validates against `classroomTeachers`. Same empty-class
  `eq(classroomStudents.classroomId, "")` construct as SRS health.

### `validateQuickActionRequest` (lines 93–121)
- L94 Destructures from `body` without Zod.
- L100 Whitelists `actionType` values.
- L105–107 Requires at least one scope identifier.
- L110–112 Checks `parameters` is object if present.
- L114–120 Returns typed object with `as` casts.

### `executeQuickActionController` (lines 127–188)
- L131–134 Session check.
- L136–151 Parses body and validates via `validateQuickActionRequest`, which
  throws and is caught.
- L153–159 Access check.
- L161–170 Idempotency check via `checkActionIdempotency(actionId)` from body.
- L178 Maps result status to HTTP status codes (`success` → 200, `partial` →
  206, else 400).

### `getAvailableQuickActions` (lines 190–273)
- L199–203 Defines `availableActions: Array<{ ..., parameters: any }>` — `any`
  in a public response type.
- L213–254 Pushes action descriptors based on role.
- L260 Computes `supportedScopes` from query params.

---

## File 9 — `apps/reading-advantage/server/controllers/stories-assistant-controller.ts`

### Imports (lines 1–15)
- L2 Imports `generateObject, streamText` from `@reading-advantage/ai`.
- L3 Imports `fs, { stat }` — `stat` is unused.
- L5 Imports `z` for Zod.
- L6 Imports `storage` from `@/utils/storage`.
- L11 Imports `openai, openaiModel` from `@/utils/openai`.
- L12 Imports `generateWordList` directly.

### `getFeedbackWritter` (lines 35–127)
- L35 Accepts `res: object` — untyped input.
- L36–39 Reads `data/writing-feedback.md` synchronously on every call. This
  blocks the event loop and re-reads an unchanged file per request.
- L41–47 Defines input schema locally.
- L49–94 Defines output schema locally.
- L97 Parses input with `inputSchema.parse(res)`.
- L111–116 Calls `generateObject` with `model: openai(openaiModel)`. This uses
  the OpenAI provider object directly, not the generic AI adapter interface.
- L118–122 Returns error if `object.feedback` is missing.

### `getChapterWordlist` (lines 129–270)
- L137–141 Selects chapter `words` and `passage`.
- L151–154 Calls `storage.bucket("artifacts...").file(...).exists()` directly,
  bypassing the storage adapter abstraction.
- L157 `typeof chapterData.words === "string" ? JSON.parse(...) : chapterData.words`.
- L161 Typo: `messeges` instead of `messages`.
- L169–217 Cold-cache path for non-staff users spawns an unawaited async IIFE
  `triggerBackgroundGeneration()`. There is no queue, retry, or deduplication;
  multiple concurrent requests can race to generate and update the same row.
- L220–261 Staff path waits for generation and stores word list + audio.
- No explicit authentication check at the top; it only checks `req.session?.user`
  for the staff branch.

### `chatBot` (lines 272–318)
- L274 Parses body, validates with `createChatbotSchema`.
- L276–292 Calls `streamText` with a system prompt that concatenates JSON by
  template literal. The injected fields are not JSON-escaped, so values
  containing braces or quotes can corrupt the pseudo-JSON structure.
- L294–303 Collects all streamed chunks into an array, filters `{`, `}`, and
  empty strings, then joins. This is not streaming to the client; it buffers
  the entire response and performs brittle cleanup.
- L305–308 Returns full message as JSON with status 201.

---

## File 10 — `apps/reading-advantage/server/controllers/stories-controller.ts`

### `countActivity` helper (lines 17–23)
- L17–23 Counts activities matching a Drizzle `and` expression. The `!` at
  L38/L369/etc. is unnecessary because `and()` always returns a value.

### `checkChapterCompletion` (lines 25–167)
- L30 Builds `chapterTargetId = "${storyId}_${chapterNumber}"`.
- L32–39 Counts MC questions for the chapter target.
- L42–74 Loads SAQ activity with strict target, then broad fallback by story.
- L77–109 Same for LAQ.
- L111–164 A `try` block performs several queries but **never uses the
  results**. This is dead debugging code that should be removed.
- L166 Returns `mcqCount >= 5 && !!saqExists && !!laqExists`.

### `updateChapterCompletion` (lines 169–216)
- L174–179 Calls `checkChapterCompletion`.
- L181–215 Upserts `CHAPTER_READ` activity when complete.

### `getAllStories` (lines 218–437)
- L222–225 Parses pagination and filters without validation.
- L226–227 `userId` and `userLevel` from session, cast.
- L229–233 Loads fiction genres from JSON. The query later filters stories by
  CEFR level or RA level, not by genre list; the genre list appears unused for
  filtering.
- L250–255 If a specific story's RA level exceeds user level, returns 403.
- L267–276 Pagination validation returns 400 with `selectionGenres`.
- L281–299 Level filtering uses raw `sql` fragments with embedded expressions.
  The expressions are parameterized, but the structure is fragile.
- L307–322 Count + paginated select.
- L343–416 Maps each story to determine completion. This is an N+1 pattern:
  for each story, it queries activities and then for each chapter queries
  activities again.
- L403–408 Updates `STORIES_READ` completion if all chapters are done.

### `getStoryById` (lines 439–635)
- L443–444 `storyId` from params, `userId` from session.
- L454–479 Fetches story and chapters.
- L481–505 Upserts `STORIES_READ` activity (marked not completed).
- L507–617 Maps chapters and checks completion per chapter with multiple
  queries per chapter (N+1).
- L619–623 Returns story with `is_read: true` always, even if the activity was
  just created as not completed.

### `updateAverageRating` (lines 637–726)
- L653 Rounds rating to nearest 0.25.
- L687–713 Recomputes story average from all chapters. No transaction, so two
  concurrent ratings can produce a stale average.

### `getChapter` (lines 728–804)
- L777 `timepoints = chapter.sentences || []`. The field is named `sentences`
  but is used as timepoints.

### `deleteStories` (lines 806–828)
- L810–814 Deletes story row and calls `deleteStoryAndImages`. No explicit
  authorization check in the function; relies entirely on route middleware.

### `logChapterRead` (lines 830–880)
- L836 `userId` cast from session. Upserts `CHAPTER_READ` as not completed.

---

## File 11 — `apps/reading-advantage/server/controllers/stories-question-controller.ts`

This file is the longest in the batch (1,910 lines) and largely duplicates
question-controller logic for the story/chapter domain.

### `loadStoryAndChapter` (lines 80–98)
- L80–98 Helper loads story and chapter. Returns `as const` with `chapter: null`
  when missing. Clean but belongs in a domain module.

### `getStoryMCQuestions` (lines 100–348)
- L106–115 Validates `storyId` and user presence.
- L131–170 Loads or generates MC questions for the chapter.
- L172–178 Maps questions and assigns `question_number` by array index.
- L180–204 Loads all user MC activities, filters to this story/chapter in JS.
- L222–258 Builds progress and question data.
- L292–302 Implements a deterministic seed-based shuffle using a string hash.
  This is better than `Math.random()` but still not Fisher-Yates.
- L309–324 Response mapping. L317 shuffles options with biased sort.

### `getStorySAQuestion` (lines 350–524)
- L383–386 Loads SA questions by `chapterId`.
- L388–419 Generates fallback SA questions if none exist.
- L421 `const question = saQuestions.find((q) => q.chapterId === chapter.id);`
  — after filtering by chapterId, this is always the first item; redundant.
- L443–485 Three fallback queries to find existing SA activity (by storyId,
  questionId, targetId). Indicates historical data inconsistencies.
- L489–503 Returns completed response if user answered.
- L505–516 Returns incomplete response.

### `answerStorySAQuestion` (lines 526–761)
- L539 `createActivity = false` default in destructuring, but parameter is
  named `createActivity` and the check at L624 is `if (createActivity !== false)`.
  Actually the default is `false`, so unless caller sends `true`, no activity
  is created. The naming is confusing.
- L568–569 `questionNumber` from params is treated as a DB question id.
- L571–612 Falls back to first question if id not found.
- L622 `targetId = "${storyId}_${chapterNumber}"`.
- L624–716 Creates activity and awards 3 XP with duplicate XP log guard.
- L734–742 Imports and calls `updateChapterCompletion`.

### `answerStoryMCQuestion` (lines 763–1016)
- L775 `selectedAnswer`, `timeRecorded` unvalidated.
- L851–853 Finds question by `question_number` (array index + 1).
- L863 `isCorrect = selectedAnswer === correctAnswer` — same string-equality
  semantics as `question-controller.ts`.
- L880–903 Upserts activity with composite unique target.
- L905–930 Awards 1 XP if correct.
- L932–998 Updates progress and, if complete, calls `updateChapterCompletion`.

### `rateStory` (lines 1018–1064)
- L1041–1054 Upserts `storyRecords.rated` via `onConflictDoUpdate`.
- L1056 Returns `{ message: "Rated" }`.

### `retakeStoryMCQuestion` (lines 1093–1193)
- L1116–1128 Loads MC activities by targetId pattern or legacy details.
- L1131–1142 Filters to this story/chapter in JS.
- L1152–1172 Deletes XP logs, recomputes total XP from remaining logs, updates
  user XP and session.
- L1175–1177 Deletes activities.

### `getStoryLAQuestion` (lines 1195–1322)
- L1227–1253 Loads or generates one LA question.
- L1255 `targetId = "${storyId}_${chapterNumber}"`.
- L1258–1285 Checks both new and old targetId formats.
- L1287–1301 Returns completed response with `status: 200`.
- L1304–1314 Returns incomplete response.

### `getStoryFeedbackLAquestion` (lines 1324–1438)
- L1351 Validates `answer` and `preferredLanguage` presence.
- L1407 `cefrLevelReformatted = story.cefrLevel?.replace(...) || ""`. Passing
  empty string to `getFeedbackWritter` will fail its Zod enum validation.
- L1412 Passes `chapter.summary` as `readingPassage`, not the full passage.
- L1416 Awaits JSON from feedback response.
- L1425 Collapses `exampleRevisions` array to a single random example.

### `answerStoryLAQuestion` (lines 1440–1739)
- L1451 `createActivity = true` default.
- L1484–1505 Ensures LA question exists.
- L1507 `targetId = "${storyId}_${chapterNumber}"`.
- L1509–1615 Creates/updates activity and awards 5 XP with duplicate guard.
- L1618–1715 Re-runs completion check independently, upserts `CHAPTER_READ`.
- L1717–1720 Sums feedback scores.

### `getStoryLAQuestionXP` (lines 1741–1910)
- L1748 `rating` from body.
- L1792 `targetId = "${storyId}_${chapterNumber}"`.
- L1795–1827 Finds or creates LA activity.
- L1849 `xpEarned = Math.max(1, Math.floor((Number(rating) || 0) / 2))`.
- L1851–1896 Awards XP and updates chapter completion.

---

## File 12 — `apps/reading-advantage/server/controllers/student-dashboard-controller.ts`

### `getStudentDashboard` (lines 7–148)
- L7–148 Single function that aggregates a dashboard from multiple tables.
- L19–23 Fetches student row. No role check beyond session presence.
- L36–48 Fetches lesson, activity, assignment, word, and XP data in parallel.
  Good batching.
- L44 `sql"${userWordRecords.difficulty} >= 0.9"` — hardcoded mastery
  threshold with no explanation.
- L50–61 Fetches assignment due dates in a second round. Could be included in
  the parallel batch.
- L64–65 `totalReadingTime` divides by 60, presumably minutes, but the unit of
  `timer` is not documented here.
- L68–84 Streak calculation starts at today and walks backward. If activities
  can be created with future timestamps (timezone or bad client data), the
  streak could be inflated.
- L89–94 Computes pending/completed/overdue assignments.
- L110–130 Builds `StudentMeResponse`.
- L135–140 Returns with cache headers.

---

## File 13 — `apps/reading-advantage/server/controllers/student-notification-controller.ts`

### `getStudentUnreadNotifications` (lines 13–63)
- L17 Reads `studentId` from route params.
- L18–22 Validates only that `studentId` is truthy.
- L24–53 Selects unread notifications for that student, joined to assignments
  and users.
- **No authorization check:** any authenticated caller can pass any `studentId`
  and read that student's notifications.

### `checkStudentAssignmentNotification` (lines 68–104)
- Same lack of authorization. Returns whether a notification exists for the
  provided IDs.

### `acknowledgeNotification` (lines 109–145)
- L113 Reads `studentId` and `notificationId`.
- L123–132 Updates `isNoticed = true` where `id = notificationId AND studentId = studentId`.
- No check that the caller owns the notification or is authorized to act on
  behalf of the student.

---

## File 14 — `apps/reading-advantage/server/controllers/system-controller.ts`

### `getSystemLicenses` (lines 22–122)
- L24 `requireRole(["SYSTEM"] as any)` — casts role array to `any`.
- L30–45 Selects licenses with owner join.
- L47–57 Loads license/user associations.
- L67–74 Loads XP logs for all users in those licenses.
- L84–109 Maps license rows with computed totals. `isActive` compares
  `expiresAt` to now.

### `getSchoolXpData` (lines 124–244)
- L132–135 Reads date filters and period from query params.
- L140–162 Builds date range. `endDate.setHours(23,59,59,999)` for inclusive
  end.
- L164–179 Loads licenses and license/user mappings.
- L181–194 Loads XP logs for all licensed users, optionally filtered by date.
- L204–228 Aggregates XP by school name.
- L230–236 Returns sorted array.

### Materialized view helpers and endpoints (lines 252–739)
- L252–269 `MATERIALIZED_VIEWS` constant lists view names and dependency levels.
- L279–298 `notifyMetricsUpdate` builds a JSON payload, escapes single quotes,
  and emits `NOTIFY metrics_update, '...'` via `sql.raw`. The escaping is
  limited to single quotes; a payload containing backslashes or other special
  characters could still break the raw SQL. Since the payload is internally
  generated, risk is low, but the pattern violates the provider-neutrality
  guideline.
- L300–414 `getMaterializedViewsStatus` queries `pg_matviews` and `pg_stat_user_tables`.
  L334–336 uses `sql.raw(`SELECT COUNT(*) as count FROM ${view.name}`)`. The
  view names come from a local const array, so injection is unlikely, but raw
  SQL for identifiers is discouraged.
- L436–501 `refreshView` attempts `REFRESH MATERIALIZED VIEW CONCURRENTLY`,
  falls back to non-concurrent refresh. Uses `sql.raw` with template literal.
- L503–582 `refreshMaterializedViews` groups views by dependency level and
  refreshes levels 1–3 sequentially, parallel within each level. Calls
  `notifyMetricsUpdate` on success.
- L584–693 `refreshMaterializedViewsAutomated` is intended for Cloud Scheduler
  but has **no authentication/authorization check**. Anyone with the URL can
  trigger expensive view refreshes.
- L695–739 `getAutomatedRefreshStatus` also has no auth check. It reports
  endpoint health and schedule.

---

## File 15 — `apps/reading-advantage/server/controllers/system-dashboard-controller.ts`

### `getSystemDashboard` (lines 6–64)
- L8 `requireRole(["SYSTEM"] as any)`.
- L14–15 Reads `startDate`/`endDate` from query params without validation.
- L17 Hardcodes 18 RA levels.
- L22–32 Adjusts start date to previous day 23:59:59. This is unusual and may
  be off-by-one relative to user expectations.
- L34–51 Loops through 18 levels and issues one count query per level. This
  could be done in a single grouped query.
- L56 Returns `dataRange` typo — should probably be `dateRange`.

---

## File 16 — `apps/reading-advantage/server/controllers/teacher-assignment-controller.ts`

### `getTeacherAssignments` (lines 28–216)
- L30 Uses `getCurrentUser()` from `@/lib/session` instead of `req.session`.
  Inconsistent with sibling controllers.
- L32–34 Role check allows ADMIN, TEACHER, SYSTEM.
- L36–41 Reads query params without validation or max limit.
- L43–57 Determines classroom filter. Teachers see only their own classrooms
  unless a specific `classroomId` is provided.
- L67–85 Fetches assignments joined to classrooms and articles.
- L98–113 Fetches classroom teachers and primary teacher info.
- L116–125 Fetches students and student assignments in batch.
- L142–191 Builds per-teacher assignment rows.
- L197–210 Paginates and summarizes in memory.

---

## File 17 — `apps/reading-advantage/server/controllers/teacher-dashboard-controller.ts`

### `getTeacherOverview` (lines 30–151)
- L34–37 Session check.
- L42–44 Role check.
- L46–58 Loads teacher and school name.
- L67–91 Loads classrooms, students, and recent activity. Active-student
  computation is based on any activity in the last 30 days.
- L99–109 Fetches assignments and student assignments.
- L112–119 Counts pending assignments and today's completions.
- L127–138 Builds `TeacherOverviewResponse`.

### `getTeacherClasses` (lines 153–277)
- L169 Reads `format` query param.
- L176–179 Loads teacher classrooms.
- L193–208 Loads classroom details and students.
- L213–221 Loads active student IDs in the last 7 days.
- L223–240 Maps to `TeacherClass` objects.
- L244–254 If `format === "csv"`, generates CSV. `convertToCSV` (lines 16–28)
  wraps cells containing commas or quotes in double quotes, but `createdAt`
  ISO strings do not contain commas, so this is adequate for current fields.
- L256–269 Builds `TeacherClassesResponse`.

---

## File 18 — `apps/reading-advantage/server/controllers/translation-controller.ts`

### `translate` (lines 29–205)
- L30 `article_id` from route params, not validated.
- L31 `type`, `targetLanguage` from body, not validated.
- L33–40 Checks `targetLanguage` against `LanguageType` enum.
- L50–75 Loads article; if not found, loads chapter by same id. Using the same
  identifier for two entity types is brittle.
- L86–129 Summary translation path.
- L130–201 Passage translation path:
  - L145–165 Extracts sentences from `article.sentences` array of objects.
  - L179 Calls `translatePassageWithGPT` despite the function name implying
    GPT; it actually uses the Google model (`google(googleModel)`).
  - L184–188 Stores `en` original sentences plus target translation.
- L127, 200 Returns `{ message: error }` — sends raw Error object as message.

### `translateForPrint` (lines 207–258)
- L211–225 Parses `passage` JSON or falls back to splitting on `\n\n`.
- L244 Calls `translatePassageWithGoogle`.
- L251 Returns raw error object.

### `translatePassageWithGoogle` (lines 260–287)
- L264–267 Instantiates `@google-cloud/translate` directly with
  `GOOGLE_TEXT_TO_SPEECH_API_KEY`. The environment variable name is for the
  wrong API; translation should use a translation API key/credentials.
- L274 Translates sentences in one batch. No chunking for large inputs.

### `translatePassageWithGPT` (lines 289–388)
- L289–388 Despite the name, uses `google(googleModel)` inside
  `generateObject`. Function name is misleading.
- L298–304 Batches sentences into chunks of 20.
- L322–329 Defines Zod schema per batch with exact length.
- L345–349 Validates batch response length.
- L375–379 Exponential backoff on retries.

### `translateChapterContent` (lines 390–550)
- L394–414 Validates inputs minimally.
- L416–420 Loads chapter.
- L426–476 Summary translation.
- L478–544 Content translation with similar sentence extraction as `translate`.

### `translateStorySummary` (lines 552–723)
- L556–573 Validates inputs.
- L575–590 Loads story and chapters.
- L592–596 Checks `storyBible.summary`.
- L598–644 Translates story summary with Google.
- L646–722 Translates each chapter summary. Returns indexed object
  `allTranslatedSentences[index]`. Uses `forEach` and then a separate `for`
  loop; could be simplified.
- L608 Returns message `"article already translated"` even though this is a
  story endpoint.

---

## File 19 — `apps/reading-advantage/server/controllers/user-controller.ts`

This is the second-longest file (1,504 lines) and mixes user CRUD, activity
logging, XP management, license helpers, and progress reset.

### `getUserLicenseLevel` (lines 20–55)
- Third copy of this helper (also in `question-controller.ts` and implied
  elsewhere). Should be a shared domain function.

### `getUser` (lines 63–104)
- L67 `assertSelfOrAllowedStaff` performs authorization.
- L72 Selects full user row.
- L78 Computes license level.
- L80–96 Returns selected fields.

### `updateUser` (lines 106–155)
- L111–115 Authorization check.
- L117 `data = await req.json()` unvalidated.
- L119–132 Updates user fields directly from `data`.
- L134–142 If `data.resetXP`, deletes related records in a transaction but does
  not reset the user's `xp`, `level`, or `cefrLevel`. The reset logic is
  duplicated in `resetUserProgress` (lines 1096–1112) which does reset those
  fields. Behavior is inconsistent.

### `postActivityLog` / `putActivityLog` (lines 157–492)
- L169 / L341 `data = await req.json()` unvalidated.
- L171 / L343 `data.activityType.toUpperCase() as ActivityType` — unsafe cast.
- L181–198 Complex targetId derivation including special handling for article
  rating prefixes. No schema validation.
- L200–229 Loads article metadata.
- L231–267 / L409–443 Upserts activity.
- L269–315 / L445–479 Conditionally inserts XP log and updates user XP/level.
  Uses non-atomic read-modify-write for user XP.

### `getActivityLog` (lines 494–633)
- L512–518 Reads query params.
- L520–538 Selects activities and XP logs.
- L561–615 Maps results with cumulative XP progression. The cumulative XP
  calculation assumes XP logs are ordered by creation and are not filtered
  when `isFiltered` is true, in which case `cumulativeXp` is set to 0.

### `getUserRecords` (lines 635–779)
- L649 Selects activities where `activityType = ARTICLE_READ`.
- L662–680 Builds `articleMap` keyed by articleId, with slots for read and
  rating activities. However, because the query filters to `ARTICLE_READ`
  only, `ratingActivity` is always `null`. The subsequent rating extraction
  (L708–719) therefore always yields 0.

### `getUserHeatmap` (lines 781–810)
- L787–791 Selects all user activities. Could be large for active users.
- L793–798 Aggregates by date string.

### `getAllUsers` (lines 812–843)
- L814–817 `select().from(users).orderBy(desc(...))` with no pagination. This
  can return an unbounded result set.

### `updateUserData` (lines 845–912)
- L847 `data = await req.json()` unvalidated.
- L849–853 Looks up user by email.
- L862–873 Validates license exists.
- L875–885 Checks license capacity.
- L887–899 Inserts license association and updates user role/expiry.
- No authorization check in this function.

### `getUserActivityData` (lines 914–1034)
- Similar to `getActivityLog` but with a different output shape. Recomputes
  cumulative XP.

### `getStudentData` (lines 1036–1082)
- L1040–1058 Selects user row.
- No authorization check.

### `resetUserProgress` (lines 1084–1125)
- L1090–1094 Loads user.
- L1096–1112 Transaction deletes lesson records, activities, XP logs, story
  records, word/sentence records, and resets user fields. This is a destructive
  operation; authorization is left to middleware.

### `getUserXpLogs` (lines 1127–1178)
- L1133–1138 Selects all XP logs for user.
- L1139–1142 Loads related activities.
- L1146–1165 Maps formatted results.

### `deleteUser` (lines 1180–1203)
- L1182 `id = await req.json()` unvalidated.
- L1190–1193 Transaction deletes classroom-student link then user.

### `deleteAllUsers` (lines 1205–1237)
- L1207–1217 Batches deletion of `classroomStudents`.
- L1219–1227 Batches deletion of `users`.
- No authorization visible in function; relies on middleware.

### `getLessonXp` (lines 1239–1381)
- L1245 Reads `articleId` query param.
- L1254–1255 Decodes and cleans article id.
- L1257–1278 Loads all user activities and filters to article in JS.
- L1281–1313 If related activities exist, widens time window by ±1 hour and
  loads vocabulary/rating activities in that window.
- L1326–1340 Loads XP logs for related activities.
- L1351–1365 Computes total and breakdown.

### `calculateXpForLast30Days` / `getXp30days` (lines 1385–1504)
- L1385–1437 Returns `NextResponse.json` but is named `calculateXpForLast30Days`,
  suggesting a utility. The naming is misleading.
- L1439–1504 `getXp30days` accepts optional `license_id` and returns total XP
  for users under that license in the last 30 days.

---

## File 20 — `apps/reading-advantage/server/controllers/validator-controller.ts`

### `validateArticle` (lines 46–212)
- L51–58 Returns 501 immediately:
  ```ts
  return NextResponse.json(
    { error: "Article validation is currently unavailable...", track: "..." },
    { status: 501 }
  );
  ```
- L60–212 All code after the return is unreachable. The helper functions
  below (`validator`, `validateQuestions`, etc.) are also dead code because
  their only caller is unreachable. The file should be removed or stubbed.

### Dead helper code (lines 214–454)
- L214–296 `validator` function queries Firestore (`db.collection("new-articles")`)
  and calls other validators. Firestore has been removed per the 501 message.
- L298–346 `validateQuestions` queries Firestore subcollections.
- L348–397 `validateImage` generates images via `experimental_generateImage`
  and writes files to `process.cwd()/data/images` synchronously.
- L399–430 `validateAudio` checks storage bucket files.
- L432–454 `validateAudioWords` checks word-audio files.
- These helpers import and use `storage.bucket(...)` directly, violating the
  storage adapter rule, and rely on a removed database.

---

## Summary of Critical Findings

| # | Finding | Risk | Files |
|---|---------|------|-------|
| 1 | Business logic and authorization inline in Next.js controllers | High — violates architecture, impedes testing, blocks transport independence | All |
| 2 | No Zod input/output schemas at controller boundaries | High — invalid data can reach DB/AI, responses are unchecked | All |
| 3 | Tenant IDs (`schoolId`, `classroomId`, `studentId`) accepted from frontend without access checks | High — horizontal privilege escalation | metrics*, potion-rush, question, rpg-battle, rune-match, stories*, student-notification, translation, user |
| 4 | Non-atomic read-modify-write XP updates | High — lost updates under concurrency | potion-rush, question, rpg-battle, rune-match, stories-question, user |
| 5 | `student-notification-controller.ts` lacks any authorization | High — notification read/ack hijacking | student-notification-controller |
| 6 | `system-controller.ts` automated refresh endpoint has no auth | High — DoS via expensive view refresh | system-controller |
| 7 | `translation-controller.ts` uses wrong Google API key (`GOOGLE_TEXT_TO_SPEECH_API_KEY` for Translate) and direct SDK | High — translation will fail or use misconfigured credentials | translation-controller |
| 8 | `user-controller.ts` `deleteAllUsers` and `resetUserProgress` are destructive with only middleware-level protection | High — accidental or malicious mass data loss | user-controller |
| 9 | `validator-controller.ts` is entirely dead code after 501 return | Medium — maintenance burden, confusion | validator-controller |
| 10 | Direct storage SDK usage (`storage.bucket`) bypasses adapter | Medium — provider lock-in, testability | stories-assistant, validator, translation |
| 11 | `getAllUsers` returns unbounded user list | Medium — performance / privacy | user-controller |
| 12 | MCQ option shuffling uses biased `Math.random() - 0.5` | Low — non-uniform distribution | question-controller, stories-question-controller |
| 13 | `metrics-controller.ts` cache hit logging is dead (always "MISS") | Low — misleading telemetry | metrics-controller |

---

## Coverage Statement

All 20 files in `/tmp/opencode/ra-batch-46` were read in full from line 1 to
their final line. No app code was modified. This report documents observed
behavior and architecture deviations; it does not constitute acceptance or
approval.

---

MEASURE_AGENT_RESULT
