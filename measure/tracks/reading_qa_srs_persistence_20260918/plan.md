# Implementation Plan: Reading QA — SRS Review Persistence

Track ID: `reading_qa_srs_persistence_20260918`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/` unless noted.

## Phase 1: Reproduce and Diagnose [x] (191b546)

- [x] Task: Reproduce the failure with direct HTTP calls
  - [x] Log in as `demo-student-b1` (password `demo123`) on `http://localhost:3100`. Keep a cookie jar.
  - [x] Fetch the student's due cards and one card id from the DB or the stats endpoint.
  - [x] POST `/api/v1/flashcard/progress/update` with a real `{cardId, rating, type}`. Capture status and body.
  - [x] POST `/api/v1/users/{userId}/activitylog` with the flashcard session payload. Capture status and body.
  - [x] Read the card row before and after (`reps`, `state`, `due`, `stability`).
  - [x] Record the transcript and the broken link in this plan (FR-1).

### Reproduction transcript (before fix, 2026-09-18 ~00:00 UTC, dev log lines ~2300-2410)

- Login `demo-student-b1`/`demo123` → 200, `session_token` cookie, user XP 64192.
- Rating POST (`01985e77`, Good, vocabulary) → HTTP 200 `{"message":"Card progress updated"}`.
  Row moved reps 6→7, due 09-17→09-18, stability 1.121→1.169. Valid-memory
  cards persist; the route itself is reachable and authorized.
- Activitylog POST (flashcard session payload with top-level
  `targetId: flashcard-vocabulary-<ts>`) → **HTTP 400 `{"message":"Target ID
  is required"}`**, XP stayed 64192. Dev log confirms the browser QA hit the
  same 400 plus `[browser] Failed to award XP: { message: 'Target ID is
  required' }` at `flashcard-game.tsx:230`.
- Dev log during the QA session shows the rating fault:
  `Error updating flashcard progress: Error [FSRSValidationError]: Invalid
  memory state { difficulty: 0.5463865, stability: 0 }` at
  `update/route.ts:78` (`f.repeat`), yet the response was **HTTP 200**, so the
  client counted the card correct while nothing was written (2 of 5 vocab
  ratings and 1 of 2 sentence ratings threw; the successes scheduled +~10min
  same-day, so the date-based due filter still counted them).

### Root cause (two broken links)

1. Ratings: stored New cards carry `stability: 0` with seed-written nonzero
   difficulty (e.g. vocab `06daf774` d=0.546, `032b6ea8` d=2.406; sentence
   `5c2be8fa` d=4.21). ts-fsrs 5.4.1 only auto-initializes the exact `(0, 0)`
   input and throws `FSRSValidationError` otherwise below its minimums.
   The catch-all returned HTTP 200 with the error in the body → silent drop.
2. XP: `resolveActivityTarget` (`server/controllers/user-controller.ts`)
   only read `articleId/storyId/contentId` and ignored the explicit top-level
   `targetId` the flashcard client sends → every session XP POST 400'd, no
   `xp_logs` row, XP unchanged.

## Phase 2: Red [x] (191b546)

- [x] Task: Write the failing regression test
  - [x] Test the diagnosed fault point. Mock the DB layer with Jest mocks where possible.
  - [x] Assert the fixed behavior (FR-3, FR-4).
  - [x] Run the test. Confirm it fails (Red). Record the failure.

Red evidence (`__tests__/controllers/srs-persistence-red.test.ts`, 4 tests):
3 failed / 1 passed before the fix — stability-0 Good rating never called
`db.update`; missing card returned HTTP 200 instead of 404; flashcard
activitylog payload returned 400. The reserved-target guard test passed
before and after (pin).

## Phase 3: Green [x] (191b546)

- [x] Task: Fix the root cause
  - [x] Apply the minimal fix at the diagnosed point (FR-2).
  - [x] Run the new test until green.
  - [x] Run the app Jest suite and `check-types`. Record the results.

Fix (commit 191b5463b): (1) `/update` route normalizes stored FSRS input —
uninitialized memory (`stability < 0.001`) takes the library fresh-card init
path from the user's rating, sub-floor difficulty clamps to 1; no FSRS
parameter, rating-semantic, or XP-amount change. All responses now carry real
HTTP statuses. (2) `resolveActivityTarget` accepts explicit top-level
`targetId` (preferred over article/story/content ids). Green: new suite 4/4.
Full jest: 1057/1060 pass; the 2 failing suites
(`post-activity-log-idempotency`, `StudentCartridgeHost`) fail identically
with the fix stashed (pre-existing, verified). `check-types`: 8 errors, all
in unrelated APK files (baseline, none in changed files).

## Phase 4: Live verification, commit, and closeout [x] (191b546)

- [x] Task: Verify the full chain against the dev server
  - [x] Repeat the Phase 1 reproduction after the fix. Confirm the progress POST persists FSRS fields.
  - [x] Confirm `xp_logs` gains a row and the user XP total changes.
  - [x] Confirm the dashboard due state reflects the new card state after reload (AC-3).
  - [x] Record the after-transcript in the task note.
- [x] Task: Commit and record
  - [x] Commit subject: `fix(reading): persist flashcard SRS reviews (track_id: reading_qa_srs_persistence_20260918)` (shortened to fit the 100-char commitlint limit; same meaning as the planned subject).
  - [x] Attach the task summary with `git notes add` on the commit.
  - [x] Mark all tasks `[x]` with the commit SHA (7 chars) in this plan.

### After-transcript (post-fix, live dev server :3100, dev log lines 4075-4084)

- Vocab stability-0 card `06daf774` + Good → HTTP 200; row `0/0/2026-09-15/stab
  0` → `state 1, reps 1, due 2026-09-18 00:11, stability 2.3065` (FR-3).
- Sentence stability-0 card `5c2be8fa` + Good → HTTP 200; `state 1, reps 1,
  due 2026-09-18 00:12, stability 2.3065` (FR-3).
- Activitylog POST (fresh `targetId`) → HTTP 200 `{"message":"Success"}`;
  `xp_logs` gained `VOCABULARY_FLASHCARDS|15`; users.xp 64192→64207 (FR-4).
- Stats endpoint reload: vocab `due 6→5`, `learning 5→4, review 5→6` after an
  Easy rating moved `b53380e3` to `due 2026-09-25, state 2` (AC-3). No new
  `FSRSValidationError` or 400 lines in the dev log after the fix.
- Note: Good on Learning cards schedules ~+10min, so same-day due counts only
  drop once the card leaves the calendar day (or via Easy/Hard/Again). FSRS
  parameters, rating semantics, and XP amounts unchanged (FR-5).
  `actions/flashcard.ts` untouched (owned by the vocab-flashcards track).

## Owner Manual Verification — PASSED 2026-09-23

Environment: local dev server (port 3000) with Docker Postgres reading_advantage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence: S5.23: a full 9-card review session persisted — due counter 9 -> 0, XP 64207 -> 64222 (+15), completion screen rendered. Confirmed by explicit product-owner yes on 2026-09-23.
