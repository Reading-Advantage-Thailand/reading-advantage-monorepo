# Implementation Plan: Dungeon Liberator Sentences Bug Fix

## Phase 1: Fix API Route and Game Component

### Task 1.1: Fix API route field names and add missing sentences
- [x] Change `sentence` to `term` in all hardcoded sentence objects
- [x] Add 2 more sentences to meet the minimum of 5

### Task 1.2: Fix game component field access
- [x] Change `vocabList[0]?.sentence?.split(' ')` to `vocabList[0]?.term?.split(' ')` (lines 29, 84)

### Task 1.3: Verify fix
- [x] TypeScript compilation — no new errors from the fix
- [x] No existing tests for this game; pre-existing TS errors are unrelated
