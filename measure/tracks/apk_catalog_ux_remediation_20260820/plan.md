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

Open: Phaser still does not load catalog art (C1/C2). Leftover Thai copy is unchanged. Most music files remain the 4387-byte placeholder.

## Checkpoints

Implementation (waves W1-W4, one atomic commit): `6cd44a3`

- W1 catalog page, login redirect, arcade Exit, traversal labels, covers: `6cd44a3`
- W2 auth host, castle, magic-defense, paladins, haunted-library: `6cd44a3`
- W3 rpg-battle, archers, enchanted-library, village-guardian, tutorials: `6cd44a3`
- W4 briefing credit, home locale, leftover links, music, placeholders: `6cd44a3`
