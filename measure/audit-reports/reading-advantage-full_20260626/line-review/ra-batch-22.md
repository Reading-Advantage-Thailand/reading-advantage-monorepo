# Line-by-Line Review: Reading Advantage — Batch 22

**Track ID:** `reading_advantage_full_review_20260626`  
**Batch ID:** `ra-batch-22`  
**Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Current HEAD:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
**Review Date:** 2026-06-27  
**Reviewer Role:** A — Correctness and Architecture

---

## Scope

All 20 files listed in the batch were reviewed in full, line by line.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/components/games/game/GameContainer.test.tsx` | 1–65 (entire file) |
| 2 | `apps/reading-advantage/components/games/game/GameContainer.tsx` | 1–89 (entire file) |
| 3 | `apps/reading-advantage/components/games/game/GameEndScreen.tsx` | 1–171 (entire file) |
| 4 | `apps/reading-advantage/components/games/game/GameEngine.test.tsx` | 1–64 (entire file) |
| 5 | `apps/reading-advantage/components/games/game/GameEngine.tsx` | 1–668 (entire file) |
| 6 | `apps/reading-advantage/components/games/game/GameStartScreen.tsx` | 1–197 (entire file) |
| 7 | `apps/reading-advantage/components/games/game/HUD.test.tsx` | 1–19 (entire file) |
| 8 | `apps/reading-advantage/components/games/game/HUD.tsx` | 1–109 (entire file) |
| 9 | `apps/reading-advantage/components/games/game/InputController.test.tsx` | 1–24 (entire file) |
| 10 | `apps/reading-advantage/components/games/game/InputController.tsx` | 1–176 (entire file) |
| 11 | `apps/reading-advantage/components/games/game/MagicBolt.test.tsx` | 1–8 (entire file) |
| 12 | `apps/reading-advantage/components/games/game/MagicBolt.tsx` | 1–24 (entire file) |
| 13 | `apps/reading-advantage/components/games/game/RankingDialog.tsx` | 1–172 (entire file) |
| 14 | `apps/reading-advantage/components/games/game/ResultsScreen.test.tsx` | 1–38 (entire file) |
| 15 | `apps/reading-advantage/components/games/game/ResultsScreen.tsx` | 1–114 (entire file) |
| 16 | `apps/reading-advantage/components/games/game/StartScreen.test.tsx` | 1–40 (entire file) |
| 17 | `apps/reading-advantage/components/games/game/StartScreen.tsx` | 1–226 (entire file) |
| 18 | `apps/reading-advantage/components/games/sentence/castle-defense/BackgroundLayer.tsx` | 1–127 (entire file) |
| 19 | `apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.test.tsx` | 1–298 (entire file) |
| 20 | `apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.tsx` | 1–799 (entire file) |

**No file was partially reviewed.**

---

## Test Evidence

The eight test files in this batch were run together with:

```bash
pnpm --filter reading-advantage test -- \
  components/games/game/GameContainer.test.tsx \
  components/games/game/GameEngine.test.tsx \
  components/games/game/StartScreen.test.tsx \
  components/games/game/ResultsScreen.test.tsx \
  components/games/game/HUD.test.tsx \
  components/games/game/InputController.test.tsx \
  components/games/game/MagicBolt.test.tsx \
  components/games/sentence/castle-defense/CastleDefenseGame.test.tsx
```

Result: **5 failed suites, 3 passed suites; 17 failed tests, 5 passed tests** (22 total).

Failures cluster around:

- Unmocked `useScopedI18n`: translated button/placeholder text is rendered as translation keys (e.g. `magicDefense.startDefense`, `common.tryAgain`), so DOM queries by English text fail.
- Stale test expectations: `GameContainer.test.tsx` still expects `"Missile Command: Vocab Edition"` and placeholder `"type translation"`, neither of which exists in the current `StartScreen` / `InputController`.
- Unmocked `useGameStore.getState`: `GameContainer.tsx:80` calls `useGameStore.getState().missedWords`, but the test mock only returns the hook function, producing `TypeError: _useGameStore.useGameStore.getState is not a function`.

The three passing suites (`HUD`, `MagicBolt`, `GameEngine`) still contain shallow or vacuous tests noted below.

---

## Executive Summary

This batch covers two vocabulary/sentence game subsystems: the shared `components/games/game/*` runtime used by the Magic Defense typing game, and the Castle Defense Konva-based sentence-building game. The shared presentation components (`GameStartScreen`, `GameEndScreen`) are the cleanest code in the batch; the actual game loops and their tests carry significant correctness and maintenance issues.

The most severe correctness bug is in **Magic Defense's accuracy calculation**: `GameEngine.tsx` increments `totalAttempts` on incorrect answers and on missiles that reach the bottom, but **not on correct answers**. The accuracy formula `correctAnswers / totalAttempts` can therefore exceed 100% (e.g. 5 correct, 1 incorrect → 500%) and is displayed unclamped in the HUD and results screen. This corrupts the score/accuracy feedback shown to students and any downstream XP/leaderboard logic that consumes it.

Other high-impact issues include a **global Spacebar listener that intercepts typing input**, **asset paths that ignore the app's base path**, **imperative `useGameStore.getState()` access inside render**, and a **test suite that is mostly red and gives false confidence**.

Castle Defense shares the same i18n/test-fragility problems and additionally couples a sentence game to the Dragon Flight ranking dialog. The cross-game dependency and the duplicated local `RankingDialog` are architectural drift that will complicate the planned Advantage Games reuse track.

---

## Findings

### High

#### H-01 — Accuracy formula is broken because correct answers are not counted as attempts
- **Files:** `apps/reading-advantage/components/games/game/GameEngine.tsx:209, 355–427`; `apps/reading-advantage/components/games/game/GameContainer.tsx:35`
- **Severity:** High
- **Evidence:** In `GameEngine.tsx`, `checkAnswer` calls `incrementAttempts()` only in the incorrect-answer branch (lines 407–410) and in `handleReachBottom` when a missile hits (lines 301). It does **not** call `incrementAttempts()` when the answer is correct. Both `GameEngine.tsx:209` and `GameContainer.tsx:35` then compute `accuracy = correctAnswers / totalAttempts`.
- **Impact:** With 5 correct answers and 1 miss, `totalAttempts = 1` and `accuracy = 5.0`, which `HUD.tsx:104` and `ResultsScreen.tsx:56` render as `500%`. The metric shown to students is mathematically wrong, and any consumer of `onComplete` accuracy (leaderboards, progress reports) receives bad data.
- **Fix:** Count every submission as an attempt by calling `incrementAttempts()` for both correct and incorrect answers, then compute `accuracy = correctAnswers / totalAttempts`. Alternatively, track `incorrectAnswers` separately and use `correctAnswers / (correctAnswers + incorrectAnswers + misses)`.

#### H-02 — Global Spacebar listener intercepts text input
- **File:** `apps/reading-advantage/components/games/game/GameEngine.tsx:269–277`
- **Severity:** High
- **Evidence:** The `keydown` listener fires `activateSpecialAbility()` for any `e.code === "Space"` regardless of the active element. `InputController.tsx` keeps a (desktop) text input focused at all times, so pressing Space while typing a translation triggers the ultimate ability instead of entering a space.
- **Impact:** Students cannot type multi-word translations; the spacebar is hijacked by the game. This is a direct regression in the core input loop.
- **Fix:** Guard the handler with `if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;`, or stop propagation in the input's `onKeyDown`.

#### H-03 — `BackgroundLayer` hardcodes asset paths without `withBasePath`
- **File:** `apps/reading-advantage/components/games/sentence/castle-defense/BackgroundLayer.tsx:7–19, 41–60`
- **Severity:** High
- **Evidence:** `ASSETS.grass` and `ASSETS.road` use absolute paths such as `/games/sentence/castle-defense/grass_A.png`. The sibling `CastleDefenseGame.tsx` correctly wraps image URLs with `withBasePath(src)` (line 153), but `BackgroundLayer` does not.
- **Impact:** If the app is deployed under a non-root base path, all tile/road images in Castle Defense fail to load, leaving a blank canvas. This contradicts the portability goal in `AGENTS.md`.
- **Fix:** Import `withBasePath` from `@/lib/games/basePath` and prefix every `ASSETS` entry and `img.src` with it.

#### H-04 — `GameContainer` reads store state imperatively inside render
- **File:** `apps/reading-advantage/components/games/game/GameContainer.tsx:80`
- **Severity:** High
- **Evidence:** The component calls `useGameStore.getState().missedWords` directly in JSX. This bypasses the React subscription model and is not a hook, so it can return stale state and will throw if `useGameStore` is not a Zustand-style store with a `getState` method (as demonstrated by the failing test).
- **Impact:** Stale missed-word lists can be shown on the results screen. The pattern also makes the component untestable with a plain mocked hook and violates the store abstraction.
- **Fix:** Select `missedWords` from `useGameStore()` at the top of the component, alongside `status`, `score`, etc.

#### H-05 — Game tests are stale, unmocked, and give false confidence
- **Files:** `apps/reading-advantage/components/games/game/GameContainer.test.tsx`, `apps/reading-advantage/components/games/game/StartScreen.test.tsx`, `apps/reading-advantage/components/games/game/ResultsScreen.test.tsx`, `apps/reading-advantage/components/games/game/InputController.test.tsx`, `apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.test.tsx`
- **Severity:** High
- **Evidence:**
  - `GameContainer.test.tsx` expects `"Missile Command: Vocab Edition"` and placeholder `"type translation"`, neither of which exists in the current UI.
  - `StartScreen.test.tsx` looks for a button named `/start game/i`; the actual button text is `t("magicDefense.startDefense")`.
  - `ResultsScreen.test.tsx` looks for `/try again/i`; the actual button is `t("common.tryAgain")`.
  - `InputController.test.tsx` looks for placeholder `/type translation/i`; the actual placeholder is `"Type spell..."`.
  - `CastleDefenseGame.test.tsx` uses `/start defense/i` to find the start button, but the rendered text is the translation key `startButton`.
  - None of these tests mock `useScopedI18n` or `useGameStore.getState`.
- **Impact:** Five of the eight test suites in the batch fail. The test suite cannot be relied on to catch regressions in the game UI.
- **Fix:** Add a global Jest mock for `useScopedI18n` (or per-file mocks), update DOM selectors to match current copy, and mock the store's `getState` method or remove the imperative read.

### Medium

#### M-01 — `GameEngine.tsx` has duplicate and dead imports
- **File:** `apps/reading-advantage/components/games/game/GameEngine.tsx:5, 10, 15, 20`
- **Severity:** Medium
- **Evidence:** `Difficulty` is imported twice (lines 5 and 10). `getInitialSettings` is imported from `@/lib/games/magicDefenseConfig` (line 15) but immediately shadowed by a local function of the same name (line 159). `withBasePath` is imported (line 10) but never used.
- **Impact:** Confuses readers, hides which source of truth is active, and increases bundle noise.
- **Fix:** Remove the duplicate `Difficulty` import and the unused `withBasePath` import. Either delete the local `getInitialSettings` and use the config import, or remove the config import and rename the local function.

#### M-02 — Special ability is half-implemented and rewards nothing
- **File:** `apps/reading-advantage/components/games/game/GameEngine.tsx:237–266`
- **Severity:** Medium
- **Evidence:** `activateSpecialAbility` destroys falling missiles and creates explosions, but it does not call `increaseScore`, `incrementCombo`, `addMana`, or `incrementAttempts`. It also removes missiles without setting `state: "dying"`, so death animations and sound effects are skipped. Comments admit incompleteness: "Add a better sound later" and "Optional: Add visual effect".
- **Impact:** Using the ultimate ability yields no score/mana feedback and feels inconsistent with the normal answer loop. Missing death states may also leave `handledHitsRef` or other bookkeeping inconsistent.
- **Fix:** Treat special-ability kills like correct answers (score, combo, mana) and set missiles to `dying` before removal so the existing animation/sound path runs.

#### M-03 — `StartScreen` `handleStart` leaks a `setTimeout` and never resets loading
- **File:** `apps/reading-advantage/components/games/game/StartScreen.tsx:63–68`
- **Severity:** Medium
- **Evidence:** `handleStart` sets `isLoading(true)` and schedules `onStart(selectedDifficulty)` after 500 ms. There is no cleanup for the timeout if the component unmounts, and `isLoading` is never reset to `false` even after `onStart` runs.
- **Impact:** Potential `setState` on an unmounted component. If `onStart` errors, the button stays disabled forever.
- **Fix:** Store the timeout id in a ref and clear it in a cleanup effect. Reset `isLoading` in a `finally` block or after `onStart` resolves.

#### M-04 — `InputController` desktop mode steals focus globally and lacks accessibility
- **File:** `apps/reading-advantage/components/games/game/InputController.tsx:23–31, 92–102, 105–173`
- **Severity:** Medium
- **Evidence:** The desktop `useEffect` adds a `window` click listener that always refocuses the hidden input. The hidden input has no `aria-label`, `title`, or associated `<label>`, and the visible "Type spell..." prompt is not programmatically linked to it.
- **Impact:** Clicking anywhere in the game (or possibly outside it) steals focus, breaking keyboard navigation and screen-reader context. Screen-reader users may not discover the input at all.
- **Fix:** Add `aria-label="Type your translation"` to the input. Scope the refocus listener to the game container rather than `window`, or remove auto-refocus and rely on `autoFocus`.

#### M-05 — Mobile submit button is pointer-only
- **File:** `apps/reading-advantage/components/games/game/InputController.tsx:75–83`
- **Severity:** Medium
- **Evidence:** The mobile submit button uses `onPointerDown` and has no `type`, `onClick`, or keyboard handler.
- **Impact:** Keyboard and screen-reader users cannot submit an answer on mobile/touch layouts.
- **Fix:** Change to `type="button" onClick={handleSubmit}` and ensure the input also responds to Enter (already implemented).

#### M-06 — Combo speed-up logic is off-by-one
- **File:** `apps/reading-advantage/components/games/game/GameEngine.tsx:367, 394–401`
- **Severity:** Medium
- **Evidence:** `incrementCombo()` is called on line 367, then the ramp condition is `(combo + 1) % 3 === 0` on line 394. Because `combo` has already been incremented, the condition is true on the 4th correct answer, not the 3rd.
- **Impact:** Difficulty scaling does not match the documented combo mechanic.
- **Fix:** Check the condition before calling `incrementCombo()`, or change the condition to `combo % 3 === 0` after increment.

#### M-07 — `CastleDefenseGame` couples a sentence game to the Dragon Flight ranking dialog
- **File:** `apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.tsx:27, 423–428`
- **Severity:** Medium
- **Evidence:** Castle Defense imports `RankingDialog` from `@/components/games/vocabulary/dragon-flight/RankingDialog`. A local `RankingDialog` exists in `components/games/game/RankingDialog.tsx` but is not used here.
- **Impact:** Cross-game component coupling makes the planned Advantage Games reuse track harder. The local dialog and the dragon-flight dialog are diverging implementations of the same concept.
- **Fix:** Move a shared, configurable `RankingDialog` to `@/components/games/ui/` (or `packages/ui`) and have both games consume it.

#### M-08 — `CastleDefenseGame` uses `as any` for difficulty and translation keys
- **File:** `apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.tsx:399–410`
- **Severity:** Medium
- **Evidence:** Difficulty buttons cast `d as any` and `t(`difficulty.${d}` as any)`. The `difficulty` state is typed as a union, so the casts are unnecessary and hide type drift.
- **Impact:** Type-safety erosion; a renamed difficulty key will fail silently at runtime.
- **Fix:** Type the button data with the difficulty union and use a typed `t` helper or `t.raw`.

#### M-09 — `CastleDefenseGame` tests are shallow and rely on brittle selectors
- **File:** `apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.test.tsx`
- **Severity:** Medium
- **Evidence:** The suite mocks `react-konva` to simple `<div>` elements and mostly asserts presence of circles/text. It finds the start button with `/start defense/i`, which does not match the translated key. It mocks `createCastleDefenseState` and restores it in `finally`, but `jest.useFakeTimers()` tests lack cleanup if an assertion throws.
- **Impact:** The tests do not exercise game logic (movement, collisions, tower building, win/loss) and will break whenever copy changes.
- **Fix:** Mock i18n, use stable `data-testid` selectors, and add tests that drive `advanceCastleDefenseTime` directly to verify state transitions.

#### M-10 — `RankingDialog` silently swallows fetch failures
- **File:** `apps/reading-advantage/components/games/game/RankingDialog.tsx:39–52`
- **Severity:** Medium
- **Evidence:** `fetchRankings` logs failures with `console.error` and sets `loading(false)`, but it does not surface an error state to the user. Non-OK responses also leave `data` unchanged rather than showing an error.
- **Impact:** If the ranking endpoint is down, the dialog shows an empty or stale list with no explanation.
- **Fix:** Add an `error` state and render a user-facing message. Replace `console.error` with structured logging or a toast.

### Low

#### L-01 — Vacuous-pass tests with no assertions
- **Files:** `apps/reading-advantage/components/games/game/GameEngine.test.tsx:41–63`; `apps/reading-advantage/components/games/game/MagicBolt.test.tsx:5–7`
- **Severity:** Low
- **Evidence:** `GameEngine.test.tsx` "damages a castle when a missile reaches bottom" ends with a comment block and no assertion. `MagicBolt.test.tsx` "renders without crashing" only calls `render(...)`. Both pass regardless of whether the feature works (A4 vacuous-pass).
- **Impact:** These tests create the illusion of coverage for state transitions and bolt rendering.
- **Fix:** Add assertions: for `GameEngine`, verify `damageCastle` is called with a castle id when `Enemy` fires `onReachBottom`; for `MagicBolt`, assert the rendered div has the expected class or style.

#### L-02 — `ResultsScreen` deduplicates via `JSON.stringify` and uses index keys
- **File:** `apps/reading-advantage/components/games/game/ResultsScreen.tsx:27–31, 78`
- **Severity:** Low
- **Evidence:** `uniqueMissedWords` uses `JSON.stringify` / `JSON.parse` to deduplicate. The mapped list uses `key={i}`.
- **Impact:** Property-order sensitivity makes deduplication brittle; index keys can cause rendering glitches if the list order changes.
- **Fix:** Use a stable key such as `word.term` (or `term + translation`) and deduplicate with a `Map` keyed the same way.

#### L-03 — `HUD.test.tsx` covers only score and accuracy
- **File:** `apps/reading-advantage/components/games/game/HUD.test.tsx:5–18`
- **Severity:** Low
- **Evidence:** The test renders combo=5, mana=100, timeRemaining=60 but only asserts on `1230` and `85%`.
- **Impact:** Timer formatting, low-time warning class, combo display, and mana bar are untested.
- **Fix:** Add assertions for the formatted time (`1:00`), combo text (`5x`), and mana bar width.

#### L-04 — `GameStartScreen` lists use index keys
- **File:** `apps/reading-advantage/components/games/game/GameStartScreen.tsx:90, 144`
- **Severity:** Low
- **Evidence:** Instructions and vocabulary rows use `key={index}` and `key={`${item.term}-${i}`}` respectively.
- **Impact:** Duplicate terms or reordered instructions can produce duplicate or unstable keys.
- **Fix:** Use stable identifiers; for instructions use `step` or a slug, for vocabulary use a unique id if available.

#### L-05 — Dead comments and incomplete features in `GameEngine.tsx`
- **File:** `apps/reading-advantage/components/games/game/GameEngine.tsx:240, 263`
- **Severity:** Low
- **Evidence:** Comments state "Add a better sound later" and "Optional: Add visual effect for global attack".
- **Impact:** Indicates features were left unfinished; the comments become stale quickly.
- **Fix:** Implement the sound/visual effect or remove the comments and track the work in a Measure task.

#### L-06 — `RankingDialog` fallback strings are hardcoded
- **File:** `apps/reading-advantage/components/games/game/RankingDialog.tsx:91–92, 117, 125`
- **Severity:** Low
- **Evidence:** Empty-state strings `"No wizards yet."`, `"Be the first to defend the kingdom!"`, and role label `"Wizard"` are hardcoded English.
- **Impact:** Non-English users see untranslated copy.
- **Fix:** Route these strings through `useScopedI18n`.

---

## Cross-Cutting Themes

1. **i18n leakage and unmocked translations.** Several components use `useScopedI18n`, but their tests do not mock it. The tests then fail because DOM queries expect English strings while the rendered output is translation keys. This is a batch-wide test hygiene issue.
2. **Game-loop correctness gaps.** Magic Defense has an incorrect accuracy formula and an off-by-one combo ramp. Castle Defense couples unrelated games and relies on magic numbers for ranges and timers. These are the kinds of bugs that product-level tests (noted as missing in `review-a-correctness-result.json` finding PB-010) would catch.
3. **Accessibility shortcuts.** The desktop input is hidden and focus-stealing; the mobile submit button is pointer-only; ranking dialogs lack error states. These shortcuts accumulate across the game inventory.
4. **Shallow or broken tests.** Vacuous passes, stale selectors, and missing assertions mean the batch's test suite cannot currently be trusted as a regression gate.

---

## No Acceptance Claims

This review identifies issues in the listed source files. It does not certify that the files are correct, complete, or ready for production. Remediation should be tracked in follow-up Measure tracks.

---

MEASURE_AGENT_RESULT
{
  "track_id": "reading_advantage_full_review_20260626",
  "review_role": "A",
  "batch_id": "ra-batch-22",
  "status": "complete",
  "files_reviewed": 20,
  "lines_reviewed": 3428,
  "findings": {
    "critical": 0,
    "high": 5,
    "medium": 10,
    "low": 6,
    "total": 21
  },
  "finding_ids": [
    "F-RA-B22-001",
    "F-RA-B22-002",
    "F-RA-B22-003",
    "F-RA-B22-004",
    "F-RA-B22-005",
    "F-RA-B22-006",
    "F-RA-B22-007",
    "F-RA-B22-008",
    "F-RA-B22-009",
    "F-RA-B22-010",
    "F-RA-B22-011",
    "F-RA-B22-012",
    "F-RA-B22-013",
    "F-RA-B22-014",
    "F-RA-B22-015",
    "F-RA-B22-016",
    "F-RA-B22-017",
    "F-RA-B22-018",
    "F-RA-B22-019",
    "F-RA-B22-020",
    "F-RA-B22-021"
  ],
  "report_path": "measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-22.md"
}
