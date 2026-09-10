import { describe, expect, it } from "vitest";

import {
  isStandardPlayMapPointInsideSolid,
  validateStandardPlayMap,
} from "./standard-play-map.js";
import {
  DEVOURER_SLIME_MAP,
  devourerSlimeReachable,
} from "./devourer-slime-map.js";

describe("Devourer Slime map", () => {
  it("passes structural validation", () => {
    expect(() => validateStandardPlayMap(DEVOURER_SLIME_MAP)).not.toThrow();
  });

  it("keeps the player, slimes, and five word orbs outside solids", () => {
    const points = [
      DEVOURER_SLIME_MAP.playerSpawn,
      ...DEVOURER_SLIME_MAP.enemySpawns,
      ...DEVOURER_SLIME_MAP.clearings.map((clearing) => clearing.center),
    ];
    expect(DEVOURER_SLIME_MAP.clearings).toHaveLength(5);
    expect(DEVOURER_SLIME_MAP.enemySpawns).toHaveLength(2);
    for (const candidate of points) {
      expect(isStandardPlayMapPointInsideSolid(candidate, 12, DEVOURER_SLIME_MAP.solids)).toBe(false);
    }
  });

  it("connects every word orb and every slime spawn from the entrance", () => {
    const destinations = [
      ...DEVOURER_SLIME_MAP.clearings.map((clearing) => clearing.center),
      ...DEVOURER_SLIME_MAP.enemySpawns,
    ];
    for (const destination of destinations) {
      expect(devourerSlimeReachable(DEVOURER_SLIME_MAP.playerSpawn, destination)).toBe(true);
    }
  });

  it("keeps each visible path centerline outside solid footprints", () => {
    for (const path of DEVOURER_SLIME_MAP.paths) {
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
          expect(isStandardPlayMapPointInsideSolid(candidate, 4, DEVOURER_SLIME_MAP.solids)).toBe(false);
        }
      }
    }
  });

  it("provides at least two distinct landmark kinds", () => {
    const kinds = [...new Set(DEVOURER_SLIME_MAP.decor.map((item) => item.kind))];
    expect(kinds.length).toBeGreaterThanOrEqual(2);
    expect(kinds).toEqual(expect.arrayContaining(["dead-tree", "dirt-patch", "gate", "path"]));
    expect(DEVOURER_SLIME_MAP.decor.filter((item) => item.kind === "dirt-patch")).toHaveLength(15);
    expect(DEVOURER_SLIME_MAP.decor.some((item) => item.assetKey === "prop:fence")).toBe(false);
    expect(DEVOURER_SLIME_MAP.terrain[1]?.assetKey).toBe("path:crypt");
    expect(DEVOURER_SLIME_MAP.decor.filter((item) => item.kind === "path").every((item) => item.assetKey === "path:crypt")).toBe(true);
  });
});
