# Line-by-Line Review: ra-batch-23

> **Track:** `reading_advantage_full_review_20260626`
> **Reviewer Role:** C (UX and API end-to-end contract)
> **Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`
> **Batch:** `ra-batch-23` (20 files — games UI components, Potion Rush, Dragon Flight, Dragon Rider)
> **Date:** 2026-06-27

---

## Scope

Line-by-line review of 20 files in `apps/reading-advantage/components/games/`. Focus areas: endpoint contracts, error responses, user-facing flow consistency, integration wiring, and route parity. No app code edits. No acceptance claims.

### Files Reviewed

| # | File | Lines | Category |
|---|------|-------|----------|
| 1 | `castle-defense/index.ts` | 1 | Barrel export |
| 2 | `potion-rush/CauldronStation.tsx` | 204 | Game component |
| 3 | `potion-rush/ConveyorBelt.tsx` | 211 | Game component |
| 4 | `potion-rush/CustomerQueue.tsx` | 136 | Game component |
| 5 | `potion-rush/PotionRushEffectsLayer.tsx` | 153 | Game component |
| 6 | `potion-rush/PotionRushGame.test.tsx` | 84 | Test |
| 7 | `potion-rush/PotionRushGame.tsx` | 369 | Game component |
| 8 | `potion-rush/PotionRushSoundController.tsx` | 61 | Game component |
| 9 | `potion-rush/TrashPortal.tsx` | 45 | Game component |
| 10 | `ui/VirtualDPad.tsx` | 119 | Shared UI |
| 11 | `ui/button.test.tsx` | 26 | Test |
| 12 | `ui/button.tsx` | 62 | Shared UI |
| 13 | `ui/card.test.tsx` | 41 | Test |
| 14 | `ui/card.tsx` | 92 | Shared UI |
| 15 | `ui/input.test.tsx` | 13 | Test |
| 16 | `ui/input.tsx` | 21 | Shared UI |
| 17 | `vocabulary/dragon-flight/DragonFlightGame.test.tsx` | 163 | Test |
| 18 | `vocabulary/dragon-flight/DragonFlightGame.tsx` | 2204 | Game component |
| 19 | `vocabulary/dragon-flight/RankingDialog.tsx` | 201 | Shared UI |
| 20 | `vocabulary/dragon-rider/DragonRiderGame.test.tsx` | 180 | Test |

**Total lines reviewed:** ~4,009

---

## Findings

### F-RA-B23-001 — RankingDialog: Missing fetch abort on unmount (Medium)

**File:** `vocabulary/dragon-flight/RankingDialog.tsx` lines 52-70
**Issue:** `fetchRankings()` performs an async `fetch(apiEndpoint)` without an `AbortController`. When the dialog closes or the component unmounts before the response arrives, the `.then()` handler still calls `setData()` on an unmounted component. This causes React "can't perform a state update on an unmounted component" warnings and is a memory leak.

**Recommended fix:**
```tsx
useEffect(() => {
  if (!open) return;
  const controller = new AbortController();
  fetchRankings(controller.signal);
  return () => controller.abort();
}, [open]);
```

**Severity:** Medium — No data corruption, but console warnings and potential stale-state rendering if dialog is opened/closed rapidly.

---

### F-RA-B23-002 — RankingDialog: Missing useEffect dependency (Low)

**File:** `vocabulary/dragon-flight/RankingDialog.tsx` lines 52-56
**Issue:** The `useEffect` depends on `open` and calls `fetchRankings`, but neither `fetchRankings` nor `apiEndpoint` are listed as dependencies. If the `apiEndpoint` prop changes after mount, the dialog will still fetch from the stale initial endpoint. Additionally, React exhaustive-deps linting would flag `fetchRankings` as missing.

**Impact:** Functionally correct for the current usage (endpoint is always the default), but creates a latent bug if the component is reused with a changing endpoint.

---

### F-RA-B23-003 — RankingDialog: Inconsistent API response shape assumption (Medium)

**File:** `vocabulary/dragon-flight/RankingDialog.tsx` line 63
**Issue:** The dialog parses the response as `json.rankings` (line 64), but there is no shared Zod schema or TypeScript type exported from the API to enforce this contract. The `RankingEntry` type in the dialog (lines 16-21) includes `userId`, `name`, `image`, `xp` — matching the controller's output shape (line 193-198 of dragon-flight-controller.ts). The contract is maintained purely by convention.

**Impact:** If the controller response shape changes (e.g., wrapping in `data`), the dialog will silently render empty rankings with no error feedback.

---

### F-RA-B23-004 — RankingDialog: No error state feedback to user (Low)

**File:** `vocabulary/dragon-flight/RankingDialog.tsx` lines 58-70
**Issue:** When `fetchRankings` fails (network error, non-ok response), the catch block logs to `console.error` but does not set any error state. The user sees the skeleton loading animation indefinitely, then the empty "no champions" state. There is no retry mechanism and no indication that the request failed versus there being genuinely no data.

**Impact:** Poor UX when the ranking API is down — user cannot distinguish "no rankings yet" from "failed to load."

---

### F-RA-B23-005 — DragonFlightGame: Hardcoded English string bypasses i18n (Low)

**File:** `vocabulary/dragon-flight/DragonFlightGame.tsx` line 1172
**Issue:** `"Skeleton King Approaches"` is a hardcoded English string rendered during the boss encounter phase. All other user-facing text in this component uses `useScopedI18n` / `t()` for translations. This string will not be translatable for non-English users.

**Recommended fix:** Replace with `t("dragonFlight.bossApproaches")` or equivalent i18n key.

---

### F-RA-B23-006 — DragonFlightGame: Play Again fallback to page reload (Low)

**File:** `vocabulary/dragon-flight/DragonFlightGame.tsx` lines 1302-1308
**Issue:** The "Play Again" button handler falls back to `window.location.reload()` when no `onRestart` callback is provided. This is a full page reload that destroys all React state, triggers a fresh asset load, and causes a visible flash. The `PotionRushGame` component uses `startGame(vocabList, difficulty)` for restart instead, which is the correct pattern.

**Impact:** Acceptable as a fallback, but if `onRestart` is consistently provided by the parent, this path is dead code. If it is not provided, the UX degrades.

---

### F-RA-B23-007 — DragonFlightGame: onComplete called during effect, not memoization-safe (Medium)

**File:** `vocabulary/dragon-flight/DragonFlightGame.tsx` lines 841-878
**Issue:** The `useEffect` at line 841 calls `onComplete(nextResults)` when `state.status === "boss"`. The `onComplete` prop is in the dependency array. If the parent component re-renders and passes a new function reference for `onComplete`, this effect re-runs, potentially calling `onComplete` again with the same results. The `DragonFlightGame.test.tsx` passes `jest.fn()` directly, which creates a new reference each render. The test does not currently exercise this scenario, but it is a latent double-fire bug.

**Impact:** In production, if the parent does not memoize `onComplete`, the game completion callback could fire multiple times, awarding duplicate XP or triggering duplicate side effects.

---

### F-RA-B23-008 — PotionRushGame: Same onComplete dependency pattern (Medium)

**File:** `potion-rush/PotionRushGame.tsx` lines 113-122
**Issue:** Same pattern as F-RA-B23-007. `onComplete` is in the dependency array of the game-over `useEffect`. If the parent passes a non-memoized callback, this could fire multiple times when `gameState` transitions to `"GAME_OVER"`.

**Impact:** Identical to F-RA-B23-007 — potential duplicate XP awards.

---

### F-RA-B23-009 — PotionRushGame: No game completion API integration visible (Medium)

**File:** `potion-rush/PotionRushGame.tsx` lines 28-33
**Issue:** The `PotionRushGameResult` interface defines `xp`, `accuracy`, `difficulty`, `score` — matching the shape needed by a completion API. However, the component itself does not call any API endpoint (e.g., `/api/v1/games/potion-rush/complete`). The `onComplete` callback is expected to be provided by the parent, which presumably handles the API call. This is architecturally correct (separation of concerns), but there is no shared Zod schema enforcing the contract between the game result and the completion endpoint.

---

### F-RA-B23-010 — PotionRushGame.test.tsx: Inadequate test coverage (High)

**File:** `potion-rush/PotionRushGame.test.tsx` lines 1-84
**Issue:** The test suite has exactly one test case: it verifies the start screen renders. There are no tests for:
- Game start (clicking "Start Brewing")
- Gameplay interactions (drag-and-drop, serving customers, cauldron management)
- Game over flow (reputation hits zero, timer expires)
- Score/XP display and reporting
- `onComplete` callback invocation with correct results
- `onRestart` behavior
- `onExit` navigation
- Error states (failed image loads, store errors)
- Difficulty parameter effect on game behavior

**Compare with:** `DragonFlightGame.test.tsx` (163 lines, 3 tests covering start, running, boss, results) and `DragonRiderGame.test.tsx` (180 lines, 3 tests with same coverage pattern). The PotionRush test coverage is significantly lower.

**Impact:** Game logic regressions will not be caught by tests. The completion flow (which feeds into XP/progress tracking) is untested.

---

### F-RA-B23-011 — PotionRushGame.test.tsx: Global Image.prototype monkey-patch (Low)

**File:** `potion-rush/PotionRushGame.test.tsx` lines 50-58
**Issue:** `Object.defineProperty(global.Image.prototype, "src", ...)` overrides the `src` setter globally. This is not cleaned up after the test suite. If other test files in the same Jest worker run after this one, they will see the patched behavior. The `DragonFlightGame.test.tsx` uses `preloadedAssets` to bypass image loading entirely, which is the safer pattern.

---

### F-RA-B23-012 — DragonRiderGame.test.tsx: Missing projectile assets in mock (Low)

**File:** `vocabulary/dragon-rider/DragonRiderGame.test.tsx` lines 43-53
**Issue:** The mock `assets` object includes 9 image properties (`gates`, `boss`, `player`, `playerCamera`, `army`, `parallaxTop`, `parallaxMiddle`, `parallaxBottom`, `loadingBackground`) but is missing `projectileFireball` and `projectileBoss` that are present in the `DragonFlightGame.test.tsx` mock (lines 49-51). If `DragonRiderGame` uses the same canvas rendering with projectiles, the missing assets could cause runtime errors or silent render failures in the boss phase.

**Verification needed:** Confirm whether `DragonRiderGame` component requires projectile assets. If so, the mock is incomplete.

---

### F-RA-B23-013 — ConveyorBelt: Hardcoded snap-back y=20 (Low)

**File:** `potion-rush/ConveyorBelt.tsx` line 175
**Issue:** `e.target.y(20)` snaps dragged ingredient items back to y=20 after drag ends. This value is hardcoded and does not account for the belt's y-position or the ingredient's original y offset. If the belt's layout position changes (e.g., responsive layout), ingredients will snap to the wrong position.

**Impact:** Visual glitch. Functionally the item returns to the belt area, but the snap position may not align with the belt visual.

---

### F-RA-B23-014 — CauldronStation: React key using array index for word list (Low)

**File:** `potion-rush/CauldronStation.tsx` line 163
**Issue:** `key={i}` is used for the word list inside each cauldron. If two words are the same string (possible in vocabulary lists with homographs or repeated entries), React cannot reliably distinguish them, leading to incorrect reconciliation and potential visual flicker during updates.

**Impact:** Minor visual glitch during cauldron word list updates. Low probability in practice.

---

### F-RA-B23-015 — Image loading useEffect duplicated 4 times across Potion Rush (Low)

**Files:**
- `CauldronStation.tsx` lines 30-48
- `ConveyorBelt.tsx` lines 32-51
- `CustomerQueue.tsx` lines 29-48
- `PotionRushGame.tsx` lines 55-84

**Issue:** All four components implement nearly identical image loading patterns: create a `Record<string, HTMLImageElement>`, iterate over asset entries, increment a counter on load, and batch-set state when all complete. None of them clean up on unmount (no `isMounted` flag or `AbortController`). This is a code duplication concern rather than a bug, but the missing unmount guard means all four can trigger `setState` on unmounted components if the game transitions quickly.

**Recommended fix:** Extract a `useAssetLoader(assets: Record<string, string>)` hook that handles loading, error, and cleanup.

---

### F-RA-B23-016 — VirtualDPad: No accessibility attributes (Low)

**File:** `ui/VirtualDPad.tsx` lines 87-118
**Issue:** The virtual D-Pad is an interactive touch/mouse control but has no `role`, `aria-label`, or `aria-roledescription` attributes. Screen readers cannot identify or interact with it. For a game, this is low priority, but it violates WCAG 4.1.2 (Name, Role, Value).

---

### F-RA-B23-017 — Games UI (button, card, input): Solid contract tests, no issues (Informational)

**Files:**
- `ui/button.test.tsx` + `ui/button.tsx` — Tests verify `data-slot`, `data-variant`, `data-size` attributes. asChild rendering tested. Clean.
- `ui/card.test.tsx` + `ui/card.tsx` — Tests verify `data-slot` for all sub-components. `CardAction` component exists but is not imported/tested (minor gap).
- `ui/input.test.tsx` + `ui/input.tsx` — Single test verifying `data-slot`, `type`, and `className`. Minimal but sufficient.

**No blocking issues.** These are well-tested shadcn/ui-derived components with proper data attributes for test targeting.

---

### F-RA-B23-018 — DragonFlightGame: No error boundary around canvas (Low)

**File:** `vocabulary/dragon-flight/DragonFlightGame.tsx` lines 1019-1037
**Issue:** The `DragonFlightCanvas` component renders a complex Konva Stage with parallax layers, sprite animations, and projectile physics. If any Konva rendering throws (e.g., corrupted sprite data, null image reference), the entire game component crashes with no recovery. There is no React Error Boundary wrapping the canvas.

**Impact:** Full game crash with no user-facing error message or retry option. The user would need to navigate away and return.

---

### F-RA-B23-019 — DragonFlightGame: onComplete fired inside useEffect without guard (Medium)

**File:** `vocabulary/dragon-flight/DragonFlightGame.tsx` lines 866-868
**Issue:** `onComplete(nextResults)` is called inside a `useEffect` that depends on `state.status`, `state.correctAnswers`, `state.attempts`, `state.dragonCount`, `state.elapsedMs`, and `onComplete`. While the effect checks `state.status !== "boss"` as a guard, the `onComplete` callback itself has no "already called" guard. If the effect re-runs (e.g., due to `onComplete` reference change from parent), it will fire `onComplete` again.

This is the same class of bug as F-RA-B23-007 but specifically the inner call path. A `useRef` guard (e.g., `const completedRef = useRef(false)`) would prevent double invocation.

---

### F-RA-B23-020 — PotionRush: No shared contract for game result shape (Medium)

**Files:** `PotionRushGame.tsx` (lines 28-33), `DragonFlightGame.tsx` (via `DragonFlightResults` type), `RankingDialog.tsx` (lines 16-21)
**Issue:** Three game components define their own result types (`PotionRushGameResult`, `DragonFlightResults`, `RankingEntry`). The game result types are not validated by Zod and are not shared with the corresponding API endpoints (`/api/v1/games/*/complete`, `/api/v1/games/*/ranking`). The API controllers independently define their own response types. This creates a fragile contract that can drift silently.

**Recommended fix:** Define shared Zod schemas in `@reading-advantage/types` (e.g., `GameResultSchema`, `RankingEntrySchema`) and validate at both the game component boundary and the API controller boundary.

---

## Summary by Severity

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| High | 1 | F-RA-B23-010 |
| Medium | 6 | F-RA-B23-001, F-RA-B23-003, F-RA-B23-007, F-RA-B23-008, F-RA-B23-019, F-RA-B23-020 |
| Low | 11 | F-RA-B23-002, F-RA-B23-004, F-RA-B23-005, F-RA-B23-006, F-RA-B23-011, F-RA-B23-012, F-RA-B23-013, F-RA-B23-014, F-RA-B23-015, F-RA-B23-016, F-RA-B23-018 |
| Informational | 1 | F-RA-B23-017 |
| **Total** | **19** | |

---

## Anti-Pattern Check

| Anti-Pattern | Result |
|-------------|--------|
| A1 (substring-as-signal) | N/A — no supervisor code |
| A5 (false-claim vs test) | N/A — no plan claims reviewed |
| A11 (blocked review track) | N/A — this is an execution batch |

---

## Route Parity Check

- **DragonFlight ranking endpoint** (`/api/v1/games/dragon-flight/ranking/route.ts`): EXISTS and uses `protect` middleware + `DragonFlightController.getRanking`. Controller returns `{ rankings: Record<string, RankingEntry[]> }`. RankingDialog fetches this endpoint correctly.
- **PotionRush ranking endpoint** (`/api/v1/games/potion-rush/ranking/route.ts`): EXISTS in glob results but is not used by any component in this batch. PotionRushGame has no ranking dialog.
- **DragonRider ranking endpoint** (`/api/v1/games/dragon-rider/ranking/route.ts`): EXISTS in glob results. DragonRiderGame does not have a RankingDialog in this batch.

**Observation:** DragonFlight and DragonRider have ranking endpoints but only DragonFlight has a RankingDialog component. This is a parity gap — DragonRider players cannot view leaderboards.

---

## Changes Since Baseline

**Zero files changed** in this batch since the baseline SHA (`d348666be`). All 20 files are pre-existing code. This review is a first-pass line inspection, not a delta review.

---

## No Blocking Fixes Required

Per the review mandate ("Fix proven blockers in focused commits"), no files in this batch were edited. All findings are advisory. The one **High** severity finding (F-RA-B23-010: PotionRushGame test coverage) is a test gap, not a runtime blocker.

---

*Review complete. No edits made. Report written to `measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-23.md`.*

MEASURE_AGENT_RESULT
{"agent_role":"C","agent_role_name":"UX and API end-to-end contract","batch_id":"ra-batch-23","track_id":"reading_advantage_full_review_20260626","baseline_sha":"d348666be047b929d02c747120c32d2ea0fc53fc","files_reviewed":20,"lines_reviewed":4009,"findings":{"high":1,"medium":6,"low":11,"informational":1,"total":19},"fixes_applied":0,"report_path":"measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-23.md","status":"complete"}
