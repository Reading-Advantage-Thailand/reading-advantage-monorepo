# Specification: Shared Game Camera Hook

## Overview

Extract duplicate camera/ResizeObserver/dimension tracking code from individual game components into a shared reusable hook (`useGameCamera`).

## Problem

Multiple game components contain identical or near-identical code for:
1. Tracking container dimensions via `useState` and `ResizeObserver`
2. Computing camera offset and scale based on game world vs container dimensions
3. Calculating indicator positions in screen space

This duplication violates DRY principles and makes maintenance difficult.

## Solution

Create a shared `useGameCamera` hook that encapsulates:
- Container dimension tracking with ResizeObserver
- Camera state (position, scale) computation
- Screen-space indicator position calculation

## Functional Requirements

1. **Hook Interface**: `useGameCamera(containerRef, gameWidth, gameHeight)` returning `{ dimensions, camera, getIndicatorPosition }`
2. **Dimension Tracking**: Track container size via ResizeObserver, update on resize
3. **Camera Computation**: Calculate camera offset to center player, scale to fit game world in container
4. **Indicator Positioning**: Utility function to convert world coordinates to screen coordinates
5. **Backwards Compatibility**: Games currently using manual dimension tracking should be able to migrate incrementally

## Affected Games (to migrate)

- WizardZombieGame
- DungeonLiberatorGame
- GriffinSkyJoustGame
- (Others identified during implementation)

## Acceptance Criteria

1. `useGameCamera` hook created in shared location
2. At least one game migrated to use the new hook
3. Tests cover the hook behavior
4. No regression in game functionality

## Out of Scope

- Full migration of all games (this track covers creation + one pilot migration)
- Changes to game logic or behavior