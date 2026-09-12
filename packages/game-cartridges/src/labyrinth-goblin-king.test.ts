import { describe, expect, it, vi } from "vitest";

import type { GameInput } from "@reading-advantage/advantage-play-kit";

import {
  LABYRINTH_AURA_MS,
  LABYRINTH_ORB_COLOR,
  LABYRINTH_STEP_MS,
  createLabyrinthGoblinKingController,
  type LabyrinthDirection,
  type LabyrinthWordOrb,
} from "./labyrinth-goblin-king.js";

const INPUT = [
  { term: "the goblin waits", translation: "ก็อบลินรออยู่" },
  { term: "we escape", translation: "พวกเราหลบหนี" },
] as unknown as GameInput;

function isWall(column: number, row: number): boolean {
  if ((column === 0 && row === 1) || (column === 10 && row === 13)) return false;
  return row === 0 || row === 14 || column === 0 || column === 10 || (row % 2 === 0 && column % 2 === 0);
}

function contact(controller: ReturnType<typeof createLabyrinthGoblinKingController>, orb: LabyrinthWordOrb): void {
  const approaches: readonly [number, number, LabyrinthDirection][] = [[-1, 0, "right"], [1, 0, "left"], [0, -1, "down"], [0, 1, "up"]];
  const [dx, dy, direction] = approaches.find(([x, y]) => !isWall(orb.column + x, orb.row + y))!;
  const state = controller.capture();
  controller.restore({ ...state, player: { ...state.player, column: orb.column + dx, row: orb.row + dy, direction, queuedDirection: direction } });
  controller.tick(LABYRINTH_STEP_MS);
}

describe("Labyrinth of the Goblin King", () => {
  it("queues turns at maze openings and continues forward when a queued turn meets a wall", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn(), 7);
    controller.queueDirection("up");
    controller.tick(LABYRINTH_STEP_MS);
    expect(controller.snapshot().player).toMatchObject({ column: 2, row: 1, direction: "right", queuedDirection: "up" });
    controller.queueDirection("down");
    controller.tick(LABYRINTH_STEP_MS);
    expect(controller.snapshot().player).toMatchObject({ column: 3, row: 1, direction: "right", queuedDirection: "down" });
    const boundary = controller.capture();
    controller.restore({ ...boundary, player: { ...boundary.player, column: 0, row: 1, direction: "left", queuedDirection: "left" } });
    controller.tick(LABYRINTH_STEP_MS);
    expect(controller.snapshot().player).toMatchObject({ column: 0, row: 1 });
  });

  it("counts only physical neutral-word contacts and penalizes a wrong-order orb", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn(), 13);
    controller.tick(20);
    expect(controller.snapshot().totalAttempts).toBe(0);
    const state = controller.snapshot();
    expect(LABYRINTH_ORB_COLOR).toBe(0x5865d8);
    contact(controller, state.orbs.find((orb) => orb.orderIndex === 1)!);
    expect(controller.snapshot()).toMatchObject({ targetIndex: 0, correctAnswers: 0, totalAttempts: 1, lastOutcome: "incorrect" });
    contact(controller, controller.snapshot().orbs.find((orb) => orb.word === controller.snapshot().answer)!);
    expect(controller.snapshot()).toMatchObject({ targetIndex: 1, builtSentence: "the", correctAnswers: 1, totalAttempts: 2 });
  });

  it("grants the goblin-fleeing aura at a sentence boundary and completes the finite deck once", () => {
    const complete = vi.fn();
    const controller = createLabyrinthGoblinKingController(INPUT, complete, 19);
    while (controller.snapshot().sentenceIndex === 0) {
      const state = controller.snapshot();
      contact(controller, state.orbs.find((orb) => orb.word === state.answer)!);
    }
    expect(controller.snapshot().player.auraMs).toBe(LABYRINTH_AURA_MS);
    expect(controller.snapshot().goblins.every((goblin) => goblin.fleeing)).toBe(true);
    expect(complete).not.toHaveBeenCalled();
    while (controller.snapshot().phase === "playing") {
      const state = controller.snapshot();
      contact(controller, state.orbs.find((orb) => orb.word === state.answer)!);
    }
    expect(controller.snapshot()).toMatchObject({ phase: "victory", correctAnswers: 5, totalAttempts: 5, score: 500 });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("restores complete bounded maze state and rejects inconsistent progress", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn(), 29);
    controller.queueDirection("down");
    controller.tick(50);
    const captured = controller.capture();
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);
    expect(() => controller.restore({ ...captured, builtSentence: "invented" })).toThrow("responsive state is invalid");
    expect(() => controller.restore({ ...captured, orbs: [...captured.orbs, ...captured.orbs] })).toThrow("responsive state is invalid");
  });

  it("accepts every identical visible word and staggers slower goblin movement", () => {
    const controller = createLabyrinthGoblinKingController(
      [{ term: "Welcome", translation: "ยินดีต้อนรับ" }] as unknown as GameInput,
      vi.fn(),
      37,
    );
    const initial = controller.snapshot();
    expect(initial.orbs.map((orb) => orb.word)).toEqual(["Welcome", "Welcome", "Welcome"]);
    const goblins = initial.goblins;
    controller.tick(LABYRINTH_STEP_MS);
    expect(controller.snapshot().goblins).toEqual(goblins);
    contact(controller, initial.orbs[2]!);
    expect(controller.snapshot()).toMatchObject({ phase: "victory", correctAnswers: 1, totalAttempts: 1 });
  });

  it("places seeded goblins outside the six-cell start zone and away from words", () => {
    for (const seed of [0, 1, 7, 99]) {
      const state = createLabyrinthGoblinKingController(INPUT, vi.fn(), seed).snapshot();
      const goblinCells = state.goblins.map((goblin) => `${goblin.column}:${goblin.row}`);
      const wordCells = new Set(state.orbs.map((orb) => `${orb.column}:${orb.row}`));
      expect(new Set(goblinCells).size).toBe(state.goblins.length);
      expect(state.goblins.every((goblin) => !isWall(goblin.column, goblin.row))).toBe(true);
      expect(state.goblins.every((goblin) => Math.abs(goblin.column - state.player.column) + Math.abs(goblin.row - state.player.row) >= 6)).toBe(true);
      expect(goblinCells.every((cell) => !wordCells.has(cell))).toBe(true);
    }
  });
});
