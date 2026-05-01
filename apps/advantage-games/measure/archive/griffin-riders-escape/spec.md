# Game Design Document: Griffin Rider's Escape

## 1. Overview
**Title:** Griffin Rider's Escape
**Genre:** 3D Endless Runner / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Behind-the-back 3D-style endless runner where a Griffin rider flies through magical gates in 3 lanes. Each gate displays a word from a target sentence. Players must switch lanes to fly through the correct gate in the correct sentence order while dodging obstacles.

## 2. Platform Requirements
- **Primary**: Mobile (portrait orientation)
- **Viewport**: 390×844 reference, responsive scaling
- **Touch targets**: Full-screen horizontal swipes or lane taps
- **Text size**: Minimum 18px on gates for readability at distance
- **One-hand play**: Optimized for thumb swipes (lane switching)
- **Desktop**: Arrow keys or A/D for lane switching

## 3. Game Flow
1. **Start Screen** → Show vocabulary/sentences, difficulty selection (Route choice)
2. **Gameplay** → Forward-moving runner, switch lanes to hit correct gates
3. **Victory** → Complete all sentences in the session, earn XP
4. **Defeat** → Health reaches zero (hit obstacles or wrong gates), show results
5. **End Screen** → Score breakdown, XP earned, restart option

## 4. Core Gameplay Loop
1. Sentence translation displayed at the top of the screen.
2. The Griffin rider moves forward automatically.
3. Gates appear in the distance across 3 lanes (Left, Center, Right).
4. Each gate shows a word; some are correct next words, others are decoys or wrong sequence words.
5. Player swipes left/right to change lanes.
6. Passing through the correct gate: Word collected, Griffin gains a small speed boost/sparkle effect.
7. Passing through a wrong gate or hitting an obstacle: Lose 1 heart, Griffin stumbles (temporary red flash).
8. Loop continues until the sentence is complete.
9. After a short "clear path" transition, the next sentence begins.

## 5. Win/Lose Conditions
- **Victory:** Complete all sentences in the session.
- **Defeat:** Lose all 3 hearts (Health reaches zero).

## 6. XP & Scoring System
- Base XP: 1-10 based on accuracy and completion.
- Formula: `Math.floor(sentencesCompleted * 2 + correctWords * accuracy)`
- Accuracy = `correctHits / (correctHits + wrongHits + obstacleHits)`

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with { term: string, translation: string }
- **Display:** Translation shown in a UI banner; gates show individual words from the term.
- **Testing:** Player demonstrates word order knowledge by navigating to the correct gate.
- **Educational Goal:** Sentence structure, word recognition, and reading speed under pressure.

## 8. Mechanics

### 8.1 3D Perspective (Pseudo-3D)
- Use 2D scaling and Y-positioning to simulate depth in React-Konva.
- Objects (gates, obstacles) start small near the "horizon" (center-top) and scale up as they move toward the "bottom" of the screen.
- Griffin rider stays near the bottom-center but shifts horizontally between 3 lanes.

### 8.2 Lane System
- 3 lanes: Left, Center, Right.
- Smooth transition between lanes (tweening).
- Input: Swipe left/right or Tap lane or Arrow keys.

### 8.3 Magical Gates
- Rectangular or arch-shaped gates spanning a lane.
- Text centered on the gate.
- Gates for the same "wave" appear at the same distance (Z-depth).

### 8.4 Obstacles
- Occasionally, a lane is blocked by a "Storm Cloud" or "Harpy".
- Collision with an obstacle costs 1 heart.

### 8.5 Health System
- 3 Hearts (Lives).
- Visual heart icons in the UI.

### 8.6 Difficulty Scaling
- **Fledgling Path (Easy)**: Slow speed, fewer decoy words, short sentences (3-4 words).
- **Skies of Valor (Normal)**: Medium speed, 5-6 word sentences.
- **Storm Rider (Hard)**: Fast speed, more obstacles, 7-8 word sentences.

## 9. Visual Style
- **Theme:** High-altitude fantasy flight.
- **Color Palette:** Sky blues, sunset oranges, white clouds, golden magical gates.
- **Background:** Scrolling clouds at different speeds (parallax) to enhance the sense of forward motion.
- **Effects:** 
  - Wind streaks/lines moving past the Griffin.
  - Sparkle burst when hitting the correct gate.
  - Screen shake and red vignette on hit.

## 10. Technical Approach
- **Engine:** React + React-Konva (Canvas).
- **State Management:** Functional state updates via `useInterval` or `useGameLoop`.
- **Z-Depth Logic:** 
  - `posZ` from 1.0 (far) to 0.0 (near).
  - `scale = 1.0 / posZ` (or a more linear mapping for Konva).
  - `screenY = horizonY + (posZ_inv * verticalSpan)`.
- **Collision Detection:** Check `posZ` near 0 and `currentLane === objectLane`.

## 11. Configuration

```typescript
const GRIFFIN_RIDERS_ESCAPE_CONFIG = {
  laneWidth: 120,
  horizonY: 200,
  playerY: 700,
  initialLives: 3,
  baseSpeed: 0.015, // Z-decrement per tick
  
  difficulties: {
    easy: { speedMult: 0.8, obstacleFreq: 0.1, maxWords: 4 },
    normal: { speedMult: 1.0, obstacleFreq: 0.2, maxWords: 6 },
    hard: { speedMult: 1.3, obstacleFreq: 0.3, maxWords: 8 }
  }
};
```
