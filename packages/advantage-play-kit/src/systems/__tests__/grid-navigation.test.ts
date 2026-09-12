import { describe, expect, it } from "vitest";

import { createGridNavigator } from "../grid-navigation.js";

describe("grid navigation", () => {
  it("routes around an expanded obstacle and reuses one target field", () => {
    const navigator = createGridNavigator({
      bounds: { x: 0, y: 0, width: 320, height: 192 },
      cellSize: 32,
      clearance: 12,
      obstacles: [{ x: 128, y: 32, width: 64, height: 128 }],
    });

    const first = navigator.findPath({ x: 16, y: 96 }, { x: 304, y: 96 });
    const second = navigator.findPath({ x: 16, y: 64 }, { x: 304, y: 96 });

    expect(first.length).toBeGreaterThan(2);
    expect(first.some((point) => point.y < 32 || point.y > 160)).toBe(true);
    expect(first.every((point) => navigator.isPassable(point))).toBe(true);
    expect(second.at(-1)).toEqual(first.at(-1));
    expect(navigator.fieldBuildCount).toBe(1);
  });

  it("rebuilds after a target-cell change and recovers from a blocked start", () => {
    const navigator = createGridNavigator({
      bounds: { x: 0, y: 0, width: 192, height: 192 },
      cellSize: 32,
      clearance: 8,
      obstacles: [{ x: 64, y: 64, width: 64, height: 64 }],
    });

    const first = navigator.findPath({ x: 96, y: 96 }, { x: 176, y: 16 });
    const second = navigator.findPath({ x: 96, y: 96 }, { x: 176, y: 176 });

    expect(first.length).toBeGreaterThan(1);
    expect(second.length).toBeGreaterThan(1);
    expect(first[0]).not.toEqual({ x: 96, y: 96 });
    expect(navigator.fieldBuildCount).toBe(2);
  });

  it("fails closed for an unreachable target", () => {
    const navigator = createGridNavigator({
      bounds: { x: 0, y: 0, width: 160, height: 96 },
      cellSize: 32,
      clearance: 0,
      obstacles: [{ x: 64, y: 0, width: 32, height: 96 }],
    });

    expect(navigator.findPath({ x: 16, y: 48 }, { x: 144, y: 48 })).toEqual([]);
    expect(navigator.nextWaypoint({ x: 16, y: 48 }, { x: 144, y: 48 })).toBeUndefined();
  });

  it("rejects a grid that exceeds its bounded allocation", () => {
    expect(() => createGridNavigator({
      bounds: { x: 0, y: 0, width: 10_000, height: 10_000 },
      cellSize: 1,
      clearance: 0,
      obstacles: [],
    })).toThrow(/cannot exceed/iu);
  });
});
