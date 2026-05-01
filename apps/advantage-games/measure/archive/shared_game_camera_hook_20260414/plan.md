# Implementation Plan: Shared Game Camera Hook

## Phase 1: Create Shared Hook

- [x] Task: Analyze existing dimension/camera code patterns
  - [x] Document common patterns in WizardZombieGame, DungeonLiberatorGame, GriffinSkyJoustGame
  - [x] Identify all shared behavior to extract
- [x] Task: Create `useGameCamera` hook
  - [x] Write unit tests for hook
  - [x] Implement dimension tracking with ResizeObserver
  - [x] Implement camera computation (offset, scale)
  - [x] Implement `getIndicatorPosition` utility
- [ ] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md)

## Phase 2: Pilot Migration

- [x] Task: Migrate WizardZombieGame to use `useGameDimensions`
  - [x] Update imports and replace local dimension tracking
  - [x] Run tests and verify functionality
- [ ] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md)