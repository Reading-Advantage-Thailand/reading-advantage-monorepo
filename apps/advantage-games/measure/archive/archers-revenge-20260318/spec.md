# Game Design Document: Archer's Revenge

## 1. Overview
**Title:** Archer's Revenge
**Genre:** Shooter / Educational
**Platform:** Web (Mobile-first, Portrait)
**Core Concept:** Space Invaders-style vocabulary game where a formation of word-enemies descends. Only the enemy matching the target translation has their shield down and can be destroyed. Shooting the wrong enemy causes them to shoot back, damaging the player.

## 2. Platform Requirements
- **Primary:** Mobile (portrait orientation)
- **Viewport:** 390×844 reference, responsive scaling
- **Touch targets:** Minimum 44×44px
- **Text size:** Minimum 16px for readability
- **One-hand play:** Optimized for thumb reach
- **Desktop:** Supported but secondary priority

## 3. Game Flow
1. **Start Screen:** Show title, difficulty selection, "Play" button
2. **Gameplay:** Enemies descend in formation, target word displayed, player shoots
3. **Wave Complete:** All enemies destroyed → new wave with new vocabulary
4. **Game Over:** HP reaches 0 or enemies reach bottom
5. **End Screen:** Show score, accuracy, XP earned

## 4. Core Gameplay Loop

### Wave Structure
1. Formation of enemies spawns at top (e.g., 5×4 grid = 20 enemies)
2. Target word displayed at top (e.g., "แมว" / "cat")
3. Each enemy displays a different translation from the vocabulary set
4. **One enemy has shield DOWN** (matches target) - this is the valid target
5. Player taps/column to shoot arrows upward
6. Hit correct enemy → destroyed, points gained
7. Hit wrong enemy → enemy shoots back, player takes damage
8. Formation slowly descends
9. Clear all enemies → next wave with new vocabulary
10. Enemies reach bottom → game over

### Shooting Mechanics
- Player has a bow at the bottom
- Tap a column to shoot an arrow straight up
- Arrow travels upward, hits first enemy in that column
- Only shield-down enemies can be destroyed
- Shield-up enemies block arrows and retaliate

## 5. Win/Lose Conditions
- **Victory (per wave):** Destroy all enemies in formation
- **Defeat:** 
  - Player HP reaches 0
  - Enemies reach the bottom of the screen

## 6. XP & Scoring System
- **Base XP:** Based on number of enemies destroyed
- **Accuracy Bonus:** Higher accuracy = more XP
- **Speed Bonus:** Faster wave completion = bonus XP
- **Combo Bonus:** Consecutive correct hits increase multiplier
- **Formula:** `XP = floor(baseXP * accuracyMultiplier * speedMultiplier * comboMultiplier)`

## 7. Vocabulary Integration
- **Input:** VocabularyItem[] with `{ term: string, translation: string }`
- **Display:** Each enemy displays a translation; target word (term) shown at top
- **Testing:** Player must identify which enemy has the correct translation
- **Educational Goal:** Rapid recognition of vocabulary under pressure

### Vocabulary Per Wave
- Wave 1: 5 unique words (5×1 formation)
- Wave 2: 10 unique words (5×2 formation)
- Wave 3+: 15-20 unique words (5×3 or 5×4 formation)
- Words repeat across waves for reinforcement

## 8. Mechanics

### Enemy Formation
- Grid layout: 5 columns × variable rows
- Each enemy has:
  - Position (x, y)
  - Translation text
  - Shield state (up/down)
  - Sprite/image
- Formation moves side-to-side and slowly descends

### Shield System
- Only ONE enemy per wave has shield DOWN (correct answer)
- Shield-down enemy: visually distinct (glowing, different color)
- Shield-up enemies: cannot be destroyed, retaliate when shot

### Retaliation
- Wrong enemy hit → enemy flashes, shoots projectile at player
- Projectile travels downward
- Player hit → lose 1 HP
- Player starts with 3-5 HP (difficulty dependent)

### Target Display
- Target word (term) shown prominently at top
- Changes when correct enemy is destroyed
- Timer shows how long until target changes (optional: every 5-10 seconds)

### Difficulty Scaling
| Difficulty | HP | Enemy Speed | Target Change | Formation Size |
|------------|-----|-------------|---------------|----------------|
| Easy | 5 | Slow | 10s | 5×2 |
| Normal | 3 | Medium | 7s | 5×3 |
| Hard | 2 | Fast | 5s | 5×4 |

## 9. Visual Style
- **Theme:** Fantasy archer defending against word monsters
- **Color Palette:** 
  - Background: Dark dungeon/sky gradient
  - Player: Warm colors (brown/orange)
  - Enemies: Cool colors (purple/blue/green)
  - Shield-down enemy: Bright glow (gold/green)
  - UI: Clean white text on dark panels
- **Effects:**
  - Arrow trail effect
  - Hit explosion particles
  - Shield flash on wrong hit
  - Screen shake on player damage
  - Victory confetti on wave clear

## 10. Technical Approach
- **Engine:** React + React-Konva (Canvas)
- **State:** Pure state object with tick/update functions
- **Architecture:** Follow existing patterns (DragonFlight, WizardZombie)
- **Game Loop:** useInterval hook at 60fps target

### State Structure
```typescript
interface ArchersRevengeState {
  status: 'idle' | 'playing' | 'paused' | 'victory' | 'defeat'
  hp: number
  score: number
  combo: number
  wave: number
  targetWord: VocabularyItem
  enemies: Enemy[]
  arrows: Arrow[]
  enemyProjectiles: Projectile[]
  vocabulary: VocabularyItem[]
  usedVocabulary: VocabularyItem[]
}
```

## 11. Configuration
```typescript
const ARCHERS_REVENGE_CONFIG = {
  // Player
  playerHP: { easy: 5, normal: 3, hard: 2 },
  arrowSpeed: 400,
  fireRate: 500, // ms between shots
  
  // Enemies
  enemyRows: { easy: 2, normal: 3, hard: 4 },
  enemyColumns: 5,
  enemyMoveSpeed: { easy: 20, normal: 35, hard: 50 },
  enemyDescendSpeed: { easy: 10, normal: 15, hard: 25 },
  enemyProjectileSpeed: 200,
  
  // Target
  targetChangeInterval: { easy: 10000, normal: 7000, hard: 5000 },
  
  // Scoring
  basePointsPerEnemy: 100,
  comboMultiplier: 0.1,
  accuracyBonus: 50,
  
  // Layout
  enemySpacing: { x: 70, y: 50 },
  enemySize: { width: 60, height: 40 },
  playerY: 750,
  formationTopMargin: 100,
}
```

## 12. Future Scope (Post-MVP)
- Power-ups (shield, rapid fire, bomb)
- Different enemy types with behaviors
- Boss waves
- Local high score leaderboard
- Sound effects and music
- Particle effects for hits
- Combo streak visual feedback

## 13. Out of Scope (MVP)
- Multiplayer
- Account progression
- Unlockable content
- Complex enemy AI
- Story mode
