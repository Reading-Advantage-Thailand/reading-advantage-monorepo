import { describe, expect, it } from "vitest";

import {
  isStandardPlayMapPointInsideSolid,
  validateStandardPlayMap,
} from "./standard-play-map.js";
import {
  LABYRINTH_GOBLIN_KING_MAP,
  labyrinthGoblinKingReachable,
} from "./labyrinth-goblin-king-map.js";

const COLUMNS = 11;
const ROWS = 15;
const TILE_SIZE = 32;

/** Reports whether a maze cell is a wall under the game rule. */
function isWallCell(column: number, row: number): boolean {
  if ((column === 0 && row === 1) || (column === COLUMNS - 1 && row === ROWS - 2)) return false;
  return row === 0 || row === ROWS - 1 || column === 0 || column === COLUMNS - 1
    || (row % 2 === 0 && column % 2 === 0);
}

/** Counts wall cells under the game rule. */
function wallCellCount(): number {
  let count = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      if (isWallCell(column, row)) count += 1;
    }
  }
  return count;
}

/** Returns the center of one maze cell. */
function cellCenter(column: number, row: number): { x: number; y: number } {
  return { x: column * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
}

describe("Labyrinth of the Goblin King map", () => {
  it("passes structural validation", () => {
    expect(() => validateStandardPlayMap(LABYRINTH_GOBLIN_KING_MAP)).not.toThrow();
  });

  it("emits one mausoleum wall feature per wall cell", () => {
    const walls = LABYRINTH_GOBLIN_KING_MAP.decor.filter((item) => item.kind === "mausoleum");
    expect(walls).toHaveLength(wallCellCount());
    expect(walls.every((item) => item.assetKey === "prop:mausoleum")).toBe(true);
    expect(LABYRINTH_GOBLIN_KING_MAP.solids).toHaveLength(wallCellCount());
  });

  it("keeps the player, enemy, and clearings outside solids", () => {
    const points = [
      LABYRINTH_GOBLIN_KING_MAP.playerSpawn,
      ...LABYRINTH_GOBLIN_KING_MAP.enemySpawns,
      ...LABYRINTH_GOBLIN_KING_MAP.clearings.map((clearing) => clearing.center),
    ];
    for (const candidate of points) {
      expect(isStandardPlayMapPointInsideSolid(candidate, 12, LABYRINTH_GOBLIN_KING_MAP.solids)).toBe(false);
    }
  });

  it("connects the entrance, each clearing, and the enemy spawn", () => {
    const destinations = [
      ...LABYRINTH_GOBLIN_KING_MAP.clearings.map((clearing) => clearing.center),
      ...LABYRINTH_GOBLIN_KING_MAP.enemySpawns,
    ];
    for (const destination of destinations) {
      expect(labyrinthGoblinKingReachable(LABYRINTH_GOBLIN_KING_MAP.playerSpawn, destination)).toBe(true);
    }
  });

  it("keeps every non-wall floor cell center reachable from the spawn", () => {
    for (let row = 0; row < ROWS; row += 1) {
      for (let column = 0; column < COLUMNS; column += 1) {
        if (isWallCell(column, row)) continue;
        const center = cellCenter(column, row);
        expect(labyrinthGoblinKingReachable(LABYRINTH_GOBLIN_KING_MAP.playerSpawn, center)).toBe(true);
      }
    }
  });
});
