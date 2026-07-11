import { describe, expect, it } from "vitest";
import { arenaWaveIndex, expectedArenaTarget, moveArenaPoint, projectilePathDistance, projectToMinimap, territoryProgress } from ".";

describe("deterministic arena family", () => {
  it("clamps movement and projects the same position onto a minimap", () => {
    expect(moveArenaPoint({ x: 2, y: 2 }, { x: -5, y: 20 }, { width: 10, height: 8 })).toEqual({ x: 0, y: 8 });
    expect(projectToMinimap({ x: 500, y: 250 }, { width: 1000, height: 500 }, { width: 100, height: 50 })).toEqual({ x: 50, y: 25 });
  });
  it("resolves ordered targets, swept collisions, waves, and territory", () => {
    const targets = [{ id: "a", label: "A", order: 0, x: 5, y: 2 }];
    expect(expectedArenaTarget(targets, 0)?.id).toBe("a");
    expect(projectilePathDistance({ x: 5, y: 2 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(2);
    expect(arenaWaveIndex(6, 3)).toBe(2);
    expect(territoryProgress(3, 4)).toBe(0.75);
  });
  it("rejects invalid bounds and covers collision and progress edges", () => {
    expect(() => moveArenaPoint({ x: 0, y: 0 }, { x: 1, y: 1 }, { width: 0, height: 1 })).toThrow(/bounds/);
    expect(() => projectToMinimap({ x: 0, y: 0 }, { width: 1, height: 0 }, { width: 1, height: 1 })).toThrow(/bounds/);
    expect(() => arenaWaveIndex(-1, 3)).toThrow(/wave/);
    expect(() => arenaWaveIndex(1, 0)).toThrow(/wave/);
    expect(() => territoryProgress(1, 0)).toThrow(/total/);
    expect(projectilePathDistance({ x: 3, y: 4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBe(5);
    expect(territoryProgress(-1, 4)).toBe(0);
    expect(territoryProgress(8, 4)).toBe(1);
  });
});
