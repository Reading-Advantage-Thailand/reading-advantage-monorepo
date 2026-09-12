import { describe, expect, it } from "vitest";

import {
  ENCHANTED_LIBRARY_MAP,
  enchantedLibraryReachable,
  isPointInsideEnchantedLibrarySolid,
} from "./enchanted-library-map.js";
import { validateStandardPlayMap } from "./standard-play-map.js";

describe("Enchanted Library map", () => {
  it("validates on load and keeps spawns and clearings outside solids", () => {
    expect(() => validateStandardPlayMap(ENCHANTED_LIBRARY_MAP)).not.toThrow();
    const points = [
      ENCHANTED_LIBRARY_MAP.playerSpawn,
      ...ENCHANTED_LIBRARY_MAP.enemySpawns,
      ...ENCHANTED_LIBRARY_MAP.clearings.map((clearing) => clearing.center),
    ];
    for (const candidate of points) expect(isPointInsideEnchantedLibrarySolid(candidate, 12)).toBe(false);
  });

  it("connects every clearing and enemy spawn to the player spawn", () => {
    const destinations = [
      ...ENCHANTED_LIBRARY_MAP.clearings.map((clearing) => clearing.center),
      ...ENCHANTED_LIBRARY_MAP.enemySpawns,
    ];
    for (const destination of destinations) {
      expect(enchantedLibraryReachable(ENCHANTED_LIBRARY_MAP.playerSpawn, destination)).toBe(true);
    }
  });

  it("keeps each aisle centerline outside shelf footprints", () => {
    for (const path of ENCHANTED_LIBRARY_MAP.paths) {
      for (let index = 1; index < path.points.length; index += 1) {
        const start = path.points[index - 1]!;
        const end = path.points[index]!;
        const distance = Math.hypot(end.x - start.x, end.y - start.y);
        const samples = Math.ceil(distance / 8);
        for (let sample = 0; sample <= samples; sample += 1) {
          const progress = sample / samples;
          expect(isPointInsideEnchantedLibrarySolid({
            x: start.x + (end.x - start.x) * progress,
            y: start.y + (end.y - start.y) * progress,
          }, 4)).toBe(false);
        }
      }
    }
  });

  it("provides library landmarks and stable shelf rows", () => {
    const kinds = ENCHANTED_LIBRARY_MAP.decor.map((item) => item.kind);
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(2);
    expect(kinds).toEqual(expect.arrayContaining(["shelf", "lantern", "entrance", "wall"]));
    expect(ENCHANTED_LIBRARY_MAP.decor.filter((item) => item.kind === "shelf").length).toBeGreaterThanOrEqual(12);
    expect(ENCHANTED_LIBRARY_MAP.decor.some((item) => item.id === "reading-west")).toBe(false);
    expect(ENCHANTED_LIBRARY_MAP.decor.filter((item) => item.kind === "wall")).toHaveLength(5);
  });
});
