import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";
import {
  chooseHauntedLibraryActionFromPointer,
  createHauntedLibraryCartridge,
  createHauntedLibraryController,
  findNearestHauntedLibraryDoor,
  GAME_WIDTH,
  getHauntedLibraryDpadLayout,
  GRAVITY,
  HAUNTED_LIBRARY_KEYBOARD_BINDINGS,
  INITIAL_LIVES,
  JUMP_FORCE,
  PLAYER_HEIGHT,
  TRAMPOLINE_FORCE,
  type HauntedLibraryAction,
} from "./haunted-library.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SENTENCES = [
  { term: "Lanterns reveal hidden doors", translation: "A library clue" },
  { term: "Quiet stairs lead onward", translation: "A library path" },
];

function placeAtDoor(
  controller: ReturnType<typeof createHauntedLibraryController>,
  doorIndex: number,
  invulnerableMs?: number,
): void {
  const state = controller.snapshot();
  const door = state.doors[doorIndex];
  if (!door) throw new Error(`Door ${doorIndex} does not exist`);
  controller.restore({
    ...state,
    player: {
      ...state.player,
      x: door.x,
      y: state.floors[door.floor]!.y - PLAYER_HEIGHT,
      floor: door.floor,
      velocityX: 0,
      velocityY: 0,
      state: "idle",
      onFloor: true,
    },
    ...(invulnerableMs === undefined ? {} : { invulnerableMs }),
  });
}

function placeAtDoorState(
  controller: ReturnType<typeof createHauntedLibraryController>,
  doorIndex: number,
): void {
  const state = controller.snapshot();
  const door = state.doors[doorIndex];
  if (!door) throw new Error(`Door ${doorIndex} does not exist`);
  controller.restore({
    ...state,
    player: {
      ...state.player,
      x: door.x,
      y: state.floors[door.floor]!.y - PLAYER_HEIGHT,
      floor: door.floor,
      velocityX: 0,
      velocityY: 0,
      state: "idle",
      onFloor: true,
    },
  });
}

function dpadCenter(action: HauntedLibraryAction, width = 390, height = 844): { readonly x: number; readonly y: number } {
  const button = getHauntedLibraryDpadLayout(width, height).find((entry) => entry.action === action);
  if (!button) throw new Error(`D-pad ${action} is missing`);
  return { x: button.x + button.width / 2, y: button.y + button.height / 2 };
}

function complete(controller: ReturnType<typeof createHauntedLibraryController>): void {
  for (let attempt = 0; attempt < 32 && controller.snapshot().phase === "playing"; attempt += 1) {
    const state = controller.snapshot();
    const door = state.doors.find((candidate) => candidate.wordIndex === state.wordIndex);
    if (!door) throw new Error("The next word door is missing");
    placeAtDoorState(controller, state.doors.indexOf(door));
    controller.interact();
  }
  expect(controller.snapshot().phase).toBe("victory");
}

function createInputController() {
  let snapshot = {
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
    set(next: Partial<typeof snapshot>) {
      snapshot = { ...snapshot, ...next };
    },
    snapshot: () => snapshot,
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
  };
}

function createSceneSurface() {
  const listeners = new Map<string, () => void>();
  const makeText = () => ({
    setPosition: vi.fn(function (this: unknown) { return this; }),
    setText: vi.fn(function (this: unknown) { return this; }),
    destroy: vi.fn(),
  });
  const graphics = {
    clear: vi.fn(function () { return graphics; }),
    fillStyle: vi.fn(function () { return graphics; }),
    fillRect: vi.fn(function () { return graphics; }),
    fillCircle: vi.fn(function () { return graphics; }),
    fillRoundedRect: vi.fn(function () { return graphics; }),
    lineStyle: vi.fn(function () { return graphics; }),
    strokeRoundedRect: vi.fn(function () { return graphics; }),
    destroy: vi.fn(),
  };
  const surface = {
    add: {
      graphics: vi.fn(() => graphics),
      text: vi.fn(() => makeText()),
    },
    events: {
      once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
    },
    scale: { width: 390, height: 844 },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 390, height: 844 }) } },
    fire(event: string) {
      listeners.get(event)?.();
    },
  };
  return { surface, graphics };
}

describe("The Haunted Library bespoke cartridge", () => {
  it("exposes a sentence manifest without the shared legacy catalog factory", () => {
    expect(createHauntedLibraryCartridge().manifest).toMatchObject({
      id: "haunted-library",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      capabilities: expect.arrayContaining([
        "capability:gravity-jump-traversal",
        "capability:edge-trampoline-floor-traversal",
        "capability:host-seeded-placements",
        "capability:ordered-word-doors",
      ]),
    });
    const source = readFileSync(resolve(REPO_ROOT, "packages/game-cartridges/src/haunted-library.ts"), "utf8");
    expect(source).not.toContain("createLegacyCatalog");
    expect(source).not.toContain("legacy-catalog-core");
  });

  it("rejects empty content and keeps one finite ordered session active", () => {
    expect(() => createHauntedLibraryController([], vi.fn())).toThrow();
    const controller = createHauntedLibraryController(SENTENCES, vi.fn());
    expect(controller.snapshot()).toMatchObject({
      phase: "playing",
      sentenceIndex: 0,
      sentenceCount: 2,
      words: ["Lanterns", "reveal", "hidden", "doors"],
      wordIndex: 0,
      targetIndex: 0,
      targetCount: 8,
    });
    complete(controller);
    expect(controller.snapshot().targetIndex).toBe(controller.snapshot().targetCount);
  });

  it("uses gravity, jumping, and edge trampolines for floor traversal", () => {
    const controller = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 23 });
    const initial = controller.snapshot();
    const jumpX = [GAME_WIDTH / 2, 0, GAME_WIDTH].find((x) => !findNearestHauntedLibraryDoor({
      ...initial,
      player: { ...initial.player, x },
    }));
    if (jumpX === undefined) throw new Error("Expected a clear jump position");
    controller.restore({ ...initial, player: { ...initial.player, x: jumpX } });
    const jump = controller.move("up");
    expect(jump.accepted).toBe(true);
    expect(controller.snapshot().player.floor).toBe(0);
    expect(controller.snapshot().player.velocityY).toBe(JUMP_FORCE);
    controller.tick(100);
    expect(controller.snapshot().player.y).toBeLessThan(initial.player.y);
    expect(GRAVITY).toBeGreaterThan(0);

    controller.restore({
      ...controller.snapshot(),
      player: {
        ...controller.snapshot().player,
        x: 0,
        y: controller.snapshot().floors[0]!.y - PLAYER_HEIGHT,
        floor: 0,
        velocityX: 0,
        velocityY: 0,
        state: "idle",
        onFloor: true,
      },
    });
    controller.tick(16.67);
    expect(controller.snapshot().player.velocityY).toBe(TRAMPOLINE_FORCE);
    expect(controller.snapshot().player.state).toBe("jumping");
    controller.move("right", 80);
    for (let frame = 0; frame < 8; frame += 1) controller.tick(250);
    expect(controller.snapshot().player.floor).toBeGreaterThan(0);

    controller.restore({ ...controller.snapshot(), player: { ...controller.snapshot().player, x: 2 } });
    controller.move("left");
    expect(controller.snapshot().player.x).toBeGreaterThan(GAME_WIDTH - 56);
    controller.move("right");
    expect(controller.snapshot().player.x).toBeCloseTo(2);
  });

  it("opens the nearest active-floor door on Confirm and jumps on Up", () => {
    const controller = createHauntedLibraryController(
      [{ term: "one two three four five", translation: "A sequence" }],
      vi.fn(),
      { seed: 7 },
    );
    const state = controller.snapshot();
    const distantDoor = state.doors.find((door) => door.floor === 0 && door.wordIndex > 0);
    if (!distantDoor) throw new Error("Expected a second bottom-floor door");
    controller.restore({ ...state, player: {
      ...state.player,
      x: distantDoor.x,
      y: state.floors[distantDoor.floor]!.y - PLAYER_HEIGHT,
      floor: distantDoor.floor,
    } });
    expect(findNearestHauntedLibraryDoor(controller.snapshot())?.id).toBe(distantDoor.id);
    expect(controller.move("up")).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(controller.snapshot().player.onFloor).toBe(false);
    expect(controller.snapshot().player.velocityY).toBeLessThan(0);
    expect(controller.snapshot().doors.find((door) => door.id === distantDoor.id)?.isOpen).toBe(false);

    controller.restore({
      ...controller.snapshot(),
      player: {
        ...controller.snapshot().player,
        x: distantDoor.x,
        y: controller.snapshot().floors[distantDoor.floor]!.y - PLAYER_HEIGHT,
        floor: distantDoor.floor,
        velocityX: 0,
        velocityY: 0,
        state: "idle",
        onFloor: true,
      },
    });
    expect(controller.dispatch("confirm")).toMatchObject({ accepted: true, correct: false, progressed: false, outcome: "incorrect" });

    const firstDoor = controller.snapshot().doors[0]!;
    controller.restore({ ...controller.snapshot(), player: {
      ...controller.snapshot().player,
      x: firstDoor.x,
      y: controller.snapshot().floors[firstDoor.floor]!.y - PLAYER_HEIGHT,
      floor: firstDoor.floor,
      velocityX: 0,
      velocityY: 0,
      state: "idle",
      onFloor: true,
    } });
    expect(controller.dispatch("confirm")).toMatchObject({ accepted: true, correct: true, progressed: true });
  });

  it("lets the player descend a floor after climbing with a trampoline", () => {
    const controller = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 23 });
    controller.restore({
      ...controller.snapshot(),
      player: {
        ...controller.snapshot().player,
        x: 0,
        y: controller.snapshot().floors[0]!.y - PLAYER_HEIGHT,
        floor: 0,
        velocityX: 0,
        velocityY: 0,
        state: "idle",
        onFloor: true,
      },
    });
    controller.tick(16.67);
    controller.move("right", 80);
    for (let frame = 0; frame < 8; frame += 1) controller.tick(250);
    expect(controller.snapshot().player.floor).toBeGreaterThan(0);

    const highFloor = controller.snapshot().player.floor;
    controller.restore({
      ...controller.snapshot(),
      player: {
        ...controller.snapshot().player,
        x: GAME_WIDTH / 2,
        y: controller.snapshot().floors[highFloor]!.y - PLAYER_HEIGHT,
        floor: highFloor,
        velocityX: 0,
        velocityY: 0,
        state: "idle",
        onFloor: true,
      },
    });
    expect(controller.move("down")).toMatchObject({ accepted: true, outcome: "traversal" });
    expect(controller.snapshot().player.onFloor).toBe(false);
    for (let frame = 0; frame < 12; frame += 1) controller.tick(250);
    expect(controller.snapshot().player.floor).toBe(highFloor - 1);
    expect(controller.snapshot().player.onFloor).toBe(true);
  });

  it("scores a correct door and stuns nearby ghosts", () => {
    const controller = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 2 });
    placeAtDoor(controller, 0);
    const result = controller.interact();
    expect(result).toMatchObject({ accepted: true, correct: true, progressed: true, outcome: "correct" });
    expect(result.snapshot).toMatchObject({ score: 100, correctAnswers: 1, totalAttempts: 1, wordIndex: 1 });
    expect(result.snapshot.ghosts.some((ghost) => ghost.stunMs > 0)).toBe(true);
  });

  it("loses a life, spawns one deterministic bat, and retains the target after a wrong door", () => {
    const controller = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 2 });
    placeAtDoor(controller, 1, 0);
    const result = controller.interact();
    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, outcome: "incorrect" });
    expect(result.snapshot).toMatchObject({ lives: 2, energy: 2, targetIndex: 0, wordIndex: 0, totalAttempts: 1 });
    expect(result.snapshot.bats).toHaveLength(1);
    expect(result.snapshot.doors[1]).toMatchObject({ isOpen: false, isCorrect: null });
    expect(controller.snapshot().totalAttempts).toBe(1);
  });

  it("keeps a wrong-order door selectable later and restores that captured state", () => {
    const controller = createHauntedLibraryController(
      [{ term: "one two three", translation: "A sequence" }],
      vi.fn(),
      { seed: 11 },
    );
    placeAtDoor(controller, 1);
    expect(controller.interact()).toMatchObject({ accepted: true, correct: false, outcome: "incorrect" });
    expect(controller.snapshot().doors[1]).toMatchObject({ isOpen: false, isCorrect: null, word: "two" });

    placeAtDoor(controller, 0);
    expect(controller.interact()).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(controller.snapshot().wordIndex).toBe(1);

    const captured = controller.capture();
    expect(() => controller.restore(captured)).not.toThrow();
    expect(controller.snapshot()).toEqual(captured);

    placeAtDoor(controller, 1);
    expect(findNearestHauntedLibraryDoor(controller.snapshot())?.word).toBe("two");
    expect(controller.interact()).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(controller.snapshot().wordIndex).toBe(2);
  });

  it("moves hazards, damages once, and honors invulnerability", () => {
    const controller = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 8 });
    const initialGhostX = controller.snapshot().ghosts[0]!.x;
    controller.tick(100);
    expect(controller.snapshot().ghosts[0]!.x).not.toBe(initialGhostX);

    const ghost = controller.snapshot().ghosts[0]!;
    controller.restore({
      ...controller.snapshot(),
      player: {
        ...controller.snapshot().player,
        x: ghost.x,
        y: controller.snapshot().floors[ghost.floor]!.y - PLAYER_HEIGHT,
        floor: ghost.floor,
      },
    });
    expect(controller.tick(1).lives).toBe(2);
    expect(controller.tick(1).lives).toBe(2);

    const batController = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 8 });
    placeAtDoor(batController, 1);
    batController.interact();
    expect(batController.tick(1)).toMatchObject({ lives: 1, invulnerableMs: expect.any(Number) });
    expect(batController.snapshot().bats).toHaveLength(0);
    expect(batController.tick(1).lives).toBe(1);
  });

  it("reaches defeat at zero lives and emits one exact result", () => {
    const deliver = vi.fn();
    const controller = createHauntedLibraryController(SENTENCES, deliver);
    for (let hit = 0; hit < 3; hit += 1) controller.applyHazard();
    expect(controller.snapshot()).toMatchObject({ phase: "defeat", lives: 0, lastOutcome: "defeat" });
    expect(deliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toEqual({ accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 });
    expect(controller.applyHazard()).toMatchObject({ accepted: false, terminal: true, completed: true });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("reaches victory after every ordered door and emits exact counters", () => {
    const deliver = vi.fn();
    const controller = createHauntedLibraryController([{ term: "red blue", translation: "Colors" }], deliver, { seed: 12 });
    complete(controller);
    expect(controller.snapshot()).toMatchObject({ phase: "victory", score: 200, correctAnswers: 2, totalAttempts: 2 });
    expect(deliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toEqual({ accuracy: 1, xp: 50, score: 200, correctAnswers: 2, totalAttempts: 2 });
    expect(controller.interact()).toMatchObject({ accepted: false, terminal: true, completed: true });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("captures and restores all responsive gameplay state with strict validation", () => {
    const controller = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 17 });
    controller.move("up");
    controller.tick(24);
    const captured = controller.capture();
    controller.move("right");
    controller.applyHazard();
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);
    expect(() => controller.restore({ ...captured, seed: captured.seed + 1 })).toThrow();
    expect(() => controller.restore({ ...captured, targetIndex: 1 })).toThrow();
    expect(() => controller.restore({ ...captured, doors: captured.doors.map((door, index) => index === 0 ? { ...door, x: door.x + 1 } : door) })).toThrow();
    expect(() => controller.restore({ ...captured, phase: "victory", result: undefined })).toThrow();
  });

  it("exposes the full shared snapshot and choose-result contract", () => {
    const controller = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 17 });
    const state = controller.snapshot();
    expect(state).toMatchObject({
      seed: 17,
      phase: "playing",
      targetIndex: 0,
      targetCount: 8,
      prompt: SENTENCES[0]!.translation,
      answer: "Lanterns",
      correctAction: "confirm",
      availableActions: ["move-left", "move-right", "move-up", "move-down", "confirm"],
      lives: 3,
      energy: 3,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      destroyed: false,
    });
    expect(controller.choose("pause")).toMatchObject({ accepted: false, terminal: false, completed: false });
  });

  it("uses the host seed for placements and hazards", () => {
    const first = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 29 });
    const second = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 29 });
    const different = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 30 });
    expect(first.snapshot().doors).toEqual(second.snapshot().doors);
    expect(first.snapshot().ghosts).toEqual(second.snapshot().ghosts);
    expect(first.snapshot().doors).not.toEqual(different.snapshot().doors);
    placeAtDoor(first, 1);
    placeAtDoor(second, 1);
    first.interact();
    second.interact();
    expect(first.snapshot().bats).toEqual(second.snapshot().bats);
  });

  it("continues held semantic keyboard movement, keeps pointer parity, and cleans once", () => {
    expect(HAUNTED_LIBRARY_KEYBOARD_BINDINGS).toMatchObject({ ArrowLeft: "move-left", ArrowUp: "move-up", Space: "confirm" });
    const up = dpadCenter("move-up");
    const down = dpadCenter("move-down");
    const confirm = dpadCenter("confirm");
    const left = dpadCenter("move-left");
    expect(chooseHauntedLibraryActionFromPointer(up.x, up.y, 390, 844)).toBe("move-up");
    expect(chooseHauntedLibraryActionFromPointer(down.x, down.y, 390, 844)).toBe("move-down");
    expect(chooseHauntedLibraryActionFromPointer(confirm.x, confirm.y, 390, 844)).toBe("confirm");
    expect(chooseHauntedLibraryActionFromPointer(left.x, left.y, 390, 844)).toBe("move-left");

    const input = createInputController();
    const { surface, graphics } = createSceneSurface();
    const completeResult = vi.fn();
    const diagnostic = vi.fn();
    const config = createHauntedLibraryCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete: completeResult,
      diagnostic,
      inputController: input,
      sessionMode: "playing",
      composition: undefined,
      seed: 77,
    });
    const scene = config.scene as {
      create: (this: typeof surface) => void;
      update: (this: typeof surface, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState: () => ReturnType<typeof createHauntedLibraryController>["snapshot"] extends () => infer T ? T : never;
        apkRestoreResponsiveState: (state: unknown) => void;
      };
    };
    scene.create.call(surface);
    const before = scene.extend.apkCaptureResponsiveState();
    input.set({ pressed: ["ArrowRight"], keys: ["ArrowRight"] });
    scene.update.call(surface, 0, 16);
    const afterOne = scene.extend.apkCaptureResponsiveState();
    input.set({ pressed: [], keys: ["ArrowRight"] });
    scene.update.call(surface, 0, 16);
    const afterTwo = scene.extend.apkCaptureResponsiveState();
    expect(afterOne.player.x).toBeGreaterThan(before.player.x);
    expect(afterTwo.player.x).toBeGreaterThan(afterOne.player.x);
    scene.extend.apkRestoreResponsiveState(before);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(before);

    input.set({ pressed: [], keys: [], pointer: { ...input.snapshot().pointer, released: true, x: confirm.x, y: confirm.y } });
    scene.update.call(surface, 0, 16);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "HAUNTED_LIBRARY_INPUT" }));
    surface.fire("shutdown");
    surface.fire("destroy");
    expect(scene.extend.apkCaptureResponsiveState().destroyed).toBe(true);
    expect(graphics.destroy).toHaveBeenCalledOnce();
    expect(completeResult).not.toHaveBeenCalled();
  });

  it("does not deliver tutorial or demo terminal results", () => {
    const deliver = vi.fn();
    const controller = createHauntedLibraryController([{ term: "one", translation: "one" }], deliver, { seed: 4, allowCompletion: false });
    complete(controller);
    expect(controller.snapshot().result).toBeDefined();
    expect(deliver).not.toHaveBeenCalled();
  });

  it("covers pointer choices, numeric options, and invalid movement input", () => {
    const right = dpadCenter("move-right");
    expect(chooseHauntedLibraryActionFromPointer(right.x, right.y, 390, 844)).toBe("move-right");
    expect(chooseHauntedLibraryActionFromPointer(20, 20, 390, 844)).toBeUndefined();
    expect(() => createHauntedLibraryController(SENTENCES, vi.fn(), Number.NaN)).toThrow(/seed/i);
    expect(() => createHauntedLibraryController(SENTENCES, vi.fn(), { initialLives: 0 })).toThrow(/lives/i);

    const numericOptions = createHauntedLibraryController(SENTENCES, vi.fn(), 13);
    expect(numericOptions.snapshot().seed).toBe(13);
    expect(() => numericOptions.tick(Number.NaN)).toThrow(/delta/i);
    expect(() => numericOptions.move("right", -1)).toThrow(/distance/i);

    const airborne = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 13 });
    const state = airborne.snapshot();
    airborne.restore({
      ...state,
      player: {
        ...state.player,
        y: state.player.y - 100,
        velocityY: -10,
        state: "jumping",
        onFloor: false,
      },
    });
    expect(airborne.interact()).toMatchObject({ accepted: false, terminal: false });
  });

  it("defeats on a wrong door when one life remains and expires a stunned ghost", () => {
    const deliver = vi.fn();
    const controller = createHauntedLibraryController(SENTENCES, deliver, { seed: 8, initialLives: 1 });
    placeAtDoor(controller, 1);
    const wrong = controller.interact();
    expect(wrong).toMatchObject({ accepted: true, correct: false, outcome: "defeat", terminal: true });
    expect(controller.snapshot()).toMatchObject({ phase: "defeat", lives: 0, initialLives: 1 });
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "defeat");

    const ghostController = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 8 });
    const state = ghostController.capture();
    const stunned = { ...state.ghosts[0]!, stunMs: 1, stunTimer: 1, state: "stunned" as const };
    ghostController.restore({ ...state, ghosts: [stunned, ...state.ghosts.slice(1)] });
    expect(ghostController.tick(1).ghosts[0]).toMatchObject({ stunMs: 0, stunTimer: 0, state: "walking" });
  });

  it("rejects malformed actor contracts and preserves the captured state", () => {
    const controller = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 19 });
    const captured = controller.capture();
    const invalidStates: Array<ReturnType<typeof controller.capture>> = [
      null as unknown as ReturnType<typeof controller.capture>,
      { ...captured, availableActions: [] },
      { ...captured, phase: "playing" as const, lives: 0 },
      { ...captured, player: { ...captured.player, onFloor: true, y: captured.player.y - 1 } },
      { ...captured, ghosts: [{ ...captured.ghosts[0]!, stunMs: 1, stunTimer: 1, state: "walking" as const }, ...captured.ghosts.slice(1)] },
      { ...captured, bats: [{ id: "bad", x: 10, floor: 0, velocityX: 1 }], batSerial: 0 },
    ];

    for (const invalid of invalidStates) expect(() => controller.restore(invalid)).toThrow();
    expect(controller.snapshot()).toEqual(captured);
  });

  it("processes touch drag and tutorial actions through the scene adapter", () => {
    const input = createInputController();
    const { surface, graphics } = createSceneSurface();
    const config = createHauntedLibraryCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
      composition: undefined,
      seed: 77,
    });
    const scene = config.scene as { create: (this: typeof surface) => void; update: (this: typeof surface, time: number, delta: number) => void; extend: { apkRecompose: (composition: unknown) => void } };
    scene.create.call(surface);
    const right = dpadCenter("move-right");
    const confirm = dpadCenter("confirm");
    input.set({ pointer: { ...input.snapshot().pointer, down: true, x: right.x, y: right.y } });
    scene.update.call(surface, 0, 16);
    input.set({ pointer: { ...input.snapshot().pointer, down: false, released: true, cancelled: true, x: confirm.x, y: confirm.y } });
    scene.update.call(surface, 16, 16);
    scene.extend.apkRecompose({ profile: "compact" });
    scene.update.call(surface, 32, 16);
    expect(graphics.fillRect).toHaveBeenCalled();

    const tutorialCartridge = createHauntedLibraryCartridge();
    const tutorialInput = createInputController();
    tutorialCartridge.createGameConfig({
      input: [{ term: "one two", translation: "one two" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: tutorialInput,
      sessionMode: "tutorial",
    });
    const tutorial = tutorialCartridge.standardExperience.definition.tutorial;
    const driver = tutorialCartridge.standardExperience.createTutorialActionDriver();
    for (const step of tutorial.steps) {
      driver.execute({ tutorial, step, seed: tutorial.seed, mode: "tutorial", diagnostics: { report: vi.fn() } });
    }
    expect(INITIAL_LIVES).toBe(3);
  });

  it("keeps the compact D-pad below floor 0 walkable area", () => {
    const controller = createHauntedLibraryController(SENTENCES, vi.fn(), { seed: 7 });
    const floor0 = controller.snapshot().floors[0]!;
    const walkableBottom = floor0.y + floor0.height;
    const walkableTop = floor0.y - PLAYER_HEIGHT;
    const layout = getHauntedLibraryDpadLayout(390, 844);
    expect(layout.length).toBeGreaterThan(0);
    for (const button of layout) {
      expect(button.y).toBeGreaterThanOrEqual(walkableBottom);
      expect(button.y + button.height).toBeLessThanOrEqual(844);
    }
    expect(chooseHauntedLibraryActionFromPointer(195, (walkableTop + floor0.y) / 2, 390, 844)).toBeUndefined();
    expect(chooseHauntedLibraryActionFromPointer(195, floor0.y, 390, 844)).toBeUndefined();
  });

  it("ignores live keyboard and pointer input during tutorial sessions", () => {
    const input = createInputController();
    const { surface } = createSceneSurface();
    const diagnostic = vi.fn();
    const config = createHauntedLibraryCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic,
      inputController: input,
      sessionMode: "tutorial",
      composition: undefined,
      seed: 77,
    });
    const scene = config.scene as {
      create: (this: typeof surface) => void;
      update: (this: typeof surface, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState: () => ReturnType<typeof createHauntedLibraryController>["snapshot"] extends () => infer T ? T : never;
      };
    };
    scene.create.call(surface);
    const before = scene.extend.apkCaptureResponsiveState();
    const right = dpadCenter("move-right");
    input.set({ pressed: ["ArrowRight"], keys: ["ArrowRight"] });
    scene.update.call(surface, 0, 16);
    input.set({
      pressed: [],
      keys: [],
      pointer: { ...input.snapshot().pointer, released: true, x: right.x, y: right.y },
    });
    scene.update.call(surface, 16, 16);
    expect(scene.extend.apkCaptureResponsiveState().player.x).toBe(before.player.x);
    expect(diagnostic).not.toHaveBeenCalledWith(expect.objectContaining({ code: "HAUNTED_LIBRARY_INPUT" }));
  });
});
