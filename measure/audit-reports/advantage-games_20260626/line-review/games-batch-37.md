# Line-by-Line Review — games-batch-37

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-37`
**Scope source:** `/tmp/opencode/games-batch-37` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited.
**Finding ID scheme:** `F-GAMES-B37-###`
**Severity scale:** Critical / High / Medium / Low / Info

This batch spans three concerns:
- **Shared mock API route factories** (`src/lib/games/api/*`) — `complete`, `ranking`, `sentences`, `vocabulary` route builders, shared `types.ts`, and barrel `index.ts`, each with a test.
- **Archer's Revenge** vocabulary game — logic module + config module, each with a test.
- **Castle Defense** sentence/tower-defense game — logic module + test.
- Two cross-cutting test files: a filesystem **compliance audit** (`babelArchitectCompliance.test.ts`), a **base-path** helper + test, and a **content-pack schema** test.

To anchor findings, the following non-batch files were read-only for context (no findings are charged to them): `src/store/useGameStore.ts` (`VocabularyItem`, `Difficulty`), `src/lib/games/contentPackSchema.ts` (the implementation behind file #20's test), `src/lib/gameCards.ts`, and a sampling of `src/app/api/v1/games/*/route.ts` consumers of the route factories.

---

## Files Reviewed (20/20)

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `api/completeRoute.test.ts` | Test (Jest) | XP/activityId mock route |
| 2 | `api/completeRoute.ts` | Logic | POST handler factory |
| 3 | `api/index.ts` | Barrel | Re-exports route factories + types |
| 4 | `api/rankingRoute.test.ts` | Test | Empty-leaderboard mock |
| 5 | `api/rankingRoute.ts` | Logic | GET handler factory |
| 6 | `api/sentencesRoute.test.ts` | Test | Threshold warnings |
| 7 | `api/sentencesRoute.ts` | Logic | GET handler factory |
| 8 | `api/types.ts` | Types | Shared request/response shapes |
| 9 | `api/vocabularyRoute.test.ts` | Test | Threshold warnings |
| 10 | `api/vocabularyRoute.ts` | Logic | GET handler factory |
| 11 | `archersRevenge.test.ts` | Test | State/tick/fire/XP |
| 12 | `archersRevenge.ts` | Logic | Full game state machine |
| 13 | `archersRevengeConfig.test.ts` | Test | Config constants |
| 14 | `archersRevengeConfig.ts` | Config | Difficulty tuning |
| 15 | `babelArchitectCompliance.test.ts` | Test | Filesystem existence audit |
| 16 | `basePath.test.ts` | Test | Env-driven prefix |
| 17 | `basePath.ts` | Logic | `withBasePath` helper |
| 18 | `castleDefense.test.ts` | Test | Tower-defense logic |
| 19 | `castleDefense.ts` | Logic | Full game state machine |
| 20 | `contentPackSchema.test.ts` | Test | Pack validation (impl not in batch) |

Note: `contentPackSchema.ts` (the implementation) and `babelArchitect.ts`/`BabelArchitectGame.tsx` are **not** in this batch; only their tests are. Findings on those implementations are deferred to whichever batch owns them.

---

## Findings

### F-GAMES-B37-001 · High · `force-static` route config is incompatible with a body-reading POST handler
`completeRoute.ts:6-8` sets `dynamic: 'force-static'` while `POST` calls `await request.json()` (line 8). In Next.js App Router, `export const dynamic = 'force-static'` forces a route to be statically evaluated and makes the `Request` opt out of dynamic data; reading the request body in a force-static route is contradictory and, in a real route handler, the body/headers become unavailable or the route is treated as static (POST is not even valid for static export). The same incompatibility applies to all four factories (`rankingRoute.ts:13`, `sentencesRoute.ts:6`, `vocabularyRoute.ts:7`). The unit tests pass only because they invoke `route.POST(mockReq)` directly and never exercise the Next.js static-generation path (`completeRoute.test.ts:19-22`). This is a latent readiness bug for any host that wires these factories into actual route files.

### F-GAMES-B37-002 · High · No input validation at the request boundary (AGENTS.md Zod contract violation)
`completeRoute.ts:8-12` consumes `await request.json()` and trusts it as `CompleteRequest` with zero runtime validation. `xp`, `correctAnswers`, `totalAttempts` are used directly in arithmetic. Negative XP, `NaN`, strings, or absurd values (the test even feeds `xp: 1000000`, `completeRoute.test.ts:233-246`) flow straight into `xpEarned` and back to the client. The repo standard (AGENTS.md "Contracts and Validation") requires Zod validation at every external boundary; these route factories are the external boundary for scoring/XP. There is no clamping, no `Number.isFinite` guard, and no rejection path. For a scoring/XP/progress system this is a data-integrity risk (XP inflation, leaderboard poisoning once leaderboards are real).

### F-GAMES-B37-003 · Medium · `CompleteRequest.accuracy` is declared and required but ignored; accuracy is silently recomputed
`types.ts:23` makes `accuracy` a required field of `CompleteRequest`, but `completeRoute.ts:11` recomputes `accuracy = totalAttempts > 0 ? correctAnswers / totalAttempts : 0` and never reads `body.accuracy`. So the contract demands a field the handler discards, and a caller that sends an authoritative client-side accuracy (e.g. for a game that weights partial credit) is overridden. Either consume the provided value or drop it from the required contract. The test at `completeRoute.test.ts:105-118` documents this implicit recompute but does not flag the dead field.

### F-GAMES-B37-004 · Medium · `activityId` uniqueness relies on `Date.now()` millisecond resolution — collisions under load
`completeRoute.ts:13` — `activityId = \`mock-activity-${Date.now()}\``. Two completions in the same millisecond produce identical IDs. The test "generates unique activity IDs" (`completeRoute.test.ts:52-71`) only passes because it inserts a `setTimeout(…, 2)` delay (line 65) to force a clock tick — i.e. the test acknowledges the collision risk and works around it rather than guarding against it. Even as a mock, an ID generator that needs an artificial sleep to be unique is a poor pattern to carry into Reading/Primary; use a counter + random suffix (the game logic modules already use `Math.random().toString(36)` for IDs).

### F-GAMES-B37-005 · Medium · Ranking route is a permanent empty stub — leaderboard readiness is unimplemented
`rankingRoute.ts:4-20` always returns a frozen `EMPTY_RANKINGS` constant for all four difficulties. The test even codifies this as intended ("Mock route should return empty rankings since there's no real database", `rankingRoute.test.ts:90-101`). This is fine as a placeholder, but for the batch's leaderboard-readiness focus it means **leaderboards are not implemented at all** in this layer — no auth, no `schoolId`/tenant scoping, no persistence, no ranking computation. Importing this into Reading/Primary yields empty leaderboards with no error signal. The shared `EMPTY_RANKINGS` object is also returned by reference on every call; `NextResponse.json` serializes a copy so there is no live-mutation hazard today, but a future handler that mutates the response object would corrupt the module-level singleton.

### F-GAMES-B37-006 · Medium · Shared `CompleteRequest` type is polluted with game-specific fields
`types.ts:27-31` adds `score`, `gameTime`, `dragonCount`, `bossPower`, `victory` to the supposedly shared `CompleteRequest`. `dragonCount`/`bossPower` are clearly Dragon-Flight/boss-game specific and leak one game's domain into the contract every game depends on. This undermines the "shared runtime / importable contract" goal: each new game either widens this union further or ignores most of it. Prefer a generic `metadata?: Record<string, unknown>` or per-game extension types, keeping the core completion contract minimal (`xp`, `correctAnswers`, `totalAttempts`, `accuracy`, `difficulty`).

### F-GAMES-B37-007 · Low · `vocabularyRoute.ts` duplicate import statements
`vocabularyRoute.ts:2-3` imports `VocabularyItem` and `VocabularyResponse` from the same module `'./types'` in two separate `import type` lines. Cosmetic, but it is the kind of drift that lint should catch and signals copy-paste construction of the factory family.

### F-GAMES-B37-008 · Low · Threshold "≥5 items" is duplicated as a magic number across factories and tests
`vocabularyRoute.ts:22` and `sentencesRoute.ts:21` both hardcode `< 5` / `requiredCount: 5`, and `contentPackSchema.ts` independently enforces "at least 5 items" (validated in `contentPackSchema.test.ts:320-331`). Three independent definitions of the same gameplay-minimum invite divergence (e.g. a game that needs 6). Centralize the minimum-content constant so the API gate, the content-pack validator, and the games agree. Also note `sentencesRoute`/`vocabularyRoute` are byte-for-byte structural twins differing only in noun ("words" vs "sentences") and warning code — a single parameterized factory would remove ~30 lines of duplication.

### F-GAMES-B37-009 · High · `archersRevenge` tick uses non-deterministic `Math.random()` despite an injectable `rng`
`archersRevenge.ts` accepts `rng` in `ArchersRevengeConfig` (line 68) and threads it into `createEnemyFormation` (line 81), but the per-tick logic ignores it: target reselection calls `Math.random()` directly (lines 211, 304), and `nextWave` rebuilds the formation with `Math.random` hardcoded (line 346). This breaks deterministic replay/seeding for the live game loop — only initial layout is seedable. For scoring fairness, automated testing, and reproducible bug reports this is a meaningful defect; the seam exists but is bypassed exactly where randomness affects scoring (which enemy becomes the target). Tests that touch these paths (`archersRevenge.test.ts:121-140`) cannot assert deterministic outcomes as a result.

### F-GAMES-B37-010 · Medium · Biased shuffle via `sort(() => rng() - 0.5)`
`archersRevenge.ts:93` — `[...vocabulary].sort(() => rng() - 0.5)`. This is the well-known non-uniform shuffle; comparator-based shuffling does not produce a uniform permutation and the bias varies by engine sort implementation. For a learning game this skews which words appear/repeat in the formation, subtly biasing exposure. Use Fisher–Yates with the injected `rng`.

### F-GAMES-B37-011 · Medium · `|| 7000` fallback masks config and would override a legitimate `0`
`archersRevenge.ts:155,220,311,359` all read `ARCHERS_REVENGE_CONFIG.targetChangeInterval?.[difficulty] || 7000`. The config always defines `targetChangeInterval` for every difficulty (`archersRevengeConfig.ts:72-77`), so the optional-chain + `|| 7000` is dead defensiveness that hides typos (a missing key silently becomes 7000 instead of failing) and, more importantly, `|| 7000` would replace an intentional `0` interval with 7000. Use a typed direct access `config.targetChangeInterval[difficulty]`.

### F-GAMES-B37-012 · Medium · Duplicate, conflicting `ArchersRevengeConfig` type names
`archersRevenge.ts:66-69` exports a type `ArchersRevengeConfig` (the per-instance options `{difficulty?, rng?}`), while `archersRevengeConfig.ts:3-33` exports a *different* type also named `ArchersRevengeConfig` (the static tuning table). Two unrelated shapes sharing a name across sibling modules is a readability/import-collision hazard and will confuse any consumer (and the graph). Rename one (e.g. `ArchersRevengeOptions` vs `ArchersRevengeTuning`).

### F-GAMES-B37-013 · Low · Declared `ArchersRevengeResults` and `scoring.accuracyBonus` are never produced/used
`archersRevenge.ts:55-64` defines a rich `ArchersRevengeResults` type (score, accuracy, xp, wavesCompleted, timeTaken, difficulty) but no function in the module returns it; the component presumably assembles completion data ad hoc. Likewise `archersRevengeConfig.ts:24` defines `scoring.accuracyBonus: 50` which is never referenced in `archersRevenge.ts` scoring (only `basePointsPerEnemy` and `comboMultiplier` are used, lines 273). Dead contract + dead config implies the intended scoring model (accuracy bonus, structured results for progress reporting) is unfinished — a gap for progress/XP importability.

### F-GAMES-B37-014 · Medium · XP model ignores difficulty and is hard-capped at 1–10 (cross-game comparability)
`archersRevenge.ts:366-372` (`calculateXP`) computes `baseXP = score/10` plus speed/survival bonuses, then `Math.max(1, Math.min(10, rawXP))`. It never references `state.difficulty`, so an extreme-difficulty clear earns the same XP ceiling as an easy clear, and any high-scoring run is flattened to 10. This mirrors the cross-game XP-normalization concern raised elsewhere in this audit: each game caps at 10 with its own ad hoc bonus formula and no shared difficulty multiplier, so XP is not comparable across games for a unified learner model. Castle Defense (`castleDefense.ts:662-676`) has a *different* 0–10 formula again, confirming there is no shared XP contract.

### F-GAMES-B37-015 · Low · `archersRevengeConfig.test.ts` never exercises the `extreme` tier
`archersRevengeConfig.test.ts:48-72` tests `getDifficultySettings` for easy/normal/hard only. `extreme` is a first-class `Difficulty` (`useGameStore.ts:9`) with distinct config values (`archersRevengeConfig.ts:41,54,62,68,76`), including `playerHp: 1` — the most failure-prone path. The `extreme` formation is 5×5 = 25 enemies; no test asserts that formation size or HP. Add an `extreme` case.

### F-GAMES-B37-016 · Medium · Castle Defense uses a difficulty union incompatible with the shared `Difficulty` type
`castleDefense.ts:142` types difficulty as `"easy" | "medium" | "hard"`, but the platform-wide `Difficulty` is `'easy' | 'normal' | 'hard' | 'extreme'` (`useGameStore.ts:9`) — used by Archer's Revenge, the ranking route (`types.ts:5,14-19`), and the content-pack validator (`contentPackSchema.ts:20`). "medium" exists nowhere else and "normal"/"extreme" are absent here. This blocks clean shared-runtime/leaderboard integration: a Castle Defense completion cannot map onto the four-bucket `RankingsByDifficulty` without a translation layer, and difficulty selection UIs cannot be shared. Reconcile to the canonical union.

### F-GAMES-B37-017 · Medium · Castle Defense is landscape 800×600 while the platform standard is portrait 390×844
`castleDefense.ts:2-3` fixes `GAME_WIDTH = 800`, `GAME_HEIGHT = 600` ("MUST match Wizard vs Zombie"), whereas the app's stated convention (apps/advantage-games/AGENTS.md) and Archer's Revenge (`archersRevenge.ts:71-72`, 390×844) are mobile-first portrait. A 4:3 landscape board on a portrait phone forces heavy downscaling/letterboxing and a different interaction model. This is a mobile/performance/UX consistency gap for a game intended to be imported into the mobile-first Reading/Primary shells. (Inheriting Wizard-vs-Zombie dimensions perpetuates an existing landscape design rather than fixing it.)

### F-GAMES-B37-018 · High · Castle Defense randomness is unseedable in `createCastleDefenseState` and per-tick wave/sentence logic
`castleDefense.ts` exposes `random` params on helpers (`pickRandomSentence:195`, `spawnEnemy:523`, `spawnSentenceWords:710`, `spawnWords:1074`) but the **entry points discard them**: `createCastleDefenseState` calls `pickRandomSentence(vocabulary)` and `Math.floor(Math.random() * …)` (lines 412, 415) and seeds `grassMap` with `Math.random()` (line 478-480); `advanceCastleDefenseTime` calls `spawnEnemy(..., Math.random, ...)` (line 1283) and `pickRandomSentence` without an injected rng (lines 1302, 838). So the live game cannot be deterministically reproduced or snapshot-tested; the tests that need determinism resort to `jest.spyOn(Math, "random")` (`castleDefense.test.ts:352,386`). For reproducible scoring/QA this is the same class of defect as F-GAMES-B37-009 but more pervasive.

### F-GAMES-B37-019 · Medium · `enemiesKilled` derivation mixes units and can miscount score/XP
`castleDefense.ts:1235-1242` computes `enemiesKilled = state.enemies.length - enemies.length - (baseDamage.damage > 0 ? baseDamage.damage / 10 : 0)`. This conflates two removal causes — enemies killed by towers vs. enemies that reached the base — and "un-counts" base-leak removals by dividing **base damage** (a HP figure of 10/15/30 per enemy type, `checkBaseDamage:1055-1057`) by a flat 10. A boss leak deducts `30/10 = 3` from the killed count even though only one enemy left, so `Math.floor(enemiesKilled)` can be negative or wrong, and score (`*10`, line 1240) plus `totalEnemiesDefeated` (line 1242) become inaccurate. Track kills explicitly (the `updateProjectiles` result already returns `hits`, line 1014) instead of inferring from array-length deltas.

### F-GAMES-B37-020 · Low · Dead vocabulary-mode code path in a sentence game (`targetWord`, `spawnWords`)
`castleDefense.ts:1070-1113` (`spawnWords` with 1 correct + 3 distractors) and the `targetWord` state field (`:155`, set at `:462`) are vocabulary-matching constructs, but the live tick uses sequential **sentence-word** collection (`collectWords`/`validateWordCollection`) and never calls `spawnWords`. `targetWord` is initialized from a random vocab item and then never updated or read by gameplay. This dead/abandoned mechanic enlarges the state surface, confuses the model (is this a vocab game or a sentence game?), and is untested for its now-vestigial role. Remove or wire intentionally.

### F-GAMES-B37-021 · Low · `grassMap` is a 12×16 random matrix regenerated every `createCastleDefenseState`, unseeded
`castleDefense.ts:478-480` builds a 192-cell random grass tile map purely for cosmetics, using `Math.random()`. It is non-deterministic (snapshot-hostile) and recomputed on every state creation/reset. Minor, but for asset/performance determinism it should accept the same injected `random` as its siblings, and could be memoized.

### F-GAMES-B37-022 · Medium · `babelArchitectCompliance.test.ts` is a filesystem-existence audit, not a behavioral test, and hardcodes a locale
`babelArchitectCompliance.test.ts:17-67` asserts files exist via `fs.existsSync` against `process.cwd()` paths and checks `gameCards` metadata. Problems: (a) it tests *file presence*, not behavior — it passes even if the component is broken, and breaks on any legitimate refactor/move (brittle, high-maintenance); (b) it is `cwd`-dependent, so it fails if Jest is run from a different working directory; (c) it asserts `card.href === '/en/student/games/sentence/babel-architect'` (line 14) — a **hardcoded `en` locale** baked into a test, reinforcing the locale-coupling that blocks importability into multi-locale Reading/Primary; (d) it audits `babel-architect`, which is **not in this batch** and whose implementation files this test reaches into. This file is closer to a CI manifest check than a unit test and should be relabeled/relocated accordingly.

### F-GAMES-B37-023 · Low · `basePath.ts` reads env once at module load — correct, but no normalization of trailing/empty slashes
`basePath.ts:1-8` is sound and aids importability (path prefixing for sub-mounted apps). Two edge cases are unguarded: a `NEXT_PUBLIC_BASE_PATH` ending in `/` yields a double slash (`/base/` + `/games` → `/base//games`), and `withBasePath('')` returns `${basePath}/` . The tests (`basePath.test.ts:26-38`) only cover the well-formed `/base` and unset cases. Add normalization or document the contract that the env value must not have a trailing slash.

### F-GAMES-B37-024 · Info · `basePath.test.ts` is Jest-runtime coupled (`jest.resetModules`) — confirm runner
`basePath.test.ts:11,22` use `jest.resetModules()` and module-load-time env capture via dynamic `import`. This is correct for re-reading the module-level `basePath` const, but it hard-binds the test to Jest (not Vitest), consistent with the mixed-runner tech debt noted in the root AGENTS.md. The stray top-level `export {}` (line 3) is only there to make the file a module; harmless but noise.

### F-GAMES-B37-025 · Info · `contentPackSchema.test.ts` is strong, but the implementation it covers is not in this batch
File #20 is a thorough validation suite (format detection, per-item errors, semver, unknown-field rejection, ≥5-item minimum, actionable `Fix:`/`Action:` messages). It is the highest-quality test in the batch. Caveat for traceability: the implementation `contentPackSchema.ts` is **not** in `/tmp/opencode/games-batch-37`, so this review verifies test intent against the (context-read) implementation but does not charge findings to the implementation. Minor test gaps: no assertion that the `language`/`tags`/`author`/`createdAt`/`updatedAt` optional fields (present in `contentPackSchema.ts:13-17`) are accepted — the test's `CONTENT_PACK_OPTIONAL_FIELDS` checks (lines 31-38) cover only a subset, so a regression dropping those keys from the allow-list would slip through.

### F-GAMES-B37-026 · Low · `generateId` collision pattern repeated; `substr` is deprecated
`archersRevenge.ts:76` (`Math.random().toString(36).substring(2, 9)`) and `castleDefense.ts:189-190` (`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`) both roll their own ID generators with non-trivial collision probability under rapid spawning, and `castleDefense.ts:190` uses the deprecated `String.prototype.substr`. For entity IDs that may key React lists and collision-sensitive Sets (e.g. `hitEnemies`/`hitArrows` in `archersRevenge.ts:259-260`), prefer `crypto.randomUUID()` (available in modern browsers) or a monotonic counter.

### F-GAMES-B37-027 · Info · Archer's Revenge edge-bounce sets `moveX = 0` and only flips direction — formation can stall at an edge for one tick and double-descend
`archersRevenge.ts:231-241`: when `maxX+moveX > GAME_WIDTH-10 || minX+moveX < 10`, it flips `formationDirection` and zeroes horizontal motion this tick, but vertical `moveY` still applies. With large `dt` (the test passes `dt: 1000`/`11000`, lines 59/124), the formation can advance vertically by a full second's descent in a single bounce tick, and the bottom-row defeat check (line 244) uses post-move positions. This is a fixed-timestep assumption leaking into a variable-`dt` API; document a max-`dt` clamp (as PaladinsTwinSoul does elsewhere in the codebase) to keep collision/defeat detection stable.

---

## Cross-Cutting Observations (read-only, not charged to a single line)

- **Scoring/XP fragmentation:** Three different 0/1–10 XP formulas in this batch alone (`completeRoute` passthrough, `archersRevenge.calculateXP`, `calculateCastleDefenseXP`), none difficulty-normalized. There is no shared XP contract or shared difficulty multiplier — a recurring theme across the audit and the single biggest barrier to a unified progress model in Reading/Primary.
- **Determinism seams exist but are bypassed:** Both game modules thoughtfully accept `rng`/`random` params, then call `Math.random()` at the most scoring-relevant points (target selection, wave/sentence rolls, spawns). Closing these seams would make every game snapshot-testable and reproducible for QA.
- **Tenancy/auth absent in the API layer:** The route factories are mocks with no auth, no `schoolId` scoping, no persistence (`rankingRoute` is empty by design). This is acceptable for the standalone games app but must be replaced by validated, tenant-scoped backend functions before Reading/Primary import — none of that surface exists here yet.
- **Test quality is uneven:** The pure-logic tests (`archersRevenge`, `castleDefense`, `contentPackSchema`) are behavior-focused and good. The API tests pass only by sidestepping the `force-static` contradiction (F-GAMES-B37-001) and by sleeping for ID uniqueness (F-GAMES-B37-004). `babelArchitectCompliance.test.ts` is a filesystem manifest masquerading as a unit test (F-GAMES-B37-022).
- **Mobile-first inconsistency:** Archer's Revenge honors the 390×844 portrait standard; Castle Defense is 800×600 landscape. Mixed orientations complicate a shared responsive shell.

---

## Limitations

- **Read-only:** No source was executed, built, or edited. Findings are from static reading; test pass/fail was not verified by running Jest/Vitest, and the `force-static`/Next.js behavior in F-GAMES-B37-001 was reasoned from framework semantics, not reproduced.
- **Implementations not in batch:** `contentPackSchema.ts`, `babelArchitect.ts`, `BabelArchitectGame.tsx`, and the route files that consume these factories were read for context only and receive no findings; their correctness is assumed where referenced.
- **Components not reviewed:** The React/Konva components that render these game states (`ArchersRevengeGame`, `CastleDefenseGame`) are not in this batch, so UI accessibility, `prefers-reduced-motion`, audio/asset wiring, touch controls, and the actual `onComplete` payloads were assessed only insofar as the logic/types reveal them. Dynamic gameplay (timing, collision, performance under real frame rates) is out of scope for a static line review.
- **i18n/locale completeness** was spot-checked only via the hardcoded `en` href in F-GAMES-B37-022; full locale coverage was not audited.

---

## Scope Confirmation

- Report exists at the required path and covers **all 20 files** listed in `/tmp/opencode/games-batch-37`.
- Every file appears in the Files Reviewed table; findings are line-anchored with severities and `F-GAMES-B37-###` IDs.
- This is a line-by-line review artifact only. **No acceptance or closeout claims are made**; gate decisions remain with the track owner.
