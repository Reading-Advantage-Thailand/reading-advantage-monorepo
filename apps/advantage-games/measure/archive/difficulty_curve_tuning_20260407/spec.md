# Track: Unified Difficulty Curves and Spawn Tuning

## Overview

Define and implement a consistent difficulty curve model across active games so player progression, challenge ramps, and failure rates are predictable and tunable.

## Functional Requirements

- Define a shared difficulty model with clear progression tiers.
- Audit current spawn and scoring parameters across active games.
- Add per-game tuning presets mapped to the shared model.
- Add guardrails to prevent extreme configuration regressions.
- Document tuning rules for future game tracks.

## Non-Functional Requirements

- Tuning updates must not reduce mobile playability.
- Runtime changes must remain deterministic for test reproducibility.

## Acceptance Criteria

- [ ] Shared curve definition is documented and versioned.
- [ ] At least one representative vocabulary game and one sentence game use the new presets.
- [ ] Existing game loops remain functional with no crashes or deadlocks.
- [ ] Baseline QA checks pass for updated games.

## Out of Scope

- Net-new game feature development.
- Full rebalance of every archived game.
