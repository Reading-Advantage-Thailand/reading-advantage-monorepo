import { describe, expect, it, vi } from "vitest";

import type { GameInput, RuntimeCartridge } from "@reading-advantage/advantage-play-kit";

import {
  createDragonRiderCartridge,
  createShadowGateDungeonCartridge,
  createSpellweaversRunCartridge,
} from "./legacy-traversal-cartridges.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

type Pointer = { released: boolean; cancelled: boolean; x: number };
type Frame = { pressed?: readonly string[]; keys?: readonly string[]; pointer?: Partial<Pointer> };

type SceneApi = {
  create: (this: unknown) => void;
  update: (this: unknown, time?: number, delta?: number) => void;
  extend: {
    apkCaptureResponsiveState: () => Record<string, unknown>;
    apkRestoreResponsiveState: (state: unknown) => void;
    apkRecompose: (next: unknown) => void;
  };
};

/**
 * Builds a minimal fake Phaser host that records text and lifecycle handlers.
 * @param canvasRect Optional canvas bounds used to map pointer positions.
 * @returns The host and the lifecycle handlers it captured.
 */
function fakeHost(canvasRect?: { left: number; width: number }) {
  const graphics: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const name of ["clear", "fillStyle", "fillRect", "fillCircle", "fillRoundedRect", "lineStyle", "strokeRoundedRect"]) {
    graphics[name] = vi.fn(() => graphics);
  }
  graphics.destroy = vi.fn();
  const texts: { setText: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }[] = [];
  const handlers: Record<string, () => void> = {};
  const host = {
    add: {
      graphics: () => graphics,
      text: () => {
        const value = { setPosition: vi.fn(), setText: vi.fn(), destroy: vi.fn() };
        value.setPosition.mockReturnValue(value);
        value.setText.mockReturnValue(value);
        texts.push(value);
        return value;
      },
    },
    events: { once: (event: string, listener: () => void) => { handlers[event] = listener; } },
    scale: { width: 960, height: 540 },
    ...(canvasRect ? { game: { canvas: { getBoundingClientRect: () => canvasRect } } } : {}),
  };
  return { host, handlers, texts };
}

/**
 * Starts a traversal cartridge scene against queued input frames.
 * @param cartridge Cartridge under test.
 * @param input Learning content for the run.
 * @param options Session mode and canvas bounds overrides.
 * @returns Helpers that drive frames and expose the completion spies.
 */
function start(
  cartridge: RuntimeCartridge,
  input: readonly { term: string; translation: string }[],
  options: { sessionMode?: "playing" | "demo"; canvasRect?: { left: number; width: number } } = {},
) {
  const frames: Frame[] = [];
  const complete = vi.fn();
  const diagnostic = vi.fn();
  const inputController = {
    snapshot: vi.fn(() => {
      const frame = frames.shift() ?? {};
      return {
        keys: frame.keys ?? [],
        ...(frame.pressed ? { pressed: frame.pressed } : {}),
        pointer: {
          down: false, released: false, cancelled: false, id: null, kind: null,
          startX: 0, startY: 0, x: 0, y: 0, ...frame.pointer,
        },
        destroyed: false,
      };
    }),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
  };
  const config = cartridge.createGameConfig({
    input: input as unknown as GameInput,
    edition: PHASE3_RUNTIME_EDITION,
    complete,
    diagnostic,
    inputController,
    seed: 0,
    ...(options.sessionMode ? { sessionMode: options.sessionMode } : {}),
  });
  const scene = config.scene as SceneApi;
  const { host, handlers, texts } = fakeHost(options.canvasRect);
  scene.create.call(host);
  const step = (frame: Frame) => {
    frames.push(frame);
    scene.update.call(host, 0, 16);
  };
  const press = (...codes: string[]) => step({ pressed: codes });
  const state = () => scene.extend.apkCaptureResponsiveState();
  return { scene, host, handlers, texts, complete, diagnostic, step, press, state };
}

const VOCAB = [
  { term: "brave", translation: "courageous" },
  { term: "calm", translation: "peaceful" },
];

describe("legacy traversal scoring and rounds", () => {
  it("rotates the correct route across targets and scores 100 per correct choice", () => {
    const run = start(createDragonRiderCartridge(), VOCAB);
    expect(run.state()).toMatchObject({ targetIndex: 0, prompt: "brave", answer: "courageous", correctAction: "move-left" });
    run.press("ArrowLeft");
    expect(run.state()).toMatchObject({ targetIndex: 1, prompt: "calm", correctAction: "move-right", score: 100, correctAnswers: 1, totalAttempts: 1, lastOutcome: "correct" });
  });

  it("records a wrong route as an attempt without score or progress", () => {
    const run = start(createDragonRiderCartridge(), VOCAB);
    run.press("KeyD");
    expect(run.state()).toMatchObject({ targetIndex: 0, score: 0, correctAnswers: 0, totalAttempts: 1, lastOutcome: "incorrect" });
    expect(run.diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "LEGACY_TRAVERSAL_CHOICE", details: { cartridgeId: "dragon-rider", correct: false } }));
    expect(run.complete).not.toHaveBeenCalled();
  });

  it("ignores keys that map to no route of the title", () => {
    const run = start(createDragonRiderCartridge(), VOCAB);
    run.press("ArrowUp", "KeyS", "Space");
    expect(run.state()).toMatchObject({ totalAttempts: 0, score: 0 });
    expect(run.diagnostic).not.toHaveBeenCalledWith(expect.objectContaining({ code: "LEGACY_TRAVERSAL_CHOICE" }));
  });

  it("delivers one victory with accuracy and xp from the 20 + 10 policy", () => {
    const run = start(createDragonRiderCartridge(), VOCAB);
    run.press("ArrowRight");
    run.press("ArrowLeft");
    run.press("ArrowRight");
    expect(run.complete).toHaveBeenCalledTimes(1);
    expect(run.complete).toHaveBeenCalledWith(
      expect.objectContaining({ correctAnswers: 2, totalAttempts: 3, score: 200, accuracy: 2 / 3, xp: 46 }),
      "victory",
    );
    expect(run.state()).toMatchObject({ phase: "complete", targetIndex: 2, prompt: "calm" });
    expect(run.diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "LEGACY_TRAVERSAL_COMPLETE" }));
  });

  it("ignores every choice after the route is complete", () => {
    const run = start(createDragonRiderCartridge(), [VOCAB[0]!]);
    run.press("ArrowLeft");
    run.press("ArrowLeft", "ArrowRight");
    expect(run.complete).toHaveBeenCalledTimes(1);
    expect(run.state()).toMatchObject({ totalAttempts: 1, score: 100 });
    expect(run.texts[3]!.setText).toHaveBeenLastCalledWith("Route complete!");
  });

  it("splits sentence terms into one ordered word target per word", () => {
    const run = start(createSpellweaversRunCartridge(), [{ term: "  Run   fast ", translation: "Corre rapido" }]);
    expect(run.state()).toMatchObject({ prompt: "Corre rapido", answer: "Run", correctAction: "move-left" });
    run.press("ArrowLeft");
    expect(run.state()).toMatchObject({ answer: "fast", correctAction: "confirm" });
    run.press("KeyS");
    expect(run.complete).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 2, totalAttempts: 2, xp: 50 }), "victory");
  });

  it("rejects empty learning content before a scene exists", () => {
    expect(() => createDragonRiderCartridge().createGameConfig({
      input: [] as unknown as GameInput,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: { snapshot: vi.fn(), cancelActiveGesture: vi.fn(), destroy: vi.fn() } as never,
      seed: 0,
    })).toThrow();
  });
});

describe("legacy traversal input", () => {
  it("counts a held key once until it is released", () => {
    const run = start(createDragonRiderCartridge(), VOCAB);
    run.step({ keys: ["ArrowRight"] });
    run.step({ keys: ["ArrowRight"] });
    expect(run.state()).toMatchObject({ totalAttempts: 1 });
    run.step({ keys: [] });
    run.step({ keys: ["ArrowRight"] });
    expect(run.state()).toMatchObject({ totalAttempts: 2 });
  });

  it("maps a released pointer to the route column under it", () => {
    const run = start(createShadowGateDungeonCartridge(), [{ term: "Go in now", translation: "Entra ahora" }]);
    run.step({ pointer: { released: true, x: 100 } });
    expect(run.state()).toMatchObject({ targetIndex: 1, correctAction: "move-up" });
    run.step({ pointer: { released: true, x: 300 } });
    expect(run.state()).toMatchObject({ targetIndex: 2, correctAction: "move-down" });
    run.step({ pointer: { released: true, x: 5000 } });
    expect(run.state()).toMatchObject({ targetIndex: 2, totalAttempts: 3, lastOutcome: "incorrect" });
  });

  it("scales pointer positions through the canvas bounds", () => {
    const run = start(createDragonRiderCartridge(), VOCAB, { canvasRect: { left: 100, width: 480 } });
    run.step({ pointer: { released: true, x: 400 } });
    expect(run.state()).toMatchObject({ targetIndex: 0, lastOutcome: "incorrect" });
    run.step({ pointer: { released: true, x: 200 } });
    expect(run.state()).toMatchObject({ targetIndex: 1, lastOutcome: "correct" });
  });

  it("ignores a cancelled pointer release", () => {
    const run = start(createDragonRiderCartridge(), VOCAB);
    run.step({ pointer: { released: true, cancelled: true, x: 10 } });
    expect(run.state()).toMatchObject({ totalAttempts: 0 });
  });

  it("reads no input outside the playing session mode", () => {
    const run = start(createDragonRiderCartridge(), VOCAB, { sessionMode: "demo" });
    run.press("ArrowLeft");
    expect(run.state()).toMatchObject({ totalAttempts: 0 });
  });
});

describe("legacy traversal responsive state and end states", () => {
  it("restores captured progress and finishes with the restored counters", () => {
    const first = start(createDragonRiderCartridge(), VOCAB);
    first.press("ArrowRight");
    first.press("ArrowLeft");
    const saved = first.state();
    const second = start(createDragonRiderCartridge(), VOCAB);
    second.scene.extend.apkRestoreResponsiveState(saved);
    expect(second.state()).toMatchObject({ targetIndex: 1, correctAnswers: 1, totalAttempts: 2, score: 100, lastOutcome: "correct" });
    second.press("ArrowRight");
    expect(second.complete).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 2, totalAttempts: 3, score: 200 }), "victory");
  });

  it("rejects a non-object responsive state", () => {
    const run = start(createDragonRiderCartridge(), VOCAB);
    expect(() => run.scene.extend.apkRestoreResponsiveState(null)).toThrow("Dragon Rider responsive state is invalid");
    expect(() => run.scene.extend.apkRestoreResponsiveState("x")).toThrow("responsive state is invalid");
  });

  it.each([-1, 3])("rejects target index %d outside the route", (targetIndex) => {
    const run = start(createDragonRiderCartridge(), VOCAB);
    expect(() => run.scene.extend.apkRestoreResponsiveState({ ...run.state(), targetIndex })).toThrow("Dragon Rider responsive state has invalid progress");
  });

  it("seals completion when a destroyed state is restored", () => {
    const run = start(createDragonRiderCartridge(), [VOCAB[0]!]);
    run.scene.extend.apkRestoreResponsiveState({ ...run.state(), destroyed: true });
    run.press("ArrowLeft");
    expect(run.complete).not.toHaveBeenCalled();
    expect(run.state()).toMatchObject({ destroyed: true, totalAttempts: 0 });
  });

  it("delivers no result after the scene shuts down", () => {
    const run = start(createDragonRiderCartridge(), [VOCAB[0]!]);
    run.handlers.shutdown!();
    run.press("ArrowLeft");
    expect(run.complete).not.toHaveBeenCalled();
    expect(run.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    run.handlers.destroy!();
    expect(run.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
  });

  it("labels the compact route after a recompose", () => {
    const run = start(createDragonRiderCartridge(), VOCAB);
    run.scene.extend.apkRecompose({ profile: "compact" });
    run.step({});
    expect(run.texts[2]!.setText).toHaveBeenLastCalledWith("Compact route  |  Target 1");
  });
});

describe("legacy traversal tutorial actions", () => {
  it("drives the correct and the wrong route for the tutorial", async () => {
    const cartridge = createDragonRiderCartridge();
    const run = start(cartridge, VOCAB);
    const driver = cartridge.standardExperience.createTutorialActionDriver({});
    await driver.execute({ step: { actionId: "action:select-wrong" } } as never);
    expect(run.state()).toMatchObject({ totalAttempts: 1, lastOutcome: "incorrect", targetIndex: 0 });
    await driver.execute({ step: { actionId: "action:select-correct" } } as never);
    expect(run.state()).toMatchObject({ totalAttempts: 2, lastOutcome: "correct", targetIndex: 1 });
  });

  it("does nothing before a game config exists", async () => {
    const cartridge = createDragonRiderCartridge();
    const driver = cartridge.standardExperience.createTutorialActionDriver({});
    await expect(Promise.resolve(driver.execute({ step: { actionId: "action:select-correct" } } as never))).resolves.toBeUndefined();
  });
});
