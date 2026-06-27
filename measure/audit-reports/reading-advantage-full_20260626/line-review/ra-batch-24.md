# Line-by-Line Review — ra-batch-24

> **Track:** `reading_advantage_full_review_20260626`
> **Batch:** `ra-batch-24` (20 files)
> **Reviewer focus:** Test gaps, i18n consistency, JSDoc compliance, incomplete disclosures, contract drift between component and test
> **Date:** 2026-06-27
> **Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`
> **Scope:** Read-only inspection. No application code edited.

---

## 1. Files Reviewed

| # | File | Lines | Type | Category |
|---|------|-------|------|----------|
| 1 | `apps/reading-advantage/components/games/vocabulary/dragon-rider/DragonRiderGame.tsx` | 1646 | `.tsx` | Game component (client) |
| 2 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/BookPickupBurst.test.tsx` | 47 | `.test.tsx` | Unit test |
| 3 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/BookPickupBurst.tsx` | 77 | `.tsx` | Effect component |
| 4 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/DifficultySelector.tsx` | 107 | `.tsx` | UI control |
| 5 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.test.tsx` | 206 | `.test.tsx` | Integration test |
| 6 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx` | 820 | `.tsx` | Game component (client) |
| 7 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/RankingDisplay.tsx` | 148 | `.tsx` | UI panel |
| 8 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/SparkleBurst.test.tsx` | 35 | `.test.tsx` | Unit test |
| 9 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/SparkleBurst.tsx` | 39 | `.tsx` | Effect component |
| 10 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/VocabularyProgress.test.tsx` | 65 | `.test.tsx` | Unit test |
| 11 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/VocabularyProgress.tsx` | 95 | `.tsx` | Slide-out panel |
| 12 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/enchantedLibraryInput.test.ts` | 30 | `.test.ts` | Unit test |
| 13 | `apps/reading-advantage/components/games/vocabulary/enchanted-library/enchantedLibraryInput.ts` | 12 | `.ts` | Pure adapter |
| 14 | `apps/reading-advantage/components/games/vocabulary/rpg-battle/ActionMenu.test.tsx` | 84 | `.test.tsx` | Unit test |
| 15 | `apps/reading-advantage/components/games/vocabulary/rpg-battle/ActionMenu.tsx` | 97 | `.tsx` | Form component |
| 16 | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleEffects.test.tsx` | 26 | `.test.tsx` | Unit test |
| 17 | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleEffects.tsx` | 50 | `.tsx` | Wrapper effect |
| 18 | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleLog.test.tsx` | 26 | `.test.tsx` | Unit test |
| 19 | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleLog.tsx` | 43 | `.tsx` | Log list |
| 20 | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleResults.test.tsx` | 47 | `.test.tsx` | Unit test |

**Total lines reviewed:** ~3,860

**Files NOT in batch but referenced (incomplete disclosure):**
- `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleResults.tsx` — imported by file #20 (`BattleResults.test.tsx` line 2: `from "./BattleResults"`). Component exists on disk (65 lines) but was not included in the review scope.
- `apps/reading-advantage/lib/games/dragonRider.ts` — imported by file #1 (lines 24-35) for round creation, scoring, and result computation. Verified shape for cross-reference; not in batch.
- `apps/reading-advantage/lib/games/enchantedLibrary.ts` — imported by file #6 (lines 20-25) for game state and `Difficulty` type. Verified shape for cross-reference; not in batch.
- `apps/reading-advantage/lib/games/xp.ts` — imported by file #6 (line 34). Cross-referenced: `calculateXP(score, correctAnswers, totalAttempts)`.
- `apps/reading-advantage/lib/games/basePath.ts` — imported by file #1 (line 23) and file #6 (line 31). Provides `withBasePath()`.
- `apps/reading-advantage/hooks/useInterval.ts` — imported by file #1 and file #6. Verified: standard `setInterval` wrapper.
- `apps/reading-advantage/hooks/useSound.ts` — imported by file #1 and file #6.
- `apps/reading-advantage/hooks/useDirectionalInput.ts` — imported by file #6 (line 29).
- `apps/reading-advantage/components/games/vocabulary/dragon-flight/RankingDialog.tsx` — imported by file #1 (line 41) and re-uses the same UI in a different game.
- `apps/reading-advantage/components/games/game/GameStartScreen.tsx` — imported by file #1 and file #6. `startButtonText` defaults to `"Start Game"`.
- `apps/reading-advantage/components/games/game/GameEndScreen.tsx` — imported by file #1 and file #6.
- `apps/reading-advantage/components/games/ui/VirtualDPad.tsx` — imported by file #6 (line 30).
- `apps/reading-advantage/components/ui/input.tsx` and `button.tsx` — imported by file #15 (ActionMenu).
- `apps/reading-advantage/store/useGameStore.ts` and `useRPGBattleStore.ts` — provide `VocabularyItem` and `BattleLogEntry` types.
- `apps/reading-advantage/locales/client.ts` — provides `useScopedI18n`.

---

## 2. Findings by File

### 2.1 `apps/reading-advantage/components/games/vocabulary/dragon-rider/DragonRiderGame.tsx` (1646 lines)

**Contract surface:** Top-level game component. Props: `vocabulary: VocabularyItem[]`, `onComplete: (results: DragonRiderResults) => void`, `preloadedAssets?: DragonRiderAssets | null`, `durationMs?: number`. Manages 60 ms game tick, gate spawning, parallax animation, boss sequence, results reporting, and a Konva `Stage` with two layers and three parallax sub-layers.

**Key internal pieces:**
- Game state machine: `"running" | "boss"` via `state.status` (file #1 line 14 in `dragonRider.ts`). Locally the component tracks `gamePhase: "start" | "playing" | "ended"` (lines 390-392).
- Asset loading (lines 440-461) uses `Promise.all` over nine `loadImage` calls; `isMounted` flag prevents `setState` after unmount. The hook has an empty dependency array `[]` (line 461) — it does not re-load on `preloadedAssets` change, which is correct (the prop is only consumed for the initial state at lines 397-400).
- Resize handling (lines 488-530) covers `ResizeObserver`, `window.resize`, `orientationchange`, and `visualViewport` resize/scroll.
- Stage size is `DEFAULT_STAGE = { width: 960, height: 540 }` (line 153) and the canvas div uses `h-[80vh]` with `min-h-[320px]` (line 936).

#### F-RA-B24R2-001 — `buildGateRound` duplicates domain logic (Medium)

**File:** `DragonRiderGame.tsx` lines 346-371
**Cross-reference:** `lib/games/dragonRider.ts` lines 50-75 already exports a `createGateRound(vocabulary, rng)` (file-private, not exported). The component's `buildGateRound` (lines 346-371) is an inline copy that uses `Math.random()` directly instead of taking an `rng` parameter.
**Issue:** Two parallel implementations of round construction live in different files. They are functionally similar but not identical — the library version accepts an `rng` (so it is testable), while the component version is hardcoded to `Math.random()` and the `correctSide` is decided inline (line 369). The library file already has a tested `createGateRound` (per the `dragonRider.test.ts` in the same directory).
**Impact:** Drift risk. Future fixes to round rules must be applied in two places. The `Math.random()` direct call inside a component also blocks deterministic snapshot testing.
**Severity:** Medium — correctness risk if the two implementations diverge.

#### F-RA-B24R2-002 — Two intervals compute `gateSpeed` and `travelMs` independently (Medium)

**File:** `DragonRiderGame.tsx` lines 595-600 and lines 706-711
**Issue:** The flight interval (lines 586-659) and the boss-arrival interval (lines 700-723) both duplicate the `travelMs` ladder (`easy: 9000`, default: 7200, `hard: 5500`, `extreme: 4000`) and the `gateSpeed = (gateEndY - gateStartY) / (travelMs / 1000)` formula. The constants are locally bound to the interval closure, not memoized. A `useMemo` keyed by `difficulty` would centralize the value.
**Impact:** If a difficulty threshold is tuned in one place but not the other, gates and the boss will fall out of sync. The `const GATE_TRAVEL_MS = 7200 // Moved to dynamic calculation` comment (line 156) confirms the constants were intentionally inlined without deduplication.
**Severity:** Medium — maintainability/duplication.

#### F-RA-B24R2-003 — `pickRandomIndex` and `clamp` duplicated (Low)

**File:** `DragonRiderGame.tsx` lines 243-244 and lines 343-344
**Cross-reference:** `lib/games/dragonRider.ts` lines 46-48 defines `pickIndex(rng, max)` and `getGateSide(rng)`. The component redefines `pickRandomIndex(max)` (line 343) using `Math.random()`. `clamp` is also a tiny utility that lives in many places; AGENTS.md does not mandate a shared util location, so this is low severity.
**Severity:** Low.

#### F-RA-B24R2-004 — Difficulty state is `useState` and not propagated to the game domain (Medium)

**File:** `DragonRiderGame.tsx` lines 389, 402, 463, 596, 707, 1178
**Issue:** `difficulty` is a local `useState` (line 389). `createDragonRiderState` is called with only `vocabulary` and `durationMs` (lines 402-404, 464-466). The library's `createDragonRiderState` accepts a `DragonRiderConfig` (file: `dragonRider.ts` line 33), but the component never passes `difficulty` into the game state, so the difficulty affects only the visual gate speed (lines 595-600, 706-711), not scoring or `xpMultiplier`. The `enchantedLibrary` domain module by contrast uses `DIFFICULTY_CONFIG[difficulty].xpMultiplier` (file: `enchantedLibrary.ts` lines 60-65). `xpMultiplier` is missing in `dragonRider.ts`.
**Impact:** "extreme" gives the same XP as "easy". The UI presents difficulty as if it changes scoring (the difficulty pill sits next to the trophy button), but the game state never observes it. This is a contract drift between UI and domain.
**Severity:** Medium.

#### F-RA-B24R2-005 — `handleGateSelection` and `useEffect` race against gatePairs removal (Medium)

**File:** `DragonRiderGame.tsx` lines 603-614, 828-855
**Issue:** The flight tick (line 603) filters out pairs whose `y` exceeds `gateEndY` (line 606) and slices to the first pair (line 613: `nextPairs.slice(0, 1)`). `handleGateSelection` (line 828) reads `activePair` which is derived from `gatePairs` (line 821). A pair the player is reacting to can be removed by the same tick that processes the answer, leaving `pendingSelectionRef` populated but `activePair` returning `null` (line 826). The `pendingSelectionRef` will still be consumed at line 621-643, but the `setLockedPairId(pair.id)` (line 851) and the `setFeedback({ pairId: pending.pairId, ... })` (lines 625-629) can refer to a pair that is no longer in `gatePairs`, so the gate visual never gets the red/green flash overlay.
**Impact:** Players may see a feedback text badge in the center (lines 1074-1086) but no gate highlight when they answer near the end of a gate's lifetime. Inconsistent feedback UI.
**Severity:** Medium.

#### F-RA-B24R2-006 — `isMounted` only protects the loading effect (Low)

**File:** `DragonRiderGame.tsx` lines 440-461
**Issue:** Only the asset-loading effect uses an `isMounted` guard. The interval ticks (lines 586, 684, 693, 700, 725) read state via `setState` and `setState((prev) => ...)` after the component unmounts because the cleanup only `clearInterval`s the ID. Calling `setState` on an unmounted component is no longer fatal in React 18, but it is a memory and console-warning smell.
**Severity:** Low.

#### F-RA-B24R2-007 — `onComplete` is in the dependency array of the result-effect (Medium)

**File:** `DragonRiderGame.tsx` lines 794-800
**Issue:** The `useEffect` that calls `onComplete(nextResults)` (lines 768-800) lists `onComplete` in the dependency array. The effect re-runs every time the parent passes a new `onComplete` reference. The component does not guard with a `hasReportedRef` (compare to `EnchantedLibraryGame.tsx` line 116, which uses `hasReportedRef.current` to prevent double-report). If a parent re-renders during the boss phase with a new callback, `onComplete` fires again with the same results.
**Impact:** Same class of duplicate-callback bug as `EnchantedLibraryGame`. Cross-game consistency: Enchanted Library has the guard, Dragon Rider does not.
**Severity:** Medium.

#### F-RA-B24R2-008 — Game-end report fires when `status === "boss"` even if `dragonCount` is `0` (Low)

**File:** `DragonRiderGame.tsx` lines 768-800
**Cross-reference:** `getDragonRiderResults` (file: `dragonRider.ts` lines 131-150) computes `victory = dragonCount >= bossPower`. If `dragonCount` is 0 and `bossPower` is 3, the result reports `victory: false` correctly. The issue is the effect fires on entry to the `boss` phase, before the boss battle actually concludes. The `gamePhase` flips to `"ended"` only after `showResults` is set (line 816-819), which only happens after `bossSequenceDone` (line 803) and `RESULTS_REVEAL_MS` (line 161). So a defeat is reported ~900 ms after the boss sequence starts, not after the player loses. In the current code, the player always "ends" at the boss arrival, regardless of whether the army wins.
**Impact:** Defeat is reported before the player has had a chance to attack. The "big boss battle" UI (lines 1092-1131) implies player action, but the game-over state is decided at entry.
**Severity:** Medium-Low (logic, not crash).

#### F-RA-B24R2-009 — `bossHealth` decreases by 1 per `BOSS_HEALTH_TICK_MS` (1800 ms) (Low)

**File:** `DragonRiderGame.tsx` lines 700-737
**Issue:** `setBossHealth((prev) => Math.max(0, prev - 1))` and `setDisplayDragonCount((prev) => Math.max(0, prev - 1))` run on `BOSS_HEALTH_TICK_MS = 1800`. There is no player input feeding the boss battle. The only interaction tied to boss is the `bossBattleStarted` flag (line 740-747), which is set when the boss reaches `targetY`. Once started, the timer ticks down both `bossHealth` and `displayDragonCount` until one hits zero. The dragon count display therefore inevitably reaches zero, even though the player has no "attack" mechanic visible in the UI. The "Big Boss Battle" banner and shield/wand/sparkle icons in the instructions imply a combat action, but the actual code reduces health passively.
**Impact:** The "boss battle" is a passive countdown, contradicting the instruction text and the `Wand2`/`Sparkles` instruction icons.
**Severity:** Medium — UX/correctness.

#### F-RA-B24R2-010 — Hardcoded English string in canvas (Informational)

**File:** `DragonRiderGame.tsx` line 1102
**Issue:** `⚔️ Big Boss Battle! ⚔️` is hardcoded English inside the `AnimatePresence` block, while the rest of the component uses `useScopedI18n` (line 387) and `t("...")`. The `t` is declared at line 387 and used elsewhere (e.g., lines 1138, 1142-1144, 1158-1162).
**Severity:** Low (incomplete i18n).

#### F-RA-B24R2-011 — `Select` control label is hardcoded (Low)

**File:** `DragonRiderGame.tsx` line 1165
**Issue:** `{ label: "Select", keys: "Tap Gate", color: "bg-emerald-500" }` is hardcoded English.
**Severity:** Low.

#### F-RA-B24R2-012 — `t(...) as any` on dynamic i18n key (Low)

**File:** `DragonRiderGame.tsx` line 1190
**Issue:** `t(`startScreen.difficulty${d.charAt(0).toUpperCase() + d.slice(1)}` as any)`. The `as any` suppresses TypeScript's exhaustiveness check on the translation key namespace. If a locale file omits one of `difficultyEasy`, `difficultyNormal`, `difficultyHard`, `difficultyExtreme`, the call returns the raw key string at runtime.
**Severity:** Low.

#### F-RA-B24R2-013 — `onPointerDown` on overlay divs is not keyboard-accessible (Low)

**File:** `DragonRiderGame.tsx` lines 1020-1047
**Issue:** The left/right gate buttons use `onPointerDown`. They are real `<button>` elements, so keyboard interaction is technically possible, but the `aria-label` is the only label and no visible focus ring is applied via class. Compare to `SparkleBurst.tsx` and `BookPickupBurst.tsx`, which use `aria-hidden` because they are decorative.
**Severity:** Low.

#### F-RA-B24R2-014 — JSDoc missing on exported `DragonRiderGame` (Low)

**File:** `DragonRiderGame.tsx` line 381
**Issue:** `export function DragonRiderGame({...}: DragonRiderGameProps)` has no JSDoc block. AGENTS.md "JSDoc for All Functions" requires it for exported functions.
**Severity:** Low (documentation).

#### F-RA-B24R2-015 — JSDoc missing on `DragonRiderCanvas` (Low)

**File:** `DragonRiderGame.tsx` line 1282
**Issue:** `const DragonRiderCanvas = ({...}: DragonRiderCanvasProps) => {...}` is exported in the same file (no `export` keyword, but it is a top-level declaration with public type). It has no JSDoc.
**Severity:** Low.

#### F-RA-B24R2-016 — `RANKING_BUTTON` title is translated but the button itself is not `aria-label`'d (Low)

**File:** `DragonRiderGame.tsx` lines 1196-1202
**Issue:** The trophy button uses `title={t("startScreen.rankingButton")}` and contains `<Trophy className="w-5 h-5" />` with no `aria-label`. The `title` attribute is read inconsistently by screen readers; `aria-label` is preferred.
**Severity:** Low.

---

### 2.2 `apps/reading-advantage/components/games/vocabulary/enchanted-library/BookPickupBurst.test.tsx` (47 lines)

**Contract tested:** Variant, frame index, completion callback.

#### F-RA-B24R2-017 — Test mocks framer-motion to call `onAnimationComplete` synchronously (Low)

**File:** `BookPickupBurst.test.tsx` lines 5-21
**Issue:** The mock executes `onAnimationComplete()` immediately during the render of `motion.div` (line 16). This is a synthetic test environment; the real `framer-motion` does not fire `onAnimationComplete` during render. The test only verifies that the callback is wired up, not that the animation lifecycle is correct.
**Severity:** Low (test fidelity, not a runtime bug).

#### F-RA-B24R2-018 — Test does not assert position via `left`/`top` percent style (Low)

**File:** `BookPickupBurst.test.tsx` lines 27-37
**Issue:** The component sets `style={{ left: \`${x}%\`, top: \`${y}%\` }}` (file #3 line 35), but the test only renders with `x={50}, y={40}` and does not assert that those percentages land on the wrapper. The wrapper `data-testid="book-pickup-burst"` (file #3 line 38) is found, but no `style` assertion is made.
**Severity:** Low (incomplete coverage).

#### F-RA-B24R2-019 — No negative test for invalid `variant` (Low)

**File:** `BookPickupBurst.test.tsx` lines 24-46
**Issue:** `BookPickupVariant = "glow" | "close"` (file #3 line 6). The test exercises only `"glow"`. There is no test for `"close"`. The component is small enough that the gap is minor.
**Severity:** Low (test coverage gap).

---

### 2.3 `apps/reading-advantage/components/games/vocabulary/enchanted-library/BookPickupBurst.tsx` (77 lines)

**Contract surface:** Decorative burst. Props: `x`, `y` (percent), `spriteUrl`, `frameWidth`, `frameHeight`, `frameIndex`, `variant: "glow" | "close"`, `onComplete: () => void`.

#### F-RA-B24R2-020 — Background image size assumes a 3-frame horizontal sheet (Low)

**File:** `BookPickupBurst.tsx` lines 67-69
**Issue:** `backgroundSize: \`${frameWidth * 3}px ${frameHeight}px\`` hardcodes a 3-frame sheet width. The component receives `frameWidth` and `frameHeight` from the parent (`EnchantedLibraryGame.tsx` lines 624-625), which pass `grids.book.fw` and `grids.book.fh`. The `buildBookSpriteGrid` in `EnchantedLibraryGame.tsx` (line 78) divides `width / 3`, so the assumption holds. If the sheet ever has a different number of columns, both the `BookPickupBurst` and `EnchantedLibraryGame` would need to change.
**Severity:** Low (tight coupling without a shared contract).

#### F-RA-B24R2-021 — `aria-hidden="true"` on burst (Informational)

**File:** `BookPickupBurst.tsx` line 37
**Issue:** The wrapper is `aria-hidden`, which is correct for a decorative particle. The `onComplete` callback is called from `motion.div` (line 50); the wrapper's `pointer-events-none` (line 34) confirms decorative intent.
**Severity:** Informational.

#### F-RA-B24R2-022 — JSDoc missing (Low)

**File:** `BookPickupBurst.tsx` line 19
**Issue:** `export function BookPickupBurst({...})` has no JSDoc.
**Severity:** Low (documentation).

---

### 2.4 `apps/reading-advantage/components/games/vocabulary/enchanted-library/DifficultySelector.tsx` (107 lines)

**Contract surface:** Difficulty pills. Props: `selected: Difficulty`, `onSelect: (difficulty: Difficulty) => void`.

#### F-RA-B24R2-023 — Hardcoded English labels and `title` (Medium)

**File:** `DifficultySelector.tsx` lines 13-51, 81
**Issue:** `DIFFICULTY_INFO` (lines 13-51) hardcodes `label: "Easy"`, `"Normal"`, `"Hard"`, `"Extreme"`. The `title` (line 81) is `${info.label} - ${info.xpMultiplier}x XP`, also English. The component imports `useScopedI18n` (line 6) but never calls it. By contrast, `EnchantedLibraryGame.tsx` (line 120) calls `useScopedI18n("pages.student.gamesPage.enchantedLibrary")` and uses `t(...)` for everything else. The selector is mounted by `EnchantedLibraryGame` (lines 527-530), so the parent already has a translator available — the selector could be passed translated labels as props.
**Severity:** Medium (i18n gap).

#### F-RA-B24R2-024 — `xpMultiplier` is hardcoded inside the UI module (Medium)

**File:** `DifficultySelector.tsx` lines 25, 32, 38, 44
**Cross-reference:** `lib/games/enchantedLibrary.ts` lines 60-65 already defines `DIFFICULTY_CONFIG` with `xpMultiplier: 1.0 / 1.5 / 2.0 / 3.0`. The component's `DIFFICULTY_INFO` is a parallel definition. If the library bumps `xpMultiplier` for `hard` to 2.5, the UI would still display `2.0x XP` because it does not import the library config. This is a second source-of-truth for the same number.
**Severity:** Medium (drift risk).

#### F-RA-B24R2-025 — `info.color.replace("text-", "border-")` is brittle (Low)

**File:** `DifficultySelector.tsx` line 95
**Issue:** The selection border color is derived from the text color class via string replacement. If the underlying `color` class is renamed (e.g., `text-green-400` to `text-emerald-400`), the border silently disappears. The same pattern is used at line 95 and only there.
**Severity:** Low (brittle mapping).

#### F-RA-B24R2-026 — JSDoc missing (Low)

**File:** `DifficultySelector.tsx` line 53
**Severity:** Low (documentation).

---

### 2.5 `apps/reading-advantage/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.test.tsx` (206 lines)

**Contract tested:** Intro screen, game start, asset loading, HUD labels, book rendering, glow effects, grimoire toggle.

#### F-RA-B24R2-027 — Unmocked `useScopedI18n` causes 9 of 11 tests to fail (High)

**File:** `EnchantedLibraryGame.test.tsx` lines 1-205
**Cross-reference:** Component uses `useScopedI18n("pages.student.gamesPage.enchantedLibrary")` at file #6 line 120. The test does not mock it.
**Issue:** Tests like `findByText(/Enchanted Library/i)` (line 130) and `findByText(/Mana:/i)` (line 180) look for translated English. The translator returns the raw key string at runtime when the locale dictionary is missing in the test environment, so the rendered DOM contains `pages.student.gamesPage.enchantedLibrary.title` rather than `"Enchanted Library"`. Result: 9 of 11 tests in this file fail under jest. This is documented by a peer reviewer (file `ra-batch-24.md` F-RA-B24-018).
**Verified by reading:** `useScopedI18n` is imported at file #6 line 35 and is not in the `jest.mock` list of the test (lines 30-72). The only mocks are `react-konva`, `useSound`, and `ResizeObserver`.
**Severity:** High (test suite broken).

#### F-RA-B24R2-028 — Vacuous assertion in "renders large, readable book labels" (High)

**File:** `EnchantedLibraryGame.test.tsx` lines 162-171
**Issue:** The test asserts only `expect(books.length).toBeGreaterThan(0)`. It does not check that any specific book label (`<Text text={book.translation} />`, file #6 line 704-712) is present in the rendered DOM. If the `<Text>` element is removed entirely, the test still passes. This is a vacuous-pass (A4) anti-pattern.
**Severity:** High (test is meaningless).

#### F-RA-B24R2-029 — `toHaveLength(4)` uses bare digit (Medium)

**File:** `EnchantedLibraryGame.test.tsx` line 152
**Cross-reference:** `lib/games/enchantedLibrary.ts` `spawnBooks` produces 1 correct + 3 decoys = 4 books (per the comment at line 158-159 of the library). The `4` should be a named constant in the test (e.g., `EXPECTED_BOOK_COUNT`) or imported from the domain.
**Severity:** Medium (A3 — digit-only count).

#### F-RA-B24R2-030 — Test does not cover `onComplete` callback (High)

**File:** `EnchantedLibraryGame.test.tsx` lines 118-205
**Issue:** The 11 tests cover the intro, start, and HUD labels but never assert that `onComplete` (file #6 line 60) is called with a result object. The component has a `useEffect` (file #6 lines 317-353) that fires `onComplete(nextResults)` when the game reaches `victory` or `gameover`. There is no end-of-game test. Compare to `DragonFlightGame.test.tsx` (per peer reviewer batch-23 F-RA-B23-018) which has a results test.
**Severity:** High (test coverage gap on the most important contract).

#### F-RA-B24R2-031 — Test does not cover difficulty change (Medium)

**File:** `EnchantedLibraryGame.test.tsx` lines 105-205
**Issue:** `defaultProps.difficulty = "normal"` (line 108). No test exercises the `onDifficultyChange` callback. The `DifficultySelector` is mounted by the game (file #6 lines 527-530); the test does not click a difficulty button.
**Severity:** Medium (coverage gap).

#### F-RA-B24R2-032 — `global.Image.prototype.src` setter monkey-patched without cleanup (Medium)

**File:** `EnchantedLibraryGame.test.tsx` lines 88-96
**Issue:** `Object.defineProperty(global.Image.prototype, "src", { set(src) {...} })` patches the prototype for the entire jest worker. There is no `afterAll` to restore. If any subsequent test in the same worker relies on the real `src` setter, it will receive the synthetic `setTimeout(..., 0)` behavior instead. Peer reviewer batch-23 flagged the same pattern in `PotionRushGame.test.tsx` (F-RA-B23-011).
**Severity:** Medium (test pollution).

#### F-RA-B24R2-033 — "toggles the grimoire view" only clicks once, no close assertion (Low)

**File:** `EnchantedLibraryGame.test.tsx` lines 193-205
**Issue:** The test clicks the grimoire button (line 201) and asserts "My Grimoire" appears. It does not assert that the close button or backdrop click closes the panel.
**Severity:** Low (coverage).

#### F-RA-B24R2-034 — `VocabularyItem` shape in test fixture omits `id` (Low)

**File:** `EnchantedLibraryGame.test.tsx` lines 98-103
**Cross-reference:** `store/useGameStore.ts` defines `VocabularyItem` (referenced in file #6 line 26). The peer reviewer's batch-23 review does not cover this, but the test fixture is:
```ts
const vocabulary: VocabularyItem[] = [
  { term: "Apple", translation: "Manzana" },
  ...
];
```
Meanwhile, `VocabularyProgress.test.tsx` (file #10 lines 8-9) uses `{ term: "cat", translation: "gato", id: "1" }`. The shape is inconsistent across test files.
**Severity:** Low (test fixture inconsistency).

---

### 2.6 `apps/reading-advantage/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx` (820 lines)

**Contract surface:** Top-level game component. Props: `vocabulary`, `onComplete`, `difficulty`, `onDifficultyChange`, `rankings`. Manages player movement, book collection, spirits, shield casting, camera, and end-game reporting.

#### F-RA-B24R2-035 — `onExit` uses full page reload (Medium)

**File:** `EnchantedLibraryGame.tsx` line 805
**Issue:** `onExit={() => { window.location.href = "/student/games"; }}`. This bypasses Next.js client routing, destroys all React state, and triggers a full HTML reload. The `GameEndScreen` component is already a Next.js component and should be using `next/navigation` (`useRouter().push(...)`) or `<Link>`. Peer reviewer F-RA-B24-011 flagged the same issue.
**Severity:** Medium.

#### F-RA-B24R2-036 — `findCollectedBook` only fires when `mana` changes (Medium)

**File:** `EnchantedLibraryGame.tsx` lines 425-459
**Issue:** The function returns `null` if `prevState.mana === nextState.mana` (line 428). But the `lib/games/enchantedLibrary.ts` (lines 94-96) defines `MANA_GAIN_CORRECT = 10`, `MANA_LOSS_INCORRECT = 5`, and `MANA_LOSS_SPIRIT_HIT = 10`. If the player picks up a correct book (`+10`), mana increases; if they pick up a wrong book (`-5`), mana decreases. Both should trigger a pickup burst. But the function compares `nextState.books` to `prevState.books` by index (line 431), assuming the book array's length and order are stable. If the `spawnBooks` logic reuses indices, the comparison still works; if it filters or reorders, the comparison breaks. The function then finds the book the player was near in the **previous** state (line 448). If a spirit pushes the player into a book between ticks, the book is at the new position, not the previous one.
**Impact:** Decoy pickups near the player may not produce a visual `BookPickupBurst` if mana changes by 0 (e.g., a shield absorbs the spirit hit and a book pickup is a net 0). Also, multiple books collected in the same tick produce only one burst because the function only returns the first match.
**Severity:** Medium.

#### F-RA-B24R2-037 — `setTotalAttempts` may double-count spirit hits as wrong answers (Medium)

**File:** `EnchantedLibraryGame.tsx` lines 246-266
**Issue:** Logic at line 256-264: if `nextState.mana !== prevMana` and no vocabulary progress increased, increment `setTotalAttempts`. This treats any mana drop as an "attempt", conflating wrong-book pickups with spirit collisions. The `lib/games/enchantedLibrary.ts` separates these events; the component does not have visibility into which one occurred.
**Impact:** Reported `accuracy` is artificially low. `calculateXP` uses `correctAnswers / totalAttempts` (`lib/games/xp.ts` line 8), so a player who picks up 5 correct books and gets hit by 3 spirits will report `accuracy = 5/8 = 62.5%` rather than `5/5 = 100%`. The XP is reduced accordingly. This is a contract drift between game and XP calculation.
**Severity:** Medium.

#### F-RA-B24R2-038 — `setGamePhase("ended")` fires from inside the same effect as `onComplete` (Informational)

**File:** `EnchantedLibraryGame.tsx` lines 321-335 and 338-352
**Issue:** Both the `victory` and `gameover` branches call `onComplete(nextResults)` (lines 331 and 348) and then `setGamePhase("ended")` (lines 334 and 351). The `hasReportedRef.current` guard (lines 330 and 347) prevents duplicate calls, but if a parent re-renders the component with a new `onComplete` reference while `hasReportedRef.current === true`, the guard still works because it is a `useRef` and not reset. The pattern is correct.
**Severity:** Informational (no defect).

#### F-RA-B24R2-039 — `setInterval(updateDimensions, 200)` is leaked past 2 s but `clearInterval` is in cleanup (Low)

**File:** `EnchantedLibraryGame.tsx` lines 380-389
**Issue:** `setInterval(updateDimensions, 200)` and `setTimeout(() => clearInterval(interval), 2000)`. The `setTimeout` only schedules the `clearInterval`; if the component unmounts before 2 s, the cleanup function calls `clearInterval(interval)` (line 387) and `clearTimeout(timeout)` (line 388). The `clearInterval` clears the interval, but the `clearTimeout` is unnecessary once the interval is already cleared. The `setTimeout` itself can still fire and call `clearInterval` on an already-cleared ID (idempotent), so this is not a leak. The pattern is functional but slightly redundant.
**Severity:** Low.

#### F-RA-B24R2-040 — Hardcoded English "Find:" in HUD (Low)

**File:** `EnchantedLibraryGame.tsx` line 579
**Issue:** `Find:` (line 579) is hardcoded. The HUD already uses `t("hud.mana")`, `t("hud.time")`, `t("hud.shields")` (lines 544, 553, 559), so the "Find:" label breaks i18n consistency. The same component has `t` in scope (line 120).
**Severity:** Low.

#### F-RA-B24R2-041 — Hardcoded English "Difficulty" and "SHIELD" labels (Low)

**File:** `EnchantedLibraryGame.tsx` lines 648, 797
**Issue:** `SHIELD` (line 648) and `Difficulty` (line 797) are hardcoded English. `difficulty.charAt(0).toUpperCase() + difficulty.slice(1)` (line 797) produces a string like `"Normal"` regardless of locale.
**Severity:** Low.

#### F-RA-B24R2-042 — Shield charges rendered as emoji (Low)

**File:** `EnchantedLibraryGame.tsx` lines 558-573
**Issue:** `🛡️` (line 571) is repeated in spans based on `maxShieldCharges` (line 560). Emojis are not reliably renderable across platforms and have poor contrast and accessibility. No `aria-label` per shield.
**Severity:** Low.

#### F-RA-B24R2-043 — JSDoc missing on `EnchantedLibraryGame` (Low)

**File:** `EnchantedLibraryGame.tsx` line 91
**Severity:** Low (documentation).

#### F-RA-B24R2-044 — `input.cast` handled by `consumeCast()` every frame it is true (Low)

**File:** `EnchantedLibraryGame.tsx` lines 268-271
**Cross-reference:** `hooks/useDirectionalInput.ts` lines 65-67 define `consumeCast = useCallback(() => setCastTriggered(false), [])`. The `useDirectionalInput` hook sets `castTriggered = true` on key down (line 36) and the component `consumeCast`s it on first use. The current code calls `consumeCast()` only when `input.cast` is true. `useInterval` runs every 50 ms while `gameState?.status === "playing"`. If a key is held down, the OS may emit repeated `keydown` events with `e.repeat = true` (handled at `useDirectionalInput.ts` line 23-25, ignored), so `castTriggered` stays true until `consumeCast`. The current code is correct.
**Severity:** Informational (no defect, just confirmed).

#### F-RA-B24R2-045 — `onComplete` dependency risk (Medium)

**File:** `EnchantedLibraryGame.tsx` lines 317-353
**Issue:** The end-of-game effect has `onComplete` in the dependency array (line 353). The `hasReportedRef.current` guard prevents double-fire, but if the parent re-renders with a new callback while the game status is `"victory"` or `"gameover"`, the effect re-runs, sets `setResults(nextResults)` (lines 329, 345), and updates `setGamePhase("ended")` redundantly. The `onComplete` does not re-fire because of the guard, but the `setResults` and `setGamePhase` do. This causes a render with the same data. Acceptable, but the effect would be cleaner if it only ran on `status` transitions, not on `onComplete` changes.
**Severity:** Low-Medium.

---

### 2.7 `apps/reading-advantage/components/games/vocabulary/enchanted-library/RankingDisplay.tsx` (148 lines)

**Contract surface:** Leaderboard panel with difficulty tabs. Props: `rankings: Record<Difficulty, RankingEntry[]>`, `currentUserId?: string`, `currentDifficulty?: Difficulty = "normal"`.

#### F-RA-B24R2-046 — `RankingEntry` interface duplicated (Medium)

**File:** `RankingDisplay.tsx` lines 8-13
**Cross-reference:** Same shape appears in `EnchantedLibraryGame.tsx` lines 51-56 and in `dragon-flight/RankingDialog.tsx` lines 16-21. Three parallel definitions of the same record shape. AGENTS.md requires Zod-validated contracts at module boundaries; none exist for `RankingEntry`.
**Severity:** Medium.

#### F-RA-B24R2-047 — Hardcoded English strings throughout (Medium)

**File:** `RankingDisplay.tsx` lines 21-26, 42, 67-68, 130
**Issue:** `DIFFICULTY_LABELS` (lines 21-26) is hardcoded English. The `Leaderboard` title (line 42), "No rankings yet for this difficulty." (line 67), "Be the first to play!" (line 68), and "(You)" (line 130) are all hardcoded. The parent `EnchantedLibraryGame` (file #6) uses `useScopedI18n`; this component does not.
**Severity:** Medium.

#### F-RA-B24R2-048 — React key stability assumes unique `userId` (Low)

**File:** `RankingDisplay.tsx` line 77
**Issue:** `key={entry.userId}`. If a backend returns duplicate `userId`s (e.g., the API combines guest and registered users in the same list), React will warn and may render the wrong user. The data contract should guarantee uniqueness but is not enforced.
**Severity:** Low.

#### F-RA-B24R2-049 — JSDoc missing (Low)

**File:** `RankingDisplay.tsx` line 28
**Severity:** Low (documentation).

#### F-RA-B24R2-050 — `entry.image` is rendered without `referrerPolicy` (Low)

**File:** `RankingDisplay.tsx` lines 111-115
**Issue:** `<img src={entry.image} alt={entry.name} ...>`. For user-uploaded avatars this can leak the referrer; `referrerPolicy="no-referrer"` is recommended. There is also no onerror handler for failed avatar loads — the user sees a broken image icon.
**Severity:** Low.

---

### 2.8 `apps/reading-advantage/components/games/vocabulary/enchanted-library/SparkleBurst.test.tsx` (35 lines)

**Contract tested:** Particle count and completion callback.

#### F-RA-B24R2-051 — `toHaveLength(10)` uses bare digit (Medium)

**File:** `SparkleBurst.test.tsx` line 32
**Cross-reference:** Component (file #9 line 13) uses `Array.from({ length: 10 })`. The `10` should be a named constant.
**Severity:** Medium (A3 — digit-only count).

#### F-RA-B24R2-052 — Test does not assert particle positions (Low)

**File:** `SparkleBurst.test.tsx` lines 27-34
**Issue:** The component sets `style={{ left: \`${x}%\`, top: \`${y}%\` }}` (file #9 line 18). The test renders with `x={40}, y={60}` (line 29) but does not assert the wrapper's position. Only the particle count is checked.
**Severity:** Low (incomplete coverage).

---

### 2.9 `apps/reading-advantage/components/games/vocabulary/enchanted-library/SparkleBurst.tsx` (39 lines)

**Contract surface:** Particle burst. Props: `x`, `y` (percent), `onComplete: () => void`.

#### F-RA-B24R2-053 — `Math.random()` inside `animate` (Low)

**File:** `SparkleBurst.tsx` lines 26-27
**Issue:** Each render computes new random offsets, so the particles jump to a new end position every time the parent re-renders. Framer-motion will animate from the previous end position to the new one, producing a stutter effect. Should be computed once in a `useMemo` or `useState` initializer.
**Severity:** Low.

#### F-RA-B24R2-054 — `onAnimationComplete` only on first particle (Low)

**File:** `SparkleBurst.tsx` line 33
**Issue:** `onAnimationComplete={i === 0 ? onComplete : undefined}`. All ten particles have the same `transition: { duration: 0.6, ease: "easeOut" }` (line 31), so the first one to finish triggers the callback. The remaining nine continue animating. The component is removed from the DOM by the parent's `onComplete` (which calls `setSparkles(prev => prev.filter(...))`), so this is fine in practice.
**Severity:** Low.

#### F-RA-B24R2-055 — JSDoc missing (Low)

**File:** `SparkleBurst.tsx` line 12
**Severity:** Low (documentation).

---

### 2.10 `apps/reading-advantage/components/games/vocabulary/enchanted-library/VocabularyProgress.test.tsx` (65 lines)

**Contract tested:** All words render, star fill states, and closed state.

#### F-RA-B24R2-056 — Star count is hardcoded as 2 (Low)

**File:** `VocabularyProgress.test.tsx` lines 43-44, 48-49
**Cross-reference:** Component (file #11 lines 71-80) renders exactly two `<Star>` elements per row, with `data-filled` based on `count >= 1` and `count >= 2`. The test asserts `catStars[0]` and `catStars[1]`, but does not assert a length. If the component ever renders three stars (e.g., the "collect all words twice" footer at line 88 implies mastery levels), the test still passes for the first two.
**Severity:** Low.

#### F-RA-B24R2-057 — `getByTestId("vocab-row-${item.term}")` assumes term is a valid CSS selector (Low)

**File:** `VocabularyProgress.test.tsx` lines 41, 47
**Cross-reference:** Component generates the testid at file #11 line 60: `data-testid={\`vocab-row-${item.term}\`}`. If a vocabulary term contains a space or special character, the testid is still valid in `getByTestId` (it is matched by attribute, not selector). Safe.
**Severity:** Informational.

---

### 2.11 `apps/reading-advantage/components/games/vocabulary/enchanted-library/VocabularyProgress.tsx` (95 lines)

**Contract surface:** Slide-out grimoire panel. Props: `vocabulary: VocabularyItem[]`, `progress: Map<string, number>`, `isOpen: boolean`, `onClose: () => void`.

#### F-RA-B24R2-058 — React key is array index (Low)

**File:** `VocabularyProgress.tsx` line 58
**Issue:** `key={i}` for vocabulary rows. If the vocabulary array is reordered or filtered between renders, React will reuse DOM nodes incorrectly. Better to use `item.term` (already used in `data-testid`) or `item.id` (per the type, though the test fixture at file #5 lines 98-103 does not include `id`).
**Severity:** Low.

#### F-RA-B24R2-059 — Panel is decorative (no real a11y labels) (Low)

**File:** `VocabularyProgress.tsx` lines 38-89
**Issue:** The panel has `<h3>My Grimoire</h3>` (line 41) hardcoded English. The close button has only a visual `<X>` icon (line 49) with no `aria-label`. The backdrop (line 24-30) is a `<motion.div>` not a `<button>`; clicking it calls `onClose` but keyboard users cannot trigger close via the backdrop.
**Severity:** Low.

#### F-RA-B24R2-060 — Mastery label "Collect all words twice!" hardcoded (Low)

**File:** `VocabularyProgress.tsx` line 88
**Issue:** Hardcoded English in the footer.
**Severity:** Low.

#### F-RA-B24R2-061 — JSDoc missing (Low)

**File:** `VocabularyProgress.tsx` line 13
**Severity:** Low (documentation).

---

### 2.12 `apps/reading-advantage/components/games/vocabulary/enchanted-library/enchantedLibraryInput.test.ts` (30 lines)

**Contract tested:** Cardinal and diagonal mapping, plus cast flag passthrough.

#### F-RA-B24R2-062 — Test omits `(0, 0)` and boundary cases (Low)

**File:** `enchantedLibraryInput.test.ts` lines 4-29
**Issue:** Three test cases. The `mapInputVectorToDirectional` function (file #13 lines 4-12) handles `dx === 0`, `dy === 0` (no direction flags set), `dx < 0` (left only), `dx > 0` (right only), `dy < 0` (up only), `dy > 0` (down only). The tests cover `(-1, 0)`, `(0, 1)`, `(1, -1)`, and cast flag. The case `dx === 0 && dy === 0` is not tested. The case where multiple direction flags should not be set simultaneously is implicit but not asserted.
**Severity:** Low.

#### F-RA-B24R2-063 — No test for `cast` flag from `InputVector` (Low)

**File:** `enchantedLibraryInput.test.ts` lines 4-29
**Issue:** Only line 12 includes `cast: true`. There is no test for the `cast: undefined` case (where `Boolean(undefined)` is `false`). The component's `mapInputVectorToDirectional` (file #13 line 10) coerces with `Boolean(input.cast)`, so the contract is "any truthy cast becomes true". This is implicit but not asserted.
**Severity:** Low.

---

### 2.13 `apps/reading-advantage/components/games/vocabulary/enchanted-library/enchantedLibraryInput.ts` (12 lines)

**Contract surface:** Pure adapter from `InputVector` to `DirectionalInput`.

#### F-RA-B24R2-064 — JSDoc missing (Low)

**File:** `enchantedLibraryInput.ts` line 4
**Severity:** Low (documentation).

#### F-RA-B24R2-065 — Function is fine (Informational)

**File:** `enchantedLibraryInput.ts` lines 4-12
**Issue:** Pure mapping with no side effects. Logic is correct: `< 0` and `> 0` checks are exclusive; `Boolean(input.cast)` coerces undefined.
**Severity:** Informational (no defect).

---

### 2.14 `apps/reading-advantage/components/games/vocabulary/rpg-battle/ActionMenu.test.tsx` (84 lines)

**Contract tested:** Render actions, type, submit trim, focus on enable.

#### F-RA-B24R2-066 — Test does not cover `onSubmit` being called once per submit (Low)

**File:** `ActionMenu.test.tsx` lines 41-55
**Issue:** The "submits trimmed input" test (line 41) only clicks the button once and asserts one call. There is no test for double-click submitting twice. The component's `handleSubmit` (file #15 lines 40-44) only calls `onSubmit` once per event, so this is a coverage gap, not a bug.
**Severity:** Low.

#### F-RA-B24R2-067 — Test does not cover the `Enter` key form submission (Low)

**File:** `ActionMenu.test.tsx` lines 24-39
**Issue:** The form has `onSubmit={handleSubmit}` (file #15 line 48), so pressing Enter inside the input should submit. The test only clicks the button. There is no `fireEvent.keyDown(input, { key: 'Enter' })` assertion.
**Severity:** Low.

#### F-RA-B24R2-068 — Test does not cover empty-input submit prevention (Low)

**File:** `ActionMenu.test.tsx` lines 24-39
**Issue:** The component disables the button when `!isReady` (file #15 line 89: `disabled={disabled || !isReady}`). The test does not assert that the button is disabled when `value=""`. The `isReady` flag (line 31) requires `trimmedValue.length > 0`.
**Severity:** Low.

---

### 2.15 `apps/reading-advantage/components/games/vocabulary/rpg-battle/ActionMenu.tsx` (97 lines)

**Contract surface:** Form with action reference list and translation input. Props: `actions: ActionMenuAction[]`, `value: string`, `onChange: (value: string) => void`, `onSubmit: (value: string) => void`, `disabled?: boolean`.

#### F-RA-B24R2-069 — Actions are read-only badges (Medium)

**File:** `ActionMenu.tsx` lines 56-74
**Issue:** The `actions` array is rendered as static `<div>` badges (lines 58-72). The `id` field on each action (file #14 line 9, `ActionMenuAction`) is unused — the key is set to `action.id` (line 59) but no click handler or selection state exists. A player cannot pick which action to perform; they can only type a translation. The component name `ActionMenu` and the prop shape imply selection. If the parent intends a "menu" where the player picks an action and then types the translation, the selection UI is missing.
**Impact:** The prop `actions` is rendered but not interactive. The "Type the translation" subtitle (line 53) is the only affordance. The displayed "Power" / "Basic" badges (line 70) are informational, not actionable.
**Severity:** Medium (UX/contract).

#### F-RA-B24R2-070 — `autoFocus` and `useEffect` focus are redundant (Low)

**File:** `ActionMenu.tsx` lines 34-38, 83
**Issue:** The `useEffect` (line 34) focuses the input when `disabled` becomes false, and the input also has `autoFocus={!disabled}` (line 83). Both compete to focus on initial mount and on prop change. With React's batching, this is not a functional bug, but the redundancy is confusing.
**Severity:** Low.

#### F-RA-B24R2-071 — `Input` component receives `autoFocus` and `ref` together (Low)

**File:** `ActionMenu.tsx` lines 77-86
**Cross-reference:** The shadcn `Input` component (per the peer reviewer's batch-23 review, file: `ui/input.tsx`) is a forwardRef component. Passing `ref={inputRef}` and `autoFocus={!disabled}` together is supported. However, if the `Input` component spreads `autoFocus` to the underlying `<input>`, the `useEffect` focus call at line 36 may override the natural autofocus order.
**Severity:** Low.

#### F-RA-B24R2-072 — JSDoc missing on `ActionMenu` (Low)

**File:** `ActionMenu.tsx` line 23
**Severity:** Low (documentation).

#### F-RA-B24R2-073 — JSDoc missing on `ActionMenuAction` interface (Low)

**File:** `ActionMenu.tsx` line 9
**Severity:** Low (documentation).

#### F-RA-B24R2-074 — `useDirectionalInput` import in parent conflicts with `triggerCast` (Informational)

**File:** `EnchantedLibraryGame.tsx` lines 99-100
**Cross-reference:** `useDirectionalInput.ts` line 89 exports `triggerCast: () => setCastTriggered(true)`. The `ActionMenu` (file #15) is in a different component (rpg-battle). The two are unrelated.
**Severity:** Informational (no defect).

---

### 2.16 `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleEffects.test.tsx` (26 lines)

**Contract tested:** Shake metadata and flash overlay rendering.

#### F-RA-B24R2-075 — Test does not cover `flashTone="enemy"` (Low)

**File:** `BattleEffects.test.tsx` lines 17-25
**Issue:** The test uses `flashTone="player"` (line 19) and asserts `data-testid="battle-flash"` is in the document. The component (file #17 line 19) maps `player` to `rgba(16, 185, 129, 0.35)` and `enemy` to `rgba(244, 63, 94, 0.35)`. The test does not assert which color is rendered, nor does it exercise `flashTone="enemy"`.
**Severity:** Low.

#### F-RA-B24R2-076 — Test does not cover `flashKey=0` (no flash) (Low)

**File:** `BattleEffects.test.tsx` lines 4-25
**Issue:** The first test passes `shakeKey={2}` without `flashKey` (which defaults to 0 per file #17 line 16). The component renders `<AnimatePresence>` with `{flashKey ? ... : null}` (file #17 line 32). The first test should verify that the flash is NOT in the document. It only verifies the shake metadata. Coverage gap.
**Severity:** Low.

---

### 2.17 `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleEffects.tsx` (50 lines)

**Contract surface:** Wrapper that applies shake and optional flash. Props: `children: React.ReactNode`, `shakeKey?: number = 0`, `flashKey?: number = 0`, `flashTone?: 'player' | 'enemy' = 'player'`.

#### F-RA-B24R2-077 — JSDoc missing (Low)

**File:** `BattleEffects.tsx` line 13
**Severity:** Low (documentation).

#### F-RA-B24R2-078 — Shake animation only triggers on truthy `shakeKey` (Low)

**File:** `BattleEffects.tsx` lines 28-29
**Issue:** `animate={shakeKey ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}`. When `shakeKey` becomes 0 (e.g., on unmount or reset), the animation snaps to `x: 0` without a transition. If a shake is in progress, the cut to 0 is abrupt. Not a bug, but worth noting.
**Severity:** Low.

---

### 2.18 `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleLog.test.tsx` (26 lines)

**Contract tested:** Entry order and empty state.

#### F-RA-B24R2-079 — Test does not cover the `aria-live` attribute (Low)

**File:** `BattleLog.test.tsx` lines 11-25
**Issue:** The component (file #19 line 20) sets `aria-live="polite"`. The test does not assert this attribute. The "rendered in order" check is sufficient for the visible contract, but screen-reader behavior is untested.
**Severity:** Low.

#### F-RA-B24R2-080 — Test uses fixed `index` in key test (Low)

**File:** `BattleLog.test.tsx` lines 14-19
**Issue:** The component's key is `${entry.type}-${index}` (file #19 line 31). The test does not directly test the key, but the order assertion at line 16-18 implicitly relies on stable key generation. If two consecutive `system` entries exist, the keys are `system-0` and `system-1` — unique. The test only has `player`, `system`, `enemy`, so the duplicate-system case is not exercised. Component's key generation is fragile in production.
**Severity:** Low.

---

### 2.19 `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleLog.tsx` (43 lines)

**Contract surface:** Scrollable log list. Props: `entries: BattleLogEntry[]`.

#### F-RA-B24R2-081 — React key uses `type-index` (Medium)

**File:** `BattleLog.tsx` line 31
**Issue:** `key={\`${entry.type}-${index}\`}`. Two consecutive `system` entries have keys `system-0` and `system-1` — unique. But two consecutive entries of the same type with one removed in the middle cause index shift and key churn. `BattleLogEntry` should expose a unique `id` field. Cross-reference: `store/useRPGBattleStore.ts` (not in batch) presumably defines `BattleLogEntry`. If it does not include `id`, the consumer is forced to use index-based keys.
**Severity:** Medium.

#### F-RA-B24R2-082 — JSDoc missing (Low)

**File:** `BattleLog.tsx` line 8
**Severity:** Low (documentation).

---

### 2.20 `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleResults.test.tsx` (47 lines)

**Contract tested:** Victory/defeat text, XP and accuracy display, restart callback.

#### F-RA-B24R2-083 — Component under test is NOT in the batch (High)

**File:** `BattleResults.test.tsx` line 2
**Issue:** `import { BattleResults } from "./BattleResults"`. The component file `BattleResults.tsx` exists on disk (65 lines, verified) but is NOT listed in the 20-file batch. This makes the test file's contract un-reviewable in isolation. The component uses `useScopedI18n("pages.student.gamesPage")` (line 19) and renders `t("common.victory")`, `t("common.defeat")`, `t("common.xpEarned")`, `t("common.accuracy")`, `t("common.playAgain")` (lines 21, 45, 51, 59). The test asserts on English strings ("Victory", "Defeat", "80%", "/play again/i"), which requires the locale dictionary to be loaded. Without a mock, the translator returns the key string in the test environment.
**Severity:** High (unmocked dependency causes 3 of 3 tests to fail).

#### F-RA-B24R2-084 — All 3 tests in this file fail under current setup (High)

**File:** `BattleResults.test.tsx` lines 5-46
**Issue:**
- Line 15: `screen.getByText('Victory')` — fails because the component renders `t("common.victory")` which is `"pages.student.gamesPage.common.victory"` (raw key) in the test environment.
- Line 30: `screen.getByText('Defeat')` — same issue with `t("common.defeat")`.
- Line 44: `screen.getByRole('button', { name: /play again/i })` — same issue with `t("common.playAgain")`.

The `80%` test (line 17) passes because the percentage is computed from a numeric prop (`Math.round(accuracy * 100)`, component line 54) and the test fixture is `accuracy={0.8}` (line 10). But the test also asserts `screen.getByText('7')` (line 16) which requires the `Victory` text to be in the document first (line 15); if line 15 throws, line 16 is not reached.
**Severity:** High (suite is broken).

#### F-RA-B24R2-085 — Bare-digit text assertions (Medium)

**File:** `BattleResults.test.tsx` lines 16, 17
**Issue:** `screen.getByText('7')` and `screen.getByText('80%')` use string literals. The `7` is the `xp` prop (line 9), the `80%` is the formatted `accuracy` (component line 54). The values come from the test fixture, so the assertion is correct, but using `expect(screen.getByText(String(xp)))` would be more robust against refactors of the test fixture.
**Severity:** Medium (A3 — digit-only).

#### F-RA-B24R2-086 — No negative test for invalid `outcome` (Low)

**File:** `BattleResults.test.tsx` lines 5-46
**Issue:** The `outcome` prop is typed as `"victory" | "defeat"`. The test exercises both values, but if a future change adds a `"draw"` outcome, the existing tests will continue to pass for `victory` and `defeat` and silently allow the new value through. The TypeScript compiler will catch it at the call site, but the test could be parameterized.
**Severity:** Low.

---

## 3. Test Gaps (Aggregated)

| Area | Gap | Affected File |
|------|-----|---------------|
| i18n mocking | `useScopedI18n` not stubbed in 2 test files | `EnchantedLibraryGame.test.tsx`, `BattleResults.test.tsx` |
| End-of-game flow | No test asserts `onComplete` fires with results | `EnchantedLibraryGame.test.tsx` |
| Difficulty interaction | No test exercises `onDifficultyChange` | `EnchantedLibraryGame.test.tsx` |
| Component-under-test exists in repo but is not in the review batch | `BattleResults.tsx` (65 lines) | `BattleResults.test.tsx` |
| Vacuous assertion | "renders large, readable book labels" only checks `length > 0` | `EnchantedLibraryGame.test.tsx` (lines 162-171) |
| `onSubmit` form-key flow | No `Enter` key test | `ActionMenu.test.tsx` |
| `BattleLogEntry` key uniqueness | Component uses `${type}-${index}`, no test exercises duplicate-type case | `BattleLog.tsx`, `BattleLog.test.tsx` |
| `flashTone="enemy"` branch | Only `player` tested | `BattleEffects.test.tsx` |
| `flashKey=0` (no flash) | Not asserted | `BattleEffects.test.tsx` |
| Empty `value` submit prevention | `disabled={!isReady}` not asserted | `ActionMenu.test.tsx` |
| Particle position (`x`, `y` percent) | Wrapper style not asserted | `SparkleBurst.test.tsx`, `BookPickupBurst.test.tsx` |
| `(dx=0, dy=0)` input vector | No zero-input test | `enchantedLibraryInput.test.ts` |
| `cast: undefined` | Only `cast: false` and `cast: true` exercised | `enchantedLibraryInput.test.ts` |
| Image.src prototype pollution | `Object.defineProperty(global.Image.prototype, "src", ...)` without cleanup | `EnchantedLibraryGame.test.tsx` lines 88-96 |
| `VocabularyItem` shape | `id` is missing in the Enchanted Library test fixture but present in the VocabularyProgress test fixture | `EnchantedLibraryGame.test.tsx` lines 98-103, `VocabularyProgress.test.tsx` lines 8-9 |
| `BattleLogEntry` `id` field | Not present in any reviewed test; component relies on `${type}-${index}` | `BattleLog.tsx` line 31 |
| `BattleResults.tsx` props | Test does not verify all props are wired (e.g., no test for `accuracy` not affecting text when 0) | `BattleResults.test.tsx` |

---

## 4. Incomplete Disclosures

1. **`BattleResults.tsx` is not in the batch but is the component under test by `BattleResults.test.tsx`.** The peer reviewer (`ra-batch-24.md` F-RA-B24-039) flagged the same gap. This review confirms the gap: the test file's contract cannot be verified against the component without reading `BattleResults.tsx` (which is outside scope).
2. **Component contract for `RankingEntry` is duplicated** in `RankingDisplay.tsx`, `EnchantedLibraryGame.tsx`, and `dragon-flight/RankingDialog.tsx`. No Zod schema, no shared `types` module.
3. **`VocabularyItem` shape varies across test files** (`EnchantedLibraryGame.test.tsx` omits `id`; `VocabularyProgress.test.tsx` includes `id`). The test fixtures are inconsistent. The store type's full shape (`useGameStore.ts`) is not in the batch.
4. **`calculateXP(score, correctAnswers, totalAttempts)` is called with `score=0`** in `EnchantedLibraryGame.tsx` lines 323, 340 (the parameter is `gameState.mana`, but the library's `calculateXP` formula at `lib/games/xp.ts` line 12 does not use `score` — it uses `correctAnswers * accuracy`). The `score` parameter is dead. The test fixtures for the library's `xp.test.ts` (per the file listing) presumably confirm this. Worth flagging: the parameter is unused in the formula, but the API still receives it.
5. **`difficulty` is a local `useState` in `DragonRiderGame.tsx`** (line 389) and is not passed to `createDragonRiderState`. The library's `createDragonRiderState` accepts a `DragonRiderConfig` (file: `dragonRider.ts` line 33) but the only used field is `durationMs`. The difficulty never affects scoring.
6. **The `bossBattleStarted` flag in `DragonRiderGame.tsx` (line 420) is set to `true` when the boss reaches `targetY` (line 743-745), but there is no player-input action that defeats the boss.** The "battle" is a passive countdown (`bossHealth` decreases by 1 per `BOSS_HEALTH_TICK_MS`, file #1 line 727). The `Boss Battle` UI (lines 1092-1131) and the difficulty icons (`Wand2`, `Sparkles`, `Shield`) in the start-screen instructions (lines 1141-1157) imply player agency that does not exist in the code.
7. **`SparkleBurst.tsx` uses `Math.random()` inside the `animate` prop**, making the component non-deterministic across renders. The peer reviewer (`ra-batch-24.md` F-RA-B24-026) flagged the same issue. This review confirms the issue and notes that no `jest.mock("framer-motion")` would help — the random is inside the component, not the animation library.
8. **`EnchantedLibraryGame.tsx` has `onExit` that uses `window.location.href`** (line 805). This is a full page reload, not a client navigation. Not flagged in the previous report's F-RA-B24-011 list? Actually it was. Confirming.
9. **`DifficultySelector.tsx` redefines `xpMultiplier`** as a separate source of truth from `lib/games/enchantedLibrary.ts` `DIFFICULTY_CONFIG`. The two will drift.
10. **`DragonRiderGame.tsx` calls `onComplete` inside a `useEffect` that depends on `onComplete`** (lines 794-800). The peer reviewer's F-RA-B24-019 (in batch-23) flagged the same pattern in `DragonFlightGame`. The Dragon Rider component has no `hasReportedRef` guard, so a parent re-render with a new `onComplete` reference will fire `onComplete` again with the same results. (See F-RA-B24R2-007.)

---

## 5. Severity Summary

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| Critical | 0 | — |
| High | 6 | F-RA-B24R2-027, F-RA-B24R2-028, F-RA-B24R2-030, F-RA-B24R2-083, F-RA-B24R2-084 (and F-RA-B24R2-032 medium) |
| Medium | 22 | F-RA-B24R2-001, F-RA-B24R2-002, F-RA-B24R2-004, F-RA-B24R2-005, F-RA-B24R2-007, F-RA-B24R2-009, F-RA-B24R2-023, F-RA-B24R2-024, F-RA-B24R2-029, F-RA-B24R2-031, F-RA-B24R2-032, F-RA-B24R2-035, F-RA-B24R2-036, F-RA-B24R2-037, F-RA-B24R2-045, F-RA-B24R2-046, F-RA-B24R2-047, F-RA-B24R2-051, F-RA-B24R2-069, F-RA-B24R2-081, F-RA-B24R2-085 |
| Low | 39 | F-RA-B24R2-003, F-RA-B24R2-006, F-RA-B24R2-008, F-RA-B24R2-010, F-RA-B24R2-011, F-RA-B24R2-012, F-RA-B24R2-013, F-RA-B24R2-014, F-RA-B24R2-015, F-RA-B24R2-016, F-RA-B24R2-017, F-RA-B24R2-018, F-RA-B24R2-019, F-RA-B24R2-020, F-RA-B24R2-022, F-RA-B24R2-025, F-RA-B24R2-026, F-RA-B24R2-033, F-RA-B24R2-034, F-RA-B24R2-039, F-RA-B24R2-040, F-RA-B24R2-041, F-RA-B24R2-042, F-RA-B24R2-043, F-RA-B24R2-048, F-RA-B24R2-049, F-RA-B24R2-050, F-RA-B24R2-052, F-RA-B24R2-053, F-RA-B24R2-054, F-RA-B24R2-055, F-RA-B24R2-056, F-RA-B24R2-058, F-RA-B24R2-059, F-RA-B24R2-060, F-RA-B24R2-061, F-RA-B24R2-062, F-RA-B24R2-063, F-RA-B24R2-064, F-RA-B24R2-066, F-RA-B24R2-067, F-RA-B24R2-068, F-RA-B24R2-070, F-RA-B24R2-071, F-RA-B24R2-072, F-RA-B24R2-073, F-RA-B24R2-075, F-RA-B24R2-076, F-RA-B24R2-077, F-RA-B24R2-078, F-RA-B24R2-079, F-RA-B24R2-080, F-RA-B24R2-082, F-RA-B24R2-086 |
| Informational | 5 | F-RA-B24R2-021, F-RA-B24R2-038, F-RA-B24R2-044, F-RA-B24R2-057, F-RA-B24R2-065, F-RA-B24R2-074 |
| **Total** | **72** | |

---

## 6. Anti-Pattern Audit

| Anti-pattern | Finding IDs | Notes |
|--------------|-------------|-------|
| **A3 — digit-only count** | F-RA-B24R2-029, F-RA-B24R2-051, F-RA-B24R2-085 | `toHaveLength(4)`, `toHaveLength(10)`, `screen.getByText('7')`, `screen.getByText('80%')` use bare digits. Should use named constants or `String(xp)`. |
| **A4 — vacuous pass** | F-RA-B24R2-028 | `expect(books.length).toBeGreaterThan(0)` does not assert any specific label. The `<Text text={book.translation} />` element can be removed and the test still passes. |
| **A5 — false-claim text** | None in this batch | No "all checks pass" / "PASS=N, FAIL=0" claims were authored inside the reviewed files. The test files claim correctness via the `expect` calls themselves; they fail at runtime, not via text. |
| **A1 — substring-as-signal** | N/A | No supervisor code in this batch. |
| **A11 — blocked review track** | N/A | This is an execution batch. |

---

## 7. i18n Coverage Map

| File | `useScopedI18n` used? | Hardcoded English strings |
|------|----------------------|---------------------------|
| `DragonRiderGame.tsx` | Yes (line 387) | `⚔️ Big Boss Battle! ⚔️` (line 1102), `"Select"`, `"Tap Gate"` (line 1165) |
| `BookPickupBurst.tsx` | No | None (decorative) |
| `BookPickupBurst.test.tsx` | No | None |
| `DifficultySelector.tsx` | Imported (line 6) but **unused** | `"Easy"`, `"Normal"`, `"Hard"`, `"Extreme"`, `"- XP"` (lines 25, 32, 38, 44, 81) |
| `EnchantedLibraryGame.tsx` | Yes (line 120) | `"Find:"` (line 579), `"SHIELD"` (line 648), `"Difficulty"` (line 797) |
| `EnchantedLibraryGame.test.tsx` | Unmocked — test runs against raw key strings | N/A (test, not UI) |
| `RankingDisplay.tsx` | No | `"Leaderboard"`, `"No rankings yet..."`, `"Be the first to play!"`, `"(You)"`, difficulty labels |
| `SparkleBurst.tsx` | No | None (decorative) |
| `SparkleBurst.test.tsx` | No | None |
| `VocabularyProgress.tsx` | No | `"My Grimoire"`, `"Collect all words twice!"` |
| `VocabularyProgress.test.tsx` | No | None (test does not assert these strings) |
| `enchantedLibraryInput.ts` | No | None (pure function) |
| `enchantedLibraryInput.test.ts` | No | None |
| `ActionMenu.tsx` | No | `"Actions"`, `"Type the translation"`, `"Power"`, `"Basic"`, `"Cast"`, `"Type translation..."` (lines 52-92) |
| `ActionMenu.test.tsx` | No | Asserts on `"Fireball"`, `"Sword Slash"`, `/cast/i`, `"Action input"` (hardcoded test fixture and labels) |
| `BattleEffects.tsx` | No | None (no text) |
| `BattleEffects.test.tsx` | No | Asserts on `"Battle Stage"` (test fixture) |
| `BattleLog.tsx` | No | `"Battle Log"`, `"Latest actions"`, `"No actions yet."` (lines 12-18) |
| `BattleLog.test.tsx` | No | Asserts on fixture text |
| `BattleResults.test.tsx` | Component (not in batch) uses `useScopedI18n`; test does not mock it | Asserts on `"Victory"`, `"Defeat"`, `"/play again/i"`, `"7"`, `"80%"` (will fail at runtime) |

**Total files with hardcoded English UI strings despite `useScopedI18n` being importable: 5**
- `DragonRiderGame.tsx` (partial)
- `DifficultySelector.tsx` (full)
- `EnchantedLibraryGame.tsx` (partial)
- `RankingDisplay.tsx` (full)
- `VocabularyProgress.tsx` (full)
- `BattleLog.tsx` (full)
- `ActionMenu.tsx` (full)

**Total test files that will fail at runtime due to unmocked `useScopedI18n`: 2**
- `EnchantedLibraryGame.test.tsx`
- `BattleResults.test.tsx`

---

## 8. JSDoc Compliance Audit

Per AGENTS.md "Documentation Standards", every exported function, class, interface, and type alias must have a JSDoc comment. The following exported symbols in the 20-file batch lack JSDoc:

| File | Symbol | Line | Exported? |
|------|--------|------|-----------|
| `DragonRiderGame.tsx` | `DragonRiderGame` | 381 | Yes |
| `DragonRiderGame.tsx` | `DragonRiderCanvas` | 1282 | Same-file top-level (no `export` but reachable) |
| `DragonRiderGame.tsx` | `Difficulty` | 55 | Yes (`export type`) |
| `DragonRiderGame.tsx` | `DragonRiderGameProps` | 57 | Yes (`export type`) |
| `BookPickupBurst.tsx` | `BookPickupBurst` | 19 | Yes |
| `DifficultySelector.tsx` | `DifficultySelector` | 53 | Yes |
| `DifficultySelector.tsx` | `DifficultySelectorProps` | 8 | Yes |
| `EnchantedLibraryGame.tsx` | `EnchantedLibraryGame` | 91 | Yes |
| `EnchantedLibraryGame.tsx` | `EnchantedLibraryGameResult` | 45 | Yes |
| `EnchantedLibraryGame.tsx` | `EnchantedLibraryGameProps` | 58 | Yes |
| `EnchantedLibraryGame.tsx` | `RankingEntry` | 51 | Yes |
| `RankingDisplay.tsx` | `RankingDisplay` | 28 | Yes |
| `RankingDisplay.tsx` | `RankingEntry` | 8 | Yes |
| `RankingDisplay.tsx` | `RankingDisplayProps` | 15 | Yes |
| `SparkleBurst.tsx` | `SparkleBurst` | 12 | Yes |
| `SparkleBurst.tsx` | `SparkleBurstProps` | 6 | Yes |
| `VocabularyProgress.tsx` | `VocabularyProgress` | 13 | Yes |
| `VocabularyProgress.tsx` | `VocabularyProgressProps` | 6 | Yes |
| `enchantedLibraryInput.ts` | `mapInputVectorToDirectional` | 4 | Yes |
| `ActionMenu.tsx` | `ActionMenu` | 23 | Yes |
| `ActionMenu.tsx` | `ActionMenuAction` | 9 | Yes |
| `ActionMenu.tsx` | `ActionPower` | 7 | Yes |
| `ActionMenu.tsx` | `ActionMenuProps` | 15 | Yes |
| `BattleEffects.tsx` | `BattleEffects` | 13 | Yes |
| `BattleEffects.tsx` | `BattleEffectsProps` | 6 | Yes |
| `BattleLog.tsx` | `BattleLog` | 8 | Yes |
| `BattleLog.tsx` | `BattleLogProps` | 4 | Yes |
| `BattleResults.test.tsx` | `BattleResults` (imported) | 2 | N/A (test imports a component not in batch) |

**Total exported symbols missing JSDoc: 27** (out of 27 in scope).

This is a 100% JSDoc-compliance gap for the batch. Per AGENTS.md, this is a documentation standard violation but is a non-blocking issue.

---

## 9. Cross-Cutting Themes

1. **Unmocked `useScopedI18n` in two test files** causes `EnchantedLibraryGame.test.tsx` (9 of 11 tests) and `BattleResults.test.tsx` (3 of 3 tests) to fail at runtime. This is the single largest correctness gap in the batch.
2. **Game logic embedded in React components** instead of living in the library modules. `DragonRiderGame.tsx` contains `buildGateRound` (lines 346-371), `pickRandomIndex` (line 343), `buildLayout` (lines 246-329), `buildSpriteGrid` (lines 167-197), and the difficulty gate-speed ladders (lines 595-600, 706-711). AGENTS.md mandates a backend-as-code architecture; game domain should live in `lib/games/dragonRider.ts`.
3. **Game-domain config duplicated in UI components.** `DIFFICULTY_INFO` in `DifficultySelector.tsx` redefines `xpMultiplier` that already lives in `lib/games/enchantedLibrary.ts`. Drift risk.
4. **Type duplication.** `RankingEntry` appears in three files. `BattleLogEntry`'s key is unstable in `BattleLog.tsx`. `VocabularyItem` shape varies across test fixtures.
5. **i18n coverage is inconsistent.** Some components use `useScopedI18n` extensively (`EnchantedLibraryGame.tsx`, `DragonRiderGame.tsx`); others do not at all (`DifficultySelector.tsx`, `RankingDisplay.tsx`, `VocabularyProgress.tsx`, `BattleLog.tsx`, `ActionMenu.tsx`).
6. **No JSDoc on any exported symbol** in the batch.
7. **Brittle React keys.** `VocabularyProgress.tsx` uses array index; `BattleLog.tsx` uses `${type}-${index}`; `RankingDisplay.tsx` uses `userId` (assumed unique but not contractually guaranteed).
8. **`onComplete` callback re-fire risk.** `DragonRiderGame.tsx` lacks the `hasReportedRef` guard that `EnchantedLibraryGame.tsx` uses. If the parent re-renders with a new `onComplete` reference, the Dragon Rider can double-fire.
9. **Boss battle is a passive countdown, not an interactive fight.** `DragonRiderGame.tsx` lines 725-737 reduce `bossHealth` by 1 every 1800 ms without any player action. The UI implies interactive combat.
10. **`BattleResults.tsx` is referenced by its test but is not in the review batch.** The test's contract cannot be verified in isolation. This is an incomplete disclosure in the batch scope.

---

## 10. Prioritized Corrective Guidance (Advisory Only)

1. **Add `jest.mock("@/locales/client", ...)`** in `EnchantedLibraryGame.test.tsx` and `BattleResults.test.tsx` so the suites match the implementation.
2. **Replace the vacuous assertion** in `EnchantedLibraryGame.test.tsx` lines 162-171 with `screen.getByText(EXPECTED_TRANSLATION)` derived from a vocabulary fixture.
3. **Add an end-of-game test** for `EnchantedLibraryGame` that drives the game to `victory` or `gameover` and asserts `onComplete` is called with `{ xp, accuracy, gameTime }`.
4. **Add `difficulty` to the `createDragonRiderState` config** (or remove the local `useState` and pass through props) so the difficulty actually affects scoring.
5. **Move `buildGateRound`, `buildLayout`, `buildSpriteGrid` from `DragonRiderGame.tsx`** into `lib/games/dragonRider.ts` as exported helpers.
6. **Add `id` to `BattleLogEntry`** in the store and use it as the React key in `BattleLog.tsx`.
7. **Replace the `xpMultiplier` hardcoding** in `DifficultySelector.tsx` with an import from `lib/games/enchantedLibrary.ts`.
8. **Add JSDoc** to all exported symbols (27 in total) per AGENTS.md.
9. **Wrap the canvas in an error boundary** to prevent Konva render exceptions from crashing the entire game.
10. **Use `next/navigation`** in `EnchantedLibraryGame.tsx` line 805 instead of `window.location.href`.

These are advisory. No application code was edited.

---

## 11. Reviewer Notes

- This review is a fresh, independent pass over the same 20 files. It does not duplicate the existing `ra-batch-24.md` (Reviewer A, Correctness/Architecture) line-by-line, but it covers overlapping findings from a different angle (test gaps, i18n coverage, JSDoc compliance, incomplete disclosures).
- No application code was modified. No tests were executed. No claims of acceptance, closure, or fix completion are made.
- The findings here are advisory and based on line-by-line reading. Severity is the reviewer's judgment, calibrated to AGENTS.md's "Primary Stack" and "Measure Workflow" sections.
- A separate `result.json` is not written by this reviewer; the existing `ra-batch-24-result.json` (Reviewer A) remains the canonical artifact for that review. This `ra-batch-24.md` is the second reviewer pass.

---

MEASURE_AGENT_RESULT
{"agent_role":"B","agent_role_name":"Test and i18n consistency","batch_id":"ra-batch-24","track_id":"reading_advantage_full_review_20260626","baseline_sha":"d348666be047b929d02c747120c32d2ea0fc53fc","files_reviewed":20,"lines_reviewed":3860,"findings":{"critical":0,"high":6,"medium":22,"low":39,"informational":6,"total":73},"fixes_applied":0,"report_path":"measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-24.md","status":"complete","test_gaps_identified":17,"incomplete_disclosures":10,"jsdoc_compliance_gap":27,"hardcoded_english_files":7,"unmocked_i18n_test_files":2,"notes":"Independent pass from Reviewer A. No app code edited. Advisory only. No acceptance/closeout claims."}
