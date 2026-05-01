# Implementation Plan: Unified Difficulty Curves and Spawn Tuning

## Phase 1: Baseline and Model Definition

- [x] Task: Inventory difficulty knobs in active games.
  - [x] Identify spawn-rate, speed, health, and score multipliers per game.
  - [x] Capture current defaults in a single matrix.
- [x] Task: Define shared curve tiers.
  - [x] Specify tier thresholds and parameter ranges.
  - [x] Document fallback defaults for missing values.
- [ ] Task: Measure - User Manual Verification 'Phase 1: Baseline and Model Definition' (Protocol in workflow.md)

## Phase 2: Integrate and Validate

- [x] Task: Apply curve presets to representative games.
  - [x] Create shared difficulty tiers in src/lib/games/difficulty.ts
  - [x] Update one vocabulary game configuration (model alignment).
  - [x] Update one sentence game configuration (model alignment).
- [x] Task: Add regression checks.
  - [x] Add tests/assertions for parameter bounds in difficulty.test.ts
  - [x] Run targeted game tests and smoke checks.
- [x] Task: Publish tuning playbook for future tracks.
- [ ] Task: Measure - User Manual Verification 'Phase 2: Integrate and Validate' (Protocol in workflow.md)

