# T3 — Games suite browser QA (primary-advantage)

| Field | Value |
|---|---|
| Date | 2026-09-15 |
| App | primary-advantage (Next.js 16.2.9 dev, Turbopack) at http://localhost:3000 |
| Locale | `/en` |
| Users | `qa-student-a3` (QA School A), `qa-student-b1` (QA School B) |
| Driver | Headless Google Chrome via Playwright (`drive-games.mjs` pass 1, `drive-games-v2.mjs` pass 2, `drive-games-v3/v4.mjs` focused retries) |
| Raw data | `results-a3.json`, `results-v2.json`, `v2-run.log` … `v4-run.log` |
| Test data | `seed-game-content.sql` (16 word + 16 sentence flashcards per student), `seed-challenge.sql` (one active challenge) |

All 28 catalog cartridges were tested. Each game was loaded through the
briefing screen, started, driven with keyboard and pointer input for 20–70
seconds, and checked for canvas rendering, console errors, result screens, and
XP saves. Canvas evidence uses pixel samples (unique color counts, non-white
ratio) plus manual screenshot review. No application code was modified.

## Verdict summary

27 of 28 games PASS. 1 game FAILS (Realm Carver). The challenge flow PASSES.
Both cross-school spot-checks PASS.

| # | Game | Verdict | Result reached | XP save | Key evidence |
|---|---|---|---|---|---|
| 1 | Dragon Flight | PASS | Defeat | 200, XP 2 | `a3-01-dragon-flight-*` |
| 2 | Astral Mage | PASS | Not in window | — | `a3-02-astral-mage-*` |
| 3 | The Sorcerer's Ziggurat | PASS | Not in window | — | `a3-03-sorcerer-ziggurat-*` |
| 4 | Dragon Rider | PASS | Defeat | 200, XP 2 | `a3-04-dragon-rider-*` |
| 5 | Spellweaver's Run | PASS | Not in window | — | `a3-05-spellweavers-run-*` |
| 6 | Shadow Gate Dungeon | PASS | Not in window | — | `a3-06-shadow-gate-dungeon-*` |
| 7 | Labyrinth of the Goblin King | PASS | Defeat | 200, XP 0 | `a3-07-labyrinth-goblin-king-*` |
| 8 | Griffin Rider's Escape | PASS | Not in window | — | `a3-08-griffin-riders-escape-*` |
| 9 | Castle Defense | PASS | Not in window | — | `a3-09-castle-defense-*` |
| 10 | Magic Defense | PASS | Defeat | 200, XP 1 | `a3-10-magic-defense-*` |
| 11 | RPG Battle | PASS | Defeat (forced) | 200, XP 7 | `a3-11-*`, `a3-r-rpg-battle-*`, `a3-r3-rpg-battle-*` |
| 12 | Wizard vs Zombie | PASS | Defeat | 200, XP 0 | `a3-12-wizard-vs-zombie-*` |
| 13 | Enchanted Library | PASS | Not in window | — | `a3-13-enchanted-library-*` |
| 14 | Rune Match | PASS | Not in window | — | `a3-14-*`, `a3-r-rune-match-*` |
| 15 | Alchemist's Synthesis | PASS | Not in window | — | `a3-15-alchemists-synthesis-*` |
| 16 | Potion Rush | PASS | Not in window | — | `a3-16-potion-rush-*` |
| 17 | Dungeon Liberator | PASS | Not in window | — | `a3-17-dungeon-liberator-*` |
| 18 | Rune Forge Chamber | PASS | Defeat | 200, XP 2 | `a3-18-rune-forge-chamber-*` |
| 19 | Village Guardian | PASS | Not in window | — | `a3-19-village-guardian-*` |
| 20 | The Abyssal Well | PASS | Defeat | 200, XP 4 (retry) | `a3-20-*`, `a3-r3-abyssal-well-*` |
| 21 | Archer's Revenge | PASS | Defeat | 200, XP 1 | `a3-21-archers-revenge-*` |
| 22 | Storm the Castle Tower | PASS | Defeat | 200, XP 4 | `a3-r-storm-castle-tower-*` |
| 23 | Griffin Sky-Joust | PASS | Defeat | 200, XP 1 | `a3-23-griffin-sky-joust-*` |
| 24 | **Realm Carver** | **FAIL** | Blocked | — | `a3-24-realm-carver-00-error.png`, `a3-r2-realm-carver-*` |
| 25 | Paladin's Twin-Soul | PASS | Defeat | 200, XP 1 | `a3-r-paladins-twin-soul-*` |
| 26 | Devourer Slime | PASS | Defeat | 200, XP 0 | `a3-26-devourer-slime-*` |
| 27 | The Haunted Library | PASS | Defeat | 200, XP 0 | `a3-r-haunted-library-*` |
| 28 | Gryphon Patrol | PASS | Defeat | 200, XP 1 | `a3-r-gryphon-patrol-*` |
| — | Class challenge flow | PASS | Defeat | 200, XP 0, `challengeRunId` present | `a3-00-catalog-challenge.png`, `a3-challenge-wizard-vs-zombie-*` |
| — | b1 spot-check: Wizard vs Zombie | PASS | Defeat | 200, XP 0 | `b1-01-wizard-vs-zombie-*` |
| — | b1 spot-check: Castle Defense | PASS | Not in window | — | `b1-02-castle-defense-*` |

"Not in window" means the bot driver did not reach an end state inside the
20–70 second play window. The canvas, HUD, input handling, and Thai prompts
were all live in those games. These are long-form games. The end state is not
a 60-second target.

## Cross-cutting findings

1. **FAIL — Realm Carver cannot start with a normal flashcard set.**
   The host passes all 16 saved sentence cards to the cartridge. They contain
   106 words total. Realm Carver throws "Game could not start: Realm Carver
   supports at most 100 sentence words" (`packages/game-cartridges/src/realm-carver.ts:554`).
   Play now keeps the briefing screen and mounts no canvas. The Practice
   tutorial surfaces the same alert. A student with 16 saved sentence cards
   cannot play the game at all. Fix direction: cap or slice host content to
   the cartridge limit, raise the limit, or catch the guard before the
   briefing. Evidence: `a3-r2-realm-carver-01-briefing.png`,
   `a3-r2-realm-carver-02-after-play.png`, `a3-r2-realm-carver-03-after-practice.png`.
2. **i18n bug (non-blocking): `Sidebar.games` message is missing for `en`.**
   Every student page logs `IntlError: MISSING_MESSAGE: Could not resolve Sidebar.games in messages for locale en`
   from `components/nav/sidebar-nav.tsx:268`, and the sidebar renders the raw
   key text "SidebarGames". Confirmed in the Next.js dev indicator
   (`a3-00b-dev-issues.png`). `messages/en.json` has no `Sidebar.games` key.
3. **Dev-only cold-load stalls (not reproduced warm).** On first visit,
   Storm the Castle Tower and Paladin's Twin-Soul stayed on
   "Loading student content..." for over 20–120 seconds
   (`a3-22-storm-castle-tower-00-loadfail.png`,
   `a3-25-paladins-twin-soul-00-loadfail.png`). Both loaded, played, and
   saved XP on warm retry. This matches Turbopack on-demand chunk
   compilation. It did not reproduce. A production build should be checked.
4. **Abyssal Well save timeout (not reproduced).** Pass 1 reached the result
   screen with "Game progress could not be confirmed in time" and no
   completion POST (`a3-20-abyssal-well-04-end.png`). The pass-4 replay
   saved HTTP 200 XP 4 (`a3-r3-abyssal-well-03-saved.png`). Likely a
   cold-server timing issue.
5. **No game code threw a page error.** All console noise was finding 2 plus
   one Phaser texture warning in Wizard vs Zombie:
   `Texture "%s" has no frame "%s" apk:catalog-standard-pack:wizard-floor 1`
   (warning only; the floor renders).
6. **Catalog cards are text links by design.** Cards show a title and
   description. They contain no images. Zero broken images were detected
   (5 panel/button images from the Wizard rewards and challenge panels).
7. **RPG Battle answer options are pointer-only.** Digit keys feed the
   typed-translation buffer; they do not select options 1–3. Mouse and touch
   selection works (forced defeat: score 600, 6/16, XP 7).

## Catalog

Route: `/en/student/games`. Screenshot: `a3-00-catalog.png`,
`a3-00-catalog-challenge.png` (with active challenge).

- All 28 cartridge cards render with title and description in catalog order.
- No broken images (`naturalWidth=0` count: 0). Cards are intentionally
  text-only links; the request's "title/image" card format is title plus
  description for this catalog.
- The "Wizard rewards · 0/3" RPG panel renders above the cards.
- The "Class challenges" panel loads classes and challenges. With the seeded
  challenge it shows "QA Wizard Sprint — Wizard vs Zombie — Class progress
  0/10 — Active — 9/14/2026 – 9/22/2026 — Play challenge".
- Console errors: only the `Sidebar.games` IntlError.

## Per-game results

Common repro for every game:

1. Log in as the student (POST `/api/auth/login`, cookie session).
2. Open `/en/student/games/apk/<id>`.
3. Wait for the briefing screen and "Play now".
4. Click Play now. Confirm the Konva canvas mounts and is non-blank.
5. Drive arrows/WASD/Space/digits and canvas pointer zones for 20–70 s.
6. Watch for `section[aria-label="Game result"]` and POST
   `/api/v1/apk/complete`.

Console errors below list only game-specific entries. Every page also emits
the `Sidebar.games` IntlError from the app sidebar.

### 1. Dragon Flight — PASS
Canvas live (178 colors at 20 s). Reached defeat: Score 100, 1/4 correct,
Confirmed XP 2, save HTTP 200. Screenshots: `a3-01-dragon-flight-01-briefing.png`
… `a3-01-dragon-flight-05-results.png`. Console: sidebar only. Read Thai and Listen to English
mode toggles render.

### 2. Astral Mage — PASS
Canvas live (74 colors). HUD and sentence-word arena render. No end state in
64 s. Screenshots: `a3-02-astral-mage-01*.png` through `a3-02-astral-mage-04*.png`. Console: sidebar only.

### 3. The Sorcerer's Ziggurat — PASS
Canvas live (74 colors). Rune cube climb renders. No end state in 64 s.
Screenshots: `a3-03-sorcerer-ziggurat-01*.png` through `a3-03-sorcerer-ziggurat-04*.png`. Console: sidebar only.

### 4. Dragon Rider — PASS
Canvas live (170 colors). Reached defeat: Score 100, 1/4, Confirmed XP 2,
HTTP 200. Screenshots: `a3-04-dragon-rider-01*.png` through `a3-04-dragon-rider-05*.png`. Console: sidebar only.

### 5. Spellweaver's Run — PASS
Canvas live (57 colors). Lane runner with falling word orbs renders and takes
input. No end state in 60 s. Screenshots: `a3-05-spellweavers-run-01*.png` through `a3-05-spellweavers-run-04*.png`.

### 6. Shadow Gate Dungeon — PASS
Canvas live (52 colors). Dungeon and ordered crystals render. No end state in
61 s. Screenshots: `a3-06-shadow-gate-dungeon-01*.png` through `a3-06-shadow-gate-dungeon-04*.png`.

### 7. Labyrinth of the Goblin King — PASS
Canvas live. Maze, goblins, word pads, and the Thai prompt render
(`a3-07-labyrinth-goblin-king-02-start.png`). Bot hit defeat fast:
0/0, Confirmed XP 0, HTTP 200 (`a3-07-labyrinth-goblin-king-05-results.png`). The pass-1 script marked
this FAIL on a canvas-read heuristic because the HTML result overlay replaces
the play canvas; that verdict is corrected here.

### 8. Griffin Rider's Escape — PASS
Canvas live (61 colors). Sky lanes and gates render. No end state in 60 s.
Screenshots: `a3-08-griffin-riders-escape-01*.png` through `a3-08-griffin-riders-escape-04*.png`.

### 9. Castle Defense — PASS
Canvas live (91 colors). Wall layout, word sprites, and drop pads render.
No end state in 63 s. Screenshots: `a3-09-castle-defense-01*.png` through `a3-09-castle-defense-04*.png`.
Also verified as user b1 (`b1-02-castle-defense-03-midplay.png`).

### 10. Magic Defense — PASS
Canvas live (82 colors). Reached defeat: Score 0, 0/2, Confirmed XP 1,
HTTP 200. Screenshots: `a3-10-magic-defense-01*.png` through `a3-10-magic-defense-05*.png`.

### 11. RPG Battle — PASS
Turn-based duel renders with HP bars, Thai prompt, and three clickable answer
zones (`a3-11-rpg-battle-02-start.png`, `a3-r-rpg-battle-03-midplay.png`).
Wrong clicks show "Incorrect. The enemy counterattacks." and reduce player HP.
Forced defeat via wrong-option clicks (`a3-r3-rpg-battle-03-saved.png`):
Score 600, Accuracy 38 %, 6/16, Confirmed XP 7, HTTP 200.
Note: number keys type into the translation buffer; use clicks or taps.

### 12. Wizard vs Zombie — PASS
Canvas live (130 colors). Graveyard map, shards, zombies, and English orbs
render (`a3-12-wizard-vs-zombie-03-midplay.png`). Reached defeat 0/0,
Confirmed XP 0, HTTP 200. One non-fatal Phaser warning about a missing
`wizard-floor 1` texture frame. Also verified as b1.

### 13. Enchanted Library — PASS
Canvas live (70 colors). Library map, books, mana, and spirits render.
No end state in 61 s. Screenshots: `a3-13-enchanted-library-01*.png` through `a3-13-enchanted-library-04*.png`.

### 14. Rune Match — PASS
Match-board and monster render. Pointer selection works: runes select and the
monster counterattack drops health 100 to 97
(`a3-r-rune-match-03-midplay.png`). No end state in 72 s.
Screenshots: `a3-14-rune-match-*`, `a3-r-rune-match-*`.

### 15. Alchemist's Synthesis — PASS
Canvas live (63 colors). Timed multiple-choice cauldron renders. No end state
in 61 s. Screenshots: `a3-15-alchemists-synthesis-01*.png` through `a3-15-alchemists-synthesis-04*.png`.

### 16. Potion Rush — PASS
Canvas live (148 colors). Three customer cauldrons, conveyor ingredients,
heart/star HUD, and Thai order labels render
(`a3-16-potion-rush-03-midplay.png`). No end state in 62 s.

### 17. Dungeon Liberator — PASS
Canvas live (66 colors). Torchlit dungeon and prisoners render. No end state
in 63 s. Screenshots: `a3-17-dungeon-liberator-01*.png` through `a3-17-dungeon-liberator-04*.png`.

### 18. Rune Forge Chamber — PASS
Canvas live (79 colors). Reached defeat: Score 100, 1/4, Confirmed XP 2,
HTTP 200. Screenshots: `a3-18-rune-forge-chamber-01*.png` through `a3-18-rune-forge-chamber-05*.png`.

### 19. Village Guardian — PASS
Canvas live (75 colors). Sanctuary and villager trail render. No end state in
61 s. Screenshots: `a3-19-village-guardian-01*.png` through `a3-19-village-guardian-04*.png`.

### 20. The Abyssal Well — PASS
Canvas live (65 colors). Reached result twice. Pass 1 produced a
client-side "progress could not be confirmed in time" message with no POST;
pass 4 saved cleanly: Score 100, 1/1, Confirmed XP 4, HTTP 200
(`a3-r3-abyssal-well-03-saved.png`). Track the save timeout as an
intermittent risk.

### 21. Archer's Revenge — PASS
Canvas live (59 colors). Reached defeat: Score 0, 0/11, Confirmed XP 1,
HTTP 200. Screenshots: `a3-21-archers-revenge-01*.png` through `a3-21-archers-revenge-05*.png`.

### 22. Storm the Castle Tower — PASS (recovered from cold-load BLOCKED)
Pass 1 stalled at "Loading student content..."
(`a3-22-storm-castle-tower-00-loadfail.png`). Warm retry: live canvas, tower
climb with word platforms, D-pad, Thai prompt and HUD 2/106
(`a3-r-storm-castle-tower-03-midplay.png`). Reached defeat: Confirmed XP 4,
HTTP 200 (`a3-r-storm-castle-tower-05-results.png`).

### 23. Griffin Sky-Joust — PASS
Canvas live (84 colors). Reached defeat: Score 0, 0/2, Confirmed XP 1,
HTTP 200. Screenshots: `a3-23-griffin-sky-joust-01*.png` through `a3-23-griffin-sky-joust-04*.png`.

### 24. Realm Carver — FAIL
Briefing renders, but the start guard is already visible:
"Game could not start: Realm Carver supports at most 100 sentence words".
Play now mounts no canvas and leaves the briefing screen
(`a3-r2-realm-carver-02-after-play.png`). Practice also fails with the same
alert and no tutorial canvas
(`a3-r2-realm-carver-03-after-practice.png`). The 16 seeded sentence cards
expand to 106 words; the cartridge accepts 100 words. The host does not
truncate. Repro: save 10+ sentence flashcards, open
`/en/student/games/apk/realm-carver`, click Play now.
Note: the earlier pass-1 90 s canvas timeout had the same root cause.

### 25. Paladin's Twin-Soul — PASS (recovered from cold-load BLOCKED)
Pass 1 stalled at "Loading student content..."
(`a3-25-paladins-twin-soul-00-loadfail.png`). Warm retry: live canvas and
quick defeat result 0/2, Confirmed XP 1, HTTP 200
(`a3-r-paladins-twin-soul-05-results.png`).

### 26. Devourer Slime — PASS
Canvas live. Slime, knights, and word orbs render with HUD 0/106
(`a3-26-devourer-slime-02-start.png`). Reached defeat 0/0, Confirmed XP 0,
HTTP 200 (`a3-26-devourer-slime-05-results.png`). The pass-1 FAIL on the canvas-read heuristic is
corrected; the result overlay is HTML.

### 27. The Haunted Library — PASS
Canvas live (118 colors). Gravity-jump library with word doors renders.
Reached defeat: Score 0, 0/0, Confirmed XP 0, HTTP 200
(`a3-r-haunted-library-05-results.png`). No console errors or page crashes in
the isolated retry. A shared-browser pass crashed near this game once under
memory pressure; it did not reproduce in isolation.

### 28. Gryphon Patrol — PASS
Canvas live (130 colors). Wrapped sky map with word enemies, HP, objective
banner, and controls hint renders; wrong targets give feedback
(`a3-r-gryphon-patrol-03-midplay.png`). Reached defeat: Confirmed XP 1,
HTTP 200 (`a3-r-gryphon-patrol-05-results.png`).

## Challenge / leaderboard flow

A test challenge was seeded for QA Class A ("QA Wizard Sprint",
wizard-vs-zombie, medium, reading, 4 items, 9/14–9/22/2026, target 10) with
`seed-challenge.sql`.

- Panel shows Active and a Play challenge link (`a3-00-catalog-challenge.png`).
- Deep link follows `/en/student/games/apk/wizard-vs-zombie?challengeId=<uuid>`.
- The challenge run API issues a run; briefing and play start normally
  (`a3-challenge-wizard-vs-zombie-01-briefing.png`).
- Play reaches SESSION COMPLETE. The completion POST includes the
  `challengeRunId`, returns HTTP 200, and saves XP 0
  (`a3-challenge-wizard-vs-zombie-05-results.png`).
- A `game_challenge_runs` row exists for qa-student-a3. No
  `game_challenge_contributions` row is created at score 0, so panel progress
  remains 0/10. This matches a minimum-score contribution rule. No teacher
  leaderboard view was in scope.
- Before the seed, the panel correctly showed "No challenges are available"
  behavior (classes load; challenge list empty).

## Cross-school spot-check (qa-student-b1, QA School B)

- Wizard vs Zombie: full render with QA School B sidebar, defeat result saved
  HTTP 200 (`b1-01-wizard-vs-zombie-03-midplay.png`, `b1-01-wizard-vs-zombie-05-results.png`).
- Castle Defense: full render, HUD 100/100, 1/16, 0/106, maze and word pads
  live (`b1-02-castle-defense-03-midplay.png`).
- Both students independently own 16 word and 16 sentence flashcard rows.
  School scoping works; no cross-school content or leaderboard leakage
  appeared.

## Test data and reproducibility

- `seed-game-content.sql`: leaderboard rows, QA articles, and 16 word plus
  16 sentence flashcards for both QA students. Idempotent.
- `seed-challenge.sql`: one active supported challenge for QA Class A.
- Driver commands (from this directory):
  - `node drive-games.mjs qa-student-a3` (full 28-game pass 1)
  - `node drive-games-v2.mjs` (isolated-browser retries, challenge, b1)
  - `node drive-games-v3.mjs` / `node drive-games-v4.mjs` (focused checks)
- Chrome flags: `--use-gl=angle --use-angle=swiftshader
  --enable-unsafe-swiftshader --ignore-gpu-blocklist`.

## Known limitations

- Input is scripted generic play, not skilled play. Most long-form games did
  not reach a terminal state inside the test window. Blank-canvas, HUD,
  interaction, and save-path checks were the main pass criteria.
- Results came from the Turbopack dev server. Two first-load stalls were
  dev-compilation symptoms. A production-build pass is recommended before
  release.
- The answer-audio ("Listen to English") mode was not played end to end.
  Toggle buttons render on the three supported vocabulary games.
