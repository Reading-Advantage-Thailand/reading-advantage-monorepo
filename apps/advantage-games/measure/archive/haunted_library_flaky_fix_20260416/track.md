# Track: Haunted Library Flaky Tests Fix

## Description
Fix intermittent test failures in hauntedLibrary.test.ts due to Math.random() ghost/bat positioning causing non-deterministic collision detection.

## Status
- Created: 2026-04-16
- Type: Bug Fix
- Priority: High

## Problem Statement
From tech-debt.md:
- hauntedLibrary.test.ts: flaky tests due to Math.random() ghost/bat positioning — "should handle victory" and "should take damage from ghost collision" still intermittently fail despite deterministic door positioning fix (2026-04-14)

## Technical Analysis
The hauntedLibrary game uses Math.random() for:
1. Ghost/bat positioning in createEnemies
2. Door floor assignment

Previous fix (2026-04-14) made door positioning deterministic, but ghost/bat positioning is still random, causing:
- "should handle victory" to fail when ghost collision kills player before reaching door
- "should take damage from ghost collision" to be non-deterministic

## Implementation Plan

### Phase 1: Make ghost/bat spawning deterministic
- [x] Make Math.random() injectable via rng parameter in `createLibraryState`
- [x] Update `hauntedLibrary.test.ts` to use mock RNG where deterministic setup is required

### Phase 2: Fix specific flaky tests
- [x] "should handle victory" - ensure no ghost spawns near player path
- [x] "should take damage from ghost collision" - deterministic ghost placement

### Phase 3: Verify
- [x] Run tests 10 times to confirm no flakiness
- [x] All existing tests pass
