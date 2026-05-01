# Plan: Castle Defense - Core Fixes and Polish

## Pre-Implementation Checklist

Before starting ANY phase, the implementer MUST:
1. Read `spec.md` in this directory completely
2. Review `src/lib/sampleSentences.ts` to understand sentence structure
3. Review `src/components/potion-rush/PotionRushGame.tsx` for sentence game patterns (if needed)

---

## Phase 1: Sentence Parsing and Word System [checkpoint: 82fd032]

### Task 1.1: Create sentence parsing utilities
- [x] Sub-task: Write tests for `parseSentenceWords(sentence: string): string[]` in `src/lib/castleDefense.test.ts` 6c3892d
  - Test: "The cat sits" → ["The", "cat", "sits"]
  - Test: Empty string → []
  - Test: Multiple spaces handled correctly
  - Test: Punctuation handling (if needed)
- [x] Sub-task: Implement `parseSentenceWords()` in `src/lib/castleDefense.ts` 6c3892d
- [x] Sub-task: Run tests: `CI=true npm test src/lib/castleDefense.test.ts` 6c3892d

**Verification**: All tests pass. ✅

### Task 1.2: Create sentence word spawning logic
- [x] Sub-task: Write tests for `spawnSentenceWords(sentence: string, random?): Word[]` e5ec942
  - Test: Returns correct number of word orbs
  - Test: Each orb has one word from sentence
  - Test: All words from sentence are present
  - Test: Orbs have valid x,y positions within game bounds
- [x] Sub-task: Implement `spawnSentenceWords()` function e5ec942
- [x] Sub-task: Run tests e5ec942

**Verification**: All tests pass. ✅

### Task 1.3: Update game state to use sentences
- [x] Sub-task: Add new fields to `CastleDefenseState`: f7f30c3
  ```typescript
  currentSentenceThai: string
  currentSentenceEnglish: string
  sentenceWords: string[]  // parsed words in order
  collectedWordIndices: number[]  // which words collected so far
  ```
- [x] Sub-task: Update `createCastleDefenseState()` to initialize with first sentence 1cb0a1e
- [x] Sub-task: Update `advanceCastleDefenseTime()` to spawn sentence words instead of translation orbs ebb1e06
- [x] Sub-task: Write tests for updated state initialization 9c4bc8e
- [x] Sub-task: Run tests 9c4bc8e

**Verification**: Tests pass, TypeScript compiles without errors. ✅

### Task 1.4: Update page to use SAMPLE_SENTENCES
- [x] Sub-task: Open `src/app/games/castle-defense/page.tsx` a687089
- [x] Sub-task: Change import from `SAMPLE_VOCABULARY` to `SAMPLE_SENTENCES` a687089
- [x] Sub-task: Update import statement: `import { SAMPLE_SENTENCES } from '@/lib/sampleSentences'` a687089
- [x] Sub-task: Pass `SAMPLE_SENTENCES` to `CastleDefenseGame` component a687089
- [x] Sub-task: Run `npx tsc --noEmit` to verify no TypeScript errors

**Verification**: TypeScript check passes. ✅

- [x] Task: Measure - User Manual Verification 'Phase 1: Sentence Parsing and Word System' (Protocol in workflow.md) 82fd032

---

## Phase 2: Sequential Word Collection Mechanics [checkpoint: 8e0e50f]

### Task 2.1: Implement word collection validation
- [x] Sub-task: Write tests for `validateWordCollection(collectedIndices, nextWord, allWords): boolean` b6ae14e
  - Test: Collecting first word (index 0) → valid
  - Test: Collecting second word after first → valid
  - Test: Collecting third word before second → invalid
  - Test: Collecting already collected word → invalid
- [x] Sub-task: Implement `validateWordCollection()` in `src/lib/castleDefense.ts` b6ae14e
- [x] Sub-task: Run tests b6ae14e

**Verification**: All tests pass. ✅

### Task 2.2: Update word collection logic
- [x] Sub-task: Modify `collectWords()` to validate sequential order: 811476e
  - Check if collected word is the next required word in sentence
  - If valid: add to `collectedWordIndices`
  - If invalid: trigger reset (handled in next task)
- [x] Sub-task: Write tests for updated `collectWords()` with sentence validation 811476e
- [x] Sub-task: Run tests 811476e

**Verification**: All tests pass. ✅

### Task 2.3: Implement sentence reset on wrong word
- [x] Sub-task: Create `resetSentenceProgress(state: CastleDefenseState): CastleDefenseState` 1117d63
  - Clears `collectedWordIndices`
  - Respawns all sentence words on map
  - Returns updated state
- [x] Sub-task: Write tests for `resetSentenceProgress()` 1117d63
- [x] Sub-task: Integrate reset into `collectWords()` when wrong word collected 1117d63
- [x] Sub-task: Clear player inventory when sentence resets 13f2772
- [x] Sub-task: Run tests 1117d63

**Verification**: All tests pass. ✅

### Task 2.4: Implement sentence completion logic
- [x] Sub-task: Create `isSentenceComplete(collectedIndices, totalWords): boolean` 3ef296b
- [x] Sub-task: Write tests for sentence completion check 3ef296b
- [x] Sub-task: Add `sentenceCompleted` boolean field to `CastleDefenseState` 3ef296b
- [x] Sub-task: Update `advanceCastleDefenseTime()` to: 3ef296b
  - Check if sentence complete
  - Set `sentenceCompleted = true` (enables tower building)
  - Award points (e.g., 50 points per completed sentence)
- [x] Sub-task: Write tests for sentence completion flow 3ef296b
- [x] Sub-task: Run tests 3ef296b

**Verification**: All tests pass. ✅

- [x] Task: Measure - User Manual Verification 'Phase 2: Sequential Word Collection Mechanics' (Protocol in workflow.md) 8e0e50f

---

## Phase 3: Tower Building Logic [checkpoint: 19019cb]

### Task 3.1: Implement tower building mechanics
- [x] Sub-task: Update game state to track tower building: 3ef296b
  ```typescript
  sentenceCompleted: boolean  // true when player completes a sentence
  ```
- [x] Sub-task: Write tests for `canBuildTower(state): boolean` 4d69d41
  - Test: Returns true if sentence completed and near tower base
  - Test: Returns false if sentence not completed
  - Test: Returns false if not near tower base
- [x] Sub-task: Implement `canBuildTower()` in `src/lib/castleDefense.ts` 4d69d41
- [x] Sub-task: Run tests 4d69d41

**Verification**: All tests pass. ✅

### Task 3.2: Implement tower building activation
- [x] Sub-task: Write tests for `buildTowerAtSlot(state, slotId): CastleDefenseState` 2ccbad5
  - Test: Creates tower at specified slot
  - Test: Consumes completed sentence (sets sentenceCompleted = false)
  - Test: Resets collectedWordIndices
  - Test: Spawns new sentence words
- [x] Sub-task: Implement `buildTowerAtSlot()` function 2ccbad5
- [x] Sub-task: Integrate into `advanceCastleDefenseTime()`: c8cf442
  - Check if player near tower base AND sentenceCompleted
  - Auto-build tower (or require input, TBD)
  - Call `buildTowerAtSlot()`
- [x] Sub-task: Run tests 2ccbad5

**Verification**: All tests pass. ✅

### Task 3.3: Add visual indicator for tower building
- [x] Sub-task: When player has completed sentence, highlight available tower bases 3842746
- [x] Sub-task: Show "Build Tower" message when player is near a tower base 3842746
- [x] Sub-task: Add visual feedback when tower is built (particle effect, flash, etc.) 5abdf0d

**Verification**: Visual inspection - tower building flow is clear and intuitive. ✅

- [x] Task: Measure - User Manual Verification 'Phase 3: Tower Building Logic' (Protocol in workflow.md) 19019cb

---

## Phase 4: Word Orb Visual Updates [checkpoint: 21f0c9c]

### Task 4.1: Update word orb rendering to white circles
- [x] Sub-task: Open `src/components/castle-defense/CastleDefenseGame.tsx` 80b0b86
- [x] Sub-task: Find word orb rendering code (Group with Circle + Text for words) 80b0b86
- [x] Sub-task: Change circle fill to white: `fill="white"` 80b0b86
- [x] Sub-task: Add black text for contrast: `fill="black"` 80b0b86
- [x] Sub-task: Remove color-based logic (isCorrect → green, incorrect → red) 80b0b86
- [x] Sub-task: Ensure all words render identically (white circles, black text) 80b0b86

**Verification**: Visual inspection - all word orbs are white with black text. ✅

### Task 4.2: Ensure single words per orb
- [x] Sub-task: Verify word orbs receive individual words (not phrases) d36a1c2
- [x] Sub-task: Adjust text offsetX calculation for centering: d36a1c2
  ```typescript
  offsetX={word.radius}  // Center using orb radius
  ```
- [x] Sub-task: Constrain word orb spawns to middle 50% of the board d36a1c2
- [x] Sub-task: Test with short words ("I", "am") and long words ("beautiful", "extraordinary") d36a1c2
- [x] Sub-task: Adjust font size if needed for readability d36a1c2

**Verification**: Visual inspection - each orb contains one word, properly centered. ✅

### Task 4.3: (Optional) Highlight next required word
- [ ] Sub-task: Determine next required word from `collectedWordIndices` and `sentenceWords`
- [ ] Sub-task: Add conditional rendering for next word orb
- [ ] Sub-task: Test highlighting with different sentence progress states
*Note: Highlighting removed per user feedback (commit d36a1c2). Players choose the next word without hints.*

- [x] Task: Measure - User Manual Verification 'Phase 4: Word Orb Visual Updates' (Protocol in workflow.md) 21f0c9c

---

## Phase 5: Wave System with Finite Enemies [checkpoint: fc72821]

### Task 5.1: Define wave configurations
- [x] Sub-task: Create `WAVE_CONFIGS` constant in `src/lib/castleDefense.ts`: a698166
  ```typescript
  export const WAVE_CONFIGS = [
    { wave: 1, soldiers: 10, tanks: 0, bosses: 0 },
    { wave: 2, soldiers: 8, tanks: 4, bosses: 0 },
    { wave: 3, soldiers: 10, tanks: 5, bosses: 1 },
    { wave: 4, soldiers: 12, tanks: 8, bosses: 1 },
    { wave: 5, soldiers: 15, tanks: 10, bosses: 2 },
    { wave: 6, soldiers: 20, tanks: 12, bosses: 3 },
  ]
  ```
- [x] Sub-task: Write tests for wave config retrieval a698166
- [x] Sub-task: Run `npx tsc --noEmit` a698166

**Verification**: TypeScript check passes. ✅

### Task 5.2: Update game state for wave tracking
- [x] Sub-task: Add fields to `CastleDefenseState`: ca487b5
  ```typescript
  enemiesSpawnedThisWave: number  // count of enemies spawned so far
  enemiesKilledThisWave: number   // count of enemies killed
  totalEnemiesThisWave: number    // total enemies for this wave
  ```
- [x] Sub-task: Update `createCastleDefenseState()` to initialize wave tracking ca487b5
- [x] Sub-task: Write tests for state initialization ca487b5
- [x] Sub-task: Run tests ca487b5

**Verification**: All tests pass. ✅

### Task 5.3: Implement finite enemy spawning
- [x] Sub-task: Write tests for wave spawn logic: 7cd587b
  - Test: Stops spawning when `enemiesSpawnedThisWave >= totalEnemiesThisWave`
  - Test: Respects spawn timer between enemies
  - Test: Spawns correct enemy types based on wave config
- [x] Sub-task: Update `advanceCastleDefenseTime()` spawn logic: 7cd587b
  - Check if `enemiesSpawnedThisWave < totalEnemiesThisWave` before spawning
  - Increment `enemiesSpawnedThisWave` when enemy spawns
  - Use wave config to determine enemy type distribution
- [x] Sub-task: Run tests 7cd587b

**Verification**: All tests pass. ✅

### Task 5.4: Implement wave completion detection
- [x] Sub-task: Write tests for `isWaveComplete(state): boolean` 7a35f4f
  - Test: Returns true when all enemies spawned AND all defeated
  - Test: Returns false if enemies still alive
  - Test: Returns false if more enemies to spawn
- [x] Sub-task: Implement `isWaveComplete()` function 7a35f4f
- [x] Sub-task: Update `advanceCastleDefenseTime()` to: cb1098f
  - Check wave completion
  - Show "Wave X Complete" message
  - Advance to next wave after brief delay
  - Reset wave tracking variables
- [x] Sub-task: Run tests 7a35f4f

**Verification**: All tests pass. ✅

- [x] Task: Measure - User Manual Verification 'Phase 5: Wave System with Finite Enemies' (Protocol in workflow.md) fc72821

---

## Phase 6: Six Unique Maps and Win Condition [checkpoint: 8f27455]

### Task 6.1: Define map configurations
- [x] Sub-task: Create `MAP_CONFIGS` constant in `src/lib/castleDefense.ts`: a2829a9
  ```typescript
  export const MAP_CONFIGS = [
    {
      wave: 1,
      path: [/* waypoints */],
      towerSlots: [/* slots */],
      basePosition: { x: 400, y: 300 }
    },
    // ... 5 more map configs
  ]
  ```
- [x] Sub-task: Design 6 unique paths (varying difficulty, length, curves) a2829a9
- [x] Sub-task: Position 3-5 tower slots per map a2829a9
- [x] Sub-task: Write tests for map config retrieval a2829a9

**Verification**: All 6 maps defined, tests pass. ✅

### Task 6.2: Load map based on current wave
- [x] Sub-task: Write tests for `loadMapForWave(wave): MapConfig` a2829a9
- [x] Sub-task: Implement `loadMapForWave()` function a2829a9
- [x] Sub-task: Update `createCastleDefenseState()` to load map for wave 1 a2829a9
- [x] Sub-task: Update wave transition to load next map a2829a9
- [x] Sub-task: Run tests a2829a9

**Verification**: All tests pass, maps load correctly. ✅

### Task 6.3: Implement victory condition
- [x] Sub-task: Add `status: 'playing' | 'gameover' | 'victory'` to state (if not already present)
- [x] Sub-task: Write tests for victory detection: e6c7bad
  - Test: Sets status to 'victory' when wave 6 is complete
  - Test: Does not trigger victory before wave 6
- [x] Sub-task: Update `advanceCastleDefenseTime()`: 4bc814e
  - Check if wave 6 is complete
  - Set `status = 'victory'`
- [x] Sub-task: Run tests e6c7bad

**Verification**: All tests pass. ✅

### Task 6.4: Add victory screen to component
- [x] Sub-task: Open `src/components/castle-defense/CastleDefenseGame.tsx` 4bc814e
- [x] Sub-task: Add victory screen rendering (similar to game over screen): 4bc814e
  ```typescript
  if (gameState?.status === 'victory') {
    return (
      <div className="...victory screen...">
        <h2>Victory!</h2>
        <p>Final Score: {gameState.score}</p>
        <button onClick={startGame}>Play Again</button>
      </div>
    )
  }
  ```
- [x] Sub-task: Test victory screen display 4bc814e

**Verification**: Victory screen appears after wave 6 completion. ✅

- [x] Task: Measure - User Manual Verification 'Phase 6: Six Unique Maps and Win Condition' (Protocol in workflow.md) 8f27455

---

## Phase 7: HUD Updates for Sentence Progress

### Task 7.1: Display Thai sentence prominently
- [x] Sub-task: Find HUD section in `CastleDefenseGame.tsx` 49d76e2
- [x] Sub-task: Add Thai sentence display at top-center: 49d76e2
  ```typescript
  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
    <div className="bg-blue-900/90 px-6 py-3 rounded-lg">
      <div className="text-white text-xl font-bold text-center">
        {gameState?.currentSentenceThai}
      </div>
    </div>
  </div>
  ```
- [x] Sub-task: Ensure responsive sizing for mobile 49d76e2

**Verification**: Thai sentence visible and readable on desktop and mobile. ✅

### Task 7.2: Display sentence progress and wave info
- [x] Sub-task: Create progress display component showing collected words: 6417f56
  ```typescript
  <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
    <div className="bg-black/60 px-4 py-2 rounded text-white text-sm">
      Progress: {gameState?.sentenceWords.map((word, idx) =>
        gameState.collectedWordIndices.includes(idx)
          ? <span key={idx} className="text-green-400">{word} </span>
          : <span key={idx} className="text-gray-500">___ </span>
      )}
    </div>
  </div>
  ```
- [x] Sub-task: Add wave progress indicator: 6417f56
  ```typescript
  <div className="bg-black/60 px-3 py-1 rounded text-white text-sm">
    Wave {gameState?.wave}/6 - Enemies: {gameState?.enemiesKilledThisWave}/{gameState?.totalEnemiesThisWave}
  </div>
  ```
- [x] Sub-task: Position to not overlap with Thai sentence or other HUD elements 6417f56

**Verification**: Progress display shows collected words and wave info. ✅

### Task 7.3: Update HUD layout
- [x] Sub-task: Show "Sentence Complete - Build Tower!" message when sentenceCompleted is true 50813b6
- [x] Sub-task: Clean up HUD layout for clarity and mobile responsiveness ff07fb7

**Verification**: HUD is clean, uncluttered, and informative. ✅

- [ ] Task: Measure - User Manual Verification 'Phase 7: HUD Updates for Sentence Progress' (Protocol in workflow.md)

---

## Phase 8: Fullscreen Support

### Task 8.1: Create fullscreen button component
- [ ] Sub-task: Add fullscreen state: `const [isFullscreen, setIsFullscreen] = useState(false)`
- [ ] Sub-task: Create button UI in top-right corner:
  ```typescript
  <button
    onClick={handleFullscreen}
    className="absolute top-4 right-4 z-20 bg-black/60 hover:bg-black/80 text-white px-3 py-2 rounded"
  >
    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
  </button>
  ```
- [ ] Sub-task: Position to not overlap other UI elements

**Verification**: Button visible in UI, properly positioned. ✅

### Task 8.2: Implement fullscreen API integration
- [ ] Sub-task: Create `handleFullscreen` function:
  ```typescript
  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])
  ```
- [ ] Sub-task: Add fullscreen change listener:
  ```typescript
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])
  ```
- [ ] Sub-task: Test fullscreen entry and exit

**Verification**: Clicking button enters/exits fullscreen successfully. ✅

### Task 8.3: Add browser compatibility check
- [ ] Sub-task: Check if fullscreen API is supported:
  ```typescript
  const supportsFullscreen = useMemo(
    () => document.fullscreenEnabled,
    []
  )
  ```
- [ ] Sub-task: Conditionally render button only if supported:
  ```typescript
  {supportsFullscreen && <button ... />}
  ```
- [ ] Sub-task: Test on Chrome, Firefox, Safari

**Verification**: Button hidden on unsupported browsers, works on modern browsers. ✅

### Task 8.4: Polish fullscreen UX
- [ ] Sub-task: Add icon to button (optional, using Lucide React):
  ```typescript
  import { Maximize, Minimize } from 'lucide-react'
  {isFullscreen ? <Minimize /> : <Maximize />}
  ```
- [ ] Sub-task: Add keyboard hint: "Press ESC to exit fullscreen"
- [ ] Sub-task: Ensure game scales properly in fullscreen mode

**Verification**: Fullscreen experience is smooth and polished. ✅

- [ ] Task: Measure - User Manual Verification 'Phase 8: Fullscreen Support' (Protocol in workflow.md)

---

## Phase 9: Integration Testing and Polish

### Task 9.1: End-to-end gameplay test
- [ ] Sub-task: Test complete sentence collection and tower building flow:
  1. Start game (Wave 1)
  2. Read Thai sentence
  3. Collect words in correct order
  4. Complete sentence, verify "tower ready" state
  5. Move to tower base, verify tower is built
  6. Verify new sentence loads
- [ ] Sub-task: Test wrong word collection:
  1. Collect first word correctly
  2. Try to collect third word (wrong order)
  3. Verify sentence resets
  4. Verify all words respawn
- [ ] Sub-task: Test wave progression:
  1. Complete Wave 1 (defeat all enemies)
  2. Verify "Wave Complete" message
  3. Verify Wave 2 starts with new map
  4. Verify enemy spawning stops after wave quota reached
- [ ] Sub-task: Test victory condition:
  1. Play through all 6 waves (or simulate)
  2. Complete Wave 6
  3. Verify "Victory!" screen appears
  4. Verify play again button works
- [ ] Sub-task: Test fullscreen during gameplay

**Verification**: All gameplay flows work as expected. ✅

### Task 9.2: Performance verification
- [ ] Sub-task: Open Chrome DevTools Performance Monitor
- [ ] Sub-task: Enable mobile emulation (iPhone 12)
- [ ] Sub-task: Play game for 2 minutes
- [ ] Sub-task: Verify FPS stays at 30+ (should maintain rewrite performance)

**Verification**: Game maintains 30+ FPS on mobile emulation. ✅

### Task 9.3: Visual polish pass
- [ ] Sub-task: Review all UI elements for alignment and spacing
- [ ] Sub-task: Ensure Thai text is readable (font size, contrast)
- [ ] Sub-task: Verify word orbs don't spawn on top of roads/towers
- [x] Sub-task: Ensure tower slots do not overlap road paths efe7471
- [ ] Sub-task: Check HUD elements don't overlap on mobile
- [ ] Sub-task: Test landscape and portrait modes

**Verification**: Game looks polished and professional on all screen sizes. ✅

### Task 9.4: Error handling and edge cases
- [ ] Sub-task: Test with empty SAMPLE_SENTENCES array
- [ ] Sub-task: Test with single-word sentences
- [ ] Sub-task: Test with very long sentences (10+ words)
- [x] Sub-task: Randomize sentence selection to avoid repeats efe7471
- [ ] Sub-task: Add error boundaries or graceful degradation

**Verification**: Game handles edge cases gracefully without crashes. ✅

- [ ] Task: Measure - User Manual Verification 'Phase 9: Integration Testing and Polish' (Protocol in workflow.md)

---

## Phase 10: Game Balance Tuning (Future/Optional)

*Note: This phase is lower priority and can be addressed in a future track if needed.*

### Task 10.1: Enemy difficulty adjustments
- [ ] Sub-task: Review enemy spawn rates
- [x] Sub-task: Adjust enemy HP values cce42bf
- [x] Sub-task: Adjust enemy speed values cce42bf
- [ ] Sub-task: Test wave progression curve

### Task 10.2: Tower effectiveness adjustments
- [ ] Sub-task: Review tower damage values
- [ ] Sub-task: Adjust tower range
- [ ] Sub-task: Adjust tower fire rate
- [ ] Sub-task: Test tower balance with sentence collection

### Task 10.3: Player mechanics adjustments
- [ ] Sub-task: Adjust player movement speed if needed
- [ ] Sub-task: Adjust word collection radius
- [ ] Sub-task: Test overall game feel

- [ ] Task: Measure - User Manual Verification 'Phase 10: Game Balance Tuning' (Protocol in workflow.md)

---

## Summary

**Track Goals:**
1. Fix sentence loading to use SAMPLE_SENTENCES ✓
2. Implement sequential word collection mechanics ✓
3. Fix tower building logic (build after completing sentence) ✓
4. Implement finite wave system (6 waves with predetermined enemy counts) ✓
5. Create 6 unique maps for each wave ✓
6. Add victory condition after Wave 6 ✓
7. Update word orbs to white circles with individual words ✓
8. Display Thai sentence and progress in HUD ✓
9. Add fullscreen support ✓
10. Maintain 30+ FPS performance ✓

**Key Files Modified:**
- `src/lib/castleDefense.ts` - Core game logic, sentence parsing, wave configs, map configs
- `src/components/castle-defense/CastleDefenseGame.tsx` - UI, rendering, fullscreen, victory screen
- `src/app/games/castle-defense/page.tsx` - Use SAMPLE_SENTENCES
- `src/lib/__tests__/castleDefense.test.ts` - Unit tests

**Success Criteria:**
- Game uses Thai → English sentences
- Player collects words in correct order
- Wrong word resets progress
- Sentence completion enables tower building
- Towers only built when player moves to tower base with completed sentence
- Waves have finite enemy counts (no infinite spawning)
- 6 unique maps load for each wave
- Victory screen appears after Wave 6
- Fullscreen mode works
- Performance maintained at 30+ FPS
