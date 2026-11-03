import { describe, expect, it, vi } from "vitest";

import {
  createLabyrinthGoblinKingController,
  LABYRINTH_AURA_MS,
  LABYRINTH_STEP_MS,
  type LabyrinthDirection,
  type LabyrinthGoblinKingSnapshot,
} from "./labyrinth-goblin-king.js";

type Controller = ReturnType<typeof createLabyrinthGoblinKingController>;

const INPUT = [
  { term: "Find the king", translation: "Encuentra al rey" },
  { term: "Run", translation: "Corre" },
];

const STEPS: readonly [LabyrinthDirection, number, number][] = [
  ["right", 1, 0],
  ["left", -1, 0],
  ["down", 0, 1],
  ["up", 0, -1],
];

/**
 * Places the player next to one orb and runs exactly one maze step onto it.
 * @param controller Controller under test.
 * @param wantCorrect Whether to step onto the answer orb or a decoy.
 * @returns The state after the step.
 * @throws When no floor cell next to the chosen orb accepts the player.
 */
function stepOnto(controller: Controller, wantCorrect: boolean): LabyrinthGoblinKingSnapshot {
  const state = controller.capture();
  const orb = state.orbs.find((item) => (item.word === state.answer) === wantCorrect)!;
  for (const [direction, dc, dr] of STEPS) {
    const player = { ...state.player, column: orb.column - dc, row: orb.row - dr, direction, queuedDirection: direction };
    if (state.goblins.some((goblin) => goblin.column === player.column && goblin.row === player.row)) continue;
    try {
      controller.restore({ ...state, player, mazeSteps: 0, stepAccumulatorMs: 0 });
    } catch {
      continue;
    }
    return controller.tick(LABYRINTH_STEP_MS);
  }
  throw new Error("no floor next to the orb");
}

describe("Labyrinth word orbs", () => {
  it("spawns the answer and two sentence decoys on distinct cells", () => {
    const state = createLabyrinthGoblinKingController(INPUT, vi.fn()).snapshot();
    expect(state.orbs.map((orb) => orb.word).sort()).toEqual(["Find", "king", "the"]);
    expect(new Set(state.orbs.map((orb) => `${orb.column}:${orb.row}`)).size).toBe(3);
    expect(state.orbs.find((orb) => orb.word === "king")!.orderIndex).toBe(2);
    expect(state).toMatchObject({ phase: "playing", answer: "Find", sentenceWordCount: 3, player: { column: 1, row: 1, lives: 3 } });
  });

  it("scores a correct orb and spawns the next wave", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn());
    const state = stepOnto(controller, true);
    expect(state).toMatchObject({ targetIndex: 1, correctAnswers: 1, totalAttempts: 1, score: 100, spawnWave: 1, lastOutcome: "correct", builtSentence: "Find", answer: "the" });
    expect(state.orbs.every((orb) => orb.id.startsWith("1:"))).toBe(true);
  });

  it("costs a life and grants a second of safety for a wrong orb", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn());
    const state = stepOnto(controller, false);
    expect(state).toMatchObject({ targetIndex: 0, totalAttempts: 1, score: 0, spawnWave: 1, lastOutcome: "incorrect", player: { lives: 2, invulnerabilityMs: 1_000 } });
  });

  it("ends in defeat after three wrong orbs and delivers once", () => {
    const deliver = vi.fn();
    const controller = createLabyrinthGoblinKingController(INPUT, deliver);
    stepOnto(controller, false);
    stepOnto(controller, false);
    const lost = stepOnto(controller, false);
    expect(lost).toMatchObject({ phase: "defeat", spawnWave: 3, player: { lives: 0 } });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 0, totalAttempts: 3, accuracy: 0, score: 0, xp: 0 }));
    expect(controller.tick(1_000)).toEqual(lost);
  });

  it("grants the aura and fleeing goblins after a sentence, then wins on the last", () => {
    const deliver = vi.fn();
    const controller = createLabyrinthGoblinKingController(INPUT, deliver);
    stepOnto(controller, true);
    stepOnto(controller, true);
    const next = stepOnto(controller, true);
    expect(next).toMatchObject({ phase: "playing", sentenceIndex: 1, targetIndex: 0, prompt: "Corre", answer: "Run", spawnWave: 3, player: { auraMs: LABYRINTH_AURA_MS } });
    expect(next.goblins.every((goblin) => goblin.fleeing)).toBe(true);
    expect(next.orbs.map((orb) => orb.word)).toEqual(["Run", "Run", "Run"]);
    const won = stepOnto(controller, true);
    expect(won).toMatchObject({ phase: "victory", spawnWave: 3, builtSentence: "Run", correctAnswers: 4, totalAttempts: 4 });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 4, totalAttempts: 4, accuracy: 1, score: 400, xp: 90 }));
  });

  it("delivers nothing after destroy", () => {
    const deliver = vi.fn();
    const controller = createLabyrinthGoblinKingController([{ term: "Run", translation: "Corre" }], deliver);
    controller.destroy();
    expect(controller.tick(LABYRINTH_STEP_MS)).toMatchObject({ destroyed: true, mazeSteps: 0 });
    expect(deliver).not.toHaveBeenCalled();
  });
});

describe("Labyrinth movement and goblins", () => {
  it("caps a frame at 250 ms and keeps the remainder", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn());
    expect(controller.tick(10_000)).toMatchObject({ mazeSteps: 1, stepAccumulatorMs: 250 - LABYRINTH_STEP_MS, player: { column: 2, row: 1 } });
  });

  it("ignores a none direction and turns on a queued cardinal one", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn());
    controller.queueDirection("none");
    expect(controller.snapshot().player.queuedDirection).toBe("right");
    controller.queueDirection("down");
    expect(controller.tick(LABYRINTH_STEP_MS).player).toMatchObject({ column: 1, row: 2, direction: "down" });
  });

  it("keeps moving forward when the queued turn hits a wall", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn());
    controller.queueDirection("up");
    expect(controller.tick(LABYRINTH_STEP_MS).player).toMatchObject({ column: 2, row: 1, direction: "right", queuedDirection: "up" });
  });

  it("costs a life when a goblin shares the player cell", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn());
    const state = controller.capture();
    controller.restore({ ...state, goblins: [{ ...state.goblins[0]!, column: 2, row: 1 }, state.goblins[1]!] });
    expect(controller.tick(LABYRINTH_STEP_MS)).toMatchObject({ lastOutcome: "hazard", player: { lives: 2, invulnerabilityMs: 1_000 } });
  });

  it("eats a goblin while the aura is active", () => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn());
    const state = controller.capture();
    controller.restore({
      ...state,
      player: { ...state.player, auraMs: 1_000 },
      goblins: [{ ...state.goblins[0]!, column: 2, row: 1, fleeing: true }, { ...state.goblins[1]!, fleeing: true }],
    });
    const after = controller.tick(LABYRINTH_STEP_MS);
    expect(after).toMatchObject({ lastOutcome: "goblin-eaten", goblinsEaten: 1, player: { lives: 3 } });
    expect(after.goblins[0]!.eaten).toBe(true);
  });
});

describe("Labyrinth restore validation", () => {
  it.each([
    ["a null state", () => null],
    ["a sentence past the end", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, sentenceIndex: 2 })],
    ["another seed", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, seed: 1 })],
    ["a spawn wave that differs from attempts", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, spawnWave: 1 })],
    ["a full step in the accumulator", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, stepAccumulatorMs: LABYRINTH_STEP_MS })],
    ["a player inside a wall", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, player: { ...s.player, column: 0, row: 0 } })],
    ["four lives", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, player: { ...s.player, lives: 4 } })],
    ["a defeat with lives left", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, phase: "defeat" })],
    ["an early victory", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, phase: "victory", spawnWave: -1 })],
    ["fleeing goblins without the aura", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, goblins: s.goblins.map((g) => ({ ...g, fleeing: true })) })],
    ["an orb word outside the sentence", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, orbs: s.orbs.map((o) => ({ ...o, word: "Corre" })) })],
    ["two orbs", (s: LabyrinthGoblinKingSnapshot) => ({ ...s, orbs: s.orbs.slice(1) })],
  ])("rejects %s", (_label, patch) => {
    const controller = createLabyrinthGoblinKingController(INPUT, vi.fn());
    expect(() => controller.restore(patch(controller.capture()) as never)).toThrow("Labyrinth responsive state is invalid");
  });

  it("restores captured progress into a fresh run", () => {
    const source = createLabyrinthGoblinKingController(INPUT, vi.fn(), 3);
    stepOnto(source, false);
    stepOnto(source, true);
    const target = createLabyrinthGoblinKingController(INPUT, vi.fn(), 3);
    target.restore(source.capture());
    expect(target.snapshot()).toEqual(source.snapshot());
  });
});
