# Line-by-Line Review — games-batch-40

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-40`
**Scope source:** `/tmp/opencode/games-batch-40` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is **runtime source** (`.ts` game-logic modules, config modules, sample-content module, and Jest unit tests) under `apps/advantage-games/src/lib/games/`. Test runner for this app is **Jest** (`package.json: "test": "jest"`, `jest.config.ts`). Supporting files read for context only (not in batch, not scored as finding targets): `src/store/useGameStore.ts`, `src/lib/games/basePath.ts`, prod consumers (`RuneMatchGame.tsx`, `RuneForgeChamberGame.tsx`, `rpg-battle/page.tsx`, `BattleSelectionModal.tsx`), and the asset directory `public/games/vocabulary/rpg-battle/`.
**Finding ID scheme:** `F-GAMES-B40-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Type | Game / Subject |
|---|------|------|----------------|
| 1 | `realmCarverConfig.ts` | config | Realm Carver |
| 2 | `rpgBattleScaling.test.ts` | test | RPG Battle (scaling) |
| 3 | `rpgBattleScaling.ts` | logic | RPG Battle (scaling) |
| 4 | `rpgBattleSelection.test.ts` | test | RPG Battle (selection data) |
| 5 | `rpgBattleSelection.ts` | data | RPG Battle (hero/location/enemy) |
| 6 | `rpgBattleSprites.test.ts` | test | RPG Battle (sprites) |
| 7 | `rpgBattleSprites.ts` | logic | RPG Battle (sprites) |
| 8 | `rpgBattleWordSelection.test.ts` | test | RPG Battle (word selection) |
| 9 | `rpgBattleWordSelection.ts` | logic | RPG Battle (word selection) |
| 10 | `rpgBattleXp.test.ts` | test | RPG Battle (XP) |
| 11 | `rpgBattleXp.ts` | logic | RPG Battle (XP) |
| 12 | `runeForgeChamber.test.ts` | test | Rune Forge Chamber |
| 13 | `runeForgeChamber.ts` | logic | Rune Forge Chamber |
| 14 | `runeForgeChamberConfig.test.ts` | test | Rune Forge Chamber (config) |
| 15 | `runeForgeChamberConfig.ts` | config | Rune Forge Chamber (config) |
| 16 | `runeMatch.test.ts` | test | Rune Match |
| 17 | `runeMatch.ts` | logic | Rune Match |
| 18 | `runeMatchConfig.test.ts` | test | Rune Match (config) |
| 19 | `runeMatchConfig.ts` | config | Rune Match (config) |
| 20 | `sampleSentences.ts` | content | Shared fallback sentences |

---

## Findings

### File 1 — `realmCarverConfig.ts`

**F-GAMES-B40-001 · Low · realmCarverConfig.ts:1-2**
`GAME_WIDTH = 390` / `GAME_HEIGHT = 600`. The 600 height diverges from the platform reference viewport (390×844 per `apps/advantage-games/AGENTS.md`). This is the same viewport-inconsistency family seen elsewhere in the suite (e.g. Rune Forge 700 — F-GAMES-B40-028). Responsive scaling/letterboxing on a true 844-tall device is unspecified in config.

**F-GAMES-B40-002 · Low · realmCarverConfig.ts:5-35**
A single fixed config block with no difficulty tiers (`player.initialHp: 3`, `monster.count: 2`, fixed speeds). This is inconsistent with the difficulty-parameterized sibling games in this batch (Rune Forge Chamber and Rune Match both expose `easy/normal/hard[/extreme]` presets) and with the difficulty requirement of this review. Realm Carver offers no easy/normal/hard scaling at the config layer.

**F-GAMES-B40-003 · Low · realmCarverConfig.ts:22-24**
`word.radius: 15` → a 30px visual diameter for word pickups, below the 44px minimum touch-target convention that Rune Forge explicitly encodes (`minTouchTarget: 44`, F-GAMES-B40-029). Realm Carver movement appears to be continuous (player auto-moves via `vx/vy`, see batch-39 logic), so words may be collected by collision rather than tap; the accessibility impact depends on the (out-of-batch) input model. Flagged as a touch-target/accessibility consideration to confirm at the view layer.

### File 2 — `rpgBattleScaling.test.ts`

**F-GAMES-B40-004 · Info · rpgBattleScaling.test.ts:37-43**
Positive: `rollEnemyDamage` is tested deterministically by injecting `rng` (`() => 0` and `() => 0.999`), verifying both range bounds. This is the correct pattern for a randomness-dependent function and contrasts with reducers elsewhere that call `Math.random` directly.

### File 3 — `rpgBattleScaling.ts`

**F-GAMES-B40-005 · Low · rpgBattleScaling.ts:23-29**
`getEnemyDamageRange` scales only the **upper** bound (`BASE_ENEMY_DAMAGE_MAX * multiplier`) and never the minimum (`min` is always `BASE_ENEMY_DAMAGE_MIN = 6`). For the slime (multiplier `0.5`) `scaledMax = round(10*0.5) = 5`, then clamped up to `6`, so the easiest enemy deals a **constant 6** (no variance) while min damage is identical across all enemies regardless of tier. The difficulty curve therefore widens only upward; low tiers are not made gentler on the damage floor. Tested/asserted (test lines 31-32), so this is an intentional but asymmetric design worth noting against age-appropriate difficulty balancing.

**F-GAMES-B40-006 · Info · rpgBattleScaling.ts:9-38**
Positive: all four functions are pure, accept an injectable `rng` default, and use `Math.round`/`Math.max` guards. JSDoc present per repo doc standard. `BASE_*` constants are exported and consumed by `BattleSelectionModal.tsx` (confirmed in prod), so this module is live and importable.

### File 4 — `rpgBattleSelection.test.ts`

**F-GAMES-B40-007 · Low · rpgBattleSelection.test.ts:5-72**
Tests are full `toEqual` snapshots of the three data arrays, including `withBasePath(...)` on every asset URL — this is a genuine importability check (assets resolve under a non-root base path). The trade-off: any label/order/asset-path edit forces a parallel test edit with no behavioral signal. Acceptable for static data, but brittle and duplicative of the source.

### File 5 — `rpgBattleSelection.ts`

**F-GAMES-B40-008 · Info · rpgBattleSelection.ts:1, 26-87**
Positive for importability: every sprite/background URL is wrapped in `withBasePath`, and all 10 referenced asset files exist in `public/games/vocabulary/rpg-battle/` (verified: 2 hero sheets, 4 enemy sheets, 4 backgrounds). The module exports typed ID unions (`BattleHeroId`, `BattleLocationId`, `BattleEnemyId`) and is consumed by the live RPG Battle page/store/modal. Multipliers (slime 0.5 → elemental 2) feed the scaling module coherently.

**F-GAMES-B40-009 · Low · rpgBattleSelection.ts:26-37 vs rpgBattleSprites.ts:3-13**
The hero/enemy sprite path lists are duplicated between this file and `rpgBattleSprites.ts`. Two independent sources of truth for the same asset URLs invite drift (rename one, miss the other). Consolidate to a single exported list.

### File 6 — `rpgBattleSprites.test.ts`

**F-GAMES-B40-010 · Low · rpgBattleSprites.test.ts:1-15**
Only two trivial boundary tests (`rng()=0` → first item, `rng()=0.999` → last item). The functions exercised (`selectRandomHeroSprite`/`selectRandomEnemySprite`) are not used anywhere in production (see F-GAMES-B40-011), so this is test coverage of dead code — it provides confidence in a code path the app never runs.

### File 7 — `rpgBattleSprites.ts`

**F-GAMES-B40-011 · Medium · rpgBattleSprites.ts (whole)**
This entire module is **dead code**: a repo grep shows `rpgBattleSprites` is imported only by its own test (`rpgBattleSprites.test.ts`) and by no production component, page, or store. The live RPG Battle flow selects sprites via `rpgBattleSelection.ts` instead. Shipping an unused module that duplicates another module's data is a maintenance/drift hazard and inflates the bundle; either wire it in or remove it.

**F-GAMES-B40-012 · Low · rpgBattleSprites.ts:3-13**
`HERO_SPRITES`/`ENEMY_SPRITES` re-declare the same `withBasePath(...)` paths already defined in `rpgBattleSelection.ts` (cross-ref F-GAMES-B40-009). `pickRandom` correctly clamps the index with `Math.min(items.length - 1, ...)`, so the logic itself is sound — the problem is duplication, not correctness.

### File 8 — `rpgBattleWordSelection.test.ts`

**F-GAMES-B40-013 · Low · rpgBattleWordSelection.test.ts:4-38**
Coverage gaps: no test for the empty-vocabulary path (`vocabulary.length === 0 → []`, logic line 37), no test for `count` exceeding vocabulary length (clamp at line 57), and no explicit test that **unattempted** words (`attempts: 0`) are treated as maximum difficulty / `power` (the `Fire` case happens to exercise it but the intent isn't asserted as cold-start behavior — F-GAMES-B40-014). The two existing tests cover prioritization and power assignment well but lock in only the `rng()=0`/`rng()=0.5` paths.

### File 9 — `rpgBattleWordSelection.ts`

**F-GAMES-B40-014 · Low · rpgBattleWordSelection.ts:41-46**
A word with no history (`attempts = 0`) yields `accuracy = 0` → `difficulty = 1` → `power` and the highest selection weight (`1.25`). Consequently **unseen** vocabulary is always surfaced as the hardest/`power` action, conflating "never practiced" with "known to be hard." This is a defensible cold-start heuristic, but the `power` label then communicates novelty rather than measured difficulty — relevant to how the host app (Reading/Primary) might interpret per-word difficulty for progress.

**F-GAMES-B40-015 · Info · rpgBattleWordSelection.ts:32-86**
Positive: deterministic via injected `rng`, uses the shared `VocabularyItem` from `@/store/useGameStore` (good importability — no redefined contract), and implements weighted selection **without replacement** (`remaining.splice`) so the same word can't be picked twice. `MIN_WEIGHT = 0.25` guarantees every word retains nonzero selection probability.

**F-GAMES-B40-016 · Low · rpgBattleWordSelection.ts:80-86**
Action `id` is `${selection.term}-${index}` where `index` is the selection slot. Because selection is without replacement, terms are unique within a call, so no key collision arises within one selection — but the id is not stable across re-selections (same term gets a different slot index), which can disrupt React reconciliation/animation if the action list is re-derived mid-round. Minor.

### File 10 — `rpgBattleXp.test.ts`

**F-GAMES-B40-017 · Info · rpgBattleXp.test.ts:4-77**
Positive: thorough boundary coverage — clamps to `1`/`10` at the extremes and asserts monotonicity in each input dimension independently (health, turn efficiency, streak). Pure-function testing done correctly.

### File 11 — `rpgBattleXp.ts`

**F-GAMES-B40-018 · Info · rpgBattleXp.ts:18-28**
Clean: divide-by-zero guards (`Math.max(1, …)`), weighted `efficiencyScore` (health 0.6 / turns 0.4) plus a bounded streak boost (≤0.2), clamped to `1..10`. Note for the cross-cutting XP theme: this game's **floor is 1** (even a total loss returns 1), whereas Rune Forge's `calculateXP` can return its `baseXP` floor of 0 (0 correct → 0). The per-game XP scales remain unreconciled across the suite.

### File 12 — `runeForgeChamber.test.ts`

**F-GAMES-B40-019 · Medium · runeForgeChamber.test.ts:99-135, 166-216**
Many tests drive behavior by **mutating private state** before ticking (`state.timer = 50`, `state.player.health = 0`, `state.targetIndex = state.words.length`, `state.status = 'defeat'`) rather than exercising the documented public flow. This is white-box coupling to internal field names: refactors that preserve behavior will break these tests, and—more importantly—paths only reachable by hand-set fields (e.g. the tick-driven level advance at logic line 202) are not validated through real play.

**F-GAMES-B40-020 · Low · runeForgeChamber.test.ts:61-71**
The "should shuffle circle angles" test asserts `angles !== baseAngles`. With a deterministic LCG seed this passes, but the assertion is structurally fragile: a shuffle that returns the identity permutation combined with a near-zero `angleOffset` could in principle equal the base angles. The test also mixes a seeded LCG (some cases) with default `Math.random` (most `createRuneForgeChamberState(mockVocabulary)` calls), so most assertions rely on loose dynamic lookups rather than fixed expectations.

**F-GAMES-B40-021 · Low · runeForgeChamber.test.ts (whole)**
No test covers `advanceRuneForgeLevel`'s non-determinism (it hard-codes `Math.random`, F-GAMES-B40-022), the fact that later levels are **not** angle-shuffled (F-GAMES-B40-024), or a terminal success/victory state (none exists — F-GAMES-B40-025). `calculateXP` is well covered; the progression loop is under-covered.

### File 13 — `runeForgeChamber.ts`

**F-GAMES-B40-022 · Medium · runeForgeChamber.ts:135-136**
`advanceRuneForgeLevel` hard-codes `const rng = Math.random` instead of threading the `rng` accepted by `createRuneForgeChamberState`. Next-sentence selection on every level transition is therefore non-deterministic and unseedable, breaking replay/leaderboard reproducibility and forcing tests to avoid the path. Same reducer-non-determinism family as the rest of the suite.

**F-GAMES-B40-023 · Medium · runeForgeChamber.ts:59, 95, 150**
`generateId = () => Math.random().toString(36)...` is used for every circle ID, both at creation and on level advance, even when an `rng` is injected. IDs are thus non-deterministic regardless of seed, undermining deterministic tests, React `key` stability across reseeds, and replay parity. The function-creation rng is bypassed for identity.

**F-GAMES-B40-024 · Low · runeForgeChamber.ts:104-109 vs 147-157**
`createRuneForgeChamberState` shuffles circle angles via Fisher-Yates (lines 104-109), but `advanceRuneForgeLevel` (lines 147-157) builds circles with evenly-spaced `baseAngle` and **no shuffle**. After level 1 the orbiting words snap to a predictable, evenly-distributed layout — an inconsistent difficulty/visual model between the first level and all subsequent levels.

**F-GAMES-B40-025 · Low · runeForgeChamber.ts:6, 173-207**
`GameStatus = 'start' | 'playing' | 'defeat'` — there is **no win/victory state**. The game is endless: each level shrinks `maxTimer` by ×0.8 (line 138), so the timer eventually becomes too small to clear a sentence and defeat is guaranteed. "Success" is expressed only via accumulated `calculateXP` at defeat. A host app importing this game has no terminal success signal, only a defeat event + XP — relevant to progress/completion reporting.

**F-GAMES-B40-026 · Low · runeForgeChamber.ts:202-204, 234-236**
Level advancement is checked in two places: inside `tickRuneForgeChamber` (line 202, `targetIndex >= words.length`) and inside `selectCircle` (line 234). In normal play `selectCircle` always advances first, so the tick-path branch is effectively reachable only when a caller externally sets `targetIndex` (exactly what the test at line 128 does). Redundant control flow that exists primarily to satisfy a white-box test.

### File 14 — `runeForgeChamberConfig.test.ts`

**F-GAMES-B40-027 · Low · runeForgeChamberConfig.test.ts:40-93**
The `extreme` / "Grandmaster" tier is defined in config (`difficulties.extreme`, `timerDurations.extreme`) but never tested: `getDifficultyConfig('extreme')` and `getTimerDuration('extreme')` are not asserted, and the difficulty-preset test only checks easy/normal/hard. The full `Difficulty` union (which includes `extreme`) is therefore only partially validated. (Positive: `minTouchTarget: 44` is asserted, line 15.)

### File 15 — `runeForgeChamberConfig.ts`

**F-GAMES-B40-028 · Low · runeForgeChamberConfig.ts:14-19**
`GAME_HEIGHT = 700` / `arenaHeight: 700` diverges from the 390×844 reference. With `runeStone` at center (350) and `circleOrbitRadius: 200`, orbiting circles span y≈150–550 inside a 700 canvas; behavior when scaled onto an 844-tall device is unspecified in config. Same viewport-inconsistency family as Realm Carver (600, F-GAMES-B40-001).

**F-GAMES-B40-029 · Info · runeForgeChamberConfig.ts:25, 45-50, 53-58**
Positive: `minTouchTarget: 44` matches the WCAG/mobile touch-target convention; difficulty presets cover the full `easy/normal/hard/extreme` union aligned with `useGameStore`'s `Difficulty`; and both `getDifficultyConfig`/`getTimerDuration` safely fall back to `normal`. Well-formed difficulty/lookup contract.

**F-GAMES-B40-030 · Low · runeForgeChamberConfig.ts:27-32 vs 45-50**
The timer durations are duplicated across two structures: `timerDurations.{easy:15000,normal:12000,hard:10000,extreme:8000}` and `difficulties.<tier>.timer` carry identical values. `getTimerDuration` reads the former while `getDifficultyConfig` (used by the actual game, logic line 77) reads the latter — two sources of truth for the same tuning knob, a drift risk if one is edited.

### File 16 — `runeMatch.test.ts`

**F-GAMES-B40-031 · Low · runeMatch.test.ts:34, 180, 452**
There are **three** `describe("advanceTime")` blocks, and the middle one (line 180) actually tests `processMatches`/`findMatches`, not `advanceTime` — a mislabeled suite. Duplicate/incorrect describe names make failures hard to localize and signal copy-paste test authoring.

**F-GAMES-B40-032 · High · runeMatch.test.ts (whole)**
No test exercises the **power-word** path. Every combat test either uses non-vocabulary groups (heal/shield) or constructs `wordId` from `initializeEmptyGrid` runes whose `wordId` is `word-r-c`, while `powerWord` is a translation from `createRuneMatchState` — so `isPower` is always false in the tests too. The suite therefore cannot detect the broken power mechanic (F-GAMES-B40-034) nor that `correctAnswers` is permanently 0 in production. A central scoring/learning path is entirely unverified, giving false confidence.

**F-GAMES-B40-033 · Low · runeMatch.test.ts:91-178, 359-450**
Combat tests depend on the test-only fixture `initializeEmptyGrid` (F-GAMES-B40-038) and hand-built `MatchResult` objects rather than driving `swap → findMatches → processMatches → applyMatchResult` through the public flow. The real cascade/gravity/scoring integration (the parts most likely to regress) is therefore only indirectly exercised.

### File 17 — `runeMatch.ts`

**F-GAMES-B40-034 · High · runeMatch.ts:567, 689, 708-709**
Power-word scoring is broken for the production data shape. `createRuneMatchState` sets `powerWord = activeVocabulary[...].translation` (line 709 — e.g. the English `"Hello"`), while `createRandomRune` sets a vocabulary rune's `wordId = item.term.toLowerCase().trim()` (line 689 — e.g. the Thai term). `applyMatchResult` then computes `isPower = group.wordId === state.powerWord` (line 567), comparing a lowercased **term** against a **translation** — these can never be equal for the term≠translation content used by the game. Two consequences: (1) the `powerRuneMultiplier` (2×) damage bonus **never fires**; (2) `correctAnswers` is incremented **only** under `isPower` (line 568), so `correctAnswers` is permanently **0**, making any accuracy/learning/XP metric derived from it always zero. This is a scoring-integrity and importability defect (a host app reading this game's "correct answers"/XP gets a constant 0) and it is untested (F-GAMES-B40-032).

**F-GAMES-B40-035 · Medium · runeMatch.ts:84**
`generateId` uses `Math.random` for all rune and floating-text IDs even though `state.rng` is threaded through the reducer (`advanceTime` correctly uses `state.rng` for damage/timer at lines 418/466). The ID source bypasses the seed, so IDs are non-deterministic regardless of the injected `rng`, harming replay parity and React-key stability.

**F-GAMES-B40-036 · Medium · runeMatch.ts:701**
Active-vocabulary selection shuffles with `[...vocabulary].sort(() => rng() - 0.5)`. A random-sign comparator is not a valid total order, producing a **biased, non-uniform** permutation (well-known `Array.sort` shuffle anti-pattern). Word exposure is therefore skewed toward certain positions — a fairness/coverage concern for a learning game where uniform vocabulary rotation matters. Use Fisher-Yates (as Rune Forge does at its creation path).

**F-GAMES-B40-037 · Low · runeMatch.ts:534-546**
`calculateMatchDamage` hard-codes the 2-match damage as the literal `3` (line 540), while 3/4/5-match values come from `RUNE_MATCH_CONFIG.combat`. The most common match size's tuning is thus a magic number outside the config object, bypassing the otherwise centralized balance knobs (and `RUNE_MATCH_CONFIG` has no `match2Damage` field).

**F-GAMES-B40-038 · Low · runeMatch.ts:143-159**
`initializeEmptyGrid` is a deterministic test fixture (each cell gets a unique `wordId = word-${r}-${c}`, guaranteeing no natural matches) exported from the **production** module. A repo grep shows it is used 13× in tests and 0× in app code. Test scaffolding ships in the runtime module/bundle; it should live in the test file or a test-utils module.

**F-GAMES-B40-039 · Low · runeMatch.ts:359-372**
`processMatches` caps cascades with `if (totalCascades > 100) break;` — a silent safety valve. If it ever triggers (e.g. a pathological gravity refill loop) the function returns a partial result with no log or signal, masking the underlying condition. Minor, but it is the only loop guard and it fails quietly (contrast the repo Observability/structured-logging guidance).

### File 18 — `runeMatchConfig.test.ts`

**F-GAMES-B40-040 · Low · runeMatchConfig.test.ts:56-97**
The suite asserts constant values (including `attackIntervalMs: 5000`, `invalidSwapPenalty` is not even asserted, `shieldDuration: 1`) but never their **wiring**. Because `attackIntervalMs` and `invalidSwapPenalty`/`shieldDuration` are unused by the logic (F-GAMES-B40-041), the config test cements declared values that the runtime ignores — a test that passes while the behavior diverges. A test asserting the attack interval actually governs `nextAttackTimer` would have surfaced the gap.

### File 19 — `runeMatchConfig.ts`

**F-GAMES-B40-041 · Medium · runeMatchConfig.ts:55, 62, 65-66**
Dead/misleading config constants:
- `combat.attackIntervalMs: 5000` is never read — `runeMatch.ts` hard-codes the attack timer as `nextAttackTimer: 3000` (line 725) and resets it to `3000 + rng()*2000` (line 466), i.e. 3–5s, not the configured 5s.
- `combat.invalidSwapPenalty: 1` is never referenced anywhere in the logic.
- `powerUps.shieldDuration: 1` is never used (the shield is a one-shot boolean consumed on the next hit, not a duration).
These advertise tunable behaviors the runtime does not honor, a contract/behavior divergence and balance-drift hazard.

**F-GAMES-B40-042 · Info · runeMatchConfig.ts:1-10, 48-53**
Positive: the four monsters scale in ascending difficulty (`goblin < skeleton < orc < dragon` in hp/attack/xp, asserted by tests), and the `MONSTER_DIFFICULTY` map provides a clean monster→difficulty classification for selection UIs. The config is well-typed via `RuneMatchConfig`.

### File 20 — `sampleSentences.ts`

**F-GAMES-B40-043 · Medium · sampleSentences.ts:3-14**
`SAMPLE_SENTENCES` hardcodes **Thai-only** translations (`term` English, `translation` Thai). A repo grep shows this single array is the fallback content for **14** game `/sentences` API routes (castle-defense, village-guardian, devourer-slime, rune-forge-chamber, labyrinth-goblin-king, dungeon-liberator, abyssal-well, realm-carver, storm-castle-tower, shadow-gate-dungeon, griffin-sky-joust, haunted-library, spellweavers-run, potion-rush). On a multi-locale platform (Reading/Primary serve multiple target languages), a Thai-only fallback means non-Thai deployments receive mismatched/irrelevant translations whenever the fallback path is hit — an i18n/importability gap in shared content.

**F-GAMES-B40-044 · Low · sampleSentences.ts:3-14**
Only 10 fixed sentences are shared across all games as fallback, so fallback sessions are highly repetitive. Several sentences have fewer than 6 words (e.g. "We play games together" = 4 words, "I love to read books" = 5), while Rune Forge's higher tiers request `wordCount` up to 6 (Journeyman) / 8 (Master) / 10 (Grandmaster). The logic silently clamps via `Math.min(diffConfig.wordCount, words.length)` (runeForgeChamber.ts:78), so high-difficulty rounds quietly degrade to fewer circles than the difficulty advertises — no error, but inconsistent difficulty when this fallback content is used.

**F-GAMES-B40-045 · Info · sampleSentences.ts:3-14**
Positive: content is age-appropriate and pedagogically simple (concrete, present-tense declarative sentences suitable for early readers). No problematic vocabulary. Uses the shared `VocabularyItem` shape.

---

## Cross-Cutting Themes

- **Broken / non-normalized scoring (F-GAMES-B40-034, 018, 005):** Rune Match's power-word comparison is type-mismatched (term-lowercase vs translation), so its `correctAnswers` is permanently 0 and the 2× power multiplier never fires — a hard scoring-integrity bug. Across the suite XP scales remain unreconciled: RPG Battle clamps `1..10` with a floor of 1; Rune Forge `calculateXP` can floor at 0. A Reading/Primary import receives non-comparable per-game scores, and Rune Match would report a constant-zero "correct" signal.
- **Non-determinism inside reducers (F-GAMES-B40-022, 023, 035, 036):** `generateId`/`Math.random` are called inside Rune Forge and Rune Match even though an `rng` is injectable; `advanceRuneForgeLevel` hard-codes `Math.random`; Rune Match uses a biased `sort(()=>rng()-0.5)` shuffle. This breaks replay/leaderboard reproducibility and forces white-box tests. (Counter-example/positive: `rpgBattleScaling`/`rpgBattleWordSelection` thread `rng` correctly and are deterministically testable.)
- **Dead code & dead config (F-GAMES-B40-011, 030, 037, 041, 002):** `rpgBattleSprites.ts` is an entire unused module duplicating `rpgBattleSelection` data; Rune Match config has three unused constants (`attackIntervalMs`, `invalidSwapPenalty`, `shieldDuration`) and an out-of-config magic `3` for 2-matches; Rune Forge duplicates timer values across two structures. Declared contracts diverge from runtime behavior.
- **Test-only scaffolding in production source (F-GAMES-B40-038):** `initializeEmptyGrid` (used only by tests) is exported from `runeMatch.ts`.
- **White-box tests masking gaps (F-GAMES-B40-019, 032, 033, 040, 020):** State-mutation-driven tests and hand-built `MatchResult`/state fixtures bypass the public flow; the Rune Match power-word bug and the Rune Forge tick-advance path are invisible to their suites. Config tests assert constants while their wiring is broken/unused.
- **Viewport inconsistency (F-GAMES-B40-001, 028):** Realm Carver (600) and Rune Forge (700) both diverge from the 390×844 platform reference, with no documented responsive-scaling rationale — consistent with the prior batch's finding for the suite.
- **i18n / fallback content (F-GAMES-B40-043, 044):** A single Thai-only 10-sentence array backs 14 games' fallback content, undermining multi-locale importability and silently degrading high-difficulty word counts.
- **Importability positives (F-GAMES-B40-008, 029, 015, 042):** RPG Battle routes all assets through `withBasePath` (assets verified present) and uses the shared `VocabularyItem`; Rune Forge encodes `minTouchTarget: 44` and full-union difficulty with safe fallbacks; monster tiers scale monotonically. Patterns worth propagating.

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 2 | 032, 034 |
| Medium | 8 | 011, 019, 022, 023, 035, 036, 041, 043 |
| Low | 26 | 001, 002, 003, 005, 007, 009, 010, 012, 013, 014, 016, 020, 021, 024, 025, 026, 027, 028, 030, 031, 033, 037, 038, 039, 040, 044 |
| Info | 9 | 004, 006, 008, 015, 017, 018, 029, 042, 045 |

Total findings: **45** (F-GAMES-B40-001 … F-GAMES-B40-045).

---

## Limitations

1. **Scope is exactly the 20 listed files.** Behavior in components that *consume* these reducers (Konva rendering, pointer/touch input wiring, `prefers-reduced-motion`, audio, leaderboard/progress submission, `gameCards` registration) is out of batch and assessed only insofar as the logic/config/content reveal the contract. Accessibility, audio, and live mobile/touch/browser behavior live largely in the (out-of-batch) view layer and could not be verified here.
2. **No execution.** Tests were not run and the app was not built. Assertions about the Rune Match power-word zero-scoring bug, ID collisions, non-deterministic progression, and shuffle bias are derived by static code reading, not observed at runtime.
3. **Cross-references to non-batch files** (`useGameStore.ts`, `basePath.ts`, prod consumers, the asset directory, and the 14 API fallback routes) were read for context only — to confirm types, importability, dead-code status, and asset existence — and are not themselves scored review targets.
4. **Asset binaries not inspected.** The RPG Battle sprite sheets were confirmed to exist by filename only; their dimensions, compression, and mobile load/memory budget were not measured.
5. **No acceptance or closeout determination is made here.** This report records line-anchored findings only and makes no claim that the batch, track, or review phase is accepted, complete, or closed.
