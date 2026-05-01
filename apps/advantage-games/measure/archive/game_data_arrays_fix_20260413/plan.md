# Implementation Plan: Fix Game Data Arrays

## Phase 1: Fix gryphon-patrol sentences

- [x] Task: Add 7+ more sentences to gryphon-patrol/sentences/route.ts
  - [x] Added 8 more sentences (total: 11)
  - [x] Test passes: gryphon-patrol now has >= 10 sentences

## Phase 2: Fix default.json for haunted-library

- [x] Task: Update public/vocab/default.json with valid sentences (3-10 words)
  - [x] Replaced single-word entries with 12 valid sentences (3-10 words each)
  - [x] haunted-library test passes

## Phase 3: Verify

- [x] Task: Run gameDataArrays tests - 7/7 PASSED
- [x] Task: Update tech-debt.md to mark issue resolved