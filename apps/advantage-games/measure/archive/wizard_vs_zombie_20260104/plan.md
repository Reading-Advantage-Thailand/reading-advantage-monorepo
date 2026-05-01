# Implementation Plan: Wizard vs Zombie (Health Pickup)

This plan outlines the steps to build the "Wizard vs Zombie" survival game using **React-Konva (Canvas)** for high-performance rendering.

## Phase 1: Setup & Infrastructure
*   [x] Task: Define `WizardZombieState` and types in `src/lib/wizardZombie.ts`. 48e7bad
*   [x] Task: Create `src/app/games/wizard-vs-zombie` route and page structure. d964e2c
*   [x] Task: Create `WizardZombieGame` container component using `react-konva`. 80a4d30
*   [x] Task: Register game in Main Menu (using a temporary or placeholder cover image). e05db79
*   [x] Task: Measure - User Manual Verification 'Phase 1: Setup & Infrastructure' [checkpoint: 855a215]

## Phase 2: Core Gameplay Loop (Canvas & Movement)
*   [x] Task: Implement Game Loop using `useInterval` or `requestAnimationFrame` calling `advanceWizardZombieTime`. 9217284
*   [x] Task: Implement Player Movement logic (Arrows/WASD + **Virtual D-Pad support**). 002b416
*   [x] Task: Implement Zombie Spawning logic (Spawn from **4 Gates**: N, S, E, W). c49f462
*   [x] Task: Implement Canvas Rendering for Player and Zombies. c49f462
*   [x] Task: Implement Camera Follow Logic (Center on Player if World > Viewport). 236714b
*   [x] Task: Implement Collision Detection (Circle/Box) in the game loop. a2a3cef
*   [x] Task: Measure - User Manual Verification 'Phase 2: Core Gameplay Loop' [checkpoint: a2a3cef]

## Phase 3: Vocabulary Mechanics (Orbs & Interaction)
*   [x] Task: Implement Orb Spawning and Rendering in Canvas. c49f462
*   [x] Task: Implement Off-screen Indicators (Arrow + Label) for distant Orbs. eaf748d
*   [x] Task: Implement Orb Collection Logic. 315c281
*   [x] Task: Implement Shockwave Logic. 315c281
*   [x] Task: Measure - User Manual Verification 'Phase 3: Vocabulary Mechanics' [checkpoint: 315c281]

## Phase 4: Assets & Polish
*   [x] Task: Integrate final "Wizard" and "Zombie" sprite sheets with animations. 550e242
*   [x] Task: Integrate Background and Orb assets. 550e242
*   [x] Task: Implement Smart HUD (Health, Score) overlay (Safe Zones, non-obscuring). 550e242
*   [x] Task: Implement Game Over screen and XP calculation. 550e242
*   [x] Task: Final Tuning (Speed, Hitboxes, Spawn Rates). 550e242
*   [x] Task: Measure - User Manual Verification 'Phase 4: Assets & Polish' [checkpoint: 550e242]

---

## 🛑 Critical Anti-Patterns & Lessons (Post-Mortem 2026-01-04)

### 1. Viewport & Scaling
*   **Failure:** Initializing the `Stage` with logical dimensions (800x600) caused the container to overflow on mobile, showing only the top-left 1/3rd of the game.
*   **Failure:** Initializing with `0x0` and waiting for a ResizeObserver caused a race condition where the stage sometimes remained blank (0x0) or failed to trigger a re-render correctly.
*   **Lesson:** **Mobile First.** Always design the container to fit `100vw/100vh` or `100%` of parent. Use a robust `ResizeObserver` that sets state *immediately* on mount if dimensions are available. Decouple the "Logical Game Size" from the "Rendered Stage Size" using a `scale` transform on a top-level `Layer` or `Group`, not by resizing the `Stage` to match the game world. The `Stage` should always match the CSS container size.

### 2. Mobile Input Handling
*   **Failure:** Using `e.preventDefault()` inside `onTouchStart`/`onTouchEnd` caused React errors because these events are **passive** by default in modern React/Browsers to improve scrolling performance.
*   **Lesson:**
    *   **NEVER** call `e.preventDefault()` in `onTouchStart` logic handled by React.
    *   **ALWAYS** use CSS `touch-action: none` on the interactive elements (buttons, canvas container) to prevent the browser from hijacking the touch for scrolling.
    *   Use a `ref` based input system (`inputRef.current[key] = true`) rather than `useState` to avoid input lag/batching issues in the game loop.

### 3. Asset Loading
*   **Failure:** Async asset loading (`buildAssets`) inside `useEffect` can lead to race conditions if the component unmounts or if the promise resolution doesn't trigger a reliable re-render.
*   **Lesson:** Use a proper asset loader hook or state machine that handles `loading`, `error`, and `success` states explicitly. Ensure the game loop does not attempt to tick or render until `assets` are strictly non-null.

### 4. Logic & State
*   **Failure:** `spawnOrbs` was picking random words independently of the `targetWord` displayed to the user, making the game unsolvable.
*   **Lesson:** The `targetWord` must be the single source of truth. `spawnOrbs` must take the *current* target as an argument.