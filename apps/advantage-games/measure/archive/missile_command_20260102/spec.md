# Spec: Missile Command MVP

## Overview
A typing-based vocabulary defense game inspired by Missile Command. Players defend their "bases" by typing the correct translations of incoming vocabulary "missiles."

## Functional Requirements
- **Game Initialization:**
    - Accepts a vocabulary list as an array of `{ term: string, translation: string }`.
    - Features a "Start Screen" displaying the vocabulary to be tested.
- **Core Gameplay:**
    - "Missiles" (vocabulary terms) descend from the top of the screen toward player bases at the bottom.
    - Player types the translation using a text input field.
    - Successfully typing a translation destroys the corresponding missile.
- **Scoring & XP:**
    - XP is awarded based on accuracy and speed.
    - Final score screen displays total XP and accuracy percentage.
- **Game Over:**
    - Bases are destroyed when a missile reaches them.
    - The game ends when all bases are destroyed or the survival phase (increasing speed) eventually overwhelms the player.
- **Adaptive Difficulty:**
    - Speed increases based on consecutive correct answers and overall accuracy.

## Technical Constraints
- Built with **Next.js 15 (App Router)** and **TypeScript**.
- Styled with **Tailwind CSS** and **shadcn/ui**.
- Animations powered by **Framer Motion**.
- State managed by **React State/Context** and **Zustand**.

## UI/UX Guidelines
- **Modern Clean Aesthetic:** Material Design principles, rounded corners, vibrant feedback.
- **Feedback:** Green flash for correct, red/shake for incorrect, arcade success/failure sounds.
- **Mobile Friendly:** Large touch targets and responsive layout.