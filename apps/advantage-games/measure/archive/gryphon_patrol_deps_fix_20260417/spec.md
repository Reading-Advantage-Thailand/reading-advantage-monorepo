# Gryphon Patrol Hook Dependencies Fix

## Issue
The `useEffect` in `GryphonPatrolGame.tsx` (lines 74-83) that calls `onComplete` is missing `gameState.collectedWords.length` and `gameState.sentence.length` in its dependency array, even though these values are used inside the effect to calculate accuracy.

## Impact
- React ESLint rules will flag this as a missing dependency violation
- Stale closure risk: if `collectedWords.length` or `sentence.length` change without `gameState.status` changing, the effect won't re-run with the updated values
- Accuracy calculation may use stale values

## Root Cause
The `onComplete` callback should fire when the game ends (status === 'won' or 'lost'). However, the accuracy calculation depends on `collectedWords.length / sentence.length`. If the game ends and these values change in the same render cycle without status changing, the effect won't re-execute.

## Solution
Add `gameState.collectedWords.length` and `gameState.sentence.length` to the dependency array. This ensures the effect re-runs whenever the values used in the accuracy calculation change.

## Files Affected
- `src/components/games/sentence/gryphon-patrol/GryphonPatrolGame.tsx`

## Verification
- ESLint no longer flags missing dependencies
- Accuracy calculation is correct when game ends
- Existing tests continue to pass