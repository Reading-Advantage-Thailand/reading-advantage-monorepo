# Game Design Document: Wizard vs Zombie (Health Pickup)

## 1. Overview
**Title:** Wizard vs Zombie
**Genre:** Top-Down Survival / Arcade / Educational
**Platform:** Web (Desktop/Mobile)
**Core Concept:** A high-pressure survival game where the player controls a wizard who must collect "Healing Orbs" (correct vocabulary translations) to stay alive while dodging hordes of zombies.

## 2. Core Gameplay Loop
1.  **Survive:** The player starts in the center. Zombies spawn from 4 designated **Gates** (North, South, East, West).
2.  **Prompt:** A target word appears ("Find: Banana").
3.  **Search:** Three Orbs spawn in random **Quadrants** of the map.
4.  **Action:**
    *   **Correct Orb:**
        *   **Heals** the wizard (+10 HP).
        *   **Grants 1 Shockwave Charge**.
        *   Orbs vanish, and a new round starts immediately.
    *   **Incorrect Orb:**
        *   **Reshuffle Penalty:** All orbs vanish and immediately **respawn in different quadrants**.
        *   This forces the player to traverse the map again, exposing them to zombie attacks (Time Penalty).
5.  **Defense:**
    *   Player can cast **Shockwave** (if charged) to push all nearby zombies back significantly (creating space to escape).
6.  **Defeat:** HP reaches 0.

## 3. Mechanics

### 3.1 Player Character (Wizard)
*   **Controls:**
    *   **Desktop:** Arrow Keys / WASD to move. Space/Enter to Cast Shockwave.
    *   **Mobile:** On-screen **D-Pad** (Left/Right/Up/Down) + **Cast Button**.
*   **Stats:** HP (Max 100), Speed, Shockwave Charges (Max 3?).

### 3.2 Enemies (Zombies)
*   **Spawning:**
    *   Spawn only at the 4 Gates.
    *   Rate increases over time (e.g., Round 1: 1/sec, Round 10: 3/sec).
    *   Max active zombies capped (e.g., 50) to preserve performance.
*   **Behavior:** Seek Player.
*   **Collision:** Contact = Damage (e.g., -10 HP) + brief Invulnerability (0.5s) to prevent insta-death.

### 3.3 Vocabulary Orbs (The Objective)
*   **Placement:** Random distribution across 4 quadrants (NW, NE, SW, SE).
*   **Reshuffle:** On wrong pick, new positions are chosen ensuring they are *distant* from the player's current position if possible.

### 3.4 Shockwave (Active Spell)
*   **Trigger:** Manual input (Space/Button).
*   **Cost:** 1 Charge.
*   **Effect:** Pushes all zombies within a large radius **away** from the player (vector calculation). Push distance should be significant (e.g., 200-300px) to provide a safety window.

### 3.5 Camera & HUD
*   **Camera Behavior:**
    *   **Fit:** If the viewport > game world, center the game world.
    *   **Follow:** If the game world > viewport, the camera must follow the player, keeping them centered.
    *   **Clamping:** The camera should clamp to the edges of the game world so the player doesn't see "void" beyond the boundaries.
*   **Off-screen Indicators:**
    *   When an Orb is outside the visible viewport, a **Directional Indicator** (arrow/chevron) must appear at the edge of the screen pointing towards it.
    *   The indicator must display the **Text** of the orb (so the player knows if it's the target word without traveling there).
    *   Visible orbs do *not* have indicators.
*   **HUD:**
    *   Must be designed to not obscure critical gameplay elements (orbs, player).
    *   Use transparent backgrounds or "Safe Zones" on the edges.

## 4. Visual Style & Assets
*   **View:** Top-down, 2D.
*   **Assets:** (See `asset-spec.md` for detailed contract)
    *   **Wizard:** 3x3 Sprite Sheet (Idle, Walk, Cast).
    *   **Zombie:** 3x3 Sprite Sheet (Walk, Stagger).
    *   **Orbs:** Glowing spheres with text overlay.
    *   **Environment:** Tiled floor, Arena boundaries.
    *   **Effects:** Shockwave ring, Hit flash.

## 5. Technical Constraints
*   **Engine:** React + React-Konva (Canvas).
    *   **Reasoning:** High performance required for "Horde" mechanics (many moving sprites) and continuous collision detection.
    *   **Architecture:** Modeled after `DragonFlightGame` (Game Loop in pure TS logic, Canvas for rendering).
*   **State Management:** Pure State Object (processed by `advanceTime` function) + React State (for rendering). This differs slightly from Zustand but allows for a detached game loop logic (like `dragonFlight.ts`).

## 6. Progression & Scoring
*   **XP Calculation:** Standard formula: `XP = Correct Answers * Accuracy`.
*   **Difficulty:**
    *   Zombie spawn rate increases over time.
    *   Zombie speed increases slightly over time.

## 7. Future Scope (Post-MVP)
*   Power-ups (Speed boost, Freeze).
*   Different Zombie types.
*   Unlockable Wizards.
