# Track: Adaptive Difficulty Engine

## Overview

Build a runtime difficulty adjustment engine that monitors player performance metrics (accuracy, response speed, streaks) and dynamically adjusts game parameters within each session. This replaces the current static difficulty tiers with a fluid system that keeps players in a "flow state" — challenged but not overwhelmed.

## Functional Requirements

### Performance Metrics Collection
- Track per-response metrics: correctness, time-to-answer, current streak length.
- Maintain a rolling window of the last 20 responses for smoothing.
- Calculate composite performance score (0-100) from weighted metrics:
  - Accuracy: 50% weight (correct / total in window).
  - Speed: 30% weight (normalized against expected time for difficulty tier).
  - Streak: 20% weight (current streak / streak bonus threshold).
- Expose metrics via `usePerformanceMetrics` hook for any game to consume.
- Metrics persist per-session only (reset when game restarts or new session begins).

### Difficulty Parameter Ranges
Each game type defines its own adjustable parameters with min/max bounds:

| Parameter | Example Range | Description |
|-----------|--------------|-------------|
| spawnRate | 1000-5000ms | Time between new word/target spawns |
| speed | 0.5-3.0 | Movement speed multiplier |
| wordComplexity | 1-5 | Vocabulary difficulty level |
| timeLimit | 10-60s | Time allowed per word/round |
| targetCount | 1-8 | Number of simultaneous targets |

- Each game registers its adjustable parameters and bounds via `registerDifficultyParams()`.
- Default parameters come from the existing difficulty tier system (easy/medium/hard/extreme).

### Adjustment Algorithm
- Smooth adjustment using exponential moving average (EMA) with α=0.3.
- Performance score thresholds trigger parameter shifts:
  - Score > 80: increase difficulty (shorter time, faster speed, harder words).
  - Score < 40: decrease difficulty (more time, slower speed, easier words).
  - Score 40-80: hold steady (player in flow zone).
- Parameter changes are gradual: max ±15% per adjustment cycle.
- Adjustment cycle runs every 5 responses (not every response to avoid oscillation).
- Configurable sensitivity: games can override the EMA α and adjustment cycle length.

### Integration with Existing Difficulty Tiers
- Adaptive engine layers on top of existing tiers — a game starts at the selected tier's defaults.
- If adaptive mode is enabled, the engine modifies parameters from the tier baseline.
- If adaptive mode is disabled, the engine is a no-op (zero overhead).
- Games opt-in to adaptive mode via a `<GameCanvas adaptive={true} />` prop.

### Persistence
- Adaptive state (rolling window, current parameters) stored in Zustand store.
- State resets on game restart (intentional — fresh calibration each session).
- Optional: persist last session's ending parameters as "starting hint" for next session (localStorage).

## Non-Functional Requirements

- Metrics collection must add <1ms overhead per response evaluation.
- Parameter adjustments must not cause visual jank — apply changes between frames.
- Engine must work with all existing game types without per-game modification (parameter registration is opt-in but the scoring/adjustment loop is universal).
- Mobile-first: no additional rendering overhead from the engine itself.

## Acceptance Criteria

- [ ] `usePerformanceMetrics` hook tracks accuracy, speed, and streaks over a 20-response window.
- [ ] Composite performance score (0-100) is calculated correctly.
- [ ] Games can register adjustable difficulty parameters with min/max bounds.
- [ ] Adjustment algorithm triggers on score thresholds (>80 increase, <40 decrease).
- [ ] Parameter changes are capped at ±15% per cycle.
- [ ] Adaptive mode is opt-in per game via prop.
- [ ] Engine is a no-op when adaptive mode is disabled.
- [ ] Starting a game at a given difficulty tier still works unchanged when adaptive is off.
- [ ] All new code has unit test coverage ≥80%.

## Out of Scope

- Cross-session learning or player profiles (future track).
- Machine learning-based difficulty prediction.
- Difficulty adjustment for multiplayer rooms (competitive mode uses fixed parameters).
- Modifying the existing difficulty tier definitions themselves.
