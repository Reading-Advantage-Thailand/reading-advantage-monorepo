# Implementation Plan: Reading QA — Lesson Seed Completeness

Track ID: `reading_qa_lesson_seed_20260918`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/` unless noted. Execute after track `reading_qa_lesson_page_20260918` (its fixed endpoints are this track's verification surface).

## Phase 1: Red

- [ ] Task: Write failing checks for the seed contract
  - [ ] Unit-test the content helpers where practical (question generation shape, translation shape, idempotency logic).
  - [ ] Document current counts as the baseline (articles=25, mcq/sa/laq=0).

## Phase 2: Green

- [ ] Task: Fix the `xp_logs` crash and make inserts idempotent (FR-1, FR-2) in `demo-seed.ts`; apply the same crash fix to `seed.ts`.
- [ ] Task: Generate complete article content (FR-3): passages, summaries, image descriptions, MCQ/SA/LA questions, Thai translations.
- [ ] Task: Preserve users and logins across the reseed (FR-5).
- [ ] Task: Run the seed twice with the corrected `DATABASE_URL`. Verify stable counts and AC-1..AC-4. Record both transcripts.
- [ ] Task: Run the app Jest suite and `check-types` (known baselines: 2 failing suites, 8 tsc errors). Record the results.

## Phase 3: Commit and closeout

- [ ] Task: Commit and record
  - [ ] Commit subject (under 100 chars): `fix(reading): seed complete lesson content idempotently (track_id: reading_qa_lesson_seed_20260918)`
  - [ ] Attach the task summary with `git notes add`.
  - [ ] Mark all tasks `[x]` with the 7-char commit SHA in this plan; commit the plan update as `chore(measure): mark lesson seed track tasks complete`.
