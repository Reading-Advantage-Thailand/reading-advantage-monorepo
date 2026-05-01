# Specification: Potion Rush Gameplay Refinements

## Overview
This track focuses on refining the core gameplay of Potion Rush to improve engagement, balance difficulty, and clarify player feedback. Key areas include a more targeted word spawning system, improved cauldron management (resetting), a clearer shop health (Reputation) system, and better conveyor belt dynamics.

## Functional Requirements

### 1. Intelligent Word Spawning
- **Dynamic Word Pool:** The conveyor belt will no longer spawn completely random words from the dictionary.
- **Active Requirement Pool:** It will maintain an array of words derived from the sentences of *all currently waiting customers*.
- **No Distractors:** Only words currently needed by at least one customer will appear on the belt.
- **Replenishment:** When a new customer arrives, the words from their required sentence are added to the active pool.

### 2. Cauldron Management & Reset
- **Manual Reset:** Players can now drag a "Ruined" or "Warning" state cauldron to the Trash Portal.
- **Instant Reset:** Dropping a cauldron on the trash instantly resets its state to "IDLE" and clears all contained words.
- **No Effects:** The reset should be purely functional and immediate, without transition animations.

### 3. Reputation & Shop Health
- **Reputation Score:** Shop health is represented by a percentage (starting at 100%).
- **Penalty:** Each customer who leaves angry (timer expires) reduces the Reputation by **25%**.
- **Visual Feedback:** A lost customer triggers a brief red screen flash or screen shake to emphasize the penalty.
- **Game Over:** The game ends if Reputation reaches 0%.

### 4. Conveyor Belt Dynamics
- **Direction:** Items move from right to left (entering on the right, exiting on the left).
- **Base Speed:** The initial speed is reduced to **50%** of the previous default.
- **Progression:** The belt speed increases by **10%** for every successfully completed and served sentence.
- **Spawn Logic:** New items spawn at a **fixed time interval** from the right edge.

### 5. Difficulty Scaling
- **Patience Scaling:** Customer patience starts at **60 seconds** and decreases by **10%** (multiplied by 0.9) for each successfully served customer.
- **Spawn Rate:** New customers spawn every `Current Patience / 3` seconds. As patience decreases, customers appear more frequently.
- **Belt Speed:** Continues to scale by **1.1x** per completed sentence.

### 6. Scoring & XP
- **Score Calculation:** Points awarded for a served customer equal the **remaining seconds of patience** (rounded down).
- **XP Reward:** XP awarded is **10%** of the score gained from that customer.

## Visual & UI Requirements
- **Sentence Tracking:** Display the progress of the current sentence (words already added) clearly underneath each active cauldron.
- **Reputation HUD:** Update the HUD to show "Reputation: X%" instead of "Lives".
- **Game Over Summary:** A dedicated overlay at the end of the game displaying:
    - Final Score
    - Total Customers Served
    - Total XP Earned

## Acceptance Criteria
- Conveyor belt only contains words needed by active customers.
- Dragging a bad cauldron to the trash resets it to IDLE immediately.
- Customer timers expiring reduces Reputation by 25% and triggers a visual warning (flash/shake).
- Conveyor speed starts slow and increases predictably with each success.
- Customer patience and spawn intervals decrease as the game progresses.
- Score is based on speed (remaining patience).
- Game Over screen shows a clear summary of performance.
