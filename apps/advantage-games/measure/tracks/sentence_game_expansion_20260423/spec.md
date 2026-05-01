# Track: Sentence Game Expansion

## Overview

Expand sentence-level game coverage with 4 new game types, each leveraging the existing React-Konva canvas architecture and shared hooks. These games fill gaps in the sentence game catalog by targeting different skill areas: fill-in-the-blank comprehension, word ordering, translation matching, and context clue inference.

## Game Specifications

### Game 1: Fill-in-the-Blank Platformer
- **Mechanic:** Side-scrolling platformer where the player runs along platforms. A sentence is displayed with a blank (missing word). Platforms carry candidate words; the player must jump to the correct word to fill the blank.
- **Input:** Touch/tap to jump between platforms.
- **Scoring:** +100 per correct word, -50 per wrong word, time bonus for fast completion.
- **Sentence rendering:** Shared `SentenceDisplay` component with the blank highlighted.
- **Word selection:** 3-4 candidate words per blank (1 correct + distractors from same vocabulary pack).
- **Difficulty tiers:** Adjusts platform spacing, scroll speed, number of distractors, and sentence complexity.

### Game 2: Word Reorder / Sequence Builder
- **Mechanic:** Words from a scrambled sentence appear as draggable tiles. Player must arrange them in the correct order to reconstruct the sentence.
- **Input:** Drag-and-drop on mobile (touch), click-to-select on desktop.
- **Scoring:** +200 for fully correct order, +50 per word in correct position, time bonus.
- **Sentence rendering:** Word tiles rendered as Konva `Group` with `Text` and background `Rect`.
- **Validation:** Check against known correct word order from sentence data.
- **Difficulty tiers:** Adjusts number of words (4-12), adds decoy words not in sentence, reduces time limit.

### Game 3: Translation Matching Game
- **Mechanic:** Two columns of word/phrase cards — one in the target language, one in the player's language. Player draws lines connecting matching pairs.
- **Input:** Touch-drag from one card to its match. Line rendered as Konva `Line`.
- **Scoring:** +150 per correct match, -75 per incorrect match, combo multiplier for consecutive correct matches.
- **Sentence rendering:** Uses vocabulary pack data with `term` and `definition` fields.
- **Validation:** All pairs must be matched correctly; partial matches highlighted.
- **Difficulty tiers:** Adjusts number of pairs (3-8), adds decoy cards, reduces time limit.

### Game 4: Context Clue Detective
- **Mechanic:** Player reads a sentence containing an underlined target word. Four definition options are shown; player must select the correct meaning based on context clues.
- **Input:** Tap/click on the correct definition card.
- **Scoring:** +100 per correct answer, streak bonus (3+ consecutive = 2x multiplier).
- **Sentence rendering:** Shared `SentenceDisplay` with underline highlight on target word.
- **Definition generation:** Uses vocabulary pack `definition` field + 3 distractors (random definitions from same pack).
- **Difficulty tiers:** Adjusts sentence complexity, similarity of distractors, time limit.

## Shared Requirements

### Sentence Rendering
- All 4 games use the shared `SentenceDisplay` component for consistent typography.
- Support for `highlight` prop to underline, blank, or emphasize specific words.
- Mobile-first: text auto-scales to fit 390×844 viewport.

### Content Pack Integration
- All games consume vocabulary/sentence packs via the existing pack API.
- Games specify which pack fields they require (`term`, `definition`, `sentence`).
- Missing fields trigger a graceful fallback with a "content not available" message.

### Difficulty Tiers
- Each game defines its own difficulty parameters within the existing tier system (easy/medium/hard/extreme).
- Tier selection UI is shared across all games.
- Default tier: medium.

### Architecture
- Each game is a standalone React component following the existing game component pattern.
- Games register themselves in the game catalog (`games/index.ts`).
- Shared hooks: `useGameCamera`, `useGameTimer`, `useSound`, `usePerformanceMetrics` (from adaptive difficulty track).
- React-Konva `<Stage>` and `<Layer>` for all canvas rendering.

## Acceptance Criteria

- [ ] Fill-in-the-blank platformer game is playable on mobile with touch controls.
- [ ] Word reorder game correctly validates sentence word order.
- [ ] Translation matching game draws connection lines and validates pairs.
- [ ] Context clue detective game presents definitions and validates selection.
- [ ] All 4 games use shared `SentenceDisplay` component.
- [ ] All 4 games consume vocabulary/sentence packs via existing API.
- [ ] All 4 games support difficulty tier selection.
- [ ] All 4 games are registered in the game catalog.
- [ ] All 4 games render correctly within 390×844 portrait viewport.
- [ ] All new code has unit test coverage ≥80%.

## Out of Scope

- New vocabulary/sentence content packs (use existing packs).
- Multiplayer mode for these games (separate track).
- Backend changes for new game types.
- Custom game editor for teachers.
- Leaderboard integration (existing shared leaderboard hook covers these automatically).
