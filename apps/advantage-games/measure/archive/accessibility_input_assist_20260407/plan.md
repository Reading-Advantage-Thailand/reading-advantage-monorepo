# Implementation Plan: Shared Accessibility and Input Assist Layer

## Phase 1: Define Shared Contract

- [x] Task: Draft accessibility and assist setting schema.
  - [x] Define persisted setting keys and defaults.
  - [x] Define integration points in game entry flow.
- [x] Task: Build shared layer scaffolding.
  - [x] Add utility/hooks for reading settings.
  - [x] Add tests for default and override behavior.
- [x] Task: Measure - User Manual Verification 'Phase 1: Define Shared Contract' (Protocol in workflow.md)

## Phase 2: Integrate Representative Games

- [x] Task: Apply assist layer to representative games.
  - [x] Integrate one vocabulary game (WizardZombieGame - touch targets + text scaling).
  - [x] Integrate one sentence game (DungeonLiberatorGame - touch target scaling).
- [x] Task: Validate UX and gameplay compatibility.
  - [x] Run targeted tests and manual interaction checks.
  - [x] Confirm no regression in start/end flows.
- [x] Task: Document rollout pattern for remaining games.
- [ ] Task: Measure - User Manual Verification 'Phase 2: Integrate Representative Games' (Protocol in workflow.md)

