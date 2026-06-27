# Line-by-Line Review — games-batch-26

**Track:** `advantage_games_review_20260626`
**Batch:** `games-batch-26`
**Reviewer:** ark-code-latest (automated line review subagent)
**Date:** 2026-06-27
**Scope:** Read-only line-by-line review. No source code was edited.

## Files reviewed (20)

1. `apps/advantage-games/src/app/page.test.tsx`
2. `apps/advantage-games/src/app/page.tsx`
3. `apps/advantage-games/src/components/games/game/Enemy.test.tsx`
4. `apps/advantage-games/src/components/games/game/Enemy.tsx`
5. `apps/advantage-games/src/components/games/game/Explosion.test.tsx`
6. `apps/advantage-games/src/components/games/game/Explosion.tsx`
7. `apps/advantage-games/src/components/games/game/GameContainer.test.tsx`
8. `apps/advantage-games/src/components/games/game/GameContainer.tsx`
9. `apps/advantage-games/src/components/games/game/GameEndScreen.test.tsx`
10. `apps/advantage-games/src/components/games/game/GameEndScreen.tsx`
11. `apps/advantage-games/src/components/games/game/GameEngine.test.tsx`
12. `apps/advantage-games/src/components/games/game/GameEngine.tsx`
13. `apps/advantage-games/src/components/games/game/GameStartScreen.tsx`
14. `apps/advantage-games/src/components/games/game/HUD.test.tsx`
15. `apps/advantage-games/src/components/games/game/HUD.tsx`
16. `apps/advantage-games/src/components/games/game/InputController.test.tsx`
17. `apps/advantage-games/src/components/games/game/InputController.tsx`
18. `apps/advantage-games/src/components/games/game/MagicBolt.test.tsx`
19. `apps/advantage-games/src/components/games/game/MagicBolt.tsx`
20. `apps/advantage-games/src/components/games/game/RankingDialog.tsx`

This batch covers the **Magic Defense** game (a castle-defense vocabulary game) plus the shared `GameStartScreen` / `GameEndScreen` runtime components used by ~15 other games, and the app main-menu page. The split is roughly: shared runtime (`GameStartScreen`, `GameEndScreen`), Magic-Defense-specific runtime (`GameContainer`, `GameEngine`, `HUD`, `Enemy`, `MagicBolt`, `Explosion`, `InputController`, `RankingDialog`), and the app entry page.

---

## Findings

Severity scale: **Critical** (breaks readiness/importability or causes incorrect scoring), **High** (significant correctness/UX/perf/a11y defect), **Medium** (notable issue, should fix), **Low** (minor/cosmetic), **Info** (observation / verify).

### Scoring / XP / Progress / Difficulty

#### F-GAMES-B26-001 — `increaseScore` double-counts attempts vs `checkAnswer` (scoring integrity) — High
`GameEngine.tsx:412` calls `increaseScore(10)` on a correct answer. `useGameStore.ts:80-84` `increaseScore` increments **both** `correctAnswers` AND `totalAttempts`. But `checkAnswer` for the **incorrect** branch separately calls `incrementAttempts()` (`GameEngine.tsx:419`), and the **correct** branch does NOT call `incrementAttempts()` — it relies on `increaseScore` to bump `totalAttempts`. This is internally consistent for typed answers, but `handleReachBottom` (`GameEngine.tsx:310`) also calls `incrementAttempts()` for a missile that reaches the bottom. Net effect: a missile that is never answered and reaches the bottom counts as one attempt with zero correct, which is reasonable, but a word answered *incorrectly* (typed wrong) AND later reaching the bottom is counted as **two** attempts. Accuracy denominator can therefore exceed the number of distinct vocabulary encounters, deflating accuracy and the XP it feeds (`xp.ts:8`). Verify intended attempt-counting semantics.

#### F-GAMES-B26-002 — XP formula ignores score and difficulty (XP/difficulty fairness) — Medium
`xp.ts:1-13` computes XP as `floor(correctAnswers * accuracy)`. It ignores `score` (passed in but unused at `xp.ts:1-2`) and ignores difficulty entirely. `GameContainer.tsx:36` calls `calculateXP(score, correctAnswers, totalAttempts)` — the `score` argument is dead. Players on `extreme` (`GameEngine.tsx:187-193`) earn the same XP as `easy` for equal correct/accuracy, removing any incentive/reward for harder difficulty. For a platform that surfaces difficulty-segmented leaderboards (`RankingDialog.tsx:63`), XP that is difficulty-blind is a fairness gap.

#### F-GAMES-B26-003 — Two disconnected leaderboard systems (progress/leaderboard coherence) — High
`GameEndScreen.tsx:89,100` records sessions via `useLeaderboard()` which is **localStorage-only** (`useLeaderboard.ts:14-28`, key `LEADERBOARD_KEY`). Meanwhile `RankingDialog.tsx:42` fetches a **server** ranking from `/api/v1/games/magic-defense/ranking`. The Magic Defense `GameContainer`/`ResultsScreen` path (which uses `RankingDialog`) never appears to POST a score to that server endpoint anywhere in this batch — and `GameContainer` does not render `GameEndScreen`, so the `recordSession` localStorage write never fires for Magic Defense. Result: the "Hall of Records" dialog reads from a backend that nothing in this batch writes to, while `GameEndScreen`'s localStorage leaderboard is used by the *other* games. Scoring persistence for Magic Defense is unverified/likely incomplete. This is the single biggest readiness risk in the batch.

#### F-GAMES-B26-004 — Hardcoded 60s timer disconnected from difficulty (difficulty design) — Medium
`GameEngine.tsx:146` hardcodes `timeRemaining = 60`, and `GameEngine.tsx:213` resets to 60 on any difficulty change. Difficulty only affects spawn rate / fall duration (`GameEngine.tsx:171-203`), not session length. The 60-second cap is a magic number not present in `magicDefenseConfig`. Game can also end two ways (timer expiry `GameEngine.tsx:162` → `endGame()`; all castles destroyed `useGameStore.ts:91-94`), but `GameEndScreen` status (`victory`/`defeat`/`complete`) is not wired here — see F-GAMES-B26-005.

#### F-GAMES-B26-005 — No win/lose status distinction for Magic Defense end state — Medium
The store status is only `idle | playing | game-over` (`useGameStore.ts:24`). There is no concept of victory vs defeat. `GameContainer.tsx:75-84` renders `ResultsScreen` (not the shared `GameEndScreen`), so the rich `victory/defeat/complete` UX in `GameEndScreen.tsx:33-72` is unavailable to Magic Defense. Surviving the timer vs. losing all castles produce the same "Game Over" screen (test asserts only `/Game Over/i` at `GameContainer.test.tsx:64`). UX does not reward survival.

### Shared runtime / importability into Reading & Primary

#### F-GAMES-B26-006 — Hardcoded `/student/leaderboard` link breaks portability — High
`GameEndScreen.tsx:179-181` hardcodes `<Link href="/student/leaderboard">`. This shared component is imported by ~15 games (grep confirms CastleDefense, PotionRush, DungeonLiberator, GryphonPatrol, GriffinRidersEscape, Spellweavers, LabyrinthGoblinKing, HauntedLibrary, RuneForge, GriffinSkyJoust, DevourerSlime, ShadowGateDungeon, VillageGuardian, etc.). When imported into Reading Advantage or Primary Advantage, `/student/leaderboard` may not exist or may live under a locale/base-path prefix. The route should be a prop (the component already takes `gameId`/`gameName` props — a `leaderboardHref` prop would fit the existing API). Hardcoding a host-app route into a shared library component is an importability defect.

#### F-GAMES-B26-007 — `recordSession` side effect inside shared component couples it to localStorage — Medium
`GameEndScreen.tsx:98-102` writes to the localStorage leaderboard as a render side effect whenever `xp > 0 && gameId && gameName`. A host app (Reading/Primary) that wants server-persisted progress cannot opt out of the localStorage write without removing `gameId`/`gameName`, which also disables the leaderboard link. Persistence strategy should be injected (callback/adapter) rather than baked into the shared end screen. Per AGENTS.md, persistence should go through an adapter, not a component-local `window.localStorage` call.

#### F-GAMES-B26-008 — `recordSession` effect can fire on benign re-renders / missing dependency stability — Medium
`GameEndScreen.tsx:98-102` effect depends on `recordSession` (from `useLeaderboard`, memoized via `useCallback` with `[]` at `useLeaderboard.ts:83`, OK) but also on `score`, `xp`, `safeAccuracy`, `gameId`, `gameName`. If a parent re-mounts `GameEndScreen` (e.g., restart that unmounts/remounts), a duplicate session is recorded. There is no idempotency guard (no "already recorded" ref). For host apps that map sessions to real progress, duplicate writes inflate `totalXp` (`useLeaderboard.ts:77`). Recommend a `hasRecordedRef` guard.

#### F-GAMES-B26-009 — `customStats` silently truncated to 2 — Low
`GameEndScreen.tsx:96` `customStats?.slice(0, 2)` silently drops any stats beyond the first two. Games passing 3+ stats (common for richer games) lose data with no warning. Acceptable as a layout constraint but undocumented; the JSDoc-less prop (`GameEndScreen.tsx:24`) gives no hint. Consider documenting the cap.

### Game readiness / state & lifecycle

#### F-GAMES-B26-010 — `onComplete` effect omits `xp` from results but recomputes accuracy — Medium
`GameContainer.tsx:38-56` fires `onComplete` with `{score, correctAnswers, totalAttempts, accuracy, difficulty}` but **not** `xp`, even though `xp` is computed at `GameContainer.tsx:36` and the host almost certainly needs XP for progress recording. Hosts must re-derive XP, risking divergence from `calculateXP`. Also `accuracy` and `difficulty` are in the dependency array (`GameContainer.tsx:54-55`) — `difficulty` is React state set on start, so a difficulty change mid-`game-over` would refire `onComplete`. Low risk but the contract should include `xp`.

#### F-GAMES-B26-011 — `useGameStore.getState()` read outside React reactivity — Low
`GameContainer.tsx:80` reads `useGameStore.getState().missedWords` imperatively instead of from the subscribed hook (`GameContainer.tsx:23-30` does not destructure `missedWords`). This works because the component re-renders on `status` change, but it bypasses reactivity and is fragile — if `missedWords` updates without a status change, the UI won't refresh. Tests paper over this by also mocking `getState` (`GameContainer.test.tsx:79,99`). Prefer subscribing to `missedWords`.

#### F-GAMES-B26-012 — Special-ability `Explosion` Y position hardcoded/approximate — Low
`GameEngine.tsx:265,344` set explosion `y: 50` with comment "Approximate Y" because actual missile Y is not tracked (animation is framer-driven via CSS top%). Explosions appear mid-screen regardless of where the enemy was, a visual-fidelity defect. Bolt targeting `targetY: 20` (`GameEngine.tsx:398`) and wizard `startY: 80` (`GameEngine.tsx:490`) are likewise hardcoded magic numbers.

#### F-GAMES-B26-013 — `checkAnswer` matches only `state === 'falling'` enemies; race with bolt travel — Low
`GameEngine.tsx:366-370` matches a falling missile and immediately sets it to `targeted` (`:382`), but the actual destruction/score only completes after the bolt animation (`handleBoltComplete`, `GameEngine.tsx:334-356`). During bolt flight the missile keeps animating downward and could call `onReachBottom` → `handleReachBottom` → `damageCastle` for a word the player already answered correctly. `handledHitsRef` (`GameEngine.tsx:138,290`) guards double-hit but not the targeted-then-reaches-bottom case (state is `targeted`, not in the falling filter, but the framer `onAnimationComplete` at `Enemy.tsx:49` only fires `onReachBottom` when `state === 'falling'`, so this is mitigated — verify the state actually propagates to `Enemy` before bottom is reached). Edge-case correctness worth a targeted test.

### Assets / audio / performance / mobile / browser compatibility

#### F-GAMES-B26-014 — `Explosion` uses non-deterministic `Math.random()` in render — Medium
`Explosion.tsx:26-27` calls `Math.random()` inside the `animate` prop during render. This is non-deterministic (re-renders would jitter particles) and untestable for exact values. Combined with `GameEngine` spawning explosions per hit and per special ability (up to all falling missiles at once, `GameEngine.tsx:262-267`), many simultaneous 8-particle bursts can spike layout/animation cost on low-end mobile. No particle pooling or cap. Performance risk on extreme difficulty.

#### F-GAMES-B26-015 — Placeholder sound for special ability — Low
`GameEngine.tsx:252` plays `"success"` for the Thunder Storm ultimate with comment `// Add a better sound later like "thunder"`. Audio is incomplete/placeholder; flagged for readiness (not a defect, a TODO that shipped).

#### F-GAMES-B26-016 — `navigator.maxTouchPoints` mobile detection is brittle — Low
`GameEngine.tsx:108-114` detects mobile via `navigator.maxTouchPoints > 0 || "ontouchstart" in window`. Touch-screen laptops and hybrid devices register as "mobile" and get the bottom input bar instead of the keyboard-centric desktop UI. Detection runs once in `useEffect` (`:109`) so it does not respond to orientation/input changes. Consider a CSS/pointer-media-query approach for browser compatibility.

#### F-GAMES-B26-017 — `Intl.Segmenter("th", ...)` hardcodes Thai locale — Medium
`InputController.tsx:124` constructs `new Intl.Segmenter("th", { granularity: "grapheme" })`. (a) `Intl.Segmenter` is unsupported in older Safari (<16.4) and some embedded webviews — no feature-detect/fallback, so the desktop input display throws on those browsers (browser-compat readiness). (b) Hardcoding `"th"` is wrong for a vocabulary game that may render English/Spanish/other scripts; grapheme segmentation locale should match content. (c) This is constructed on **every keystroke render** (`:123-127`) rather than memoized — minor perf.

#### F-GAMES-B26-018 — Desktop `InputController` global click-to-refocus is intrusive — Medium
`InputController.tsx:23-31` adds a `window` `click` listener that force-focuses the hidden input on **every** click anywhere in the document. In a host app (Reading/Primary) this steals focus from other interactive elements (buttons, dialogs, links) on the page, an accessibility and UX hazard — keyboard/AT users cannot move focus away. The `RankingDialog` (rendered as sibling in `GameContainer.tsx:86`) and any host chrome would fight this listener. Scope the listener to the game container.

#### F-GAMES-B26-019 — Magician position uses `bottom-[80px]` arbitrary offsets — Low
`GameEngine.tsx:631` `bottom-[80px] sm:bottom-32` and castle padding `pb-14 sm:pb-2` (`:511`) are hand-tuned magic numbers to avoid the mobile input bar. Brittle across the 390×844 reference and tablet sizes; small viewports may overlap the wizard with the input bar.

### Accessibility

#### F-GAMES-B26-020 — Falling enemy words not announced to assistive tech / time-pressured input — High
`Enemy.tsx:71` marks the sprite `aria-hidden`, and the term label (`Enemy.tsx:74-76`) is plain text with no live region. The entire game loop is a real-time typing race with a hardcoded 60s timer and shrinking fall duration; there is no reduced-motion option, no pause, and no non-visual way to know which words are falling. Screen-reader and motor-impaired users cannot play. For an education platform this is a significant accessibility gap. `useAccessibilitySettings` is imported but its result is explicitly unused (`GameEngine.tsx:135-136` `eslint-disable @typescript-eslint/no-unused-vars` + `getEffectiveTextSize` never called) — accessibility hook wired but inert.

#### F-GAMES-B26-021 — Mobile input lacks label / desktop input is visually hidden with no a11y name — Medium
`InputController.tsx:52-74` (mobile) input has `placeholder="Type spell..."` but no `<label>` / `aria-label`. The desktop hidden input (`InputController.tsx:92-102`) has `opacity-0 h-0 w-0` and `autoFocus` with no accessible name; AT users get an unlabeled text field. Submit buttons (`:75-83`) have only an icon (`SendHorizonal`) with no `aria-label`.

#### F-GAMES-B26-022 — Color-only feedback for correct/incorrect — Low
`GameEngine.tsx:451-458` flashes green/red overlay for correct/incorrect with no text/icon/sound-independent cue (the only other signal is audio `success`/`error`). Color-blind users relying on the flash get ambiguous feedback. The timer low-warning is also color + pulse only (`HUD.tsx:68`).

#### F-GAMES-B26-023 — Spacebar global keydown hijacks Space for special ability — Medium
`GameEngine.tsx:278-286` adds a `window` keydown for `Space` → `activateSpecialAbility`. There is no `preventDefault` guard or focus check, so pressing Space while focused in any host-app control (or scrolling) could trigger the ultimate and/or be swallowed. In the desktop input flow the user is typing, and Space is a normal character — pressing space mid-word both inserts a space AND fires the ultimate. Conflicting key semantics.

### Page / menu

#### F-GAMES-B26-024 — Menu button label/test mismatch ("Start Game" vs "Play Now") — Medium
`page.tsx:53` renders the link text `Start Game`, but `page.test.tsx:24,33` queries `getAllByRole('link', { name: /Play Now/i })`. The test asserts links named "Play Now" exist and that their count equals playable games (`page.test.tsx:26`). Since the rendered text is "Start Game", these queries return **empty arrays**, so `toHaveLength(playableGames.length)` would only pass if `playableGames.length === 0`, and the Enchanted Library assertion (`page.test.tsx:38`) would fail. Either the test is stale/failing or `gameCards` yields no playable games. This test does not validate what it claims — confirm test status (see Limitations: tests not executed).

#### F-GAMES-B26-025 — `Image` cover uses `grayscale` + `object-contain` 1024×1536 portrait — Low
`page.tsx:34-44` renders each cover at intrinsic 1024×1536 with `grayscale hover:grayscale-0`. Large portrait images for every card with no `priority`/lazy guidance beyond Next defaults; many cards = heavy initial paint on the menu. Grayscale-by-default may reduce age-appropriate visual appeal for younger Primary users.

### Age-appropriate UX

#### F-GAMES-B26-026 — "Failure"/"System offline"/"Candidate" tone skews clinical/harsh — Low
`GameEndScreen.tsx:55,65,131` use cold/militaristic copy ("Failure", "System offline.", "Process finalized.") and `RankingDialog.tsx:123` labels every player "Candidate"; `RankingDialog.tsx:144` "Hall of Records"; `GameContainer.test.tsx:31` "Defense Briefing". For Primary Advantage (younger learners) this tone is not age-appropriate/encouraging. Defeat messaging for children should be supportive, not "System offline."

#### F-GAMES-B26-027 — Magic Defense "Game Over" with no encouragement / next-step — Low
The Magic Defense end path (`GameContainer.tsx:75`, `ResultsScreen`, not in this batch) shows "Game Over" (`GameContainer.test.tsx:64`) and missed words. Missed-words review (`GameContainer.test.tsx:85-104`) is pedagogically good, but there is no positive reinforcement or retry-just-missed-words affordance visible here.

### Test quality

#### F-GAMES-B26-028 — `GameEngine.test.tsx` contains empty / no-assertion tests — High
`GameEngine.test.tsx:41-63` ("damages a castle when a missile reaches bottom") has a body that is **entirely comments and no assertions** — it renders and asserts nothing, so it passes vacuously while pretending to cover the core castle-damage logic. `GameEngine.test.tsx:140-163` ("shows low time warning when timeRemaining <= 10") advances timers by 51s but makes **no assertion** about the warning. These are false-coverage tests for the most important runtime behavior (scoring/damage/timer). The InputController's submit→GameEngine→store→damage path is essentially untested.

#### F-GAMES-B26-029 — `Explosion.test.tsx` mocks framer-motion to auto-fire `onAnimationComplete` — Medium
`Explosion.test.tsx:5-27` replaces `motion.div` so `onAnimationComplete` fires immediately for *every* particle, then asserts `onComplete` called once (`:36`). The "once" only holds because the component guards with `i === 0 ? onComplete : undefined` (`Explosion.tsx:33`). The test does not verify the real animation completion path, nor the `Math.random` particle spread (F-GAMES-B26-014). Reasonable smoke test but over-mocked.

#### F-GAMES-B26-030 — `MagicBolt.test.tsx` only asserts "renders without crashing" — Medium
`MagicBolt.test.tsx:4-7` renders and asserts nothing. `onComplete` (the bolt's only behavioral contract, `MagicBolt.tsx:20`) is never verified to fire. Trivial coverage for a component that drives enemy destruction.

#### F-GAMES-B26-031 — `HUD.test.tsx` covers only score/accuracy, ignores timer/combo/mana — Low
`HUD.test.tsx:5-18` asserts only `1230` and `85%`. Timer formatting (`HUD.tsx:16-18`, e.g. `1:00`), combo badge visibility threshold (`HUD.tsx:37` `combo > 1`), mana bar width, and the `timeRemaining <= 10` destructive styling (`HUD.tsx:68`) are untested despite being scoring/UX-relevant.

#### F-GAMES-B26-032 — `GameContainer.test.tsx` relies on dual mock of hook + `getState` — Low
`GameContainer.test.tsx:79,99` set `mockUseGameStore.getState` separately from the hook return, mirroring the production reliance on `getState()` (F-GAMES-B26-011). Tests encode the smell rather than catch it. The "renders GameEngine when status is playing" test (`:34-50`) mocks the store but `GameEngine` is real here, so it implicitly depends on `magicDefenseConfig`/`useGameFullscreen`/`useSound` not throwing — brittle.

#### F-GAMES-B26-033 — `RankingDialog.tsx` has no test and unhandled error path — Medium
`RankingDialog.tsx` (no `RankingDialog.test.tsx` in the directory listing) is untested. The fetch (`:42`) logs to `console.error` (`:48`) on failure but leaves `loading=false` and `data=null` → shows "No rankings available" (`:87-95`) indistinguishably from an empty leaderboard, so server errors are invisible to users. `useEffect` dependency array `[open]` (`:37`) omits `fetchRankings` (defined inline each render) — works but eslint-exhaustive-deps would flag it. No request cancellation on close/unmount (`:39-52`) → possible setState-after-unmount.

#### F-GAMES-B26-034 — `Enemy.test.tsx` does not exercise death/reach-bottom callbacks — Low
`Enemy.test.tsx:5-24` asserts term text and sprite background only. The behavioral contract — `onReachBottom`/`onDeathComplete` firing via framer `onAnimationComplete` (`Enemy.tsx:44-52`) and the `dying` state branch (`Enemy.tsx:31-43`) — is untested.

#### F-GAMES-B26-035 — No test for `GameStartScreen` in this directory — Low
`GameStartScreen.tsx` is a shared component used by ~15 games but has no colocated `GameStartScreen.test.tsx` (directory listing confirms). Its instruction-rendering fallback (`:98-102`), step-number padding (`:85-87`), and controls hidden on mobile (`:153`) are unverified. AGENTS.md requires tests for new shared code.

### Info / observations

#### F-GAMES-B26-036 — `withBasePath` correctly used for sprite/background assets — Info
`Enemy.tsx:7`, `GameEngine.tsx:446` (via `GAME_CONSTANTS.backgroundImage`), and tests (`Enemy.test.tsx:22`, `GameEngine.test.tsx:37`) consistently route asset URLs through `withBasePath` (`basePath.ts`). Good for sub-path deployment / importability. No action needed.

#### F-GAMES-B26-037 — `safeAccuracy` clamping in `GameEndScreen` is a good defensive pattern — Info
`GameEndScreen.tsx:90-93` guards against NaN/out-of-range accuracy before display and `recordSession`. Recommend the same clamp be applied in `GameContainer.tsx:35` (raw `correctAnswers/totalAttempts`) and `xp.ts` to keep XP/accuracy consistent across the localStorage and server leaderboards.

#### F-GAMES-B26-038 — Magic numbers should move to `magicDefenseConfig` — Info
Timer `60` (`GameEngine.tsx:146,213`), mana gain `10` (`:377`), score `10` (`:412`), combo threshold `% 3` (`:403`), spawn/duration step `200`/`0.5` (`:405-408`), and difficulty tables (`:171-203`) are inline. `SCALING_CONFIG`/`GAME_CONSTANTS`/`CASTLE_CONFIG` already exist (`:11-14`); consolidating these aids tuning and difficulty balance review.

---

## Severity summary

| Severity | IDs |
|----------|-----|
| Critical | (none) |
| High | F-GAMES-B26-001, F-GAMES-B26-003, F-GAMES-B26-006, F-GAMES-B26-020, F-GAMES-B26-028 |
| Medium | F-GAMES-B26-002, F-GAMES-B26-004, F-GAMES-B26-005, F-GAMES-B26-007, F-GAMES-B26-008, F-GAMES-B26-010, F-GAMES-B26-014, F-GAMES-B26-017, F-GAMES-B26-018, F-GAMES-B26-021, F-GAMES-B26-023, F-GAMES-B26-024, F-GAMES-B26-029, F-GAMES-B26-030, F-GAMES-B26-033 |
| Low | F-GAMES-B26-009, F-GAMES-B26-011, F-GAMES-B26-012, F-GAMES-B26-013, F-GAMES-B26-015, F-GAMES-B26-016, F-GAMES-B26-019, F-GAMES-B26-022, F-GAMES-B26-025, F-GAMES-B26-026, F-GAMES-B26-027, F-GAMES-B26-031, F-GAMES-B26-032, F-GAMES-B26-034, F-GAMES-B26-035 |
| Info | F-GAMES-B26-036, F-GAMES-B26-037, F-GAMES-B26-038 |

## Per-file coverage confirmation

| # | File | Findings |
|---|------|----------|
| 1 | `app/page.test.tsx` | F-GAMES-B26-024 |
| 2 | `app/page.tsx` | F-GAMES-B26-024, F-GAMES-B26-025 |
| 3 | `Enemy.test.tsx` | F-GAMES-B26-034 |
| 4 | `Enemy.tsx` | F-GAMES-B26-020, F-GAMES-B26-036 |
| 5 | `Explosion.test.tsx` | F-GAMES-B26-029 |
| 6 | `Explosion.tsx` | F-GAMES-B26-014 |
| 7 | `GameContainer.test.tsx` | F-GAMES-B26-032 |
| 8 | `GameContainer.tsx` | F-GAMES-B26-003, F-GAMES-B26-005, F-GAMES-B26-010, F-GAMES-B26-011, F-GAMES-B26-037 |
| 9 | `GameEndScreen.test.tsx` | (covered via component) — no defect unique to test; smoke coverage adequate |
| 10 | `GameEndScreen.tsx` | F-GAMES-B26-003, F-GAMES-B26-006, F-GAMES-B26-007, F-GAMES-B26-008, F-GAMES-B26-009, F-GAMES-B26-026, F-GAMES-B26-037 |
| 11 | `GameEngine.test.tsx` | F-GAMES-B26-028 |
| 12 | `GameEngine.tsx` | F-GAMES-B26-001, F-GAMES-B26-004, F-GAMES-B26-012, F-GAMES-B26-013, F-GAMES-B26-014, F-GAMES-B26-015, F-GAMES-B26-016, F-GAMES-B26-019, F-GAMES-B26-020, F-GAMES-B26-022, F-GAMES-B26-023, F-GAMES-B26-036, F-GAMES-B26-038 |
| 13 | `GameStartScreen.tsx` | F-GAMES-B26-035 |
| 14 | `HUD.test.tsx` | F-GAMES-B26-031 |
| 15 | `HUD.tsx` | F-GAMES-B26-022, F-GAMES-B26-031 |
| 16 | `InputController.test.tsx` | (smoke coverage; behavioral gaps noted under component) |
| 17 | `InputController.tsx` | F-GAMES-B26-017, F-GAMES-B26-018, F-GAMES-B26-021 |
| 18 | `MagicBolt.test.tsx` | F-GAMES-B26-030 |
| 19 | `MagicBolt.tsx` | F-GAMES-B26-030 (contract untested) |
| 20 | `RankingDialog.tsx` | F-GAMES-B26-003, F-GAMES-B26-033 |

All 20 files in `/tmp/opencode/games-batch-26` were read and reviewed.

## Limitations

- **Read-only review.** No source files were modified. Findings are observations, not fixes.
- **Tests were not executed.** Findings about test pass/fail status (notably F-GAMES-B26-024, F-GAMES-B26-028) are inferred from static reading. F-GAMES-B26-024 in particular flags a label/query mismatch that may indicate a stale or failing test; this was not confirmed by running `jest`. Confirm by running the app test suite.
- **Cross-file context partial.** Supporting files outside the batch were consulted for accuracy (`useGameStore.ts`, `xp.ts`, `useLeaderboard.ts`, `basePath.ts`, `types/leaderboard`, and the grep of `GameStartScreen`/`GameEndScreen` importers) but were **not** themselves line-reviewed. `ResultsScreen.tsx`, `StartScreen.tsx`, `magicDefenseConfig.ts`, `useSound`, `useInterval`, `useGameFullscreen`, `useAccessibilitySettings`, and the `/api/v1/games/magic-defense/ranking` route handler are referenced by this batch but are out of scope here; F-GAMES-B26-003 (server vs localStorage leaderboard) should be re-verified against the API route and `ResultsScreen` when those are reviewed.
- **No runtime/visual/perf measurement.** Performance, mobile-layout, browser-compat, and accessibility findings are based on code inspection only; no profiling, device testing, or AT testing was performed.
- **gameCards content not inspected.** F-GAMES-B26-024/025 depend on `@/lib/gameCards`, which was not opened.
- **No acceptance or closeout judgment is made.** This document is a line-review artifact only and makes no claim that the batch, track phase, or any acceptance/closeout gate is satisfied.
</content>
</invoke>
