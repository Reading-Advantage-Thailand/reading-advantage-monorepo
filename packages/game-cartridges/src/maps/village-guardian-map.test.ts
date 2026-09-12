import { describe, expect, it } from "vitest";

import { validateStandardPlayMap } from "./standard-play-map.js";
import {
  VILLAGE_GUARDIAN_MAP,
  isPointInsideVillageGuardianSolid,
  villageGuardianReachable,
} from "./village-guardian-map.js";

describe("Village Guardian map", () => {
  it("validates on load and keeps spawns and clearings outside solids", () => {
    expect(() => validateStandardPlayMap(VILLAGE_GUARDIAN_MAP)).not.toThrow();
    const points = [
      VILLAGE_GUARDIAN_MAP.playerSpawn,
      ...VILLAGE_GUARDIAN_MAP.enemySpawns,
      ...VILLAGE_GUARDIAN_MAP.clearings.map((clearing) => clearing.center),
    ];
    for (const candidate of points) expect(isPointInsideVillageGuardianSolid(candidate, 12)).toBe(false);
  });

  it("connects every clearing and enemy spawn to the player spawn", () => {
    const destinations = [
      ...VILLAGE_GUARDIAN_MAP.clearings.map((clearing) => clearing.center),
      ...VILLAGE_GUARDIAN_MAP.enemySpawns,
    ];
    for (const destination of destinations) {
      expect(villageGuardianReachable(VILLAGE_GUARDIAN_MAP.playerSpawn, destination)).toBe(true);
    }
  });

  it("keeps each road centerline outside tree and tower footprints", () => {
    for (const path of VILLAGE_GUARDIAN_MAP.paths) {
      for (let index = 1; index < path.points.length; index += 1) {
        const start = path.points[index - 1]!;
        const end = path.points[index]!;
        const distance = Math.hypot(end.x - start.x, end.y - start.y);
        const samples = Math.ceil(distance / 8);
        for (let sample = 0; sample <= samples; sample += 1) {
          const progress = sample / samples;
          expect(isPointInsideVillageGuardianSolid({
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
          }, 4)).toBe(false);
        }
      }
    }
  });

  it("keeps green ground outdoors with roads, landmarks, and a fence border", () => {
    const kinds = VILLAGE_GUARDIAN_MAP.decor.map((item) => item.kind);
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(2);
    expect(kinds).toEqual(expect.arrayContaining(["fence", "dead-tree", "tower", "lantern"]));
    expect(VILLAGE_GUARDIAN_MAP.terrain[0]?.assetKey).toBe("world:ground");
    expect(VILLAGE_GUARDIAN_MAP.terrain.some((layer) => layer.assetKey === "world:path")).toBe(true);
    expect(VILLAGE_GUARDIAN_MAP.decor.filter((item) => item.kind === "dead-tree")).toHaveLength(1);
    expect(VILLAGE_GUARDIAN_MAP.decor.some((item) => item.assetKey === "prop:memorial")).toBe(false);
    expect(VILLAGE_GUARDIAN_MAP.decor.some((item) => item.assetKey === "prop:dirt-patch")).toBe(false);
    expect(VILLAGE_GUARDIAN_MAP.decor.find((item) => item.id === "gate-east")?.position).toEqual({ x: 900, y: 300 });
  });
});
