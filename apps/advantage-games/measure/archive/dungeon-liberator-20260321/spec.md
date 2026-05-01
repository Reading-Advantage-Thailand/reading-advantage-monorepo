# Game Design Document: Dungeon Liberator

## 1. Overview
**Title:** Dungeon Liberator
**Genre:** Overhead Snake-style / Trailing Line
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Control a Knight in a dungeon. Prisoners are trapped in cells or scattered around. Each prisoner carries a word of a sentence. Collect them in the correct order to form a trailing line behind the Knight. Lead the entire party to the exit portal.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference
- **Map Size**: Single screen arena (390x844) or slightly larger with scrolling. Let's start with single screen for tighter snake mechanics.

## 3. Game Flow
1. **Start Screen**: Select difficulty (Dungeon depth).
2. **Gameplay**: Knight moves in 4 directions.
3. **Collection**: Prisoners are scattered. Collide with the prisoner carrying the *next* word.
4. **Trailing**: Rescued prisoners follow the knight in a line, matching his previous positions (snake mechanic).
5. **Combat/Hazards**: Avoid monsters and walls. Colliding with a monster from the front loses HP. Monster hitting the trailing line causes the hit prisoner and all behind them to be "lost" (return to spawn or health penalty).
6. **Win Condition**: All words collected and knight reaches the exit portal.
7. **Lose Condition**: HP reaches zero.

## 4. Core Gameplay Loop
1. Translation displayed at top.
2. Navigate the dungeon to find the next prisoner.
3. Collect prisoner and grow the line.
4. Avoid patroling monsters.
5. Reach the exit with the full sentence.

## 5. Win/Lose Conditions
- **Victory:** Full sentence completed and reached exit.
- **Defeat:** HP lost or time runs out (optional).

## 6. XP & Scoring System
- **Base XP:** 1 XP per word.
- **Perfect Bonus:** +2 XP if no wrong prisoners touched.
- **Speed Bonus:** +2 XP if completed quickly.
- **Maximum XP:** 10.

## 7. Mechanics

### 7.1 Movement
- 4-directional grid-like or free movement. Let's go with free movement with a trailing "history" for the snake effect.

### 7.2 Trailing Line
- The prisoners follow the knight's path at a fixed distance interval.

### 7.3 Monsters
- Simple AI: Patrol or basic tracking.

## 8. Technical Approach
- **Engine:** React + React-Konva.
- **State:** `tickDungeonLiberator`.
- **Snake Logic:** Store a `pathHistory` array and position followers along it.

## 9. Configuration

```typescript
export const DUNGEON_LIBERATOR_CONFIG = {
  gameWidth: 390,
  gameHeight: 844,
  
  player: {
    speed: 200,
    initialHp: 3,
    size: 32,
  },
  
  monster: {
    speed: 100,
    size: 32,
  },

  prisoner: {
    size: 24,
    spacing: 30, // Distance between followers in path history
  }
};
```
