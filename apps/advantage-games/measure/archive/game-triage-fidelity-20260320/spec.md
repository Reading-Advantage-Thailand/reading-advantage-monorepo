# Specification: Game Triage and Fidelity Audit (Post-Spellweaver's Run)

## Overview
This track involves a comprehensive triage and audit of all games developed or planned after 'Spellweaver's Run'. The goal is to ensure each game adheres to the 'vocab-game-builder' skill requirements, maintains high code quality, and provides a polished, bug-free gameplay experience on mobile-first viewports.

## Scope (Games to Triage)
- **Shadow Gate Dungeon**
- **Rune Forge Chamber**
- **Village Guardian**
- **Labyrinth of the Goblin King**
- **Archer's Revenge**
- **The Abyssal Well**
- **Griffin Sky-Joust**
- **Realm Carver**

## Functional Requirements
- **Fidelity Checklist**: Develop and verify each game against a checklist derived from the `vocab-game-builder` skill (e.g., React-Konva usage, 390x844 reference resolution).
- **Audit & Patch**: For each game, identify and immediately fix:
  - **UI Bugs**: Visual regressions, improper touch targets (<44px), or non-responsive layouts.
  - **Logic Bugs**: State management issues, sentence loading errors, or score calculation flaws.
  - **Gameplay Bugs**: Word collection mechanics, collision detection, or unbalanced difficulty.
- **Code & Test Quality**: Verify and ensure >80% test coverage and adherence to TDD patterns.

## Non-Functional Requirements
- **Performance**: Maintain 30+ FPS on mobile devices.
- **Mobile-First**: Ensure all interactions are touch-friendly and UI is optimized for portrait orientation.

## Acceptance Criteria
- All listed games have been audited against the `vocab-game-builder` checklist.
- All identified UI, logic, and gameplay bugs are resolved.
- Every game maintains >80% code coverage.
- Final build of each game is verified on a 390x844 viewport.

## Out of Scope
- Major architectural rewrites of games that already meet the core fidelity requirements.
- Adding entirely new features beyond what is required for bug fixes or fidelity compliance.
