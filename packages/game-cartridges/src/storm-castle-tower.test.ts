import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { APKInputSnapshot } from "@reading-advantage/advantage-play-kit";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  createStormCastleTowerCartridge,
  createStormCastleTowerController,
  chooseStormCastleTowerDirectionFromPointer,
  STORM_CASTLE_TOWER_KEYBOARD_BINDINGS,
  getStormCastleTowerDirectionFromPointer,
} from "./storm-castle-tower.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const SENTENCES = [
  { term: "Storm clouds", translation: "Dark clouds" },
  { term: "Guards watch", translation: "Sentinels observe" },
];
const ONE_WORD_SENTENCE = [{ term: "Storm", translation: "Dark clouds" }];
type StormCastleTowerTestSnapshot = ReturnType<ReturnType<typeof createStormCastleTowerController>["snapshot"]>;

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function inputSnapshot(overrides: Omit<Partial<APKInputSnapshot>, "pointer"> & {
  pointer?: Partial<APKInputSnapshot["pointer"]>;
} = {}): APKInputSnapshot {
  return {
    keys: [],
    pressed: [],
    destroyed: false,
    ...overrides,
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
      ...overrides.pointer,
    },
  };
}

function createMutableInputController() {
  let current = inputSnapshot();
  return {
    snapshot: vi.fn(() => current),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
    setSnapshot(next: APKInputSnapshot): void {
      current = next;
    },
  };
}

function createSceneHost() {
  const graphics = {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    fillCircle: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillTriangle: vi.fn(),
    lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(),
    destroy: vi.fn(),
  };
  for (const method of [
    graphics.clear,
    graphics.fillStyle,
    graphics.fillRect,
    graphics.fillCircle,
    graphics.fillRoundedRect,
    graphics.fillTriangle,
    graphics.lineStyle,
    graphics.strokeRoundedRect,
  ]) method.mockReturnValue(graphics);

  const texts: Array<{
    setPosition: ReturnType<typeof vi.fn>;
    setText: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const createText = () => {
    const text = {
      setPosition: vi.fn(),
      setText: vi.fn(),
      destroy: vi.fn(),
    };
    text.setPosition.mockReturnValue(text);
    text.setText.mockReturnValue(text);
    texts.push(text);
    return text;
  };

  const listeners = new Map<string, () => void>();
  const host = {
    add: {
      graphics: vi.fn(() => graphics),
      text: vi.fn(() => createText()),
    },
    events: {
      once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
    },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) } },
    scale: { width: 960, height: 540 },
  };

  return {
    host,
    graphics,
    texts,
    emit(event: string): void {
      listeners.get(event)?.();
    },
  };
}

function moveToWindow(
  controller: ReturnType<typeof createStormCastleTowerController>,
  windowId: string,
): void {
  const target = controller.snapshot().windows.find((window) => window.id === windowId);
  if (!target) throw new Error(`Missing tower window ${windowId}`);

  while (controller.snapshot().player.col < target.position.col) controller.move("right");
  while (controller.snapshot().player.col > target.position.col) controller.move("left");
  while (controller.snapshot().player.row < target.position.row) controller.move("down");
  while (controller.snapshot().player.row > target.position.row) controller.move("up");
}

function completeSession(controller: ReturnType<typeof createStormCastleTowerController>): void {
  while (controller.snapshot().phase !== "victory") {
    const target = controller.snapshot().windows.find(
      (window) => window.wordIndex === controller.snapshot().targetIndex && window.state === "open",
    );
    if (!target) throw new Error("The tower has no open target window");
    moveToWindow(controller, target.id);
    controller.collect();
  }
}

describe("Storm the Castle Tower cartridge", () => {
  it("keeps four columns and supports four-way movement around the tower", () => {
    const controller = createStormCastleTowerController(SENTENCES, vi.fn(), 7);
    const initial = controller.snapshot();

    expect(initial.windows).toHaveLength(4);
    expect(initial).toMatchObject({
      seed: 7,
      correctAction: expect.any(String),
      availableActions: ["move-left", "move-right", "move-up", "move-down", "confirm"],
      energy: initial.lives,
    });
    expect(initial.windows.every((window) => window.position.col >= 0 && window.position.col < 4)).toBe(true);
    expect(initial.player.col).toBeGreaterThanOrEqual(0);
    expect(initial.player.col).toBeLessThan(4);

    const left = controller.move("left");
    const up = controller.move("up");
    const right = controller.move("right");
    const down = controller.move("down");
    expect(left.player.col).toBe(initial.player.col - 1);
    expect(up.player.row).toBe(initial.player.row - 1);
    expect(right.player.col).toBe(initial.player.col);
    expect(down.player.row).toBe(initial.player.row);

    for (let index = 0; index < 8; index += 1) controller.move("left");
    expect(controller.snapshot().player.col).toBe(0);
    for (let index = 0; index < 8; index += 1) controller.move("right");
    expect(controller.snapshot().player.col).toBe(3);
  });

  it("collects a nearby target window only when it is the next ordered word", () => {
    const controller = createStormCastleTowerController(SENTENCES, vi.fn(), 11);
    const target = controller.snapshot().windows[0]!;
    moveToWindow(controller, target.id);

    const collected = controller.collect();

    expect(collected).toMatchObject({ accepted: true, correct: true, progressed: true, terminal: false });
    expect(collected.snapshot.targetIndex).toBe(1);
    expect(collected.snapshot.windows.find((window) => window.id === target.id)?.state).toBe("collected");
    expect(collected.snapshot.cameraY).toBeGreaterThan(0);
    expect(collected.snapshot.height).toBeGreaterThan(0);
  });

  it("keeps every ordered word across multiple sentence inputs", () => {
    const sentences = [
      { term: "Storm clouds gather", translation: "Dark clouds assemble" },
      { term: "Guards watch closely", translation: "Sentinels observe carefully" },
    ];
    const controller = createStormCastleTowerController(sentences, vi.fn(), { seed: 13 });
    const words = sentences.flatMap((sentence) => sentence.term.split(" "));
    const seen: string[] = [];

    while (controller.snapshot().phase === "playing") {
      const state = controller.snapshot();
      seen.push(state.answer);
      expect(state.targetCount).toBe(words.length);
      expect(state.answer).toBe(words[state.targetIndex]);
      const target = state.windows.find((window) => window.wordIndex === state.targetIndex);
      if (!target) throw new Error("Expected an open target window");
      moveToWindow(controller, target.id);
      expect(controller.collect(target.id).progressed).toBe(true);
    }

    expect(seen).toEqual(words);
    expect(controller.snapshot()).toMatchObject({
      phase: "victory",
      targetIndex: words.length,
      correctAnswers: words.length,
      score: words.length * 100,
    });
  });

  it("closes a wrong nearby window and costs one life without changing the target", () => {
    const controller = createStormCastleTowerController(SENTENCES, vi.fn(), 3);
    const initial = controller.snapshot();
    const wrong = initial.windows[1]!;
    moveToWindow(controller, wrong.id);

    const result = controller.collect(wrong.id);

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(result.snapshot.targetIndex).toBe(0);
    expect(result.snapshot.lives).toBe(initial.lives - 1);
    expect(result.snapshot.windows.find((window) => window.id === wrong.id)?.state).toBe("closed");
    expect(result.snapshot.lastOutcome).toBe("incorrect");
  });

  it("falls deterministic oil and rock hazards into the player", () => {
    const first = createStormCastleTowerController(SENTENCES, vi.fn(), 19);
    const second = createStormCastleTowerController(SENTENCES, vi.fn(), 19);
    const firstSpawn = first.spawnHazard("oil", first.snapshot().player.col);
    const secondSpawn = second.spawnHazard("oil", second.snapshot().player.col);

    expect(firstSpawn).toEqual(secondSpawn);
    first.tick(1_000);
    expect(first.snapshot().lives).toBe(2);

    const rock = first.spawnHazard("rock", first.snapshot().player.col);
    expect(rock?.type).toBe("rock");
    first.tick(1_000);
    expect(first.snapshot().lives).toBe(1);
    expect(first.snapshot().hazards.every((hazard) => hazard.type === "oil" || hazard.type === "rock")).toBe(true);
  });

  it("progresses camera height while the player climbs upward", () => {
    const controller = createStormCastleTowerController(SENTENCES, vi.fn());
    const before = controller.snapshot();
    controller.move("up");
    const after = controller.snapshot();

    expect(after.player.row).toBe(before.player.row - 1);
    expect(after.cameraY).toBeGreaterThan(before.cameraY);
    expect(after.cameraOffset).toBe(after.cameraY);
    expect(after.height).toBeGreaterThan(before.height);
  });

  it("emits one valid victory result after every ordered sentence word", () => {
    const deliver = vi.fn();
    const controller = createStormCastleTowerController(SENTENCES, deliver);

    completeSession(controller);
    const afterVictory = controller.collect();

    expect(afterVictory).toMatchObject({ accepted: false, terminal: true, completed: true });
    expect(controller.snapshot()).toMatchObject({ phase: "victory", targetIndex: 4, correctAnswers: 4, totalAttempts: 4 });
    expect(deliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 1,
      score: 400,
      correctAnswers: 4,
      totalAttempts: 4,
    });
  });

  it("returns GameResults from a terminal choose action", () => {
    const controller = createStormCastleTowerController(ONE_WORD_SENTENCE, vi.fn());
    const target = controller.snapshot().windows[0];
    if (!target) throw new Error("Expected a tower target window");
    moveToWindow(controller, target.id);

    const result = controller.choose("confirm");

    expect(result).toMatchObject({ accepted: true, correct: true, progressed: true, terminal: true, completed: true });
    expect(gameResultsSchema.parse(result.result)).toMatchObject({
      accuracy: 1,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });
  });

  it("passes victory through context completion with an explicit outcome", () => {
    const complete = vi.fn();
    const cartridge = createStormCastleTowerCartridge();
    cartridge.createGameConfig({
      input: ONE_WORD_SENTENCE,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: createMutableInputController(),
      seed: 17,
      sessionMode: "playing",
    });
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const step = tutorial.steps[1];
    if (!step) throw new Error("Expected a correct tutorial step");

    cartridge.standardExperience.createTutorialActionDriver().execute({
      tutorial,
      step,
      seed: tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });

    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0]?.[1]).toBe("victory");
    expect(gameResultsSchema.parse(complete.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 1,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });
  });

  it("passes defeat through context completion with an explicit outcome", () => {
    const complete = vi.fn();
    const cartridge = createStormCastleTowerCartridge();
    const config = cartridge.createGameConfig({
      input: ONE_WORD_SENTENCE,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: createMutableInputController(),
      seed: 23,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: {
        apkCaptureResponsiveState: () => StormCastleTowerTestSnapshot;
        apkRestoreResponsiveState: (state: unknown) => void;
      };
    };
    const host = createSceneHost();
    scene.create.call(host.host);
    const initial = scene.extend.apkCaptureResponsiveState();
    scene.extend.apkRestoreResponsiveState({
      ...initial,
      lives: 1,
      energy: 1,
      spawnCount: 1,
      hazards: [{
        id: "hazard:0",
        type: "oil",
        column: initial.player.col,
        y: initial.player.row - 1,
        speed: 2.4,
      }],
    });
    for (let frame = 0; frame < 10 && complete.mock.calls.length === 0; frame += 1) {
      scene.update.call(host.host, 0, 50);
    }

    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ phase: "defeat", lives: 0 });
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0]?.[1]).toBe("defeat");
    expect(gameResultsSchema.parse(complete.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
    host.emit("shutdown");
  });

  it("keeps tutorial completion local without delivering a production result", () => {
    const deliver = vi.fn();
    const controller = createStormCastleTowerController(SENTENCES, deliver, { seed: 31 }, false);

    completeSession(controller);

    expect(controller.snapshot().phase).toBe("victory");
    expect(controller.snapshot().result).toMatchObject({ score: 400, correctAnswers: 4 });
    expect(deliver).not.toHaveBeenCalled();
  });

  it.each(["tutorial", "demo"] as const)("suppresses context completion in %s sessions", (sessionMode) => {
    const complete = vi.fn();
    const cartridge = createStormCastleTowerCartridge();
    cartridge.createGameConfig({
      input: ONE_WORD_SENTENCE,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: createMutableInputController(),
      seed: 31,
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

    expect(complete).not.toHaveBeenCalled();
  });

  it("emits one defeat result when lives reach zero", () => {
    const deliver = vi.fn();
    const controller = createStormCastleTowerController(SENTENCES, deliver);

    controller.applyHazard();
    controller.applyHazard();
    const final = controller.applyHazard();

    expect(controller.snapshot()).toMatchObject({ phase: "defeat", lives: 0 });
    expect(final).toMatchObject({ accepted: true, terminal: true, completed: true });
    expect(final.result).toMatchObject({ accuracy: 0, score: 0 });
    expect(deliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
  });

  it("rejects responsive states with a closed target or inconsistent entities", () => {
    const controller = createStormCastleTowerController(SENTENCES, vi.fn(), {
      seed: 23,
      hazardIntervalMs: 1_000_000,
    });
    const captured = controller.capture();
    const targetIndex = captured.targetIndex;
    const target = captured.windows[targetIndex];
    if (!target) throw new Error("Expected a current target window");

    expect(() => controller.restore({
      ...captured,
      windows: captured.windows.map((window) => window.id === target.id
        ? { ...window, state: "closed" as const }
        : window),
    })).toThrow(/responsive state/u);

    expect(() => controller.restore({
      ...captured,
      hazards: [{
        id: "hazard:999",
        type: "oil",
        column: 0,
        y: 0,
        speed: 0,
      }],
    })).toThrow(/responsive state/u);
  });

  it("maps WASD, arrows, Space, Enter, and pointer or touch directions", () => {
    expect(STORM_CASTLE_TOWER_KEYBOARD_BINDINGS).toMatchObject({
      KeyW: "move-up",
      ArrowUp: "move-up",
      KeyA: "move-left",
      ArrowLeft: "move-left",
      KeyS: "move-down",
      ArrowDown: "move-down",
      KeyD: "move-right",
      ArrowRight: "move-right",
      Space: "confirm",
      Enter: "confirm",
    });
    expect(getStormCastleTowerDirectionFromPointer(-40, 0)).toBe("left");
    expect(getStormCastleTowerDirectionFromPointer(40, 0)).toBe("right");
    expect(getStormCastleTowerDirectionFromPointer(0, -40)).toBe("up");
    expect(getStormCastleTowerDirectionFromPointer(0, 40)).toBe("down");
    expect(chooseStormCastleTowerDirectionFromPointer(850, 390, 960, 540)).toBe("move-up");
    expect(chooseStormCastleTowerDirectionFromPointer(790, 450, 960, 540)).toBe("move-left");
  });

  it("does not call a shared legacy catalog factory", () => {
    const source = readFileSync(resolve(REPO_ROOT, "packages/game-cartridges/src/storm-castle-tower.ts"), "utf8");

    expect(source).not.toMatch(/createLegacyCatalog(?:Cartridge|Controller)/u);
    expect(source).not.toMatch(/from\s+["']phaser["']/u);
  });

  it("creates a responsive scene, handles keyboard and touch input, and cleans up once", () => {
    const input = createMutableInputController();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const cartridge = createStormCastleTowerCartridge();
    const config = cartridge.createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic,
      inputController: input,
      seed: 5,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: {
        apkCaptureResponsiveState: () => ReturnType<typeof createStormCastleTowerController>["snapshot"] extends () => infer State ? State : never;
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const host = createSceneHost();

    scene.create.call(host.host);
    const initial = scene.extend.apkCaptureResponsiveState();
    input.setSnapshot(inputSnapshot({ pressed: ["ArrowUp"] }));
    scene.update.call(host.host, 0, 16);
    expect(scene.extend.apkCaptureResponsiveState().player.row).toBe(initial.player.row - 1);

    const saved = scene.extend.apkCaptureResponsiveState();
    scene.extend.apkRecompose({ profile: "compact" });
    input.setSnapshot(inputSnapshot({ pointer: { released: true, startX: 10, startY: 10, x: 60, y: 10 } }));
    scene.update.call(host.host, 0, 16);
    expect(scene.extend.apkCaptureResponsiveState().player.col).toBe(saved.player.col + 1);
    scene.extend.apkRestoreResponsiveState(saved);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(saved);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "STORM_CASTLE_TOWER_READY" }));

    host.emit("shutdown");
    host.emit("destroy");
    scene.update.call(host.host, 0, 16);
    expect(scene.extend.apkCaptureResponsiveState().destroyed).toBe(true);
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(host.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect(complete).not.toHaveBeenCalled();
  });

  it("rejects invalid setup, movement, hazard, and timing values", () => {
    expect(() => createStormCastleTowerController([], vi.fn())).toThrow();
    expect(() => createStormCastleTowerController(SENTENCES, vi.fn(), { seed: Number.NaN })).toThrow(/seed/u);
    expect(() => createStormCastleTowerController(SENTENCES, vi.fn(), { initialLives: 0 })).toThrow(/lives/u);
    expect(() => createStormCastleTowerController(SENTENCES, vi.fn(), { lives: 0 })).toThrow(/lives/u);
    expect(() => createStormCastleTowerController(SENTENCES, vi.fn(), { hazardIntervalMs: 0 })).toThrow(/interval/u);

    const controller = createStormCastleTowerController(SENTENCES, vi.fn(), { lives: 2 });
    expect(controller.snapshot().maxLives).toBe(2);
    expect(() => controller.moveTo({ col: 1.5, row: 1 })).toThrow(/integer/u);
    expect(controller.choose("unknown-action" as never)).toMatchObject({ accepted: false, terminal: false });
    expect(controller.collect("missing-window")).toMatchObject({ accepted: false, correct: false });
    expect(() => controller.tick(-1)).toThrow(/delta/u);
    expect(() => controller.tick(Number.NaN)).toThrow(/delta/u);
    expect(() => controller.spawnHazard("lava" as never)).toThrow(/type/u);
    expect(() => controller.spawnHazard("oil", -1)).toThrow(/column/u);
    expect(() => controller.spawnHazard("oil", 4)).toThrow(/column/u);
    expect(() => controller.applyHazard("lava" as never)).toThrow(/type/u);
  });

  it("maps quiet, diagonal, and bounded pointer directions", () => {
    expect(getStormCastleTowerDirectionFromPointer(Number.NaN, 0)).toBeUndefined();
    expect(getStormCastleTowerDirectionFromPointer(0, 0)).toBeUndefined();
    expect(getStormCastleTowerDirectionFromPointer(40, 40)).toBe("right");
    expect(chooseStormCastleTowerDirectionFromPointer(850, 438, 960, 540)).toBeUndefined();
    expect(chooseStormCastleTowerDirectionFromPointer(700, 438, 960, 540)).toBeUndefined();
    expect(chooseStormCastleTowerDirectionFromPointer(850, 500, 960, 540)).toBe("move-down");
    expect(chooseStormCastleTowerDirectionFromPointer(910, 438, 960, 540)).toBe("move-right");
  });

  it("removes hazards that pass the tower and rejects incompatible responsive state", () => {
    const controller = createStormCastleTowerController(SENTENCES, vi.fn(), {
      seed: 23,
      hazardIntervalMs: 1_000_000,
    });
    const otherColumn = (controller.snapshot().player.col + 1) % 4;
    controller.spawnHazard("rock", otherColumn);
    controller.tick(10_000);
    expect(controller.snapshot().hazards).toEqual([]);
    expect(controller.snapshot().lives).toBe(3);

    const captured = controller.capture();
    const invalidStates: StormCastleTowerTestSnapshot[] = [
      null as never,
      { ...captured, seed: captured.seed + 1 },
      { ...captured, targetCount: captured.targetCount + 1 },
      { ...captured, maxLives: captured.maxLives + 1 },
      { ...captured, maxHeight: captured.maxHeight + 1 },
      { ...captured, phase: "unknown" as never },
      { ...captured, targetIndex: -1 },
      { ...captured, prompt: "altered" },
      { ...captured, availableActions: ["confirm"] },
      { ...captured, windows: [] },
      { ...captured, windows: captured.windows.map((window, index) => index === 0 ? { ...window, id: "other" } : window) },
      { ...captured, windows: captured.windows.map((window, index) => index === captured.targetIndex ? { ...window, state: "closed" as const } : window) },
      { ...captured, player: { ...captured.player, col: 99 } },
      { ...captured, correctAction: "confirm" },
      { ...captured, lives: -1, energy: -1 },
      { ...captured, correctAnswers: 1 },
      { ...captured, elapsedMs: -1 },
      { ...captured, hazards: [{ id: "hazard:999", type: "oil", column: 0, y: 0, speed: 2.4 }] },
      { ...captured, result: {} as never },
    ];

    for (const state of invalidStates) expect(() => controller.restore(state)).toThrow();
  });

  it("restores terminal tower state and seals later production delivery", () => {
    const controller = createStormCastleTowerController(ONE_WORD_SENTENCE, vi.fn());
    const target = controller.snapshot().windows[0];
    if (!target) throw new Error("Expected one tower target");
    moveToWindow(controller, target.id);
    controller.collect(target.id);
    const terminal = controller.capture();

    const restored = createStormCastleTowerController(ONE_WORD_SENTENCE, vi.fn());
    restored.restore(terminal);
    expect(restored.snapshot()).toEqual(terminal);
    expect(restored.choose("confirm")).toMatchObject({ terminal: true, completed: true });
  });

  it("runs the tutorial action driver through an incorrect nearby window", () => {
    const complete = vi.fn();
    const cartridge = createStormCastleTowerCartridge();
    const config = cartridge.createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: createMutableInputController(),
      seed: 7,
      sessionMode: "tutorial",
    });
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const wrongStep = tutorial.steps[0];
    if (!wrongStep) throw new Error("Expected an incorrect tower tutorial step");

    driver.execute({
      tutorial,
      step: wrongStep,
      seed: tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });

    expect((config.scene as { extend: { apkCaptureResponsiveState(): StormCastleTowerTestSnapshot } })
      .extend.apkCaptureResponsiveState()).toMatchObject({ totalAttempts: 1, lastOutcome: "incorrect" });
    expect(complete).not.toHaveBeenCalled();
  });
});
