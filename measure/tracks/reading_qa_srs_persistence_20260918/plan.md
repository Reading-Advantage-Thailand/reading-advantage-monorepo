# Implementation Plan: Reading QA — SRS Review Persistence

Track ID: `reading_qa_srs_persistence_20260918`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/` unless noted.

## Phase 1: Reproduce and Diagnose

- [ ] Task: Reproduce the failure with direct HTTP calls
  - [ ] Log in as `demo-student-b1` (password `demo123`) on `http://localhost:3100`. Keep a cookie jar.
  - [ ] Fetch the student's due cards and one card id from the DB or the stats endpoint.
  - [ ] POST `/api/v1/flashcard/progress/update` with a real `{cardId, rating, type}`. Capture status and body.
  - [ ] POST `/api/v1/users/{userId}/activitylog` with the flashcard session payload. Capture status and body.
  - [ ] Read the card row before and after (`reps`, `state`, `due`, `stability`).
  - [ ] Record the transcript and the broken link in this plan (FR-1).

## Phase 2: Red

- [ ] Task: Write the failing regression test
  - [ ] Test the diagnosed fault point. Mock the DB layer with Jest mocks where possible.
  - [ ] Assert the fixed behavior (FR-3, FR-4).
  - [ ] Run the test. Confirm it fails (Red). Record the failure.

## Phase 3: Green

- [ ] Task: Fix the root cause
  - [ ] Apply the minimal fix at the diagnosed point (FR-2).
  - [ ] Run the new test until green.
  - [ ] Run the app Jest suite and `check-types`. Record the results.

## Phase 4: Live verification, commit, and closeout

- [ ] Task: Verify the full chain against the dev server
  - [ ] Repeat the Phase 1 reproduction after the fix. Confirm the progress POST persists FSRS fields.
  - [ ] Confirm `xp_logs` gains a row and the user XP total changes.
  - [ ] Confirm the dashboard due state reflects the new card state after reload (AC-3).
  - [ ] Record the after-transcript in the task note.
- [ ] Task: Commit and record
  - [ ] Commit subject: `fix(reading): persist flashcard SRS reviews end to end (track_id: reading_qa_srs_persistence_20260918)`.
  - [ ] Attach the task summary with `git notes add` on the commit.
  - [ ] Mark all tasks `[x]` with the commit SHA (7 chars) in this plan.
