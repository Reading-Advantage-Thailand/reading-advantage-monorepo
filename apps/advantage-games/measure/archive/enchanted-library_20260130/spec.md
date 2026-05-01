# Spec: Enchanted Library Vocabulary Game

## Overview

Enchanted Library is a primary-school-friendly vocabulary learning game where players control a student wizard collecting magic books in a haunted library. The game adapts the Wizard vs Zombie game mechanics for younger audiences with a more approachable theme and adjusted gameplay.

## Functional Requirements

### Core Gameplay
- **Top-down view**: 800×600 pixel game arena (matching Wizard vs Zombie dimensions)
- **Player controls**: 8-directional movement (WASD/arrow keys) as a student wizard character
- **Win condition**: Collect all vocabulary words correctly 2 times each, then game ends with final score
- **Visual theme**: Bright, colorful cartoon style with friendly characters appropriate for primary school

### Book Collection (Vocabulary Learning)
- **4 magic books** appear on screen at any time (1 correct answer, 3 decoys)
- **Target word** displayed prominently at top of screen
- Books show translation labels beneath them
- **Correct book collection**:
  - +10 mana (score)
  - +1 shield charge (max 3)
  - Progress toward completion (2 correct collections per word required)
  - New target word appears
- **Incorrect book collection**:
  - -5 mana penalty
  - Same target word shuffled again
  - No shield charge earned

### Spirit Enemies
- **One spirit at a time** (not a horde)
- Spirits spawn from one wall position
- **Movement**: Calculate point ahead of player's current trajectory, move in straight line through that point toward opposite wall
- Spirits pass through and exit the screen (don't stop at player)
- **Progressive difficulty**: Start with slower speed, increase speed as game progresses
- **Collision damage**: -10 mana when spirit passes through player

### Shield Ability
- **Activation**: Press Shield button (Space/Enter)
- **Duration**: 2 seconds active
- **Constraints**: Player cannot move while shield is active
- **Charges**: Maximum 3 charges, earn 1 per correct book collected
- **Bounce mechanic**: Spirits that hit the shield reflect at angle of incidence (mirror physics)
- Reflected spirits continue across screen in new direction

### Mana System
- Mana serves dual purpose: **score AND resource meter**
- Starting mana: 50
- Correct book: +10 mana
- Wrong book: -5 mana
- Spirit hit: -10 mana
- No health/HP meter (only mana tracked)
- Mana can go negative

## Non-Functional Requirements

### Visual Design
- Bright, colorful cartoon aesthetic
- Friendly character designs (not scary)
- Clear visual distinction between correct/incorrect books
- Library/magical theme throughout
- Smooth animations for player, spirits, and books

### Performance
- Maintain smooth 60 FPS gameplay
- Responsive controls with minimal input lag
- Quick game state transitions

### Accessibility
- Large, readable text for primary school students
- Clear audio/visual feedback for correct/incorrect answers
- Virtual controls for touch devices (D-pad + shield button)

## Acceptance Criteria

1. Player can move smoothly in 8 directions within game boundaries
2. Exactly 4 books appear on screen with 1 correct answer
3. Collecting correct book: adds mana, grants shield charge, progresses vocabulary
4. Collecting wrong book: subtracts mana, reshuffles same word
5. Spirits spawn one at a time and move toward predicted player position
6. Spirit collision subtracts mana without stopping the spirit
7. Shield activates for 2 seconds, freezes player, bounces spirits at angle of incidence
8. Shield respects max 3 charge limit
9. Game ends when all vocabulary words collected correctly 2 times each
10. Final score displayed at game completion
11. Spirit speed increases progressively throughout game
12. Visual theme is bright, colorful, and age-appropriate

## Out of Scope

- Multiplayer functionality
- Sound effects and background music (may be added later)
- Difficulty level selection (game auto-progresses)
- Custom vocabulary upload (uses provided word list)
- Leaderboards or score persistence
- Zombie horde mechanics from original game
- Health/HP system (replaced by mana-only system)
