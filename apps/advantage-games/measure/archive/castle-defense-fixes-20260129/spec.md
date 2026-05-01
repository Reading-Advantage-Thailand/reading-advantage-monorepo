# Spec: Castle Defense - Core Fixes and Polish

## Problem Statement

The Castle Defense game has several critical functional issues that prevent it from working as intended:

1. **Broken Sentence Loading**: The game is not loading sentences correctly. It should use `SAMPLE_SENTENCES` (Thai → English) like other sentence-based games (Potion Rush, Wizard vs Zombie).

2. **Incorrect Game Mechanics**: The game should display a Thai sentence and require the player to collect English words **in the correct sequential order** to complete the sentence.

3. **Word Display Issues**: Words currently appear as "phrases in differently colored circles" instead of individual English words in white circles.

4. **Missing Fullscreen Support**: No way to enter fullscreen mode for an immersive game experience.

5. **Broken Tower Building Logic**: Towers should only be built when the player completes a sentence AND moves over a tower base, not by collecting specific words.

6. **Infinite Wave Problem**: Waves spawn enemies indefinitely. If towers are strong enough, waves never end. Waves must have finite enemy counts.

7. **No Win Condition**: Game lacks a victory state. Should have 6 waves with unique maps, then player wins.

8. **Balance Needs Tuning**: Enemy difficulty, tower effectiveness, and game progression need adjustment (secondary priority).

## Solution Overview

Fix the core vocabulary/sentence system to match the game's intended mechanics, add fullscreen support, and tune game balance values.

---

## Functional Requirements

### 1. Sentence Loading System

**Current Behavior:** Game loads vocabulary items incorrectly, showing phrases instead of individual words.

**Required Behavior:**
- Import and use `SAMPLE_SENTENCES` from `@/lib/sampleSentences.ts`
- Display Thai sentence as the prompt (e.g., "แมวอยู่บนพรม")
- Parse English translation into individual words (e.g., "The cat is on the mat" → ["The", "cat", "is", "on", "the", "mat"])
- Spawn individual word orbs on the map (white circles with one word each)

### 2. Sequential Word Collection and Tower Building Mechanics

**Word Collection Requirements:**
- Player must collect words in **exact sequential order**
- HUD displays:
  - Thai sentence at top
  - Progress indicator showing which words collected so far (e.g., "The cat is ___")
  - Highlight or indicator showing which word is needed next
- When player collects correct next word:
  - Word disappears from map
  - Progress updates (shows collected words)
  - If sentence complete: player can now build a tower (see below)
- When player collects wrong word:
  - **Reset sentence progress** (all collected words dropped back to inventory/map)
  - Visual/audio feedback for mistake
  - Player must start collecting from first word again

**Tower Building Requirements:**
- After completing a sentence, player enters "tower ready" state
- Player moves to any available tower base (empty tower slot)
- When player is near tower base: show visual indicator (e.g., "Press to build" or auto-build on proximity)
- Tower is constructed at that base
- Player's completed sentence is consumed
- New sentence spawns for next tower
- Repeat until all tower bases are filled or wave is complete

### 3. Word Orb Visual Design

**Requirements:**
- All word orbs are **white circles** (not colored)
- Each orb contains a single English word (not phrases)
- Font size should scale based on word length (readable at WORD_RADIUS = 25)
- Optional: Highlight the "next required word" in a different color (e.g., green glow)

### 4. Wave System with Finite Enemies

**Current Problem:** Waves spawn enemies indefinitely via a timer. Strong towers mean waves never end.

**Required Behavior:**
- Each wave has a **predetermined total enemy count** (e.g., Wave 1: 10 soldiers, Wave 2: 8 soldiers + 4 tanks, etc.)
- Wave composition defined per wave:
  ```typescript
  const WAVE_CONFIGS = [
    { wave: 1, soldiers: 10, tanks: 0, bosses: 0 },
    { wave: 2, soldiers: 8, tanks: 4, bosses: 0 },
    { wave: 3, soldiers: 12, tanks: 6, bosses: 1 },
    // ... up to wave 6
  ]
  ```
- Enemies spawn at intervals **until the wave's enemy count is reached**
- Once all enemies are spawned AND defeated, wave is complete
- Transition to next wave (brief pause, show "Wave X Complete" message)
- After Wave 6 is complete: show Victory screen

### 5. Six Unique Maps and Win Condition

**Requirements:**
- Create 6 unique map configurations (different paths, tower slot positions)
- Each wave uses a different map
- Maps stored in configuration:
  ```typescript
  const MAP_CONFIGS = [
    { wave: 1, path: [...], towerSlots: [...] },
    { wave: 2, path: [...], towerSlots: [...] },
    // ... up to wave 6
  ]
  ```
- After completing Wave 6:
  - Show "Victory!" screen
  - Display final score
  - Option to play again

**Map Design Guidelines:**
- Each map should have 3-5 tower slots
- Path should be visually distinct (different curves, lengths)
- Difficulty should increase (longer paths in early waves, shorter in later waves)

### 6. Fullscreen Button

**Requirements:**
- Add fullscreen toggle button to UI (icon + text or icon-only)
- Position: Top-right corner or with other game controls
- Click behavior:
  - Enter fullscreen: Call `containerRef.current.requestFullscreen()`
  - Exit fullscreen: Call `document.exitFullscreen()`
- Button state updates based on fullscreen status:
  - Listen to `fullscreenchange` event
  - Update icon/text (e.g., "Exit Fullscreen" when active)
- Handle ESC key (browser does this automatically)
- Graceful fallback if fullscreen API not supported (hide button or show message)

### 7. Game Balance Tuning (Secondary)

**Areas to adjust:**
- Enemy spawn rates and wave progression
- Enemy HP/speed values
- Tower damage, range, fire rate
- Player movement speed
- Word collection radius

*Note: Balance values will be tuned after core fixes are verified.*

---

## Non-Functional Requirements

### Code Quality
- Follow TDD methodology (write tests for sentence parsing logic)
- Maintain >80% code coverage for new functions
- No TypeScript errors
- Follow existing code style patterns

### Compatibility
- Fullscreen API must work on modern browsers (Chrome, Firefox, Safari, Edge)
- Graceful degradation if fullscreen not supported

### User Experience
- Clear visual feedback for correct/incorrect word collection
- Smooth transitions when entering/exiting fullscreen
- Game remains playable at 30+ FPS (maintain rewrite performance)

---

## Acceptance Criteria

### Sentence System
- [ ] Game uses `SAMPLE_SENTENCES` from `@/lib/sampleSentences.ts`
- [ ] Thai sentence displayed prominently in HUD
- [ ] English translation parsed into individual words
- [ ] Word orbs appear as white circles with single words

### Collection Mechanics
- [ ] Player can only collect words in sequential order
- [ ] HUD shows progress (collected words highlighted/visible)
- [ ] Collecting correct next word updates progress
- [ ] Collecting wrong word resets sentence progress
- [ ] Completing sentence enables "tower ready" state

### Tower Building
- [ ] Player can build tower only after completing a sentence
- [ ] Moving near tower base with completed sentence shows indicator
- [ ] Tower is built when player activates at tower base
- [ ] Completed sentence is consumed, new sentence spawns
- [ ] Cannot build tower without completed sentence

### Wave System
- [ ] Each wave has finite, predetermined enemy count
- [ ] Enemies stop spawning after wave quota is reached
- [ ] Wave completes when all enemies are defeated
- [ ] "Wave Complete" message shown between waves
- [ ] Game progresses through 6 waves

### Maps and Win Condition
- [ ] 6 unique map configurations created
- [ ] Each wave loads its corresponding map
- [ ] Maps have different paths and tower slot positions
- [ ] After Wave 6 completion, "Victory!" screen appears
- [ ] Victory screen shows final score and play again option

### Fullscreen
- [ ] Fullscreen button visible in UI
- [ ] Clicking button enters fullscreen mode
- [ ] ESC key or clicking button again exits fullscreen
- [ ] Button state reflects current fullscreen status
- [ ] Works on Chrome, Firefox, Safari, Edge

### Performance
- [ ] Game still runs at 30+ FPS on mobile
- [ ] No performance regression from changes

### Testing
- [ ] Unit tests for sentence parsing logic
- [ ] Tests for word collection order validation
- [ ] Tests for sentence reset on wrong word
- [ ] Tests for tower building with completed sentence
- [ ] Tests for wave enemy count limits
- [ ] Tests for wave progression

---

## Out of Scope

- Advanced sentence difficulty progression (all sentences have equal difficulty)
- Sentence editing/customization UI
- Alternative word collection modes (e.g., any order)
- Multiplayer or leaderboard features
- Sound effects for word collection (can be added later)
- Balance tuning beyond basic value adjustments

---

## Technical Notes

### Sentence Parsing Example

```typescript
// Input: "The cat is on the mat"
// Output: ["The", "cat", "is", "on", "the", "mat"]
function parseEnglishWords(sentence: string): string[] {
  return sentence.split(' ').filter(w => w.length > 0)
}
```

### Fullscreen API Example

```typescript
const handleFullscreen = () => {
  if (!document.fullscreenElement) {
    containerRef.current?.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

useEffect(() => {
  const handleChange = () => {
    setIsFullscreen(!!document.fullscreenElement)
  }
  document.addEventListener('fullscreenchange', handleChange)
  return () => document.removeEventListener('fullscreenchange', handleChange)
}, [])
```

### Files to Modify

- `src/lib/castleDefense.ts` - Sentence parsing and word validation logic
- `src/components/castle-defense/CastleDefenseGame.tsx` - Render word orbs, HUD updates, fullscreen button
- `src/app/games/castle-defense/page.tsx` - Import SAMPLE_SENTENCES instead of SAMPLE_VOCABULARY
