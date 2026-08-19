# Advantage Games UX Wiring Audit — Executive Summary

**Date:** 2026-08-19  
**Scope:** Student catalog in `apps/advantage-games`  
**Method:** Walk `./graph.db`, then inspect hosts, cartridges, routes, covers, and leftover pages  
**Status:** Read-only. This report records user-experience errors. It does not change code.

## Catalog count

The request asked for 27 games. The live catalog has **28** playable cards.

`gameCards` and `gameCards.test.ts` lock 28 IDs. An older product list used 27 titles and included Babel's Architect. The current catalog drops Babel's Architect and adds Astral Mage and The Sorcerer's Ziggurat.

This report documents all **28** catalog titles. Babel's Architect is not in the catalog. Music file `public/sounds/music/babel-architect.mp3` still exists.

## Headline

Every catalog card opens `/en/student/games/apk/{id}`. That route mounts `AuthenticatedCartridgeHost` and `APKGameHost`. The student does not get the leftover Konva game.

All 28 APK scenes draw Phaser shapes. No cartridge file calls `load.image` or `add.image`. Real cover art and sprite sheets stay unused. Music files exist for all 28 titles. The APK hosts do not play them.

Five titles are a shared left/right quiz, not the game on the card.

## Shared defects (all 28)

| Severity | Defect | User-visible effect |
|---|---|---|
| Blocker | Catalog opens the APK host, not the leftover game | Cover art and card text promise the old game. Play is a shape scene. |
| Major | Host binds every asset key to one QC image | `asset-6aeab3f50c0f6be4.png` is a 192×384 mage sheet. Scenes do not draw it. |
| Major | Music is not wired | `useBackgroundMusic` exists. Only leftover pages call it. APK play is silent. |
| Major | Debrief exit goes to a missing page | `onNavigate("catalog")` opens `/{locale}/student/games`. That page does not exist. |
| Major | Chinese exit uses a bad locale | Route `zh` becomes content locale `cn`. Exit then opens `/cn/student/games`. App locales are `en`, `th`, `zh`. |
| Major | Tutorial is one generic pair of steps | `createCartridgeStandardExperience` always runs "select incorrect" then "select correct". |
| Major | Debrief credits unused pixel art | Every game shows "Pixel art assets by ElvGames". |
| Major | Public arcade is not the catalog path | `/[locale]/student/arcade/{id}` uses sample words. Catalog cards do not open it. |
| Minor | Seed is fixed at 29 | Layout and tutorial do not change between sessions. |

## Graph note

`./graph.db` has 36,599 nodes. Package `advantage-games` has 237 files. Package `game-cartridges` is stale. Many cartridge files have 1–4 nodes or zero nodes (`abyssal-well`). This audit used the graph for routes, hosts, and start-screen symbols, then read disk files for the missing cartridge nodes.

## Catalog-path defects added after the Opus graph walk

These were missing or incomplete in the first two passes. Disk and source now confirm them.

| # | Defect | Catalog-path effect |
|---|---|---|
| 5 | Public arcade Exit has no `onNavigate` | Exit on `/[locale]/student/arcade/{id}` does nothing. That route has no product link. |
| 6 | Catalog hardcodes `/en` | Vocab Arcade home always launches English APK URLs. |
| 7 | Signed-out launch has no login | Catalog cards open the authenticated host. The play surface shows red "Authentication required". `/login` exists. Post-login redirect returns `/`. |
| 10 | Pack root ignores `basePath` | `pack.root` is `/assets/apk/standard-pack-qc/`. A based deploy 404s that tree. |
| 11 | Leaderboard stays empty | APK hosts do not record `LEADERBOARD_KEY`. Leftover `GameEndScreen` is the only writer and links to `/student/leaderboard` without a locale. |

Opus items 1, 2, 3, 4, and 9 already sit in this report. Item 8 is absent from the Opus table. Item 12 (26 leftover pages with Thai copy and dead `/student/games` links) is outside the agreed catalog-APK-only scope. Those pages remain publicly reachable.

## Independent walk (merged)

A second audit was written without reading this folder. Its comparison is [comparison.md](./comparison.md). Its Part 1 and Part 2 are [independent-gameplay.md](./independent-gameplay.md) (273 findings).

That walk agrees on the shared layer. It adds classes this folder did not hold:

1. **26 leftover pages.** Dead `/student/games` and `/student/articles` links, hardcoded Thai literals, static sample content, completion bodies that fail `gameCompletionInputSchema`, invented analytics counters.
2. **Controller blockers.** Castle Defense deadlocks after the sixth wave. Paladin's Twin-Soul ends in defeat in about 3 seconds. Haunted Library has no floor descent and 492 of 500 seeds are unwinnable. Magic Defense accepts only ASCII keys. RPG Battle is unwinnable past 10 items. Archer's Revenge loses at about 65 seconds with health still shown.
3. **Capture/restore freeze.** Haunted Library and Village Guardian can emit a snapshot that `restore()` rejects. A composition change then pauses and never resumes.
4. **Tutorial step errors.** Drivers that no-op, show the opposite consequence, spend real lives, or finish in one frame with no draw.
5. **English placeholders in target-language exercises** such as "Void echo" and "tutorial wrong".
6. **Keyboard key drift** per game.
7. **C8.** Click and Tap briefing rows reuse the keyboard sentence.

The merge keeps asset tables in [assets.md](./assets.md) and gameplay/legacy evidence in [independent-gameplay.md](./independent-gameplay.md).

## Highest-severity titles

1. **abyssal-well** — catalog cover path is missing. The card shows a broken image.
2. **dragon-rider**, **spellweavers-run**, **shadow-gate-dungeon**, **labyrinth-goblin-king**, **griffin-riders-escape** — catalog play is a route quiz. The correct word is printed on one button.
3. **haunted-library** — the on-screen D-pad covers floor 0. Up can open the wrong door.
4. **enchanted-library** — the HUD prints the target translation and paints the correct book gold.

## Asset deep pass (second walk)

The first walk treated existing cover and music files as wired. A second walk measured bytes, magic headers, sheet math, and the standard pack.

New classes:

1. `abyssal-well` cover is missing. Two other cover files are broken symlinks to `/home/daniel-bo/Desktop/advantage-games/...`.
2. Seven catalog covers are JPEG files with a `.png` name.
3. All 28 `public/sounds/music/{id}.mp3` files are the same 4,387-byte placeholder.
4. Five real tracks (6 MB class) sit unused beside those placeholders.
5. QC file `asset-6aeab3f50c0f6be4.png` is hero-01: a 192×384 sheet (6×12, 4 empty frames) bound as `view: screen`.
6. QC hit FX has 19 empty frames of 24. Gamepad UI has 90 empty frames of 220.
7. Griffin Rider `gate.png` and `obstacle.png` are 0 bytes.
8. Most leftover `3xN` sheets do not divide into the named grid.
9. No cartridge key is a standard-pack semantic key. The 43,075-asset pack is not on the catalog path.

Full tables: [assets.md](./assets.md)

## Document set

- [findings.md](./findings.md) — play, tutorial, and route issues for each of the 28 games
- [shared-layer.md](./shared-layer.md) — host, route, and graph facts
- [assets.md](./assets.md) — measured covers, music, sheets, QC pack, and bindings
