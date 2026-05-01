# Implementation Plan: Adaptive Difficulty Engine

## Phase 1: Performance Metrics Collection [checkpoint: c54a982]

- [x] Task: Define metrics types and interfaces. [af8b127]
  - [x] Create `types/adaptive-difficulty.ts` with `PerformanceMetrics`, `ResponseRecord`, and `DifficultyParams` types.
  - [x] Write unit tests for type construction and validation.
- [x] Task: Implement `usePerformanceMetrics` hook. [05e4c0d]
  - [x] Rolling window of last 20 responses (correctness, time-to-answer, streak).
  - [x] Composite performance score (0-100) with weighted formula: accuracy 50%, speed 30%, streak 20%.
  - [x] Expose `recordResponse(correct, timeMs)` and `getScore()` methods.
  - [x] Write unit tests: accuracy calculation, speed normalization, streak tracking, rolling window eviction.
- [x] Task: Implement `registerDifficultyParams` registration function. [c54a982]
  - [x] Games call `registerDifficultyParams(gameId, params)` to declare adjustable parameters with min/max bounds.
  - [x] Store parameter registry in a module-level Map.
  - [x] Write unit tests for parameter registration and retrieval.
- [x] Task: Measure — User Manual Verification 'Phase 1: Performance Metrics Collection' (Protocol in workflow.md)

## Phase 2: Adjustment Algorithm [checkpoint: 272f8e9]

- [x] Task: Implement EMA-based adjustment engine. [272f8e9]
  - [x] Create `lib/adaptive-difficulty/adjustment-engine.ts`.
  - [x] Exponential moving average with configurable α (default 0.3).
  - [x] Threshold logic: score > 80 → increase, < 40 → decrease, 40-80 → hold.
  - [x] Parameter change capped at ±15% per adjustment cycle.
  - [x] Adjustment cycle triggers every 5 responses.
  - [x] Write unit tests: EMA smoothing, threshold triggers, rate limiting, cycle counting.
- [x] Task: Implement parameter modifier.
  - [x] Given current parameters and performance score, compute adjusted parameters.
  - [x] Respect min/max bounds from parameter registry.
  - [x] Return delta (what changed) for UI feedback.
  - [x] Write unit tests: boundary clamping, direction of change, delta calculation.
- [x] Task: Measure — User Manual Verification 'Phase 2: Adjustment Algorithm' (Protocol in workflow.md)

## Phase 3: Game Integration

- [x] Task: Implement `useAdaptiveDifficulty` hook.
  - [x] Combines `usePerformanceMetrics` + adjustment engine.
  - [x] Exposes `recordResponse()`, `getCurrentParams()`, `isEnabled()`.
  - [x] Accepts `adaptive` boolean prop and `gameId` for parameter lookup.
  - [x] No-op mode: when `adaptive=false`, `recordResponse()` is a no-op and `getCurrentParams()` returns defaults.
  - [x] Write unit tests: enabled vs disabled behavior, parameter updates after cycle.
- [x] Task: Add `adaptive` prop to game canvas component.
  - [x] Extend `<GameCanvas>` with optional `adaptive` prop (default: false).
  - [x] Pass adaptive params to game-specific parameter consumers.
  - [x] Write component tests: prop passthrough, no-op when disabled.
- [x] Task: Integrate with 2 representative games (e.g., Dragon Flight, Wizard vs Zombie).
  - [x] Register difficulty parameters for each game.
  - [x] Wire `useAdaptiveDifficulty` into game loop.
  - [x] Verify parameter changes are applied smoothly between frames.
  - [x] Write integration tests for both games.
- [x] Task: Measure — User Manual Verification 'Phase 3: Game Integration' (Protocol in workflow.md)

## Phase 4: Testing & Calibration [checkpoint: 0c02439]

- [x] Task: Calibration test suite. [be06305]
  - [x] Simulate player sessions with known accuracy/speed patterns.
  - [x] Verify engine converges to flow zone (score 40-80) within 20 responses.
  - [x] Test edge cases: perfect accuracy, 0% accuracy, all fast, all slow.
  - [x] Write calibration tests with assertion on convergence.
- [x] Task: Optional session-start hint persistence. [7dc5563]
  - [x] Save last session's ending parameters to localStorage.
  - [x] On next session start, load as initial parameters (if available).
  - [x] Write unit tests for hint save/load and fallback to tier defaults.
- [x] Task: Performance overhead verification. [32e49cb]
  - [x] Benchmark `recordResponse()` latency — must be <1ms.
  - [x] Verify no frame drops when adaptive mode is enabled.
- [x] Task: Measure — User Manual Verification 'Phase 4: Testing & Calibration' (Protocol in workflow.md). [05f33eb]
