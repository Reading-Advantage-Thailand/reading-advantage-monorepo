# Track: Fix Difficulty Guardrail Inconsistency

## Description
Fix semantic inconsistency in difficulty.ts where `extreme` tier wordCount.max=12 exceeds DIFFICULTY_GUARDRAILS.maxWordCount=10.

## Issue
- File: `src/lib/games/difficulty.ts`
- Line 45: `extreme` tier has `wordCount: { min: 9, max: 12 }`
- Line 70: `DIFFICULTY_GUARDRAILS.maxWordCount = 10`
- The `extreme` max of 12 violates the guardrail of 10

## Root Cause
The `extreme` tier was configured with wordCount.max=12 without checking against the established guardrails.

## Fix
Change `extreme.wordCount.max` from 12 to 10 to comply with DIFFICULTY_GUARDRAILS.maxWordCount.

## Status: SPEC