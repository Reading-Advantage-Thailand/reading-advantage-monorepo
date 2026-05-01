# Track Specification: Castle Defense Enemy & Player Sprite Implementation

## 1. Overview
This track focuses on replacing the temporary placeholder assets for the player and enemies in the "Castle Defense" game with high-quality, animated sprite sheets. This enhancement will significantly improve the visual fidelity and game feel.

The implementation will introduce a standardized 3x3 sprite sheet system for handling animations (Idle, Walk, Attack, etc.) across multiple entity types (Player, Goblin, Orc, Troll).

## 2. Goals
*   **Visual Upgrade:** Replace static placeholders with animated sprites for the Player, Goblin, Orc, and Troll.
*   **Unified Animation System:** Implement a reusable logic for handling 3x3 pose sheets where rows represent states (Walk, Attack, Death) and columns represent animation frames.
*   **Entity Variety:** Introduce distinct visual assets for Goblins, Orcs, and Trolls, preparing the game logic to spawn these different enemy types.

## 3. Functional Requirements

### 3.1. Asset Management
*   **Player Asset:** Use `player_3x3_pose_sheet.png` (already present in `public/games/castle-defense/`).
*   **Enemy Assets:**
    *   Verify and use existing `goblin_3x3_pose_sheet.png`.
    *   Verify and use existing `orc_3x3_pose_sheet.png`.
    *   Verify and use existing `troll_3x3_pose_sheet.png`.
*   **Sprite Logic:** All assets conform to a 3x3 grid layout.

### 3.2. Animation Logic (3x3 Grid)
*   **Row 1 (Walk/Idle):** Used for movement and idle loops.
    *   *Note:* The user specified "Walk / Idle – Facing South" for Row 1. Logic should adapt to use this for general movement if directional sprites aren't available for all 4 directions, or flip the sprite horizontally for East/West if applicable.
*   **Row 2 (Attack/Action):** Used for attack animations (e.g., when an enemy reaches a tower/base or a player attacks).
    *   *Column 1:* Attack Wind-up
    *   *Column 2:* Hit Reaction
    *   *Column 3:* Block/Brace (Optional, maybe for specific enemies)
*   **Row 3 (Death/Special):**
    *   *Column 1:* Death (Falling)
    *   *Column 2:* Death (Grounded/Corpse)
    *   *Column 3:* Elite/Special Variant
*   **Player Specifics:**
    *   The user noted the Player sheet might follow a slightly different pattern based on *Wizard vs Zombie* logic (Row 1: Idle, Row 2: Walk, Row 3: Attack).
    *   *Requirement:* Inspect the player asset visually (or via trial implementation) to confirm its layout. If it differs from the enemy standard, the animation component must handle "Player" and "Enemy" configurations separately.

### 3.3. Game Logic Integration
*   **Enemy Spawning:** Update the enemy spawning logic to select from the three available types (Goblin, Orc, Troll).
    *   *Scaling:* (Optional for this track, but good to have) Assign different stats (HP, Speed) to different enemy types if easy to implement, otherwise just visual variety is acceptable for now.
*   **State Mapping:**
    *   Map game states (Moving, Attacking, Dying) to the correct sprite sheet rows.
    *   Ensure the death animation plays once and then stays on the "Corpse" frame (Row 3, Col 2) before the entity is removed.

## 4. Non-Functional Requirements
*   **Performance:** Sprite rendering should remain performant on canvas (React-Konva).
*   **Maintainability:** The sprite rendering component should be reusable or configurable for different entity types.

## 5. Acceptance Criteria
*   [ ] The Player character is rendered using `player_3x3_pose_sheet.png` and animates correctly (Idle, Walk, Attack).
*   [ ] Goblins, Orcs, and Trolls are rendered using their respective `_3x3_pose_sheet.png` files.
*   [ ] Enemies spawn with variety (not just one type).
*   [ ] Enemies animate correctly:
    *   Walk loop while moving.
    *   Attack animation when engaging a target.
    *   Death animation plays correctly upon defeat.
*   [ ] No visual glitches (flickering, incorrect frames) during state transitions.

## 6. Out of Scope
*   Complex directional animations (e.g., separate North/South/East/West sheets) beyond what is available in the 3x3 grid (flipping X is allowed).
*   New gameplay mechanics (e.g., specific Troll regeneration abilities) - strictly visual and basic stat differences only.
