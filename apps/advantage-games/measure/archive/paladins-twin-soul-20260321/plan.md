# Implementation Plan: Paladin's Twin-Soul

This plan outlines the steps to build "Paladin's Twin-Soul" using **React-Konva (Canvas)** with strict TDD methodology.

---

## Phase 1: Setup & Infrastructure

- [x] Task: Create configuration file `src/lib/games/paladinsTwinSoulConfig.ts`.
- [x] Task: Define game state types and interfaces in `src/lib/games/paladinsTwinSoul.ts`.
- [x] Task: Create page route `src/app/[locale]/(student)/student/games/vocabulary/paladins-twin-soul/page.tsx`.
- [x] Task: Create API routes for vocabulary and complete.
- [x] Task: Create `PaladinsTwinSoulGame` container component.

---

## Phase 2: Core Engine & Movement (TDD)

- [x] Task: Implement player horizontal movement.
- [x] Task: Implement shooting mechanics (bullets, fire rate).
- [x] Task: Implement enemy formation and basic movement.
- [x] Task: Implement collision detection (bullet-enemy, enemy-player).

---

## Phase 3: Capture & Rescue Mechanics (TDD)

- [x] Task: Implement "Boss Gargoyle" capture sequence (tractor beam).
- [x] Task: Implement vocabulary matching for rescue (identify correct enemy).
- [x] Task: Implement rescue success logic (twin soul side-by-side).
- [x] Task: Implement rescue failure logic (loss of twin soul).

---

## Phase 4: Gameplay Loop & UI (TDD)

- [x] Task: Implement wave progression and target word rotation.
- [x] Task: Implement HP, scoring, and XP calculation.
- [x] Task: Implement win/lose state transitions.
- [x] Task: Render full game stage with Konva.

---

## Phase 5: Polish & Fidelity

- [x] Task: Integrate Virtual DPad or Slider.
- [x] Task: Integrate `GameStartScreen` and `GameEndScreen`.
- [x] Task: Add sound effects and animations.
- [x] Task: Final audit against fidelity checklist.

---

## Technical Notes
- Use `requestAnimationFrame` for smooth 60 FPS shooting gameplay.
- Formation logic should handle multiple rows and columns.
- Tractor beam effect can be a stylized Konva shape.
