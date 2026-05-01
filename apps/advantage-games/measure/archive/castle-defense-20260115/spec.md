# Specification: Castle Defense (Tower Defense Game)

## Overview
A high-energy, movement-based Tower Defense game where the player physically collects vocabulary words in the correct order to construct defensive towers. The game blends top-down action with language learning, requiring players to navigate the battlefield while managing a linguistic "construction" queue.

## Functional Requirements

### 1. Player Character & Movement
- Top-down 2D movement (WASD/Arrow keys).
- The player moves within a designated area containing the word spawning field and the tower foundations.

### 2. Vocabulary & Word Collection
- A target translation/sentence is displayed at the top of the screen.
- Individual words from that sentence (and potential distractors) are scattered randomly in the "word field".
- **Collection Mechanic:**
    - Player picks up words by walking over them.
    - Collected words appear in a queue UI beneath the translation.
    - Words must be collected in the *exact* order of the target sentence.
- **Tower Activation:**
    - When the player approaches an empty tower foundation:
        1. All words in the current queue "fly" from the player to the foundation.
        2. **Success:** If the queue matches the sentence, a tower is built.
        3. **Failure:** If the queue is incorrect, the words "erupt" out of the foundation, scattering back to random positions in the word field.

### 3. Tower Defense Mechanics
- **Simple Towers:** All built towers are identical, shooting projectiles at the nearest enemy within range.
- **Enemy Waves:** Soldiers and Bosses spawn at a starting point and follow a fixed path (road) toward the "Player's House".
- **Lives System:** Each enemy that reaches the house deducts one "Heart".
- **Game Over:** Triggered when Hearts reach zero.

### 4. UI/UX
- Translation Display: Shows the target sentence.
- Progress UI: Small indicators under the translation showing which words have been collected.
- Life/Heart Counter.

## Non-Functional Requirements
- **Responsive Canvas:** The game should adapt to different screen sizes using `react-konva`.
- **Performance:** Handle multiple projectiles and enemies smoothly on the canvas.

## Acceptance Criteria
- [ ] Player can move and pick up words.
- [ ] Words fly to foundation on proximity.
- [ ] Tower builds only if the sequence is correct.
- [ ] Failed sequences scatter words back to the field.
- [ ] Enemies move along a path and damage the house.
- [ ] Towers automatically target and destroy enemies.

## Out of Scope
- Multiple tower types or upgrades.
- Complex pathfinding (enemies only use fixed paths).
- Persistent player leveling (for the initial version).
