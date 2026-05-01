# Plan: Castle Defense

## Phase 1: Infrastructure & Scene Setup [checkpoint: 6326506]
- [x] Task: Create `CastleDefenseState` types and configuration (`src/lib/castleDefense.ts`). 74c2d3a
- [x] Task: Implement `useCastleDefenseStore` for game state management (`src/store/useCastleDefenseStore.ts`). 74c2d3a
- [x] Task: Create `src/app/games/castle-defense` route and basic game container. 74c2d3a
- [x] Task: Implement **Game Map** with "Road" path and "Tower Slot" foundations using React-Konva. 74c2d3a
- [x] Task: Implement **Player Movement** (WASD/Arrows) and sprite rendering. 74c2d3a
- [x] Task: Register game in Main Menu (using placeholder cover). 74c2d3a
- [x] Task: Measure - User Manual Verification 'Phase 1: Infrastructure & Scene Setup' (Protocol in workflow.md) b0b8a16

## Phase 2: Vocabulary & Collection Engine [checkpoint: 80b7637]
- [x] Task: Implement **Word Spawning** logic (scatter words in the field). 80b7637
- [x] Task: Implement **Target Sentence** display and **Progress UI** (Collection Queue). 80b7637
- [x] Task: Implement **Word Collection** logic (Walking over words adds to queue). 80b7637
- [x] Task: Implement **Tower Activation Trigger**: Proximity check to Tower Slots. 80b7637
- [x] Task: Implement **Activation Success/Failure Logic**: 
    - Success: Build tower.
    - Failure: "Erupt" words back to random field positions. 80b7637
- [x] Task: Measure - User Manual Verification 'Phase 2: Vocabulary & Collection Engine' (Protocol in workflow.md) 80b7637

## Phase 3: Enemy Waves & Base Health [checkpoint: 80b7637]
- [x] Task: Implement **Enemy Pathing** (Enemies follow the fixed road path). 80b7637
- [x] Task: Implement **Wave Spawning** logic (Soldiers and periodic Bosses). 80b7637
- [x] Task: Implement **Base Health** and **Damage** logic (Enemies reaching the end of the road). 80b7637
- [x] Task: Implement **Game Over** state when hearts reach zero. 80b7637
- [x] Task: Measure - User Manual Verification 'Phase 3: Enemy Waves & Base Health' (Protocol in workflow.md) 80b7637

## Phase 4: Combat System [checkpoint: 80b7637]
- [x] Task: Implement **Tower Shooting** logic (Find nearest enemy in range, fire projectile). 80b7637
- [x] Task: Implement **Projectile Physics** (Track target, collision detection). 80b7637
- [x] Task: Implement **Enemy Health & Death** logic. 80b7637
- [x] Task: Measure - User Manual Verification 'Phase 4: Combat System' (Protocol in workflow.md) 80b7637

## Phase 5: Visuals & Polish
- [x] Task: Implement **Mobile D-Pad** controls for touch devices. faa10f3
- [x] Task: Replace placeholders with final assets (Using Polished Konva Primitives as per agreement).
- [x] Task: Add "Juice": Screen shake on word eruption, impact effects, and animations.
- [x] Task: Integrate XP calculation and `useGameStore`.
- [x] Task: Implement Victory/Defeat screens. 80b7637
- [x] Task: Measure - User Manual Verification 'Phase 5: Polish & Integration' (Protocol in workflow.md)

## Phase 6: Gameplay Depth & Balancing
- [x] Task: Create `CASTLE_DEFENSE_CONFIG` with unit stats and wave multipliers. 465c354
- [x] Task: Refactor `Enemy` type to include `type` (Soldier, Tank, Boss) and update spawn logic. 465c354
- [x] Task: Implement **Wave Manager**: Budget-based generation + 15-unit max concurrency queue. 465c354
- [x] Task: Implement **Wave Cooldown** state (5s timer between waves). 465c354
- [x] Task: Implement **Win Condition**: All towers built & enemies cleared. 465c354
- [ ] Task: Measure - User Manual Verification 'Phase 6: Gameplay Depth & Balancing' (Protocol in workflow.md)
