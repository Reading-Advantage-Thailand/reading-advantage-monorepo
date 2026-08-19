# Implementation Plan: APK Catalog UX Remediation

Waves run five parallel agents. Shared-host blockers go first.

## Phase W1: Shared catalog and host blockers

- [x] Task: Add `/[locale]/student/games` catalog page so debrief Exit no longer 404s
- [x] Task: Restore login redirect so sign-in can return to the game
- [x] Task: Wire public arcade Exit and prefix pack.root with basePath
- [x] Task: Stop traversal quizzes from printing the translation on the correct button
- [x] Task: Fix broken cover files (JPEG-named PNG, broken symlinks)

## Phase W2: Authenticated host and controller blockers

- [x] Task: Authenticated host login link, route locale vs content locale, leaderboard write
- [x] Task: Castle Defense sixth-wave deadlock
- [x] Task: Magic Defense ASCII-only typing and timer
- [x] Task: Paladin's Twin-Soul instant defeat
- [x] Task: Haunted Library D-pad, floor descent, restore freeze

## Phase W3: Remaining controller and tutorial blockers

- [x] Task: RPG Battle unwinnable past 10 items
- [x] Task: Archer's Revenge timed loss
- [x] Task: Enchanted Library HUD answer leak
- [x] Task: Village Guardian restore freeze
- [x] Task: Tutorial drivers that no-op or show the wrong consequence

## Phase W4: Catalog honesty and leftover routes

- [x] Task: Pointer/touch briefing hints; ElvGames credit when no art loads
- [x] Task: Catalog locale lock on `/` Vocab Arcade
- [x] Task: Leftover page dead links (`/student/articles` and `/student/games`)
- [x] Task: Placeholder music vs real unused tracks
- [x] Task: Remaining per-game keyboard, placeholder text, and description drift

Open: Phaser still does not load catalog art (C1/C2). Leftover Thai copy is unchanged. Most music files remain the 4387-byte placeholder.
