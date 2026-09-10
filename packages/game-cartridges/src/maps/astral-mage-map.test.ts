import { describe, expect, it } from "vitest";

import {
  isStandardPlayMapPointInsideSolid,
  validateStandardPlayMap,
} from "./standard-play-map.js";
import {
  ASTRAL_MAGE_MAP,
  astralMageReachable,
} from "./astral-mage-map.js";

describe("Astral Mage map", () => {
  it("passes structural validation", () => {
    expect(() => validateStandardPlayMap(ASTRAL_MAGE_MAP)).not.toThrow();
  });

  it("keeps the mage, wardens, and six crystal clearings outside solids", () => {
    const points = [
      ASTRAL_MAGE_MAP.playerSpawn,
      ...ASTRAL_MAGE_MAP.enemySpawns,
      ...ASTRAL_MAGE_MAP.clearings.map((clearing) => clearing.center),
    ];
    expect(ASTRAL_MAGE_MAP.clearings).toHaveLength(6);
    expect(ASTRAL_MAGE_MAP.enemySpawns).toHaveLength(2);
    for (const candidate of points) {
      expect(isStandardPlayMapPointInsideSolid(candidate, 12, ASTRAL_MAGE_MAP.solids)).toBe(false);
    }
  });

  it("connects every crystal clearing and every warden spawn from the mage", () => {
    const destinations = [
      ...ASTRAL_MAGE_MAP.clearings.map((clearing) => clearing.center),
      ...ASTRAL_MAGE_MAP.enemySpawns,
    ];
    for (const destination of destinations) {
      expect(astralMageReachable(ASTRAL_MAGE_MAP.playerSpawn, destination)).toBe(true);
    }
  });

  it("keeps each visible path centerline outside solid footprints", () => {
    for (const path of ASTRAL_MAGE_MAP.paths) {
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
          expect(isStandardPlayMapPointInsideSolid(candidate, 4, ASTRAL_MAGE_MAP.solids)).toBe(false);
        }
      }
    }
  });

  it("provides at least two distinct landmark kinds", () => {
    const kinds = [...new Set(ASTRAL_MAGE_MAP.decor.map((item) => item.kind))];
    expect(kinds.length).toBeGreaterThanOrEqual(2);
    expect(kinds).toEqual(expect.arrayContaining(["mausoleum", "ruins", "crystal"]));
  });
});
