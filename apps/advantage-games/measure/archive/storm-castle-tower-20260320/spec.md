# Game Design Document: Storm the Castle Tower

## 1. Overview
**Title:** Storm the Castle Tower
**Genre:** Arcade Climber / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Scale a towering castle wall, collecting words from windows in the correct sentence order while dodging hazards like boiling oil, falling rocks, and closing shutters.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Minimum 44×44px
- **Text size**: Minimum 16px for readability
- **One-hand play**: Optimized for thumb reach
- **Desktop**: Supported but secondary priority

## 3. Game Flow
1. **Start Screen**: Show translation, difficulty choice (Tower Height), opponent choice (Guard Type)
2. **Gameplay**: Player climbs wall, taps windows to collect words in order
3. **Win**: Collect all words correctly and reach tower top
4. **Lose**: Run out of lives (hit by hazards or wrong window)
5. **Results**: Display XP, accuracy, words collected

## 4. Core Gameplay Loop
1. Translation displayed at top of screen
2. Player rogue character starts at bottom of tower
3. Windows appear at grid positions, each showing a word
4. Player moves up/down/left/right on the climbing grid
5. Tap a window to collect the word
6. Correct word: collected, progress toward next
7. Wrong word: shutter slams, lose a life
8. Hazards spawn periodically:
   - Boiling oil pours down columns
   - Rocks fall from above
   - Guards close shutters on windows
9. Reach the top with all words collected = victory

## 5. Win/Lose Conditions
- **Victory:** Collect all words in correct order and reach tower top
- **Defeat:** Lose all lives (3)

## 6. XP & Scoring System
- Base XP: 1 per correct word
- Accuracy bonus: up to 2 additional XP for high accuracy
- Maximum XP: 10

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with { term: string, translation: string }
- **Display:** Translation shown at top; words appear in windows
- **Testing:** Player must select windows in correct sentence order
- **Educational Goal:** Sentence construction practice with time pressure

## 8. Mechanics

### 8.1 Climbing Grid
- Vertical grid with columns (3-4) and rows (continuous scrolling)
- Player occupies one grid cell
- Move up/down/left/right to adjacent cells
- Continuous upward scroll as player climbs

### 8.2 Window System
- Windows appear at fixed grid positions
- Each window shows one word from the sentence
- Windows have states: open (word visible), closed (slammed), hazard

### 8.3 Hazards
- **Boiling Oil**: Falls down a column, player must dodge horizontally
- **Falling Rocks**: Drop from top, small hit area, warning indicator
- **Shutter Slam**: Guard closes window on player if they linger too long

### 8.4 Target Highlighting
- Current target word highlighted with golden glow
- Other windows show words but no highlight

## 9. Difficulty/Progression
- **Squire's Tower** (easy): 4 words, slow hazards, wide dodge windows
- **Knight's Keep** (normal): 5 words, medium hazards
- **Lord's Citadel** (hard): 6 words, fast hazards, narrow dodge windows

### Opponent Choice
- **Lazy Guard**: Slow shutter response
- **Alert Sentry**: Medium speed
- **Elite Watchman**: Fast shutter, more frequent hazards

## 10. Visual Style
- **Theme:** Medieval fantasy castle siege
- **Color Palette:** Stone grays, torch oranges, night sky blues
- **Effects:** 
  - Particle sparks when collecting correct word
  - Screen shake on wrong word
  - Oil splash effect
  - Rock impact animation

## 11. Technical Approach
- **Engine:** React + React-Konva (Canvas)
- **State:** Pure state object with tick/update functions
- **Architecture:** Follow existing patterns (DragonFlight, WizardZombie)
- **Grid System:** Fixed columns, scrolling rows
- **Collision:** Rectangle-based for grid cells

## 12. Configuration
```typescript
const stormCastleTowerConfig = {
  gameWidth: 390,
  gameHeight: 700,
  columns: 4,
  cellSize: 60,
  
  player: {
    moveSpeed: 150, // ms per cell
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

## 13. Future Scope (Post-MVP)
- Power-ups (shield, slow time)
- Combo system for fast correct selections
- Multiple tower themes
- Boss encounters at tower top
