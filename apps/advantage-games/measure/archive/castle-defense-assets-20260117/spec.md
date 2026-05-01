# Specification: Tile-Based Background and Asset System

## Overview
This track involves replacing the current primitive rendering in the Castle Defense game with a high-quality, tile-based system using assets located in `public/games/castle-defense/`. 

## Functional Requirements

### 1. Grid & Coordinates Refactor
-   **Tile Size:** Implement a fixed `TILE_SIZE` of `50px`.
-   **Grid Dimensions:** 16x12 (totaling 800x600 resolution).
-   **Coordinate Realignment:** Update `MAP_CONFIG` in `src/lib/castleDefense.ts` to align all points (path, tower slots, spawn, base) to the center of grid cells (e.g., `25, 25` for the top-left tile).

### 2. Background Rendering Engine
-   **Grass Distribution:** Non-path tiles will be filled with a random selection from `grass_A.png`, `grass_B.png`, `grass_C.png`, and `grass-D.png`.
-   **Caching:** The entire background (grass + roads) must be rendered to a separate Konva Layer and cached as a single image/canvas to ensure high performance.

### 3. Dynamic Road Logic
-   **Tile Selection:**
    -   Horizontal segments use `road_EW.png`.
    -   Vertical segments use `road_NS.png`.
    -   Turns use `road_corner.png`.
-   **Corner Rotation:** Automatically rotate `road_corner.png` based on the entry/exit direction of the path segments.

### 4. New Asset Integration
-   **Base (The House):** Replace the blue rectangle with `player-castle.png`.
-   **Tower Slots:** Replace the grey squares with `tower-base.png`.
-   **Towers:** Replace the navy/blue towers with `tower-built.png`.

## Acceptance Criteria
-   Background is fully covered with varying grass tiles.
-   Road tiles connect seamlessly with correct corner orientations.
-   Towers and the Base use the new high-quality PNG assets.
-   All entities remain centered on the new 50px grid.