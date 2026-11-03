import { describe, expect, it, vi } from "vitest";

import { createShadowGateDungeonController, SHADOW_GATE_EXIT } from "./shadow-gate-dungeon.js";

type Controller = ReturnType<typeof createShadowGateDungeonController>;

const INPUT = [{ term: "Open the gate", translation: "Abre la puerta" }];

/**
 * Moves the player onto one crystal and runs a zero-length frame.
 * @param controller Controller under test.
 * @param wantCorrect Whether to touch the answer crystal or a decoy.
 * @returns The state after the touch.
 */
function touch(controller: Controller, wantCorrect: boolean) {
  const state = controller.capture();
  const crystal = state.crystals.find((item) => (item.word === state.answer) === wantCorrect)!;
  controller.restore({ ...state, player: { x: crystal.x, y: crystal.y } });
  return controller.tick(0);
}

describe("Shadow Gate crystal scoring", () => {
  it("offers the answer and two supplied decoys in three spots", () => {
    const state = createShadowGateDungeonController(INPUT, vi.fn()).snapshot();
    expect(state.crystals.map((crystal) => crystal.word).sort()).toEqual(["Open", "gate", "the"]);
    expect(new Set(state.crystals.map((crystal) => `${crystal.x},${crystal.y}`)).size).toBe(3);
    expect(state.crystals.every((crystal) => crystal.id.startsWith("wave:0:"))).toBe(true);
  });

  it("fills every crystal with the answer when no other word exists", () => {
    const state = createShadowGateDungeonController([{ term: "Go", translation: "Ve" }], vi.fn()).snapshot();
    expect(state.crystals.map((crystal) => crystal.word)).toEqual(["Go", "Go", "Go"]);
  });

  it("scores a correct crystal, builds the sentence, and resets the player", () => {
    const controller = createShadowGateDungeonController(INPUT, vi.fn());
    const state = touch(controller, true);
    expect(state).toMatchObject({ targetIndex: 1, correctAnswers: 1, totalAttempts: 1, score: 100, waveIndex: 1, lastOutcome: "correct", builtSentence: "Open", answer: "the", player: { x: 480, y: 460 } });
  });

  it("counts a wrong crystal as an attempt and starts a new wave", () => {
    const controller = createShadowGateDungeonController(INPUT, vi.fn());
    const state = touch(controller, false);
    expect(state).toMatchObject({ targetIndex: 0, correctAnswers: 0, totalAttempts: 1, score: 0, waveIndex: 1, lastOutcome: "incorrect", builtSentence: "" });
    expect(state.crystals.every((crystal) => crystal.id.startsWith("wave:1:"))).toBe(true);
  });

  it("opens the gate after the last word and wins once at the gate", () => {
    const deliver = vi.fn();
    const controller = createShadowGateDungeonController(INPUT, deliver);
    touch(controller, false);
    touch(controller, true);
    touch(controller, true);
    const open = touch(controller, true);
    expect(open).toMatchObject({ phase: "gate-open", targetIndex: 3, crystals: [], gate: { unlocked: true }, builtSentence: "Open the gate", answer: "gate" });
    expect(deliver).not.toHaveBeenCalled();
    controller.restore({ ...open, player: { ...SHADOW_GATE_EXIT } });
    const won = controller.tick(0);
    expect(won.phase).toBe("victory");
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 3, totalAttempts: 4, accuracy: 0.75, score: 300, xp: 67 }));
    controller.setMovement(1, 0);
    expect(controller.tick(16)).toEqual(won);
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("delivers nothing after destroy", () => {
    const deliver = vi.fn();
    const controller = createShadowGateDungeonController([{ term: "Go", translation: "Ve" }], deliver);
    const open = touch(controller, true);
    controller.restore({ ...open, player: { ...SHADOW_GATE_EXIT } });
    controller.destroy();
    controller.tick(0);
    expect(deliver).not.toHaveBeenCalled();
    expect(controller.snapshot().destroyed).toBe(true);
  });
});

describe("Shadow Gate movement and hazards", () => {
  it("normalizes diagonal movement and caps a frame at 100 ms", () => {
    const controller = createShadowGateDungeonController(INPUT, vi.fn());
    controller.setMovement(3, 4);
    expect(controller.snapshot().movement).toEqual({ x: 0.6, y: 0.8 });
    controller.setMovement(-1, 0);
    expect(controller.tick(5000).player).toEqual({ x: 461, y: 460 });
  });

  it("clamps the player inside the dungeon walls", () => {
    const controller = createShadowGateDungeonController(INPUT, vi.fn());
    controller.setMovement(0, 1);
    for (let frame = 0; frame < 5; frame += 1) controller.tick(100);
    expect(controller.snapshot().player.y).toBe(486);
  });

  it("counts one creature contact, pushes the player away, and waits out the cooldown", () => {
    const controller = createShadowGateDungeonController(INPUT, vi.fn());
    controller.restore({ ...controller.capture(), creature: { x: 460, y: 460 } });
    const hit = controller.tick(0);
    expect(hit).toMatchObject({ hazardContacts: 1, hazardCooldownMs: 900, lastOutcome: "hazard", player: { x: 550, y: 460 } });
    controller.restore({ ...hit, creature: { x: 540, y: 460 } });
    expect(controller.tick(100)).toMatchObject({ hazardContacts: 1, hazardCooldownMs: 800 });
    expect(hit.totalAttempts).toBe(0);
  });
});

describe("Shadow Gate restore validation", () => {
  it.each([
    ["a null state", () => null],
    ["a fractional target", (s: object) => ({ ...s, targetIndex: 0.5 })],
    ["inflated correct answers", (s: object) => ({ ...s, correctAnswers: 1 })],
    ["a wave that differs from attempts", (s: object) => ({ ...s, waveIndex: 2 })],
    ["a cooldown above 900 ms", (s: object) => ({ ...s, hazardCooldownMs: 901 })],
    ["a score that differs from progress", (s: object) => ({ ...s, score: 100 })],
    ["another seed", (s: object) => ({ ...s, seed: 9 })],
    ["a premature gate", (s: object) => ({ ...s, phase: "gate-open" })],
    ["a wrong built sentence", (s: object) => ({ ...s, builtSentence: "Open" })],
    ["a player outside the walls", (s: object) => ({ ...s, player: { x: 10, y: 300 } })],
    ["a non-finite creature", (s: object) => ({ ...s, creature: { x: Number.NaN, y: 0 } })],
    ["a moved crystal", (s: { crystals: readonly object[] }) => ({ ...s, crystals: s.crystals.map((c) => ({ ...c, x: 0 })) })],
    ["an unlocked gate while exploring", (s: object) => ({ ...s, gate: { ...SHADOW_GATE_EXIT, unlocked: true } })],
  ])("rejects %s", (_label, patch) => {
    const controller = createShadowGateDungeonController(INPUT, vi.fn());
    expect(() => controller.restore(patch(controller.capture() as never) as never)).toThrow("Shadow Gate Dungeon responsive state is invalid");
  });

  it("restores captured progress into a fresh run", () => {
    const source = createShadowGateDungeonController(INPUT, vi.fn(), 5);
    touch(source, false);
    touch(source, true);
    const target = createShadowGateDungeonController(INPUT, vi.fn(), 5);
    target.restore(source.capture());
    expect(target.snapshot()).toEqual(source.snapshot());
  });
});
