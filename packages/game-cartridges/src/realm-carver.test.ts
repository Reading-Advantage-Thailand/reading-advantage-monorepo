import type { APKInputController, CartridgeGameConfigContext } from "@reading-advantage/advantage-play-kit";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  REALM_CARVER_GRID_SIZE,
  REALM_CARVER_KEYBOARD_BINDINGS,
  REALM_CARVER_AVAILABLE_ACTIONS,
  createRealmCarverCartridge,
  createRealmCarverController,
  realmCarverDirectionFromPointer,
  type RealmCarverController,
  type RealmCarverDirection,
} from "./realm-carver.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const SENTENCES = [
  { term: "alpha beta", translation: "first sentence" },
] as const;

function move(
  controller: RealmCarverController,
  direction: RealmCarverDirection,
  count = 1,
): void {
  for (let index = 0; index < count; index += 1) controller.move(direction);
}

function closeWholeInterior(controller: RealmCarverController): void {
  const captured = controller.capture();
  controller.restore({
    ...captured,
    monsters: captured.monsters.map((monster, index) => ({
      ...monster,
      x: REALM_CARVER_GRID_SIZE - 2,
      y: index + 2,
    })),
  });
  move(controller, "down");
  move(controller, "right", REALM_CARVER_GRID_SIZE - 3);
  move(controller, "down", REALM_CARVER_GRID_SIZE - 3);
  move(controller, "left", REALM_CARVER_GRID_SIZE - 2);
  controller.confirm();
}

function closeCurrentTarget(controller: RealmCarverController): void {
  const captured = controller.capture();
  controller.restore({
    ...captured,
    monsters: captured.monsters.map((monster, index) => ({
      ...monster,
      x: REALM_CARVER_GRID_SIZE - 2,
      y: index + 2,
    })),
  });
  const state = controller.snapshot();
  const target = state.words.find((word) => word.order === state.targetIndex && word.status === "active");
  if (!target) throw new Error("Expected an active Realm Carver target");

  move(controller, "left", state.player.x);
  move(controller, "up", state.player.y);
  const left = Math.max(1, target.x - 1);
  const right = Math.min(REALM_CARVER_GRID_SIZE - 2, target.x + 1);
  const top = Math.max(1, target.y - 1);
  const bottom = Math.min(REALM_CARVER_GRID_SIZE - 2, target.y + 1);
  move(controller, "right", left);
  move(controller, "down", bottom);
  move(controller, "right", right - left);
  move(controller, "up", bottom - top);
  move(controller, "right", REALM_CARVER_GRID_SIZE - 1 - right);
  controller.confirm();
}

function closeSecondWordOnly(controller: RealmCarverController): void {
  move(controller, "right", 6);
  move(controller, "down", 4);
  move(controller, "right", 4);
  move(controller, "up", 3);
  move(controller, "right");
  controller.confirm();
}

function inputSnapshot(overrides: Partial<{
  keys: readonly string[];
  pressed: readonly string[];
  pointer: Partial<{
    released: boolean;
    cancelled: boolean;
    x: number;
    y: number;
  }>;
}> = {}) {
  return {
    keys: overrides.keys ?? [],
    pressed: overrides.pressed ?? [],
    pointer: {
      down: false,
      released: overrides.pointer?.released ?? false,
      cancelled: overrides.pointer?.cancelled ?? false,
      id: null,
      kind: null,
      startX: 0,
      startY: 0,
      x: overrides.pointer?.x ?? 0,
      y: overrides.pointer?.y ?? 0,
    },
    destroyed: false,
  };
}

function createSceneHost() {
  const listeners = new Map<string, () => void>();
  const texts: Array<{
    setPosition: ReturnType<typeof vi.fn>;
    setText: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
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
  const host = {
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
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, width: 960 }) } },
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

function createContext(
  inputController: APKInputController,
  sessionMode: "playing" | "tutorial" | "demo" = "playing",
): CartridgeGameConfigContext {
  return {
    input: [...SENTENCES],
    edition: PHASE3_RUNTIME_EDITION,
    complete: vi.fn(),
    diagnostic: vi.fn(),
    inputController,
    seed: 11,
    sessionMode,
  };
}

describe("Realm Carver bespoke territory cartridge", () => {
  it("exposes sentence metadata and a bounded claimed-cell grid", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());
    const snapshot = controller.snapshot();

    expect(createRealmCarverCartridge().manifest).toMatchObject({
      id: "realm-carver",
      title: "Realm Carver",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
    });
    expect(snapshot).toMatchObject({
      phase: "playing",
      gridSize: REALM_CARVER_GRID_SIZE,
      targetIndex: 0,
      targetCount: 2,
      hp: 3,
      maxHp: 3,
      lives: 3,
      energy: 3,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      destroyed: false,
    });
    expect(snapshot.grid).toHaveLength(REALM_CARVER_GRID_SIZE);
    expect(snapshot.grid[0]?.every((cell) => cell === "claimed")).toBe(true);
    expect(snapshot.availableActions).toEqual([
      "move-left",
      "move-up",
      "move-down",
      "move-right",
      "confirm",
    ]);
    expect(snapshot.correctAction).toBe("confirm");
    expect(snapshot.availableActions).toEqual(REALM_CARVER_AVAILABLE_ACTIONS);
    expect(REALM_CARVER_KEYBOARD_BINDINGS).toMatchObject({ Enter: "confirm", Space: "confirm" });
  });

  it("moves in all four directions and creates a trail only after leaving claimed territory", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());

    move(controller, "right", 2);
    expect(controller.snapshot().player).toEqual({ x: 2, y: 0, hp: 3, maxHp: 3 });
    expect(controller.snapshot().trail).toEqual([]);

    move(controller, "down");
    expect(controller.snapshot().player).toMatchObject({ x: 2, y: 1 });
    expect(controller.snapshot().trail).toEqual([{ x: 2, y: 1 }]);

    move(controller, "left");
    expect(controller.snapshot().player).toMatchObject({ x: 1, y: 1 });
    move(controller, "up");
    expect(controller.snapshot().player).toMatchObject({ x: 1, y: 0 });
    expect(controller.snapshot().trail.length).toBeGreaterThan(0);
    controller.confirm();
    expect(controller.snapshot().trail).toEqual([]);
  });

  it("confirms a trail on claimed territory and captures only the current enclosed word", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());

    closeWholeInterior(controller);

    const snapshot = controller.snapshot();
    expect(snapshot.trail).toEqual([]);
    expect(snapshot.claimedCells).toBeGreaterThan(REALM_CARVER_GRID_SIZE * 4 - 4);
    expect(snapshot.capturedWordIds).toEqual(["word:0:0"]);
    expect(snapshot.targetIndex).toBe(1);
    expect(snapshot.phase).toBe("playing");
    expect(snapshot.words[1]).toMatchObject({ status: "active" });
    expect(snapshot.grid[snapshot.words[1]!.y]?.[snapshot.words[1]!.x]).toBe("wild");
  });

  it("claims every safe enclosed component without auto-counting future words", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());
    const captured = controller.capture();
    const grid: Array<Array<"wild" | "claimed" | "trail">> = Array.from(
      { length: REALM_CARVER_GRID_SIZE },
      (_, y) => Array.from(
        { length: REALM_CARVER_GRID_SIZE },
        (_, x) => x === 0 || y === 0 || x === REALM_CARVER_GRID_SIZE - 1 || y === REALM_CARVER_GRID_SIZE - 1
          ? "claimed"
          : "wild",
      ),
    );
    const trail = [4, 7].flatMap((x) => Array.from(
      { length: REALM_CARVER_GRID_SIZE - 2 },
      (_, index) => ({ x, y: index + 1 }),
    ));
    for (const point of trail) grid[point.y]![point.x] = "trail";
    controller.restore({
      ...captured,
      grid,
      trail,
      monsters: captured.monsters.map((monster, index) => ({
        ...monster,
        x: 5 + index,
        y: 5,
      })),
    });

    expect(controller.snapshot().grid[3]?.[3]).toBe("wild");
    expect(controller.snapshot().grid[3]?.[8]).toBe("wild");

    controller.move("right");
    const result = controller.confirm();
    expect(result.snapshot.grid[3]?.[3]).toBe("claimed");
    expect(result.snapshot.grid[3]?.[8]).toBe("claimed");
    expect(result.snapshot.grid[5]?.[5]).toBe("wild");
    expect(result.snapshot.capturedWordIds).toEqual(["word:0:0"]);
    expect(result.snapshot).toMatchObject({
      phase: "playing",
      claimedCells: 124,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });
    const futureWord = result.snapshot.words[1]!;
    expect(futureWord.status).toBe("active");
    expect(result.snapshot.grid[futureWord.y]?.[futureWord.x]).toBe("wild");
  });

  it("adds exactly one correct answer and 100 score per confirmation", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());

    closeWholeInterior(controller);

    expect(controller.snapshot()).toMatchObject({
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
      targetIndex: 1,
      phase: "playing",
    });
  });

  it("eventually completes after one confirmation for each ordered word", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());

    closeWholeInterior(controller);
    closeCurrentTarget(controller);

    expect(controller.snapshot()).toMatchObject({
      phase: "victory",
      targetIndex: 2,
      score: 200,
      correctAnswers: 2,
      totalAttempts: 2,
    });
  });

  it("uses the seed for deterministic setup and bounds direct simulation ticks", () => {
    const first = createRealmCarverController(SENTENCES, vi.fn(), { seed: 7 });
    const second = createRealmCarverController(SENTENCES, vi.fn(), { seed: 7 });
    const different = createRealmCarverController(SENTENCES, vi.fn(), { seed: 7_007 });

    expect(first.snapshot()).toEqual(second.snapshot());
    expect(first.snapshot().words).not.toEqual(different.snapshot().words);
    expect(first.tick(5_000).snapshot.gameTime).toBe(50);
    expect(() => first.tick(-1)).toThrow();
  });

  it("keeps movement parity between direct and semantic input actions", () => {
    const direct = createRealmCarverController(SENTENCES, vi.fn(), { seed: 7 });
    const semantic = createRealmCarverController(SENTENCES, vi.fn(), { seed: 7 });

    expect(direct.move("right").snapshot).toEqual(semantic.choose("move-right").snapshot);
  });

  it("does not capture on movement and requires semantic confirmation", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());
    const captured = controller.capture();
    controller.restore({
      ...captured,
      monsters: captured.monsters.map((monster, index) => ({
        ...monster,
        x: REALM_CARVER_GRID_SIZE - 2,
        y: index + 2,
      })),
    });

    move(controller, "down");
    move(controller, "right", REALM_CARVER_GRID_SIZE - 3);
    move(controller, "down", REALM_CARVER_GRID_SIZE - 3);
    move(controller, "left", REALM_CARVER_GRID_SIZE - 2);
    const returnedToClaimed = controller.snapshot();

    expect(returnedToClaimed).toMatchObject({ lastEvent: "moved", targetIndex: 0 });
    expect(returnedToClaimed.trail.length).toBeGreaterThan(0);
    expect(controller.choose("confirm").snapshot.targetIndex).toBe(1);
  });

  it("rejects confirmation without a valid drawn loop", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());
    const before = controller.snapshot();

    expect(controller.confirm()).toMatchObject({ accepted: false, terminal: false, completed: false });
    expect(controller.snapshot()).toEqual(before);
  });

  it("damages, penalizes, and relocates a word captured out of order", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());
    const originalPosition = controller.snapshot().words[1]!.position;

    closeSecondWordOnly(controller);

    const snapshot = controller.snapshot();
    expect(snapshot).toMatchObject({
      targetIndex: 0,
      hp: 2,
      score: 0,
      totalAttempts: 1,
      lastOutcome: "incorrect",
    });
    expect(snapshot.words[1]).toMatchObject({ status: "active", relocations: 1 });
    expect(snapshot.words[1]?.position).not.toEqual(originalPosition);
  });

  it("loses HP and resets the trail when the player crosses it", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());

    move(controller, "right");
    move(controller, "down");
    move(controller, "right");
    const result = controller.move("left");

    expect(result.event).toBe("player-trail-collision");
    expect(result.snapshot).toMatchObject({ hp: 2, trail: [] });
    expect(result.snapshot.player).toMatchObject({ x: 0, y: 0 });
  });

  it("loses HP and resets the trail when a monster reaches it", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());

    move(controller, "right");
    move(controller, "down");
    const result = controller.applyHazard();

    expect(result.event).toBe("monster-trail-collision");
    expect(result.snapshot).toMatchObject({ hp: 2, trail: [] });
  });

  it("emits one exact completion result after all ordered words", () => {
    const deliver = vi.fn();
    const controller = createRealmCarverController(SENTENCES, deliver);

    closeWholeInterior(controller);
    closeCurrentTarget(controller);
    const result = controller.move("right");
    const delivered = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);

    expect(result.accepted).toBe(false);
    expect(deliver).toHaveBeenCalledOnce();
    expect(delivered).toEqual({
      accuracy: 1,
      xp: 50,
      score: 200,
      correctAnswers: 2,
      totalAttempts: 2,
    });
    expect(result.snapshot.result).toEqual(delivered);
    expect(controller.move("right")).toMatchObject({
      accepted: false,
      terminal: true,
      completed: true,
      result: delivered,
    });
  });

  it("emits defeat at zero HP and rejects later input", () => {
    const deliver = vi.fn();
    const controller = createRealmCarverController(SENTENCES, deliver);

    for (let index = 0; index < 3; index += 1) controller.applyHazard();

    expect(controller.snapshot()).toMatchObject({ phase: "defeat", hp: 0 });
    expect(deliver).toHaveBeenCalledOnce();
    expect(controller.move("up")).toMatchObject({
      accepted: false,
      terminal: true,
      completed: true,
    });
  });

  it("rejects restored word content and progression mutations", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());
    const captured = controller.capture();

    expect(() => controller.restore({
      ...captured,
      words: captured.words.map((word, index) => index === 0 ? { ...word, term: "altered" } : word),
    })).toThrow(/words|status/u);
    expect(() => controller.restore({
      ...captured,
      words: captured.words.map((word, index) => index === 0 ? { ...word, translation: "altered" } : word),
    })).toThrow(/words/u);
    expect(() => controller.restore({
      ...captured,
      words: captured.words.map((word, index) => index === 0 ? { ...word, order: 1 } : word),
    })).toThrow(/words/u);
    expect(() => controller.restore({
      ...captured,
      words: captured.words.map((word, index) => index === 0 ? { ...word, status: "captured" } : word),
    })).toThrow(/words|status/u);
  });

  it("keeps a wrong-capture target on wild territory when wild cells are exhausted", () => {
    const input = [{ term: "alpha beta gamma", translation: "first sentence" }] as const;
    const controller = createRealmCarverController(input, vi.fn());
    const captured = controller.capture();
    const grid: Array<Array<"wild" | "claimed" | "trail">> = Array.from(
      { length: REALM_CARVER_GRID_SIZE },
      (_, y) => Array.from(
        { length: REALM_CARVER_GRID_SIZE },
        (_, x) => x === 1 && y === 1 ? "trail" : "claimed",
      ),
    );
    grid[1]![2] = "wild";
    grid[1]![4] = "wild";
    const words = captured.words.map((word, index) => ({
      ...word,
      status: index === 0 ? "captured" as const : "active" as const,
      position: { x: index === 0 ? 1 : index === 1 ? 2 : 4, y: index === 0 ? 2 : 1 },
      x: index === 0 ? 1 : index === 1 ? 2 : 4,
      y: index === 0 ? 2 : 1,
    }));

    controller.restore({
      ...captured,
      grid,
      trail: [{ x: 1, y: 1 }],
      player: { ...captured.player, x: 1, y: 1 },
      words,
      claimedCells: grid.flat().filter((cell) => cell === "claimed").length,
      capturedWordIds: ["word:0:0"],
      targetIndex: 1,
      prompt: "first sentence",
      answer: "beta",
      correctAnswers: 1,
      totalAttempts: 1,
      score: 100,
      monsters: captured.monsters.map((monster, index) => ({ ...monster, x: index === 0 ? 2 : 1, y: index === 0 ? 1 : 0 })),
    });

    controller.move("left");
    const result = controller.confirm();

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, outcome: "incorrect" });
    expect(result.snapshot).toMatchObject({ targetIndex: 1, hp: 2, score: 50, totalAttempts: 2 });
    expect(result.snapshot.words[2]).toMatchObject({ status: "active", relocations: 1 });
    const activeWord = result.snapshot.words[2]!;
    expect(result.snapshot.grid[activeWord.y]?.[activeWord.x]).toBe("wild");
  });

  it("enforces every ordered word across multiple sentences", () => {
    const sentences = [
      { term: "alpha beta", translation: "first sentence" },
      { term: "gamma delta epsilon", translation: "second sentence" },
    ] as const;
    const controller = createRealmCarverController(sentences, vi.fn());

    expect(controller.snapshot().words).toMatchObject([
      { id: "word:0:0", term: "alpha", translation: "first sentence", order: 0 },
      { id: "word:0:1", term: "beta", translation: "first sentence", order: 1 },
      { id: "word:1:0", term: "gamma", translation: "second sentence", order: 2 },
      { id: "word:1:1", term: "delta", translation: "second sentence", order: 3 },
      { id: "word:1:2", term: "epsilon", translation: "second sentence", order: 4 },
    ]);

    closeWholeInterior(controller);
    while (controller.snapshot().phase === "playing") closeCurrentTarget(controller);

    expect(controller.snapshot()).toMatchObject({
      phase: "victory",
      targetIndex: 5,
      targetCount: 5,
      score: 500,
      correctAnswers: 5,
      totalAttempts: 5,
    });
  });

  it("preserves the complete responsive state and rejects malformed state", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());
    move(controller, "right");
    move(controller, "down");
    const captured = controller.capture();

    move(controller, "right", 2);
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);
    expect(() => controller.restore({ ...captured, gridSize: 1 })).toThrow();
  });

  it("maps a pointer or touch D-pad to all four movement directions", () => {
    expect(realmCarverDirectionFromPointer(100, 327, 960, 540)).toBe("up");
    expect(realmCarverDirectionFromPointer(55, 410, 960, 540)).toBe("left");
    expect(realmCarverDirectionFromPointer(145, 410, 960, 540)).toBe("right");
    expect(realmCarverDirectionFromPointer(100, 493, 960, 540)).toBe("down");
    expect(realmCarverDirectionFromPointer(700, 300, 960, 540)).toBeUndefined();
  });

  it("processes keyboard and pointer scene input, responsive recomposition, and cleanup", () => {
    let currentInput = inputSnapshot();
    const inputController = {
      snapshot: vi.fn(() => currentInput),
      cancelActiveGesture: vi.fn(),
      destroy: vi.fn(),
    };
    const context = createContext(inputController);
    const config = createRealmCarverCartridge().createGameConfig(context);
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: {
        apkCaptureResponsiveState: () => ReturnType<RealmCarverController["snapshot"]>;
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const host = createSceneHost();

    scene.create.call(host.host);
    currentInput = inputSnapshot({ pressed: ["ArrowRight"] });
    scene.update.call(host.host, 0, 16);
    const captured = scene.extend.apkCaptureResponsiveState();
    expect(captured.player).toMatchObject({ x: 1, y: 0 });

    const preparedGrid = captured.grid.map((row, y) => row.map((cell, x) => y === 1 && x === 1 ? "trail" as const : cell));
    scene.extend.apkRestoreResponsiveState({
      ...captured,
      grid: preparedGrid,
      trail: [{ x: 1, y: 1 }],
      player: { ...captured.player, x: 1, y: 0 },
      claimedCells: preparedGrid.flat().filter((cell) => cell === "claimed").length,
    });
    currentInput = inputSnapshot({ keys: ["Enter"], pressed: ["Enter"] });
    scene.update.call(host.host, 0, 16);
    expect(scene.extend.apkCaptureResponsiveState().trail).toEqual([]);

    currentInput = inputSnapshot({ pointer: { released: true, x: 100, y: 327 } });
    scene.update.call(host.host, 16, 16);
    expect(scene.extend.apkCaptureResponsiveState().player).toMatchObject({ x: 1, y: 0 });

    scene.extend.apkRestoreResponsiveState(captured);
    scene.extend.apkRecompose({ profile: "compact" });
    host.emit("shutdown");
    host.emit("destroy");

    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ destroyed: true });
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(host.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect(inputController.cancelActiveGesture).toHaveBeenCalledOnce();
    expect(context.complete).not.toHaveBeenCalled();
  });

  it.each(["tutorial", "demo"] as const)("does not deliver results during %s sessions", (sessionMode) => {
    const complete = vi.fn();
    const cartridge = createRealmCarverCartridge();
    cartridge.createGameConfig({
      ...createContext({
        snapshot: vi.fn(() => inputSnapshot()),
        cancelActiveGesture: vi.fn(),
        destroy: vi.fn(),
      }, sessionMode),
      complete,
    });

    const driver = cartridge.standardExperience.createTutorialActionDriver();
    for (const step of cartridge.standardExperience.definition.tutorial.steps) {
      void driver.execute({
        tutorial: cartridge.standardExperience.definition.tutorial,
        step,
        seed: cartridge.standardExperience.definition.tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: vi.fn() },
      });
    }

    expect(complete).not.toHaveBeenCalled();
  });

  it.each(["tutorial", "demo"] as const)("runs real incorrect and correct %s loops with learning consequences", (sessionMode) => {
    const complete = vi.fn();
    const cartridge = createRealmCarverCartridge();
    const config = cartridge.createGameConfig({
      ...createContext({
        snapshot: vi.fn(() => inputSnapshot()),
        cancelActiveGesture: vi.fn(),
        destroy: vi.fn(),
      }, sessionMode),
      complete,
    });
    const definition = cartridge.standardExperience.definition;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const state = () => (config.scene as {
      extend: { apkCaptureResponsiveState: () => ReturnType<RealmCarverController["snapshot"]> };
    }).extend.apkCaptureResponsiveState();

    driver.execute({
      tutorial: definition.tutorial,
      step: definition.tutorial.steps[0]!,
      seed: definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });
    expect(state()).toMatchObject({ totalAttempts: 1, correctAnswers: 0, targetIndex: 0, hp: 2, lastOutcome: "incorrect" });

    driver.execute({
      tutorial: definition.tutorial,
      step: definition.tutorial.steps[1]!,
      seed: definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });
    expect(state()).toMatchObject({ totalAttempts: 2, correctAnswers: 1, targetIndex: 1, hp: 2, lastOutcome: "correct" });
    expect(complete).not.toHaveBeenCalled();
  });

  it("rejects invalid setup and unsupported semantic actions", () => {
    expect(() => createRealmCarverController([], vi.fn())).toThrow();
    expect(() => createRealmCarverController(SENTENCES, vi.fn(), { seed: Number.NaN })).toThrow(/seed/u);
    expect(() => createRealmCarverController(SENTENCES, vi.fn(), { rng: () => Number.POSITIVE_INFINITY })).toThrow(/seed/u);
    expect(() => createRealmCarverController(
      [{ term: Array.from({ length: 101 }, (_, index) => `word${index}`).join(" "), translation: "many" }],
      vi.fn(),
    )).toThrow(/100/u);

    const controller = createRealmCarverController(SENTENCES, vi.fn());
    expect(controller.move("left")).toMatchObject({ accepted: false, event: "blocked" });
    expect(controller.choose("unknown-action" as never)).toMatchObject({ accepted: false, terminal: false });
    expect(() => controller.tick(-1)).toThrow(/tick/u);
  });

  it("moves monsters through a trail and reverses them at claimed boundaries", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());
    const captured = controller.capture();
    const grid: Array<Array<"wild" | "claimed" | "trail">> = captured.grid.map((row) => [...row]);
    grid[1]![1] = "trail";
    const restored = {
      ...captured,
      grid,
      trail: [{ x: 1, y: 1 }],
      player: { ...captured.player, x: 1, y: 0 },
      claimedCells: grid.flat().filter((cell) => cell === "claimed").length,
      monsters: captured.monsters.map((monster, index) => index === 0
        ? { ...monster, x: 2, y: 1, dx: -1 as const, dy: 0 as const }
        : { ...monster, x: 5, y: 5, dx: 1 as const, dy: 0 as const }),
    };
    controller.restore(restored);
    let collision = controller.tick(200);
    for (let index = 0; index < 3 && collision.event !== "monster-trail-collision"; index += 1) {
      collision = controller.tick(200);
    }
    expect(collision).toMatchObject({ event: "monster-trail-collision", snapshot: { hp: 2, trail: [] } });

    const reversal = createRealmCarverController(SENTENCES, vi.fn());
    const state = reversal.capture();
    reversal.restore({
      ...state,
      monsters: state.monsters.map((monster, index) => index === 0
        ? { ...monster, x: 1, y: 1, dx: -1 as const, dy: 0 as const }
        : monster),
    });
    let reversed = reversal.tick(200);
    for (let index = 0; index < 3; index += 1) reversed = reversal.tick(200);
    expect(reversed.snapshot.monsters[0]?.dx).toBe(1);
  });

  it("rejects incompatible responsive state fields", () => {
    const controller = createRealmCarverController(SENTENCES, vi.fn());
    const captured = controller.capture();
    const invalidStates = [
      null as never,
      { ...captured, seed: captured.seed + 1 },
      { ...captured, gridSize: 1 },
      { ...captured, grid: captured.grid.map((row, index) => index === 0 ? ["wild"] : row) },
      { ...captured, phase: "unknown" as never },
      { ...captured, status: "victory" as never },
      { ...captured, targetIndex: -1 },
      { ...captured, player: { ...captured.player, x: 99 } },
      { ...captured, hp: 2 },
      { ...captured, claimedCells: captured.claimedCells + 1 },
      { ...captured, trail: [{ x: 1, y: 1 }] },
      { ...captured, words: captured.words.map((word, index) => index === 0 ? { ...word, term: "altered" } : word) },
      { ...captured, words: captured.words.map((word, index) => index === 0 ? { ...word, position: { x: 99, y: 99 }, x: 99, y: 99 } : word) },
      { ...captured, capturedWordIds: ["word:0:1"] },
      { ...captured, monsters: [] },
      { ...captured, monsters: captured.monsters.map((monster, index) => index === 0 ? { ...monster, dx: 0, dy: 0 } : monster) },
      { ...captured, availableActions: ["confirm"] },
      { ...captured, prompt: "altered" },
      { ...captured, lastOutcome: "hazard" as never },
      { ...captured, lastEvent: "unknown" as never },
      { ...captured, correctAnswers: 1 },
      { ...captured, gameTime: -1 },
      { ...captured, result: {} as never },
    ];

    for (const state of invalidStates) {
      expect(() => controller.restore(state as Parameters<typeof controller.restore>[0])).toThrow();
    }
  });

  it("seals controller input after destruction and supports pointer aliases", () => {
    expect(realmCarverDirectionFromPointer(700, 300, 960, 540)).toBeUndefined();
    expect(realmCarverDirectionFromPointer(100, 327, 960, 540)).toBe("up");

    const controller = createRealmCarverController(SENTENCES, vi.fn());
    controller.destroy();
    controller.destroy();
    expect(controller.move("right")).toMatchObject({ accepted: false, terminal: false });
    expect(controller.confirm()).toMatchObject({ accepted: false, terminal: false });
    expect(controller.applyHazard()).toMatchObject({ accepted: false, terminal: false });
    expect(controller.tick(16)).toMatchObject({ accepted: false, terminal: false });
  });
});
