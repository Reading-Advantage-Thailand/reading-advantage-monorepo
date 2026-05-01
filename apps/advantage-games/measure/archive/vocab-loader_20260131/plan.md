# Implementation Plan: Per-Game Vocabulary Loading System

## Phase 1: Core Infrastructure [checkpoint: 3bc5b75]

### Task 1.1: Create Vocabulary Loader Utility
- [x] Write unit tests for vocabulary loader
    - [x] Test successful JSON fetch and parse
    - [x] Test fallback to default.json on 404
    - [x] Test fallback on network error
    - [x] Test caching (second call returns cached data)
    - [x] Test TypeScript type validation
- [x] Implement vocabulary loader utility (`src/lib/vocabLoader.ts`)
    - [x] Create `loadVocabulary(gameName: string)` async function
    - [x] Implement in-memory cache
    - [x] Add console warning on fallback
- [x] Verify tests pass [fa71906]

### Task 1.2: Create JSON Schema and Type Validation
- [x] Write tests for runtime type validation
- [x] Implement `validateVocabularyData()` function
- [x] Ensure VocabularyItem[] type is enforced at runtime [fa71906]

- [ ] Task: Measure - Phase 1 Verification (Protocol in workflow.md)

## Phase 2: Vocabulary Data Files [checkpoint: 3d39fca]

### Task 2.1: Create Default Fallback Vocabulary
- [x] Create `public/vocab/default.json` with generic vocabulary (current SAMPLE_VOCABULARY content) [64061dd]

### Task 2.2: Create Word-Based Game Vocabulary Files
- [x] Create `public/vocab/enchanted-library.json`
- [x] Create `public/vocab/rune-match.json`
- [x] Create `public/vocab/wizard-vs-zombie.json`
- [x] Create `public/vocab/dragon-flight.json`
- [x] Create `public/vocab/rpg-battle.json`
- [x] Create `public/vocab/magic-defense.json` [64061dd]

### Task 2.3: Create Sentence-Based Game Vocabulary Files
- [x] Create `public/vocab/potion-rush.json`
- [x] Create `public/vocab/castle-defense.json` [64061dd]

- [ ] Task: Measure - Phase 2 Verification (Protocol in workflow.md)

## Phase 3: Game Migration [checkpoint: cd44791]

### Task 3.1: Migrate Enchanted Library
- [x] Write integration test for vocabulary loading
- [x] Update page.tsx to use vocabLoader
- [x] Verify game functions with loaded vocabulary [e6ee05a]

### Task 3.2: Migrate Rune Match
- [x] Write integration test for vocabulary loading
- [x] Update page.tsx to use vocabLoader
- [x] Verify game functions with loaded vocabulary [d6a54c4]

### Task 3.3: Migrate Wizard vs Zombie
- [x] Write integration test for vocabulary loading
- [x] Update page.tsx to use vocabLoader
- [x] Verify game functions with loaded vocabulary [d6a54c4]

### Task 3.4: Migrate Dragon Flight
- [x] Write integration test for vocabulary loading
- [x] Update page.tsx to use vocabLoader
- [x] Verify game functions with loaded vocabulary [d6a54c4]

### Task 3.5: Migrate RPG Battle
- [x] Write integration test for vocabulary loading
- [x] Update page.tsx to use vocabLoader
- [x] Verify game functions with loaded vocabulary [d6a54c4]

### Task 3.6: Migrate Magic Defense
- [x] Write integration test for vocabulary loading
- [x] Update page.tsx to use vocabLoader
- [x] Verify game functions with loaded vocabulary [d6a54c4]

### Task 3.7: Migrate Potion Rush
- [x] Write integration test for vocabulary loading
- [x] Update page.tsx to use vocabLoader
- [x] Verify game functions with loaded vocabulary [d6a54c4]

### Task 3.8: Migrate Castle Defense
- [x] Write integration test for vocabulary loading
- [x] Update page.tsx to use vocabLoader
- [x] Verify game functions with loaded vocabulary [d6a54c4]

- [ ] Task: Measure - Phase 3 Verification (Protocol in workflow.md)

## Phase 4: Cleanup [checkpoint: bf888e1]

### Task 4.1: Remove Legacy Vocabulary Files
- [x] Remove or deprecate `src/lib/sampleVocabulary.ts`
- [x] Remove or deprecate `src/lib/sampleSentences.ts`
- [x] Update any remaining imports [99b809c]

### Task 4.2: Documentation
- [x] Add README section explaining vocabulary file format
- [x] Document how to add/edit vocabulary for each game [63ae2eb]

- [ ] Task: Measure - Phase 4 Verification (Protocol in workflow.md)
