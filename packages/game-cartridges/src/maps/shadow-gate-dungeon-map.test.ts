import { describe, expect, it } from "vitest";

import {
  isStandardPlayMapPointInsideSolid,
  validateStandardPlayMap,
} from "./standard-play-map.js";
import {
  SHADOW_GATE_DUNGEON_MAP,
  shadowGateDungeonReachable,
} from "./shadow-gate-dungeon-map.js";

describe("Shadow Gate dungeon map", () => {
  it("passes structural validation", () => {
    expect(() => validateStandardPlayMap(SHADOW_GATE_DUNGEON_MAP)).not.toThrow();
  });

  it("keeps the player, enemies, and clearings outside solids", () => {
    const points = [
      SHADOW_GATE_DUNGEON_MAP.playerSpawn,
      ...SHADOW_GATE_DUNGEON_MAP.enemySpawns,
      ...SHADOW_GATE_DUNGEON_MAP.clearings.map((clearing) => clearing.center),
    ];
    expect(SHADOW_GATE_DUNGEON_MAP.clearings).toHaveLength(4);
    expect(SHADOW_GATE_DUNGEON_MAP.enemySpawns).toHaveLength(3);
    for (const candidate of points) {
      expect(isStandardPlayMapPointInsideSolid(candidate, 12, SHADOW_GATE_DUNGEON_MAP.solids)).toBe(false);
    }
  });

  it("connects every clearing and enemy spawn from the entry room", () => {
    const destinations = [
      ...SHADOW_GATE_DUNGEON_MAP.clearings.map((clearing) => clearing.center),
      ...SHADOW_GATE_DUNGEON_MAP.enemySpawns,
    ];
    for (const destination of destinations) {
      expect(shadowGateDungeonReachable(SHADOW_GATE_DUNGEON_MAP.playerSpawn, destination)).toBe(true);
    }
  });

  it("keeps each path centerline outside solid footprints", () => {
    for (const path of SHADOW_GATE_DUNGEON_MAP.paths) {
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
          expect(isStandardPlayMapPointInsideSolid(candidate, 4, SHADOW_GATE_DUNGEON_MAP.solids)).toBe(false);
        }
      }
    }
  });

  it("provides at least two distinct landmark kinds", () => {
    const kinds = [...new Set(SHADOW_GATE_DUNGEON_MAP.decor.map((item) => item.kind))];
    expect(kinds.length).toBeGreaterThanOrEqual(2);
    expect(kinds).toEqual(expect.arrayContaining(["wall", "grave", "lantern"]));
    expect(SHADOW_GATE_DUNGEON_MAP.decor.some((item) => item.kind === "ruins")).toBe(false);
    expect(SHADOW_GATE_DUNGEON_MAP.terrain[1]?.assetKey).toBe("path:crypt");
  });
});
