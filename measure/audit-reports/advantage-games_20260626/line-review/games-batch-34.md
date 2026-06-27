# Line-by-Line Review — games-batch-34

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-34`
**Scope source:** `/tmp/opencode/games-batch-34` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited.
**Finding ID scheme:** `F-GAMES-B34-###`
**Severity scale:** Critical / High / Medium / Low / Info

This batch is entirely **shared-runtime React hooks** (and their tests) under `apps/advantage-games/src/hooks/`. These hooks are the cross-cutting infrastructure consumed by every game: input, game loop, camera/dimensions, fullscreen, adaptive difficulty, leaderboard/XP, accessibility, locale, and the multiplayer socket/game-state layer. Because they are shared, defects here have a wide blast radius and directly bear on importability into Reading/Primary.

To anchor findings, the following **non-batch** files were read for context only (no findings filed against them): `src/types/leaderboard.ts`, `src/types/accessibility.ts`, `src/hooks/usePerformanceMetrics.ts`, `apps/advantage-games/jest.config.ts`. Findings about `usePerformanceMetrics`/types are anchored to the batch hooks that consume them.

---

## Files Reviewed (20/20)

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `hooks/useAccessibilitySettings.ts` | Hook | localStorage-backed a11y settings |
| 2 | `hooks/useAdaptiveDifficulty.test.ts` | Test (Jest) | 9 cases, mocks via registry resets |
| 3 | `hooks/useAdaptiveDifficulty.ts` | Hook | difficulty engine wrapper |
| 4 | `hooks/useCurrentLocale.ts` | Hook | trivial re-export wrapper |
| 5 | `hooks/useDirectionalInput.test.tsx` | Test (Jest) | 2 cases, preventDefault only |
| 6 | `hooks/useDirectionalInput.ts` | Hook | keyboard/virtual input vector |
| 7 | `hooks/useGameCamera.test.ts` | Test (Jest) | 4 cases |
| 8 | `hooks/useGameCamera.ts` | Hook | world→screen camera |
| 9 | `hooks/useGameDimensions.test.ts` | Test (Jest) | 2 cases |
| 10 | `hooks/useGameDimensions.ts` | Hook | ResizeObserver + polling |
| 11 | `hooks/useGameFullscreen.ts` | Hook | Fullscreen API w/ webkit fallback |
| 12 | `hooks/useGameLoop.test.tsx` | Test (Jest) | 3 cases, fake timers |
| 13 | `hooks/useGameLoop.ts` | Hook | fixed-dt interval loop |
| 14 | `hooks/useInterval.test.tsx` | Test (Jest) | 3 cases |
| 15 | `hooks/useInterval.ts` | Hook | Dan Abramov setInterval pattern |
| 16 | `hooks/useLeaderboard.test.ts` | Test (Jest) | 9 cases, localStorage mock |
| 17 | `hooks/useLeaderboard.ts` | Hook | local XP/high-score store |
| 18 | `hooks/useMultiplayerGameState.test.ts` | Test (Jest) | 9 cases |
| 19 | `hooks/useMultiplayerGameState.ts` | Hook | optimistic multiplayer state |
| 20 | `hooks/useMultiplayerSocket.test.ts` | Test (Jest) | 10 cases, MockWebSocket |

Note: `useMultiplayerSocket.ts` (the implementation for file #20) is **not** in this batch — only its `.test.ts` is. It was read for context to evaluate the test, and findings touching the implementation are flagged as anchored-to-test-context and deferred to whichever batch owns the source.

---

## Findings

### F-GAMES-B34-001 · High · Adaptive difficulty scores on stale metrics (off-by-one) — scoring/difficulty fidelity
`useAdaptiveDifficulty.ts:45-58`. `recordResponse` calls `recordPerf(correct, timeMs)` (which does `setRecords(...)` asynchronously inside `usePerformanceMetrics`, see `usePerformanceMetrics.ts:44-62`) and then **synchronously** calls `getScore()` on line 46. `getScore` is a `useCallback` closed over the *current* `records` state (`usePerformanceMetrics.ts:115-142`), which has not yet re-rendered with the just-recorded response. Therefore:
- The score fed to `setPerformanceScore` (line 47) and to `modifyParameters(gameId, score)` (line 58) always reflects the state **before** the current response.
- On the very first response, `getScore()` returns the empty-state score (`{score:0,...}` per `usePerformanceMetrics.ts:118-125`).
This is a real correctness bug in the shared difficulty engine: every difficulty adjustment lags one response behind and the first adjustment is computed from zero data. For a graded learning platform this directly degrades adaptive-difficulty quality. The test (`useAdaptiveDifficulty.test.ts:48-63`) only asserts `performanceScore` is `not.toBeNull()`, which still passes with the stale `{score:0}` object, so the bug is unguarded.

### F-GAMES-B34-002 · Medium · `adjustmentInProgress` ref guard is dead/ineffective
`useAdaptiveDifficulty.ts:36,51-64`. The `adjustmentInProgress` ref is set true, used synchronously, and reset in the same `finally` block within a single synchronous function body. Because `modifyParameters` is synchronous, the guard can never observe a concurrent call (JS is single-threaded; no `await` exists between set and reset). It conveys an intent ("avoid concurrent adjustments") that the code does not actually enforce. If adjustments ever become async, this guard would silently not protect them. Either remove it or make the adjustment path genuinely async with proper queuing.

### F-GAMES-B34-003 · Low · `state.currentParams` recomputed on every render
`useAdaptiveDifficulty.ts:116-122`. The `state` object calls `getCurrentParams()` during every render, and `getCurrentParams` (line 69-92) calls `getDifficultyParams(gameId)` (a registry lookup) and allocates a new `Map` each time. Since `state` is also a fresh object literal each render, any consumer that depends on `state` re-renders unnecessarily and re-walks the registry. Memoize `currentParams` (e.g. `useMemo` keyed on `[adaptive, gameId, lastAdjustment]`) to stabilize the shared API surface.

### F-GAMES-B34-004 · Medium · Adaptive difficulty tests assert presence, not behavior
`useAdaptiveDifficulty.test.ts:94-113` ("should adjust parameters after enough responses") asserts only `lastAdjustment` is `not.toBeNull()` — it never checks the *direction* or *value* of the adjustment (e.g., that strong performance increases `speed`). Combined with F-GAMES-B34-001, the suite cannot detect that adjustments are computed on stale scores. The core value of the feature (correct, monotonic difficulty response to performance) has no behavioral assertion. Add cases asserting parameter values move the expected direction for high vs. low performance.

### F-GAMES-B34-005 · High · WebSocket reconnect counter reset defeats `maxRetries` → unbounded reconnection
Anchored to `useMultiplayerSocket.test.ts` context (impl `useMultiplayerSocket.ts:49-103`, file not in batch). `connect()` unconditionally resets `retryCountRef.current = 0` (line 57) and `connectTimeRef.current = Date.now()` (line 56) on **every** invocation. The reconnect path (`onclose`, lines 78-86) schedules `connect(currentUrlRef.current)` after a backoff, and that nested `connect` call resets both the retry count and the connect-time window. As a result `retryCountRef.current < maxRetries` is effectively always true and the `elapsed < reconnectWindow` window restarts each attempt, so a persistently-failing server is retried forever rather than stopping after `maxRetries` (default 3). The test `useMultiplayerSocket.test.ts:181-190` only checks the hook *accepts* `{maxRetries, reconnectDelay}` ("without errors") — it never asserts retries actually stop. The retry/backoff contract is therefore unverified and the implementation contradicts it.

### F-GAMES-B34-006 · Medium · `useMultiplayerSocket.on` return type mismatch with consumer contract
Anchored to `useMultiplayerSocket.test.ts` context (impl `useMultiplayerSocket.ts:15,126-142`) vs. `useMultiplayerGameState.ts:30`. The socket hook declares `on: (event, handler) => void` in its return interface (`useMultiplayerSocket.ts:15`) but the implementation **returns an unsubscribe function** (lines 132-141). Meanwhile `useMultiplayerGameState` types its `onMessage` parameter as `(event, handler) => (() => void)` and *relies* on the returned unsubscribe in its cleanup (`useMultiplayerGameState.ts:108-134`). The declared types are contradictory: wiring `useMultiplayerSocket().on` directly into `useMultiplayerGameState` would type-error or require a cast, and a consumer trusting the `=> void` type would leak handlers (the `eventHandlersRef` map is never otherwise pruned). The two halves of the multiplayer runtime do not share a coherent contract.

### F-GAMES-B34-007 · Medium · `totalRounds` is hardcoded to 3, ignoring `round_start` payload
`useMultiplayerGameState.ts:164`. The return value hardcodes `totalRounds: 3` with a comment "will be updated from round_start messages" — but it never is. `handleRoundStart` (lines 70-82) receives `message.totalRounds` and forwards it to the `onRoundStart` callback, yet no state stores it, so the `totalRounds` field exposed by the hook is permanently `3` regardless of the server-declared round count. Any UI binding to `totalRounds` (progress "Round X of Y") will be wrong for non-3-round games. The test (`useMultiplayerGameState.test.ts:71-96`) asserts the callback fires with `(1,3,120)` but never checks `result.current.totalRounds`, so the stale value is unguarded.

### F-GAMES-B34-008 · Medium · State-update handler re-subscribes the socket on every optimistic word
`useMultiplayerGameState.ts:39-68,108-134`. `handleStateUpdate` lists `optimisticWords` in its dependency array (line 68), so it is recreated whenever a word is submitted. That, in turn, changes the `useEffect` deps (line 134), tearing down and re-registering the `onMessage('message', ...)` subscription on every optimistic submission. Beyond churn, there is a correctness risk: messages arriving during the unsubscribe/resubscribe gap can be dropped, and the rejection reconciliation reads a possibly-stale `optimisticWords` closure. Prefer a ref for `optimisticWords` (or reconcile inside the `setState` updater) so the message subscription is registered once.

### F-GAMES-B34-009 · Medium · Untrusted multiplayer payloads are cast, not validated (no Zod at the boundary)
`useMultiplayerGameState.ts:39-106,111`. Inbound messages are `JSON.parse`d and cast with `as MultiplayerMessage` (line 111), then each handler casts `data as {...}` (e.g. lines 40, 71, 85, 95) with no runtime validation. This is an external transport boundary (WebSocket), which AGENTS.md requires to be Zod-validated. A malformed/hostile `players` array, missing `gameState`, or wrong types will propagate into render (`players.find(...)`, `setGameState(...)`) and can crash the game or corrupt scoring. The rejection heuristic (lines 50-66) compounds this by trusting `wordsCollected` numeric comparisons with no schema guarantees. Add Zod schemas for each `MessageType` payload and reject malformed messages explicitly (the catch at line 126 only handles JSON-parse failures, not shape failures).

### F-GAMES-B34-010 · Low · "clear rejected words" test never exercises a rejection
`useMultiplayerGameState.test.ts:168-202`. The test submits a word, sends a `STATE_UPDATE` with `wordsCollected: 0`, then calls `clearRejectedWords()` and asserts `rejectedWords === []`. But `rejectedWords` would be `[]` regardless because the rejection path only triggers when `optimisticCount > serverWords` *and* there is a still-pending submission within the 2s grace window (`useMultiplayerGameState.ts:55-63`) — timing the test does not control. The assertion passes vacuously and provides no coverage of the actual reject-and-clear flow. The fragile rejection heuristic (F-GAMES-B34-009 context) is therefore untested.

### F-GAMES-B34-011 · High · Global `preventDefault` on Space/Enter/Arrows breaks host-app interaction & a11y
`useDirectionalInput.ts:14-51`. Both `handleKeyDown` and `handleKeyUp` are attached to `window` (lines 53-60) and call `e.preventDefault()` for `Space`, `Enter`, and arrow/WASD keys **whenever the hook is mounted**, with no focus/active-element check. Consequences when this game is embedded in Reading/Primary (a stated importability goal):
- `Space`/`Enter` are the standard activation keys for buttons/links and submit keys for forms. Globally preventing their default breaks keyboard activation of *any* host UI rendered alongside the game (nav, modals, "next lesson" buttons), and breaks `Space`-scroll for the whole page.
- Arrow keys are needed for select/scroll/slider widgets in the host shell.
This is both an accessibility regression and an importability blocker. The handler should only trap keys when the game canvas/container has focus (or when the event target is within the game), not unconditionally at `window` scope. The test (`useDirectionalInput.test.tsx:12-28`) actually *enshrines* the unconditional global behavior, so the regression is locked in by the suite.

### F-GAMES-B34-012 · Low · Directional input: virtual input fully overrides keyboard; `triggerCast`/`consumeCast` redundancy
`useDirectionalInput.ts:78-90`. When `virtualInput.dx|dy` is non-zero the keyboard vector is *discarded* entirely (lines 79-82) rather than merged, so a hybrid keyboard+touch user gets surprising overrides. Separately, `triggerCast` (line 89) just sets `castTriggered=true` — identical to a keyboard cast — while `consumeCast` (lines 65-67) resets it; the in-file comment block (lines 62-64) admits the reset semantics are "tricky" and unresolved. `setVirtualInput` is exported but there is no test verifying virtual-input merge behavior. The cast lifecycle is fragile and under-specified.

### F-GAMES-B34-013 · Low · Directional input test coverage is shallow (no vector math)
`useDirectionalInput.test.tsx` contains only two cases, both asserting `event.defaultPrevented`. There is no test for the actual `{dx,dy}` derivation (the hook's primary purpose): WASD vs arrows, diagonal combination, opposing-key cancellation, key-up clearing, or the cast lifecycle. The most defect-prone logic (F-GAMES-B34-012) is entirely untested.

### F-GAMES-B34-014 · Medium · Game loop uses fixed `dt` over `setInterval` — inaccurate time, background-tab drift
`useGameLoop.ts:8` + `useInterval.ts:10-15`. The loop always reports a *constant* `dt = tickMs/1000` (line 8) regardless of actual elapsed wall-clock time, and runs on `setInterval`. Two consequences:
- On slow devices or under GC pauses, `setInterval` callbacks bunch up or stretch, but the simulation still advances by a fixed `dt`, so in-game time diverges from real time (slow-motion under load). A real delta (`performance.now()` diff) would keep physics time-accurate.
- `setInterval` is throttled to ~1Hz in background tabs and is not vsync-aligned, causing visible jank vs. `requestAnimationFrame`. For a 50ms (20fps) default this also caps smoothness below typical 60fps expectations.
This is the shared loop for every game, so the inaccuracy is platform-wide. The test (`useGameLoop.test.tsx:19-30`) asserts the fixed `0.05` dt, codifying the fixed-step assumption.

### F-GAMES-B34-015 · Low · `useInterval` does not restart on `delay` change mid-run cleanly vs. callback identity
`useInterval.ts:10-15`. The effect depends only on `delay`; changing the callback updates `savedCallback.current` (good, avoids restart). However when `delay` *changes value* (e.g. difficulty speeds up the spawn timer), the interval is fully torn down and recreated, discarding elapsed time toward the next tick — the next tick fires a full new `delay` later, introducing a perceptible hitch on every difficulty change. Acceptable for many cases but worth noting for adaptive-difficulty-driven interval changes. Info-adjacent; flagged Low because adaptive difficulty is an active feature in this batch.

### F-GAMES-B34-016 · Medium · Camera scales by height only — horizontal overflow/clipping on wide or narrow viewports
`useGameCamera.ts:40-46`. `scale = Math.max(scaleY, minScale)` where `scaleY = dimensions.height / gameHeight`. Width is never considered. On a container wider than tall (landscape tablet, desktop, or when imported into a wide Reading/Primary content area) the height-fit scale can make `gameWidth * scale` exceed `dimensions.width`, pushing playfield content off-screen horizontally; conversely a `minScale` floor of `0.8` can clip when the container is very small. A correct fit uses `Math.min(scaleX, scaleY)` (contain) or an explicit letterboxing strategy. The test (`useGameCamera.test.ts:42-55`) only checks the equal-aspect 390×844 case, so the asymmetric-aspect bug is unguarded.

### F-GAMES-B34-017 · Low · Camera test asserts property existence, not transform correctness
`useGameCamera.test.ts:58-73`. `getIndicatorPosition` test only asserts the result `toHaveProperty('x')`/`('y')` — it never verifies the world→screen math (`worldX*scale + camX`). With dimensions equal to game size and `scale` derived, a concrete expected value is computable and should be asserted. As written, a regression that inverts or zeroes the transform would pass.

### F-GAMES-B34-018 · Low · `useGameDimensions` runs a redundant polling interval alongside ResizeObserver
`useGameDimensions.ts:27-48`. A `ResizeObserver` already reports size changes (lines 27-38); the additional `setInterval(updateDimensions, 200)` for 2s (lines 40-41) is a belt-and-braces fallback that fires up to ~10 extra `getBoundingClientRect()` layout reads on every mount, even when the observer works (the common case). This is minor layout-thrash on game start across all games. If the polling is a workaround for an observer-timing issue it should be documented; otherwise prefer a single `updateDimensions()` call plus the observer.

### F-GAMES-B34-019 · Medium · Leaderboard/XP is local-only — does not integrate with server progress or tenant scoping
`useLeaderboard.ts:14-28` + `types/leaderboard.ts:25`. All XP, high scores, and session history live solely in `window.localStorage` under a single global key `advantage-games-leaderboard`. For importability into Reading/Primary this is a gap: (a) progress/XP will not sync to the platform's per-learner progress model or survive device changes; (b) there is no `schoolId`/`userId` scoping, so on a shared device all learners share one leaderboard, mixing tenants' data (contradicts the multi-tenant scoping principle in AGENTS.md). The hook needs an injectable persistence adapter (local for standalone, server-backed for embedded) before it can be the shared XP source of truth.

### F-GAMES-B34-020 · Low · Leaderboard deserialize does shallow validation; corrupt entries pass through
`types/leaderboard.ts:40-50` (consumed by `useLeaderboard.ts:19`). `deserializeLeaderboard` checks only that `sessions`/`highScores`/`totalXp` keys are not `undefined`, then casts `parsed as LeaderboardState`. Element shapes (numeric `score`/`xp`, string ids) are not validated, so a partially-corrupt or hand-edited localStorage value (or one written by an older schema) flows into render and arithmetic (`prev.totalXp + xp`, `Math.max(...)`), risking `NaN` totals or runtime errors. A Zod schema at this boundary would harden the shared XP store.

### F-GAMES-B34-021 · Low · `generateSessionId` uses `Math.random` + deprecated `substr`
`types/leaderboard.ts:52-53` (consumed by `useLeaderboard.ts:40`). `${Date.now()}-${Math.random().toString(36).substr(2,9)}` uses `String.prototype.substr` (deprecated) and a non-crypto RNG. Collision probability is low for a 20-entry local cap, but if sessions are ever uploaded/merged server-side the IDs are neither globally unique nor sortable beyond ms granularity. Prefer `crypto.randomUUID()` (with a guard for non-secure contexts) and `slice` instead of `substr`.

### F-GAMES-B34-022 · Low · Leaderboard test records outside `act()` and double-records
`useLeaderboard.test.ts:30-43`. The first case calls `recordSession(...)` inside `act()` (line 33) and then **again outside** `act()` (line 35) to capture the return value. The out-of-`act` state update will emit a React "not wrapped in act(...)" warning and records the same session twice, muddying any subsequent state assertion. Capture the return value inside the `act` callback instead.

### F-GAMES-B34-023 · Low · `useAccessibilitySettings` writes defaults to storage on mount; `reduceMotion` never surfaced to consumers
`useAccessibilitySettings.ts:34-36` + `types/accessibility.ts:1-15`. The `useEffect` saves `settings` on every change including the **initial render**, so first mount always writes the default object to localStorage even when the user never changed anything (unnecessary write, and it can overwrite a value written by a parallel tab between read and effect). Separately, the settings type includes `reduceMotion` (`accessibility.ts:5`) but the hook exposes only `getEffectiveTextSize`/`getEffectiveTouchTarget` (lines 49-61) — there is no `prefers-reduced-motion`/`reduceMotion` helper, so the many animated games cannot easily honor it via this shared hook (ties to the motion-sensitivity gaps noted in earlier batches). The hook is also untested (no `useAccessibilitySettings.test.ts` present in this batch or alongside it).

### F-GAMES-B34-024 · Info · `useCurrentLocale` is an untested pass-through wrapper
`useCurrentLocale.ts:1-5` simply re-exports `@/locales/client`'s `useCurrentLocale`. Harmless, but it adds an indirection with no added value and no test. If the intent is to centralize locale access for future swap-ability, document that; otherwise consumers can import the client hook directly.

### F-GAMES-B34-025 · Info · `useGameFullscreen` only requests fullscreen on its own container; webkit-only legacy fallback
`useGameFullscreen.ts:14-39`. Reasonable graceful degradation (optional-chaining the vendor methods, swallowing rejections). Two notes: (a) it covers only `webkit`-prefixed legacy APIs — older Firefox (`mozRequestFullScreen`) and MS (`msRequestFullscreen`) are not handled, though those are largely irrelevant on modern targets; (b) iOS Safari does not support the Fullscreen API on arbitrary elements (only `<video>`), so on iPhone the game silently never goes fullscreen — acceptable given the catch, but worth documenting as a known mobile limitation for the portrait-first games. No test file accompanies this hook.

### F-GAMES-B34-026 · Info · Direct `WebSocket` usage with no transport adapter, auth, or `wss` enforcement
Anchored to `useMultiplayerSocket.test.ts` context (impl `useMultiplayerSocket.ts:60`). The socket hook constructs `new WebSocket(url)` directly with no auth token, no origin/`wss://` enforcement, and no provider adapter — contrary to the adapter/provider-neutrality guidance in AGENTS.md. For a multiplayer feature touching learner identity and scoring this should route through an internal realtime adapter and require a secured (`wss`) endpoint with an auth handshake. Flagged Info because the implementation file is out of this batch's scope; surfacing for the owning batch.

---

## Cross-Cutting Observations (read-only, not single-line defects)

- **Test runner:** All tests in this batch are Jest (`describe`/`it`/`jest.fn`), consistent with `apps/advantage-games/jest.config.ts`. This aligns with the repo's documented mixed Jest/Vitest tech-debt; not a per-file defect.
- **Shared-runtime quality:** `useInterval` (file #15) is a clean, correct implementation of the canonical pattern and is well tested. `useGameDimensions` and `useGameCamera` correctly clean up their `ResizeObserver`s (verified by tests #7/#9).
- **Optimistic UI:** `useMultiplayerGameState`'s optimistic-word approach is reasonable in spirit, but its reconciliation heuristic (count-based, time-windowed) is inherently lossy and is the riskiest logic in the batch (F-GAMES-B34-008/009/010).
- **Scoring/XP coherence:** The local leaderboard (file #17) and the adaptive-difficulty engine (file #3) are independent of each other and of any server progress model; there is no shared, validated scoring contract that Reading/Primary could bind to (see F-GAMES-B34-001, -019).
- **Accessibility:** The keyboard input hook's global `preventDefault` (F-GAMES-B34-011) and the absence of a `reduceMotion` accessor (F-GAMES-B34-023) are the two most consequential a11y/importability issues in the batch.

---

## Limitations

- **Read-only:** No source was executed, built, or edited. Findings are from static reading. Test pass/fail was **not** verified by running Jest.
- **Out-of-batch implementation:** `useMultiplayerSocket.ts` (impl for test file #20) is not in this batch; findings F-GAMES-B34-005/006/026 are anchored to the test plus a context read of the implementation and are flagged for the owning batch. Likewise `usePerformanceMetrics.ts`, `types/leaderboard.ts`, `types/accessibility.ts`, and `@/locales/client` were read only to anchor findings against the batch hooks.
- **Consumers not traced:** I did not exhaustively enumerate every game component consuming these hooks; importability/blast-radius statements are reasoned from the shared nature of the hooks, not from a full call-graph (no `build-graph` query was run for this batch).
- **Runtime/timing behavior** (real `setInterval` drift, WebSocket reconnection over a real network, Fullscreen on physical iOS/Android) was reasoned about from source, not measured.
- **i18n/locale completeness** beyond the existence of the `useCurrentLocale` wrapper was not audited.

---

## Scope Confirmation

- Report exists at the required path and covers **all 20 files** listed in `/tmp/opencode/games-batch-34`.
- Every file appears in the Files Reviewed table; findings are line-anchored with severities and `F-GAMES-B34-###` IDs.
- This is a line-by-line review artifact only. **No acceptance or closeout claims are made**; gate decisions remain with the track owner.
