# Specification: RPG Battle Vocabulary Game

## Overview
A 2D side-view turn-based RPG vocabulary game where players engage in a single-encounter battle. Combat actions (weapons/spells) are selected by typing the correct translation of their labels. The game prioritizes learning by making difficult or missed words more powerful and rewarding efficient play with XP.

## Functional Requirements

### 1. Combat System
- **Turn-Based Loop:** Player turn followed by Enemy turn.
- **Action Selection:** 
    - Display 3-4 available actions (e.g., "Fireball", "Sword Slash").
    - Each action has a label (the translation target).
    - To perform an action, the player must type the correct translation.
- **Dynamic Difficulty:**
    - Words the player knows well (high accuracy) appear less frequently and are assigned to lower-damage attacks.
    - New or missed words appear more frequently and are assigned to higher-damage "Power Attacks."
- **Feedback Loop:**
    - On incorrect input: Display the correct translation for 2 seconds before allowing the next attempt.
    - On correct input: Execute the animation and deal damage to the enemy.

### 2. UI/UX Elements
- **Perspective:** 2D Side-view (Player on one side, Enemy on the other).
- **Sprites:** 3×3 Pose Sheet system (Idle, Casting, Attack, Power Attack, Hurt, Miss, Defend, Victory, Defeat). See `asset-spec.md` for grid details.
- **HP Bars:** Dynamic health indicators for both combatants.
- **Action Menu:** The input area where translations are typed to trigger attacks.
- **Battle Log:** A scrolling text area describing actions (e.g., "You cast Fireball! Slime takes 12 damage.")
- **Results Screen:** Displays "Victory" or "Defeat," the total XP earned, and accuracy statistics.

### 3. XP and Progression
- **Reward Range:** 1-10 XP per session.
- **Calculation Factors:**
    - **Battle Efficiency:** Higher XP for finishing with more health and in fewer turns.
    - **Streak Bonus:** Bonus XP for consecutive correct translations without mistakes.

## Non-Functional Requirements
- **Responsive Design:** Must be playable on desktop and mobile.
- **Performance:** Smooth transitions between turns and snappy feedback for typing.

## Acceptance Criteria
- [ ] Player can defeat an enemy by correctly typing translations.
- [ ] Enemy can defeat the player if they fail too many prompts or take too long.
- [ ] Incorrect inputs show the correct word for 2 seconds.
- [ ] XP is awarded correctly based on efficiency and streaks.
- [ ] The game integrates with the existing `useGameStore` and `xp.ts` logic where applicable.

## Out of Scope (Future Development)
- **Gauntlet Mode:** Facing multiple enemies in a row.
- **Endless Waves:** Fighting until defeat.
- **Inventory/Items:** Using items during battle.
- **Multiple Characters:** Party-based combat.
