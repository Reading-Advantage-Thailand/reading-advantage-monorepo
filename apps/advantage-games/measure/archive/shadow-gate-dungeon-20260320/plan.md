# Implementation Plan: Shadow Gate Dungeon

This plan outlines the steps to build "Shadow Gate Dungeon" using **React-Konva (Canvas)** with strict TDD methodology.

## Phase 1: Setup & Infrastructure [checkpoint: 3ca2762]
**Assets Required:** None (can start immediately)

- [x] Task: Create configuration file `src/lib/games/shadowGateDungeonConfig.ts` with all balance values <3ca2762>
- [x] Task: Define game state types in `src/lib/games/shadowGateDungeon.ts` <3ca2762>
- [x] Task: Create route and page structure at `src/app/[locale]/(student)/student/games/sentence/shadow-gate-dungeon/` <3ca2762>
- [x] Task: Create `ShadowGateDungeonGame` container component with React-Konva Stage <3ca2762>
- [x] Task: Write initial tests for state creation and configuration <3ca2762>

## Phase 2: Core Game Logic [checkpoint: 3ca2762]
**Assets Required:** None (logic only)

- [x] Task: Implement `createShadowGateDungeonState()` initialization function <3ca2762>
- [x] Task: Implement `tickShadowGateDungeon()` game loop update function <3ca2762>
- [x] Task: Implement player movement logic (position, velocity, bounds) <3ca2762>
- [x] Task: Implement word crystal spawning and positioning <3ca2762>
- [x] Task: Implement word collection logic (correct/wrong detection) <3ca2762>
- [x] Task: Implement shadow creature AI (pursuit behavior) <3ca2762>
- [x] Task: Implement collision detection (player-crystal, player-creature, player-gate) <3ca2762>
- [x] Task: Implement health system (damage, invincibility) <3ca2762>
- [x] Task: Implement win/lose condition detection <3ca2762>
- [x] Task: Implement gate unlock logic (when sentence complete) <3ca2762>
- [x] Task: Write comprehensive tests for all game logic (>80% coverage) - 98% achieved <3ca2762>

## Phase 3: Rendering [checkpoint: 3ca2762]
**Assets Required:** None (using Konva primitives for MVP)

- [x] Task: Implement dungeon background rendering (gradient floor) <3ca2762>
- [x] Task: Implement exit gate rendering (portal with translation text) <3ca2762>
- [x] Task: Render word crystals with text labels and glow effects <3ca2762>
- [x] Task: Render player (circle/sprite) <3ca2762>
- [x] Task: Render shadow creature (circle with trail effect) <3ca2762>
- [x] Task: Implement visual feedback (damage flash, collection sparkle) <3ca2762>

## Phase 4: Input & Controls [checkpoint: 3ca2762]
**Assets Required:** VirtualDPad component (reuse from DungeonLiberator)

- [x] Task: Integrate VirtualDPad component for mobile controls <3ca2762>
- [x] Task: Implement keyboard support (arrow keys) <3ca2762>
- [x] Task: Ensure 44×44px minimum touch targets for DPad <3ca2762>
- [x] Task: Implement difficulty selection UI <3ca2762>
- [x] Task: Implement opponent selection UI <3ca2762>

## Phase 5: UI & HUD [checkpoint: 3ca2762]
**Assets Required:** None

- [x] Task: Implement health bar display <3ca2762>
- [x] Task: Implement collected words display (sentence progress) <3ca2762>
- [x] Task: Implement score/XP display <3ca2762>
- [x] Task: Implement timer display <3ca2762>

## Phase 6: Game States [checkpoint: 3ca2762]
**Assets Required:** None (uses shared GameStartScreen/GameEndScreen)

- [x] Task: Implement start screen with difficulty and opponent selection <3ca2762>
- [x] Task: Implement victory state and XP display <3ca2762>
- [x] Task: Implement defeat state <3ca2762>
- [x] Task: Wire state transitions (start → playing → ended) <3ca2762>

## Phase 7: Polish & Integration
**Assets Required:** Sound effects (optional)

- [ ] Task: Add visual feedback and juice (particles, screen shake) (optional)
- [ ] Task: Add sound effects using useSound hook (optional)
- [ ] Task: Balance tuning based on playtesting (optional)
- [x] Task: Create API routes: `/api/v1/games/shadow-gate-dungeon/sentences` and `/api/v1/games/shadow-gate-dungeon/complete`
- [x] Task: Register game in gameCards.ts
- [ ] Task: Final integration test (deferred)

---

## Configuration Reference

```typescript
const SHADOW_GATE_DUNGEON_CONFIG = {
  // Arena
  arenaWidth: 390,
  arenaHeight: 700,
  gateWidth: 100,
  gateHeight: 60,
  
  // Player
  playerSpeed: 120,
  playerRadius: 20,
  initialHealth: 100,
  invincibilityDuration: 1000,
  
  // Word Crystals
  crystalRadius: 25,
  crystalSpawnMargin: 50,
  
  // Creature
  creatureSpeeds: {
    'goblin-scout': 60,
    'orc-hunter': 90,
    'shadow-dragon': 120
  },
  creatureRadius: 25,
  
  // Damage
  wrongWordDamage: 20,
  creatureCollisionDamage: 25,
  
  // XP
  xpPerCorrectWord: 1,
  accuracyBonus: 1,
  speedBonusThreshold: 30000,
  speedBonus: 1,
  survivalBonusThreshold: 50,
  survivalBonus: 1,
  maxXP: 10,
  
  // Difficulties
  difficulties: {
    easy: { name: 'Dark Cell', wordCount: 4 },
    normal: { name: 'Forgotten Crypt', wordCount: 5 },
    hard: { name: 'Abyssal Chamber', wordCount: 6 }
  }
};
```

## Technical Notes
- Follow architecture patterns from existing Konva games (DungeonLiberator, SpellweaversRun)
- Use pure state object with tick function for game logic
- Mobile-first: test on 390×844 viewport
- All text minimum 16px, touch targets minimum 44×44px
- Sentence games use `VocabularyItem[]` with full sentences
- Reuse VirtualDPad component from DungeonLiberator

## Task Summary
- **Phase 1**: 5 tasks - Setup & Infrastructure
- **Phase 2**: 11 tasks - Core Game Logic
- **Phase 3**: 6 tasks - Rendering
- **Phase 4**: 5 tasks - Input & Controls
- **Phase 5**: 4 tasks - UI & HUD
- **Phase 6**: 4 tasks - Game States
- **Phase 7**: 6 tasks - Polish & Integration
- **Total**: 41 tasks
