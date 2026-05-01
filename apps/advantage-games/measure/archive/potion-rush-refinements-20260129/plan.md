# Implementation Plan: Potion Rush Gameplay Refinements

This plan outlines the refactoring and enhancement of Potion Rush gameplay mechanics, focusing on word spawning, cauldron management, and the reputation system.

## Phase 1: Logic & State Refactoring [checkpoint: fa256dc]
**Goal:** Update the Zustand store to handle the new word pool logic, reputation score, and dynamic belt speed.

- [x] **Task 1.1: Update State Interfaces** [e253d3b]
    - [x] Modify `PotionRushState` to replace `lives` with `reputation` (0-100).
    - [x] Add `baseBeltSpeed` and `completedSentences` to track progression.
    - [x] Add `activeWordPool` to store words from current customers.
- [x] **Task 1.2: Refactor `spawnCustomer` & `activeWordPool`** [e253d3b]
    - [x] Update `spawnCustomer` to append the words of the new request to `activeWordPool`.
    - [x] Implement a helper to remove words from `activeWordPool` when a customer is served or leaves.
- [x] **Task 1.3: Implement Dynamic Speed Logic** [e253d3b]
    - [x] Update `handleServeCustomer` to increment `completedSentences`.
    - [x] Update `tick` or a selector to calculate `currentSpeed` based on `baseBeltSpeed * (1.1 ^ completedSentences)`.
- [x] **Task 1.4: Reputation & Penalty Logic** [e253d3b]
    - [x] Update `tick` to reduce `reputation` by 25 when a customer leaves angry.
    - [x] Trigger game over when `reputation <= 0`.
- [x] **Task 1.5: Write Unit Tests for Store Logic** [e253d3b]
    - [x] Test `activeWordPool` updates on customer spawn/despawn.
    - [x] Test reputation decrease and game over trigger.
    - [x] Test speed increment calculation.

- [x] Task: Measure - User Manual Verification 'Phase 1: Logic & State Refactoring' (Protocol in workflow.md) [fa256dc]

## Phase 2: Refined Spawning & Cauldron Reset [checkpoint: 440d0d6]
**Goal:** Implement the intelligent word spawner and the cauldron-to-trash drag logic.

- [x] **Task 2.1: Intelligent `spawnIngredient`** [1668788]
    - [x] Modify `spawnIngredient` to pick words only from `activeWordPool`.
    - [x] Ensure it handles cases where `activeWordPool` is empty (e.g., no customers).
- [x] **Task 2.2: Cauldron Reset Logic** [77ec302]
    - [x] Update `handleDumpCauldron` (or create a new action) specifically for resetting from the trash.
    - [x] Update `CauldronStation.tsx` to allow dragging a "WARNING" or "BREWING" cauldron to the trash.
- [x] **Task 2.3: Write Tests for Spawning and Reset** [77ec302]
    - [x] Verify `spawnIngredient` only pulls from the pool.
    - [x] Verify `handleDumpCauldron` resets state to `IDLE` immediately.

- [x] Task: Measure - User Manual Verification 'Phase 2: Refined Spawning & Cauldron Reset' (Protocol in workflow.md) [440d0d6]

## Phase 3: HUD & Visual Feedback
**Goal:** Update the UI to reflect reputation and sentence progress, and add the red flash/shake effects.

- [x] **Task 3.1: Sentence Progress Display** [b73d8ac]
    - [x] Update `CauldronStation.tsx` to display the `targetSentence` words below the cauldron, highlighting those in `currentWords`.
- [x] **Task 3.2: Reputation HUD** [c984f23]
    - [x] Update `PotionRushGame.tsx` HUD to display "Reputation" as a percentage.
- [x] **Task 3.3: Penalty Effects (Flash/Shake)** [59e21e6]
    - [x] Create a `ScreenEffect` component or update `PotionRushEffectsLayer.tsx`.
    - [x] Add a state trigger for `lastPenaltyTime`.
    - [x] Use `framer-motion` to trigger a red flash or camera shake when `reputation` drops.
- [x] **Task 3.4: Manual UI Verification** [59e21e6]
    *   Verify HUD labels.
    *   Verify sentence text visibility below cauldrons.

- [ ] Task: Measure - User Manual Verification 'Phase 3: HUD & Visual Feedback' (Protocol in workflow.md)

## Phase 4: Final Balancing & Polish [checkpoint: 1c70ceb]
**Goal:** Apply the 50% speed reduction and perform final integration tests.

- [x] **Task 4.1: Adjust Base Constants** [1c70ceb]
    - [x] Set default `beltSpeed` to 50% of the original value.
    - [x] Ensure fixed interval spawning matches the slower belt speed for good pacing.
- [x] **Task 4.2: Integration Testing** [1c70ceb]
    - [x] Playtest full loops to ensure the 10% speed increase per sentence feels balanced.
    - [x] Verify right-to-left flow is consistent.

- [x] Task: Measure - User Manual Verification 'Phase 4: Final Balancing & Polish' (Protocol in workflow.md) [1c70ceb]

## Phase 5: Tuning, Scoring & Summary
**Goal:** Implement dynamic difficulty scaling, time-based scoring, and the Game Over summary.

- [x] **Task 5.1: Difficulty Scaling Logic**
    - [x] Update `usePotionRushStore` to calculate `currentPatience` based on `completedSentences` (60 * 0.9^n).
    - [x] Update `spawnCustomer` to use the scaled patience value.
    - [x] Update customer spawn interval logic in `tick` (or `useGameLoop` integration) to trigger every `currentPatience / 3` seconds.
- [x] **Task 5.2: Scoring & XP Implementation**
    - [x] Update `handleServeCustomer` to calculate score = `ceil(remainingPatience)`.
    - [x] Award XP (10% of score) using `useGameStore.getState().addXp()`.
    - [x] Track `totalXpEarned` in the local store for the summary.
- [x] **Task 5.3: Game Over Summary Overlay**
    - [x] Create `PotionRushSummary.tsx` component.
    - [x] Display it when `gameState === 'GAME_OVER'`.
    - [x] Show Score, Customers Served, and XP Earned.
    - [x] Provide "Play Again" and "Exit" buttons.
- [x] **Task 5.4: Verify Scaling & Scoring**
    - [x] Write unit tests for the new scoring formula and scaling logic.
    - [x] Manual verification of the summary screen.

- [ ] Task: Measure - User Manual Verification 'Phase 5: Tuning, Scoring & Summary' (Protocol in workflow.md)
