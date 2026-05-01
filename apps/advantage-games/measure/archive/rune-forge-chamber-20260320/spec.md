# Game Design Document: Rune Forge Chamber

## 1. Overview
**Title:** Rune Forge Chamber
**Genre:** Puzzle / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Ancient rune-carving sanctuary where players tap magical word circles in the correct sequence to forge a rune artifact before the forge cools down.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Minimum 44×44px
- **Text size**: Minimum 16px for readability
- **One-hand play**: Optimized for thumb reach (tap circles)
- **Desktop**: Supported but secondary priority

## 3. Game Flow
1. **Start Screen**: Show game title, difficulty selection (complexity), rune type selection
2. **Gameplay**: Central rune stone displays translation, word circles float around chamber
3. **Collection**: Player taps word circles in correct sequence
4. **Win Condition**: Complete sentence before timer expires
5. **Lose Condition**: Timer expires or health reaches zero (from wrong selections)
6. **End Screen**: Show XP earned, words collected, accuracy

## 4. Core Gameplay Loop
1. Sentence translation displayed on central rune stone
2. Word circles float in magical patterns around the chamber
3. Player taps circles in correct order
4. Correct word → circle glows and joins the rune
5. Wrong word → rune cracks (health loss), circle dims
6. Timer counts down (forge cooling)
7. Complete sentence → forge artifact, earn XP
8. Next sentence begins

## 5. Win/Lose Conditions
- **Victory:** Complete all sentences in the session before timer expires
- **Defeat:** Timer reaches zero OR health reaches zero (from too many wrong selections)

## 6. XP & Scoring System
- **Base XP:** 1 XP per correct word selected
- **Accuracy Bonus:** +2 XP if no wrong words
- **Speed Bonus:** +1 XP if completed with >25% time remaining
- **Survival Bonus:** +1 XP if health > 50%
- **Maximum XP:** 10 (capped)
- **Formula:** `Math.min(10, correctWords + bonuses)`

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with { term: string, translation: string }
- **Display:** Translation shown on central rune stone; words float in circles around chamber
- **Testing:** Player must tap circles in sentence order
- **Educational Goal:** Sentence structure recognition, word order practice under time pressure

## 8. Mechanics

### 8.1 Word Circles
- Float in orbital patterns around the central rune stone
- Each circle displays a single word from the target sentence
- Target circle glows brighter (visual hint for next word)
- Circles have slight movement animation (floating/magical effect)
- Touch target: 44×44px minimum

### 8.2 Timer System
- Forge cooldown timer displayed prominently
- Timer duration varies by difficulty (15s/12s/10s per sentence)
- Visual feedback: flame intensity decreases as timer runs down
- Timer resets between sentences

### 8.3 Health System
- Initial health: 100 (configurable)
- Wrong word penalty: -15 health
- Health bar displayed on screen
- Health persists across sentences in a session

### 8.4 Central Rune Stone
- Displays the sentence translation
- Shows collected words accumulating
- Glows when complete (ready to forge)

### 8.5 Difficulty Scaling
- **Apprentice:** 3-4 words, 15s timer, slow circle movement
- **Journeyman:** 5-6 words, 12s timer, medium circle movement
- **Master:** 7-8 words, 10s timer, fast circle movement

## 9. Difficulty/Progression

### Difficulty Levels
| Level | Name | Words | Timer | Circle Speed |
|-------|------|-------|-------|--------------|
| Easy | Apprentice | 3-4 | 15s | Slow |
| Normal | Journeyman | 5-6 | 12s | Medium |
| Hard | Master | 7-8 | 10s | Fast |

### Rune Type Selection (Visual Theme)
| Type | Description | Effect |
|------|-------------|--------|
| Common Stone | Simple gray stone with basic glow | Default |
| Rare Crystal | Purple crystal with sparkle effect | Visual only |
| Void Essence | Dark swirling void with particle effects | Visual only |

## 10. Visual Style
- **Theme:** Ancient magical forge, rune-carving sanctuary
- **Color Palette:**
  - Background: Deep charcoal/obsidian (#1a1a2e, #2d2d4e)
  - Rune stone: Glowing amber/orange (#ff9500, #ffcc00)
  - Word circles: Magical blue glow (#00d4ff)
  - Target circle: Golden glow (#ffd700)
  - Collected words: Green glow (#00ff88)
  - Wrong selection: Red flash (#ff4444)
- **Effects:**
  - Circle floating/orbital animation
  - Forge flame particle effects
  - Rune glow intensifies as sentence progresses
  - Screen shake on wrong selection
  - Sparkle burst on correct selection

## 11. Technical Approach
- **Engine:** React + React-Konva (Canvas)
- **State:** Pure state object with tick/update functions
- **Architecture:** Follow existing patterns (DungeonLiberator, ShadowGateDungeon)
- **Animation:** Konva.Tween for smooth circle movement
- **Collision:** Point-in-circle for tap detection

## 12. Configuration

```typescript
const RUNE_FORGE_CHAMBER_CONFIG = {
  // Arena
  arenaWidth: 390,
  arenaHeight: 700,
  runeStoneRadius: 80,
  
  // Word Circles
  circleRadius: 35,
  circleOrbitRadius: 200,
  circleSpeed: 0.5,
  minTouchTarget: 44,
  
  // Timer
  timerDurations: {
    easy: 15000,
    normal: 12000,
    hard: 10000
  },
  
  // Health
  initialHealth: 100,
  wrongWordDamage: 15,
  
  // XP
  xpPerCorrectWord: 1,
  accuracyBonus: 2,
  speedBonusThreshold: 0.25,
  speedBonus: 1,
  survivalBonusThreshold: 50,
  survivalBonus: 1,
  maxXP: 10,
  
  // Difficulties
  difficulties: {
    easy: { name: 'Apprentice', wordCount: 4, timer: 15000, circleSpeed: 0.3 },
    normal: { name: 'Journeyman', wordCount: 6, timer: 12000, circleSpeed: 0.5 },
    hard: { name: 'Master', wordCount: 8, timer: 10000, circleSpeed: 0.7 }
  }
};
```

## 13. Future Scope (Post-MVP)
- Multiple rune types with different effects
- Power-ups (freeze timer, reveal hint, health restore)
- Combo system for consecutive correct selections
- Leaderboards
- Daily challenges
- Achievement system
