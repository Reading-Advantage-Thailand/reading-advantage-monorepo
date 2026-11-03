import { describe, expect, it, vi } from "vitest";

import { createSpellweaversRunController, SPELLWEAVERS_RUN_ACTIONS } from "./spellweavers-run.js";

type Controller = ReturnType<typeof createSpellweaversRunController>;

const INPUT = [
  { term: "Cast the spell", translation: "Lanza el hechizo" },
  { term: "Fly", translation: "Vuela" },
];

/**
 * Picks a lane and lets the orbs fall onto it.
 * @param controller Controller under test.
 * @param wantCorrect Whether to stand in the lane with the answer.
 * @returns The state after the orbs land.
 */
function land(controller: Controller, wantCorrect: boolean) {
  const state = controller.snapshot();
  const lane = wantCorrect ? state.correctLane : state.choices.findIndex((choice) => choice !== state.answer);
  controller.choose(SPELLWEAVERS_RUN_ACTIONS[lane]!);
  for (let frame = 0; frame < 11; frame += 1) controller.tick(250);
  return controller.snapshot();
}

describe("Spellweaver's Run lanes and scoring", () => {
  it("puts the answer in exactly one lane among supplied words", () => {
    const state = createSpellweaversRunController(INPUT, vi.fn()).snapshot();
    expect(state.choices.filter((choice) => choice === "Cast")).toHaveLength(1);
    expect(state.choices[state.correctLane]).toBe("Cast");
    expect(state.choices.every((choice) => ["Cast", "the", "spell", "Fly"].includes(choice))).toBe(true);
  });

  it("fills every lane with the answer when no other word exists", () => {
    const state = createSpellweaversRunController([{ term: "Fly", translation: "Vuela" }], vi.fn()).snapshot();
    expect(state.choices).toEqual(["Fly", "Fly", "Fly"]);
    expect(state.correctLane).toBe(0);
  });

  it("rejects actions that are not a lane", () => {
    const controller = createSpellweaversRunController(INPUT, vi.fn());
    expect(controller.choose("move-up")).toMatchObject({ accepted: false, completed: false });
    expect(controller.choose("move-right")).toMatchObject({ accepted: true, correct: false, snapshot: { playerLane: 2 } });
  });

  it("caps a frame at 250 ms and resolves at 240 progress", () => {
    const controller = createSpellweaversRunController(INPUT, vi.fn());
    expect(controller.tick(10_000).orbProgress).toBe(23);
    for (let frame = 0; frame < 9; frame += 1) controller.tick(250);
    expect(controller.snapshot()).toMatchObject({ orbProgress: 230, totalAttempts: 0 });
    expect(controller.tick(250)).toMatchObject({ orbProgress: 0, totalAttempts: 1, waveIndex: 1 });
  });

  it("counts a wrong lane without score or progress", () => {
    const controller = createSpellweaversRunController(INPUT, vi.fn());
    expect(land(controller, false)).toMatchObject({ targetIndex: 0, correctAnswers: 0, totalAttempts: 1, score: 0, lastOutcome: "incorrect", builtSentence: "" });
  });

  it("builds the sentence and resets it for the next prompt", () => {
    const controller = createSpellweaversRunController(INPUT, vi.fn());
    land(controller, true);
    expect(land(controller, true)).toMatchObject({ builtSentence: "Cast the", answer: "spell", score: 200 });
    expect(land(controller, true)).toMatchObject({ builtSentence: "", prompt: "Vuela", answer: "Fly" });
  });

  it("wins once after the last word and then freezes", () => {
    const deliver = vi.fn();
    const controller = createSpellweaversRunController(INPUT, deliver);
    land(controller, false);
    for (let word = 0; word < 4; word += 1) land(controller, true);
    const won = controller.snapshot();
    expect(won).toMatchObject({ phase: "victory", targetIndex: 4, waveIndex: 5, builtSentence: "Fly", lastOutcome: "correct" });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 4, totalAttempts: 5, accuracy: 0.8, score: 400, xp: 88 }));
    expect(controller.choose("confirm")).toMatchObject({ accepted: false, completed: true });
    expect(controller.tick(250)).toEqual(won);
  });

  it("delivers nothing after destroy", () => {
    const deliver = vi.fn();
    const controller = createSpellweaversRunController([{ term: "Fly", translation: "Vuela" }], deliver);
    controller.destroy();
    land(controller, true);
    expect(deliver).not.toHaveBeenCalled();
    expect(controller.snapshot()).toMatchObject({ destroyed: true, totalAttempts: 0 });
  });
});

describe("Spellweaver's Run restore", () => {
  it("restores a captured run and a victory without a second delivery", () => {
    const deliver = vi.fn();
    const source = createSpellweaversRunController(INPUT, vi.fn(), 7);
    land(source, false);
    land(source, true);
    const target = createSpellweaversRunController(INPUT, deliver, 7);
    target.restore(source.capture());
    expect(target.snapshot()).toEqual(source.snapshot());
    for (let word = 0; word < 3; word += 1) land(source, true);
    target.restore(source.capture());
    expect(target.snapshot()).toMatchObject({ phase: "victory" });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("seals delivery when a destroyed state is restored", () => {
    const deliver = vi.fn();
    const controller = createSpellweaversRunController([{ term: "Fly", translation: "Vuela" }], deliver);
    controller.restore({ ...controller.capture(), destroyed: true });
    land(controller, true);
    expect(deliver).not.toHaveBeenCalled();
  });

  it.each([
    ["a null state", () => null],
    ["a fractional target", (s: object) => ({ ...s, targetIndex: 0.5 })],
    ["inflated correct answers", (s: object) => ({ ...s, correctAnswers: 1 })],
    ["a wave that differs from attempts", (s: object) => ({ ...s, waveIndex: 1 })],
    ["another seed", (s: object) => ({ ...s, seed: 1 })],
    ["swapped lanes", (s: { choices: readonly string[] }) => ({ ...s, choices: [...s.choices].reverse() })],
    ["a fourth lane", (s: object) => ({ ...s, playerLane: 3 })],
    ["a landed orb", (s: object) => ({ ...s, orbProgress: 240 })],
    ["an outcome before any attempt", (s: object) => ({ ...s, lastOutcome: "correct" })],
    ["an early victory", (s: object) => ({ ...s, phase: "victory" })],
  ])("rejects %s", (_label, patch) => {
    const controller = createSpellweaversRunController(INPUT, vi.fn());
    expect(() => controller.restore(patch(controller.capture() as never) as never)).toThrow("Spellweaver's Run responsive state is invalid");
  });
});
