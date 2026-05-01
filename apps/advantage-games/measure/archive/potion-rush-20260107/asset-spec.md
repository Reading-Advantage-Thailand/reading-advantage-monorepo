# Asset Specification: Potion Rush

## Visual Style
- **Theme:** Magical Fantasy, slightly cartoonish/vector style (consistent with other games in the suite).
- **Perspective:** 2D Side/Front view (like a stage).
- **Palette:** Vibrant purples, greens, oranges, and deep stone grays.

## Required Sprites

### 1. The Cauldrons
*   **Cauldron Base:** Large iron pot on a stand.
*   **Liquid States (Overlays):**
    *   `liquid-blue.png`: Standard brewing (looping bubble animation frames).
    *   `liquid-green.png`: "Warning" / Ruined state (looping noxious bubble animation).
    *   `liquid-gold.png`: Finished potion (glowing).
*   **Effects:**
    *   `smoke-puff.png`: For when an ingredient is added.
    *   `explosion.png`: For when a potion fails completely.

### 2. Ingredients (Words)
*   **Container Backgrounds:** (The text will be rendered on top of these)
    *   `flask-round-red.png`
    *   `flask-tall-blue.png`
    *   `herb-bundle.png`
    *   `magic-stone.png`
    *   `mushroom.png`
*   **Icons:** Small icons to decorate the UI if needed.

### 3. Customers
*   **Orc:**
    *   `orc-idle.png`
    *   `orc-happy.png`
    *   `orc-angry.png`
*   **Elf:**
    *   `elf-idle.png`
    *   `elf-happy.png`
    *   `elf-angry.png`
*   **Wizard:**
    *   `wizard-idle.png`
    *   `wizard-happy.png`
    *   `wizard-angry.png`

### 4. Environment
*   **Background:** `shop-interior-bg.png`. Stone walls, shelves with jars, wooden floor.
*   **Counter:** `wooden-counter.png`. Where customers stand.
*   **Conveyor Belt:** `conveyor-belt-segment.png` (tileable) or a long strip.
*   **Trash:** `magic-portal-trash.png`. A swirling vortex.

### 5. UI Elements
*   **Speech Bubble:** `speech-bubble-tail-down.png` (for customers).
*   **Heart/Patience Meter:** `heart-full.png`, `heart-empty.png`.
*   **Clock:** `sun-moon-dial.png`.

## Audio Requirements
*   **BGM:** "Magical Shop" - Upbeat but slightly mysterious loop.
*   **SFX:**
    *   `bubble-loop.wav` (Ambience)
    *   `splash.wav` (Drop ingredient)
    *   `correct-ding.wav` (Potion complete)
    *   `error-buzz.wav` (Wrong ingredient)
    *   `explosion.wav` (Game over/Ruined pot)
    *   `customer-happy.wav` (Cash register/Cheer)
    *   `customer-angry.wav` (Grunt/Door slam)