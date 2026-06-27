# Line-by-Line Review — games-batch-27

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-27`
**Scope source:** `/tmp/opencode/games-batch-27` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch mixes two shared screen components (`game/ResultsScreen`, `game/StartScreen`) with five sentence-game React-Konva components (Abyssal Well, Castle Defense, Devourer Slime, Dungeon Liberator, Griffin Rider's Escape) plus the Griffin Sky-Joust test, their co-located Jest test files, and three barrel `index.ts` re-exports. To assess scoring/XP/difficulty findings, the supporting `src/lib/games/*` modules (`abyssalWellConfig.ts`, etc.) and the two `basePath`/`VirtualDPad` path variants were read-only inspected; findings remain anchored to this batch's deliverables.
**Finding ID scheme:** `F-GAMES-B27-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `game/ResultsScreen.test.tsx` | test | 2 tests; i18n NOT mocked |
| 2 | `game/ResultsScreen.tsx` | component | shared results screen, i18n-driven |
| 3 | `game/StartScreen.test.tsx` | test | 2 tests; i18n NOT mocked |
| 4 | `game/StartScreen.tsx` | component | "Magic Defense" themed start screen |
| 5 | `sentence/abyssal-well/AbyssalWellGame.test.tsx` | test | 12 tests, heavy mock; no end-state assertion |
| 6 | `sentence/abyssal-well/AbyssalWellGame.tsx` | game | rAF loop, hardcoded English strings |
| 7 | `sentence/abyssal-well/index.ts` | barrel | re-export only |
| 8 | `sentence/castle-defense/BackgroundLayer.test.tsx` | test | 4 tests, MockImage |
| 9 | `sentence/castle-defense/BackgroundLayer.tsx` | component | tile renderer, image preload |
| 10 | `sentence/castle-defense/CastleDefenseGame.test.tsx` | test | 11 tests, fake timers |
| 11 | `sentence/castle-defense/CastleDefenseGame.tsx` | game | i18n, camera, rAF, sprite sheets |
| 12 | `sentence/castle-defense/index.ts` | barrel | re-export only |
| 13 | `sentence/devourer-slime/DevourerSlimeGame.test.tsx` | test | 6 tests, hardcoded strings |
| 14 | `sentence/devourer-slime/DevourerSlimeGame.tsx` | game | useInterval loop, bespoke d-pad |
| 15 | `sentence/dungeon-liberator/DungeonLiberatorGame.test.tsx` | test | 7 tests, fake timers |
| 16 | `sentence/dungeon-liberator/DungeonLiberatorGame.tsx` | game | multi-level, rAF, `window.location.href` |
| 17 | `sentence/dungeon-liberator/index.ts` | barrel | re-export + type |
| 18 | `sentence/griffin-riders-escape/GriffinRidersEscapeGame.test.tsx` | test | 8 tests |
| 19 | `sentence/griffin-riders-escape/GriffinRidersEscapeGame.tsx` | game | pseudo-3D projection, `Math.random` in render |
| 20 | `sentence/griffin-sky-joust/GriffinSkyJoustGame.test.tsx` | test | 10 tests; source NOT in batch |

---

## Cross-File Observations (read-only)

- **Two divergent shared component families coexist.** Files 2 & 4 (`game/ResultsScreen`, `game/StartScreen`) are an *older* shared-screen pattern (shadcn `Card`, `useScopedI18n("pages.student.gamesPage")`, props `score/accuracy/xp/missedWords/onRestart/onShowRanking`). The five sentence games instead use `GameStartScreen` / `GameEndScreen` from `@/components/games/game/` (different prop surface: `gameTitle`, `instructions`, `controls`, `customStats`, `gameId`, `showLeaderboardLink`). The two families are not interchangeable and represent parallel runtimes. See F-GAMES-B27-001.
- **Two different `basePath` modules.** Castle Defense imports `withBasePath` from `@/lib/games/basePath` (file 11 line 33); Dungeon Liberator imports from `@/lib/basePath` (file 16 line 27). Both exist on disk. Their test mocks differ accordingly (file 10 line 6 mocks `@/lib/games/basePath`; file 15 line 6 mocks `@/lib/basePath`). Duplicate utility, drift risk.
- **Two different `VirtualDPad` components.** Castle Defense imports `@/components/games/ui/VirtualDPad` (file 11 line 29); Dungeon Liberator imports `@/components/ui/VirtualDPad` (file 16 line 23). Both files exist. Devourer Slime (file 14) hand-rolls a *third* bespoke d-pad inline (lines 354-392). Three distinct on-screen control implementations in one batch.
- **Inconsistent onComplete result contracts.** Abyssal Well returns `{xp, accuracy}` (file 6 line 25-28); Castle Defense returns `{xp, accuracy, difficulty}` (file 11 line 76-80); Devourer Slime returns the entire `SlimeState` (file 14 line 30); Dungeon Liberator returns `{xp, accuracy, difficulty}` (file 16 line 44-48); Griffin Rider's returns `{accuracy, xp}` (file 19 line 26). No shared result type. See F-GAMES-B27-002.
- **Three different fixed game heights / orientations.** Devourer Slime uses `h-screen` + fixed `390×844` viewport (file 14 lines 24-25, 192). Abyssal Well/Dungeon Liberator/Castle Defense use `h-[75vh]` / `h-[60vh]` / `h-[calc(100svh-8rem)]` rounded cards. Griffin Rider's uses `h-[70vh] min-h-[600px]`. No shared sizing contract.

---

## Shared Component Findings (files 2, 4)

### F-GAMES-B27-001 · Medium · Two parallel start/results screen systems — files 2, 4 vs. all games
`ResultsScreen.tsx` and `StartScreen.tsx` use the legacy `pages.student.gamesPage` shadcn-card pattern with props (`onShowRanking`, `missedWords`) that none of the five sentence games in this batch consume — those use `GameStartScreen`/`GameEndScreen`. `StartScreen.tsx:76` even hardcodes the literal `"Magic Defense"` brand. These two files appear to belong to a different game ("magicDefense" namespace at `StartScreen.tsx:39-57,81-98,127-130,174-182,217`) and are not the shared runtime for this batch's sentence games. Importability into Reading/Primary is ambiguous: the duplicate start/result systems must be reconciled before a single import path exists.

### F-GAMES-B27-002 · Medium · No shared `onComplete`/result contract across games — files 6, 11, 14, 16, 19
Each game emits a structurally different completion payload (see Cross-File Observations). Reading/Primary integration needs a single typed completion contract (xp, accuracy, score, difficulty, gameId) to persist progress. Today each game would require bespoke adapter glue. The shared `ResultsScreen` (file 2) expects `{score, accuracy, xp, missedWords}` — yet another shape. This blocks clean importability and consistent XP/progress recording.

### F-GAMES-B27-003 · Medium · `StartScreen` 500 ms artificial delay with no cancel/cleanup — file 4 lines 63-68
`handleStart` sets `isLoading` then calls `onStart` inside a bare `setTimeout(…, 500)` with no stored handle and no cleanup on unmount. If the component unmounts during the delay (navigation, parent state change) `onStart` still fires → potential "setState on unmounted component" / starting a game that was dismissed. The test (file 3 lines 38) only passes because it `waitFor`s the callback. The delay also adds half a second of latency to every game start with no loading work happening.

### F-GAMES-B27-004 · Low · `ResultsScreen` missed-word dedup via `JSON.stringify` round-trip — file 2 lines 27-31
Deduplication uses `Array.from(new Set(missedWords.map(JSON.stringify))).map(JSON.parse)`. Key order sensitivity makes this fragile (two equal items with differing property insertion order won't dedup), and the parse re-creates objects, discarding referential identity. A keyed dedup on `term` would be clearer and correct. Low impact (cosmetic list) but a latent correctness smell.

### F-GAMES-B27-005 · Low · `ResultsScreen` list uses array index as React key — file 2 line 79
`key={i}` on the missed-words map. Acceptable for a static post-game list but inconsistent with the keyed patterns used elsewhere; if the list ever animates/reorders it will mis-reconcile.

### F-GAMES-B27-006 · Low · `StartScreen` accessibility gaps — file 4
Difficulty `<button>`s (lines 143-165) and the start `<button>` (lines 210-220) have no `aria-pressed`/`aria-label`; the decorative spinning rings (lines 115-116) animate unconditionally with no `prefers-reduced-motion` guard, unlike the game components which thread `useAccessibilitySettings`. `StartScreen` does not consume accessibility settings at all (no text-size scaling), diverging from the sentence games.

---

## Game Component Findings

### F-GAMES-B27-007 · High · Hardcoded English UI strings in three games — files 6, 14, 19
Abyssal Well (file 6 lines 226-239, 250, 262, 455-457), Devourer Slime (file 14 lines 138-152, 196, 223, 226), and Griffin Rider's Escape (file 19 lines 280, 286, 302-313) embed user-facing English literals directly in JSX/Konva `Text` (titles, instructions, "Score", "Translate", "Translation", "Size:", control hints). Castle Defense (file 11) correctly routes everything through `useScopedI18n("…castleDefense")`. The platform is multilingual (translations are Thai/French in test fixtures), so the un-i18n'd games will not localize. This blocks Reading/Primary import where localization is expected, and is inconsistent within the same batch.

### F-GAMES-B27-008 · High · `Math.random()` called during render (non-deterministic, breaks memo/SSR) — file 19 lines 214-215
Griffin Rider's Escape computes the Konva `<Stage>` `x`/`y` from `(Math.random() - 0.5) * shake` *inside the render body*. This makes every render visually jitter even when `shake===0` only avoids it by multiplying by 0; but for `shake>0` the value changes each render unpredictably and is not driven by the rAF loop, defeating React's render purity. It also produces hydration mismatches if ever server-rendered. Screen-shake should be state/ref-driven and applied in the animation loop, not sampled in render.

### F-GAMES-B27-009 · High · `setTimeout`-driven flash side effects inside `setGameState` updater — file 19 lines 85-103
The game loop calls `setShake`, `setFlash`, `playSound`, and `setTimeout(() => setFlash(null), 150)` *inside* the `setGameState(prev => …)` updater. React state updater functions must be pure; triggering other setState calls and timers from within is a documented anti-pattern (can double-fire under StrictMode/concurrent rendering, and the timers are never cleared on unmount → setState-after-unmount). Castle Defense exhibits the same class of nested-setState-in-updater pattern (file 11 lines 308, 315-316, 320-322 call `setCamera`/`setPlayerFrame`/`setBuildEffects` inside the `setGameState` updater).

### F-GAMES-B27-010 · High · Hard navigation `window.location.href = '/'` on exit — file 16 lines 619-621
Dungeon Liberator's `onExit` does `window.location.href = '/'`. A full-page navigation to root is wrong for an embeddable game component and is fatal for Reading/Primary import (it would yank the student out of the host app to the host root). Navigation must be delegated to a host-supplied callback/router, not a hardcoded location assignment.

### F-GAMES-B27-011 · Medium · Difficulty has no effect on scoring/XP and limited gameplay effect — files 6, 16, 19
Abyssal Well difficulty only changes `wordCount` (`abyssalWellConfig.ts:36-40`) — it does not scale enemy speed, spawn rate, or XP; `calculateXP` (file 6 lines 140-146) takes no difficulty parameter. Griffin Rider's hardcodes `selectedDifficulty='normal'` with **no setter** (file 19 line 37) — the difficulty state is immutable dead code and no selector is rendered. Dungeon Liberator/Castle Defense pass `difficulty` into XP results but the XP formula (`calculateDungeonLiberatorXP`, `calculateCastleDefenseXP`) was not in this batch to confirm a multiplier. Net: difficulty selectors are largely cosmetic for scoring, consistent with prior-batch findings (cf. B23-006).

### F-GAMES-B27-012 · Medium · `onComplete` can fire twice / inconsistent guard patterns — files 11, 19
Castle Defense calls `onCompleteRef.current(...)` inside the rAF `setGameState` updater (file 11 lines 326-342) with **no `hasReported` guard** — once `status` becomes `gameover`/`victory`, the updater can run on subsequent frames before the loop's `gameState.status` dependency tears down, firing `onComplete` multiple times and calling `exitFullscreen()` repeatedly. Abyssal Well and Dungeon Liberator correctly use a `hasReportedRef` guard (file 6 lines 43,154-157; file 16 lines 61,225-228). Griffin Rider's fires `onComplete` from an effect keyed on `[gamePhase, gameState, onComplete]` (file 19 lines 158-170) — since `gameState` changes every frame while ended state lingers, this can also re-fire. Inconsistent and a double-XP-award risk.

### F-GAMES-B27-013 · Medium · `startGame(gameState!)` non-null assertion races with async reset — file 6 lines 241-246
Abyssal Well's start handler calls `resetGame()` (which `setGameState(...)` asynchronously) then immediately `startGame(gameState!)` using the *stale* `gameState` from the current render closure, not the freshly reset state. The `!` assertion will throw if `gameState` is null (e.g. empty `sentences`). The freshly-reset state is discarded; the started state derives from the prior state. Works in practice only because an earlier effect (lines 62-66) already populated `gameState`, masking the race.

### F-GAMES-B27-014 · Medium · Konva `Stage` rendered at fixed logical size while overlays use viewport units — files 6, 14
Abyssal Well sets `Stage width/height` to fixed config `gameWidth/gameHeight` (390×700) with a `scale` (file 6 lines 312-316), but the container is `h-[75vh]`. On wide/desktop or short screens the canvas letterboxes inconsistently with the absolutely-positioned HTML control hints (lines 455-458). Devourer Slime hardcodes `Stage` to `390×844` (file 14 line 247) regardless of device — on any viewport not exactly 390×844 the canvas will not fill or will clip, and the HUD (absolute `top-36`, `bottom-10`) is positioned for a single phone size. Mobile/browser compatibility is fragile outside the reference device.

### F-GAMES-B27-015 · Medium · BackgroundLayer assumes rectangular non-empty grid; indexes `grassMap[0]` — file 9 line 69
`for (let c = 0; c < grassMap[0].length; c++)` throws `Cannot read properties of undefined (reading 'length')` if `grassMap` is non-empty but its first row is undefined, and relies on row 0 defining the column count for all rows (ragged arrays mis-render). The "empty grass map" test (file 8 lines 59-64) passes only because `[].length === 0` short-circuits the outer loop; a `[undefined]`-shaped map is untested. Also `grassSrc = ASSETS.grass[grassIdx]` (line 74) is unguarded — an out-of-range `grassIdx` yields `undefined` and silently skips the tile.

### F-GAMES-B27-016 · Medium · Asset load failures degrade silently / no user feedback — files 9, 11, 16
On image `onerror`, BackgroundLayer logs to `console.error` and still flips `loaded=true` rendering missing tiles (file 9 lines 52-59). Castle Defense's `loadImage` rejects on error and the `Promise.all` catch only `console.error`s, leaving `assets` null forever → the game is **stuck on the loading screen** with no retry/error UI (file 11 lines 161-201, 390-398). Dungeon Liberator's `loadSprite` rejects and the `load()` async has **no `.catch` at all** (file 16 lines 103-114) → an unhandled promise rejection and `assets` stays null (falls back to Konva primitives, which is the better behavior, but the rejection is still unhandled). No structured logging per AGENTS.md observability guidance.

### F-GAMES-B27-017 · Medium · `console.error` used for production error reporting — files 9, 11
`BackgroundLayer.tsx:53` and `CastleDefenseGame.tsx:199` use raw `console.error`. AGENTS.md ("Observability/Logging": *"Avoid free-form console logging in production code"*). Asset-load failures should route through a structured logger/error reporter.

### F-GAMES-B27-018 · Low · Per-frame `Math.random` grass/scenery generated once but camera math recomputed in updater — file 14 lines 41-49, 184-185
Devourer Slime computes `cameraX/cameraY` twice per frame: once in `getIndicators` (lines 113-114) and again in the render body (lines 184-185), duplicating logic that can drift. Grass patches are correctly memoized via lazy `useState` initializer (good), but the camera duplication is an avoidable inconsistency source.

### F-GAMES-B27-019 · Low · Devourer Slime XP formula is degenerate — file 14 line 167
`xp = Math.floor(correctAnswers * (correctAnswers / totalAttempts))` — XP scales with accuracy² of raw correct count, has no difficulty factor, no time/lives bonus, and can be 0 for low-accuracy runs even with several correct answers. Inconsistent with the richer `calculateXP` formulas used by Abyssal Well/Griffin (lives + time bonuses). Scoring fairness/consistency concern.

### F-GAMES-B27-020 · Low · Dungeon Liberator runs two redundant animation-frame loops — file 16 lines 116-124 vs. 175-190
Both a `setInterval(…200ms)` effect (lines 117-124) and a `requestAnimationFrame` throttled-to-200ms effect (lines 176-190) update `animFrame`, gated on the same `gamePhase === 'playing'`. They run simultaneously, double-advancing the sprite frame counter and wasting cycles. One is dead/duplicate.

### F-GAMES-B27-021 · Low · Dimension polling via `setInterval` + `ResizeObserver` overlap — files 6, 16
Both Abyssal Well (file 6 lines 77-88) and Dungeon Liberator (file 16 lines 152-163) register a `ResizeObserver` *and* a 200 ms `setInterval` (cleared after 2 s) *and* an immediate call to do the same dimension update. The interval is a belt-and-suspenders workaround that triple-fires `setDimensions`; with `ResizeObserver` already present it is redundant churn. Castle Defense uses the cleaner observer + resize/orientation listeners (file 11 lines 234-261).

### F-GAMES-B27-022 · Low · Touch input reads only `e.touches[0]` with no guard — file 6 lines 202-217
`handleTouchStart` dereferences `e.touches[0]` then `touch.clientX`. A `touchend`-style event or empty touch list (multi-touch edge) yields `undefined` → throw. No `if (!touch) return`. Minor robustness gap on mobile.

### F-GAMES-B27-023 · Info · `framer-motion` `AnimatePresence` wraps a non-motion child — file 19 lines 5, 318-337
Griffin Rider's imports `AnimatePresence` and wraps `GameEndScreen`, but `GameEndScreen` is not a `motion` component and there is no `motion.*` exit variant, so `AnimatePresence` does nothing here except add a dependency. Dead abstraction.

---

## Test-Quality Findings

### F-GAMES-B27-024 · High · Game tests never assert end-state, scoring, XP, or onComplete payload — files 5, 10, 13, 15, 18, 20
Across all five game test suites the "calls onComplete when game ends" tests (file 5 lines 64-73 & 160-169; file 10 lines 278-290; file 13 lines 78-87; file 15 lines 214-227; file 18 lines 72-81) **never advance the game to an end state and never assert `onComplete` was called** — they only assert the konva stage rendered after clicking start. The test names overstate coverage. Likewise "exits fullscreen when game ends" (file 5 lines 84-91; file 18 lines 92-99) assert `mockEnterFullscreen` (start), not exit. XP/scoring/accuracy logic in these components is entirely unexercised at the component layer. This is misleading green coverage.

### F-GAMES-B27-025 · High · `GriffinSkyJoustGame.tsx` source is NOT in this batch but its test is — file 20
File 20 (`GriffinSkyJoustGame.test.tsx`) is listed/reviewed, but the implementation `GriffinSkyJoustGame.tsx` is not in the batch file list (it exists on disk at the same dir). The test imports difficulty `combobox` interaction (lines 129-134) and `onComplete` — none of which can be validated against source within this batch's scope. Reviewed test in isolation: same "no end-state assertion" weakness as F-GAMES-B27-024 (lines 68-127 all only assert the stage renders). Limitation noted.

### F-GAMES-B27-026 · Medium · Shared-screen tests do not mock i18n and assert raw fixture strings — files 1, 3
`ResultsScreen.test.tsx` and `StartScreen.test.tsx` call the real `useScopedI18n` (no mock), then assert literal `"100"`, `"80%"`, `"150 XP"` (file 1 lines 17-19) and button text `/try again/i`, `/start defense/i` (file 1 line 35; file 3 line 35). These depend on the live English locale resolving `common.tryAgain`→"Try Again" and `magicDefense.startDefense`→"Start Defense". If translations change or the locale provider needs context not present in the test render, these break. The game tests by contrast mock `useScopedI18n` to identity (e.g. file 10 lines 121-123). Inconsistent test isolation; the unmocked tests are brittle and locale-coupled.

### F-GAMES-B27-027 · Medium · Konva fully stubbed → zero rendering/coordinate/scaling assertions — files 5, 8, 10, 13, 15, 18, 20
Every test mocks `react-konva` to plain `<div>`s, so projection math (Griffin `getProjectedX/Y`, file 19 lines 184-199), camera clamping (files 11, 16), lane positioning, sprite cropping, and text-size scaling are never verified by any test in this batch. The pure logic lives in `src/lib/games/*` (separately tested) but the component-level wiring (passing `getEffectiveTextSize` into Konva `Text`, scale calc) is untested. Acceptable as a layering choice, but the gap means scoring/positioning regressions in the component layer would pass CI.

### F-GAMES-B27-028 · Low · `GriffinRidersEscape.test.tsx` uses `any` types and imports unused `act` — file 18 lines 1, 10-15
Test mocks type all props as `any` (lines 10-15), defeating type safety, and imports `act` (line 1) without using it. Other test files in the batch use proper `React.ReactNode`/`React.HTMLAttributes` typing (e.g. file 20 lines 10-15). Lint/quality inconsistency.

### F-GAMES-B27-029 · Low · BackgroundLayer test overrides global `Image` without restoring — file 8 lines 18-21
`Object.defineProperty(global, "Image", …)` is set at module load with no `afterAll`/restore. The Castle Defense test (file 10) and Dungeon Liberator test (file 15) also redefine global `Image`; depending on Jest file isolation this is usually fine, but the un-scoped global mutation is a latent cross-test-pollution risk and differs from the more careful getter/setter mocks in files 10/15.

### F-GAMES-B27-030 · Low · `CastleDefenseGame.test.tsx` asserts Tailwind class as behavior proxy — file 10 lines 210, 265
Difficulty-selection tests assert `toHaveClass("bg-amber-500")` rather than any observable game-state change. This couples the test to a styling implementation detail; a visual refactor breaks the test without a behavior change, and a real difficulty regression (state not updated) could still pass if the class toggles. Weak behavioral assertion.

---

## Importability into Reading / Primary — summary

| Blocker | Files | Finding |
|---------|-------|---------|
| Hard `window.location.href='/'` navigation | 16 | F-GAMES-B27-010 |
| Hardcoded English UI strings (no i18n) | 6, 14, 19 | F-GAMES-B27-007 |
| No shared completion/result contract | 6, 11, 14, 16, 19, 2 | F-GAMES-B27-002 |
| Two parallel start/result screen systems | 2, 4 | F-GAMES-B27-001 |
| Duplicate `basePath` / `VirtualDPad` utilities | 9, 11, 14, 16 | Cross-File Observations |
| Fixed-device canvas sizing (390×844) | 6, 14 | F-GAMES-B27-014 |

Persistence/leaderboard wiring (XP write-back, `schoolId` scoping, audit) is out of scope for these client components but remains unaddressed — the games emit `onComplete`/`showLeaderboardLink` with no proven host integration.

---

## Severity Tally

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 0 | — |
| High | 6 | 007, 008, 009, 010, 024, 025 |
| Medium | 12 | 001, 002, 003, 011, 012, 013, 014, 015, 016, 017, 026, 027 |
| Low | 11 | 004, 005, 006, 018, 019, 020, 021, 022, 028, 029, 030 |
| Info | 1 | 023 |
| **Total** | **30** | — |

---

## Limitations

1. **Read-only review.** No source code was modified; no tests were executed or built. Behavioral claims are derived from static reading.
2. **Konva is stubbed in all tests**, so runtime canvas/coordinate/scaling behavior was reasoned about from source, not observed.
3. **`GriffinSkyJoustGame.tsx` implementation is not in this batch** (only its test, file 20). Findings for that game are limited to the test file; the source exists on disk but was out of the assigned scope and not line-reviewed.
4. **Supporting `src/lib/games/*` logic modules and the `basePath`/`VirtualDPad` path variants were inspected read-only** only to substantiate findings; they are not part of this batch's 20 files and were not exhaustively reviewed (e.g. `calculateDungeonLiberatorXP` / `calculateCastleDefenseXP` difficulty multipliers were not confirmed).
5. **i18n locale catalogs were not opened**, so the exact resolved strings asserted by files 1 and 3 were not verified against the live English locale.
6. **Performance findings** (duplicate loops, per-frame allocations) are static observations; no profiling was performed.
7. This report makes **no acceptance or closeout claims**; it is a line-level review artifact only. Severity ratings are reviewer judgment for triage, not a release gate.
