# Implementation Plan: Devourer Slime

Hole.io style arena growth game. Start small, eat words in the correct order to grow.

## Phase 1: Foundation & Scaffolding [x]
- [x] Update `measure/tracks.md` to reflect track is `in_progress`
- [x] Create directory structure:
  - `src/app/[locale]/(student)/student/games/sentence/devourer-slime/`
  - `src/components/games/sentence/devourer-slime/`
  - `src/lib/games/devourerSlime.ts` (Logic)
  - `src/app/api/v1/games/devourer-slime/`
- [x] Scaffold initial files:
  - Component, Logic, Page, API routes
- [x] Add translations to `src/locales/en.ts`

## Phase 2: Core Game Logic (TDD) [x]
- [x] Define types: `SlimeState`, `Slime`, `WordOrb`, `KnightEnemy`
- [x] Implement `createSlimeState(sentences, config)`
- [x] Implement Slime movement and bounds
- [x] Implement word orb collection and sequence verification
- [x] Implement Slime growth/shrink logic (Radius/Scale)
- [x] Implement KnightEnemy patrol and collision logic (Eat vs Get Hit)
- [x] Write unit tests: `src/lib/games/devourerSlime.test.ts`
- [x] **Verification:** Tests pass with >80% coverage

## Phase 3: Canvas Implementation & Visuals [x]
- [x] Implement `DevourerSlimeGame` component using `React-Konva`
- [x] Render forest arena with slime trail
- [x] Implement Slime rendering (Wobbly shape, scaling)
- [x] Implement WordOrb and KnightEnemy rendering
- [x] Implement HUD: translation display, sentence progress, size/XP meter
- [x] **Verification:** Manual check of movement and growth mechanics

## Phase 4: Educational Mechanics & Polish [x]
- [x] Implement sentence loading and word distribution
- [x] Add feedback for correct/incorrect selections (audio/visual)
- [x] Implement difficulty levels (enemy count, word density)
- [x] Integrate shared `GameStartScreen` and `GameEndScreen`
- [x] **Verification:** Complete 3 full game sessions on different difficulties

## Phase 5: Final Integration & Cleanup [x]
- [x] Register game in `src/lib/gameCards.ts`
- [x] Final build check: `npm run build`
- [x] Measure sync: Mark track completed and move to archive
