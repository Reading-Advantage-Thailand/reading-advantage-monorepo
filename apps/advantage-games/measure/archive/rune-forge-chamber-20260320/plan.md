# Implementation Plan: Rune Forge Chamber

This plan outlines the steps to build "Rune Forge Chamber" using **React-Konva (Canvas)** with strict TDD methodology.

## Phase 1: Setup & Infrastructure [checkpoint: complete]
**Assets Required:** None (can start immediately)

- [x] Task: Create configuration file `src/lib/games/runeForgeChamberConfig.ts` with all balance values
- [x] Task: Define game state types in `src/lib/games/runeForgeChamber.ts`
- [x] Task: Create route and page structure at `src/app/[locale]/(student)/student/games/sentence/rune-forge-chamber/`
- [x] Task: Create `RuneForgeChamberGame` container component with React-Konva Stage
- [x] Task: Write initial tests for state creation and configuration

## Phase 2: Core Game Logic [checkpoint: complete]
**Assets Required:** None (logic only)

- [x] Task: Implement `createRuneForgeChamberState()` initialization function
- [x] Task: Implement `tickRuneForgeChamber()` game loop update function
- [x] Task: Implement word circle positioning (orbital placement around center)
- [x] Task: Implement circle movement/animation (floating effect)
- [x] Task: Implement word selection and sequence validation
- [x] Task: Implement timer system (countdown per sentence)
- [x] Task: Implement health system (wrong word penalty)
- [x] Task: Implement win/lose condition detection
- [x] Task: Implement sentence completion and next sentence logic
- [x] Task: Write comprehensive tests for all game logic (>80% coverage)

## Phase 3: Rendering [checkpoint: complete]
**Assets Required:** None (using Konva primitives for MVP)

- [x] Task: Implement dark forge background rendering
- [x] Task: Implement central rune stone with translation text
- [x] Task: Render word circles with text labels and glow effects
- [x] Task: Implement target circle highlight (golden glow)
- [x] Task: Implement collected words display on rune stone
- [x] Task: Implement visual feedback (correct/wrong selection effects)
- [x] Task: Implement timer visual (flame/progress indicator)

## Phase 4: Input & Controls [checkpoint: complete]
**Assets Required:** None

- [x] Task: Implement touch/tap handling for circle selection
- [x] Task: Implement click handling for desktop
- [x] Task: Ensure 44×44px minimum touch targets for circles
- [x] Task: Implement difficulty selection UI
- [x] Task: Implement rune type selection UI (visual theme choice)

## Phase 5: UI & HUD [checkpoint: complete]
**Assets Required:** None

- [x] Task: Implement health bar display
- [x] Task: Implement timer display
- [x] Task: Implement sentence progress indicator
- [x] Task: Implement score/XP display

## Phase 6: Game States [checkpoint: complete]
**Assets Required:** None (uses shared GameStartScreen/GameEndScreen)

- [x] Task: Implement start screen with difficulty and rune type selection
- [x] Task: Implement victory state and XP display
- [x] Task: Implement defeat state
- [x] Task: Wire state transitions (start → playing → ended)

## Phase 7: Polish & Integration [checkpoint: complete]
**Assets Required:** Sound effects (optional)

- [ ] Task: Add visual feedback and juice (particles, screen shake) (optional)
- [ ] Task: Add sound effects using useSound hook (optional)
- [ ] Task: Balance tuning based on playtesting (optional)
- [x] Task: Create API routes: `/api/v1/games/rune-forge-chamber/sentences` and `/api/v1/games/rune-forge-chamber/complete`
- [x] Task: Register game in gameCards.ts
- [ ] Task: Final integration test (deferred)

---

## Configuration Reference

```typescript
const RUNE_FORGE_CHAMBER_CONFIG = {
  // Arena
  arenaWidth: 390,
  arenaHeight: 700,
  runeStoneRadius: 80,
  
  // Word Circles
  circleRadius: 35,
  circleOrbitRadius: 200,
  circleSpeed: 0.5,
  minTouchTarget: 44,
  
  // Timer
  timerDurations: {
    easy: 15000,
    normal: 12000,
    hard: 10000
  },
  
  // Health
  initialHealth: 100,
  wrongWordDamage: 15,
  
  // XP
  xpPerCorrectWord: 1,
  accuracyBonus: 2,
  speedBonusThreshold: 0.25,
  speedBonus: 1,
  survivalBonusThreshold: 50,
  survivalBonus: 1,
  maxXP: 10,
  
  // Difficulties
  difficulties: {
    easy: { name: 'Apprentice', wordCount: 4, timer: 15000, circleSpeed: 0.3 },
    normal: { name: 'Journeyman', wordCount: 6, timer: 12000, circleSpeed: 0.5 },
    hard: { name: 'Master', wordCount: 8, timer: 10000, circleSpeed: 0.7 }
  }
};
```

## Technical Notes
- Follow architecture patterns from existing Konva games (ShadowGateDungeon, DungeonLiberator)
- Use pure state object with tick function for game logic
- Mobile-first: test on 390×844 viewport
- All text minimum 16px, touch targets minimum 44×44px
- Sentence games use `VocabularyItem[]` with full sentences
- Circles positioned using orbital math (angle-based positioning around center)

## Task Summary
- **Phase 1**: 5 tasks - Setup & Infrastructure
- **Phase 2**: 10 tasks - Core Game Logic
- **Phase 3**: 7 tasks - Rendering
- **Phase 4**: 5 tasks - Input & Controls
- **Phase 5**: 4 tasks - UI & HUD
- **Phase 6**: 4 tasks - Game States
- **Phase 7**: 6 tasks - Polish & Integration
- **Total**: 41 tasks
