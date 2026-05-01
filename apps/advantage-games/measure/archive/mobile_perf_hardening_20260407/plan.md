# Implementation Plan: Mobile Performance Hardening Pass

## Phase 1: Measure and Prioritize

- [x] Task: Capture baseline performance traces for active games.
  - [x] Record frame-time behavior for representative sessions.
  - [x] Identify top hotspots by frequency and impact.
- [x] Task: Define optimization targets and budgets.
  - [x] Set acceptable frame-time thresholds.
  - [x] Set memory allocation guardrails.

## Phase 2: Optimize and Verify

- [x] Task: Implement hotspot remediations.
  - [x] Reduce render/update loop overhead (VirtualDPad memoization).
  - [x] Remove avoidable allocations on hot paths (Math.random() elimination).
- [x] Task: Publish before/after performance notes (baseline.md created).

### Completed Remediations
- VirtualDPad: memo component, useCallback handlers, ref-based onInput
- WizardZombieGame: Eliminated Math.random() from Layer render
- DungeonLiberatorGame: CSS transform-only indicators, useMemo indicators

### Remaining Opportunities (Not Started)
- Add performance regression checks (requires profiling tooling)
- Batch state updates in game loops across other games
- Profile memory allocation in game loops

