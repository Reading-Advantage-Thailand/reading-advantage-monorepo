import { describe, expect, it } from "vitest";

import * as cartridgeModule from "../../index";

type LaneDirection = "left" | "right";
type GridDirection = "up" | "down" | "left" | "right";
type ScrollTarget = { readonly id: string; readonly position: number };

type TraversalModule = {
  readonly moveLane?: (
    currentLane: number,
    direction: LaneDirection,
    laneCount: number,
  ) => number;
  readonly createGateWave?: (options: {
    readonly correctIndex: number;
    readonly decoyIndices: readonly number[];
    readonly laneCount: number;
    readonly waveIndex: number;
    readonly seed: number;
  }) => readonly {
    readonly id: string;
    readonly lane: number;
    readonly contentIndex: number;
    readonly correct: boolean;
  }[];
  readonly advanceScrollTargets?: (options: {
    readonly targets: readonly ScrollTarget[];
    readonly deltaMs: number;
    readonly speed: number;
    readonly collisionLine: number;
  }) => {
    readonly targets: readonly ScrollTarget[];
    readonly crossedTargetIds: readonly string[];
  };
  readonly moveGridPosition?: (
    position: { readonly column: number; readonly row: number },
    direction: GridDirection,
    bounds: {
      readonly columns: number;
      readonly minimumRow: number;
      readonly maximumRow: number;
    },
  ) => { readonly column: number; readonly row: number };
  readonly resolveOrderedTarget?: (state: {
    readonly targetIndex: number;
    readonly selectedIndex: number;
    readonly attempts: number;
    readonly correctAnswers: number;
  }) => {
    readonly correct: boolean;
    readonly nextTargetIndex: number;
    readonly attempts: number;
    readonly correctAnswers: number;
  };
};

const traversal = cartridgeModule as typeof cartridgeModule & TraversalModule;

describe("deterministic traversal family", () => {
  it("moves between bounded lanes without wrapping", () => {
    expect(traversal.moveLane).toBeTypeOf("function");
    expect(traversal.moveLane?.(0, "left", 3)).toBe(0);
    expect(traversal.moveLane?.(0, "right", 3)).toBe(1);
    expect(traversal.moveLane?.(2, "right", 3)).toBe(2);
    expect(() => traversal.moveLane?.(0, "right", 0)).toThrow(/lane count/i);
  });

  it("creates a seeded gate wave with one correct unique lane", () => {
    expect(traversal.createGateWave).toBeTypeOf("function");
    const options = {
      correctIndex: 2,
      decoyIndices: [0, 1],
      laneCount: 3,
      waveIndex: 4,
      seed: 17,
    } as const;

    expect(traversal.createGateWave?.(options)).toEqual([
      { id: "gate:4:0", lane: 0, contentIndex: 0, correct: false },
      { id: "gate:4:1", lane: 1, contentIndex: 2, correct: true },
      { id: "gate:4:2", lane: 2, contentIndex: 1, correct: false },
    ]);
    expect(traversal.createGateWave?.(options)).toEqual(
      traversal.createGateWave?.(options),
    );
  });

  it("reports targets that cross a collision line between frames", () => {
    expect(traversal.advanceScrollTargets).toBeTypeOf("function");
    const targets = [
      { id: "near", position: 80 },
      { id: "far", position: 20 },
    ] as const;

    expect(
      traversal.advanceScrollTargets?.({
        targets,
        deltaMs: 250,
        speed: 100,
        collisionLine: 100,
      }),
    ).toEqual({
      targets: [
        { id: "near", position: 105 },
        { id: "far", position: 45 },
      ],
      crossedTargetIds: ["near"],
    });
    expect(targets[0].position).toBe(80);
  });

  it("clamps grid movement and resolves ordered vertical targets", () => {
    expect(traversal.moveGridPosition).toBeTypeOf("function");
    expect(traversal.resolveOrderedTarget).toBeTypeOf("function");
    const bounds = { columns: 4, minimumRow: 0, maximumRow: 12 } as const;
    const origin = { column: 0, row: 0 } as const;

    expect(traversal.moveGridPosition?.(origin, "left", bounds)).toEqual(origin);
    expect(traversal.moveGridPosition?.(origin, "down", bounds)).toEqual(origin);
    expect(traversal.moveGridPosition?.(origin, "right", bounds)).toEqual({
      column: 1,
      row: 0,
    });
    expect(traversal.moveGridPosition?.(origin, "up", bounds)).toEqual({
      column: 0,
      row: 1,
    });
    expect(origin).toEqual({ column: 0, row: 0 });

    expect(
      traversal.resolveOrderedTarget?.({
        targetIndex: 2,
        selectedIndex: 2,
        attempts: 4,
        correctAnswers: 3,
      }),
    ).toEqual({
      correct: true,
      nextTargetIndex: 3,
      attempts: 5,
      correctAnswers: 4,
    });
    expect(
      traversal.resolveOrderedTarget?.({
        targetIndex: 2,
        selectedIndex: 1,
        attempts: 4,
        correctAnswers: 3,
      }),
    ).toEqual({
      correct: false,
      nextTargetIndex: 2,
      attempts: 5,
      correctAnswers: 3,
    });
  });
});
