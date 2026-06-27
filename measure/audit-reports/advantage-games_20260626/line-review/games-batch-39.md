# Line-by-Line Review — games-batch-39

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-39`
**Scope source:** `/tmp/opencode/games-batch-39` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch is **runtime source** (`.ts` game-logic modules, config modules, and Jest/Vitest unit tests) under `apps/advantage-games/src/lib/games/`. Supporting files read for context only (not in batch, not scored as findings targets): `src/store/useGameStore.ts`, `src/lib/games/basePath.ts`.
**Finding ID scheme:** `F-GAMES-B39-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Type | Game |
|---|------|------|------|
| 1 | `gryphonPatrol.test.ts` | test | Gryphon Patrol |
| 2 | `gryphonPatrol.ts` | logic | Gryphon Patrol |
| 3 | `gryphonPatrolConfig.ts` | config | Gryphon Patrol |
| 4 | `hauntedLibrary.test.ts` | test | Haunted Library |
| 5 | `hauntedLibrary.ts` | logic | Haunted Library |
| 6 | `labyrinthGoblinKing.ts` | logic | Labyrinth / Goblin King |
| 7 | `labyrinthGoblinKingConfig.ts` | config | Labyrinth / Goblin King |
| 8 | `magicDefenseConfig.test.ts` | test | Magic Defense |
| 9 | `magicDefenseConfig.ts` | config | Magic Defense |
| 10 | `packRotation.test.ts` | test | Shared content-pack rotation |
| 11 | `packRotation.ts` | logic | Shared content-pack rotation |
| 12 | `paladinsTwinSoul.test.ts` | test | Paladin's Twin Soul |
| 13 | `paladinsTwinSoul.ts` | logic | Paladin's Twin Soul |
| 14 | `paladinsTwinSoulConfig.test.ts` | test | Paladin's Twin Soul |
| 15 | `paladinsTwinSoulConfig.ts` | config | Paladin's Twin Soul |
| 16 | `potionRushEffects.test.ts` | test | Potion Rush (FX) |
| 17 | `potionRushEffects.ts` | logic | Potion Rush (FX) |
| 18 | `realmCarver.test.ts` | test | Realm Carver |
| 19 | `realmCarver.ts` | logic | Realm Carver |
| 20 | `realmCarverConfig.test.ts` | test | Realm Carver |

---

## Findings

### File 1 — `gryphonPatrol.test.ts`

**F-GAMES-B39-001 · Medium · gryphonPatrol.test.ts:239-260 vs gryphonPatrol.ts:269**
The suite tests `calculateXP` (capped 1-10) thoroughly but **never tests the value actually persisted in gameplay**: `tickGryphonPatrol` writes `xp: nextCollectedWords.length` (raw, uncapped — see F-GAMES-B39-007). No test asserts which of the two divergent XP values is authoritative for the leaderboard/progress payload. The tested function is not the one wired into the live loop, so the tests give false confidence about the exported score contract.

**F-GAMES-B39-002 · Low · gryphonPatrol.test.ts:20-99**
Tests drive the loop by directly mutating private state (`state.status = 'playing'`, `state.player.vx = 100`, `state.enemies = [...]`). There is no test that exercises the documented entry/transition flow (start→playing) through public API, and no win-condition test (`status === 'won'`). Movement/wrap/camera are well covered, but the win path and projectile direction for `vx < 0` are not.

### File 2 — `gryphonPatrol.ts`

**F-GAMES-B39-003 · High · gryphonPatrol.ts:217-238 (uses `player` at 221) vs 178-198**
Enemy↔player collision is checked against the **pre-move** `player` (destructured from `state` at line 175), while the player has already been advanced to `nextX/nextY` in `finalState.player` (line 198). Orb collection just below (line 244) correctly uses the **post-move** `finalState.player`. The two collision systems therefore evaluate the player at two different positions in the same tick — a real correctness bug producing phantom/missed enemy hits proportional to per-tick displacement (up to ~`vx*dt`).

**F-GAMES-B39-004 · Medium · gryphonPatrol.ts:117, 149**
Entity IDs are generated with `Date.now()` (`orb-${Date.now()}`, `proj-${Date.now()}`). This is non-deterministic and, worse, **collides**: multiple orbs/projectiles created within the same millisecond receive identical IDs, breaking any React `key`, replay, or de-dup logic. It also defeats deterministic testing/replay needed for leaderboard verification. Sibling games inject an `rng`; here time is used directly inside an otherwise pure reducer.

**F-GAMES-B39-005 · Medium · gryphonPatrol.ts:269-270**
`tickGryphonPatrol` sets `xp: nextCollectedWords.length` (uncapped, equal to words collected, max ≈ sentence length) while the module also exports `calculateXP` that caps at 10 with accuracy/survival/speed bonuses. Two incompatible XP scales coexist in one module with no reconciliation. Any Reading/Primary leaderboard import will receive a different, non-comparable XP from this game than from its siblings (which all cap at 10 — see Cross-Cutting).

**F-GAMES-B39-006 · Medium · gryphonPatrol.ts:53-75, 45 (sentence: string[])**
This game's input contract is a bare `string[]` sentence, whereas `hauntedLibrary`/`labyrinthGoblinKing` consume `VocabularyItem[]` from the shared store, `paladinsTwinSoul` redefines its own `VocabularyItem`, and `realmCarver` uses `SentenceItem`. There is **no shared vocabulary input interface** across the suite, so a host app (Reading/Primary) cannot feed all games from one normalized content shape — an importability/integration gap.

**F-GAMES-B39-007 · Low · gryphonPatrol.ts:61 vs gryphonPatrolConfig.ts:8**
`createInitialGryphonPatrolState` hard-codes `hp: 3, maxHp: 3` instead of reading `GRYPHON_PATROL_CONFIG.player.initialHp` (which also equals 3). The config value is dead; changing the config will not change the game. Same for `size: 40` vs `player.size`.

**F-GAMES-B39-008 · Low · gryphonPatrol.ts:274-288**
`handleGryphonPatrolInput` adds `input.dx * speed` to velocity with no clamp; repeated inputs accumulate unbounded each frame. Friction (0.95) bounds terminal velocity at `speed/(1-0.95) = 8000 px/s`, which on a 2000px-wide map is several map widths per second — effectively uncontrollable at the cap. No max-speed clamp is applied.

**F-GAMES-B39-009 · Low · gryphonPatrol.ts:39-51, whole file — no difficulty**
Unlike every other game in this batch (`hauntedLibrary`, `labyrinth`, `magicDefense`, `realmCarver`, paladins config), Gryphon Patrol exposes **no difficulty parameterization** (no easy/normal/hard, no lives/enemy-count scaling). Difficulty is fixed by a single const block, inconsistent with the suite and with the difficulty requirement for the review.

### File 3 — `gryphonPatrolConfig.ts`

**F-GAMES-B39-010 · Low · gryphonPatrolConfig.ts:6-16, 31-34**
`player.initialHp`, `player.size`, and `physics.gravity: 0` are declared but unused by the logic module (HP/size hard-coded — F-GAMES-B39-007; gravity never referenced). Dead config invites drift between declared and actual behavior.

**F-GAMES-B39-011 · Info · gryphonPatrolConfig.ts:2-4**
`gameWidth: 390, gameHeight: 844` matches the platform reference viewport (390×844) — correct, unlike labyrinth (700) and realmCarver (600). `mapWidth: 2000` defines a horizontally scrolling map with camera wrap; recorded as consistent with the reference.

### File 4 — `hauntedLibrary.test.ts`

**F-GAMES-B39-012 · Medium · hauntedLibrary.test.ts:106-123**
The ghost-collision test ticks exactly **once** and asserts `lives === 2`. It cannot detect the per-frame life-drain bug in the logic (F-GAMES-B39-014): because ghost collision has no invulnerability window, sustained contact removes a life **every tick**. A single-tick assertion structurally masks a game-breaking fairness defect; a multi-tick contact test would have caught it.

**F-GAMES-B39-013 · Low · hauntedLibrary.test.ts:171-213**
The victory/defeat tests rely on extensive manual repositioning of doors, floors, ghosts, and player (`door.floor = 0`, `door.y = floorY - 80`, hand-spacing doors 120px). These are brittle white-box fixtures coupled to internal geometry; small layout changes will break them without indicating a real regression. No end-to-end "play through a sentence via input only" test exists.

### File 5 — `hauntedLibrary.ts`

**F-GAMES-B39-014 · High · hauntedLibrary.ts:232-257**
Ghost→player collision decrements `lives` with **no invulnerability/cooldown** and **inside the per-ghost `.map`**. Two consequences: (1) while the player overlaps a ghost, a life is lost on *every* tick (~60/s) — near-instant death from a single touch; (2) if N ghosts overlap simultaneously, N lives are lost in one tick. This contradicts the sibling pattern (`labyrinthGoblinKing` and `paladinsTwinSoul` both implement invulnerability timers). This is a severe fairness/age-appropriateness defect for a learning game.

**F-GAMES-B39-015 · High · hauntedLibrary.ts:189-198, 193-194**
`tickLibrary` is not a pure reducer: `const player = { ...nextState.player }` is a **shallow** copy, so `player.velocity` remains the *same object reference* as `state.player.velocity`. Lines 193-194 then mutate `player.velocity.x/y`, mutating the caller's input `state` in place. Any caller that keeps the previous state (React state history, replay, undo, memoized snapshots) will see its prior frame silently corrupted. Classic aliasing bug from a non-deep clone of nested mutable state.

**F-GAMES-B39-016 · Medium · hauntedLibrary.ts:62-66, 317-318**
`rng` is injected only at `createLibraryState`; the per-tick loop spawns bats with `id: \`bat-${nextState.time}-${Math.random()}\`` (line 318), reaching into global `Math.random()`. Tick-time randomness is therefore non-deterministic and unseedable, undermining replay/leaderboard reproducibility and deterministic tests (the bat test must hand-place the bat to compensate).

**F-GAMES-B39-017 · Low · hauntedLibrary.ts:163-169, 149-150**
`JUMP_FORCE`, `GHOST_SPEED`, and `INITIAL_LIVES` are exported constants that the logic does not use: ghost speed is recomputed locally (line 112), lives are hard-coded (`config.difficulty === 'easy' ? 5 : 3`, lines 149-150) instead of reading `INITIAL_LIVES`, and `JUMP_FORCE` is never referenced. Dead/duplicated constants risk drift.

**F-GAMES-B39-018 · Low · hauntedLibrary.ts:171-183**
`calculateXP` base is `state.correctAnswers` (uncapped before the final `Math.min(10, …)`). For multi-sentence sessions `correctAnswers` can exceed 10 trivially, so the cap is hit on accuracy alone and the bonus structure becomes meaningless past the first few correct answers — another distinct XP curve vs siblings (Cross-Cutting).

### File 6 — `labyrinthGoblinKing.ts`

**F-GAMES-B39-019 · Medium · labyrinthGoblinKing.ts:432, 302, 329**
`tickLabyrinthGoblinKing` hard-codes `const rng = Math.random` (line 432); `spawnWordOrbs` (line 302) and `respawnGoblin` (line 329) likewise call `Math.random` directly. Although `createLabyrinthGoblinKingState` accepts an injectable `rng`, the **tick loop and respawn logic do not**, so goblin patrol direction, orb respawn positions, and goblin respawn positions are non-deterministic and unseedable — non-reproducible difficulty and untestable AI.

**F-GAMES-B39-020 · Medium · labyrinthGoblinKing.ts (whole) — no test in batch**
Neither `labyrinthGoblinKing.ts` (624 lines of maze/AI/XP logic) nor `labyrinthGoblinKingConfig.ts` has a corresponding test file in this batch, whereas every other game here ships logic+test pairs. The most complex module in the batch (tile-based Pac-Man movement, chase/flee AI, multi-sentence progression) is unverified within scope. (A test may exist elsewhere in the repo — see Limitations.)

**F-GAMES-B39-021 · Medium · labyrinthGoblinKing.ts:608-614 vs labyrinthGoblinKingConfig.ts:46**
`calculateLabyrinthXP` uses `floor(correctAnswers * accuracy) + goblinsEaten*xpPerGoblinEaten`, capped at 10. This is a fourth distinct XP formula in the batch and it **ignores** the declared `xpPerCorrectWord: 1` config value entirely. Per-game XP scales are unreconciled (Cross-Cutting), and a declared scoring constant is dead.

**F-GAMES-B39-022 · Low · labyrinthGoblinKingConfig.ts:14-15 (GAME_HEIGHT 700)**
`GAME_HEIGHT = 700` / `arenaHeight: 700`, diverging from the 390×844 platform reference. The maze itself is `15 rows × 32px = 480px` tall and `11 cols × 32 = 352px` wide (vs 390 width). Neither the 700 canvas nor the 480 maze matches 844; responsive scaling/letterboxing behavior on a true 844-tall device is unspecified in code.

**F-GAMES-B39-023 · Info · labyrinthGoblinKing.ts:585-592**
Positive: goblin→player collision correctly gates damage behind `invulnerabilityTime <= 0` and sets a 1000ms invuln window — the fairness model that `hauntedLibrary` lacks (contrast F-GAMES-B39-014). Multi-sentence advancement and heroic-aura "eat" mechanic are coherent.

### File 7 — `labyrinthGoblinKingConfig.ts`

**F-GAMES-B39-024 · Info · labyrinthGoblinKingConfig.ts:39-44, 54-56**
Difficulty tiers (`easy/normal/hard/extreme`) align with the shared `Difficulty` union from `useGameStore`, and `getDifficultyConfig` safely falls back to `normal`. `getGoblinSpeed` falls back to `scout`. Well-formed difficulty/lookup contract — recorded as positive. The only defect is the unused `xpPerCorrectWord` (F-GAMES-B39-021).

### File 8 — `magicDefenseConfig.test.ts`

**F-GAMES-B39-025 · Info · magicDefenseConfig.test.ts:67-91**
Strong config tests: monotonic difficulty assertion (spawnRate/duration non-increasing across tiers) and `getInitialSettings` fallback-to-normal are both verified. Good coverage for a config module. No issues.

**F-GAMES-B39-026 · Low · magicDefenseConfig.test.ts (whole)**
Only the **config** for Magic Defense is present/tested in this batch; no game-logic module for Magic Defense is in scope, so scoring/XP/collision/state behavior for that game cannot be assessed here (see Limitations). The config tests validate constants but not gameplay.

### File 9 — `magicDefenseConfig.ts`

**F-GAMES-B39-027 · Info · magicDefenseConfig.ts:6, 25 (withBasePath)**
Positive for importability: asset URLs (`castles_3x2_sheet.png`, `background.png`) are wrapped in `withBasePath`, so the game's assets resolve correctly when the app is mounted under a non-root `NEXT_PUBLIC_BASE_PATH` — the correct pattern for embedding into Reading/Primary. Difficulty settings cover the full `Difficulty` union with `minSpawnRate/minDuration` scaling floors.

**F-GAMES-B39-028 · Low · magicDefenseConfig.ts:5-22**
A 1536×1024 sprite sheet rendered at `scale: 0.25` (192×85 per castle) implies the source PNG is far larger than displayed. No WebP/compressed variant or asset budget is referenced; for the low-end mobile target this is a (minor, config-level) load/memory consideration shared with other asset-heavy games. Cannot quantify without the asset binary (Limitations).

### File 10 — `packRotation.test.ts`

**F-GAMES-B39-029 · Info · packRotation.test.ts:9-24, 245-274**
Good coverage including localStorage persistence, load, and **corrupted-JSON graceful fallback** (line 269). The `getActivePackIds` immutability test (line 167) and rollback history tests are solid. No issues; this is the strongest-tested module in the batch.

### File 11 — `packRotation.ts`

**F-GAMES-B39-030 · Low · packRotation.ts:71-73**
`saveState` swallows failures with `console.error(...)`. The repo standard (root AGENTS.md "Observability/Logging") is structured logging over free-form `console`. A quota-exceeded or disabled-storage failure is silently logged and dropped with no user-facing or telemetry signal. Minor, but the only error path in a persistence layer.

**F-GAMES-B39-031 · Info · packRotation.ts:41-63, 65-74**
Positive: SSR-safe (`typeof window === 'undefined'` guards on both load and save), schema-defensive parsing (array checks per field), and bounded history (`.slice(-50)`). The rollback "consumed" flag (lines 152-168) correctly supports repeated rollbacks. This shared rotation utility is well-formed for client use; note it is local/`localStorage`-scoped, not a server multi-tenant store (no `schoolId` scoping is applicable here).

### File 12 — `paladinsTwinSoul.test.ts`

**F-GAMES-B39-032 · High · paladinsTwinSoul.test.ts:130-185**
The capture and twin-soul tests **manually set** `boss.isCapturing = true` / `boss.hasCapturedPlayer = true` before ticking. Because the logic never sets these flags itself (F-GAMES-B39-033), the tests validate only the *response* to externally-forced flags and create false confidence that the capture loop works end-to-end. No test drives capture through the actual tick (dive probability → capture), so the missing core mechanic is invisible to the suite.

**F-GAMES-B39-033 · High · paladinsTwinSoul.ts:104-280 vs paladinsTwinSoulConfig.ts:25**
The signature mechanic is **not implemented in the tick loop**. `diveProbability: 0.005` (config) is never read anywhere; nothing in `tickPaladinsTwinSoul` ever sets `isDiving = true` or `isCapturing = true`. Enemies only translate side-to-side (lines 134-142) while the player auto-fires. Diving, gargoyle capture, twin-soul rescue, and the vocabulary-assignment path (lines 207-238) are dead code in normal play — reachable only via test fixtures. The game as coded is a trivial static-formation shooter; the documented learning mechanic does not run.

**F-GAMES-B39-034 · Medium · paladinsTwinSoul.ts:245-257**
"Correct answer" / wave progression is triggered purely by `nextEnemies.length === 0` (all enemies destroyed), incrementing `correctAnswers`, `targetWordIndex`, and `wave`. There is **no check that the player selected/shot the enemy carrying the correct vocabulary term**. Score and XP are decoupled from vocabulary correctness, so progress/XP reported to a host app does not reflect learning — a scoring-integrity and importability defect.

**F-GAMES-B39-035 · Medium · paladinsTwinSoul.ts:223-229**
Distractor assignment uses `Math.random()` inside the tick (line 225), non-deterministic and unseedable (no `rng` parameter on the reducer). Same reproducibility/testability concern as F-GAMES-B39-004/016/019.

**F-GAMES-B39-036 · Low · paladinsTwinSoul.ts:3-6**
A local `VocabularyItem` interface is redefined here instead of importing the shared `VocabularyItem` from `@/store/useGameStore`. Duplicated content contracts increase drift risk and complicate uniform import (Cross-Cutting input-contract divergence).

### File 13 — `paladinsTwinSoul.ts`

(Findings F-GAMES-B39-033, 034, 035, 036 above are anchored in this file.)

**F-GAMES-B39-037 · Low · paladinsTwinSoul.ts:155-171, 254-256**
Auto-fire bullet IDs use `bullet-p-${currentTime}` / `bullet-t-${currentTime}` (gameTime+delta). Within one tick the player and twin-soul bullets get distinct suffixes (`-p`/`-t`), but across rapid ticks at identical accumulated `currentTime` (e.g., if `delta` were 0) IDs could repeat. Wave respawn (line 254) reuses `createPaladinsTwinSoulState` whose enemy IDs are positional (`enemy-r-c`) and therefore **duplicate** the previous wave's IDs — a React `key` collision risk across waves.

### File 14 — `paladinsTwinSoulConfig.test.ts`

**F-GAMES-B39-038 · Low · paladinsTwinSoulConfig.test.ts:3-19**
The config test only asserts dimensions and that color strings start with `#`. It does not assert the gameplay-relevant constants (`fireRate`, `diveProbability`, enemy grid `rows*cols`) that the logic and other tests depend on. Given `diveProbability` is silently unused (F-GAMES-B39-033), a config test asserting its intended role would have surfaced the gap.

### File 15 — `paladinsTwinSoulConfig.ts`

**F-GAMES-B39-039 · Medium · paladinsTwinSoulConfig.ts:25 (diveProbability)**
`enemy.diveProbability: 0.005` is declared but never consumed by `paladinsTwinSoul.ts` (cross-ref F-GAMES-B39-033). The config advertises a dive behavior the runtime never executes — a misleading contract that masks the missing mechanic.

**F-GAMES-B39-040 · Low · paladinsTwinSoulConfig.ts:1-2, 38**
`GAME_HEIGHT = 844` matches the reference viewport (good). However the config provides **no difficulty tiers** despite the logic accepting `options.difficulty` (defaulting to the string `"medium"`, which is not even a member of the shared `Difficulty` union `easy|normal|hard|extreme`). Difficulty is effectively inert and type-inconsistent with the rest of the suite.

### File 16 — `potionRushEffects.test.ts`

**F-GAMES-B39-041 · Info · potionRushEffects.test.ts:1-23**
Clean, deterministic tests of a pure time→frame function (rotation/pulse/shimmer at t=0, 250ms, 2000ms). Appropriate and sufficient for a stateless visual helper. No issues.

### File 17 — `potionRushEffects.ts`

**F-GAMES-B39-042 · Low · potionRushEffects.ts:11-17**
`getPortalFrame` is a pure, continuously-animating visual driver (90°/s rotation + sine pulse/shimmer). It is decorative and always-on with no `prefers-reduced-motion` awareness at this layer. Whether reduced-motion is honored depends on the (out-of-batch) consumer component; flagged as a motion-accessibility consideration to verify at the call site. The helper itself is correct and well-bounded.

### File 18 — `realmCarver.test.ts`

**F-GAMES-B39-043 · Info · realmCarver.test.ts:69-190**
Good behavioral coverage: trail creation, trail self-collision damage + reset, defeat at 0 HP, territory claim, target-word capture, monster bounce, and gameTime increment. Tests pragmatically pin player velocity/positions and zero out monsters where needed. Reasonable for the deterministic portions of the reducer.

**F-GAMES-B39-044 · Low · realmCarver.test.ts:57-66, 170-183**
Spawn-position tests assert only loose bounds (`>=0 && <100`) because `createRealmCarverState` seeds positions with un-injected `Math.random` (F-GAMES-B39-045). There is no seeded determinism test for monster/word placement, so spawn distribution and player-overlap-at-spawn edge cases are unverified.

### File 19 — `realmCarver.ts`

**F-GAMES-B39-045 · Medium · realmCarver.ts:86-104**
`createRealmCarverState` seeds monster and word positions/velocities with `Math.random()` and accepts **no `rng` injection** (unlike `labyrinth`/`haunted` which at least seed creation). Spawns are non-reproducible: a monster can spawn on top of the player's `(0,0)` start region, or words can spawn unreachably, with no determinism for replay/leaderboard parity or regression tests.

**F-GAMES-B39-046 · Low · realmCarver.ts:170 (no input param)**
`tickRealmCarver(state, delta)` takes no input argument; movement relies entirely on the caller mutating `state.player.vx/vy` before the call. Input handling thus lives outside the reducer, inconsistent with `gryphonPatrol`/`hauntedLibrary`/`labyrinth`/`paladins` which take an explicit input object. This asymmetry complicates a uniform shared-runtime driver and external test harnessing.

**F-GAMES-B39-047 · Low · realmCarver.ts:97-104, 245-263**
`RealmCarverWord` carries `vx/vy` and they are randomized at creation, but the tick never updates word positions — words are static. Dead motion fields; either implement drifting words or drop the fields to avoid implying behavior that doesn't exist.

**F-GAMES-B39-048 · Low · realmCarverConfig.ts:2 (GAME_HEIGHT 600)**
`GAME_HEIGHT = 600`, a third distinct vertical extent in the batch (844/700/600). With a 100×100 logical grid mapped onto 390×600, cell aspect is non-square and unrelated to the 390×844 reference; scaling behavior on the reference device is unspecified in code.

**F-GAMES-B39-049 · Info · realmCarver.ts:300-317**
Positive: `calculateXP` guards the perfect-accuracy bonus with `targetWordIndex > 0` (avoids awarding the bonus for a 0/0 "perfect" run) and returns 0 for `fullSentenceLength === 0`. Capped at 10, consistent with most siblings. The `fillTerritory` flood-fill (lines 128-168) is a coherent Qix-style claim algorithm.

### File 20 — `realmCarverConfig.test.ts`

**F-GAMES-B39-050 · Low · realmCarverConfig.test.ts:3-21**
Like the paladins config test, this only checks dimensions, grid size, and that colors start with `#`. The gameplay-critical constants (`player.speed`, `monster.speed`, radii used by the reducer) are untested, and the 600-tall viewport discrepancy (F-GAMES-B39-048) is asserted as "correct" (`expect(GAME_HEIGHT).toBe(600)`) rather than reconciled to the platform reference — codifying the divergence.

---

## Cross-Cutting Themes

- **XP/scoring is not normalized across games** (F-GAMES-B39-005, 018, 021, 034, 049 and configs): Gryphon Patrol persists an *uncapped raw* `xp` while exporting a separate cap-10 `calculateXP`; Haunted/Labyrinth/Paladins/Realm-Carver each define a *different* cap-10 formula (base = correctAnswers, or floor(correct×accuracy)+goblins, or correctWords+bonuses, or progress+bonuses). Paladins counts "correct" by clearing enemies, not by vocabulary match. No shared XP/leaderboard contract exists, so a Reading/Primary import will receive non-comparable scores per game.
- **Non-determinism inside reducers** (F-GAMES-B39-004, 016, 019, 035, 045): `Date.now()`/`Math.random()` are called inside tick/spawn/respawn paths in Gryphon, Haunted, Labyrinth, Paladins, and Realm Carver, with `rng` injectable (if at all) only at creation. This breaks replay/leaderboard reproducibility and forces tests to hand-place entities, which in turn masks defects.
- **Inconsistent damage/fairness model** (F-GAMES-B39-014 vs 023): Haunted Library applies ghost damage every frame with no invulnerability (near-instant death, multi-life-per-tick), while Labyrinth and Paladins implement invulnerability windows. No shared hit-cooldown convention.
- **Core mechanic not wired** (F-GAMES-B39-033): Paladin's Twin Soul never triggers dive/capture in its loop; the central learning interaction is dead code reachable only from tests.
- **Purity / state-aliasing bug** (F-GAMES-B39-015): Haunted Library shallow-copies the player and mutates the shared nested `velocity` object, corrupting prior-frame state — dangerous for React state history/replay.
- **Viewport inconsistency** (F-GAMES-B39-011, 022, 040, 048, 050): canvas heights of 844 (Gryphon, Paladins), 700 (Labyrinth), and 600 (Realm Carver) coexist with no documented responsive-scaling rationale against the 390×844 reference.
- **Input-contract / vocabulary-shape divergence** (F-GAMES-B39-006, 036): `string[]` vs shared `VocabularyItem` vs locally-redefined `VocabularyItem` vs `SentenceItem` — no single content interface for uniform host-app import.
- **Test quality: white-box fixtures mask logic gaps** (F-GAMES-B39-001, 012, 013, 032, 038, 050): single-tick assertions miss per-frame drain (Haunted), manually-set flags hide the unimplemented capture loop (Paladins), and config tests assert only dimensions/colors. Labyrinth (the most complex module) has no test in this batch.
- **Importability positives** (F-GAMES-B39-027): Magic Defense correctly routes assets through `withBasePath`; `packRotation` is SSR-safe and schema-defensive — patterns worth propagating.

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 5 | 003, 014, 015, 032, 033 |
| Medium | 14 | 001, 004, 005, 006, 012, 016, 019, 020, 021, 022, 034, 035, 039, 045 |
| Low | 21 | 002, 007, 008, 009, 010, 013, 017, 018, 026, 028, 030, 036, 037, 038, 040, 042, 044, 046, 047, 048, 050 |
| Info | 10 | 011, 023, 024, 025, 027, 029, 031, 041, 043, 049 |

Total findings: **50** (F-GAMES-B39-001 … F-GAMES-B39-050).

---

## Limitations

1. **Scope is exactly the 20 listed files.** Findings about runtime behavior in components that *consume* these reducers (Konva canvas rendering, input wiring, `prefers-reduced-motion` handling, `gameCards.ts` registration, leaderboard/progress submission) are out of batch and assessed only where the logic/config files reveal the contract. Accessibility, audio, and mobile/touch behavior live largely in the (out-of-batch) view layer and could not be verified here.
2. **Two games are represented only partially.** Magic Defense has only its **config** (+config test) in this batch — no game-logic module — so its scoring/collision/state behavior is not assessed. Labyrinth/Goblin King has **logic + config but no test file** in this batch; a test may exist elsewhere in the repo (not confirmed, per the read-only/no-grep-beyond-context constraint).
3. **No execution.** Tests were not run and the app was not built; findings are from static reading. Assertions about runtime collisions, per-frame life drain, ID collisions, and state aliasing are derived by code analysis, not observed at runtime.
4. **Cross-references to non-batch files** (`useGameStore.ts`, `basePath.ts`) were read for context only to evaluate shared types and importability; they are not themselves review targets and were not scored.
5. **No acceptance or closeout determination is made here.** This report records line-anchored findings only and makes no claim that the batch, track, or review phase is accepted, complete, or closed.
