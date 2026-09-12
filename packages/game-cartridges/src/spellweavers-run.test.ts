import { describe, expect, it, vi } from "vitest";

import type { GameInput } from "@reading-advantage/advantage-play-kit";

import {
  SPELLWEAVERS_RUN_ACTIONS,
  createSpellweaversRunCartridge,
  createSpellweaversRunController,
} from "./spellweavers-run.js";
import { PHASE3_RUNTIME_EDITION, createPhase3InputController } from "./legacy-traversal-phase3-test-helpers.js";

const INPUT = [
  { term: "We cross the bridge", translation: "พวกเราข้ามสะพาน" },
  { term: "Birds fly above trees", translation: "นกบินเหนือต้นไม้" },
] as unknown as GameInput;

describe("Spellweaver's Run sentence runner", () => {
  const reachPlayer = (controller: ReturnType<typeof createSpellweaversRunController>) => {
    for (let frame = 0; frame < 11; frame += 1) controller.tick(250);
    return controller.snapshot();
  };

  it("resolves one language attempt when falling words contact the selected player lane", () => {
    const complete = vi.fn();
    const first = createSpellweaversRunController(INPUT, complete, 17);
    const replay = createSpellweaversRunController(INPUT, vi.fn(), 17);
    const supplied = new Set(["We", "cross", "the", "bridge", "Birds", "fly", "above", "trees"]);
    const correctLanes: number[] = [];

    while (first.snapshot().phase === "running") {
      const state = first.snapshot();
      expect(replay.snapshot().choices).toEqual(state.choices);
      expect(state.choices).toHaveLength(3);
      expect(state.choices.every((word) => supplied.has(word))).toBe(true);
      expect(state.choices[state.correctLane]).toBe(state.answer);
      correctLanes.push(state.correctLane);
      const wrongLane = state.choices.findIndex((word) => word !== state.answer);
      first.choose(SPELLWEAVERS_RUN_ACTIONS[wrongLane]!);
      replay.choose(SPELLWEAVERS_RUN_ACTIONS[wrongLane]!);
      expect(first.snapshot().totalAttempts).toBe(state.totalAttempts);
      const retried = reachPlayer(first);
      reachPlayer(replay);
      expect(retried.totalAttempts).toBe(state.totalAttempts + 1);
      expect(retried.targetIndex).toBe(state.targetIndex);
      first.choose(SPELLWEAVERS_RUN_ACTIONS[retried.correctLane]!);
      replay.choose(SPELLWEAVERS_RUN_ACTIONS[replay.snapshot().correctLane]!);
      const advanced = reachPlayer(first);
      reachPlayer(replay);
      expect(advanced.targetIndex).toBe(state.targetIndex + 1);
      if (state.targetIndex === 0) expect(advanced.builtSentence).toBe("We");
    }

    expect(new Set(correctLanes).size).toBeGreaterThan(1);
    expect(first.snapshot()).toMatchObject({ correctAnswers: 8, totalAttempts: 16, score: 800, phase: "victory" });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it("accepts any lane that visibly carries the correct supplied word", () => {
    const controller = createSpellweaversRunController(
      [{ term: "Welcome", translation: "ยินดีต้อนรับ" }] as unknown as GameInput,
      vi.fn(),
      4,
    );
    const state = controller.snapshot();
    expect(state.choices).toEqual(["Welcome", "Welcome", "Welcome"]);
    controller.choose(SPELLWEAVERS_RUN_ACTIONS[2]!);
    expect(reachPlayer(controller)).toMatchObject({ phase: "victory", correctAnswers: 1, totalAttempts: 1 });
  });

  it("advances falling words and rejects a modified responsive snapshot", () => {
    const controller = createSpellweaversRunController(INPUT, vi.fn(), 29);
    const before = controller.snapshot();
    const moved = controller.tick(100);
    expect(moved.orbProgress).toBeGreaterThan(before.orbProgress);
    expect(() => controller.restore({ ...moved, answer: "invented" })).toThrow("responsive state is invalid");
    controller.restore(moved);
    expect(controller.snapshot()).toEqual(moved);
  });

  it("renders a bare Thai prompt and readable English lane labels on a compact board", () => {
    const texts: Array<{ initial: string; style: Readonly<Record<string, unknown>>; setText: ReturnType<typeof vi.fn>; setPosition: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }> = [];
    const graphics = Object.fromEntries(["clear", "fillStyle", "fillRect", "fillRoundedRect", "lineStyle", "strokeRoundedRect", "destroy"].map((name) => [name, vi.fn()])) as Record<string, ReturnType<typeof vi.fn>>;
    for (const method of Object.values(graphics)) method.mockReturnValue(graphics);
    const scene = {
      add: {
        graphics: () => graphics,
        text: (_x: number, _y: number, initial: string, style: Readonly<Record<string, unknown>> = {}) => {
          const value = { initial, style, setText: vi.fn(), setPosition: vi.fn(), destroy: vi.fn() };
          value.setText.mockReturnValue(value);
          value.setPosition.mockReturnValue(value);
          texts.push(value);
          return value;
        },
      },
      scale: { width: 336, height: 733 },
      events: { once: vi.fn() },
    };
    const config = createSpellweaversRunCartridge().createGameConfig({
      input: INPUT,
      edition: PHASE3_RUNTIME_EDITION,
      inputController: createPhase3InputController(),
      complete: vi.fn(),
      diagnostic: vi.fn(),
      seed: 17,
    });
    const runtime = config.scene as { create(this: typeof scene): void };
    runtime.create.call(scene);

    expect(texts[0]!.setText).toHaveBeenLastCalledWith("พวกเราข้ามสะพาน");
    expect(texts.slice(2).map((text) => text.setText.mock.calls.at(-1)?.[0])).toEqual(expect.arrayContaining(["We"]));
    const liveLabels = texts.flatMap((text) => text.setText.mock.calls.map((call) => String(call[0])));
    expect(liveLabels.every((label) => !label.includes("Build the sentence") && !label.includes("Keyboard:"))).toBe(true);
    expect(texts[0]!.style.fontSize).toBe("26px");
    expect(texts[2]!.style.fontSize).toBe("18px");
  });
});
