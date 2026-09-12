import { describe, expect, it, vi } from "vitest";

import type { GameInput } from "@reading-advantage/advantage-play-kit";

import {
  SHADOW_GATE_CRYSTAL_COLOR,
  SHADOW_GATE_EXIT,
  colorForShadowGateCrystal,
  createShadowGateDungeonController,
  scaleShadowGatePoint,
  wrapShadowGateCrystalLabel,
} from "./shadow-gate-dungeon.js";

const INPUT = [{ term: "the silent gate", translation: "ประตูเงียบ" }] as unknown as GameInput;

function moveTo(
  controller: ReturnType<typeof createShadowGateDungeonController>,
  point: Readonly<{ x: number; y: number }>,
  until: () => boolean,
): void {
  for (let frame = 0; frame < 160 && !until(); frame += 1) {
    const player = controller.snapshot().player;
    controller.setMovement(point.x - player.x, point.y - player.y);
    controller.tick(100);
  }
  expect(until()).toBe(true);
}

describe("Shadow Gate Dungeon exploration", () => {
  it("records attempts only when movement contacts supplied English crystals", () => {
    const controller = createShadowGateDungeonController(INPUT, vi.fn(), 11);
    controller.setMovement(0, -1);
    controller.tick(500);
    expect(controller.snapshot().totalAttempts).toBe(0);

    const before = controller.snapshot();
    const wrong = before.crystals.find((crystal) => crystal.word !== before.answer)!;
    moveTo(controller, wrong, () => controller.snapshot().totalAttempts === 1);
    expect(controller.snapshot()).toMatchObject({ targetIndex: 0, correctAnswers: 0, totalAttempts: 1, lastOutcome: "incorrect" });

    const retry = controller.snapshot();
    const correct = retry.crystals.find((crystal) => crystal.word === retry.answer)!;
    moveTo(controller, correct, () => controller.snapshot().targetIndex === 1);
    expect(controller.snapshot()).toMatchObject({ builtSentence: "the", correctAnswers: 1, totalAttempts: 2, score: 100 });
  });

  it("opens the gate after ordered words and completes only after physical entry", () => {
    const complete = vi.fn();
    const controller = createShadowGateDungeonController(INPUT, complete, 23);
    while (controller.snapshot().phase === "explore") {
      const state = controller.snapshot();
      const correct = state.crystals.find((crystal) => crystal.word === state.answer)!;
      moveTo(controller, correct, () => controller.snapshot().targetIndex > state.targetIndex);
    }
    expect(controller.snapshot()).toMatchObject({ phase: "gate-open", builtSentence: "the silent gate", correctAnswers: 3, totalAttempts: 3 });
    expect(SHADOW_GATE_EXIT.y).toBeGreaterThanOrEqual(130);
    expect(SHADOW_GATE_EXIT.x).toBeLessThanOrEqual(906);
    const nativeGate = scaleShadowGatePoint(SHADOW_GATE_EXIT, 390, 844);
    expect(nativeGate.x).toBeGreaterThan(0);
    expect(nativeGate.x).toBeLessThan(390);
    expect(nativeGate.y).toBeGreaterThan(112);
    expect(nativeGate.y).toBeLessThan(844);
    expect(complete).not.toHaveBeenCalled();
    const gate = controller.snapshot().gate;
    moveTo(controller, gate, () => controller.snapshot().phase === "victory");
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("treats every identical visible supplied word as correct and rejects modified restore state", () => {
    const controller = createShadowGateDungeonController(
      [{ term: "Welcome", translation: "ยินดีต้อนรับ" }] as unknown as GameInput,
      vi.fn(),
      5,
    );
    const state = controller.snapshot();
    expect(state.crystals.map((crystal) => crystal.word)).toEqual(["Welcome", "Welcome", "Welcome"]);
    moveTo(controller, state.crystals[2]!, () => controller.snapshot().phase === "gate-open");
    expect(controller.snapshot()).toMatchObject({ correctAnswers: 1, totalAttempts: 1 });
    const captured = controller.capture();
    expect(() => controller.restore({ ...captured, builtSentence: "invented" })).toThrow("responsive state is invalid");
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);
  });

  it("keeps creature contact out of language attempt accounting", () => {
    const controller = createShadowGateDungeonController(INPUT, vi.fn(), 31);
    const state = controller.capture();
    controller.restore({ ...state, player: { x: 800, y: 410 }, creature: { x: 805, y: 410 } });
    controller.tick(16);
    expect(controller.snapshot()).toMatchObject({ hazardContacts: 1, totalAttempts: 0, correctAnswers: 0, lastOutcome: "hazard" });
  });

  it("styles every crystal equally and wraps long English labels without truncation", () => {
    expect(SHADOW_GATE_CRYSTAL_COLOR).toBe(0x5b5bd6);
    expect(colorForShadowGateCrystal()).toBe(SHADOW_GATE_CRYSTAL_COLOR);
    const wrapped = wrapShadowGateCrystalLabel("environmental");
    expect(wrapped).toContain("\n");
    expect(wrapped.replaceAll("\n", "")).toBe("environmental");
    expect(wrapped.split("\n").every((line) => [...line].length <= 9)).toBe(true);
  });
});
