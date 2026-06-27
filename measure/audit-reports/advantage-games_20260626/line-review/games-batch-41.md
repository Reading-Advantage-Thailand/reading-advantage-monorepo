# Line-by-Line Review — games-batch-41

- **Track:** `advantage_games_review_20260626`
- **Batch:** `games-batch-41`
- **Reviewer role:** Line-by-line code reviewer (read-only; no source edits performed)
- **File list source:** `/tmp/opencode/games-batch-41` (20 paths)
- **App:** `apps/advantage-games`
- **Date:** 2026-06-27

## Scope & Method

Each file in the batch was read in full. Findings are anchored to specific
line numbers and rated by severity. Review focus areas: game readiness,
shared runtime/store integration, scoring/XP/leaderboards/progress/difficulty,
importability into Reading/Primary apps, asset/audio/performance/mobile/browser
compatibility, accessibility, age-appropriate UX, and test quality.

Supporting context read (not part of the 20, used for cross-file judgement only):
- `apps/advantage-games/src/store/useGameStore.ts` (shared `VocabularyItem`, `Difficulty`, store API)
- `apps/advantage-games/AGENTS.md` (mobile-first portrait 390×844, TDD >80% coverage mandate)
- Consumer surface confirmed via grep: each game has a `components/games/...` renderer
  and several have `app/[locale]/(student)/student/games/...` pages.

Severity legend: **Critical** (broken/unsafe), **High** (likely defect or
standardization gap with real impact), **Medium** (correctness/maintainability
risk), **Low** (minor), **Info** (observation/limitation).

---

## Files Reviewed (20/20)

1. `src/lib/games/sampleVocabulary.ts`
2. `src/lib/games/shadowGateDungeon.test.ts`
3. `src/lib/games/shadowGateDungeon.ts`
4. `src/lib/games/shadowGateDungeonConfig.test.ts`
5. `src/lib/games/shadowGateDungeonConfig.ts`
6. `src/lib/games/spellweaversRun.test.ts`
7. `src/lib/games/spellweaversRun.ts`
8. `src/lib/games/spellweaversRunConfig.test.ts`
9. `src/lib/games/spellweaversRunConfig.ts`
10. `src/lib/games/stormCastleTower.ts`
11. `src/lib/games/stormCastleTowerConfig.ts`
12. `src/lib/games/villageGuardian.ts`
13. `src/lib/games/villageGuardianConfig.ts`
14. `src/lib/games/wizardZombie.test.ts`
15. `src/lib/games/wizardZombie.ts`
16. `src/lib/games/wizardZombieIndicators.test.ts`
17. `src/lib/games/wizardZombieIndicators.ts`
18. `src/lib/games/wizardZombieLogic.test.ts`
19. `src/lib/games/xp.test.ts`
20. `src/lib/games/xp.ts`

---

## Cross-Cutting Themes

- **Determinism is inconsistent.** Several modules accept an injectable `rng`
  for state creation but then call `Math.random()` directly inside the
  per-frame tick (villageGuardian, wizardZombie) and/or for entity ID
  generation (all modules). This defeats deterministic replay, makes
  simulation tests non-reproducible, and complicates Remotion rendering
  (`WizardZombieGameRenderer.tsx` exists as a consumer).
- **XP/scoring is not standardized.** `xp.ts` is uncapped (`correctAnswers *
  accuracy`), while shadowGate/spellweavers/village each cap at 10 with bespoke
  bonus formulas, and stormCastleTower defines an XP config block but ships no
  XP function in its logic file. There is no single XP contract, which is a
  direct risk for cross-app leaderboards / progress when imported into Reading
  or Primary.
- **Difficulty taxonomy diverges.** Store `Difficulty` is
  `'easy'|'normal'|'hard'|'extreme'`; wizardZombie defines its own
  `'easy'|'medium'|'hard'`. Configs frequently define an `extreme` tier that is
  untested.
- **Arena dimensions are not unified.** Portrait 390×700 (shadowGate, storm,
  village), 390×600 (spellweavers), but wizardZombie is landscape 800×600 —
  violating the AGENTS mobile-first portrait (390×844) guidance.
- **Config duplication / dead config.** Multiple configs declare the same
  tuning value in two places (top-level and inside `difficulties`), and several
  declared knobs are never consumed by logic.

---

## Findings

### `src/lib/games/sampleVocabulary.ts`

- **F-GAMES-B41-001 — Medium — Single-word terms break sentence-game word splitting.**
  Lines 3–29: every entry is a single token (e.g. `'แมว'`/`'Cat'`). The
  sentence games in this batch build their word list via
  `currentSentence.term.split(' ')` (shadowGateDungeon.ts:86,
  spellweaversRun.ts:67, stormCastleTower.ts:73, villageGuardian.ts:189). If
  this sample data is fed to a sentence game, `words.length === 1`, collapsing
  the ordering/sequence mechanic. This data set is only valid for
  vocabulary-style games, not the sentence games it sits beside.
- **F-GAMES-B41-002 — Medium — Hard-coded Thai L1 limits importability/i18n.**
  Lines 4–28: translations assume Thai source language. Reading/Primary serve
  multiple locales; sample/demo content tied to one L1 is not portable and
  should be locale-driven or clearly marked demo-only.
- **F-GAMES-B41-003 — Low — No `id` populated though `VocabularyItem.id` exists.**
  `VocabularyItem` (useGameStore.ts:3–7) allows an optional `id`; none is set.
  Entity tracking/progress keyed by `id` cannot rely on it for this data.

### `src/lib/games/shadowGateDungeon.ts`

- **F-GAMES-B41-004 — Medium — Non-deterministic IDs despite injectable `rng`.**
  Line 70 `generateId` uses `Math.random()` directly; `spawnCrystals`
  (116, 174–180) is otherwise driven by the injected `rng`. Crystal IDs are
  therefore non-reproducible even when `rng: mockRng` is supplied, undermining
  deterministic snapshots/replay.
- **F-GAMES-B41-005 — Low — Mixed time-unit conventions between actors.**
  Player movement uses `deltaSeconds` (195, 206/213) while creature movement
  pre-divides speed by 1000 and multiplies by `deltaMs` (222–223, 251–254). Both
  yield correct px/s, but the divergent conventions in one tick are an
  error-prone maintenance hazard.
- **F-GAMES-B41-006 — Low — `invincible` flag derived from raw timer, not clamped value.**
  Lines 217–218: `invincibilityTimer` is `Math.max(0, …)` but `invincible` is
  `state.player.invincibilityTimer - deltaMs > 0`. Functionally equivalent here,
  but two independent derivations of the same fact invite future drift.
- **F-GAMES-B41-007 — Info — No `score` concept; XP-only progress (cap 10).**
  `calculateXP` (361–379) is the only outward progress signal; there is no
  score field for leaderboards. Cross-game leaderboard parity should be
  confirmed at integration.

### `src/lib/games/shadowGateDungeon.test.ts`

- **F-GAMES-B41-008 — Medium — `extreme` difficulty and patrol speeds untested.**
  The suite covers easy/normal/hard and creature chase, but never
  `difficulty: 'extreme'` (config line 65) nor `getCreaturePatrolSpeed` /
  patrol-mode movement transitions back from chase (shadowGateDungeon.ts:236–242).
- **F-GAMES-B41-009 — Low — Hard-coded magic bounds in assertions.**
  Lines 80–81 assert against literal `390` and `700` rather than `GAME_WIDTH`/
  `GAME_HEIGHT`. If the arena is retuned the test silently encodes stale values.

### `src/lib/games/shadowGateDungeonConfig.ts`

- **F-GAMES-B41-010 — Medium — Duplicate arena dimensions (two sources of truth).**
  Lines 12–13 export `GAME_WIDTH=390`/`GAME_HEIGHT=700`, while lines 16–17 also
  store `arenaWidth`/`arenaHeight` with the same values. Drift between the two
  would desync rendering vs. physics.
- **F-GAMES-B41-011 — Low — `extreme` preset reuses `hard` name "Abyssal Chamber".**
  Line 65 duplicates the `hard` display name (line 64), giving two difficulties
  an identical user-facing label.

### `src/lib/games/shadowGateDungeonConfig.test.ts`

- **F-GAMES-B41-012 — Low — `creaturePatrolSpeeds`, `getCreaturePatrolSpeed`, and `extreme` not asserted.**
  The config test verifies chase speeds (24–29) but omits the patrol-speed map
  (config 30–34) and the `extreme` difficulty preset — coverage gap on shipped
  config surface.

### `src/lib/games/spellweaversRun.ts`

- **F-GAMES-B41-013 — High — XP config constants are dead; XP formula is hard-coded.**
  `calculateSpellweaversRunXP` (218–234) hard-codes `baseXP = min(5, …)` and
  bonuses `2/1/1/1`, ignoring `SPELLWEAVERS_RUN_CONFIG.xpPerSentence` and
  `xpPerCorrectWord` (config 30–31). Tuning the config has no effect on XP —
  a real divergence between declared config and behaviour.
- **F-GAMES-B41-014 — High — `maxWords` difficulty knob is never enforced.**
  `createSpellweaversRunState` (67) splits the full sentence into `words` with
  no slice to `getDifficultyConfig(...).maxWords` (config 41/47/53/59). Unlike
  shadowGate/storm/village (which slice to `wordCount`), difficulty does **not**
  change word count here, contradicting the config’s intent and the difficulty
  contract used by sibling games.
- **F-GAMES-B41-015 — Medium — XP API takes redundant external counters.**
  `calculateSpellweaversRunXP(state, totalCorrect, totalAttempts)` (218–222)
  duplicates `state.correctAnswers`/`state.totalAttempts`. Callers can pass
  values inconsistent with `state`, producing XP that disagrees with in-game
  stats. Prefer deriving from `state`.
- **F-GAMES-B41-016 — Medium — Non-deterministic orb IDs.**
  Line 45 `generateId` uses `Math.random()`; `spawnOrb`/`tickSpellweaversRun`
  accept `rng` but the ID is unseeded, breaking reproducible spawns.

### `src/lib/games/spellweaversRun.test.ts`

- **F-GAMES-B41-017 — Medium — Tests assert against `SPELLWEAVERS_RUN_CONFIG.scrollSpeed.normal` while production uses `difficulties.normal.scrollSpeed`.**
  Line 146 uses the top-level `scrollSpeed.normal` (90), but
  `tickSpellweaversRun` (121–122) reads `getDifficultyConfig(...).scrollSpeed`
  (the `difficulties` map). They coincidentally equal 90, so the test passes for
  the wrong reason and would not catch divergence between the two duplicated
  config sources.
- **F-GAMES-B41-018 — Low — No `extreme` difficulty or `maxWords` enforcement test.**
  Combined with F-GAMES-B41-014, the missing assertion is why the unused
  `maxWords` regression is undetected.

### `src/lib/games/spellweaversRunConfig.ts`

- **F-GAMES-B41-019 — Medium — Duplicate `scrollSpeed`/`spawnInterval` (top-level vs. `difficulties`).**
  Lines 15–26 vs. 36–61 declare the same tuning twice. Production
  (`getDifficultyConfig`) reads `difficulties`; the top-level maps are consumed
  only by tests (F-GAMES-B41-017). Two sources of truth = drift risk.
- **F-GAMES-B41-020 — Low — `GAME_HEIGHT=600` diverges from sibling portrait games (700).**
  Line 11. Acceptable per-game, but flagged for arena-standardization review.

### `src/lib/games/spellweaversRunConfig.test.ts`

- **F-GAMES-B41-021 — Low — `extreme` preset untested.**
  Lines 49–73 cover easy/normal/hard only; the shipped `extreme` tier
  (config 55–60) has no assertion.

### `src/lib/games/stormCastleTower.ts`

- **F-GAMES-B41-022 — High — No test file in this batch for a 337-line stateful module.**
  Neither `stormCastleTower.ts` nor `stormCastleTowerConfig.ts` has a colocated
  test in this batch, despite the AGENTS >80% coverage / TDD mandate. Movement,
  window collection, hazard collision, scroll, and win/lose transitions are
  unverified here. (A test may exist elsewhere — see Limitations.)
- **F-GAMES-B41-023 — High — No XP function despite config XP block.**
  `STORM_CASTLE_TOWER_CONFIG.xp` (config 52–56) declares
  `perCorrectWord/accuracyBonus/maxXP`, but this module exports no
  `calculateXP`. Sibling games all expose one. XP must therefore live in the
  component (untestable in isolation) or be missing — a progress/leaderboard
  consistency gap.
- **F-GAMES-B41-024 — Medium — Player row has no upper bound.**
  `movePlayer` 'up' (134–136) does `row + 1` with no max clamp (contrast 'down'
  clamps to `Math.max(0, …)` and 'left'/'right' clamp to columns). A player can
  scroll past all windows into empty space.
- **F-GAMES-B41-025 — Medium — Non-deterministic hazard IDs.**
  Line 224 `id: \`hazard-${Date.now()}-${Math.random()}\`` ignores the injected
  `rng` param, so hazard identity is unreproducible even in seeded tests.
- **F-GAMES-B41-026 — Low — Initial phase `'start'` (requires explicit `startGame`).**
  Lines 78 / 323–329: unlike shadowGate/spellweavers/village (which begin
  `'playing'`), this game starts `'start'`. Consumers must call `startGame`;
  the lifecycle contract differs across games.
- **F-GAMES-B41-027 — Low — `extreme` preset reuses `hard` name "Lord's Citadel".**
  Config 49 duplicates line 48’s label.

### `src/lib/games/stormCastleTowerConfig.ts`

- **F-GAMES-B41-028 — Low — Several declared knobs appear unconsumed by logic.**
  `window` (25–29), `hazards.oilInterval/rockInterval/shutterWarning` (32–34)
  are not referenced in `stormCastleTower.ts`; they presumably drive the
  component. Flagged so integration confirms they are wired (or removes dead
  config).

### `src/lib/games/villageGuardian.ts`

- **F-GAMES-B41-029 — High — Tick is non-deterministic (`Math.random` inside simulation).**
  `updateVillagers` (319), `checkCollisions` (490, 525), and
  `advanceLevelIfComplete` (571, 576) call `Math.random()` directly.
  `tickVillageGuardian` does not even accept an `rng` parameter (235–239), so
  the only injectable randomness (`createVillageGuardianState`) cannot reach the
  loop. Deterministic replay / Remotion rendering / reproducible tests are
  impossible for the running game.
- **F-GAMES-B41-030 — High — No colocated test for a 630-line module.**
  Files 12/13 ship no test in this batch. The most complex module in the batch
  (trail mechanics, monster AI, rescatter, level progression, XP) is unverified
  here against the TDD/coverage mandate. (See Limitations.)
- **F-GAMES-B41-031 — Medium — `calculateXP` divides by zero when no attempts.**
  Line 615: `accuracy = correctAnswers / (correctAnswers + wrongAnswers)`. With
  both zero this is `NaN`. `NaN >= threshold` is false so no bonus is added and
  the function still returns `0`, but relying on NaN-comparison semantics is
  fragile; an explicit guard is warranted.
- **F-GAMES-B41-032 — Medium — No `victory`/completion status (endless only).**
  `GameStatus = 'start' | 'playing' | 'defeat'` (line 12). The game advances
  levels indefinitely (`advanceLevelIfComplete`) and can only end in defeat.
  Importing into a lesson flow that expects a completion signal needs a defined
  end condition.
- **F-GAMES-B41-033 — Low — `getRandomPosition(Math.random)` reseeds per call.**
  Lines 490, 525 pass `Math.random` explicitly, doubling down on
  F-GAMES-B41-029.

### `src/lib/games/villageGuardianConfig.ts`

- **F-GAMES-B41-034 — Medium — Dead/duplicated speed and timer config.**
  `monsterSpeeds` (28–32) is the map actually consumed by `getMonsterSpeed`
  (77–79), while `difficulties.*.monsterSpeed` (62–65) is never read by the
  logic. Likewise `timerDurations` (34–39) + `getTimerDuration` (73–75) are
  unused because `createVillageGuardianState` reads `diffConfig.timer`
  (villageGuardian.ts:229). Two unused/duplicated tuning surfaces.

### `src/lib/games/wizardZombie.ts`

- **F-GAMES-B41-035 — High — Impure mutation of input state in `checkCollisions`.**
  Lines 221 & 223: `state.totalAttempts += 1` and `state.correctAnswers += 1`
  mutate the **passed-in** state object before returning a new object that does
  *not* spread these fields back (the return at 274–281 omits
  `totalAttempts`/`correctAnswers`). This both mutates caller-owned state (a
  React/Zustand hazard) and means the returned state’s counters are sourced from
  the mutated input — a subtle correctness/aliasing bug.
- **F-GAMES-B41-036 — High — Landscape 800×600 violates mobile-first portrait mandate.**
  Lines 55–56. AGENTS specifies portrait 390×844; every sibling game uses
  390-wide portrait. This game’s landscape arena is a mobile-UX/compatibility
  outlier.
- **F-GAMES-B41-037 — High — Simulation uses `Math.random` directly; `rng` only used at create.**
  Lines 237, 239, 247, 300, 316, 333–334, 392/403/426 (reshuffle/spawn/wander).
  `advanceWizardZombieTime` ignores `rng`. Non-deterministic; same replay/test
  concerns as villageGuardian.
- **F-GAMES-B41-038 — Medium — Local `Difficulty` type diverges from shared store type.**
  Line 33 defines `'easy' | 'medium' | 'hard'` vs. store
  `'easy' | 'normal' | 'hard' | 'extreme'` (useGameStore.ts:9). `'medium'` is
  unique to this game; difficulty selection cannot be shared across games.
- **F-GAMES-B41-039 — Medium — No win condition; endless survival only.**
  `status: "playing" | "gameover"` (36). Acceptable as a genre choice but, like
  villageGuardian, lacks a completion signal for lesson integration.
- **F-GAMES-B41-040 — Low — Score model (+10/−5, floor 0) is bespoke and uncapped vs. XP cap-10 games.**
  Lines 232, 243. Another standardization gap for leaderboards.

### `src/lib/games/wizardZombie.test.ts`

- **F-GAMES-B41-041 — Medium — Extremely thin coverage (single init test).**
  31 lines testing only `createWizardZombieState` defaults. No coverage of
  scoring, healing, shockwave-charge cap, target reshuffle, or the
  totalAttempts mutation bug (F-GAMES-B41-035). The bulk of behaviour relies on
  `wizardZombieLogic.test.ts`.

### `src/lib/games/wizardZombieIndicators.ts`

- **F-GAMES-B41-042 — Low — Visibility test ignores orb radius.**
  Lines 24–28 use orb center only; an orb whose center is just off-screen but
  body still visible is treated as off-screen (and vice-versa). Minor visual
  edge case for off-screen indicator arrows.
- **F-GAMES-B41-043 — Info — Pure, deterministic, well-structured.**
  Good example of testable logic; no randomness, no hidden state.

### `src/lib/games/wizardZombieIndicators.test.ts`

- **F-GAMES-B41-044 — Low — Only right/top edges tested; left/bottom and diagonal corners untested.**
  Lines 18–44 cover one horizontal and one vertical case; corner clamping
  (where `tX`/`tY` tie) and negative-axis directions are not asserted.

### `src/lib/games/wizardZombieLogic.test.ts`

- **F-GAMES-B41-045 — Medium — Tests depend on real `Math.random` (potential flakiness).**
  The module under test uses `Math.random` in spawn/wander (F-GAMES-B41-037).
  Assertions (e.g. lines 72–73 zombie-moves-toward-player, 150/164 reshuffle
  id-changes) are written to be robust, but reshuffle-id checks (`!==`) can in
  principle collide and randomness makes them order-of-magnitude harder to
  reason about than seeded tests would be.
- **F-GAMES-B41-046 — Low — Tests mutate `initialState` directly.**
  Lines 37, 58, 79–88, 102, 121–129, etc. assign into `state.player`/
  `state.zombies`. Works because the production code also mutates (see
  F-GAMES-B41-035), but it normalizes the impure pattern instead of guarding
  against it.

### `src/lib/games/xp.ts`

- **F-GAMES-B41-047 — High — Generic XP is uncapped and conflicts with per-game cap-10 formulas.**
  Lines 1–13: `Math.floor(correctAnswers * accuracy)` has no upper bound (e.g.
  20 correct → 20 XP), whereas shadowGate/spellweavers/village cap at 10. If
  both this helper and the per-game `calculateXP` functions feed the same
  XP/leaderboard pipeline, awards will be inconsistent across games — a direct
  cross-app scoring fairness/standardization issue for Reading/Primary import.
- **F-GAMES-B41-048 — Low — No JSDoc on exported function.**
  AGENTS requires JSDoc on every exported function; `calculateXP` has none (a
  comment block exists at 10–11 but not a `@param`/`@returns` JSDoc).

### `src/lib/games/xp.test.ts`

- **F-GAMES-B41-049 — Low — No test for the uncapped / large-input case.**
  Lines 3–29 verify accuracy scaling and zero-attempts, but never assert
  behaviour for inputs that would exceed 10 (the very case that diverges from
  the other games — F-GAMES-B41-047).

---

## Severity Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 10 | 013, 014, 022, 023, 029, 030, 035, 036, 037, 047 |
| Medium | 18 | 001, 002, 004, 008, 010, 015, 016, 017, 019, 024, 025, 031, 032, 034, 038, 039, 041, 045 |
| Low | 19 | 003, 005, 006, 009, 011, 012, 018, 020, 021, 026, 027, 028, 033, 040, 042, 044, 046, 048, 049 |
| Info | 2 | 007, 043 |

Total findings: 49 (IDs F-GAMES-B41-001 through F-GAMES-B41-049).

## Key Risks for Reading/Primary Importability

1. **XP/scoring is not a single contract** (F-GAMES-B41-013, -023, -040, -047):
   uncapped generic XP, bespoke per-game caps, and one game with no XP function.
2. **Determinism gaps** (F-GAMES-B41-004, -016, -025, -029, -037): block
   reproducible grading, replay, and Remotion-based rendering.
3. **Difficulty contract drift** (F-GAMES-B41-014, -038) and **lifecycle drift**
   (F-GAMES-B41-026, -032, -039): inconsistent difficulty semantics and
   start/victory states complicate a unified game host.
4. **Mobile compatibility** (F-GAMES-B41-036): wizardZombie landscape arena.
5. **Test/coverage gaps** (F-GAMES-B41-022, -030, -041) against the TDD/>80%
   mandate.

## Limitations

- This review is **scoped strictly to the 20 files** listed in
  `/tmp/opencode/games-batch-41`. Consumer components, pages, and the Remotion
  renderer were only grepped for existence, not line-reviewed; some findings
  (e.g. missing stormCastleTower XP, unused config knobs) may be resolved in
  those un-reviewed files.
- "No colocated test in this batch" (F-GAMES-B41-022, -030) means no test file
  for those modules appears **in this batch list**; a test may exist elsewhere
  in the repo and is out of scope here.
- No source code was executed; correctness judgements are by static reading.
  Float/timing/collision behaviour was reasoned about, not empirically measured.
- Audio, asset loading, real-device performance, and runtime accessibility
  (focus order, ARIA, screen-reader, reduced-motion) could not be assessed from
  these pure-logic/config/test files; they require the rendering components and
  are not represented in this batch.
- Accessibility and age-appropriate UX could only be evaluated indirectly
  (difficulty pacing, penalty severity); no UI text, color, or input-modality
  surfaces are present in these files.

## Statement

This is a line-by-line review report only. It makes **no acceptance or closeout
claims** for the track or any task; gate decisions remain with the track’s
acceptance/closeout process.
