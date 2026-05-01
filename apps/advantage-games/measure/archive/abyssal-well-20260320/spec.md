# Game Design Document: The Abyssal Well

## 1. Overview
**Title:** The Abyssal Well
**Genre:** Arcade Shooter / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Mage defending the rim of a deep circular pit. Enemies crawl up carrying word orbs. Shoot them in the correct sentence order before they reach the rim.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Minimum 44×44px
- **Text size**: Minimum 16px for readability
- **One-hand play**: Optimized for thumb reach
- **Desktop**: Supported but secondary priority

## 3. Game Flow
1. **Start Screen**: Translation prompt, difficulty selection, opponent type selection
2. **Gameplay**: Mage on rim, enemies climbing with words, shoot in order
3. **Victory**: All sentences completed correctly
4. **Defeat**: Rim breached 3 times (lives)

## 4. Core Gameplay Loop
1. Translation displayed at top
2. Enemies spawn at bottom of well (far end of tube) with word orbs
3. Player rotates around rim (left/right)
4. Player shoots down into lanes
5. Must hit enemies carrying correct word in sequence
6. Wrong word = enemy reaches rim = lose life
7. Complete sentence = next sentence loads

## 5. Win/Lose Conditions
- **Victory:** Complete all sentences with accuracy threshold
- **Defeat:** 3 enemies breach the rim (lose 3 lives)

## 6. XP & Scoring System
- Base XP: `correctWords * 10`
- Accuracy bonus: `Math.floor(accuracy * 50)` where accuracy = correctShots / totalShots
- Speed bonus: Time remaining bonus
- **Total XP:** `baseXP + accuracyBonus + speedBonus`, clamped 1-10

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with { term: string, translation: string }
- **Display:** Translation shown at top, words on enemy orbs
- **Testing:** Shoot correct word enemies in sequence
- **Educational Goal:** Sentence formation with time pressure

## 8. Mechanics

### 8.1 Well Visualization (Pseudo-3D)
- Circular rim at bottom of screen (player position)
- Concentric rings going up (perspective depth)
- Enemies appear at top (far) and move down toward rim
- 8 lanes around the circle

### 8.2 Player
- Mage positioned on rim edge
- Tap left/right to rotate clockwise/counter-clockwise
- Tap center to fire projectile down current lane
- Cannot move while firing (brief cooldown)

### 8.3 Enemies
- Spawn at far end with word orbs
- Move toward rim at variable speeds
- Different enemy types (goblins, spiders, demons)
- When hit: word orb floats briefly, then disappears

### 8.4 Word Collection
- Words assigned to enemies randomly per sentence
- Must shoot enemy with current target word
- Wrong enemy hit = no penalty but wasted shot
- Enemy reaching rim = lose life

## 9. Difficulty/Progression

### Difficulty Choice: Well Depth
- Shallow Well (4 words per sentence, slow enemies)
- Deep Chasm (5 words, medium speed)
- Abyss (6 words, fast enemies)

### Opponent Choice: Well Denizens
- Goblin Scouts (slow, predictable)
- Cave Spiders (medium, web-swinging)
- Shadow Demons (fast, erratic)

## 10. Visual Style
- **Theme:** Dark fantasy dungeon
- **Color Palette:** Deep purples, glowing cyan/green words, orange fire accents
- **Effects:** Projectile trails, word orb glow, rim breach flash

## 11. Technical Approach
- **Engine:** React + React-Konva (Canvas)
- **State:** Pure state object with tick/update functions
- **Architecture:** Follow existing patterns (DragonFlight, WizardZombie)
- **Pseudo-3D:** Use scaling and perspective lines for depth illusion

## 12. Configuration
```typescript
const abyssalWellConfig = {
  lanes: 8,
  rimRadius: 120,
  wellDepth: 5, // number of concentric rings visible
  
  player: {
    fireRate: 300, // ms between shots
    projectileSpeed: 400,
  },
  
  enemy: {
    baseSpeed: 50,
    spawnInterval: 2000,
    types: {
      goblin: { speed: 0.8, color: '#4a7c59' },
      spider: { speed: 1.0, color: '#7c3a4a' },
      demon: { speed: 1.3, color: '#9b2c2c' },
    },
  },
  
  difficulty: {
    shallow: { wordsPerSentence: 4, speedMult: 0.7 },
    deep: { wordsPerSentence: 5, speedMult: 1.0 },
    abyss: { wordsPerSentence: 6, speedMult: 1.3 },
  },
  
  lives: 3,
}
```

## 13. Future Scope (Post-MVP)
- Power-ups (rapid fire, freeze)
- Combo system for consecutive correct shots
- Boss waves
- Unlockable mage skins
