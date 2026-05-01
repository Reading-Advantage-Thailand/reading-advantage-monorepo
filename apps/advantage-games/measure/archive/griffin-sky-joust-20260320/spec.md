# Game Design Document: Griffin Sky-Joust

## 1. Overview
**Title:** Griffin Sky-Joust
**Genre:** Aerial Combat / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Control a griffin rider using momentum-based flight to joust with enemy knights. Collect words by striking down enemies from above in the correct sentence order.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Minimum 44×44px (Flap button and screen tap)
- **Text size**: Minimum 18px for readability on moving entities
- **One-hand play**: Optimized for thumb taps

## 3. Game Flow
1. **Start Screen**: Show game title, difficulty selection (gravity/momentum), opponent selection (enemy flight pattern)
2. **Gameplay**: Player starts on a platform or mid-air. Flap to fly.
3. **Combat**: Enemy knights fly around carrying word orbs.
4. **Collection**: Player must collide with the correct enemy knight from ABOVE (higher Y coordinate) to strike them down and collect their word.
5. **Collision Rules**:
    - Above enemy + Correct word = Victory (Collect word, enemy falls)
    - Above enemy + Wrong word = Penalty (Lose HP, enemy respawns)
    - Below enemy (any word) = Penalty (Lose HP, player knocked back)
6. **Win Condition**: Collect all words in correct order.
7. **Lose Condition**: Health reaches zero.
8. **End Screen**: Show XP earned, accuracy, time taken.

## 4. Core Gameplay Loop
1. Translation prompt displayed at top.
2. Multiple enemy knights fly in the arena carrying different words.
3. Player flaps (upward impulse) to gain altitude and drifts horizontally.
4. Player aims to land on the correct knight from above.
5. Success → Word added to sentence, next word becomes target.
6. Failure → Take damage, brief invincibility.
7. Complete sentence → All enemies vanish, victory screen.

## 5. Win/Lose Conditions
- **Victory:** All words of the sentence collected in the correct sequence.
- **Defeat:** Health reaching zero or falling off the bottom (optional, maybe wrap around).

## 6. XP & Scoring System
- **Base XP:** 1 XP per correct word collected.
- **Accuracy Bonus:** +2 XP if no mistakes.
- **Survival Bonus:** +2 XP if health > 50%.
- **Maximum XP:** 10 (capped).

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] (sentences).
- **Display:** Translation at top; words on enemy shields/orbs.
- **Testing:** Must hit enemies in sentence order.

## 8. Mechanics

### 8.1 Flight Physics (Momentum)
- **Flap**: Add upward velocity (VY).
- **Gravity**: Constant downward acceleration.
- **Horizontal Drift**: Player has horizontal velocity (VX) that persists.
- **Air Friction**: Slow decay of velocity over time.
- **Wrap-around**: Screen edges wrap horizontally (leaving right enters left).

### 8.2 Enemy AI
- **Patrol**: Move horizontally, bouncing off walls.
- **Lurker**: Stay at specific altitudes, moving slowly.
- **Seeker**: Gently move toward or away from player altitude.

### 8.3 Jousting Logic
- Collision detection between player and enemy.
- Check `player.y < enemy.y` (in screen coordinates, where Y increases downwards, this means player is HIGHER).
- Wait, in Konva Y increases downwards. So player is higher if `player.y < enemy.y`.

## 9. Visual Style
- **Theme:** High-altitude sky arena with floating islands.
- **Colors:**
    - Sky: Cyan to Deep Blue gradient.
    - Clouds: Fluffy white/gray.
    - Griffin: Golden/Brown.
    - Enemy: Dark armor with red/purple accents.
- **Effects:**
    - Feathers on flap.
    - Sparkles on correct hit.
    - Screen shake on damage.

## 10. Technical Approach
- **Engine:** React + React-Konva (Canvas).
- **Loop:** `requestAnimationFrame` for 60 FPS physics.
- **State:** Pure state object with `tickGriffinSkyJoust` function.
- **Physics**: Simple Euler integration (`pos += vel * dt`, `vel += accel * dt`).

## 11. Configuration

```typescript
export const GRIFFIN_SKY_JOUST_CONFIG = {
  gameWidth: 390,
  gameHeight: 700,
  
  physics: {
    gravity: 800,
    flapImpulse: -350,
    horizontalSpeed: 150,
    friction: 0.98,
    maxVY: 600,
  },
  
  player: {
    radius: 25,
    initialHp: 3,
  },
  
  enemy: {
    radius: 30,
    speed: 100,
  },
  
  xp: {
    perWord: 1,
    accuracyBonus: 2,
    survivalBonus: 2,
    maxXP: 10
  }
};
```
