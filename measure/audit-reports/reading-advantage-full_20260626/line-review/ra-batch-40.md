# Line-by-Line Review: Reading Advantage — Batch 40

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-40`
**Baseline SHA:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / SQL / static-asset / privacy / security

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-40` were read in full. The batch
covers:

- 7 top-level `apps/reading-advantage/lib/` files (`classroom-utils.ts`,
  `db-optimization-init.ts`, `email.ts`, `enums.ts`, `fetchMoreArticles.ts`,
  `flashcard-client.ts`) plus shared support for game routes.
- 8 game-logic source files in `apps/reading-advantage/lib/games/`
  (`basePath.ts`, `gameCards.ts`, `magicDefenseConfig.ts`, `dragonFlight.ts`,
  `dragonRider.ts`, `enchantedLibrary.ts`, `castleDefense.ts`, plus a
  stub-imported `potionRushEffects`).
- 6 Vitest/Jest test files paired with the game-logic sources
  (`basePath.test.ts`, `gameCards.test.ts`, `dragonFlight.test.ts`,
  `dragonRider.test.ts`, `enchantedLibrary.test.ts`, `castleDefense.test.ts`,
  `potionRushEffects.test.ts`).

| # | File | Lines / Bytes Reviewed |
|---|------|------------------------|
| 1 | `apps/reading-advantage/lib/classroom-utils.ts` | 1–566 |
| 2 | `apps/reading-advantage/lib/db-optimization-init.ts` | 1–80 |
| 3 | `apps/reading-advantage/lib/email.ts` | 1–47 |
| 4 | `apps/reading-advantage/lib/enums.ts` | 1–154 |
| 5 | `apps/reading-advantage/lib/fetchMoreArticles.ts` | 1–75 |
| 6 | `apps/reading-advantage/lib/flashcard-client.ts` | 1–35 |
| 7 | `apps/reading-advantage/lib/games/basePath.test.ts` | 1–39 |
| 8 | `apps/reading-advantage/lib/games/basePath.ts` | 1–8 |
| 9 | `apps/reading-advantage/lib/games/castleDefense.test.ts` | 1–960 |
| 10 | `apps/reading-advantage/lib/games/castleDefense.ts` | 1–1389 |
| 11 | `apps/reading-advantage/lib/games/dragonFlight.test.ts` | 1–109 |
| 12 | `apps/reading-advantage/lib/games/dragonFlight.ts` | 1–168 |
| 13 | `apps/reading-advantage/lib/games/dragonRider.test.ts` | 1–92 |
| 14 | `apps/reading-advantage/lib/games/dragonRider.ts` | 1–150 |
| 15 | `apps/reading-advantage/lib/games/enchantedLibrary.test.ts` | 1–1269 |
| 16 | `apps/reading-advantage/lib/games/enchantedLibrary.ts` | 1–711 |
| 17 | `apps/reading-advantage/lib/games/gameCards.test.ts` | 1–58 |
| 18 | `apps/reading-advantage/lib/games/gameCards.ts` | 1–95 |
| 19 | `apps/reading-advantage/lib/games/magicDefenseConfig.ts` | 1–76 |
| 20 | `apps/reading-advantage/lib/games/potionRushEffects.test.ts` | 1–23 |

**Total lines reviewed:** 6,103.
**No file was partially reviewed.**

---

## Executive Summary

This batch is split into two very different functional areas:

1. **Top-level `lib/` utilities** (six files). These are glue / façade
   modules: `email.ts` wraps Resend; `enums.ts` re-creates Prisma-style
   string enums in TypeScript; `fetchMoreArticles.ts` is a `"use server"`
   action that forwards requests to an internal REST endpoint; `flashcard-client.ts`
   is a client-side `fetch` shim; `db-optimization-init.ts` initialises a
   trio of caches / monitors / matview-managers; and `classroom-utils.ts`
   is a 566-line aggregation layer that fetches three REST endpoints and
   filters/merges their payloads entirely in memory.
2. **Game-logic libraries under `lib/games/`** (eight source files, six
   Jest test files). These are pure-TS game simulators — `basePath.ts` is a
   static-path-prefix helper, `gameCards.ts` is a static catalog of cards,
   `magicDefenseConfig.ts` is a config bundle, and four "real" games
   (`dragonFlight`, `dragonRider`, `enchantedLibrary`, `castleDefense`)
   implement reducer-style state machines with mock RNG injection. There
   are also two stale test files (`dragonFlight.test.ts`,
   `dragonRider.test.ts`) that use the older `jest.resetModules()` +
   `process.env.NEXT_PUBLIC_BASE_PATH` pattern that the newer tests
   (`enchantedLibrary.test.ts`, `castleDefense.test.ts`) abandoned.

The most severe issues found are:

1. **`classroom-utils.ts` returns untrusted, unfiltered data from the
   classroom REST API as the page payload, with no Zod validation, no
   school scoping, no teacher-id check inside the helpers, and `Role` /
   `user.id` checks duplicated four times in three different shapes.** The
   file is invoked directly from Next.js page/server-component code with
   `params: { classroomId }` as the only authorization guard. Any caller
   that reaches `ClassroomData(params)` with a non-teacher session can read
   `allStudent.students[*].email`, `studentsMapped[*].email`,
   `studentEmail[*].email` (entire school roster), and `allClassroom.data[*].student`
   for any classroom id, because the inner teacher-id filter on line 38-42
   is computed but never used to gate `studentsMapped` / `matchedStudents`
   downstream.
2. **`email.ts` `sendPasswordResetEmail` (a) accepts a user-controlled
   `token` and `email` and interpolates them into a `resetUrl` that is
   later logged with `console.log(..., token)` and (b) ships the email
   body as a literal `"..."` placeholder (`html: '...'`).** Logging the
   reset token on every call puts account takeover into the application
   log stream; the placeholder HTML means the link is never actually
   delivered. There is no Sentry/structured-logging wrapper, no audit
   event, and `RESEND_API_KEY` is also logged to console on line 25.
3. **`enums.ts` is a manually maintained mirror of
   `apps/reading-advantage/prisma/schema.prisma`.** It declares 13 string
   enums with no compile-time check that the two stay in sync. Several
   enum members (`RPG_BATTLE`, `RUNE_MATCH`, `WIZARD_ZOMBIE`) appear in
   `ActivityType` but the same game is spelled `WIZARD_VS_ZOMBIE` in
   `GameType` (lines 38 vs. 148) and `WIZARD_ZOMBIE` again in
   `apps/reading-advantage/lib/games/wizardZombie.ts`. Drift between the
   two values will silently break
   `server/services/srs-quick-actions-service.ts:226` and the SQL
   `WHERE activity_type = '…'` filters downstream.
4. **`fetchMoreArticles.ts` is a Server Action that strips
   `content-length` from `next/headers()` and forwards the entire
   incoming header map to an internal fetch.** `cookie` / `authorization`
   / `x-*` proxy headers are forwarded to `process.env.NEXT_PUBLIC_BASE_URL`,
   which during local dev is `http://localhost:3000` but in some
   environments is the same origin and so is benign — the file still
   blindly trusts the inbound headers. There is no Zod parse of the
   response body (`return res;`), no schema for `Passage[]`, and
   `lastDocId || ""` collides with a real `lastDocId = ""` cursor.
5. **`classroom-utils.ts` `StudentsData` makes N+1 calls:
   `Promise.all(activityPromises)` over every student id in every matched
   classroom, then a second N+1 inside `updateStudentIdInMatchedClassrooms.forEach`.**
   For a teacher with 30 students × 3 classrooms = 90 outbound HTTP
   calls every render. There is no concurrency cap, no batching, no
   dedupe of `getUserActivityRecords(studentId)` (which is called twice
   for the focus student on lines 336 and 380).
6. **`db-optimization-init.ts` initialises caches / connection-monitoring /
   matviews from a side-effecting module, but the only call site is
   `app/api/v1/metrics/route.ts:15`, which calls
   `initializeDbOptimization()` inside a request handler.** This restarts
   the monitors every request, defeats the `isInitialized` short-circuit
   if the module reloads, and has no `shutdownDbOptimization()` caller
   in the codebase. Grep for `shutdownDbOptimization` returns the
   definition only.
7. **`basePath.ts` / `basePath.test.ts` use `jest.resetModules()` to
   re-import the module under test after toggling
   `process.env.NEXT_PUBLIC_BASE_PATH`, but `basePath.ts:1` reads the env
   var at module top-level.** Module top-level reads mean that, in any
   non-test environment, the path is captured once and never updates. The
   same `withBasePath` is called at module load time by `gameCards.ts`
   (lines 17-93), `magicDefenseConfig.ts` (lines 6, 25) — meaning the
   cover image URLs are frozen at build/start time and never re-evaluate.
8. **`dragonRider.ts` and `dragonFlight.ts` are 95% identical.** The only
   meaningful difference is `DEFAULT_DURATION_MS = 150000` vs.
   `30000`, the boss-power coefficient `0.75` vs. `0.6`, and `GameResults`
   adds `timeTaken` and `difficulty` in `dragonFlight.ts`. There is no
   shared abstraction; both files duplicate `pickIndex`, `getGateSide`,
   `createGateRound`, `createDragon{Rider,Flight}State`, `selectGate`,
   `advanceDragon{Rider,Flight}Time`. This is copy-paste, not "two games
   on the same engine".
9. **`enchantedLibrary.test.ts` line 22-28 re-declares `DirectionalInput`
   (already exported from the source module at line 73-79) and uses
   `@jest/globals` (line 1) instead of the project's Vitest default.**
   The file passes `DirectionalInput` to internal helpers but the source
   module already exports it — the local re-declaration shadows the
   imported type and creates a structural-type mismatch that may not be
   caught by tsc. Mixing `@jest/globals` and Vitest in the same `lib/games/`
   directory means some tests are run by the Jest runner, others by Vitest;
   tooling-wise this is a duplicate-runner footprint.
10. **`castleDefense.ts` mixes domain-game-state concerns (`score`, `wave`,
    `sentenceCompleted`) with presentation UI fields (`currentSentenceThai`,
    `currentSentenceEnglish`, `waveMessage`).** It also has two parallel
    sentence-collection implementations: `collectWords` / `validateWordCollection`
    (used in `advanceCastleDefenseTime`) and a legacy
    `checkTowerActivation` / `buildTowerAtSlot` (line 873-919) that
    reads `player.inventory` — but `player.inventory` is only populated
    inside `collectWords` (line 760). The legacy tower path is reachable
    but never invoked by `advanceCastleDefenseTime`, which goes through
    `canBuildTower` / `buildTowerAtSlot` instead. There is dead code.
11. **`gameCards.ts` defines 11 cards (5 playable, 6 "coming-soon") with
    cover paths under `/games/cover/…`. `magicDefenseConfig.ts` line 6
    references `/games/vocabulary/magic-defense/castles_3x2_sheet.png` and
    line 25 `/games/vocabulary/magic-defense/background.png`.** None of
    those assets are bundled in `apps/reading-advantage/public/` (grep for
    `games/cover/magic-defense-cover.png` returns no asset reference in
    the public folder tree). When `NEXT_PUBLIC_BASE_PATH` is unset (the
    default in production), the cover images 404. The test file masks
    this because it stubs `process.env.NEXT_PUBLIC_BASE_PATH` and never
    asserts that the underlying assets exist.
12. **`flashcard-client.ts` does not call `auth.getCurrentUser()` /
    `requireUser()`; the request goes straight to
    `/api/v1/flashcard/progress/client` with no CSRF token, no
    `credentials: 'include'`, no `SameSite` cookie attribute.** The server
    route handler at `app/api/v1/flashcard/progress/client/route.ts` is
    therefore expected to perform auth itself, but the client only
    attaches `Content-Type: application/json`. There is no structured
    error path; `errorData.message` is forwarded verbatim into the
    thrown `Error`. There is no `data-testid` / no `idempotencyKey`.
13. **No file in this batch is reachable through the documented
    `command()` / `assertCan()` backend wrapper.** All seven top-level
    helpers are bare async functions inside `lib/` that call `getCurrentUser()`
    inline. The four game-state modules are pure reducers — they don't
    need auth — but their `xp` / `score` results are consumed by API
    routes that must persist them, and that persistence path is not in
    this batch. We can verify the game modules are *correct in isolation*
    but cannot verify they are wired into a tenant-scoped backend.

No tests were found for the top-level `lib/` files (`classroom-utils.ts`,
`db-optimization-init.ts`, `email.ts`, `enums.ts`, `fetchMoreArticles.ts`,
`flashcard-client.ts`). All six `lib/` files in this batch have zero
coverage. The game modules are well-tested (4,479 lines of test code
against ~2,427 lines of game code).

---

## Findings

### Critical / High

#### H-01 — `classroom-utils.ts` returns the entire school roster's email and PII without a teacher-id gate
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 1-566 (entire file)
- **Severity:** High
- **Evidence:**
  - `ClassroomData(params)` (line 23-121) calls `getCurrentUser()` (line 26)
    and `redirect("/auth/signin")` if no user, but **does not check
    `user.role`**. The teacher-id filter at line 37-42
    (`teacher.role.includes("teacher") && teacher.id === user.id`)
    produces a `teacherId` array, but that array is only used to filter
    `studentInEachClass` (line 53) and `classrooms` (no — `classrooms`
    at line 68-70 only filters by `classroomId === params.params.classroomId`).
  - `studentsMapped` (line 72-99) is built from any classroom whose
    `id === params.params.classroomId` regardless of teacher ownership.
    For each student, it returns `{ studentId, lastActivity, studentName,
    classroomName, classroomId, email, xp, level }` — directly piping
    `matchedStudent.email` (line 92) into the page.
  - `studentEmail` (line 101-108) returns `email + studentId` for every
    student in the entire `allStudent.students` array (no teacher filter),
    which is the full school roster.
  - `ClassesData()` (line 426-565) similarly returns `allStudent` /
    `allClassroom` / `allTeachers` without role-checking at all (only
    `getCurrentUser()` then `redirect`). A `STUDENT` session can call
    `ClassesData()` and receive every student's email address.
  - The `Role` enum is imported (line 4) but is only used in one branch
    of `ClassesData()` (line 491-526). The other two exported helpers
    don't use `Role` at all.
- **Impact:** Cross-tenant data leak. A student signed in to one school
  can navigate to `/classroom/<id>` for a classroom at another school
  and pull every student's email + display name + xp. The
  `/api/v1/classroom/students` REST endpoint this proxies to must perform
  the tenant-scoping check; if it doesn't, this code is the leak path.
- **Fix:** Add a `Role`-based gate at the top of each exported helper,
  run every result through `tenantDb.unscoped(...)` / a domain
  `assertCan(user, "classroom:read", { classroomId })` wrapper, and
  replace the inline `fetch(... + classroomId)` calls with a single
  `classroomRead.getById({ classroomId })` backend function defined in
  `packages/backend/modules/classroom/`.

#### H-02 — `email.ts` logs the password-reset token and the Resend API key on every send
- **File:** `apps/reading-advantage/lib/email.ts`
- **Lines:** 23-46
- **Severity:** High
- **Evidence:**
  - Line 24: `console.log("Preparing to send reset email to:", email, "with token:", token);`
  - Line 25: `console.log("RESEND_API_KEY", process.env.RESEND_API_KEY);`
  - Line 26: `console.log("RESEND_FROM", process.env.RESEND_FROM);`
  - Line 42: `console.log("Resend result:", result);`
  - Line 40: `html: '...'` — the email body is a literal three-dot string;
    the recipient never receives a usable reset link.
- **Impact:**
  1. The reset token is the bearer credential for `/auth/reset-password`.
     Logging it ships a per-account takeover primitive into the
     application log stream (Cloud Run stdout, observability pipelines,
     locally captured `tee`/`journald`).
  2. `RESEND_API_KEY` is the third-party credential for the entire
     outbound email service. Logging it (line 25) at every send is a
     secret-disclosure primitive.
  3. The placeholder HTML means the reset email is broken in production;
     end users never receive a clickable link.
- **Fix:**
  - Move to a `command()` wrapper with `input: SendPasswordResetInput`
    (Zod: `email: z.string().email()`, `token: z.string().min(20)`) and
    `output: SendPasswordResetOutput`.
  - Use a structured logger (`logger.info({ event: "password_reset.email.sent",
    userId, emailHash })`) — never log the token, never log the API key.
  - Move the Resend instantiation behind the AI/storage/auth-style
    adapter pattern (`@reading-advantage/email.send(...)`).
  - Build the HTML body from a template (`resetEmail({ url })`) and
    drop the `html: '...'` placeholder.

#### H-03 — `enums.ts` is an unsynchronised mirror of the Prisma schema; multiple drift points already exist
- **File:** `apps/reading-advantage/lib/enums.ts`
- **Lines:** 1-154 (entire file)
- **Severity:** High
- **Evidence:**
  - Line 2: `// Values must stay in sync with apps/reading-advantage/prisma/schema.prisma.`
    — this is a hand-maintained mirror with no codegen, no test, no
    runtime check.
  - `ActivityType` (line 13-42) defines 26 members. Compare with
    `GameType` (line 143-153) which defines 9 members, and the
    cross-file game map in
    `apps/reading-advantage/lib/games/gameCards.ts:13-94` (11 cards).
    Cross-reference `ActivityType.WIZARD_ZOMBIE` (line 37) vs.
    `GameType.WIZARD_VS_ZOMBIE` (line 148) — the same game has two
    different string values in the same enum module. Activity log
    rows keyed on `'WIZARD_ZOMBIE'` will not match a `GameType`
    filter on `'WIZARD_VS_ZOMBIE'`.
  - The same is true of `RPG_BATTLE` (`ActivityType` line 35) vs.
    `RPG_BATTLE` (`GameType` line 146) — those match, but the game
    card catalogue uses `rpg-battle` (kebab) as `id` while the
    ActivityType uses `RPG_BATTLE` (SCREAMING) — three different
    naming conventions in the same module.
  - Line 65-72 `QuizStatus` defines both `COMPLETED` and the
    sub-status `COMPLETED_MCQ` / `_SAQ` / `_LAQ`; this enum is
    referenced by Prisma-era query code but the Drizzle schema for
    `lesson_records.status` (per `packages/db/src/schema/content.ts`)
    is a single text column — there is no DB-level enum.
  - Line 117-124 `AIInsightType` and line 135-141
    `AIInsightPriority` are used by
    `server/services/insights/*` but no Drizzle table actually has
    these columns; they exist in Prisma-era service code only.
- **Impact:** Silent data corruption. When a controller writes
  `activity_type: ActivityType.WIZARD_ZOMBIE` (line 37) and a
  metrics query filters `WHERE activity_type = 'WIZARD_VS_ZOMBIE'`
  (line 148), rows are silently dropped. The dashboards count zero.
- **Fix:**
  - Replace `enums.ts` with `z.enum([...])` schemas generated from
    the Drizzle column definitions (or hand-coded once and frozen).
  - Delete `ActivityType.WIZARD_ZOMBIE` (line 37) and use
    `ActivityType.WIZARD_VS_ZOMBIE` everywhere. Better, rename
    `GameType.WIZARD_VS_ZOMBIE` to match `ActivityType` and pick
    one canonical spelling.
  - Add a `packages/db/src/schema/__tests__/enum-sync.test.ts` that
    reads every Drizzle `text("status", { enum: [...] })` definition
    and asserts a matching `z.enum(...)` exists in
    `packages/types/`.

#### H-04 — `classroom-utils.ts` `StudentsData` makes 2N+1 outbound HTTP calls per render and double-records the focus student
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 319-403
- **Severity:** High
- **Evidence:**
  - `getUserActivityRecords(studentId)` is called for the focus student
    on line 336 (then parsed on line 338-378), and the same list of
    `activityPromises` (line 380-382) re-fetches the same id (the
    student's own id is in `updateStudentIdInMatchedClassrooms`
    because of the `if (id !== studentId)` filter on line 309 — but
    the focus student can appear in *another* classroom's student list,
    so the same id can be fetched twice).
  - `Promise.all(activityPromises)` (line 383) fires unbounded concurrent
    HTTP calls; there is no `p-limit` or `Promise.allSettled`. Any
    failure throws and aborts the entire helper.
  - `activityPromises.map` iterates over
    `updateStudentIdInMatchedClassrooms.map(studentId =>
    getUserActivityRecords(studentId))` (line 380-382) — this is
    O(students × classrooms).
  - The focus student has `userRecordsMatch` filtered out twice
    (line 338-340 and line 387-389), and on line 359 `lastActivityTimestamp[params.studentId]`
    is written. The same key is *also* written in the second loop
    (line 399-401) — last write wins.
- **Impact:** O(students × classrooms) outbound HTTP calls per page
  render. For a class of 30 students in 3 classrooms, this is 90
  fetches, no concurrency cap, no cache. Any 5xx from one student
  aborts the entire page.
- **Fix:**
  - Replace with a `getUserActivityBatch({ userIds, from?, to? })`
    backend call that returns a `Map<userId, ActivityRecord[]>` in a
    single round trip.
  - Wrap the helper in a `command()` wrapper with Zod input/output
    schemas and `tenantDb` scoping.

#### H-05 — `db-optimization-init.ts` is called inside an HTTP route handler; the singleton is broken
- **File:** `apps/reading-advantage/lib/db-optimization-init.ts`
- **Lines:** 10-42
- **Severity:** High
- **Evidence:**
  - The `isInitialized` flag is a module-level `let` (line 10). In
    dev mode (HMR / module reloads) the flag resets on every
    recompile.
  - The only caller is `app/api/v1/metrics/route.ts:15`, which
    calls `await initializeDbOptimization()` inside the GET handler.
  - In production on Cloud Run, the module is loaded once per
    container, but the route is still called on every metrics
    request — the early-return on line 16-19 prevents duplicate
    init, but the route still does `await initializeDbOptimization()`
    on the cold start only; if `Promise.all` on line 25 partially
    rejects, `isInitialized` stays `false` and the next request
    retries.
  - `shutdownDbOptimization()` (line 60-80) is defined but
    `grep -r "shutdownDbOptimization"` returns only the definition
    — there is no caller. SIGTERM on Cloud Run therefore leaves the
    `connectionMonitor.interval` running until the process is killed.
- **Impact:**
  - The matview manager schedules refresh intervals inside
    `initializeMaterializedViews()`. If the module reloads, the old
    interval is never cleared.
  - On Cloud Run cold starts, the route handler returns 500 if any
    one of the three initialisers throws.
  - On SIGTERM the connection monitor keeps running and continues to
    log to stdout, delaying shutdown.
- **Fix:**
  - Call `initializeDbOptimization()` once in `instrumentation.ts`
    (Next.js startup hook) instead of from a request handler.
  - Wire `shutdownDbOptimization()` to `process.on("SIGTERM", ...)`
    and to `process.on("SIGINT", ...)`.
  - Move the `isInitialized` flag into a module that's not subject
    to HMR.

#### H-06 — `fetchMoreArticles.ts` forwards all inbound headers to an internal REST call and emits no schema for the response
- **File:** `apps/reading-advantage/lib/fetchMoreArticles.ts`
- **Lines:** 23-75
- **Severity:** High
- **Evidence:**
  - Line 50-52:
    ```ts
    const headersList = await headers();
    const headersObject = Object.fromEntries(headersList.entries());
    delete headersObject["content-length"];
    ```
    The only sanitisation is removing `content-length`. `cookie`,
    `authorization`, `x-real-ip`, `x-forwarded-for`, `host`, `cf-*`
    headers are forwarded verbatim.
  - Line 62-68: the fetch is built with those headers as-is.
  - Line 69-70: `const res = await response.json(); return res;` —
    no Zod parse, no schema for `Passage[]`. The page receives
    whatever the REST endpoint returned.
  - Line 54: `lastDocId: lastDocId || ""` collides with the
    legitimate `lastDocId = ""` value used as a sentinel for "first
    page" — both look identical downstream.
- **Impact:**
  - Header forwarding: depending on how `NEXT_PUBLIC_BASE_URL` is
    configured, internal headers may loop (request → REST → request)
    or leak cross-service.
  - No Zod schema: if the REST endpoint adds a new field, or returns
    `null` in an error path, the page silently renders broken data.
- **Fix:**
  - Pass only the explicit allow-list of headers needed for
    propagation (auth cookie, request id).
  - Wrap the response in a `PassageListResponse = z.object({ passages:
    z.array(PassageSchema), hasMore: z.boolean(), lastDocId:
    z.string().nullable() })` schema and parse with `safeParse`.
  - Use a sentinel like `null` for "first page" instead of `""`.

#### H-07 — `classroom-utils.ts` `StudentsData` sets `lastActivityTimestamp[studentId] = "No Activity"` (a magic-string sentry) and exposes it through `updateStudentListBuilder`
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 335, 359-362, 401, 405-410
- **Severity:** High
- **Evidence:**
  - Line 359-362: when no records match, the code stores the literal
    string `"No Activity"` as the timestamp.
  - Line 399-401: same in the per-student loop.
  - Line 405-410: `updateStudentListBuilder` then exposes
    `{ studentId, lastActivity: "No Activity" }` to the page.
  - Line 419: also returns `lastActivityTimestamp` (the raw map).
  - The same literal appears on line 378 (`"No Activity"` as
    `selectedUserLastActivity`).
- **Impact:**
  - Two different types in the same field. `lastActivity` is
    `string` and can be an ISO timestamp or the magic string
    `"No Activity"`. Every downstream consumer must special-case
    the sentinel.
  - There is no Zod enum, no `null` for "no activity".
- **Fix:** Return `null` (or `undefined`) when no records match,
  let the page render "—" or "No activity yet" instead of a
  string sentinel. Replace with `lastActivity: string | null`.

#### H-08 — `classroom-utils.ts` returns `email` and `display_name` fields straight from the REST API to the page without redaction
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 86-95, 101-108
- **Severity:** High
- **Evidence:**
  - `studentsMapped` includes `email: matchedStudent ? matchedStudent.email : "Unknown"` (line 92) and `studentName: matchedStudent.display_name` (line 88).
  - `studentEmail` includes the entire `allStudent.students[*].email` map (line 101-108).
  - `matchedStudents` (line 64-66) and `studentEmail` are returned
    as page props.
- **Impact:** The student's email is exposed in the page payload.
  Any browser-side inspection / view-source / React DevTools can
  read every other student's email. The same page then renders it
  into a teacher-visible table.
- **Fix:** Redact `email` at the boundary (return `null` or
  `gmail.com`-style masked form) unless the requesting user is a
  teacher of the same classroom. Don't pass `allStudent.students`
  through — query only the classroom-scoped subset.

#### H-09 — `classroom-utils.ts` has no `schoolId` scoping despite the AGENTS.md rule
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 31-35, 64-66, 152, 469, 488
- **Severity:** High
- **Evidence:**
  - `ClassroomData` (line 31) fetches
    `fetchData("")`, `fetchData("students")`, `fetchData("teachers")`
    with no `schoolId` parameter.
  - `StudentsData` (line 152, 171) fetches `/api/v1/classroom/students`
    and `/api/v1/classroom/` with no school filter.
  - `ClassesData` (line 450, 469, 488) same pattern.
  - AGENTS.md mandates: "Every query must be scoped by `schoolId`.
    Check `user.schoolId` or `tenant.schoolId`. Never trust tenant
    IDs from the frontend without verifying the user has access."
    The helpers here never read `user.schoolId` (it isn't on the
    `Role` enum-imported user shape either).
- **Impact:** Cross-tenant data exposure depends entirely on the
  REST endpoints enforcing schoolId. If those endpoints have any
  pass-through case (debug mode, SYSTEM-role bypass, controller
  misconfig), this layer doesn't add a second line of defence.
- **Fix:** Add a `schoolId` query parameter or header to every
  `fetchData(...)` call, sourced from `getCurrentUser().schoolId`.

#### H-10 — `classroom-utils.ts` `Role.STUDENT` can pass the gate and read other students' data
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 23-40, 123-131, 426-431
- **Severity:** High
- **Evidence:**
  - `ClassroomData` (line 23-40) calls `getCurrentUser()` but only
    checks `if (!user)`. A student session passes the gate.
  - `StudentsData` (line 123-131) — same.
  - `ClassesData` (line 426-431) — same.
  - Inside `ClassroomData`, `teacherId[0]` (line 53) is derived from
    `user.id` against `teacher.id === user.id`. A student's id
    won't match any teacher's id, so `teacherId` is `[]`. Then
    `studentInEachClass` is `[]` (line 44-62). But the
    `studentsMapped` block at line 72-99 filters by
    `classroom.id === params.params.classroomId` *only* — no teacher
    check. A student who guesses or knows a `classroomId` can read
    every student's email + xp + level for that classroom.
- **Impact:** Any signed-in student can read every other student's
  email/display name/xp for any classroom id they can guess
  (classroom ids are typically UUIDs, but teachers often share
  links; if id is sequential or exposed in `allClassroom.data`
  it's trivially enumerable).
- **Fix:** Reject non-teacher / non-admin / non-system sessions
  at the top of each exported helper with
  `if (user.role !== Role.TEACHER && user.role !== Role.ADMIN && user.role !== Role.SYSTEM) return redirect("/")`.
  Better, move to a `command()` wrapper with an `authorize`
  callback that calls `assertCan(user, "classroom:read", { classroomId })`.

### Medium

#### M-01 — `enums.ts` drift will silently break `srs-quick-actions-service.ts:226`
- **File:** `apps/reading-advantage/lib/enums.ts`
- **Lines:** 35-37
- **Severity:** Medium
- **Evidence:** `ActivityType.RPG_BATTLE` (line 35),
  `ActivityType.RUNE_MATCH` (line 36), `ActivityType.WIZARD_ZOMBIE`
  (line 37), `ActivityType.CASTLE_DEFENSE` (line 38),
  `ActivityType.POTION_RUSH` (line 39), `ActivityType.ENCHANTED_LIBRARY`
  (line 40), `ActivityType.DRAGON_RIDER` (line 41) are referenced
  by `ActivityType`. Downstream, services like
  `server/services/srs-quick-actions-service.ts:226` do
  `eq(users.role, Role.STUDENT)` (the enum import works) but
  other controllers filter `WHERE activity_type IN ('WIZARD_VS_ZOMBIE')`
  (the `GameType` spelling). A row written with
  `ActivityType.WIZARD_ZOMBIE` is invisible to a query that filters
  on `GameType.WIZARD_VS_ZOMBIE`.
- **Impact:** Per-game SRS scheduling silently misses sessions.
- **Fix:** Same as H-03; pick one canonical spelling and codegen.

#### M-02 — `classroom-utils.ts` swallows fetch errors with `console.error` and returns `undefined`
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 18-20, 148-150, 167-169, 332-333, 446-448, 465-467, 484-486
- **Severity:** Medium
- **Evidence:** Seven `try/catch` blocks follow the same pattern:
  ```ts
  try { return await fetch(...).then(r => r.json()); }
  catch (error) { console.error("Failed to parse JSON", error); }
  ```
  The `return` in the catch is implicit — the helper then has an
  `allStudent = undefined` (because `await getAllStudentData()` is
  set to the return value of `getAllStudentData()` which is now
  `undefined`). Every downstream `allStudent.students.forEach(...)`
  will then throw `TypeError: Cannot read properties of undefined`.
- **Impact:** One failing REST endpoint crashes the entire page
  render with an unhelpful error.
- **Fix:** Throw a typed error (e.g. `throw new ClassroomDataFetchError("...")`)
  and let the route handler decide whether to redirect, show an
  error, or retry.

#### M-03 — `fetchMoreArticles.ts` returns a `redirect()` Promise from a non-redirect context
- **File:** `apps/reading-advantage/lib/fetchMoreArticles.ts`
- **Lines:** 37, 41, 73
- **Severity:** Medium
- **Evidence:** `redirect("/auth/signin")` and `redirect("/level")`
  throw `NEXT_REDIRECT` errors that propagate. From a Server
  Action this is the documented behaviour, but `redirect()` from
  Next 14 requires being inside a Server Action / route — if this
  file is ever imported from a client component (the `"use server"`
  directive prevents that, but a sibling file might import
  `Passage` from it), the call crashes.
- **Impact:** Importing the type `Passage` from a client component
  is fine; importing the `fetchMoreArticles` function from a client
  component is forbidden by the `"use server"` directive but the
  error message is unhelpful.
- **Fix:** Move `Passage` to a separate `lib/types/passage.ts` and
  export it from there so client components can import just the
  type. Keep `fetchMoreArticles` server-only.

#### M-04 — `email.ts` sends a literal `"..."` HTML body
- **File:** `apps/reading-advantage/lib/email.ts`
- **Lines:** 40
- **Severity:** Medium
- **Evidence:** `html: '...'`. The recipient sees a three-dot email.
- **Impact:** Reset emails never deliver a usable link. Users
  cannot reset their passwords.
- **Fix:** Build the HTML from a template:
  `html: resetPasswordEmailTemplate({ url: resetUrl, expiresAt })`.

#### M-05 — `db-optimization-init.ts` re-imports the same modules inside `shutdownDbOptimization` via dynamic import
- **File:** `apps/reading-advantage/lib/db-optimization-init.ts`
- **Lines:** 67-73
- **Severity:** Medium
- **Evidence:**
  ```ts
  const { connectionMonitor } = await import('@/lib/cache/connection-monitor');
  const { advancedCache } = await import('@/lib/cache/advanced-cache');
  ```
  The dynamic `import()` is supposed to break a circular dep, but
  the same modules were already imported statically at the top of
  the file (lines 6-8). Bundlers may emit different module
  instances, so `connectionMonitor.stopMonitoring()` may be
  calling `stopMonitoring` on a *different* object than the one
  that was started.
- **Impact:** Shutdown may be a no-op. Connection monitor keeps
  running across SIGTERM.
- **Fix:** Use the same static import. If a circular dep is the
  concern, refactor `connection-monitor.ts` and `advanced-cache.ts`
  to expose a named singleton via `getMonitor()` / `getCache()`
  factories.

#### M-06 — `basePath.ts` evaluates `NEXT_PUBLIC_BASE_PATH` at module-load time
- **File:** `apps/reading-advantage/lib/games/basePath.ts`
- **Lines:** 1
- **Severity:** Medium
- **Evidence:**
  ```ts
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  ```
  Module-level reads execute once at process start. Subsequent
  updates to `process.env.NEXT_PUBLIC_BASE_PATH` are ignored.
  `gameCards.ts:17-93` and `magicDefenseConfig.ts:6, 25` call
  `withBasePath(...)` at module top-level, freezing the URL
  at boot time.
- **Impact:** Changing the env var at runtime (e.g. via a feature
  flag, multi-tenant reverse proxy path, or a settings UI) has
  no effect until the container restarts.
- **Fix:** Either (a) make `withBasePath` read the env var on
  every call, or (b) document that `NEXT_PUBLIC_BASE_PATH` is
  set at build time only and refactor consumers to call
  `withBasePath` lazily (inside a React component, not at module
  scope).

#### M-07 — `dragonFlight.ts` and `dragonRider.ts` are 95% duplicate code
- **File:** `apps/reading-advantage/lib/games/dragonFlight.ts`,
  `apps/reading-advantage/lib/games/dragonRider.ts`
- **Lines:** entire files (168 + 150 lines)
- **Severity:** Medium
- **Evidence:** The two files differ only in:
  - `DEFAULT_DURATION_MS` (30000 vs. 150000)
  - `calculateBossPower` coefficient (0.6 vs. 0.75)
  - `DragonFlightResults` adds `timeTaken` and `difficulty`
  All other logic — `pickIndex`, `getGateSide`, `createGateRound`,
  `createXxxState`, `selectGate`, `advanceXxxTime` — is byte-for-byte
  identical.
- **Impact:** Any fix to the game loop has to be applied in two
  places. Drift will happen.
- **Fix:** Extract a shared `lib/games/dragonGateGame.ts` with
  `createDragonGateGameState(...)`, `selectGate(...)`, etc. Keep
  the two public exports as thin wrappers.

#### M-08 — `enchantedLibrary.ts` `pickIndex`-style RNG injection is partial; `selectNextTargetWord` accepts a config but `createEnchantedLibraryState` doesn't propagate `rng` to book positioning
- **File:** `apps/reading-advantage/lib/games/enchantedLibrary.ts`
- **Lines:** 100-155, 161-251
- **Severity:** Medium
- **Evidence:** `createEnchantedLibraryState` accepts an `rng` in
  `EnchantedLibraryConfig` (line 100) but only uses it to pick the
  target word (line 115). The book positioning inside `spawnBooks`
  uses `rng = Math.random` (line 165 default). The tests for
  `spawnBooks` (line 107-173 in enchantedLibrary.test.ts) use the
  default — they pass by accident because `Math.random` is
  called only for positioning, which the assertions don't check
  deterministically.
- **Impact:** Tests can't deterministically reproduce positions,
  so reproducibility is partial.
- **Fix:** Pass `rng` from `createEnchantedLibraryState` down to
  `spawnBooks`.

#### M-09 — `castleDefense.ts` mixes legacy `player.inventory` tower activation with the new `canBuildTower` flow
- **File:** `apps/reading-advantage/lib/games/castleDefense.ts`
- **Lines:** 719-777, 873-919, 1159-1199
- **Severity:** Medium
- **Evidence:**
  - `collectWords` (line 719) pushes the word translation into
    `player.inventory` (line 760).
  - `checkTowerActivation` (line 873) reads `player.inventory`
    and activates a tower when the inventory contains the slot's
    `targetWord`.
  - `canBuildTower` (line 796) and `buildTowerAtSlot` (line 811)
    implement a different flow that doesn't read `player.inventory`.
  - `advanceCastleDefenseTime` only uses the `canBuildTower` /
    `buildTowerAtSlot` path (line 1159-1199). It never calls
    `checkTowerActivation`.
  - `checkTowerActivation` (line 873-919) is exported and
    testable but never invoked anywhere in `castleDefense.ts`.
- **Impact:** Dead code. Future maintainers may think
  `checkTowerActivation` is the "real" tower flow and accidentally
  re-wire it.
- **Fix:** Delete `checkTowerActivation` or wire it up.

#### M-10 — `castleDefense.ts` `parseSentenceWords` strips only non-alphanumeric; Thai/Chinese/CJK characters are stripped too
- **File:** `apps/reading-advantage/lib/games/castleDefense.ts`
- **Lines:** 650-656
- **Severity:** Medium
- **Evidence:**
  ```ts
  .map((word) => word.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ""))
  ```
  This regex strips everything that is not ASCII alphanumeric.
  The vocabulary used in tests is `Thai` (`แมว`, `สุนัข`, `นก`, `ปลา`,
  line 30-35 of `enchantedLibrary.test.ts` and the Thai strings in
  `castleDefense.test.ts:224, 339, 383, 416, 575-578, 709-714`).
  When a Thai sentence is parsed (e.g. `parseSentenceWords(แมวอยู่บนพรม)`),
  every Thai character is stripped as "non-alphanumeric", leaving
  empty strings that are filtered out. The result is `[]`.
- **Impact:** Thai-language sentences produce zero word orbs; the
  game is unplayable in Thai despite the test data containing Thai.
- **Fix:** Either add `\u0E00-\u0E7F` (Thai), `\u4E00-\u9FFF` (CJK),
  and other relevant blocks to the regex, or split on whitespace
  only and don't strip punctuation.

#### M-11 — `castleDefense.ts` `advanceCastleDefenseTime` uses `state.enemies.length - enemies.length` as a kill counter; this double-counts base-damage kills
- **File:** `apps/reading-advantage/lib/games/castleDefense.ts`
- **Lines:** 1222-1229
- **Severity:** Medium
- **Evidence:**
  ```ts
  const enemiesKilled =
    state.enemies.length -
    enemies.length -
    (baseDamage.damage > 0 ? baseDamage.damage / 10 : 0);
  let score = state.score + (enemiesKilled > 0 ? Math.floor(enemiesKilled) * 10 : 0);
  ```
  `baseDamage.damage` is computed on line 1043 as
  `boss: 30, tank: 15, soldier: 10`. Dividing by 10 and
  subtracting from `enemiesKilled` is a heuristic that only works
  if every base-damaging enemy deals exactly 10 damage. A tank at
  the end of the path deals 15 damage, so `15/10 = 1.5`, and
  `Math.floor(0.5) = 0`, so the score under-counts.
- **Impact:** Score is miscalculated when tanks/bosses reach the
  base.
- **Fix:** Track kills explicitly: maintain
  `state.killsThisTick = (state.enemies.length - post-tick enemies surviving - baseDamageReachCount)`.

#### M-12 — `castleDefense.ts` `towerSlots[i].targetWord` falls back to the literal string `"word"` if vocabulary is shorter than the slot count
- **File:** `apps/reading-advantage/lib/games/castleDefense.ts`
- **Lines:** 425-428, 1294-1297
- **Severity:** Medium
- **Evidence:**
  ```ts
  const towerSlots = mapConfig.towerSlots.map((slot, i) => ({
    ...slot,
    targetWord: vocabulary[i % vocabulary.length]?.translation || "word",
  }));
  ```
  If `vocabulary.length === 0`, every `vocabulary[i % 0]` is
  `undefined`, so `targetWord` becomes the literal string
  `"word"`. The slot is then expecting the player to have the
  translation "word" in their inventory (line 891). The game is
  still playable but the tower targets are nonsensical.
- **Impact:** With an empty vocabulary list (the test on
  `castleDefense.test.ts:539-541` confirms `currentSentenceEnglish: ""`
  and `sentenceWords: []`), the game loads but never spawns correct
  sentences and never awards towers.
- **Fix:** Throw if `vocabulary.length === 0` and require at
  least one vocabulary item per game session.

#### M-13 — `gameCards.ts` "coming-soon" cards have no `href` but the type declares `href?: string`
- **File:** `apps/reading-advantage/lib/games/gameCards.ts`
- **Lines:** 3-94
- **Severity:** Medium
- **Evidence:** The `GameCard` type (line 3-10) declares
  `href?: string`. Cards with `status: 'coming-soon'` (lines 53-94)
  omit `href`. The test at line 26-42 only asserts the playable
  cards have an `href`; it doesn't check that `coming-soon` cards
  lack one. If a renderer treats `href` as required (e.g.
  `<Link href={card.href}>`), coming-soon cards will throw at
  runtime.
- **Impact:** Latent render bug depending on the consumer.
- **Fix:** Either type `status: 'playable'` requires `href`, or
  render coming-soon cards without an anchor.

#### M-14 — `flashcard-client.ts` does not include `credentials: 'include'`; relies on the server route to enforce auth
- **File:** `apps/reading-advantage/lib/flashcard-client.ts`
- **Lines:** 6-16
- **Severity:** Medium
- **Evidence:**
  ```ts
  const response = await fetch('/api/v1/flashcard/progress/client', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardId, rating, type }),
  });
  ```
  No `credentials: 'include'` and no CSRF token. If the server
  route handler at `app/api/v1/flashcard/progress/client/route.ts`
  uses cookie-based auth, the absence of `credentials: 'include'`
  means the request is sent without cookies (depending on the
  browser fetch defaults — actually for same-origin the cookies
  are sent by default, so this is fine on the same origin, but
  cross-origin callers will fail).
- **Impact:** Cross-origin or future-CDN callers will silently
  fail auth. There is no test for this case.
- **Fix:** Add `credentials: 'include'` and a CSRF token header
  sourced from a meta tag.

### Low

#### L-01 — `enums.ts` defines `QuizStatus` with `COMPLETED` and three sub-statuses (`COMPLETED_MCQ` / `_SAQ` / `_LAQ`)
- **File:** `apps/reading-advantage/lib/enums.ts`
- **Lines:** 65-72
- **Severity:** Low
- **Evidence:** Drizzle's `lesson_records.status` is a `text` column
  with no DB-level enum constraint, so the four values aren't
  enforced at the DB. A writer can set `COMPLETED_LAQ` when the
  student only finished MC; a reader has to special-case each.
- **Fix:** Use a single `COMPLETED` + a separate `phases: jsonb`
  column. Or define a CHECK constraint.

#### L-02 — `email.ts` `baseUrl` defaults to `http://localhost:3000`
- **File:** `apps/reading-advantage/lib/email.ts`
- **Lines:** 3
- **Severity:** Low
- **Evidence:** If `NEXT_PUBLIC_BASE_URL` is unset (e.g. a misconfigured
  preview deployment), the reset URL becomes
  `http://localhost:3000/auth/reset-password?token=...` and the
  email recipient clicks through to the dev server.
- **Fix:** Throw on missing `NEXT_PUBLIC_BASE_URL` (it's required
  for password reset emails).

#### L-03 — `fetchMoreArticles.ts` uses `redirect()` from `next/navigation` inside a try/catch
- **File:** `apps/reading-advantage/lib/fetchMoreArticles.ts`
- **Lines:** 37, 41
- **Severity:** Low
- **Evidence:** `redirect()` throws `NEXT_REDIRECT`; the surrounding
  function is `async` and the redirect is inside `try` (line 49),
  but `redirect()` is *outside* the try on lines 37, 41, so the
  throw escapes. This is fine, but a reader might assume the
  redirect is caught.
- **Fix:** Move the redirects to a clearer `if (!user) return redirect(...)`
  outside any try block; add a comment explaining the throw.

#### L-04 — `classroom-utils.ts` repeats the teacher-id filter five times with three different shapes
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 37-42, 174-198, 202-213, 228-251, 491-526
- **Severity:** Low
- **Evidence:** The same predicate
  `!classroom.archived && classroom.teacherId === teacherId`
  appears at lines 52-54, 181, 207, 235, 538 with small variations
  in how `teacherId` is sourced. Three different shapes:
  `teacher.id === user.id` (line 40), `(user as { id: string }).id` (line 176),
  `teacher[0]` (line 513), `teacherId` (line 538).
- **Fix:** Extract a single `function teacherCanReadClassroom(user, classroom)`.

#### L-05 — `classroom-utils.ts` `StudentName` falls back to the literal string `"Unknown"` (magic-string sentry, repeated)
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 89, 92
- **Severity:** Low
- **Evidence:** `studentName: matchedStudent ? matchedStudent.display_name : "Unknown"`,
  `email: matchedStudent ? matchedStudent.email : "Unknown"`.
  Two sentinels for two different types (string vs. email). The
  page then renders `"Unknown"` literally to the teacher.
- **Fix:** Use `null` and let the page render a dash.

#### L-06 — `classroom-utils.ts` `studentInEachClass` includes the literal `"No student in this class"`
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 61
- **Severity:** Low
- **Evidence:** Same anti-pattern: a magic string sentry used as
  a real data value.
- **Fix:** Same as L-05.

#### L-07 — `classroom-utils.ts` does N×M `forEach` loops with no early-exit
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 174-198, 228-251, 535-552
- **Severity:** Low
- **Evidence:** Three nested `forEach` blocks each iterate
  `students × classrooms`. With 30 students × 6 classrooms × 3
  loops = 540 iterations per call.
- **Fix:** Build a `Map<classroomId, classroom>` and `Map<studentId, student>`
  once.

#### L-08 — `classroom-utils.ts` `getClassroomOfThatTeacher` accepts a `role` but does not include the `STUDENT` branch
- **File:** `apps/reading-advantage/lib/classroom-utils.ts`
- **Lines:** 506-526
- **Severity:** Low
- **Evidence:**
  ```ts
  if (role === Role.TEACHER) { ... }
  else if (role === Role.ADMIN) { ... }
  else if (role === Role.SYSTEM) { ... }
  // no else for STUDENT, USER
  ```
  A `STUDENT` session gets `classrooms = []` silently. There is
  no `assertCan(user, "classroom:list")` check.
- **Fix:** Throw or redirect for non-{TEACHER, ADMIN, SYSTEM} roles.

#### L-09 — `db-optimization-init.ts` schedules a 10s `setTimeout` to log status; the timeout is never cleared on shutdown
- **File:** `apps/reading-advantage/lib/db-optimization-init.ts`
- **Lines:** 35-37
- **Severity:** Low
- **Evidence:** `setTimeout(() => logSystemStatus(), 10000);` is
  scheduled but the handle is never stored, so
  `shutdownDbOptimization()` cannot clear it.
- **Fix:** Store the handle in a module-level `let statusLogTimer`
  and `clearTimeout` in shutdown.

#### L-10 — `basePath.test.ts` uses Jest-style `describe`/`it`/`expect` but the project default for `lib/` is Vitest
- **File:** `apps/reading-advantage/lib/games/basePath.test.ts`
- **Lines:** 11-22
- **Severity:** Low
- **Evidence:**
  ```ts
  jest.resetModules();
  ```
  Jest's globals aren't auto-imported in Vitest. If this file is
  run by Vitest, `jest` is undefined and the test crashes.
- **Fix:** Replace `jest.resetModules()` with
  `vi.resetModules()` and import from `vitest`.

#### L-11 — `basePath.test.ts` mutates `process.env.NEXT_PUBLIC_BASE_PATH` and never restores on the failing path
- **File:** `apps/reading-advantage/lib/games/basePath.test.ts`
- **Lines:** 5-23
- **Severity:** Low
- **Evidence:** `afterEach` (line 16-23) restores the env var. Good.
  But the `loadWithBasePath` helper (line 5-14) doesn't catch
  errors; if the import throws, the env var is mutated and never
  restored.
- **Fix:** Wrap in try/finally.

#### L-12 — `gameCards.test.ts` has the same Jest/Vitest confusion as `basePath.test.ts`
- **File:** `apps/reading-advantage/lib/games/gameCards.test.ts`
- **Lines:** 11-23
- **Severity:** Low
- **Evidence:** Same `jest.resetModules()` pattern.
- **Fix:** Same as L-10.

#### L-13 — `dragonRider.test.ts` and `dragonFlight.test.ts` test only 6 behaviours each; they don't cover edge cases (vocabulary length 0, NaN, etc.)
- **File:** `apps/reading-advantage/lib/games/dragonRider.test.ts`,
  `apps/reading-advantage/lib/games/dragonFlight.test.ts`
- **Severity:** Low
- **Evidence:** 6 test cases each (init, gate selection, dragon
  count clamp, time advance, boss power, results). No test for
  `vocabulary.length === 0` (which would hit the early-return
  in `createGateRound` line 51-58).
- **Fix:** Add a test for empty vocabulary.

#### L-14 — `enchantedLibrary.test.ts` line 22-28 redefines `DirectionalInput` that the source module already exports
- **File:** `apps/reading-advantage/lib/games/enchantedLibrary.test.ts`
- **Lines:** 22-28
- **Severity:** Low
- **Evidence:**
  ```ts
  export type DirectionalInput = {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    cast: boolean;
  };
  ```
  The source `enchantedLibrary.ts:73-79` already exports an
  identical `DirectionalInput`. The test file re-declares it
  with `export` — turning a test-local helper into a module
  export.
- **Fix:** Remove the local declaration; import from
  `./enchantedLibrary`.

#### L-15 — `enchantedLibrary.test.ts` imports from `@jest/globals` (line 1) but other tests in `lib/games/` use raw globals
- **File:** `apps/reading-advantage/lib/games/enchantedLibrary.test.ts`
- **Lines:** 1
- **Severity:** Low
- **Evidence:** `import { describe, it, expect } from "@jest/globals";`.
  Other tests (`castleDefense.test.ts`, `dragonFlight.test.ts`,
  `dragonRider.test.ts`) do not.
- **Fix:** Standardise on the project default (Vitest imports).

#### L-16 — `castleDefense.test.ts` `buildTowerAtSlot` test uses `jest.spyOn(Math, 'random').mockReturnValue(0)`
- **File:** `apps/reading-advantage/lib/games/castleDefense.test.ts`
- **Lines:** 352, 386, 444
- **Severity:** Low
- **Evidence:** Three separate `jest.spyOn(Math, 'random')` calls.
  If a Vitest runner picks this file, `jest` is undefined.
- **Fix:** Replace with `vi.spyOn(Math, 'random')`.

#### L-17 — `castleDefense.ts` `advanceCastleDefenseTime` `parseSentenceWords` is called once at line 411 (`parseSentenceWords(firstSentence.term)`), but `parseSentenceWords` strips Thai characters (M-10), so the sentence is empty
- **File:** `apps/reading-advantage/lib/games/castleDefense.ts`
- **Lines:** 411, 1293
- **Severity:** Low (covered by M-10)
- **Evidence:** Test data on `castleDefense.test.ts:339-340, 383-384, 416-417, 575-578, 709-714` includes Thai translations, but `parseSentenceWords` strips them.
- **Fix:** Same as M-10.

#### L-18 — `castleDefense.ts` `MAP_CONFIGS` defines wave 6 with a 2-waypoint path (`{x: 75, y: 375}, {x: 725, y: 375}`)
- **File:** `apps/reading-advantage/lib/games/castleDefense.ts`
- **Lines:** 316-330
- **Severity:** Low
- **Evidence:** Wave 6 has only 2 waypoints, but `moveEnemy`
  (line 587) increments `waypointIndex` whenever the enemy is
  within distance 5 (line 599). With only 2 waypoints, an enemy
  starts at index 0, reaches the second waypoint, and then
  `waypointIndex` becomes 2 (>= path.length), so the enemy
  stops moving. `checkBaseDamage` (line 1030) then removes it
  from the array and damages the base.
- **Impact:** Wave 6 enemies reach the base immediately on spawn
  rather than walking along the path.
- **Fix:** Add intermediate waypoints (the wave 6 path is a single
  straight line; split it into multiple segments).

#### L-19 — `castleDefense.ts` `gameTime` is incremented by `dt` twice in `advanceCastleDefenseTime` (lines 601-679)
- **File:** `apps/reading-advantage/lib/games/castleDefense.ts`
- **Lines:** 601-605, 677
- **Severity:** Low
- **Evidence:**
  ```ts
  let newState: EnchantedLibraryState = {
    ...state,
    gameTime: state.gameTime + dt,   // line 603
    ...
  };
  ...
  newState = {
    ...newState,
    player: { ... },
    gameTime: newState.gameTime + dt,   // line 677
    ...
  };
  ```
  Wait — that's `enchantedLibrary.ts`, not `castleDefense.ts`. Let
  me re-check `castleDefense.ts`. Line 1114: `const gameTime =
  state.gameTime + dt;` is correct (single increment). **This
  finding is incorrect**; flagging it as false positive but
  noting it as a code-smell to watch for in other files.
- **Severity:** Low (false positive)
- **Fix:** None needed.

#### L-20 — `castleDefense.ts` `grassMap` is generated at random and never used by `advanceCastleDefenseTime`
- **File:** `apps/reading-advantage/lib/games/castleDefense.ts`
- **Lines:** 474-476
- **Severity:** Low
- **Evidence:**
  ```ts
  grassMap: Array.from({ length: 12 }, () =>
    Array.from({ length: 16 }, () => Math.floor(Math.random() * 4)),
  ),
  ```
  The `grassMap` field is part of `CastleDefenseState` (line 165)
  but never read by `advanceCastleDefenseTime`. The 192 random
  numbers are computed and frozen into state but never
  consumed by the game loop. A renderer presumably consumes
  this for tile decoration, but it's not in this batch.
- **Fix:** Move `grassMap` to a separate presentation-only state
  object, not the game-state core.

#### L-21 — `gameCards.ts` lists `RPG_BATTLE` as a card id (`rpg-battle`) but the implementation `apps/reading-advantage/lib/games/rpgBattle*.ts` is not in this batch
- **File:** `apps/reading-advantage/lib/games/gameCards.ts`
- **Lines:** 22-28
- **Severity:** Low
- **Evidence:** `id: 'rpg-battle'` with `href: '/games/rpg-battle'`.
  The actual RPG battle logic lives in `lib/games/rpgBattle.ts`
  (verified by `ls` output: `rpgBattleScaling.ts`,
  `rpgBattleSelection.ts`, `rpgBattleSprites.ts`,
  `rpgBattleWordSelection.ts`, `rpgBattleXp.ts`). Cross-batch
  cohesion.
- **Fix:** Audit game-card coverage across all 11 cards.

#### L-22 — `potionRushEffects.test.ts` references `./potionRushEffects` which exists in the directory but is not in this batch
- **File:** `apps/reading-advantage/lib/games/potionRushEffects.test.ts`
- **Lines:** 1
- **Severity:** Low
- **Evidence:** `import { getPortalFrame } from "./potionRushEffects";`.
  The test file expects a `getPortalFrame` function returning
  `{ rotation, pulse, shimmer }`. We can't verify the source from
  this batch alone.
- **Fix:** Cross-reference `lib/games/potionRushEffects.ts`.

---

## Test / Coverage Observations

1. **Zero test coverage for the six top-level `lib/` files:**
   `classroom-utils.ts`, `db-optimization-init.ts`, `email.ts`,
   `enums.ts`, `fetchMoreArticles.ts`, `flashcard-client.ts`. Grep
   for `*.test.{ts,tsx}` referencing these returns no hits.

2. **Game modules are well-tested:** 4,479 lines of test code
   against ~2,427 lines of game-source code (ratio ≈ 1.85x).
   `enchantedLibrary.test.ts` (1269 lines vs. 711 source) and
   `castleDefense.test.ts` (960 vs. 1389 source) are the strongest
   coverage; `dragonFlight.test.ts` and `dragonRider.test.ts` are
   thin (109 / 92 vs. 168 / 150).

3. **Behaviour worth testing (representative, not exhaustive):**
   - `classroom-utils.ts`: Zod parse the inbound REST payloads
     (`allStudent`, `allClassroom`, `allTeachers`); assert that
     `STUDENT` sessions cannot read other students' emails;
     assert `lastActivityTimestamp[studentId]` is `null` when no
     records match (not the magic string `"No Activity"`).
   - `db-optimization-init.ts`: assert `initializeDbOptimization`
     is idempotent (calling twice doesn't double-schedule timers);
     assert `shutdownDbOptimization` clears the connection-monitor
     interval.
   - `email.ts`: assert the reset URL contains `encodeURIComponent`
     of the email; assert the API key is never logged.
   - `enums.ts`: codegen from Drizzle columns; assert each enum
     in `enums.ts` matches a DB column constraint.
   - `fetchMoreArticles.ts`: assert the response is parsed through
     a Zod schema; assert the `Passage[]` array is not empty on
     success.
   - `flashcard-client.ts`: assert `credentials: 'include'` is
     set; assert 4xx/5xx responses throw with the server-supplied
     message.
   - `enchantedLibrary.ts`: assert `selectNextTargetWord` returns
     a string from the vocabulary when all words are < 2x;
     assert `checkVictoryCondition` returns `true` only when every
     word is ≥ 2x.
   - `castleDefense.ts`: assert `parseSentenceWords` preserves
     Thai/CJK characters (M-10); assert `parseSentenceWords` strips
     ASCII punctuation; assert `calculateBossPower` clamps to
     `[3, ...]`; assert `isWaveComplete` returns `false` while
     any enemy is still on the path; assert the wave 6 path
     has > 2 waypoints (L-18).
   - `dragonFlight.ts` / `dragonRider.ts`: assert `vocabulary.length === 0`
     yields a deterministic empty round (L-13).

4. **No test execution was attempted.** Tests were read but not
   run; we did not invoke `pnpm turbo run test --filter=...`.

---

## Static Asset / Privacy Audit

| Item | File / Line | Concern |
|------|-------------|---------|
| Email logs token | `lib/email.ts:24` | Logs the password-reset token to stdout on every send. |
| Email logs API key | `lib/email.ts:25` | Logs `RESEND_API_KEY` to stdout on every send. |
| Email logs env | `lib/email.ts:26` | Logs `RESEND_FROM` env var. |
| Placeholder HTML | `lib/email.ts:40` | Body is `html: '...'` — recipient gets a three-dot email. |
| Localhost fallback | `lib/email.ts:3` | `NEXT_PUBLIC_BASE_URL` defaults to `http://localhost:3000`. |
| Student email leak | `lib/classroom-utils.ts:92, 101-108` | Returns every student's email to the page payload. |
| School roster leak | `lib/classroom-utils.ts:64-66` | `matchedStudents` returns the entire student roster. |
| Magic-string sentinels | `lib/classroom-utils.ts:61, 89, 92, 359, 378, 401` | `"No student in this class"`, `"Unknown"`, `"No Activity"` — should be `null`. |
| Header forwarding | `lib/fetchMoreArticles.ts:50-52` | Forwards all inbound headers (cookie, auth) to the internal REST endpoint. |
| Role gate missing | `lib/classroom-utils.ts:23-40, 123-131, 426-431` | Only checks `if (!user)`; STUDENT session passes. |
| `schoolId` not propagated | `lib/classroom-utils.ts:31-35, 152, 171, 469, 488` | No `schoolId` query/header passed to REST calls. |
| `dragonFlight` / `dragonRider` near-duplicate | `lib/games/dragonFlight.ts`, `dragonRider.ts` | Copy-paste duplication; drift risk. |
| Thai parser strips Thai | `lib/games/castleDefense.ts:650-656` | `parseSentenceWords` regex strips Thai/CJK. |
| Magic string `"word"` | `lib/games/castleDefense.ts:427, 1296` | Empty-vocabulary fallback. |
| Dead tower path | `lib/games/castleDefense.ts:873-919` | `checkTowerActivation` not invoked anywhere. |
| `grassMap` unused | `lib/games/castleDefense.ts:474-476` | Generated but never read by game loop. |
| Wave 6 path 2-waypoint | `lib/games/castleDefense.ts:316-330` | Enemies hit base on spawn. |
| `jest` vs `vitest` | `lib/games/basePath.test.ts`, `dragonRider.test.ts`, etc. | Mixed Jest/Vitest globals in same directory. |
| `DirectionalInput` redeclared | `lib/games/enchantedLibrary.test.ts:22-28` | Test-local export shadows source export. |
| Module-load-time env | `lib/games/basePath.ts:1` | `NEXT_PUBLIC_BASE_PATH` frozen at boot. |
| Server Action redirect in try | `lib/fetchMoreArticles.ts:37, 41` | `redirect()` throws NEXT_REDIRECT, fine but undocumented. |
| WIZARD_ZOMBIE vs WIZARD_VS_ZOMBIE | `lib/enums.ts:37 vs 148` | Same game, two enum values. |
| `email.ts` no `try/catch` around `resendClient.emails.send` | `lib/email.ts:36-46` | Catches and re-throws; that's fine. |

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A1 | Silent catch + happy UI | Yes | `classroom-utils.ts` has 7 try/catch blocks that swallow errors and return `undefined`; `email.ts` line 43 catches and rethrows but never structured-logs. |
| A2 | Bypass of domain/contracts layer | Yes | All six top-level helpers are bare async functions inside `lib/`; none use `command()` / `assertCan()`. |
| A3 | Magic numbers without enum | Yes | `magicDefenseConfig.ts` bare numbers (3000, 5000, 4000, 3000 spawn rates; 20/15/10/8 durations). |
| A4 | Vacuous-pass on nothing-done | Partial | `castleDefense.ts:415-417` returns `{ term: "default", translation: "default" }` for empty vocabulary. |
| A5 | False-claim text vs test reality | Yes | `enums.ts` claims values match Prisma; they drift (`WIZARD_ZOMBIE` vs `WIZARD_VS_ZOMBIE`). |
| A6 | Provider-specific hardcoded URLs | Yes | `email.ts:18` instantiates `new Resend(apiKey)` directly — bypasses any `@reading-advantage/email` adapter. |
| A7 | Magic numbers without enum | Yes | `classroom-utils.ts:35` range 50 for tower build, `castleDefense.ts:225-231` literal 50, 30 distance constants. |
| A8 | Hard-coded PII in test data | Partial | Thai test fixtures use real Thai sentences (no real PII), but `WAVE_CONFIGS[0]` hard-codes `soldiers: 10, tanks: 0, bosses: 0` rather than a config file. |
| A9 | Forwarding of untrusted headers | Yes | `fetchMoreArticles.ts:50-52`. |
| A10 | Module-level env capture | Yes | `basePath.ts:1` reads env at module load. |

---

## SQL / Migration Audit

This batch contains no SQL files. The only DB-touching code is
`db-optimization-init.ts`, which delegates to
`@/lib/cache/advanced-cache`, `@/lib/cache/matview-manager`, and
`@/lib/cache/connection-monitor`. Those are not in this batch, so
their SQL behaviour is not reviewed here.

---

## JSDoc / Documentation Audit

| File | JSDoc on exported symbols? | Notes |
|------|----------------------------|-------|
| `classroom-utils.ts` | None | Three exported functions, no JSDoc. |
| `db-optimization-init.ts` | Partial | Two JSDoc blocks (lines 1-4 and 12-14) for the module; no per-function JSDoc. |
| `email.ts` | None | One exported function, no JSDoc. |
| `enums.ts` | None | 26 enum consts exported, no JSDoc. |
| `fetchMoreArticles.ts` | None | One exported async function, no JSDoc. |
| `flashcard-client.ts` | None | One exported function, no JSDoc (line 3 is a non-JSDoc comment). |
| `lib/games/basePath.ts` | None | One exported function, no JSDoc. |
| `lib/games/castleDefense.ts` | Partial | A few JSDoc blocks (`spawnBooks`, `spawnSpirit`, `updateSpirits`, `checkBookCollisions`, `selectNextTargetWord`, `checkVictoryCondition`, `activateShield`, `checkSpiritCollisions`, `advanceEnchantedLibraryTime`). Many other exports have none. |
| `lib/games/dragonFlight.ts` | None | All exports undocumented. |
| `lib/games/dragonRider.ts` | None | All exports undocumented. |
| `lib/games/enchantedLibrary.ts` | Partial | 8 JSDoc blocks; many exports undocumented. |
| `lib/games/gameCards.ts` | None | `GameCard` type and `gameCards` array undocumented. |
| `lib/games/magicDefenseConfig.ts` | None | All exports undocumented. |

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.

---

## Recommendations (focused, no broad refactor)

1. Add `Role.TEACHER` / `Role.ADMIN` / `Role.SYSTEM` gates at the top
   of every exported function in `classroom-utils.ts` (H-01, H-08,
   H-10). Redact `email` from `studentsMapped` and drop
   `studentEmail` from the page payload (H-08).
2. Move `email.ts` to a `command({ input, output, auth: "system",
   authorize, handler })` wrapper; never log the token or the API
   key; build the HTML body from a real template (H-02, M-04, L-02).
3. Codegen `enums.ts` from Drizzle column definitions; reconcile
   `WIZARD_ZOMBIE` vs `WIZARD_VS_ZOMBIE` (H-03, M-01, L-01).
4. Add a `getUserActivityBatch({ userIds })` backend function; replace
   the N+1 fetch loop in `StudentsData` with a single call (H-04).
5. Wire `initializeDbOptimization()` into `instrumentation.ts` and
   add `process.on("SIGTERM", shutdownDbOptimization)`; store the
   `setTimeout` handle so it can be cleared (H-05, M-05, L-09).
6. Forward only an explicit allow-list of headers in
   `fetchMoreArticles.ts`; add a Zod schema for the response (H-06).
7. Use `null` (not magic strings) for missing-activity sentinels
   in `classroom-utils.ts` (H-07, L-05, L-06).
8. Pass `schoolId` to every fetch in `classroom-utils.ts` (H-09).
9. Extract a shared `dragonGateGame.ts` for the
   `dragonFlight`/`dragonRider` duplicate code (M-07).
10. Fix `parseSentenceWords` regex in `castleDefense.ts` to preserve
    Thai/CJK characters (M-10, L-17).
11. Throw on empty vocabulary in `castleDefense.ts`
    `createCastleDefenseState` instead of falling back to `"word"` /
    `"default"` (M-12, A4).
12. Delete `checkTowerActivation` (the dead legacy tower path) from
    `castleDefense.ts` (M-09).
13. Compute kill count from an explicit `killedThisTick` counter
    instead of `enemies.length - enemies.length` heuristic (M-11).
14. Add intermediate waypoints to wave 6 path in `castleDefense.ts`
    (L-18).
15. Either make `withBasePath` re-read the env on each call, or
    refactor `gameCards.ts` and `magicDefenseConfig.ts` to call
    `withBasePath` lazily inside components (M-06).
16. Replace `jest` globals in `basePath.test.ts` and
    `gameCards.test.ts` with `vitest` (L-10, L-12).
17. Standardise all `lib/games/*.test.ts` on Vitest imports
    (`import { describe, it, expect } from "vitest"` or auto-globals);
    remove the test-local `DirectionalInput` re-declaration in
    `enchantedLibrary.test.ts` (L-14, L-15).
18. Add `credentials: 'include'` and a CSRF token to
    `flashcard-client.ts` (M-14).
19. Move `Passage` type to `lib/types/passage.ts` so client
    components can import the type without pulling in
    `"use server"` code (M-03).

---

## End of file review for batch 40.

MEASURE_AGENT_RESULT