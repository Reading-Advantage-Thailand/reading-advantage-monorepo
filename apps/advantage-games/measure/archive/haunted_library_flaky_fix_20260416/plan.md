# Implementation Plan: Haunted Library Flaky Tests Fix

## Phase 1: Make ghost/bat spawning deterministic

- [x] Make Math.random() injectable via rng parameter in `createLibraryState`
- [x] Update `hauntedLibrary.test.ts` to use mock RNG where deterministic setup is required

## Phase 2: Fix specific flaky tests

- [x] "should handle victory" - ensure no ghost spawns near player path
- [x] "should take damage from ghost collision" - deterministic ghost placement

## Phase 3: Verify

- [x] Run tests 10 times to confirm no flakiness
- [x] All existing tests pass
