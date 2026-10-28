# Specification: Reading QA — Vocabulary Flashcard Content

Track ID: `reading_qa_vocab_flashcards_20260918`. Type: bug. App: `apps/reading-advantage`.

## Overview

Browser QA on 2026-09-17 found vocabulary flashcards empty. Every vocabulary card shows the literal strings "No word" and "No translation". Sentence decks show real text. Evidence: `/tmp/opencode/qa-reports/student-flows.md` test C1b.

## Symptom Trail

- `components/flashcards/deck-view.tsx` loads study cards through `getDeckCards()` from `@/actions/flashcard`.
- `components/flashcards/flashcard-game.tsx` line 539 reads `currentCard.word?.vocabulary`. Its `getTranslation` helper reads the translation object from the card. Both are undefined for vocabulary cards.
- Server candidates: `getVocabulariesFlashcard` (`server/controllers/flashcard-controller.ts` line 659) and `getSentencesFlashcard` (line 583). The sentence projection carries text. The vocabulary projection appears to drop the word payload.

## Functional Requirements

### FR-1: Diagnose the projection first

Trace the study-card load path from `deck-view.tsx` through `getDeckCards()` to the server query. Record the exact point where the word data is lost. Record the finding in this track's plan.

### FR-2: Carry the word payload

Each vocabulary study card must carry the word data the game reads: the word text (`word.vocabulary`) and its translations. Join each `user_word_records` row to its source word data.

### FR-3: Preserve sentence behavior

Sentence study cards must keep their current content and shape. Do not change the sentence projection.

### FR-4: Preserve deck counters

Deck totals and stats must not change. This track fixes card content only.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Minimal edit at the diagnosed point. No refactors.
- NFR-3: Mock the DB layer in unit tests. Use the app Jest setup.

## Acceptance Criteria

- AC-1: A unit test proves the vocabulary card projection includes the word text and the translation.
- AC-2: A live check proves the study-cards response for `demo-student-b1` contains non-empty word data on every vocabulary card.
- AC-3: A live check proves sentence study cards still contain sentence text.

## Out of Scope

- SRS persistence (due counters, XP). Track `reading_qa_srs_persistence_20260918` owns that.
- Flashcard UI redesign or new card types.
