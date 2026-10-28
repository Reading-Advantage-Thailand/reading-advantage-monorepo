# Specification: Matching Word Payload Shape Hotfix

Track ID: `matching_word_shape_hotfix_20260923`. Type: bug. App: `apps/reading-advantage`.

## Overview

The vocabulary Matching tab rendered ten empty card buttons for users whose
saved words use the legacy `{ word, translation }` jsonb shape. The fetcher
`fetchVocabularyMatchingWords` in `components/matching.tsx` read only the
canonical `{ vocabulary, definition }` shape. Track
`reading_qa_vocab_flashcards_20260918` fixed the same mismatch for flashcards
(`normalizeWordPayload` in `actions/flashcard.ts`) and documented the
lesson-controller precedent, but the matching fetcher was missed. Found by
owner manual verification S5.3 on 2026-09-23.

## Functional Requirements

- FR-1: Legacy rows map to card text via `word.word` and match text via `word.translation`.
- FR-2: Canonical rows keep working unchanged.
- FR-3: Rows with neither shape are filtered out; the game never renders blank cards.

## Acceptance Criteria

- AC-1: Unit tests cover legacy rows, canonical rows, and junk-row filtering in `__test__/matching-states.test.tsx`.
- AC-2: The Matching tab renders playable word cards for `demo-student-b1` and a correct match hides both cards.

## Out of Scope

- The wordlist API route, the database, the duplicate-word deck behavior.
