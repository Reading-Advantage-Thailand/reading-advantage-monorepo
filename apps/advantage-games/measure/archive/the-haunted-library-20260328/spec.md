# Game Specification: The Haunted Library

Mappy-style vertical platformer with door mechanics.

## 1. Concept
The player (a Rogue or Scholarly Knight) must navigate a multi-story library filled with magical jump-pads and ghostly librarians. The goal is to collect words from a sentence by opening the correct magical doors in sequence.

## 2. Gameplay Mechanics
- **Grid/Layout:** A 2D side-scrolling cross-section of a library with 4-5 floors.
- **Movement:**
  - Left/Right walking.
  - **Jump-pads (Trampolines):** Strategic points that launch the player up to the next floor (or multiple floors if bounced correctly).
  - While on a jump-pad, the player can move left/right to land on a specific floor.
- **Doors:**
  - Each floor has several doors.
  - Some doors contain words from the sentence.
  - Opening a door is done by pressing 'Up' or a button when in front of it.
  - **Mechanic:** Slamming a door on an enemy (Ghostly Librarian) stuns them.
  - **Sequence:** Collecting words in the wrong order is a mistake.
- **Enemies:**
  - **Ghostly Librarians:** Patrol floors. If they touch the player, a life is lost.
  - **Bats:** Released if the player opens a wrong word door. They hunt the player.
- **Health:** Lives (Book-marks or Mana).

## 3. Visuals & Theme
- **Theme:** Haunted Victorian/Medieval Library.
- **Background:** Bookshelves, scrolls, flickering candles.
- **Characters:**
  - Player: Rogue with a cape.
  - Enemy: Translucent blue ghosts.
  - Doors: Ornate wooden doors that glow when containing a word.

## 4. UI/UX
- **Start Screen:** A dusty library desk with a flickering candle.
- **HUD:**
  - Translation display at the top.
  - Sentence progress bar.
  - Lives (represented by hearts or books).
- **End Screen:** Success (The library is purified) or Failure (The player becomes a ghost).

## 5. Technical Details
- **Engine:** React-Konva.
- **Physics:**
  - Simple horizontal velocity.
  - Gravity-based vertical movement for jumping/falling.
  - Trampoline bounce logic (velocity boost when hitting a jump-pad).
- **Collision:** AABB for doors, enemies, and floors.

## 6. Educational Value
- Sentence structure and vocabulary.
- Memory and sequencing under pressure.
- Strategic movement and timing.
