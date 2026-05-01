# Implementation Plan: Village Guardian

This plan outlines the steps to build "Village Guardian" using **React-Konva (Canvas)** with strict TDD methodology.

## Phase 1: Setup & Infrastructure [checkpoint: complete]
**Assets Required:** None (can start immediately)

- [x] Task: Create configuration file `src/lib/games/villageGuardianConfig.ts` with all balance values
- [x] Task: Define game state types in `src/lib/games/villageGuardian.ts`
- [x] Task: Create route and page structure at `src/app/[locale]/(student)/student/games/sentence/village-guardian/`
- [x] Task: Create `VillageGuardianGame` container component with React-Konva Stage
- [x] Task: Write initial tests for state creation and configuration

## Phase 2: Core Game Logic [checkpoint: complete]
**Assets Required:** None (logic only)

- [x] Task: Implement `createVillageGuardianState()` initialization function
- [x] Task: Implement `tickVillageGuardian()` game loop update function
- [x] Task: Implement knight movement system (8-directional)
- [x] Task: Implement villager spawning with word assignment
- [x] Task: Implement trailing line mechanics (villagers follow knight)
- [x] Task: Implement word selection and sequence validation
- [x] Task: Implement wrong selection penalty (timer increase)
- [x] Task: Implement monster AI (patrol, chase, hunt behaviors)
- [x] Task: Implement collision detection (knight-monster, trail-monster)
- [x] Task: Implement win/lose condition detection
- [x] Task: Implement town square sanctuary zone
- [x] Task: Write comprehensive tests for all game logic (>80% coverage)

## Phase 3: Rendering [checkpoint: complete]
**Assets Required:** None (using Konva primitives for MVP)

- [x] Task: Implement village background rendering
- [x] Task: Implement knight sprite with direction-based rotation
- [x] Task: Render villagers with word bubbles
- [x] Task: Implement trailing line rendering (villagers following knight)
- [x] Task: Render monsters with different visual styles per type
- [x] Task: Implement town square sanctuary zone visual
- [x] Task: Implement visual feedback (correct/wrong selection effects)
- [x] Task: Implement translation display at top

## Phase 4: Input & Controls [checkpoint: complete]
**Assets Required:** None

- [x] Task: Implement VirtualDPad component for mobile control
- [x] Task: Implement keyboard arrow keys for desktop
- [x] Task: Ensure smooth diagonal movement
- [x] Task: Implement difficulty selection UI
- [x] Task: Implement opponent type selection UI

## Phase 5: UI & HUD [checkpoint: complete]
**Assets Required:** None

- [x] Task: Implement timer display
- [x] Task: Implement collected words display
- [x] Task: Implement health/lives display (villagers remaining)
- [x] Task: Implement score/XP display

## Phase 6: Game States [checkpoint: complete]
**Assets Required:** None (uses shared GameStartScreen/GameEndScreen)

- [x] Task: Implement start screen with difficulty and opponent selection
- [x] Task: Implement victory state and XP display
- [x] Task: Implement defeat state
- [x] Task: Wire state transitions (start → playing → ended)

- [x] Task: Measure - User Manual Verification 'Phase 6'

## Phase 7: Polish & Integration [checkpoint: complete]
**Assets Required:** Sound effects (optional)

- [ ] Task: Add visual feedback and juice (particles, screen shake) (optional)
- [ ] Task: Add sound effects using useSound hook (optional)
- [ ] Task: Balance tuning based on playtesting (optional)
- [x] Task: Create API routes: `/api/v1/games/village-guardian/sentences` and `/api/v1/games/village-guardian/complete`
- [x] Task: Register game in gameCards.ts
- [x] Task: Final integration test

---

## Configuration Reference

```typescript
const VILLAGE_GUARDIAN_CONFIG = {
  // Arena
  arenaWidth: 390,
  arenaHeight: 700,
  
  // Knight
  knightSpeed: 3,
  knightSize: 32,
  
  // Villagers
  villagerSize: 28,
  trailSpacing: 24,
  
  // Monsters
  monsterSize: 36,
  monsterSpeeds: {
    bandits: 1.5,
    goblins: 2.5,
    dragons: 3.5
  },
  
  // Timers
  timerDurations: {
    easy: 30000,
    normal: 25000,
    hard: 20000
  },
  
  // Penalties
  wrongWordTimePenalty: 2000,
  
  // XP
  xpPerCorrectWord: 1,
  accuracyBonusThreshold: 0.9,
  accuracyBonus: 2,
  speedBonusThreshold: 0.5,
  speedBonus: 1,
  survivalBonusThreshold: 3,
  survivalBonus: 1,
  maxXP: 10,
  
  // Difficulties
  difficulties: {
    easy: { name: 'Scout Party', wordCount: 4, timer: 30000, monsterSpeed: 1.5 },
    normal: { name: 'War Band', wordCount: 6, timer: 25000, monsterSpeed: 2.5 },
    hard: { name: 'Full Siege', wordCount: 8, timer: 20000, monsterSpeed: 3.5 }
  }
};
```

## Technical Notes
- Follow architecture patterns from existing Konva games (DungeonLiberator, ShadowGateDungeon)
- Use pure state object with tick function for game logic
- Mobile-first: test on 390×844 viewport
- All text minimum 16px, touch targets minimum 44×44px
- Sentence games use `VocabularyItem[]` with full sentences
- Trailing line uses position history or offset-based following

## Task Summary
- **Phase 1**: 5 tasks - Setup & Infrastructure
- **Phase 2**: 12 tasks - Core Game Logic
- **Phase 3**: 8 tasks - Rendering
- **Phase 4**: 5 tasks - Input & Controls
- **Phase 5**: 4 tasks - UI & HUD
- **Phase 6**: 4 tasks - Game States
- **Phase 7**: 6 tasks - Polish & Integration
- **Total**: 44 tasks
