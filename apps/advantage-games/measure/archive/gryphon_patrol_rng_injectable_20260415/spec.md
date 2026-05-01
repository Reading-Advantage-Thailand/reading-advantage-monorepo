# Track: Gryphon Patrol RNG Injectable

## Overview

Refactor GryphonPatrolGame to use an injectable RNG function instead of direct Math.random() calls, enabling deterministic testing.

## Problem

GryphonPatrolGame.tsx uses `Math.random()` directly in game logic for enemy spawning and movement, making unit tests non-deterministic and flaky.

## Functional Requirements

- Replace all `Math.random()` calls with an injectable `rng` parameter (default: `Math.random`)
- Game class/game component accepts optional `rng` prop for testability
- All game logic remains functionally identical
- Unit tests can pass deterministic values to verify specific code paths

## Acceptance Criteria

- [ ] All Math.random() calls replaced with rng() function
- [ ] Default rng is Math.random for production use
- [ ] Tests can inject mock RNG for deterministic behavior
- [ ] Existing tests pass with injected deterministic RNG
- [ ] Test coverage maintained or improved