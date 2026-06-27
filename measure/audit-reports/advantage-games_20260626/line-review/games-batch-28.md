# Line-by-Line Review — games-batch-28

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-28`
**Reviewer model:** ark-code-latest (Doubao-Seed-Code)
**Date:** 2026-06-27
**Scope:** Read-only line review. No source code was edited.

## Focus areas
Game readiness; shared runtime usage; scoring/XP/leaderboards/progress/difficulty;
importability into Reading/Primary apps; asset/audio/performance/mobile/browser
compatibility; accessibility; age-appropriate UX; test quality.

## Files reviewed (20/20)

| # | File | Type |
|---|------|------|
| 1 | `apps/advantage-games/src/components/games/sentence/griffin-sky-joust/GriffinSkyJoustGame.tsx` | Game component |
| 2 | `apps/advantage-games/src/components/games/sentence/griffin-sky-joust/index.ts` | Barrel export |
| 3 | `apps/advantage-games/src/components/games/sentence/gryphon-patrol/GryphonPatrolGame.test.tsx` | Test |
| 4 | `apps/advantage-games/src/components/games/sentence/gryphon-patrol/GryphonPatrolGame.tsx` | Game component |
| 5 | `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.test.tsx` | Test |
| 6 | `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.tsx` | Game component |
| 7 | `apps/advantage-games/src/components/games/sentence/labyrinth-goblin-king/LabyrinthGoblinKingGame.test.tsx` | Test |
| 8 | `apps/advantage-games/src/components/games/sentence/labyrinth-goblin-king/LabyrinthGoblinKingGame.tsx` | Game component |
| 9 | `apps/advantage-games/src/components/games/sentence/labyrinth-goblin-king/index.ts` | Barrel export |
| 10 | `apps/advantage-games/src/components/games/sentence/potion-rush/CauldronStation.tsx` | Sub-component |
| 11 | `apps/advantage-games/src/components/games/sentence/potion-rush/ConveyorBelt.test.tsx` | Test |
| 12 | `apps/advantage-games/src/components/games/sentence/potion-rush/ConveyorBelt.tsx` | Sub-component |
| 13 | `apps/advantage-games/src/components/games/sentence/potion-rush/CustomerQueue.test.tsx` | Test |
| 14 | `apps/advantage-games/src/components/games/sentence/potion-rush/CustomerQueue.tsx` | Sub-component |
| 15 | `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushEffectsLayer.tsx` | Sub-component |
| 16 | `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushGame.test.tsx` | Test |
| 17 | `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushGame.tsx` | Game component |
| 18 | `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushSoundController.tsx` | Sub-component |
| 19 | `apps/advantage-games/src/components/games/sentence/potion-rush/TrashPortal.tsx` | Sub-component |
| 20 | `apps/advantage-games/src/components/games/sentence/realm-carver/RealmCarverGame.test.tsx` | Test |

Supporting context read (not counted toward the 20, used to validate contracts):
`components/games/game/GameStartScreen.tsx`, `components/games/game/GameEndScreen.tsx`,
`lib/games/labyrinthGoblinKing.ts` (XP fn), `lib/games/gryphonPatrol.ts` (factory sig),
`store/usePotionRushStore.ts` (difficulty/startGame sig).

---

## Severity legend
- **Critical** — broken/incorrect behavior in shipped path, data loss, or duplicate progress writes.
- **High** — significant correctness, integration, or portability defect; likely user-visible.
- **Medium** — quality/maintainability/perf/a11y issue that should be fixed before broad rollout.
- **Low** — minor polish, dead code, naming, cosmetic.
- **Info** — observation / cross-cutting note.

---

## Cross-cutting findings

### F-GAMES-B28-001 — Leaderboard/progress never recorded for any game in this batch — High
`GameEndScreen` only calls `recordSession(...)` when **both** `gameId` and `gameName`
props are supplied (`GameEndScreen.tsx:98-102`). None of the four games in this batch
pass `gameId`/`gameName`/`showLeaderboardLink`:
- Griffin: `GriffinSkyJoustGame.tsx:258-271`
- Gryphon: `GryphonPatrolGame.tsx:330-354`
- Haunted Library: `HauntedLibraryGame.tsx:152-164`
- Labyrinth: `LabyrinthGoblinKingGame.tsx:378-399`
- Potion Rush: `PotionRushGame.tsx:327-352`

Consequence: XP is reported up via `onComplete`, but the shared leaderboard hook
(`useLeaderboard.recordSession`) is never invoked, so these games will not appear on the
leaderboard and the "View Leaderboard" link is suppressed. This is a shared-runtime
integration gap that affects every game in the batch.

### F-GAMES-B28-002 — Inconsistent `onComplete` result contracts across games — High
The host app must consume a single, predictable result shape. This batch ships at least
four divergent shapes:
- Griffin: `{ xp, accuracy }` (`GriffinSkyJoustGame.tsx:24-27`)
- Labyrinth: `{ xp, accuracy }` (`LabyrinthGoblinKingGame.tsx:25-28`)
- Gryphon: `{ xp, accuracy, difficulty, score }` (`GryphonPatrolGame.tsx:25`)
- Haunted Library: `{ xp, accuracy, correctAnswers, totalAttempts }` (`HauntedLibraryGame.tsx:26-31`)
- Potion Rush: `{ xp, accuracy, difficulty, score }` (`PotionRushGame.tsx:21-26`)

Griffin/Labyrinth omit `score` and `difficulty`, so the host cannot persist score or the
chosen difficulty for those two. Importability into Reading/Primary is harder because the
caller must branch per game. Recommend a shared result type.

### F-GAMES-B28-003 — Canvas games expose no accessible text alternative — Medium
All gameplay is rendered to a Konva `<canvas>` with emoji HUD elements
(`❤️`, `🦅`, `🏇` — e.g. `GriffinSkyJoustGame.tsx:360,402,419`;
`LabyrinthGoblinKingGame.tsx:347`). Canvas content is opaque to screen readers and there
is no ARIA live region / off-screen text mirror of the target word, score, or lives.
`getEffectiveTextSize` is wired (good for low-vision scaling) but does not address
screen-reader users. Cross-cutting a11y limitation for the whole batch.

### F-GAMES-B28-004 — Two distinct `VirtualDPad` components used inconsistently — Medium
Haunted Library imports `@/components/ui/VirtualDPad` (`HauntedLibraryGame.tsx:19`) while
Labyrinth imports `@/components/games/ui/VirtualDPad` (`LabyrinthGoblinKingGame.tsx:20`).
Both paths exist on disk. Divergent shared controls increase maintenance surface and risk
inconsistent touch UX/touch-target sizing between games.

### F-GAMES-B28-005 — Hardcoded host-app routes break importability — Medium
- Labyrinth `onExit` hardcodes `window.location.href = '/student/games'`
  (`LabyrinthGoblinKingGame.tsx:396`).
- Potion Rush `onExit` hardcodes `router.push("/")` (`PotionRushGame.tsx:350`).

These assume the advantage-games app routing; when imported into Reading/Primary the exit
targets will be wrong. Exit navigation should be delegated to a prop/callback.

---

## File-by-file findings

### 1. griffin-sky-joust/GriffinSkyJoustGame.tsx

- **F-GAMES-B28-006 — Placeholder/semantically-wrong sound effects — Medium.**
  `playSound('bubbling')` is used for the wing flap (`:167`, comment says "Placeholder"),
  `'cash-register'` for collecting a word (`:143`), and `'angry-grunt'` for taking a hit
  (`:146`). These are mismatched to an aerial-combat theme and the flap sound is explicitly
  a placeholder. Audio readiness gap.
- **F-GAMES-B28-007 — Dead/no-op emoji ternary — Low.**
  `:419` `text={gameState.player.vy < 0 ? "🦅" : "🦅"}` returns the same emoji for both
  branches (comment: "Change emoji for flap animation later"). Dead conditional.
- **F-GAMES-B28-008 — User-visible typo "Joustred" — Low.**
  `:268` custom stat label `'Words Joustred'`. Should be "Jousted". Visible on the end screen.
- **F-GAMES-B28-009 — End-detection effect reads ref, deps key on state status — Medium.**
  `:117-133` the victory/defeat effect reads `gameStateRef.current` but its dependency array
  is `[gameState?.status, gamePhase, playSound]`. Mixing a ref read with a state-derived dep
  is fragile; if a status transition is produced inside a tick whose status equals a prior
  rendered status string the effect can miss/mis-time. Works today but brittle.
- **F-GAMES-B28-010 — No `score`/`difficulty` in result — High.** See F-GAMES-B28-002.
  `accuracy`/`xp` only (`:128-129`), although `score` is displayed on the end screen (`:260`).
- **F-GAMES-B28-011 — Flap on `onMouseDown`+`onTouchStart` may double-fire on hybrid
  devices — Low.** `:287-288` both handlers bound; touch devices that also synthesize mouse
  events could register two flaps per tap. Minor gameplay imprecision.
- **F-GAMES-B28-012 — No test included in this batch for the component — Info.**
  A sibling `GriffinSkyJoustGame.test.tsx` exists in the directory but is **not** in the batch
  file list, so test coverage/quality for this game could not be assessed here. (Limitation.)

### 2. griffin-sky-joust/index.ts
- **F-GAMES-B28-013 — `export *` barrel re-exports internal types — Low.**
  `:1` `export * from './GriffinSkyJoustGame'` re-exports `GriffinSkyJoustGameResult`,
  `GriffinSkyJoustGameProps` is not exported but the wildcard leaks any future internal
  export. Other games in the batch use explicit named exports (e.g. labyrinth index.ts).
  Prefer explicit exports for a stable public surface.

### 3. gryphon-patrol/GryphonPatrolGame.test.tsx
- **F-GAMES-B28-014 — False-coverage tests: victory/defeat never exercised — High (test
  quality).** Tests named `"renders GameEndScreen on victory"` (`:105-112`) and
  `"renders GameEndScreen on defeat"` (`:114-121`) only click Start and assert the
  `konva-stage` exists; they never drive the game to `won`/`lost` and never assert an end
  screen. These tests pass regardless of end-screen behavior — misleading coverage.
- **F-GAMES-B28-015 — Loop-body test asserts nothing meaningful — Medium (test quality).**
  `:123-143` captures the rAF callback and invokes it once but makes no assertion on the
  resulting state, score, or `onComplete`; it exists only to mark the loop body "covered".
- **F-GAMES-B28-016 — Global rAF mutated then spied — Low.** `:10-12` assign
  `global.requestAnimationFrame = mockRaf` and later `jest.spyOn(window, ...)`; mixing global
  reassignment and spy can leak across tests if `mockRestore` is missed. `:142` restores in
  one test only.

### 4. gryphon-patrol/GryphonPatrolGame.tsx
- **F-GAMES-B28-017 — `onComplete` can fire repeatedly (duplicate XP/score) — Critical.**
  `:98-117` the completion effect has no `hasReported` guard. Its dependency array includes
  many fields that keep changing (`gameState.score`, `collectedWords.length`,
  `player.hp`, `time`, …). While the game loop continues to run after `status` becomes
  `'won'`/`'lost'` (the loop only stops because `tickGryphonPatrol` presumably freezes state),
  any post-end state mutation that changes a dep re-invokes `onComplete`, double-submitting
  XP/score. Other games in this batch guard with `hasReportedRef` (e.g. Griffin `:40,153-156`,
  Labyrinth `:43,143-148`); this one does not.
- **F-GAMES-B28-018 — Only the first vocab item is used; rest of list ignored — High.**
  `:29-31` and `:120` build state from `vocabList[0]?.term?.split(' ')` only. The remaining
  sentences in `vocabList` are silently discarded, so a multi-sentence assignment plays a
  single sentence. Importability/learning-coverage defect.
- **F-GAMES-B28-019 — Division-by-zero → `NaN` accuracy when sentence empty — Medium.**
  `:337` and `:350` compute `collectedWords.length / sentence.length` directly (no guard);
  with an empty/whitespace `term`, `sentence.length === 0` yields `NaN`. `GameEndScreen`
  sanitizes via `Number.isFinite` (`:90-92`), so it is mitigated downstream, but the raw value
  passed in is still `NaN`.
- **F-GAMES-B28-020 — No-op Exit buttons — Medium.** `:339,352` `onExit={() => {}}`. The
  Exit button renders but does nothing, a dead UX affordance.
- **F-GAMES-B28-021 — Player drawn twice (redundant overlapping Rects) — Low.**
  `:253-266` two `<Rect>`s render the player at offset and centered positions; appears to be
  leftover/duplicate sprite geometry.
- **F-GAMES-B28-022 — Fullscreen not exited on unmount — Medium.** `:90-96` enters/exits
  fullscreen on status change but the effect has no cleanup; unmounting mid-play (navigation)
  can leave the document in fullscreen. Griffin handles this in its loop cleanup (`:110`).
- **F-GAMES-B28-023 — Uses `clientWidth/clientHeight` + window resize instead of
  ResizeObserver — Low.** `:40-52` will not react to container-only size changes
  (sidebars, fullscreen API resize without a window resize event); other games use
  `ResizeObserver`. Inconsistent and slightly less robust.

### 5. haunted-library/HauntedLibraryGame.test.tsx
- **F-GAMES-B28-024 — `onComplete` end-path asserted only by stage presence — Medium
  (test quality).** `"calls onComplete when game ends"` (`:72-81`) never drives the game to
  an end and never asserts `onComplete` was called — the test name overstates what it checks.
- **F-GAMES-B28-025 — Good targeted tests for difficulty selector — Info (positive).**
  `:117-134` actually assert combobox value changes and default. This is higher quality than
  the gryphon/realm-carver tests.

### 6. haunted-library/HauntedLibraryGame.tsx
- **F-GAMES-B28-026 — Side effect (`endGame`) invoked inside `setGameState` updater —
  High.** `:71-78` calls `endGame(nextState)` (which calls `setGamePhase` + `onComplete`)
  from within the state-updater function. Updaters must be pure; under React 18 StrictMode
  the updater may run twice in dev, and triggering `onComplete`/another setState from inside a
  setter is an anti-pattern that can double-fire or cause "cannot update during render"
  warnings. Should compute end transition in an effect keyed on `gameState.phase`.
- **F-GAMES-B28-027 — Stage is fixed-size, not responsively scaled → mobile overflow —
  High.** `:172` `<Stage width={GAME_WIDTH} height={GAME_HEIGHT}>` with no `scaleX/scaleY`
  and no dimension measurement. Unlike every other game in the batch (which scale to a
  measured container), this renders at a fixed pixel size inside a `min-h-[600px]` flex box.
  On a 390px-wide phone a wider `GAME_WIDTH` canvas will overflow/clip. Mobile-first
  requirement (per app AGENTS.md, 390×844 reference) not met here.
- **F-GAMES-B28-028 — No `score`/`difficulty` round-tripped, but extra fields differ from
  peers — Medium.** See F-GAMES-B28-002. Returns `correctAnswers`/`totalAttempts` instead of
  `score`/`difficulty`.
- **F-GAMES-B28-029 — `calculateXP(gameState)` recomputed in render — Low.** `:158` calls
  `calculateXP` during render of the end screen rather than reusing the value already computed
  in `endGame` (`:54`). Minor redundancy / risk of drift if XP fn is non-deterministic.

### 7. labyrinth-goblin-king/LabyrinthGoblinKingGame.test.tsx
- **F-GAMES-B28-030 — Several tests assert only start-screen presence — Medium (test
  quality).** `"has difficulty selector"`, `"has goblin type selector"`,
  `"uses default difficulty of normal"`, `"uses default goblin type of scout"`
  (`:188-206`) all assert the same `game-start-screen` testid and verify none of the claimed
  behavior (selector values/defaults). They are effectively duplicate no-assert tests because
  the start screen is mocked away (`:51-58`).
- **F-GAMES-B28-031 — Start screen + DPad fully mocked hides integration — Info.** `:40-67`
  mock `GameStartScreen`, `GameEndScreen`, and `VirtualDPad`, so the test cannot detect the
  real difficulty/goblin `<select>` wiring or DPad input plumbing. Coverage is shallow.
- **F-GAMES-B28-032 — `handles empty sentences array gracefully` is weak — Low.** `:208-211`
  asserts start screen renders with `[]`; it does not verify Start is safely a no-op
  (`resetGame` early-returns when `sentences.length === 0`, leaving `gameState` null).

### 8. labyrinth-goblin-king/LabyrinthGoblinKingGame.tsx
- **F-GAMES-B28-033 — XP computed via unsafe `as unknown as` cast on a partial object —
  Medium.** `:136` `calculateLabyrinthXP({ correctAnswers, wrongAnswers, goblinsEaten } as
  unknown as LabyrinthGoblinKingState)`. The real `calculateLabyrinthXP`
  (`labyrinthGoblinKing.ts:608-614`) only reads those three fields, so it works today, but the
  double cast defeats type safety: if the XP function later reads another field it will throw
  at runtime instead of being caught at compile time.
- **F-GAMES-B28-034 — Redundant polling interval alongside ResizeObserver — Low.** `:85-86`
  adds `setInterval(updateDimensions, 200)` for 2s on top of the `ResizeObserver`. The
  observer already covers resize; the interval is a defensive hack that causes extra layout
  reads during the first 2 seconds.
- **F-GAMES-B28-035 — Hardcoded exit route — Medium.** See F-GAMES-B28-005 (`:396`).
- **F-GAMES-B28-036 — No `score`/`difficulty` in result — High.** See F-GAMES-B28-002
  (`:25-28`; score is derived as `correctAnswers * 10` only for the end screen `:383`).
- **F-GAMES-B28-037 — `onStart` calls `resetGame()` then `startLabyrinthGoblinKing(prev)` —
  Low.** `:206-210` relies on functional-update ordering so `prev` is the freshly reset state.
  Correct under React batching, but coupling two queued setState calls this way is subtle and
  easy to break in refactors; a single derived start state would be clearer.

### 9. labyrinth-goblin-king/index.ts
- **F-GAMES-B28-038 — Clean explicit named exports — Info (positive).** `:1-2` exports the
  component and result type explicitly (contrast with Griffin's `export *`, F-GAMES-B28-013).

### 10. potion-rush/CauldronStation.tsx
- **F-GAMES-B28-039 — Image assets loaded per-mount with no `onerror`/cache — Medium.**
  `:30-48` create three `new window.Image()` on every mount; if any asset 404s, `onload`
  never fires, `count` never reaches `sources.length`, and `setImages` is never called, so the
  station permanently falls back to a grey `<Rect>` (`:142`). No error handling/logging.
  (PotionRushGame itself does add `onerror` at `:70-77`; the sub-components do not.)
- **F-GAMES-B28-040 — Drop-zone hit testing uses magic numbers — Low.** `:52-71` `trashDist
  < 70`, `y < layout.customerY + 100`, `Math.floor(x / slotWidth)`. Hardcoded radii/offsets
  tied to the 390-wide virtual layout; fragile if layout constants change.
- **F-GAMES-B28-041 — Word stack uses array index as key — Low.** `:147-149` `key={i}` for
  `currentWords` text; acceptable for static lists but can mis-reconcile if words reorder.

### 11. potion-rush/ConveyorBelt.test.tsx
- **F-GAMES-B28-042 — Single shallow render test only — Medium (test quality).** `:58-77`
  the only test sets store state and asserts `konva-group` count `> 0`. No assertions on belt
  movement, drag/drop routing (`checkDropZone`), or ingredient rendering. Drag logic (the core
  of the component, `:127-203`) is untested.

### 12. potion-rush/ConveyorBelt.tsx
- **F-GAMES-B28-043 — `dragBoundFunc` prop accepted but never used — Low.** Declared in
  `ConveyorBeltProps` (`:16`) and passed by the parent (`PotionRushGame.tsx:305`) but never
  applied to any draggable node — dead prop / misleading API.
- **F-GAMES-B28-044 — Independent rAF loop for belt animation — Medium (perf).** `:53-74`
  runs a second `requestAnimationFrame` loop (separate from the main game tick in
  `PotionRushGame`) purely to animate `beltOffset` via `setState` each frame. This forces a
  full React re-render of the belt every frame and is an extra rAF loop competing with the
  main loop and `TrashPortal`'s interval. Consider deriving offset from game time inside the
  single tick.
- **F-GAMES-B28-045 — Drag end resets to hardcoded `y(20)` — Low.** `:168-169` sets
  `e.target.x(item.x); e.target.y(20)` regardless of the item's true rest Y, relying on
  group-relative coordinates; brittle if belt geometry changes.

### 13. potion-rush/CustomerQueue.test.tsx
- **F-GAMES-B28-046 — Two shallow render tests; no behavior asserted — Medium (test
  quality).** `:54-83` only assert group presence for "has customers" and "empty queue".
  Patience bar, speech bubble translation, sprite-sheet cropping, and the `LEAVING_*` opacity
  states are unverified.

### 14. potion-rush/CustomerQueue.tsx
- **F-GAMES-B28-047 — `skeleton` shares orc's sprite cell (asset collision) — Low.**
  `CUSTOMER_ASSETS` maps `skeleton: { sheetKey: 'sheet1', row: 0 }` (`:18`), identical to
  `orc` (`:12`). Skeleton customers will render as orcs — content/asset bug.
- **F-GAMES-B28-048 — Sprite crop assumes a rigid 3×3 sheet — Low.** `:80-100` derive cell
  size as `sheet.width/3` / `sheet.height/3` and index columns by happy/angry state. Any sheet
  not exactly 3×3 produces misaligned crops; no validation.
- **F-GAMES-B28-049 — Per-mount image load without `onerror` — Medium.** Same pattern as
  F-GAMES-B28-039 (`:27-46`); missing asset → permanent grey-rect fallback (`:103`).
- **F-GAMES-B28-050 — Customer speech bubble shows only `translation` — Info.** `:114-123`
  renders `customer.request.translation`. Ensure this is the intended prompt language for
  Reading/Primary import (no source `term` shown to disambiguate). Age-appropriateness OK
  (fantasy customers), but verify localization expectations.

### 15. potion-rush/PotionRushEffectsLayer.tsx
- **F-GAMES-B28-051 — Deterministic seeded particles, `listening={false}` — Info
  (positive).** `:49-52` seeded RNG yields SSR-stable, hydration-safe output and all particles
  disable hit detection (`:100,119,134`) for performance. Good practice.
- **F-GAMES-B28-052 — Particle count fixed regardless of reduce-motion — Medium (a11y).**
  `EFFECT_CONFIG` counts (10–12) are always rendered; the layer does not consult
  `useAccessibilitySettings().reduceMotion`. Users who request reduced motion still get full
  particle bursts. (The settings hook exposes `reduceMotion` per the test mocks.)

### 16. potion-rush/PotionRushGame.test.tsx
- **F-GAMES-B28-053 — `onComplete`/game-over path not actually tested — Medium (test
  quality).** `"calls onComplete when game ends"` (`:225-237`) only asserts the stage renders;
  the game is never driven to `GAME_OVER`, so `onComplete` invocation and the XP/accuracy
  payload are unverified.
- **F-GAMES-B28-054 — `waitForAssetsToLoad` helper waits on non-existent "loading" text —
  Low.** `:135-142` waits for `queryByText(/loading/i)` to be absent, but the component never
  renders a "loading" string; the assertion is vacuously true and the helper effectively just
  advances timers.

### 17. potion-rush/PotionRushGame.tsx
- **F-GAMES-B28-055 — Game state lives in a module-level Zustand singleton — High
  (importability/multi-instance).** `usePotionRushStore` (`:3`, used throughout) is a global
  store. Rendering two Potion Rush instances on one page (or remounting without full reset)
  shares/clobbers state. The component mitigates with `reset()` on unmount (`:181-183`) and on
  start, but concurrent instances are not isolated. Other games in the batch keep state in
  `useState` (component-local), which is safer for embedding into Reading/Primary.
- **F-GAMES-B28-056 — `accuracy` derived from reputation, not answer correctness — Medium
  (scoring semantics).** `:106,338` accuracy = `clamp(reputation,0,100)/100`. Reputation is a
  health-like resource, not a measure of correct vs. attempted answers, so the "accuracy"
  reported to progress tracking is not comparable to other games' real accuracy. Cross-game
  analytics will be skewed.
- **F-GAMES-B28-057 — GAME_OVER `onComplete` effect lacks a reported-once guard — Medium.**
  `:101-111` fires `onComplete` whenever the effect deps change while `gameState ===
  'GAME_OVER'`. Post-over store mutations to `score`/`reputation`/`totalXpEarned` would
  re-trigger. Less severe than gryphon (state is typically frozen at game over) but still
  unguarded.
- **F-GAMES-B28-058 — Dual-ref assignment via mutable cast — Low.** `:189-192` writes the
  same node into both `containerRef` and `fsContainerRef` using `as MutableRefObject` casts.
  Works, but mutating a ref returned by `useGameFullscreen` is fragile if that hook ever
  switches to a callback ref.
- **F-GAMES-B28-059 — `console.error` on asset load failure in production path — Low.**
  `:71` logs to console; per repo observability guidance, prefer structured logging and avoid
  free-form console logging in production code.
- **F-GAMES-B28-060 — Hardcoded exit route `router.push("/")` — Medium.** See
  F-GAMES-B28-005 (`:350`).
- **F-GAMES-B28-061 — Win/lose framed only by reputation threshold — Info.** `:329`
  `status={reputation <= 0 ? "defeat" : "victory"}`. Any non-zero reputation at game end is a
  "victory" even if the player served few customers — verify this matches intended
  age-appropriate success criteria.

### 18. potion-rush/PotionRushSoundController.tsx
- **F-GAMES-B28-062 — Imperative store subscription for SFX — Info.** `:21-50` subscribes to
  the whole store and compares prev/next via refs. Reasonable pattern, but it fires on *every*
  store update; on large states this runs the comparator each tick. Low risk given small
  state. No cleanup issues (`:52` unsubscribes).
- **F-GAMES-B28-063 — Initial sound on first transition may be missed — Low.** `:14-19` seeds
  refs from `getState()` at mount; any state change between render and effect run is not
  diffed. Edge case only.

### 19. potion-rush/TrashPortal.tsx
- **F-GAMES-B28-064 — Animation interval runs unconditionally (no game-state gate) — Medium
  (perf).** `:9-11` `useInterval(... , 50)` ticks `setTimeMs` every 50ms for the entire
  lifetime of the component regardless of `gameState`. This causes a React re-render of the
  portal 20×/sec even on the start screen / after game over, in addition to the belt rAF loop
  (F-GAMES-B28-044) and the main game loop. Should pause when not `PLAYING`.
- **F-GAMES-B28-065 — "TRASH" label is untranslated literal — Low.** `:39` hardcoded English
  `text="TRASH"`; the rest of Potion Rush uses `useScopedI18n`. Localization gap for
  non-English imports.

### 20. realm-carver/RealmCarverGame.test.tsx
- **F-GAMES-B28-066 — Tests admit they assert nothing about end/`onComplete` — High (test
  quality).** Comments at `:81-83,94-96` explicitly state "we just verify the game renders
  without crashing" and "onComplete may or may not be called". `"renders the end screen when
  game ends"` and `"calls onComplete when the game ends"` (`:73-97`) never end the game and
  never assert the end screen or callback — false-coverage tests.
- **F-GAMES-B28-067 — `"renders virtual D-pad during gameplay"` does not check the D-pad —
  Medium (test quality).** `:99-108` only asserts `konva-stage`; the comment concedes it just
  checks "doesn't crash". The named behavior (D-pad presence) is unverified, especially since
  `react-konva` is mocked and no DPad testid is queried.
- **F-GAMES-B28-068 — `any` types in Konva mock without eslint-disable — Low.** `:8-13` use
  `any` props (cf. gryphon test which adds `eslint-disable @typescript-eslint/no-explicit-any`
  at `:15`). May trip the repo lint rule.
- **F-GAMES-B28-069 — Unused imports `act`, `waitFor` — Low.** `:1` imports `act` and
  `waitFor` but neither is used in the file; likely a lint `no-unused-vars` failure.
- **F-GAMES-B28-070 — Component file not in this batch — Info (limitation).** Only the test
  is in scope; `RealmCarverGame.tsx` exists in the directory but was not in the batch list, so
  the component's correctness, scoring, and the validity of the test's selectors
  (`/Start Mapping/i`, `/0 \/ 2/`, `/Find/`) against the real component could not be verified.

---

## Test-quality summary
- **Strong:** Haunted Library difficulty-selector tests (F-GAMES-B28-025); PotionRush effects
  determinism (F-GAMES-B28-051).
- **Weak/false-coverage:** Gryphon victory/defeat & loop tests (014, 015), Labyrinth
  duplicate start-screen asserts (030), ConveyorBelt/CustomerQueue single shallow renders
  (042, 046), PotionRush onComplete path (053), Realm Carver self-admitted no-assert tests
  (066, 067). A recurring anti-pattern across the batch: "render Start → click → assert
  `konva-stage` exists" is used as a stand-in for victory/defeat/`onComplete` behavior, which
  none of those tests actually exercise. Real gameplay/end-state and `onComplete` payloads are
  largely untested because game logic libs and rAF are mocked or never advanced.

## Readiness summary (per game)
- **Griffin Sky-Joust:** Playable; placeholder audio (006), missing score/difficulty in result
  (010), no leaderboard wiring (001). Not fully ready.
- **Gryphon Patrol:** Functional risks — duplicate `onComplete` (017, Critical), single-sentence
  limitation (018), no-op exit (020), no fullscreen cleanup (022). Not ready.
- **Haunted Library:** Side-effect-in-setter (026) and non-responsive fixed Stage (027) are
  blocking for mobile readiness. Not ready.
- **Labyrinth of the Goblin King:** Mostly solid; unsafe XP cast (033), hardcoded exit (035),
  missing score/difficulty (036). Near-ready after fixes.
- **Potion Rush:** Global-store isolation (055) and reputation-as-accuracy (056) are the main
  concerns; hardcoded exit (060), unconditional portal/belt animation loops (044, 064).
  Feature-rich but needs integration hardening.

---

## Limitations
1. **Read-only review.** No code executed; findings are from static reading. Runtime behavior
   (actual frame timing, asset 404s, end-state transitions) was not observed.
2. **Game-logic libraries not in batch.** `griffinSkyJoust.ts`, `gryphonPatrol.ts`,
   `hauntedLibrary.ts`, `labyrinthGoblinKing.ts`, `realmCarver.ts`, and
   `usePotionRushStore.ts` were only spot-checked for signatures referenced by the reviewed
   files (XP functions, factory args, difficulty enums). Their internal correctness (scoring
   math, win/lose conditions, collision, difficulty scaling) is out of scope for this batch.
3. **Two components reviewed via test only.** Griffin's test (not in batch) and
   `RealmCarverGame.tsx` (not in batch) were not available for cross-checking; test-selector
   validity for Realm Carver could not be confirmed against its component.
4. **Shared components** `GameStartScreen.tsx`/`GameEndScreen.tsx`/`useLeaderboard` were read
   for contract context but are not part of this batch and were not line-audited here.
5. **No build/lint/test run.** Lint-related findings (e.g. 068, 069) are inferred from repo
   conventions, not from executing `turbo run lint`/`check-types`.

## Acceptance / closeout
This document is a review artifact only. It makes **no acceptance or closeout claims** for the
track, phase, or any task. Disposition of these findings is deferred to the track owner.
