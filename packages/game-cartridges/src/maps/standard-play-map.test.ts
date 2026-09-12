import { describe, expect, it } from "vitest";

import {
  StandardPlayMapValidationError,
  isStandardPlayMapPointInsideSolid,
  isStandardPlayMapPointReachable,
  validateStandardPlayMap,
  type StandardPlayMap,
} from "./standard-play-map.js";

/** Builds a minimal valid play map for contract tests. */
function makeMap(overrides: Partial<StandardPlayMap> = {}): StandardPlayMap {
  return {
    id: "test-map",
    world: { width: 200, height: 200 },
    playerSpawn: { x: 20, y: 180 },
    enemySpawns: [{ x: 180, y: 20 }],
    clearings: [{ id: "answer-a", center: { x: 100, y: 100 }, radius: 24 }],
    paths: [{ id: "spine", points: [{ x: 20, y: 180 }, { x: 100, y: 100 }], width: 24 }],
    terrain: [{ id: "ground", assetKey: "world:ground", depth: -40 }],
    decor: [{ id: "tree", kind: "tree", assetKey: "prop:tree", position: { x: 40, y: 40 }, displayWidth: 32, displayHeight: 48, depth: 10 }],
    solids: [{ x: 60, y: 60, width: 20, height: 20 }],
    ...overrides,
  };
}

describe("StandardPlayMap contract", () => {
  it("accepts a well-formed map", () => {
    expect(() => validateStandardPlayMap(makeMap())).not.toThrow();
  });

  it("names the failing field on malformed input", () => {
    const cases: Array<[Partial<StandardPlayMap>, string]> = [
      [{ world: { width: 0, height: 200 } }, "world"],
      [{ playerSpawn: { x: -5, y: 10 } }, "playerSpawn"],
      [{ paths: [{ id: "bad", points: [{ x: 0, y: 0 }], width: 10 }] }, "paths[0].points"],
      [{ decor: [{ id: "d", kind: "x", assetKey: "prop:tree", position: { x: 1, y: 1 }, displayWidth: 0, displayHeight: 10, depth: 1 }] }, "decor[0]"],
      [{ solids: [{ x: 0, y: 0, width: -1, height: 10 }] }, "solids[0]"],
    ];
    for (const [override, field] of cases) {
      try {
        validateStandardPlayMap(makeMap(override));
        throw new Error(`Expected validation to fail for ${field}`);
      } catch (error) {
        expect(error).toBeInstanceOf(StandardPlayMapValidationError);
        expect((error as StandardPlayMapValidationError).field).toBe(field);
      }
    }
  });

  it("shares the solid and reachability API across two different maps", () => {
    const first = makeMap();
    const second = makeMap({
      id: "second-map",
      world: { width: 400, height: 300 },
      playerSpawn: { x: 30, y: 270 },
      enemySpawns: [],
      clearings: [{ id: "answer-b", center: { x: 360, y: 40 }, radius: 20 }],
      paths: [{ id: "long", points: [{ x: 30, y: 270 }, { x: 360, y: 40 }], width: 20 }],
      decor: [],
      solids: [{ x: 150, y: 0, width: 20, height: 200 }],
    });
    for (const map of [first, second]) {
      expect(isStandardPlayMapPointInsideSolid(map.playerSpawn, 4, map.solids)).toBe(false);
      const destination = map.clearings[0]!.center;
      expect(isStandardPlayMapPointReachable(map.playerSpawn, destination, map)).toBe(true);
    }
  });

  it("blocks reachability through a wall with no opening", () => {
    const map = makeMap({
      solids: [{ x: 90, y: 0, width: 20, height: 200 }],
    });
    expect(isStandardPlayMapPointReachable(map.playerSpawn, map.clearings[0]!.center, map)).toBe(false);
  });
});
