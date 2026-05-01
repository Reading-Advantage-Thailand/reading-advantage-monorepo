# Implementation Plan: Potion Rush (Time Management)

## Notes (2026-01-28)
- Drag/drop feels unreliable; likely needs fixed timestep updates (50ms clock) aligned with other Konva games.
- Conveyor belt height is ~25% too tall; adjust layout/scale during Phase 6.
- Trash portal animation not implemented; tie into Phase 3 (Trash Component) and Phase 5 (Particle Effects).

## Phase 1: Core Architecture & State Management
**Goal:** Set up the game store and basic data structures to handle the complex state of multiple cauldrons and a moving conveyor belt.

- [x] **Data Models:** Define interfaces for `Ingredient` (Word), `Customer` (Request), and `Cauldron` (State: Empty, Brewing, Ruined, Done).
- [x] **Zustand Store (`usePotionRushStore`):**
    -   `cauldrons`: Array of 3 cauldron objects.
    -   `conveyorBelt`: Array of active ingredients with `x, y` positions.
    -   `customers`: Queue of active customers.
    -   `gameState`: Playing, Paused, GameOver.
    -   `score` & `timer`.
- [x] **Game Loop Hook:** Create a `useGameLoop` hook that updates the conveyor belt position and customer timers every frame. fddf899

## Phase 2: The Conveyor Belt & Ingredients
**Goal:** Get the "supply chain" working. Words should spawn and move across the screen.

- [x] **Ingredient Component:** Create a React-Konva component for ingredients (Word + Visual Icon).
- [x] **Spawner Logic:** Implement logic to spawn words from the current vocabulary set at the edge of the screen.
- [x] **Movement Logic:** Update `x` coordinates in the store tick. Despawn items when they leave the screen.
- [x] **Drag & Drop Basics:** Implement `onDragStart` and `onDragEnd` for ingredients.

## Phase 3: The Workstations (Cauldrons)
**Goal:** Allow players to drop words into cauldrons and validate them against active orders.

- [x] **Cauldron Component:** Visual representation with states (Normal, Warning, Exploded).
- [x] **Drop Logic:**
    -   Detect when an ingredient is dropped on a cauldron.
    -   **Assignment:** If empty, assign the cauldron to the sentence matching the word (if valid start).
    -   **Validation:** Check if the dropped word is the *next* correct word in the sequence.
- [x] **State Transitions:**
    -   Valid -> Update progress.
    -   Invalid -> Set state to `Warning` (Green bubbles).
    -   Ruined -> Requires emptying.
- [x] **Trash Component:** Implement the drop zone to clear a "Ruined" cauldron or discard an ingredient. 3283a33

## Phase 4: Customers & Orders
**Goal:** Tie the brewing to actual requests.

- [x] **Customer Component:** Display avatar and speech bubble with the **Native Language** sentence.
- [x] **Queue Logic:** Spawn customers at intervals. limit to 3 at the counter. ff2840c
- [x] **Serving Logic:** When a cauldron is "Done", allow dragging it to the customer (or auto-complete) to clear the slot and award points.
- [x] **Patience System:** Decrease customer timer; trigger "Leave Angry" event if 0.

## Phase 5: Game Loop Polish & Assets [checkpoint: fdc8327]
**Goal:** Make it look and feel like a game.

- [x] **Asset Integration:** Replace placeholders with generated assets (Customers, Cauldron sprites, Ingredient icons). 7e06ead
- [x] **Particle Effects:** 0c5bcc8
    -   Splash when dropping ingredients.
    -   Smoke/Explosion for errors.
    -   Stars/Hearts for successful service.
- [x] **Sound Effects:** Bubbling, Clinking, Angry grunts, Cash register ding. ba18ddc
- [x] **Tutorial/Start Screen:** Brief explanation of "Native Request -> Target Ingredient". 38fa58b

## Phase 6: Mobile Optimization [checkpoint: ca7d2c8]
- [x] **Touch Controls:** Ensure drag targets are large enough.
- [x] **Responsive Layout:** Stack elements vertically if needed on portrait (or force landscape).
