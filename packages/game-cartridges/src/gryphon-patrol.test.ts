import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  GRYPHON_PATROL_KEYBOARD_BINDINGS,
  GRYPHON_PATROL_WORLD,
  chooseGryphonPatrolPointerIntent,
  createGryphonPatrolCartridge,
  createGryphonPatrolController,
  type GryphonPatrolSnapshot,
} from "./gryphon-patrol.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SENTENCES = [
  { term: "Gryphons patrol skies", translation: "Aerial patrol" },
  { term: "Orbs mark routes", translation: "Marked routes" },
];

type InputState = ReturnType<typeof createInputState>;

function createInputState(): {
  keys: string[];
  pressed: string[];
  pointer: {
    down: boolean;
    released: boolean;
    cancelled: boolean;
    id: number | null;
    kind: "mouse" | "pen" | "touch" | null;
    startX: number;
    startY: number;
    x: number;
    y: number;
  };
  destroyed: boolean;
} {
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
  };
}

function createSceneHarness(width = 960, height = 540) {
  const input: InputState = createInputState();
  const events = new Map<string, () => void>();
  const destroyed: { graphics: number; text: number } = { graphics: 0, text: 0 };
  const inputController = {
    snapshot: vi.fn(() => ({
      ...input,
      keys: [...input.keys],
      pressed: [...input.pressed],
      pointer: { ...input.pointer },
    })),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
  };
  const graphics = {
    clear: vi.fn(function () { return graphics; }),
    fillStyle: vi.fn(function () { return graphics; }),
    fillRect: vi.fn(function () { return graphics; }),
    fillCircle: vi.fn(function () { return graphics; }),
    fillRoundedRect: vi.fn(function () { return graphics; }),
    lineStyle: vi.fn(function () { return graphics; }),
    strokeRoundedRect: vi.fn(function () { return graphics; }),
    destroy: vi.fn(() => { destroyed.graphics += 1; }),
  };
  const text = () => {
    const value = {
      setPosition: vi.fn(function () { return value; }),
      setText: vi.fn(function () { return value; }),
      destroy: vi.fn(() => { destroyed.text += 1; }),
    };
    return value;
  };
  const scene = {
    add: {
      graphics: () => graphics,
      text: vi.fn(() => text()),
    },
    events: {
      once: vi.fn((event: string, listener: () => void) => events.set(event, listener)),
    },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width, height }) } },
    scale: { width, height },
  };
  return { input, inputController, scene, events, destroyed, graphics };
}

function targetEnemy(controller: ReturnType<typeof createGryphonPatrolController>) {
  const enemy = controller.snapshot().enemies.find((candidate) => candidate.isTarget && candidate.isActive);
  if (!enemy) throw new Error("Expected an active target enemy");
  return enemy;
}

function activeOrb(controller: ReturnType<typeof createGryphonPatrolController>) {
  const orb = controller.snapshot().orbs.find((candidate) => candidate.isActive);
  if (!orb) throw new Error("Expected an active word orb");
  return orb;
}

function collectEveryTarget(controller: ReturnType<typeof createGryphonPatrolController>): void {
  while (controller.snapshot().phase === "playing") {
    const enemy = targetEnemy(controller);
    controller.hitEnemy(enemy.id);
    controller.collectOrb(activeOrb(controller).id);
  }
}

function screenXForWorld(worldX: number, cameraX: number, sceneWidth: number): number {
  let screenX = worldX - cameraX;
  while (screenX < 0) screenX += GRYPHON_PATROL_WORLD.width;
  while (screenX > sceneWidth) screenX -= GRYPHON_PATROL_WORLD.width;
  return screenX;
}

describe("Gryphon Patrol cartridge", () => {
  it("exposes a bespoke sentence manifest without the generic catalog factory", () => {
    expect(createGryphonPatrolCartridge().manifest).toMatchObject({
      id: "gryphon-patrol",
      runtimeApiVersion: "1.0.0",
      inputMode: "sentence",
      requiredAssetBindings: ["gryphon-patrol/player"],
    });

    const source = readFileSync(resolve(REPO_ROOT, "packages/game-cartridges/src/gryphon-patrol.ts"), "utf8");
    expect(source).not.toMatch(/createLegacyCatalog(?:Cartridge|Controller)/u);
  });

  it("moves in four directions and wraps only the horizontal world axis", () => {
    const controller = createGryphonPatrolController(SENTENCES, vi.fn());
    const initial = controller.snapshot().player;

    controller.moveTo(GRYPHON_PATROL_WORLD.width - 8, initial.y);
    controller.move("move-right");
    expect(controller.snapshot().player.x).toBeLessThan(100);

    controller.move("move-up");
    controller.move("move-left");
    controller.move("move-down");
    expect(controller.snapshot().player.y).toBeGreaterThanOrEqual(0);
    expect(controller.snapshot().player.y).toBeLessThanOrEqual(GRYPHON_PATROL_WORLD.height);
    expect(controller.snapshot().player.x).toBeGreaterThanOrEqual(0);
    expect(controller.snapshot().player.x).toBeLessThan(GRYPHON_PATROL_WORLD.width);
  });

  it("gives every patrol enemy deterministic movement on ticks", () => {
    const first = createGryphonPatrolController(SENTENCES, vi.fn());
    const second = createGryphonPatrolController(SENTENCES, vi.fn());
    const initial = first.snapshot().enemies;

    const firstAfterTick = first.tick(1_000).enemies;
    const secondAfterTick = second.tick(1_000).enemies;

    expect(firstAfterTick).toEqual(secondAfterTick);
    expect(firstAfterTick.every((enemy, index) => {
      const start = initial[index];
      return start !== undefined && (enemy.x !== start.x || enemy.y !== start.y);
    })).toBe(true);
    expect(firstAfterTick.every((enemy) => enemy.vx !== 0 || enemy.vy !== 0)).toBe(true);
  });

  it("uses the host seed for actor placement and clamps gameplay deltas", () => {
    const seeded = createGryphonPatrolController(SENTENCES, vi.fn(), 17);
    const replay = createGryphonPatrolController(SENTENCES, vi.fn(), 17);
    const different = createGryphonPatrolController(SENTENCES, vi.fn(), 18);

    expect(seeded.snapshot()).toMatchObject({
      seed: 17,
      answer: "Gryphons",
      correctAction: "confirm",
      availableActions: ["move-left", "move-right", "move-up", "move-down", "confirm"],
      lives: 3,
      energy: 0,
    });
    expect(seeded.snapshot().enemies).toEqual(replay.snapshot().enemies);
    expect(seeded.snapshot().enemies).not.toEqual(different.snapshot().enemies);

    seeded.tick(500);
    replay.tick(50);
    expect(seeded.snapshot().enemies).toEqual(replay.snapshot().enemies);
  });

  it("labels decoy enemies from sentence words instead of English debug prefixes", () => {
    const oneWord = createGryphonPatrolController([{ term: "Gryphons", translation: "Aerial patrol" }], vi.fn());
    const many = createGryphonPatrolController(SENTENCES, vi.fn());
    const sentenceWords = new Set(SENTENCES.flatMap((item) => item.term.split(/\s+/u)));

    expect(new Set(oneWord.snapshot().enemies.map((enemy) => enemy.word))).toEqual(new Set(["Gryphons"]));
    expect(oneWord.snapshot().enemies.every((enemy) => !enemy.word.startsWith("decoy-"))).toBe(true);
    expect(many.snapshot().enemies.every((enemy) => sentenceWords.has(enemy.word))).toBe(true);
  });

  it("keeps moving enemies inside the wrapped and bounded patrol world", () => {
    const controller = createGryphonPatrolController(SENTENCES, vi.fn());

    controller.tick(120_000);

    for (const enemy of controller.snapshot().enemies) {
      expect(enemy.x).toBeGreaterThanOrEqual(0);
      expect(enemy.x).toBeLessThan(GRYPHON_PATROL_WORLD.width);
      expect(enemy.y).toBeGreaterThanOrEqual(0);
      expect(enemy.y).toBeLessThanOrEqual(GRYPHON_PATROL_WORLD.height);
    }
  });

  it("spawns the same word enemies and removes a projectile on collision", () => {
    const first = createGryphonPatrolController(SENTENCES, vi.fn());
    const second = createGryphonPatrolController(SENTENCES, vi.fn());
    expect(first.snapshot().enemies).toEqual(second.snapshot().enemies);

    const enemy = targetEnemy(first);
    first.moveTo(enemy.x - 48, enemy.y);
    const fired = first.fire();
    expect(fired.accepted).toBe(true);
    expect(fired.snapshot.projectiles).toHaveLength(1);

    first.tick(100);
    const afterHit = first.snapshot();
    expect(afterHit.projectiles).toHaveLength(0);
    expect(afterHit.enemies.find((candidate) => candidate.id === enemy.id)?.isActive).toBe(false);
  });

  it("drops a correct orb on a target hit and advances only when that orb is collected", () => {
    const controller = createGryphonPatrolController(SENTENCES, vi.fn());
    const enemy = targetEnemy(controller);

    const hit = controller.hitEnemy(enemy.id);
    expect(hit).toMatchObject({ accepted: true, correct: true, progressed: false });
    expect(hit.snapshot.targetIndex).toBe(0);
    expect(hit.snapshot.correctAnswers).toBe(1);
    expect(hit.snapshot.orbs).toHaveLength(1);

    const collected = controller.collectOrb(activeOrb(controller).id);
    expect(collected).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(collected.snapshot.targetIndex).toBe(1);
    expect(collected.snapshot.collectedWords).toEqual(["Gryphons"]);
  });

  it("removes a wrong enemy without dropping an orb or changing ordered progress", () => {
    const controller = createGryphonPatrolController(SENTENCES, vi.fn());
    const wrong = controller.snapshot().enemies.find((enemy) => !enemy.isTarget && enemy.isActive);
    if (!wrong) throw new Error("Expected a deterministic wrong enemy");

    const result = controller.hitEnemy(wrong.id);
    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(result.snapshot.targetIndex).toBe(0);
    expect(result.snapshot.correctAnswers).toBe(0);
    expect(result.snapshot.orbs).toHaveLength(0);
    expect(result.snapshot.enemies.find((enemy) => enemy.id === wrong.id)?.isActive).toBe(false);
    expect(targetEnemy(controller).word).toBe("Gryphons");
  });

  it("restores a later ordered target after an early wrong enemy removal", () => {
    const controller = createGryphonPatrolController([{ term: "Gryphons patrol", translation: "Aerial patrol" }], vi.fn(), 41);
    const laterTarget = controller.snapshot().enemies.find((enemy) => enemy.targetId === "word:0:1");
    if (!laterTarget) throw new Error("Expected a later target enemy");

    expect(controller.hitEnemy(laterTarget.id)).toMatchObject({ accepted: true, correct: false, progressed: false });
    const firstTarget = targetEnemy(controller);
    controller.hitEnemy(firstTarget.id);
    controller.collectOrb(activeOrb(controller).id);

    expect(targetEnemy(controller).id).toBe(laterTarget.id);
    controller.hitEnemy(laterTarget.id);
    controller.collectOrb(activeOrb(controller).id);
    expect(controller.snapshot()).toMatchObject({ phase: "victory", targetIndex: 2, totalAttempts: 3, wrongAnswers: 1, score: 200 });
  });

  it("loses one HP on enemy contact and ignores contact during invulnerability", () => {
    const controller = createGryphonPatrolController(SENTENCES, vi.fn());
    const enemy = targetEnemy(controller);
    controller.moveTo(enemy.x, enemy.y);

    controller.tick(0);
    expect(controller.snapshot().player).toMatchObject({ hp: 2, invulnerableMs: 1_000 });
    controller.tick(100);
    expect(controller.snapshot().player).toMatchObject({ hp: 2, invulnerableMs: 950 });
    controller.tick(900);
    expect(controller.snapshot().player).toMatchObject({ hp: 2, invulnerableMs: 900 });
    for (let index = 0; index < 18; index += 1) controller.tick(50);
    expect(controller.snapshot().player).toMatchObject({ hp: 2, invulnerableMs: 0 });
    controller.applyHazard();
    expect(controller.snapshot().player).toMatchObject({ hp: 1, invulnerableMs: 1_000 });
  });

  it("emits one exact victory result after the final orb", () => {
    const deliver = vi.fn();
    const controller = createGryphonPatrolController(SENTENCES, deliver);
    collectEveryTarget(controller);

    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);
    expect(controller.snapshot().phase).toBe("victory");
    expect(result).toEqual({
      accuracy: 1,
      xp: 130,
      score: 600,
      correctAnswers: 6,
      totalAttempts: 6,
    });
    controller.collectOrb("orb:missing");
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("adds score on correct orb collection and reports explicit terminal outcomes", () => {
    const deliver = vi.fn();
    const controller = createGryphonPatrolController(SENTENCES, deliver, 21);
    const target = targetEnemy(controller);

    const hit = controller.hitEnemy(target.id);
    expect(hit.snapshot).toMatchObject({ correctAnswers: 1, totalAttempts: 1, score: 0, targetIndex: 0 });
    const collected = controller.collectOrb(activeOrb(controller).id);
    expect(collected.snapshot).toMatchObject({ correctAnswers: 1, totalAttempts: 1, score: 100, targetIndex: 1 });

    collectEveryTarget(controller);
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "victory");
  });

  it("emits one exact defeat result at zero HP", () => {
    const deliver = vi.fn();
    const controller = createGryphonPatrolController(SENTENCES, deliver);
    for (let index = 0; index < 3; index += 1) controller.applyHazard();

    expect(controller.snapshot()).toMatchObject({ phase: "defeat", status: "lost", player: { hp: 0 } });
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toEqual({
      accuracy: 0,
      xp: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
    controller.applyHazard();
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "defeat");
  });

  it("rejects inconsistent responsive phase, content, actors, and counters", () => {
    const controller = createGryphonPatrolController(SENTENCES, vi.fn(), 31);
    const captured = controller.capture();

    expect(() => controller.restore({ ...captured, phase: "victory" })).toThrow(/status|phase|unfinished/i);
    expect(() => controller.restore({ ...captured, collectedWords: ["forged"] })).toThrow(/collected/i);
    expect(() => controller.restore({ ...captured, answer: "forged" })).toThrow(/target/i);
    expect(() => controller.restore({ ...captured, player: { ...captured.player, x: Number.NaN } })).toThrow(/actor/i);
    expect(() => controller.restore({
      ...captured,
      enemies: captured.enemies.map((enemy, index) => index === 0 ? { ...enemy, word: "forged" } : enemy),
    })).toThrow(/enemy|actor/i);
    expect(() => controller.restore({ ...captured, totalAttempts: 1 })).toThrow(/counter/i);
  });

  it("supports keyboard, pointer, and touch intent in the scene", () => {
    expect(GRYPHON_PATROL_KEYBOARD_BINDINGS).toMatchObject({
      ArrowLeft: "move-left",
      ArrowUp: "move-up",
      ArrowRight: "move-right",
      ArrowDown: "move-down",
      Space: "confirm",
    });
    expect(chooseGryphonPatrolPointerIntent(120, 120, 960, 540)).toBe("move");
    expect(chooseGryphonPatrolPointerIntent(900, 500, 960, 540)).toBe("fire");

    const harness = createSceneHarness();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const config = createGryphonPatrolCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic,
      inputController: harness.inputController,
      sessionMode: "playing",
    });
    const scene = config.scene as { create: (this: typeof harness.scene) => void; update: (this: typeof harness.scene, time: number, delta: number) => void };
    scene.create.call(harness.scene);
    const beforeX = (config.scene as { extend: { apkCaptureResponsiveState: () => { player: { x: number } } } }).extend.apkCaptureResponsiveState().player.x;
    harness.input.pressed = ["ArrowRight"];
    scene.update.call(harness.scene, 0, 16);
    const afterKeyboardX = (config.scene as { extend: { apkCaptureResponsiveState: () => { player: { x: number } } } }).extend.apkCaptureResponsiveState().player.x;
    expect(afterKeyboardX).not.toBe(beforeX);

    harness.input.pressed = [];
    harness.input.pointer = { ...harness.input.pointer, released: true, kind: "touch", x: 120, y: 120 };
    scene.update.call(harness.scene, 0, 16);
    harness.input.pointer = { ...harness.input.pointer, released: true, x: 900, y: 500 };
    scene.update.call(harness.scene, 0, 16);
    const state = (config.scene as { extend: { apkCaptureResponsiveState: () => { projectiles: readonly unknown[] } } }).extend.apkCaptureResponsiveState();
    expect(state.projectiles.length).toBeGreaterThan(0);
  });

  it.each([
    { name: "compact", width: 390, height: 844 },
    { name: "wide", width: 1_440, height: 810 },
  ])("uses one world-to-screen transform for the centered player and world actors at $name size", ({ width, height }) => {
    const harness = createSceneHarness(width, height);
    const config = createGryphonPatrolCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: harness.inputController,
      seed: 17,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: (this: typeof harness.scene) => void;
      update: (this: typeof harness.scene, time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => GryphonPatrolSnapshot };
    };
    scene.create.call(harness.scene);

    const initial = scene.extend.apkCaptureResponsiveState();
    const enemy = initial.enemies[0];
    if (!enemy) throw new Error("Expected a deterministic patrol enemy");
    const steps = Math.floor((enemy.x - initial.player.x - 100) / 42);
    harness.input.keys = ["ArrowRight"];
    for (let index = 0; index < steps; index += 1) scene.update.call(harness.scene, 0, 0);
    harness.input.keys = [];
    harness.graphics.fillCircle.mockClear();
    scene.update.call(harness.scene, 0, 0);
    const state = scene.extend.apkCaptureResponsiveState();
    const expectedEnemyX = screenXForWorld(enemy.x, state.cameraX, width);
    const expectedPlayerX = screenXForWorld(state.player.x, state.cameraX, width);

    const fillCircleCalls = harness.graphics.fillCircle.mock.calls as unknown as readonly [number, number, number][];
    const playerCall = fillCircleCalls.find((call) => call[2] === state.player.size / 2);
    const enemyCall = fillCircleCalls.find(
      (call) => call[1] === enemy.y && call[2] === enemy.size / 2,
    );
    expect(playerCall?.[0]).toBeCloseTo(expectedPlayerX);
    expect(enemyCall?.[0]).toBeCloseTo(expectedEnemyX);
    expect(playerCall?.[0]).toBeCloseTo(width / 2);
  });

  it.each([
    { name: "compact", width: 390, height: 844 },
    { name: "wide", width: 1_440, height: 810 },
  ])("maps a pointer hit at a rendered world position back to that world position at $name size", ({ width, height }) => {
    const harness = createSceneHarness(width, height);
    const config = createGryphonPatrolCartridge().createGameConfig({
      input: [{ term: "Gryphons patrol", translation: "Aerial patrol" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: harness.inputController,
      seed: 17,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: (this: typeof harness.scene) => void;
      update: (this: typeof harness.scene, time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => GryphonPatrolSnapshot };
    };
    scene.create.call(harness.scene);

    const initial = scene.extend.apkCaptureResponsiveState();
    const enemy = initial.enemies[0];
    if (!enemy) throw new Error("Expected a deterministic patrol enemy");
    const steps = Math.floor((enemy.x - initial.player.x - 100) / 42);
    harness.input.keys = ["ArrowRight"];
    for (let index = 0; index < steps; index += 1) scene.update.call(harness.scene, 0, 0);
    harness.input.keys = [];
    const state = scene.extend.apkCaptureResponsiveState();
    const pointerX = screenXForWorld(enemy.x, state.cameraX, width);

    harness.input.pointer = { ...harness.input.pointer, released: true, kind: "touch", x: pointerX, y: enemy.y };
    scene.update.call(harness.scene, 0, 0);

    expect(scene.extend.apkCaptureResponsiveState().player.x).toBeCloseTo(enemy.x);
  });

  it("progresses every ordered word through scene keyboard and touch input", () => {
    const harness = createSceneHarness();
    const complete = vi.fn();
    const config = createGryphonPatrolCartridge().createGameConfig({
      input: [{ term: "Gryphons patrol", translation: "Aerial patrol" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: harness.inputController,
      seed: 595,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: (this: typeof harness.scene) => void;
      update: (this: typeof harness.scene, time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => GryphonPatrolSnapshot };
    };
    scene.create.call(harness.scene);

    const movePointerTo = (x: number, y: number): void => {
      const state = scene.extend.apkCaptureResponsiveState();
      harness.input.keys = [];
      harness.input.pressed = [];
      harness.input.pointer = {
        ...harness.input.pointer,
        released: true,
        kind: "touch",
        x: x - state.cameraX,
        y,
      };
      scene.update.call(harness.scene, 0, 0);
      harness.input.pointer = { ...harness.input.pointer, released: false, kind: null };
    };

    const moveVerticallyWithKeyboard = (y: number): void => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const current = scene.extend.apkCaptureResponsiveState().player.y;
        if (Math.abs(current - y) <= 15) break;
        harness.input.keys = [current < y ? "ArrowDown" : "ArrowUp"];
        harness.input.pressed = [];
        scene.update.call(harness.scene, 0, 0);
      }
      harness.input.keys = [];
    };

    const fireWithKeyboard = (): void => {
      harness.input.keys = [];
      harness.input.pressed = ["Space"];
      scene.update.call(harness.scene, 0, 0);
      harness.input.pressed = [];
    };

    const fireWithTouch = (): void => {
      harness.input.keys = [];
      harness.input.pressed = [];
      harness.input.pointer = { ...harness.input.pointer, released: true, kind: "touch", x: 900, y: 500 };
      scene.update.call(harness.scene, 0, 0);
      harness.input.pointer = { ...harness.input.pointer, released: false, kind: null };
    };

    for (let index = 0; index < 2; index += 1) {
      const target = scene.extend.apkCaptureResponsiveState().enemies.find((enemy) => enemy.isTarget && enemy.isActive);
      if (!target) throw new Error("Expected a target enemy in the scene");
      movePointerTo(target.x - 47.8, 300);
      moveVerticallyWithKeyboard(target.y);
      if (index === 0) fireWithKeyboard();
      else fireWithTouch();
      const orb = scene.extend.apkCaptureResponsiveState().orbs.find((candidate) => candidate.isActive);
      if (!orb) throw new Error("Expected a word orb in the scene");
      movePointerTo(orb.x, 300);
      moveVerticallyWithKeyboard(orb.y);
    }

    expect(scene.extend.apkCaptureResponsiveState().phase).toBe("victory");
    expect(scene.extend.apkCaptureResponsiveState().targetIndex).toBe(2);
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ score: 200 }), "victory");
  });

  it("preserves responsive state and seals the controller during cleanup", () => {
    const deliver = vi.fn();
    const controller = createGryphonPatrolController(SENTENCES, deliver);
    const enemy = targetEnemy(controller);
    controller.moveTo(enemy.x, enemy.y);
    controller.hitEnemy(enemy.id);
    controller.collectOrb(activeOrb(controller).id);
    const saved = controller.capture();
    controller.moveTo(1, 1);
    controller.restore(saved);
    expect(controller.snapshot()).toMatchObject({
      targetIndex: 1,
      player: { x: enemy.x, y: enemy.y },
    });
    controller.destroy();
    expect(controller.snapshot().destroyed).toBe(true);
    expect(controller.fire().accepted).toBe(false);
    expect(deliver).not.toHaveBeenCalled();

    const harness = createSceneHarness();
    const config = createGryphonPatrolCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: harness.inputController,
    });
    const scene = config.scene as { create: (this: typeof harness.scene) => void };
    scene.create.call(harness.scene);
    harness.events.get("shutdown")?.();
    harness.events.get("destroy")?.();
    expect(harness.destroyed.graphics).toBe(1);
    expect(harness.destroyed.text).toBeGreaterThan(0);
  });

  it("rejects invalid input and exercises zero-velocity and bounded movement paths", () => {
    expect(() => createGryphonPatrolController([], vi.fn())).toThrow();
    expect(() => createGryphonPatrolController(SENTENCES, vi.fn(), Number.NaN)).toThrow(/seed/i);

    const controller = createGryphonPatrolController(SENTENCES, vi.fn(), 17);
    expect(() => controller.snapshot(0)).toThrow(/width/i);
    expect(() => controller.move({ dx: Number.NaN, dy: 0 })).toThrow(/finite/i);
    const before = controller.snapshot();
    expect(controller.move({ dx: 0, dy: 0 })).toEqual(before);
    expect(controller.move("unknown" as never)).toEqual(before);
    expect(() => controller.moveTo(Number.NaN, 10)).toThrow(/finite/i);

    const captured = controller.capture();
    const stationaryEnemy = { ...captured.enemies[0]!, vy: 0 };
    controller.restore({ ...captured, enemies: [stationaryEnemy, ...captured.enemies.slice(1)] });
    expect(controller.tick(50).enemies[0]?.vy).toBe(0);
  });

  it("rejects inactive collection actions and malformed responsive actors", () => {
    const controller = createGryphonPatrolController(SENTENCES, vi.fn(), 23);
    const target = targetEnemy(controller);
    const wrong = controller.snapshot().enemies.find((enemy) => !enemy.isTarget && enemy.isActive);
    if (!wrong) throw new Error("Expected a wrong enemy");

    expect(controller.hitEnemy("enemy:missing")).toMatchObject({ accepted: false, completed: false });
    controller.hitEnemy(wrong.id);
    expect(controller.hitEnemy(wrong.id)).toMatchObject({ accepted: false, correct: false });
    expect(controller.collectOrb("orb:missing")).toMatchObject({ accepted: false, progressed: false });
    controller.hitEnemy(target.id);
    const orb = activeOrb(controller);
    expect(controller.collectOrb("orb:wrong")).toMatchObject({ accepted: false, progressed: false });
    expect(controller.collectOrb(orb.id)).toMatchObject({ accepted: true, progressed: true });

    const captured = controller.capture();
    const invalidStates: GryphonPatrolSnapshot[] = [
      null as unknown as GryphonPatrolSnapshot,
      { ...captured, status: "lost" as never },
      { ...captured, sentence: ["forged"] },
      { ...captured, availableActions: [] },
      { ...captured, orbs: [...captured.orbs, { ...orb, isActive: false }] },
      { ...captured, projectiles: [{ id: "projectile:0", x: Number.NaN, y: 0, vx: 1, vy: 0, size: 8, ageMs: 0, isActive: true }] },
    ];
    for (const invalid of invalidStates) expect(() => controller.restore(invalid)).toThrow();
    expect(controller.snapshot()).toEqual(captured);
  });

  it("runs tutorial actions and skips gameplay processing outside playing mode", () => {
    const cartridge = createGryphonPatrolCartridge();
    const input = createSceneHarness().inputController;
    cartridge.createGameConfig({
      input: [{ term: "one two", translation: "one two" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "tutorial",
      seed: 5,
    });
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    for (const step of tutorial.steps) {
      driver.execute({ tutorial, step, seed: tutorial.seed, mode: "tutorial", diagnostics: { report: vi.fn() } });
    }

    const harness = createSceneHarness();
    const demoConfig = createGryphonPatrolCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: harness.inputController,
      sessionMode: "demo",
    });
    const scene = demoConfig.scene as {
      create: (this: typeof harness.scene) => void;
      update: (this: typeof harness.scene, time: number, delta: number) => void;
      extend: { apkRecompose: (composition: unknown) => void };
    };
    scene.create.call(harness.scene);
    const before = (demoConfig.scene as { extend: { apkCaptureResponsiveState: () => GryphonPatrolSnapshot } }).extend.apkCaptureResponsiveState();
    harness.input.keys = ["ArrowUp"];
    scene.update.call(harness.scene, 0, 100);
    expect((demoConfig.scene as { extend: { apkCaptureResponsiveState: () => GryphonPatrolSnapshot } }).extend.apkCaptureResponsiveState().player.y).toBe(before.player.y);
    scene.extend.apkRecompose({ profile: "wide" });
    scene.update.call(harness.scene, 100, 0);
  });

  it("places tutorial demo enemies in the visible camera band for seed 29", () => {
    const complete = vi.fn();
    const cartridge = createGryphonPatrolCartridge();
    const config = cartridge.createGameConfig({
      input: [{ term: "one two", translation: "one two" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: createSceneHarness().inputController,
      sessionMode: "tutorial",
      seed: 29,
    });
    const scene = config.scene as { extend: { apkCaptureResponsiveState: () => GryphonPatrolSnapshot } };
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const sceneWidth = 960;
    const visibleRelativeX = (worldX: number, cameraX: number): number => (
      ((worldX - cameraX) % GRYPHON_PATROL_WORLD.width + GRYPHON_PATROL_WORLD.width) % GRYPHON_PATROL_WORLD.width
    );
    const execute = (stepIndex: number): void => {
      const step = tutorial.steps[stepIndex];
      if (!step) throw new Error(`Tutorial step ${stepIndex} was not found`);
      driver.execute({
        tutorial,
        step,
        seed: tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: vi.fn() },
      });
    };

    const before = scene.extend.apkCaptureResponsiveState();
    const firstTarget = before.enemies.find((enemy) => enemy.isTarget && enemy.isActive);
    if (!firstTarget) throw new Error("Expected a seed 29 target enemy");
    expect(visibleRelativeX(firstTarget.x, before.cameraX)).toBeGreaterThan(sceneWidth);

    execute(0);
    const afterIncorrect = scene.extend.apkCaptureResponsiveState();
    const incorrectEnemy = afterIncorrect.enemies.find((enemy) => !enemy.isActive && !enemy.isTarget);
    if (!incorrectEnemy) throw new Error("Expected a cleared incorrect enemy");
    expect(visibleRelativeX(incorrectEnemy.x, afterIncorrect.cameraX)).toBeLessThanOrEqual(sceneWidth);
    expect(afterIncorrect).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      lastOutcome: "incorrect",
      correctAnswers: 0,
    });

    execute(1);
    const afterCorrect = scene.extend.apkCaptureResponsiveState();
    const collectedOrb = afterCorrect.orbs.find((orb) => orb.targetId === firstTarget.targetId);
    if (!collectedOrb) throw new Error("Expected the correct orb to exist after the demonstration");
    expect(visibleRelativeX(collectedOrb.x, afterCorrect.cameraX)).toBeLessThanOrEqual(sceneWidth);
    expect(afterCorrect).toMatchObject({
      lastOutcome: "correct",
      correctAnswers: 1,
      targetIndex: 1,
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
