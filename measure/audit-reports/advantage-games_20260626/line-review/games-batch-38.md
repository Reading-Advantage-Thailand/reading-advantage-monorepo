# Line-by-Line Review — games-batch-38

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-38`
**Scope source:** `/tmp/opencode/games-batch-38` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited.
**Finding ID scheme:** `F-GAMES-B38-###`
**Severity scale:** Critical / High / Medium / Low / Info

This batch is almost entirely **game-logic cores + co-located unit tests**, plus two shared concerns:

- **Shared contracts / shared runtime** — `contentPackSchema.ts` (content-pack validator) and `difficulty.ts` (+ test, the canonical difficulty-tier table & guardrails). These are imported across games and are the closest thing in-batch to a shared runtime.
- **Full game logic + tests** — devourer-slime, dragon-flight, dragon-rider, dungeon-liberator (+ off-screen indicators), enchanted-library, griffin-riders-escape (+ config), griffin-sky-joust (+ config).

Verification note: unlike most read-only batches, I executed the in-batch Jest suites to confirm pass/fail (see Limitations for exact commands). One suite **fails**.

---

## Files Reviewed (20/20)

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `lib/games/contentPackSchema.ts` | Logic | Content-pack v1/v2 validator |
| 2 | `lib/games/devourerSlime.test.ts` | Test | Jest, injectable rng |
| 3 | `lib/games/devourerSlime.ts` | Logic | Hole.io-style slime game |
| 4 | `lib/games/difficulty.test.ts` | Test | Jest, guardrail assertions |
| 5 | `lib/games/difficulty.ts` | Logic | Canonical difficulty tiers + guardrails |
| 6 | `lib/games/dragonFlight.test.ts` | Test | Jest, seeded rng |
| 7 | `lib/games/dragonFlight.ts` | Logic | Gate-choice runner + boss |
| 8 | `lib/games/dragonRider.test.ts` | Test | Jest, seeded rng |
| 9 | `lib/games/dragonRider.ts` | Logic | Near-duplicate of dragonFlight |
| 10 | `lib/games/dungeonLiberator.test.ts` | Test | Jest, seeded rng |
| 11 | `lib/games/dungeonLiberator.ts` | Logic | Snake-trail rescue game |
| 12 | `lib/games/dungeonLiberatorIndicators.test.ts` | Test | Jest |
| 13 | `lib/games/dungeonLiberatorIndicators.ts` | Logic | Off-screen edge indicators |
| 14 | `lib/games/enchantedLibrary.test.ts` | Test | Jest, large suite |
| 15 | `lib/games/enchantedLibrary.ts` | Logic | Book-collect + spirit-dodge |
| 16 | `lib/games/griffinRidersEscape.test.ts` | Test | Jest — **2 failing** |
| 17 | `lib/games/griffinRidersEscape.ts` | Logic | 3-lane endless runner |
| 18 | `lib/games/griffinRidersEscapeConfig.ts` | Config | Lane/difficulty constants |
| 19 | `lib/games/griffinSkyJoust.ts` | Logic | Joust-style flap game |
| 20 | `lib/games/griffinSkyJoustConfig.ts` | Config | Physics/difficulty constants |

Cross-referenced (not in batch, opened for context only): `store/useGameStore.ts` (canonical `VocabularyItem`, `Difficulty`), `lib/games/xp.ts` (shared `calculateXP`).

---

## Findings

### F-GAMES-B38-001 · High · `griffinRidersEscape` default difficulty mismatch — 2 unit tests fail
`griffinRidersEscape.ts:55` defaults `difficulty` to `'normal'`, but `griffinRidersEscape.test.ts:25,47` assert the default is `'medium'`. Running the suite confirms **two real failures**:
```
createGriffinRidersEscapeState › should create initial state with default difficulty
createGriffinRidersEscapeState › should default to medium difficulty
  Expected: "medium"  Received: "normal"
```
This is a live red test in the batch, not a style nit. It also reflects a deeper taxonomy split: the store's canonical `Difficulty` (`useGameStore.ts:9`) is `'easy'|'normal'|'hard'|'extreme'` (no `'medium'`), yet `griffinRidersEscapeConfig.ts:18-22` only defines `easy/normal/hard` and the test wants `'medium'`. The default must be reconciled with both the canonical type and the test. (See also F-GAMES-B38-009.)

### F-GAMES-B38-002 · High · `devourerSlime` mutates nested state objects in place — aliasing bug under React
`devourerSlime.ts` performs in-place mutation of the shared `slime` sub-object that survives the shallow `{ ...state }` copies in `tickSlime`/`handleCollisions`/`handleOrbEaten`:
- `:208-209` `nextState.slime.radius = ...; nextState.slime.scale = ...`
- `:216-217` `nextState.slime.pos.x += ...; nextState.slime.pos.y += ...`
- `:249-250` `nextState.slime.radius += 5; nextState.slime.scale = ...`
- `:273-274` shrink mutation.

Because `tickSlime` (`:152`) and `handleCollisions` (`:182`) only spread the top level, `nextState.slime` is the **same reference** as the input `state.slime`. Mutating it rewrites the caller's previous state object. In a React/Zustand render loop this defeats referential-equality checks (stale renders, lost frames) and corrupts any retained prior state (e.g. for replay/undo). The co-located tests pass only because they mutate the same object and re-read it. Fix by copying nested objects (`slime: { ...state.slime, pos: { ... } }`).

### F-GAMES-B38-003 · High · `enchantedLibrary` movement is frame-rate dependent (ignores `dt`)
`enchantedLibrary.ts` advances positions by raw per-frame velocity with **no `dt` scaling**, even though `advanceEnchantedLibraryTime` receives `dt` and uses it for timers:
- Player: `:657-658` `newPlayerX = player.x + velocityX` (velocity = `PLAYER_SPEED=3`, line 653).
- Spirits: `:350-352` `x: spirit.x + spirit.velocityX` in `updateSpirits`.

The test encodes this (`enchantedLibrary.test.ts:292-293` expects `x === 100 + 2` after a "16ms" tick that the function ignores). Consequences for a shared runtime on Reading/Primary: gameplay speed scales with device refresh rate — a 120 Hz phone runs the game 2× faster than a 60 Hz one, and frame drops slow it down. Spirit speed (`INITIAL_SPIRIT_SPEED=5` → `MAX_SPIRIT_SPEED=25` per frame ≈ 1500 px/s at 60fps) blows past the `DIFFICULTY_GUARDRAILS.maxEnemySpeedPxPerSec=300` ceiling defined in `difficulty.ts:68`. This is a performance/mobile/fairness defect. Contrast `griffinSkyJoust.ts:133,143-147` which correctly multiplies by `dtSec`.

### F-GAMES-B38-004 · High · Divergent local `Difficulty` enums break importability into Reading/Primary
The canonical difficulty type is `useGameStore.ts:9` (`'easy'|'normal'|'hard'|'extreme'`). Several in-batch games redefine their own incompatible enums:
- `devourerSlime.ts:29` `'easy'|'medium'|'hard'` (default `'medium'`, `:91`).
- `dungeonLiberator.ts:61` `'easy'|'medium'|'hard'` (default `'medium'`, `:115`).
- `griffinSkyJoust.ts` uses `griffinSkyJoustConfig.ts:1` `'easy'|'medium'|'hard'` (default `'medium'`, `griffinSkyJoust.ts:62`).
- `griffinRidersEscapeConfig.ts:18-22` defines `easy/normal/hard` (no `extreme`), while `griffinRidersEscape.ts:1` imports the canonical `Difficulty` that *includes* `extreme` — so `getDifficultyConfig('extreme')` silently falls back to `normal` (`griffinRidersEscapeConfig.ts:33-34`).

A host that selects difficulty using the canonical enum (`extreme`, `normal`) cannot drive `medium`-based games correctly, and `extreme` is silently downgraded. The adaptive-difficulty layer (seen in sibling batches) keys off the canonical type, so these games will receive difficulty values they don't understand. The difficulty axis must use one shared enum.

### F-GAMES-B38-005 · Medium · `dragonFlight` and `dragonRider` are near-identical copy-paste with divergent contracts
`dragonRider.ts` is a line-for-line clone of `dragonFlight.ts` (same `GateSide`, `createGateRound`, `selectGate`, `advance*Time`) with three silent divergences:
- `DEFAULT_DURATION_MS` 30000 (`dragonFlight.ts:47`) vs 150000 (`dragonRider.ts:44`).
- `calculateBossPower` `ceil(*0.6)` (`dragonFlight.ts:140`) vs `ceil(*0.75)` (`dragonRider.ts:129`).
- Results contract differs: `DragonFlightResults` carries `timeTaken` + `difficulty` (`dragonFlight.ts:31-32`), `DragonRiderResults` carries neither (`dragonRider.ts:23-31`).

This duplication is a maintenance hazard (bug fixes must be applied twice) and an importability concern: a host consuming "dragon" results gets different shapes depending on which clone ran. Extract a shared parametrized core. (Both also call `calculateXP(0, ...)`, see F-GAMES-B38-011.)

### F-GAMES-B38-006 · Medium · `dungeonLiberator` leaks `Math.random()` despite an injectable `rng`, defeating deterministic replay
`createDungeonLiberatorState` and `spawnPrisoners`/`spawnMonsterForLevel`/`advanceToNextLevel` thread an injectable `rng`, but core per-frame logic ignores it:
- `dungeonLiberator.ts:196` fleeing direction `Math.random() * Math.PI * 2`.
- `:429-430` `getRandomPosition()` uses `Math.random()` for every rescatter.
- `:328,353,387` rescatter on wrong-pickup / monster-hit calls `getRandomPosition()` (Math.random).
- `:505` monster id `monster-${Date.now()}-${Math.random()}`.

The seeded-determinism test (`dungeonLiberator.test.ts:51-65`) only covers initial placement; once play starts, runs are non-reproducible. This blocks snapshot/replay testing and reproducible bug reports, and the wall-clock + global-RNG IDs are non-deterministic. Thread the state `rng` through the whole tick.

### F-GAMES-B38-007 · Medium · `dungeonLiberator` monster speed grows unbounded with level — exceeds guardrail
`dungeonLiberator.ts:252` `speedMultiplier = Math.pow(1.2, level - 1)` is applied to monster motion with no cap. `advanceToNextLevel` increments `level` indefinitely (`:539`) and also *adds* a monster each level (`:546-547`), so by level ~10 monsters move ~5× base and the count keeps climbing. There is no ceiling tying this to `DIFFICULTY_GUARDRAILS.maxEnemySpeedPxPerSec` (`difficulty.ts:68`). For an endless-progression game embedded in a graded product this becomes unwinnable and age-inappropriately punishing. Cap the multiplier and/or monster count.

### F-GAMES-B38-008 · Medium · `enchantedLibrary.spawnBooks` assumes ≥4 vocabulary items; small packs break the "4 books" invariant
`enchantedLibrary.ts:182-198` builds decoys via `vocabulary.filter(...).slice(0, 3)`. With a 1–3 item pack there are fewer than 3 decoys, so `books.length < 4`, silently violating the invariant the tests assert (`enchantedLibrary.test.ts:46-55,119-130`). `createEnchantedLibraryState` only guards against an *empty* pack (`:104-105`). The content-pack validator in this same batch enforces a ≥5-item floor (`contentPackSchema.ts:195,241`), but nothing wires that floor to this game, and `createEnchantedLibraryState` accepts any non-empty array. Also `:182-184` uses `.sort(() => rng() - 0.5)` — a biased (non-Fisher-Yates) shuffle that, with the seeded `rng = () => 0.5` used widely in tests, returns 0 every time (no shuffle at all). Decoy variety is therefore both biased and, under the common test seed, deterministic-but-unshuffled.

### F-GAMES-B38-009 · Medium · `griffinRidersEscapeConfig` has no `extreme` tier and a dead `maxWords` field
`griffinRidersEscapeConfig.ts:18-22` defines only `easy/normal/hard`; `getDifficultyConfig` (`:27-35`) maps any unrecognized value (including the canonical `'extreme'`) to `normal`. Separately, each tier carries `maxWords` (4/6/8) but `griffinRidersEscape.ts` never reads it — `createGriffinRidersEscapeState` uses the full `currentSentence.term.split(' ')` (`:59`) and `spawnWave` decoys index over `state.words.length` (`:128`). So difficulty does not bound sentence length as the config implies; the only real difficulty levers are `speedMult`, `obstacleFreq`, `spawnInterval`. Dead/aspirational config invites drift and misleads the difficulty contract.

### F-GAMES-B38-010 · Medium · `griffinSkyJoust` ignores its own `wordCount` difficulty setting; `knockback.x`/`friction` are dead
`griffinSkyJoustConfig.ts` defines per-difficulty `wordCount` (4/5/6, `:50,60,70`) and `friction` (`:46,57,68`) and a `knockback.x: 200` (`:21`), but `griffinSkyJoust.ts` uses none of them: `createEnemies` (`:103`) maps **every** word in the sentence to an enemy regardless of `wordCount`; `friction` is never applied to player physics; `checkCollisions` only applies `knockback.y` (`:221,228`), never `.x`. Difficulty therefore changes HP/speed/gravity but not the word load, and two config fields are inert. This is a difficulty-fidelity and config-hygiene gap, and the `wordCount` axis tested elsewhere in the project does nothing here.

### F-GAMES-B38-011 · Medium · Shared `calculateXP(score, …)` ignores its `score` arg; per-game XP scales are not comparable
The shared `xp.ts:1-12` `calculateXP(score, correctAnswers, totalAttempts)` **never uses `score`** — it returns `floor(correctAnswers * accuracy)`. Both dragon games pass a dummy `0` (`dragonFlight.ts:154`, `dragonRider.ts:139`), so the param is purely misleading. Meanwhile other games in this batch use entirely different reward curves:
- `griffinRidersEscape.ts:220-238`: `min(10, correctAnswers + accuracy/survival/speed bonuses)`.
- `griffinSkyJoust.ts:267-275`: `min(maxXP, correctAnswers*perWord + survivalBonus + accuracyBonus)`.
- `dungeonLiberator.ts:516-530`: capped 0–10 with four bonus flags.
- `enchantedLibrary.ts:712-728`: capped 0–10 with accuracy/mana/speed bonuses.
- dragon games: uncapped `floor(correct*accuracy)`.

For 6/10 correct, dragon XP = `floor(6*0.6)=3` (tests `dragonFlight.test.ts:107`, `dragonRider.test.ts:90`), while the bonus-based games can award up to 10 for similar play. If XP feeds a shared leaderboard/progress model in Reading/Primary, these are not normalized, and the dead `score` parameter is a latent bug. (devourer-slime has *no* XP function at all, see F-GAMES-B38-014.)

### F-GAMES-B38-012 · Medium · Non-deterministic, collision-prone entity IDs across multiple games
Entity IDs are built from `Date.now()`/`Math.random()` even where an `rng` is available:
- `devourerSlime.ts:102` `orb-${index}-${Date.now()}-${rng()}` (mixes wall clock into otherwise seeded ids), `:115` knights similarly.
- `dungeonLiberator.ts:505` `monster-${Date.now()}-${Math.random()}`.
- `enchantedLibrary.ts:319` `spirit-${Date.now()}`.
- `griffinSkyJoust.ts:114` `enemy-${index}-${Math.random().toString(36).substr(2,9)}` (also uses **deprecated `String.prototype.substr`**).

`Date.now()`-based IDs collide when multiple entities spawn in the same millisecond (common in a spawn loop) and break seeded reproducibility/snapshot tests. Use a monotonic counter on state or the injected `rng`. (`griffinRidersEscape.ts:37` uses `Math.random().toString(36)` too, but at least no clock.)

### F-GAMES-B38-013 · Medium · `difficulty.ts` exports `validateDifficultyConfig` but no test covers it; unit names "px/s" against multipliers
`difficulty.ts:73-107` `validateDifficultyConfig` is the guardrail enforcement entry point, yet `difficulty.test.ts` never calls it — the suite only asserts the static constants (`DIFFICULTY_GUARDRAILS`, tier `wordCount.max`, `FALLBACK_DIFFICULTY_CONFIG`). The one piece of actual logic is untested. Separately, the guardrail names assert physical units (`maxScrollSpeedPxPerSec`, `maxEnemySpeedPxPerSec`) but `DIFFICULTY_TIERS` stores **dimensionless multipliers** (`speedMultiplier` 0.6–1.6, `difficulty.ts:16,...`); `validateDifficultyConfig` compares a caller-supplied `speed` against `maxScrollSpeedPxPerSec=200`, so whether a multiplier or a px/s value is passed is ambiguous and unchecked. Add tests for the validator and clarify the unit contract — especially since F-GAMES-B38-003 shows a real game (enchanted-library) that *would* fail the 300 px/s guardrail if it were enforced.

### F-GAMES-B38-014 · Medium · `devourerSlime` exposes no XP/results function and no timer — progress reporting undefined
`devourerSlime.ts` tracks `score`, `correctAnswers`, `totalAttempts`, `gameTime` on state but exports **no** `calculateXP`/results function (contrast every other game in this batch). It also has no time limit — `victory`/`defeat` are the only terminals (`:259,221`). A host importing this game cannot award normalized XP or compute a completion percentage without bespoke glue, and `score` (100/correct, 500/enemy, −50/wrong, `:245,201,269`) is on a different scale than the 0–10 XP model the other games expose. This is an importability/scoring-contract gap.

### F-GAMES-B38-015 · Low · `contentPackSchema` accepts any extra field at the type level while rejecting it at runtime; non-deterministic generated IDs
`ContentPackMetadata` has an index signature `[key: string]: unknown` (`contentPackSchema.ts:39`), so unknown keys are type-valid, yet `validateContentPackMetadata` (`:144-148`) rejects them at runtime as `unknown field`. This type/runtime mismatch is surprising for callers (TS won't warn, runtime will fail). Also `generatePackId` (`:153-154`) uses `Date.now()` + `Math.random()`, so legacy-pack validation is non-deterministic/non-reproducible. `validateVocabularyItem` (`:83-105`) is typed to accept a fully-formed `VocabularyItem` but immediately runtime-checks for `undefined`/wrong types — fine defensively, but the signature should be `unknown` to match intent. Low impact (validator is robust) but the contract is internally inconsistent.

### F-GAMES-B38-016 · Low · `dungeonLiberatorIndicators` visibility test ignores entity radius and exact axis-aligned angles
`dungeonLiberatorIndicators.ts:26-32` treats a prisoner as visible only if its center is within `[0,viewport]`, ignoring `PRISONER_RADIUS`, so a prisoner half-off the edge is "visible" and gets no indicator (pop-in). The edge projection (`:49-52`) divides by `Math.abs(cos)`/`Math.abs(sin)`; when a prisoner is exactly horizontal/vertical one term is `Infinity` and `Math.min` saves it, but a prisoner at the exact screen center (`dx=dy=0`) yields `angle=atan2(0,0)=0` and `t=0`, placing the indicator at center with rotation 0 — only reachable if an off-screen check passed with zero delta, which can't happen, so benign. Minor robustness/UX polish, not a defect.

### F-GAMES-B38-017 · Low · `dungeonLiberator.calculateDungeonLiberatorXP` has a no-op identity computation
`dungeonLiberator.ts:517` `const totalAttempts = state.correctWords + (state.totalAttempts - state.correctWords)` algebraically equals `state.totalAttempts`. It is dead arithmetic that obscures intent and invites a future editor to "fix" it incorrectly. Replace with `state.totalAttempts`.

### F-GAMES-B38-018 · Low · `enchantedLibrary.checkVictoryCondition` returns `true` for an empty progress map
`enchantedLibrary.ts:488-498` iterates `vocabularyProgress.entries()` and returns `false` only if some count `< 2`; an empty map returns `true` (vacuous victory). The constructor always populates the map for a non-empty pack (`:109-112`), so it's unreachable today, but if the game is ever reset/constructed with a cleared map the player instantly "wins". Guard with `state.totalWords > 0` (or `map.size === expected`). Low impact, latent.

### F-GAMES-B38-019 · Low · Inconsistent mobile reference resolution (700 vs 800×600 vs 844)
Canvas reference dimensions differ across the batch versus the documented `390×844` portrait reference (`apps/advantage-games/AGENTS.md`):
- `griffinRidersEscapeConfig.ts:1-2` → `390×844` (matches).
- `griffinSkyJoustConfig.ts:15-16` → `390×700`.
- `devourerSlime.ts:50-51` → `800×800` (landscape arena).
- `dungeonLiberator.ts:68-69` & `enchantedLibrary.ts:81-82` → `800×600` (landscape).

Mixed/landscape coordinate spaces mean each game letterboxes or scales differently inside a single portrait host shell, complicating a uniform responsive container and touch-control overlay for embedding into Reading/Primary. Only griffin-riders-escape matches the documented reference.

### F-GAMES-B38-020 · Low · `enchantedLibrary` XP needs `correctAnswers`/`totalAttempts` the state never tracks
`calculateEnchantedLibraryXP(state, correctAnswers, totalAttempts)` (`enchantedLibrary.ts:712-716`) requires the caller to supply attempt counts because the state only tracks `vocabularyProgress`/`mana`, not running correct/total tallies. This diverges from `dungeonLiberator.calculateDungeonLiberatorXP(state)` (self-contained) and the dragon results functions, so the host must remember which games need extra args. A uniform `calculateXP(state)` signature across titles would reduce integration error. Also `:724` uses `state.mana / INITIAL_MANA` for the survival bonus even though mana can exceed 50 (correct books add +10 uncapped, `:395`), so the ratio can exceed 1 — harmless to the boolean but conceptually loose.

### F-GAMES-B38-021 · Low · `devourerSlime` enemy velocity can be near-zero; "victory" path relies on single-word sentences
`devourerSlime.ts:120-123` sets enemy velocity to `(rng()-0.5)*2` per axis — with the test seed `rng=()=>0.1` this yields `-0.8` (fine), but values near `rng()≈0.5` produce near-stationary "knights" that never patrol, undermining the dodge mechanic. There is no minimum-speed normalization. Separately, the victory test (`devourerSlime.test.ts:84-90`) uses a one-word "sentence" (`'Eat'`) so a single orb completes the game; multi-word sentence completion + `spawnLevel` reset (`:255-265`) is only indirectly covered. Minor balance/coverage gaps.

### F-GAMES-B38-022 · Info · `SentenceItem` is re-declared per game instead of reusing the canonical `VocabularyItem`
`dungeonLiberator.ts:1-4` and `griffinSkyJoust.ts:7-11` each define a local `SentenceItem { term; translation; id? }` that is structurally identical to the canonical `VocabularyItem` (`useGameStore.ts:3-7`), which the rest of the batch imports. This type fragmentation means a shared content pipeline must satisfy multiple equivalent-but-distinct types and the host cannot rely on a single import. Consolidate on `VocabularyItem`.

### F-GAMES-B38-023 · Info · `griffinSkyJoust` enters at `status:'start'` and needs `startGame`; several siblings auto-start — lifecycle not uniform
`griffinSkyJoust.ts:84` initializes `status:'start'` and requires `startGame` (`:260-265`), and `devourerSlime`/`dungeonLiberator` start directly at `'playing'` (`devourerSlime.ts:71`, `dungeonLiberator.ts:114`) while `griffinRidersEscape` also starts at `'playing'` (`griffinRidersEscape.ts:62`). Terminal vocab also differs (`victory|defeat` vs enchanted-library's `victory|gameover`, `enchantedLibrary.ts:34`). For a shared runtime that must know when to show a start gate and when to record completion, a canonical lifecycle/status enum across titles would remove per-game special-casing. (Consistent with cross-cutting findings in prior batches.)

---

## Cross-Cutting Observations (read-only, not single-line defects)

- **No shared `GameState` contract.** Status fields (`status` vs `phase`), terminal states (`victory`/`defeat`/`gameover`/endless), lifecycle entry (`start` vs immediate `playing`), and `calculateXP` signatures all differ across the eight games here. A single canonical contract would make these uniformly importable into Reading/Primary. (F-GAMES-B38-011, -020, -023.)
- **Determinism is partial.** dragon-flight/rider and griffin-riders-escape thread `rng` cleanly; devourer-slime, dungeon-liberator, enchanted-library, and all ID generators leak `Math.random()`/`Date.now()`. Seeded replay/snapshot testing is not reliably possible. (F-GAMES-B38-006, -012.)
- **Frame-rate independence is inconsistent.** griffin-sky-joust and dungeon-liberator scale by `dt`; enchanted-library does not (F-GAMES-B38-003). This is the single most user-visible portability/performance risk in the batch.
- **Difficulty taxonomy is fractured.** `difficulty.ts` provides a clean canonical tier table and guardrails, but most games define their own `medium`-based enums and never call the guardrail validator (F-GAMES-B38-004, -009, -010, -013). The shared infrastructure exists but is largely unused by the games it should govern.
- **A11y / asset / audio / render** layers (Konva components, sprites, sound, i18n strings, ARIA) are **not** in this batch — every file is pure logic, config, or a unit test. Accessibility, age-appropriate motion/audio, and browser/touch correctness are deferred to the component batches for these titles.

---

## Limitations

- **Read-only:** No source was edited. I did execute the in-batch Jest suites for verification:
  - `npx jest src/lib/games/griffinRidersEscape.test.ts` → **FAIL** (2 tests; basis for F-GAMES-B38-001).
  - `npx jest devourerSlime|difficulty|dragonFlight|dragonRider|dungeonLiberator|dungeonLiberatorIndicators|enchantedLibrary` → 7 suites / 144 tests **pass**.
  - `check-types`/`tsc` and `lint` were **not** run; type-soundness findings (e.g. divergent enums in F-GAMES-B38-004) are inferred from static reading and the canonical store types, not from a compiler run.
- **Out of batch:** `useGameStore.ts` and `xp.ts` were opened only as context for the canonical `VocabularyItem`/`Difficulty`/shared XP; they are not part of this batch and were not fully reviewed. Adaptive-difficulty, leaderboard/progress aggregation, and the Konva render/component layers for these games live in other batches and were not examined.
- **Content quality** of vocab/sentence packs (locale completeness es/zh/th, pedagogical ordering) was not audited beyond the structural rules in `contentPackSchema.ts`.
- **Performance/mobile/browser** findings (F-GAMES-B38-003, -007, -019) are reasoned from the logic and constants; no on-device profiling or real-canvas measurement was performed.

---

## Scope Confirmation

- Report exists at the required path and covers **all 20 files** listed in `/tmp/opencode/games-batch-38`.
- Every file appears in the Files Reviewed table; findings are line-anchored with severities and `F-GAMES-B38-###` IDs.
- This is a line-by-line review artifact only. **No acceptance or closeout claims are made**; gate decisions remain with the track owner.
