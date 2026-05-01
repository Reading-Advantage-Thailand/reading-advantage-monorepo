# Implementation Plan: Griffin Rider's Escape

A Subway Surfers-style 3D endless runner sentence game with lane switching and gate collection.

## Phase 1: Foundation & Scaffolding [ ]
- [x] Initialize track in `measure/tracks.md`
- [x] Create directory structure:
  - `src/app/[locale]/(student)/student/games/sentence/griffin-riders-escape/`
  - `src/components/games/sentence/griffin-riders-escape/`
  - `src/lib/games/`
  - `src/app/api/v1/games/griffin-riders-escape/`
- [x] Scaffold files from templates:
  - [x] `src/lib/games/griffinRidersEscape.ts` (Logic)
  - [x] `src/components/games/sentence/griffin-riders-escape/GriffinRidersEscapeGame.tsx` (Component)
  - [x] `src/app/[locale]/(student)/student/games/sentence/griffin-riders-escape/page.tsx` (Page)
  - [x] API routes (sentences, complete)
- [x] Add translations to `src/locales/en.ts`

## Phase 2: Core Game Logic (TDD) [ ]
- [x] Define types: `GriffinRiderState`, `Gate`, `Obstacle`, `Lane`
- [x] Implement `createGriffinRidersEscapeState(vocabulary, config)`
- [x] Implement pseudo-3D math (scaling and projection)
- [x] Implement `tickGriffinRidersEscape(state, delta)`
  - [x] Object movement (forward/Z-depth)
  - [x] Spawn logic for gates and obstacles
  - [x] Collision detection (gates and obstacles)
- [x] Implement `switchLane(state, direction)`
- [x] Write unit tests for all logic functions in `src/lib/games/griffinRidersEscape.test.ts`
- [x] **Verification:** `npm test -- --runInBand --coverage --testPathPatterns='griffinRidersEscape'` passes with >80% coverage

## Phase 3: Canvas Implementation & Visuals [ ]
- [x] Implement `GriffinRidersEscapeGame` component using `React-Konva`
- [x] Integrate interval-based game loop and `useDirectionalInput` (lane switching)
- [x] Render 3D environment:
  - [x] Parallax cloud background
  - [x] Flying Griffin (animated)
  - [x] Magical gates with scaling/perspective
  - [x] Obstacles (Storm clouds)
- [ ] Implement lane switching animations (interpolation)
- [x] Add UI overlays: Translation banner, Health (Hearts), Progress, XP
- [ ] **Verification:** Manual check of rendering and lane switching

## Phase 4: Educational Mechanics & Polish [ ]
- [x] Implement gate word assignment logic (correct word in sequence + decoys)
- [ ] Implement feedback effects:
  - [ ] Correct word: Sparkles, speed surge, chime
  - [x] Collision/Wrong word: Screen shake, red flash, heart loss
- [x] Implement difficulty scaling (speed, obstacle frequency)
- [x] Integrate shared `GameStartScreen` and `GameEndScreen`
- [ ] **Verification:** Complete 3 full game sessions on different difficulties

## Phase 5: Final Integration & Cleanup [ ]
- [x] Register game in `src/lib/gameCards.ts`
- [ ] Create cover image `public/games/cover/cover-griffin-riders-escape.png`
- [ ] Final build check: `npm run build`
- [ ] Measure sync: Mark track completed and move to archive
