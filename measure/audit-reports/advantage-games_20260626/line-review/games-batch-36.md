# Line-by-Line Review — games-batch-36

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-36`
**Scope source:** `/tmp/opencode/games-batch-36` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited.
**Finding ID scheme:** `F-GAMES-B36-###`
**Severity scale:** Critical / High / Medium / Low / Info

This batch is a mixed bag of **shared library code** and **game logic + tests**:

- **Shared runtime / app plumbing** — `adaptive-difficulty/session-persistence.ts` (localStorage hints), `basePath.ts` (+ test), `gameCards.ts` (+ test, the home-menu catalog), `__tests__/gameDataArrays.test.ts` (content-sufficiency guard).
- **abyssal-well** — `abyssalWell.ts`, `abyssalWellConfig.ts` and both unit tests (full game logic in this batch).
- **alchemists-synthesis** — `alchemistsSynthesis.ts` + co-located test (full game logic in this batch).
- **Tests-only for games whose logic/config live in other batches** — `griffinSkyJoust.test.ts`, `labyrinthGoblinKing.test.ts`, `labyrinthGoblinKingConfig.test.ts`, `realmCarver.test.ts`, `realmCarverConfig.test.ts`, `stormCastleTower.test.ts`, `stormCastleTowerConfig.test.ts`, `villageGuardian.test.ts`.

For context-only anchoring, the corresponding `*.ts` source files for the tests-only games (e.g. `griffinSkyJoust.ts`, `stormCastleTowerConfig.ts`, `labyrinthGoblinKingConfig.ts`, `villageGuardian.ts`) were **not** in this batch and were **not** opened; findings on those tests are anchored to the test files themselves and to the behavior they assert.

---

## Files Reviewed (20/20)

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `lib/adaptive-difficulty/session-persistence.ts` | Logic | localStorage hint store |
| 2 | `lib/basePath.test.ts` | Test | Jest, env-driven |
| 3 | `lib/basePath.ts` | Logic | base-path prefixer |
| 4 | `lib/gameCards.test.ts` | Test | Jest + `fs` introspection |
| 5 | `lib/gameCards.ts` | Data | Home-menu catalog (29 cards) |
| 6 | `lib/games/__tests__/abyssalWell.test.ts` | Test | Jest, seeded RNG |
| 7 | `lib/games/__tests__/abyssalWellConfig.test.ts` | Test | Jest |
| 8 | `lib/games/__tests__/gameDataArrays.test.ts` | Test | Content guard + `fs` reads |
| 9 | `lib/games/__tests__/griffinSkyJoust.test.ts` | Test | Jest, mutates state |
| 10 | `lib/games/__tests__/labyrinthGoblinKing.test.ts` | Test | Jest |
| 11 | `lib/games/__tests__/labyrinthGoblinKingConfig.test.ts` | Test | Jest |
| 12 | `lib/games/__tests__/realmCarver.test.ts` | Test | Jest, mutates state |
| 13 | `lib/games/__tests__/realmCarverConfig.test.ts` | Test | Jest |
| 14 | `lib/games/__tests__/stormCastleTower.test.ts` | Test | Jest |
| 15 | `lib/games/__tests__/stormCastleTowerConfig.test.ts` | Test | Jest |
| 16 | `lib/games/__tests__/villageGuardian.test.ts` | Test | Jest, spies Math.random |
| 17 | `lib/games/abyssalWell.ts` | Logic | Tempest-style game core |
| 18 | `lib/games/abyssalWellConfig.ts` | Config | Constants + helpers |
| 19 | `lib/games/alchemistsSynthesis.test.ts` | Test | Co-located, Jest |
| 20 | `lib/games/alchemistsSynthesis.ts` | Logic | MCQ-merge game core |

---

## Findings

### F-GAMES-B36-001 · High · Game catalog hardcodes the `/en/` locale in every `href`
`gameCards.ts:18,26,34,...,242` — every `href` is literally `/en/student/games/...`. The catalog is the entry point into all games, and the locale segment is fixed to English. When this catalog (or the games it points at) is imported into Reading/Primary — which are multi-locale shells — a Spanish/Thai/Chinese learner clicking a card is navigated to the English route. The matching test even encodes the optional-locale shape (`gameCards.test.ts:39` regex `^/([a-z]{2}\/)?student\/games\/`), confirming the route is *supposed* to be locale-aware, yet the data is not. Hrefs should be locale-relative (resolved by the host router) or built from the active locale, not a baked-in `/en/`.

### F-GAMES-B36-002 · High · `href` ignores `withBasePath` while `cover` uses it — base-path routing breaks
`gameCards.ts:17-18` (and every card): `cover` is wrapped in `withBasePath(...)` but `href` is a raw string. Under a non-empty `NEXT_PUBLIC_BASE_PATH` (e.g. `/vocab`, exactly the case `gameCards.test.ts:43-49` exercises for covers), cover images resolve to `/vocab/games/...` but navigation targets resolve to `/en/student/...` with **no** base-path prefix. On a deployment served under a sub-path this produces broken links (404) while images load — a silent, environment-specific routing defect that the test suite does not catch (the base-path test asserts only `cover`, never `href`).

### F-GAMES-B36-003 · High · `session-persistence` write/clear paths call `localStorage` unguarded — can throw at runtime
`session-persistence.ts:25-27` (`setStorageData`) and `:91-93` (`clearAllSessionHints`) call `localStorage.setItem` / `localStorage.removeItem` with no `try/catch` and no `typeof window`/`typeof localStorage` guard. `getStorageData` (lines 10-22) *is* defensively wrapped, but the setters are not. Consequences for a shared runtime imported into Reading/Primary: (a) Safari Private Mode and storage-quota-exceeded throw `QuotaExceededError` on `setItem`, propagating up through `saveSessionHint`/`clearSessionHint` into the game loop and potentially crashing the round; (b) if any of these run during SSR/prerender (no `window`), they throw `ReferenceError`. Mirror the read-side guard on the write/clear side.

### F-GAMES-B36-004 · Medium · `stormCastleTowerConfig.test.ts` references types it never imports — type-check / ts-jest break
`stormCastleTowerConfig.test.ts:51` uses `undefined as StormCastleTowerDifficulty` and `:77` uses `undefined as GuardType`, but the import block (`:1-5`) only imports `STORM_CASTLE_TOWER_CONFIG`, `getDifficultyConfig`, `getGuardSpeedMult` — **not** those two types. Under `tsc`/ts-jest (non-isolatedModules) this is `TS2304: Cannot find name 'StormCastleTowerDifficulty'`, failing `check-types` and potentially the test build; under babel-jest the annotation is stripped and the test silently passes, masking the error. Either way the test file is not type-sound. (Contrast `stormCastleTowerConfig.test.ts` style with `abyssalWellConfig.test.ts:5-6`, which correctly imports `AbyssalWellDifficulty`/`CreatureType` for its `as` casts.)

### F-GAMES-B36-005 · Medium · abyssal-well difficulty is stored but has zero gameplay effect
`abyssalWell.ts:57,79` stores `difficulty` on state, and `abyssalWellConfig.ts:36-40` defines per-difficulty `wordCount` (4/5/6), but `createAbyssalWellState` never reads `difficulty.wordCount` — it always uses `sentence.term.split(' ')` (line 62) verbatim. Enemy motion (`updateEnemies`, `abyssalWell.ts:172-183`) is driven by `getCreatureSpeed(state.creatureType)`, not difficulty, and spawn cadence is the caller's concern. Net effect: easy/medium/hard differ in nothing the player experiences. `getDifficultyConfig` is exercised by `abyssalWellConfig.test.ts:47-69` but never wired into the game, so the difficulty axis (used by the adaptive-difficulty layer in file #1) is a no-op for this title. This is a scoring/difficulty-fidelity gap and an importability concern for graded play.

### F-GAMES-B36-006 · Medium · alchemists-synthesis uses non-injectable `Math.random()` — non-deterministic, untestable, words can repeat or never appear
`alchemistsSynthesis.ts:30,58,110` call `Math.random()` directly for shuffling and option generation, unlike the rest of the batch which injects an `rng` (`abyssalWell.ts:56`, `stormCastleTower.test.ts:22-23` seeded RNG, etc.). Consequences: (a) no deterministic replay/seed support, so the co-located test (`alchemistsSynthesis.test.ts`) cannot assert *which* word/options appear and instead asserts only counts; (b) `handleAnswer` (lines 110-112) re-shuffles the **full** vocabulary every round with no used-word tracking, so the same word can repeat across rounds while others never appear — a pedagogy defect (uneven coverage of the vocab set). `generateOptions` (lines 54-56) always takes the *first three* non-matching items after a shuffle, so distractor variety also depends entirely on the unseeded shuffle.

### F-GAMES-B36-007 · Medium · XP formulas are inconsistent across games — cross-game XP/leaderboard not normalized
Two distinct XP models appear in this batch:
- `abyssalWell.ts:291-308` (`calculateXP`): `min(10, correctWords + bonuses)` where bonuses are accuracy/survival/speed flags. Matches the `villageGuardian`/`griffinSkyJoust` style asserted in their tests (`villageGuardian.test.ts:428-461`, `griffinSkyJoust.test.ts:135-144` → `correct*1 + 2 + 2`).
- `alchemistsSynthesis.ts:142` (`getAlchemistsSynthesisResults`): `Math.floor(correctAnswers * accuracy)` — no cap, no bonus structure, no difficulty term. For 2/3 correct this yields `floor(1.33)=1` (`alchemistsSynthesis.test.ts:183`), i.e. a learner who answers most questions right earns ~1 XP, while abyssal-well awards up to 10. None of the formulas include a difficulty multiplier (compounding F-GAMES-B36-005). If XP feeds a shared leaderboard/progress model in Reading/Primary, these scales are not comparable.

### F-GAMES-B36-008 · Medium · Inconsistent mobile reference resolution across games (700 vs 600 vs 844)
The batch contains three different canvas heights at width 390:
- `abyssalWellConfig.test.ts:12-13` & `labyrinthGoblinKingConfig.test.ts:5-6` & `stormCastleTowerConfig.test.ts:10-11` & `villageGuardian.test.ts:24-25` → `390×700`.
- `realmCarverConfig.test.ts:5-6` → `390×600`.
- `alchemistsSynthesis.ts:21-22` (`alchemistsSynthesis.test.ts:198-199`) → `390×844`.

The app's stated portrait reference is `390×844` (`apps/advantage-games/AGENTS.md`). Mixed fixed heights mean games letterbox/scale differently inside the same host shell and complicate a uniform responsive container. Only alchemists-synthesis matches the documented reference; the rest assume 700 or 600. This is a mobile/layout consistency risk for embedding into Reading/Primary.

### F-GAMES-B36-009 · Medium · `villageGuardian` has no start phase and no victory state — lifecycle diverges from the shared model
`villageGuardian.test.ts:56` asserts `createVillageGuardianState(...).status === 'playing'` immediately (no `'start'` gate), whereas abyssal-well (`abyssalWell.ts:65`), griffin (`griffinSkyJoust.test.ts:12`), labyrinth (`labyrinthGoblinKing.test.ts:20`) and storm (`stormCastleTower.test.ts:27`) all begin at `'start'` and require an explicit `startGame`. Additionally the `describe('level progression (no victory state)')` block (`villageGuardian.test.ts:213-286`) confirms the game is **endless** — it advances levels indefinitely and only terminates on `defeat` (timer/lives). An importable game with no win/completion terminal makes "lesson complete" / progress-percentage reporting ambiguous: when does the host record success and award the capped XP? The lifecycle (`status` values, terminal states) should be uniform across titles for a shared runtime.

### F-GAMES-B36-010 · Medium · Non-deterministic entity IDs in abyssal-well defeat seeded-RNG reproducibility
`abyssalWell.ts:123` (`proj-${Date.now()}-${Math.random()}`) and `:269` (`enemy-${Date.now()}-${Math.random()}`) build IDs from `Date.now()`/`Math.random()` even though the rest of the module supports an injected `rng` for deterministic tests (`createAbyssalWellState`/`spawnEnemy` accept `rng`). This makes recorded games / snapshot tests non-reproducible and couples logic to wall-clock + global RNG. IDs should be derived from a monotonic counter on state or the injected `rng`. (Same anti-pattern likely exists in sibling games; flagged here where it is in-batch.)

### F-GAMES-B36-011 · Medium · `gameCards.test.ts` "implemented" guard is brittle and self-referential
`gameCards.test.ts:68` hardcodes a long `gameId === 'dragon-flight' || ... || 'archers-revenge'` ternary to decide vocabulary-vs-sentence folders, duplicating routing knowledge that already lives in each card's `href`. `:60-78` then walks the real filesystem (`fs.existsSync`, `fs.readdirSync`) and does a loose `f.toLowerCase().includes(gameId...replace(/-/g,''))` substring match (line 72), which can produce false positives (e.g. one game's logic file substring-matching another's id) and is fragile to file renames/casing. A new playable card added without touching this ternary will be misclassified. This is a maintainability/test-quality risk rather than a product defect.

### F-GAMES-B36-012 · Low · `session-persistence` validation does not check `params` value types, never expires, and grows unbounded
`session-persistence.ts:40-42` (`isValidHint`) checks `params` is a non-null object but not that its values are `number`s, despite the declared `Record<string, number>` (line 3); a corrupted/malicious entry with string values passes validation and flows into difficulty math downstream. The `timestamp` field (line 4) is stored but never read — there is no TTL/expiry, and `saveSessionHint` keeps one entry per `gameId` forever with no pruning, so the key grows with the game catalog and stale hints persist across long gaps. Consider validating value types and using `timestamp` to expire stale hints.

### F-GAMES-B36-013 · Low · `withBasePath('')` and double-prefix edge cases unhandled / untested
`basePath.ts:3-8` — an empty `path` ("") does not start with `/`, so it returns `${basePath}/` (trailing slash artifact). There is also no guard against a `path` that already contains the base path (double-prefix). `basePath.test.ts:23-37` covers only the two happy paths (prefixed vs not) and not empty-string, already-prefixed, or trailing-slash base-path inputs. Low impact today (callers pass concrete `/games/...` strings) but the helper is shared infra and under-tested.

### F-GAMES-B36-014 · Low · alchemists-synthesis has two competing terminal conditions
`alchemistsSynthesis.ts:70-76` ends the game at `gameTime >= 60000` (`status: "gameover"`), while `:99-108` ends it at `round > maxRounds` (`victory`/`gameover` by accuracy). A learner who is mid-round when 60s elapses is dropped into `gameover` regardless of performance, and the 60s ceiling is independent of `maxRounds` (5/7/10). The test exercises each path separately (`alchemistsSynthesis.test.ts:86-93` time, `:139-165` rounds) but not their interaction. Clarify which condition is authoritative, or make the time limit scale with `maxRounds`.

### F-GAMES-B36-015 · Low · Dead/unused config fields in abyssal-well
`abyssalWellConfig.ts:15` `wellDepth: 5` and `:24-25` `enemy.baseSpeed`/`enemy.spawnInterval` are defined; `wellDepth` is never referenced in `abyssalWell.ts`, and enemy motion uses `getCreatureSpeed` (creature-type table, lines 30-34) rather than `enemy.baseSpeed`. `abyssalWellConfig.test.ts:25-28` asserts `baseSpeed`/`spawnInterval` are `> 0`, locking in fields the logic does not consume (spawn cadence is presumably the component's, not in this batch). Dead config invites drift; prune or wire it.

### F-GAMES-B36-016 · Low · Coming-soon cards still expose navigable `href`s to routes that may 404
`gameCards.ts:198-204` (`astral-mage`) and `:222-228` (`sorcerer-ziggurat`) are `status: 'coming-soon'` yet still carry a concrete `href` to `/en/student/games/sentence/...`. If the home menu renders `href` regardless of status, a learner can navigate to an unimplemented route. The catalog type makes `href` optional (`gameCards.ts:8` `href?`), so coming-soon entries could simply omit it; the playability test (`gameCards.test.ts:24-41`) only checks *playable* cards, so this is unguarded.

### F-GAMES-B36-017 · Low · `gameDataArrays.test.ts` content guard is fragile (regex-on-source + filesystem reads)
`gameDataArrays.test.ts:50-52,60-62` count sentences by `content.match(/term:\s*['"]/g)` against raw route-file text — this counts any occurrence of `term:` (including commented-out data or unrelated keys) and breaks if the route stores data as JSON/imported arrays instead of inline object literals. `:46-49,56-59,68` hardcode filesystem paths (`src/app/api/v1/games/.../route.ts`, `public/vocab/default.json`); a route relocation or data-source change silently breaks the guard without indicating a real content regression. Useful as a smoke check but couples tests to incidental file layout and source formatting.

### F-GAMES-B36-018 · Low · Several game tests assert exact XP formula values, coupling tests to scoring internals
`griffinSkyJoust.test.ts:143` (`expect(xp).toBe(3 * 1 + 2 + 2)`) and `labyrinthGoblinKing.test.ts:185,197,209` (`toBe(5)`, `toBe(8)`, `toBe(10)`) pin exact XP outputs. Any future rebalance of the XP curve (likely, given F-GAMES-B36-007) forces these tests to change in lockstep, and they assert the arithmetic rather than the *properties* that matter (monotonicity, cap, accuracy/ survival bonus presence — the latter is well-tested in `abyssalWell.test.ts:393-409`). Prefer property assertions (`>`, `<=`, cap) over exact magic numbers for reward math.

### F-GAMES-B36-019 · Info · `labyrinthGoblinKingConfig.test.ts` fallback wordCount is harder-than-hard
`labyrinthGoblinKingConfig.test.ts:32-34` asserts an unknown difficulty (`'extreme'`) falls back to `wordCount: 7`, which is greater than `hard`'s `6` (`:30`). A fallback for an *unrecognized* difficulty that is harder than the hardest legitimate setting is surprising — most fallbacks in the batch default to medium/normal (`abyssalWellConfig.ts:46`, `stormCastleTowerConfig.test.ts:50-52`). Confirm the labyrinth fallback is intentional; an over-hard fallback could over-penalize a learner if a bad difficulty string ever reaches the factory. (Source config not in this batch; flagged from the test's encoded expectation.)

### F-GAMES-B36-020 · Info · Several tests mutate state in place, diverging from the immutable-update style of the logic
`realmCarver.test.ts:37,44,58-61,82-102`, `griffinSkyJoust.test.ts:59-60,71-73,111`, and others assign directly to `state.player.x = ...` / `state.player.vx = ...` before ticking. The game functions themselves return new state objects (`abyssalWell.ts`, `alchemistsSynthesis.ts` all spread-copy), so the tests rely on mutability of the input object that production code treats as immutable. This works today but is a smell: it can mask aliasing bugs and makes tests harder to reason about. Prefer constructing modified copies (`{ ...state, player: { ...state.player, x } }`), as `stormCastleTower.test.ts` and `villageGuardian.test.ts` consistently do.

### F-GAMES-B36-021 · Info · `stormCastleTower.test.ts` "should respect move cooldown" does not test the cooldown
`stormCastleTower.test.ts:128-132` is named for cooldown enforcement but performs two `movePlayer(..., 'up')` calls and asserts `row === 1`, which only proves *one* move succeeded — it never sets up the timing that would make the second move be blocked, nor asserts a blocked outcome. The behavior the name promises is unverified. Either drive `gameTime` to exercise the cooldown gate or rename the test to reflect what it actually checks.

### F-GAMES-B36-022 · Info · `abyssalWell.test.ts` cooldown test name vs assertions are misaligned
`abyssalWell.test.ts:120-135` ("should not fire if cooldown not elapsed") asserts `afterFire.projectiles.length === 1` then fires again 100ms later (fireRate is 300, `abyssalWellConfig.ts:18`) expecting length to *stay* 1 — which does verify the cooldown — but the intermediate assertions read as if a fire is expected. The test is functionally correct but the naming/flow is confusing; consider asserting the blocked-fire delta explicitly and adding a positive case where the cooldown *has* elapsed.

---

## Cross-Cutting Observations (read-only, not single-line defects)

- **Shared runtime cohesion:** The five "logic" games here do not share a common state interface. Phase fields differ (`phase` for abyssal/storm vs `status` for griffin/labyrinth/alchemists/village), terminal states differ (`victory`/`defeat`/`gameover`/endless), and lifecycle entry differs (`'start'` vs immediate `'playing'`). A shared runtime imported into Reading/Primary would benefit from a single canonical `GameState` contract (status enum, terminal detection, `calculateXP` signature) so the host can treat all titles uniformly. See F-GAMES-B36-007/009.
- **RNG discipline:** abyssal-well, storm-castle, labyrinth and village-guardian tests demonstrate seeded/spied RNG; alchemists-synthesis (F-GAMES-B36-006) and abyssal-well ID generation (F-GAMES-B36-010) leak `Math.random()`/`Date.now()`. Determinism is partial across the batch.
- **Importability into Reading/Primary:** the two highest-impact blockers are catalog-level (F-GAMES-B36-001 hardcoded `/en/`, F-GAMES-B36-002 base-path/href mismatch) — these affect *every* game, not just this batch's titles.
- **Accessibility / age-appropriate UX:** this batch is logic/data/tests only — no rendering components, ARIA, motion, or audio surfaces were in scope, so a11y and asset/audio findings are deferred to the component batches for these games.
- **Content readiness:** `gameDataArrays.test.ts` provides a useful (if fragile, F-GAMES-B36-017) guard that sample vocab/sentence pools and a few games' inline/external data meet a ≥10-item floor — a reasonable readiness signal.

---

## Limitations

- **Read-only:** No source was executed, built, type-checked, or edited. Findings are from static reading. Test pass/fail and `check-types` results were **not** verified by running Jest/tsc (e.g. F-GAMES-B36-004's compile impact is inferred from the import list, not observed).
- **Tests-only games:** For griffin-sky-joust, labyrinth-goblin-king, realm-carver, storm-castle-tower and village-guardian, only test (and, for some, config-test) files are in this batch; the corresponding `*.ts` logic/config sources are **not** in `/tmp/opencode/games-batch-36` and were not opened. Findings on those titles are anchored to the tests and the behavior they assert, and may need confirmation against the real source in their owning batches.
- **Component/asset/audio/render** layers for abyssal-well and alchemists-synthesis (Konva components, sprites, audio, i18n strings) are **not** in this batch; mobile/browser/a11y rendering correctness is out of scope here.
- **Cross-game XP/leaderboard normalization** (F-GAMES-B36-007) was assessed from the logic in-batch; the actual host-side aggregation/leaderboard code was not reviewed and may already renormalize.
- Locale-completeness (es/zh/th) and `public/vocab/default.json` content quality were not audited beyond what `gameDataArrays.test.ts` asserts.

---

## Scope Confirmation

- Report exists at the required path and covers **all 20 files** listed in `/tmp/opencode/games-batch-36`.
- Every file appears in the Files Reviewed table; findings are line-anchored with severities and `F-GAMES-B36-###` IDs.
- This is a line-by-line review artifact only. **No acceptance or closeout claims are made**; gate decisions remain with the track owner.
