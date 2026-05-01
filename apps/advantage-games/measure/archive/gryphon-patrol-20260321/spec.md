# Game Design Document: Gryphon Patrol

## 1. Overview
**Title:** Gryphon Patrol
**Genre:** Arcade / Multi-directional Scroller (Defender style)
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Control a Gryphon flying over a large, wrap-around map. Enemies carry words of a sentence. Locate them using a mini-map and hunt them down in the correct sentence order.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference
- **Map Size**: 2000x844 (horizontal wrapping)
- **Touch targets**: Virtual DPad for flight direction and speed.

## 3. Game Flow
1. **Start Screen**: Select difficulty.
2. **Gameplay**: Gryphon flies over a landscape.
3. **Tracking**: A mini-map at the top shows the entire 2000px width, indicating player position and enemy locations.
4. **Collection**: Enemies carry word orbs. Collide with the enemy carrying the *next* word in the sentence.
5. **Combat**: Automatic or manual firing to destroy enemies. Correct word enemy drops the word upon destruction (or collection on touch).
6. **Win Condition**: Collect all words in correct order.
7. **Lose Condition**: HP reaches zero from enemy contact or projectiles.

## 4. Core Gameplay Loop
1. Translation displayed at top.
2. Fly across the map to find enemies.
3. Use mini-map to identify target locations.
4. Destroy/collect correct words.
5. Progress through sentence.

## 5. Win/Lose Conditions
- **Victory:** Full sentence completed.
- **Defeat:** All HP lost.

## 6. XP & Scoring System
- **Base XP:** 1 XP per word.
- **Speed Bonus:** +2 XP if completed quickly.
- **Accuracy Bonus:** +2 XP if no wrong enemies hit.
- **Maximum XP:** 10.

## 7. Mechanics

### 7.1 Movement
- Multi-directional flight (horizontal scrolling with wrap-around).
- Momentum-based acceleration.

### 7.2 Mini-map
- Simplified top-down view showing player (yellow dot) and enemies (red/green dots).
- Target word enemy highlighted differently.

### 7.3 Combat
- Fire magic bolts forward.
- Enemies fly in various patterns.

## 8. Technical Approach
- **Engine:** React + React-Konva.
- **State:** Pure state with `tickGryphonPatrol`.
- **Landscape:** Procedural or tile-based terrain.

## 9. Configuration

```typescript
export const GRYPHON_PATROL_CONFIG = {
  gameWidth: 390,
  gameHeight: 844,
  mapWidth: 2000,
  
  player: {
    speed: 400,
    initialHp: 3,
  },
  
  enemy: {
    count: 10,
    speed: 100,
  }
};
```
