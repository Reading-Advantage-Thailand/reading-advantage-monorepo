# Implementation Plan: Fix Difficulty Guardrail Inconsistency

## Phase 1: Add Guardrail Validation Test

- [x] Task: Write test to verify all difficulty tiers comply with DIFFICULTY_GUARDRAILS
  - [x] Test that all wordCount.max values are <= guardrails.maxWordCount
  - [x] Test fails with extreme tier (wordCount.max=12 > 10) - CONFIRMED

## Phase 2: Fix the Inconsistency

- [x] Task: Fix extreme tier wordCount.max from 12 to 10
  - [x] Update DIFFICULTY_TIERS.extreme.wordCount.max = 10
  - [x] Tests now pass

## Phase 3: Verify and Check Coverage

- [x] Task: Run full test suite - PASSED (difficulty tests: 13/13)
- [x] Task: Verify lint and typecheck pass
- [x] Task: Update tech-debt.md to mark this issue as resolved