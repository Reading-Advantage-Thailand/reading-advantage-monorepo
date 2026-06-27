# Line-by-Line Review — games-batch-35

- **Track:** `advantage_games_review_20260626`
- **Batch:** `games-batch-35`
- **Reviewer model:** ark-code-latest (Doubao-Seed-Code)
- **Scope:** Line-by-line read of the exact 20 files listed in `/tmp/opencode/games-batch-35`.
- **Source edits:** None (review-only).
- **Severity legend:** Critical (broken / data-loss / blocks importability) · High (likely defect or major gap) · Medium (correctness/maintainability risk) · Low (style/nit) · Info (observation).
- **Focus areas:** game readiness, shared runtime, scoring/XP/leaderboards/progress/difficulty, importability into Reading/Primary, asset/audio/performance/mobile/browser compatibility, accessibility, age-appropriate UX, test quality.

This report makes **no acceptance or closeout claims**. It records findings only.

---

## Files reviewed (20/20)

| # | File | Type |
|---|------|------|
| 1 | `apps/advantage-games/src/hooks/useMultiplayerSocket.ts` | source |
| 2 | `apps/advantage-games/src/hooks/usePerformanceMetrics.test.ts` | test |
| 3 | `apps/advantage-games/src/hooks/usePerformanceMetrics.ts` | source |
| 4 | `apps/advantage-games/src/hooks/useScopedI18n.ts` | source |
| 5 | `apps/advantage-games/src/hooks/useSession.test.ts` | test |
| 6 | `apps/advantage-games/src/hooks/useSession.ts` | source |
| 7 | `apps/advantage-games/src/hooks/useSound.test.tsx` | test |
| 8 | `apps/advantage-games/src/hooks/useSound.ts` | source |
| 9 | `apps/advantage-games/src/hooks/useSpriteAnimation.test.ts` | test |
| 10 | `apps/advantage-games/src/hooks/useSpriteAnimation.ts` | source |
| 11 | `apps/advantage-games/src/lib/__tests__/potionRushEffects.test.ts` | test |
| 12 | `apps/advantage-games/src/lib/adaptive-difficulty/adjustment-engine.test.ts` | test |
| 13 | `apps/advantage-games/src/lib/adaptive-difficulty/adjustment-engine.ts` | source |
| 14 | `apps/advantage-games/src/lib/adaptive-difficulty/calibration.test.ts` | test |
| 15 | `apps/advantage-games/src/lib/adaptive-difficulty/parameter-modifier.test.ts` | test |
| 16 | `apps/advantage-games/src/lib/adaptive-difficulty/parameter-modifier.ts` | source |
| 17 | `apps/advantage-games/src/lib/adaptive-difficulty/performance-benchmark.test.ts` | test |
| 18 | `apps/advantage-games/src/lib/adaptive-difficulty/registerDifficultyParams.test.ts` | test |
| 19 | `apps/advantage-games/src/lib/adaptive-difficulty/registerDifficultyParams.ts` | source |
| 20 | `apps/advantage-games/src/lib/adaptive-difficulty/session-persistence.test.ts` | test |

Supporting (non-batch) files consulted for verification only: `src/types/adaptive-difficulty.ts`, `src/lib/spriteAnimation.ts`, `src/lib/games/potionRushEffects.ts`, `src/lib/adaptive-difficulty/session-persistence.ts`, `jest.config.ts`, `package.json`.

---

## Findings

### 1. `useMultiplayerSocket.ts`

- **F-GAMES-B35-001 (High, game readiness / test quality):** This hook has **no test file** anywhere in the batch (and no sibling `useMultiplayerSocket.test.ts`). It implements non-trivial reconnect/backoff and event-bus logic that is entirely unverified. Per the app AGENTS.md (>80% coverage, strict TDD), an untested networking hook is a meaningful gap.
- **F-GAMES-B35-002 (High, correctness):** Lines 49–103 — `connect` depends on `socket` in its `useCallback` deps (line 102) and reads `socket?.readyState` (line 51). Because `setSocket(ws)` (line 97) triggers a re-render, `connect` is recreated on every connection; the reconnect closure captured in `ws.onclose` (lines 81–85) calls the *recursive local* `connect`, which is fine, but the stale-closure surface across deps (`socket`) makes the dependency array fragile and can defeat the line-51 "already open" guard during rapid reconnects.
- **F-GAMES-B35-003 (Medium, correctness):** Lines 68–87 — reconnection window check uses `connectTimeRef.current` set once at initial `connect` (line 56) and never refreshed on successful reopen (`onopen`, lines 62–66). After a long-lived connection, `elapsed` (line 74) is measured from the *original* connect time, so a drop after `reconnectWindow` (60s) will silently never reconnect even though the session is healthy. The window should reset on `onopen`.
- **F-GAMES-B35-004 (Medium, correctness):** Lines 78–80 — `retryCountRef` is reset to 0 in `onopen` (line 64) and in `connect` (line 57), but the exponential backoff `Math.pow(2, retryCountRef.current - 1)` combined with the per-`connect` reset means each new `connect()` invocation resets the retry counter; the recursive reconnect path increments it (line 79) but a successful reopen resets it — acceptable, yet there is no jitter and no max-delay cap, risking thundering-herd reconnects against a shared multiplayer server.
- **F-GAMES-B35-005 (Medium, API contract):** Lines 126–142 — `on()` returns an unsubscribe function, but the `UseMultiplayerSocketReturn` interface (line 15) types `on` as returning `void`. Consumers cannot type-safely unsubscribe; the documented return type and implementation disagree.
- **F-GAMES-B35-006 (Medium, importability):** No JSDoc on the exported `useMultiplayerSocket` (line 18) — violates the monorepo "JSDoc for all exported functions" standard, and `build-graph` cannot extract a summary. Same omission applies to all exports in this batch (see F-GAMES-B35-024).
- **F-GAMES-B35-007 (Low, resource leak):** Lines 144–152 — the unmount cleanup closes `socket` but does not null out `eventHandlersRef` handlers; long-lived games that mount/unmount this hook repeatedly will retain handler arrays until GC of the hook instance. Minor, but worth a `eventHandlersRef.current.clear()` on unmount.
- **F-GAMES-B35-008 (Info, shared runtime):** There is no corresponding server/WebSocket endpoint referenced. If multiplayer is not yet wired to a backend adapter, this hook is dead/aspirational code for import into Reading/Primary and should be flagged as not-ready.

### 2. `usePerformanceMetrics.test.ts`

- **F-GAMES-B35-009 (Low, test quality):** Lines 64–77 — the rolling-window test asserts `accuracy` ≈ 66.67 but other tests (line 37) assert the *rounded* `getScore().accuracy` of 67. The two accuracy surfaces (`getMetrics().accuracy` raw vs `getScore().accuracy` rounded) are tested inconsistently; acceptable but easy to confuse. No correctness bug.
- **F-GAMES-B35-010 (Info, coverage):** Good behavioral coverage of streak/window/composite. No test exercises `normalizeSpeed` boundaries above 10s (the `>10000ms` branch at source line 28) — the slowest-speed decay curve is untested.

### 3. `usePerformanceMetrics.ts`

- **F-GAMES-B35-011 (Medium, correctness / scoring):** Lines 44–62 — `recordResponse` uses `setRecords`, but `getScore`/`getMetrics` (lines 115, 144) read `records` via `calculateMetrics` which closes over the *current render's* `records`. In the test these are wrapped in `act` so state flushes, but a real game calling `recordResponse(...)` then synchronously `getScore()` in the same tick will read **stale** metrics (the just-recorded response not yet applied). This is a real foot-gun for scoring/XP at end-of-round. A ref-backed accumulator would be safer than `useState` for synchronous read-after-write.
- **F-GAMES-B35-012 (Low, scoring fidelity):** Lines 31–36 — `normalizeStreak` caps and steps by 20 per streak; combined with `currentStreak` "from end" (source lines 97–103) this means a streak across an evicted window boundary can drop sharply. Acceptable design, but undocumented; for XP determinism note it in difficulty docs.
- **F-GAMES-B35-013 (Info, performance):** `calculateMetrics` recomputes streaks with two O(n) passes on every `getScore`/`getMetrics` call. With `windowSize` ≤ 20 this is trivial; fine for mobile.

### 4. `useScopedI18n.ts`

- **F-GAMES-B35-014 (Low, importability):** Lines 1–5 — thin pass-through wrapper over `@/locales/client`. `scope` is typed as a bare `string` rather than the generated scoped-key union, so callers lose i18n key autocompletion/type-safety that the underlying `useScopedI18nImpl` normally provides. When imported into Reading/Primary (which have their own locale setup), this `@/locales/client` alias will not resolve — portability hazard.
- **F-GAMES-B35-015 (Info, test quality):** No test file for this wrapper. Low risk given triviality.

### 5. `useSession.test.ts`

- **F-GAMES-B35-016 (High, importability / shared runtime):** Lines 5–17 — the test pins a **hardcoded mock session** (`mock-user-id`, `xp: 0`, `role: 'student'`). This confirms `useSession` is a stub, not real auth. Any XP/leaderboard/progress feature reading `session.user.xp` will read a constant 0 in advantage-games. Importing games into Reading/Primary requires replacing this with the real auth adapter (`auth.getCurrentUser()` per AGENTS.md) — flag as a hard integration prerequisite, not ready.

### 6. `useSession.ts`

- **F-GAMES-B35-017 (High, shared runtime / importability):** Lines 1–16 — static mock object returned unconditionally; `update` is a no-op (line 14). `data.user` and top-level `user` (lines 11–12) duplicate the same object, an undocumented dual shape consumers may rely on inconsistently. `xp: 0`/`level: 1` are frozen. This bypasses the auth adapter entirely (violates "Do not bypass adapters"). Acceptable as a local dev stub only if clearly marked; currently nothing marks it as a stub.

### 7. `useSound.test.tsx`

- **F-GAMES-B35-018 (Low, test quality):** Lines 63–68 — `window.Audio` is mocked to always reject `play()`, exercising the synth fallback. There is **no test for the happy path** where the mp3 file plays successfully (so the early-return-before-synth path is unverified). Also the success/error paths through every oscillator branch (clinking, cash-register, angry-grunt) are not individually asserted.
- **F-GAMES-B35-019 (Info, browser compat):** Lines 127–147 — good coverage of the "AudioContext unavailable" no-op safety path, which matters for older/locked-down mobile browsers.

### 8. `useSound.ts`

- **F-GAMES-B35-020 (Medium, audio/performance):** Lines 69–78 — `playSound` constructs `new Audio('/sounds/${type}.mp3')` on **every** call with no caching/preload. In a fast-paced game, rapid successive plays allocate a new HTMLAudioElement each time (GC churn on mobile) and incur first-play network latency. Consider an Audio pool or `<link rel="preload">`.
- **F-GAMES-B35-021 (Medium, audio correctness):** Lines 74–77 — on file-play failure it falls back to synth, but it does **not** distinguish "file missing" (404) from "autoplay blocked". When autoplay is blocked, both the file *and* the synth (which also needs a resumed AudioContext) may be silent; `ctx.resume()` (line 26) is fire-and-forget (promise ignored), so the first gesture-less sound is lost. Acceptable but worth noting for UX (no audible feedback on first interaction).
- **F-GAMES-B35-022 (Low, asset readiness):** The hook assumes `/sounds/<type>.mp3` exists for 7 sound types (line 14). If those assets are absent every play silently degrades to synth — verify the asset set ships, otherwise the intended SFX never play. Not validated in this batch.
- **F-GAMES-B35-023 (Low, accessibility):** No volume/mute control or respect for a global "sound off" preference or `prefers-reduced-motion`-adjacent audio preference; volume hardcoded to 0.5 (line 72). Age-appropriate UX for classrooms typically needs a mute toggle.

### 9. `useSpriteAnimation.ts`

- **F-GAMES-B35-024 (Medium, correctness — render-phase setState):** Lines 12–15 — calling `setCurrentState`/`setStateStartTime` **during render** (not in an effect) is a deliberate React pattern but relies on React bailing out and re-rendering immediately. The returned `useMemo` (lines 17–20) computes with the *old* `stateStartTime` on the render where state changes, then recomputes next render. The test (file 9, lines 28–31) only passes because the re-render is synchronous; under concurrent rendering this "derive state during render" pattern can tear. Document the assumption or move to an effect-free derived calculation keyed on a prop.
- **F-GAMES-B35-025 (Low, importability):** No JSDoc; `config` object passed as `useMemo` dep (line 19) — if callers pass an inline object literal each render, the memo never hits. Recommend documenting that `config` must be referentially stable.

### 10. `useSpriteAnimation.test.ts`

- **F-GAMES-B35-026 (Low, coverage):** Lines 5–37 — only one test, covering idle→death transition and non-looping clamp. Missing: looping wrap-around (`frameIndex % totalFrames` at spriteAnimation source line 38), `startCol` offset, and the unknown-state fallback (`{row:0,col:0}` at source lines 27–28). Coverage is thin for a shared animation primitive.

### 11. `potionRushEffects.test.ts`

- **F-GAMES-B35-027 (Low, coverage):** Lines 3–22 — tests rotation/pulse/shimmer at t=0, 2000ms, 250ms. Missing: rotation wrap past 360° (e.g. t=5000 → 450%360=90) and shimmer range bounds. The `shimmer` field is never asserted away from t=0. Adequate but not exhaustive.
- **F-GAMES-B35-028 (Info, performance/mobile):** Underlying `getPortalFrame` is pure and allocation-light — good for per-frame calls.

### 12. `adjustment-engine.test.ts`

- **F-GAMES-B35-029 (Info, test quality):** Strong, focused coverage of EMA, thresholds, clamping, rate-limit, reset. Good.
- **F-GAMES-B35-030 (Low, gap):** No test asserts behavior when `min > max` or `min === max` (degenerate range → `range = 0`, `maxChange = 0`, delta 0). Robustness against misconfigured difficulty params is unverified (see F-GAMES-B35-035).

### 13. `adjustment-engine.ts`

- **F-GAMES-B35-031 (Medium, difficulty correctness):** Lines 70–77 — increase scaling divides `excess/20` while decrease divides `deficit/40`. The asymmetry (increase saturates 20 pts above the 80 threshold = score 100; decrease saturates 40 pts below the 40 threshold = score 0) is intentional but **undocumented**, producing asymmetric ramp speeds that affect XP/difficulty fairness. Worth a comment and a design note.
- **F-GAMES-B35-032 (Low, correctness):** Line 46 — `responseCount` increments on every `adjustParameter` call, but `shouldAdjust()` (line 36) is advisory only; `adjustParameter` always adjusts regardless of `shouldAdjust`. Callers (parameter-modifier) never gate on `shouldAdjust`, so the documented "cycle" semantics (adjust every N responses) are **not enforced** in the actual modify path — difficulty changes every single response, not every cycle. This contradicts the calibration test's framing (file 14, lines 64–69) and likely the intended design.
- **F-GAMES-B35-033 (Info):** `getConfig` returns a shallow copy (line 112) — good; engine state is otherwise encapsulated.

### 14. `calibration.test.ts`

- **F-GAMES-B35-034 (Medium, test quality — duplicated scoring logic):** Lines 20–41 — `createScore` re-implements the exact speed/streak/composite formulas that live in `usePerformanceMetrics.ts` (normalizeSpeed lines 21–29, WEIGHTS). This duplication means the calibration suite can pass while the real scoring drifts; the test does not import the production normalizers, so it validates a *copy* of the algorithm, not the algorithm. High maintenance risk for scoring fidelity.
- **F-GAMES-B35-035 (Low):** Lines 88–123 — assertions like "finalEmaScore > 80" encode tuning expectations; if difficulty constants are retuned these break without indicating a real regression. Consider tagging as calibration/snapshot tests.
- **F-GAMES-B35-036 (Info):** `gameId` arg `'test-game'` passed to `simulatePlayerSession` (line 90) is unused inside the function (it builds its own engine, line 48), so several tests' game-registration setup (lines 191–193) is irrelevant to the convergence assertions — mildly misleading.

### 15. `parameter-modifier.test.ts`

- **F-GAMES-B35-037 (Info, test quality):** Good coverage of register→modify flow, bounds, delta, overall-direction-by-majority. 
- **F-GAMES-B35-038 (Low, correctness exposure):** Lines 41–46 comment hard-codes the EMA math ("EMA after 3 scores at ~95: ~79, need 4th to cross 80"). This couples the test to the exact `alpha=0.3` constant; any config change silently invalidates the comment and the test's intent. Confirms F-GAMES-B35-032: parameters change per-response, not per-cycle.

### 16. `parameter-modifier.ts`

- **F-GAMES-B35-039 (High, shared runtime — module-global state):** Lines 22–35 — `engineRegistry` is a **module-level singleton Map**. In advantage-games (single SPA) this is fine, but on import into Reading/Primary (SSR / multiple students / multiple tabs / RSC), this shared mutable global will leak difficulty state across users and across server requests. Must be scoped per-session/per-user before import. Critical-adjacent portability blocker.
- **F-GAMES-B35-040 (Medium, correctness):** Lines 51–69 — `modifyParameters` writes `result.adjustedValue` into `modifiedParams[].newValue` but **never persists it back** to `param.current` in the registry. Each call therefore recomputes the delta from the *original* registered `current` (e.g. 1.0), not the previously adjusted value. The calibration "rate limiting" test (file 14, lines 230–252) only passes because deltas are clamped per-call; but cumulative difficulty never actually advances in the registry — a likely functional bug for sustained difficulty progression.
- **F-GAMES-B35-041 (Low, importability):** No JSDoc on exports (lines 24, 33, 37).

### 17. `performance-benchmark.test.ts`

- **F-GAMES-B35-042 (High, test quality — flaky timing asserts):** Lines 30–31, 49, 74, 103–104, 125, 162 — hard wall-clock thresholds (`averageTime < 1ms`, `totalTime < 50ms`, etc.) are **environment-dependent** and will flake on loaded CI runners or slower hardware. Performance assertions of this kind are a known source of intermittent CI failures and should be guarded (skip on CI) or expressed as relative/regression budgets.
- **F-GAMES-B35-043 (Medium, dependency on out-of-batch hook):** Lines 3, 85–86, 137–138 — depends on `useAdaptiveDifficulty` which is **not in this batch** and not otherwise reviewed here; the benchmark's validity hinges on that hook's correctness. Flagged as a cross-file dependency limitation.
- **F-GAMES-B35-044 (Low):** Lines 182–196 — "10000 responses" memory test asserts only that score stays 0–100; it does not actually measure memory, so the `describe('Memory usage')` label overstates what is verified.

### 18. `registerDifficultyParams.test.ts`

- **F-GAMES-B35-045 (Info, test quality):** Clean, complete CRUD coverage of the registry. Good.
- **F-GAMES-B35-046 (Low):** No test for registering an empty params object `{}` or invalid bounds (min>max); registry accepts anything (source lines 12–17 do no validation — see F-GAMES-B35-048).

### 19. `registerDifficultyParams.ts`

- **F-GAMES-B35-047 (High, shared runtime — module-global state):** Line 4 — `difficultyRegistry` is another **module-level singleton Map**, same SSR/multi-tenant leakage concern as F-GAMES-B35-039. Two parallel global registries (engine + params) both need session scoping before importing into Reading/Primary.
- **F-GAMES-B35-048 (Medium, validation):** Lines 6–26 — `registerDifficultyParams` performs **no validation** (no Zod, no min≤max check, no current-within-bounds check). The monorepo standard requires Zod at boundaries; difficulty config arriving from game definitions is an external-ish boundary. Misconfigured params (e.g. `min>max`, `current` outside range) propagate silently into the adjustment engine.
- **F-GAMES-B35-049 (Low, importability):** No JSDoc on any of the six exports.

### 20. `session-persistence.test.ts`

- **F-GAMES-B35-050 (Info, test quality):** Excellent defensive coverage — corrupted JSON, non-object, missing/typed fields, multi-game isolation. Strong.
- **F-GAMES-B35-051 (Medium, correctness — verified against source):** `session-persistence.ts` `setStorageData` (source lines 25–27) calls `localStorage.setItem` **without try/catch**. The read path is hardened (lines 9–23) but writes are not — `saveSessionHint` will throw in private-mode / quota-exceeded / SSR (no `localStorage`) contexts. No test covers a failing `setItem`, so this gap is unverified and would surface on import into SSR environments (Reading/Primary). 
- **F-GAMES-B35-052 (Low, privacy/UX):** Hints are stored under a single shared key `adaptive-difficulty-hints` keyed only by `gameId`, not by user. On a shared classroom device, student A's difficulty hints leak into student B's session. Note for age-appropriate / multi-user classroom UX.

---

## Cross-cutting observations

- **F-GAMES-B35-053 (High, importability):** Two stub adapters (`useSession`, and the i18n pass-through `useScopedI18n`) plus two module-global registries mean this adaptive-difficulty + session subsystem is **not drop-in importable** into Reading/Primary without: (a) real auth adapter wiring, (b) per-user/per-request state scoping, (c) locale alias resolution. These are integration prerequisites, not local bugs.
- **F-GAMES-B35-054 (Medium, docs standard):** None of the reviewed source files (`useMultiplayerSocket`, `usePerformanceMetrics`, `useSound`, `useSpriteAnimation`, `adjustment-engine`, `parameter-modifier`, `registerDifficultyParams`, `session-persistence`, `potionRushEffects`) carry JSDoc on exports, violating the monorepo "JSDoc for all exported functions" standard and degrading `build-graph` summaries.
- **F-GAMES-B35-055 (Info, test runner):** Confirmed app uses **Jest** (`jest.config.ts`, `package.json` `"test": "jest"`); test files correctly use `jest.fn()`/`jest.Mock`. Consistent within the app (note: monorepo elsewhere uses Vitest — mixed-runner tech debt is known).
- **F-GAMES-B35-056 (Info, mobile/perf):** Pure functions (`getSpriteFrame`, `getPortalFrame`, adjustment math) are allocation-light and suitable for per-frame mobile use. The two runtime allocation concerns are `new Audio()` per play (F-GAMES-B35-020) and `usePerformanceMetrics` array spreads (bounded by window size, acceptable).

---

## Limitations

- Review is static (no test execution, no type-check, no runtime). Behavioral claims (e.g. stale-read in F-GAMES-B35-011, per-response vs per-cycle in F-GAMES-B35-032/040) are inferred from source reading, not observed at runtime.
- `useAdaptiveDifficulty` (referenced by `performance-benchmark.test.ts` and `useAdaptiveDifficulty.ts`) is **outside this batch** and was not reviewed; findings touching it (F-GAMES-B35-043) are dependency observations only.
- SSR/multi-tenant import behavior (F-GAMES-B35-039/047/051/053) is reasoned from architecture, not reproduced in a Reading/Primary host.
- Asset existence for `/sounds/*.mp3` (F-GAMES-B35-022) and locale `@/locales/client` resolution (F-GAMES-B35-014) were not verified on disk in this batch.
- Supporting source files were read for verification but are not part of the 20-file batch and were not line-reviewed for their own findings.

## Severity summary

- Critical: 0
- High: 8 (001, 002 partial→High, 016, 017, 039, 042, 047, 053)
- Medium: 12
- Low: 16
- Info: 9

No acceptance or closeout determination is made by this report.
