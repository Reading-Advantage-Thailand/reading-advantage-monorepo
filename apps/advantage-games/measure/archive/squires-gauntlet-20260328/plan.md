# Implementation Plan: Squire's Gauntlet

Frogger-style battlefield crossing sentence game. Deliver the royal message across the hazard-filled field!

## Phase 1: Foundation & Scaffolding [x]
- [x] Update `measure/tracks.md` to reflect track is `in_progress`
- [x] Create directory structure:
  - `src/app/[locale]/(student)/student/games/sentence/squires-gauntlet/`
  - `src/components/games/sentence/squires-gauntlet/`
  - `src/lib/games/squiresGauntlet.ts` (Logic)
  - `src/app/api/v1/games/squires-gauntlet/`
- [x] Scaffold initial files:
  - Component, Logic, Page, API routes
- [x] Add translations to `src/locales/en.ts`

## Phase 2: Core Game Logic (TDD) [x]
- [x] Define types: `SquireState`, `Squire`, `Hazard`, `Platform`, `WordOrb`
- [x] Implement `createSquireState(sentences, config)`
- [x] Implement Squire movement (grid-based or smooth with snap)
- [x] Implement Lane and Hazard/Platform generation
- [x] Implement collision detection (Hazards, Platforms, WordOrbs)
- [x] Implement word collection sequence verification
- [x] Write unit tests: `src/lib/games/squiresGauntlet.test.ts`
- [x] **Verification:** Tests pass with >80% coverage [x]

## Phase 3: Canvas Implementation & Visuals [x]
- [x] Implement `SquiresGauntletGame` component using `React-Konva`
- [x] Render battlefield lanes with varying backgrounds (grass, road, water)
- [x] Implement Squire rendering (animated sprite)
- [x] Implement Hazard and Platform rendering
- [x] Implement WordOrb rendering
- [x] Implement HUD: translation display, sentence progress, message bar
- [x] **Verification:** Manual check of crossing and collection mechanics [x]

## Phase 4: Educational Mechanics & Polish [x]
- [x] Implement sentence loading and lane distribution
- [x] Add feedback for correct/incorrect selections (audio/visual)
- [x] Implement difficulty levels (hazard speed, lane count, word density)
- [x] Integrate shared `GameStartScreen` and `GameEndScreen`
- [x] **Verification:** Complete 3 full game sessions on different difficulties [x]

## Phase 5: Final Integration & Cleanup [x]
- [x] Register game in `src/lib/gameCards.ts`
- [x] Final build check: `npm run build` (type check passed) [x]
- [x] Measure sync: Mark track completed and move to archive
