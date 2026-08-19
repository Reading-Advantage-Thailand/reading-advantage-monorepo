import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";
import type { GameTutorialActionDriverContext } from "@reading-advantage/advantage-play-kit/presentation";

import {
  ABYSSAL_WELL_CANVAS,
  ABYSSAL_WELL_KEYBOARD_BINDINGS,
  ABYSSAL_WELL_LANES,
  applyAbyssalWellHazard,
  calculateXP,
  chooseAbyssalWellActionFromPointer,
  createAbyssalWellCartridge,
  createAbyssalWellController,
  createAbyssalWellState,
  fireProjectile,
  getCreatureSpeed,
  getDifficultyConfig,
  getLanePosition,
  rotatePlayer,
  spawnEnemy,
  startGame,
  advanceAbyssalWellTime,
  type AbyssalWellState,
} from "./abyssal-well.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const SENTENCES = [
  { term: "silver doors open", translation: "quiet doors" },
  { term: "bright lanterns guide", translation: "steady lanterns" },
];

function inputSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    keys: [],
    pressed: [],
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
    ...overrides,
  };
}

function createInputController() {
  let current = inputSnapshot();
  return {
    set(next: ReturnType<typeof inputSnapshot>) {
      current = next;
    },
    snapshot: vi.fn(() => current),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
  };
}

function createGraphics() {
  const graphics = {
    clear: vi.fn(() => graphics),
    fillStyle: vi.fn(() => graphics),
    fillRect: vi.fn(() => graphics),
    fillCircle: vi.fn(() => graphics),
    fillRoundedRect: vi.fn(() => graphics),
    lineStyle: vi.fn(() => graphics),
    strokeRoundedRect: vi.fn(() => graphics),
    destroy: vi.fn(),
  };
  return graphics;
}

function createSceneHarness() {
  const listeners = new Map<string, () => void>();
  const graphics = createGraphics();
  const texts: Array<{
    setPosition: ReturnType<typeof vi.fn>;
    setText: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const scene = {
    add: {
      graphics: vi.fn(() => graphics),
      text: vi.fn(() => {
        const text = {
          setPosition: vi.fn(() => text),
          setText: vi.fn(() => text),
          destroy: vi.fn(),
        };
        texts.push(text);
        return text;
      }),
    },
    events: {
      once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
    },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) } },
    scale: { width: 960, height: 540 },
  };
  return { scene, listeners, graphics, texts };
}

function withPlaying(state: AbyssalWellState): AbyssalWellState {
  return startGame(state);
}

describe("The Abyssal Well radial shooter", () => {
  it("defines eight radial lanes and responsive lane positions", () => {
    const state = createAbyssalWellState(SENTENCES, { seed: 11 });
    expect(ABYSSAL_WELL_LANES).toBe(8);
    expect(state.player.lane).toBe(0);
    expect(getLanePosition(8, 0.5, 960, 540)).toEqual(getLanePosition(0, 0.5, 960, 540));
    expect(getLanePosition(0, 1, 960, 540).y).toBeLessThan(getLanePosition(0, 0, 960, 540).y);
    expect(getLanePosition(0, 0.5, 960, 540).x).not.toBe(getLanePosition(1, 0.5, 960, 540).x);
  });

  it("rotates left and right around the lane ring", () => {
    const state = withPlaying(createAbyssalWellState(SENTENCES, { seed: 2 }));
    expect(rotatePlayer(state, -1).player.lane).toBe(7);
    expect(rotatePlayer(state, 1).player.lane).toBe(1);
    expect(rotatePlayer(rotatePlayer(state, -1), -1).player.lane).toBe(6);
  });

  it("spawns deterministic word enemies in free lanes", () => {
    const state = withPlaying(createAbyssalWellState(SENTENCES, { seed: 3 }));
    const first = spawnEnemy(state);
    const second = spawnEnemy(first);

    expect(first.enemies[0]).toMatchObject({ word: "silver", wordIndex: 0, lane: 3, depth: 0 });
    expect(second.enemies[1]).toMatchObject({ word: "doors", wordIndex: 1, lane: 6, depth: 0 });
    expect(spawnEnemy(second).enemies).toHaveLength(3);
    expect(spawnEnemy({ ...second, phase: "defeat" }).enemies).toHaveLength(2);
  });

  it("fires in the active lane and enforces the projectile cooldown", () => {
    const state = withPlaying(createAbyssalWellState(SENTENCES, { seed: 4 }));
    const fired = fireProjectile(state);
    const blocked = fireProjectile({ ...fired, gameTime: fired.gameTime + 100 });
    const ready = fireProjectile({ ...fired, gameTime: fired.gameTime + 300 });

    expect(fired.projectiles[0]).toMatchObject({ lane: 0, depth: 1 });
    expect(blocked.projectiles).toHaveLength(1);
    expect(ready.projectiles).toHaveLength(2);
  });

  it("moves projectiles and enemies, then resolves a same-lane collision", () => {
    const state = withPlaying(createAbyssalWellState(SENTENCES, { seed: 5 }));
    const withActors: AbyssalWellState = {
      ...state,
      enemies: [{ id: "enemy-1", lane: 0, depth: 0.4, word: "silver", wordIndex: 0, type: "cave-spider" }],
      projectiles: [{ id: "projectile-1", lane: 0, depth: 0.42 }],
    };
    const next = advanceAbyssalWellTime(withActors, 16);

    expect(next.gameTime).toBe(16);
    expect(next.enemies).toHaveLength(0);
    expect(next.projectiles).toHaveLength(0);
    expect(next.targetIndex).toBe(1);
    expect(next.correctWords).toBe(1);
    expect(next.totalAttempts).toBe(1);
  });

  it("removes a wrong enemy without progress while counting the attempt", () => {
    const state = withPlaying(createAbyssalWellState(SENTENCES, { seed: 6 }));
    const wrongEnemyState = spawnEnemy(state, () => 0.99);
    const wrongEnemy = wrongEnemyState.enemies[0]!;
    const next = advanceAbyssalWellTime({
      ...wrongEnemyState,
      enemies: [{ ...wrongEnemy, lane: 0, depth: 0.4 }],
      projectiles: [{ id: "projectile-1", lane: 0, depth: 0.42 }],
    }, 16);

    expect(next.enemies).toHaveLength(0);
    expect(next.targetIndex).toBe(0);
    expect(next.correctWords).toBe(0);
    expect(next.totalAttempts).toBe(1);
    expect(next.lastOutcome).toBe("incorrect");
  });

  it("removes enemies at the rim and enters defeat at zero lives", () => {
    const state = withPlaying(createAbyssalWellState(SENTENCES, { seed: 7 }));
    const hazardous: AbyssalWellState = {
      ...state,
      player: { ...state.player, lives: 1 },
      enemies: [{ id: "enemy-rim", lane: 0, depth: 0.99, word: "silver", wordIndex: 0, type: "goblin-scout" }],
    };
    const next = advanceAbyssalWellTime(hazardous, 100);

    expect(next.enemies).toHaveLength(0);
    expect(next.player.lives).toBe(0);
    expect(next.phase).toBe("defeat");
  });

  it("enters victory after all ordered sentence words are hit", () => {
    const state = withPlaying(createAbyssalWellState([{ term: "silver", translation: "quiet" }], { seed: 8 }));
    const next = advanceAbyssalWellTime({ ...state, targetIndex: 1, correctWords: 1 }, 16);
    expect(next.phase).toBe("victory");
  });

  it("exposes the shared target, action, resource, and result counters", () => {
    const controller = createAbyssalWellController(SENTENCES, vi.fn(), { seed: 12 });

    expect(controller.snapshot()).toMatchObject({
      phase: "playing",
      status: "playing",
      targetIndex: 0,
      targetCount: 6,
      prompt: "quiet doors",
      answer: "silver",
      correctAction: "confirm",
      availableActions: ["move-left", "move-right", "confirm"],
      lives: 3,
      energy: 6,
      score: 0,
      correctAnswers: 0,
      accuracy: 0,
      correctWords: 0,
      totalAttempts: 0,
      destroyed: false,
    });
  });

  it("routes semantic choices through radial movement and projectile results", () => {
    const controller = createAbyssalWellController(SENTENCES, vi.fn(), { seed: 13 });
    const initial = controller.snapshot();
    const moved = controller.choose("move-left");
    const fired = controller.choose("confirm");

    expect(moved).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(moved.snapshot.player.lane).toBe(7);
    expect(fired).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(fired.snapshot.projectiles[0]).toMatchObject({ lane: 7, depth: 1 });
    expect(controller.choose("pause" as never)).toMatchObject({ accepted: false });
    expect(initial.targetIndex).toBe(0);
  });

  it("clamps every gameplay tick to the shared 50 millisecond ceiling", () => {
    const controller = createAbyssalWellController(SENTENCES, vi.fn(), { seed: 14 });

    controller.advance(1_000);

    expect(controller.snapshot().gameTime).toBe(50);
  });

  it("accounts wrong and correct enemy attempts with exact ordered score", () => {
    const controller = createAbyssalWellController(SENTENCES, vi.fn(), { seed: 15 });
    controller.spawn(() => 0.99);
    const wrong = controller.snapshot().enemies[0]!;
    controller.rotate(wrong.lane - controller.snapshot().player.lane);
    controller.choose("confirm");
    for (let index = 0; index < 20 && controller.snapshot().totalAttempts === 0; index += 1) {
      controller.advance(50);
    }

    expect(controller.snapshot()).toMatchObject({
      targetIndex: 0,
      correctWords: 0,
      totalAttempts: 1,
      score: 0,
      lastOutcome: "incorrect",
      enemies: [],
    });

    controller.spawn(() => 0);
    const correct = controller.snapshot().enemies[0]!;
    controller.rotate(correct.lane - controller.snapshot().player.lane);
    controller.choose("confirm");
    for (let index = 0; index < 20 && controller.snapshot().targetIndex === 0; index += 1) {
      controller.advance(50);
    }

    expect(controller.snapshot()).toMatchObject({
      targetIndex: 1,
      correctWords: 1,
      totalAttempts: 2,
      score: 100,
      lastOutcome: "correct",
    });
  });

  it("rejects responsive snapshots with inconsistent target, enemy, or projectile data", () => {
    const controller = createAbyssalWellController(SENTENCES, vi.fn(), { seed: 16 });
    controller.spawn(() => 0);
    controller.choose("confirm");
    const captured = controller.capture();

    expect(() => controller.restore({ ...captured, answer: "tampered" })).toThrow();
    expect(() => controller.restore({
      ...captured,
      enemies: captured.enemies.map((enemy) => ({ ...enemy, word: "tampered" })),
    })).toThrow();
    expect(() => controller.restore({
      ...captured,
      projectiles: captured.projectiles.map((projectile) => ({ ...projectile, lane: ABYSSAL_WELL_LANES })),
    })).toThrow();
  });

  it("emits one validated result for a complete controller session", () => {
    const deliver = vi.fn();
    const controller = createAbyssalWellController([{ term: "silver", translation: "quiet" }], deliver, { seed: 0 });
    controller.spawn();
    controller.fire();
    for (let index = 0; index < 20 && controller.snapshot().phase === "playing"; index += 1) {
      controller.advance(50);
    }

    expect(controller.snapshot().phase).toBe("victory");
    expect(deliver).toHaveBeenCalledOnce();
    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);
    expect(result).toEqual({
      accuracy: 1,
      xp: 30,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });
    expect(controller.snapshot().result).toEqual(result);
    expect(deliver).toHaveBeenCalledWith(result, "victory");
    expect(controller.fire().accepted).toBe(false);
  });

  it("returns the exact result from the first terminal choose", () => {
    const deliver = vi.fn();
    const controller = createAbyssalWellController([{ term: "silver", translation: "quiet" }], deliver, { seed: 0 });
    controller.spawn();
    const captured = controller.capture();
    controller.restore({
      ...captured,
      enemies: captured.enemies.map((enemy) => ({ ...enemy, depth: 0.9 })),
    });

    const terminal = controller.choose("confirm");

    expect(terminal).toMatchObject({
      accepted: true,
      correct: true,
      progressed: true,
      terminal: true,
      completed: true,
      result: {
        accuracy: 1,
        xp: 30,
        score: 100,
        correctAnswers: 1,
        totalAttempts: 1,
      },
    });
    expect(terminal.snapshot.result).toEqual(terminal.result);
    expect(deliver).toHaveBeenCalledWith(terminal.result, "victory");
  });

  it("completes all words across multiple sentences with one exact victory result", () => {
    const deliver = vi.fn();
    const controller = createAbyssalWellController(SENTENCES, deliver, { seed: 17 });

    for (let index = 0; index < 6; index += 1) {
      controller.spawn(() => 0);
      const target = controller.snapshot().enemies[0];
      if (!target) throw new Error("The test needs one ordered enemy per word");
      controller.rotate(target.lane - controller.snapshot().player.lane);
      controller.choose("confirm");
      for (let step = 0; step < 20 && controller.snapshot().totalAttempts <= index; step += 1) {
        controller.advance(50);
      }
    }

    const result = gameResultsSchema.parse(controller.snapshot().result);
    expect(controller.snapshot().phase).toBe("victory");
    expect(result).toEqual({
      accuracy: 1,
      xp: 130,
      score: 600,
      correctAnswers: 6,
      totalAttempts: 6,
    });
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(result, "victory");
  });

  it("emits one valid defeat result after three rim hazards", () => {
    const deliver = vi.fn();
    const controller = createAbyssalWellController([{ term: "silver", translation: "quiet" }], deliver, { seed: 1 });

    controller.applyHazard();
    controller.applyHazard();
    const finalHazard = controller.applyHazard();

    expect(finalHazard).toMatchObject({ accepted: true, terminal: true, completed: true });
    expect(controller.snapshot()).toMatchObject({ phase: "defeat", player: { lives: 0 } });
    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);
    expect(finalHazard.result).toEqual(result);
    expect(result).toEqual({
      accuracy: 0,
      xp: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
    expect(controller.snapshot().result).toEqual(result);
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(result, "defeat");
  });

  it("maps keyboard and touch zones to semantic radial actions", () => {
    expect(ABYSSAL_WELL_KEYBOARD_BINDINGS).toMatchObject({
      ArrowLeft: "move-left",
      KeyA: "move-left",
      ArrowRight: "move-right",
      KeyD: "move-right",
      Space: "confirm",
    });
    expect(chooseAbyssalWellActionFromPointer(40, 300, 390, 700)).toBe("move-left");
    expect(chooseAbyssalWellActionFromPointer(350, 300, 390, 700)).toBe("move-right");
    expect(chooseAbyssalWellActionFromPointer(195, 300, 390, 700)).toBe("confirm");
  });

  it("processes scene keyboard and touch input and exposes responsive state", () => {
    const input = createInputController();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const config = createAbyssalWellCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic,
      inputController: input,
      seed: 9,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createSceneHarness>["scene"]) => void;
      update: (this: ReturnType<typeof createSceneHarness>["scene"], time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => AbyssalWellState };
    };
    const harness = createSceneHarness();
    scene.create.call(harness.scene);

    input.set(inputSnapshot({ pressed: ["ArrowLeft"] }));
    scene.update.call(harness.scene, 0, 16);
    expect(scene.extend.apkCaptureResponsiveState().player.lane).toBe(7);

    input.set(inputSnapshot({
      pointer: { ...inputSnapshot().pointer, released: true, x: 480, y: 300 },
    }));
    scene.update.call(harness.scene, 16, 16);
    expect(scene.extend.apkCaptureResponsiveState().projectiles).toHaveLength(1);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "ABYSSAL_WELL_READY" }));
    expect(complete).not.toHaveBeenCalled();
  });

  it("passes the terminal victory outcome through context.complete", () => {
    const input = createInputController();
    const complete = vi.fn();
    const config = createAbyssalWellCartridge().createGameConfig({
      input: [{ term: "silver", translation: "quiet" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: input,
      seed: 0,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createSceneHarness>["scene"]) => void;
      update: (this: ReturnType<typeof createSceneHarness>["scene"], time: number, delta: number) => void;
    };
    const harness = createSceneHarness();
    scene.create.call(harness.scene);

    for (let frame = 0; frame < 40; frame += 1) scene.update.call(harness.scene, frame * 50, 50);
    input.set(inputSnapshot({ pressed: ["Space"] }));
    scene.update.call(harness.scene, 2_000, 50);
    input.set(inputSnapshot());
    for (let frame = 0; frame < 20 && complete.mock.calls.length === 0; frame += 1) {
      scene.update.call(harness.scene, 2_050 + frame * 50, 50);
    }

    expect(complete).toHaveBeenCalledWith({
      accuracy: 1,
      xp: 30,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    }, "victory");
  });

  it("passes the terminal defeat outcome through context.complete", () => {
    const input = createInputController();
    const complete = vi.fn();
    const config = createAbyssalWellCartridge().createGameConfig({
      input: [{ term: "silver", translation: "quiet" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: input,
      seed: 0,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createSceneHarness>["scene"]) => void;
      update: (this: ReturnType<typeof createSceneHarness>["scene"], time: number, delta: number) => void;
    };
    const harness = createSceneHarness();
    scene.create.call(harness.scene);

    for (let frame = 0; frame < 500 && complete.mock.calls.length === 0; frame += 1) {
      scene.update.call(harness.scene, frame * 50, 50);
    }

    expect(complete).toHaveBeenCalledWith({
      accuracy: 0,
      xp: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    }, "defeat");
  });

  it("runs tutorial demonstrations through real safe mechanic actions without delivery", () => {
    const input = createInputController();
    const complete = vi.fn();
    const cartridge = createAbyssalWellCartridge();
    const config = cartridge.createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: input,
      seed: 29,
      sessionMode: "tutorial",
    });
    const scene = config.scene as {
      extend: { apkCaptureResponsiveState: () => AbyssalWellState };
    };
    const definition = cartridge.standardExperience.definition;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const harness = createSceneHarness();
    const playableScene = config.scene as {
      create: (this: ReturnType<typeof createSceneHarness>["scene"]) => void;
      update: (this: ReturnType<typeof createSceneHarness>["scene"], time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => AbyssalWellState };
    };
    playableScene.create.call(harness.scene);
    const runStep = (index: number): void => {
      const context: GameTutorialActionDriverContext = {
        tutorial: definition.tutorial,
        step: definition.tutorial.steps[index]!,
        seed: definition.tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: vi.fn() },
      };
      driver.execute(context);
    };
    const settle = (expectedOutcome: "correct" | "incorrect"): AbyssalWellState => {
      let state = playableScene.extend.apkCaptureResponsiveState();
      for (let frame = 0; frame < 24 && state.lastOutcome !== expectedOutcome; frame += 1) {
        playableScene.update.call(harness.scene, frame * 50, 50);
        state = playableScene.extend.apkCaptureResponsiveState();
      }
      return state;
    };

    runStep(0);
    const afterIncorrectStart = playableScene.extend.apkCaptureResponsiveState();
    expect(afterIncorrectStart.enemies.length).toBeGreaterThan(0);
    expect(afterIncorrectStart.projectiles.length).toBeGreaterThan(0);
    expect(afterIncorrectStart.lastOutcome).toBeUndefined();
    expect(afterIncorrectStart.totalAttempts).toBe(0);
    expect(settle("incorrect")).toMatchObject({
      targetIndex: 0,
      totalAttempts: 1,
      lastOutcome: "incorrect",
      score: 0,
    });
    runStep(1);
    const afterCorrectStart = playableScene.extend.apkCaptureResponsiveState();
    expect(afterCorrectStart.projectiles.length).toBeGreaterThan(0);
    expect(afterCorrectStart.lastOutcome).toBe("incorrect");
    expect(settle("correct")).toMatchObject({
      targetIndex: 1,
      correctWords: 1,
      lastOutcome: "correct",
      score: 100,
    });
    expect(complete).not.toHaveBeenCalled();
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      targetIndex: 1,
      correctWords: 1,
      score: 100,
    });
  });

  it("removes a real tutorial-only wrong enemy for one-word input", () => {
    const input = createInputController();
    const complete = vi.fn();
    const cartridge = createAbyssalWellCartridge();
    const config = cartridge.createGameConfig({
      input: [{ term: "silver", translation: "quiet" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: input,
      seed: 29,
      sessionMode: "tutorial",
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createSceneHarness>["scene"]) => void;
      update: (this: ReturnType<typeof createSceneHarness>["scene"], time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => AbyssalWellState };
    };
    const definition = cartridge.standardExperience.definition;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const harness = createSceneHarness();
    scene.create.call(harness.scene);
    const runStep = (index: number): void => {
      driver.execute({
        tutorial: definition.tutorial,
        step: definition.tutorial.steps[index]!,
        seed: definition.tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: vi.fn() },
      });
    };
    const settle = (): AbyssalWellState => {
      let state = scene.extend.apkCaptureResponsiveState();
      for (let frame = 0; frame < 24 && (state.lastOutcome === undefined || state.projectiles.length > 0); frame += 1) {
        scene.update.call(harness.scene, frame * 50, 50);
        state = scene.extend.apkCaptureResponsiveState();
      }
      return state;
    };

    runStep(0);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      targetIndex: 0,
      totalAttempts: 0,
      lastOutcome: undefined,
      phase: "playing",
    });
    expect(scene.extend.apkCaptureResponsiveState().enemies.length).toBeGreaterThan(0);
    expect(scene.extend.apkCaptureResponsiveState().enemies.every((enemy) => enemy.word === "silver")).toBe(true);
    expect(scene.extend.apkCaptureResponsiveState().enemies.every((enemy) => enemy.word !== "tutorial-decoy")).toBe(true);
    expect(scene.extend.apkCaptureResponsiveState().projectiles.length).toBeGreaterThan(0);
    expect(settle()).toMatchObject({
      enemies: [],
      targetIndex: 0,
      totalAttempts: 1,
      correctWords: 0,
      lastOutcome: "incorrect",
      score: 0,
      phase: "playing",
    });

    runStep(1);
    expect(scene.extend.apkCaptureResponsiveState().projectiles.length).toBeGreaterThan(0);
    expect(settle()).toMatchObject({
      phase: "victory",
      targetIndex: 1,
      totalAttempts: 2,
      correctWords: 1,
      lastOutcome: "correct",
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it("cleans scene resources and seals the controller on shutdown", () => {
    const input = createInputController();
    const config = createAbyssalWellCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createSceneHarness>["scene"]) => void;
      extend: { apkCaptureResponsiveState: () => AbyssalWellState };
    };
    const harness = createSceneHarness();
    scene.create.call(harness.scene);

    harness.listeners.get("shutdown")?.();
    harness.listeners.get("destroy")?.();

    expect(harness.graphics.destroy).toHaveBeenCalledOnce();
    expect(harness.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect(input.cancelActiveGesture).toHaveBeenCalledOnce();
    expect(scene.extend.apkCaptureResponsiveState().destroyed).toBe(true);
  });

  it("covers public difficulty, creature, and bounded XP rules", () => {
    expect(getCreatureSpeed("goblin-scout")).toBe(50);
    expect(getCreatureSpeed("cave-spider")).toBe(70);
    expect(getCreatureSpeed("shadow-demon")).toBe(90);
    expect(getCreatureSpeed("unknown" as never)).toBe(70);

    expect(getDifficultyConfig("easy")).toEqual({ name: "Shallow Well", wordCount: 4 });
    expect(getDifficultyConfig("medium")).toEqual({ name: "Deep Chasm", wordCount: 5 });
    expect(getDifficultyConfig("hard")).toEqual({ name: "Abyss", wordCount: 6 });
    expect(getDifficultyConfig("unknown" as never)).toEqual({ name: "Deep Chasm", wordCount: 5 });

    expect(calculateXP({ correctWords: 0, totalAttempts: 0, lives: 3, initialLives: 3, gameTime: 0 })).toBe(0);
    expect(calculateXP({ correctWords: 6, totalAttempts: 6, lives: 3, initialLives: 3, gameTime: 29_999 })).toBe(10);
    expect(calculateXP({ correctWords: 2, totalAttempts: 4, lives: 1, initialLives: 3, gameTime: 30_000 })).toBe(2);
  });

  it("handles start, direct hazard validation, and terminal state guards", () => {
    const initial = createAbyssalWellState(SENTENCES, {
      seed: 21,
      difficulty: "easy",
      creatureType: "shadow-demon",
    });
    expect(startGame(initial)).toMatchObject({ phase: "playing", gameTime: 0, lastSpawnTime: 0 });
    expect(startGame({ ...initial, phase: "victory" })).toMatchObject({ phase: "victory" });
    expect(startGame({ ...initial, destroyed: true })).toMatchObject({ destroyed: true });
    expect(rotatePlayer({ ...initial, phase: "victory" }, 1)).toMatchObject({ phase: "victory" });
    expect(fireProjectile({ ...initial, phase: "defeat" })).toMatchObject({ phase: "defeat" });
    expect(spawnEnemy({ ...initial, phase: "defeat" })).toMatchObject({ phase: "defeat" });
    expect(advanceAbyssalWellTime({ ...initial, phase: "defeat" }, -1)).toMatchObject({ phase: "defeat" });
    expect(applyAbyssalWellHazard({ ...initial, phase: "defeat" })).toMatchObject({ phase: "defeat" });

    expect(() => rotatePlayer(initial, 0.5)).toThrow(/rotation/i);
    expect(() => advanceAbyssalWellTime(startGame(initial), Number.NaN)).toThrow(/delta/i);
    expect(() => applyAbyssalWellHazard(startGame(initial), 0)).toThrow(/hazard/i);
    expect(applyAbyssalWellHazard(startGame(initial), 2)).toMatchObject({ phase: "playing", player: { lives: 1 } });
    expect(applyAbyssalWellHazard(startGame(initial), 5)).toMatchObject({ phase: "defeat", player: { lives: 0 } });
  });

  it("rejects inconsistent responsive state across content, resources, and actors", () => {
    const controller = createAbyssalWellController(SENTENCES, vi.fn(), { seed: 16 });
    const captured = controller.capture();

    expect(() => controller.restore(null as never)).toThrow(/object/i);
    expect(() => controller.restore({ ...captured, status: "start" })).toThrow(/identity/i);
    expect(() => controller.restore({ ...captured, seed: 17 })).toThrow(/identity/i);
    expect(() => controller.restore({ ...captured, difficulty: "easy" })).toThrow(/identity/i);
    expect(() => controller.restore({ ...captured, creatureType: "shadow-demon" })).toThrow(/identity/i);
    expect(() => controller.restore({ ...captured, sentences: [] })).toThrow(/sentences/i);
    expect(() => controller.restore({ ...captured, words: ["tampered"] })).toThrow(/words/i);
    expect(() => controller.restore({ ...captured, targetCount: 99 })).toThrow(/target/i);
    expect(() => controller.restore({ ...captured, targetIndex: -1 })).toThrow(/target/i);
    expect(() => controller.restore({ ...captured, sentence: { term: "tampered", translation: captured.prompt } })).toThrow(/target/i);
    expect(() => controller.restore({ ...captured, prompt: "tampered" })).toThrow(/target/i);
    expect(() => controller.restore({ ...captured, answer: "tampered" })).toThrow(/target/i);
    expect(() => controller.restore({ ...captured, availableActions: ["confirm"] })).toThrow(/target/i);
    expect(() => controller.restore({ ...captured, energy: 99 })).toThrow(/resources/i);
    expect(() => controller.restore({ ...captured, score: 1 })).toThrow(/resources|counters/i);
    expect(() => controller.restore({ ...captured, correctAnswers: 1 })).toThrow(/resources|counters/i);
    expect(() => controller.restore({ ...captured, accuracy: 1 })).toThrow(/resources/i);
    expect(() => controller.restore({ ...captured, correctWords: 1 })).toThrow(/resources|counters/i);
    expect(() => controller.restore({ ...captured, player: { ...captured.player, lane: ABYSSAL_WELL_LANES } })).toThrow(/lives/i);
    expect(() => controller.restore({ ...captured, player: { ...captured.player, lastFireTime: 1 } })).toThrow(/lives/i);
    expect(() => controller.restore({ ...captured, gameTime: Number.NaN })).toThrow(/timing/i);
    expect(() => controller.restore({ ...captured, spawnSerial: -1 })).toThrow(/timing/i);
    expect(() => controller.restore({ ...captured, nextEntityId: 0 })).toThrow(/timing/i);
    expect(() => controller.restore({ ...captured, enemies: "invalid" as never })).toThrow(/actors/i);

    const withActors = controller.spawn(() => 0);
    const withProjectile = controller.fire().snapshot;
    expect(() => controller.restore({
      ...withActors,
      enemies: withActors.enemies.map((enemy) => ({ ...enemy, depth: 1 })),
    })).toThrow(/enemy/i);
    expect(() => controller.restore({
      ...withProjectile,
      projectiles: withProjectile.projectiles.map((projectile) => ({ ...projectile, lane: ABYSSAL_WELL_LANES })),
    })).toThrow(/projectile/i);
    expect(() => controller.restore({ ...captured, result: { accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 } })).toThrow(/active|result/i);
  });

  it("keeps tutorial scene simulation free of production input and delivery", () => {
    const input = createInputController();
    const complete = vi.fn();
    const config = createAbyssalWellCartridge().createGameConfig({
      input: [{ term: "silver", translation: "quiet" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: input,
      seed: 9,
      sessionMode: "tutorial",
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createSceneHarness>["scene"]) => void;
      update: (this: ReturnType<typeof createSceneHarness>["scene"], time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState: () => AbyssalWellState;
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const harness = createSceneHarness();
    scene.create.call(harness.scene);
    const before = scene.extend.apkCaptureResponsiveState();
    input.set(inputSnapshot({ pressed: ["Space"], pointer: { ...inputSnapshot().pointer, released: true, cancelled: true } }));
    scene.update.call(harness.scene, 0, 200);

    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ gameTime: before.gameTime, projectiles: [] });
    expect(complete).not.toHaveBeenCalled();
    expect(() => scene.extend.apkRestoreResponsiveState(null)).toThrow(/responsive/i);
    scene.extend.apkRecompose({ profile: "compact" });
  });

  it("exposes a procedural sentence cartridge without the shared legacy factory", () => {
    const cartridge = createAbyssalWellCartridge();
    expect(cartridge.manifest).toMatchObject({
      id: "abyssal-well",
      title: "The Abyssal Well",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
      requiredAssetBindings: ["abyssal-well/rim-and-enemies"],
    });
    expect(ABYSSAL_WELL_CANVAS).toEqual({ width: 960, height: 540 });
  });
});
