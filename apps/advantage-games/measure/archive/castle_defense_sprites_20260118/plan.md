# Implementation Plan - Castle Defense Enemy & Player Sprites

## Phase 1: Sprite Logic Core [checkpoint: 3cebe5e]
- [x] Task: Create `SpriteAnimation` helper or hook. 2b473e9
    - [ ] Create `useSpriteAnimation` hook (or utility function) that manages the 3x3 grid state (Row/Column selection based on Action/Frame).
    - [ ] Implement logic to switch Rows based on state (Idle/Walk -> Row 1, Attack -> Row 2, Death -> Row 3).
    - [ ] Implement frame looping logic (Columns 1-3).
    - [ ] Ensure "Death" state plays once and locks on the final frame.
- [x] Task: Measure - User Manual Verification 'Sprite Logic Core' (Protocol in workflow.md)

## Phase 2: Player Integration [checkpoint: 8b3111c]
- [x] Task: Update `CastleDefenseGame` to use the new `SpriteAnimation` logic for the Player. f2b16b0
    - [ ] Load `player_3x3_pose_sheet.png`.
    - [ ] Replace existing player rendering code with the new sprite rendering.
    - [ ] Verify Row/Col mapping matches the Player asset (Idle vs Walk vs Attack).
- [x] Task: Measure - User Manual Verification 'Player Integration' (Protocol in workflow.md)

## Phase 3: Enemy Integration [checkpoint: 8d981c1]
- [x] Task: Update `CastleDefenseGame` to support multiple enemy types (Goblin, Orc, Troll).
- [x] Task: Update Enemy Rendering Loop.
- [x] Task: Update Spawner Logic.
    - [ ] Randomize `enemyType` when spawning new enemies (Goblin, Orc, Troll).
- [x] Task: Measure - User Manual Verification 'Enemy Integration' (Protocol in workflow.md)
