# Specification: Reading QA — Lesson Seed Completeness

Track ID: `reading_qa_lesson_seed_20260918`. Type: bug. App: `apps/reading-advantage`.

## Overview

The demo seed produces article stubs, so the lesson page has nothing to render even after track `reading_qa_lesson_page_20260918` fixes the code. Evidence from the local database on 2026-09-18:

- All 25 seeded articles have lorem-ipsum passages.
- `image_description` is null on every article.
- `audio_url`, `translatedPassage`, `translatedSummary`, and `timepoints` are null or empty.
- `multiple_choice_questions`, `short_answer_questions`, and `long_answer_questions` have 0 rows.
- The seed crashes partway on the `xp_logs_user_activity_unique` constraint, so later phases never run.

## Functional Requirements

### FR-1: The seed completes

Fix the `xp_logs` insert path in `scripts/seed/demo-seed.ts` (and the same defect in `scripts/seed/seed.ts`): `onConflictDoNothing` on the unique constraint, or deterministic targets. `pnpm db:seed:demo` exits 0.

### FR-2: The seed is idempotent

Re-running the seed does not duplicate articles, users, or question rows. Row counts stay stable across runs. Upsert or check-then-insert.

### FR-3: Complete article content

Every seeded article gets:

- A readable English passage, 150 to 300 words, deterministic. No lorem ipsum. No network or AI calls.
- A non-empty summary and a non-empty `image_description`.
- 3 to 5 multiple-choice questions, 2 short-answer questions, and 1 long-answer question, derived from the passage.
- Thai translations for passage and summary (`translatedPassage`, `translatedSummary`).
- `timepoints` may stay empty. `audio_url` stays null. The UI handles both (track `reading_qa_lesson_page_20260918`).

### FR-4: Preserve the canonical word payload

The seed keeps writing `{ vocabulary, definition }` for word records, per track `reading_qa_vocab_flashcards_20260918`.

### FR-5: Preserve demo users and logins

Existing demo users, classrooms, SRS rows, and the credential logins (`demo-student-a1`..`c2`, `demo-teacher`, `demo-admin`, password `demo123`) must keep working after a reseed. Re-link or recreate the `accounts` rows if user ids change.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Content generation is deterministic and template-driven.
- NFR-3: The seed runs with `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reading_advantage` (the `.env.local` value is stale, port 5433).

## Acceptance Criteria

- AC-1: `DATABASE_URL=... pnpm db:seed:demo` exits 0. A second run exits 0 with stable counts.
- AC-2: Every article has a passage, summary, `image_description`, questions, and Thai translations. Question counts per article are greater than zero.
- AC-3: Live: the article detail response carries `image_description` and translations; the questions endpoints return non-empty arrays.
- AC-4: All demo logins still return 200 after the reseed.
- AC-5: Unit tests cover the content-generation helpers where practical.

## Out of Scope

- Audio generation.
- Full content authoring for `seed.ts` beyond the crash fix.
- Production data.
