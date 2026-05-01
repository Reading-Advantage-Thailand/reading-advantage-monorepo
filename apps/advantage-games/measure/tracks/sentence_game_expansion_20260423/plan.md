# Implementation Plan: Sentence Game Expansion

## Phase 1: Fill-in-the-Blank Platformer

- [ ] Task: Define game types and component structure.
  - [ ] Create `types/fill-blank-platformer.ts` with game state, platform, and word tile types.
  - [ ] Write unit tests for type construction.
- [ ] Task: Implement sentence blanking logic.
  - [ ] Given a sentence, select target word to blank out.
  - [ ] Generate 3-4 candidate words (1 correct + distractors from same pack).
  - [ ] Write unit tests: blank selection, distractor generation, correct answer inclusion.
- [ ] Task: Build game component with React-Konva.
  - [ ] Create `components/games/fill-blank-platformer/FillBlankPlatformerGame.tsx`.
  - [ ] Side-scrolling platform layout with word tiles on platforms.
  - [ ] Player character with jump animation.
  - [ ] Sentence display with blank at top of screen.
  - [ ] Touch controls: tap left/right to move, tap to jump.
  - [ ] Write component tests: rendering, touch input, word selection.
- [ ] Task: Implement scoring and game loop.
  - [ ] +100 correct, -50 wrong, time bonus.
  - [ ] Use shared `useGameTimer` and `useGameCamera` hooks.
  - [ ] Write unit tests: scoring calculation, timer integration.
- [ ] Task: Register in game catalog and test end-to-end.
  - [ ] Add entry in `games/index.ts`.
  - [ ] Playwright test: launch game, select a word, verify score.
  - [ ] Verify 390×844 viewport rendering.
- [ ] Task: Measure — User Manual Verification 'Phase 1: Fill-in-the-Blank Platformer' (Protocol in workflow.md)

## Phase 2: Word Reorder / Sequence Builder

- [ ] Task: Define game types and word tile types.
  - [ ] Create `types/word-reorder.ts` with tile position, drag state, and validation result types.
  - [ ] Write unit tests for type construction.
- [ ] Task: Implement sentence scrambling logic.
  - [ ] Given a sentence, shuffle word order while ensuring shuffled order ≠ original.
  - [ ] Optionally inject decoy words not in the sentence (difficulty-dependent).
  - [ ] Write unit tests: shuffle correctness, decoy injection, edge cases (2-word sentences).
- [ ] Task: Build game component with React-Konva.
  - [ ] Create `components/games/word-reorder/WordReorderGame.tsx`.
  - [ ] Draggable word tiles rendered as Konva Groups.
  - [ ] Drop zone at bottom for ordered sentence.
  - [ ] Visual feedback: green flash on correct placement, red on incorrect.
  - [ ] Touch drag-and-drop support.
  - [ ] Write component tests: rendering, drag interaction, drop validation.
- [ ] Task: Implement scoring and validation.
  - [ ] +200 fully correct order, +50 per word in correct position, time bonus.
  - [ ] Validate against known correct word order.
  - [ ] Write unit tests: scoring, partial credit, full completion.
- [ ] Task: Register in game catalog and test end-to-end.
  - [ ] Add entry in `games/index.ts`.
  - [ ] Playwright test: launch game, reorder words, verify score.
  - [ ] Verify 390×844 viewport rendering.
- [ ] Task: Measure — User Manual Verification 'Phase 2: Word Reorder / Sequence Builder' (Protocol in workflow.md)

## Phase 3: Translation Matching Game

- [ ] Task: Define game types and card/match types.
  - [ ] Create `types/translation-match.ts` with card, match pair, and line types.
  - [ ] Write unit tests for type construction.
- [ ] Task: Implement pair generation logic.
  - [ ] Given a vocabulary pack, generate N pairs (term → definition).
  - [ ] Shuffle both columns independently.
  - [ ] Add decoy cards at higher difficulty tiers.
  - [ ] Write unit tests: pair generation, shuffle, decoy addition.
- [ ] Task: Build game component with React-Konva.
  - [ ] Create `components/games/translation-match/TranslationMatchGame.tsx`.
  - [ ] Two columns of cards: target language (left) and player language (right).
  - [ ] Touch-drag to draw connection lines between matching cards.
  - [ ] Line rendered as Konva Line with color feedback (green=correct, red=incorrect).
  - [ ] Write component tests: rendering, line drawing, pair validation.
- [ ] Task: Implement scoring and combo system.
  - [ ] +150 per correct match, -75 per incorrect, combo multiplier for consecutive correct.
  - [ ] Game completes when all pairs matched correctly.
  - [ ] Write unit tests: scoring, combo calculation, completion detection.
- [ ] Task: Register in game catalog and test end-to-end.
  - [ ] Add entry in `games/index.ts`.
  - [ ] Playwright test: launch game, match a pair, verify score.
  - [ ] Verify 390×844 viewport rendering.
- [ ] Task: Measure — User Manual Verification 'Phase 3: Translation Matching Game' (Protocol in workflow.md)

## Phase 4: Context Clue Detective

- [ ] Task: Define game types and definition card types.
  - [ ] Create `types/context-clue-detective.ts` with definition card, answer, and streak types.
  - [ ] Write unit tests for type construction.
- [ ] Task: Implement definition generation logic.
  - [ ] Given a sentence and target word, present correct definition + 3 distractors.
  - [ ] Distractors: random definitions from same vocabulary pack.
  - [ ] At higher difficulty: select distractors with similar word length or category.
  - [ ] Write unit tests: distractor selection, similarity filtering, correct answer inclusion.
- [ ] Task: Build game component with React-Konva.
  - [ ] Create `components/games/context-clue-detective/ContextClueDetectiveGame.tsx`.
  - [ ] Sentence display with underlined target word at top.
  - [ ] Four definition cards in a 2×2 grid below.
  - [ ] Tap to select; visual feedback on correct/incorrect.
  - [ ] Streak indicator (3+ consecutive = 2x multiplier display).
  - [ ] Write component tests: rendering, selection, streak display.
- [ ] Task: Implement scoring and streak system.
  - [ ] +100 per correct answer, streak bonus (3+ = 2x multiplier).
  - [ ] Streak resets on incorrect answer.
  - [ ] Write unit tests: scoring, streak increment/reset, multiplier application.
- [ ] Task: Register in game catalog and test end-to-end.
  - [ ] Add entry in `games/index.ts`.
  - [ ] Playwright test: launch game, select definition, verify score.
  - [ ] Verify 390×844 viewport rendering.
- [ ] Task: Measure — User Manual Verification 'Phase 4: Context Clue Detective' (Protocol in workflow.md)
