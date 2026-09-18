# Implementation Plan: Memory — Client Quick Wins

Track ID: `reading_mem_client_quick_20260918`. Spec: `spec.md`. Type: chore (classic).

All file paths are relative to `apps/reading-advantage/` unless noted.

## Phase 1: Red

- [ ] Task: Write failing tests
  - [ ] Test audio cleanup releases `src` and drops the cache-buster (FR-1, FR-2).
  - [ ] Test the AudioContext closes on unmount (FR-3).
  - [ ] Test the game store resets on unmount (FR-5).
  - [ ] Confirm Red. Record the failures.

## Phase 2: Green

- [ ] Task: Apply FR-1 and FR-2 in `phase3-first-reading.tsx` and `phase5-deep-reading.tsx`.
- [ ] Task: Apply FR-3 and FR-4 in `hooks/useSound.ts`.
- [ ] Task: Apply FR-5 in `store/useGameStore.ts` and `phase10-vocabulary-matching.tsx`.
- [ ] Task: Run the new tests until green; run the app Jest suite and `check-types` (known baselines: 2 failing suites, 8 tsc errors). Record the results.

## Phase 3: Commit and closeout

- [ ] Task: Commit and record
  - [ ] Commit subject (under 100 chars): `perf(reading): release audio buffers and reset game memory (track_id: reading_mem_client_quick_20260918)`
  - [ ] Attach the task summary with `git notes add`.
  - [ ] Mark all tasks `[x]` with the 7-char commit SHA in this plan; commit the plan update as `chore(measure): mark client memory track tasks complete`.
