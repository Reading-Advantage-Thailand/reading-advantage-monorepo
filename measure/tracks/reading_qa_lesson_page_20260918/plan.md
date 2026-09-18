# Implementation Plan: Reading QA — Lesson Page Code Defects

Track ID: `reading_qa_lesson_page_20260918`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/` unless noted.

## Phase 1: Diagnose and Red

- [ ] Task: Diagnose the three endpoint failures
  - [ ] Reproduce each call with curl (login `demo-student-b1` / `demo123` on `http://localhost:3100`, cookie jar). Capture status and body.
  - [ ] Read `server/controllers/question-controller.ts` (getMCQuestions/getSAQuestions/getLAQuestions), `server/controllers/translation-controller.ts` (translate), and the lesson read flow's activitylog post. Record each root cause in this plan.
- [ ] Task: Write failing tests
  - [ ] Test empty-question articles return 200 `[]` (FR-1).
  - [ ] Test stored-translation serving and the unavailable response (FR-2).
  - [ ] Test the lesson activitylog payload is accepted (FR-3).
  - [ ] Confirm Red. Record the failures.

## Phase 2: Green

- [ ] Task: Fix the questions endpoints (FR-1)
- [ ] Task: Fix the translate endpoint (FR-2)
- [ ] Task: Fix the activitylog payload handling (FR-3)
- [ ] Task: Add the `selectType.types.*` keys to all five locale catalogs (FR-4)
- [ ] Task: Add graceful missing-content states (FR-5)
- [ ] Task: Run the new tests until green; run the app Jest suite and `check-types` (known baselines: 2 failing suites, 8 tsc errors). Record the results.

## Phase 3: Live verification, commit, and closeout

- [ ] Task: Verify against the running dev server
  - [ ] Curl each fixed endpoint. Record the transcript.
  - [ ] Browser check (Playwright headless or webbridge, one page at a time): `/en/student/read` and `/en/student/read/{uuid}` produce no console errors from these endpoints and no raw i18n keys.
- [ ] Task: Commit and record
  - [ ] Commit subject (under 100 chars): `fix(reading): make lesson endpoints and states robust (track_id: reading_qa_lesson_page_20260918)`
  - [ ] Attach the task summary with `git notes add`.
  - [ ] Mark all tasks `[x]` with the 7-char commit SHA in this plan; commit the plan update as `chore(measure): mark lesson page track tasks complete`.
