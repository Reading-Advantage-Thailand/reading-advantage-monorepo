# Spec: Magic Defense Refactor

## Overview
Transform the prototype into "Magic Defense," an RPG-themed typing game where a magician protects castles from falling monsters/dark spells. Restructure the app to support multiple games.

## Requirements

### Project Structure
- **Multi-game Architecture:**
    - Move current game logic to `src/app/games/magic-defense/`.
    - Create a Main Menu at `src/app/page.tsx` with navigation to the game.

### Theme & Assets (RPG Style)
- **Visuals:** Use Lucide icons and Tailwind/CSS to create:
    - **Castles:** Represent player health. Layout: Left Castle, Wizard (Center), Right Castle.
    - **Enemies:** Skulls, Bombs, or Meteors (replaces Missiles).
    - **Magician:** Central avatar casting spells.
- **Feedback:**
    - **Magic Bolts:** Projectile animation from the Wizard/Castles to the target Enemy upon firing.
    - **Explosions:** Visual particle/scaling effect when words are typed correctly and hit.
    - **Damage:**
        - **Health System:** 3 Health Points.
        - **Destruction Order:** Right Castle (at 2 HP), Left Castle (at 1 HP), Wizard (at 0 HP -> Game Over).

### Gameplay Mechanics
- **Shooting Mechanic:** Player types the word and presses **SPACE** to fire the spell.
    - *Input:* Text input + Spacebar trigger.
- **Difficulty:** Initial spawn rate ~5s, fall duration ~15s.
- **XP Calculation:** `(Score / 10) * Accuracy`.

### HUD
- Display Score prominently.
- Display Accuracy.
- Visual Health (The Castles themselves).

## Technical Details
- **Libraries:** Continue using `framer-motion` for animations and `lucide-react` for icons.
- **State:** Ensure `useGameStore` resets correctly when entering/leaving the game.