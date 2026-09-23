# Implementation Plan: Reading QA — Vocabulary Flashcard Content

Track ID: `reading_qa_vocab_flashcards_20260918`. Spec: `spec.md`. Type: bug (classic).

All file paths are relative to `apps/reading-advantage/` unless noted.

## Phase 1: Diagnose and Red

- [x] Task: Diagnose where the word payload is lost
  - [x] Trace `deck-view.tsx` → `getDeckCards()` (`actions/flashcard.ts`) → server query.
  - [x] Inspect the served card shape with the live dev server or a direct query. Confirm which projection drops the word data.
  - [x] Record the diagnosis (file, line, missing field) in this plan as a short note.

  **Diagnosis note (2026-09-18):** Nothing drops the payload in the query. `deck-view.tsx:174` →
  `getDeckCards()` (`actions/flashcard.ts:207-259`) selects the full `user_word_records` row, `word`
  jsonb included. The loss point is a **key-shape mismatch between the stored payload and the reader**:
  `flashcard-game.tsx:539` reads `currentCard.word?.vocabulary` and line 586 reads
  `getTranslation(currentCard.word?.definition)` (canonical shape per `components/vocabulary/types.ts:15-29`),
  but 62 of 66 `user_word_records.word` values store `{ word: "...", translation: "..." }`. Origin:
  `scripts/seed/demo-seed.ts:428-439` seeds `sampleWords` as `{ word, translation }` and inserts them at
  lines 460-463. All 11 rows of `demo-student-b1` (id `2d763432-a518-403a-8bd6-cd05b7d42a4b`) have the
  broken shape, so `word.vocabulary`/`word.definition` are `undefined` and the i18n fallbacks render
  `noWord` / `noTranslation`. Sentence cards work because the game reads top-level `sentence`/`translation`
  columns, which the seed populates correctly. Fix: normalize the payload in the vocabulary branch of
  `getDeckCards` (precedent: `lesson-controller.ts:424-435` maps `vocabulary: wordData.vocabulary || wordData.word`)
  and correct the demo-seed sample shape so new rows are canonical.
- [x] Task: Write the failing unit test
  - [x] Test the diagnosed projection function. Mock the DB layer with Jest mocks.
  - [x] Assert each vocabulary card carries word text and translation (FR-2).
  - [x] Run the test. Confirm it fails (Red). Record the failure.

  **Red note (2026-09-18):** `carries word text and translation on legacy { word, translation } rows`
  failed with `Expected: "string" / Received: "undefined"` on `card.word.vocabulary` before the fix.
  (Boxes ticked at review closeout; the Red evidence was recorded in the commit note.)

## Phase 2: Green

- [x] Task: Fix the vocabulary card projection
  - [x] Apply the minimal fix at the diagnosed point (join or embed the word data).
  - [x] Keep the sentence projection unchanged (FR-3).
  - [x] Run the new test until green.
  - [x] Run the app Jest suite and `check-types`. Record the results.

  **Green note:** Fix in `actions/flashcard.ts`: `normalizeWordPayload()` maps legacy
  `{ word, translation }` payloads to canonical `{ vocabulary, definition: { th } }` in the
  vocabulary branch of `getDeckCards` only (precedent `lesson-controller.ts:430`). Sentence branch,
  deck counters, and stats untouched. Root cause also fixed: `scripts/seed/demo-seed.ts` sampleWords
  now seed the canonical `{ vocabulary, definition: { en, th } }` shape. New test
  `__tests__/actions/flashcard-word-payload.test.ts`: 3/3 pass. Full app Jest: 149 passed, 2 failed —
  both known baselines (`post-activity-log-idempotency`, `StudentCartridgeHost`), no delta.
  `check-types`: 8 tsc errors, all pre-existing APK baselines, no delta.

## Phase 3: Live verification, commit, and closeout

- [x] Task: Verify against the running dev server
  - [x] Log in as `demo-student-b1` (password `demo123`) on `http://localhost:3100`.
  - [x] Load the vocabulary study cards through the diagnosed path. Confirm every card has non-empty word data (AC-2).
  - [x] Load the sentence study cards. Confirm sentence text still renders (AC-3).
  - [x] Record the transcript in the task note.

  **Live transcript (2026-09-18, Playwright on the dev server, session cookie from
  `POST /api/auth/login`, no ratings submitted):**
  - `POST /api/auth/login` → `{"success":true,"user":{...,"username":"demo-student-b1",...}}`
  - `/en/student/vocabulary` → "Start Studying (6 cards)" → card 1 renders word
    **"example"** (not "No word"); "Show Answer" renders definition **"ตัวอย่าง"**
    (not "No translation"). Screenshots: `/tmp/opencode/vocab-card-question.png`,
    `/tmp/opencode/vocab-card-answer.png`.
  - `/en/student/sentences` → "Start Studying (2 cards)" → card 1 renders
    **"Never give up."** (matches the DB row). Screenshot: `/tmp/opencode/sentence-card-question.png`.
  - `user_word_records` FSRS state unchanged after the session (2 new / 4 learning / 5 review).
- [x] Task: Commit and record
  - [x] Commit subject: `fix(reading): restore flashcard word payload (track_id: reading_qa_vocab_flashcards_20260918)` — shortened from the plan draft to satisfy commitlint `header-max-length` (94 chars). Commit `3ec4216`.
  - [x] Attach the task summary with `git notes add` on the commit.
  - [x] Mark all tasks `[x]` with the commit SHA (7 chars) in this plan. Code commit: `3ec4216`.

## Owner Manual Verification — PASSED 2026-09-23

Environment: local dev server (port 3000) with Docker Postgres reading_advantage; browser-driven via Kimi WebBridge with direct DB assertions. Evidence: S5.22: the flashcard game shows the real word (example) and its Thai translation (ตัวอย่าง) after Show Answer; legacy {word, translation} rows render correctly. Confirmed by explicit product-owner yes on 2026-09-23.
