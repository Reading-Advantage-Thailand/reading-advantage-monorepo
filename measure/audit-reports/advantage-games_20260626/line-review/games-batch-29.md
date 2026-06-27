# Line-by-Line Review — games-batch-29

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-29`
**Scope source:** `/tmp/opencode/games-batch-29` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch covers six **sentence games** (Realm Carver, Rune Forge Chamber, Shadow Gate Dungeon, Spellweaver's Run, Storm Castle Tower, Village Guardian) — their React/Konva components, barrel `index.ts` files, and most of their co-located tests — plus the shared `VirtualDPad` UI component (+ test) and one vocabulary-game test (Alchemist's Synthesis). To review the components meaningfully, the following supporting modules were read-only inspected and are cited where they explain in-scope behavior: `src/lib/games/xp.ts`, `src/lib/games/realmCarver.ts`, `src/lib/games/stormCastleTowerConfig.ts`, `src/store/useGameStore.ts`, `src/hooks/useSound.ts`, and `src/components/ui/VirtualDPad.tsx` (the *second*, divergent copy).
**Finding ID scheme:** `F-GAMES-B29-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Kind | Notes |
|---|------|------|-------|
| 1 | `sentence/realm-carver/RealmCarverGame.tsx` | Component (350 LOC) | Qix/territory-carver; rAF loop |
| 2 | `sentence/realm-carver/index.ts` | Barrel | `export * from "./RealmCarverGame"` |
| 3 | `sentence/rune-forge-chamber/RuneForgeChamberGame.test.tsx` | Test (Jest) | 8 tests |
| 4 | `sentence/rune-forge-chamber/RuneForgeChamberGame.tsx` | Component (453 LOC) | Tap-circles forge |
| 5 | `sentence/rune-forge-chamber/index.ts` | Barrel | named export |
| 6 | `sentence/shadow-gate-dungeon/ShadowGateDungeonGame.test.tsx` | Test (Jest) | 5 tests |
| 7 | `sentence/shadow-gate-dungeon/ShadowGateDungeonGame.tsx` | Component (482 LOC) | Stealth collect; DPad+keys |
| 8 | `sentence/shadow-gate-dungeon/index.ts` | Barrel | named export + type |
| 9 | `sentence/spellweavers-run/SpellweaversRunGame.test.tsx` | Test (Jest) | 7 tests |
| 10 | `sentence/spellweavers-run/SpellweaversRunGame.tsx` | Component (438 LOC) | 3-lane runner |
| 11 | `sentence/spellweavers-run/index.ts` | Barrel | named export + type |
| 12 | `sentence/storm-castle-tower/StormCastleTowerGame.test.tsx` | Test (Jest) | 13 tests |
| 13 | `sentence/storm-castle-tower/StormCastleTowerGame.tsx` | Component (483 LOC) | Grid climb; HTML touch buttons |
| 14 | `sentence/storm-castle-tower/index.ts` | Barrel | named export + type |
| 15 | `sentence/village-guardian/VillageGuardianGame.test.tsx` | Test (Jest) | 13 tests |
| 16 | `sentence/village-guardian/VillageGuardianGame.tsx` | Component (515 LOC) | Snake-trail rescue; DPad+keys |
| 17 | `sentence/village-guardian/index.ts` | Barrel | named export + type |
| 18 | `ui/VirtualDPad.test.tsx` | Test (Jest) | 3 tests |
| 19 | `ui/VirtualDPad.tsx` | Component (113 LOC) | Virtual analog stick |
| 20 | `vocabulary/alchemists-synthesis/AlchemistsSynthesisGame.test.tsx` | Test (Jest) | 4 tests (component NOT in batch) |

---

## Cross-Reference Verification Performed (read-only)

- **Two divergent `VirtualDPad` components exist on disk.** `src/components/games/ui/VirtualDPad.tsx` (file 19, this batch) and `src/components/ui/VirtualDPad.tsx` are **not identical** (confirmed via `diff`). The batch copy is the *older* version (plain closures, no `useCallback`/`React.memo`, lighter styling); the other copy is memoized with a callback ref. 6 game components import the batch copy and 6 import the other. RealmCarver (file 1, line 17) imports `@/components/ui/VirtualDPad` (the memoized one, **not** the batch file), while Shadow Gate (file 7) and Village Guardian (file 16) import `@/components/games/ui/VirtualDPad` (the batch file). See F-GAMES-B29-001.
- **Storm Castle difficulty keys mismatch.** `src/store/useGameStore.ts:9` defines `Difficulty = 'easy' | 'normal' | 'hard' | 'extreme'`. `stormCastleTowerConfig.ts:46-49` is keyed `easy/normal/hard/extreme`. But the Storm Castle `<select>` (file 13, lines 240-242) offers values `easy/medium/hard` and defaults state to `'normal'` (line 39). `'medium'` is not a valid `Difficulty` and not a config key; `'normal'`/`'extreme'` have no `<option>`. See F-GAMES-B29-002.
- **`xp.ts` signature** is `calculateXP(score, correctAnswers, totalAttempts)` and ignores `score` (`xp.ts:1-12`). Storm Castle (file 13, line 140) calls `calculateXP(correctWords, correctWords, totalAttempts)`. Confirmed.
- **`useSound`** supports only `'success' | 'error' | 'missile-hit' | 'bubbling' | 'clinking' | 'angry-grunt' | 'cash-register'` (`useSound.ts:14`). RealmCarver only uses `success`/`error` (confirmed valid).
- **`realmCarver.calculateXP`** is an object-param function (`realmCarver.ts:300`), distinct from `xp.ts`. RealmCarver imports the former (file 1 line 8). Confirmed.

---

## Shared / Cross-Cutting Findings

### F-GAMES-B29-001 · High · Duplicated, **divergent** `VirtualDPad` implementations — files 1, 7, 16, 19
The batch ships `components/games/ui/VirtualDPad.tsx` (file 19) while a second, behaviorally and stylistically different `components/ui/VirtualDPad.tsx` also exists. Six games consume each. This is a maintenance and consistency hazard: a fix to drag-snapping, the dead-zone (`distance < 5`, file 19 line 57), or the `0.2`/`0.8` thresholds (lines 74-79) only lands in half the games. The two copies already differ in input plumbing (the other copy routes `onInput` through a ref to avoid stale closures; file 19 captures `onInput` directly in `updateInput`/`handleEnd`, lines 46/59/81) and in styling (opacity/colors). Players get a different control feel and look depending on which game they open. There should be exactly one shared D-Pad. (No single owning module can be edited to fix this without consolidation.)

### F-GAMES-B29-002 · High · Storm Castle difficulty selector is broken — file 13 (lines 39, 240-242, 247-255)
Three compounding defects:
1. Default state is `useState<Difficulty>('normal')` (line 39) but no `<option value="normal">` exists (options are `easy`/`medium`/`hard`, lines 240-242). A controlled `<select value="normal">` with no matching option renders an inconsistent/empty selection and emits a React warning.
2. `value="medium"` (line 241) is **not** a member of `Difficulty` (`useGameStore.ts:9`) and **not** a key in `stormCastleTowerConfig.difficulties` (`easy/normal/hard/extreme`). Selecting "Knight's Keep" casts `'medium' as Difficulty` (line 237) and downstream config lookup falls back to `normal` (`stormCastleTowerConfig.ts:60`), so the chosen difficulty silently does nothing.
3. `extreme` (a valid config tier with `wordCount: 7`) is unreachable from the UI.
Net: the difficulty control is partly cosmetic and partly non-functional. This also makes the test at file 12 lines 116-120 (`expect(selects[0]).toHaveValue('medium')`) suspect — it asserts a default the state never sets; see F-GAMES-B29-015.

### F-GAMES-B29-003 · High · Konva fills set to CSS gradient / SVG `url()` strings render incorrectly — files 7, 10
Konva `fill` accepts a solid color or a Konva gradient config, **not** a CSS `linear-gradient(...)` string or an SVG `url(#id)` reference.
- Spellweaver's Run (file 10, line 282): `fill="linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%)"`.
- Shadow Gate (file 7, lines 283-289): a full-canvas `Rect` with `fill="url(#dungeonGradient)"` while no `<defs>`/gradient is ever defined.
In both cases Konva will fail to parse the value and the intended background gradient will not paint (typically transparent/black), so the visual design silently degrades across browsers. These are real rendering defects, not cosmetics.

### F-GAMES-B29-004 · Medium · Hard-coded `window.location.href = "/student/games"` blocks importability — files 1, 4, 7, 16 (and Spellweaver's via line 432)
Every "Exit" handler does a full-page navigation to a literal `'/student/games'` (RealmCarver line 344; RuneForge line 447; ShadowGate line 476; Spellweaver line 432; Village Guardian line 509). This bypasses the Next.js router, ignores `basePath`/locale prefixes, and assumes the host app exposes that exact route. When these components are imported into Reading/Primary (a stated goal of the track), the exit button will break or escape the host's routing. Exit should be an injected callback/prop, not a hard-coded location assignment. (Storm Castle, file 13, notably has **no** `onExit` wired — see F-GAMES-B29-013 — an inconsistency of the same theme.)

### F-GAMES-B29-005 · Medium · Inconsistent `onComplete` result contracts across sibling games
Result payloads differ game-to-game: RealmCarver emits `{ xp, accuracy }` (file 1 line 25); RuneForge `{ xp, accuracy }` (file 4 line 23); ShadowGate `{ xp, accuracy }`; Storm Castle `{ xp, accuracy }`; **Spellweaver's adds `difficulty`** (`SpellweaversRunGameResult`, file 10 lines 22-26). A host integrating multiple games must special-case each shape. For importability a single shared result contract (xp, accuracy, difficulty, score, durationMs…) is expected. Several games also feed `score`/`xp` into `GameEndScreen` using different formulas than what `onComplete` reports (see F-GAMES-B29-006).

### F-GAMES-B29-006 · Medium · End-screen XP/score disagree with reported XP/score — files 1, 10
- RealmCarver: `onComplete` reports `calculateXP({...})` (file 1 lines 155-162) but the on-screen `GameEndScreen` shows `xp={Math.floor(gameState.score / 10)}` (line 337) — two different XP numbers for the same run.
- Spellweaver's: `GameEndScreen score={totalCorrect * 10}` (file 10 line 420) while `onComplete` accuracy/xp derive from `totalAttempts`/`calculateSpellweaversRunXP` (lines 137-139). The number a learner sees is not the number persisted.
This is a scoring-integrity/trust concern: displayed and recorded values must match.

### F-GAMES-B29-007 · Medium · `<select>` controls lack accessible labels — files 10, 13
Shadow Gate (file 7) and Village Guardian (file 16) give their selects `aria-label`, and Rune Forge (file 4) uses a proper `htmlFor`/`id` pair — good. But **Spellweaver's Run** (file 10 lines 245-253) renders a bare `<select>` with only an adjacent `<span>Difficulty:</span>` and no `aria-label`/`id`, and **Storm Castle** (file 13 lines 235-255) does the same for both selects. Screen-reader users get an unlabeled combobox. The inconsistency is also why Spellweaver's test must query `getByRole('combobox')` without a name (file 9 line 125) while sibling tests can filter by name.

### F-GAMES-B29-008 · Medium · Tests named for end-state behavior never reach the end state — files 3, 6, 9, 15
Multiple tests advertise completion/defeat coverage but only assert the canvas mounted:
- RuneForge "calls onComplete when game ends" (file 3 lines 212-225) and "shows end screen after defeat" (227-238) — only assert `konva-stage` present; `onComplete` is never asserted called.
- Spellweaver's "calls onComplete when game ends" (file 9 lines 141-153) and "shows end screen after game ends" (155-165) — same.
- Village Guardian "calls onComplete when game ends" (file 15 168-180) and "shows end screen after defeat" (182-191) — same; the comment at 138-140 even admits defeat can't be triggered.
- Shadow Gate has no completion test at all.
These give false coverage signal: no test in the batch actually drives a game to victory/defeat or verifies XP/accuracy reporting, the most important behavior for a scoring system.

### F-GAMES-B29-009 · Low · Redundant resize polling alongside `ResizeObserver` — files 4, 7, 10, 13, 16
Five components run a `setInterval(updateDimensions, 200)` capped by a `setTimeout(..., 2000)` *in addition* to a `ResizeObserver` (RuneForge 94-95; ShadowGate 93-94; Spellweaver 93-94; Storm 86-87; Village 95-96). RealmCarver (file 1 lines 57-71) uses only the observer and is cleaner. The polling is a defensive hack against early zero-size reads; it wastes timers and is inconsistent across the family. Standardize on one approach.

### F-GAMES-B29-010 · Low · Type conflation: sentences cast to `VocabularyItem` — files 1, 4, 7, 10, 13, 16
Sentence games pass sentence data typed as `VocabularyItem` (`{term, translation}`): RealmCarver casts `sentences as VocabularyItem[]` for the start screen (file 1 line 179) and its prop type is `SentenceItem[]`; the other five accept `vocabulary: VocabularyItem[]` while semantically carrying full sentences. This is the recurring `VocabularyItem`/`SentenceItem` flattening flagged in earlier batches; it removes any place to attach sentence metadata (audio, source passage, word order) needed for Reading/Primary importability.

---

## Per-File Findings

### File 1 — `realm-carver/RealmCarverGame.tsx`

**F-GAMES-B29-011 · High · lines 74-120 (rAF effect re-subscribes every frame)**
The game-loop `useEffect` lists `gameState` in its dependency array (line 120). Because the loop calls `setGameState` every frame, `gameState` changes every frame, so React tears down and re-creates the entire effect (cancel + new `requestAnimationFrame`) on **every tick**. This defeats the steady rAF loop, churns closures, resets `lastFrameRef` implicitly, and can produce delta-time glitches/jank — exactly the performance smoothness the clamping at line 80 tries to protect. The sibling games keep `gameState` out of the loop deps and read it via the `setGameState` updater (e.g. Shadow Gate file 7 lines 107-126); RealmCarver should do the same.

**F-GAMES-B29-012 · Low · line 338 (unguarded division → possible `NaN` accuracy)**
`accuracy={gameState.targetWordIndex / gameState.fullSentence.length}` in `GameEndScreen` has no zero guard, unlike the `onComplete` path which guards (`fullSentence.length > 0 ? … : 0`, lines 152-154). If `fullSentence.length` is 0, the displayed accuracy is `NaN`. Also relates to F-GAMES-B29-006 (display vs reported divergence).

*Also inherits: F-GAMES-B29-004, -005, -006, -010.*

### File 2 — `realm-carver/index.ts`
**F-GAMES-B29-013-note · Info · line 1** — `export * from "./RealmCarverGame"` is a wildcard re-export; the five sibling barrels use explicit named exports (`export { X }` + `export type`). Wildcard re-exports leak internal helpers/types and weaken tree-shaking/import clarity. Minor consistency nit (no functional defect).

### File 4 — `rune-forge-chamber/RuneForgeChamberGame.tsx`

**F-GAMES-B29-014 · High · lines 147-159, 429-451 (victory state is unreachable / mislabeled)**
The end-of-game effect only fires on `status === 'defeat'` (line 149). There is no branch for a `'victory'`/win status, and the `GameEndScreen` hard-codes `status="defeat"` with title `"Rune Shattered!"` and subtitle "The forge grew too cold…" (lines 431-433). Consequently, if the underlying state machine can reach a win, the player is never transitioned out on victory (game would appear to hang), and any successful completion is presented as a defeat. Either the game genuinely has no win condition (then the "complete the sentence before the forge cools" instruction at line 201 is misleading) or the win path is unhandled. Both are readiness defects for a learning game whose point is to *succeed*.

**F-GAMES-B29-014b · Low · lines 161-167** — `enterFullscreen`/`exitFullscreen` toggle is driven purely by `gamePhase`; combined with F-GAMES-B29-014 the game can never cleanly exit fullscreen on a win. Noted as a consequence.

*Also inherits: F-GAMES-B29-004, -005, -009, -010.*

### File 3 — `rune-forge-chamber/RuneForgeChamberGame.test.tsx`

**F-GAMES-B29-015 · Medium · lines 10-38, 91-93 (over-mocking / test drift)**
The test defines an elaborate `MockImage` (lines 10-38) and mocks Konva `Image`, `Line`, `Ring` (lines 85-93), but `RuneForgeChamberGame.tsx` imports none of those Konva nodes (only `Stage, Layer, Text, Group, Rect, Circle`, file 4 line 4) and uses no `Image`. The asset-loading `waitForAssetsToLoad` helper (lines 127-133) waits for a "loading" text that the component does not appear to render. This is copy-pasted scaffolding from an image-based game; it adds complexity and can mask real behavior. *Also inherits F-GAMES-B29-008.*

### File 7 — `shadow-gate-dungeon/ShadowGateDungeonGame.tsx`

**F-GAMES-B29-016 · Low · lines 268-271, 443-447 (pointer-events + emoji in canvas)**
The `Stage` sets `pointerEvents: 'none'` (line 271); since this game is driven by keyboard/DPad and never registers Konva `onClick`/`onTap` handlers, that is acceptable — noted for confirmation. Separately, HUD text uses emoji glyphs inside Konva `Text` (`'⚠ DETECTED!'`, `'👁 Undetected'`, lines 443) which render inconsistently across browsers/fonts on canvas and won't be announced to assistive tech. Low impact. *Also inherits F-GAMES-B29-003 (gradient `url()`), -004, -005, -010.*

### File 6 — `shadow-gate-dungeon/ShadowGateDungeonGame.test.tsx`

**F-GAMES-B29-017 · Low · lines 17-19 (rAF stubbed to a no-op)**
`global.requestAnimationFrame = jest.fn(() => 1)` never invokes its callback, so the game loop never advances in tests — appropriate for preventing infinite loops, but it means no test here exercises movement, collision, detection, or completion. Combined with the absence of any end-state test (this file has only 5 tests, none for `onComplete`), gameplay logic is untested at the component layer.

### File 10 — `spellweavers-run/SpellweaversRunGame.tsx`

**F-GAMES-B29-018 · Medium · lines 174-193, 265-266 (tap handler reads `touches` on a `touchstart` only — fragile lane math)**
`handleStageClick` is bound to both `onClick` and `onTouchStart` (lines 265-266) and reads `e.touches[0].clientX` (line 181). On `touchstart` `touches` is populated so this works, but the handler does no `preventDefault`, so a tap can fire both `touchstart` and the synthesized `click`, double-invoking `handleLaneTap` and double-counting an attempt/answer (affecting accuracy/XP). The lane index is derived from `clientX`/`scale`/`laneWidth` with a 3-way clamp (lines 188-190) — reasonable — but the double-fire risk directly corrupts the scoring counters at lines 159-172.

**F-GAMES-B29-019 · Low · lines 102-103, 192 (eslint-disable masks dependency correctness)**
Two `// eslint-disable-next-line react-hooks/exhaustive-deps` (the dimensions effect and `handleStageClick`) suppress the exhaustive-deps check. The dimensions effect omits `containerRef` from deps (works because it's a stable ref) but the suppression hides that intent; pairing this with the ref-mirroring pattern (lines 49-57) suggests deliberate but undocumented stale-closure management. Worth a comment rather than a blanket disable. *Also inherits F-GAMES-B29-003, -004, -005, -006, -007, -009, -010.*

### File 9 — `spellweavers-run/SpellweaversRunGame.test.tsx`
**F-GAMES-B29-020 · Low · lines 121-130** — "displays difficulty select" asserts `getByText('Easy'/'Medium'/'Hard')`; because the select has no accessible name, the test can't target it by role+name (it uses `getByRole('combobox')` bare at line 125), which is the observable symptom of F-GAMES-B29-007. *Also inherits F-GAMES-B29-008.*

### File 13 — `storm-castle-tower/StormCastleTowerGame.tsx`

**F-GAMES-B29-021 · Medium · lines 225-230 (start uses stale state from `resetGame`)**
`onStart` calls `resetGame()` then immediately `startGame(gameState!)` (lines 226-227). `resetGame` schedules a new state via `setGameState` (asynchronous); the very next line reads the **current** `gameState` closure value — the pre-reset state — so `startGame` operates on stale data that may reflect an out-of-date difficulty/guard selection. The freshly-reset config is then overwritten by `setGameState(startedState)` (line 228). On the first interaction after changing difficulty this can start a run with the previous configuration.

**F-GAMES-B29-022 · Low · lines 263-285 (victory end-screen has no title/subtitle)**
The `GameEndScreen` in the ended branch passes `status`, `score`, `xp`, `accuracy`, and `customStats` but omits `title`/`subtitle` (unlike every sibling which supplies victory/defeat copy). A win/loss will render with whatever default the shared end screen uses, with no game-flavored messaging. Minor UX/parity gap.

**F-GAMES-B29-023 · Low · lines 447-480 (touch D-Pad uses `onTouchStart` only — no keyboard/ARIA, no continuous move)**
Storm Castle rolls its own HTML buttons instead of `VirtualDPad`. They fire on `onTouchStart` only (no `onClick`/`onPointerDown`), so on a mouse/desktop or assistive activation they do nothing; they are `<button>`s with icon-only content and no `aria-label`, so screen readers announce nothing meaningful. This is a third distinct movement-control implementation in the family (DPad-A, DPad-B, and these buttons), worsening F-GAMES-B29-001's consistency problem.

**F-GAMES-B29-024 · Low · line 140** — `calculateXP(correctWords, correctWords, totalAttempts)` passes `correctWords` as both `score` and `correctAnswers`; `xp.ts` ignores `score` (verified), so it's harmless today, but the duplicated argument signals the call site doesn't match the helper's contract and will silently misbehave if `xp.ts` ever uses `score`. *Also inherits F-GAMES-B29-002, -004 (note: no `onExit`), -005, -007, -009, -010.*

### File 12 — `storm-castle-tower/StormCastleTowerGame.test.tsx`

**F-GAMES-B29-025 · Medium · lines 109-120 (tests encode the broken difficulty contract)**
`'uses medium difficulty by default'` asserts `selects[0]` has value `'medium'`, and `'changes difficulty'` sets `'hard'`. But the component initializes difficulty to `'normal'` (file 13 line 39) and `'medium'` is not a valid `Difficulty`. The test therefore either passes by coincidence of jsdom select fallback behavior or fails — in both cases it documents/relies on the broken selector (F-GAMES-B29-002) rather than catching it. A correct test would assert the default is a valid tier and that selecting a tier changes the spawned word count.

**F-GAMES-B29-026 · Low · lines 40-42, 77-84 ("exits fullscreen when game ends" never ends the game)**
The mock for `@/lib/games/xp` returns a constant 5, and the test titled "exits fullscreen when game ends" only verifies `mockEnterFullscreen` was called (line 83) — it never triggers an end, so it does not test what its name claims. Misleading coverage (same class as F-GAMES-B29-008).

### File 16 — `village-guardian/VillageGuardianGame.tsx`

**F-GAMES-B29-027 · Medium · lines 130-141, 491-503 (only `defeat` ends the game; end screen always says "Village Overrun!")**
Like Rune Forge, the end effect fires only on `status === 'defeat'` (line 131) and the `GameEndScreen` hard-codes `status="defeat"`, title `"Village Overrun!"` (lines 493-494). If the state machine can reach a victory/cleared-level state, it is never surfaced as a win — the player can apparently only lose. For a defend-the-village learning game this removes the positive-reinforcement win path. Confirm whether `villageGuardian` exposes a victory status; if so it's unhandled, if not the design is loss-only.

**F-GAMES-B29-028 · Low · lines 127-128 (ref written during render)**
`const gameStateRef = useRef(gameState); gameStateRef.current = gameState` assigns to a ref directly in the render body (line 128) rather than in an effect. It works in practice but is a React anti-pattern (side effect during render, problematic under concurrent features). The sibling games mirror refs inside `useEffect` (e.g. Spellweaver file 10 lines 54-57). *Also inherits F-GAMES-B29-004, -005, -009, -010.*

### File 15 — `village-guardian/VillageGuardianGame.test.tsx`
**F-GAMES-B29-029 · Low · lines 204** — `expect(document.querySelector('.absolute.bottom-4')).toBeInTheDocument()` asserts the D-Pad by CSS class selector, coupling the test to a Tailwind class string; a styling refactor (e.g. `bottom-6`) breaks the test with no behavioral change. Prefer a `data-testid`/role. *Also inherits F-GAMES-B29-008.*

### File 19 — `ui/VirtualDPad.tsx`

**F-GAMES-B29-030 · Medium · lines 46, 59, 81 (stale `onInput` closure) + lines 84-95 (no keyboard/ARIA)**
`updateInput` and `handleEnd` close over the `onInput` prop captured at render (lines 46/59/81). Because none of the handlers are memoized and the component is re-created each render, the latest `onInput` is normally used; however, the *other* copy of this component deliberately routes through an `inputCallbackRef` to guarantee freshness, indicating a known stale-closure risk this copy does not guard. More importantly, the control is a `<div>` with mouse/touch handlers only — it has no `role`, no `tabIndex`, no keyboard handling, and no `aria-label`. It is entirely inaccessible to keyboard and screen-reader users. Games that rely on it for movement and *don't* also bind window keyboard listeners (this is per-game) leave keyboard-only players unable to move. Given the platform serves children including those needing assistive tech (age-appropriate/accessibility focus of this track), the missing keyboard affordance on the primary movement control is a real gap.

**F-GAMES-B29-031 · Low · lines 37-40, 49-82 (mouse drag stops updating once cursor leaves the 128px pad; `onMouseLeave` ends input)**
`handleMouseMove` only fires while the pointer is over the 128×128 element, and `onMouseLeave` calls `handleEnd` (line 93), so a fast drag that exits the small pad immediately zeroes input. There are no window-level `mousemove`/`mouseup` listeners, so desktop drag control is jittery. Touch is unaffected (touch events keep targeting the origin element). Minor UX.

### File 18 — `ui/VirtualDPad.test.tsx`

**F-GAMES-B29-032 · Medium · lines 21-35 (weak assertion — direction sign untested)**
The "dragged right" test moves the pointer +50px in X and asserts only `expect.objectContaining({ dx: expect.any(Number) })` (line 34) — it does not assert `dx > 0` or `dx === 1`, so the test would pass even if the D-Pad reported the wrong direction (or `dx: 0`). The snapping thresholds (`0.2`/`0.8`, file 19 lines 74-79), the dead-zone (`distance < 5`, line 57), diagonal handling, and **all touch events** are untested. For the single shared movement control this is thin coverage of the most failure-prone logic.

### File 20 — `vocabulary/alchemists-synthesis/AlchemistsSynthesisGame.test.tsx`

**F-GAMES-B29-033 · Low · lines 96-113 ("handle option selection" asserts nothing about the result)**
The test clicks the first `konva-group` (line 111) but makes no assertion afterward — it only verifies groups exist (line 108). It exercises a click path without checking score/selection/feedback, so it cannot catch a regression in option handling. The component under test (`AlchemistsSynthesisGame.tsx`) is **not** part of this batch, so its production code was not reviewed; this finding is limited to the test's value. The i18n mock returning keys means assertions like `getByText("title")` (line 64) test the mock, not real copy.

---

## Cross-Cutting Themes

| Theme | Findings | Severity |
|-------|----------|----------|
| Two divergent `VirtualDPad` copies (+ Storm's third bespoke control) | B29-001, B29-023 | High |
| Storm Castle difficulty selector broken (`medium`/`normal`/`extreme` mismatch) | B29-002, B29-025 | High |
| Konva `fill` set to CSS-gradient / SVG `url()` strings → background won't render | B29-003 | High |
| Win/victory path unhandled; end screen always "defeat" | B29-014 (RuneForge), B29-027 (Village) | High |
| rAF loop re-subscribes every frame (`gameState` in deps) | B29-011 | High |
| Hard-coded `window.location.href` exit → not importable into Reading/Primary | B29-004 | Medium |
| Displayed XP/score ≠ reported XP/score | B29-006, B29-012 | Medium |
| Inconsistent `onComplete` result contracts | B29-005 | Medium |
| Unlabeled `<select>` / inaccessible D-Pad (no keyboard/ARIA) | B29-007, B29-030 | Medium |
| Tap double-fire corrupts scoring (no `preventDefault`) | B29-018 | Medium |
| Stale-state start in Storm Castle | B29-021 | Medium |
| Tests named for end-state never reach it / weak assertions / over-mocking | B29-008, B29-015, B29-017, B29-020, B29-026, B29-029, B29-032, B29-033 | Medium/Low |
| Redundant resize polling; ref-write-in-render; eslint-disable masking | B29-009, B29-019, B29-028 | Low |
| `VocabularyItem`/`SentenceItem` flattening | B29-010 | Low |
| Barrel export style inconsistency | B29-013-note | Info |

---

## Limitations

- **Read-only review.** No source was edited, per instructions. I did not run the Jest suites, start the Next.js dev server, render Konva to a real canvas, measure FPS/frame timing, exercise real touch/mobile input, or test across browsers. Claims about Konva `fill` parsing (F-GAMES-B29-003), the rAF re-subscription cost (F-GAMES-B29-011), jsdom `<select>` fallback behavior (F-GAMES-B29-002/-025), and the tap double-fire (F-GAMES-B29-018) are derived from reading the code and verified library/spec behavior, not from execution.
- **Game state machines and config modules were inspected but are out of batch.** The `lib/games/*` state/tick/XP modules (`realmCarver.ts`, `stormCastleTower*.ts`, `xp.ts`, etc.) and the second `VirtualDPad` copy were read only to characterize in-scope behavior; findings reference them for verification but they are not deliverables of `games-batch-29`. In particular, whether Rune Forge / Village Guardian *can* reach a victory status (F-GAMES-B29-014/-027) was inferred from the components' missing win-branches; the authoritative answer lives in their tick modules, which were not exhaustively traced.
- **`AlchemistsSynthesisGame.tsx` (the component) is not in this batch** — only its test (file 20) is. No conclusions are drawn about that component's production correctness.
- **Importability into Reading/Primary** was assessed against the monorepo/app AGENTS.md expectations (router/basePath, multi-tenant scoping, shared contracts), not against those apps' live integration points.
- Severity reflects player-facing and integration impact assuming these components are wired into a real host; some defects (e.g. broken backgrounds, exit navigation) are latent in the standalone demo.

---

*No acceptance or closeout determination is made by this report. This is a line-by-line review deliverable only; track acceptance/closeout remains the responsibility of the Measure workflow owner.*
