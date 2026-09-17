# Implementation Plan: Reading QA — Vocabulary Flashcard Content

Track ID: `reading_qa_vocab_flashcards_20260918`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/` unless noted.

## Phase 1: Diagnose and Red

- [ ] Task: Diagnose where the word payload is lost
  - [ ] Trace `deck-view.tsx` → `getDeckCards()` (`actions/flashcard.ts`) → server query.
  - [ ] Inspect the served card shape with the live dev server or a direct query. Confirm which projection drops the word data.
  - [ ] Record the diagnosis (file, line, missing field) in this plan as a short note.
- [ ] Task: Write the failing unit test
  - [ ] Test the diagnosed projection function. Mock the DB layer with Jest mocks.
  - [ ] Assert each vocabulary card carries word text and translation (FR-2).
  - [ ] Run the test. Confirm it fails (Red). Record the failure.

## Phase 2: Green

- [ ] Task: Fix the vocabulary card projection
  - [ ] Apply the minimal fix at the diagnosed point (join or embed the word data).
  - [ ] Keep the sentence projection unchanged (FR-3).
  - [ ] Run the new test until green.
  - [ ] Run the app Jest suite and `check-types`. Record the results.

## Phase 3: Live verification, commit, and closeout

- [ ] Task: Verify against the running dev server
  - [ ] Log in as `demo-student-b1` (password `demo123`) on `http://localhost:3100`.
  - [ ] Load the vocabulary study cards through the diagnosed path. Confirm every card has non-empty word data (AC-2).
  - [ ] Load the sentence study cards. Confirm sentence text still renders (AC-3).
  - [ ] Record the transcript in the task note.
- [ ] Task: Commit and record
  - [ ] Commit subject: `fix(reading): carry word payload in vocabulary flashcard projection (track_id: reading_qa_vocab_flashcards_20260918)`.
  - [ ] Attach the task summary with `git notes add` on the commit.
  - [ ] Mark all tasks `[x]` with the commit SHA (7 chars) in this plan.
