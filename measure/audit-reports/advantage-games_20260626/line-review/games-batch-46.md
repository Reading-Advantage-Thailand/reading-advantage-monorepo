# Line-by-Line Review — games-batch-46 (FINAL BATCH)

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-46` (final batch of the line-review phase)
**Scope source:** `/tmp/opencode/games-batch-46` (9 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is a **mixed tail batch**: two Playwright e2e specs, two shared e2e helper modules, one app `tsconfig.json`, two `@reading-advantage/db` schema modules, one `@reading-advantage/domain` progress-mutations module, and the shared tenant-registry. Supporting files read for context only (not scored as finding targets): `packages/domain/src/__tests__/tenant-coverage.test.ts`, `packages/db/src/index.ts`, `packages/db/src/schema/index.ts`, `apps/advantage-games/AGENTS.md`.
**Finding ID scheme:** `F-GAMES-B46-###`
**Severity scale:** Critical / High / Medium / Low / Info
**Verification performed:** Ran `pnpm --filter @reading-advantage/domain test -- tenant-coverage` to confirm a registry-coverage finding (see F-GAMES-B46-021). No other execution.

---

## Files Reviewed (9/9)

| # | File | Type | Domain |
|---|------|------|--------|
| 1 | `apps/advantage-games/tests/e2e/games/vocabulary/rune-match.spec.ts` | e2e test | Rune Match (vocab game) |
| 2 | `apps/advantage-games/tests/e2e/games/vocabulary/wizard-vs-zombie.spec.ts` | e2e test | Wizard vs Zombie (vocab game) |
| 3 | `apps/advantage-games/tests/e2e/helpers/gameHelpers.ts` | e2e helper | Shared API-mock / nav / start-screen helpers (24 games) |
| 4 | `apps/advantage-games/tests/e2e/helpers/screenshotHelpers.ts` | e2e helper | Shared screenshot capture helpers (24 games) |
| 5 | `apps/advantage-games/tsconfig.json` | config | advantage-games TS compiler config |
| 6 | `packages/db/src/schema/analytics.ts` | db schema | XP logs, game rankings, AI insights, learning goals |
| 7 | `packages/db/src/schema/primary.ts` | db schema | Primary-advantage additive tables (incl. leaderboards) |
| 8 | `packages/domain/src/progress/mutations.ts` | domain | recordActivity / updateLessonProgress |
| 9 | `packages/domain/src/tenant-registry.ts` | domain | Tenant-scoping classification registry |

---

## Findings

### File 1 — `rune-match.spec.ts`

**F-GAMES-B46-001 · Medium · rune-match.spec.ts:27-30**
The screenshot assertion checks that the returned path *contains* `"/public/games/rune-match/rune-match-gameplay.png"` but **the screenshot is taken into `process.cwd()/public/...` and the assertion never verifies gameplay actually rendered** — it asserts a path string, not pixels or a non-blank canvas. Combined with `captureRuneMatchScreenshot` using `fullPage: true` on a `<canvas>` game (screenshotHelpers.ts:155-158), the artifact may capture a black/empty canvas and the test still passes. This is a screenshot test that cannot fail on the thing it purports to validate (gameplay readiness).

**F-GAMES-B46-002 · Low · rune-match.spec.ts:17**
`page.goto(..., { waitUntil: "domcontentloaded" })` returns before network/JS settles, then the test immediately asserts vocabulary text is visible (lines 20-21). The vocabulary arrives via a mocked async route (`mockRuneMatchApis`, gameHelpers.ts:381-393) with no artificial delay, so this *usually* passes, but the wait strategy is inconsistent with wizard-vs-zombie's `"networkidle"` (file 2, line 17) — no shared convention for canvas-game load synchronization across the suite.

**F-GAMES-B46-003 · Low · rune-match.spec.ts:25**
`expect(page.locator("canvas")).toBeVisible()` will throw strict-mode violation if the React-Konva stage renders more than one `<canvas>` (Konva commonly emits a content canvas plus a hit-graph canvas). wizard-vs-zombie.spec.ts:25 defensively uses `.first()`; this spec does not. The two sibling specs disagree on canvas-locator robustness.

**F-GAMES-B46-004 · Info · rune-match.spec.ts:11-31**
The single test exercises only load → start-screen → click "Start Game" → canvas-visible → screenshot. There is **no assertion of scoring, XP, match correctness, win/lose, or completion-API payload** even though the complete-route is mocked (gameHelpers.ts:395-408). Game-readiness (the stated review focus) for scoring/progress is not covered by this e2e; it is a smoke/screenshot test only.

### File 2 — `wizard-vs-zombie.spec.ts`

**F-GAMES-B46-005 · Medium · wizard-vs-zombie.spec.ts:27-28**
The screenshot path assertion is weaker than rune-match's: it only checks the path contains `"/public/games/wizard-vs-zombie/"` (a directory), not the file name. Same structural weakness as F-GAMES-B46-001 — the test asserts a substring of a path it constructed, not that gameplay rendered. It cannot detect a blank/failed canvas.

**F-GAMES-B46-006 · Low · wizard-vs-zombie.spec.ts:22-23**
`getByRole("button", { name: /start/i })` is a loose regex matching any button whose accessible name contains "start" (e.g. "Restart", "Start Over", "Get Started"). On a start screen with one button this is fine, but it is fragile relative to rune-match's `/start game/i`. No shared start-button contract across games.

**F-GAMES-B46-007 · Info · wizard-vs-zombie.spec.ts:20**
Only `WIZARD_VS_ZOMBIE_SAMPLE_VOCABULARY[0].term` is asserted visible; unlike rune-match (which also asserts `.translation`, line 21), the translation/definition rendering is not verified. Minor coverage asymmetry between the two vocab specs.

### File 3 — `gameHelpers.ts`

**F-GAMES-B46-008 · Medium · gameHelpers.ts:68, 84, 113, 127, 155, 169, 197, 211, 247, 261, 289, 303, 331, 345, 381, 395, 424, 432 (route-glob inconsistency)**
The mock route patterns are inconsistent across games. Archers-Revenge uses `**/api/v1/games/archers-revenge/vocabulary` (glob prefix), while Dragon-Flight, Dragon-Rider, Enchanted-Library, Magic-Defense, Paladins, RPG-Battle, Rune-Match, and Wizard-vs-Zombie use a **leading-slash absolute** pattern `/api/v1/games/<game>/vocabulary` with **no `**` prefix**. Playwright matches `page.route` globs against the full URL; an absolute `/api/...` pattern only matches if the request URL begins exactly there (it is treated relative to baseURL). The sentence games (lines 454, 484, 514, 544, …) all use `**/.../sentences**`. This inconsistency means some mocks may silently fail to intercept (request hits the network / real handler) while others work, producing flaky or falsely-green tests. There is no single shared route-mock helper; the contract is copy-pasted 24 times with divergent globbing.

**F-GAMES-B46-009 · Medium · gameHelpers.ts:454-461, 484-491, 544-551, 574-581, 604-611, 634-641, 671-678, 701-708 vs 514-519, 772-776, 802-806, 832-837, 862-867, 892-897, 922-927, 731-741, 749-757**
The mocked sentence-API response **shape is not normalized**. Some games return `{ vocabulary: sentences }` (Abyssal Well 458, Castle Defense 488, Dungeon Liberator 548, Griffin Riders 578, Griffin Sky Joust 608, Gryphon Patrol 638, Haunted Library 675, Labyrinth 705), while others return `{ sentences }` (Devourer Slime 518, Realm Carver 774, Rune Forge 804, Shadow Gate 834, Spellweavers 864, Storm Castle 894, Village Guardian 924, Potion Rush 736). A shared host/import layer cannot assume one response key; this mirrors the production input-contract divergence flagged in earlier batches and means the mocks encode (and thus bless) two incompatible API contracts for the same conceptual endpoint.

**F-GAMES-B46-010 · Medium · gameHelpers.ts:774 (hard-coded payload ignores `sentences` arg)**
`mockRealmCarverApis(page, sentences = REALM_CARVER_SAMPLE_SENTENCES)` accepts a `sentences` parameter but the route handler **ignores it** and returns a hard-coded `sentences: [{ text: "The cat sat on the mat", id: "1" }]`. Any test passing custom sentences to this helper is silently lied to; the helper's signature advertises configurability it does not honor. A latent source of false-confidence tests.

**F-GAMES-B46-011 · Low · gameHelpers.ts:69**
`mockArchersRevengeApis` injects a 250ms `setTimeout` delay before fulfilling the vocabulary route; no other game's mock does. This bespoke latency is presumably to exercise a loading state (`expectArchersRevengeStartScreen` asserts "loading vocabulary", line 101), but the inconsistency is undocumented and makes Archers-Revenge tests slower and structurally different from siblings with no shared rationale.

**F-GAMES-B46-012 · Low · gameHelpers.ts:88, 131, 173, 215, 265, 307, 349, 399, 436, … (xpEarned: 0 in every complete mock)**
Every `/complete` mock returns `xpEarned: 0`. No e2e in this batch (or helper) ever mocks a **non-zero** XP completion, so the XP-display / leaderboard-update path is never exercised end-to-end. The scoring/XP focus area is structurally unverified by the e2e layer: the success payload is always the zero case.

**F-GAMES-B46-013 · Low · gameHelpers.ts:100-103, 142-145, 185-187, 234-237, 276-279, … (start-screen assertions are title-substring only)**
Most `expect…StartScreen` helpers assert only a loose case-insensitive title substring (e.g. `/Wizard/i` line 443, `/Rune Match/i` line 412, `/Devourer|Slime/i` line 533). These verify a heading exists, not that the start screen is interactive/ready (e.g. enabled Start button, loaded assets). Readiness checks are shallow; a half-broken start screen with the right title text would pass.

**F-GAMES-B46-014 · Low · gameHelpers.ts:526-528 vs 514-520 (Devourer Slime response keys mismatch within one mock)**
`mockDevourerSlimeApis` returns the sentences payload under key `sentences` (line 518) for the GET but uses the `ApiResponse` type for the complete route (which declares `vocabulary?`). The local untyped object literal (line 515) escapes the `ApiResponse` contract entirely (it has a `sentences` field not present on `ApiResponse`), so the mock's shape is type-unchecked. Several sentence mocks (Realm Carver 772, Rune Forge 802, etc.) similarly use untyped literals, bypassing the `ApiResponse` type guard that the vocab mocks use.

**F-GAMES-B46-015 · Info · gameHelpers.ts:56-62**
The shared `ApiResponse` type unions vocab and game-completion fields (`vocabulary?`, `xpEarned?`, `activityId?`) but has no `sentences` field, which is why sentence mocks fall back to untyped literals (F-GAMES-B46-014). A single discriminated response type covering both vocab and sentence games would tighten the shared contract. Recorded as a design observation.

### File 4 — `screenshotHelpers.ts`

**F-GAMES-B46-016 · Medium · screenshotHelpers.ts:64-67, 77-80, … (every capture uses `fullPage: true`)**
All 24 capture helpers screenshot with `fullPage: true`. For a fixed-viewport, portrait mobile-first canvas game (390×844 per AGENTS.md), `fullPage` captures the scroll height of the document, not the game viewport — if the page has any overflow or the canvas is sized by JS after paint, the artifact will not represent the on-screen game frame. There is no `clip` to the canvas bounding box and no wait for canvas paint/`requestAnimationFrame` before capture, so artifacts can be blank or misframed. This undermines the screenshots' value as readiness evidence.

**F-GAMES-B46-017 · Low · screenshotHelpers.ts:60, 73, 86, … (writes into `process.cwd()/public/...`)**
Every helper writes the screenshot into `path.join(process.cwd(), <SCREENSHOT_DIR>)` where the dirs resolve under `public/games/...` (per the rune-match assertion). Writing test artifacts into the app's **served `public/` tree** pollutes the deployable bundle with test output and can ship gameplay screenshots as static assets. Test artifacts should live under a test-output / `test-results` directory, not `public/`. This is a packaging/hygiene concern for production builds.

**F-GAMES-B46-018 · Info · screenshotHelpers.ts:59-297**
The 24 capture functions are near-verbatim duplicates differing only by two constants; a single `captureGameScreenshot(page, dir, file)` would remove ~230 lines of duplication and the per-function drift risk. No behavioral defect, but a maintainability observation consistent with the duplication in gameHelpers.ts.

### File 5 — `tsconfig.json`

**F-GAMES-B46-019 · Medium · tsconfig.json:18**
The `exclude` list drops all test/spec files from type-checking: `"**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"`. Consequently the Playwright specs (files 1-2) and helpers (files 3-4) — which are `.spec.ts`/helper `.ts` — are **not type-checked by `tsc --noEmit`** for the specs, and the helpers (`gameHelpers.ts`, `screenshotHelpers.ts`) are non-`.spec` files that *are* included but import only from fixtures. This means the route-glob/response-shape mismatches (F-GAMES-B46-008/009/014) get no compile-time backstop on the spec side; type regressions in e2e tests ship silently. For a games app whose readiness leans on e2e, excluding specs from typecheck is a meaningful gap.

**F-GAMES-B46-020 · Low · tsconfig.json:4**
`"target": "ES2017"` is conservative for a modern canvas/animation game (no native `Object.fromEntries`, `Array.flat`, optional-chaining lowering overhead, etc. are down-leveled). While `lib` includes `esnext`, the emit target lowers syntax and can bloat bundle size for the mobile/low-end target. Not a defect, but worth confirming against the actual minimum-browser matrix for the games (mobile-browser-compat focus). No browserslist or documented target matrix is referenced from this config.

### File 6 — `analytics.ts`

**F-GAMES-B46-021 · High · analytics.ts:8-34 (xpLogs / gameRankings) — corroborated by failing tenant-coverage test**
`xpLogs` and `gameRankings` are the core scoring/XP/leaderboard tables for the games. Both are classified `REFERENTIAL` in tenant-registry.ts (lines 175-176), meaning they have **no `schoolId` column** and are scoped only via `userId` FK. For a leaderboard table this is a real multi-tenancy risk: a leaderboard query that joins `gameRankings → users.schoolId` is the *only* tenant boundary, and any leaderboard read that forgets that join leaks cross-school rankings. The schema itself (lines 22-34) has a unique constraint on `(userId, gameType, difficulty)` but **no `schoolId`**, so the DB cannot enforce per-school isolation; it is entirely dependent on every caller using `tenantDb.unscoped(...)` + a manual owner-FK join. This is the highest-impact importability/leaderboard concern in the batch. (See also F-GAMES-B46-026.)

**F-GAMES-B46-022 · Medium · analytics.ts:14-15, 27**
`xpLogs.activityType` and `gameRankings.gameType` are bare `text` columns with no enum/check constraint, while `primary.ts:34-52` defines an `activityType` pgEnum (17 values) that explicitly does *not* include any game-specific types (e.g. `VOCABULARY_MATCHING` exists but no `RUNE_MATCH`/`WIZARD_VS_ZOMBIE`/sentence-game identifiers). So game completions writing `activityType`/`gameType` strings have **no shared, validated vocabulary** — each game's API can write arbitrary strings. This is a scoring-integrity / importability gap: Reading/Primary cannot reliably group, rank, or report game XP without an agreed enum, and the enum that exists (primary.ts) omits games entirely.

**F-GAMES-B46-023 · Low · analytics.ts:29**
`gameRankings.totalXp` is `integer` with `default(0)`. There is no non-negative check; a buggy game client (several reducers in earlier batches persist uncapped or raw XP — cf. batch-39 F-GAMES-B39-005) could write arbitrary or negative totals. The leaderboard table trusts the client-computed XP with no DB-side bound. Validation must therefore live entirely in the (out-of-batch) domain/route layer, which is unverified here.

**F-GAMES-B46-024 · Info · analytics.ts:1-3, comments lines 6, 20, 36, 60**
The "reshaped to match Prisma X" / "PORT-AS-IS" comments indicate these tables are migration ports, not greenfield. The XP/ranking shape is inherited from the legacy Prisma model, which explains the lack of `schoolId` (the legacy app was effectively single-tenant). Recorded as context for F-GAMES-B46-021: the tenant risk is inherited, not newly introduced, but is still live for any multi-school games deployment.

### File 7 — `primary.ts`

**F-GAMES-B46-025 · High · primary.ts:227-233 (leaderboards) — UNCLASSIFIED in tenant registry**
`leaderboards` is a **FLAT-shaped** table — it has a nullable `schoolId` column (line 229) referencing `schools.id` — but it is **not registered in tenant-registry.ts at all** (grep of the registry for `leaderboards` returns nothing; see Verification). Per the registry's own doctrine (tenant-registry.ts:10 and tenant-coverage.test.ts:42-56) this is a build failure. `leaderboards` is directly in the games' scoring/leaderboard focus area, and it is the *one* games-relevant table that actually has a `schoolId` (so it should be `FLAT`), yet it is invisible to tenant enforcement. This is the most concrete leaderboard-tenancy defect in the batch.

**F-GAMES-B46-026 · High · primary.ts:83-233 (NINE tables unclassified) — confirmed by failing coverage test**
None of the tables defined in `primary.ts` are registered in `tenant-registry.ts`: `verificationTokens` (83), `userRoles` (98), `roles` (117), `articleActivityLogs` (132), `sentencsAndWordsForFlashcards` (158), `cardReviews` (177), `clozeTestGames` (192), `schoolAdmins` (208), `leaderboards` (227). They are exported via `schema/index.ts:16` (`export * from "./primary.js"`) and thus picked up by the coverage test, which **fails** (see Verification: 3 failing assertions, error `Table "verification_tokens" is not classified`). The registry-coverage CI gate is currently red. `articleActivityLogs` and `leaderboards` carry `schoolId`/owner data; leaving them unclassified means no tenant-scoping decision has been made for them — a multi-tenancy correctness hole, not merely a lint gap.

**F-GAMES-B46-027 · Medium · primary.ts:229 (`schoolId` nullable on leaderboards)**
`leaderboards.schoolId` is **nullable** (`.references(...)` with no `.notNull()`). A null-school leaderboard row is global/cross-tenant by construction. If classified `FLAT`, the TenantDB auto-injection `eq(table.schoolId, tenant.schoolId)` would silently exclude null-school rows (or, on insert, allow a global row to be written). The nullable tenant key on a leaderboard is an ambiguous tenancy contract that needs an explicit decision before this table is wired to any games leaderboard UI.

**F-GAMES-B46-028 · Low · primary.ts:158 (`sentencs_and_words_for_flashcard` — typo in table name)**
The Drizzle table is named `sentencsAndWordsForFlashcards` and maps to the SQL table `"sentencs_and_words_for_flashcard"` (note the misspelling "sentencs" and the singular/plural mismatch between the TS identifier `...Flashcards` and the SQL name `...flashcard`). This is a ported legacy typo (comment lines 154-156) now frozen into the Drizzle schema and any migration. Cosmetic, but it will propagate to queries/joins and is awkward for a host app importing the schema.

**F-GAMES-B46-029 · Low · primary.ts:117-122 vs 98-110 (forward reference / ordering)**
`userRoles` (line 98) references `roles` (line 117) which is **declared after** it. Drizzle's lazy `() => roles.id` callback tolerates this at runtime, but the top-down read order is inverted (consumer before producer), and the JSDoc on `roles` (lines 112-116) is what explains `userRoles`. Minor readability issue; no functional defect.

**F-GAMES-B46-030 · Info · primary.ts:34-52**
The `activityType` pgEnum lists 17 values and the comment (lines 27-33) explicitly states existing `userActivity.activityType` / `xpLogs.activityType` columns **remain `text`** for backward compat. So the enum is defined but *not applied* to the analytics columns it is meant to govern (cross-ref F-GAMES-B46-022). The enum is effectively documentation until a follow-up migration adopts it; recorded as the source of the games' un-validated activity-type strings.

### File 8 — `progress/mutations.ts`

**F-GAMES-B46-031 · Medium · mutations.ts:15-41 (recordActivity — no input validation / Zod)**
`recordActivity` accepts `input: { activityType: string; xpEarned?: number; metadata?: string }` and writes it straight to `userActivity` with no Zod validation, no enum check on `activityType` (cf. F-GAMES-B46-022/030), and **no upper bound or non-negativity check on `xpEarned`**. AGENTS.md mandates Zod at every external boundary and requires backend functions to define input/output schemas; this domain mutation — the one that persists game XP — has neither. A game client can submit `xpEarned: 999999` or a negative value and it is recorded verbatim. This is the scoring-integrity choke point and it is unguarded.

**F-GAMES-B46-032 · Medium · mutations.ts:15-41 (no output schema; returns raw row)**
Per AGENTS.md every backend function must define an output schema; `recordActivity` and `updateLessonProgress` both return the raw Drizzle row (`return activity` / `return updated`) with no Zod output contract. Transport-independent callers (workers, tRPC, route handlers) receive an unvalidated shape, and any schema drift in `userActivity`/`lessonProgress` leaks directly to consumers. No `command()` wrapper or explicit contract is used.

**F-GAMES-B46-033 · Low · mutations.ts:26, 64 (authorize == authenticate; no resource/tenant ownership check)**
Both functions call `assertCan(user, "progress:record", tenant)` and then write `userId: user.id`. That is acceptable for self-scoped writes, but there is **no defense** against a future `input` carrying a different user/lesson owned by another tenant — `lessonId` (line 71) is trusted from input and written without verifying the lesson belongs to `tenant.schoolId`. For `updateLessonProgress` the upsert target is `(userId, lessonId)` (line 78); a `lessonId` from another school is silently accepted. Given `lessonProgress` is REFERENTIAL (registry line 205), tenant isolation depends entirely on this unverified FK. Cross-tenant lesson IDs are not rejected.

**F-GAMES-B46-034 · Low · mutations.ts:28, 66 (`unscoped` reason strings — good, but bypasses scoping)**
The two `db.unscoped("... REFERENTIAL, scoped via userId FK")` calls are correctly greppable per AGENTS.md, and using `user.id` (server-derived, line 33/71) rather than a client-supplied userId is the right scoping for the user dimension. Recorded as the intended pattern — but note it provides **no** school-level scoping (F-GAMES-B46-033), only user-level, so it is insufficient if a lesson/activity must also be bounded to the user's school.

**F-GAMES-B46-035 · Info · mutations.ts:5-14, 43-52 (JSDoc present, no @throws for assertCan)**
JSDoc is present and follows the no-types rule, but neither function documents `@throws` for the `assertCan` permission failure (AGENTS.md requires `@throws` where applicable). Both throw if `progress:record` is denied; this is undocumented in the contract.

### File 9 — `tenant-registry.ts`

**F-GAMES-B46-036 · High · tenant-registry.ts:53-240 (primary.ts tables omitted) — root cause of F-GAMES-B46-025/026**
The registry imports and classifies tables from users/classrooms/science/audit/codecamp/content/sales/marketing schemas, but **never imports anything from `./primary.js`'s tables** (`leaderboards`, `schoolAdmins`, `articleActivityLogs`, `cardReviews`, `clozeTestGames`, `verificationTokens`, `userRoles`, `roles`, `sentencsAndWordsForFlashcards`). Because `classifyTable` is fail-closed (lines 36-49) and the coverage test enumerates *all* exported tables, the omission makes the FR-6 gate fail (confirmed: 3 failing assertions). This file is the owning module for the fix; the gap is a registry-completeness bug, not a primary.ts bug per se.

**F-GAMES-B46-037 · Medium · tenant-registry.ts:175-181 (xpLogs/gameRankings as REFERENTIAL with no documented owner-join requirement)**
`xpLogs` and `gameRankings` are registered REFERENTIAL alongside a block comment only for the sales/marketing tables (lines 221-239). There is **no inline note** explaining that these analytics tables are scoped via `users.schoolId` and therefore require an explicit owner-FK join for any cross-school-safe leaderboard read. Given the leaderboard focus, the absence of a documented scoping path (unlike the sales/marketing comments) increases the chance a leaderboard query is written without the join (cross-ref F-GAMES-B46-021).

**F-GAMES-B46-038 · Low · tenant-registry.ts:113-173 (single 60-table import block, manual sync)**
All REFERENTIAL tables are imported in one hand-maintained block and registered in a parallel hand-maintained block (175-240). Adding a table requires editing *two* lists plus the import; the primary.ts omission (F-GAMES-B46-036) is exactly the failure mode this duplication invites. No programmatic guard ties the import list to the registration list beyond the downstream coverage test.

**F-GAMES-B46-039 · Info · tenant-registry.ts:36-49**
Positive: `classifyTable` is correctly fail-closed — unclassified tables throw with an actionable message naming the file to edit. This is the mechanism that surfaced F-GAMES-B46-026 rather than letting an unscoped table leak silently. Good defensive design; the gap is purely that primary.ts was never wired in.

---

## Cross-Cutting Themes

- **Tenant registry is incomplete and the CI gate is currently red (F-GAMES-B46-025, 026, 036).** Nine `primary.ts` tables — including the games-relevant `leaderboards` (which has a `schoolId`) — are unclassified; `pnpm --filter @reading-advantage/domain test -- tenant-coverage` fails with 3 assertions. This is the most severe, objectively-verifiable issue in the batch and directly touches the leaderboard/multi-tenant focus area.
- **Scoring/XP has no validated vocabulary or bounds (F-GAMES-B46-022, 023, 030, 031).** `activityType`/`gameType`/`totalXp` are free `text`/`integer` with no enum or non-negativity check; the one `activityType` enum that exists omits games entirely and is not applied to the analytics columns; `recordActivity` writes client-supplied `xpEarned` with no Zod validation or cap. Combined with earlier batches' uncapped reducer XP, there is no end-to-end scoring-integrity guarantee.
- **Leaderboard tenancy is structurally fragile (F-GAMES-B46-021, 025, 027, 037).** `xpLogs`/`gameRankings` have no `schoolId` (REFERENTIAL, owner-join only); `leaderboards` has a *nullable* `schoolId` and is unregistered. Importing leaderboards into Reading/Primary requires every read to perform a manual, undocumented owner-FK join — a leak risk.
- **e2e tests are smoke/screenshot only (F-GAMES-B46-001, 004, 005, 012, 013, 016).** No spec asserts scoring, XP, win/lose, or non-zero completion payloads; screenshot assertions check self-constructed path strings, not rendered pixels, and `fullPage` capture on a fixed-viewport canvas game can yield blank/misframed artifacts. Game readiness for the scoring path is unverified at the e2e layer.
- **Shared e2e helpers encode divergent contracts (F-GAMES-B46-008, 009, 010, 014).** Route globs are inconsistent (absolute vs `**`-prefixed), sentence responses use two incompatible keys (`vocabulary` vs `sentences`), and one helper ignores its own `sentences` argument. The duplication (24× copy-paste in both helpers) is the substrate for this drift.
- **Build/typecheck hygiene (F-GAMES-B46-019, 017).** Spec files are excluded from `tsc`, so e2e contract mismatches get no compile backstop; screenshots are written into the served `public/` tree, polluting the deployable bundle.
- **Positive patterns worth keeping (F-GAMES-B46-034, 039).** `unscoped()` reason strings are greppable and server-derived `user.id` is used for scoping; `classifyTable` is fail-closed with actionable errors. The registry mechanism is sound — it simply was not wired to `primary.ts`.

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 4 | 021, 025, 026, 036 |
| Medium | 11 | 001, 005, 008, 009, 010, 019, 022, 027, 031, 032, 037 |
| Low | 16 | 002, 003, 006, 011, 012, 013, 014, 016, 017, 020, 023, 028, 029, 033, 034, 038 |
| Info | 8 | 004, 007, 015, 018, 024, 030, 035, 039 |

Total findings: **39** (F-GAMES-B46-001 … F-GAMES-B46-039).

---

## Limitations

1. **Scope is exactly the 9 listed files.** Production game reducers/components, route handlers, leaderboard read queries, and the domain functions that *call* `recordActivity`/`updateLessonProgress` are out of batch; tenancy/scoring correctness at the call sites was inferred from the schema/registry/mutation contracts, not observed. Accessibility, audio, asset budgets, mobile/touch, and `prefers-reduced-motion` live in the (out-of-batch) view layer and could not be verified from these files.
2. **One targeted test execution.** I ran `pnpm --filter @reading-advantage/domain test -- tenant-coverage` to confirm F-GAMES-B46-026/036 (result: 3 failing assertions, `verification_tokens` not classified). No other tests were run, the app was not built, and the Playwright e2e specs were not executed — findings about screenshot blankness, route-mock interception, and canvas visibility are from static reading.
3. **The tenant-coverage failure may be pre-existing / known.** `primary.ts` was added under `primary_advantage_drizzle_migration_20260526` (commit `31056ab5`); the registry omission predates this review. I record it as a live, currently-failing gate without attributing it to the games work.
4. **Cross-references to non-batch files** (`tenant-coverage.test.ts`, `db/src/index.ts`, `schema/index.ts`, app AGENTS.md) were read for context only and are not scored as finding targets.
5. **No acceptance or closeout determination is made here.** As the final line-review batch, this report records line-anchored findings for its 9 files only. It makes **no** claim that the batch, the line-review phase, the track, or the overall games review is accepted, complete, verified, or closed; phase/track acceptance and closeout are explicitly out of scope for this report.
