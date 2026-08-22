import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  RUNE_FORGE_CHAMBER_KEYBOARD_BINDINGS,
  chooseRuneForgeChamberRuneFromPointer,
  createRuneForgeChamberCartridge,
  createRuneForgeChamberController,
  getRuneForgeChamberRunePoints,
  type RuneForgeChamberSnapshot,
} from "./rune-forge-chamber.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const SENTENCES = [
  { term: "silver doors open", translation: "quiet doors" },
  { term: "bright lanterns guide", translation: "steady lanterns" },
] as const;

function createInputController() {
  let state = {
    keys: [] as string[],
    pressed: [] as string[],
    pointer: {
      down: false,
      released: false,
      cancelled: false,
      id: null,
      kind: null as "mouse" | "pen" | "touch" | null,
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
    },
    destroyed: false,
  };
  return {
    snapshot: () => state,
    set(next: Partial<typeof state>): void {
      state = { ...state, ...next };
    },
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
  };
}

function createSceneDisplay() {
  const destroyed = vi.fn();
  type FakeText = {
    setPosition: (x: number, y: number) => FakeText;
    setText: (value: string) => FakeText;
    destroy: () => void;
  };
  type FakeGraphics = {
    clear: () => FakeGraphics;
    fillStyle: (color: number, alpha?: number) => FakeGraphics;
    fillRect: (x: number, y: number, width: number, height: number) => FakeGraphics;
    fillCircle: (x: number, y: number, radius: number) => FakeGraphics;
    fillRoundedRect: (x: number, y: number, width: number, height: number, radius?: number) => FakeGraphics;
    lineStyle: (lineWidth: number, color: number, alpha?: number) => FakeGraphics;
    strokeCircle: (x: number, y: number, radius: number) => FakeGraphics;
    strokeRoundedRect: (x: number, y: number, width: number, height: number, radius?: number) => FakeGraphics;
    destroy: () => void;
  };
  const text = (): FakeText => {
    const value = {} as FakeText;
    value.setPosition = vi.fn(() => value);
    value.setText = vi.fn(() => value);
    value.destroy = destroyed;
    return value;
  };
  const graphics = (): FakeGraphics => {
    const value = {} as FakeGraphics;
    value.clear = vi.fn(() => value);
    value.fillStyle = vi.fn(() => value);
    value.fillRect = vi.fn(() => value);
    value.fillCircle = vi.fn(() => value);
    value.fillRoundedRect = vi.fn(() => value);
    value.lineStyle = vi.fn(() => value);
    value.strokeCircle = vi.fn(() => value);
    value.strokeRoundedRect = vi.fn(() => value);
    value.destroy = destroyed;
    return value;
  };
  return {
    destroyed,
    add: {
      graphics,
      text,
    },
    events: {
      listeners: new Map<string, () => void>(),
      once(event: string, listener: () => void): void {
        this.listeners.set(event, listener);
      },
    },
    scale: { width: 960, height: 540 },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) } },
  };
}

describe("Rune Forge Chamber cartridge", () => {
  it("uses deterministic orbit geometry and rotation", () => {
    const first = createRuneForgeChamberController(SENTENCES, vi.fn());
    const second = createRuneForgeChamberController(SENTENCES, vi.fn());
    const initial = first.snapshot();
    const points = getRuneForgeChamberRunePoints(initial.runes, 960, 540);

    expect(second.snapshot().runes).toEqual(initial.runes);
    expect(points).toHaveLength(3);
    expect(points.map((point) => point.id)).toEqual(initial.runes.map((rune) => rune.id));
    expect(Math.hypot(points[0]!.x - 480, points[0]!.y - 280.8)).toBeCloseTo(
      Math.hypot(points[1]!.x - 480, points[1]!.y - 280.8),
    );

    const beforeAngles = initial.runes.map((rune) => rune.angle);
    first.tick(1000);
    expect(first.snapshot().rotation).toBeGreaterThan(0);
    expect(first.snapshot().runes.map((rune) => rune.angle)).toEqual(
      beforeAngles.map((angle) => angle + first.snapshot().rotation),
    );
    expect(first.snapshot().timer).toBe(initial.timer - 1000);
  });

  it("exposes the shared contract and applies the host seed to orbit placement", () => {
    const first = createRuneForgeChamberController(SENTENCES, vi.fn(), { seed: 11 });
    const second = createRuneForgeChamberController(SENTENCES, vi.fn(), { seed: 11 });
    const different = createRuneForgeChamberController(SENTENCES, vi.fn(), { seed: 12 });
    const state = first.snapshot();

    expect(state).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      targetCount: 6,
      sentenceCount: 2,
      prompt: "quiet doors",
      answer: "silver",
      correctAction: "confirm",
      lives: 100,
      energy: 12_000,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      destroyed: false,
      seed: 11,
    });
    expect(state.availableActions).toEqual([
      "move-left",
      "move-right",
      "move-up",
      "move-down",
      "confirm",
    ]);
    expect(second.snapshot().runes).toEqual(state.runes);
    expect(different.snapshot().runes.map((rune) => rune.angle)).not.toEqual(
      state.runes.map((rune) => rune.angle),
    );

    const moved = first.choose("move-right");
    expect(moved).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(moved.snapshot.totalAttempts).toBe(0);
    const wrongId = state.runes.find((rune) => rune.id !== state.nextRuneId)?.id;
    if (!wrongId) throw new Error("The test needs an incorrect rune");
    const wrong = first.choose(wrongId);
    expect(wrong).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(wrong.snapshot.targetIndex).toBe(0);
    expect(wrong.snapshot.totalAttempts).toBe(1);
  });

  it("selects a rune by stable id, marks correct words, and damages wrong words", () => {
    const controller = createRuneForgeChamberController(SENTENCES, vi.fn());
    const initial = controller.snapshot();
    const wrongId = initial.runes.find((rune) => rune.id !== initial.nextRuneId)?.id;
    if (!wrongId || !initial.nextRuneId) throw new Error("The test needs a wrong rune");

    const wrong = controller.selectRune(wrongId);
    expect(wrong).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(wrong.snapshot.health).toBeLessThan(initial.health);
    expect(wrong.snapshot.runes.find((rune) => rune.id === wrongId)?.selected).toBe(false);

    const correct = controller.selectRune(initial.nextRuneId);
    expect(correct).toMatchObject({ accepted: true, correct: true, progressed: true, terminal: false });
    expect(correct.snapshot.runes[0]?.selected).toBe(true);
    expect(correct.snapshot.wordIndex).toBe(1);
    expect(correct.snapshot.targetIndex).toBe(1);
  });

  it("starts the next sentence after the final word in the current sentence", () => {
    const controller = createRuneForgeChamberController(SENTENCES, vi.fn());
    const firstRoundIds = controller.snapshot().runes.map((rune) => rune.id);

    controller.selectRune(controller.snapshot().nextRuneId!);
    controller.selectRune(controller.snapshot().nextRuneId!);
    const sentenceComplete = controller.selectRune(controller.snapshot().nextRuneId!);
    expect(sentenceComplete.snapshot.sentenceIndex).toBe(1);
    expect(sentenceComplete.snapshot.wordIndex).toBe(0);
    expect(sentenceComplete.snapshot.sentence).toBe(SENTENCES[1].term);
    expect(sentenceComplete.snapshot.runes.map((rune) => rune.id)).not.toEqual(firstRoundIds);
    expect(sentenceComplete.snapshot.timer).toBe(sentenceComplete.snapshot.maxTimer);
  });

  it("defeats at zero health or zero timer", () => {
    const healthDelivery = vi.fn();
    const healthController = createRuneForgeChamberController(SENTENCES, healthDelivery);
    const wrongId = healthController.snapshot().runes.find(
      (rune) => rune.id !== healthController.snapshot().nextRuneId,
    )!.id;
    for (let index = 0; index < 7; index += 1) healthController.selectRune(wrongId);
    expect(healthController.snapshot()).toMatchObject({ phase: "defeat", health: 0 });
    expect(healthDelivery).toHaveBeenCalledOnce();

    const timerDelivery = vi.fn();
    const timerController = createRuneForgeChamberController(SENTENCES, timerDelivery);
    timerController.tick(timerController.snapshot().timer);
    expect(timerController.snapshot()).toMatchObject({ phase: "defeat", timer: 0 });
    expect(timerDelivery).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(timerDelivery.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      score: 0,
    });
    expect(() => timerController.tick(Number.NaN)).toThrow();

    const boundedController = createRuneForgeChamberController(SENTENCES, vi.fn());
    boundedController.tick(Number.MAX_VALUE);
    expect(boundedController.snapshot()).toMatchObject({ phase: "defeat", timer: 0 });
  });

  it("emits one exact result after the final forge", () => {
    const deliver = vi.fn();
    const controller = createRuneForgeChamberController(SENTENCES, deliver);
    let terminal: ReturnType<typeof controller.choose> | undefined;
    while (controller.snapshot().phase === "playing") terminal = controller.choose("confirm");
    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);

    expect(terminal).toBeDefined();
    expect(controller.snapshot()).toMatchObject({ phase: "victory", targetIndex: 6, targetCount: 6 });
    expect(terminal).toMatchObject({ terminal: true, completed: true, result });
    expect(terminal?.result).toBe(deliver.mock.calls[0]?.[0]);
    expect(result).toEqual({
      accuracy: 1,
      xp: expect.any(Number),
      score: 600,
      correctAnswers: 6,
      totalAttempts: 6,
    });
    expect(deliver).toHaveBeenCalledOnce();
    const postTerminal = controller.choose("confirm");
    expect(postTerminal).toMatchObject({
      accepted: false,
      terminal: true,
      completed: true,
      result,
    });
    expect(postTerminal.result).toBe(terminal?.result);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("returns the exact defeat result from the first terminal choose", () => {
    const deliver = vi.fn();
    const controller = createRuneForgeChamberController(SENTENCES, deliver);
    const wrongId = controller.snapshot().runes.find((rune) => rune.id !== controller.snapshot().nextRuneId)?.id;
    if (!wrongId) throw new Error("The test needs a wrong rune");

    let terminal: ReturnType<typeof controller.choose> | undefined;
    for (let index = 0; index < 7; index += 1) terminal = controller.choose(wrongId);
    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);

    expect(controller.snapshot()).toMatchObject({ phase: "defeat", health: 0 });
    expect(terminal).toMatchObject({ terminal: true, completed: true, result });
    expect(terminal?.result).toBe(deliver.mock.calls[0]?.[0]);
    expect(deliver).toHaveBeenCalledOnce();

    const postTerminal = controller.choose("confirm");
    expect(postTerminal).toMatchObject({ terminal: true, completed: true, result });
    expect(postTerminal.result).toBe(terminal?.result);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("preserves angles and progress through responsive capture and restore", () => {
    const controller = createRuneForgeChamberController(SENTENCES, vi.fn());
    controller.tick(300);
    controller.selectRune(controller.snapshot().nextRuneId!);
    const captured = controller.capture();
    controller.selectRune(controller.snapshot().nextRuneId!);
    controller.restore(captured);

    expect(controller.snapshot()).toEqual(captured);
    expect(controller.snapshot().runes.map((rune) => rune.angle)).toEqual(
      captured.runes.map((rune) => rune.angle),
    );
  });

  it("maps keyboard, pointer, and touch input into rune ids in the scene", () => {
    const controller = createRuneForgeChamberController(SENTENCES, vi.fn());
    const points = getRuneForgeChamberRunePoints(controller.snapshot().runes, 960, 540);
    expect(RUNE_FORGE_CHAMBER_KEYBOARD_BINDINGS).toMatchObject({
      ArrowLeft: "move-left",
      ArrowRight: "move-right",
      Enter: "confirm",
      Space: "confirm",
    });
    expect(chooseRuneForgeChamberRuneFromPointer(points[0]!.x, points[0]!.y, controller.snapshot().runes, 960, 540))
      .toBe(points[0]!.id);

    const input = createInputController();
    const config = createRuneForgeChamberCartridge().createGameConfig({
      input: [...SENTENCES],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
      seed: 7,
    });
    const seededPoints = getRuneForgeChamberRunePoints(
      createRuneForgeChamberController(SENTENCES, vi.fn(), { seed: 7 }).snapshot().runes,
      960,
      540,
    );
    const scene = createSceneDisplay();
    const sceneConfig = config.scene as { create: (this: typeof scene) => void; update: (this: typeof scene, time: number, delta: number) => void };
    sceneConfig.create.call(scene);
    input.set({ pressed: ["ArrowRight"] });
    sceneConfig.update.call(scene, 0, 0);
    input.set({ pressed: ["ArrowLeft"] });
    sceneConfig.update.call(scene, 0, 0);
    input.set({ pressed: ["Enter"] });
    sceneConfig.update.call(scene, 0, 0);
    input.set({ pressed: [], pointer: { ...input.snapshot().pointer, released: true, cancelled: true, kind: "touch", x: seededPoints[1]!.x, y: seededPoints[1]!.y } });
    sceneConfig.update.call(scene, 0, 0);
    expect((config.scene as { extend: { apkCaptureResponsiveState: () => { targetIndex: number } } }).extend.apkCaptureResponsiveState()).toMatchObject({ targetIndex: 1 });
    expect(sceneConfig).toBeDefined();
    input.set({ pressed: [], pointer: { ...input.snapshot().pointer, released: true, cancelled: false, kind: "touch", x: seededPoints[1]!.x, y: seededPoints[1]!.y } });
    sceneConfig.update.call(scene, 0, 0);
    expect((config.scene as { extend: { apkCaptureResponsiveState: () => { targetIndex: number } } }).extend.apkCaptureResponsiveState()).toMatchObject({ targetIndex: 2 });
  });

  it.each(["tutorial", "demo"] as const)("runs real incorrect and correct tutorial actions for one-word input without delivery in %s mode", (sessionMode) => {
    const complete = vi.fn();
    const cartridge = createRuneForgeChamberCartridge();
    const config = cartridge.createGameConfig({
      input: [{ term: "silver", translation: "quiet" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: createInputController(),
      sessionMode,
      seed: 19,
    });
    const definition = cartridge.standardExperience.definition;
    const [incorrectStep, correctStep] = definition.tutorial.steps;
    if (!incorrectStep || !correctStep) throw new Error("The test needs both tutorial steps");
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const run = (step: typeof incorrectStep): void => {
      void driver.execute({
        tutorial: definition.tutorial,
        step,
        seed: definition.tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: vi.fn() },
      });
    };
    const scene = config.scene as { extend: { apkCaptureResponsiveState: () => RuneForgeChamberSnapshot } };

    run(incorrectStep);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      health: 85,
      targetIndex: 0,
      totalAttempts: 1,
      lastOutcome: "incorrect",
      phase: "playing",
    });
    run(correctStep);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ phase: "victory", targetIndex: 1 });
    expect(complete).not.toHaveBeenCalled();
  });

  it("passes explicit terminal outcomes to the playing host", () => {
    const cartridge = createRuneForgeChamberCartridge();
    const victoryComplete = vi.fn();
    const victoryInput = createInputController();
    const victoryConfig = cartridge.createGameConfig({
      input: [{ term: "silver", translation: "quiet" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: victoryComplete,
      diagnostic: vi.fn(),
      inputController: victoryInput,
      sessionMode: "playing",
      seed: 19,
    });
    const victoryScene = createSceneDisplay();
    const victorySceneConfig = victoryConfig.scene as { create: (this: typeof victoryScene) => void; update: (this: typeof victoryScene, time: number, delta: number) => void };
    victorySceneConfig.create.call(victoryScene);
    victoryInput.set({ pressed: ["Enter"] });
    victorySceneConfig.update.call(victoryScene, 0, 0);

    expect(victoryComplete).toHaveBeenCalledWith(expect.any(Object), "victory");

    const defeatComplete = vi.fn();
    const defeatInput = createInputController();
    const defeatConfig = cartridge.createGameConfig({
      input: [{ term: "silver", translation: "quiet" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: defeatComplete,
      diagnostic: vi.fn(),
      inputController: defeatInput,
      sessionMode: "playing",
      seed: 19,
    });
    const defeatScene = createSceneDisplay();
    const defeatSceneConfig = defeatConfig.scene as { create: (this: typeof defeatScene) => void; update: (this: typeof defeatScene, time: number, delta: number) => void };
    defeatSceneConfig.create.call(defeatScene);
    for (let index = 0; index < 240; index += 1) defeatSceneConfig.update.call(defeatScene, index * 50, 50);

    expect(defeatComplete).toHaveBeenCalledWith(expect.any(Object), "defeat");
    victoryScene.events.listeners.get("shutdown")?.();
    defeatScene.events.listeners.get("shutdown")?.();
  });

  it("recomposes and cleans every scene resource without duplicate completion", () => {
    const input = createInputController();
    const complete = vi.fn();
    const config = createRuneForgeChamberCartridge().createGameConfig({
      input: [...SENTENCES],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
    });
    const scene = createSceneDisplay();
    const sceneConfig = config.scene as typeof scene & {
      create: (this: typeof scene) => void;
      update: (this: typeof scene, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState: () => { runes: readonly unknown[] };
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    sceneConfig.create.call(scene);
    const captured = sceneConfig.extend.apkCaptureResponsiveState();
    sceneConfig.extend.apkRecompose({ profile: "compact" });
    sceneConfig.extend.apkRestoreResponsiveState(captured);
    scene.events.listeners.get("shutdown")?.();
    scene.events.listeners.get("destroy")?.();
    expect(scene.destroyed).toHaveBeenCalled();
    expect(sceneConfig.extend.apkCaptureResponsiveState()).toMatchObject({ destroyed: true });
    expect(complete).not.toHaveBeenCalled();
    sceneConfig.update.call(scene, 0, 16);
    expect(input.cancelActiveGesture).toHaveBeenCalledOnce();
  });

  it("covers empty pointer regions and real hazard and cursor branches", () => {
    const controller = createRuneForgeChamberController(SENTENCES, vi.fn());
    expect(getRuneForgeChamberRunePoints([], 390, 700)).toEqual([]);
    expect(chooseRuneForgeChamberRuneFromPointer(0, 0, controller.snapshot().runes, 390, 700)).toBeUndefined();

    const hazard = controller.applyHazard();
    expect(hazard).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    const demonstration = controller.demonstrateIncorrectChoice();
    expect(demonstration).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });

    expect(controller.moveCursor("confirm")).toMatchObject({ cursorRuneId: expect.any(String) });
    expect(controller.moveCursor("unknown" as never)).toMatchObject({ cursorRuneId: expect.any(String) });
    expect(controller.choose("unknown")).toMatchObject({ accepted: false, correct: false });
  });

  it("rejects responsive snapshots at each ordered contract boundary", () => {
    const controller = createRuneForgeChamberController(SENTENCES, vi.fn(), { seed: 23 });
    const captured = controller.capture();

    expect(() => controller.restore(null as never)).toThrow(/object/i);
    expect(() => controller.restore({ ...captured, targetCount: 99 })).toThrow(/target count/i);
    expect(() => controller.restore({ ...captured, sentenceCount: 99 })).toThrow(/sentence count/i);
    expect(() => controller.restore({ ...captured, seed: 24 })).toThrow(/seed/i);
    expect(() => controller.restore({ ...captured, phase: "invalid" as never })).toThrow(/phase/i);
    expect(() => controller.restore({ ...captured, sentenceIndex: -1 })).toThrow(/sentence index/i);
    expect(() => controller.restore({ ...captured, wordIndex: -1 })).toThrow(/word index/i);
    expect(() => controller.restore({ ...captured, destroyed: "no" as never })).toThrow(/destroyed/i);
    expect(() => controller.restore({ ...captured, sentenceIndex: 2 })).toThrow(/sentence index/i);
    expect(() => controller.restore({ ...captured, targetIndex: 1 })).toThrow(/progress/i);
    expect(() => controller.restore({ ...captured, wordIndex: 4, targetIndex: 4 })).toThrow(/word progress|playing/i);
    expect(() => controller.restore({ ...captured, health: 0 })).toThrow(/resources/i);
    expect(() => controller.restore({ ...captured, timer: 0 })).toThrow(/resources/i);
    expect(() => controller.restore({ ...captured, rotation: Number.NaN })).toThrow(/rotation/i);
    expect(() => controller.restore({ ...captured, correctAnswers: 1 })).toThrow(/counters|score/i);
    expect(() => controller.restore({ ...captured, totalAttempts: -1 })).toThrow(/counters/i);
    expect(() => controller.restore({ ...captured, forgeHealth: 99 })).toThrow(/resource aliases/i);
    expect(() => controller.restore({ ...captured, lives: 99 })).toThrow(/shared resources/i);
    expect(() => controller.restore({ ...captured, answer: "tampered" })).toThrow(/action contract/i);
    expect(() => controller.restore({ ...captured, sentence: "tampered" })).toThrow(/sentence content/i);
    expect(() => controller.restore({ ...captured, words: ["tampered"] })).toThrow(/word content/i);
    expect(() => controller.restore({ ...captured, runes: [] })).toThrow(/rune count/i);
    expect(() => controller.restore({ ...captured, circles: [] })).toThrow(/circle alias/i);
    expect(() => controller.restore({ ...captured, nextRuneId: "rune:wrong" })).toThrow(/next rune/i);
    expect(() => controller.restore({ ...captured, cursorRuneId: "rune:wrong" })).toThrow(/cursor rune/i);
    expect(() => controller.restore({
      ...captured,
      nextRuneId: "rune:wrong",
      cursorRuneId: "rune:wrong",
      runes: captured.runes.map((rune) => ({ ...rune, id: "rune:wrong" })),
      circles: captured.circles.map((rune) => ({ ...rune, id: "rune:wrong" })),
    })).toThrow(/rune identity/i);
    expect(() => controller.restore({
      ...captured,
      nextRuneId: undefined,
      runes: captured.runes.map((rune) => ({ ...rune, orderIndex: 99 })),
    })).toThrow(/metadata/i);
    expect(() => controller.restore({
      ...captured,
      runes: captured.runes.map((rune) => ({ ...rune, angle: Number.NaN })),
    })).toThrow(/progress/i);
    expect(() => controller.restore({ ...captured, collectedWords: ["tampered"] })).toThrow(/collected/i);
  });

  it("seals restored terminal state and ignores later responsive mutation", () => {
    const terminalController = createRuneForgeChamberController([{ term: "silver", translation: "quiet" }], vi.fn());
    terminalController.selectRune(terminalController.snapshot().nextRuneId!);
    const terminal = terminalController.capture();
    expect(terminal.phase).toBe("victory");

    const controller = createRuneForgeChamberController([{ term: "silver", translation: "quiet" }], vi.fn());
    controller.restore(terminal);
    expect(controller.snapshot()).toEqual(terminal);
    expect(() => controller.restore({ ...terminal, targetCount: 99 })).toThrow(/target count/i);
    expect(controller.snapshot()).toEqual(terminal);

    const destroyed = createRuneForgeChamberController(SENTENCES, vi.fn());
    const destroyedCapture = destroyed.capture();
    destroyed.restore({ ...destroyedCapture, destroyed: true });
    destroyed.restore({ ...destroyedCapture, targetCount: 99 });
    expect(destroyed.snapshot().destroyed).toBe(true);
  });
});
