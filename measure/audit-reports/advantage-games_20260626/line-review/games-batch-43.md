# Line-by-Line Review — games-batch-43

- **Track:** `advantage_games_review_20260626`
- **Batch:** `games-batch-43`
- **Reviewer model:** ark-code-latest (Doubao-Seed-Code)
- **Scope:** Read-only line review. No source code was edited.
- **File list source:** `/tmp/opencode/games-batch-43` (20 entries)
- **Review focus:** game readiness, shared runtime, scoring/XP/leaderboards/progress/difficulty, importability into Reading/Primary, asset/audio/performance/mobile/browser compatibility, accessibility, age-appropriate UX, test quality.

## Finding severity legend
- **Critical** — broken/won't build/won't ship, or data-integrity/security risk.
- **High** — significant correctness, importability, or UX defect; likely to break a real scenario.
- **Medium** — meaningful defect, maintainability, or readiness gap.
- **Low** — minor polish / hygiene.
- **Info** — observation, no action strictly required.

---

## Files reviewed (20/20)

1. `apps/advantage-games/src/remotion/Root.tsx`
2. `apps/advantage-games/src/remotion/compositions/WizardZombieGameRenderer.tsx`
3. `apps/advantage-games/src/remotion/compositions/WizardZombiePromo.tsx`
4. `apps/advantage-games/src/remotion/index.ts`
5. `apps/advantage-games/src/remotion/test-index.tsx`
6. `apps/advantage-games/src/store/__tests__/usePotionRushStore.test.ts`
7. `apps/advantage-games/src/store/useGameStore.test.ts`
8. `apps/advantage-games/src/store/useGameStore.ts`
9. `apps/advantage-games/src/store/usePotionRushStore.calculateXP.test.ts`
10. `apps/advantage-games/src/store/usePotionRushStore.test.ts`
11. `apps/advantage-games/src/store/usePotionRushStore.ts`
12. `apps/advantage-games/src/store/usePotionRushStoreEndless.test.ts`
13. `apps/advantage-games/src/store/usePotionRushStoreScaling.test.ts`
14. `apps/advantage-games/src/store/useRPGBattleStore.test.ts`
15. `apps/advantage-games/src/store/useRPGBattleStore.ts`
16. `apps/advantage-games/src/templates/game/GameNameGame.tsx.template`
17. `apps/advantage-games/src/templates/game/README.md`
18. `apps/advantage-games/src/templates/game/api/complete-route.ts.template`
19. `apps/advantage-games/src/templates/game/api/ranking-route.ts.template`
20. `apps/advantage-games/src/templates/game/api/sentences-route.ts.template`

---

## 1. `src/remotion/Root.tsx`

Registers a single `WizardZombiePromo` composition (1080×1920 portrait, 30fps, 1050 frames / 35s).

- **F-GAMES-B43-001 — Low — Marketing/promo asset, not game runtime.** Lines 8-16: This is a Remotion promo-video composition, not part of the playable game runtime. It does not affect game readiness, but it ships inside `src/` and pulls Remotion into the app build graph. Confirm Remotion is dev-only / excluded from the production client bundle (out of scope to verify here; flagged for importability into Reading/Primary, where Remotion should not be dragged along).
- **F-GAMES-B43-002 — Info.** Line 15: `defaultProps={{}}` for a component that takes no props is harmless but redundant.

## 2. `src/remotion/compositions/WizardZombieGameRenderer.tsx`

Renders Wizard-vs-Zombie game state to a Konva `Stage` for video capture.

- **F-GAMES-B43-003 — High — `setState` inside `useMemo` is a React anti-pattern.** Lines 77-95: The memo body calls `setGameState(...)` as a side effect. `useMemo` must be pure; mutating state from it is unsupported and can cause render-phase update warnings, double-invocation issues under StrictMode/concurrent rendering, and non-deterministic output. Should be a `useEffect` (or pure derived value). The `eslint-disable react-hooks/exhaustive-deps` (line 94) masks the dependency problem (`gameState`, `simulatedInput`, `vocabulary` are read but omitted).
- **F-GAMES-B43-004 — High — O(frame²) recomputation.** Lines 81-91: For each rendered frame the loop replays the entire game from the initial state (`for i in 0..gameStateFrame`). Combined with re-running every frame, total work across the 1050-frame render is quadratic. For a long video this is a real performance defect and can also drift because it re-seeds from `gameState` (which is itself being mutated).
- **F-GAMES-B43-005 — Medium — Hardcoded asset paths bypass `withBasePath`.** Lines 55-58: Asset URLs are absolute (`/games/vocabulary/wizard-vs-zombie/...`). Every shipping game component in this app uses `withBasePath()` (see template line 6). If this renderer were ever served under a base path / sub-route (the pattern the rest of the app assumes), assets would 404. For a Remotion-only renderer this is lower risk, but it is inconsistent with the shared runtime convention.
- **F-GAMES-B43-006 — Medium — Asset-load failure is silently swallowed.** Lines 59-62: `.catch(console.error)` only logs; the component then renders the placeholder `<div>` (lines 100-102) indefinitely with no signal to the renderer. Combined with async `onload` in a Remotion still/video context, frames may render blank because images are not guaranteed loaded by capture time (Remotion expects `delayRender`/`continueRender` for async asset readiness — not used here).
- **F-GAMES-B43-007 — Medium — Sprite-sheet crop assumes fixed 64px frames.** Lines 104, 133-138, 158-163, 176-181: `spriteSize = 64` is hardcoded for 3×3 sheets. The shipping template computes frame size dynamically from actual image dimensions (`buildSpriteGrid`, template lines 64-90). If the real sheets are not exactly 192×192 the crops will be wrong. Orb crop uses `y={animFrame*spriteSize}` (vertical) while player/zombie use `x={animFrame*spriteSize}` (horizontal) — inconsistent and likely a guess about sheet layout.
- **F-GAMES-B43-008 — Low — HUD uses raw DOM overlay over a Konva Stage.** Lines 188-201: Mixing absolutely-positioned HTML over a `Stage` is fine for live play but in a Remotion render the HTML overlay and canvas may composite differently; HP/Score may not appear in the captured video.
- **F-GAMES-B43-009 — Info.** Line 17 imports `VocabularyItem` from `@/store/useGameStore`; the prop typing is consistent with the live game store.

## 3. `src/remotion/compositions/WizardZombiePromo.tsx`

The actually-registered promo composition (start screen → captions → end CTA).

- **F-GAMES-B43-010 — High — CSS `animationDelay` does not animate in Remotion.** Line 75: `animationDelay: \`${i * 0.2}s\`` references a CSS `@keyframes` animation that does not exist and would not be driven by Remotion's frame clock anyway. Remotion captures discrete frames; only frame-derived (`useCurrentFrame`) values animate. This dot is effectively static (the opacity at line 76 is frame-derived and does work, making the `animationDelay` dead/misleading).
- **F-GAMES-B43-011 — Medium — `vh` units inside a fixed-size composition.** Line 49: `maxHeight: '70vh'`. Remotion renders at a fixed 1080×1920; `vh` resolves against the headless viewport, which is not guaranteed to equal composition height. Use composition-relative sizing (`useVideoConfig().height`) for deterministic output.
- **F-GAMES-B43-012 — Medium — Promo never shows real gameplay.** Lines 86-204: Both "gameplay" segments render only text captions ("Gameplay Preview", "Earn XP & Level Up!"); `WizardZombieGameRenderer` (file 2) is never mounted here. The promo claims gameplay but shows none — a content/readiness gap if this is the shipped marketing asset.
- **F-GAMES-B43-013 — Low — Hardcoded marketing URL.** Line 244: `advantage-games.com` is hardcoded. If this app is imported/rebranded into Reading/Primary, the CTA is wrong. Should be configurable.
- **F-GAMES-B43-014 — Low — `useVideoConfig()` called but result discarded.** Line 9: invoked for no effect; either use it (preferred, see F-GAMES-B43-011) or remove.

## 4. `src/remotion/index.ts`

- **F-GAMES-B43-015 — Info.** Lines 1-4: Minimal `registerRoot(RemotionRoot)`. Correct. No issues. Confirms Remotion is a separate entrypoint from the game app.

## 5. `src/remotion/test-index.tsx`

- **F-GAMES-B43-016 — Low — Second `registerRoot` entrypoint with a `Still`.** Lines 5-15: A separate root registering a `Still` of the promo. Naming `test-index` is ambiguous (not a unit test; it's a Remotion still-render entrypoint). Line 2 imports `Composition` but only `Still` is used — unused import. Clarify whether this is build-time tooling vs. a stray dev file; it should not be bundled into the game app.

## 6. `src/store/__tests__/usePotionRushStore.test.ts`

- **F-GAMES-B43-017 — Critical — Tests are out of sync with the store contract (type mismatches).** Multiple lines construct `SentenceItem`/`Customer` and call APIs that do not match `usePotionRushStore.ts`:
  - Lines 87, 94, 152: `request`/vocab objects include `category: 'test'`, but `SentenceItem` (store lines 5-9) has only `term`, `translation`, `id`. Extra property → TS error under strict object-literal checks.
  - Lines 102-103, 163-164: `usePotionRushStore.setState({ ... lives: 3 })` — `lives` is not a field on `PotionRushState` (store lines 59-118). TS error.
  - Line 114, 122: `spawnCustomer(vocabList)` is called with an argument, but the store signature is `spawnCustomer: () => void` (store line 97). Argument is ignored at runtime and is a TS arity error.
  These indicate the test file predates the current store refactor. Either it no longer compiles (CI gate risk) or type-checking for tests is not enforced — both are problems. **Verify whether this file is actually run/typechecked** (see Limitations).
- **F-GAMES-B43-018 — Medium — Behavioral assertion may be wrong post-refactor.** Lines 106-117: "spawns customers up to the max of 3" pre-fills 3 customers then calls `spawnCustomer()` and asserts length stays 3. Because `spawnCustomer` reads `vocabList` from store state (store line 223), but the test passes `vocabList` as an arg (ignored) and never sets store `vocabList`, the spawn is a no-op for two reasons (full + empty vocab). The test passes for the wrong reason.
- **F-GAMES-B43-019 — Low.** Lines 67-80 (`tick` movement): good deterministic assertion (beltSpeed 100, dt 1 → moves 100px). This is a solid test of the conveyor.

## 7. `src/store/useGameStore.test.ts`

- **F-GAMES-B43-020 — Medium — `resetStoreState` omits store fields, leaving cross-test bleed.** Lines 9-20: Reset sets `lastXp`/`lastAccuracy` but does NOT reset `missedWords`, `combo`, or `mana` (added to the store, lines 29, 30, 31, 56-58 of `useGameStore.ts`). Tests that exercise combo/mana later could leak state between specs. Reset object is stale relative to the store.
- **F-GAMES-B43-021 — Low — No coverage for combo/mana/missedWords/quitGame/endGame.** The store has `incrementCombo`, `resetCombo`, `addMana`, `spendMana`, `addMissedWord`, `quitGame`, `endGame` (store lines 99-104) — none are tested. Scoring/progress paths (`increaseScore` incrementing `correctAnswers`+`totalAttempts`) are also untested. Test quality gap for the shared game store.
- **F-GAMES-B43-022 — Info.** Lines 46-69: The castle-destruction → `game-over` test is good and asserts the multi-castle end condition correctly.

## 8. `src/store/useGameStore.ts`

Shared Wizard-vs-Zombie / castle-defense Zustand store.

- **F-GAMES-B43-023 — Medium — `resetGame`/`quitGame` do not reset `lastXp`/`lastAccuracy`.** Lines 60-79: A replayed game retains the previous run's `lastXp`/`lastAccuracy` until `setLastResult` is called again. If the UI reads these before the next end-of-game write, it shows stale XP from the prior run.
- **F-GAMES-B43-024 — Medium — No XP/accuracy computation or persistence in the store.** The store tracks `correctAnswers`/`totalAttempts` (lines 80-84) but XP is supplied externally via `setLastResult` (line 98). There is no canonical XP formula here (contrast with `calculatePotionRushXP`). For importability into Reading/Primary the XP/progress contract is implicit and lives outside the store — undocumented and inconsistent across games.
- **F-GAMES-B43-025 — Low — `increaseScore` conflates scoring with answer accounting.** Lines 80-84: It always increments `correctAnswers` and `totalAttempts`. A caller wanting to add bonus/streak score without recording a "correct answer" cannot. Naming implies pure scoring.
- **F-GAMES-B43-026 — Low — No JSDoc on exported store/actions.** Lines 47-105: Per repo AGENTS.md "JSDoc for All Functions", exported `useGameStore` and its actions lack doc comments. Same applies across the store files in this batch.
- **F-GAMES-B43-027 — Info — No leaderboard/persistence.** The store is purely in-memory; leaderboards/progress are handled by API routes (see file 18/19), which are stubs (F-GAMES-B43-052/053).

## 9. `src/store/usePotionRushStore.calculateXP.test.ts`

- **F-GAMES-B43-028 — Medium — Mostly `toBeGreaterThanOrEqual` assertions are weak.** Lines 19, 25-26, 37, 47, 57, 66: Almost every test asserts a lower bound rather than the exact XP. The XP formula (store lines 649-678) is fully deterministic, so exact values are computable and should be asserted. As written, a formula that over-awards XP (e.g., returning 10 everywhere) would still pass most of these. Two specs (line 14 `toBe(0)`, line 78 `toBe(10)`) are exact and good.
- **F-GAMES-B43-029 — Low — `baseState` cast via `as PotionRushState`.** Lines 13, 18, etc.: `Partial<PotionRushState>` cast to full type hides missing fields; since `calculatePotionRushXP` only reads 5 fields this is safe today, but a future formula reading another field would get `undefined` silently.
- **F-GAMES-B43-030 — Info.** Line 81-91 ("returns lower XP with poor accuracy") is a reasonable boundary test.

## 10. `src/store/usePotionRushStore.test.ts`

- **F-GAMES-B43-031 — Critical — Stale vocab shape (`definition` instead of `translation`).** Lines 21, 38, 64, 96, 118-119, 159, 195: vocab objects are `{ term, definition, id }`. `SentenceItem` has `translation`, not `definition` (store lines 5-9). Under strict TS this is an excess-property error; at runtime `term.split(' ')` still works so behavior tests pass, but the type contract is violated and `translation` is never exercised. Mirrors F-GAMES-B43-017 — the Potion Rush tests drifted from the store.
- **F-GAMES-B43-032 — High — `spawnCustomer()` vs `spawnCustomer(vocabList)` ambiguity persists.** Lines 25, 42, 68, 99, 137, 163, 200-202: Called with no args here (matching the store signature), while file 6 calls it WITH args. The two test files disagree on the API — strong signal of an incomplete refactor and a maintainability hazard.
- **F-GAMES-B43-033 — Medium — `Math.random` mock leaks risk.** Lines 135-147: `jest.spyOn(Math,'random').mockReturnValue(0)` is restored at line 147 inside the same test — good. But the surrounding `act()` wrapping a synchronous store mutation (lines 122-138) is unnecessary (Zustand outside React) and may mislead readers.
- **F-GAMES-B43-034 — Low — Belt-speed scaling assertion.** Line 92: `expect(beltSpeed).toBeCloseTo(55)` validates `baseBeltSpeed(50) * 1.1^1` after 1 completed sentence — correct and a good difficulty-scaling test.
- **F-GAMES-B43-035 — Info.** Lines 158-239 test cauldron-reset-on-angry-leave including the "shared sentence" edge — good behavioral coverage of the strict 1:1 cauldron↔customer mapping.

## 11. `src/store/usePotionRushStore.ts`

Potion Rush conveyor/cauldron sentence-building store.

- **F-GAMES-B43-036 — High — Duplicated spawn logic between `tick` and `spawnCustomer`/`spawnIngredient`.** Lines 222-290 vs 313-346 and 406-432: Customer and ingredient spawning are implemented twice (once as standalone actions, once inline in `tick`). They use different patience math: `spawnCustomer` uses `Math.pow(0.9, completedSentences)` (line 236) while `tick` recomputes `currentPatience` (line 314) — currently equal, but two sources of truth invite divergence. Consolidate.
- **F-GAMES-B43-037 — Medium — `substr` is deprecated.** Lines 239, 273, 328, 419: `Math.random().toString(36).substr(2, 9)` uses the deprecated `String.prototype.substr`. Use `slice(2, 11)` (as `spawnEffect` correctly does at line 635). Also, `Math.random`-based IDs can collide; low probability but non-zero for many entities.
- **F-GAMES-B43-038 — Medium — Reputation penalty is harsh / undocumented difficulty.** Line 387: each angry customer subtracts 25 reputation; game over at `<= 0` (line 452). That means 4 missed customers ends the game regardless of difficulty, and the penalty does not scale with `difficulty`. For age-appropriate UX in younger (Primary) audiences this may be punishing; the difficulty config (lines 162-167) only tunes belt speed / spawn rate, not failure tolerance.
- **F-GAMES-B43-039 — Medium — `dayTime` is dead/uncapped state.** Lines 135, 446 (`dayTime + dt*0.01`): `dayTime` is incremented forever (endless mode per file 12) but is no longer used as an end condition. Either remove or document; an ever-growing field can confuse consumers expecting 0–1.
- **F-GAMES-B43-040 — Medium — Case-insensitive word match can mis-validate sentences.** Lines 502, 518: word matching lowercases both sides. Two different vocabulary words differing only by case (or homographs) would be treated as interchangeable; also punctuation is not stripped, so `"hello,"` ≠ `"hello"`. Sentence vocab with punctuation will silently never complete.
- **F-GAMES-B43-041 — Medium — Word-pool accounting can desync.** Lines 338, 366 (recycle), 389/438-443 (remove on angry), 530 (re-add wrong word), 576-582 (remove on serve): the `activeWordPool` is mutated through many independent paths using `indexOf`/`splice`. With duplicate words across customers this can remove the wrong instance or leave orphans, gradually starving/flooding the conveyor. No invariant test guards pool size vs. outstanding customer words.
- **F-GAMES-B43-042 — Low — `handleDropIngredient` removes ingredient before validating cauldron lock.** Lines 481-484: The ingredient is filtered off the belt (line 481) and only then the WARNING/COMPLETED early-return runs (line 484). Dropping onto a locked cauldron consumes the ingredient with no feedback — minor UX/fairness issue.
- **F-GAMES-B43-043 — Low — `targetWords[nextIndex]` unguarded.** Line 518: relies on completion check to prevent overflow; safe today but fragile if completion logic changes. A defensive bound check would be safer.
- **F-GAMES-B43-044 — Low — `totalXpEarned` overwritten, not accumulated.** Lines 611-612: `set({ totalXpEarned: xp })` recomputes from full state each serve — correct given `calculatePotionRushXP` is a pure function of cumulative state, but the field name implies accumulation. Document the intent.
- **F-GAMES-B43-045 — Info — XP formula is exported and pure (good).** Lines 649-678: `calculatePotionRushXP` is a clean pure function, capped 0–10, easy to import/test — the right pattern for cross-app reuse.

## 12. `src/store/usePotionRushStoreEndless.test.ts`

- **F-GAMES-B43-046 — Low — Single, somewhat weak endless-mode test.** Lines 12-31: Verifies the game does not end after 200s when `vocabList` is cleared. Good regression guard for the removed time-limit, but it deliberately empties `vocabList` (line 20) to avoid angry-customer reputation loss, so it does not prove endlessness under real play (where customers would spawn and could end the game via reputation). Comment at line 30 ("dayTime might exceed 1 now") confirms the dead-state concern in F-GAMES-B43-039.
- **F-GAMES-B43-047 — Info.** `startGame([{ term:'dummy', definition:'dummy', id:'0' }])` (line 8) repeats the `definition` type mismatch (see F-GAMES-B43-031).

## 13. `src/store/usePotionRushStoreScaling.test.ts`

- **F-GAMES-B43-048 — Medium — Float-equality on scaled patience.** Lines 57-59: asserts `maxPatience === 48.6` (`60 * 0.9 * 0.9`). `60*0.9*0.9` is `48.60000000000001` in IEEE-754; `find(c => c.maxPatience === 48.6)` will return `undefined` and `expect(customer3).toBeDefined()` would FAIL. This test is fragile/likely-broken and should use `toBeCloseTo`. (Lines 26-27 and 44-45 use 60 and 54 which are exact, so they pass.)
- **F-GAMES-B43-049 — Low — Score test uses range tolerance.** Lines 100-101: `>=49 && <=51` for an expected exact 50 (`floor(60-10)`). Reasonable given tick timing, but the underlying `tick(10,...)` is deterministic so an exact assertion (50) is achievable.
- **F-GAMES-B43-050 — Info.** Line 21/38/etc.: `spawnCustomer()` called with no args — consistent with store, contradicts file 6 (see F-GAMES-B43-032).

## 14. `src/store/useRPGBattleStore.test.ts`

- **F-GAMES-B43-051 — Medium — No `beforeEach` reset; tests rely on `initializeBattle`/global order.** Lines 3-239: There is no store reset between specs. The first spec (lines 4-20) asserts pristine defaults and happens to pass because it runs first, but the module-level `revealTimeout` (store line 58) and accumulated `battleLog` persist across tests. The `addLogEntry` test (lines 41-47) uses `toContainEqual` to dodge accumulation, implicitly acknowledging the leak. Fragile test isolation; ordering-dependent.
- **F-GAMES-B43-052 — Low — Fake timers not isolated.** Lines 96-111: `jest.useFakeTimers()` is enabled and restored within the spec (good), but the shared module-level `revealTimeout` means a prior failing test could leave a live timer affecting later specs. Tie-in with store finding F-GAMES-B43-055.
- **F-GAMES-B43-053 — Info.** Selection-order enforcement tests (lines 188-238) are thorough and good (hero→location→enemy gating).

## 15. `src/store/useRPGBattleStore.ts`

- **F-GAMES-B43-054 — High — Module-level mutable `revealTimeout` is shared global state.** Line 58: A single module-scoped `revealTimeout` is shared by every consumer of the store. With more than one battle component mounted (or in test parallelism), one battle's timeout clears/overwrites another's. It is also never cleared on unmount, so the 2s `setTimeout` (lines 159-162) can fire `set(...)` after the component unmounts (React state-after-unmount / stale-store write). Should live in component scope or be tracked per-instance and cleaned up.
- **F-GAMES-B43-055 — Medium — `xpEarned` is never updated.** Lines 33, 69, 91: `xpEarned` is initialized to 0 and reset to 0 in `initializeBattle`, but no action ever sets it. The RPG battle game has no XP computation in its store — scoring/XP/progress is either missing or implemented elsewhere, inconsistent with Potion Rush (`calculatePotionRushXP`). Importability/progress-contract gap.
- **F-GAMES-B43-056 — Medium — `submitAnswer` validates text but never applies damage.** Lines 133-165: Correct/incorrect updates pose/streak/reveal but does not call `damageEnemy`. Damage application is delegated to the component, so the core battle outcome logic is split between store and UI — violates "keep business logic out of components" and makes the store non-authoritative for game state.
- **F-GAMES-B43-057 — Low — `enemyAttack` default damage magic number.** Line 125: `damage = 8` hardcoded; difficulty does not scale enemy damage (only `enemyMaxHealth` is parameterized at line 80). Difficulty surface is thin.
- **F-GAMES-B43-058 — Low — Case/whitespace-only normalization for answers.** Lines 134-135: `trim().toLowerCase()` only; no diacritic/punctuation normalization. For translation answers in non-English locales this may reject correct answers (accents) — accessibility/fairness concern for Reading/Primary i18n.
- **F-GAMES-B43-059 — Info.** Damage/defeat/victory transitions (lines 102-123) are clean and correctly gate status changes on `status === 'playing'`.

## 16. `src/templates/game/GameNameGame.tsx.template`

The scaffolding template new games are copied from — its quality propagates to every future game.

- **F-GAMES-B43-060 — Critical — Template references `useInterval` but the import is commented out.** Line 261 calls `useInterval(...)`, but line 10 says "no useInterval needed" and there is no `import { useInterval }`. A game copied verbatim from this template will **fail to compile** (`useInterval is not defined`). The contradiction between the rAF loop (lines 243-259) and the leftover `useInterval` animation driver (lines 261-263) must be resolved. This is the highest-impact template defect — it breaks the documented "copy this template" workflow (README lines 43-59).
- **F-GAMES-B43-061 — Medium — Start-screen advertises controls the template does not wire up.** Lines 405-414: instructions/controls list "arrow keys", "WASD", and "Space"/"Action". The template renders only a `DPad` (line 395) and handles `input.cast` via `consumeCast` (lines 279-283) but the `'start'` phase has no keyboard wiring shown, and there is no on-canvas action/cast affordance beyond the DPad. New games inherit a controls/UX mismatch unless authors notice.
- **F-GAMES-B43-062 — Medium — Dead/placeholder structure that doesn't actually play.** Lines 246-259 advance `state` via `advanceTime`, but there is no enemy spawning, collision, scoring, or cast handling wired (despite `ENEMY_SPAWN_MS` const at line 63 being unused, and `consumeCast` just clearing input at line 281). The template renders a movable player over a background with a timer — authors must add all gameplay. Acceptable as a skeleton, but the unused constants (`TICK_MS` line 59, `ENEMY_SPAWN_MS` line 63) are misleading and will trip lint (`no-unused-vars`).
- **F-GAMES-B43-063 — Low — `'use client'` template with hard async asset load and no `delayRender`.** Lines 92-107, 159-183: Asset loading is fine for live play; just noting it is browser-only (uses `new Image()`), so this template is not Remotion-safe (unlike file 2's concerns). Acceptable since templates target the player app.
- **F-GAMES-B43-064 — Low — `GameEndScreen` status derived from `score > 0`.** Line 423: "victory" if any score, else "defeat". A learner who scores even 1 point always "wins"; never reflects accuracy/XP thresholds. Template sets a low bar for win-state UX.
- **F-GAMES-B43-065 — Info — Good accessibility scaffold.** Lines 376-383: the timer progressbar has proper `role`, `aria-label`, `aria-valuemin/max/now`. Score/Time read-outs (lines 363-371) lack `aria-live`, so screen-reader users won't hear score changes — minor a11y gap to seed into the template.
- **F-GAMES-B43-066 — Low — Naming `lastFrameRef2`/`rafRef2`.** Lines 240-241: the `2` suffixes suggest a copy/paste remnant from a prior version; confusing for a canonical template.

## 17. `src/templates/game/README.md`

- **F-GAMES-B43-067 — Medium — README documents the broken `useInterval` pattern.** Lines 146-151 ("Game Tick Loop") show `useInterval(...)` as the canonical loop, contradicting the template file's rAF loop and its line-10 comment. The docs and the template disagree, reinforcing F-GAMES-B43-060. Pick one loop strategy and make docs+template consistent.
- **F-GAMES-B43-068 — Low — `cp` paths use literal `[game-name]` bracket dirs.** Lines 46-58: The example `cp` commands target `src/app/[locale]/.../[game-name]/...`. Bracketed segments are real Next.js dynamic-route syntax for `[locale]` but `[game-name]` is meant as a placeholder; copy-pasting literally creates a dynamic route named `[game-name]`. Clarify which brackets are literal route segments vs. placeholders to replace.
- **F-GAMES-B43-069 — Low — Pre-ship checklist references `npm run build` (line 168).** The monorepo uses `pnpm`/turbo (root AGENTS.md). Minor inconsistency for contributors.
- **F-GAMES-B43-070 — Info.** The checklist (lines 159-170) is otherwise a solid readiness gate (touch+keyboard, responsive canvas, restart 3×, no console errors).

## 18. `src/templates/game/api/complete-route.ts.template`

Resolves to `createCompleteRoute()` in `src/lib/games/api/completeRoute.ts` (read for cross-reference).

- **F-GAMES-B43-071 — High — Completion route is a non-persisting mock; no auth, no progress write.** Template lines 1-7 + factory (`completeRoute.ts` lines 4-24): The POST handler computes `xpEarned` and returns a `mock-activity-${Date.now()}` id (factory line 13). It **does not authenticate the user, does not scope by school/tenant, and does not persist XP/progress**. For importability into Reading/Primary — where games must record real student progress/XP via domain functions — this template produces a route that silently drops all progress. Anyone scaffolding from it ships a fake completion endpoint.
- **F-GAMES-B43-072 — High — `export const dynamic = 'force-static'` on a POST handler.** Template line 3 (and factory line 6): `force-static` on a route that reads `request.json()` (factory line 8) is contradictory — static routes cannot read a per-request body. This will either be ignored or break under static optimization, and is conceptually wrong for a mutation endpoint. Real completion must be dynamic + authenticated.
- **F-GAMES-B43-073 — Medium — No input validation (Zod) on the POST body.** Factory lines 8-9 cast `await request.json()` directly to `CompleteRequest`. Root AGENTS.md requires Zod validation at every external boundary. The template propagates an unvalidated boundary to every new game.
- **F-GAMES-B43-074 — Medium — XP fallback formula `floor(correctAnswers * accuracy)` is questionable.** Factory line 12: when `xp` is absent, XP = correctAnswers × accuracy (so 10 correct at 50% accuracy → 5). This double-counts accuracy (already in `correctAnswers`) and differs from every in-game XP cap (0–10). Inconsistent XP semantics across the platform.

## 19. `src/templates/game/api/ranking-route.ts.template`

Resolves to `createRankingRoute()` (`rankingRoute.ts`).

- **F-GAMES-B43-075 — High — Leaderboard route always returns empty rankings.** Template lines 1-3 + factory (`rankingRoute.ts` lines 4-21): `GET` returns a hardcoded `EMPTY_RANKINGS` for all difficulties. The leaderboard feature is a non-functional stub — any game scaffolded from this template ships a permanently empty leaderboard with no data source, no auth, no tenant scoping. Readiness gap for the "leaderboards" focus area.
- **F-GAMES-B43-076 — Low — `dynamic: 'force-static'` baked into the factory (rankingRoute.ts line 13) but the template does not re-export it.** Template line 3 only re-exports `{ GET }`, dropping the `dynamic` flag the factory defines. Behavior is effectively default-dynamic for the route file; harmless for an empty response but inconsistent with the complete-route template which does set `dynamic`.

## 20. `src/templates/game/api/sentences-route.ts.template`

Resolves to `createSentencesRoute(SAMPLE_SENTENCES)` (`sentencesRoute.ts`).

- **F-GAMES-B43-077 — High — Sentences route serves static sample data, not real curriculum.** Template lines 1-8: `createSentencesRoute(SAMPLE_SENTENCES)` with `dynamic = 'force-static'`. Every game scaffolded from this template returns the same hardcoded `SAMPLE_SENTENCES` regardless of locale, level, or the student's assigned content. For importability into Reading/Primary (which have real sentence/vocab sources scoped by school/level) this template hard-wires demo content and must be replaced — but the README does not flag it as throwaway. Documentation should explicitly mark this as placeholder-only.
- **F-GAMES-B43-078 — Medium — No locale/level/tenant parameters.** Factory `createSentencesRoute` takes a fixed array and the template passes a global constant; there is no mechanism for locale-aware or difficulty-aware sentence selection. Difficulty/level adaptation (a focus area) is absent at the data layer.
- **F-GAMES-B43-079 — Info.** `force-static` is at least defensible here (immutable sample GET), unlike the POST complete route (F-GAMES-B43-072).

---

## Cross-cutting themes

- **Stub data/persistence layer (High):** All three API templates (complete/ranking/sentences) are mocks with no auth, no Zod validation, no tenant scoping, and no persistence (F-GAMES-B43-071/073/075/077). Games scaffolded today cannot record real XP/progress or show real leaderboards in Reading/Primary. This is the dominant importability blocker in this batch.
- **Test drift from store contracts (Critical/High):** Potion Rush tests use `definition`/`category` fields and a `spawnCustomer(arg)` signature that no longer match the store (F-GAMES-B43-017/031/032). Either tests are not type-checked in CI or they fail to compile — needs verification.
- **Broken canonical template (Critical):** `GameNameGame.tsx.template` references an unimported `useInterval` (F-GAMES-B43-060), and the README documents that same broken pattern (F-GAMES-B43-067). The scaffolding entrypoint for all future games does not compile as-shipped.
- **Inconsistent XP/scoring contract (Medium):** Potion Rush has a pure capped 0–10 formula; RPG Battle never sets `xpEarned`; useGameStore takes XP from outside; the complete-route invents a different fallback formula. No single XP contract across games.
- **Global mutable state in stores (High):** `useRPGBattleStore`'s module-level `revealTimeout` (F-GAMES-B43-054) is a real concurrency/cleanup hazard.
- **Remotion promo assets (Low/Medium):** Files 1-5 are marketing tooling; they have correctness issues (setState-in-useMemo, CSS animation in Remotion, vh units, no `delayRender`) but do not affect playable-game readiness. Main risk is bundling Remotion into the app (verify exclusion).

## Severity tally
- Critical: 3 (F-GAMES-B43-017, -031 [paired], -060)
- High: 9 (-003, -004, -032, -036, -054, -071, -072, -075, -077)
- Medium: ~22
- Low: ~20
- Info: ~10

(Counts approximate; some IDs span paired concerns.)

---

## Limitations

1. **Read-only review.** No source files were modified. No code was executed; findings are from static reading.
2. **Tests were not run.** I did not execute `pnpm turbo run test`/`check-types`, so I could not confirm at runtime whether the type-mismatch findings (F-GAMES-B43-017/031/032/048) cause CI failures or are silently tolerated (e.g., via Babel/`isolatedModules` transpile-only test setups). These are flagged as "verify".
3. **Cross-file factories partially inspected.** I read `completeRoute.ts` and `rankingRoute.ts` to ground the template findings, but did not exhaustively trace `sentencesRoute.ts` internals, `@/lib/games/sampleSentences`, `useDirectionalInput`, `useSound`, `GameStartScreen`/`GameEndScreen`, or `@/lib/games/wizardZombie` / `rpgBattleSelection`. Findings about those are limited to how they are consumed in the batch files.
4. **Asset existence not verified.** I did not confirm that referenced sprite sheets / images exist or match the assumed 3×3 / 64px dimensions (relevant to F-GAMES-B43-007).
5. **Remotion bundling assumption.** I did not inspect the build/turbo config to confirm whether `src/remotion/**` is excluded from the production app bundle (F-GAMES-B43-001).
6. **No acceptance or closeout judgment.** This report does not assert that the track, batch, or any task is accepted, complete, verified-for-ship, or closed. It is an evidence-gathering line review only. Acceptance/closeout decisions are out of scope and deferred to the track's review/acceptance phases.
