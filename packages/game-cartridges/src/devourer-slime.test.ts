import { gameResultsSchema } from "@reading-advantage/game-contracts";
import type {
  APKInputController,
  APKPointerState,
  CartridgeGameConfigContext,
  RuntimeEdition,
} from "@reading-advantage/advantage-play-kit";
import { describe, expect, it, vi } from "vitest";

import {
  DEVOURER_SLIME_CANVAS,
  DEVOURER_SLIME_AVAILABLE_ACTIONS,
  DEVOURER_SLIME_MAX_FRAME_DELTA_MS,
  DEVOURER_SLIME_WORLD,
  DEFAULT_DEVOURER_SLIME_SEED,
  INITIAL_SLIME_RADIUS,
  MAX_VISIBLE_SLIME_ORBS,
  KNIGHT_RADIUS,
  MAX_LIVES,
  createDevourerSlimeCartridge,
  createDevourerSlimeController,
  directionFromPointerDelta,
  type DevourerSlimeSnapshot,
} from "./devourer-slime.js";

const SENTENCES = [
  { term: "Bright slimes eat stars", translation: "Les limaces brillantes mangent les étoiles" },
  { term: "Small heroes watch", translation: "Les petits héros regardent" },
];

const TEST_EDITION: RuntimeEdition = {
  id: "devourer-slime-test-edition",
  title: "Devourer Slime Test Edition",
  runtimeApiVersion: "1.0.0",
  pack: { id: "test-pack", version: "1.0.0", root: "/test-pack", files: {} },
  bindings: {},
  tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
};

function sequenceRng(values: readonly number[] = [0.1, 0.2, 0.3, 0.7, 0.8, 0.9]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0.1;
    index += 1;
    return value;
  };
}

function collectNextWord(controller: ReturnType<typeof createDevourerSlimeController>): DevourerSlimeSnapshot {
  const target = controller.snapshot().orbs.find(
    (orb) => orb.index === controller.snapshot().targetWordIndex && !orb.isEaten,
  );
  if (!target) throw new Error("Expected a next-word orb");
  controller.moveTo(target.pos);
  return controller.tick(0).snapshot;
}

interface FakeText {
  destroyed: boolean;
  value: string;
  setPosition(x: number, y: number): FakeText;
  setText(value: string): FakeText;
  destroy(): void;
}

function createFakeText(): FakeText {
  return {
    destroyed: false,
    value: "",
    setPosition() { return this; },
    setText(value) { this.value = value; return this; },
    destroy() { this.destroyed = true; },
  };
}

function createFakeGraphics() {
  return {
    destroyed: false,
    clear() { return this; },
    fillStyle() { return this; },
    fillRect() { return this; },
    fillCircle() { return this; },
    fillRoundedRect() { return this; },
    lineStyle() { return this; },
    strokeRoundedRect() { return this; },
    destroy() { this.destroyed = true; },
  };
}

function createFakeInput() {
  let current = {
    keys: [] as readonly string[],
    pressed: [] as readonly string[],
    pointer: {
      down: false,
      released: false,
      cancelled: false,
      id: null as number | null,
      kind: null as APKPointerState["kind"],
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
    },
    destroyed: false,
  };
  const input: APKInputController & { set(next: Partial<typeof current>): void } = {
    snapshot: () => {
      const snapshot = current;
      current = { ...current, pressed: [], pointer: { ...current.pointer, released: false } };
      return snapshot;
    },
    set(next) { current = { ...current, ...next }; },
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
  };
  return input;
}

function createFakeScene() {
  const listeners = new Map<string, () => void>();
  const graphics = createFakeGraphics();
  const texts: FakeText[] = [];
  const scene = {
    add: {
      graphics: () => graphics,
      text: () => {
        const text = createFakeText();
        texts.push(text);
        return text;
      },
    },
    events: { once: (event: string, listener: () => void) => listeners.set(event, listener) },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, width: DEVOURER_SLIME_CANVAS.width }) } },
    scale: { width: DEVOURER_SLIME_CANVAS.width, height: DEVOURER_SLIME_CANVAS.height },
  };
  return { scene, graphics, texts, listeners };
}

function createGameContext(inputController: APKInputController, complete = vi.fn()) {
  return {
    input: SENTENCES,
    edition: TEST_EDITION,
    complete,
    diagnostic: vi.fn(),
    inputController,
    sessionMode: "playing" as const,
    composition: undefined,
  } satisfies CartridgeGameConfigContext;
}

describe("Devourer Slime cartridge", () => {
  it("publishes a bespoke sentence cartridge and world contract", () => {
    const cartridge = createDevourerSlimeCartridge();
    expect(cartridge.manifest).toMatchObject({
      id: "devourer-slime",
      inputMode: "sentence",
      requiredAssetBindings: ["devourer-slime/player"],
    });
    expect(cartridge.standardExperience.definition.briefing.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mode: "keyboard" }),
        expect.objectContaining({ mode: "pointer" }),
        expect.objectContaining({ mode: "touch" }),
      ]),
    );
    expect(DEVOURER_SLIME_WORLD).toEqual({ width: 800, height: 800 });
  });

  it("exposes the shared snapshot and choose-result contract with seeded placement", () => {
    const deliver = vi.fn();
    const first = createDevourerSlimeController(
      [{ term: "One", translation: "Un" }],
      deliver,
      { seed: 19, knightCount: 0 },
    );
    const second = createDevourerSlimeController(
      [{ term: "One", translation: "Un" }],
      vi.fn(),
      { seed: 19, knightCount: 0 },
    );
    const initial = first.snapshot();

    expect(first).toEqual(expect.objectContaining({
      snapshot: expect.any(Function),
      choose: expect.any(Function),
      applyHazard: expect.any(Function),
      capture: expect.any(Function),
      restore: expect.any(Function),
      destroy: expect.any(Function),
    }));
    expect(initial).toEqual(expect.objectContaining({
      seed: 19,
      phase: "playing",
      status: "playing",
      mechanic: "ordered-word-slime-growth",
      targetIndex: 0,
      targetCount: 1,
      prompt: "Un",
      answer: "One",
      correctAction: expect.any(String),
      availableActions: DEVOURER_SLIME_AVAILABLE_ACTIONS,
      lives: MAX_LIVES,
      energy: MAX_LIVES,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      destroyed: false,
    }));
    expect(initial).toEqual(second.snapshot());

    first.moveTo(initial.orbs[0]!.pos);
    const result = first.choose("confirm");
    expect(result).toMatchObject({
      accepted: true,
      correct: true,
      progressed: true,
      terminal: true,
      completed: true,
      result: { score: 100, correctAnswers: 1, totalAttempts: 1 },
    });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("uses a deterministic effective seed when the host omits one", () => {
    const first = createDevourerSlimeController(SENTENCES, vi.fn(), { knightCount: 2 });
    const second = createDevourerSlimeController(SENTENCES, vi.fn(), { knightCount: 2 });

    expect(first.snapshot().seed).toBe(DEFAULT_DEVOURER_SLIME_SEED);
    expect(first.snapshot()).toEqual(second.snapshot());
  });

  it("clamps controller gameplay deltas to 50 milliseconds and rejects invalid deltas", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), { knightCount: 0 });
    const start = controller.snapshot();

    controller.tick(1_000);
    expect(controller.snapshot().gameTime).toBe(DEVOURER_SLIME_MAX_FRAME_DELTA_MS);
    controller.move("move-right", 1_000);
    expect(controller.snapshot().slime.pos.x - start.slime.pos.x).toBe(10);
    expect(() => controller.tick(Number.NaN)).toThrow();
    expect(() => controller.move("move-left", Number.POSITIVE_INFINITY)).toThrow();
  });

  it("rejects empty or blank sentence content", () => {
    expect(() => createDevourerSlimeController([], vi.fn())).toThrow();
    expect(() => createDevourerSlimeController([{ term: "  ", translation: "blank" }], vi.fn())).toThrow();
  });

  it("keeps tutorial demonstrations outside production result delivery", () => {
    for (const sessionMode of ["tutorial", "demo"] as const) {
      const complete = vi.fn();
      const cartridge = createDevourerSlimeCartridge();
      const input = createFakeInput();
      cartridge.createGameConfig({ ...createGameContext(input, complete), sessionMode });
      const definition = cartridge.standardExperience.definition;
      const step = definition.tutorial.steps[1];
      if (!step) throw new Error("Expected a correct tutorial step");

      cartridge.standardExperience.createTutorialActionDriver().execute({
        tutorial: definition.tutorial,
        step,
        seed: definition.tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: vi.fn() },
      });

      expect(complete).not.toHaveBeenCalled();
    }
  });

  it("moves the slime in four directions and clamps it to the world", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), {
      rng: sequenceRng(),
      knightCount: 0,
    });
    const start = controller.snapshot().slime.pos;

    controller.move("move-right", 100);
    controller.move("move-up", 100);
    const moved = controller.snapshot().slime.pos;
    expect(moved.x).toBeGreaterThan(start.x);
    expect(moved.y).toBeLessThan(start.y);

    controller.moveTo({ x: 0, y: 0 });
    expect(controller.snapshot().slime.pos).toEqual({ x: INITIAL_SLIME_RADIUS, y: INITIAL_SLIME_RADIUS });
    controller.move("move-left", 10000);
    controller.move("move-up", 10000);
    expect(controller.snapshot().slime.pos).toEqual({ x: INITIAL_SLIME_RADIUS, y: INITIAL_SLIME_RADIUS });
  });

  it("collects only the next ordered orb, adds score, and grows", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), {
      rng: sequenceRng(),
      knightCount: 0,
    });
    const result = collectNextWord(controller);

    expect(result).toMatchObject({
      targetWordIndex: 1,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
      lastEvent: "correct",
    });
    expect(result.slime.radius).toBe(INITIAL_SLIME_RADIUS + 5);
    expect(result.orbs.find((orb) => orb.index === 0)?.isEaten).toBe(true);
  });

  it("penalizes an out-of-order orb, shrinks, and relocates that orb", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), {
      rng: sequenceRng([0.1, 0.2, 0.3, 0.7, 0.8, 0.9, 0.4, 0.6]),
      knightCount: 0,
    });
    collectNextWord(controller);
    const wrongOrb = controller.snapshot().orbs.find((orb) => orb.index === 2);
    if (!wrongOrb) throw new Error("Expected an out-of-order orb");
    const oldPosition = wrongOrb.pos;

    controller.moveTo(oldPosition);
    const result = controller.tick(0).snapshot;
    const relocated = result.orbs.find((orb) => orb.id === wrongOrb.id);

    expect(result).toMatchObject({
      targetWordIndex: 1,
      score: 50,
      correctAnswers: 1,
      totalAttempts: 2,
      lastEvent: "incorrect",
    });
    expect(result.slime.radius).toBe(INITIAL_SLIME_RADIUS + 2);
    expect(relocated?.pos).not.toEqual(oldPosition);
  });

  it("keeps the required word active after wrong order input", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), {
      rng: sequenceRng(),
      knightCount: 0,
    });
    const wrongOrb = controller.snapshot().orbs[1];
    if (!wrongOrb) throw new Error("Expected a second orb");
    controller.moveTo(wrongOrb.pos);

    expect(controller.tick(0).snapshot.targetWordIndex).toBe(0);
  });

  it("accepts an equivalent visible duplicate and restores its occurrence", () => {
    const controller = createDevourerSlimeController(
      [{ term: "go go home", translation: "ไป ไป บ้าน" }],
      vi.fn(),
      { seed: 31, knightCount: 0 },
    );
    const alternate = controller.snapshot().orbs[1];
    if (!alternate) throw new Error("Expected a repeated word orb");
    controller.moveTo(alternate.pos);
    const after = controller.tick(0).snapshot;

    expect(after).toMatchObject({ targetWordIndex: 1, correctAnswers: 1, totalAttempts: 1 });
    expect(after.orbs[1]?.isEaten).toBe(true);
    expect(after.orbs[0]?.isEaten).toBe(false);
    controller.restore(after);
    expect(controller.snapshot()).toEqual(after);
  });

  it("completes a long sentence through bounded physical orb waves", () => {
    const controller = createDevourerSlimeController(
      [{ term: "one two three four five six seven eight nine", translation: "หนึ่ง สอง สาม สี่ ห้า หก เจ็ด แปด เก้า" }],
      vi.fn(),
      { seed: 41, knightCount: 0 },
    );
    for (let step = 0; step < 9; step += 1) {
      const state = controller.snapshot();
      const visible = state.orbs.filter((orb) => orb.isVisible && !orb.isEaten);
      expect(visible.length).toBeLessThanOrEqual(MAX_VISIBLE_SLIME_ORBS);
      const target = visible.find((orb) => orb.word === state.answer);
      if (!target) throw new Error("Expected the next word in the visible wave");
      controller.moveTo(target.pos);
      controller.tick(0);
    }
    expect(controller.snapshot()).toMatchObject({ phase: "victory", correctAnswers: 9, totalAttempts: 9 });
  });

  it("restores a long sentence at a wave transition with every occurrence", () => {
    const input = [{ term: "go now go home and then go back", translation: "ไป ตอนนี้ ไป บ้าน และ แล้ว ไป กลับ" }];
    const controller = createDevourerSlimeController(input, vi.fn(), { seed: 53, knightCount: 0 });
    for (let step = 0; step < 4; step += 1) {
      const state = controller.snapshot();
      const target = state.orbs.find((orb) => orb.isVisible && !orb.isEaten && orb.word === state.answer);
      if (!target) throw new Error("Expected a visible target word");
      controller.moveTo(target.pos);
      controller.tick(0);
    }
    const captured = controller.capture();
    const restored = createDevourerSlimeController(input, vi.fn(), { seed: 53, knightCount: 0 });
    restored.restore(captured);
    expect(restored.snapshot()).toEqual(captured);
    expect(restored.snapshot().orbs).toHaveLength(8);
    expect(restored.snapshot().orbs.filter((orb) => orb.isVisible && !orb.isEaten).length).toBeLessThanOrEqual(4);
  });

  it("varies the expected orb position across deterministic waves", () => {
    const controller = createDevourerSlimeController(
      [{ term: "one two three four five six", translation: "หนึ่ง สอง สาม สี่ ห้า หก" }],
      vi.fn(),
      { seed: 67, knightCount: 0 },
    );
    const positions = new Set<string>();
    for (let step = 0; step < 6; step += 1) {
      const state = controller.snapshot();
      const target = state.orbs.find((orb) => orb.isVisible && !orb.isEaten && orb.word === state.answer);
      if (!target) throw new Error("Expected a visible target word");
      positions.add(`${target.pos.x}:${target.pos.y}`);
      controller.moveTo(target.pos);
      controller.tick(0);
    }
    expect(positions.size).toBeGreaterThan(1);
  });

  it("keeps each new wave clear of the previous contact point", () => {
    const controller = createDevourerSlimeController(
      [{ term: "I see a bridge", translation: "ฉันเห็นสะพาน" }],
      vi.fn(),
      { seed: 29, knightCount: 0 },
    );
    collectNextWord(controller);
    const state = controller.snapshot();
    const visible = state.orbs.filter((orb) => orb.isVisible && !orb.isEaten);
    for (const orb of visible) {
      expect(Math.hypot(orb.pos.x - state.slime.pos.x, orb.pos.y - state.slime.pos.y))
        .toBeGreaterThan(state.slime.radius + orb.radius + 79);
    }
    for (const [index, orb] of visible.entries()) {
      for (const other of visible.slice(index + 1)) {
        expect(Math.hypot(orb.pos.x - other.pos.x, orb.pos.y - other.pos.y)).toBeGreaterThan(180);
      }
    }
    expect(state).toMatchObject({ score: 100, lives: MAX_LIVES, totalAttempts: 1 });
  });

  it("moves knights and loses a life when the slime is smaller", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), {
      rng: () => 0.5,
      knightCount: 1,
    });
    const before = controller.snapshot().knights[0];
    if (!before) throw new Error("Expected one knight");
    controller.tick(100);
    const moved = controller.snapshot().knights[0];
    expect(moved).toBeDefined();
    expect(moved?.radius).toBe(KNIGHT_RADIUS);
    controller.moveTo(moved!.pos);

    const result = controller.tick(0).snapshot;
    expect(result).toMatchObject({ lives: MAX_LIVES - 1, lastEvent: "hit" });
    expect(result.slime.radius).toBe(INITIAL_SLIME_RADIUS);
  });

  it("ignores repeated smaller-knight collisions before one second elapses", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), {
      rng: () => 0.5,
      knightCount: 1,
    });
    const knight = controller.snapshot().knights[0];
    if (!knight) throw new Error("Expected one knight");

    controller.moveTo(knight.pos);
    expect(controller.tick(0).snapshot).toMatchObject({
      lives: MAX_LIVES - 1,
      invulnerabilityMs: 1_000,
    });
    const captured = controller.capture();
    controller.tick(250);
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);
    for (let index = 0; index < 19; index += 1) controller.tick(50);
    controller.tick(49);

    expect(controller.snapshot()).toMatchObject({
      lives: MAX_LIVES - 1,
      gameTime: 999,
      invulnerabilityMs: 1,
    });
  });

  it("allows a smaller-knight collision after one second elapses", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), {
      rng: () => 0.5,
      knightCount: 1,
    });
    const knight = controller.snapshot().knights[0];
    if (!knight) throw new Error("Expected one knight");

    controller.moveTo(knight.pos);
    expect(controller.tick(0).snapshot).toMatchObject({
      lives: MAX_LIVES - 1,
      invulnerabilityMs: 1_000,
    });
    for (let index = 0; index < 19; index += 1) controller.tick(50);
    controller.tick(49);
    expect(controller.tick(2).snapshot).toMatchObject({
      lives: MAX_LIVES - 2,
      gameTime: 1001,
      invulnerabilityMs: 1_000,
    });
  });

  it("eats a knight when growth makes the slime larger and awards a bonus", () => {
    const controller = createDevourerSlimeController(
      [{ term: "One two three four", translation: "Une deux trois quatre" }],
      vi.fn(),
      { rng: sequenceRng(), knightCount: 1 },
    );
    collectNextWord(controller);
    collectNextWord(controller);
    collectNextWord(controller);
    const knight = controller.snapshot().knights[0];
    if (!knight) throw new Error("Expected one knight");
    controller.moveTo(knight.pos);

    const result = controller.tick(0).snapshot;
    expect(result.knights).toHaveLength(0);
    expect(result.slime.radius).toBe(INITIAL_SLIME_RADIUS + 15);
    expect(result.score).toBe(800);
    expect(result.lastEvent).toBe("eat-enemy");
  });

  it("advances sentence by sentence and emits one exact victory result", () => {
    const deliver = vi.fn();
    const controller = createDevourerSlimeController(SENTENCES, deliver, {
      rng: sequenceRng(),
      knightCount: 0,
    });
    let terminal = { snapshot: controller.snapshot() };
    while (controller.snapshot().phase === "playing") {
      terminal = { snapshot: collectNextWord(controller) };
    }

    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);
    expect(terminal.snapshot).toMatchObject({ phase: "victory", lastEvent: "victory" });
    expect(result).toEqual({
      accuracy: 1,
      xp: 150,
      score: 700,
      correctAnswers: 7,
      totalAttempts: 7,
    });
    controller.tick(100);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("reaches defeat at zero lives and emits one result", () => {
    const deliver = vi.fn();
    const controller = createDevourerSlimeController(SENTENCES, deliver, {
      rng: sequenceRng(),
      knightCount: 0,
    });

    for (let index = 0; index < MAX_LIVES; index += 1) controller.applyHazard();

    expect(controller.snapshot()).toMatchObject({ phase: "defeat", lives: 0, lastEvent: "defeat" });
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toEqual({
      accuracy: 0,
      xp: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
    controller.applyHazard();
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("captures and restores movement, growth, and sentence progress", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), {
      rng: sequenceRng(),
      knightCount: 0,
    });
    collectNextWord(controller);
    controller.move("move-right", 100);
    const captured = controller.capture();
    controller.move("move-down", 100);
    collectNextWord(controller);
    controller.restore(captured);

    expect(controller.snapshot()).toEqual(captured);
  });

  it("restores the PRNG position for future layouts after responsive restore", () => {
    const options = { seed: 1234, knightCount: 0 } as const;
    const uninterrupted = createDevourerSlimeController(SENTENCES, vi.fn(), options);
    const restored = createDevourerSlimeController(SENTENCES, vi.fn(), options);
    const captured = restored.capture();

    const relocateWrongOrb = (controller: ReturnType<typeof createDevourerSlimeController>): void => {
      const wrongOrb = controller.snapshot().orbs.find((orb) => orb.index === 1);
      if (!wrongOrb) throw new Error("Expected an out-of-order orb");
      controller.moveTo(wrongOrb.pos);
      controller.collectOrb(wrongOrb.id);
    };

    relocateWrongOrb(uninterrupted);
    restored.restore(captured);
    relocateWrongOrb(restored);

    expect(restored.snapshot()).toEqual(uninterrupted.snapshot());
  });

  it("rejects non-finite and inconsistent restored actors, phase, and counters", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), {
      seed: 7,
      knightCount: 1,
    });
    const captured = controller.capture();
    const invalidStates: DevourerSlimeSnapshot[] = [
      {
        ...captured,
        slime: { ...captured.slime, pos: { x: Number.NaN, y: captured.slime.pos.y } },
      },
      {
        ...captured,
        orbs: [{ ...captured.orbs[0]!, id: "orb:wrong:0" }, ...captured.orbs.slice(1)],
      },
      { ...captured, correctAnswers: 1, totalAttempts: 1 },
      { ...captured, phase: "victory", status: "victory" },
      {
        ...captured,
        knights: [{ ...captured.knights[0]!, velocity: { x: Number.POSITIVE_INFINITY, y: 0 } }],
        enemies: [{ ...captured.enemies[0]!, velocity: { x: Number.POSITIVE_INFINITY, y: 0 } }],
      },
    ];

    for (const invalid of invalidStates) expect(() => controller.restore(invalid)).toThrow();
    expect(controller.snapshot()).toEqual(captured);
  });

  it("seals the controller during cleanup", () => {
    const deliver = vi.fn();
    const controller = createDevourerSlimeController(SENTENCES, deliver, { knightCount: 0 });
    const before = controller.snapshot();
    controller.destroy();
    controller.move("move-right", 1000);
    controller.applyHazard();

    expect(controller.snapshot()).toMatchObject({ destroyed: true, phase: before.phase });
    expect(controller.snapshot().slime.pos).toEqual(before.slime.pos);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("maps pointer and touch drags to all four movement directions", () => {
    expect(directionFromPointerDelta(-40, 2)).toBe("move-left");
    expect(directionFromPointerDelta(40, 2)).toBe("move-right");
    expect(directionFromPointerDelta(2, -40)).toBe("move-up");
    expect(directionFromPointerDelta(2, 40)).toBe("move-down");
  });

  it("moves from keyboard and pointer scene input and cleans every scene resource", () => {
    const input = createFakeInput();
    const complete = vi.fn();
    const cartridge = createDevourerSlimeCartridge();
    const config = cartridge.createGameConfig(createGameContext(input, complete));
    const sceneConfig = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState(): DevourerSlimeSnapshot;
        apkRestoreResponsiveState(state: unknown): void;
        apkRecompose(composition: unknown): void;
      };
    };
    const fake = createFakeScene();
    sceneConfig.create.call(fake.scene);
    const controllerBefore = sceneConfig.extend.apkCaptureResponsiveState();

    input.set({ keys: ["ArrowRight"] });
    sceneConfig.update.call(fake.scene, 0, 100);
    const afterKeyboard = sceneConfig.extend.apkCaptureResponsiveState();
    expect(afterKeyboard.slime.pos.x).toBeGreaterThan(controllerBefore.slime.pos.x);

    input.set({
      keys: [],
      pointer: {
        down: true,
        released: false,
        cancelled: false,
        id: 1,
        kind: "touch",
        startX: 300,
        startY: 300,
        x: 200,
        y: 302,
      },
    });
    sceneConfig.update.call(fake.scene, 0, 100);
    const afterTouch = sceneConfig.extend.apkCaptureResponsiveState();
    expect(afterTouch.slime.pos.x).toBeLessThan(afterKeyboard.slime.pos.x);

    sceneConfig.extend.apkRestoreResponsiveState(controllerBefore);
    expect(sceneConfig.extend.apkCaptureResponsiveState()).toEqual(controllerBefore);
    sceneConfig.extend.apkRecompose({ profile: "compact" });
    fake.listeners.get("shutdown")?.();
    fake.listeners.get("destroy")?.();
    expect(fake.graphics.destroyed).toBe(true);
    expect(fake.texts.every((text) => text.destroyed)).toBe(true);
    expect(sceneConfig.extend.apkCaptureResponsiveState().destroyed).toBe(true);
    expect(complete).not.toHaveBeenCalled();
  });

  it("progresses a real scene action through the shared keyboard controller", () => {
    const input = createFakeInput();
    const complete = vi.fn();
    const cartridge = createDevourerSlimeCartridge();
    const config = cartridge.createGameConfig({
      ...createGameContext(input, complete),
      input: [{ term: "One", translation: "Un" }],
      seed: 19,
    });
    const sceneConfig = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState(): DevourerSlimeSnapshot;
        apkRestoreResponsiveState(state: unknown): void;
      };
    };
    const fake = createFakeScene();
    sceneConfig.create.call(fake.scene);
    const initial = sceneConfig.extend.apkCaptureResponsiveState();
    const target = initial.orbs[0]!;
    sceneConfig.extend.apkRestoreResponsiveState({
      ...initial,
      slime: { ...initial.slime, pos: target.pos },
      correctAction: "confirm",
    });

    input.set({ keys: ["Space"] });
    sceneConfig.update.call(fake.scene, 0, 1000);

    expect(sceneConfig.extend.apkCaptureResponsiveState()).toMatchObject({
      phase: "victory",
      targetIndex: 1,
      score: 100,
    });
    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith(expect.any(Object), "victory");
  });

  it("reports defeat explicitly through the host completion callback", () => {
    const input = createFakeInput();
    const complete = vi.fn();
    const cartridge = createDevourerSlimeCartridge();
    const config = cartridge.createGameConfig(createGameContext(input, complete));
    const sceneConfig = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState(): DevourerSlimeSnapshot;
        apkRestoreResponsiveState(state: unknown): void;
      };
    };
    const fake = createFakeScene();
    sceneConfig.create.call(fake.scene);
    const initial = sceneConfig.extend.apkCaptureResponsiveState();
    const knight = initial.knights[0];
    if (!knight) throw new Error("Expected a knight");
    const collidingKnight = { ...knight, pos: { ...initial.slime.pos } };

    sceneConfig.extend.apkRestoreResponsiveState({
      ...initial,
      lives: 1,
      energy: 1,
      knights: [collidingKnight, ...initial.knights.slice(1)],
      enemies: [collidingKnight, ...initial.enemies.slice(1)],
    });
    sceneConfig.update.call(fake.scene, 0, 0);

    expect(sceneConfig.extend.apkCaptureResponsiveState()).toMatchObject({ phase: "defeat", lives: 0 });
    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith(expect.any(Object), "defeat");
  });

  it("rejects invalid configuration, movement, and collection inputs", () => {
    expect(() => createDevourerSlimeController(SENTENCES, vi.fn(), { seed: Number.POSITIVE_INFINITY })).toThrow(/seed/i);
    expect(() => createDevourerSlimeController(SENTENCES, vi.fn(), { movementSpeed: -1 })).toThrow(/speed/i);
    expect(() => createDevourerSlimeController(SENTENCES, vi.fn(), { knightCount: 1.5 })).toThrow(/knight/i);
    expect(() => createDevourerSlimeController(SENTENCES, vi.fn(), { seed: undefined, rng: () => Number.NaN })).toThrow(/random/i);
    expect(() => createDevourerSlimeController([{ term: "One", translation: "Un" }], vi.fn(), { seed: 0, knightCount: 0 })).not.toThrow();

    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), { knightCount: 0 });
    expect(() => controller.move("invalid" as never)).toThrow(/direction/i);
    expect(() => controller.moveTo({ x: Number.NaN, y: 10 })).toThrow(/finite/i);
    expect(controller.collectOrb("orb:missing")).toMatchObject({ accepted: false, progressed: false });
    expect(controller.choose("unknown" as never)).toMatchObject({ accepted: false, completed: false });
  });

  it("restores custom random layouts and reflects boundary knight movement", () => {
    expect(directionFromPointerDelta(0, 0)).toBeUndefined();

    const custom = createDevourerSlimeController(SENTENCES, vi.fn(), {
      seed: undefined,
      rng: sequenceRng(),
      knightCount: 0,
    });
    const captured = custom.capture();
    const wrongOrb = custom.snapshot().orbs[1];
    if (!wrongOrb) throw new Error("Expected a second orb");
    custom.moveTo(wrongOrb.pos);
    custom.collectOrb(wrongOrb.id);
    custom.restore(captured);
    expect(custom.snapshot()).toEqual(captured);

    const boundary = createDevourerSlimeController(SENTENCES, vi.fn(), {
      rng: () => 0.5,
      knightCount: 1,
    });
    const state = boundary.capture();
    const knight = state.knights[0];
    if (!knight) throw new Error("Expected a knight");
    const edgeKnight = {
      ...knight,
      pos: { x: KNIGHT_RADIUS, y: KNIGHT_RADIUS },
      velocity: { x: -1, y: -1 },
    };
    boundary.restore({
      ...state,
      knights: [edgeKnight],
      enemies: [edgeKnight],
    });
    const moved = boundary.tick(50).snapshot.knights[0];
    expect(moved?.pos).toEqual({ x: KNIGHT_RADIUS, y: KNIGHT_RADIUS });
    expect(moved?.velocity).toEqual({ x: 1, y: 1 });
  });

  it("rejects malformed responsive lifecycle and result states", () => {
    const controller = createDevourerSlimeController(SENTENCES, vi.fn(), { knightCount: 1 });
    const captured = controller.capture();
    const invalidStates: DevourerSlimeSnapshot[] = [
      null as unknown as DevourerSlimeSnapshot,
      { ...captured, availableActions: [] },
      { ...captured, world: { width: 1, height: DEVOURER_SLIME_WORLD.height } } as unknown as DevourerSlimeSnapshot,
      { ...captured, score: -1 },
      { ...captured, phase: "playing", result: { accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 } },
      { ...captured, lastEvent: "victory", lastOutcome: "victory" } as DevourerSlimeSnapshot,
    ];

    for (const invalid of invalidStates) expect(() => controller.restore(invalid)).toThrow();
    expect(controller.snapshot()).toEqual(captured);
  });

  it("accepts a pointer tap and skips gameplay input outside playing sessions", () => {
    const input = createFakeInput();
    const complete = vi.fn();
    const config = createDevourerSlimeCartridge().createGameConfig({
      ...createGameContext(input, complete),
      input: [{ term: "One", translation: "Un" }],
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState(): DevourerSlimeSnapshot;
        apkRestoreResponsiveState(state: unknown): void;
        apkRecompose(composition: unknown): void;
      };
    };
    const fake = createFakeScene();
    scene.create.call(fake.scene);
    const initial = scene.extend.apkCaptureResponsiveState();
    const target = initial.orbs[0]!;
    scene.extend.apkRestoreResponsiveState({
      ...initial,
      slime: { ...initial.slime, pos: target.pos },
      correctAction: "confirm",
    });
    input.set({ pressed: undefined as never, pointer: { ...input.snapshot().pointer, released: true } });
    scene.update.call(fake.scene, 0, 16);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ phase: "victory", targetIndex: 1 });
    scene.extend.apkRecompose({ profile: "compact" });
    scene.update.call(fake.scene, 16, 16);
    expect(complete).toHaveBeenCalledWith(expect.any(Object), "victory");

    const demoInput = createFakeInput();
    const demoConfig = createDevourerSlimeCartridge().createGameConfig({
      ...createGameContext(demoInput),
      sessionMode: "demo",
    });
    const demoScene = demoConfig.scene as { create: (this: unknown) => void; update: (this: unknown, time: number, delta: number) => void; extend: { apkCaptureResponsiveState(): DevourerSlimeSnapshot } };
    const demoFake = createFakeScene();
    demoScene.create.call(demoFake.scene);
    const demoBefore = demoScene.extend.apkCaptureResponsiveState();
    demoInput.set({ keys: ["ArrowRight"] });
    demoScene.update.call(demoFake.scene, 0, 16);
    expect(demoScene.extend.apkCaptureResponsiveState().targetIndex).toBe(demoBefore.targetIndex);
  });
});
