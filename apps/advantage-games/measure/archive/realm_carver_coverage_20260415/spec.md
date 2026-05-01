# Specification: Realm Carver Coverage Fix

## Overview

Increase test coverage for realm-carver from 75.51% to ≥80% by targeting untested components: GameEndScreen, VirtualDPad, and useSound hook.

## Functional Requirements

- Write unit tests for GameEndScreen component (props, rendering, state transitions)
- Write unit tests for VirtualDPad component (input handling, direction callbacks)
- Write unit tests for useSound hook (play, stop, toggle, volume)
- All existing tests must continue to pass

## Acceptance Criteria

- realm-carver coverage ≥ 80%
- All new tests pass
- No regressions in existing functionality

## Out of Scope

- No gameplay logic changes
- No new features