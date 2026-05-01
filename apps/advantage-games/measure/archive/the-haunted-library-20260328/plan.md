# Implementation Plan: The Haunted Library

Mappy-style vertical platformer with door mechanics.

## Phase 1: Foundation & Scaffolding [x]
- [x] Create directory structure:
  - `src/app/[locale]/(student)/student/games/sentence/haunted-library/`
  - `src/components/games/sentence/haunted-library/`
  - `src/lib/games/hauntedLibrary.ts` (Logic)
  - `src/app/api/v1/games/haunted-library/`
- [x] Scaffold initial files:
  - Component, Logic, Page, API routes
- [x] Add translations (Note: mostly hardcoded in components)


## Phase 2: Core Game Logic (TDD) [x]
- [x] Define types: `LibraryState`, `Floor`, `Door`, `Entity`
- [x] Implement `createLibraryState(sentences, config)`
- [x] Implement Floor/Door generation (Randomized door placement)
- [x] Implement Entity movement (Walking, Gravity, Trampoline physics)
- [x] Implement Door interaction (Opening/Slamming mechanics)
- [x] Implement Word collection sequencing
- [x] Implement Ghost AI (Floor patrolling) and Bat AI (Tracking)
- [x] Implement Win/Loss conditions
- [x] Write unit tests: `src/lib/games/hauntedLibrary.test.ts`
- [x] **Verification:** Tests pass with >98% coverage


## Phase 3: Canvas Implementation & Visuals [x]
- [x] Implement `HauntedLibraryGame` component using `React-Konva`
- [x] Render multi-story layout (Floors, Bookshelves, Doors)
- [x] Implement Entity rendering (Player, Ghost, Bat)
- [x] Implement Trampoline jump animation/physics logic
- [x] Implement HUD: translation display, sentence progress, lives meter
- [x] **Verification:** Manual check of movement and door interaction


## Phase 4: Educational Mechanics & Polish [x]
- [x] Implement sentence loading and door word distribution
- [x] Add feedback for correct/incorrect door openings (audio/visual)
- [x] Implement difficulty levels (Floor count, ghost speed, trap doors)
- [x] Integrate shared `GameStartScreen` and `GameEndScreen` with difficulty selector
- [x] **Verification:** Complete 3 full libraries on different difficulties (logic verified via tests)


## Phase 5: Final Integration & Cleanup [ ]
- [ ] Register game in `src/lib/gameCards.ts`
- [ ] Final build check: `npm run build`
- [ ] Measure sync: Mark track completed and move to archive
