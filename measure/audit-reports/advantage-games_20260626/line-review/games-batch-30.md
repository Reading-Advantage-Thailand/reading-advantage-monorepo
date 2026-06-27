# Line-by-Line Review — games-batch-30

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-30`
**Scope source:** `/tmp/opencode/games-batch-30` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited. This batch contains React/Konva **game components** and their co-located tests plus shared sub-components for four vocabulary games: Alchemist's Synthesis, Archer's Revenge, Dragon Flight, Dragon Rider, and the Enchanted Library cluster (BookPickupBurst, DifficultySelector, RankingDisplay, SparkleBurst, VocabularyProgress, and the main game). To anchor findings, the game-logic libraries in `src/lib/games/` (`alchemistsSynthesis.ts`, `archersRevenge.ts`, `archersRevengeConfig.ts`, `dragonFlight.ts`, `dragonRider.ts`, `enchantedLibrary.ts`) and `src/store/useGameStore.ts` were read for verification; they are **not** in-scope files and are referenced only to characterize behavior the in-scope components import.
**Finding ID scheme:** `F-GAMES-B30-###`
**Severity scale:** Critical / High / Medium / Low / Info

---

## Files Reviewed (20/20)

| # | File | Type | Game |
|---|------|------|------|
| 1 | `alchemists-synthesis/AlchemistsSynthesisGame.tsx` | component | Alchemist's Synthesis |
| 2 | `archers-revenge/ArchersRevengeGame.test.tsx` | test | Archer's Revenge |
| 3 | `archers-revenge/ArchersRevengeGame.tsx` | component | Archer's Revenge |
| 4 | `archers-revenge/index.ts` | barrel | Archer's Revenge |
| 5 | `dragon-flight/DragonFlightGame.test.tsx` | test | Dragon Flight |
| 6 | `dragon-flight/DragonFlightGame.tsx` | component | Dragon Flight |
| 7 | `dragon-flight/RankingDialog.test.tsx` | test | Dragon Flight |
| 8 | `dragon-flight/RankingDialog.tsx` | component | Dragon Flight (shared) |
| 9 | `dragon-rider/DragonRiderGame.test.tsx` | test | Dragon Rider |
| 10 | `dragon-rider/DragonRiderGame.tsx` | component | Dragon Rider |
| 11 | `enchanted-library/BookPickupBurst.test.tsx` | test | Enchanted Library |
| 12 | `enchanted-library/BookPickupBurst.tsx` | component | Enchanted Library |
| 13 | `enchanted-library/DifficultySelector.tsx` | component | Enchanted Library |
| 14 | `enchanted-library/EnchantedLibraryGame.test.tsx` | test | Enchanted Library |
| 15 | `enchanted-library/EnchantedLibraryGame.tsx` | component | Enchanted Library |
| 16 | `enchanted-library/RankingDisplay.test.tsx` | test | Enchanted Library |
| 17 | `enchanted-library/RankingDisplay.tsx` | component | Enchanted Library |
| 18 | `enchanted-library/SparkleBurst.test.tsx` | test | Enchanted Library |
| 19 | `enchanted-library/SparkleBurst.tsx` | component | Enchanted Library |
| 20 | `enchanted-library/VocabularyProgress.test.tsx` | test | Enchanted Library |

> Note: `VocabularyProgress.tsx` (the implementation behind file 20's test) is **not** in this batch; only its test is. See Limitations.

---

## Cross-Batch Verification Performed (read-only)

- `useGameStore.ts:9` defines `Difficulty = 'easy' | 'normal' | 'hard' | 'extreme'` (no `'medium'`). Confirmed.
- `archersRevengeConfig.ts:38-76` keys every difficulty record by `easy|normal|hard|extreme`; `getDifficultySettings(d)` indexes `player.hp[difficulty]` etc. with no fallback. Confirmed.
- `alchemistsSynthesis.ts:16` types difficulty as `"easy" | "normal" | "hard"`; `getAlchemistsSynthesisResults` computes `xp = Math.floor(correctAnswers * accuracy)` (`:142`) and does not use difficulty in XP. Confirmed.
- `dragonRider.ts:23` `DragonRiderResults` is computed by `getDragonRiderResults({correctAnswers,totalAttempts,dragonCount})` — no time/difficulty argument. Confirmed.
- `RankingDialog.tsx` is imported by both Dragon Flight (file 6 line 14) and Dragon Rider (file 10 line 43) — shared leaderboard component. Confirmed.

---

## Shared-Runtime / Cross-Component Findings

### F-GAMES-B30-001 · High · Archer's Revenge "medium" difficulty is not a valid config key — file 3 (lines 35, 173–185), file 2 (lines 84–89)

`ArchersRevengeGame.tsx:173` renders difficulty buttons for `["easy", "medium", "hard"]` and `:176` sets `setSelectedDifficulty(d)` with those literals. But the shared `Difficulty` union (`useGameStore.ts:9`) and the entire `ARCHERS_REVENGE_CONFIG` (`archersRevengeConfig.ts:38-76`) are keyed `easy|normal|hard|extreme` — there is **no `"medium"`**. `createArchersRevengeState(vocabulary, { difficulty: "medium" })` → `getDifficultySettings("medium")` → `player.hp["medium"]`, `formation.rows["medium"]`, `enemy.horizontalSpeed["medium"]` all evaluate to `undefined` (`archersRevengeConfig.ts:103-110`). The result is an `ArchersRevengeState` with `undefined` HP/rows/speed — i.e. NaN-driven physics and a broken/instantly-lost game whenever a player picks the **default-looking middle option**. The initial `selectedDifficulty` is `"normal"` (`:35`), which is valid, but `"normal"` is never offered as a button, so the only way to keep a working game is to never touch the difficulty selector. The cast `(["easy","medium","hard"] as Difficulty[])` (`:173`) silences TypeScript, hiding the defect. The test at `ArchersRevengeGame.test.tsx:84-89` actively asserts the broken labels (`getByText("medium")`), so the test enshrines the bug rather than catching it. This is a genuine readiness blocker for Archer's Revenge.

### F-GAMES-B30-002 · High · Dragon Flight/Rider call `onComplete` on every state tick during boss phase, not once — file 6 (lines 864–902), file 10 (lines 776–808)

In `DragonFlightGame.tsx` the results effect (`:864-902`) calls `onComplete(nextResults)` inside an effect keyed on `state.status, state.correctAnswers, state.attempts, state.dragonCount, state.elapsedMs, ...`. During the boss sequence `state.elapsedMs` is still advancing via `advanceDragonFlightTime` (the running interval keeps ticking until status flips), and `dragonCount`/`attempts` can change, so `onComplete` fires **multiple times** as those deps change while `status === "boss"`. Dragon Rider has the same shape (`DragonRiderGame.tsx:776-808`, deps include `state.correctAnswers, state.attempts, state.dragonCount`). Unlike Archer's Revenge (file 3) and Enchanted Library (file 15), which guard with a `hasReportedRef`, these two games have **no idempotency guard** on `onComplete`. A parent that awards XP/persists progress per `onComplete` call will double-count. The co-located tests do not assert call count for `onComplete` (the Dragon Flight test passes no `onComplete`; the Dragon Rider test passes `jest.fn()` but never checks `toHaveBeenCalledTimes(1)`), so the regression is uncaught. Contrast F-GAMES-B30-013 (Archer's Revenge test *does* check `<= 1`).

### F-GAMES-B30-003 · Medium · Difficulty never affects XP/scoring across three games — file 1, file 3, file 10

- Alchemist's Synthesis: `getAlchemistsSynthesisResults` computes `xp = Math.floor(correctAnswers * accuracy)` with **no difficulty multiplier** (`alchemistsSynthesis.ts:142`), even though `maxRounds` scales with difficulty (`:28-29`). Harder play yields *more rounds* but the same per-correct XP weight.
- Dragon Rider: `getDragonRiderResults` receives no difficulty argument (`dragonRider.ts:131-135`); the `easy/medium/hard` selector only changes gate `travelMs` locally (`DragonRiderGame.tsx:605-609, 715-719`). XP is difficulty-independent.
- Dragon Flight passes `difficulty` into `getDragonFlightResults` (`DragonFlightGame.tsx:877-885`) — so it is the exception — but the *penalty/gameOverOnMiss* settings (`:183-214`) are the only difficulty effect; whether XP scales was not confirmable from this batch.

This is the recurring "difficulty is largely cosmetic to scoring" theme. For age-appropriate progression and fair leaderboards, harder difficulties should carry XP weight. The `DifficultySelector.tsx` for Enchanted Library (file 13) *advertises* `xpMultiplier` 1.0/1.5/2.0/3.0 in its tooltip (`:25,32,39,46`), but that is a display-only constant in the selector — whether `calculateEnchantedLibraryXP` honors it is owned by `enchantedLibrary.ts` (out of batch) and unverified here. If it does not, the tooltip is misleading.

### F-GAMES-B30-004 · Medium · `RankingDialog` Tabs default to `"normal"` but caller can pass difficulty lists lacking it — file 8 (lines 41, 178), file 7 (lines 133–144)

`RankingDialog.tsx:178` hardcodes `<Tabs defaultValue="normal">`, while `difficulties` is a prop defaulting to `["easy","normal","hard","extreme"]` (`:41`). The test at `RankingDialog.test.tsx:133-144` renders with `difficulties={["easy","hard"]}` — a list with **no `"normal"`**. In that configuration `defaultValue="normal"` selects a tab that does not exist, so no `TabsContent` is active and the panel renders empty until the user manually clicks a tab. The test only asserts the tab triggers exist, not that any content is shown, so the dead-default is uncaught. Dragon Rider passes the default four difficulties so it is unaffected today, but the component is shared and the contract is fragile.

### F-GAMES-B30-005 · Medium · `RankingDialog` fetches with no auth, no abort, no error surface, and `force`-baked endpoints — file 8 (lines 52–71)

`fetchRankings` (`:52-65`) does `fetch(apiEndpoint)` with: (a) **no credentials/auth header** — relies entirely on ambient cookies; (b) **no `AbortController`**, so a dialog opened/closed rapidly (or unmounted mid-flight) sets state after unmount (React warning / wasted work); (c) on `!res.ok` it silently does nothing — `data` stays whatever it was, no user-visible error, only the empty-state path; (d) on throw it `console.error`s and shows the empty state, indistinguishable from "no champions." For a leaderboard feature this conflates network failure with "no data." The default endpoint `"/api/v1/games/dragon-flight/ranking"` (`:40`) is the same mock that batch-23 found always returns empty rankings (cross-ref F-GAMES-B23-004), so in practice this dialog renders the empty state for every user regardless.

### F-GAMES-B30-006 · Medium · `dragonCount` can become 0 in Dragon Flight on a hard/extreme miss, but display/army logic assumes ≥1 — file 6 (lines 718–741, 1924)

In the selection resolver (`DragonFlightGame.tsx:706-741`), an incorrect answer with `gameOverOnMiss` true sets `dragonCount: 0, status: "boss"` (`:726-733`); otherwise `dragonCount = Math.max(1, prev - penalty)`. So the running game floors at 1, but the boss-trigger path sets 0. Downstream, `displayDragonCount` ticks to 0 during the boss fight (`:833-834`), and `armyCount = Math.min(dragonCount, 12)` (`:1924`) → 0 army sprites. This is internally consistent for the "you lost all dragons" path, but the boss-health tie to `displayDragonCount > 0` (`:836-838`) means if a player reaches the boss via timeout with `dragonCount` already at 1, the battle resolution depends on whether army (1) outlasts boss health — an edge worth a test. No test exercises the `gameOverOnMiss`/extreme path; the Dragon Flight test only uses default (normal) difficulty.

### F-GAMES-B30-007 · Low · `window.location.href = "/student/games"` hard-navigation bypasses the app router — file 3 (line 331), file 15 (line 923)

Both Archer's Revenge (`ArchersRevengeGame.tsx:331`) and Enchanted Library (`EnchantedLibraryGame.tsx:923`) implement `onExit` as `window.location.href = "/student/games"`. This (a) hardcodes a route that only exists in a host app (Reading/Primary student shell), so the standalone `advantage-games` app and any other importer will dead-link; (b) forces a full document reload instead of a Next.js client navigation, losing SPA state and incurring a reload cost; (c) is an importability hazard — the games cannot be embedded in a host that uses a different route without editing source. An injected `onExit`/router callback prop would be portable. Dragon Flight similarly uses `window.location.reload()` for "play again" when no `onRestart` is provided (`DragonFlightGame.tsx:1312`).

### F-GAMES-B30-008 · Low · `<img src={entry.image}>` raw tag in leaderboard (no Next/Image, no error fallback) — file 17 (lines 111–115)

`RankingDisplay.tsx:111-115` renders user avatars with a raw `<img>` and no `onError` fallback. A broken avatar URL leaves a broken-image glyph; `next/image` (or a fallback to the `User` icon already used at `:117`) would be more robust and consistent with the `null`-image branch. Low impact; cosmetic/perf (`@next/next/no-img-element` lint warning likely).

### F-GAMES-B30-009 · Low · Mixed/untranslated hardcoded English strings in otherwise i18n components — file 3, file 6, file 10

Several player-facing strings bypass the `useScopedI18n` system the same components use elsewhere:
- Archer's Revenge: `gameTitle="Archer's Revenge"`, all instructions, `proTip`, `"Target Translation"`, HUD `"HP:"/"Score:"/"Wave"` (`ArchersRevengeGame.tsx:154-166, 224, 235-237`) are hardcoded English — this game uses no `useScopedI18n` at all.
- Dragon Flight: `"Run timer"` aria-label (`:1055`), `"Skeleton King Approaches"` (`:1177`), `"Loading Assets"/"Ready"` (`:1352`), `"Dragon Flight"` eyebrow (`:1332`) are hardcoded despite the rest using `t(...)`.
- Dragon Rider: `"Prompt"`, `"Dragons"`, `"+1 Dragon"/"-1 Dragon"`, `"⚔️ Big Boss Battle! ⚔️"`, `"Boss Health"`, `"Select"/"Tap Gate"` (`:980, 992, 1094, 1114, 1125, 1177`) are hardcoded.

For a platform that ships Thai content (per other batches) these strings will not localize, undercutting the age-appropriate/localized UX goal. Mixed translation coverage within one component is also a maintainability smell.

---

## Per-File Findings

### File 1 — `alchemists-synthesis/AlchemistsSynthesisGame.tsx`

**F-GAMES-B30-010 · Medium · lines 45–47, 156–168 (difficulty selector absent; locked to "normal")**
State is initialized `createAlchemistsSynthesisState(vocabulary, "normal")` (`:46`) and `handleStart`/`handleRestart` reuse `gameStateRef.current.difficulty` (`:61, 71`). But the `GameStartScreen` (`:159-165`) is rendered with **no difficulty selector child** and nothing ever calls a difficulty setter. So Alchemist's Synthesis is permanently "normal" — `maxRounds` is fixed at 7 (`alchemistsSynthesis.ts:28-29`) and the easy(5)/hard(10) paths are unreachable from the UI. The game declares difficulty in its result type (`:28`) and logic but offers no player control, a feature-parity gap versus the other games in this batch.

**F-GAMES-B30-011 · Low · lines 187–196 (fixed-size Stage, no responsive scaling)**
The `<Stage width={GAME_WIDTH} height={GAME_HEIGHT}>` uses CSS `width:100%/height:100%` with `maxWidth: GAME_WIDTH` (`:190-194`) but the Konva drawing surface itself is fixed at `GAME_WIDTH×GAME_HEIGHT` (390×844). Unlike Archer's Revenge (file 3) and the dragon games, which measure the container with `ResizeObserver` and scale the Layer, this game stretches a fixed-resolution canvas via CSS, which blurs/letterboxes on non-390-wide viewports and ignores devicePixelRatio. The options grid math (`:242-243`, `x = 30 + col*175`) assumes the 390-wide coordinate space, so on wide screens the touch targets remain in the left portion. Mobile-portrait-only by construction; degraded on tablet/desktop.

**F-GAMES-B30-012 · Low · lines 246–272 (option key uses `option.term`; duplicate terms collide)**
`<Group key={option.term}>` (`:247`) keys React children by the vocabulary term. If `generateOptions` ever yields two options with the same `term` (e.g. duplicate vocabulary entries), React key collision causes render glitches and mis-targeted click handlers. Keying by index or a composite id is safer. Also, `onClick`/`onTap` (`:250-251`) both fire `handleSelectOption`; on touch devices that can double-fire if Konva synthesizes both — no debounce/guard exists.

### File 2 — `archers-revenge/ArchersRevengeGame.test.tsx`

**F-GAMES-B30-013 · Medium · lines 84–89, 150–170 (test enshrines the broken "medium" label; weak end-state coverage)**
`:84-89` asserts `getByText("medium")` exists, locking in the invalid difficulty key flagged in F-GAMES-B30-001 — the test would *fail* if the bug were fixed to "normal". The `onComplete` test (`:150-170`) only asserts `calls.length <= 1` after advancing 100ms without ever driving the game to a real end state, so it proves nothing about completion correctness (it passes trivially because the game never ends in 100ms with `requestAnimationFrame` mocked). Net: low behavioral coverage; the only meaningful assertions (start screen, fullscreen on start, raf used) are smoke checks.

**F-GAMES-B30-014 · Low · lines 113–122 ("exits fullscreen when game ends" asserts the wrong thing)**
The test titled "exits fullscreen when game ends" (`:113`) only clicks start and asserts `mockEnterFullscreen` was called (`:121`) — it never drives the game to an end and never asserts `mockExitFullscreen`. The title and the assertion disagree; the test gives false confidence about teardown.

### File 3 — `archers-revenge/ArchersRevengeGame.tsx`

Carries **F-GAMES-B30-001** (medium key), **-007** (`window.location.href`), **-009** (hardcoded English). File-specific:

**F-GAMES-B30-015 · Low · lines 38, 138 (accessibility text size partially applied; touch target not scaled)**
`getEffectiveTextSize` is pulled from `useAccessibilitySettings` and applied to *some* Konva text (`:225, 258`) but the HUD term (`fontSize={32}`, `:214`), HP/Score/Wave (`fontSize={18}`, `:235-237`), and the difficulty buttons use raw sizes. `getEffectiveTouchTarget` is not used at all here (the arrow/enemy hit areas are fixed radii). Accessibility scaling is inconsistent. The difficulty buttons do enforce `min-h-[44px] min-w-[44px]` (`:177`), which is good.

**F-GAMES-B30-016 · Low · lines 302 (division-by-fallback on `targetChangeInterval`)**
The target-timer progress bar width divides by `ARCHERS_REVENGE_CONFIG.targetChangeInterval[gameState.difficulty] || 7000` (`:302`). When `difficulty === "medium"` (the broken key, F-GAMES-B30-001), `targetChangeInterval["medium"]` is `undefined`, so this falls back to `7000` — masking the broken difficulty in *this one spot* while the rest of the state is NaN. The `|| 7000` guard here is a localized band-aid that makes the root bug harder to spot.

### File 4 — `archers-revenge/index.ts`

**F-GAMES-B30-017 · Info · line 1**
`export * from "./ArchersRevengeGame";` — clean barrel re-export. A wildcard re-export will also surface the component's internal exported types if any are added later; explicit named re-export (`export { ArchersRevengeGame }`) is marginally safer for tree-shaking and API surface control. No defect.

### File 5 — `dragon-flight/DragonFlightGame.test.tsx`

**F-GAMES-B30-018 · Low · lines 6–34, 62–69 (heavy mocking + Math.random stubbing reduces fidelity)**
react-konva and `konva.Animation` are fully stubbed to no-op divs (`:6-30`), so the test exercises React state transitions only — no rendering, layout, sprite-crop, or parallax logic is covered. `mockRandomSequence` (`:62-69`) feeds a fixed RNG; the sequences (`[0.1,0.9,0.2]`) are magic numbers with no comment explaining why they yield the asserted gate outcome, making the test brittle to any change in RNG call order inside `buildGateRound`. The boss→results test (`:128-166`) depends on precise timer advancement (`120ms`, `15000ms`, `1000ms`) tied to internal constants (`GATE_TRAVEL_MS`, `RESULTS_REVEAL_MS`); refactors will silently break it. No `onComplete` call-count assertion (cross-ref F-GAMES-B30-002).

### File 6 — `dragon-flight/DragonFlightGame.tsx`

Carries **F-GAMES-B30-002** (`onComplete` not idempotent), **-003** (difficulty/XP — partial exception), **-006** (dragonCount 0 edge), **-009** (hardcoded strings). File-specific:

**F-GAMES-B30-019 · Medium · lines 1755–1911 (imperative Konva projectile system creates/destroys nodes in a rAF loop — perf/leak risk)**
The boss-fight projectile system (`:1788-1897`) imperatively `new Konva.Image(...)`, `.add()`s to a layer, and `.destroy()`s nodes every frame based on `Date.now()` spawn timers. Risks: (a) if the component unmounts mid-boss-fight, `projectileSpritesRef`/`projectilesRef` are not flushed in the animation cleanup (`:1908-1910` only stops the animation), leaving orphaned Konva nodes until GC — a leak under repeated play; (b) `id = now + Math.random()` (`:1795, 1825`) as a Map key is collision-prone and non-integer; (c) spawning is unbounded in pathological frame-rate conditions. This is the most performance-sensitive code in the batch and has zero test coverage (Konva is mocked out).

**F-GAMES-B30-020 · Medium · lines 1395–1479 (inline `<style jsx>` with 11 keyframes inside the render tree)**
A large `styled-jsx` block defining sprite/ring animations is embedded in the start-screen JSX (`:1395-1479`). It re-declares keyframes on every render of the start screen and couples a 3×3 sprite-sheet animation to hardcoded `background-position` percentages (`:1396-1427`). `imageRendering: "pixelated"` (`:1388`) is not universally supported (Safari historically partial). Heavy CSS-in-JSX for a decorative element; should be a static stylesheet/CSS module. Low functional risk, medium maintainability/perf.

**F-GAMES-B30-021 · Low · lines 463–467 (`useMemo` used for a side effect)**
`registerDifficultyParams('dragon-flight', {...})` is called inside `useMemo` (`:463`) purely for its side effect, returning nothing. `useMemo` is for memoizing values; side effects belong in `useEffect`. React may discard memo results, and in StrictMode/concurrent rendering this can run unexpectedly. Functionally tolerated today but a React anti-pattern.

### File 7 — `dragon-flight/RankingDialog.test.tsx`

**F-GAMES-B30-022 · Low · lines 26–38, 81–96 (loading/error assertions rely on `.animate-pulse` class presence)**
The loading-state test (`:36-37`) and error test (`:93-95`) assert on `document.querySelectorAll(".animate-pulse")` count. Coupling tests to a Tailwind utility class is brittle — renaming the skeleton style or swapping the spinner breaks the test with no behavioral change. The error test (`:81-96`) verifies the dialog still shows a title and that skeletons disappear, but never asserts any user-visible error message (because none exists — cross-ref F-GAMES-B30-005), so it validates the *absence* of error handling rather than flagging it.

### File 8 — `dragon-flight/RankingDialog.tsx`

Carries **F-GAMES-B30-004** (defaultValue tab) and **-005** (fetch hygiene). File-specific:

**F-GAMES-B30-023 · Low · lines 34, 186–188 (loose `translationNamespace: string` + i18n key interpolation)**
`translationNamespace` is typed `"dragonFlight" | "castleDefense" | string` (`:34`) — the `| string` makes the union meaningless and allows any value. Keys are built by string interpolation `t(\`${translationNamespace}.ranking.noChampions\`)` (`:112, 116, 152, 174, 187`); if a caller passes a namespace lacking those keys, `t` returns the raw key string to the user with no fallback. The inline comment at `:186` ("reusing dragonFlight keys for now") acknowledges this is unverified. Fragile i18n contract for a component shared across games.

### File 9 — `dragon-rider/DragonRiderGame.test.tsx`

**F-GAMES-B30-024 · Low · lines 161–205 (boss→results test advances 27s in arbitrary chunks; asserts only "Failure")**
The results-transition test advances timers in four chunks totaling ~27s (`:184-195`) to force the boss sequence, then asserts `getByText(/Failure/i)` (`:201`). It does not verify the `onComplete` payload, XP, accuracy, or that `onComplete` fired exactly once (cross-ref F-GAMES-B30-002). The chunked `advanceTimersByTime` calls are tuned to internal constants (`BOSS_HEALTH_TICK_MS=1800`, gate travel) and will break on tuning changes. The fullscreen test (`:207-244`) is the strongest assertion in the file (`toHaveBeenCalledTimes(1)` for both enter/exit).

### File 10 — `dragon-rider/DragonRiderGame.tsx`

Carries **F-GAMES-B30-002** (`onComplete` not idempotent), **-003** (difficulty/XP), **-009** (hardcoded strings). File-specific:

**F-GAMES-B30-025 · Medium · lines 485–488 (`resetGame` in an effect that also resets phase → start-screen flicker / re-entrancy)**
`useEffect(() => { resetGame(); setGamePhase("start"); }, [resetGame])` (`:485-488`) runs whenever `resetGame`'s identity changes, and `resetGame` depends on `[vocabulary, durationMs]` (`:483`). If the parent passes a new `vocabulary` array reference (common with inline props), this forcibly resets the game to the start screen mid-play, discarding progress. There is no guard against resetting while `gamePhase === "playing"`. Enchanted Library (file 15) has the identical pattern (`:246-249`). This is a real mid-session data-loss risk when vocabulary props are not referentially stable.

**F-GAMES-B30-026 · Low · lines 1402–1409 (player sprite column from `dragonCount < bossHealth` is fragile)**
The boss-phase player frame selects column via `dragonCount < bossHealth ? 2 : bossHealth > 0 ? 1 : 0` (`:1403-1408`). `dragonCount` and `bossHealth` are independent decrementing counters on different intervals (`BOSS_HEALTH_TICK_MS=1800`), so the "losing/attacking/idle" pose can flap frame-to-frame as the two counters cross. Cosmetic, but indicative of animation state derived from gameplay counters rather than an explicit pose state machine.

### File 11 — `enchanted-library/BookPickupBurst.test.tsx`

**F-GAMES-B30-027 · Low · lines 5–21 (framer-motion mock fires `onAnimationComplete` synchronously on render)**
The mock invokes `onAnimationComplete()` during render (`:15-17`), so the test asserts `onComplete` was called once (`:45`) without any real animation. This validates the prop wiring only; it cannot catch a regression where the real `onAnimationComplete` never fires (e.g. an `exit`-only animation that the parent unmounts before completing). Acceptable as a unit smoke test but low fidelity.

### File 12 — `enchanted-library/BookPickupBurst.tsx`

**F-GAMES-B30-028 · Low · lines 29, 69 (sprite frame math assumes a 3-frame sheet; magic `* 3`)**
`backgroundPosition = \`${-frameIndex * frameWidth}px 0px\`` (`:29`) and `backgroundSize: \`${frameWidth * 3}px ${frameHeight}px\`` (`:69`) hardcode a 3-column sprite sheet. If the book sheet ever changes column count, this silently mis-crops. The parent passes `frameWidth = grids.book.fw` where `fw = width/3` (`EnchantedLibraryGame.tsx:81-84`), so the `* 3` round-trips to the full image width — but the coupling is implicit and undocumented. The component is otherwise clean, purely presentational, and correctly `aria-hidden` (`:37`).

### File 13 — `enchanted-library/DifficultySelector.tsx`

**F-GAMES-B30-029 · Medium · lines 13–51, 23–50 (hardcoded English labels + `xpMultiplier` constants that the selector cannot enforce)**
Although the component imports `useScopedI18n` and reads `t("difficulty.label")` for the "Difficulty:" prefix (`:57, 62`), the per-difficulty `label` values ("Easy"/"Normal"/"Hard"/"Extreme") are hardcoded English in `DIFFICULTY_INFO` (`:24,31,38,45`) and rendered directly (`:90`). The `xpMultiplier` values (1.0/1.5/2.0/3.0) are shown in a `title` tooltip (`:81`) but are **display-only** — this component does not feed them into scoring; whether `calculateEnchantedLibraryXP` applies them is owned elsewhere (cross-ref F-GAMES-B30-003). If the engine ignores them, the tooltip misinforms the learner. Tooltips on tap-only (mobile) devices are also not reachable, so the multiplier info is invisible on the primary target platform.

### File 14 — `enchanted-library/EnchantedLibraryGame.test.tsx`

**F-GAMES-B30-030 · Low · lines 87–96, 128–135 (global `Image.prototype.src` monkey-patch + title-coupled assertion)**
The test globally overrides `Image.prototype.src` to auto-fire `onload` (`:88-96`); this leaks across the whole test file and any shared module state, and assumes assets always load successfully (no error-path coverage). The intro-screen assertion (`:130`) matches `/Enchanted Library/i` with an inline comment admitting uncertainty about whether the i18n title resolves to that literal ("title changed in code... likely resolves to") — an assertion the author was not confident in. The grimoire toggle test (`:193-205`) is the most meaningful behavioral check in the file.

### File 15 — `enchanted-library/EnchantedLibraryGame.tsx`

Carries **F-GAMES-B30-007** (`window.location.href`), **-025-class** (reset-in-effect, `:246-249`). File-specific:

**F-GAMES-B30-031 · Medium · lines 313–375 (accuracy/attempts inferred heuristically from `mana` deltas — fragile scoring)**
Correct/attempt tracking is derived by diffing `nextState.mana` vs `prevMana` and scanning `vocabularyProgress` for any increase (`:315-330`). If a future state change touches `mana` for a non-answer reason (e.g. a time/decay penalty, a power-up), this miscounts attempts and corrupts the accuracy that feeds XP (`:392-397`). Accuracy should come from the engine emitting explicit answer events, not from the UI reverse-engineering mana movement. Similarly `findCollectedBook` (`:495-529`) re-derives which book was collected by distance-checking the *previous* state with a `+5` fudge radius (`:524`) — a heuristic that can attribute the wrong book (and thus the wrong sparkle/burst variant) when two books are near the player.

**F-GAMES-B30-032 · Low · lines 425–460 (polling `setInterval(updateDimensions, 200)` alongside ResizeObserver)**
Dimensions are tracked by both a `ResizeObserver` (`:439-450`) **and** a 200ms `setInterval` that runs for 2s (`:451-452`). The interval is a workaround for the observer not firing initial dimensions; it is redundant and causes up to 10 extra `getBoundingClientRect` + setState cycles on mount. Minor perf/jank; the observer alone (plus an initial `updateDimensions()`) should suffice.

**F-GAMES-B30-033 · Low · lines 269–385 (game-loop effect deps `[gamePhase, assets, gameState?.status]` risk stale-loop restarts)**
The rAF loop effect depends on `gameState?.status` (`:385`); because the loop also calls `setGameState` every frame, any status change tears down and recreates the loop. The code mitigates stale closures with a wall of refs (`:163-184`), which works but is a strong signal the loop should be driven by a single stable effect reading refs, not re-subscribed on status. The ref-mirroring pattern (12 `useEffect`s syncing refs, `:176-184, 534-535`) is hard to maintain and easy to desync.

### File 16 — `enchanted-library/RankingDisplay.test.tsx`

**F-GAMES-B30-034 · Low · lines 36, 84 (regex `/100\s*XP/` and label text assertions are reasonable; no empty-vs-error distinction)**
Generally solid coverage (tabs, empty state, current-user highlight, rank icons, avatar fallback). Gap: like the dialog, it cannot distinguish "no data" from "load failed" because `RankingDisplay` takes rankings as a prop with no loading/error states — acceptable given the component is purely presentational, but worth noting the data-fetch concerns live in the parent (file 15) which passes `rankings` straight through with no error handling.

### File 17 — `enchanted-library/RankingDisplay.tsx`

Carries **F-GAMES-B30-008** (raw `<img>`). File-specific:

**F-GAMES-B30-035 · Low · lines 21–26, 28–34 (hardcoded English labels; no i18n)**
`DIFFICULTY_LABELS` (`:21-26`), `"Leaderboard"` (`:42`), `"No rankings yet for this difficulty."` / `"Be the first to play!"` (`:67-68`), `"(You)"` (`:130`), and `"XP"` (`:138`) are all hardcoded English. This component, unlike its sibling `DifficultySelector`, does not import `useScopedI18n` at all. Inconsistent localization within the same game folder.

**F-GAMES-B30-036 · Low · lines 76–80 (per-row `transition={{ delay: index * 0.05 }}` unbounded with list length)**
Entry animations stagger by `index * 0.05s` (`:80`). For a long leaderboard this delays the last rows by seconds (e.g. row 40 → 2s), making the bottom of the list appear sluggish. A capped/clamped stagger would scale better.

### File 18 — `enchanted-library/SparkleBurst.test.tsx`

**F-GAMES-B30-037 · Low · lines 5–24, 30–33 (same synchronous framer-motion mock; asserts fixed particle count of 10)**
Mirror of file 11's pattern. Asserts exactly 10 `sparkle-particle` elements (`:32`) — coupling the test to the literal `length: 10` in the implementation (`SparkleBurst.tsx:13`), so a tuning change to particle count breaks the test for no behavioral reason. `onComplete` is fired synchronously by the mock (`:18-20`), so the "triggers completion" assertion (`:33`) is trivially true.

### File 19 — `enchanted-library/SparkleBurst.tsx`

**F-GAMES-B30-038 · Low · lines 21–35 (`Math.random()` in render + `onComplete` tied to particle index 0; reduce-motion ignored)**
Each particle's target offset uses `Math.random()` directly in JSX during render (`:26-27`), so values change on every re-render (non-deterministic, and re-randomizes if the component re-renders mid-animation). `onComplete` fires only from particle `i === 0` (`:33`) — if that specific particle's animation is interrupted/unmounted, `onComplete` never fires and the parent's sparkle is never removed from state (`EnchantedLibraryGame.tsx:687-691`), a slow state leak. The component does not honor `prefers-reduced-motion` / the app's `reduceMotion` accessibility setting (which `useAccessibilitySettings` exposes, used elsewhere), so motion-sensitive users get the full burst.

### File 20 — `enchanted-library/VocabularyProgress.test.tsx`

**F-GAMES-B30-039 · Low · lines 7–10 (test data includes an `id` field absent from the canonical `VocabularyItem`)**
The mock vocabulary adds `id: "1"` to items (`:8-9`), but `useGameStore.ts:3` `VocabularyItem` is `{term, translation, ...}` — the test data shape may not match the production contract, so the test could pass against a shape the app never produces. The test covers stars-filled rendering and closed-state non-render well, but it tests a component (`VocabularyProgress.tsx`) **not present in this batch**, so its implementation could not be reviewed (see Limitations).

**F-GAMES-B30-040 · Info · whole file**
The 2-progress / 5-star (`mockProgress.set("dog", 2)`) test verifies only up to 2 filled stars (`:46-50`); the star-cap (how many stars total, and what "mastered" threshold is) is asserted in `EnchantedLibraryGame.tsx:910` as `count >= 2`. The "mastery = 2 correct" threshold is duplicated across files with no shared constant — a drift risk.

---

## Cross-Cutting Themes

| Theme | Findings | Severity |
|-------|----------|----------|
| Archer's Revenge "medium" is an invalid difficulty key → broken game | B30-001, B30-013, B30-016 | High |
| `onComplete` fired repeatedly (no idempotency guard) in Dragon Flight/Rider | B30-002, B30-024 | High |
| Difficulty does not affect XP/scoring; multiplier is display-only | B30-003, B30-029 | Medium |
| Reset-in-effect keyed on prop identity → mid-session reset/data loss | B30-025, B30-031(adj) | Medium |
| Scoring/accuracy derived heuristically (mana deltas, distance fudge) | B30-031 | Medium |
| Imperative Konva node churn in rAF loop (perf/leak, untested) | B30-019 | Medium |
| Leaderboard fetch: no auth/abort/error surface; empty == failure; dead default tab | B30-004, B30-005, B30-022, B30-023 | Medium |
| Hard navigation `window.location.href` to host-only route (importability) | B30-007 | Low |
| Hardcoded English strings bypassing i18n | B30-009, B30-029, B30-035 | Low |
| Mobile/responsive gaps (fixed-size Stage, pixelated rendering, tooltips on touch) | B30-011, B30-020, B30-029 | Low |
| Accessibility: inconsistent text-size scaling; reduce-motion ignored | B30-015, B30-038 | Low |
| Tests couple to CSS classes / literal counts / magic timer values | B30-013, B30-014, B30-018, B30-022, B30-027, B30-037, B30-039 | Low/Medium |
| React anti-patterns (useMemo for side effects, ref-mirroring wall) | B30-021, B30-033 | Low |

---

## Importability into Reading / Primary — Summary

- **Blockers:** hardcoded host route in `onExit` (B30-007); `onComplete` double-fire (B30-002) would double-award XP in a host that persists per call; client-derived accuracy/XP (B30-031) and difficulty-insensitive XP (B30-003) mean scoring is not server-authoritative; leaderboard fetch has no auth/tenant scoping (B30-005). None of these games scope by `schoolId` or go through an auth/storage adapter — consistent with prior batches' finding that the games are standalone-demo grade.
- **Contract risk:** `VocabularyItem` is reused for sentences/books; result payload shapes (`{xp,accuracy,gameTime}` for Enchanted Library vs `{xp,accuracy,score,...}` for Alchemist's) differ per game, so a host needs per-game adapters.
- **Functional blocker:** Archer's Revenge is broken on the middle difficulty (B30-001) and would ship a defect into any importer.

---

## Limitations

- **Read-only review.** No source was edited. I did not run Jest, start Next.js, render Konva to a real canvas, measure FPS, exercise touch/mobile, or test cross-browser behavior. Performance/leak claims (e.g. B30-019, B30-032) are derived from reading the code, not profiling.
- **`VocabularyProgress.tsx` is not in this batch** — only its test (file 20) is. Findings about that component (B30-039, B30-040) are inferred from the test and from `EnchantedLibraryGame.tsx`'s usage; the implementation was not reviewed.
- The game-logic libraries (`alchemistsSynthesis.ts`, `archersRevenge.ts`, `archersRevengeConfig.ts`, `dragonFlight.ts`, `dragonRider.ts`, `enchantedLibrary.ts`) and `useGameStore.ts` were read for verification but are **not** in-scope batch files; references to them characterize behavior the in-scope components import. In particular, whether `calculateEnchantedLibraryXP`/`getDragonFlightResults` apply difficulty multipliers was not fully traced (those files were only spot-checked), so B30-003's Enchanted-Library/Dragon-Flight sub-claims are partial.
- Asset/audio findings are limited: no audio files were in scope, and `useSound`/sprite sheets are referenced but the actual asset bytes, dimensions, and loading performance were not inspected.
- Severity reflects impact in a host app that wires these components to real persistence/auth; as standalone demo components several High findings are latent rather than actively exploited today.

---

*No acceptance or closeout determination is made by this report. This is a line-by-line review deliverable only; track acceptance/closeout remains the responsibility of the Measure workflow owner.*
