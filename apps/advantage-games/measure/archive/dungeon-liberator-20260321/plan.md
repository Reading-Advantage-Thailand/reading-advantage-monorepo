# Implementation Plan: Dungeon Liberator

This plan outlines the steps to build "Dungeon Liberator" using **React-Konva (Canvas)** with strict TDD methodology.

---

## Phase 1: Setup & Infrastructure

- [x] Task: Create configuration file `src/lib/games/dungeonLiberatorConfig.ts`.
- [x] Task: Define game state types and interfaces in `src/lib/games/dungeonLiberator.ts`.
- [x] Task: Create page route `src/app/[locale]/(student)/student/games/sentence/dungeon-liberator/page.tsx`.
- [x] Task: Create API routes for sentences, complete, and rankings.
- [x] Task: Create `DungeonLiberatorGame` container component.

---

## Phase 2: Movement & Trailing (TDD)

- [x] Task: Implement free movement with directional input.
- [x] Task: Implement `pathHistory` tracking for the player.
- [x] Task: Implement follower (prisoner) positioning logic along the `pathHistory`.
- [x] Task: Implement arena boundary clamping.

---

## Phase 3: Collection & Progression (TDD)

- [x] Task: Implement prisoner spawning with word labels.
- [x] Task: Implement collection logic (collision with correct prisoner).
- [x] Task: Implement word order validation and "line" growth.
- [x] Task: Implement exit portal appearance and win condition.

---

## Phase 4: Hazards & Monsters (TDD)

- [x] Task: Implement monster spawning and basic movement AI.
- [x] Task: Implement collision detection (Knight vs Monster, Line vs Monster).
- [x] Task: Implement HP management and "lost prisoner" mechanics.
- [x] Task: Implement lose state.

---

## Phase 5: Polish & Fidelity

- [x] Task: Integrate Virtual DPad for movement.
- [x] Task: Integrate `GameStartScreen` and `GameEndScreen`.
- [x] Task: Add sound effects and visual feedback (crystal sparkles, monster hits).
- [x] Task: Final audit against fidelity checklist.

---

## Technical Notes
- Trailing distance: `pathHistory` should store points every few pixels.
- Monster hitting line: `newHistoryLength = historyIndexOfHitMember; currentRescuedCount = memberIndex;`.
