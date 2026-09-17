# Specification: Reading QA — SRS Review Persistence

Track ID: `reading_qa_srs_persistence_20260918`. Type: bug. App: `apps/reading-advantage`.

## Overview

Browser QA on 2026-09-17 found reviews do not persist. After a full review session, the due counters stay the same and XP stays the same. Evidence: `/tmp/opencode/qa-reports/student-flows.md` tests C1c and C2.

## Call Chain Under Test

- Client rating: `components/flashcards/flashcard-game.tsx` `handleRating` POSTs `/api/v1/flashcard/progress/update` with `{cardId, rating, type}`.
- Client XP: the same file's `awardXpForCompletion` POSTs `/api/v1/users/{userId}/activitylog`.
- Server rating: `app/api/v1/flashcard/progress/update/route.ts` reads the session, runs ts-fsrs, and updates `user_word_records` or `user_sentence_records`.
- Server stats: the dashboard counts due cards through `getFlashcardStats` (`server/controllers/flashcard-controller.ts` line 39).
- `parseActivityType` (`server/controllers/user-controller.ts` line 128) already normalizes client casing.

## Functional Requirements

### FR-1: Reproduce the failure first

Reproduce the failure with direct HTTP calls against the running dev server. Capture the progress POST response, the activitylog POST response, and the card row state before and after. Record the transcript in this track's plan.

### FR-2: Find and fix the broken link

Identify the broken link in the chain. Fix the root cause in app code. Do not add workarounds in the client.

### FR-3: Persist the review

After the fix, one rating must advance the FSRS fields (`reps`, `state`, `due`, `stability`) on the matching `user_word_records` or `user_sentence_records` row.

### FR-4: Record the activity and XP

After the fix, a completed session must add an activity log entry and change the user XP total.

### FR-5: Preserve FSRS semantics

Do not change FSRS parameters, rating semantics, or XP amounts.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Minimal edit at the diagnosed point.
- NFR-3: Mock the DB layer in unit tests where possible. Use the app Jest setup.

## Acceptance Criteria

- AC-1: The plan records the reproduction transcript and the identified root cause.
- AC-2: A regression test covers the fixed fault.
- AC-3: A live check proves a rated card changes `reps` and `due` in the database, the dashboard reflects the new state after reload, and `xp_logs` gains a row with a changed user XP total.

## Out of Scope

- Materialized views (`mv_srs_health` and siblings). That is a P1 item.
- Flashcard card content. Track `reading_qa_vocab_flashcards_20260918` owns that.
- FSRS algorithm tuning.
