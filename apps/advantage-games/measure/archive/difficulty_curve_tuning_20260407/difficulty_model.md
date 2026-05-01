# Difficulty Curve Model - Shared Framework

## Overview

This document defines the unified difficulty curve framework used across all vocabulary and sentence games in the Reading Advantage platform.

---

## 1. Shared Difficulty Types

All games MUST use the canonical difficulty type from `useGameStore`:

```typescript
export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme'
```

### Tier Thresholds

| Tier | Label | Target Audience | Expected Performance |
|------|-------|-----------------|---------------------|
| 1 | Easy | Learning/New players | 80%+ accuracy, relaxed pace |
| 2 | Normal | Standard players | 60-80% accuracy, moderate pace |
| 3 | Hard | Experienced players | 40-60% accuracy, challenging pace |
| 4 | Extreme | Expert players | <40% accuracy, intense pace |

---

## 2. Common Difficulty Knobs

### 2.1 Speed Parameters

| Knob | Type | Description | Easy→Extreme Range |
|------|------|-------------|-------------------|
| `scrollSpeed` | number | World/scroll speed (px/s) | 0.6x → 1.5x |
| `enemySpeed` | number | Enemy movement speed (px/s) | 0.6x → 1.8x |
| `spawnInterval` | number | Time between spawns (ms) | 1.5x → 0.5x (inverse) |
| `circleSpeed` | number | Orbiting item speed (rad/s) | 0.3 → 0.9 |

### 2.2 Health/Resource Parameters

| Knob | Type | Description | Easy→Extreme Range |
|------|------|-------------|-------------------|
| `initialHp` | number | Starting health points | 5 → 1 |
| `initialLives` | number | Starting lives | 5 → 1 |
| `initialMana` | number | Starting mana/energy | 100 → 50 |

### 2.3 Challenge Parameters

| Knob | Type | Description | Easy→Extreme Range |
|------|------|-------------|-------------------|
| `wordCount` | number | Words per round/sentence | 4 → 8-10 |
| `timer` | number | Time limit (ms) | 1.25x → 0.7x |
| `enemyCount` | number | Number of enemies | 2 → 6 |

### 2.4 Penalty Parameters

| Knob | Type | Description | Easy→Extreme Range |
|------|------|-------------|-------------------|
| `wrongWordPenalty` | number | HP/time lost on wrong answer | 10 → 25 |
| `creatureCollisionDamage` | number | Damage from enemy contact | 15 → 40 |

---

## 3. Difficulty Multipliers

For games that use a unified multiplier approach (like Wizard vs Zombie):

```typescript
export const DIFFICULTY_MODIFIERS: Record<Difficulty, { speed: number; spawnRate: number }> = {
  easy:    { speed: 0.8, spawnRate: 1.2 },
  normal:  { speed: 1.0, spawnRate: 1.0 },
  hard:    { speed: 1.2, spawnRate: 0.8 },
  extreme: { speed: 1.5, spawnRate: 0.6 },
};
```

---

## 4. Game Classification

### Vocabulary Games (Collector Type)
- Dragon Flight, Wizard vs Zombie, Rune Match, Potion Rush, etc.
- Focus: Word collection, accuracy, survival
- Primary knobs: `scrollSpeed`, `spawnInterval`, `wordCount`, `initialHp`

### Sentence Games (Runner/Collector Type)
- Spellweaver's Run, Shadow Gate Dungeon, Village Guardian, etc.
- Focus: Sentence building, obstacle avoidance, time pressure
- Primary knobs: `scrollSpeed`, `spawnInterval`, `timer`, `wordCount`

### Space/Arcade Games
- Archers Revenge, Griffin Sky Joust, etc.
- Focus: Shooting, dodging, formations
- Primary knobs: `enemySpeed`, `descendSpeed`, `playerHp`, `targetChangeInterval`

---

## 5. Inventory Matrix (Current State)

| Game | Type | scrollSpeed | spawnInterval | wordCount | initialHp | timer |
|------|------|-------------|---------------|-----------|-----------|-------|
| **Vocabulary Games** |
| dragonFlight | gate | N/A | N/A | N/A | N/A | durationMs |
| wizardZombie | orb | player.speed | BASE 1000ms | 4 orbs | 100 | N/A |
| runeMatch | rune | N/A | N/A | N/A | N/A | N/A |
| spellweaversRun | scroll | 60-150 | 2000-700ms | 4-10 | 100 mana | N/A |
| paladinsTwinSoul | formation | N/A | N/A | varies | varies | varies |
| potionRush | potion | N/A | N/A | N/A | N/A | N/A |
| **Sentence Games** |
| griffinSkyJoust | flap | gravity 600-1200 | enemy: 60-180 | 4-8 | 1-5 | N/A |
| villageGuardian | snake | knightSpeed 3 | maxMonsters 4 | 4-10 | lives 3 | 15-30s |
| shadowGateDungeon | chase | playerSpeed 200 | N/A | 4-7 | 100 | N/A |
| runeForgeChamber | timing | circleSpeed 0.3-0.9 | N/A | 4-10 | 100 | 8-15s |
| gryphonPatrol | patrol | N/A | N/A | N/A | N/A | N/A |
| stormCastleTower | climb | N/A | N/A | 4-6 | N/A | N/A |
| abyssalWell | tube | scrollSpeed | spawnInterval | varies | varies | varies |
| labyrinthGoblinKing | maze | scrollSpeed | spawnInterval | varies | varies | varies |
| griffinRidersEscape | runner | scrollSpeed | spawnInterval | varies | varies | varies |
| realmCarver | carve | scrollSpeed | spawnInterval | varies | varies | varies |
| devourerSlime | arena | initialSize | spawnInterval | N/A | 1-3 | N/A |
| babelArchitect | stack | fallSpeed | spawnInterval | varies | varies | varies |
| sorcererZiggurat | jump | jumpSpeed | spawnInterval | varies | varies | varies |
| hauntedLibrary | platform | scrollSpeed | spawnInterval | varies | varies | varies |
| alchemistsSynthesis | merge | N/A | spawnInterval | varies | N/A | N/A |
| astralMage | shooter | shipSpeed | spawnInterval | varies | varies | varies |
| **Sentence Games** |
| archersRevenge | shooter | enemySpeed 20-65 | N/A | rows 2-5 | hp 1-5 | N/A |

---

## 6. Guardrails

### Minimum Values
- `initialHp` ≥ 1
- `initialLives` ≥ 1
- `spawnInterval` ≥ 500ms (prevents impossible situations)
- `timer` ≥ 5000ms for timed modes

### Maximum Values
- `enemySpeed` ≤ 300 px/s (mobile performance)
- `scrollSpeed` ≤ 200 px/s (playability)
- `wordCount` ≤ 10 per round

### Recommended Ranges
- Accuracy on Normal difficulty: 60-80%
- Time per word on Normal: 3-5 seconds

---

## 7. Fallback Defaults

When a game doesn't define a specific parameter:

```typescript
const FALLBACK_DIFFICULTY = {
  speed: 1.0,
  spawnRate: 1.0,
  wordCount: 5,
  timer: 15000,
  initialHp: 3,
  penalty: 10,
};
```

---

## 8. Version

- Version: 1.0.0
- Created: 2026-04-07
- Status: Draft - Pending implementation
