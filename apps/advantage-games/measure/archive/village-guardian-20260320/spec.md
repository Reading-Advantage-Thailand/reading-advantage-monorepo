# Game Design Document: Village Guardian

## 1. Overview
**Title:** Village Guardian
**Genre:** Snake-style / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Knight defending a village during a monster siege, rescuing trapped villagers with word bubbles in the correct sequence to form a sentence. Rescued villagers trail behind in a growing line.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Minimum 44×44px
- **Text size**: Minimum 16px for readability
- **One-hand play**: Optimized for thumb reach
- **Desktop**: Supported but secondary priority

## 3. Game Flow
1. **Start Screen**: Select difficulty (raid size) and opponent type (invader)
2. **Gameplay**: Navigate overhead village map, rescue villagers in correct word order
3. **Win**: Guide entire procession to town square sanctuary with correct sentence
4. **Lose**: All villagers lost to wrong selections or monster attacks
5. **End Screen**: Display XP earned (1-10 scale)

## 4. Core Gameplay Loop
1. Translation displayed at top of screen
2. Knight moves through village using DPad
3. Villagers scattered with word bubbles above them
4. Tap/collect villagers in correct sentence order
5. Rescued villagers trail behind knight in a line
6. Monsters roam the streets - collision loses villager from back of line
7. Wrong villager selection = they panic and hide (timer penalty)
8. Lead everyone to town square to complete sentence
9. XP calculated based on accuracy and speed

## 5. Win/Lose Conditions
- **Victory:** Collect all words in correct order and reach town square sanctuary
- **Defeat:** All villagers lost (wrong selections + monster collisions)

## 6. XP & Scoring System
- Base XP: 1 point per correct word
- Accuracy bonus: +2 XP if 90%+ accuracy
- Speed bonus: +1 XP if completed in < 50% of time limit
- Survival bonus: +1 XP if 3+ villagers survive to end
- **Max XP: 10**

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with { term: string, translation: string }
- **Display:** Translation shown at top; individual words on villager bubbles
- **Testing:** Player must collect villagers in correct word order
- **Educational Goal:** Sentence construction and word order recognition

## 8. Mechanics

### 8.1 Knight Movement
- DPad control (8-directional)
- Speed: 3 pixels per tick
- Cannot leave village boundaries

### 8.2 Villager System
- Villagers spawn at random positions
- Each has a word bubble above them
- Correct collection: joins trail behind knight
- Wrong collection: villager hides, timer penalty (+2 seconds)

### 8.3 Trailing Line
- Rescued villagers follow knight in sequence
- Trail follows knight path with slight delay
- Monster collision: loses last villager in trail

### 8.4 Monster AI
- Different behaviors per opponent type
- Collision detection with trail and knight
- Monsters patrol/roam the village

### 8.5 Town Square Sanctuary
- Safe zone at center/bottom of village
- Reaching it with correct sentence = victory

## 9. Difficulty/Progression

### Difficulty Choice: Raid Size
- **Scout Party**: 4 villagers, slow monsters, 30s timer
- **War Band**: 6 villagers, medium monsters, 25s timer
- **Full Siege**: 8 villagers, fast monsters, 20s timer

### Opponent Choice: Invader Type
- **Bandits**: Wander aimlessly, avoid player
- **Goblins**: Chase player at medium speed
- **Dragons**: Hunt player aggressively, fast

## 10. Visual Style
- **Theme:** Medieval village under siege
- **Color Palette:** Warm earth tones (browns, oranges) with red accent for danger
- **Effects:** 
  - Burning buildings (particle flames)
  - Dust clouds when moving
  - Sparkle on correct word collection
  - Shake on wrong word

## 11. Technical Approach
- **Engine:** React + React-Konva (Canvas)
- **State:** Pure state object with tick/update functions
- **Architecture:** Follow existing patterns (DungeonLiberator, ShadowGateDungeon)

## 12. Configuration

```typescript
const VILLAGE_GUARDIAN_CONFIG = {
  // Arena
  arenaWidth: 390,
  arenaHeight: 700,
  
  // Knight
  knightSpeed: 3,
  knightSize: 32,
  
  // Villagers
  villagerSize: 28,
  trailSpacing: 24,
  
  // Monsters
  monsterSize: 36,
  monsterSpeeds: {
    bandits: 1.5,
    goblins: 2.5,
    dragons: 3.5
  },
  
  // Timers
  timerDurations: {
    easy: 30000,
    normal: 25000,
    hard: 20000
  },
  
  // Penalties
  wrongWordTimePenalty: 2000,
  
  // XP
  xpPerCorrectWord: 1,
  accuracyBonusThreshold: 0.9,
  accuracyBonus: 2,
  speedBonusThreshold: 0.5,
  speedBonus: 1,
  survivalBonusThreshold: 3,
  survivalBonus: 1,
  maxXP: 10,
  
  // Difficulties
  difficulties: {
    easy: { name: 'Scout Party', wordCount: 4, timer: 30000, monsterSpeed: 1.5 },
    normal: { name: 'War Band', wordCount: 6, timer: 25000, monsterSpeed: 2.5 },
    hard: { name: 'Full Siege', wordCount: 8, timer: 20000, monsterSpeed: 3.5 }
  }
};
```

## 13. Future Scope (Post-MVP)
- Multiple village layouts
- Power-ups (shield, speed boost)
- Boss monsters
- Achievement system
