# Implementation Plan - RPG Battle Vocabulary Game

This plan outlines the steps to build a 2D side-view turn-based RPG vocabulary game. The development follows a Test-Driven Development (TDD) approach, focusing on a robust state machine and a responsive user interface.

## Phase 1: Game State & Core Logic [checkpoint: 14ed2b3]
Focuses on defining the state machine and turn-based mechanics using Zustand.

- [x] Task: Define `RPGBattleStore` state and types (Zustand). (bef34fd)
- [x] Task: Implement `useRPGBattleStore` actions for turn management (Player/Enemy turn transitions). (d460fdb)
- [x] Task: Implement health management logic (damage calculation and death checks). (233fde1)
- [x] Task: Measure - User Manual Verification 'Phase 1: Game State & Core Logic' (Protocol in workflow.md). (14ed2b3)

## Phase 2: UI Foundation & Components [checkpoint: 7f3445f]
Creating the visual structure and individual UI elements.

- [x] Task: Create the `BattleScene` layout (2D side-view container). (c2116fb)
- [x] Task: Implement the `HealthBar` component with animated health changes. (8fced3f)
- [x] Task: Implement the `ActionMenu` component with the typing input field. (fd61135)
- [x] Task: Implement the `BattleLog` component to track combat history. (b881dbc)
- [x] Task: Create simple sprites/placeholders for Player and Enemy using the 3×3 grid layout. (d5b0da2)
- [x] Task: Implement a `Sprite` component that handles UV mapping/positioning for the 3×3 pose sheet and supports horizontal flipping. (cb20ef3)
- [x] Task: Measure - User Manual Verification 'Phase 2: UI Foundation & Components' (Protocol in workflow.md). (7f3445f)

## Phase 3: Combat Mechanics & Vocabulary Integration [checkpoint: 1c50c60]
Wiring the typing logic and word difficulty mapping into the battle system.

- [x] Task: Implement the word selection algorithm (mapping known/new words to attack power). (4163a12)
- [x] Task: Implement typing verification logic with the 2-second error feedback loop. (c541f83)
- [x] Task: Implement pose-switching logic (e.g., switch to 'Hurt' on damage, 'Attack' on success). (13d51a7)
- [x] Task: Implement enemy AI (simple automated attack logic during enemy turn). (46a9920)
- [x] Task: Add attack animations and screen shake effects using Framer Motion. (2485aee)
- [x] Task: Measure - User Manual Verification 'Phase 3: Combat Mechanics & Vocabulary Integration' (Protocol in workflow.md). (1c50c60)

## Phase 4: XP, Results & App Integration
Finalizing the game loop and connecting it to the main application.

- [x] Task: Implement XP calculation logic based on efficiency and streaks. (22c224c)
- [x] Task: Create the `BattleResults` screen (Victory/Defeat summary). (990bb4c)
- [x] Task: Integrate the RPG Battle game into the Next.js app router (`/games/rpg-battle`). (8eacce0)
- [x] Task: Add final polish (sound effects, transitions, responsive fixes). (094f0cf)
- [x] Task: Centralize sample vocabulary and address RPG battle UX issues (autofocus, nav, victory delay, XP snapshot). (a46b232)
- [x] Task: Reset battle effects on restart and retain word difficulty across rematches. (cb6adfb)
- [x] Task: Randomize hero and enemy sprites at battle start. (2b75212)
- [x] Task: Ensure action input focuses after rematch. (a11aa44)
- [x] Task: Measure - User Manual Verification 'Phase 4: XP & Finalization' (Protocol in workflow.md)
