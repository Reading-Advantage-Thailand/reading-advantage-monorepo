# Plan: Tile-Based Background and Asset System

## Phase 1: Grid Refactoring & Map Realignment [checkpoint: 3b96dd4]
- [x] Task: Update `TILE_SIZE` to 50 and realign `MAP_CONFIG` coordinates in `src/lib/castleDefense.ts` to grid centers (25, 75, etc.). [a224db0]
- [x] Task: Update existing unit tests in `src/lib/castleDefense.test.ts` to reflect new coordinates. [a224db0]
- [x] Task: Measure - User Manual Verification 'Phase 1: Grid Refactoring' (Protocol in workflow.md) [3b96dd4]

## Phase 2: Asset Loading & Tile Logic [checkpoint: ba522d3]
- [x] Task: Create a tile selection utility in `src/lib/castleDefense.ts` that determines the correct road tile (EW, NS, Corner) and rotation for any given path coordinate. [e021786]
- [x] Task: Write unit tests for the road tile selection logic to ensure all corner rotations are correct. [e021786]
- [x] Task: Implement a grass distribution generator that assigns a stable random grass variant to every grid cell. [e021786]
- [x] Task: Measure - User Manual Verification 'Phase 2: Asset Loading & Tile Logic' (Protocol in workflow.md) [ba522d3]

## Phase 3: Visual Implementation (Background & Assets) [checkpoint: 7a65467]
- [x] Task: Create a `BackgroundLayer` component in `src/components/castle-defense/` that renders the grass and roads to a cached Konva layer. [a39af01]
- [x] Task: Update `CastleDefenseGame.tsx` to use `player-castle.png` for the base. [a39af01]
- [x] Task: Update `CastleDefenseGame.tsx` to use `tower-base.png` for slots and `tower-built.png` for active towers. [a39af01]
- [x] Task: Remove old primitive rendering logic (Rects/Lines for roads and background). [a39af01]
- [x] Task: Measure - User Manual Verification 'Phase 3: Visual Implementation' (Protocol in workflow.md) [7a65467]

## Phase 4: Final Polishing & Verification [checkpoint: cadecae]
- [x] Task: Verify that all entities (enemies, projectiles, player) are still correctly aligned with the new road visuals.
- [x] Task: Ensure the background caching is working correctly and not causing re-render issues.
- [x] Task: Measure - User Manual Verification 'Phase 4: Final Polishing' (Protocol in workflow.md) [cadecae]