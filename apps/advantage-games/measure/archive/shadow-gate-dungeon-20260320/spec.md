# Game Design Document: Shadow Gate Dungeon

## 1. Overview
**Title:** Shadow Gate Dungeon
**Genre:** Survival / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Trapped in a dark dungeon chamber, collect word crystals in the correct order to unlock the magical exit gate before the shadow creature catches you.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Minimum 44×44px
- **Text size**: Minimum 16px for readability
- **One-hand play**: Optimized for thumb reach (DPad control)
- **Desktop**: Supported but secondary priority

## 3. Game Flow
1. **Start Screen**: Show game title, difficulty selection (creature speed), opponent selection (pursuer type)
2. **Gameplay**: Player spawns in dungeon chamber with scattered word crystals and a shadow creature
3. **Collection**: Player navigates to collect word crystals in correct sequence
4. **Win Condition**: Collect all words in order and reach the exit gate
5. **Lose Condition**: Shadow creature catches player or wrong word collected (loses health)
6. **End Screen**: Show XP earned, words collected, time taken

## 4. Core Gameplay Loop
1. Sentence translation displayed at top (on exit gate)
2. Word crystals scattered across dungeon floor
3. Player moves via DPad to navigate
4. Auto-collect crystal on collision
5. If correct word → crystal added to sentence, score increases
6. If wrong word → health decreases, crystal respawns elsewhere
7. Shadow creature pursues player
8. Creature collision → health decreases, brief invincibility
9. Complete sentence → gate unlocks → reach gate to win

## 5. Win/Lose Conditions
- **Victory:** Collect all words in correct order, then reach the exit gate
- **Defeat:** Health reaches zero (from wrong words or creature attacks)

## 6. XP & Scoring System
- **Base XP:** 1 XP per correct word collected
- **Accuracy Bonus:** +1 XP if no wrong words collected
- **Speed Bonus:** +1 XP if completed under time threshold
- **Survival Bonus:** +1 XP if health remains above 50%
- **Maximum XP:** 10 (capped)
- **Formula:** `Math.min(10, correctWords + bonuses)`

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with { term: string, translation: string }
- **Display:** Translation shown on exit gate; words scattered as crystals
- **Testing:** Player must collect words in sentence order
- **Educational Goal:** Sentence structure recognition, word order practice

## 8. Mechanics

### 8.1 Player Movement
- Virtual DPad for mobile (bottom-left corner)
- Arrow keys for desktop
- Speed: 120 pixels/second (adjustable by difficulty)

### 8.2 Word Crystals
- Spawn at random positions avoiding player start and gate
- Glow effect to indicate collectibility
- Target crystal glows brighter (shows which word to collect next)
- Auto-collect on collision with player

### 8.3 Shadow Creature AI
- **Goblin Scout:** Slow pursuit (60 px/s), wanders when far
- **Orc Hunter:** Medium pursuit (90 px/s), actively tracks
- **Shadow Dragon:** Fast pursuit (120 px/s), predicts player movement
- Creature has brief "spawn" animation at game start

### 8.4 Health System
- Initial health: 100
- Wrong word penalty: -20 health
- Creature collision: -25 health
- Brief invincibility (1s) after taking damage
- Health bar displayed at top

### 8.5 Exit Gate
- Positioned at top or side of dungeon
- Shows translation text
- Locked (red glow) until all words collected
- Unlocked (green glow) when sentence complete
- Touch gate to escape when unlocked

## 9. Difficulty/Progression

### Difficulty Levels (Creature Speed + Word Count)
| Level | Name | Words | Creature Speed | Spawn Interval |
|-------|------|-------|----------------|----------------|
| Easy | Dark Cell | 4 | 60 px/s | Normal |
| Normal | Forgotten Crypt | 5 | 90 px/s | Normal |
| Hard | Abyssal Chamber | 6 | 120 px/s | Fast |

### Opponent Selection (Pursuer Type)
| Opponent | Speed | Behavior |
|----------|-------|----------|
| Goblin Scout | Slow | Wanders, slow pursuit |
| Orc Hunter | Medium | Active tracking |
| Shadow Dragon | Fast | Predictive pursuit |

## 10. Visual Style
- **Theme:** Dark fantasy dungeon
- **Color Palette:**
  - Background: Deep purple/black (#1a0a2e, #2d1b4e)
  - Walls: Dark stone gray (#3d3d5c)
  - Word crystals: Glowing cyan (#00ffff), target glows gold (#ffd700)
  - Player: Knight in armor (#silver/blue)
  - Shadow creature: Dark purple smoke (#4a0080) with glowing eyes
  - Exit gate: Magical portal (locked: red, unlocked: green)
- **Effects:**
  - Crystal glow pulsing
  - Creature shadow trail
  - Screen shake on damage
  - Particle burst on word collection

## 11. Technical Approach
- **Engine:** React + React-Konva (Canvas)
- **State:** Pure state object with tick/update functions
- **Architecture:** Follow existing patterns (DungeonLiberator for DPad, SpellweaversRun for sentence handling)
- **Collision:** Simple circle/rectangle collision detection
- **AI:** Simple pursuit algorithm with optional prediction

## 12. Configuration

```typescript
const SHADOW_GATE_DUNGEON_CONFIG = {
  // Arena
  arenaWidth: 390,
  arenaHeight: 700,
  gateWidth: 100,
  gateHeight: 60,
  
  // Player
  playerSpeed: 120,
  playerRadius: 20,
  initialHealth: 100,
  invincibilityDuration: 1000,
  
  // Word Crystals
  crystalRadius: 25,
  crystalSpawnMargin: 50,
  
  // Creature
  creatureSpeeds: {
    'goblin-scout': 60,
    'orc-hunter': 90,
    'shadow-dragon': 120
  },
  creatureRadius: 25,
  
  // Damage
  wrongWordDamage: 20,
  creatureCollisionDamage: 25,
  
  // XP
  xpPerCorrectWord: 1,
  accuracyBonus: 1,
  speedBonusThreshold: 30000, // 30 seconds
  speedBonus: 1,
  survivalBonusThreshold: 50, // health percentage
  survivalBonus: 1,
  maxXP: 10,
  
  // Difficulties
  difficulties: {
    easy: { name: 'Dark Cell', wordCount: 4 },
    normal: { name: 'Forgotten Crypt', wordCount: 5 },
    hard: { name: 'Abyssal Chamber', wordCount: 6 }
  }
};
```

## 13. Future Scope (Post-MVP)
- Multiple dungeon rooms/levels
- Power-ups (speed boost, invisibility)
- Different creature types per level
- Environmental hazards (traps)
- Leaderboards
