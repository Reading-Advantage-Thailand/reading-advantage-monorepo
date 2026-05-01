# Game Design Document: Rune Match

## 1. Overview
**Title:** Rune Match
**Genre:** Match-3 Puzzle / RPG Combat / Educational
**Platform:** Web (Desktop/Mobile)
**Core Concept:** A true Bejeweled-style match-3 game where the player matches vocabulary "runes" to deal damage to monsters. The twist: all runes look identical except for the text, forcing players to read translations to make matches.

## 2. Game Flow

### 2.1 Monster Selection Screen
Players choose their battle from 4 difficulty levels:

| Monster | HP | Attack | XP Reward |
|---------|-----|--------|-----------|
| Goblin | 50 | 1-2 | 3 XP |
| Skeleton | 80 | 1-4 | 6 XP |
| Orc | 120 | 1-6 | 9 XP |
| Dragon | 160 | 1-8 | 12 XP |

Higher difficulty = more HP, higher damage, but greater XP reward.

### 2.2 Core Gameplay Loop

```
1. MATCH:    Swap adjacent runes to create 3+ in a row/column
2. DAMAGE:   Matches deal damage to the monster
3. ATTACK:   Every 5 seconds, monster attacks (random 1-[ATK] damage)
4. POWER:    Power Word changes every 5 seconds - matching it = bonus damage
5. REPEAT:   Until someone's HP reaches 0
```

### 2.3 Win/Lose Conditions
- **Victory:** Monster HP reaches 0 → Earn XP (3/6/9/12 based on monster)
- **Defeat:** Player HP reaches 0 → Game Over, 0 XP

## 3. Mechanics

### 3.1 The Grid
- **Size:** 6x8 or 8x8 grid
- **Rune Types:** 10 vocabulary translations + 2 power-up types (Heal, Shield)
- **Infinite Stack:** New runes fall from top as matches clear (standard Bejeweled behavior)
- **Swap Mechanic:** Tap two adjacent tiles to swap; invalid swaps revert

### 3.2 Visual Design (Critical)
**All vocabulary runes MUST look identical except for the text.**
- Same stone texture
- Same border color
- Same glow effect
- ONLY the translation text differs

This forces players to READ the words, not pattern-match on visual cues.

### 3.3 Matching & Damage

| Match Type | Damage |
|------------|--------|
| 3-match | 10 HP |
| 4-match | 20 HP |
| 5-match | 30 HP |
| L-shape / T-shape | 25 HP |
| Cascade bonus | +5 HP per chain |

### 3.4 Power Word System
- A **target term** (English) displays: `POWER: Apple`
- The translation of this word is the "Power Rune"
- Matching Power Runes deals **2x damage**
- Power Word changes every 5 seconds (synced with monster attack)
- Tests vocabulary recognition without interrupting flow

### 3.5 Power-Up Runes
Special non-vocabulary tiles mixed into the grid (~10% spawn rate):

| Rune | Effect |
|------|--------|
| Heal (heart) | Match 3+ → Restore 5 HP |
| Shield (barrier) | Match 3+ → Block next monster attack |

These are visually distinct from vocabulary runes.

### 3.6 Monster Attacks
- **Timer:** Every 5 seconds
- **Damage:** Random between 1 and monster's ATK stat
- **Visual:** Screen shake + attack animation
- **Sync:** Power Word changes at same time

### 3.7 Player Stats
- **HP:** 100 (fixed, configurable)
- **No attack stat** - damage comes from matches

## 4. Configuration

All balance values stored in a config file for easy tuning:

```typescript
const RUNE_MATCH_CONFIG = {
  player: {
    maxHp: 100,
  },
  monsters: {
    goblin:   { hp: 50,  attack: 2,  xp: 3  },
    skeleton: { hp: 80,  attack: 4,  xp: 6  },
    orc:      { hp: 120, attack: 6,  xp: 9  },
    dragon:   { hp: 160, attack: 8,  xp: 12 },
  },
  combat: {
    attackIntervalMs: 5000,
    match3Damage: 10,
    match4Damage: 20,
    match5Damage: 30,
    lShapeDamage: 25,
    cascadeBonus: 5,
    powerRuneMultiplier: 2,
  },
  powerUps: {
    healAmount: 5,
    spawnRate: 0.10, // 10% of tiles
  },
  grid: {
    columns: 6,
    rows: 8,
  },
};
```

## 5. Vocabulary Integration
- **Input:** Standard `VocabularyItem[]` (10 items recommended)
- **Display:** Translations appear as rune text
- **Power Word:** Terms (English) shown as prompts
- **Educational Goal:** Repeated exposure + recognition under pressure

## 6. Visual Style
- **Theme:** Fantasy dungeon / RPG
- **Board:** Stone/magical rune tiles on dungeon background
- **Monsters:** Fantasy creatures (goblin, skeleton, orc, dragon)
- **Effects:** Explosions, screen shake, damage numbers

## 7. Technical Approach
- **Engine:** React + React-Konva (Canvas) for smooth animations
- **State:** Pure state object with `advanceTime` function
- **Architecture:** Follow existing patterns (DragonFlight, WizardZombie)

## 8. Future Scope (Post-MVP)
- Additional monsters / dungeons
- Special rune effects (bomb clears row, etc.)
- Combo multiplier system
- Leaderboards
- Boss rush mode
