# Implementation Plan: Spellweaver's Run

This plan outlines the steps to build "Spellweaver's Run" using **React-Konva (Canvas)** with strict TDD methodology.

## Phase 1: Setup & Infrastructure [checkpoint: complete]
**Assets Required:** None (can start immediately)

- [x] Task: Create configuration file `src/lib/games/spellweaversRunConfig.ts` with all balance values <e7808c2>
- [x] Task: Define game state types in `src/lib/games/spellweaversRun.ts` <3ab747e>
- [x] Task: Create route and page structure
- [x] Task: Create SpellweaversRunGame container component with React-Konva Stage
- [x] Task: Write initial tests for state creation and configuration

## Phase 2: Core Game Logic [checkpoint: complete]
**Assets Required:** None (logic only)

- [x] Task: Implement `createSpellweaversRunState()` initialization function
- [x] Task: Implement `tickSpellweaversRun()` game loop update function
- [x] Task: Implement orb spawning logic (3 lanes, word assignment)
- [x] Task: Implement orb movement/scrolling
- [x] Task: Implement word collection and sequence validation
- [x] Task: Implement mana system (wrong word penalty)
- [x] Task: Implement win/lose condition detection
- [x] Task: Implement sentence completion and next sentence logic
- [x] Task: Write comprehensive tests for all game logic (>80% coverage) - 100% achieved

## Phase 3: Rendering [checkpoint: complete]
**Assets Required:**
- [ ] /public/games/spellweavers-run/orb.png (word orb sprite) - using primitives
- [ ] /public/games/spellweavers-run/scroll.png (floating scroll background) - using primitives
- [ ] /public/games/spellweavers-run/background-*.png (parallax layers) - using gradient

- [x] Task: Implement asset preloading (using primitives for MVP)
- [x] Task: Render parallax background layers (gradient background)
- [x] Task: Render floating scroll with translation text
- [x] Task: Render word orbs with text labels
- [x] Task: Render collection zone indicator
- [x] Task: Render collected words display
- [x] Task: Implement visual feedback (correct/wrong collection) - target orb highlight

## Phase 4: Input & Controls [checkpoint: complete]
**Assets Required:** None

- [x] Task: Implement touch/tap handling for lane selection
- [x] Task: Implement keyboard support (arrow keys for lanes)
- [x] Task: Ensure 44×44px minimum touch targets for lanes
- [x] Task: Implement difficulty selection UI
- [ ] Task: Write tests for input handling (deferred)

## Phase 5: UI & HUD [checkpoint: complete]
**Assets Required:** None

- [x] Task: Implement mana bar display
- [x] Task: Implement sentence progress indicator (collected words display)
- [x] Task: Implement score display
- [x] Task: Implement combo counter
- [ ] Task: Write tests for UI components (deferred)

## Phase 6: Game States [checkpoint: complete]
**Assets Required:** None (uses shared GameStartScreen/GameEndScreen)

- [x] Task: Implement start screen with difficulty selection (use GameStartScreen)
- [x] Task: Implement victory state and XP display (use GameEndScreen)
- [x] Task: Implement defeat state (use GameEndScreen)
- [x] Task: Wire state transitions (start → playing → ended)
- [ ] Task: Write tests for state transitions (deferred)

## Phase 7: Polish & Integration
**Assets Required:** Sound effects (optional)

- [ ] Task: Add visual feedback and juice (particles, screen shake) (optional)
- [ ] Task: Add sound effects using useSound hook (optional)
- [ ] Task: Balance tuning based on playtesting (optional)
- [x] Task: Create API routes: `/api/v1/games/spellweavers-run/sentences` and `/api/v1/games/spellweavers-run/complete`
- [x] Task: Register game in gameCards.ts
- [ ] Task: Final integration test (deferred)

---

## Configuration Reference

```typescript
const SPELLWEAVERS_RUN_CONFIG = {
  laneCount: 3,
  scrollSpeed: { easy: 60, medium: 90, hard: 120 },
  spawnInterval: { easy: 2000, medium: 1500, hard: 1000 },
  collectionZoneHeight: 80,
  initialMana: 100,
  wrongWordPenalty: 20,
  xpPerSentence: 2,
  xpPerCorrectWord: 1,
  comboMultiplier: 0.1,
  orbRadius: 30,
  orbSpacing: 20,
  scrollHeight: 60,
  difficulties: {
    easy: { name: 'Whisper Woods', scrollSpeed: 60, spawnInterval: 2000, maxWords: 4 },
    medium: { name: 'Mystic Mountain', scrollSpeed: 90, spawnInterval: 1500, maxWords: 6 },
    hard: { name: 'Void Passage', scrollSpeed: 120, spawnInterval: 1000, maxWords: 8 }
  }
};
```

## Technical Notes
- Follow architecture patterns from existing Konva games (DragonFlight, WizardZombie)
- Use pure state object with tick function for game logic
- Mobile-first: test on 390×844 viewport
- All text minimum 16px, touch targets minimum 44×44px
- Sentence games use `VocabularyItem[]` with full sentences

## Task Summary
- **Phase 1**: 5 tasks - Setup & Infrastructure
- **Phase 2**: 9 tasks - Core Game Logic
- **Phase 3**: 7 tasks - Rendering
- **Phase 4**: 5 tasks - Input & Controls
- **Phase 5**: 5 tasks - UI & HUD
- **Phase 6**: 5 tasks - Game States
- **Phase 7**: 6 tasks - Polish & Integration
- **Total**: 42 tasks
