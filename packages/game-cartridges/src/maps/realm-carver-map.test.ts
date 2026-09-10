import { describe, expect, it } from "vitest";

import {
  isStandardPlayMapPointInsideSolid,
  validateStandardPlayMap,
} from "./standard-play-map.js";
import {
  REALM_CARVER_MAP,
  realmCarverReachable,
} from "./realm-carver-map.js";

describe("Realm Carver map", () => {
  it("passes structural validation", () => {
    expect(() => validateStandardPlayMap(REALM_CARVER_MAP)).not.toThrow();
  });

  it("keeps the carver, monsters, and four clearings outside solids", () => {
    const points = [
      REALM_CARVER_MAP.playerSpawn,
      ...REALM_CARVER_MAP.enemySpawns,
      ...REALM_CARVER_MAP.clearings.map((clearing) => clearing.center),
    ];
    expect(REALM_CARVER_MAP.clearings).toHaveLength(4);
    expect(REALM_CARVER_MAP.enemySpawns).toHaveLength(3);
    for (const candidate of points) {
      expect(isStandardPlayMapPointInsideSolid(candidate, 12, REALM_CARVER_MAP.solids)).toBe(false);
    }
  });

  it("connects every clearing and every monster spawn from the entrance", () => {
    const destinations = [
      ...REALM_CARVER_MAP.clearings.map((clearing) => clearing.center),
      ...REALM_CARVER_MAP.enemySpawns,
    ];
    for (const destination of destinations) {
      expect(realmCarverReachable(REALM_CARVER_MAP.playerSpawn, destination)).toBe(true);
    }
  });

  it("keeps each visible path centerline outside solid footprints", () => {
    for (const path of REALM_CARVER_MAP.paths) {
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
          expect(isStandardPlayMapPointInsideSolid(candidate, 4, REALM_CARVER_MAP.solids)).toBe(false);
        }
      }
    }
  });

  it("provides at least two distinct landmark kinds", () => {
    const kinds = [...new Set(REALM_CARVER_MAP.decor.map((item) => item.kind))];
    expect(kinds.length).toBeGreaterThanOrEqual(2);
    expect(kinds).toEqual(expect.arrayContaining(["dead-tree", "ruins", "crystal"]));
    expect(REALM_CARVER_MAP.decor.some((item) => item.assetKey === "prop:dirt-patch")).toBe(false);
    expect(REALM_CARVER_MAP.decor.some((item) => item.assetKey === "prop:fence")).toBe(false);
    expect(REALM_CARVER_MAP.terrain[1]?.assetKey).toBe("path:sand");
  });
});
