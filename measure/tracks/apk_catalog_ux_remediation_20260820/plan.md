# Implementation Plan: APK Catalog UX Remediation

Waves run five parallel agents. Shared-host blockers go first.

## Phase W1: Shared catalog and host blockers

- [x] Task: Add `/[locale]/student/games` catalog page so debrief Exit no longer 404s `6cd44a3`
- [x] Task: Restore login redirect so sign-in can return to the game `6cd44a3`
- [x] Task: Wire public arcade Exit and prefix pack.root with basePath `6cd44a3`
- [x] Task: Stop traversal quizzes from printing the translation on the correct button `6cd44a3`
- [x] Task: Fix broken cover files (JPEG-named PNG, broken symlinks) `6cd44a3`

## Phase W2: Authenticated host and controller blockers

- [x] Task: Authenticated host login link, route locale vs content locale, leaderboard write `6cd44a3`
- [x] Task: Castle Defense sixth-wave deadlock `6cd44a3`
- [x] Task: Magic Defense ASCII-only typing and timer `6cd44a3`
- [x] Task: Paladin's Twin-Soul instant defeat `6cd44a3`
- [x] Task: Haunted Library D-pad, floor descent, restore freeze `6cd44a3`

## Phase W3: Remaining controller and tutorial blockers

- [x] Task: RPG Battle unwinnable past 10 items `6cd44a3`
- [x] Task: Archer's Revenge timed loss `6cd44a3`
- [x] Task: Enchanted Library HUD answer leak `6cd44a3`
- [x] Task: Village Guardian restore freeze `6cd44a3`
- [x] Task: Tutorial drivers that no-op or show the wrong consequence `6cd44a3`

## Phase W4: Catalog honesty and leftover routes

- [x] Task: Pointer/touch briefing hints; ElvGames credit when no art loads `6cd44a3`
- [x] Task: Catalog locale lock on `/` Vocab Arcade `6cd44a3`
- [x] Task: Leftover page dead links (`/student/articles` and `/student/games`) `6cd44a3`
- [x] Task: Placeholder music vs real unused tracks `6cd44a3`
- [x] Task: Remaining per-game keyboard, placeholder text, and description drift `6cd44a3`
- [x] Task: Generate unique medieval catalog BGM with mmx music-2.6 `a0a2ab0`
- [x] Task: Lengthen babel-architect, rune-match, and sorcerer-ziggurat BGM `4f0f5c2`
- [x] Task: Retune wizard-vs-zombie BGM for zombie survival `1bf470c`
- [x] Task: Delete leftover Konva vocabulary and sentence pages. Redirect old URLs to `/student/games/apk/{id}`.

Owner instruction 2026-08-20: leftover Konva pages are retired. Catalog launch stays on APK.

## Catalog music

Hosts play `/sounds/music/{id}.mp3` through `useBackgroundMusic`. Commit `a0a2ab0` replaced the 22 remaining 4387-byte placeholders with unique mmx `music-2.6` instrumentals (lute, recorder, harp, strings, brass, choir, timpani, frame drums). Six pre-existing unique tracks were kept. Commit `4f0f5c2` regenerated three short clips: `babel-architect` 6:05, `rune-match` 4:40, `sorcerer-ziggurat` 2:21. Commit `1bf470c` replaced `wizard-vs-zombie` with a 2:31 zombie-survival instrumental.

## Art loading (C1/C2) — documented solution

Recorded in `measure/audit-reports/advantage-games-ux-wiring_20260819/independent-gameplay.md` (C1, C2, C3) and `assets.md`.

Durable fix:

1. Replace invented cartridge keys with owner-approved role/state keys (`player:idle`, `enemy:idle`, …).
2. Resolve keys with `createAcceptedStandardAssetResolver` against pack `2026.07.23`.
3. Materialize only the selected union into `public/` through `withBasePath`.
4. Call `preloadAssetBindings` before `new Phaser.Game`.
5. Draw with `add.image` / sprites. Do not use leftover `public/games/**` as a private pack (policy: `privatePackTrees` prohibited).

## Checkpoints

Implementation (waves W1-W4, one atomic commit): `6cd44a3`

- W1 catalog page, login redirect, arcade Exit, traversal labels, covers: `6cd44a3`
- W2 auth host, castle, magic-defense, paladins, haunted-library: `6cd44a3`
- W3 rpg-battle, archers, enchanted-library, village-guardian, tutorials: `6cd44a3`
- W4 briefing credit, home locale, leftover links, music, placeholders: `6cd44a3`
- Catalog mmx medieval BGM for 22 remaining placeholders: `a0a2ab0`
- Lengthen babel-architect, rune-match, sorcerer-ziggurat BGM: `4f0f5c2`
- Retune wizard-vs-zombie zombie-survival BGM: `1bf470c`
