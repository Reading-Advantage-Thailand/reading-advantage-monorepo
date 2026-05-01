# Game Design Document: Spellweaver's Run

## 1. Overview
**Title:** Spellweaver's Run
**Genre:** Runner / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Side-scrolling enchanted forest runner where players collect word orbs in 3 lanes to form sentences in the correct order. A floating scroll displays the translation, and wrong words drain mana until game over.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Minimum 44×44px
- **Text size**: Minimum 16px for readability
- **One-hand play**: Optimized for thumb reach (tap lanes)
- **Desktop**: Supported but secondary priority

## 3. Game Flow
1. **Start Screen** → Show vocabulary/sentences, difficulty selection
2. **Gameplay** → Side-scrolling runner, collect words in order
3. **Victory** → Complete sentence successfully, earn XP
4. **Defeat** → Mana reaches zero, show results
5. **End Screen** → Score breakdown, XP earned, restart option

## 4. Core Gameplay Loop
1. Sentence translation displayed in floating scroll at top
2. Word orbs spawn in 3 horizontal lanes (left, center, right)
3. Player taps lane or uses arrow keys to collect orb
4. Correct word in sequence: orb collected, progress advances
5. Wrong word: mana decreased, orb destroyed
6. Loop continues until sentence complete or mana depleted
7. New sentence begins after completion

## 5. Win/Lose Conditions
- **Victory:** Complete all sentences in the session (configurable count)
- **Defeat:** Mana reaches zero

## 6. XP & Scoring System
- Base XP: 1-10 based on overall accuracy and sentences completed
- Formula: `Math.floor(sentencesCompleted * 2 + correctWords * accuracy)`
- Bonus for combos (consecutive correct selections without mistakes)

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with { term: string, translation: string }
- **Display:** Translation shown in floating scroll; word orbs show individual words from term
- **Testing:** Player demonstrates knowledge by selecting words in correct sequence
- **Educational Goal:** Sentence construction and word order comprehension

## 8. Mechanics

### 8.1 Lane System
- 3 horizontal lanes: LEFT, CENTER, RIGHT
- Orbs scroll from top to bottom (or right to left in portrait runner style)
- Player has a "collection zone" at bottom of screen
- Tap lane to collect orb as it passes through zone

### 8.2 Word Orbs
- Display single word from the target sentence
- Visual indicator of correct order (subtle glow intensity or number)
- Spawn rate varies by difficulty
- Scroll speed varies by difficulty

### 8.3 Mana System
- Start with full mana (configurable, e.g., 100)
- Wrong word selection: -20 mana
- Correct word selection: no penalty
- Visual mana bar on screen

### 8.4 Sentence Progress
- Current target word highlighted in scroll
- Collected words appear below scroll in sequence
- Progress bar shows sentence completion

### 8.5 Difficulty Scaling
- **Whisper Woods**: Slow scroll, 3-4 word sentences, forgiving timing
- **Mystic Mountain**: Medium scroll, 5-6 word sentences
- **Void Passage**: Fast scroll, 6-8 word sentences, tight timing

## 9. Difficulty/Progression
- **Difficulty Selection:** Pre-game choice of 3 environments
- **Endless Mode:** Complete as many sentences as possible before mana depletes
- **Session Length:** Configurable sentence count or endless

## 10. Visual Style
- **Theme:** Enchanted forest, magical atmosphere
- **Color Palette:** Deep greens, purples, golden accents
- **Background:** Parallax forest layers (trees, mist, fireflies)
- **Effects:** 
  - Orb glow and particle trail
  - Correct collection: sparkle burst, chime
  - Wrong collection: red flash, shake, error sound
  - Mana pulse when low

## 11. Technical Approach
- **Engine:** React + React-Konva (Canvas)
- **State:** Pure state object with tick/update functions
- **Architecture:** Follow existing patterns (DragonFlight, WizardZombie)
- **Animation:** Konva.Tween for smooth orb movement

## 12. Configuration

```typescript
const SPELLWEAVERS_RUN_CONFIG = {
  // Gameplay
  laneCount: 3,
  scrollSpeed: { easy: 60, medium: 90, hard: 120 }, // pixels per second
  spawnInterval: { easy: 2000, medium: 1500, hard: 1000 }, // ms
  collectionZoneHeight: 80,
  
  // Mana
  initialMana: 100,
  wrongWordPenalty: 20,
  
  // XP
  xpPerSentence: 2,
  xpPerCorrectWord: 1,
  comboMultiplier: 0.1, // 10% bonus per combo level
  
  // Visual
  orbRadius: 30,
  orbSpacing: 20,
  scrollHeight: 60,
  
  // Difficulty presets
  difficulties: {
    easy: { name: 'Whisper Woods', scrollSpeed: 60, spawnInterval: 2000, maxWords: 4 },
    medium: { name: 'Mystic Mountain', scrollSpeed: 90, spawnInterval: 1500, maxWords: 6 },
    hard: { name: 'Void Passage', scrollSpeed: 120, spawnInterval: 1000, maxWords: 8 }
  }
};
```

## 13. Future Scope (Post-MVP)
- Power-ups (freeze time, reveal hint, mana restore)
- Multiple environments with unique visuals
- Leaderboards
- Daily challenges
- Character customization
