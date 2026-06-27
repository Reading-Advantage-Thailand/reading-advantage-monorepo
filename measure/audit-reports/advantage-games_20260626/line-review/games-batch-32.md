# Line-by-Line Review — games-batch-32

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-32`
**Scope source:** `/tmp/opencode/games-batch-32` (20 files, read exactly as listed)
**Reviewer constraint:** Read-only review. No source code was edited.
**Finding ID scheme:** `F-GAMES-B32-###`
**Severity scale:** Critical / High / Medium / Low / Info

This batch spans four areas:
- **rpg-battle** — presentational/sprite subcomponents: `EnemySprite`, `FloatingText`, `HealthBar` (+test), `PlayerSprite` (+test), `Sprite` (+test), and the `StartScreen` (briefing/rankings/vocabulary tabs).
- **rune-match** — `MonsterSelection` (+test) and the full Konva game `RuneMatchGame` (+test).
- **wizard-vs-zombie** — the full Konva game `WizardZombieGame` (+test).
- **shared/multiplayer** — `header.tsx`, `LobbyScreen` (+test), `MultiplayerGameWrapper` (+test).

To anchor findings, the following non-batch files were read-only inspected for context (no findings filed against them): `src/lib/games/runeMatch.ts` (state factory/status), `src/lib/games/rpgBattleSelection.ts` (battleEnemies), `src/hooks/useMultiplayerGameState.ts` (referenced by wrapper). Findings are anchored only to batch files.

---

## Files Reviewed (20/20)

| # | File | Type | Notes |
|---|------|------|-------|
| 1 | `rpg-battle/EnemySprite.tsx` | Component | `next/image` placeholder sprite sheet |
| 2 | `rpg-battle/FloatingText.tsx` | Component | framer-motion damage/heal overlay |
| 3 | `rpg-battle/HealthBar.test.tsx` | Test | RTL, progressbar attrs |
| 4 | `rpg-battle/HealthBar.tsx` | Component | clamped progressbar |
| 5 | `rpg-battle/PlayerSprite.test.tsx` | Test | RTL, alt text only |
| 6 | `rpg-battle/PlayerSprite.tsx` | Component | `next/image` placeholder sprite sheet |
| 7 | `rpg-battle/Sprite.test.tsx` | Test | RTL, bg-position/flip |
| 8 | `rpg-battle/Sprite.tsx` | Component | 3×3 sprite-sheet CSS positioner |
| 9 | `rpg-battle/StartScreen.tsx` | Component | tabs: briefing/rankings/vocab |
| 10 | `rune-match/MonsterSelection.test.tsx` | Test | RTL, config-driven |
| 11 | `rune-match/MonsterSelection.tsx` | Component | 4 monster cards |
| 12 | `rune-match/RuneMatchGame.test.tsx` | Test | Mocked Konva/hooks |
| 13 | `rune-match/RuneMatchGame.tsx` | Component | Full match-3 Konva game |
| 14 | `wizard-vs-zombie/WizardZombieGame.test.tsx` | Test | Mocked Konva/hooks |
| 15 | `wizard-vs-zombie/WizardZombieGame.tsx` | Component | Full survival Konva game |
| 16 | `header.tsx` | Component | Generic page header |
| 17 | `multiplayer/LobbyScreen.test.tsx` | Test | RTL, create/join/lobby |
| 18 | `multiplayer/LobbyScreen.tsx` | Component | Multiplayer lobby UI |
| 19 | `multiplayer/MultiplayerGameWrapper.test.tsx` | Test | RTL + context |
| 20 | `multiplayer/MultiplayerGameWrapper.tsx` | Component | Context provider/HOC |

---

## Findings

### F-GAMES-B32-001 · High · Rune-match "Bomb" special move is permanently dead (awarded, counted, never usable)
`RuneMatchGame.tsx:297-304` awards bomb charges for 5+ matches and the UI renders a Bomb button on both desktop (`:887-893`) and mobile (`:1180-1186`), but **neither render passes an `onClick` handler** — the inline comments literally say `/* No handler yet */`. The `Group`'s `onClick`/`onTap` are gated on `!isDisabled ? onClick : undefined` (`:827-828`, `:1120-1121`), so even when charges exist the button does nothing. Learners earn a reward (large-match feedback) that can never be spent, and the difficulty/scoring balance silently assumes a mechanic that is absent. Either implement the bomb handler or remove the award + button. The test file does not cover special-move execution (`RuneMatchGame.test.tsx:308-344` explicitly notes skills "can't easily test"), so this gap is unguarded.

### F-GAMES-B32-002 · High · Rune-match `onComplete` reports inconsistent/derived metrics; score ≠ XP basis
`RuneMatchGame.tsx:453-482` builds the `onComplete` payload. On victory `accuracy` is `correctAnswers/totalAttempts*100` (a 0–100 percentage), but the in-canvas `GameEndScreen` is passed `correctAnswers/totalAttempts` as a 0–1 fraction (`:613-617`, `:640-644`). The same accuracy concept is emitted on two different scales from the same component, which will corrupt any host-side progress aggregation that assumes one convention. Additionally `score` is set to `gameState.monster?.xp` (the monster's *reward constant*, `:472`), not an actual gameplay score, so "score" and "xp" are near-duplicates and neither reflects match performance. For importability into Reading/Primary progress tracking, the payload's semantics are ambiguous and self-inconsistent.

### F-GAMES-B32-003 · High · Wizard-vs-zombie: exiting *before* game over silently discards the run; `onComplete` only fires via end screen
`WizardZombieGame.tsx:212-233` `handleExit` reads `gameStateRef.current` and calls `onComplete`, but `handleExit`/`GameEndScreen` are only rendered when `gamePhase === "ended"` (`:482-505`). There is no in-game quit/back affordance, so a learner who navigates away mid-survival produces **no** `onComplete` and no progress/XP record. Combined with fullscreen being force-entered on play (`:235-241`), the only path out is dying. For a classroom setting (bell rings, learner must stop) this loses the attempt entirely. A mid-game exit that still reports partial results is needed for reliable progress capture.

### F-GAMES-B32-004 · Medium · Rankings/avatars use raw `<img>` with no error/alt fallback and unvalidated remote URLs
`StartScreen.tsx:302-308` renders leaderboard avatars via a bare `<img src={entry.image}>`. The data comes from `/api/v1/games/rpg-battle/ranking` (`:44`) — i.e. server/user-derived URLs — with no `onError` fallback, no `referrerPolicy`, no width/height attributes (layout shift), and outside `next/image` optimization. A broken/removed avatar URL shows a broken-image glyph to children, and an attacker-controlled profile image URL is loaded unconditionally. Prefer `next/image` (as the sprite components do) or at minimum an `onError` placeholder and fixed dimensions.

### F-GAMES-B32-005 · Medium · Rankings fetch lacks abort/race handling and hardcodes a non-base-path API route
`StartScreen.tsx:40-59` fetches rankings inside `useEffect` keyed on `activeTab` with no `AbortController`; rapid tab switching can land a stale response into state. More importantly the URL `"/api/v1/games/rpg-battle/ranking"` is an absolute root path with **no `withBasePath`** wrapper (contrast `RuneMatchGame.tsx:206`/`MonsterSelection.tsx:38` which deliberately use `withBasePath` for assets). If advantage-games is mounted under a `basePath` (or imported into Reading/Primary under a sub-path), this fetch resolves to the wrong origin/path and rankings silently fail (only `console.error`, no user-facing error state). Importability is not demonstrated.

### F-GAMES-B32-006 · Medium · Rune-match: per-frame `Math.random()` in render makes shake non-deterministic and defeats memoization
`RuneMatchGame.tsx:665-667` computes the shake offset with `Math.random()` directly inside the `Group` `x`/`y` during render. Calling `Math.random()` in render is impure, makes the canvas position depend on render cadence rather than elapsed time, and prevents React from treating renders as deterministic. It also means shake intensity is sampled at React render frequency (driven by `advanceTime` state updates ~per RAF) rather than a controlled animation, producing inconsistent jitter across devices/refresh rates. Drive shake from state/`dt` in `advanceTime` instead.

### F-GAMES-B32-007 · Medium · Two un-cleared interval-based animation loops run regardless of game phase
`RuneMatchGame.tsx:159-169` starts a 500 ms and a 150 ms `setInterval` on mount that run for the entire component lifetime — including the start screen and the loading/error screens — continuously calling `setAnimFrame`/`setMonsterAnimFrame` and forcing re-renders even when nothing is visible. Likewise `WizardZombieGame.tsx:244-250` uses `useInterval(…,150)` (gated internally by `gamePhase`, better) plus a RAF loop. The rune-match intervals are not gated by `gameState?.status`, so idle CPU/battery is wasted on mobile. Gate frame timers on `status === "playing"`.

### F-GAMES-B32-008 · Medium · Rune-match double monster-selection path can double-init state / skip the "selection" status
`RuneMatchGame.tsx:484-509` (start-screen branch) renders `MonsterSelection` whose `onSelect` does `handleStartGame()` then `setTimeout(() => handleSelectMonster(type), 0)`. `handleStartGame` (`:246-249`) sets `gameStarted` and calls `resetGame`, which builds a fresh state with status `"selection"` (confirmed in `runeMatch.ts:712`). Meanwhile the main render (`:592-602`) *also* renders `MonsterSelection` when `status === "selection"` calling `handleSelectMonster` directly. There are thus two selection entry points with different sequencing (one deferred via `setTimeout`, one direct). The `setTimeout(...,0)` is a fragile ordering hack that depends on `resetGame`'s state commit landing first; under React 18 batching this is not guaranteed and can select against a stale/initial state. Consolidate to a single selection flow.

### F-GAMES-B32-009 · Medium · `Sprite` hardcodes `imageRendering: 'pixelated'`; no `prefers-reduced-motion` anywhere in batch
`Sprite.tsx:55` forces `imageRendering: 'pixelated'` for all sprites. For non-pixel-art assets or high-DPI displays this can degrade legibility for young learners. More broadly, motion is unconditional across the batch: `FloatingText.tsx:22-27` (springy floats), `HealthBar.tsx:32-37` (spring width), `StartScreen.tsx:140-141,249` (infinite spin/bounce), `WizardZombieGame.tsx:553` (`animate-pulse`), `MonsterSelection.tsx:25` (`animate-in zoom-in`). None consult `prefers-reduced-motion` or the existing `useAccessibilitySettings` `reduceMotion` flag (which the rune-match test mock exposes at `RuneMatchGame.test.tsx:65`). Vestibular-sensitive and young users get persistent motion with no opt-out.

### F-GAMES-B32-010 · Medium · `Sprite` exposes `role="img"` but is purely decorative-overlapping with adjacent labels (a11y duplication)
`Sprite.tsx:44-46` gives every sprite `role="img"` + `aria-label={alt}`. In `StartScreen.tsx:242-260` each enemy sprite (`alt={enemy.label}`) sits directly beside a visible text label of the same `enemy.label` (`:259`), so screen readers announce the name twice per button. In `MonsterSelection.tsx:38` the monster art is a bare `<div>` background with no label at all (inconsistent treatment). Decorative sprites adjacent to text labels should be `aria-hidden`, and meaningful ones should not duplicate the visible name. The `Sprite` test (`Sprite.test.tsx`) only checks positioning/flip, not a11y semantics.

### F-GAMES-B32-011 · Medium · LobbyScreen "Game (optional)" is a free-text input mislabeled as a select; tests assume a select
`LobbyScreen.tsx:226-234` renders a plain `<Input placeholder="Select a game">` for game selection (`data-testid="game-select"`). A learner can type any arbitrary string as the `gameId` passed to `onCreateRoom` (`:59`), with no validation against known games. The test (`LobbyScreen.test.tsx:44-48`) drives it via `fireEvent.change(... value: 'wizard-vs-zombie')`, treating it like a `<select>`, so the test passes while the real UX is an unconstrained text box that can create rooms for non-existent games. This is both a UX and data-integrity defect for the multiplayer flow.

### F-GAMES-B32-012 · Medium · MultiplayerGameWrapper trusts and `JSON.parse`s raw socket messages without schema validation
`MultiplayerGameWrapper.tsx` delegates to `useMultiplayerGameState(sendMessage, onMessage, …)`; the test (`MultiplayerGameWrapper.test.tsx:44-47,90`) shows messages arrive as raw strings that get `JSON.parse`d and dispatched by `MessageType`. Per AGENTS.md, every external boundary must validate with Zod. Inbound multiplayer messages are an untrusted external boundary (other clients / relay). The wrapper/hook surface accepts `(data: unknown)` (`:9`) but there is no evidence of runtime validation before payloads (`payload.gameState`, `payload.finalRankings`, etc.) are fed into callbacks `onRoundStart`/`onRoundEnd`/`onGameOver` (`:10-12`). A malformed peer message can crash the provider or corrupt scoring/rankings. (Note: the validating logic lives in `useMultiplayerGameState`, outside this batch; flagged here because the wrapper is the importable boundary and its own types stop at `unknown`.)

### F-GAMES-B32-013 · Low · `withMultiplayer` HOC forwards wrapper-only props into the wrapped game component
`MultiplayerGameWrapper.tsx:80-87` destructures `children` out but then passes `props as P` to `WrappedComponent`, which still includes `playerId`, `sendMessage`, `onMessage`, `onRoundStart/End`, `onGameOver` (the `MultiplayerGameWrapperProps`). The wrapped game thus receives multiplayer plumbing props it does not declare, risking unknown-prop warnings (DOM) or accidental coupling. Strip the wrapper-only props before spreading into `WrappedComponent`. This HOC has no dedicated test.

### F-GAMES-B32-014 · Low · Hardcoded English copy in importable game/lobby UI (i18n gap)
Several batch components hardcode English, blocking clean import into localized Reading/Primary shells:
- `MonsterSelection.tsx:27-28` "Choose Your Opponent" / subtitle, `:59` "Battle"; monster labels/descriptions in `MONSTER_METADATA` (`:14-19`).
- `WizardZombieGame.tsx:422` "Initializing Grimoire...", `:432-441` title/subtitle/instructions/pro-tip, `:498-499` "Survival Failed", `:535` "Find:", `:588` "CAST".
- `RuneMatchGame.tsx:530,536` "Retry Loading" / "Loading assets...", `:622-655` "Monster"/"Difficulty" custom-stat labels, `:731` "POWER WORD".
- `LobbyScreen.tsx` entirely English: "Game Lobby" (`:77`), "Room Code" (`:83`), "Waiting for host…" (`:163`), "Create/Join Room", "Start Game", "Leave Room", "player(s)".
Contrast `StartScreen.tsx` and parts of `RuneMatchGame`/`WizardZombieGame` which correctly use `useScopedI18n("pages.student.gamesPage")`. The mix means UI is partly localized, partly not.

### F-GAMES-B32-015 · Low · `EnemySprite`/`PlayerSprite` are static placeholders that cannot reflect selection or pose
`EnemySprite.tsx:7-14` and `PlayerSprite.tsx:7-14` hardcode a single sprite-sheet PNG via `next/image unoptimized`, accept **no props** (no `pose`, `enemyId`, `flip`, `size`), and render the *entire 3×3 sheet* scaled into a 160×160 box (`object-contain`) rather than a single pose frame — i.e. they do not use the `Sprite` positioner that exists right beside them (`Sprite.tsx`). This is a parallel/placeholder sprite system. The tests assert only alt text (`PlayerSprite.test.tsx:8`), so the placeholder nature is locked in. Asset/readiness for per-enemy, per-pose rendering in rpg-battle is unverified by this batch.

### F-GAMES-B32-016 · Low · Floating-text/animation keys use `Math.random()` / non-stable IDs
`RuneMatchGame.tsx:341,395` generate floating-text IDs with `Math.random().toString(36)`; `WizardZombieGame.tsx:288,302,316` use `Math.random().toString()` for floating-text IDs. Random IDs are collision-prone (small but nonzero) and, more practically, are regenerated such that React cannot reconcile identity across frames if the array is rebuilt. For short-lived FX the risk is low, but a monotonic counter or `crypto.randomUUID()` is safer and avoids duplicate-key warnings under heavy combo spam.

### F-GAMES-B32-017 · Low · `HealthBar` progressbar has no `aria-label`/accessible name
`HealthBar.tsx:25-31` sets `role="progressbar"` with min/now/max but no `aria-label`/`aria-labelledby`. The visible `label` (`:22`) and value text (`:23`) are separate siblings not programmatically associated with the progressbar, so assistive tech announces an unnamed progress indicator. The test (`HealthBar.test.tsx:12-19`) checks numeric attributes only, not the accessible name, so the gap is unguarded. Add `aria-label={`${label} health`}` or `aria-labelledby`.

### F-GAMES-B32-018 · Low · Brittle/shallow tests: count-coupling and "doesn't crash" assertions dominate the game tests
- `WizardZombieGame.test.tsx:174-176` asserts exactly 4 orbs — couples to incidental spawn config; cosmetic change breaks it.
- `RuneMatchGame.test.tsx:188-306` ("completes selection flow", "reverts invalid swaps") contain conditional `if (runeElements.length >= 2)` blocks with **no assertions inside** and comments admitting they only verify "doesn't crash"; the swap/match/scoring/XP logic is effectively untested. `:346-378` ("shows GameEndScreen on victory") never actually reaches victory or asserts the end screen.
- `WizardZombieGame.test.tsx:204-222` ("calls onComplete when exiting after game over") has **no assertion on `onComplete`** — the body just comments that it can't trigger game over.
These tests inflate the count/coverage without guarding the scoring/XP/difficulty/progress behaviors that matter most for this audit.

### F-GAMES-B32-019 · Low · `LobbyScreen` lobby view forces `min-h-screen` / full-page layout — hostile to embedding
`LobbyScreen.tsx:72,182` wrap content in `min-h-screen ... bg-background`, centering on a full viewport. When imported into Reading/Primary (which have their own chrome/headers), this full-screen centering will fight the host layout and create scroll/overflow. A reusable lobby component should size to its container, not the viewport. (Same pattern note as other full-screen game shells in the batch, but here it is plain DOM, not a fullscreen-API game.)

### F-GAMES-B32-020 · Info · `RuneMatchGame` reads `dimensions.width < 768` for layout but also relies on fullscreen + 200ms polling resize
`RuneMatchGame.tsx:106` decides mobile/desktop purely from measured container width, and `:414-439` runs a `ResizeObserver` **plus** a 200 ms `setInterval` (cleared after 2 s) to catch late layout. The interval+observer belt-and-suspenders is a known workaround for Konva sizing but adds complexity and a 2 s window where layout may thrash. Also `getEffectiveTextSize(16)` is applied to many Konva `Text` nodes for accessibility scaling (good), but font sizing inside the grid (`:1071-1078`) uses a hand-rolled `Math.max/min` that ignores `getEffectiveTextSize`, so rune text does not honor the learner's text-size multiplier. Minor consistency gap.

### F-GAMES-B32-021 · Info · `Header` component is generic and unused by reviewed games; variant styling has a redundant class
`header.tsx:18` applies `text-muted-foreground` and then conditionally `text-destructive/80` on the same element — the later utility wins via specificity/order but the combination is redundant and relies on Tailwind ordering. The component is otherwise fine and has no test (acceptable for a trivial presentational header). Noting it has no `data-testid`/role hooks and no JSDoc (AGENTS.md requires JSDoc on exported functions).

### F-GAMES-B32-022 · Info · `MonsterSelection` cards advertise distinct difficulty/stats but `cursor-default` + only the button is interactive
`MonsterSelection.tsx:36` marks the whole card `cursor-default group` while only the "Battle" `Button` (`:59`) triggers `onSelect`. Visually the card hover-scales (`hover:scale-105`) implying the card is clickable, but clicking the card body does nothing — a discoverability/affordance mismatch for young users. Either make the whole card a button or remove the card-level hover affordance.

---

## Cross-Cutting Observations (read-only, not single-line defects)

- **Shared runtime / scoring:** `calculateXP` is used consistently (`RuneMatchGame.tsx:48,458,608`; `WizardZombieGame.tsx:45,216,486`), which is good for cross-game XP comparability. However the two games feed it different "score" semantics (monster reward constant vs. accumulated survival score), and accuracy is emitted on different scales (F-GAMES-B32-002), so a unified host-side progress model is not demonstrated.
- **Difficulty:** wizard-vs-zombie has a real difficulty selector wired into `createWizardZombieState` and adaptive params (`WizardZombieGame.tsx:106-123,453-466`) — a positive contrast to other games in the track. Rune-match difficulty is fixed per monster choice via `MONSTER_DIFFICULTY`.
- **Mobile/browser:** both Konva games handle portrait/landscape via measured dimensions, `touch-none`, virtual controls (`VirtualDPad`, on-screen skill buttons) and `dt` clamping (`RuneMatchGame.tsx:188`, `WizardZombieGame.tsx:262`) — sound for mobile-first. Force-entering fullscreen on play (both games) is a UX/accessibility tradeoff worth confirming with product.
- **Importability:** `MultiplayerGameWrapper` is a clean, host-injected boundary (callbacks + transport passed in) — good shape for reuse — but its inbound-message validation lives outside the batch (F-GAMES-B32-012). Hardcoded API path (F-GAMES-B32-005) and full-screen lobby layout (F-GAMES-B32-019) are the main importability blockers found.
- **Age-appropriate UX:** themed, friendly copy throughout; chief risks are i18n gaps (F-GAMES-B32-014), unguarded motion (F-GAMES-B32-009), and the dead Bomb reward (F-GAMES-B32-001) which can confuse learners.

---

## Limitations

- **Read-only:** No source was executed, built, or edited. Findings are from static reading; test pass/fail was not verified by running Jest/Vitest.
- **Context files not in batch** (`runeMatch.ts`, `rpgBattleSelection.ts`, `useMultiplayerGameState.ts`, `wizardZombie.ts`, `runeMatchConfig.ts`, `useDirectionalInput.ts`, locale files) were inspected only to anchor findings and received no findings here; the runtime logic of `advanceTime`/`advanceWizardZombieTime`/match resolution and the actual multiplayer message validation are out of scope for this line review and may merit their own.
- **Imports assumed correct:** `GameStartScreen`, `GameEndScreen`, `VirtualDPad`, `useGameFullscreen`, `useAccessibilitySettings`, `useAdaptiveDifficulty`, `useGameDimensions`, `withBasePath`, and `Card`/`Button`/`Input` primitives are referenced by batch files but not in this batch; their behavior is assumed, not verified.
- **i18n completeness:** key existence/locale coverage (es/zh/etc.) was not audited; only the presence/absence of i18n usage in batch files was assessed.
- **Dynamic behavior** (timing, collision, swap-match resolution, fullscreen transitions, socket reconnection) was reasoned from source, not exercised.

---

## Scope Confirmation

- Report exists at the required path and covers **all 20 files** listed in `/tmp/opencode/games-batch-32`.
- Every file appears in the Files Reviewed table; findings are line-anchored with severities and `F-GAMES-B32-###` IDs.
- This is a line-by-line review artifact only. **No acceptance or closeout claims are made**; gate decisions remain with the track owner.
