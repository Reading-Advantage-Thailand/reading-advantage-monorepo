# Implementation Plan: Realm Carver

This plan outlines the steps to build "Realm Carver" using **React-Konva (Canvas)** with strict TDD methodology.

---

## Phase 1: Setup & Infrastructure

- [x] Task: Create configuration file `src/lib/games/realmCarverConfig.ts`.
- [x] Task: Define game state types and interfaces in `src/lib/games/realmCarver.ts`.
- [x] Task: Create page route `src/app/[locale]/(student)/student/games/sentence/realm-carver/page.tsx`.
- [x] Task: Create API routes for sentences and complete.
- [x] Task: Create `RealmCarverGame` container component.

---

## Phase 2: Grid & Territory Logic (TDD)

- [x] Task: Implement grid initialization (100x100 occupancy map).
- [x] Task: Implement player movement on claimed cells.
- [x] Task: Implement trail drawing on wild cells.
- [x] Task: Implement territory filling algorithm (Flood fill or Scanline).
- [x] Task: Implement word containment check (is word inside new territory?).

---

## Phase 3: Core Gameplay (TDD)

- [x] Task: Implement bouncing monsters logic.
- [x] Task: Implement trail-monster collision detection.
- [x] Task: Implement word collection in correct sentence sequence.
- [x] Task: Implement HP and damage system.
- [x] Task: Implement win/lose state transitions.

---

## Phase 4: Rendering

- [x] Task: Render map grid with different colors for claimed/wild/trail.
- [x] Task: Render player and trail line.
- [x] Task: Render monsters (floating orbs or sparks).
- [x] Task: Render words as floating runes.
- [x] Task: Render HUD (HP, Sentence Progress).

---

## Phase 5: Input & Polish

- [x] Task: Integrate Virtual DPad for movement.
- [x] Task: Integrate `GameStartScreen` and `GameEndScreen`.
- [x] Task: Add sound effects and visual feedback.
- [x] Task: Final audit against fidelity checklist.

---

## Technical Notes
- Flood fill algorithm must be optimized for performance (60 FPS loop).
- Grid coordinates to screen coordinates mapping is critical.
- Use `requestAnimationFrame` for smooth trail rendering.
