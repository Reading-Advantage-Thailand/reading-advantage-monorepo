# Spec — The Expedition Loop and the World Map (wave 2, semester 2)

Track ID: `primary_expedition_loop_20261005`
Type: feature
Program: [chibi-quest-primary-program](../../chibi-quest-primary-program.md)
Model: `advantage-forge/docs/demo-monster-encounters.md` and
`advantage-forge/src/games/monster-encounters/core` (the `Quest` API).

## Context

Owner decision 2026-10-05: the expedition loop is the core in-app loop. The Forge demo proves
it: read the story first, then four encounters built from the story's words, sentences, fill
items, and questions, then a result with stars, cosmetic XP, and items to practice. The rules
core is pure (no DOM, no time, no random): courage starts at 5, a wrong answer costs 1, at 0 the
team rests and continues, no timer, no game over. Wrong items return to the queue at least two
turns later. The frontend only shows the core's challenge and animates its events.

The APK 3D port branch has the kit, the `story-input` contract, and a Primary host
(`components/story-games/StoryGamesClient.tsx`). Monster Encounters is not in
`game-cartridges-3d` yet.

## Functional Requirements

- FR-1 (port the core): Move the Monster Encounters rules core and its tests into
  `game-cartridges-3d` as a dual-renderer cartridge (3D view, 2D Phaser view for old hardware,
  per `apk-2d3d-program.md`). The core stays pure. Content comes from the article through the
  `story-input` contract (words with Thai meanings, sentences of 3 to 8 words, fill items,
  questions). An article with few items uses the next challenge kind; never an empty encounter.
- FR-2 (the loop in the app): After a student finishes an article (the reading step and the
  questions), the article page offers "Start the expedition". The encounter runs in the APK host
  with the student's avatar in the party (the three starter heroes until the loadout exists in
  games). The result records XP (cosmetic), stars, and per-item evidence through the existing
  completion path. The expedition never opens before the article is read.
- FR-3 (lesson flow): In teacher-led mode the expedition is the "encounter" step of the
  expedition sequence (strategy section 9); it unlocks when the teacher marks the matching
  workbook step, as the lesson track rules say. In independent mode it opens after the article.
- FR-4 (world map): A map on the student home and the Me tab with four lands and fourteen
  regions, one per Primary level (GSE 10-70, Young Learners; `mastery-advantage/english/gse-to-primary-advantage.csv`).
  Regions are Forge locations (map mockups and scene blueprints). The avatar stands in the
  region of `users.level`; a level-up moves it with a short walk. Cleared expeditions mark the
  region. The map reads the knowledge state when the Mastery Advantage engine lands in Primary.
- FR-5 (class spell): In projector mode the per-option tallies of a question become one blow on
  the enemy of the day; the class total is shown, no names. Reuses the Class Quest dashboard
  components.
- FR-6 (campaign certificate): At the end of the semester a printable certificate shows the
  lands crossed and the expeditions cleared. It closes the README promise the audit flagged.
- FR-7 (content pipeline): The workbook importer (`scripts/apk3d-import.ts`) runs in the
  monorepo against the Primary article tables, not the Workbooks files, so every published
  article can be an expedition. Thai glosses come from the article data; a missing gloss is a
  flagged gap, not model text.

## Non-goals

Guild Mode (Class Quest), the avatar in the other games (Forge Phase 3), real-time play,
changes to question or XP rules.

## Acceptance Criteria

- The core tests from Forge pass in the monorepo unchanged. Rules tests: read-before-play,
  courage, retry queue, no empty encounter, evidence per item.
- A seeded student reads an article, runs the expedition in 3D and in 2D, and the result lands in
  completions and XP. Browser sessions at 375 and 1280 by a vision agent; no Critical or High.
- The map shows the right region for every level 1-14 and moves on a level-up.
- Full test suite, tsc, ESLint green. Tutor read test unaffected.
