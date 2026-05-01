# Castle Defense Start/End Screens

## Overview
Add a start screen and end screen for Castle Defense that match the visual/interaction pattern of Wizard vs Zombie (and align with other game screens like Potion Rush). The end screen must display XP earned as 1% of total score, rounded up to the nearest integer.

## Functional Requirements
1. **Start Screen**
   - Display game title and brief controls/instructions in the Wizard vs Zombie style.
   - Display a list of sentences that will be practiced.
   - Provide a clear primary CTA to start the game.
   - Prevent gameplay from starting until the CTA is used.

2. **End Screen**
   - Display final score.
   - Display XP earned as: `XP Earned: <ceil(totalScore * 0.01)>`.
   - Include a **Restart/Play Again** button.
   - Show a **performance breakdown** using Castle Defense's available stats (e.g., waves survived, enemies defeated, accuracy), matching the Wizard vs Zombie end screen pattern.

3. **XP Calculation**
   - XP = `ceil(totalScore * 0.01)` (round up to integer).
   - XP displayed as an integer with the label `XP Earned: {value}`.

## Non-Functional Requirements
- Follow existing UI patterns, typography, and layout conventions used in Wizard vs Zombie and Potion Rush for start/end screens.
- Keep components accessible and responsive on desktop and mobile.

## Acceptance Criteria
- When the game loads, a start screen appears and gameplay does not begin until the user clicks Start.
- Start screen includes a visible list of the practice sentences.
- On game end, the end screen appears showing:
  - Final score
  - XP line using `ceil(totalScore * 0.01)`
  - A performance breakdown section
  - A Restart button that resets the game
- Visual layout and tone align with Wizard vs Zombie's start/end screens.

## Out of Scope
- Changes to scoring rules or XP economy beyond the 1% calculation
- New art, sound effects, or new gameplay mechanics
