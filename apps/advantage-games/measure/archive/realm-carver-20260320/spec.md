# Game Design Document: Realm Carver

## 1. Overview
**Title:** Realm Carver
**Genre:** Arcade / Territory Claiming (Qix style)
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Control a magical cartographer drawing lines to claim territory on a mystical map. Capture floating words by enclosing them within claimed areas in the correct sentence order.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference
- **Touch targets**: Virtual DPad (44×44px)
- **Text size**: Minimum 18px for words on map

## 3. Game Flow
1. **Start Screen**: Select difficulty (territory threshold, monster speed)
2. **Gameplay**: Map starts as an empty rectangle with a border.
3. **Drawing**: Move along the border or claimed areas safely. Venture into "wild" area to draw lines (trails). Completing a circuit back to a safe area claims the enclosed territory.
4. **Collection**: Words float in the "wild" area. To collect a word, it must be inside the territory being claimed at the moment of completion.
5. **Collision Rules**:
    - Monster hits player in safe area: Safe (no damage)
    - Monster hits player's trail in wild area: Damage (lose HP, trail destroyed)
    - Monster hits player in wild area: Damage (lose HP, reset to safe area)
6. **Win Condition**: Collect all sentence words in correct order.
7. **Lose Condition**: HP reaches zero.

## 4. Core Gameplay Loop
1. Sentence translation displayed at top.
2. Multiple word orbs bounce around the map.
3. Player moves along borders, then cuts across to claim areas.
4. Player aims to "bag" the correct next word in their claim.
5. Success → Word added to sentence, area filled with color.
6. Complete sentence → Map fully revealed, victory.

## 5. Win/Lose Conditions
- **Victory:** Full sentence formed in correct order.
- **Defeat:** All HP lost.

## 6. XP & Scoring System
- **Base XP:** 1 XP per word.
- **Area Bonus:** +2 XP if >75% of map claimed.
- **Speed Bonus:** +2 XP if completed quickly.
- **Maximum XP:** 10.

## 7. Mechanics

### 7.1 Movement
- 4-way movement (Grid-based or free-form).
- Virtual DPad for control.

### 7.2 Trail Logic
- While in "wild" territory, player leaves a line trail.
- Trail must not cross itself.
- Returning to a safe boundary closes the polygon.

### 7.3 Territory Filling
- Use a flood-fill or polygon clipping algorithm to determine which side of the line to fill.
- Usually, the smaller side or the side WITHOUT the "core" monster is filled.
- In this variant, the side containing the *correct* word could be filled, but standard Qix logic is usually simpler (fill the side without the main enemy).

## 8. Technical Approach
- **Engine:** React + React-Konva.
- **State:** Pure state with `tickRealmCarver`.
- **Area Logic:** Grid-based occupancy map (e.g. 100x100 grid) for easy filling and collision detection.

## 9. Configuration

```typescript
export const REALM_CARVER_CONFIG = {
  gridSize: 100, // 100x100 logical grid
  gameWidth: 390,
  gameHeight: 600,
  
  player: {
    speed: 150,
    initialHp: 3,
  },
  
  monster: {
    speed: 80,
    count: 2,
  },
  
  word: {
    radius: 15,
  }
};
```
