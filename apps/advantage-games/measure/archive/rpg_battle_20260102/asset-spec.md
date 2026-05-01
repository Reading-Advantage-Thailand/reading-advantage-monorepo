# Asset Specification: 3×3 RPG Pose Sheet

This document defines the structure and usage of the 3×3 pose sheet for the RPG Battle Vocabulary Game.

## Grid Layout (3×3)

| Position | Pose Name | Game State | Description |
|----------|-----------|------------|-------------|
| **(1,1)** | **Idle / Ready** | Waiting for input | Neutral combat stance. |
| **(1,2)** | **Casting / Input** | Player typing | One hand raised or weapon glowing. |
| **(1,3)** | **Basic Attack** | Correct easy word | Forward strike or cast. |
| **(2,1)** | **Power Attack** | Correct hard word | Dramatic pose, high energy. |
| **(2,2)** | **Hurt / Hit** | Enemy attack lands | Recoil backward. |
| **(2,3)** | **Miss / Fail** | Incorrect input | Brief hesitation or slump. |
| **(3,1)** | **Defend / Brace**| Anticipation | Guarded stance. |
| **(3,2)** | **Victory** | Enemy defeated | Triumphant but controlled stance. |
| **(3,3)** | **Defeat** | Player HP = 0 | Semi-collapsed or buckling. |

## Orientation Rules
- **Default Orientation:** All characters in the pose sheets face **left**.
- **Rendering Logic:** 
    - **Player:** Must be flipped horizontally (scaled -1 on X) to face right toward the enemy.
    - **Enemy:** Stays in default orientation (facing left) toward the player.

## Paths and Naming
- **Directory:** `public/games/rpg-battle/`
- **Naming Convention:** `[character_name]_pose_sheet_3x3.[ext]` (e.g., `hero_pose_sheet_3x3.webp`)
