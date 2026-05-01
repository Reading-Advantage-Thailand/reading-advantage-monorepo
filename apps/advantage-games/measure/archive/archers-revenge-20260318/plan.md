# Implementation Plan: Archer's Revenge

This plan outlines the steps to build "Archer's Revenge" using **React-Konva (Canvas)** with strict TDD methodology.

---

## Phase 1: Setup & Infrastructure
**Assets Required:** None (can start immediately)

- [x] Task: Create configuration file `src/lib/games/archersRevengeConfig.ts` with all balance values
- [x] Task: Define game state types and interfaces in `src/lib/games/archersRevenge.ts`
- [x] Task: Create page route `src/app/[locale]/(student)/student/games/vocabulary/archers-revenge/page.tsx`
    - [x] Task: Create API route `src/app/api/v1/games/archers-revenge/vocabulary/route.ts`
    - [x] Task: Create API route `src/app/api/v1/games/archers-revenge/complete/route.ts`
    - [x] Task: Create `ArchersRevengeGame` container component with React-Konva Stage
    [~] Task: Measure - User Manual Verification 'Phase 1: Setup & Infrastructure'

---

## Phase 2: Core Game Logic
**Assets Required:** None (logic only)

- [x] Task: Implement `createArchersRevengeState()` initialization function
- [x] Task: Implement enemy formation generation (grid layout with vocabulary)
- [x] Task: Implement target word selection with shield-down assignment
- [x] Task: Implement game tick/update function (enemy movement, descent)
- [x] Task: Implement arrow shooting and collision detection
- [x] Task: Implement shield logic (correct hit = destroy, wrong hit = retaliate)
- [x] Task: Implement enemy retaliation (projectile spawning)
- [x] Task: Implement player damage and HP system
- [x] Task: Implement win condition (all enemies destroyed)
- [x] Task: Implement lose conditions (HP=0, enemies reach bottom)
- [x] Task: Measure - User Manual Verification 'Phase 2: Core Game Logic'

---

## Phase 3: Rendering
**Assets Required:** 
- [ ] /public/games/archers-revenge/player.png (archer sprite)
- [ ] /public/games/archers-revenge/enemy.png (enemy sprite)
- [ ] /public/games/archers-revenge/arrow.png (arrow sprite)
- [ ] /public/games/archers-revenge/projectile.png (enemy projectile)
- [ ] /public/games/archers-revenge/background.png (background image)

- [x] Task: Implement asset preloading
- [x] Task: Render player (archer) at bottom
- [x] Task: Render enemy formation with translation text
- [x] Task: Render shield-down visual indicator (glow/color)
- [x] Task: Render target word display at top
- [x] Task: Render arrows and projectiles
- [x] Task: Render HP, score, wave number HUD
- [x] Task: Measure - User Manual Verification 'Phase 3: Rendering'

---

## Phase 4: Input & Controls
**Assets Required:** None

- [x] Task: Implement tap/column selection for shooting
- [x] Task: Implement touch handling for mobile
- [x] Task: Implement keyboard controls for desktop (arrow keys + space)
- [x] Task: Ensure 44×44px minimum touch targets
- [x] Task: Implement fire rate limiting
- [x] Task: Measure - User Manual Verification 'Phase 4: Input & Controls'

---

## Phase 5: Game States & Flow
**Assets Required:** None (uses shared game screens)

- [x] Task: Integrate GameStartScreen with difficulty selection
- [x] Task: Implement wave transition (victory -> new wave)
- [x] Task: Integrate GameEndScreen with XP display
- [x] Task: Implement pause functionality
- [x] Task: Connect to game store for XP/results tracking
- [x] Task: Measure - User Manual Verification 'Phase 5: Game States & Flow'

---

## Phase 6: Polish & Balance
**Assets Required:** Optional sound effects

- [x] Task: Add visual feedback (hit effects, damage flash)
- [x] Task: Add combo streak display
- [x] Task: Implement sound effects (useSound hook)
- [x] Task: Balance tuning based on playtesting
- [x] Task: Register game in gameCards.ts
- [x] Task: Add cover image to /public/games/cover/
- [x] Task: Final manual verification all features
- [x] Task: Measure - User Manual Verification 'Phase 6: Polish & Balance'

---

## Configuration Reference

```typescript
const ARCHERS_REVENGE_CONFIG = {
  playerHP: { easy: 5, normal: 3, hard: 2 },
  arrowSpeed: 400,
  fireRate: 500,
  enemyRows: { easy: 2, normal: 3, hard: 4 },
  enemyColumns: 5,
  enemyMoveSpeed: { easy: 20, normal: 35, hard: 50 },
  enemyDescendSpeed: { easy: 10, normal: 15, hard: 25 },
  enemyProjectileSpeed: 200,
  targetChangeInterval: { easy: 10000, normal: 7000, hard: 5000 },
  basePointsPerEnemy: 100,
  comboMultiplier: 0.1,
  accuracyBonus: 50,
  enemySpacing: { x: 70, y: 50 },
  enemySize: { width: 60, height: 40 },
  playerY: 750,
  formationTopMargin: 100,
}
```

## Technical Notes
- Follow architecture patterns from existing Konva games (DragonFlight, WizardZombie)
- Use pure state object with tick function for game logic
- Mobile-first: test on 390×844 viewport
- All text minimum 16px, touch targets minimum 44×44px
- Use shared GameStartScreen and GameEndScreen components

## File Structure
```
src/app/[locale]/(student)/student/games/vocabulary/archers-revenge/page.tsx
src/components/games/vocabulary/archers-revenge/ArchersRevengeGame.tsx
src/lib/games/archersRevenge.ts
src/lib/games/archersRevengeConfig.ts
src/app/api/v1/games/archers-revenge/vocabulary/route.ts
src/app/api/v1/games/archers-revenge/complete/route.ts
public/games/archers-revenge/*.png
```
