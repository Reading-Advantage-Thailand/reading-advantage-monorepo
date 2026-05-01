# Implementation Plan: Labyrinth of the Goblin King

This plan outlines the steps to build "Labyrinth of the Goblin King" using **React-Konva (Canvas)** with strict TDD methodology.

## Phase 1: Setup & Infrastructure
**Assets Required:** None (can start immediately)

- [x] Task: Create configuration file `src/lib/games/labyrinthGoblinKingConfig.ts` with all balance values
- [x] Task: Define game state types in `src/lib/games/labyrinthGoblinKing.ts`
- [x] Task: Create `src/app/[locale]/(student)/student/games/sentence/labyrinth-goblin-king/` route structure
- [x] Task: Create `LabyrinthGoblinKingGame` container component with React-Konva Stage
- [x] Task: Measure - Mark Phase 1 complete

## Phase 2: Core Game Logic
**Assets Required:** None (logic only)

- [x] Task: Implement `createLabyrinthGoblinKingState()` initialization function
- [x] Task: Implement maze data structure and tile collision
- [x] Task: Implement player movement and DPad input handling
- [x] Task: Implement word orb placement and collection
- [x] Task: Implement goblin AI (patrol, chase, flee states)
- [x] Task: Implement heroic aura power-up mechanic
- [x] Task: Implement win/lose condition detection
- [x] Task: Measure - Mark Phase 2 complete

## Phase 3: Rendering
**Assets Required:**
- [ ] /public/games/labyrinth-goblin-king/knight.png (player sprite)
- [ ] /public/games/labyrinth-goblin-king/paladin.png (power-up sprite)
- [ ] /public/games/labyrinth-goblin-king/goblin.png (enemy sprite)
- [ ] /public/games/labyrinth-goblin-king/wall.png (maze wall tile)
- [ ] /public/games/labyrinth-goblin-king/floor.png (floor tile)
- [ ] /public/games/labyrinth-goblin-king/orb.png (word orb)

- [ ] Task: Implement asset preloading
- [ ] Task: Render maze walls and floor
- [ ] Task: Render player with movement animation
- [ ] Task: Render goblins with AI state visuals
- [ ] Task: Render word orbs with glow effect
- [ ] Task: Implement heroic aura visual transformation
- [ ] Task: Measure - Mark Phase 3 complete

## Phase 4: Input & Controls
**Assets Required:** Virtual DPad (reuse existing)

- [x] Task: Implement touch DPad handling
- [x] Task: Implement keyboard arrow key handling
- [x] Task: Ensure 44×44px minimum touch targets
- [x] Task: Measure - Mark Phase 4 complete

---

## Phase 5: UI & HUD
**Assets Required:** UI elements (hearts, timer)

- [x] Task: Implement translation display at top
- [x] Task: Implement lives display (hearts)
- [x] Task: Implement collected words display
- [x] Task: Implement heroic aura timer bar
- [x] Task: Implement score/XP display
- [x] Task: Measure - Mark Phase 5 complete

---

## Phase 6: Game States
**Assets Required:** Start/end screen backgrounds

- [x] Task: Implement start/title screen with difficulty selection
- [x] Task: Implement opponent type selection
- [x] Task: Implement victory state and XP display
- [x] Task: Implement defeat state
- [x] Task: Implement pause functionality
- [x] Task: Measure - Mark Phase 6 complete

---

## Phase 7: Polish & Integration
**Assets Required:** Effects, particles

- [x] Task: Add visual feedback and juice (particles, screen shake)
- [x] Task: Implement sound effects (useSound hook)
- [x] Task: Create mock API routes (sentences, complete)
- [x] Task: Register game in gameCards.ts
- [x] Task: Balance tuning based on playtesting
- [x] Task: Measure - Mark Phase 7 complete

---

## Configuration Reference
```typescript
export const LABYRINTH_CONFIG = {
  // Tile and maze
  TILE_SIZE: 32,
  MAZE_COLS: 11,
  MAZE_ROWS: 15,

  // Movement
  PLAYER_SPEED: 3,
  GOBLIN_SPEED_SCOUT: 1.5,
  GOBLIN_SPEED_WARRIOR: 2,
  GOBLIN_SPEED_ELITE: 2.5,

  // Power-up
  HEROIC_AURA_DURATION_MS: 10000,

  // Difficulty settings
  LIVES_EASY: 3,
  LIVES_MEDIUM: 3,
  LIVES_HARD: 2,
  WORDS_EASY: 4,
  WORDS_MEDIUM: 5,
  WORDS_HARD: 6,
  GOBLIN_COUNT_EASY: 2,
  GOBLIN_COUNT_MEDIUM: 3,
  GOBLIN_COUNT_HARD: 4,
}
```

## Technical Notes
- Follow architecture patterns from VillageGuardian and DungeonLiberator
- Use pure state object with tick function for game logic
- Mobile-first: test on 390×844 viewport
- All text minimum 16px, touch targets minimum 44×44px
- Maze uses tile-based collision detection

## Task Summary
- **Phase 1**: 5 tasks - Setup & Infrastructure
- **Phase 2**: 7 tasks - Core Game Logic
- **Phase 3**: 6 tasks - Rendering
- **Phase 4**: 4 tasks - Input & Controls
- **Phase 5**: 5 tasks - UI & HUD
- **Phase 6**: 5 tasks - Game States
- **Phase 7**: 5 tasks - Polish & Integration
- **Total**: 37 tasks
