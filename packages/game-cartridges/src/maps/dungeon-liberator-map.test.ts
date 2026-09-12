import { describe, expect, it } from "vitest";

import {
  isStandardPlayMapPointInsideSolid,
  validateStandardPlayMap,
} from "./standard-play-map.js";
import {
  DUNGEON_LIBERATOR_MAP,
  dungeonLiberatorReachable,
} from "./dungeon-liberator-map.js";

describe("Dungeon Liberator map", () => {
  it("passes structural validation", () => {
    expect(() => validateStandardPlayMap(DUNGEON_LIBERATOR_MAP)).not.toThrow();
  });

  it("keeps the player, enemies, and clearings outside solids", () => {
    const points = [
      DUNGEON_LIBERATOR_MAP.playerSpawn,
      ...DUNGEON_LIBERATOR_MAP.enemySpawns,
      ...DUNGEON_LIBERATOR_MAP.clearings.map((clearing) => clearing.center),
    ];
    expect(DUNGEON_LIBERATOR_MAP.clearings).toHaveLength(5);
    expect(DUNGEON_LIBERATOR_MAP.enemySpawns).toHaveLength(2);
    for (const candidate of points) {
      expect(isStandardPlayMapPointInsideSolid(candidate, 12, DUNGEON_LIBERATOR_MAP.solids)).toBe(false);
    }
  });

  it("connects every clearing and enemy spawn from the entrance", () => {
    const destinations = [
      ...DUNGEON_LIBERATOR_MAP.clearings.map((clearing) => clearing.center),
      ...DUNGEON_LIBERATOR_MAP.enemySpawns,
    ];
    for (const destination of destinations) {
      expect(dungeonLiberatorReachable(DUNGEON_LIBERATOR_MAP.playerSpawn, destination)).toBe(true);
    }
  });

  it("keeps each path centerline outside solid footprints", () => {
    for (const path of DUNGEON_LIBERATOR_MAP.paths) {
      for (let index = 1; index < path.points.length; index += 1) {
        const start = path.points[index - 1]!;
        const end = path.points[index]!;
        const distance = Math.hypot(end.x - start.x, end.y - start.y);
        const samples = Math.ceil(distance / 8);
        for (let sample = 0; sample <= samples; sample += 1) {
          const progress = sample / samples;
          const candidate = {
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
          };
          expect(isStandardPlayMapPointInsideSolid(candidate, 4, DUNGEON_LIBERATOR_MAP.solids)).toBe(false);
        }
      }
    }
  });

  it("provides at least two distinct landmark kinds", () => {
    const kinds = [...new Set(DUNGEON_LIBERATOR_MAP.decor.map((item) => item.kind))];
    expect(kinds.length).toBeGreaterThanOrEqual(2);
    expect(kinds).toEqual(expect.arrayContaining(["wall", "cell-bars", "cell-door"]));
    expect(DUNGEON_LIBERATOR_MAP.decor.filter((item) => item.kind === "cell-bars")).toHaveLength(8);
    expect(DUNGEON_LIBERATOR_MAP.decor.filter((item) => item.kind === "cell-bars").every((item) => item.assetKey === "prop:cell-bars")).toBe(true);
    expect(DUNGEON_LIBERATOR_MAP.terrain[1]?.assetKey).toBe("path:stone");
  });
});
