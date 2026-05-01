# Specification: Potion Rush (Time Management Edition)

## Overview
**Potion Rush** is a fast-paced time-management game set in a magical potion shop. Players act as an alchemist who must fulfill potion orders for a queue of fantasy customers. The core mechanic involves constructing sentences in the target language by collecting "ingredient" words from a conveyor belt and dropping them into the correct cauldron to brew the specific potion requested by a customer.

## Core Gameplay Loop

### 1. The Shop Floor
- **Customers:** A queue of customers (Orcs, Elves, Wizards) appears at the counter.
- **Orders:** Each customer requests a specific potion using a sentence in their **Native Language** (e.g., "El gato duerme").
- **Workstations:** The player has **3 Cauldrons** available to brew potions simultaneously.
- **Supply Chain:** A **Conveyor Belt** at the bottom continuously scrolls "Ingredients" from right to left. Each ingredient represents a word in the **Target Language** (e.g., "The", "Cat", "Sleeps", "Run").

### 2. Brewing Mechanics
- **Assigning an Order:** The player starts brewing by dragging an "Order" (from a customer) or simply starting to drop ingredients into an empty cauldron. *Simplified:* The player just sees the customer's request and starts dropping words into *any* empty cauldron. The cauldron then becomes "assigned" to that target sentence.
- **Cooking:**
    - The player must drag words from the conveyor belt into the assigned cauldron.
    - **Correct Ingredient:** If the word matches the *next* word in the target sentence, it is added to the pot. The pot bubbles happily (blue/gold).
    - **Incorrect Ingredient:** If the word is wrong (wrong word or wrong order), the pot turns **Green/Noxious** and bubbles violently (Warning State).
- **Recovery & Failure:**
    - **Warning State:** The player cannot add more ingredients until the pot is fixed.
    - **Trash:** To fix a ruined pot, the player must drag the entire cauldron content (or click a "Dump" button) to the **Magic Trash Portal**. This empties the cauldron, resetting progress for that specific sentence.
    - **Explosion:** If the player tries to serve a ruined potion or adds *another* wrong ingredient to a warning pot, it explodes, reducing the time/score significantly and emptying the pot.

### 3. Serving
- Once all words for a sentence are added in the correct order, the potion is complete.
- The player drags the finished potion to the matching customer (or it auto-serves).
- The customer leaves happy, awarding points and extending the timer slightly.

### 4. Game Over Conditions
- **Time Limit:** The game runs on a global timer (e.g., "Daylight"). When night falls, the shop closes.
- **Patience:** Each customer has a patience meter. If it runs out, they leave angry (penalty). If too many customers leave angry, the shop is shut down early.

## Visuals & UI

### Layout
- **Top:** Counter with 3 Customer slots. Speech bubbles show the *Native Language* prompt.
- **Middle:** 3 Cauldron stations.
- **Bottom:** Conveyor belt with scrolling ingredients.
- **Right/Corner:** Trash Portal.
- **HUD:** Score, Day Timer, Pause Button.

### Entities
- **Ingredients:** Visual representation of words (Flasks, Mushrooms, Crystals) with the text label clearly visible.
- **Cauldrons:** Animated states (Empty, Brewing Blue, Warning Green, Finished Gold).
- **Customers:** Animated reactions (Idle, Impatient/Foot tapping, Happy, Angry/Smoke).

## Technical Constraints
- **Engine:** React-Konva (Canvas) for high performance with many moving elements.
- **State Management:** Zustand for handling the complex state of 3 independent cauldrons, the conveyor belt, and customer timers.
- **Input:** Mouse/Touch (Drag and Drop is central).

## Accessibility & Settings
- **Text Speed:** Option to slow down the conveyor belt.
- **Color Blindness:** Ensure "Good" (Blue) and "Bad" (Green/Red) bubbles are distinguishable by shape or particle effects, not just color.