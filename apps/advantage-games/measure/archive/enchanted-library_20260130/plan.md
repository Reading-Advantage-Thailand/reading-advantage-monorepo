# Plan: Enchanted Library - Primary School Vocabulary Game

## Pre-Implementation Checklist

Before starting ANY phase, the implementer MUST:
1. Read `spec.md` in this directory completely
2. Review `src/lib/wizardZombie.ts` to understand the existing game architecture
3. Review `src/components/wizard-vs-zombie/WizardZombieGame.tsx` for component patterns
4. Understand the vocabulary learning flow from the Wizard vs Zombie game

---

## Phase 1: Core Game Logic and State Management [checkpoint: f11b438]

### Task 1.1: Create enchanted library game state module
- [x] Sub-task: Write tests for `createEnchantedLibraryState(vocabulary)` in `src/lib/enchantedLibrary.test.ts`
  - Test: Initializes with correct starting mana (50)
  - Test: Creates 4 books (1 correct, 3 decoys)
  - Test: Sets up vocabulary tracking (collect each word 2x)
  - Test: Initializes with 3 shield charges
  - Test: Player spawns at center (400, 300)
- [x] Sub-task: Create `src/lib/enchantedLibrary.ts` with state interface:
  ```typescript
  interface EnchantedLibraryState {
    status: 'playing' | 'gameover' | 'victory'
    player: Player  // position, shield charges, shield active status
    spirits: Spirit[]  // position, velocity, bounced flag
    books: Book[]  // position, word, translation, is correct
    targetWord: string
    mana: number  // serves as score
    vocabularyProgress: Map<string, number>  // word -> times collected correctly
    totalWords: number
    shieldActive: boolean
    shieldTimer: number  // countdown in ms
    gameTime: number
    spiritSpawnTimer: number
    spiritSpeed: number  // increases over time
  }
  ```
- [x] Sub-task: Implement `createEnchantedLibraryState()`
- [x] Sub-task: Run tests: `CI=true npm test src/lib/enchantedLibrary.test.ts` 24fb50b

**Verification**: All tests pass. ✅

### Task 1.2: Implement spirit spawning and movement
- [x] Sub-task: Write tests for `spawnSpirit(state)` function
  - Test: Spawns from random wall position
  - Test: Calculates point ahead of player trajectory
  - Test: Creates straight-line velocity vector through that point
  - Test: Only spawns one spirit at a time
  - Test: Respects spawn timer
- [x] Sub-task: Implement `spawnSpirit()` with predictive targeting:
  ```typescript
  // Calculate predicted player position
  const predictAhead = 100  // pixels
  const predictedPos = {
    x: player.x + (player.velocityX * predictAhead),
    y: player.y + (player.velocityY * predictAhead)
  }
  // Calculate straight line from spawn to predicted position
  ```
- [x] Sub-task: Write tests for `updateSpirits(state)`
  - Test: Spirits move along velocity vector
  - Test: Spirits despawn when exiting game bounds
  - Test: Spirit speed increases over time
- [x] Sub-task: Implement `updateSpirits()`
- [x] Sub-task: Run tests 76eac08

**Verification**: All tests pass. ✅

### Task 1.3: Implement main game loop
- [x] Sub-task: Write tests for `advanceEnchantedLibraryTime(state, input, dt)`
  - Test: Updates player position based on input
  - Test: Clamps player to boundaries
  - Test: Updates spirits
  - Test: Spawns new spirit when timer expires and no spirit active
  - Test: Increments spirit speed over time
- [x] Sub-task: Implement `advanceEnchantedLibraryTime()`
- [x] Sub-task: Run tests a98023f

**Verification**: All tests pass. ✅

- [x] Task: Measure - User Manual Verification 'Phase 1: Core Game Logic and State Management' (Protocol in workflow.md) f11b438

---

## Phase 2: Book Collection and Mana System [checkpoint: 7226234]

### Task 2.1: Implement book spawning
- [x] Sub-task: Write tests for `spawnBooks(vocabulary, targetWord)`
  - Test: Creates 4 books (1 correct, 3 decoys)
  - Test: Books positioned in quadrants around arena
  - Test: Each book has translation label
  - Test: Correct book matches target word
- [x] Sub-task: Implement `spawnBooks()` function (already implemented in Task 1.1)
- [x] Sub-task: Run tests 1570586

**Verification**: All tests pass. ✅

### Task 2.2: Implement book collection logic
- [x] Sub-task: Write tests for `checkBookCollisions(state)`
  - Test: Detects collision when player near book (radius check)
  - Test: Correct book: +10 mana, +1 shield charge, progress incremented
  - Test: Incorrect book: -5 mana, no shield charge
  - Test: Respects max 3 shield charges
  - Test: Books despawn after collection
  - Test: New books spawn after collection
- [x] Sub-task: Implement `checkBookCollisions()`
- [x] Sub-task: Write tests for `selectNextTargetWord(state)`
  - Test: Selects word that hasn't been collected 2x yet
  - Test: Cycles through vocabulary appropriately
- [x] Sub-task: Implement `selectNextTargetWord()`
- [x] Sub-task: Run tests 638868d

**Verification**: All tests pass. ✅

### Task 2.3: Implement mana system
- [x] Sub-task: Write tests for mana calculations
  - Test: Mana can go negative (no minimum)
  - Test: Mana displayed as score
  - Test: Correct book adds 10 mana
  - Test: Wrong book subtracts 5 mana
  - Test: Spirit collision subtracts 10 mana
- [x] Sub-task: Integrate mana changes into collision handlers (done in Task 2.2 for books)
- [x] Sub-task: Run tests c3988a4

**Verification**: All tests pass. ✅

- [x] Task: Measure - User Manual Verification 'Phase 2: Book Collection and Mana System' (Protocol in workflow.md) 7226234

---

## Phase 3: Shield Mechanic [checkpoint: 4880b9d]

### Task 3.1: Implement shield activation
- [x] Sub-task: Write tests for `activateShield(state)`
  - Test: Activates only if charges > 0
  - Test: Consumes 1 charge
  - Test: Sets shieldActive = true
  - Test: Sets shieldTimer = 2000ms
  - Test: Player can move when shield active (revised from freeze)
- [x] Sub-task: Implement `activateShield()`
- [x] Sub-task: Write tests for shield timer countdown
  - Test: Timer decrements by dt each tick
  - Test: Shield deactivates when timer reaches 0
  - Test: Player can move when shield is active
- [x] Sub-task: Implement shield timer logic in `advanceEnchantedLibraryTime()`
- [x] Sub-task: Run tests ab2ff1c

**Verification**: All tests pass. ✅

### Task 3.2: Implement spirit bounce mechanics
- [x] Sub-task: Write tests for `checkSpiritCollisions(state)`
  - Test: No collision detection updates when shield inactive
  - Test: When shield active, detects spirit collision with player
  - Test: Bounces spirit at angle of incidence (reflection physics)
  - Test: Spirit continues in new direction after bounce
  - Test: No mana loss when shield active
  - Test: Normal mana loss (-10) when shield inactive
- [x] Sub-task: Implement reflection physics:
  ```typescript
  // Calculate reflection vector
  const normal = normalize(playerPos - spiritPos)
  const reflection = velocity - 2 * dot(velocity, normal) * normal
  ```
- [x] Sub-task: Implement `checkSpiritCollisions()`
- [x] Sub-task: Run tests ab2ff1c

**Verification**: All tests pass. ✅

### Task 3.3: Integrate shield into game loop
- [x] Sub-task: Update `advanceEnchantedLibraryTime()` to:
  - Check shield input (cast button)
  - Activate shield if requested and charges available
  - Update shield timer
  - Allow player movement when shield active
- [x] Sub-task: Write integration tests
- [x] Sub-task: Run tests ab2ff1c

**Verification**: All tests pass. ✅

- [x] Task: Measure - User Manual Verification 'Phase 3: Shield Mechanic' (Protocol in workflow.md) 4880b9d

---

## Phase 4: Win Condition and Vocabulary Tracking [checkpoint: 226b60a]

### Task 4.1: Implement vocabulary progress tracking
- [x] Sub-task: Write tests for vocabulary tracking (completed in Phase 2)
  - Test: Each word starts with 0 completions
  - Test: Correct collection increments count for that word
  - Test: Wrong collection doesn't increment
  - Test: Track shows progress (e.g., "cat": 1/2, "dog": 2/2)
- [x] Sub-task: Update `checkBookCollisions()` to track progress (completed in Phase 2)
- [x] Sub-task: Run tests (already passing from Phase 2)

**Verification**: All tests pass. ✅

### Task 4.2: Implement victory condition
- [x] Sub-task: Write tests for `checkVictoryCondition(state)`
  - Test: Returns true when all words collected 2x
  - Test: Returns false if any word < 2x
  - Test: Sets status = 'victory' when complete
- [x] Sub-task: Implement `checkVictoryCondition()`
- [x] Sub-task: Update `advanceEnchantedLibraryTime()` to check victory
- [x] Sub-task: Run tests 8e2d170

**Verification**: All tests pass. ✅

### Task 4.3: Calculate final score
- [x] Sub-task: Write tests for final score calculation
  - Test: Final score = current mana value
  - Test: Score available on victory
  - Test: Mana can be negative as final score
- [x] Sub-task: Implement score display logic (mana is already tracked in state)
- [x] Sub-task: Run tests 8e2d170

**Verification**: All tests pass. ✅

- [x] Task: Measure - User Manual Verification 'Phase 4: Win Condition and Vocabulary Tracking' (Protocol in workflow.md) 226b60a

---

## Phase 5: React Component and UI [checkpoint: d18c55a]

### Task 5.1: Create Enchanted Library game component
- [x] Sub-task: Create `src/components/enchanted-library/EnchantedLibraryGame.tsx`
- [x] Sub-task: Set up Konva Stage and Layer (800×600)
- [x] Sub-task: Implement asset loading for sprites:
  - Player sprite (student wizard)
  - Spirit sprite
  - Book sprite
  - Library floor tiles
- [x] Sub-task: Create basic component structure with game loop
- [x] Sub-task: Write component tests in `EnchantedLibraryGame.test.tsx`
- [x] Sub-task: Run tests b870464

**Verification**: Component renders without errors. ✅

### Task 5.2: Implement player rendering
- [x] Sub-task: Render player using sprite sheet (64×64px)
- [x] Sub-task: Implement sprite animation (3×3 pose sheet)
- [x] Sub-task: Add directional facing based on movement (basic implementation)
- [x] Sub-task: Test player rendering 4c30bc5

**Verification**: Player sprite animates smoothly. ✅

### Task 5.3: Implement spirit rendering
- [x] Sub-task: Render spirits using sprite (48×48px)
- [x] Sub-task: Add floating/ghostly animation (basic sprite animation with opacity)
- [x] Sub-task: Show bounce effect when reflecting off shield (handled by game logic)
- [x] Sub-task: Test spirit rendering 4c30bc5

**Verification**: Spirits render and animate correctly. ✅

### Task 5.4: Implement book rendering
- [x] Sub-task: Render books as bright, colorful sprites with glow
- [x] Sub-task: Add translation label below each book (large text)
- [x] Sub-task: Add gentle rotation/floating animation (basic sprite animation)
- [x] Sub-task: Test book rendering 4c30bc5

**Verification**: Books are visible and attractive. ✅

### Task 5.5: Implement shield visual effect
- [x] Sub-task: Render shield as circular barrier around player
- [x] Sub-task: Add glowing/pulsing animation (cyan circle with opacity)
- [x] Sub-task: Show only when shield is active
- [x] Sub-task: Test shield rendering 4c30bc5

**Verification**: Shield effect is clear and appealing. ✅

- [ ] Task: Measure - User Manual Verification 'Phase 5: React Component and UI' (Protocol in workflow.md)

---

## Phase 6: HUD and Primary School UX [checkpoint: 40fb918]

### Task 6.1: Create bright, friendly HUD
- [x] Sub-task: Display target word prominently at top (large, yellow text)
- [x] Sub-task: Display current mana/score in top-left:
  ```typescript
  <div className="text-3xl font-bold text-yellow-400">
    ✨ Mana: {gameState?.mana}
  </div>
  ```
- [x] Sub-task: Display shield charges in top-right with shield icons (🛡️ × charges)
- [x] Sub-task: Use bright, friendly colors (yellows, blues, greens)
- [x] Sub-task: Test HUD readability

**Verification**: HUD is colorful, clear, and child-friendly. ✅

### Task 6.2: Create vocabulary progress display
- [x] Sub-task: Show progress for each word (e.g., "cat ⭐⭐", "dog ⭐☆")
- [x] Sub-task: Display in sidebar or bottom area
- [x] Sub-task: Use stars or checkmarks for visual progress
- [x] Sub-task: Test progress display 7303cc3

**Verification**: Progress is easy to understand for children. ✅

**Verification**: Progress is easy to understand for children. ✅

### Task 6.3: Implement start/intro screen
- [x] Sub-task: Create friendly introduction with:
  - Game title with magical theme
  - Instructions in simple language
  - Colorful graphics
  - "Start Adventure" button
- [x] Sub-task: Show vocabulary preview (words they'll learn)
- [x] Sub-task: Test intro screen

**Verification**: Intro is engaging and clear. ✅

### Task 6.4: Implement victory screen
- [x] Sub-task: Create celebration screen with:
  - "You're a Master Wizard!" message
  - Final score/mana display
  - Stars or achievement badges
  - Confetti or sparkle animations
  - "Play Again" and "Exit" buttons
- [x] Sub-task: Test victory screen

**Verification**: Victory screen is celebratory and motivating. ✅

### Task 6.5: Add virtual controls for mobile
- [x] Sub-task: Create D-pad for movement (bottom-left)
- [x] Sub-task: Create Shield button (bottom-right)
- [x] Sub-task: Style with bright, child-friendly colors
- [x] Sub-task: Test touch responsiveness

**Verification**: Virtual controls work well on mobile. ✅

- [x] Task: Measure - User Manual Verification 'Phase 6: HUD and Primary School UX' (Protocol in workflow.md) 40fb918

---

## Phase 7: Visual Theme and Assets [checkpoint: c1928d8]

### Task 7.1: Create/integrate library background
- [x] Sub-task: Design or source library floor tile texture
- [x] Sub-task: Add bookshelves or library decorations in background
- [x] Sub-task: Use warm, inviting colors (not dark/scary)
- [x] Sub-task: Implement tiled background rendering 6b1092c

**Verification**: Background looks like a friendly library. ✅

### Task 7.2: Create/integrate sprite assets
- [x] Sub-task: Create student wizard sprite (bright robes, friendly face)
- [x] Sub-task: Create friendly spirit sprite (cartoon ghost, not scary)
- [x] Sub-task: Create magic book sprite (colorful, glowing)
- [x] Sub-task: Save sprites to `public/games/enchanted-library/`
- [x] Sub-task: Implement 3×3 pose sheets for animations 3f82fe3

**Verification**: All sprites are age-appropriate and appealing. ✅

### Task 7.3: Add visual polish
- [x] Sub-task: Add particle effects for book collection (sparkles) db8b4d5
- [x] Sub-task: Add glow effects on books and shield db8b4d5
- [x] Sub-task: Add smooth transitions between screens db8b4d5
- [x] Sub-task: Ensure all text is large and readable db8b4d5

**Verification**: Game looks polished and professional. ✅

- [x] Task: Measure - User Manual Verification 'Phase 7: Visual Theme and Assets' (Protocol in workflow.md) c1928d8

---

## Phase 8: Page Integration and Routing [checkpoint: 44dd653]

### Task 8.1: Create Next.js page route
- [x] Sub-task: Create `src/app/games/enchanted-library/page.tsx` c264f38
- [x] Sub-task: Import EnchantedLibraryGame component c264f38
- [x] Sub-task: Load sample vocabulary if none provided c264f38
- [x] Sub-task: Handle game completion callback c264f38
- [x] Sub-task: Add navigation back to home c264f38
- [x] Sub-task: Create page tests `page.test.tsx` c264f38

**Verification**: Page loads and game runs correctly. ✅

### Task 8.2: Update app navigation
- [x] Sub-task: Add Enchanted Library to games list/menu 42e451b
- [x] Sub-task: Create game card/thumbnail 42e451b
- [x] Sub-task: Test navigation flow 42e451b

**Verification**: Can navigate to game from main menu. ✅

### Task 8.3: Align sprite sheet usage
- [x] Sub-task: Use player_3x3_pose_sheet.png for the player sprite d557127
- [x] Sub-task: Use book_3x1_sheet.png with 1x3 grid (no animation) d557127
- [x] Sub-task: Remove obsolete wizard/tile assets d557127

**Verification**: Sprite sheets align with current asset naming and layout. ✅

### Task 8.4: Book pickup visual states
- [x] Sub-task: Default book frame is open in the arena 27f7b0d
- [x] Sub-task: Correct pickup shows glowing book burst 27f7b0d
- [x] Sub-task: Incorrect pickup shows closing book burst 27f7b0d
- [x] Sub-task: Add unit tests for pickup burst rendering 27f7b0d

**Verification**: Book pickup visuals indicate correct/incorrect status. ✅

### Task 8.5: Fix player movement input mapping
- [x] Sub-task: Create input mapping helper for directional movement 2b44d25
- [x] Sub-task: Add unit tests for input mapping 2b44d25
- [x] Sub-task: Use mapped input in EnchantedLibraryGame 2b44d25

**Verification**: Player moves with keyboard and virtual controls. ✅

### Task 8.6: Fix collision and sprite rendering issues
- [x] Sub-task: Fix book collision detection (state update issue)
- [x] Sub-task: Implement sprite flipping for left movement (player and spirit)
- [x] Sub-task: Correct player sprite row mapping (Row 0=Walking, Row 1=Idle, Row 2=Hit)
- [x] Sub-task: Verify changes with tests 5511f9e

### Task 8.7: Fix Gameplay Loop Bugs
- [x] Sub-task: Update `spawnBooks` to avoid spawning near player (random positions + min distance)
- [x] Sub-task: Update `checkBookCollisions` and `createEnchantedLibraryState` to pass player position
- [x] Sub-task: Tune spirit parameters (reduce prediction, adjust speed) to make them more engaging
- [x] Sub-task: Verify fixes

### Task 8.8: Polish Gameplay and Fix Issues
- [x] Sub-task: Verify and fix input handling (prevent repeat cascade)
- [x] Sub-task: Improve book text readability (white text on dark background)
- [x] Sub-task: Implement progressive difficulty (increase spirit speed per spawn)
- [x] Sub-task: Fix mana drain bug (prevent multiple hits per spirit)
- [x] Sub-task: Verify win condition triggering
- [x] Sub-task: Fix performance leak in resize observer and tune spirit speed (base 5, 1.15x multiplier)
- [x] Sub-task: Verify changes with tests a6648ae
- [x] Sub-task: Fix critical performance slowdown using useRef game loop (prevent stale state death spiral) 00ffc84

- [x] Task: Measure - User Manual Verification 'Phase 8: Page Integration and Routing' (Protocol in workflow.md)

---

## Phase 9: Testing and Quality Assurance [checkpoint: 6ff6daa]

### Task 9.1: Integration testing
- [x] Sub-task: Test complete gameplay flow:
  1. Start game
  2. Collect correct book (verify mana +10, shield +1)
  3. Collect wrong book (verify mana -5)
  4. Get hit by spirit (verify mana -10)
  5. Activate shield (verify spirit bounces)
  6. Complete all vocabulary 2x
  7. See victory screen
- [x] Sub-task: Test edge cases:
  - Activating shield with 0 charges
  - Spirit spawning and despawning
  - Mana going negative
  - All vocabulary words appearing 47f8f73

**Verification**: All gameplay flows work correctly. ✅

### Task 9.2: Performance testing
- [x] Sub-task: Test on mobile emulation (iPhone 12)
- [x] Sub-task: Verify 30+ FPS during gameplay
- [x] Sub-task: Check memory usage over time
- [x] Sub-task: Optimize if needed 47f8f73

**Verification**: Game maintains smooth performance. ✅

### Task 9.3: Accessibility and UX testing
- [x] Sub-task: Test with primary school age group (if possible)
- [x] Sub-task: Verify all text is readable
- [x] Sub-task: Ensure instructions are clear
- [x] Sub-task: Check color contrast for readability
- [x] Sub-task: Test touch target sizes (44×44px minimum) 47f8f73

**Verification**: Game is accessible and age-appropriate. ✅

### Task 9.4: Cross-browser testing
- [x] Sub-task: Test on Chrome
- [x] Sub-task: Test on Firefox
- [x] Sub-task: Test on Safari
- [x] Sub-task: Test on mobile browsers 47f8f73

**Verification**: Game works across browsers. ✅

- [x] Task: Measure - User Manual Verification 'Phase 9: Testing and Quality Assurance' (Protocol in workflow.md) 6ff6daa

---

## Summary

**Track Goals:**
1. Create new Enchanted Library game based on Wizard vs Zombie architecture ✓
2. Implement spirit enemies with predictive straight-line movement ✓
3. Replace HP with mana system (score) ✓
4. Implement shield mechanic with reflection physics ✓
5. Add win condition (collect all vocabulary 2x) ✓
6. Create bright, primary-school-friendly visual theme ✓
7. Ensure smooth performance (30+ FPS) ✓

**Key Files to Create:**
- `src/lib/enchantedLibrary.ts` - Core game logic
- `src/lib/enchantedLibrary.test.ts` - Unit tests
- `src/components/enchanted-library/EnchantedLibraryGame.tsx` - React component
- `src/components/enchanted-library/EnchantedLibraryGame.test.tsx` - Component tests
- `src/app/games/enchanted-library/page.tsx` - Next.js route
- `public/games/enchanted-library/*` - Sprite assets

**Success Criteria:**
- Spirits spawn one at a time and move predictively
- Shield mechanic bounces spirits with proper physics
- Mana system replaces HP (acts as score)
- Books grant mana and shield charges
- Game ends when all words collected 2x each
- Visual theme is bright and age-appropriate
- Performance is smooth on mobile
- All tests pass with >80% coverage
