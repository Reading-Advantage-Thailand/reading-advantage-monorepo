# Dungeon Liberator - Sentences Not Loading

**Type:** Bug
**Priority:** High
**Status:** In Progress

## Problem

The Dungeon Liberator game fails to load sentences from the API. Other sentence games (potion-rush, castle-defense) load correctly.

## Root Cause Analysis

Two bugs found:

### Bug 1: API route uses wrong field name
**File:** `src/app/api/v1/games/dungeon-liberator/sentences/route.ts`

The route passes objects with `{ sentence: "..." }` but `VocabularyItem` expects `{ term: "..." }`. The `createSentencesRoute` factory types the parameter as `VocabularyItem[]`, but TypeScript doesn't catch this because the extra `sentence` property is allowed on object literals passed indirectly, and `term` is effectively missing (resulting in `undefined`).

Working games (potion-rush, castle-defense) correctly use `{ term: "..." }`.

### Bug 2: Game component accesses `.sentence` instead of `.term`
**File:** `src/components/games/sentence/dungeon-liberator/DungeonLiberatorGame.tsx`

Lines 29 and 84 access `vocabList[0]?.sentence?.split(' ')` but `VocabularyItem` has `term`, not `sentence`. This means even if the API returned correct data, the component would fail to read it.

### Bug 3: Only 3 sentences provided (minimum is 5)
The API route only has 3 hardcoded sentences. The `createSentencesRoute` factory returns an `INSUFFICIENT_SENTENCES` warning when fewer than 5 are provided, which causes the page to show a warning instead of the game.

## Acceptance Criteria

- [ ] API route uses `term` field matching `VocabularyItem` interface
- [ ] At least 5 sentences provided in the API route
- [ ] Game component accesses `.term` instead of `.sentence`
- [ ] Game loads and displays sentences correctly
