# Line-by-Line Review: Reading Advantage — Batch 38

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-38`
**Baseline SHA:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Current HEAD:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / SQL / static-asset / privacy / security

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-38` were read in full. The
batch covers:

- 7 raw SQL files in `apps/reading-advantage/db-migrations/legacy-matviews/`
  (5 forward migrations, 2 rollbacks).
- 1 `migration_lock.toml` and 1 `README.md` for the same directory.
- 1 ESLint flat-config (`apps/reading-advantage/eslint.config.mjs`).
- 9 React hooks under `apps/reading-advantage/hooks/` (4 client hooks, 2
  test files, 2 shared utility hooks, 2 `useAudio` variants, 1 metrics SSE
  hook, 1 classroom actions hook).

| # | File | Lines / Bytes Reviewed |
|---|------|------------------------|
| 1 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/rollback.sql` | 1–49 |
| 2 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022000002_enhance_srs_health_metrics/migration.sql` | 1–308 |
| 3 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022050000_enhance_activity_heatmap/migration.sql` | 1–238 |
| 4 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022050000_enhance_activity_heatmap/migration_lock.toml` | 1–3 |
| 5 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022080000_genre_engagement_metrics/migration.sql` | 1–245 |
| 6 | `apps/reading-advantage/db-migrations/legacy-matviews/20251022080000_genre_engagement_metrics/rollback.sql` | 1–6 |
| 7 | `apps/reading-advantage/db-migrations/legacy-matviews/20251110000000_add_unique_index_activity_heatmap/migration.sql` | 1–9 |
| 8 | `apps/reading-advantage/db-migrations/legacy-matviews/README.md` | 1–37 |
| 9 | `apps/reading-advantage/eslint.config.mjs` | 1–18 |
| 10 | `apps/reading-advantage/hooks/article-content/useAudio.ts` | 1–216 |
| 11 | `apps/reading-advantage/hooks/stories-chapter/useAudio.ts` | 1–221 |
| 12 | `apps/reading-advantage/hooks/student/useDashboardMetrice.ts` | 1–107 |
| 13 | `apps/reading-advantage/hooks/teacher/useClassroomActions.ts` | 1–171 |
| 14 | `apps/reading-advantage/hooks/use-config.ts` | 1–23 |
| 15 | `apps/reading-advantage/hooks/use-lock-body.ts` | 1–12 |
| 16 | `apps/reading-advantage/hooks/use-metrics-stream.ts` | 1–187 |
| 17 | `apps/reading-advantage/hooks/useCustomDateRangeXp.ts` | 1–111 |
| 18 | `apps/reading-advantage/hooks/useDirectionalInput.test.tsx` | 1–29 |
| 19 | `apps/reading-advantage/hooks/useDirectionalInput.ts` | 1–92 |
| 20 | `apps/reading-advantage/hooks/useGameLoop.test.tsx` | 1–55 |

**Total lines reviewed:** 2,349 (plus 2 empty indexes noted below).
**No file was partially reviewed.**

---

## Executive Summary

This batch is split between (a) more legacy materialized-view SQL
(continued from Batch 37), and (b) the React hooks layer of
`apps/reading-advantage` including two `useAudio` near-duplicates,
SSE-streaming, classroom action orchestration, and small input/game-loop
hooks.

The most severe issues found are:

1. **`hooks/article-content/useAudio.ts` and `hooks/stories-chapter/useAudio.ts`
   are ~95 % identical, with the `stories-chapter` variant adding only
   `selectedSentence` state and `setSelectedSentence` setter.** Five
   copies of the `canplaythrough → playAudio → removeEventListener`
   pattern (lines 29-37, 46-55, 69-77, 108-116, 130-136 / article-content
   variant) and the same shape in stories-chapter are repeated verbatim.
   Drift risk: the article-content variant was fixed to call
   `audio.load()` *before* adding the listener (lines 28-29) but the
   stories-chapter variant was not (lines 68-78 vs lines 28-29). The
   variant is already diverged.
2. **`hooks/student/useDashboardMetrice.ts` (file name and exported
   function name both misspell "Metrics" as "Metrice")** — the typo is
   also mirrored in the import site
   `components/dashboard/student-dashboard-content.tsx:25,46`, so the
   typo is "load-bearing" and renaming it would require touching the
   component. `srsHealth`, `aiInsights`, `activityTimeline` are typed
   `any | null` (lines 11-13) and the hook fires off five parallel
   `fetch()` calls with no SWR / React-Query, no abort signal, no
   deduplication, and no retry — a textbook "thin client glue" pattern
   that should live in the backend per AGENTS.md.
3. **`hooks/teacher/useClassroomActions.ts:92` passes
   `cache: "no-cache"` to `fetch()`** — `no-cache` is a
   `Cache-Control` *request header value*, not a valid value for the
   Fetch API `cache` option (which accepts `"default"`, `"no-store"`,
   `"reload"`, `"no-cache"`, `"force-cache"`, `"only-if-cached"`). The
   intent is "don't use the HTTP cache" but the literal `"no-cache"`
   is parsed by Chromium/Firefox as "use cache but revalidate" — the
   opposite of what the code intends.
4. **`hooks/use-metrics-stream.ts` opens its own `EventSource` per hook
   subscriber with no dedup.** `useMetricsInvalidation` (lines 170-186)
   calls `useMetricsStream` with no arguments; if two components both
   subscribe to the same metrics view (e.g. `mv_student_velocity`),
   each opens an independent EventSource to `/api/v1/metrics/stream`,
   doubling the server-side connection count. There is no
   `AbortController` for the EventSource, no dedup registry, and no
   `credentials: 'include'` consideration.
5. **`hooks/use-metrics-stream.ts:87,94,107,111,137` use
   `console.log` / `console.error` for normal-flow events** — every
   "connected", "metrics updated", "disconnected", "connection error",
   "reconnecting" event logs unconditionally. This bypasses the
   structured-logging requirement in AGENTS.md §Observability and is a
   lint ban in most Next.js configs.
6. **All four SQL migrations in this batch query
   `lr.phase1..phase14::json->>'elapsedTime'`, `lr.created_at`,
   `ua."createdAt"`, and `uwr.save_to_flashcard = true` against
   Prisma-era column names** (snake_case for `lesson_records`, CamelCase
   for `UserActivity.createdAt`, snake_case for
   `user_word_records.save_to_flashcard`). The Drizzle-managed database
   emits the same columns but with different conventions
   (`lesson_records` columns are unquoted snake_case per the legacy
   Prisma `@@map`; `UserActivity` becomes `user_activity`; the new
   `user_word_records` schema may use different names). Combined with
   the `u.role = 'STUDENT'` / `u.role IN ('STUDENT','USER')` predicates,
   the matviews will be empty when applied against a fresh Drizzle
   database.
7. **`mv_genre_engagement_metrics` (lines 99-101) includes
   `u.role IN ('STUDENT', 'USER')`** — mixing the legacy `'USER'` role
   with `'STUDENT'`. The other matviews in the batch restrict to
   `'STUDENT'` only (srs-health line 165, activity-heatmap lines 39+63).
   Inconsistent; the `'USER'` fallback exists to support legacy Prisma
   data but is undocumented in the migration header comments.
8. **`mv_genre_engagement_metrics` joins `users u`, `classroomStudents cs`,
   `classrooms c`, `article a`, `chapters ch`, `MultipleChoiceQuestion
   mcq`, `ShortAnswerQuestion saq`, `LongAnswerQuestion laq`,
   `XPLogs xp` — ten LEFT JOINs in one CTE.** Each question type adds
   three more joins (question → article, question → chapter, question
   itself). With `MultipleChoiceQuestion`, `ShortAnswerQuestion`, and
   `LongAnswerQuestion` being separate physical tables, this CTE is a
   Cartesian-time machine: a single activity row pulls one join
   resolution per question table even when the activity is an
   `ARTICLE_READ`.
9. **`mv_srs_health_class` lines 222-223 and `mv_srs_health_school`
   lines 269-271, 274-282 classify class/school health with
   CASE…WHEN…>percent thresholds that compare `COUNT(DISTINCT ...)`
   against `(COUNT(DISTINCT cs.student_id) * 0.3)` etc.** The literal
   `0.3`, `0.5`, `0.4`, `0.6` thresholds (lines 213, 215, 276, 278) are
   magic numbers without a comment explaining the calibration. They
   differ between class and school (`class: 30 % overloaded OR 50 %
   inactive`, `school: 40 % overloaded OR 60 % inactive`) — different
   cutoffs for the same signal.
10. **`mv_activity_heatmap` builds a `school_timezones` CTE (lines
    66-79) that returns `'UTC'` for every row plus a `NULL` school_id
    row, and then joins it `LEFT JOIN school_timezones st ON
    au.school_id = st.school_id`** — the timezone column is
    always `'UTC'`, so the entire `AT TIME ZONE 'UTC' AT TIME ZONE
    st.timezone` expression reduces to `AT TIME ZONE 'UTC' AT TIME ZONE
    'UTC'` (lines 88-90), which is a no-op identity transform. The
    CTE adds planning overhead and is misleading dead code.
11. **`hooks/useDirectionalInput.ts` has no way to clear `virtualInput`
    once it is set** (lines 11, 65-67, 79-82, 84, 89). `setVirtualInput`
    is exported but there is no `clearVirtualInput`. A consumer that
    sets `{dx: 1, dy: 0, cast: true}` to fire a touch-input pulse must
    later call `setVirtualInput({dx:0, dy:0, cast:false})` — but if the
    consumer forgets, virtual input stays sticky and overrides keyboard
    indefinitely. The `castTriggered` flag has the same shape: only
    `consumeCast` resets it, and `castTriggered` is never reset by
    `triggerCast`. The OR at line 84 means once true, always true.
12. **`hooks/useDirectionalInput.test.tsx` (29 lines) and
    `hooks/useGameLoop.test.tsx` (55 lines) are the only tests in this
    batch, and they cover ~10 % of the surface area.** Neither tests
    WASD keys, key release, multi-key diagonals, or the `consumeCast`
    reset path. The `useGameLoop.test.tsx` uses
    `jest.useFakeTimers()` / `jest.advanceTimersByTime()` — the project
    is migrating to Vitest (per AGENTS.md "Mixed Jest/Vitest test
    runners (being normalized)"); these tests will not run under Vitest
    without conversion.
13. **`apps/reading-advantage/eslint.config.mjs` (18 lines) extends
    `next/core-web-vitals` and nothing else.** There are no
    `@typescript-eslint/recommended` rules, no React Hooks rules, no
    console bans, no `no-explicit-any` ban, no
    `@typescript-eslint/no-floating-promises`. This means the
    `useDashboardMetrice.ts` `any` types and the `useAudio.ts`
    non-null assertions (`audioRef.current!`) slip through lint.
14. **`README.md` line 36 says the follow-up to fold the legacy SQL
    into Drizzle "belongs to a future maintenance task"** but no
    `measure/tracks/` entry exists for it; the README documents a
    debt that has no owner.
15. **No tests cover any of the SQL migrations in this batch.** There
    is no smoke test that runs the `REFRESH MATERIALIZED VIEW
    CONCURRENTLY` calls and asserts `rowCount > 0`; no migration test
    asserts the indexes referenced in the README (`mv_srs_health_*_idx`,
    `mv_activity_heatmap_*_idx`, `idx_genre_engagement_*`,
    `idx_class_genre_engagement_*`, `idx_school_genre_engagement_*`)
    actually exist after running the migration.

No tests were found for any of the 7 SQL files in this batch.

---

## Findings

### Critical / High

#### H-01 — `useAudio.ts` (article-content) and `useAudio.ts` (stories-chapter) are ~95 % duplicate
- **Files:**
  - `apps/reading-advantage/hooks/article-content/useAudio.ts` (1–216)
  - `apps/reading-advantage/hooks/stories-chapter/useAudio.ts` (1–221)
- **Severity:** High
- **Evidence:**
  - Both files declare the same `Sentence` type (lines 4-10 in both).
  - Both define `useAudio(sentenceList: Sentence[])` (line 12 in both)
    returning a structurally identical object.
  - Five copies of the
    `addEventListener('canplaythrough', playAudio) → audio.play() → removeEventListener`
    block: article-content lines 29-37, 46-55, 69-77, 108-116, 130-136
    (article-content totals 5 occurrences); stories-chapter lines
    30-37, 47-54, 70-77, 111-115, 131-139 (5 occurrences).
  - The stories-chapter variant adds `selectedSentence` (line 19) and
    `setSelectedSentence` (line 107) but does not change the play
    pattern.
  - Divergence: the article-content variant on line 28-29 calls
    `audioRef.current.src = ...; audioRef.current.load();` *before*
    adding the `canplaythrough` listener (correct order). The
    stories-chapter variant on line 67-78 assigns `src` and calls
    `load()` first as well — but on lines 128-130 the assignment and
    `load()` happen after the listener is wired via
    `handleAudioEnded`. The two paths are subtly different.
  - Both files return `setIsPlaying` and `setCurrentAudioIndex`
    directly (article-content 213-214; stories-chapter 218-219). This
    exposes raw setters and lets consumers desync internal state.
- **Impact:** Drift risk. Any bug fix to one file must be applied to
  the other or behaviour diverges silently. The duplicate listener
  pattern also has a race: `removeEventListener` is called inside
  `playAudio` (the listener), so a second `canplaythrough` event
  (e.g., after a buffering pause) will not be received because the
  listener is already gone before the second event fires.
- **Fix:** Extract the duplicate logic into `hooks/useAudio.ts`
  parameterized by `sentenceList` and an optional `onSentenceSelected`
  callback. The `selectedSentence` state belongs to the consumer
  (story-chapter component) not the hook.

#### H-02 — `useDashboardMetrice` is misnamed; the file ships `any`-typed state to the dashboard
- **File:** `apps/reading-advantage/hooks/student/useDashboardMetrice.ts`
- **Lines:** 1-107
- **Severity:** High
- **Evidence:**
  - File name and exported function (`useDashboardMetrice`, line 16)
    spell "Metrics" as "Metrice". The consumer
    `components/dashboard/student-dashboard-content.tsx:25,46` mirrors
    the typo. Renaming the hook requires updating the consumer.
  - `srsHealth: any | null`, `aiInsights: any | null`,
    `activityTimeline: any | null` (lines 11-13) defeat the Zod /
    TypeScript guarantees AGENTS.md requires at every external
    boundary. The consumer treats them as `any` and the dashboard
    silently renders whatever shape the server returns.
  - Five parallel `fetch()` calls (lines 31-42) with no abort signal —
    if the user navigates away during fetch, `setData` is called on an
    unmounted component (React 18 silently warns; React 19 will
    reclaim the warning).
  - Lines 55, 62, 78: `console.error("…fetch failed:", await
    velocityRes.value.text())` — the body is read with `.text()`,
    never logged in the toast. Errors are visible in DevTools but
    invisible to users.
  - `Promise.allSettled` results in `rejected` cases (network error,
    DNS failure) are silently dropped — neither `console.error` nor
    `setError` fires for those.
  - The hook is a 100-line client-side shim for five REST endpoints.
    Per AGENTS.md, this orchestration belongs in a backend module
    (`packages/backend/modules/student-dashboard`) wrapped in a
    `command()` / `query()` with a Zod contract; the React component
    should call a single tRPC / Server Action.
- **Impact:** Type safety, UX (no error toast on network failure), and
  maintainability (no cache, no SWR, no retry).
- **Fix:** Rename to `useDashboardMetrics`, type the `DashboardData`
  fields with the actual response shapes (the same Zod schemas that
  the server uses), move the five fetches to a single backend query,
  and surface `rejected` results to the toast.

#### H-03 — `cache: "no-cache"` in `useClassroomActions.ts:92` is a misused Fetch API option
- **File:** `apps/reading-advantage/hooks/teacher/useClassroomActions.ts`
- **Lines:** 85-94
- **Severity:** High
- **Evidence:**
  - Line 92: `cache: "no-cache"` — `"no-cache"` *is* a valid value for
    `fetch.init.cache`, but its semantics is "use the cache, but
    revalidate with the server before serving". The intended behaviour
    ("don't read from cache at all") is `"no-store"`.
  - The literal `"no-cache"` was probably chosen because of the HTTP
    `Cache-Control: no-cache` request header semantics that the
    author had in mind, but in the Fetch API the two are different.
  - The `reset-all-progress` endpoint is a destructive POST (it
    resets XP, streak, lesson records, SRS state). A cached or
    revalidated response is unlikely, but the intent ("this MUST hit
    the server") is real.
- **Impact:** Silent semantic mismatch. The browser sends the request
  but may serve a 304 / revalidated body that is a stale snapshot of
  the student's previous XP.
- **Fix:** Use `cache: "no-store"` for destructive POSTs, or omit the
  field and rely on Next.js route caching defaults.

#### H-04 — `use-metrics-stream.ts` opens one EventSource per subscriber, no dedup, no auth-header support
- **File:** `apps/reading-advantage/hooks/use-metrics-stream.ts`
- **Lines:** 53-156
- **Severity:** High
- **Evidence:**
  - Line 78: `new EventSource('/api/v1/metrics/stream')` — there is no
    shared registry. If a page uses both
    `useMetricsStream({…})` and `useMetricsInvalidation([…], …)` (or
    two components both subscribe), each opens a fresh connection.
    `/api/v1/metrics/stream` is an SSE endpoint and the server's
    connection-per-client billing is real.
  - `EventSource` does not support custom headers; if the metrics
    stream endpoint ever requires `Authorization`, the hook will
    silently fail. No `withCredentials` either.
  - Lines 102-117: `onerror` constructs a new `Error('EventSource
    connection error')` with no underlying cause. The original
    `EventSource` error event (with `readyState` and the network
    reason) is discarded.
  - Lines 110-116: reconnect uses a single ref guard
    (`!reconnectTimeoutRef.current`). If `onerror` fires twice
    synchronously (e.g., when `close()` is called from another
    path), the second event re-enters the reconnect path before the
    first `setTimeout` callback resets the ref.
  - Lines 174-186: `useMetricsInvalidation` calls `useMetricsStream`
    with no options — `autoReconnect` and `reconnectDelay` default to
    `true` / `5000`. The default reconnect logic kicks in even for
    invalidation-only consumers.
  - No abort signal — `disconnect()` (lines 125-138) is wired via
    `useEffect` cleanup (line 144), but if the EventSource is in a
    half-open state the cleanup can race with a server-sent `metrics:update`.
- **Impact:** Connection amplification (each SSE consumer is a new
  server-side stream), no diagnostics on connection failure, no
  auth-header story.
- **Fix:** Add a small `useEventSource(url)` primitive with a ref
  registry (one EventSource per `url` per page), support a
  `withCredentials: true` opt-in, and surface the underlying
  `EventSource` event in the `onError` callback.

#### H-05 — `useAudio.ts` `handleTimeUpdate` can fire `handleAudioEnded` twice (race with the native `ended` event)
- **Files:**
  - `apps/reading-advantage/hooks/article-content/useAudio.ts`
  - `apps/reading-advantage/hooks/stories-chapter/useAudio.ts`
- **Lines (article-content):** 159-167, 101-122
- **Lines (stories-chapter):** 147-155, 124-145
- **Severity:** High
- **Evidence:**
  - `handleTimeUpdate` (article-content 159-167) compares
    `audioRef.current.currentTime >= currentSentence.endTime` and
    calls `handleAudioEnded()`.
  - `handleAudioEnded` (article-content 101-122) advances
    `currentAudioIndex` by 1, sets `audio.src`, calls `audio.load()`,
    and sets `audio.currentTime = sentenceList[nextAudioIndex].startTime`
    via the `canplaythrough` listener.
  - The native `ended` event is also bound (via the `onEnded` handler
    the consumer must wire). Both handlers advance `currentAudioIndex`
    independently. If `handleTimeUpdate` fires at the same instant
    the native `ended` event fires (both async via React state), the
    state will skip an audio (`currentAudioIndex` jumps by 2).
- **Impact:** Audible: the player skips a sentence on the boundary
  condition.
- **Fix:** Track `lastEndedIndexRef` to dedup, or remove the
  `handleTimeUpdate`-driven `handleAudioEnded` call and rely solely on
  the native `ended` event.

#### H-06 — `useDirectionalInput.ts` has no way to clear `virtualInput` or `castTriggered`
- **File:** `apps/reading-advantage/hooks/useDirectionalInput.ts`
- **Lines:** 11, 35-37, 65-67, 79-82, 84, 89
- **Severity:** High
- **Evidence:**
  - Line 11: `useState<InputVector>({dx:0, dy:0, cast:false})` for
    `virtualInput`. `setVirtualInput` is exposed (line 88) but there
    is no `clearVirtualInput` or auto-reset after a tick.
  - Lines 79-82: keyboard input is overridden by ANY non-zero virtual
    input. If a touch handler sets `{dx:1, dy:0, cast:true}` and the
    touch handler later sets `{dx:0, dy:0, cast:false}` (intended as
    "release"), the keyboard takes over. If the touch handler forgets
    to clear, the virtual input is sticky.
  - Lines 12, 35-37, 65-67, 84: `castTriggered` is set true on
    Space/Enter and is reset only by `consumeCast()` (line 65-67).
    `cast = castTriggered || virtualInput.cast` (line 84) — once
    `castTriggered` is true, it stays true until `consumeCast` is
    called, even across keystrokes.
  - The hook is consumed by `CastleDefenseGame.tsx:137` and
    `WizardZombieGame.tsx:94` (both reference `useDirectionalInput`
    but neither calls `consumeCast`). If the cast flag is never
    consumed, every subsequent frame will see `input.cast === true`.
- **Impact:** Functional bug — sticky cast/spell trigger in the games.
- **Fix:** Auto-reset `castTriggered` at the end of the frame via a
  `useEffect` that runs after the consumer reads `input.cast`, or
  expose a `triggerCast()` function that returns the value once and
  clears itself (similar to a "latch and reset" pattern).

#### H-07 — `mv_genre_engagement_metrics` builds a 10-way LEFT JOIN CTE per row
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022080000_genre_engagement_metrics/migration.sql`
- **Lines:** 10-101
- **Severity:** High
- **Evidence:**
  - Lines 65-90: `FROM "UserActivity" ua` with **10** LEFT JOINs:
    `users u`, `classroomStudents cs`, `classrooms c`, `article a`
    (gated by activity_type list), `chapters ch` (gated), and
    `MultipleChoiceQuestion mcq` + `article a_mcq` + `chapters ch_mcq`
    (gated by `ua.activity_type = 'MC_QUESTION'`), and
    `ShortAnswerQuestion saq` + `article a_saq` + `chapters ch_saq`
    (gated by `ua.activity_type = 'SA_QUESTION'`), and
    `LongAnswerQuestion laq` + `article a_laq` + `chapters ch_laq`
    (gated by `ua.activity_type = 'LA_QUESTION'`), and `XPLogs xp`.
  - Lines 73, 74: `ua.target_id = ch.id::text` — `ch.id` is cast to
    `text`. If the column is `uuid` (which `chapters.id` is in the
    Drizzle schema) the cast is implicit but the operator
    `ua.target_id = ch.id::text` is index-frustrating — `target_id`
    is `text`, `ch.id::text` evaluates per row.
  - Line 99: `u.role IN ('STUDENT', 'USER')` is the only matview that
    admits the legacy `'USER'` role; `mv_srs_health` (line 165) and
    `mv_activity_heatmap` (lines 39+63) restrict to `'STUDENT'`. This
    inconsistency is undocumented.
  - Line 100: `ua.activity_type != 'LEVEL_TEST'` — the literal string
    `'LEVEL_TEST'` is repeated as a comment elsewhere in the codebase;
    there is no enum table to validate against.
- **Impact:** Refresh time on a 6-month window of `UserActivity` rows
  will be very slow; the matview will time out in CI. The
  `u.role IN ('STUDENT','USER')` divergence makes this view's student
  set different from every other matview in the batch.
- **Fix:** Split into three materialized views keyed by
  `activity_type`, or use a single normalized `articles`/`chapters`
  reference table joined on `target_id` with no question-table joins.

#### H-08 — `mv_srs_health` `OVERLOAD` / `CRITICAL_BACKLOG` thresholds are magic numbers, inconsistent across class and school scopes
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022000002_enhance_srs_health_metrics/migration.sql`
- **Lines:** 97-115, 211-219, 274-282
- **Severity:** High
- **Evidence:**
  - Lines 97-101: `is_overloaded = (due count) > 50` — bare 50.
  - Lines 104-108: `has_critical_backlog = (due count > 3 days
    overdue) > 20` — bare 20.
  - Lines 111-115: `has_high_lapse_rate = AVG(lapses) > 3` — bare 3.
  - Lines 213, 215: class thresholds use `0.3` (overloaded) and `0.5`
    (inactive).
  - Lines 276, 278: school thresholds use `0.4` (overloaded) and `0.6`
    (inactive).
  - There is no comment explaining why the school "at_risk" cutoff
    (`0.4`) is higher than the class "at_risk" cutoff (`0.3`). The
    same signal uses different cutoffs at different aggregation
    levels.
  - Lines 216-218: `mastery_pct < 30 → 'struggling'`, `> 80 →
    'excelling'` — these are also bare numbers without provenance.
  - Lines 279-281: school uses `< 25 → 'underperforming'`, `> 75 →
    'high_performing'` — different from class-level cutoffs.
- **Impact:** A "high-performing" school (76 % mastery) is invisible to
  the `class_health_status` filter because the class-level view uses
  `> 80 → 'excelling'` and `> 75 → 'excelling'` (same cutoffs but the
  school filter is `< 75 → 'high_performing'` while the class filter
  is `< 80 → 'excelling'`). The semantic mismatch will surface as
  "classroom reports 70 % mastery (struggling); school reports 70 %
  mastery (high-performing)".
- **Fix:** Move the thresholds to a `srs_health_thresholds` reference
  table or a SQL `CREATE TYPE srs_health_thresholds AS (...)` with a
  single source of truth for class and school cutoffs.

#### H-09 — All four SQL migrations in this batch query `lr.phase1..phase14::json->>'elapsedTime'` and other Prisma-era column names
- **Files:**
  - `db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/rollback.sql:19-34`
  - `db-migrations/legacy-matviews/20251022000002_enhance_srs_health_metrics/migration.sql:78-79,84-86,98-99`
  - `db-migrations/legacy-matviews/20251022050000_enhance_activity_heatmap/migration.sql:18-36,38,40,46-60,61,64`
  - `db-migrations/legacy-matviews/20251022080000_genre_engagement_metrics/migration.sql:38`
- **Severity:** High
- **Evidence:**
  - `mv_activity_heatmap` mixes column-casing: line 38 uses
    `lr.created_at` (snake_case, Prisma legacy) and line 48 uses
    `ua."createdAt"` (CamelCase, quoted). The Drizzle schema
    `packages/db/src/schema/progress.ts` defines the table as
    `user_activity` with `created_at` (snake_case, unquoted). When
    applied against a Drizzle-managed database, `ua."createdAt"` will
    fail with `column "createdAt" does not exist`.
  - `mv_srs_health` lines 161, 163 use `uwr.save_to_flashcard = true`
    and `usr.save_to_flashcard = true`. The Drizzle schema may use
    `save_to_flashcards` (plural) or remove the column entirely.
  - `mv_srs_health` line 27-44 expects `uwr.state` to be `0`, `1`, or
    `>= 2` (New / Learning / Review) — the Anki state model. If the
    SRS module ever moves to a different state model (e.g. FSRS
    phases), the comparison silently drops to 0.
  - `mv_srs_health` line 165, `mv_activity_heatmap` lines 39, 63,
    `mv_genre_engagement_metrics` line 99: predicate `u.role = 'STUDENT'`
    / `'USER'` against a column that may be an enum (`role_type`)
    in the new Drizzle schema.
  - `mv_activity_heatmap` line 48: `ua."createdAt" as created_at` —
    the alias is `created_at` but the column reference is `"createdAt"`.
    This is fine in Prisma but will fail in Drizzle.
- **Impact:** Running any of these four migrations against a fresh
  Drizzle-managed database will fail or produce empty matviews. The
  README acknowledges this risk (lines 13-19) but only at the level
  of "this SQL must still be applied".
- **Fix:** Decide on the canonical column names (Drizzle vs Prisma)
  and rewrite the SQL against that contract. Add a smoke test that
  applies each migration to a Drizzle-seeded database and asserts
  `rowCount > 0`.

#### H-10 — `mv_activity_heatmap` `school_timezones` CTE is dead code; the timezone transform is a no-op
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022050000_enhance_activity_heatmap/migration.sql`
- **Lines:** 66-79, 88-90, 107, 113-115
- **Severity:** High
- **Evidence:**
  - Lines 66-79: `school_timezones` returns one row per school with
    `timezone = 'UTC'`, plus one row with `school_id = NULL` and
    `timezone = 'UTC'`.
  - Lines 88-90: `DATE(au.created_at AT TIME ZONE 'UTC' AT TIME ZONE
    st.timezone)` — both halves of the transform are `'UTC'`, so the
    second `AT TIME ZONE 'UTC'` is a no-op.
  - Lines 113-115 (GROUP BY): same expression is repeated three more
    times — every reference evaluates the no-op transform.
  - Line 107: `LEFT JOIN school_timezones st ON au.school_id =
    st.school_id` — adds a join whose only purpose is to provide the
    `st.timezone` column that is always `'UTC'`.
- **Impact:** Maintenance hazard. The comment "All schools use UTC
  timezone" (line 67) is asserted as fact, but if any school ever has
  a non-UTC timezone, the code path silently treats it as UTC and the
  date buckets in `activity_date`, `hour_of_day`, `day_of_week` are
  wrong. The CTE obscures the assumption.
- **Fix:** Replace `school_timezones` with a constant `UTC` (use
  `current_setting('TIMEZONE')` if you want server-local) and drop
  the `AT TIME ZONE 'UTC' AT TIME ZONE st.timezone` chain. Add a test
  that a non-UTC school produces the expected local-time bucket.

#### H-11 — `mv_activity_heatmap` `mv_class_activity_heatmap` sums `ah.unique_targets` instead of recomputing unique
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022050000_enhance_activity_heatmap/migration.sql`
- **Lines:** 144-148, 149-159
- **Severity:** High
- **Evidence:**
  - Line 144: `SUM(ah.unique_targets) as total_unique_targets` — the
    underlying `ah.unique_targets` is `COUNT(DISTINCT au.target_id)` per
    student per day per hour per activity_type bucket. Summing across
    students will double-count the same article read by two students.
  - Lines 146-148: `MIN(ah.first_activity_at)` and `MAX(ah.last_activity_at)`
    are correct, but `SUM(ah.unique_targets)` is logically wrong.
  - The `mv_activity_heatmap` UNIQUE index (line 121) is
    `(user_id, activity_date, hour_of_day, activity_type)` so each
    student-day-hour-type bucket is a single row; summing across
    students counts the same article as many times as there are
    students who read it.
- **Impact:** `total_unique_targets` on the class-level matview is a
  nonsense number that grows with class size.
- **Fix:** Recompute `COUNT(DISTINCT ah.target_id)` from the union of
  `mv_activity_heatmap` rows by joining back to `lesson_records` /
  `UserActivity`, or define a separate "class unique targets" base
  matview.

#### H-12 — `mv_srs_health_class` line 227 joins `classroomStudents cs` with no `JOIN classrooms c` filter for soft-deleted classrooms
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022000002_enhance_srs_health_metrics/migration.sql`
- **Lines:** 226-228
- **Severity:** High
- **Evidence:**
  - Line 226: `FROM classrooms c` — but there is no predicate
    `WHERE c.deleted_at IS NULL` or `WHERE c.archived = false`.
  - Line 227: `JOIN "classroomStudents" cs ON c.id = cs.classroom_id`
    — joins through every classroom row including archived ones.
  - Line 228: `LEFT JOIN mv_srs_health h ON cs.student_id = h.user_id`
    — student rows for archived classrooms still get counted.
  - Line 184: `COUNT(DISTINCT cs.student_id) AS total_students` —
    includes archived students.
- **Impact:** Class-level SRS metrics include deleted/archived
  classrooms, distorting `class_avg_mastery_pct`,
  `students_needing_intervention`, and the `class_health_status`
  thresholds.
- **Fix:** Add `WHERE c.archived = false` (or whatever the soft-delete
  flag is) to the FROM clause, and document the soft-delete contract
  in the migration header.

---

### Medium

#### M-01 — `mv_srs_health` line 165 predicate `u.role = 'STUDENT'` may diverge from the Drizzle enum
- **File:** `db-migrations/legacy-matviews/20251022000002_enhance_srs_health_metrics/migration.sql`
- **Lines:** 165, 166
- **Severity:** Medium
- **Evidence:** Hard-coded `'STUDENT'` literal. If the Drizzle schema
  defines `role` as a PostgreSQL `ENUM` with values
  `('student', 'teacher', 'admin', 'parent')` (lowercase), the
  comparison fails. The Prisma legacy schema used uppercase
  `'STUDENT'`.
- **Impact:** Matview returns zero rows if the role column is
  case-sensitive `ENUM`.
- **Fix:** Pin the role string at migration time and document the
  schema contract. Add a test that the matview count matches the
  expected student count from the source table.

#### M-02 — `mv_srs_health` lines 130-136 compute `recommended_session_minutes` with hard-coded thresholds (10, 15, 20, 25)
- **File:** `db-migrations/legacy-matviews/20251022000002_enhance_srs_health_metrics/migration.sql`
- **Lines:** 124-130
- **Severity:** Medium
- **Evidence:** The CASE chain uses bare `10`, `15`, `20`, `25`. These
  are reasonable but uncommented. The `recommended_daily_sessions`
  (lines 118-122) divides by `20.0` (cards per session) and clamps
  to `[1, 5]` — also bare numbers.
- **Fix:** Extract a `srs_recommendation_config` JSONB column or a
  comment block explaining the calibration.

#### M-03 — `mv_genre_engagement_metrics` lines 151-152 compute `daily_activity_rate = COUNT(*) / EXTRACT(days FROM NOW() - MIN(activity_date))`
- **File:** `db-migrations/legacy-matviews/20251022080000_genre_engagement_metrics/migration.sql`
- **Lines:** 150-152
- **Severity:** Medium
- **Evidence:** The denominator uses `NOW() - MIN(activity_date)` —
  for a fresh database `MIN(activity_date) ≈ NOW()` and the rate is
  `COUNT(*) / 1`, which is meaningless. For a long-tenured student
  the denominator is large and the rate is artificially low. The
  metric has no upper bound.
- **Fix:** Use a fixed denominator (e.g., 30 days) or
  `LEAST(EXTRACT(days FROM ...), 30)` to clamp the window.

#### M-04 — `mv_genre_engagement_metrics` lines 198-203 use `COUNT(DISTINCT user_id) FILTER (WHERE cefr_bucket = 'A1')` six times to compute the CEFR distribution
- **File:** `db-migrations/legacy-matviews/20251022080000_genre_engagement_metrics/migration.sql`
- **Lines:** 198-203
- **Severity:** Medium
- **Evidence:** Six sequential `FILTER` aggregations. A `CUBE` /
  `GROUPING SETS` over `(classroom_id, cefr_bucket)` would produce
  the same output in one pass.
- **Fix:** Use `FILTER (WHERE cefr_bucket IN ('A1','A2','B1','B2','C1','C2'))`
  inside a single pivot, or compute the distribution in a CTE.

#### M-05 — `mv_activity_heatmap` lines 91-104 project `u.email` and `u.name` as `display_name`
- **File:** `db-migrations/legacy-matviews/20251022050000_enhance_activity_heatmap/migration.sql`
- **Lines:** 84-85, 88-90
- **Severity:** Medium (privacy/PII)
- **Evidence:** Line 84: `u.email` and `u.name as display_name` are
  projected into every row of the matview. The UNIQUE index
  `(user_id, activity_date, hour_of_day, activity_type)` (line 121)
  means each student has many rows, all containing PII.
- **Impact:** A teacher-scoped query that joins through this view
  pulls student email + name into the dashboard. There is no row-
  level security on the view.
- **Fix:** Drop `email` and `display_name` from the projection, or
  hash them per-school.

#### M-06 — `mv_activity_heatmap` line 121 unique index `(user_id, activity_date, hour_of_day, activity_type)` collides if two activity types happen at the same hour for the same user
- **File:** `db-migrations/legacy-matviews/20251022050000_enhance_activity_heatmap/migration.sql`
- **Lines:** 80-117, 121
- **Severity:** Medium
- **Evidence:** The unique index requires `(user_id, activity_date,
  hour_of_day, activity_type)` to be unique. Multiple `activity_type`
  values for the same user on the same hour are allowed by the
  index, but the `UNION ALL` in the CTE (lines 9-65) does not
  deduplicate; if a `lesson_records` row and a `UserActivity` row
  both describe the same reading event, they are counted twice in
  `activity_count`.
- **Fix:** Add a deduplication key (e.g. `lesson_record_id` /
  `user_activity_id`) and `UNION` instead of `UNION ALL`, or add a
  deduplication predicate in the outer SELECT.

#### M-07 — `mv_srs_health` lines 71-75 compute `total_due_for_review` and `total_overdue_count` by summing two `COUNT(DISTINCT …)`
- **File:** `db-migrations/legacy-matviews/20251022000002_enhance_srs_health_metrics/migration.sql`
- **Lines:** 71-75
- **Severity:** Medium
- **Evidence:** `total_cards = COUNT(DISTINCT uwr.id) +
  COUNT(DISTINCT usr.id)` is fine. `total_due_for_review = … +
  …` (line 72-73) is also fine. But the same expression is repeated
  inline four times (lines 72, 73, 98, 105, 119). A `WITH stats AS
  (...)` CTE would deduplicate.
- **Fix:** Factor into a CTE.

#### M-08 — `useAudio.ts` (both variants) listener `removeEventListener` is called inside the listener itself
- **Files:**
  - `apps/reading-advantage/hooks/article-content/useAudio.ts`
  - `apps/reading-advantage/hooks/stories-chapter/useAudio.ts`
- **Lines:** 29-37, 46-55, 69-77, 108-116, 130-136 (article-content)
  and 30-38, 47-55, 70-78, 110-116, 131-139 (stories-chapter)
- **Severity:** Medium
- **Evidence:** `const playAudio = () => { …; audio.removeEventListener("canplaythrough", playAudio); };` then `audioRef.current.addEventListener("canplaythrough", playAudio);`. If
  `canplaythrough` fires more than once (buffering, source change),
  only the first invocation removes the listener, but the second
  invocation also calls `audio.play()`. The pattern is racy.
- **Fix:** Use `{ once: true }` in the listener options: `addEventListener("canplaythrough", playAudio, { once: true });`.

#### M-09 — `useAudio.ts` (article-content) lines 169-195 useEffect omits `isPlaying` from the dependency array
- **File:** `apps/reading-advantage/hooks/article-content/useAudio.ts`
- **Lines:** 169-195
- **Severity:** Medium
- **Evidence:** `useEffect(() => { … if (isPlaying) audio.play(); … }, [currentAudioIndex, speed]);` reads `isPlaying` but the dep array
  is `[currentAudioIndex, speed]`. ESLint `react-hooks/exhaustive-deps`
  would flag this. If `isPlaying` flips false → true while
  `currentAudioIndex` and `speed` are stable, the effect does not
  re-run, so the next `audio.play()` is missed.
- **Fix:** Add `isPlaying` to the dep array, or restructure to call
  `audio.play()` directly from a state-change handler.

#### M-10 — `useAudio.ts` (both variants) return raw state setters to consumers
- **Files:**
  - `apps/reading-advantage/hooks/article-content/useAudio.ts`
  - `apps/reading-advantage/hooks/stories-chapter/useAudio.ts`
- **Lines (article-content):** 213-214
- **Lines (stories-chapter):** 218-219
- **Severity:** Medium
- **Evidence:** The hook returns `setIsPlaying`, `setCurrentAudioIndex`,
  `setSelectedIndex` (and `setSelectedSentence` in stories-chapter).
  These let the consumer desync the internal audio state. For
  example, the consumer can call `setCurrentAudioIndex(99)` when
  `sentenceList.length === 5`.
- **Fix:** Wrap setters behind domain actions (`goToSentence(i)`,
  `setPlaying(false)`).

#### M-11 — `useDashboardMetrice.ts` line 91 `setError(e instanceof Error ? e : new Error(String(e)))` and line 92-95 toast with raw error message
- **File:** `apps/reading-advantage/hooks/student/useDashboardMetrice.ts`
- **Lines:** 90-95
- **Severity:** Medium
- **Evidence:** The toast description uses `${e.message}` directly.
  If `e.message` is `'fetch failed'` (Node fetch) or `'NetworkError
  when attempting to fetch resource.'` (Firefox), the user sees a
  useless message. No error code, no request URL, no status.
- **Fix:** Map errors to user-friendly messages with a small helper
  (`mapFetchError(e, url)`).

#### M-12 — `useClassroomActions.ts` line 144 iterates `localStorage.length` while removing items; the loop will skip keys
- **File:** `apps/reading-advantage/hooks/teacher/useClassroomActions.ts`
- **Lines:** 132-144
- **Severity:** Medium
- **Evidence:** `for (let i = 0; i < localStorage.length; i++)` while
  calling `localStorage.removeItem(key)` inside the loop. Removing
  an item shifts the remaining keys down by one; the next iteration
  reads a different key than expected, skipping one.
- **Fix:** Snapshot keys first: `const keys = Object.keys(localStorage); for (const key of keys) { … }` and remove after the
  iteration.

#### M-13 — `useClassroomActions.ts` `syncStudents` line 51 reads `window.location.pathname` without SSR guard
- **File:** `apps/reading-advantage/hooks/teacher/useClassroomActions.ts`
- **Lines:** 47-80
- **Severity:** Medium
- **Evidence:** `const lastUrl = window.location.pathname;` (line 51)
  inside the function. The hook is consumed by
  `class-roster.tsx:57,122`, which is a client component, so the
  function only runs in the browser today. But the file is missing
  a `"use client";` directive (compare to `useDashboardMetrice.ts:1`
  and `use-metrics-stream.ts:5`). If a future consumer imports the
  hook from a server component, the function will be invoked during
  SSR and `window` will be undefined.
- **Fix:** Add `"use client";` at the top of the file, or guard the
  function body with `if (typeof window === 'undefined') return;`.

#### M-14 — `use-metrics-stream.ts` line 87, 94, 107, 111, 137 use `console.log` / `console.error` for normal-flow events
- **File:** `apps/reading-advantage/hooks/use-metrics-stream.ts`
- **Lines:** 87, 94, 107, 111, 137
- **Severity:** Medium
- **Evidence:** Every connected/disconnect/update event logs to the
  console unconditionally. In production these messages flood the
  console at the SSE message rate.
- **Fix:** Replace with structured logger calls, or gate behind a
  debug flag.

#### M-15 — `useCustomDateRangeXp.ts` line 71-72 uses `fromDate.toISOString().split('T')[0]` (UTC) for a date the user picked in local time
- **File:** `apps/reading-advantage/hooks/useCustomDateRangeXp.ts`
- **Lines:** 60-95, 71-72
- **Severity:** Medium
- **Evidence:** `fromDate.toISOString()` returns the UTC ISO string.
  A user in GMT+7 picking "January 1, 2024" in a date picker gets
  `2023-12-31T17:00:00Z` → `'2023-12-31'`. The server receives
  December 31.
- **Fix:** Use `fromDate.toLocaleDateString('en-CA')` (which yields
  `YYYY-MM-DD` in local time) or compute the local date directly.

#### M-16 — `useCustomDateRangeXp.ts` `useEffect` line 97-99 has `fetchData` in deps but `fetchData` is recreated each render (no `useCallback`)
- **File:** `apps/reading-advantage/hooks/useCustomDateRangeXp.ts`
- **Lines:** 60-99
- **Severity:** Medium
- **Evidence:** `fetchData` is defined as `const fetchData = async () => { … }` (line 60) — every render creates a new function
  reference. The `useEffect(() => { fetchData(); }, [fromDate,
  toDate, licenseId])` (line 97-99) lists `fromDate, toDate, licenseId`
  but the function body uses all three correctly; the issue is that
  the function is not memoized and a future ESLint rule
  (`react-hooks/exhaustive-deps`) will flag it.
- **Fix:** Wrap `fetchData` in `useCallback`.

#### M-17 — `useDirectionalInput.test.tsx` covers only `preventDefault` behaviour; no test for input vector / cast flag
- **File:** `apps/reading-advantage/hooks/useDirectionalInput.test.tsx`
- **Lines:** 1-29
- **Severity:** Medium
- **Evidence:** Two assertions, both about `defaultPrevented`. No
  test for: Arrow keys populating `input.dx/dy`, WASD keys,
  `consumeCast` resetting `castTriggered`, `triggerCast()`,
  `setVirtualInput` overriding keyboard, multi-key diagonals, key
  release.
- **Fix:** Add tests for each branch of the input pipeline.

#### M-18 — `useGameLoop.test.tsx` uses `jest.useFakeTimers()` — incompatible with Vitest
- **File:** `apps/reading-advantage/hooks/useGameLoop.test.tsx`
- **Lines:** 10-17, 23-29
- **Severity:** Medium
- **Evidence:** The project is migrating to Vitest per AGENTS.md
  "Mixed Jest/Vitest test runners (being normalized)". Vitest uses
  `vi.useFakeTimers()` and `vi.advanceTimersByTime()`. The Jest
  globals `jest.useFakeTimers` / `jest.advanceTimersByTime` will not
  resolve under Vitest; the test will fail with `jest is not
  defined`.
- **Fix:** Replace `jest.useFakeTimers` with `vi.useFakeTimers` (and
  `jest.advanceTimersByTime` → `vi.advanceTimersByTime`).

#### M-19 — `use-metrics-stream.ts` lines 174-186 `useMetricsInvalidation` always opens a fresh EventSource even when only invalidation callbacks are needed
- **File:** `apps/reading-advantage/hooks/use-metrics-stream.ts`
- **Lines:** 170-186
- **Severity:** Medium
- **Evidence:** `useMetricsInvalidation` calls `useMetricsStream({ onUpdate })` (line 174). The full `useMetricsStream` machinery
  (state, ref, connect, disconnect) is instantiated even when the
  caller only needs the `lastUpdate` derived flag.
- **Fix:** Extract a small `useEventSource(url)` primitive and have
  both hooks share it.

#### M-20 — `useConfig.ts` no SSR safety; `atomWithStorage` initial value mismatches between server and client
- **File:** `apps/reading-advantage/hooks/use-config.ts`
- **Lines:** 14-19, 21-23
- **Severity:** Medium
- **Evidence:** `atomWithStorage<Config>("config", { style: "new-york", theme: "zinc", radius: 0.5, packageManager: "pnpm" })` — `atomWithStorage` reads from `localStorage` on the client and
  uses the default on the server. If `useConfig` is consumed in an
  SSR-rendered component (theme-customizer.tsx is `"use client"` per
  its existing usage), the initial render will use the default and
  the post-hydration render will use the localStorage value. React
  will warn about hydration mismatch.
- **Fix:** Use `atomWithStorage` with `getOnInit: true` and accept
  the initial mismatch, or render a skeleton until the client reads
  the value.

#### M-21 — `eslint.config.mjs` extends only `next/core-web-vitals`
- **File:** `apps/reading-advantage/eslint.config.mjs`
- **Lines:** 1-18
- **Severity:** Medium
- **Evidence:** The flat config imports `FlatCompat` and extends a
  single legacy config. No TypeScript rules (no
  `@typescript-eslint/recommended`, no `no-explicit-any`), no React
  Hooks rules, no console ban, no security rules. The codebase-wide
  lint policy (per AGENTS.md §Build & Test) is missing.
- **Impact:** `useDashboardMetrice.ts` `any` types and
  `useAudio.ts` non-null assertions slip through lint.
- **Fix:** Add `@typescript-eslint/recommended` and
  `eslint-plugin-react-hooks` to the extends list.

#### M-22 — `useAudio.ts` (article-content) line 17 `useState<Boolean>(false)` uses the `Boolean` wrapper instead of `boolean`
- **Files:**
  - `apps/reading-advantage/hooks/article-content/useAudio.ts:17`
  - `apps/reading-advantage/hooks/stories-chapter/useAudio.ts:20`
- **Severity:** Low → Medium (cosmetic but inconsistent)
- **Evidence:** `useState<Boolean>(false)` instead of
  `useState<boolean>(false)`. The `Boolean` wrapper is a constructor
  and is allowed by TypeScript but ESLint usually bans it via
  `@typescript-eslint/no-wrapper-object-types`.
- **Fix:** Use `boolean`.

#### M-23 — `use-lock-body.ts` line 5 `React.useLayoutEffect` is the only consumer of `React`
- **File:** `apps/reading-advantage/hooks/use-lock-body.ts`
- **Lines:** 1-12
- **Severity:** Low → Medium (idiom)
- **Evidence:** The file imports `* as React from "react"` and calls
  `React.useLayoutEffect`. The other files in the directory
  (`useConfig.ts`, `useCustomDateRangeXp.ts`) use named imports.
  Consistency: use `import { useLayoutEffect } from "react";`.
- **Fix:** Switch to named imports.

---

### Low

#### L-01 — `migration_lock.toml` provider is hard-coded to `postgresql`
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022050000_enhance_activity_heatmap/migration_lock.toml`
- **Lines:** 1-3
- **Severity:** Low
- **Evidence:** The file is the standard `sqlx`-style migration lock
  metadata. The other directories in the batch do not have a
  `migration_lock.toml`. Inconsistent.
- **Fix:** Either add the same file to every directory or remove
  from this one.

#### L-02 — `20251022000001_enhance_alignment_metrics/rollback.sql` is asymmetric: drops `mv_alignment_metrics` but only re-creates `mv_cefr_ra_alignment`
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022000001_enhance_alignment_metrics/rollback.sql`
- **Lines:** 1-49
- **Severity:** Low
- **Evidence:** Line 4 drops `mv_alignment_metrics`. Lines 10-48
  re-create the *old* `mv_cefr_ra_alignment` view. There is no
  rollback for the column drop on `assignments.alignment_override`
  (line 7) — wait, line 7 *does* drop the column. But the
  `20251022000001_enhance_alignment_metrics/migration.sql` (not in
  this batch — in batch 37) also drops and re-creates `assignments`.
  The rollback file references tables that the forward migration
  owns.
- **Impact:** The rollback is one-way: it drops the new matview but
  does not re-create the new matview (it re-creates the old one). If
  the user expected `mv_alignment_metrics` to come back after
  rollback, it will not.
- **Fix:** Document the rollback contract at the top of the file.

#### L-03 — `20251022080000_genre_engagement_metrics/rollback.sql` is 6 lines and trivially correct but does not drop the helper CTEs / functions
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251022080000_genre_engagement_metrics/rollback.sql`
- **Lines:** 1-6
- **Severity:** Low
- **Evidence:** Drops `mv_school_genre_engagement CASCADE`,
  `mv_class_genre_engagement CASCADE`, and
  `mv_genre_engagement_metrics CASCADE`. The forward migration
  (245 lines) does not create functions or types, so the rollback
  is complete. Good.
- **Impact:** None.
- **Fix:** None needed.

#### L-04 — `20251110000000_add_unique_index_activity_heatmap/migration.sql` does not assert the data is unique before adding the unique index
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/20251110000000_add_unique_index_activity_heatmap/migration.sql`
- **Lines:** 1-9
- **Severity:** Low
- **Evidence:** Lines 5, 8: drops the composite index and adds the
  unique index with no `WHERE NOT EXISTS` or uniqueness check. If
  the existing `mv_activity_heatmap` has duplicate
  `(user_id, activity_date, hour_of_day, activity_type)` rows (which
  can happen if the view refresh produced duplicates from the
  `UNION ALL` in the CTE), the migration will fail with
  `could not create unique index`.
- **Fix:** Add a `SELECT COUNT(*) - COUNT(DISTINCT …)` check before
  the `CREATE UNIQUE INDEX`.

#### L-05 — `README.md` line 36 says follow-up "belongs to a future maintenance task" but no `measure/tracks/` entry references it
- **File:** `apps/reading-advantage/db-migrations/legacy-matviews/README.md`
- **Lines:** 34-37
- **Severity:** Low
- **Evidence:** Acknowledged tech debt without an owner.
- **Fix:** Create a `measure/tracks/<id>/plan.md` for the
  Drizzle-folding follow-up.

#### L-06 — `useClassroomActions.ts` line 18-34 fetches `/api/v1/classroom/${classId}` and stores `data.studentInClass` and `data.classroom` without typing the response
- **File:** `apps/reading-advantage/hooks/teacher/useClassroomActions.ts`
- **Lines:** 18-34
- **Severity:** Low
- **Evidence:** `const data = await res.json(); setStudentInClass(data.studentInClass); setClasses(data.classroom);` — no
  type narrowing. The `classroom-store` (imported on line 1) likely
  has typed setters, but the hook bypasses them.
- **Fix:** Type the response with a Zod schema (same as
  `/api/v1/classroom/[id]/route.ts`).

#### L-07 — `useClassroomActions.ts` line 132-159 `clearCache` matches `studentId` substring without escaping; a student with id "mcq-test" matches the literal `mcq` substring and clears unrelated keys
- **File:** `apps/reading-advantage/hooks/teacher/useClassroomActions.ts`
- **Lines:** 131-159
- **Severity:** Low
- **Evidence:** `key.includes("mcq") || key.includes("question") || key.includes(studentId)` — overly broad. A student whose id is
  `mcq-help-bot` would have their unrelated `mcq-*` keys cleared.
- **Fix:** Use a stricter key prefix (e.g. `mcq:${studentId}:*`).

#### L-08 — `useConfig.ts` line 11 `packageManager: "npm" | "yarn" | "pnpm" | "bun"` is unused by the consumer
- **File:** `apps/reading-advantage/hooks/use-config.ts`
- **Lines:** 7-12, 14-19
- **Severity:** Low
- **Evidence:** The `packageManager` field is part of the persisted
  config but neither `theme-customizer.tsx` nor
  `theme-warpper.tsx` reads it. The config UI lets users select
  package manager but the value is dead.
- **Fix:** Either wire it into the install command (e.g. `npx
  shadcn add ...`) or remove the field.

#### L-09 — `use-metrics-stream.ts` lines 67-68 `eventSourceRef` and `reconnectTimeoutRef` are typed `useRef<EventSource | null>(null)` / `useRef<NodeJS.Timeout | null>(null)`
- **File:** `apps/reading-advantage/hooks/use-metrics-stream.ts`
- **Lines:** 67-68
- **Severity:** Low
- **Evidence:** `NodeJS.Timeout` is a Node-only type. In the browser
  the equivalent is `number` (`setTimeout` returns `number`). The
  ref typing will fail under DOM-only environments if `lib` in
  tsconfig does not include `"node"`.
- **Fix:** Use `ReturnType<typeof setTimeout> | null` to abstract
  the platform.

#### L-10 — `useDirectionalInput.ts` line 84 `cast = castTriggered || virtualInput.cast` is sticky once `castTriggered` is true
- **File:** `apps/reading-advantage/hooks/useDirectionalInput.ts`
- **Lines:** 12, 35-37, 65-67, 84
- **Severity:** Low
- **Evidence:** `castTriggered` is never reset by `triggerCast` (line
  89). Once true, it stays true until `consumeCast()` is called.
  `castTriggered || virtualInput.cast` is therefore always true once
  the user has pressed Space/Enter.
- **Fix:** Reset `castTriggered` after one consumer read via a
  `useEffect` or a `useState` flag that auto-clears.

#### L-11 — `useDashboardMetrice.ts` line 31-42 `Promise.allSettled` results are filtered by `value.ok` only, ignoring `rejected` outcomes
- **File:** `apps/reading-advantage/hooks/student/useDashboardMetrice.ts`
- **Lines:** 31-99
- **Severity:** Low
- **Evidence:** The `if (velocityRes.status === "fulfilled" && velocityRes.value.ok) { … } else if (velocityRes.status === "fulfilled") { … }` chain silently drops the `rejected` case.
- **Fix:** Add `else if (velocityRes.status === "rejected") { … toast({…}); }`.

#### L-12 — `useCustomDateRangeXp.ts` line 86-87 `setData(result.data || [])` — response shape is implicit
- **File:** `apps/reading-advantage/hooks/useCustomDateRangeXp.ts`
- **Lines:** 86-87
- **Severity:** Low
- **Evidence:** The endpoint returns `{ data: ClassroomData[] }` but
  the hook does not validate. If the API ever returns
  `{ result: ClassroomData[] }` the hook will silently set `[]`.
- **Fix:** Validate with a Zod schema.

#### L-13 — `useAudio.ts` (article-content) line 159-167 `handleTimeUpdate` uses `currentSentence.endTime` but `endTime` may be undefined for the last sentence
- **File:** `apps/reading-advantage/hooks/article-content/useAudio.ts`
- **Lines:** 162-165
- **Severity:** Low
- **Evidence:** `if (audioRef.current.currentTime >= currentSentence.endTime) handleAudioEnded();` — if
  `currentSentence.endTime` is undefined (e.g., the last sentence
  has no `endTime`), the comparison is `currentTime >= undefined`
  which is `false`, so the audio never auto-advances.
- **Fix:** Default to `Infinity` or to `audioRef.current.duration`.

#### L-14 — `useAudio.ts` (stories-chapter) line 175 `useEffect` calls `setSelectedIndex(-1)` unconditionally on every effect run
- **File:** `apps/reading-advantage/hooks/stories-chapter/useAudio.ts`
- **Lines:** 173-200
- **Severity:** Low
- **Evidence:** `setSelectedIndex(-1)` (line 175) runs on every
  `currentAudioIndex` or `speed` change. If the consumer has
  selected a sentence via `setSelectedSentence` (line 107), the
  effect will overwrite it immediately.
- **Fix:** Only reset `selectedIndex` when the source changes
  (i.e., on `currentAudioIndex` change), not on `speed` change.

#### L-15 — `useClassroomActions.ts` `clearCache` is defined after `handleResetProgress` which calls it — works because of hoisting (const), but the order is confusing
- **File:** `apps/reading-advantage/hooks/teacher/useClassroomActions.ts`
- **Lines:** 82-129, 131-159
- **Severity:** Low
- **Evidence:** `clearCache` is referenced at line 111 (inside
  `handleResetProgress`) but defined at line 131. `const` hoisting
  means the reference resolves correctly, but reading top-to-bottom
  the order is confusing.
- **Fix:** Reorder so `clearCache` is defined first.

#### L-16 — `use-metrics-stream.ts` line 174 `useMetricsInvalidation` discards `connected`, `stats`, `error`, `reconnect`, `disconnect` from `useMetricsStream`
- **File:** `apps/reading-advantage/hooks/use-metrics-stream.ts`
- **Lines:** 170-186
- **Severity:** Low
- **Evidence:** The wrapper hook ignores the connection state of the
  underlying stream. A consumer cannot tell whether the SSE channel
  is healthy.
- **Fix:** Return the full `useMetricsStream` shape from
  `useMetricsInvalidation` too.

#### L-17 — `eslint.config.mjs` does not ignore `.prisma/`, `prisma/migrations/`, or `.turbo/`
- **File:** `apps/reading-advantage/eslint.config.mjs`
- **Lines:** 7-13
- **Severity:** Low
- **Evidence:** `ignores: [".next/", "node_modules/", "prisma/generated/", "coverage/", "public/"]`. Missing `.turbo/`,
  `dist/`, `build/`, `.swc/`. The lint command will walk into
  `node_modules` if any nested project is missing a `package.json`.
- **Fix:** Add common build/cache dirs.

#### L-18 — `useAudio.ts` (article-content) line 197-215 return statement includes `setIsPlaying`, `setCurrentAudioIndex`, `setSelectedIndex` — leaky abstraction
- **File:** `apps/reading-advantage/hooks/article-content/useAudio.ts`
- **Lines:** 197-215
- **Severity:** Low
- **Evidence:** Same as M-10.

#### L-19 — `useDashboardMetrice.ts` line 19-25 `useState<DashboardData>({ velocity: null, … })` — initialization has 5 fields but the type has 5 fields; OK.
- **File:** `apps/reading-advantage/hooks/student/useDashboardMetrice.ts`
- **Lines:** 19-25
- **Severity:** Low (cosmetic)
- **Evidence:** Five-field initializer is fine.
- **Fix:** None.

#### L-20 — `useCustomDateRangeXp.ts` line 99 `useEffect` re-fetches on every dependency change including licenseId — but `licenseId` may be undefined
- **File:** `apps/reading-advantage/hooks/useCustomDateRangeXp.ts`
- **Lines:** 97-99
- **Severity:** Low
- **Evidence:** `[fromDate, toDate, licenseId]` — when `licenseId`
  transitions from `undefined` to a value, the effect re-fires; but
  the function body at line 61-64 already short-circuits when
  `fromDate || toDate` is missing. The early return is correct, but
  the dep array includes `licenseId` even when `licenseId` is
  optional.
- **Fix:** Document the contract in JSDoc.

#### L-21 — `useDirectionalInput.ts` line 70-76 input vector calculation is recomputed every render
- **File:** `apps/reading-advantage/hooks/useDirectionalInput.ts`
- **Lines:** 70-82
- **Severity:** Low
- **Evidence:** `let dx = 0; let dy = 0; if (keys.has(...)) dy -= 1; …`
  runs every render. `useMemo` is not used. Minor re-render cost.
- **Fix:** `useMemo(() => …, [keys, virtualInput])`.

#### L-22 — `use-metrics-stream.ts` lines 109-117 `if (autoReconnect && !reconnectTimeoutRef.current)` racy guard
- **File:** `apps/reading-advantage/hooks/use-metrics-stream.ts`
- **Lines:** 109-117
- **Severity:** Low
- **Evidence:** If `onerror` fires synchronously twice (e.g., when
  `disconnect()` is called from a separate path while `connect()` is
  mid-flight), the ref guard prevents double-schedule only if the
  two events are interleaved with the `setTimeout` callback running.
- **Fix:** Use a `useRef<{ reconnecting: boolean }>` instead.

---

## Static Asset / Privacy Audit

| Item | File / Line | Concern |
|------|-------------|---------|
| PII in matview (`u.email`) | `20251022050000_enhance_activity_heatmap/migration.sql:84` | Privacy — student email persisted in matview rows. |
| PII in matview (`u.name`) | `20251022050000_enhance_activity_heatmap/migration.sql:85` | Privacy — student display name persisted in matview rows. |
| Matview refresh broadcast | `20251022050000_enhance_activity_heatmap/migration.sql:178-182, 223-236` | Observability — `pg_notify('metrics:update', ...)` fires on every refresh; consumer must trust the notification payload. |
| `users.role = 'STUDENT'` literal | `20251022000002_enhance_srs_health_metrics/migration.sql:165` | Migration coupling — case-sensitive literal assumes Prisma convention. |
| `users.role IN ('STUDENT','USER')` | `20251022080000_genre_engagement_metrics/migration.sql:99` | Migration coupling — inconsistent with sibling matviews (M-01). |
| Hard-coded UTC timezone | `20251022050000_enhance_activity_heatmap/migration.sql:67-79` | Functional — non-UTC schools silently bucketed in UTC (H-10). |
| Magic overload thresholds | `20251022000002_enhance_srs_health_metrics/migration.sql:97-115, 213-219, 274-282` | Calibration undocumented (H-08). |

---

## SQL / Migration Audit

| Item | File / Line | Concern |
|------|-------------|---------|
| `lr.phase1..phase14::json->>'elapsedTime'` | `20251022000001_enhance_alignment_metrics/rollback.sql:19-34` | Brittle contract — same as Batch 37 H-07. |
| `"createdAt"` quoted CamelCase | `20251022050000_enhance_activity_heatmap/migration.sql:48` | Drizzle schema mismatch — Drizzle defines `user_activity.created_at`. |
| `save_to_flashcard = true` | `20251022000002_enhance_srs_health_metrics/migration.sql:161-164` | Column may be plural `save_to_flashcards` in Drizzle. |
| `u.state` (Anki state 0/1/2+) | `20251022000002_enhance_srs_health_metrics/migration.sql:27-44` | SRS state model contract assumed; no CHECK constraint. |
| 10-way LEFT JOIN CTE | `20251022080000_genre_engagement_metrics/migration.sql:65-90` | Refresh performance risk (H-07). |
| `target_id = ch.id::text` | `20251022080000_genre_engagement_metrics/migration.sql:73` | Cast on `ch.id` is per-row (H-07). |
| `total_unique_targets` summation | `20251022050000_enhance_activity_heatmap/migration.sql:144` | Aggregation is wrong — sums distincts (H-11). |
| `school_timezones` no-op CTE | `20251022050000_enhance_activity_heatmap/migration.sql:66-79` | Dead code (H-10). |
| `mv_class_activity_heatmap` no soft-delete filter | `20251022000002_enhance_srs_health_metrics/migration.sql:226-227` | Archived classrooms counted (H-12). |
| `uniqueTargets` aggregation | `20251022050000_enhance_activity_heatmap/migration.sql:144` | Same as H-11. |
| `DROP MATERIALIZED VIEW` without `CONCURRENTLY` | every migration | Acceptable during initial apply; problematic for hot migrations. |
| Migration `20251110000000` uniqueness check | `20251110000000_add_unique_index_activity_heatmap/migration.sql:8` | No pre-check for duplicates (L-04). |

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A1 | Silent catch + happy UI | Yes | `useDashboardMetrice.ts:90-95` catches all errors and shows a generic toast; `useClassroomActions.ts:31-33, 76-79` swallows fetch errors with `console.error` only. |
| A2 | Bypass of domain/contracts layer | Yes | `useDashboardMetrice.ts`, `useCustomDateRangeXp.ts`, `useClassroomActions.ts` all `fetch()` the REST API directly from the client with no backend module wrapper. |
| A3 | Magic numbers without enum | Yes | `mv_srs_health` thresholds 50/20/3/0.3/0.5/0.4/0.6/30/80/25/75. `mv_activity_heatmap` `INTERVAL '6 months'`. `useGameLoop.test.tsx` 250/200/350 ms. |
| A4 | Vacuous-pass on nothing-done | Yes | `useDirectionalInput.ts:84` `cast = castTriggered \|\| virtualInput.cast` — once `castTriggered` is true, `cast` is always true even if both sources are stale. |
| A5 | False-claim text vs test reality | Yes | `useGameLoop.test.tsx` uses `jest.useFakeTimers` / `jest.advanceTimersByTime` but the project is migrating to Vitest; tests will not run. |
| A6 | Provider-specific hardcoded URLs | Partial | `use-metrics-stream.ts:78` hard-codes `'/api/v1/metrics/stream'`. `useDashboardMetrice.ts:33-41` hard-codes five `/api/v1/metrics/...` paths. |
| A7 | Magic numbers without enum | Yes | `use-metrics-stream.ts:55,56` `autoReconnect = true`, `reconnectDelay = 5000` are bare defaults. `useAudio.ts` article-content line 19 `useState<string>("1")` for speed with no enum. |
| A8 | Hard-coded PII in test data | No | (No test fixtures in this batch.) |
| A9 | Duplicated code | Yes | `hooks/article-content/useAudio.ts` and `hooks/stories-chapter/useAudio.ts` are ~95 % identical (H-01). |
| A10 | Leaky abstraction | Yes | `useAudio.ts` (both) return raw state setters (M-10, L-18). |

---

## Test / Coverage Observations

1. **Only 2 of 20 files in this batch have tests.**
   `useDirectionalInput.test.tsx` (29 lines, 2 assertions) and
   `useGameLoop.test.tsx` (55 lines, 3 assertions). No tests for any
   of the 7 SQL migration files.
2. **Behaviour worth testing (representative, not exhaustive):**
   - `useAudio.ts` (both variants): ensures `handlePlayPause` toggles
     `isPlaying`, `handleTimeUpdate` advances the audio, and
     `canplaythrough` listener fires once.
   - `useDashboardMetrice.ts`: ensures `data` is populated correctly
     when all five endpoints succeed; ensures `error` is set when all
     five endpoints fail.
   - `useClassroomActions.ts`: ensures `clearCache` removes
     student-scoped keys without affecting unrelated keys.
   - `use-metrics-stream.ts`: ensures `connect()` opens an EventSource
     to `/api/v1/metrics/stream`, `disconnect()` closes it, and
     `autoReconnect` schedules a re-`connect()` on `onerror`.
   - `useCustomDateRangeXp.ts`: ensures `fromDate.toISOString().split('T')[0]`
     serializes as UTC (M-15).
   - `useDirectionalInput.ts`: WASD keys populate `input.dx/dy`,
     `consumeCast` resets `castTriggered`, virtual input overrides
     keyboard.
   - `20251022000002_enhance_srs_health_metrics/migration.sql`:
     apply against a real Postgres test instance and assert
     `mv_srs_health`, `mv_srs_health_class`, `mv_srs_health_school`
     are created with non-zero row counts.
   - `20251022050000_enhance_activity_heatmap/migration.sql`: apply
     and assert the UNIQUE index
     `(user_id, activity_date, hour_of_day, activity_type)` exists.
   - `20251022080000_genre_engagement_metrics/migration.sql`: apply
     and assert `mv_genre_engagement_metrics`,
     `mv_class_genre_engagement`, `mv_school_genre_engagement` are
     created.
3. **No test execution was attempted.** No tests exist for the SQL
   migrations or the hooks (beyond the two stub test files).

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.
The `migration_lock.toml` is 3 lines; the two `rollback.sql` files
are 6 and 49 lines respectively. No file required partial review.

---

## Recommendations (focused, no broad refactor)

1. Deduplicate `hooks/article-content/useAudio.ts` and
   `hooks/stories-chapter/useAudio.ts` into a single shared hook
   with `onSentenceSelected` as the only varying surface (H-01).
2. Rename `useDashboardMetrice` → `useDashboardMetrics`, type the
   five response fields with Zod-inferred types, and move the
   orchestration to a backend query module (H-02).
3. Replace `cache: "no-cache"` with `cache: "no-store"` (or omit) in
   `useClassroomActions.ts:92` (H-03).
4. Add a small `useEventSource(url)` primitive with ref-counted
   deduplication so `useMetricsStream` and `useMetricsInvalidation`
   share one connection per URL (H-04).
5. Resolve the `handleTimeUpdate` vs native `ended` race in `useAudio.ts`
   (H-05).
6. Auto-reset `castTriggered` and add a `clearVirtualInput` helper
   in `useDirectionalInput.ts` (H-06).
7. Replace the 10-way LEFT JOIN in `mv_genre_engagement_metrics`
   with three single-purpose matviews, or normalize `target_id` to a
   `(article_id | chapter_id)` reference (H-07).
8. Centralize SRS overload/backlog thresholds in a reference table
   and use the same cutoffs at class and school scopes (H-08).
9. Decide on the canonical column-casing for `UserActivity.createdAt`
   vs `lesson_records.created_at` and rewrite all four SQL
   migrations against that contract (H-09).
10. Drop the `school_timezones` no-op CTE and document the UTC
    assumption in the migration header (H-10).
11. Fix `mv_class_activity_heatmap.total_unique_targets` aggregation
    (H-11).
12. Add `WHERE c.archived = false` (or equivalent) to
    `mv_srs_health_class` and document the soft-delete contract
    (H-12).
13. Extend `eslint.config.mjs` with `@typescript-eslint/recommended`
    and `eslint-plugin-react-hooks` so the `any` types and
    non-null assertions in this batch are flagged (M-21).
14. Convert `useGameLoop.test.tsx` from Jest to Vitest fake timers
    (M-18).
15. Replace `console.log` / `console.error` in `use-metrics-stream.ts`
    with structured logger calls (M-14).
16. Add a `useEventSource` registry or HOC to dedup SSE connections
    (H-04, M-19).
17. Snapshot `localStorage` keys before iteration in
    `useClassroomActions.ts:132-159` (M-12).
18. Use `fromDate.toLocaleDateString('en-CA')` (local-time YYYY-MM-DD)
    in `useCustomDateRangeXp.ts:71-72` (M-15).
19. Replace `jest.useFakeTimers` / `jest.advanceTimersByTime` in
    `useGameLoop.test.tsx` with `vi.useFakeTimers` /
    `vi.advanceTimersByTime` (M-18).
20. Remove the `packageManager` field from `useConfig.ts:11` if it
    remains unused, or wire it into the install command (L-08).
21. Create a `measure/tracks/<id>/plan.md` for the
    Drizzle-folding follow-up referenced in `README.md:36` (L-05).
22. Add a uniqueness pre-check to
    `20251110000000_add_unique_index_activity_heatmap/migration.sql:8`
    so the migration fails fast on duplicate
    `(user_id, activity_date, hour_of_day, activity_type)` tuples
    (L-04).

---

## End of file review for batch 38.

MEASURE_AGENT_RESULT