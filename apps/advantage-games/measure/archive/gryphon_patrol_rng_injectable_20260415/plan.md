# Implementation Plan: Gryphon Patrol RNG Injectable

## Task 1: Refactor Math.random() to Injectable RNG

- [x] Read GryphonPatrolGame.tsx to identify all Math.random() usages
- [x] Create rng parameter with default value Math.random
- [x] Replace all Math.random() calls with rng()
- [x] Write tests using deterministic mock RNG

## Task 2: Verify

- [x] Run existing tests to ensure no regression
- [ ] Run full test suite and build
- [ ] Measure — User Manual Verification
