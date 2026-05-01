# Specification: RPG Battle Selection Scene

## Overview
Add a pre-battle selection flow to RPG Battle that lets players choose their hero, battle location, and enemy. Selections are made each battle, cannot be reversed once confirmed, and flow directly into the existing battle scene. Enemy choice scales HP, damage range, and XP rewards.

## Functional Requirements

### 1. Selection Flow
- **Order:** Character -> Location -> Enemy -> Start battle.
- **UI Pattern:** Modal-based flow inside `/games/rpg-battle` (no route change).
- **Selection Visuals:** Each option includes a static thumbnail image (hero sprite, location background, enemy sprite).
- **No Back Out:** Once the player confirms a step, they cannot return to earlier steps.
- **Per-Battle Reset:** Selection state resets at the start of each battle or rematch.

### 2. Character Selection
- **Options:** Male hero, Female hero.
- **Gameplay Impact:** Cosmetic only (no stat or ability differences).
- **Visuals:** Show the hero sprite for each option.

### 3. Location Selection
- **Options:** Forest Clearing, Ruined Road, Magic Arena, Throne Hall.
- **Gameplay Impact:** Cosmetic only (background and mood).
- **Visuals:** Show a background thumbnail for each location.
- **Mobile Portrait Behavior:** Show a centered slice of the background (no distortion). Use center-crop behavior so the middle of the image remains visible.

### 4. Enemy Selection
- **Options:** Slime, Goblin, Spectre, Elemental.
- **Multipliers:**
  - Slime: 0.5
  - Goblin: 1.0
  - Spectre: 1.5
  - Elemental: 2.0
- **Selection Stats:** Display the computed HP and XP values (e.g., HP 50/100/150/200 and XP up to 5/10/15/20).

### 5. Stat Scaling
- **Enemy HP:** Base enemy HP is multiplied by the selected enemy multiplier.
- **Enemy Damage:** Enemy damage uses a random range. The **upper bound** of the range is multiplied by the selected enemy multiplier to create a stronger "final boss" feel. Lower bound stays at the base value.
- **XP:** Base XP is calculated using the existing RPG Battle XP formula (1-10). The final XP is `round(baseXp * enemyMultiplier)` and can exceed 10 (e.g., 5/10/15/20 for a base 10).

### 6. Results and Feedback
- **Results Screen:** Shows final XP (after multiplier) and uses existing win/lose messaging.
- **Audio:** No new sound effects required.

## Non-Functional Requirements
- **Responsive Design:** Must remain playable on desktop and mobile.
- **Performance:** Selection modals should not cause layout jank or slow transitions.
- **Assets:** New backgrounds live in the public assets folder and are used by location selection.

## Acceptance Criteria
- [ ] Player must select character, location, and enemy before the battle starts.
- [ ] Selections are enforced in order and cannot be reversed once confirmed.
- [ ] Character choice is cosmetic only.
- [ ] Location choice changes the background; no gameplay changes.
- [ ] Enemy choice multiplies enemy HP, increases enemy damage max range, and multiplies XP.
- [ ] Final XP can exceed 10 based on the enemy multiplier.
- [ ] Mobile portrait view shows a centered background slice without distortion.

## Out of Scope (Future Development)
- Optional enemy abilities or special behaviors.
- Difficulty presets beyond the enemy multiplier system.
- Additional character classes or equipment.
