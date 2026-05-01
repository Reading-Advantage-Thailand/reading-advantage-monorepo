# Implementation Plan: Storm the Castle Tower

This plan outlines the steps to build "Storm the Castle Tower" using **React-Konva (Canvas)** with strict TDD methodology.

## Phase 1: Setup & Infrastructure
**Assets Required:** None (can start immediately)

- [x] Task: Create configuration file `src/lib/games/stormCastleTowerConfig.ts` with all balance values
- [x] Task: Define game state types in `src/lib/games/stormCastleTower.ts`
- [x] Task: Create `src/app/[locale]/(student)/student/games/sentence/storm-castle-tower` route and page structure
- [x] Task: Create `StormCastleTowerGame` container component with React-Konva Stage

## Phase 2: Core Game Logic
**Assets Required:** None (logic only)

- [x] Task: Implement `createStormCastleTowerState()` initialization function
- [x] Task: Implement grid system (4 columns, scrolling rows)
- [x] Task: Implement player movement (up/down/left/right on grid)
- [x] Task: Implement window placement and word assignment
- [x] Task: Implement word collection mechanics (correct order tracking)
- [x] Task: Implement win/lose condition detection (lives system, tower top)

## Phase 3: Rendering
**Assets Required:** Basic shapes (rectangles, circles) - can use Konva primitives initially

- [x] Task: Render castle wall background with grid
- [x] Task: Render player rogue character
- [x] Task: Render windows with word labels
- [x] Task: Render target word highlight (golden glow)
- [x] Task: Render scrolling effect as player climbs

## Phase 4: Hazards
**Assets Required:** None

- [x] Task: Implement boiling oil hazard (column-based falling)
- [x] Task: Implement falling rocks hazard
- [x] Task: Implement hazard collision detection
- [x] Task: Implement hazard warning indicators

## Phase 5: Input & Controls
**Assets Required:** None

- [x] Task: Implement touch/swipe controls for movement
- [x] Task: Implement tap-to-collect on windows
- [x] Task: Implement keyboard controls (arrow keys)
- [x] Task: Ensure 44×44px minimum touch targets

## Phase 6: UI & HUD
**Assets Required:** None (can use text/shapes)

- [x] Task: Implement translation display at top
- [x] Task: Implement lives indicator
- [x] Task: Implement current target word display
- [x] Task: Implement climb progress indicator

## Phase 7: Game States
**Assets Required:** None

- [x] Task: Implement start/title screen with difficulty and guard selection
- [x] Task: Implement victory state and XP display
- [x] Task: Implement defeat state
- [x] Task: Wire up game phase transitions

## Phase 8: Polish & Integration
**Assets Required:** None (can use existing sounds)

- [x] Task: Add visual feedback (correct/wrong collection, hazard hits)
- [x] Task: Add sound effects (collect, hit, victory, defeat)
- [x] Task: Balance tuning
- [x] Task: Register game in gameCards.ts
- [x] Task: Add cover image placeholder

---

## Configuration Reference
```typescript
const stormCastleTowerConfig = {
  gameWidth: 390,
  gameHeight: 700,
  columns: 4,
  cellSize: 60,
  
  player: {
    moveSpeed: 150,
    lives: 3,
  },
  
  hazards: {
    oilInterval: 3000,
    rockInterval: 4000,
    shutterWarning: 2000,
  },
  
  difficulty: {
    easy: { wordsPerSentence: 4, hazardSpeed: 0.7 },
    normal: { wordsPerSentence: 5, hazardSpeed: 1.0 },
    hard: { wordsPerSentence: 6, hazardSpeed: 1.3 },
  },
  
  xp: {
    perCorrectWord: 1,
    accuracyBonus: 2,
    maxXP: 10,
  },
}
```

## Technical Notes
- Grid-based movement with smooth scrolling
- Windows spawn ahead of player viewport
- Hazards have warning indicators before appearing
- Mobile-first: test on 390×844 viewport
- All text minimum 16px, touch targets minimum 44×44px
