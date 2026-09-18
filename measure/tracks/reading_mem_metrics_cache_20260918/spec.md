# Specification: Memory — Bound the Metrics Cache

Track ID: `reading_mem_metrics_cache_20260918`. Type: chore. App: `apps/reading-advantage`.

## Overview

Source: the 2026-09-18 memory audit, item 3 and server findings S2, S3. `lib/cache/metrics.ts` holds three module-level Maps (`cache`, `pendingRefresh`, and a metrics counter map). They have no size limit and no expiry sweep, so the heap grows with the number of distinct users and classes. The counter map also survives `clear()`.

## Functional Requirements

### FR-1: Bound the cache maps

Apply the bounded-cache design from `packages/api/src/cache/dashboard-cache.ts` (lines 63-71) to `lib/cache/metrics.ts`: a 1000-entry cap with FIFO eviction for each Map.

### FR-2: Make `clear()` complete

`clear()` must also clear the metrics counter map (audit S3, lines 96-107, 124, 215).

### FR-3: Preserve the public API

No caller changes. TTL behavior and the pending-refresh semantics stay as they are.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Minimal edit inside `lib/cache/metrics.ts`.

## Acceptance Criteria

- AC-1: A unit test proves FIFO eviction at the 1000-entry cap.
- AC-2: A unit test proves `clear()` empties every map including the counters.
- AC-3: The full app Jest suite and `check-types` match the known baselines (2 failing suites, 8 tsc errors).

## Out of Scope

- The metrics SSE stream cleanup (audit S17).
- The metrics cache warmer and timers (audit S16).
