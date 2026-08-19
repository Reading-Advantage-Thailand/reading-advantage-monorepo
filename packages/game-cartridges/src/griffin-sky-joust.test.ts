import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  GRIFFIN_SKY_JOUST_CANVAS,
  GRIFFIN_SKY_JOUST_INVULNERABILITY_MS,
  classifyGriffinSkyJoustCollision,
  createGriffinSkyJoustCartridge,
  createGriffinSkyJoustController,
  type GriffinSkyJoustController,
  type GriffinSkyJoustDirection,
  type GriffinSkyJoustSnapshot,
} from "./griffin-sky-joust.js";

const SENTENCES = [
  { term: "Griffins rise", translation: "Winged beasts ascend" },
  { term: "Knights descend", translation: "Riders come down" },
];

function topStrike(
  controller: GriffinSkyJoustController,
  knightId: string,
): void {
  const state = controller.capture();
  const knight = state.knights.find((candidate) => candidate.id === knightId);
  if (!knight) throw new Error(`Knight ${knightId} was not found`);
  controller.restore({
    ...state,
    player: {
      ...state.player,
      x: knight.x,
      y: knight.y - knight.radius,
    },
  });
  controller.collide(knightId);
}

function sideCollision(
  controller: GriffinSkyJoustController,
  knightId: string,
): void {
  const state = controller.capture();
  const knight = state.knights.find((candidate) => candidate.id === knightId);
  if (!knight) throw new Error(`Knight ${knightId} was not found`);
  controller.restore({
    ...state,
    player: {
      ...state.player,
      x: knight.x,
      y: knight.y,
    },
  });
  controller.collide(knightId);
}

/** Places the player above a knight so the next confirm action resolves its strike. */
function placePlayerAbove(
  controller: GriffinSkyJoustController,
  knightId: string,
): void {
  const state = controller.capture();
  const knight = state.knights.find((candidate) => candidate.id === knightId);
  if (!knight) throw new Error(`Knight ${knightId} was not found`);
  controller.restore({
    ...state,
    player: {
      ...state.player,
      x: knight.x,
      y: knight.y - knight.radius,
    },
  });
}

function advancePastInvulnerability(controller: GriffinSkyJoustController): void {
  const state = controller.capture();
  controller.restore({
    ...state,
    gameTime: state.gameTime + GRIFFIN_SKY_JOUST_INVULNERABILITY_MS + 1,
    player: { ...state.player, invulnerableUntil: 0 },
  });
}

function findKnight(state: GriffinSkyJoustSnapshot, word: string) {
  const knight = state.knights.find((candidate) => candidate.word === word);
  if (!knight) throw new Error(`Knight for ${word} was not found`);
  return knight;
}

interface FakeInputState {
  keys: readonly string[];
  pressed: readonly string[];
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
}

function fakeInputController() {
  let state: FakeInputState = {
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
  return {
    snapshot: vi.fn(() => state),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(() => {
      state = { ...state, destroyed: true };
    }),
    set(next: Partial<FakeInputState>): void {
      state = { ...state, ...next };
    },
  };
}

function sceneHost() {
  const events = new Map<string, () => void>();
  const graphics = {
    clear: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    fillCircle: vi.fn().mockReturnThis(),
    fillTriangle: vi.fn().mockReturnThis(),
    fillRoundedRect: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    strokeRoundedRect: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
  const text = () => ({
    setPosition: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  });
  const host = {
    add: {
      graphics: vi.fn(() => graphics),
      text: vi.fn(() => text()),
    },
    events: {
      once: vi.fn((event: string, listener: () => void) => events.set(event, listener)),
    },
    game: {
      canvas: { getBoundingClientRect: () => ({ left: 0, width: 960 }) },
    },
    scale: { width: 960, height: 540 },
  };
  return { host, events, graphics };
}

describe("Griffin Sky-Joust bespoke aerial cartridge", () => {
  it("exposes the sentence manifest without the shared legacy catalog factory", () => {
    const cartridge = createGriffinSkyJoustCartridge();

    expect(cartridge.manifest).toMatchObject({
      id: "griffin-sky-joust",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
    });
    expect(cartridge.manifest.capabilities).toEqual(expect.arrayContaining([
      "aerial-physics",
      "moving-word-knights",
      "collision-classification",
    ]));
  });

  it("validates finite sentences and creates one stable knight per word", () => {
    const controller = createGriffinSkyJoustController(SENTENCES, vi.fn(), { seed: 17 });
    const state = controller.snapshot();

    expect(state.phase).toBe("playing");
    expect(state.seed).toBe(17);
    expect(state.targetCount).toBe(4);
    expect(state.targetWord).toBe("Griffins");
    expect(state.prompt).toBe("Winged beasts ascend");
    expect(state.knights.map((knight) => knight.word)).toEqual([
      "Griffins",
      "rise",
      "Knights",
      "descend",
    ]);
    expect(new Set(state.knights.map((knight) => knight.id)).size).toBe(4);
    expect(() => createGriffinSkyJoustController([], vi.fn())).toThrow();
  });

  it("uses the host seed for repeatable placements and stable action state", () => {
    const first = createGriffinSkyJoustController(SENTENCES, vi.fn(), { seed: 29 });
    const second = createGriffinSkyJoustController(SENTENCES, vi.fn(), { seed: 29 });
    const different = createGriffinSkyJoustController(SENTENCES, vi.fn(), { seed: 30 });

    expect(first.snapshot().knights).toEqual(second.snapshot().knights);
    expect(first.snapshot().knights).not.toEqual(different.snapshot().knights);
    expect(first.snapshot()).toMatchObject({
      answer: "Griffins",
      targetWord: "Griffins",
      correctAction: "move-up",
      availableActions: ["move-left", "move-right", "move-up", "confirm"],
      lives: 3,
      energy: 3,
      result: undefined,
    });
  });

  it("applies gravity, flap impulse, horizontal drift, and moving knight velocity", () => {
    const controller = createGriffinSkyJoustController(SENTENCES, vi.fn());
    const before = controller.snapshot();
    const firstKnight = before.knights[0];

    controller.flap(0);
    expect(controller.snapshot().player.vy).toBeLessThan(0);
    controller.drift(1);
    expect(controller.snapshot().player.vx).toBeGreaterThan(0);
    controller.tick(16);

    const after = controller.snapshot();
    expect(after.player.y).toBeLessThan(before.player.y);
    expect(after.player.vy).toBeGreaterThan(-350);
    expect(after.player.x).toBeGreaterThan(before.player.x);
    expect(after.knights[0]?.x).not.toBe(firstKnight?.x);
  });

  it("clamps large frame deltas and rejects tampered responsive state", () => {
    const controller = createGriffinSkyJoustController(SENTENCES, vi.fn(), { seed: 53 });
    const captured = controller.capture();

    controller.tick(10_000);

    expect(controller.snapshot().gameTime).toBe(250);
    controller.flap();
    const flapped = controller.capture();
    controller.restore(flapped);
    expect(controller.snapshot().player.vy).toBe(-350);
    expect(() => controller.restore({ ...captured, seed: captured.seed + 1 })).toThrow();
    expect(() => controller.restore({ ...captured, answer: "tampered" })).toThrow();
  });

  it("classifies a collision from above separately from side or below", () => {
    const player = { x: 200, y: 100, radius: 24, vx: 0, vy: 100 };
    const knight = { x: 200, y: 150, radius: 28, vx: 50, vy: 0 };

    expect(classifyGriffinSkyJoustCollision(player, knight)).toBe("top-strike");
    expect(classifyGriffinSkyJoustCollision({ ...player, y: 150 }, knight)).toBe("side-below");
    expect(classifyGriffinSkyJoustCollision({ ...player, y: 190 }, knight)).toBe("side-below");
  });

  it("removes the correct knight, scores, and advances one ordered word on a top strike", () => {
    const controller = createGriffinSkyJoustController(SENTENCES, vi.fn());
    const first = controller.snapshot();
    const target = findKnight(first, "Griffins");

    topStrike(controller, target.id);

    expect(controller.snapshot()).toMatchObject({
      targetIndex: 1,
      targetWord: "rise",
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });
    expect(controller.snapshot().knights.some((knight) => knight.id === target.id)).toBe(false);
  });

  it("damages on a wrong top strike or side collision and bounds invulnerability", () => {
    const controller = createGriffinSkyJoustController(SENTENCES, vi.fn());
    const initial = controller.snapshot();
    const wrong = findKnight(initial, "rise");

    topStrike(controller, wrong.id);
    const afterWrong = controller.snapshot();
    expect(afterWrong.player.hp).toBe(initial.player.hp - 1);
    expect(afterWrong.totalAttempts).toBe(1);
    expect(afterWrong.player.invulnerableUntil).toBeGreaterThan(afterWrong.gameTime);

    sideCollision(controller, wrong.id);
    expect(controller.snapshot().player.hp).toBe(afterWrong.player.hp);

    advancePastInvulnerability(controller);
    sideCollision(controller, wrong.id);
    expect(controller.snapshot().player.hp).toBe(afterWrong.player.hp - 1);
    expect(controller.snapshot().totalAttempts).toBe(1);
  });

  it("emits one exact victory result after every finite sentence word", () => {
    const deliver = vi.fn();
    const controller = createGriffinSkyJoustController(SENTENCES, deliver);

    while (controller.snapshot().phase === "playing") {
      const state = controller.snapshot();
      topStrike(controller, findKnight(state, state.targetWord).id);
    }

    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);
    expect(controller.snapshot().phase).toBe("victory");
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(expect.anything(), "victory");
    expect(result).toMatchObject({
      accuracy: 1,
      score: 400,
      correctAnswers: 4,
      totalAttempts: 4,
    });
    const afterTerminal = controller.collide("knight:0:0");
    expect(afterTerminal.accepted).toBe(false);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("emits one exact defeat result at zero health", () => {
    const deliver = vi.fn();
    const controller = createGriffinSkyJoustController(SENTENCES, deliver);
    const wrongId = findKnight(controller.snapshot(), "rise").id;

    while (controller.snapshot().phase === "playing") {
      sideCollision(controller, wrongId);
      if (controller.snapshot().phase === "playing") advancePastInvulnerability(controller);
    }

    expect(controller.snapshot()).toMatchObject({ phase: "defeat", player: { hp: 0 } });
    expect(deliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
  });

  it("runs tutorial incorrect and correct actions through deterministic collisions without delivery", () => {
    const complete = vi.fn();
    const cartridge = createGriffinSkyJoustCartridge();
    const config = cartridge.createGameConfig({
      input: SENTENCES,
      edition: {} as never,
      complete,
      diagnostic: vi.fn(),
      inputController: fakeInputController(),
      seed: 29,
      sessionMode: "tutorial",
    });
    const scene = config.scene as { extend: { apkCaptureResponsiveState(): GriffinSkyJoustSnapshot } };
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
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

    execute(0);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      totalAttempts: 1,
      correctAnswers: 0,
      score: 0,
      lives: 2,
      lastOutcome: "incorrect",
    });

    execute(1);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      phase: "playing",
      targetIndex: 1,
      totalAttempts: 2,
      correctAnswers: 1,
      score: 100,
      lives: 2,
      lastOutcome: "correct",
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it("demonstrates a wrong-word top strike for one-word tutorial content", () => {
    const complete = vi.fn();
    const cartridge = createGriffinSkyJoustCartridge();
    const config = cartridge.createGameConfig({
      input: [{ term: "Griffins", translation: "Winged beasts" }],
      edition: {} as never,
      complete,
      diagnostic: vi.fn(),
      inputController: fakeInputController(),
      seed: 29,
      sessionMode: "tutorial",
    });
    const scene = config.scene as { extend: { apkCaptureResponsiveState(): GriffinSkyJoustSnapshot } };
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
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

    execute(0);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      targetWord: "Griffins",
      totalAttempts: 1,
      correctAnswers: 0,
      score: 0,
      lastOutcome: "incorrect",
    });
    expect(scene.extend.apkCaptureResponsiveState().lastOutcome).not.toBe("damage");
    expect(scene.extend.apkCaptureResponsiveState().knights.every((knight) => knight.word === "Griffins")).toBe(true);
    expect(scene.extend.apkCaptureResponsiveState().knights.every((knight) => knight.word !== "tutorial-decoy")).toBe(true);

    execute(1);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      phase: "victory",
      targetIndex: 1,
      totalAttempts: 2,
      correctAnswers: 1,
      score: 100,
      lastOutcome: "correct",
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it("returns the exact result from the first terminal choose and keeps later calls terminal", () => {
    const deliver = vi.fn();
    const controller = createGriffinSkyJoustController(
      [{ term: "Griffins", translation: "Winged beasts" }],
      deliver,
      { seed: 29 },
    );
    const target = controller.snapshot().knights[0];
    if (!target) throw new Error("Expected one Griffin Sky-Joust target");
    placePlayerAbove(controller, target.id);

    const terminal = controller.choose("confirm");
    const expectedResult = {
      accuracy: 1,
      xp: 5,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    };
    expect(terminal).toMatchObject({
      accepted: true,
      correct: true,
      progressed: true,
      terminal: true,
      completed: true,
      outcome: "victory",
      result: expectedResult,
      snapshot: { phase: "victory", result: expectedResult },
    });
    expect(gameResultsSchema.parse(terminal.result)).toEqual(expectedResult);
    expect(deliver).toHaveBeenCalledWith(expectedResult, "victory");

    const afterTerminal = controller.choose("confirm");
    expect(afterTerminal).toMatchObject({
      accepted: false,
      terminal: true,
      completed: true,
      result: expectedResult,
      snapshot: { phase: "victory", result: expectedResult },
    });
    expect(afterTerminal.result).toBe(terminal.result);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("returns the exact defeat result from a terminal choose without duplicate delivery", () => {
    const deliver = vi.fn();
    const controller = createGriffinSkyJoustController(
      [{ term: "Griffins", translation: "Winged beasts" }],
      deliver,
      { seed: 29, maxHealth: 1 },
    );
    const target = controller.snapshot().knights[0];
    if (!target) throw new Error("Expected one Griffin Sky-Joust target");
    const state = controller.capture();
    controller.restore({
      ...state,
      player: { ...state.player, x: target.x, y: target.y },
    });

    const terminal = controller.choose("confirm");
    const expectedResult = {
      accuracy: 0,
      xp: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    };
    expect(terminal).toMatchObject({
      accepted: true,
      correct: false,
      progressed: false,
      damaged: true,
      terminal: true,
      completed: true,
      outcome: "defeat",
      result: expectedResult,
      snapshot: { phase: "defeat", result: expectedResult, lives: 0 },
    });
    expect(gameResultsSchema.parse(terminal.result)).toEqual(expectedResult);

    const afterTerminal = controller.choose("move-up");
    expect(afterTerminal).toMatchObject({
      accepted: false,
      terminal: true,
      completed: true,
      result: expectedResult,
      snapshot: { phase: "defeat", result: expectedResult },
    });
    expect(afterTerminal.result).toBe(terminal.result);
    expect(deliver).toHaveBeenCalledWith(expectedResult, "defeat");
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("applies a hazard without advancing the retained target and reports defeat explicitly", () => {
    const deliver = vi.fn();
    const controller = createGriffinSkyJoustController(SENTENCES, deliver, { maxHealth: 1, seed: 41 });

    const result = controller.applyHazard();

    expect(result).toMatchObject({
      accepted: true,
      correct: false,
      progressed: false,
      damaged: true,
      terminal: true,
      completed: true,
      outcome: "defeat",
      snapshot: { phase: "defeat", targetIndex: 0, targetWord: "Griffins", lives: 0, energy: 0 },
    });
    expect(deliver).toHaveBeenCalledWith(expect.anything(), "defeat");
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("maps keyboard and pointer input to flap and drift in the bespoke scene", () => {
    const input = fakeInputController();
    const cartridge = createGriffinSkyJoustCartridge();
    const config = cartridge.createGameConfig({
      input: SENTENCES,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create(this: ReturnType<typeof sceneHost>["host"]): void;
      update(this: ReturnType<typeof sceneHost>["host"], time: number, delta: number): void;
    };
    const host = sceneHost();
    scene.create.call(host.host);

    for (const code of ["KeyW", "ArrowUp", "Space"]) {
      input.set({ pressed: [code] });
      scene.update.call(host.host, 0, 0);
    }
    for (const code of ["KeyA", "KeyD"]) {
      input.set({ pressed: [code] });
      scene.update.call(host.host, 0, 0);
    }
    expect(input.snapshot).toHaveBeenCalled();

    input.set({
      pressed: [],
      pointer: { ...input.snapshot().pointer, released: true, x: 100 },
    });
    scene.update.call(host.host, 0, 0);
    input.set({
      pointer: { ...input.snapshot().pointer, released: true, x: 800 },
    });
    scene.update.call(host.host, 0, 0);

    const state = (config.scene as { extend: { apkCaptureResponsiveState(): GriffinSkyJoustSnapshot } })
      .extend.apkCaptureResponsiveState();
    expect(state.player.vy).toBeLessThan(0);
    expect(state.player.vx).toBeGreaterThan(0);
  });

  it("completes through scene keyboard input, bounded ticks, and physical collision", () => {
    const input = fakeInputController();
    const complete = vi.fn();
    const cartridge = createGriffinSkyJoustCartridge();
    const config = cartridge.createGameConfig({
      input: [{ term: "Griffins", translation: "Winged beasts" }],
      edition: {} as never,
      complete,
      diagnostic: vi.fn(),
      inputController: input,
      seed: 14_017,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create(this: ReturnType<typeof sceneHost>["host"]): void;
      update(this: ReturnType<typeof sceneHost>["host"], time: number, delta: number): void;
      extend: { apkCaptureResponsiveState(): GriffinSkyJoustSnapshot };
    };
    const host = sceneHost();
    scene.create.call(host.host);

    const flightPlan = "UUULUURL..........URU..R.LRLR.R.R..";
    for (let frame = 0; frame < flightPlan.length && complete.mock.calls.length === 0; frame += 1) {
      const code = flightPlan[frame] === "U" ? "KeyW" : flightPlan[frame] === "L" ? "KeyA" : flightPlan[frame] === "R" ? "KeyD" : undefined;
      const pressed = code === undefined ? [] : [code];
      input.set({ pressed, keys: pressed });
      scene.update.call(host.host, frame * 16, 16);
    }

    expect(complete).toHaveBeenCalledOnce();
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      phase: "victory",
      targetIndex: 1,
      score: 100,
    });
  });

  it("preserves responsive state and cleans every scene resource exactly once", () => {
    const input = fakeInputController();
    const cartridge = createGriffinSkyJoustCartridge();
    const config = cartridge.createGameConfig({
      input: SENTENCES,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
      composition: {
        supported: true,
        profile: "compact",
        inputMode: "touch",
        safeRect: { x: 0, y: 0, width: 390, height: 700 },
        regions: {} as never,
        strategy: "reflow",
        minimumTouchTargetPx: 44,
        diagnostics: [],
      },
    });
    const scene = config.scene as {
      create(this: ReturnType<typeof sceneHost>["host"]): void;
      update(this: ReturnType<typeof sceneHost>["host"], time: number, delta: number): void;
      extend: {
        apkCaptureResponsiveState(): GriffinSkyJoustSnapshot;
        apkRestoreResponsiveState(state: unknown): void;
        apkRecompose(composition: unknown): void;
      };
    };
    const host = sceneHost();
    scene.create.call(host.host);
    scene.update.call(host.host, 0, 16);
    const captured = scene.extend.apkCaptureResponsiveState();
    scene.extend.apkRecompose({ ...captured, profile: "wide" });
    scene.extend.apkRestoreResponsiveState(captured);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      targetIndex: captured.targetIndex,
      gameTime: captured.gameTime,
    });

    host.events.get("shutdown")?.();
    host.events.get("destroy")?.();
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(input.destroy).not.toHaveBeenCalled();
    expect(scene.extend.apkCaptureResponsiveState().destroyed).toBe(true);
    expect(GRIFFIN_SKY_JOUST_CANVAS).toEqual({ width: 960, height: 540 });
  });

  it("accepts all required horizontal direction values", () => {
    const directions: GriffinSkyJoustDirection[] = [-1, 0, 1];
    expect(directions).toHaveLength(3);
  });

  it("rejects invalid controller setup and action values", () => {
    expect(() => createGriffinSkyJoustController([], vi.fn())).toThrow();
    expect(() => createGriffinSkyJoustController(SENTENCES, vi.fn(), { seed: Number.POSITIVE_INFINITY })).toThrow(/seed/u);
    expect(() => createGriffinSkyJoustController(SENTENCES, vi.fn(), { rng: () => Number.NaN })).not.toThrow();
    expect(() => createGriffinSkyJoustController(SENTENCES, vi.fn(), { rng: () => 0.5 })).not.toThrow();
    expect(() => createGriffinSkyJoustController(SENTENCES, vi.fn(), { maxHealth: 0 })).toThrow(/health/u);
    expect(() => createGriffinSkyJoustController(SENTENCES, vi.fn(), { maxHealth: 1.5 })).toThrow(/health/u);

    const controller = createGriffinSkyJoustController(SENTENCES, vi.fn());
    expect(controller.flap(2 as never)).toMatchObject({ accepted: false, damaged: false });
    expect(controller.choose("unknown-action" as never)).toMatchObject({ accepted: false, terminal: false });
    expect(controller.collide("missing-knight")).toMatchObject({ accepted: false, damaged: false });
    expect(() => controller.tick(-1)).toThrow(/delta/u);
    expect(() => controller.tick(Number.NaN)).toThrow(/delta/u);
  });

  it("handles physics bounds, knight bounce, and invulnerable hazards", () => {
    const controller = createGriffinSkyJoustController(SENTENCES, vi.fn(), { seed: 17 });
    const captured = controller.capture();
    const edgeState = {
      ...captured,
      player: { ...captured.player, x: 25, y: 100, vx: -280, vy: 0 },
      knights: captured.knights.map((knight, index) => index === 0
        ? { ...knight, x: 30, vx: -90 }
        : knight),
    };
    controller.restore(edgeState);
    controller.tick(250);
    expect(controller.snapshot().player.x).toBeGreaterThanOrEqual(0);
    expect(controller.snapshot().knights[0]?.vx).toBe(90);

    const lowerState = controller.capture();
    controller.restore({
      ...lowerState,
      player: { ...lowerState.player, y: 500, vy: 600, invulnerableUntil: 0 },
    });
    controller.tick(250);
    expect(controller.snapshot().player.y).toBe(GRIFFIN_SKY_JOUST_CANVAS.height - 32);

    const damagedState = controller.capture();
    controller.restore({
      ...damagedState,
      player: { ...damagedState.player, invulnerableUntil: damagedState.gameTime + 500 },
    });
    expect(controller.applyHazard()).toMatchObject({ accepted: false, damaged: false });
  });

  it("rejects incompatible responsive state fields", () => {
    const controller = createGriffinSkyJoustController(SENTENCES, vi.fn(), { seed: 53 });
    const captured = controller.capture();
    const invalidStates: GriffinSkyJoustSnapshot[] = [
      null as never,
      { ...captured, seed: captured.seed + 1 },
      { ...captured, player: null as never },
      { ...captured, phase: "unknown" as never },
      { ...captured, targetCount: captured.targetCount + 1 },
      { ...captured, targetIndex: -1 },
      { ...captured, score: 1 },
      { ...captured, correctAnswers: 1 },
      { ...captured, totalAttempts: -1 },
      { ...captured, player: { ...captured.player, hp: captured.player.maxHp + 1 } },
      { ...captured, phase: "playing", targetIndex: captured.targetCount },
      { ...captured, phase: "victory", targetIndex: captured.targetCount - 1 },
      { ...captured, phase: "defeat", player: { ...captured.player, hp: 1 } },
      { ...captured, gameTime: -1 },
      { ...captured, player: { ...captured.player, x: -1 } },
      { ...captured, targetWord: "altered" },
      { ...captured, correctAction: "confirm" },
      { ...captured, destroyed: "no" as never },
      { ...captured, lives: 1 },
      { ...captured, lastOutcome: "unknown" as never },
      { ...captured, knights: [] },
      { ...captured, knights: captured.knights.map((knight, index) => index === 0 ? { ...knight, word: "altered" } : knight) },
      { ...captured, result: {} as never },
    ];

    for (const state of invalidStates) expect(() => controller.restore(state)).toThrow();
  });

  it("seals repeated cleanup and rejects scene restore values", () => {
    const input = fakeInputController();
    const config = createGriffinSkyJoustCartridge().createGameConfig({
      input: SENTENCES,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create(this: ReturnType<typeof sceneHost>["host"]): void;
      update(this: ReturnType<typeof sceneHost>["host"], time?: number, delta?: number): void;
      extend: { apkRestoreResponsiveState(state: unknown): void };
    };
    const host = sceneHost();
    scene.create.call(host.host);
    expect(() => scene.extend.apkRestoreResponsiveState(null)).toThrow(/state/u);

    input.set({ pointer: { ...input.snapshot().pointer, released: true, x: 480 } });
    scene.update.call(host.host, 0, 0);
    input.set({ pointer: { ...input.snapshot().pointer, released: true, cancelled: true, x: 100 } });
    scene.update.call(host.host, 0, 0);
    expect(input.snapshot).toHaveBeenCalled();

    host.events.get("shutdown")?.();
    host.events.get("destroy")?.();
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
  });
});
