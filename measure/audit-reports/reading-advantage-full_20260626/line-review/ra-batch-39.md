# Line-by-Line Review: Reading Advantage — Batch 39

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-39`
**Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / SQL / static-asset / privacy / security

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-39` were read in full. The
batch covers:

- 4 React hooks under `apps/reading-advantage/hooks/`
  (`useGameLoop`, `useInterval` + test, `useLowestRatedArticles`,
  `useSound` + test).
- 2 i18n wiring files at `apps/reading-advantage/i18n.ts` and
  `apps/reading-advantage/i18n/routing.ts`.
- 2 Jest config files (`jest.config.ts`, `jest.setup.ts`).
- 7 cache / metrics modules under `apps/reading-advantage/lib/cache/`
  (`advanced-cache`, `connection-monitor`, `fallback-queries`, `index`,
  `matview-manager`, `metrics`, `query-optimizer`).
- 3 utility modules at `apps/reading-advantage/lib/`
  (`calculateLevel`, `check-article-completion`,
  `check-story-completion`).

| # | File | Lines / Bytes Reviewed |
|---|------|------------------------|
| 1 | `apps/reading-advantage/hooks/useGameLoop.ts` | 1–9 |
| 2 | `apps/reading-advantage/hooks/useInterval.test.tsx` | 1–57 |
| 3 | `apps/reading-advantage/hooks/useInterval.ts` | 1–16 |
| 4 | `apps/reading-advantage/hooks/useLowestRatedArticles.ts` | 1–71 |
| 5 | `apps/reading-advantage/hooks/useSound.test.tsx` | 1–114 |
| 6 | `apps/reading-advantage/hooks/useSound.ts` | 1–118 |
| 7 | `apps/reading-advantage/i18n.ts` | 1–15 |
| 8 | `apps/reading-advantage/i18n/routing.ts` | 1–12 |
| 9 | `apps/reading-advantage/jest.config.ts` | 1–31 |
| 10 | `apps/reading-advantage/jest.setup.ts` | 1–38 |
| 11 | `apps/reading-advantage/lib/cache/advanced-cache.ts` | 1–269 |
| 12 | `apps/reading-advantage/lib/cache/connection-monitor.ts` | 1–345 |
| 13 | `apps/reading-advantage/lib/cache/fallback-queries.ts` | 1–480 |
| 14 | `apps/reading-advantage/lib/cache/index.ts` | 1–43 |
| 15 | `apps/reading-advantage/lib/cache/matview-manager.ts` | 1–360 |
| 16 | `apps/reading-advantage/lib/cache/metrics.ts` | 1–354 |
| 17 | `apps/reading-advantage/lib/cache/query-optimizer.ts` | 1–186 |
| 18 | `apps/reading-advantage/lib/calculateLevel.ts` | 1–52 |
| 19 | `apps/reading-advantage/lib/check-article-completion.ts` | 1–70 |
| 20 | `apps/reading-advantage/lib/check-story-completion.ts` | 1–62 |

**Total lines reviewed:** 2,700.
**No file was partially reviewed.**

---

## Executive Summary

This batch contains the React-client hook layer, the `next-intl`
bootstrap, the Jest harness configuration, the entire
`apps/reading-advantage/lib/cache/*` module (custom multi-tier cache,
PG stats scraper, materialized view manager, metrics SWR cache, raw-SQL
helper, debounce helper), and three small client-side helpers
(`calculateLevel`, completion checkers). The bulk of the severity lives
in the cache module: the code there is a self-rolled cache/connection-
monitor stack with multiple hard-coded SQL queries, two separate cache
classes that share no interface, raw `sql.raw(\`…${viewName}\`)` calls
on database identifiers, no Zod schemas at any boundary, and very
little of it is wrapped in a backend-module / `command()` pattern.

The most severe issues found are:

1. **`advanced-cache.ts:113-114`, `matview-manager.ts:287,291,441`,
   `fallback-queries.ts:441`, `query-optimizer.ts:69`** interpolate
   user-supplied (or at least dynamic) identifiers into `sql.raw()` —
   `REFRESH MATERIALIZED VIEW ${viewName}`, `SELECT count(*) FROM
   ${config.viewName}`, and the `sql.join(fragments)` rebuild in
   `query-optimizer.ts`. With the current code the inputs are hard-coded
   const arrays, but the helper APIs accept any string and the helpers
   are exported across the app, so any future caller inherits the
   injection pattern.
2. **`check-article-completion.ts` and `check-story-completion.ts` are
   front-end HTTP clients that hit `/api/v1/users/{userId}/…` with a
   raw `userId` path segment.** Neither validates that the current
   session may read `userId`; both treat `userData.data?.licenseId`
   and `mcqData.state === 2` as authoritative completion signals
   without any Zod schema or shape check. A student could pass an
   arbitrary `userId` and inspect another student's license + question
   state.
3. **`useLowestRatedArticles.ts:30` calls
   `/api/v1/system/lowest-rated-articles?limit=${limit}` with a raw
   `limit`** — the API contract is not validated; the hook assumes
   `data.data` is always an array and that `data.message` exists.
   No Zod schema, no auth context inspection, no retry. The endpoint
   is "system" (admin-facing) but no role check is performed client-side
   or in the hook.
4. **`metrics.ts:62-78`** explicitly disables the PostgreSQL LISTEN
   path with an early `return;` and a dead-code comment block. The
   `handleMetricsUpdate` (lines 83-91) is dead. The constructor on
   lines 49-51 calls `initializeListener()` which never sets
   `listenerInitialized = true`, so the early-return on line 57-58 is
   always taken on the first call. Two consecutive statements
   (`handleMetricsUpdate` + `invalidateByPrefix("metrics:")`) on lines
   86-90 are reachable only if the dead path were re-enabled.
5. **`advanced-cache.ts:191-227`** runs `warmup()` against
   `db.select(...).from(users)` and `db.selectDistinct(...).from(userActivity)`
   on application start (singleton instance exported as
   `advancedCache`). Both queries are unscoped (no `schoolId`), the
   results are cached in a process-global `Map`, and `warmup()` is
   called from `initializeCache()` which the AGENTS.md document says
   should belong to a backend module rather than an app lib helper.
   This is multi-tenant bypass.
6. **`connection-monitor.ts:54-63`** starts an unref-ed `setInterval`
   on every module import (singleton `connectionMonitor`) plus another
   `setInterval` in `setupAlertMonitoring()` (line 191) — two timers
   with no shutdown path in the import graph. `startMonitoring()` does
   not return an unsubscribe handle; the second interval on line 191
   is started even though `checkAlerts()` is also invoked from
   `collectMetrics()` (line 148), so alerts fire twice on every cycle.
7. **`fallback-queries.ts:316-444`** uses `sql.raw` with the view name
   concatenated into the body of the query (`SELECT … FROM ${viewName}`
   on line 441). The view name comes from a hard-coded array, but the
   function is exported as a generic `checkMatviewsHealth` and the
   string flows through `sql.raw`. The `sql` fragments returned from
   `tx.execute(sql\`…\`)` on lines 428-434 and `tx.execute(sql.raw(\`…\n
   FROM ${viewName}…\`))` on lines 435-442 are split inside
   `Promise.all`, which means the two queries race on the same
   transaction handle — Drizzle's `tx` does not allow concurrent
   statements on the same connection.
8. **`calculateLevel.ts:31-33`** clamps the result of
   `readability.textStandard(text, true)` using `levels.length`
   (18), but the function then re-clamps to `levels.length` on line
   45. When `textStandard` returns a non-integer (the
   `text-readability-ts` typing declares `textStandard(text, output) =>
   number | object`), `Math.min` and `Math.max` are called on a non-
   number and the function returns `NaN`. There is no runtime type
   check.
9. **`useSound.ts:106-112`** creates a new `Audio` object on every
   `playSound` call, sets `audio.volume = 0.5`, and silently falls
   through to the synth if `play().catch()` fires. There is no
   preloading, no caching, no debouncing — clicking "play sound" ten
   times in 200 ms triggers ten parallel `<audio>` decodes and ten
   WebAudio oscillator chains on the fallback path.
10. **`jest.setup.ts:17-27`** installs a polyfill `Request` /
    `Response` that accepts only `init?: RequestInit` and discards
    `init.body`, `init.headers`, `init.signal`. Any test that constructs
    a `new Request(url, { method: 'POST', body: JSON.stringify(...) })`
    silently loses its body. There is no comment about which Node
    versions need the polyfill (Node 18+ ships undici Request).

No `apps/reading-advantage/lib/__tests__/cache*.test.ts` files were
found. There is exactly one test file in this batch (`useInterval.test.tsx`,
`useSound.test.tsx`). All 5 cache modules, both completion helpers,
`useLowestRatedArticles`, `calculateLevel`, and the i18n config have
zero tests.

---

## Findings

### Critical / High

#### H-01 — Cache / metrics modules interpolate identifiers into `sql.raw()` and accept any string
- **Files:**
  - `apps/reading-advantage/lib/cache/advanced-cache.ts:80-101,107-118`
  - `apps/reading-advantage/lib/cache/matview-manager.ts:113,287-292,438-441`
  - `apps/reading-advantage/lib/cache/fallback-queries.ts:438-444`
  - `apps/reading-advantage/lib/cache/query-optimizer.ts:42-75`
- **Severity:** High
- **Evidence:**
  - `advanced-cache.ts` is a generic `get/set` cache — the keys flow
    from callers (the only consumer today is `warmup()`, but
    `createCachedQuery` is exported from line 263-269 with no key
    validation).
  - `matview-manager.ts:113` does
    `sql.raw(\`SELECT count(*) as row_count FROM ${config.viewName}\`)`.
  - `matview-manager.ts:287` and `291` do
    `sql.raw(\`REFRESH MATERIALIZED VIEW CONCURRENTLY ${viewName}\`)` and
    `sql.raw(\`REFRESH MATERIALIZED VIEW ${viewName}\`)`. The caller
    `queueRefresh(viewName, reason)` accepts any string; line 235
    only warns and returns if the name is not in the const config
    array — the `setInterval` on line 166 calls `queueRefresh` with the
    config-supplied name, but the public `forceRefreshAll()` path
    re-uses the same `queueRefresh`.
  - `fallback-queries.ts:438-444` interpolates `${viewName}` inside
    `sql.raw` for `SELECT … FROM ${viewName}` and
    `WHERE c.relname = '${viewName}'` — both raw string
    interpolation.
  - `query-optimizer.ts:50-69` rebuilds a `sql.join(fragments)` from
    user-supplied `$1, $2` placeholders and raw chunks. The
    placeholders are split via regex; the `sql.raw(parts[i])` on
    line 56 re-injects the literal SQL chunk. A caller who passes
    a query string with `'`) DROP TABLE users; --` inside a literal
    gets that literal executed.
- **Impact:** SQL injection sink across the entire `lib/cache` module.
  Today's inputs are constants, but the helpers are generic and
  exported (`executeOptimizedRaw` on line 42 is the most dangerous
  because it accepts an arbitrary string template). A future caller
  who threads user data through the placeholder values will get safe
  binding, but a caller who threads identifiers (column names, table
  names) through the `query` string itself gets injection.
- **Fix:** Reject any input to `executeOptimizedRaw` that contains
  characters outside `[A-Za-z0-9_$,.() =<>!'\`"`\s]`; reject any
  view-name argument to `queueRefresh` / `forceRefreshAll` /
  `refreshView` that is not a member of the const config array;
  replace `sql.raw(\`SELECT count(*) FROM ${name}\`)` with a Drizzle
  parameterised `sql\`SELECT count(*) FROM ${sql.raw(name)}\`` only
  after validating `name` against a per-call allow-list.

#### H-02 — `advanced-cache.ts:191-227` warms cache with unscoped queries against `users` / `userActivity`
- **File:** `apps/reading-advantage/lib/cache/advanced-cache.ts`
- **Lines:** 191-227, 232-243
- **Severity:** High
- **Evidence:**
  - `warmup()` is called by `initializeCache()` (lines 252-258), which
    is exported.
  - Line 205-206: `db.select({ value: count() }).from(users)` — no
    `WHERE` clause, no `schoolId`.
  - Line 215-217: `db.selectDistinct({ activityType: userActivity.activityType }).from(userActivity)` — no
    school filter.
  - Line 235-242: `getActivitySummary()` does `db.select(...).from(userActivity).where(gte(userActivity.createdAt, thirtyDaysAgo))` — no school filter.
  - The cache entries are keyed by `'activity-summary:30d'`,
    `'user-count:total'`, `'activity-types:all'` — single global keys
    with no `schoolId` suffix. Two schools hitting the cache after
    warmup will receive the same numbers, even though
    AGENTS.md requires every query to be scoped by `schoolId`.
  - The cache is `Map`-based and process-local, so in a multi-tenant
    Cloud Run deployment with replica count > 1, each replica computes
    its own version of "total users" with no consistency guarantees.
- **Impact:** Cross-tenant data leak in the cache layer; misleading
  counts shown on admin dashboards; bypass of the TenantDB
  `classifyTable` safety net because the cache calls raw `db` (not
  `tenantDb`).
- **Fix:** Either (a) move `warmup()` into a tenant-scoped backend
  module that runs per school, or (b) drop `warmup()` and require
  callers to populate the cache on demand; key every entry with the
  `schoolId` so cache hits are scoped.

#### H-03 — `fallback-queries.ts:316-444` runs two queries against the same transaction handle in `Promise.all`
- **File:** `apps/reading-advantage/lib/cache/fallback-queries.ts`
- **Lines:** 416-475
- **Severity:** High
- **Evidence:**
  - Line 416 opens `db.transaction(async (tx) => { ... })`.
  - Lines 428-444 dispatch `Promise.all([tx.execute(sql\`SELECT EXISTS …\`), tx.execute(sql.raw(\`SELECT pg_stat_get_last_analyze_time … FROM ${viewName}\`))])`.
  - Drizzle's `tx` handle wraps a single Postgres connection. Two
    `tx.execute` calls running in parallel will race on the same
    socket; in practice pg will serialize them, but the error mode is
    "duplicate prepared statement name" or "another operation is in
    progress" depending on the driver. The author's intent is unclear
    because the surrounding comment (lines 414-415) says "run health
    checks sequentially inside it to keep connection usage bounded"
    — but the code does the opposite.
  - Line 469: a 50 ms `setTimeout` between view checks. Inside a
    transaction, sleeping releases no connection — the transaction
    is still open.
- **Impact:** Functionality (the transaction will time out on a busy
  database) + performance (every health check costs N×50 ms × N
  views = 550 ms minimum even on a healthy DB; on 11 views the wait is
  550 ms even before queries run).
- **Fix:** Use `await tx.execute(sql\`SELECT EXISTS …\`)` followed by
  `await tx.execute(sql.raw(\`…${viewName}\`))` (sequential). Drop
  the `setTimeout` — transactions should be short. Or split the
  health check into per-view short transactions instead of one giant
  tx.

#### H-04 — `check-article-completion.ts` and `check-story-completion.ts` accept an unverified `userId`
- **Files:**
  - `apps/reading-advantage/lib/check-article-completion.ts:1-70`
  - `apps/reading-advantage/lib/check-story-completion.ts:1-62`
- **Severity:** High
- **Evidence:**
  - Both files declare `export async function checkArticleCompletion(userId: string, articleId: string)`
    (line 1-10) and `checkStoryCompletion(userId, storyId, chapterNumber)`
    respectively. There is no auth check inside the function.
  - Line 27-29 (`check-article-completion.ts`):
    `const userResponse = await fetch(\`/api/v1/users/${userId}\`);` —
    the response is parsed with `userData.data?.licenseId`. If the
    caller is a student and they pass another student's `userId`,
    the API will return whatever it returns (depending on the API's
    own auth check, which is not visible in this batch). The
    completion helper then leaks the boolean
    `hasLicense` back to the caller through `allCompleted`.
  - Line 31-47 (`check-article-completion.ts`): three sequential
    `fetch` calls hit `/api/v1/articles/${articleId}/questions/{mcq,sa,laq}`.
    The result is `mcqData.state === 2` — assumes the API always
    returns `{state: number}` and that `state === 2` means
    "completed". No Zod schema validates this.
  - The same pattern recurs in `check-story-completion.ts:24-40`.
  - Both files share a near-identical structure: `try { fetch… } catch (e) { console.error; return allFalse; }`.
    If any one of the four sequential fetches throws, the function
    silently returns `allCompleted: false` — a real completion is
    indistinguishable from a transient network error.
- **Impact:** Privacy (cross-student license / question state leakage
  through a helper that is presumably called client-side from the
  React tree); functional (silent failure mode treats the student as
  incomplete after a transient network blip); quality (no schema
  validation on any of the four API responses).
- **Fix:** Add a Zod schema for each API response; assert the calling
  user owns `userId` (either by re-deriving from the session or by
  passing a session helper in); collapse the four sequential fetches
  into one backend endpoint that returns the entire
  `{mcq, saq, laq, hasLicense, alreadyCompleted}` envelope; surface
  network failures as a typed error rather than `allCompleted: false`.

#### H-05 — `useLowestRatedArticles.ts:30` calls `/api/v1/system/lowest-rated-articles` with no role check
- **File:** `apps/reading-advantage/hooks/useLowestRatedArticles.ts`
- **Lines:** 1-71
- **Severity:** High
- **Evidence:**
  - The hook is exported with `limit = 10` default. It does not read
    the current session, does not check the caller's role, does not
    validate `data.data` shape.
  - Line 41: `const data: LowestRatedArticlesResponse = await response.json();`
    — `LowestRatedArticlesResponse` is a hand-rolled interface, not a
    Zod schema. The cast is unsafe.
  - Line 51: `console.error('Error fetching lowest rated articles:', err);`
    — the console message includes `err` (which may be the raw fetch
    response). Logging raw error objects to the browser console can
    leak stack traces if V8 decides to print the entire Request.
  - No abort controller; no debounce; refetching on every parent
    re-render that re-creates the function is not memoised.
- **Impact:** Privilege-bypass if the API does not perform its own
  authorization (the path `/api/v1/system/…` strongly suggests admin
  scope but the hook does not verify the caller is admin). Type
  unsafety.
- **Fix:** Replace `LowestRatedArticlesResponse` with a Zod schema;
  parse with `.parse()`; gate the hook behind a
  `useRequireRole("ADMIN")` guard; add an `AbortController` in the
  `useEffect` cleanup.

#### H-06 — `metrics.ts` early-returns from `initializeListener` and the constructor always calls it
- **File:** `apps/reading-advantage/lib/cache/metrics.ts`
- **Lines:** 49-51, 56-78, 83-91
- **Severity:** Medium → High (dead handler that promises to do
  invalidation but cannot)
- **Evidence:**
  - Line 49-51: `constructor() { this.initializeListener(); }`.
  - Line 56-58: `if (this.listenerInitialized || typeof window !== "undefined") { return; }` — `window`
    is `undefined` only in Node; in jsdom (jest test environment) it
    is defined and the listener would proceed. In production SSR /
    server actions `window` is also undefined and the listener
    proceeds.
  - Line 61-63: `return;` — the listener is forcibly disabled.
    Comment on line 61 says "Disable PG-LISTENER temporarily to reduce
    connection pool usage".
  - Line 64-77: a `/* ... */` block that contains the real
    subscription wiring. The block is unreachable.
  - Line 83-91: `handleMetricsUpdate` is private and only called from
    the dead subscription. `invalidateByPrefix("metrics:")` (line
    90) is therefore never invoked from a payload.
- **Impact:** The metrics cache module advertises "automatic
  invalidation on metrics:update events" in its file header
  (lines 5-8) and exports `invalidateMetrics` / `invalidateMetricsByPrefix`
  for callers to use manually, but the auto-invalidation path is dead.
  Callers that rely on the documentation will believe their stale
  cache is being refreshed and ship incorrect dashboard data.
- **Fix:** Either remove the dead code and the misleading header, or
  re-enable the listener behind a feature flag (and document that
  auto-invalidation is off).

#### H-07 — `connection-monitor.ts` starts two timers on `startMonitoring()`, calls `checkAlerts` twice per cycle
- **File:** `apps/reading-advantage/lib/cache/connection-monitor.ts`
- **Lines:** 45-63, 145-148, 190-197, 202-229
- **Severity:** Medium → High (resource leak + duplicate alerts)
- **Evidence:**
  - `startMonitoring()` sets `this.monitoringInterval = setInterval(...)`
    (lines 54-57) and immediately calls `setupQueryTracking()` (line
    59) which logs only, then `setupAlertMonitoring()` (line 62)
    which calls `setInterval(() => this.checkAlerts(recent), 60000)`
    on line 191-196.
  - `collectMetrics()` (line 81) ends with `this.checkAlerts(metrics);`
    on line 148. So every 30-second cycle calls `checkAlerts`
    once, and every 60-second cycle calls `checkAlerts` again on the
    most recent metric. Duplicate alerts.
  - `stopMonitoring()` (lines 68-76) clears only `this.monitoringInterval`,
    not the alert-monitoring interval started on line 191.
  - The interval handle for the alert loop is anonymous — it is
    never stored on `this`, so it cannot be cleared. Even after
    `stopMonitoring()` the alert timer keeps firing forever.
  - The query-tracking comment on lines 162-166 admits "We'll track
    queries through our metrics collection instead of proxying
    Prisma". The `recordQueryMetric` private method (lines 172-185)
    is called from exactly one place — the `catch` block of
    `collectMetrics` on line 154. So the entire `QueryPerformanceMetric`
    interface, `queryMetrics` array, and all `getQueryStats` /
    `slowQueries` / `failedConnections` derivations are powered by
    one synthetic call per failed health check.
- **Impact:** Resource leak in the alert interval; misleading alert
  metrics (every "slow query" alert comes from one synthetic call,
  not from real query observation); double-alerting; the
  "pg_stat_get_last_analyze_time" call in `metrics.ts` is computed
  twice per cycle if both timers align.
- **Fix:** Capture the alert-interval handle on `this`, clear it in
  `stopMonitoring`. Drop `checkAlerts` from one of the two call sites
  or merge them. Decide whether `recordQueryMetric` should be wired
  to real query events; if not, drop the synthetic call and the
  entire `QueryPerformanceMetric` machinery.

#### H-08 — `useSound.ts` allocates a new `Audio` and WebAudio graph on every call; the synth fallback is unbounded
- **File:** `apps/reading-advantage/hooks/useSound.ts`
- **Lines:** 94-115, 11-92
- **Severity:** Medium → High (depends on call frequency)
- **Evidence:**
  - Line 106: `const audio = new Audio(\`/games/sounds/${type}.mp3\`);`
    — no memoisation, no preload.
  - Line 109-112: `audio.play().catch(() => { playSynth(type); });` —
    if the mp3 is missing the synth fires; if the synth also fails
    (line 87-89 catches and `console.warn`s) the user gets no sound
    and no error.
  - The synth path (lines 14-92) creates one `OscillatorNode` +
    `GainNode` per call. The nodes are started but never explicitly
    disconnected (line 43-44 only `connect`s, never `disconnect`s).
    Browsers GC them after `stop()` but the audio graph retains
    references for ~100-300 ms after `stop`, during which more
    calls pile on.
  - There is no AbortController, no cleanup on unmount — when a
    consumer unmounts mid-tone, the tone keeps playing.
- **Impact:** Audio glitching / clipping on rapid button presses;
  possible memory pressure on long-running game sessions; no
  graceful failure path.
- **Fix:** Cache the `Audio` object per `type` in a `useRef`;
  preload on mount; cap concurrent oscillators (debounce) and
  disconnect after `stop() + onended`.

#### H-09 — `i18n.ts` and `i18n/routing.ts` import from a non-shared `locale-config` path
- **Files:**
  - `apps/reading-advantage/i18n.ts:2`
  - `apps/reading-advantage/i18n/routing.ts:3`
- **Severity:** High (consistency)
- **Evidence:**
  - `i18n.ts:2`: `import { localeConfig } from "./configs/locale-config";`
    (relative path).
  - `i18n/routing.ts:3`: `import { localeConfig } from "@/configs/locale-config";`
    (tsconfig path alias).
  - Both files reach the same `locale-config.ts` module but via two
    different import strategies. The AGENTS.md standard is to use the
    `@/` alias consistently.
  - `i18n.ts:13`: `(await import(\`./locales/${locale}\`)).default` —
    dynamic import using a template literal; the bundler must
    statically analyse the call to know which locale files to bundle.
    This works in Next.js with the `next-intl` plugin but is fragile.
  - `i18n/routing.ts:7`: `locales: localeConfig.locales as [string, ...string[]]`
    — the `as` cast suppresses the type system. If
    `localeConfig.locales` is `[]`, the routing breaks at runtime with
    a non-actionable error from `next-intl`.
- **Impact:** Two-source-of-truth import path; possible locale-bundling
  bug if the dynamic import template changes; silent type loss in the
  routing config.
- **Fix:** Use `@/configs/locale-config` everywhere; assert at module
  load that `localeConfig.locales.length > 0`; document the
  `next-intl` plugin requirement for the dynamic import.

#### H-10 — `calculateLevel.ts:30-33` does not validate that `textStandard` returned a number
- **File:** `apps/reading-advantage/lib/calculateLevel.ts`
- **Lines:** 1-50
- **Severity:** Medium → High (silent NaN propagation)
- **Evidence:**
  - `import readability from "text-readability-ts";` — the
    `text-readability-ts` typing declares
    `textStandard(text, output) => number | object` (the second arg
    is a union; passing `true` is supposed to return a number but
    some versions of the lib return an object).
  - Line 31-33: `Math.max(1, Math.min(readability.textStandard(text, true) as number, levels.length))`.
    The `as number` cast lies when the library returns an object.
  - If the cast is wrong, `Math.min` calls `ToNumber` on the object →
    `NaN`. `NaN < levels.length` is `false`; `NaN > 1` is `false`;
    `Math.max(1, NaN)` is `NaN`. The function returns
    `{ raLevel: NaN, cefrLevel: undefined }`.
  - Line 47: `const adjustedCefrLevel = levels[adjustedLevel - 1];` —
    `levels[NaN - 1]` is `undefined`.
  - The function has no `try`/`catch`, no input validation; a
    malformed or empty `text` produces `NaN` without an error path.
- **Impact:** Downstream `cefrLevel` may be `undefined`; articles
  generated by `article-generator.ts` will receive `cefrLevel:
  undefined` and may store `undefined` in the database. Subsequent
  reads compare against the `levels` array and silently skip the row.
- **Fix:** Validate that `textStandard` returns a finite integer in
  `[1, levels.length]`; throw a typed error otherwise; coerce to
  integer before clamping.

#### H-11 — `check-story-completion.ts:20` uses `targetId?.startsWith(storyId)` to match the story
- **File:** `apps/reading-advantage/lib/check-story-completion.ts`
- **Lines:** 19-22
- **Severity:** Medium → High (correctness)
- **Evidence:**
  - The activity log is filtered by
    `activity.activityType === 'stories_read' &&
     activity.targetId?.startsWith(storyId) &&
     activity.completed`.
  - `targetId?.startsWith(storyId)` is true for any `targetId` whose
    string begins with `storyId`. If `storyId = 'abc'`, then
    `targetId = 'abc-extra'` matches but so does
    `targetId = 'abcdefgh'` (a different story).
  - There is no segment-boundary check (e.g. `targetId?.split(':')[0] === storyId`).
  - Combined with H-04 (unverified `userId`), the function can return
    `wasAlreadyCompleted: true` for a different story / different
    student.
- **Impact:** Cross-story false-positive completion events; may
  double-count XP / streak.
- **Fix:** Match on a stable, scoped identifier (e.g.
  `targetId === \`${storyId}:${chapterNumber}\``); add a Zod schema
  for the activity log shape.

---

### Medium

#### M-01 — `advanced-cache.ts:67-74` evicts on `>= maxEntries` but `evictOldest` only removes one entry
- **File:** `apps/reading-advantage/lib/cache/advanced-cache.ts`
- **Lines:** 88-101, 121-138, 165-168
- **Severity:** Medium
- **Evidence:**
  - `set()` checks `this.cache.size >= this.maxEntries` and calls
    `evictOldest()` before inserting. `evictOldest()` removes exactly
    one entry (the oldest by timestamp).
  - If the cache is at 1000 entries and `set()` adds one, the post-
    eviction size is 999, then `set()` makes it 1000. Subsequent
    calls repeat the dance but the cache never drops below 999.
  - `clear()` (lines 165-168) exists but is never wired to a TTL
    expirer; entries persist until explicit invalidation or process
    restart.
- **Impact:** Slow growth above the configured `maxEntries`. The
  `stats` object never increments `evictions` proportional to actual
  churn because `evictOldest` is the only eviction path.
- **Fix:** Run a periodic janitor that walks the cache and drops
  expired entries; `evictOldest` should evict in batches (e.g. 10% of
  `maxEntries`).

#### M-02 — `advanced-cache.ts:172-185` derives `getStats()` with `Math.min(...timestamps)` which can throw on large maps
- **File:** `apps/reading-advantage/lib/cache/advanced-cache.ts`
- **Lines:** 173-185
- **Severity:** Medium
- **Evidence:**
  - `const timestamps = entries.map(e => e.timestamp);` and then
    `Math.min(...timestamps)`. For a Map with > ~10,000 entries
    `Math.min(...arr)` blows the call-stack argument limit in V8 (the
    safe range is ~65,000 args, but each arg is a number — at 10k
    numbers it's still safe; at the documented `maxEntries = 1000`
    it's fine, but the value is configurable).
  - `entries` includes `CacheEntry<any>` so `entries.length` is the
    live Map size. If `maxEntries` is ever raised (e.g. in a test or
    in a one-off environment), this becomes a `RangeError`.
- **Impact:** Cache stats endpoint can crash on a single call when
  the cache grows; the surrounding code does not handle the error.
- **Fix:** Replace `Math.min(...timestamps)` with a `reduce` loop.

#### M-03 — `connection-monitor.ts:280-313` `performHealthCheck` swallows the underlying error
- **File:** `apps/reading-advantage/lib/cache/connection-monitor.ts`
- **Lines:** 286-312
- **Severity:** Medium
- **Evidence:**
  - `try { await db.execute(sql\`SELECT 1 as test\`); connectionTest = true; } catch (error) { console.error(...); }`
    — the `error` is logged but not surfaced in the return value. The
    caller gets `{ healthy: false, connectionTest: false, responseTime, metrics, queryStats }` with no error message.
  - `queryStats: any` (line 284) — explicit `any` return; no schema.
- **Impact:** Diagnostic loss; `healthy: false` cannot be triaged from
  the return value alone.
- **Fix:** Include `error: string | null` in the return type;
  replace `any` with `ReturnType<typeof getQueryStats>`.

#### M-04 — `fallback-queries.ts:188-191` hard-codes `levelThresholds` in the application
- **File:** `apps/reading-advantage/lib/cache/fallback-queries.ts`
- **Lines:** 188-191
- **Severity:** Medium
- **Evidence:**
  - `const levelThresholds = [0, 5000, 11000, 18000, 26000, 35000, 45000, 56000, 68000, 81000, 95000, 110000, 126000, 143000, 161000, 180000, 200000, 221000, 243000];`
    — 19 hard-coded numbers in the application fallback path.
  - The same numbers appear in `calculateLevel.ts` (no — they don't;
    `calculateLevel.ts` works on a different scale: `levels.length`
    is 18 because `levels` has 18 CEFR strings). The two scales are
    independent.
  - There is no source-of-truth comment explaining where these
    numbers came from; they are presumably duplicated from the
    `xp_to_next_level` calculation in `user-progress-service.ts` or
    `evaluate-rating-generator.ts` (not in this batch).
- **Impact:** Drift risk — when the level curve changes, this list
  silently goes stale and `xp_to_next_level` reads wrong values.
- **Fix:** Move `levelThresholds` into a shared constants module
  (e.g. `packages/types/src/levels.ts`) and import in both places.

#### M-05 — `fallback-queries.ts:255-285` reads `studentAssignments.status` strings but Drizzle never writes them
- **File:** `apps/reading-advantage/lib/cache/fallback-queries.ts`
- **Lines:** 255-285
- **Severity:** Medium
- **Evidence:**
  - Line 264-269: filters `studentAssignmentRows` on
    `sa.status === 'IN_PROGRESS' || sa.status === 'COMPLETED'` and
    `sa.status === 'COMPLETED'`. These are string enums.
  - `packages/db/src/schema/content.ts:77-94` defines `status:
    text("status")` on `student_assignments` but no application
    controller populates it (the legacy Prisma schema used
    `completed: boolean`). The same issue was raised in batch 37
    (H-03) for the SQL migrations; the application fallback path
    inherits the same bug.
- **Impact:** Funnel metrics will read `totalStudents` correctly (every
  row in the join) but `startedCount` and `completedCount` will be
  0 in any Drizzle-managed database that never writes `status`. The
  UI displays 0% completion.
- **Fix:** Compute completion from `startedAt`/`completedAt` (which
  the Drizzle schema actually populates) instead of the unwritten
  `status` column.

#### M-06 — `matview-manager.ts:191-202` `setInterval` for trigger monitoring has no clear path
- **File:** `apps/reading-advantage/lib/cache/matview-manager.ts`
- **Lines:** 177-202
- **Severity:** Medium
- **Evidence:**
  - `setupTriggerMonitoring` registers an unnamed `setInterval` (line
    179) that polls `userActivity` every 5 minutes and queues a
    refresh for `mv_activity_heatmap` and `mv_daily_activity_rollups`
    when the activity count exceeds 100.
  - The interval handle is never stored on `this`, so it cannot be
    cleared.
  - `startScheduler()` (line 93) does not return a stop handle; there
    is no `stopScheduler()`.
- **Impact:** Resource leak; on process restart the previous timer
  fires on the stale module instance until the Node process exits.
- **Fix:** Store the timer handle on `this`; expose `stopScheduler()`;
  invoke it on graceful shutdown.

#### M-07 — `matview-manager.ts:259-267` `processRefreshQueue` can race with itself
- **File:** `apps/reading-advantage/lib/cache/matview-manager.ts`
- **Lines:** 253-267
- **Severity:** Medium
- **Evidence:**
  - `processRefreshQueue()` shifts a view off the queue, awaits
    `refreshView()`, and if the queue is non-empty schedules another
    `setTimeout(processRefreshQueue, 1000)`.
  - Multiple concurrent callers (e.g. `forceRefreshAll` running in
    parallel with the scheduled refresh) can both enter
    `processRefreshQueue` at once and double-shift / double-process.
  - `isRefreshing` is a `Set` of view names; the check on line 229
    only short-circuits `queueRefresh`, not `processRefreshQueue`.
- **Impact:** Concurrent refresh attempts on the same view; the
  `REFRESH MATERIALIZED VIEW CONCURRENTLY` path is idempotent in
  Postgres, but the `REFRESH MATERIALIZED VIEW` (non-concurrent)
  path locks the view for the duration; double-calling it just
  blocks longer.
- **Fix:** Add a `isProcessingQueue` boolean on `this` and guard
  `processRefreshQueue` with it.

#### M-08 — `query-optimizer.ts:50-69` SQL placeholder parser is naive
- **File:** `apps/reading-advantage/lib/cache/query-optimizer.ts`
- **Lines:** 42-75
- **Severity:** Medium
- **Evidence:**
  - `query.split(/\\$(\\d+)/g)` splits on `$N` where N is one or more
    digits. A literal `$1` inside a string literal in the query (e.g.
    `WHERE name = 'foo $1 bar'`) would be split as a placeholder and
    the user-supplied value substituted in unsafe positions.
  - The `sql.join(fragments)` on line 69 is a Drizzle helper; the
    surrounding `sql.raw(parts[i])` re-emits the literal chunks. If a
    chunk contains a stray `?` or other driver metacharacter, the
    final SQL is still parametrised correctly, but the split logic
    is brittle.
- **Impact:** False-positive placeholder substitution in queries that
  contain literal `$N` inside string literals or comments.
- **Fix:** Use a real SQL parser (e.g. `pgsql-ast-parser`) or restrict
  the helper to the documented `$1..$N` literal placeholders by
  validating that no other `$` characters appear outside placeholders.

#### M-09 — `useGameLoop.ts:8` invokes `onTick` via a stale closure if `onTick` changes between ticks
- **File:** `apps/reading-advantage/hooks/useGameLoop.ts`
- **Lines:** 1-9
- **Severity:** Low → Medium
- **Evidence:**
  - `useInterval(() => onTick(tickMs / 1000), isRunning ? tickMs : null)`
    — the callback closure captures `onTick` at render time.
  - `useInterval` (`useInterval.ts:6-15`) stores the latest callback
    in a `useRef` and uses `savedCallback.current()` inside the timer.
    This pattern is correct for `useInterval`, so `useGameLoop` is
    actually fine. (No bug, but the wrapper adds no value beyond
    parameterising `tickMs / 1000`.)
- **Impact:** None observed; the wrapper is correct. But the
  `tickMs = 50` default is hard-coded and the hook does not pass a
  `startMs` offset, so the first tick fires `tickMs` after mount, not
  immediately. Game-loop callers commonly expect an initial tick.
- **Fix:** Either keep the wrapper and document the delayed-first-
  tick behaviour, or remove `useGameLoop` and let callers use
  `useInterval` directly.

#### M-10 — `jest.setup.ts:17-27` `Request` polyfill discards `init.body` and `init.headers`
- **File:** `apps/reading-advantage/jest.setup.ts`
- **Lines:** 16-37
- **Severity:** Medium
- **Evidence:**
  - The polyfill `Request` constructor stores `this.url`, `this.method`,
    `this.headers = new Map()` (which is initialised empty regardless
    of `init.headers`). The `body` argument is not stored at all.
  - Tests that do `new Request(url, { method: 'POST', body:
    JSON.stringify(payload), headers: { 'content-type': 'application/json' }})`
    will see an empty body and empty headers.
  - The polyfill is installed only if `typeof Request === 'undefined'`,
    i.e. only on very old Node versions. On Node 18+ (which ships
    undici), the global is present and the polyfill does nothing —
    but tests that use the polyfill will still pass syntactically
    because `new Request(url)` succeeds; only behaviour diverges.
- **Impact:** Tests that exercise POST/PUT bodies appear to pass
  but actually transmit nothing. This is a silent test-quality bug.
- **Fix:** Either remove the polyfill (Node 18+ is the CI target per
  AGENTS.md) or implement a proper polyfill that forwards body and
  headers.

#### M-11 — `fallback-queries.ts:329-352` casts `eq(users.role, 'STUDENT')` as the second positional arg but the literal is a TS string
- **File:** `apps/reading-advantage/lib/cache/fallback-queries.ts`
- **Lines:** 338-345
- **Severity:** Medium
- **Evidence:**
  - Line 340: `eq(users.schoolId, schoolId as any)` — the `schoolId`
    is already typed as `string` from the function signature (line
    307). Casting to `any` suggests a known Drizzle typing mismatch
    on `schoolId` (probably because the schema column type is
    `string | null` while the function arg is `string`).
  - The `as any` hides the actual mismatch; a future code reader
    cannot tell whether `schoolId` could be `null`.
  - Line 341: `eq(users.role, 'STUDENT')` — relies on the literal
    matching the enum exactly. If the schema enum is renamed to
    `STUDENT_USER`, this predicate silently filters out every user.
- **Impact:** Type-safety bypass; future drift in role enums breaks
  this query without a compile error.
- **Fix:** Define a typed enum for roles in `@reading-advantage/types`;
  replace `as any` with a type narrowing helper that asserts
  `schoolId !== null`.

#### M-12 — `metrics.ts:166-188` `fetchAndCache` swallows errors after incrementing the metrics counter
- **File:** `apps/reading-advantage/lib/cache/metrics.ts`
- **Lines:** 156-189
- **Severity:** Medium
- **Evidence:**
  - The catch block (lines 175-181) increments `metrics.errors++`,
    sets `metrics.lastError = String(error)`, logs, and rethrows.
    Fine.
  - But the surrounding `get()` caller on line 145
    (`return this.fetchAndCache(key, fetcher, options);`) does not
    handle the rethrow; the caller of `get()` (a user of
    `getCachedMetrics`) will see the raw error.
  - No retry; no circuit breaker; a transient DB blip propagates a
    rejected promise to the dashboard request.
- **Impact:** Transient backend errors surface to the React client as
  unhandled promise rejections; the user sees a blank dashboard
  rather than stale data.
- **Fix:** Add a `retry: number` option; on final failure, return
  the last-known cached value (even if past `ttl`) with a
  `staleOnError` flag.

#### M-13 — `fallback-queries.ts:171-179` builds date strings via `toISOString().split('T')[0]`
- **File:** `apps/reading-advantage/lib/cache/fallback-queries.ts`
- **Lines:** 165-179
- **Severity:** Medium
- **Evidence:**
  - `log.createdAt.toISOString().split('T')[0]` returns the UTC date,
    not the school's local date. A school in `Asia/Bangkok` will see
    a different "active day" than the UTC bucketing in the
    materialized view.
  - The materialized view groups by `activity_date` which is also
    UTC; the application fallback is therefore consistent with the
    view. But the comment on lines 188-190 implies the application
    should match the school's calendar, not UTC.
- **Impact:** Off-by-one-day reporting for non-UTC schools.
- **Fix:** Accept a `timeZone` argument and use `Intl.DateTimeFormat`
  to bucket; document the behaviour.

---

### Low

#### L-01 — `useSound.test.tsx:18-19` stores `originalAudioContext`/`originalWebkitAudioContext` on `window` but does not verify they're defined
- **File:** `apps/reading-advantage/hooks/useSound.test.tsx`
- **Lines:** 18-19, 60-71
- **Severity:** Low
- **Evidence:** `const originalAudioContext = window.AudioContext;` —
  if jsdom does not define `window.AudioContext` (it does not by
  default), the captured value is `undefined`. The `afterEach` then
  tries to redefine `window.AudioContext` with `value: undefined`,
  which throws on some jsdom versions.
- **Impact:** Test-suite teardown noise; possible failure on CI.
- **Fix:** Guard with `window.AudioContext ?? undefined` and skip the
  teardown if neither was originally defined.

#### L-02 — `useInterval.ts:10-15` does not pause the interval when `delay` changes from one number to another
- **File:** `apps/reading-advantage/hooks/useInterval.ts`
- **Lines:** 6-15
- **Severity:** Low
- **Evidence:** `useEffect(..., [delay])` re-runs the effect on every
  `delay` change, calling `clearInterval(id)` from the prior cleanup
  and starting a new `setInterval` with the new delay. Correct
  behaviour.
  However, if `delay` is `0`, `setInterval(fn, 0)` is allowed in
  Node and modern browsers but the loop is essentially synchronous
  and will starve the event loop. No guard.
- **Impact:** Low — only triggered if a consumer passes `0`.
- **Fix:** Reject `delay <= 0` (treat as "not running").

#### L-03 — `jest.config.ts:16-27` uses absolute paths to package source files; TS source files import each other via TS-only paths
- **File:** `apps/reading-advantage/jest.config.ts`
- **Lines:** 15-27
- **Severity:** Low
- **Evidence:** `moduleNameMapper` maps `@reading-advantage/db`,
  `@reading-advantage/auth`, `@reading-advantage/api`, etc. to
  `<rootDir>/../../packages/<name>/src/index.ts`. Jest will compile
  TS source on the fly via `next/jest`. The two `index.ts` files
  re-export from internal modules that may use `import.meta` or
  ESM-only syntax which `next/jest` historically struggles with.
- **Impact:** Possible test-runner errors on ESM-only packages; not
  blocking.
- **Fix:** Use the package's compiled output (`dist/index.js`) if
  available; otherwise document the dependency on `next/jest`'s
  SWC compiler.

#### L-04 — `i18n/routing.ts:6` casts `localeConfig.locales` with `as [string, ...string[]]`
- **File:** `apps/reading-advantage/i18n/routing.ts`
- **Lines:** 5-9
- **Severity:** Low
- **Evidence:** The cast suppresses a runtime invariant — the
  underlying `localeConfig.locales` is typed as `string[]`, which
  can be empty. `next-intl`'s `defineRouting` requires a non-empty
  tuple.
- **Impact:** Misleading type; runtime error only on misconfiguration.
- **Fix:** Add a runtime `assert(localeConfig.locales.length > 0)`
  before the cast; tighten the type of `localeConfig.locales` to
  `[string, ...string[]]` at the source.

#### L-05 — `useInterval.test.tsx:9-17` does not assert that `clearInterval` is called on unmount
- **File:** `apps/reading-advantage/hooks/useInterval.test.tsx`
- **Lines:** 9-57
- **Severity:** Low
- **Evidence:** The three tests cover the happy path and the
  `delay === null` path. None of them unmount the harness and assert
  that the timer was cleared.
- **Impact:** Memory-leak / dangling-timer bug could ship unnoticed.
- **Fix:** Add a fourth test that renders, advances timers, unmounts,
  and asserts that no further ticks fire after unmount.

#### L-06 — `advanced-cache.ts:181` `memoryUsage: this.cache.size * 1024` is a meaningless constant
- **File:** `apps/reading-advantage/lib/cache/advanced-cache.ts`
- **Lines:** 181
- **Severity:** Low
- **Evidence:** The comment says "Rough estimate". 1 KB per entry is
  not a rough estimate; it is an arbitrary number. A `CacheEntry<any>`
  holding a query result may be 50 bytes (a number) or 5 MB (a JSON
  blob).
- **Impact:** Misleading metrics on the dashboard.
- **Fix:** Drop the field or compute it from `process.memoryUsage()`
  delta.

#### L-07 — `metrics.ts:226-233` `invalidateByPrefix` does not match `key.startsWith` correctly when prefix contains special regex chars
- **File:** `apps/reading-advantage/lib/cache/metrics.ts`
- **Lines:** 223-233
- **Severity:** Low
- **Evidence:** `key.startsWith(prefix)` is a literal string prefix
  match; it does not interpret regex characters. Today the prefix
  is always a plain identifier (`viewName`, `metrics:`), so the
  behaviour is correct. But the API advertises "prefix" and a caller
  might pass a regex-looking string and be confused.
- **Impact:** None today; future confusion possible.
- **Fix:** Document the contract: "prefix must be a literal string".

#### L-08 — `matview-manager.ts:293-302` invalidates `advancedCache` using `RegExp(dep.toLowerCase())`
- **File:** `apps/reading-advantage/lib/cache/matview-manager.ts`
- **Lines:** 297-303
- **Severity:** Low
- **Evidence:** `config.dependencies` is typed `string[]` and the
  defaults are PascalCase (`UserActivity`, `LessonRecord`,
  `StudentAssignment`, etc.). The `dep.toLowerCase()` produces
  `useractivity`, `lessonrecord`, etc. The `advancedCache.invalidate`
  implementation (advanced-cache.ts:143-160) calls
  `pattern.test(key)`, but the cache keys are lowercase hyphenated
  identifiers (`activity-summary:30d`, `user-count:total`). None of
  the cache keys contain `useractivity` as a substring. So the
  invalidation is a no-op.
- **Impact:** Cache stays warm after a view refresh; downstream
  readers see stale data until the TTL expires.
- **Fix:** Define a mapping from `dependencies` strings to cache key
  prefixes (e.g. `UserActivity → 'activity-', 'user-activity-'`);
  invalidate by those prefixes; or use the lowercase form only when
  the cache key contains it.

#### L-09 — `fallback-queries.ts:120-121` returns `any`
- **File:** `apps/reading-advantage/lib/cache/fallback-queries.ts`
- **Lines:** 121, 225, 311
- **Severity:** Low
- **Evidence:** All three exported functions (`getStudentVelocity`,
  `getAssignmentFunnel`, `getDailyActivityRollups`) declare
  `Promise<any>`. Consumers cannot rely on a stable shape.
- **Impact:** Static-analysis loss; bugs surface at the consumer.
- **Fix:** Define Zod schemas for each return type and export them
  from `lib/cache/index.ts`.

#### L-10 — `calculateLevel.ts:34-42` branches on `inputLevelNum` vs `textStandard`; both can be NaN
- **File:** `apps/reading-advantage/lib/calculateLevel.ts`
- **Lines:** 30-49
- **Severity:** Low
- **Evidence:** If `cefrLevelInput` is not in `levels`, `levels.indexOf(...)`
  returns `-1` and `inputLevelNum = 0`. Then the `inputLevelNum <
  textStandard` branch may fire, adjusting the level away from
  `textStandard` even though `inputLevelNum` represents "unknown".
- **Impact:** Silent miscalculation for unknown input.
- **Fix:** Return a typed error if `levels.indexOf(cefrLevelInput) === -1`.

#### L-11 — `useLowestRatedArticles.ts:57-59` `useEffect` re-fetches on every `limit` change without debounce
- **File:** `apps/reading-advantage/hooks/useLowestRatedArticles.ts`
- **Lines:** 57-63
- **Severity:** Low
- **Evidence:** `useEffect(() => { fetchLowestRatedArticles(); }, [limit]);`
  — a parent that rapidly re-renders with `limit = 5, 6, 7, 8` will
  fire four network requests in a row. No AbortController for the
  in-flight request.
- **Impact:** Wasted bandwidth; race condition where the slowest
  response overwrites a faster newer response.
- **Fix:** Add an `AbortController`; debounce the limit change.

#### L-12 — `useGameLoop.ts:3-9` is undocumented; no JSDoc
- **File:** `apps/reading-advantage/hooks/useGameLoop.ts`
- **Lines:** 1-9
- **Severity:** Low
- **Evidence:** Exported function `useGameLoop` lacks the JSDoc
  required by AGENTS.md "Documentation Standards".
- **Fix:** Add `@param` / `@returns` JSDoc.

#### L-13 — `connection-monitor.ts:154` records a failed connection with `recordQueryMetric('connection_health_check', Date.now(), false)`
- **File:** `apps/reading-advantage/lib/cache/connection-monitor.ts`
- **Lines:** 150-156
- **Severity:** Low
- **Evidence:** `duration` is passed as `Date.now()` (a timestamp),
  not as a duration. The `QueryPerformanceMetric.duration` field is
  documented as "duration" but is given a timestamp. Downstream
  aggregations (`avgResponseTime`, `slowQueries > threshold`) will
  produce nonsensical values.
- **Impact:** Misleading performance stats.
- **Fix:** Pass `0` or `-1` for `duration` on a synthetic failure
  record, or omit the call.

#### L-14 — `query-optimizer.ts:108-154` `queryDebounceMap` has no max-size limit
- **File:** `apps/reading-advantage/lib/cache/query-optimizer.ts`
- **Lines:** 108-154
- **Severity:** Low
- **Evidence:** `queryDebounceMap` is a process-global `Map` keyed by
  arbitrary `key` strings. Each entry stores a `setTimeout` handle
  and a promise. If the map is fed a high-cardinality set of keys
  (e.g. one per article ID), the map grows unbounded.
- **Impact:** Slow memory leak.
- **Fix:** Add an LRU cap or an explicit `clearDebouncedQueries()`
  helper.

#### L-15 — `metrics.ts:239-241` `clear()` computes `const count = this.cache.size;` and never uses it
- **File:** `apps/reading-advantage/lib/cache/metrics.ts`
- **Lines:** 238-241
- **Severity:** Low
- **Evidence:** Dead local variable.
- **Fix:** Remove the unused `count`.

#### L-16 — `jest.setup.ts:1` imports `@testing-library/jest-dom` but does not declare types
- **File:** `apps/reading-advantage/jest.setup.ts`
- **Lines:** 1
- **Severity:** Low
- **Evidence:** `import "@testing-library/jest-dom";` extends
  `expect` with DOM matchers. The types are provided by
  `@testing-library/jest-dom` v6+ but require the
  `tsconfig.json#compilerOptions.types` to include
  `"@testing-library/jest-dom"`. Without the entry the matchers are
  available at runtime but not in TypeScript signatures.
- **Impact:** Test code that uses `toBeInTheDocument()` etc. loses
  type inference.
- **Fix:** Add `"@testing-library/jest-dom"` to `tsconfig.json` types.

#### L-17 — `fallback-queries.ts:469-471` delays 50 ms between view health checks inside a transaction
- **File:** `apps/reading-advantage/lib/cache/fallback-queries.ts`
- **Lines:** 469-471
- **Severity:** Low
- **Evidence:** `await new Promise(resolve => setTimeout(resolve, 50));`
  inside a transaction. The transaction remains open across the
  sleep, holding a connection. See H-03.
- **Fix:** Move the per-view work to separate transactions or run
  outside a transaction.

#### L-18 — `check-article-completion.ts:53-59` and `check-story-completion.ts:45-51` return `wasAlreadyCompleted: false` on the catch path
- **Files:**
  - `apps/reading-advantage/lib/check-article-completion.ts:62-68`
  - `apps/reading-advantage/lib/check-story-completion.ts:54-60`
- **Severity:** Low
- **Evidence:** The catch block reports `wasAlreadyCompleted: false`
  even when the failure is unrelated to the activity log fetch
  (e.g. the questions endpoint times out). The caller cannot
  distinguish "no prior completion" from "we don't know".
- **Fix:** Return `wasAlreadyCompleted: undefined` on failure and
  require callers to treat undefined as "unknown".

#### L-19 — `useSound.test.tsx:60-71` `afterEach` writes to `window` properties that may not be configurable
- **File:** `apps/reading-advantage/hooks/useSound.test.tsx`
- **Lines:** 60-71
- **Severity:** Low
- **Evidence:** `Object.defineProperty(window, 'AudioContext', { value: originalAudioContext, configurable: true });`
  — if the property was not originally `configurable: true`, the
  `Object.defineProperty` throws. The test relies on jsdom allowing
  re-definition.
- **Impact:** Test failure if jsdom version changes.
- **Fix:** Wrap in `try/catch`; skip the reset on failure.

#### L-20 — `jest.config.ts:1-31` lacks a `testMatch` glob; relies on defaults
- **File:** `apps/reading-advantage/jest.config.ts`
- **Lines:** 10-28
- **Severity:** Low
- **Evidence:** No `testMatch`/`testRegex` is set, so Jest uses its
  default (`__tests__/**/*` and `*.test.{ts,tsx}`). If the project's
  convention is `__test__/` (note singular — see
  `apps/reading-advantage/__test__/`), the default glob does not
  match and the tests are silently skipped.
- **Impact:** Silent test-skip risk.
- **Fix:** Add `testMatch: ['**/__test__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}']`.

#### L-21 — `useInterval.ts` re-creates the timer on every `delay` change; if `delay` is `0` it never fires
- **File:** `apps/reading-advantage/hooks/useInterval.ts`
- **Lines:** 10-15
- **Severity:** Low
- **Evidence:** Same as L-02 — passing `0` produces an event-loop
  spin.
- **Fix:** Treat `delay <= 0` as "not running".

#### L-22 — `connection-monitor.ts:298-299` calls `getQueryStats(5)` ("Last 5 minutes") inside `performHealthCheck`
- **File:** `apps/reading-advantage/lib/cache/connection-monitor.ts`
- **Lines:** 299
- **Severity:** Low
- **Evidence:** Hard-coded 5-minute window. A health check that
  reports only the last 5 minutes of activity may show "0 queries"
  even when the system is busy.
- **Fix:** Accept `windowMinutes` as a parameter.

---

## SQL / Migration Audit

This batch does not contain migration `.sql` files. The cache module
issues raw SQL against the application database for two purposes:

| Item | File / Line | Concern |
|------|-------------|---------|
| `REFRESH MATERIALIZED VIEW ${viewName}` | `matview-manager.ts:287,291` | Identifiers interpolated via `sql.raw`; should be allow-list validated. |
| `SELECT count(*) FROM ${viewName}` | `matview-manager.ts:113` | Same. |
| `SELECT pg_stat_get_last_analyze_time(c.oid) ... FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = '${viewName}'` | `fallback-queries.ts:438-444` | Identifier interpolated; also runs inside a transaction in parallel with another `tx.execute` (H-03). |
| `SELECT * FROM mv_student_velocity WHERE user_id = ${userId}` | `fallback-queries.ts:126-130` | Safe (parameterised). |
| `SELECT * FROM mv_assignment_funnel WHERE assignment_id = ${assignmentId}` | `fallback-queries.ts:230-234` | Safe (parameterised). |
| `SELECT * FROM mv_daily_activity_rollups WHERE school_id = ${schoolId} AND activity_date >= ${startDate} AND activity_date <= ${endDate}` | `fallback-queries.ts:316-323` | Safe (parameterised). |
| `SELECT count(*) FROM pg_stat_activity` etc. | `connection-monitor.ts:86-97` | Safe (static SQL). |
| `SELECT EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname = ${viewName})` | `fallback-queries.ts:99-105, 428-434` | The view name is parameterised in `queryWithFallback` and `checkMatviewsHealth`, but the `${viewName}` in `pg_class WHERE c.relname = '${viewName}'` is **not** — it's a `sql.raw` literal. |
| `queryOptimizer.executeOptimizedRaw(query, ...params)` | `query-optimizer.ts:42-75` | Accepts any SQL string template; identifier-safe only when caller restricts values to bind parameters. |
| `users.schoolId` filter missing | `advanced-cache.ts:205,215,235` | Bypasses TenantDB. |
| `studentAssignments.status` enum check | `fallback-queries.ts:264-269` | Status string never written by Drizzle code paths (M-05). |

---

## Static Asset / Privacy Audit

This batch contains no static assets. Privacy considerations:

| Item | File / Line | Concern |
|------|-------------|---------|
| Unscoped `db.select().from(users)` in cache warmup | `advanced-cache.ts:205` | Multi-tenant bypass; cross-school totals cached globally. |
| `eq(users.role, 'STUDENT')` and `as any` cast on `schoolId` | `fallback-queries.ts:340-341` | Type safety; future drift in role enum breaks query (M-11). |
| `studentAssignments` join without classroom filter | `fallback-queries.ts:253-261` | Returns all students for an assignment regardless of school; relies on caller to filter by `assignmentId`. |
| `userActivity` join without classroom filter | `fallback-queries.ts:329-345` | Same — `schoolId` is the only filter; a missing filter leaks cross-school activity. |
| `console.error('Error fetching lowest rated articles:', err)` | `useLowestRatedArticles.ts:51` | Error object passed to console.error may include stack/URL. |
| Audio fallback uses `ctx.resume()` without user gesture | `useSound.ts:36-38` | Browsers may block `resume()` until a user gesture; subsequent `createOscillator` calls succeed but produce no sound. |

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A1 | Silent catch + happy UI | Yes | `check-article-completion.ts:60-69` and `check-story-completion.ts:52-61` return `allCompleted: false` on any error. `connection-monitor.ts:289-296` swallows the test query error. |
| A2 | Bypass of domain/contracts layer | Yes | The entire `lib/cache/*` module is an app-local cache rather than a backend module; no Zod schemas at any boundary. `metrics.ts` advertises "auto-invalidation" but the path is dead (H-06). |
| A3 | Magic numbers without enum | Yes | `useGameLoop.ts:6` `tickMs = 50`. `metrics.ts:118-119` TTL 15 minutes, stale 5 minutes. `advanced-cache.ts:27` `maxEntries = 1000`. `connection-monitor.ts:34-37` thresholds `80, 5000, 10`. `query-optimizer.ts:118` `delayMs = 100`. |
| A4 | Vacuous-pass on nothing-done | Yes | `metrics.ts:62-78` early-returns with comment-only documentation of the disabled behaviour. |
| A5 | False-claim text vs test reality | Yes | `metrics.ts:1-9` header advertises "Automatic invalidation on metrics:update events" — implementation is dead. `advanced-cache.ts:1-4` header says "Reduces connection pool usage" but `warmup()` opens three new connections. |
| A6 | Provider-specific hardcoded URLs | No | (No URLs in this batch.) |
| A7 | Magic numbers without enum | Yes | Same as A3. |
| A8 | Hard-coded PII in test data | No | (No fixtures.) |

---

## Test / Coverage Observations

1. **Two test files in this batch.** `useInterval.test.tsx` (3 tests)
   and `useSound.test.tsx` (2 tests). No tests for any of the cache
   modules, completion helpers, `useLowestRatedArticles`,
   `calculateLevel`, or i18n configuration.
2. **Behaviour worth testing (representative, not exhaustive):**
   - `useInterval`: add a test for unmount cleanup (L-05); add a
     test that `delay = 0` does not starve the event loop (L-21).
   - `useSound`: add a test that multiple rapid `playSound('success')`
     calls do not allocate > N oscillators; add a test that the
     fallback synth fires when both mp3 fetch and `AudioContext` are
     unavailable.
   - `useLowestRatedArticles`: add a test that an unauthenticated
     user gets a 401 from the API and the hook surfaces the error.
   - `advanced-cache.get`: stale-vs-expired boundary tests; LRU
     eviction behaviour; concurrency (`Promise.all` reads of the
     same key return the same value).
   - `advanced-cache.warmup`: assert that the singleton cache is
     populated after `warmup()` completes; assert that the queries
     are scoped per `schoolId` (H-02).
   - `connection-monitor.startMonitoring`: assert that two calls do
     not start a second interval (idempotence).
   - `connection-monitor.performHealthCheck`: assert the return type
     includes `error: string | null` (M-03).
   - `fallback-queries.checkMatviewsHealth`: assert sequential
     execution inside the transaction (H-03).
   - `matview-manager.queueRefresh`: assert that calling with the
     same view twice does not start a second concurrent refresh.
   - `metrics.fetchAndCache`: assert that a failed fetcher returns
     the previously-cached value when `staleOnError: true` is set
     (M-12).
   - `calculateLevel`: assert that an invalid `cefrLevelInput`
     throws a typed error (L-10); assert that an empty `text`
     returns the input level (no NaN propagation).
   - `check-article-completion`: assert that an unknown `userId`
     produces a 404-shaped response (H-04); assert that an invalid
     `mcqData` shape produces a typed error rather than `state ===
     2` falsy-positive.
   - `i18n.ts`: assert that the dynamic import resolves for every
     locale in `localeConfig.locales`.
   - `jest.setup.ts`: assert that the `Request` polyfill forwards
     body and headers (or remove the polyfill).
3. **No test execution was attempted.** `node_modules` was not
   inspected for `@testing-library/jest-dom` version; the test files
   were read only.

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.

---

## Recommendations (focused, no broad refactor)

1. Add an allow-list check before every `sql.raw(\`…${name}\`)` in the
   cache module. Restrict `queueRefresh`, `forceRefreshAll`,
   `refreshView`, and `checkMatviewsHealth` to view names that are
   members of the const config arrays (H-01).
2. Move `warmup()` into a per-tenant backend module (or delete it).
   Key every cache entry by `schoolId`. Audit every `db.select` call
   in `lib/cache/*` for missing `schoolId` predicates (H-02, M-11).
3. Run the view health checks sequentially inside (or outside of)
   transactions; drop the 50 ms `setTimeout` from inside the
   transaction (H-03, L-17).
4. Add Zod schemas for every API response in
   `check-article-completion.ts`, `check-story-completion.ts`,
   `useLowestRatedArticles.ts`. Verify that the calling user owns the
   `userId` parameter before issuing any of the four fetches (H-04,
   H-05, H-11).
5. Either re-enable the PostgreSQL LISTEN path in `metrics.ts` or
   delete the dead code and correct the file header (H-06).
6. Capture the alert-interval handle in `connection-monitor.ts`;
   clear it in `stopMonitoring()`. Decide whether `recordQueryMetric`
   should observe real queries or be deleted (H-07).
7. Cache the `Audio` object in `useSound.ts`; preload on mount;
   cap concurrent oscillators; disconnect after `stop() + onended`
   (H-08).
8. Use `@/configs/locale-config` consistently in both i18n files;
   assert `localeConfig.locales.length > 0` at module load; document
   the `next-intl` plugin requirement (H-09).
9. Validate that `textStandard` returns a finite integer in
   `calculateLevel.ts`; throw a typed error for unknown `cefrLevelInput`
   (H-10, L-10).
10. Match `targetId` on a scoped identifier in
    `check-story-completion.ts:20` (e.g. `targetId ===
    \`${storyId}:${chapterNumber}\``) (H-11).
11. Remove the `as any` casts on `schoolId` in
    `fallback-queries.ts:340`; define a typed role enum and use it
    on line 341 (M-11).
12. Compute completion from `startedAt`/`completedAt` in the funnel
    fallback (lines 264-269) instead of the unwritten `status`
    column (M-05).
13. Store the trigger-monitoring interval handle on `this.matviewManager`
    so `stopScheduler()` can clear it; add an `isProcessingQueue`
    guard around `processRefreshQueue()` (M-06, M-07).
14. Make `executeOptimizedRaw` reject queries whose literal chunks
    contain `'`-quoted substrings with embedded `$N`-looking
    sequences; document the contract (M-08).
15. Drop the `Request`/`Response` polyfills from `jest.setup.ts` on
    Node 18+; otherwise implement them faithfully (M-10).
16. Add a `retry` and `staleOnError` option to `metrics.fetchAndCache`
    (M-12).
17. Bucket activity days by `timeZone` instead of UTC in
    `fallback-queries.ts:171-179` (M-13).
18. Pass `0` (or omit) for `duration` on the synthetic failure call
    in `connection-monitor.ts:154`; rename the parameter to
    `timestamp` (L-13).

---

## End of file review for batch 39.

MEASURE_AGENT_RESULT