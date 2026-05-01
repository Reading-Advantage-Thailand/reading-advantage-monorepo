# Implementation Plan: The Abyssal Well

This plan outlines the steps to build "The Abyssal Well" using **React-Konva (Canvas)** with strict TDD methodology.

## Phase 1: Setup & Infrastructure [checkpoint: complete]
**Assets Required:** None (can start immediately)

- [x] Task: Create configuration file `src/lib/games/abyssalWellConfig.ts` with all balance values
- [x] Task: Define game state types in `src/lib/games/abyssalWell.ts`
- [x] Task: Create `src/app/[locale]/(student)/student/games/sentence/abyssal-well` route and page structure
- [x] Task: Create `AbyssalWellGame` container component with React-Konva Stage

## Phase 2: Core Game Logic [checkpoint: complete]
**Assets Required:** None (logic only)

- [x] Task: Implement `createAbyssalWellState()` initialization function
- [x] Task: Implement lane system (8 lanes, player position tracking)
- [x] Task: Implement player rotation and firing mechanics
- [x] Task: Implement enemy spawning and movement toward rim
- [x] Task: Implement collision detection (projectile vs enemy)
- [x] Task: Implement word sequence tracking and correct target selection
- [x] Task: Implement win/lose condition detection (lives system)

## Phase 3: Rendering [checkpoint: complete]
**Assets Required:** Basic shapes (circles, lines) - can use Konva primitives initially

- [x] Task: Render pseudo-3D well with concentric rings
- [x] Task: Render player mage on rim
- [x] Task: Render enemies with word orbs
- [x] Task: Render projectiles
- [x] Task: Render word orb labels

## Phase 4: Input & Controls [checkpoint: complete]
**Assets Required:** None

- [x] Task: Implement touch zones for rotation (left/right screen halves)
- [x] Task: Implement tap-to-fire in center zone
- [x] Task: Implement keyboard controls (arrow keys + space)
- [x] Task: Ensure 44×44px minimum touch targets

## Phase 5: UI & HUD [checkpoint: complete]
**Assets Required:** None (can use text/shapes)

- [x] Task: Implement translation display at top
- [x] Task: Implement lives indicator
- [x] Task: Implement current target word highlight
- [x] Task: Implement score/progress display

## Phase 6: Game States [checkpoint: complete]
**Assets Required:** None

- [x] Task: Implement start/title screen with difficulty and opponent selection
- [x] Task: Implement victory state and XP display
- [x] Task: Implement defeat state
- [x] Task: Implement pause functionality (deferred - not essential for MVP)

## Phase 7: Polish & Integration
**Assets Required:** None (can use existing sounds)

- [ ] Task: Add visual feedback (hit effects, breach flash)
- [ ] Task: Add sound effects (fire, hit, breach, victory, defeat)
- [ ] Task: Balance tuning
- [x] Task: Register game in gameCards.ts
- [ ] Task: Add cover image placeholder

---

## Configuration Reference
```typescript
const abyssalWellConfig = {
  lanes: 8,
  rimRadius: 120,
  wellDepth: 5,
  
  player: {
    fireRate: 300,
    projectileSpeed: 400,
  },
  
  enemy: {
    baseSpeed: 50,
    spawnInterval: 2000,
  },
  
  difficulty: {
    shallow: { wordsPerSentence: 4, speedMult: 0.7 },
    deep: { wordsPerSentence: 5, speedMult: 1.0 },
    abyss: { wordsPerSentence: 6, speedMult: 1.3 },
  },
  
  lives: 3,
}
```

## Technical Notes
- Pseudo-3D effect: Scale enemies larger as they approach rim
- 8 lanes evenly distributed around circle
- Use trigonometry for lane positions (cos/sin)
- Mobile-first: test on 390×844 viewport
- All text minimum 16px, touch targets minimum 44×44px
