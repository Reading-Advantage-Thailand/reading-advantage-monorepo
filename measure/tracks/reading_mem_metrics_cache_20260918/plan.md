# Implementation Plan: Memory — Bound the Metrics Cache

Track ID: `reading_mem_metrics_cache_20260918`. Spec: `spec.md`. Type: chore (classic).

All file paths are relative to `apps/reading-advantage/` unless noted.

## Phase 1: Red

- [ ] Task: Write failing tests
  - [ ] Test that inserting beyond 1000 entries evicts the oldest (FIFO) on each map.
  - [ ] Test that `clear()` empties the counter map too.
  - [ ] Confirm Red. Record the failures.

## Phase 2: Green

- [ ] Task: Implement the bounded maps and complete `clear()` in `lib/cache/metrics.ts`
  - [ ] Copy the design from `packages/api/src/cache/dashboard-cache.ts:63-71`.
  - [ ] Keep the public API and TTL semantics unchanged.
  - [ ] Run the new tests until green; run the app Jest suite and `check-types` (known baselines: 2 failing suites, 8 tsc errors). Record the results.

## Phase 3: Commit and closeout

- [ ] Task: Commit and record
  - [ ] Commit subject (under 100 chars): `perf(reading): bound metrics cache with FIFO eviction (track_id: reading_mem_metrics_cache_20260918)`
  - [ ] Attach the task summary with `git notes add`.
  - [ ] Mark all tasks `[x]` with the 7-char commit SHA in this plan; commit the plan update as `chore(measure): mark metrics cache track tasks complete`.
