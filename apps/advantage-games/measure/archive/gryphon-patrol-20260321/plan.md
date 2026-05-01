# Implementation Plan: Gryphon Patrol

This plan outlines the steps to build "Gryphon Patrol" using **React-Konva (Canvas)** with strict TDD methodology.

---

## Phase 1: Setup & Infrastructure

- [x] Task: Create configuration file `src/lib/games/gryphonPatrolConfig.ts`.
- [x] Task: Define game state types and interfaces in `src/lib/games/gryphonPatrol.ts`.
- [x] Task: Create page route `src/app/[locale]/(student)/student/games/sentence/gryphon-patrol/page.tsx`.
- [x] Task: Create API routes for sentences and complete.
- [x] Task: Create `GryphonPatrolGame` container component.

---

## Phase 2: World & Scrolling (TDD)

- [x] Task: Implement wrap-around coordinate system (0 to mapWidth).
- [x] Task: Implement player movement with momentum.
- [x] Task: Implement camera system (scroll map based on player position).
- [x] Task: Implement mini-map rendering logic.

---

## Phase 3: Enemies & Combat (TDD)

- [x] Task: Implement enemy spawning across the map.
- [x] Task: Implement enemy AI (flight patterns).
- [x] Task: Implement shooting mechanics and collision detection.
- [x] Task: Implement word orb dropping/collection.

---

## Phase 4: Gameplay Loop & Sequence (TDD)

- [x] Task: Implement correct word order collection logic.
- [x] Task: Implement HP, score, and XP calculation.
- [x] Task: Implement win/lose state transitions.
- [x] Task: Render parallax background and landscape.

---

## Phase 5: Polish & Fidelity

- [x] Task: Integrate Virtual DPad for flight.
- [x] Task: Integrate `GameStartScreen` and `GameEndScreen`.
- [x] Task: Add sound effects and visual feedback (explosions, sparkles).
- [x] Task: Final audit against fidelity checklist.

---

## Technical Notes
- Wrap-around logic: `nextX = (x + dx + mapWidth) % mapWidth`.
- Camera center: `cameraX = playerX - gameWidth / 2`.
- Mini-map scale: `gameWidth / mapWidth`.
