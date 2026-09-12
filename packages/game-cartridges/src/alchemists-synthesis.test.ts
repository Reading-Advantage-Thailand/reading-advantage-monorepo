import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS,
  ALCHEMISTS_SYNTHESIS_KEYBOARD_BINDINGS,
  createAlchemistsSynthesisCartridge,
  createAlchemistsSynthesisController,
  type AlchemistsSynthesisSnapshot,
} from "./alchemists-synthesis.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const INPUT = [
  { term: "wisdom", translation: "knowledge" },
  { term: "mercy", translation: "compassion" },
  { term: "swift", translation: "fast" },
  { term: "bright", translation: "shining" },
  { term: "calm", translation: "peaceful" },
] as const;

function createInputController() {
  let current = {
    keys: [] as readonly string[],
    pressed: [] as readonly string[],
    pointer: {
      down: false,
      released: false,
      cancelled: false,
      id: null,
      kind: null,
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
    },
    destroyed: false,
  };

  return {
    snapshot: vi.fn(() => current),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
    setSnapshot(snapshot: typeof current): void {
      current = snapshot;
    },
  };
}

function createSceneHost(canvasWidth = 960, sceneSize = { width: 960, height: 540 }) {
  const graphics = {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    fillCircle: vi.fn(),
    fillRoundedRect: vi.fn(),
    lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(),
    destroy: vi.fn(),
  };
  graphics.clear.mockReturnValue(graphics);
  graphics.fillStyle.mockReturnValue(graphics);
  graphics.fillRect.mockReturnValue(graphics);
  graphics.fillCircle.mockReturnValue(graphics);
  graphics.fillRoundedRect.mockReturnValue(graphics);
  graphics.lineStyle.mockReturnValue(graphics);
  graphics.strokeRoundedRect.mockReturnValue(graphics);

  const texts: Array<{
    setPosition: ReturnType<typeof vi.fn>;
    setText: ReturnType<typeof vi.fn>;
    setFontSize: ReturnType<typeof vi.fn>;
    setOrigin: ReturnType<typeof vi.fn>;
    setWordWrapWidth: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const createText = () => {
    const text = {
      setPosition: vi.fn(),
      setText: vi.fn(),
      setFontSize: vi.fn(),
      setOrigin: vi.fn(),
      setWordWrapWidth: vi.fn(),
      destroy: vi.fn(),
    };
    text.setPosition.mockReturnValue(text);
    text.setText.mockReturnValue(text);
    text.setFontSize.mockReturnValue(text);
    text.setOrigin.mockReturnValue(text);
    text.setWordWrapWidth.mockReturnValue(text);
    texts.push(text);
    return text;
  };

  const listeners = new Map<string, () => void>();
  const tileSprite = vi.fn(() => ({
    setOrigin: vi.fn().mockReturnThis(),
    setDisplaySize: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  }));
  const host = {
    add: {
      graphics: vi.fn(() => graphics),
      text: vi.fn(() => createText()),
      tileSprite,
    },
    events: {
      once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
    },
    game: {
      canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: canvasWidth, height: sceneSize.height }),
      },
    },
    scale: sceneSize,
  };

  return {
    host,
    graphics,
    texts,
    tileSprite,
    emit(event: string): void {
      listeners.get(event)?.();
    },
  };
}

function chooseCorrect(controller: ReturnType<typeof createAlchemistsSynthesisController>) {
  return controller.selectOption(controller.snapshot().correctOptionId);
}

function finishWithCorrectAnswers(controller: ReturnType<typeof createAlchemistsSynthesisController>): void {
  while (controller.snapshot().phase === "playing") chooseCorrect(controller);
}

describe("Alchemist's Synthesis cartridge", () => {
  it("shows the translation as the prompt and terms as deterministic options", () => {
    const first = createAlchemistsSynthesisController(INPUT, vi.fn()).snapshot();
    const second = createAlchemistsSynthesisController(INPUT, vi.fn()).snapshot();

    expect(first.prompt).toBe(INPUT[0]!.translation);
    expect(first.options.map((option) => option.term)).toEqual(
      second.options.map((option) => option.term),
    );
    expect(first.options.map((option) => option.term)).toContain(INPUT[0]!.term);
    expect(first.options.map((option) => option.term)).not.toContain(INPUT[0]!.translation);
    expect(first.correctOptionId).toBe(
      first.options.find((option) => option.term === INPUT[0]!.term)?.id,
    );
    expect(first.correctAction).toBe(first.correctOptionId);
    expect(first.availableActions).toEqual([
      "move-left",
      "move-right",
      "move-up",
      "move-down",
      "confirm",
    ]);
    expect(first).toMatchObject({ lives: 1, energy: 0, targetIndex: 0, targetCount: INPUT.length });
  });

  it("creates one target for each input item without repeating short vocabulary", () => {
    const controller = createAlchemistsSynthesisController(INPUT.slice(0, 2), vi.fn(), { seed: 11 });
    const prompts: string[] = [];

    while (controller.snapshot().phase === "playing") {
      prompts.push(controller.snapshot().prompt);
      chooseCorrect(controller);
    }

    expect(prompts).toEqual(["knowledge", "compassion"]);
    expect(controller.snapshot()).toMatchObject({
      roundCount: 2,
      maxRounds: 2,
      targetCount: 2,
      totalAttempts: 2,
    });
  });

  it("repeats and reshuffles options deterministically for a seeded session", () => {
    const collectRounds = (seed: number) => {
      const controller = createAlchemistsSynthesisController(INPUT.slice(0, 3), vi.fn(), { seed });
      const rounds: Array<{ prompt: string; options: string[] }> = [];

      while (controller.snapshot().phase === "playing") {
        const snapshot = controller.snapshot();
        rounds.push({
          prompt: snapshot.prompt,
          options: snapshot.options.map((option) => option.term),
        });
        chooseCorrect(controller);
      }

      return rounds;
    };

    const first = collectRounds(29);
    const second = collectRounds(29);

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(new Set(first.map((round) => round.options.join("|"))).size).toBeGreaterThan(1);
  });

  it("scores a correct round and advances to the next prompt", () => {
    const controller = createAlchemistsSynthesisController(INPUT, vi.fn());

    const result = chooseCorrect(controller);

    expect(result).toMatchObject({ accepted: true, correct: true, progressed: true, terminal: false });
    expect(result.snapshot).toMatchObject({
      roundIndex: 1,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
      prompt: INPUT[1]!.translation,
      lastOutcome: "correct",
    });
  });

  it("counts a wrong option, retains the current target, and does not score", () => {
    const controller = createAlchemistsSynthesisController(INPUT, vi.fn());
    const initial = controller.snapshot();
    const wrong = initial.options.find((option) => option.id !== initial.correctOptionId);
    if (!wrong) throw new Error("The fixture needs a wrong option");

    const result = controller.selectOption(wrong.id);

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(result.snapshot).toMatchObject({
      roundIndex: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 1,
      prompt: INPUT[0]!.translation,
      lastOutcome: "incorrect",
    });
  });

  it("restores wrong-attempt state and rejects forged counters or choices", () => {
    const controller = createAlchemistsSynthesisController(INPUT, vi.fn(), { seed: 17 });
    const initial = controller.snapshot();
    const wrong = initial.options.find((option) => option.id !== initial.correctOptionId);
    if (!wrong) throw new Error("The fixture needs a wrong option");

    controller.choose(wrong.id);
    const captured = controller.capture();
    controller.choose(controller.snapshot().correctAction);
    expect(controller.snapshot().targetIndex).toBe(1);

    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);
    expect(() => controller.restore({ ...captured, score: 100 })).toThrow();
    expect(() => controller.restore({ ...captured, correctAction: "forged-option" })).toThrow();
    expect(controller.choose("forged-option")).toMatchObject({
      accepted: false,
      progressed: false,
      terminal: false,
    });
  });

  it("rejects invalid controller inputs and responsive aliases", () => {
    expect(() => createAlchemistsSynthesisController(INPUT, vi.fn(), Number.NaN)).toThrow(/seed/i);
    const numericOptions = createAlchemistsSynthesisController(INPUT.slice(0, 1), vi.fn(), 0);
    expect(numericOptions.snapshot().options.length).toBeGreaterThan(0);
    expect(ALCHEMISTS_SYNTHESIS_KEYBOARD_BINDINGS.Enter).toBe("confirm");

    const controller = createAlchemistsSynthesisController(INPUT, vi.fn());
    expect(() => controller.advanceTime(-1)).toThrow(/delta/i);
    expect(() => controller.advanceTime(Number.NaN)).toThrow(/delta/i);
    expect(controller.advanceTime(0)).toMatchObject({ accepted: false, terminal: false });
    expect(controller.moveCursor("move-left")).toMatchObject({ accepted: true, terminal: false });
    expect(controller.moveCursor("move-right")).toMatchObject({ accepted: true });
    expect(controller.moveCursor("move-up")).toMatchObject({ accepted: false });
    expect(controller.moveCursor("move-down")).toMatchObject({ accepted: true });
    expect(controller.moveCursor("confirm")).toMatchObject({ accepted: false, terminal: false });

    const captured = controller.capture();
    const invalidStates: Array<Partial<AlchemistsSynthesisSnapshot>> = [
      { phase: "paused" as AlchemistsSynthesisSnapshot["phase"] },
      { roundCount: 99 },
      { targetCount: 99 },
      { roundIndex: -1 },
      { targetIndex: 99 },
      { maxRounds: 99 },
      { round: 99 },
      { correctAnswers: 1 },
      { score: 100 },
      { prompt: "forged" },
      { options: [] },
      { selectedIndex: -1 },
      { options: captured.options.map((option) => ({ ...option, term: "forged" })) },
      { availableActions: [] },
      { selectedOptionId: "forged" },
      { timeElapsedMs: 1 },
      { timeRemainingMs: 1 },
      { destroyed: "no" as unknown as boolean },
      { lives: 2 },
      { lastOutcome: "forged" as AlchemistsSynthesisSnapshot["lastOutcome"] },
      { totalAttempts: 1 },
      { timerExpired: true },
    ];

    for (const invalid of invalidStates) {
      expect(() => controller.restore({ ...captured, ...invalid })).toThrow();
    }
    expect(controller.snapshot()).toEqual(captured);
  });

  it("validates terminal responsive state and seals destroyed sessions", () => {
    const victory = createAlchemistsSynthesisController(INPUT.slice(0, 1), vi.fn());
    const terminal = chooseCorrect(victory);
    const captured = victory.capture();
    expect(captured.phase).toBe("victory");
    victory.restore(captured);
    expect(victory.snapshot().phase).toBe("victory");
    expect(() => victory.restore({
      ...captured,
      roundIndex: 0,
      targetIndex: 0,
      round: 1,
      correctAnswers: 0,
      totalAttempts: 0,
      score: 0,
      lastOutcome: undefined,
    })).toThrow(/victory|unfinished/i);
    expect(() => victory.restore({ ...captured, timerExpired: true })).toThrow(/timer/i);
    expect(terminal.result).toBeDefined();

    const destroyed = createAlchemistsSynthesisController(INPUT, vi.fn());
    destroyed.destroy();
    destroyed.destroy();
    const destroyedState = destroyed.capture();
    expect(destroyedState.destroyed).toBe(true);
    expect(destroyed.choose("confirm")).toMatchObject({ accepted: false, terminal: false });
    expect(destroyed.advanceTime(1)).toMatchObject({ accepted: false, terminal: false });
    destroyed.restore(destroyedState);
  });

  it("uses the same answer rules for keyboard confirmation and pointer selection", () => {
    const keyboard = createAlchemistsSynthesisController(INPUT, vi.fn(), { seed: 23 });
    const pointer = createAlchemistsSynthesisController(INPUT, vi.fn(), { seed: 23 });

    while (keyboard.snapshot().selectedOptionId !== keyboard.snapshot().correctOptionId) {
      keyboard.choose("move-right");
    }
    const keyboardResult = keyboard.choose("confirm");
    const pointerResult = pointer.selectOption(pointer.snapshot().correctOptionId);

    expect(keyboardResult).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(pointerResult).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(keyboardResult.snapshot).toMatchObject({ targetIndex: 1, score: 100, totalAttempts: 1 });
    expect(pointerResult.snapshot).toEqual(keyboardResult.snapshot);
  });

  it("wins after every target advances and emits one validated result", () => {
    const deliver = vi.fn();
    const controller = createAlchemistsSynthesisController(INPUT, deliver);

    chooseCorrect(controller);
    const wrong = controller.snapshot().options.find(
      (option) => option.id !== controller.snapshot().correctOptionId,
    );
    if (!wrong) throw new Error("The fixture needs a wrong option");
    controller.selectOption(wrong.id);
    finishWithCorrectAnswers(controller);

    expect(controller.snapshot().phase).toBe("victory");
    expect(controller.snapshot()).toMatchObject({
      targetIndex: INPUT.length,
      correctAnswers: INPUT.length,
      totalAttempts: INPUT.length + 1,
      score: INPUT.length * 100,
    });
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toMatchObject({
      accuracy: INPUT.length / (INPUT.length + 1),
      score: INPUT.length * 100,
    });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("does not defeat a session because of incorrect answers", () => {
    const deliver = vi.fn();
    const controller = createAlchemistsSynthesisController(INPUT.slice(0, 2), deliver);

    const wrong = controller.snapshot().options.find(
      (option) => option.id !== controller.snapshot().correctOptionId,
    );
    if (!wrong) throw new Error("The fixture needs a wrong option");
    controller.selectOption(wrong.id);
    expect(controller.snapshot()).toMatchObject({ phase: "playing", targetIndex: 0, totalAttempts: 1 });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("ends on timer expiry and does not emit a second result", () => {
    const deliver = vi.fn();
    const controller = createAlchemistsSynthesisController(INPUT, deliver);

    const timer = controller.advanceTime(ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS);

    expect(timer.terminal).toBe(true);
    expect(timer.snapshot).toMatchObject({
      phase: "defeat",
      timerExpired: true,
      timeRemainingMs: 0,
    });
    expect(gameResultsSchema.parse(timer.result)).toMatchObject({
      accuracy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
    expect(deliver).toHaveBeenCalledOnce();
    expect(controller.advanceTime(1000).accepted).toBe(false);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("retains the first result for post-terminal choose and selection actions", () => {
    const victoryDeliver = vi.fn();
    const victory = createAlchemistsSynthesisController(INPUT.slice(0, 1), victoryDeliver);
    const victoryTerminal = chooseCorrect(victory);
    const victoryResult = victoryTerminal.result;

    expect(victoryTerminal).toMatchObject({ terminal: true, completed: true });
    expect(victoryResult).toBe(victoryDeliver.mock.calls[0]?.[0]);
    expect(victoryResult).toBeDefined();

    const victoryPostChoose = victory.choose("confirm");
    const victoryPostSelect = victory.selectOption(victory.snapshot().correctOptionId);
    expect(victoryPostChoose).toMatchObject({ accepted: false, terminal: true, completed: true });
    expect(victoryPostSelect).toMatchObject({ accepted: false, terminal: true, completed: true });
    expect(victoryPostChoose.result).toBe(victoryResult);
    expect(victoryPostSelect.result).toBe(victoryResult);
    expect(victoryDeliver).toHaveBeenCalledOnce();

    const defeatDeliver = vi.fn();
    const defeat = createAlchemistsSynthesisController(INPUT, defeatDeliver);
    const defeatTerminal = defeat.advanceTime(ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS);
    const defeatResult = defeatTerminal.result;

    expect(defeatTerminal).toMatchObject({ terminal: true });
    expect(defeatResult).toBe(defeatDeliver.mock.calls[0]?.[0]);
    expect(defeatResult).toBeDefined();

    const defeatPostChoose = defeat.choose("confirm");
    const defeatPostSelect = defeat.selectOption(defeat.snapshot().correctOptionId);
    expect(defeatPostChoose).toMatchObject({ accepted: false, terminal: true, completed: true });
    expect(defeatPostSelect).toMatchObject({ accepted: false, terminal: true, completed: true });
    expect(defeatPostChoose.result).toBe(defeatResult);
    expect(defeatPostSelect.result).toBe(defeatResult);
    expect(defeatDeliver).toHaveBeenCalledOnce();
  });

  it("keeps the Thai prompt prominent and complete English choices readable at compact widths", () => {
    const vocabulary = [
      { term: "constellation", translation: "กลุ่มดาว" },
      { term: "transformation", translation: "การเปลี่ยนแปลง" },
      { term: "illumination", translation: "การส่องสว่าง" },
      { term: "restoration", translation: "การฟื้นฟู" },
    ];
    const mount = (canvasWidth: number, sceneSize: { width: number; height: number }) => {
      const config = createAlchemistsSynthesisCartridge().createGameConfig({
        input: vocabulary,
        edition: PHASE3_RUNTIME_EDITION,
        complete: vi.fn(),
        diagnostic: vi.fn(),
        inputController: createInputController(),
        seed: 41,
      });
      const scene = config.scene as { create(this: ReturnType<typeof createSceneHost>["host"]): void };
      const host = createSceneHost(canvasWidth, sceneSize);
      scene.create.call(host.host);
      return host;
    };

    const native = mount(336, { width: 336, height: 733 });
    const cssScaled = mount(336, { width: 960, height: 540 });

    for (const [host, promptSize, choiceSize] of [[native, 26, 16], [cssScaled, 75, 46]] as const) {
      expect(host.texts[1]?.setText).toHaveBeenLastCalledWith(vocabulary[0]!.translation);
      expect(host.texts[1]?.setFontSize).toHaveBeenLastCalledWith(promptSize);
      const liveText = host.texts.slice(0, 5).flatMap((text) => text.setText.mock.calls.map(([value]) => String(value))).join(" ");
      expect(liveText).not.toMatch(/ALCHEMIST'S SYNTHESIS|Translation:|Select the term|Keyboard:|Compact|Wide/);
      const choices = host.texts.slice(5, 9);
      expect(choices.map((choice) => choice.setText.mock.calls.at(-1)?.[0])).toEqual(expect.arrayContaining(vocabulary.map((item) => item.term)));
      choices.forEach((choice) => {
        expect(choice.setFontSize).toHaveBeenLastCalledWith(choiceSize);
        expect(choice.setWordWrapWidth).toHaveBeenLastCalledWith(expect.any(Number), true);
      });
    }
  });

  it("uses a quiet procedural floor instead of tiling the bound furniture strip", () => {
    const config = createAlchemistsSynthesisCartridge().createGameConfig({
      input: [...INPUT],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: createInputController(),
      seed: 41,
    });
    const scene = config.scene as { create(this: ReturnType<typeof createSceneHost>["host"]): void };
    const host = createSceneHost(336, { width: 336, height: 733 });

    scene.create.call(host.host);

    expect(host.tileSprite).not.toHaveBeenCalled();
    expect(host.graphics.fillRect).toHaveBeenCalledWith(0, 0, 336, 733);
  });

  it("supports cursor movement and pointer or touch option selection in the scene", () => {
    const inputController = createInputController();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const cartridge = createAlchemistsSynthesisCartridge();
    const config = cartridge.createGameConfig({
      input: [...INPUT],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic,
      inputController,
      seed: 41,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: {
        apkCaptureResponsiveState: () => AlchemistsSynthesisSnapshot;
        apkRestoreResponsiveState: (state: unknown) => void;
      };
    };
    const host = createSceneHost();

    scene.create.call(host.host);
    inputController.setSnapshot({
      ...inputController.snapshot(),
      pressed: ["ArrowRight"],
    });
    scene.update.call(host.host, 0, 16);
    expect(scene.extend.apkCaptureResponsiveState().selectedIndex).toBe(1);

    inputController.setSnapshot({
      ...inputController.snapshot(),
      pointer: { ...inputController.snapshot().pointer, released: true, cancelled: true, x: 780, y: 300 },
    });
    scene.update.call(host.host, 16, 16);
    expect(scene.extend.apkCaptureResponsiveState().totalAttempts).toBe(0);

    inputController.setSnapshot({
      ...inputController.snapshot(),
      pointer: { ...inputController.snapshot().pointer, released: true, cancelled: false, x: 780, y: 300 },
    });
    scene.update.call(host.host, 16, 16);
    expect(scene.extend.apkCaptureResponsiveState().totalAttempts).toBe(1);
    const captured = scene.extend.apkCaptureResponsiveState();
    scene.extend.apkRestoreResponsiveState(captured);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(captured);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "ALCHEMISTS_SYNTHESIS_ROUND" }));
  });

  it("renders compact tutorial and reports a terminal keyboard action", () => {
    const inputController = createInputController();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const config = createAlchemistsSynthesisCartridge().createGameConfig({
      input: [...INPUT.slice(0, 1)],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic,
      inputController,
      seed: 9,
      sessionMode: "playing",
      composition: { profile: "compact" } as never,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
    };
    const host = createSceneHost();
    scene.create.call(host.host);
    let state = (config.scene as { extend: { apkCaptureResponsiveState: () => AlchemistsSynthesisSnapshot } }).extend.apkCaptureResponsiveState();
    while (state.selectedOptionId !== state.correctOptionId) {
      inputController.setSnapshot({ ...inputController.snapshot(), pressed: ["ArrowRight"] });
      scene.update.call(host.host, 0, 1);
      state = (config.scene as { extend: { apkCaptureResponsiveState: () => AlchemistsSynthesisSnapshot } }).extend.apkCaptureResponsiveState();
    }
    inputController.setSnapshot({ ...inputController.snapshot(), pressed: ["Enter"] });
    scene.update.call(host.host, 0, 1);

    expect(complete).toHaveBeenCalledWith(expect.any(Object), "victory");
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "ALCHEMISTS_SYNTHESIS_TERMINAL" }));
    host.emit("shutdown");
  });

  it("emits one strict result and cleans procedural resources on shutdown", () => {
    const inputController = createInputController();
    const complete = vi.fn();
    const cartridge = createAlchemistsSynthesisCartridge();
    const config = cartridge.createGameConfig({
      input: [...INPUT.slice(0, 1)],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
      seed: 7,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      extend: { apkCaptureResponsiveState: () => AlchemistsSynthesisSnapshot };
    };
    const host = createSceneHost();

    scene.create.call(host.host);
    host.emit("shutdown");
    host.emit("destroy");

    expect(scene.extend.apkCaptureResponsiveState().destroyed).toBe(true);
    expect(inputController.cancelActiveGesture).toHaveBeenCalledOnce();
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(host.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect(complete).not.toHaveBeenCalled();

    const controller = createAlchemistsSynthesisController(INPUT.slice(0, 1), complete);
    let terminal: ReturnType<typeof chooseCorrect> | undefined;
    while (controller.snapshot().phase === "playing") terminal = chooseCorrect(controller);
    if (!terminal) throw new Error("The session did not produce a terminal result");
    expect(gameResultsSchema.parse(terminal.result)).toMatchObject({
      accuracy: 1,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });
    chooseCorrect(controller);
    expect(complete).toHaveBeenCalledOnce();
  });

  it.each(["tutorial", "demo"] as const)("does not deliver results during %s sessions", (sessionMode) => {
    const complete = vi.fn();
    const cartridge = createAlchemistsSynthesisCartridge();
    const inputController = createInputController();
    const config = cartridge.createGameConfig({
      input: [...INPUT.slice(0, 1)],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
      seed: 41,
      sessionMode,
    });
    const tutorial = cartridge.standardExperience.definition.tutorial;

    for (const step of tutorial.steps) {
      cartridge.standardExperience.createTutorialActionDriver().execute({
        tutorial,
        step,
        seed: tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: vi.fn() },
      });
    }

    expect(config).toBeTruthy();
    expect(complete).not.toHaveBeenCalled();
  });
});
