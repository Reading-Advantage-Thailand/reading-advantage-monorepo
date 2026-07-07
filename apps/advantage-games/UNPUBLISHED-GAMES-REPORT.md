# Unpublished Games Review — 2026-07-07

Scope: games present in `apps/advantage-games` but **not** imported into `apps/reading-advantage`.

Published (excluded): castle-defense, potion-rush, dragon-flight, dragon-rider, enchanted-library,
rpg-battle, rune-match, wizard-vs-zombie, magic-defense (shared GameEngine).

Method per game: scoped jest suite → browser load (`/en/student/games/<type>/<slug>/`) →
start a session and interact with the canvas → capture page/console errors + screenshot.

## Repo-wide static checks

- `tsc --noEmit`: **clean** (0 errors)
- `eslint src/components/games src/app`: **0 errors** (1858 warnings, all missing jest globals in
  the ESLint config for `*.test.*` files — config noise, not code defects)

## Cross-cutting findings

- **babel-architect**: `src/lib/gameCards.ts` marks it `playable` with href
  `/student/games/sentence/babel-architect`, but no page or component exists anywhere in the app.
  The main-menu card links to a guaranteed 404. Either flip to `coming-soon` or remove the href.

---

## Per-game results

### 1. alchemists-synthesis (vocabulary)

**Verdict: BLOCKED — unplayable by real users; core gameplay logic works.**

- **Syntax/static**: clean (tsc, eslint).
- **Jest**: `AlchemistsSynthesisGame` suite passes (6/6). `page.test.tsx` **2/2 FAIL** — tests
  expect full-path i18n keys (`pages.student.gamesPage.games.alchemistsSynthesis.title`) but the
  Phase-5 fallback renders scope-relative keys (`games.alchemistsSynthesis.title`). Stale tests.
- **BLOCKER (gameplay)**: the Start Game button cannot be clicked by a real pointer at mobile
  (390×844) *or* desktop (1280×800) viewport — the page's game-frame div
  (`overflow-hidden`, `height: min(85svh, 100%)` in `page.tsx`) intercepts the tap. The
  `min(85svh, 100%)` height resolves against an indefinite parent, the start screen is pushed
  outside the clip region, and Playwright confirms pointer interception at every viewport.
  Verified: a JS-dispatched `click()` starts the game fine, so the handler wiring is correct —
  this is purely a layout/hit-testing defect.
- **i18n**: raw keys rendered throughout — `games.alchemistsSynthesis.title/.description`,
  `title`, `SUBTITLE`, `instructions.match`, `instructions.time`. `en.ts` has **zero** entries
  for this game (only published games are covered).
- **Gameplay (once force-started)**: works. Canvas mounts, fullscreen engages, prompt word +
  4 Thai options render, taps register, rounds advance (observed round 2/7), score displayed.
  Zero console/page errors during play.
- Screenshots: `vocabulary_alchemists-synthesis_{started,end}.png` (scratchpad).

### 2. archers-revenge (vocabulary)

**Verdict: PLAYABLE — gameplay works end to end; minor issues.**

- **Syntax/static**: clean.
- **Jest**: 11/12 pass. `route.test.ts` for `/complete` **fails** — it expects a legacy response
  shape (`message: "Game completed successfully"`, `xpEarned: 16`) but the shared
  `createCompleteRoute()` factory returns `{ xpEarned, activityId, duplicate, status }`.
  Stale test, not an app bug.
- **Gameplay**: start button ("Draw Your Bow") is natively clickable — the pointer-interception
  blocker seen in alchemists-synthesis does **not** occur here. Canvas mounts, taps fire arrows,
  scoring/HP/wave systems all respond (observed Score 100, HP 2/3, Wave 1). Zero runtime errors.
- **i18n**: page header shows raw keys (`games.archersRevenge.title/.description`) — missing
  `en.ts` entries. In-game strings are English literals and render fine.
- **Cosmetic**: enemy word labels can overlap when adjacent words are long
  ("Mountain" / "How are you" collide at 390px width).

### 3. paladins-twin-soul (vocabulary)

**Verdict: PLAYABLE — cleanest result so far.**

- **Syntax/static**: clean. **Jest**: 3/3 pass.
- **Gameplay**: start button natively clickable, canvas mounts, game runs (Wave 1, Score 800,
  HP 3, projectiles firing, on-screen joystick renders). Zero runtime errors.
- **i18n**: page header uses hardcoded English strings ("Paladin's Twin-Soul" / "Defend the
  realm...") rather than i18n keys — displays fine, but inconsistent with the i18n pattern.
- **Worth a manual look**: during the automated run the prompt word ("Hello") was visible but
  enemy word labels were not obvious on the gargoyle grid — verify labels appear as designed.

### 4. abyssal-well (sentence)

**Verdict: PLAYABLE — runs clean; two content issues to verify.**

- **Syntax/static**: clean. **Jest**: 11/11 pass.
- **Gameplay**: native start click works, canvas mounts, HUD renders (Thai target sentence,
  hearts, "Target: The"), cannon + well rings drawn. Zero runtime errors. Touch handlers exist
  in `AbyssalWellGame.tsx` alongside the keyboard hints ("← → Rotate / Space = Fire").
- **Worth a manual look**: no enemies were visible after ~15 s of play in the automated run —
  verify spawn pacing isn't too slow (or spawns aren't off-screen) at 390×844.
- **i18n**: back-button text is **hardcoded Thai** (`กลับไปหน้าเกม`, page.tsx:129,185) even on the
  `/en/` route; game title/description are hardcoded English. Mixed-language UI on every locale.

### 5. devourer-slime (sentence)

**Verdict: PLAYABLE.**

- **Syntax/static**: clean. **Jest**: 6/6 pass.
- **Gameplay**: auto-starts into play (no start screen). Slime renders, word orbs spawn
  ("the", "The", ...), translation prompt + progress pips, hearts/score/size HUD, and a
  touch D-pad all render. Zero runtime errors.
- **Cosmetic**: D-pad buttons overlap word orbs in the lower-left at 390×844; worth checking
  that orbs never spawn unreachable behind the controls.

### 6. dungeon-liberator (sentence)

**Verdict: PLAYABLE — polished.**

- **Syntax/static**: clean. **Jest**: 12/12 pass.
- **Gameplay**: native start click works. Full scene renders (dungeon art, knight, prisoner
  sprites labeled with sentence words, Thai prompt bubble, lives/rescued/level HUD, virtual
  joystick). Zero runtime errors.
- **i18n**: hardcoded Thai back button (`กลับไปหน้าเกม`) on the `/en/` route, same as abyssal-well.
- **Cosmetic**: word labels stack tightly at the right edge ("exams/study/for") at 390px.

### 7. griffin-riders-escape (sentence)

**Verdict: BROKEN — game freezes after one frame.**

- **Syntax/static**: clean. **Jest**: 9/9 pass (they test the pure tick logic, not loop wiring).
- **GAME-BREAKING BUG**: in `GriffinRidersEscapeGame.tsx` the main game loop is scheduled once
  (`rafRef.current = requestAnimationFrame(loop)` at effect setup, ~line 108) but `loop()` never
  re-schedules itself — unlike every working game (e.g. alchemists-synthesis re-arms
  `requestAnimationFrame(gameLoop)` inside the loop). The game advances exactly one ~16 ms tick
  and freezes: no gates or obstacles ever spawn, the rider never appears, score stays 0.
  Confirmed in-browser: started/end screenshots after ~15 s of input are pixel-identical, with
  an empty play field. (The separate player-lerp rAF loop *does* self-schedule, which masks the
  bug in casual inspection.)
  **Fix**: add `rafRef.current = requestAnimationFrame(loop)` at the end of `loop()`.
- No runtime errors; start button natively clickable; HUD (hearts, score, translate prompt,
  word chips) renders fine.

### 8. griffin-sky-joust (sentence)

**Verdict: PLAYABLE.**

- **Syntax/static**: clean. **Jest**: 10/10 pass.
- **Gameplay**: runs well — enemy knights carry sentence words ("flies", "in", "The", "bird",
  "the", "sky"), current target highlighted gold, griffin responds to taps (flap), HP reacts to
  collisions (dropped 3→1 during random input), Thai prompt in HUD. Zero runtime errors.
- Auto-enters play without a labeled start button (smoke used JS fallback; no user-facing
  issue observed — flow goes straight into the game).
- Keyboard hints ("Space/Tap = Flap, A/D = Drift") include touch, good for mobile.

### 9. gryphon-patrol (sentence)

**Verdict: PLAYABLE with layout defects.**

- **Syntax/static**: clean. **Jest**: 8/8 pass.
- **Gameplay**: runs — difficulty selector (EASY→EXTREME), enemies carry sentence words, minimap
  renders, sentence prompt shown. Zero runtime errors.
- **Layout bug (mobile)**: at 390×844 the playfield occupies only the upper-left ~3/4 of the
  frame; a large dead black band fills the right edge and bottom third. Canvas/world scaling
  doesn't fit the portrait reference viewport.
- **Worth a manual look**: player renders as two plain yellow squares (looks like placeholder
  art); prompt sentence is shown in English rather than the Thai translation pattern used by
  the other sentence games — confirm intended.

### 10. haunted-library (sentence)

**Verdict: BROKEN — rAF storm renders the game at ~1 FPS.**

- **Syntax/static**: clean. **Jest**: 23/23 pass.
- **GAME-BREAKING BUG**: `HauntedLibraryGame.tsx` (~line 210) schedules the next
  `requestAnimationFrame` from **inside the `setGameState` updater** — a documented workaround
  for the import-harness test's strict `rafCalls < 2` mock. State updaters must be pure: React
  (dev/StrictMode, and interrupted concurrent renders) invokes them more than once, so each tick
  schedules multiple next-frames and the loop multiplies **exponentially**. Measured in-browser:
  65,535 rAFs scheduled within 2 s of starting, 458,752 more over the next 3 s; effective frame
  rate ~1 FPS (screenshots time out because the compositor never gets an idle frame).
  Zero JS errors — it's pure CPU meltdown.
  **Fix**: schedule the next frame outside the updater (end of `loop()`, guarded by
  `isLoopActiveRef`), and rework the import-harness RAF-budget expectation instead of bending
  the runtime loop around it. The in-code comment claiming "production impact: none" is wrong —
  any re-invoked updater doubles the loop permanently.
- Start screen, HUD, and canvas all mount; no i18n issues seen on the start screen (English
  literals; Thai prompt appears in HUD as designed).

### 11. labyrinth-goblin-king (sentence)

**Verdict: PLAYABLE.**

- **Syntax/static**: clean. **Jest**: 13/13 pass.
- **Gameplay**: native start works; maze, word orbs (target highlighted gold), goblins, player
  avatar with hearts, progress HUD ("Words: 0/5 | Goblins Eaten: 0"), virtual joystick, Thai
  prompt bar. Zero runtime errors.
- **i18n**: hardcoded Thai back button (`กลับไปหน้าเกม`) on `/en/`, same pattern as others.
- **Cosmetic**: dead vertical gap between the maze (top ~55%) and the joystick zone at 390×844.

### 12. realm-carver (sentence)

**Verdict: BROKEN — cannot start at all.**

- **Syntax/static**: clean. **Jest**: 7/7 pass (component only; the page bug is untested).
- **GAME-BREAKING BUG**: the page never gets past loading — UI shows "Unable to Start Game /
  An error occurred while loading the game." Console:
  `TypeError: Cannot read properties of undefined (reading 'split')` in
  `page.tsx` `fetchSentences` (line ~47): the code reads `sentence.text.split(" ")`, but the
  shared sentences API (`createSentencesRoute`) returns `VocabularyItem`s shaped
  `{ term, translation }` — verified via `curl`: `{"sentences":[{"term":"The cat sits on the
  mat","translation":"แมวนั่งบนเสื่อ"},...]}`. `sentence.text` is undefined.
  **Fix**: use `sentence.term` (matching the other sentence game pages).

### 13. rune-forge-chamber (sentence)

**Verdict: PLAYABLE.**

- **Syntax/static**: clean. **Jest**: 13/13 pass.
- **Gameplay**: native start works. Central rune shows the Thai sentence, word circles orbit it
  (next word highlighted gold), forge timer, Words 0/6 / Level / Rune-% HUD all live. Zero
  runtime errors.
- **i18n**: page header renders the raw key `title` as the game title; back button is hardcoded
  Thai (`กลับไปหน้าเกม`) on `/en/`.

### 14. shadow-gate-dungeon (sentence)

**Verdict: PLAYABLE.**

- **Syntax/static**: clean. **Jest**: 10/11 — the `/complete` route test fails with the same
  stale legacy-shape expectation (`message: "Game completed successfully"`) as archers-revenge.
- **Gameplay**: native start works. Word crystals, shadow creature with visible detection
  radius, stealth state ("Undetected"), HP bar, countdown, joystick, Thai prompt — all live.
  Zero runtime errors.
- **Cosmetic**: crystal labels wrap mid-word in the small circles ("Th e", "flie s", "bir d")
  at 390px.
- **i18n**: hardcoded Thai back button on `/en/`.

### 15. spellweavers-run (sentence)

**Verdict: PLAYABLE.**

- **Syntax/static**: clean. **Jest**: 7/7 pass.
- **Gameplay**: native start works. Three-lane runner with falling word orbs (next word ringed
  gold), Thai sentence banner, Score/Combo, Mana bar. Zero runtime errors.
- **Cosmetic/z-order**: orbs render on top of the HUD (a "walks" orb overlapped the Score text)
  and continue below the mana bar outside the playfield — no clipping on the play area.
- **i18n**: hardcoded Thai back button on `/en/`.

### 16. storm-castle-tower (sentence)

**Verdict: PLAYABLE.**

- **Syntax/static**: clean. **Jest**: 11/12 — "uses medium difficulty by default" fails: the
  component now defaults to **easy**, test expects **medium**. Either the default regressed or
  the test wasn't updated with an intentional change — needs a decision.
- **Gameplay**: runs (word tiles with gold target, lives, Thai prompt, on-screen arrow pad +
  Collect button, keyboard alternative). Player sprite sits half-clipped at the very top edge
  of the canvas — verify starting position at 390×844. Zero runtime errors.
- Start flow shows a "Loading..." state briefly; automated native click missed it but the game
  proceeds normally (no user-facing issue).

### 17. village-guardian (sentence)

**Verdict: PLAYABLE.**

- **Syntax/static**: clean. **Jest**: 12/12 pass.
- **Gameplay**: native start works. Villagers carry sentence words (gold target), SAFE zone,
  enemy roams, Time/Lives/Level/Score HUD, joystick, Thai prompt. Zero runtime errors.
- **Cosmetic**: word wrap in tight labels again ("flie s"); i18n: hardcoded Thai back button.

---

## Summary

| Game | Verdict | Blocking issue |
|---|---|---|
| alchemists-synthesis | **BLOCKED** | Start button not clickable (layout clips start screen) |
| archers-revenge | Playable | stale route test; raw i18n page header |
| paladins-twin-soul | Playable | — |
| abyssal-well | Playable | verify enemy spawn pacing |
| devourer-slime | Playable | — |
| dungeon-liberator | Playable | — |
| griffin-riders-escape | **BROKEN** | game loop never re-schedules → frozen after 1 frame |
| griffin-sky-joust | Playable | — |
| gryphon-patrol | Playable | mobile canvas scaling leaves dead bands |
| haunted-library | **BROKEN** | rAF scheduled inside setState updater → exponential rAF storm, ~1 FPS |
| labyrinth-goblin-king | Playable | — |
| realm-carver | **BROKEN** | page reads `sentence.text`; API returns `term` → cannot start |
| rune-forge-chamber | Playable | raw `title` key in header |
| shadow-gate-dungeon | Playable | stale route test |
| spellweavers-run | Playable | HUD z-order |
| storm-castle-tower | Playable | difficulty default easy vs test's medium — decide |
| village-guardian | Playable | — |
| babel-architect | **MISSING** | gameCards says `playable` but no page/component exists → 404 |

**4 games cannot be played at all** (griffin-riders-escape, haunted-library, realm-carver, plus
alchemists-synthesis whose start button is unreachable); babel-architect's card 404s.

Systemic items:
1. **i18n**: `en.ts` covers only published games — unpublished ones render raw keys or rely on
   hardcoded strings; several pages hardcode a Thai back button that appears on every locale.
2. **Stale tests**: 3 suites assert legacy shapes (complete-route `message` field ×2,
   alchemists page i18n full-path keys ×1) and 1 asserts a different difficulty default.
3. **No repo-wide syntax errors**: tsc and eslint are clean; ESLint config should add jest
   globals for `*.test.*` to silence 1858 `no-undef` warnings.

---

## Fix log — 2026-07-07 (all listed issues addressed)

**Game-breaking fixes (verified live in browser):**
1. **griffin-riders-escape** — two defects fixed: (a) game loop never re-scheduled itself
   (froze after one frame) — `loop()` now re-arms `requestAnimationFrame`; (b) the Konva stage
   was 0×0 because the component returns `null` until `gameState` exists, so the measure
   effect ran before the container ref attached — effect now re-runs via a `hasGameState` dep.
   Verified: gates, obstacles, and rider render and animate at ~38 FPS (dev).
2. **haunted-library** — rAF was scheduled inside the `setGameState` updater; StrictMode's
   double-invoke doubled the loop every frame (~500k rAFs in 5 s, ~1 FPS). Tick moved outside
   the updater using a `gameStateRef` mirror. Verified: 34 FPS (dev), screenshots capture
   instantly, import-harness RAF-budget tests still pass.
3. **realm-carver** — page read `sentence.text` from an API that returns `{ term, translation }`;
   changed to `sentence.term`. Verified: game starts and plays.
4. **alchemists-synthesis** — page frame `height: min(85svh, 100%)` resolved against an
   indefinite parent and clipped the start screen (Start unclickable). Now `height: "85svh"`.
   Same fix applied to wizard-vs-zombie's page (identical latent bug). Verified: native click
   starts the game.
5. **abyssal-well** (was "verify spawn pacing") — real bug found: the spawn check mutated
   `lastSpawnRef` inside the state updater; StrictMode's discarded first invocation consumed
   every spawn window, so **no enemy ever spawned**. Tick hoisted out of the updater.
   Verified via live React state: 4 enemies climbing at t=8 s.
6. **storm-castle-tower** — identical impure-updater bug for oil hazards (never spawned); same
   fix. Also the difficulty select offered `value="medium"`, which doesn't exist in the
   config map (silently fell back to normal) — option now `value="normal"`, matching the
   engine's easy/normal/hard vocabulary.

**i18n fixes:**
- `en.ts`: added `pages.student.gamesPage.games.{alchemistsSynthesis,archersRevenge}`,
  top-level `games.alchemistsSynthesis.*` (title/subtitle/round/score/instructions), and
  `runeForgeChamber.title`. Alchemists and archers headers + alchemists start screen/HUD now
  render real strings.
- Hardcoded Thai back button (`กลับไปหน้าเกม`) replaced with `t("backToGames")`
  (`pages.student.gamesPage` scope) in 8 pages: castle-defense, village-guardian,
  rune-forge-chamber, labyrinth-goblin-king, dungeon-liberator, abyssal-well,
  shadow-gate-dungeon, spellweavers-run. Verified live ("Back to Games" on `/en/`).

**Layout/cosmetic fixes:**
- **gryphon-patrol**: 390×844 world now centered in the canvas via Stage x/y offsets
  (dead bands are symmetric letterboxing instead of all-right/bottom).
- **spellweavers-run**: orbs clipped to the lane/collection region — no longer overdraw the
  sentence scroll or Score/Combo HUD. Verified live.
- **word-label wrapping** (shadow-gate-dungeon, village-guardian ×2, griffin-sky-joust):
  labels widened to 2× and `wrap="none"` — whole words render ("students", "flies", "walks").
  Trade-off: a label on an edge-hugging entity can clip at the canvas boundary.
- **babel-architect** card: already `coming-soon` without href in current tree (commit
  e9f71eab) — no menu 404 remains.

**Test fixes (stale expectations updated to current contracts):**
- archers-revenge + shadow-gate-dungeon `/complete` route tests → real
  `gameCompletionInputSchema` payloads and `{ xpEarned, activityId, duplicate, status }`
  assertions (+ invalid-payload cases).
- alchemists page tests: dropped the key-echo i18n mock; assert real strings.
- storm-castle test: default difficulty `normal` (was `medium`).
- griffinRidersEscape lib tests: default difficulty `normal` (was `medium`).
- GameEndScreen tests: `Failure`/`Complete`/`Restart` (post-visual-refresh strings).
- main-menu test (src/app/page.test.tsx): `Start Game` links with `/en` locale prefix.
- dungeon-liberator page test: locale-client mock now includes `useScopedI18n`.

**Other:**
- **ws-server** (multiplayer): `create_room` ack now includes `roomCode` in the state_update
  payload (host had no way to learn the code); `StateUpdateMessage` type extended. All 9 room
  integration tests pass (previously 6 failed).
- **ESLint**: jest + node globals declared for `**/*.test.*`, `__tests__/`, `__mocks__/`,
  jest.setup/config — removes the 1858 `no-undef` warnings.

**Final state:** `tsc --noEmit` clean; full jest suite green (the only non-green suite in a
full parallel run is `performance-benchmark.test.ts`, which is timing-sensitive under load and
passes in isolation).
