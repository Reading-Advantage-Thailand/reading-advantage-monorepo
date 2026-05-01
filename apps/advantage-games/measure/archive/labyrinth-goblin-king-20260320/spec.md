# Game Design Document: Labyrinth of the Goblin King

## 1. Overview
**Title:** Labyrinth of the Goblin King
**Genre:** Maze Runner / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Navigate a dungeon maze hunted by invincible Goblin guards. Collect scattered word orbs in the correct sentence order. Collecting the final word triggers a "Heroic Aura" that makes you powerful enough to defeat the goblins.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Minimum 44×44px
- **Text size**: Minimum 16px for readability
- **One-hand play**: Optimized for DPad control
- **Desktop**: Supported but secondary priority

## 3. Game Flow
1. **Start Screen**: Show sentence list, difficulty selection (maze size), opponent choice (goblin type)
2. **Gameplay**: Navigate maze, collect word orbs in correct order
3. **Power-Up Phase**: After collecting final word, become Paladin for 10 seconds
4. **Victory/Defeat**: Show results with XP earned

## 4. Core Gameplay Loop
- Player spawns at maze entrance
- Translation displayed at top of screen
- Word orbs scattered throughout maze in random positions
- Navigate using DPad (touch or keyboard)
- Collect words in correct sequence:
  - Correct word: orb glows, joins collection, proceed
  - Wrong word: life lost, orb respawns elsewhere
- Goblin guards patrol maze (AI paths)
- Collision with goblin = lose life
- Collecting final word triggers Heroic Aura:
  - Player transforms to Paladin
  - Goblins flee, become vulnerable
  - Eat goblins for bonus XP (10 seconds)
- Complete sentence = victory
- Lose all lives = defeat

## 5. Win/Lose Conditions
- **Victory:** Collect all words in correct order and exit maze
- **Defeat:** Lose all lives (wrong words + goblin collisions)

## 6. XP & Scoring System
- Base XP: 1-10 based on accuracy and time
- Bonus XP: Each goblin eaten during Heroic Aura = +1 XP
- Formula: `Math.min(10, Math.floor(correctWords * accuracy * timeBonus) + goblinsEaten)`
- Time bonus: Faster completion = higher multiplier

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with { term: string, translation: string }
- **Display:** Translation shown at top, words scattered as glowing orbs
- **Testing:** Player demonstrates knowledge by collecting in sequence
- **Educational Goal:** Sentence construction practice with gamified pressure

## 8. Mechanics

### 8.1 Maze Generation
- Pre-designed maze layouts for each difficulty
- Walls rendered as stone blocks
- Corridors wide enough for touch navigation

### 8.2 Player Movement
- Virtual DPad for touch
- Arrow keys for desktop
- Continuous movement in chosen direction
- Smooth interpolation between tiles

### 8.3 Word Orbs
- Glowing magical orbs containing words
- Numbered subtly (1st, 2nd, 3rd) via glow intensity
- Visual feedback on collection:
  - Correct: Green flash, sparkle effect
  - Wrong: Red flash, shake, life lost

### 8.4 Goblin AI
- Patrol paths along corridors
- Chase player when nearby (difficulty-dependent)
- Speed varies by goblin type:
  - Goblin Scout: Slow, predictable patrol
  - Goblin Warrior: Medium, slight chase
  - Goblin Elite: Fast, aggressive pursuit

### 8.5 Heroic Aura Power-Up
- Triggered by collecting final word
- 10 second duration
- Visual: Player glows golden, larger sprite
- Goblins turn blue and flee
- Collision now destroys goblins
- Each goblin = +1 bonus XP

## 9. Difficulty/Progression

### Difficulty Choice: Maze Size
- **Small Dungeon** (4 words, simple maze, 3 lives)
- **Medium Dungeon** (5 words, larger maze, 3 lives)
- **Large Dungeon** (6 words, complex maze, 2 lives)

### Opponent Choice: Goblin Type
- **Goblin Scout** (slow patrol, predictable)
- **Goblin Warrior** (medium speed, light chase)
- **Goblin Elite** (fast, aggressive pursuit)

## 10. Visual Style
- **Theme:** Dark fantasy dungeon
- **Color Palette:**
  - Walls: Dark stone gray (#3a3a4a)
  - Floor: Dungeon tile brown (#4a4035)
  - Word orbs: Golden glow (#ffd700)
  - Player: Knight in armor (#c0c0c0)
  - Paladin form: Golden glow (#ffd700)
  - Goblins: Green (#4a8c4a), flee mode: blue
- **Effects:** Glow effects, particle trails, screen shake on hit

## 11. Technical Approach
- **Engine:** React + React-Konva (Canvas)
- **State:** Pure state object with tick/update functions
- **Architecture:** Follow existing patterns (VillageGuardian, DungeonLiberator)
- **Game Loop:** useInterval hook at 60fps target

## 12. Configuration
```typescript
const LABYRINTH_CONFIG = {
  TILE_SIZE: 32,
  PLAYER_SPEED: 3,
  GOBLIN_SPEED_SCOUT: 1.5,
  GOBLIN_SPEED_WARRIOR: 2,
  GOBLIN_SPEED_ELITE: 2.5,
  HEROIC_AURA_DURATION_MS: 10000,
  LIVES_EASY: 3,
  LIVES_MEDIUM: 3,
  LIVES_HARD: 2,
  WORDS_EASY: 4,
  WORDS_MEDIUM: 5,
  WORDS_HARD: 6,
}
```

## 13. Future Scope (Post-MVP)
- Multiple maze layouts per difficulty
- Power pellets for instant heroic aura
- Boss goblin king at maze center
- Multiplayer race mode
- Procedural maze generation
