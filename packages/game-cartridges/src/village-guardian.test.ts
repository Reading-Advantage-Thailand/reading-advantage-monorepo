import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  APKInputController,
  APKInputSnapshot,
  InputActionId,
} from "@reading-advantage/advantage-play-kit";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";
import { createCatalogStandardEdition } from "./catalog-standard-art.js";
import {
  VILLAGE_GUARDIAN_CANVAS,
  VILLAGE_GUARDIAN_INITIAL_LIVES,
  VILLAGE_GUARDIAN_KEYBOARD_BINDINGS,
  VILLAGE_GUARDIAN_MOVE_STEP,
  VILLAGE_GUARDIAN_WRONG_TIME_PENALTY_MS,
  chooseVillageGuardianDirectionFromPointer,
  createVillageGuardianCartridge,
  createVillageGuardianController,
  type VillageGuardianActionResult,
  type VillageGuardianController,
  type VillageGuardianSnapshot,
} from "./village-guardian.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SENTENCES = [
  { term: "find the gate", translation: "locate the entrance" },
  { term: "guard the home", translation: "protect the village" },
] as const;

function inputSnapshot(
  overrides: Omit<Partial<APKInputSnapshot>, "pointer"> & {
    readonly pointer?: Partial<APKInputSnapshot["pointer"]>;
  } = {},
): APKInputSnapshot {
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

function mutableInputController(): APKInputController & {
  setSnapshot(snapshot: APKInputSnapshot): void;
} {
  let current = inputSnapshot();
  return {
    snapshot: vi.fn(() => current),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
    setSnapshot(snapshot): void {
      current = snapshot;
    },
  };
}

function sceneHost() {
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
    value: string;
    setPosition: ReturnType<typeof vi.fn>;
    setText: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const createText = () => {
    const text = {
      value: "",
      setPosition: vi.fn(),
      setText: vi.fn((value: string) => {
        text.value = value;
        return text;
      }),
      destroy: vi.fn(),
    };
    text.setPosition.mockReturnValue(text);
    texts.push(text);
    return text;
  };
  const sprites: Array<Record<string, ReturnType<typeof vi.fn>>> = [];
  const createSprite = () => {
    const sprite: Record<string, ReturnType<typeof vi.fn>> = {
      setOrigin: vi.fn(() => sprite),
      setDisplaySize: vi.fn(() => sprite),
      setDepth: vi.fn(() => sprite),
      setPosition: vi.fn(() => sprite),
      setVisible: vi.fn(() => sprite),
      setFlipX: vi.fn(() => sprite),
      setAngle: vi.fn(() => sprite),
      setAlpha: vi.fn(() => sprite),
      destroy: vi.fn(),
    };
    sprites.push(sprite);
    return sprite;
  };
  const loadedImages: string[] = [];
  const listeners = new Map<string, () => void>();
  const host = {
    add: {
      graphics: vi.fn(() => graphics),
      text: vi.fn(() => createText()),
      sprite: vi.fn(() => createSprite()),
      image: vi.fn(() => createSprite()),
      tileSprite: vi.fn(() => createSprite()),
    },
    load: {
      image: vi.fn((key: string) => loadedImages.push(key)),
      spritesheet: vi.fn((key: string) => loadedImages.push(key)),
      audio: vi.fn(),
    },
    events: {
      once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
    },
    game: {
      canvas: {
        getBoundingClientRect: () => ({ left: 0, width: VILLAGE_GUARDIAN_CANVAS.width }),
      },
    },
    scale: VILLAGE_GUARDIAN_CANVAS,
  };

  return {
    host,
    graphics,
    texts,
    sprites,
    loadedImages,
    emit(event: string): void {
      listeners.get(event)?.();
    },
  };
}

function actionToward(
  player: Readonly<{ x: number; y: number }>,
  target: Readonly<{ x: number; y: number }>,
): VillageGuardianSnapshot["correctAction"] {
  const horizontal = target.x - player.x;
  const vertical = target.y - player.y;
  if (Math.abs(horizontal) >= Math.abs(vertical) && horizontal !== 0) {
    return horizontal > 0 ? "move-right" : "move-left";
  }
  return vertical >= 0 ? "move-down" : "move-up";
}

function placeOn(
  controller: VillageGuardianController,
  destination: Readonly<{ x: number; y: number }>,
): void {
  const captured = controller.capture();
  const target = captured.villagers.find(
    (villager) => villager.orderIndex === captured.levelTargetIndex && !villager.collected,
  ) ?? captured.villagers[Math.max(0, Math.min(captured.levelTargetIndex, captured.villagers.length - 1))];
  controller.restore({
    ...captured,
    player: { x: destination.x, y: destination.y },
    correctAction: target ? actionToward(destination, target) : "move-down",
  });
}

function moveTo(
  controller: VillageGuardianController,
  destination: Readonly<{ x: number; y: number }>,
): VillageGuardianActionResult {
  const startingLevel = controller.snapshot().level;
  const startingTargetIndex = controller.snapshot().targetIndex;
  let last: VillageGuardianActionResult | undefined;
  let guard = 0;
  while (
    controller.snapshot().phase === "playing"
    && controller.snapshot().level === startingLevel
    && controller.snapshot().targetIndex === startingTargetIndex
    && (controller.snapshot().player.x !== destination.x || controller.snapshot().player.y !== destination.y)
  ) {
    const state = controller.snapshot();
    const horizontalDistance = Math.abs(destination.x - state.player.x);
    const verticalDistance = Math.abs(destination.y - state.player.y);
    const action: InputActionId = horizontalDistance >= verticalDistance
      ? state.player.x < destination.x ? "move-right" : "move-left"
      : state.player.y < destination.y ? "move-down" : "move-up";
    last = controller.choose(action);
    guard += 1;
    if (guard > 200) throw new Error(`The guardian could not reach the destination: ${JSON.stringify(controller.snapshot())}`);
  }
  return last ?? {
    accepted: false,
    correct: false,
    progressed: false,
    terminal: false,
    completed: false,
    snapshot: controller.snapshot(),
  };
}

function rescueLevel(controller: VillageGuardianController): void {
  const level = controller.snapshot().level;
  let iterations = 0;
  while (controller.snapshot().phase === "playing" && controller.snapshot().level === level) {
    iterations += 1;
    if (iterations > 20) throw new Error(`Rescue loop stalled: ${JSON.stringify(controller.snapshot())}`);
    const state = controller.snapshot();
    const target = state.villagers.find(
      (villager) => !villager.collected && !villager.hiding && villager.orderIndex === state.levelTargetIndex,
    );
    if (!target) {
      if (state.villagers.some(({ hiding }) => hiding)) {
        controller.tick(2_000);
        continue;
      }
      moveTo(controller, state.sanctuary);
      continue;
    }
    moveTo(controller, target);
  }
}

describe("Village Guardian bespoke cartridge", () => {
  it("keeps deterministic positioned villagers and exposes four-way movement", () => {
    const first = createVillageGuardianController(SENTENCES, vi.fn(), { seed: 7 });
    const second = createVillageGuardianController(SENTENCES, vi.fn(), { seed: 7 });
    const initial = first.snapshot();

    expect(initial).toMatchObject({
      phase: "playing",
      level: 1,
      levelCount: 2,
      targetIndex: 0,
      targetCount: 6,
      levelTargetIndex: 0,
      prompt: SENTENCES[0].translation,
      answer: "find",
      seed: 7,
      lives: 3,
      energy: 3,
      trail: [],
      collectedWords: [],
      destroyed: false,
      result: undefined,
    });
    expect(initial.availableActions).toEqual([
      "move-left",
      "move-right",
      "move-up",
      "move-down",
    ]);
    expect(initial.villagers).toHaveLength(3);
    expect(initial.villagers.map(({ x, y }) => ({ x, y }))).toEqual(
      second.snapshot().villagers.map(({ x, y }) => ({ x, y })),
    );

    const differentSeed = createVillageGuardianController(SENTENCES, vi.fn(), { seed: 8 }).snapshot();
    expect(differentSeed.villagers.map(({ x, y }) => ({ x, y }))).not.toEqual(
      initial.villagers.map(({ x, y }) => ({ x, y })),
    );
    expect(differentSeed.monsters.map(({ x, y, velocityX, velocityY }) => ({ x, y, velocityX, velocityY }))).not.toEqual(
      initial.monsters.map(({ x, y, velocityX, velocityY }) => ({ x, y, velocityX, velocityY })),
    );

    const moved = first.choose("move-right");
    expect(moved.accepted).toBe(true);
    expect(moved.snapshot.player.x).toBe(initial.player.x + VILLAGE_GUARDIAN_MOVE_STEP);
    expect(moved.snapshot.player.y).toBe(initial.player.y);
  });

  it("counts a wrong villager, keeps the target, and resets the villager trail", () => {
    const controller = createVillageGuardianController(SENTENCES, vi.fn());
    const firstVillager = controller.snapshot().villagers[0];
    if (!firstVillager) throw new Error("The test needs a first villager");
    moveTo(controller, firstVillager);

    const beforeWrong = controller.snapshot();
    const wrongVillager = beforeWrong.villagers.find(
      (villager) => villager.orderIndex === beforeWrong.levelTargetIndex + 1,
    );
    if (!wrongVillager) throw new Error("The test needs a wrong villager away from the current path");
    const wrong = moveTo(controller, wrongVillager);

    expect(wrong).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(wrong.snapshot.targetIndex).toBe(0);
    expect(wrong.snapshot.levelTargetIndex).toBe(0);
    expect(wrong.snapshot.trail).toEqual([]);
    expect(wrong.snapshot.villagers.filter(({ collected }) => collected)).toEqual([]);
    expect(wrong.snapshot.answer).toBe("find");
    expect(wrong.snapshot.totalAttempts).toBe(2);
    expect(wrong.snapshot.score).toBe(100);
    expect(wrong.snapshot.remainingTimeMs).toBe(
      beforeWrong.remainingTimeMs - VILLAGE_GUARDIAN_WRONG_TIME_PENALTY_MS,
    );
    expect(wrong.snapshot.villagers.find(({ id }) => id === wrongVillager.id)).toMatchObject({
      hiding: true,
      hiddenUntilMs: expect.any(Number),
    });

    controller.tick(2_000);
    expect(controller.snapshot().villagers.find(({ id }) => id === wrongVillager.id)?.hiding).toBe(false);

    const retainedTarget = controller.snapshot().villagers.find(({ orderIndex }) => orderIndex === 0);
    if (!retainedTarget) throw new Error("The test needs the retained target villager");
    const retainedResult = moveTo(controller, retainedTarget);
    expect(retainedResult.correct, JSON.stringify({ result: retainedResult, state: controller.snapshot() })).toBe(true);
    expect(controller.snapshot().targetIndex).toBe(1);
  });

  it("moves rescued trail segments behind the player at a stable spacing", () => {
    const controller = createVillageGuardianController([{ term: "find", translation: "locate" }], vi.fn());
    const target = controller.snapshot().villagers[0];
    if (!target) throw new Error("The test needs one villager");
    moveTo(controller, target);
    const collected = controller.snapshot();
    const initialSegment = collected.trail[0];
    if (!initialSegment) throw new Error("The test needs one trail segment");

    for (let index = 0; index < 8; index += 1) controller.choose("move-right");

    const moved = controller.snapshot();
    const segment = moved.trail[0];
    if (!segment) throw new Error("The test needs the moving trail segment");
    expect(segment.x).toBeGreaterThan(initialSegment.x);
    expect(Math.hypot(moved.player.x - segment.x, moved.player.y - segment.y)).toBeCloseTo(72);
  });

  it("lets a monster disrupt the trail before it costs a life", () => {
    const controller = createVillageGuardianController(SENTENCES, vi.fn());
    const firstVillager = controller.snapshot().villagers[0];
    if (!firstVillager) throw new Error("The test needs a villager");
    moveTo(controller, firstVillager);

    const beforeDisruption = controller.snapshot();
    const disrupted = controller.applyMonster();
    expect(disrupted).toMatchObject({ accepted: true, progressed: false, terminal: false });
    expect(disrupted.snapshot.trail).toHaveLength(0);
    expect(disrupted.snapshot.targetIndex).toBe(0);
    expect(disrupted.snapshot.lives).toBe(beforeDisruption.lives);
    expect(disrupted.snapshot.lastEvent).toBe("monster-disrupted-trail");

    const lifeLoss = controller.applyMonster();
    expect(lifeLoss.snapshot.lives).toBe(beforeDisruption.lives - 1);
    expect(lifeLoss.snapshot.lastEvent).toBe("monster-hit-guardian");
  });

  it("rescatters the trail from the segment that the moving monster hits", () => {
    const controller = createVillageGuardianController(SENTENCES, vi.fn());
    const first = controller.snapshot().villagers[0];
    if (!first) throw new Error("The test needs a first villager");
    moveTo(controller, first);
    const second = controller.snapshot().villagers[1];
    if (!second) throw new Error("The test needs a second villager");
    moveTo(controller, second);

    const captured = controller.capture();
    const firstTrail = captured.trail[0];
    const monster = captured.monsters[0];
    if (!firstTrail || !monster) throw new Error("The test needs a trail and a monster");
    controller.restore({
      ...captured,
      monsters: [{ ...monster, x: firstTrail.x, y: firstTrail.y }],
    });

    const disrupted = controller.tick(0);

    expect(disrupted.trail).toEqual([]);
    expect(disrupted.targetIndex).toBe(0);
    expect(disrupted.villagers.filter(({ collected }) => collected)).toHaveLength(0);
  });

  it("resets the full trail when a monster collides with the player", () => {
    const controller = createVillageGuardianController(SENTENCES, vi.fn());
    const first = controller.snapshot().villagers[0];
    if (!first) throw new Error("The test needs a first villager");
    moveTo(controller, first);
    const second = controller.snapshot().villagers[1];
    if (!second) throw new Error("The test needs a second villager");
    moveTo(controller, second);

    const beforeCollision = controller.snapshot();
    expect(beforeCollision.trail).toHaveLength(2);
    const monster = beforeCollision.monsters[0];
    if (!monster) throw new Error("The test needs a monster");
    controller.restore({
      ...beforeCollision,
      monsters: [{ ...monster, x: beforeCollision.player.x, y: beforeCollision.player.y }],
    });

    const collision = controller.tick(0);

    expect(collision).toMatchObject({
      targetIndex: 0,
      levelTargetIndex: 0,
      trail: [],
      collectedWords: [],
      lives: beforeCollision.lives,
      lastOutcome: "hazard",
      lastEvent: "monster-disrupted-trail",
    });
    expect(collision.villagers.filter(({ collected }) => collected)).toEqual([]);
  });

  it("requires the complete trail at sanctuary and advances through every sentence level", () => {
    const controller = createVillageGuardianController(SENTENCES, vi.fn());
    let earlySanctuary: VillageGuardianActionResult = {
      accepted: false,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      snapshot: controller.snapshot(),
    };
    for (let index = 0; index < 12; index += 1) earlySanctuary = controller.choose("move-down");
    for (let index = 0; index < 25; index += 1) earlySanctuary = controller.choose("move-right");
    expect(earlySanctuary.snapshot.level).toBe(1);
    expect(earlySanctuary.snapshot.phase).toBe("playing");
    expect(earlySanctuary.snapshot.targetIndex).toBe(0);

    rescueLevel(controller);
    expect(controller.snapshot()).toMatchObject({ level: 2, targetIndex: 3, trail: [] });

    rescueLevel(controller);
    expect(controller.snapshot()).toMatchObject({
      phase: "victory",
      level: 2,
      targetIndex: 6,
      targetCount: 6,
      trail: expect.arrayContaining([
        expect.objectContaining({ word: "guard" }),
        expect.objectContaining({ word: "the" }),
        expect.objectContaining({ word: "home" }),
      ]),
    });
  });

  it("defeats on zero lives or expired time and never emits more than one result", () => {
    const defeat = vi.fn();
    const controller = createVillageGuardianController(SENTENCES, defeat, { timeLimitMs: 100 });
    controller.tick(101);
    expect(controller.snapshot()).toMatchObject({ phase: "defeat", lives: 3, remainingTimeMs: 0 });
    expect(controller.snapshot().result).toMatchObject({ score: 0, totalAttempts: 0 });
    expect(defeat).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(defeat.mock.calls[0]?.[0])).toEqual({
      accuracy: 0,
      xp: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });

    for (let index = 0; index < 4; index += 1) controller.applyMonster();
    expect(controller.snapshot().phase).toBe("defeat");
    expect(defeat).toHaveBeenCalledOnce();

    const livesDefeat = vi.fn();
    const livesController = createVillageGuardianController(SENTENCES, livesDefeat);
    for (let index = 0; index < VILLAGE_GUARDIAN_INITIAL_LIVES; index += 1) livesController.applyMonster();
    expect(livesController.snapshot()).toMatchObject({ phase: "defeat", lives: 0 });
    expect(livesDefeat).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(livesDefeat.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
  });

  it("emits the exact victory result after the final sanctuary", () => {
    const complete = vi.fn();
    const controller = createVillageGuardianController(SENTENCES, complete);
    rescueLevel(controller);
    rescueLevel(controller);

    const result = gameResultsSchema.parse(complete.mock.calls[0]?.[0]);
    expect(result).toEqual({
      accuracy: 1,
      xp: 70,
      score: 600,
      correctAnswers: 6,
      totalAttempts: 6,
    });
    expect(controller.snapshot().result).toEqual(result);
    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith(expect.any(Object), "victory");

    const restored = createVillageGuardianController(SENTENCES, vi.fn());
    restored.restore(controller.capture());
    expect(restored.snapshot()).toEqual(controller.snapshot());
    expect(controller.choose("move-left")).toMatchObject({ accepted: false, terminal: false });
  });

  it("restores the complete responsive contract and rejects incompatible state", () => {
    const controller = createVillageGuardianController(SENTENCES, vi.fn(), { seed: 23 });
    const captured = controller.capture();

    controller.choose("move-right");
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);
    expect(() => controller.restore({ ...captured, seed: 24 })).toThrow(/seed/i);
    expect(() => controller.restore({ ...captured, targetIndex: 1 })).toThrow(/target/i);
    expect(() => controller.restore({ ...captured, energy: 2 })).toThrow(/energy|lives/i);
  });

  it("restores every snapshot capture can emit after legal wrong-villager and trail play", () => {
    const controller = createVillageGuardianController(SENTENCES, vi.fn(), { seed: 23 });
    const first = controller.snapshot().villagers.find(({ orderIndex }) => orderIndex === 0);
    const second = controller.snapshot().villagers.find(({ orderIndex }) => orderIndex === 1);
    if (!first || !second) throw new Error("The test needs the first two villagers");

    placeOn(controller, second);
    controller.choose("move-left");
    const afterWrong = controller.capture();
    expect(afterWrong).toMatchObject({ lastEvent: "wrong-villager", trail: [] });
    expect(afterWrong.villagers.find(({ id }) => id === second.id)).toMatchObject({ hiding: true });
    expect(() => controller.restore(afterWrong)).not.toThrow();
    expect(controller.snapshot()).toEqual(afterWrong);

    const firstAfterReset = controller.snapshot().villagers.find(({ orderIndex }) => orderIndex === 0);
    if (!firstAfterReset) throw new Error("The test needs the reset first villager");
    moveTo(controller, firstAfterReset);
    const hidingTarget = controller.capture();
    expect(hidingTarget.targetIndex).toBe(1);
    expect(hidingTarget.trail).toHaveLength(1);
    expect(hidingTarget.villagers.find(({ orderIndex }) => orderIndex === 1)).toMatchObject({ hiding: true });
    expect(() => controller.restore(hidingTarget)).not.toThrow();
    expect(controller.snapshot()).toEqual(hidingTarget);

    const oneWord = createVillageGuardianController([{ term: "find", translation: "locate" }], vi.fn(), { seed: 23 });
    const onlyVillager = oneWord.snapshot().villagers[0];
    if (!onlyVillager) throw new Error("The test needs the one-word villager");
    moveTo(oneWord, onlyVillager);
    oneWord.choose("move-left");
    const fullTrail = oneWord.capture();
    expect(fullTrail).toMatchObject({ phase: "playing", trail: [{ word: "find" }], levelTargetIndex: 1 });
    expect(fullTrail.player.x).not.toBe(onlyVillager.x);
    expect(() => oneWord.restore(fullTrail)).not.toThrow();
    expect(oneWord.snapshot()).toEqual(fullTrail);
  });

  it("supports keyboard and touch or pointer D-pad input in the bespoke scene", () => {
    expect(VILLAGE_GUARDIAN_KEYBOARD_BINDINGS).toMatchObject({
      ArrowLeft: "move-left",
      ArrowRight: "move-right",
      ArrowUp: "move-up",
      ArrowDown: "move-down",
    });
    expect(chooseVillageGuardianDirectionFromPointer(850, 390, 960, 540)).toBe("move-up");
    expect(chooseVillageGuardianDirectionFromPointer(790, 450, 960, 540)).toBe("move-left");
    expect(chooseVillageGuardianDirectionFromPointer(910, 450, 960, 540)).toBe("move-right");
    expect(chooseVillageGuardianDirectionFromPointer(850, 510, 960, 540)).toBe("move-down");
    expect(chooseVillageGuardianDirectionFromPointer(220, 120, 960, 540)).toBeUndefined();
    expect(chooseVillageGuardianDirectionFromPointer(400, 270, 960, 540)).toBeUndefined();
    expect(chooseVillageGuardianDirectionFromPointer(850, 438, 960, 540)).toBeUndefined();

    const inputController = mutableInputController();
    const diagnostic = vi.fn();
    const cartridge = createVillageGuardianCartridge();
    expect(cartridge.manifest).toMatchObject({
      id: "village-guardian",
      title: "Village Guardian",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
    });
    expect(cartridge.standardExperience.definition).toMatchObject({
      briefing: { startPhase: "tutorial" },
      tutorial: { lifecycle: { productionEffects: { emitGameResults: false } } },
      debrief: { outcome: "complete", replayEntry: "briefing" },
    });
    const config = cartridge.createGameConfig({
      input: [...SENTENCES],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic,
      inputController,
      seed: 5,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: { apkCaptureResponsiveState: () => VillageGuardianSnapshot };
    };
    const host = sceneHost();
    scene.create.call(host.host);
    const initial = scene.extend.apkCaptureResponsiveState();

    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowRight"] }));
    scene.update.call(host.host, 0, 16);
    const keyboardMoved = scene.extend.apkCaptureResponsiveState();
    expect(host.texts.some((text) => text.value === "find")).toBe(true);
    expect(keyboardMoved.player.x).toBe(initial.player.x + VILLAGE_GUARDIAN_MOVE_STEP);

    inputController.setSnapshot(inputSnapshot({
      pointer: { released: true, startX: 850, startY: 510, x: 850, y: 510 },
    }));
    scene.update.call(host.host, 16, 16);
    expect(scene.extend.apkCaptureResponsiveState().player.y).toBe(
      keyboardMoved.player.y + VILLAGE_GUARDIAN_MOVE_STEP,
    );

    const afterDpad = scene.extend.apkCaptureResponsiveState();
    const playfieldVillager = afterDpad.villagers[0];
    if (!playfieldVillager) throw new Error("The test needs a villager on the playfield");
    inputController.setSnapshot(inputSnapshot({
      pointer: {
        released: true,
        startX: playfieldVillager.x,
        startY: playfieldVillager.y,
        x: playfieldVillager.x,
        y: playfieldVillager.y,
      },
    }));
    scene.update.call(host.host, 32, 16);
    expect(scene.extend.apkCaptureResponsiveState().player).toEqual(afterDpad.player);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "VILLAGE_GUARDIAN_READY" }));
  });

  it("rejects invalid session settings and handles boundary hazards", () => {
    expect(() => createVillageGuardianController(SENTENCES, vi.fn(), { timeLimitMs: 0 })).toThrow(/time limit/i);
    expect(() => createVillageGuardianController(SENTENCES, vi.fn(), { wrongTimePenaltyMs: -1 })).toThrow(/penalty/i);
    expect(() => createVillageGuardianController(SENTENCES, vi.fn(), { wrongTimePenaltyMs: Number.NaN })).toThrow(/penalty/i);
    expect(() => createVillageGuardianController(SENTENCES, vi.fn(), { initialLives: 0 })).toThrow(/lives/i);

    const terminalDelivery = vi.fn();
    const controller = createVillageGuardianController(
      [{ term: "first second", translation: "two words" }],
      terminalDelivery,
      { timeLimitMs: 1_000, wrongTimePenaltyMs: 1_000 },
    );
    const wrong = controller.snapshot().villagers.find(({ orderIndex }) => orderIndex === 1);
    const target = controller.snapshot().villagers.find(({ orderIndex }) => orderIndex === 0);
    if (!wrong || !target) throw new Error("The test needs both villagers");
    const horizontal = target.x - wrong.x;
    const vertical = target.y - wrong.y;
    const correctAction = Math.abs(horizontal) >= Math.abs(vertical)
      ? horizontal > 0 ? "move-right" : "move-left"
      : vertical >= 0 ? "move-down" : "move-up";
    controller.restore({ ...controller.capture(), player: { x: wrong.x, y: wrong.y }, correctAction });
    const result = controller.choose("move-left");
    expect(result).toMatchObject({ terminal: true, completed: true, snapshot: { phase: "defeat", lastEvent: "timer-expired" } });
    expect(terminalDelivery).toHaveBeenCalledOnce();

    const bounced = createVillageGuardianController(SENTENCES, vi.fn(), { seed: 4 });
    const captured = bounced.capture();
    const monster = captured.monsters[0];
    if (!monster) throw new Error("The test needs a monster");
    bounced.restore({
      ...captured,
      monsters: [{ ...monster, x: VILLAGE_GUARDIAN_CANVAS.width - 220, y: 432, velocityX: 1, velocityY: 1 }],
    });
    const next = bounced.tick(1_000);
    expect(next.monsters[0]).toMatchObject({ x: 740, y: 432, velocityX: expect.any(Number), velocityY: expect.any(Number) });
    expect(next.monsters[0]?.velocityX).toBeLessThan(0);
    expect(next.monsters[0]?.velocityY).toBeLessThan(0);
    expect(() => bounced.tick(-1)).toThrow(/frame delta/i);
  });

  it("runs tutorial and demo actions through the controller without delivery", () => {
    for (const sessionMode of ["tutorial", "demo"] as const) {
      const complete = vi.fn();
      const cartridge = createVillageGuardianCartridge();
      const config = cartridge.createGameConfig({
        input: [{ term: "alone word", translation: "single" }],
        edition: PHASE3_RUNTIME_EDITION,
        complete,
        diagnostic: vi.fn(),
        inputController: mutableInputController(),
        sessionMode,
        seed: 37,
      });
      const definition = cartridge.standardExperience.definition;
      const driver = cartridge.standardExperience.createTutorialActionDriver();
      for (const step of definition.tutorial.steps) {
        driver.execute({
          tutorial: definition.tutorial,
          step,
          seed: definition.tutorial.seed,
          mode: "tutorial",
          diagnostics: { report: vi.fn() },
        });
      }

      const state = (config.scene as {
        extend: { apkCaptureResponsiveState: () => VillageGuardianSnapshot };
      }).extend.apkCaptureResponsiveState();
      expect(state).toMatchObject({ totalAttempts: 2, correctAnswers: 1, targetIndex: 1 });
      expect(state.villagers.find(({ orderIndex }) => orderIndex === 1)).toMatchObject({ hiding: true });
      expect(complete).not.toHaveBeenCalled();
    }
  });

  it("uses the wrong-villager tutorial consequence without delivering a result", () => {
    const complete = vi.fn();
    const cartridge = createVillageGuardianCartridge();
    const config = cartridge.createGameConfig({
      input: [{ term: "find", translation: "locate the entrance" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: mutableInputController(),
      sessionMode: "tutorial",
      seed: 41,
    });
    const scene = config.scene as {
      extend: { apkCaptureResponsiveState: () => VillageGuardianSnapshot };
    };
    const definition = cartridge.standardExperience.definition;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const correctStep = definition.tutorial.steps[1];
    const incorrectStep = definition.tutorial.steps[0];
    if (!correctStep || !incorrectStep) throw new Error("The test needs tutorial steps");

    driver.execute({
      tutorial: definition.tutorial,
      step: correctStep,
      seed: definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });
    const beforeIncorrect = scene.extend.apkCaptureResponsiveState();
    expect(beforeIncorrect).toMatchObject({ targetIndex: 1, trail: [{ word: "find" }] });

    driver.execute({
      tutorial: definition.tutorial,
      step: incorrectStep,
      seed: definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });
    const afterIncorrect = scene.extend.apkCaptureResponsiveState();
    expect(afterIncorrect).toMatchObject({
      targetIndex: 0,
      levelTargetIndex: 0,
      trail: [],
      lastOutcome: "incorrect",
      lastEvent: "wrong-villager",
      remainingTimeMs: beforeIncorrect.remainingTimeMs - VILLAGE_GUARDIAN_WRONG_TIME_PENALTY_MS,
    });
    expect(afterIncorrect.villagers.find(({ orderIndex }) => orderIndex === 0)).toMatchObject({
      collected: false,
      hiding: false,
    });
    expect(afterIncorrect.villagers.find(({ id }) => id === "tutorial-wrong-villager")).toMatchObject({
      orderIndex: -1,
      hiding: true,
      word: "find",
    });
    expect(afterIncorrect.result).toBeUndefined();
    expect(complete).not.toHaveBeenCalled();
  });

  it("uses the vertical tutorial decoy fallback at the arena boundary", () => {
    let fallback: VillageGuardianSnapshot | undefined;
    for (let seed = 0; seed < 100 && !fallback; seed += 1) {
      const controller = createVillageGuardianController(
        [{ term: "find", translation: "locate" }],
        vi.fn(),
        { seed, tutorialOnly: true },
      );
      const captured = controller.capture();
      controller.restore({
        ...captured,
        player: { ...captured.player, x: 60 },
        correctAction: "move-right",
      });
      const result = controller.demonstrate(false);
      const decoy = result.snapshot.villagers.find(({ id }) => id === "tutorial-wrong-villager");
      if (decoy?.x === 60) fallback = result.snapshot;
    }

    expect(fallback).toMatchObject({
      lastEvent: "wrong-villager",
      villagers: expect.arrayContaining([
        expect.objectContaining({ id: "tutorial-wrong-villager", x: 60, hiding: true, word: "find" }),
      ]),
    });
    expect(fallback?.villagers.every((villager) => villager.word !== "tutorial wrong")).toBe(true);
  });

  it("preserves responsive state, avoids legacy factories, and cleans every scene resource", () => {
    const source = readFileSync(resolve(ROOT, "packages/game-cartridges/src/village-guardian.ts"), "utf8");
    expect(source).not.toContain("createLegacyCatalog");
    expect(source).not.toMatch(/from ["']phaser["']/u);

    const inputController = mutableInputController();
    const complete = vi.fn();
    const config = createVillageGuardianCartridge().createGameConfig({
      input: [...SENTENCES],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: {
        apkCaptureResponsiveState: () => VillageGuardianSnapshot;
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const host = sceneHost();
    scene.create.call(host.host);
    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowRight"] }));
    scene.update.call(host.host, 0, 16);
    const captured = scene.extend.apkCaptureResponsiveState();
    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowRight"] }));
    scene.update.call(host.host, 16, 16);
    scene.extend.apkRestoreResponsiveState(captured);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(captured);
    scene.extend.apkRecompose({ profile: "compact" });
    expect(() => scene.extend.apkRestoreResponsiveState(null)).toThrow(/responsive/i);

    host.emit("shutdown");
    host.emit("destroy");
    expect(scene.extend.apkCaptureResponsiveState().destroyed).toBe(true);
    expect(inputController.cancelActiveGesture).toHaveBeenCalledOnce();
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(host.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect(complete).not.toHaveBeenCalled();
  });

  it("rejects inconsistent responsive entities and lifecycle state", () => {
    const controller = createVillageGuardianController(SENTENCES, vi.fn(), { seed: 23 });
    const captured = controller.capture();

    expect(() => controller.restore(null as never)).toThrow(/object/i);
    expect(() => controller.restore({ ...captured, phase: "invalid" as never })).toThrow(/phase/i);
    expect(() => controller.restore({ ...captured, mechanic: "other" as never })).toThrow(/mechanic/i);
    expect(() => controller.restore({ ...captured, seed: 24 })).toThrow(/seed/i);
    expect(() => controller.restore({ ...captured, levelCount: 99 })).toThrow(/content count/i);
    expect(() => controller.restore({ ...captured, level: 0 })).toThrow(/level/i);
    expect(() => controller.restore({ ...captured, targetIndex: -1 })).toThrow(/target index/i);
    expect(() => controller.restore({ ...captured, levelTargetIndex: 1 })).toThrow(/target index/i);
    expect(() => controller.restore({ ...captured, lives: 0 })).toThrow(/energy|lives|terminal/i);
    expect(() => controller.restore({ ...captured, energy: 2 })).toThrow(/energy/i);
    expect(() => controller.restore({ ...captured, remainingTimeMs: -1 })).toThrow(/timer/i);
    expect(() => controller.restore({ ...captured, elapsedMs: Number.NaN })).toThrow(/lifecycle/i);
    expect(() => controller.restore({ ...captured, lastOutcome: "other" as never })).toThrow(/outcome/i);
    expect(() => controller.restore({ ...captured, score: 1 })).toThrow(/counters/i);
    expect(() => controller.restore({ ...captured, correctAnswers: 1 })).toThrow(/counters/i);
    expect(() => controller.restore({ ...captured, villagers: [] })).toThrow(/entities/i);
    expect(() => controller.restore({ ...captured, monsters: [] })).toThrow(/entities/i);
    expect(() => controller.restore({ ...captured, sanctuary: { ...captured.sanctuary, x: 1 } })).toThrow(/sanctuary/i);
    expect(() => controller.restore({ ...captured, player: { x: 1, y: captured.player.y } })).toThrow(/player/i);
    expect(() => controller.restore({
      ...captured,
      villagers: captured.villagers.map((villager) => ({ ...villager, word: "tampered" })),
    })).toThrow(/villager state/i);
    expect(() => controller.restore({ ...captured, correctAction: "move-left" })).toThrow(/action state/i);
    expect(() => controller.restore({ ...captured, collectedWords: ["tampered"] })).toThrow(/action state/i);
    expect(() => controller.restore({
      ...captured,
      result: { accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 },
    })).toThrow(/active|terminal result/i);
  });

  it("rejects empty or non-canonical sentence content", () => {
    expect(() => createVillageGuardianController([], vi.fn())).toThrow(/empty/i);
    expect(() => createVillageGuardianController([
      { ...SENTENCES[0], legacyId: "not-accepted" },
    ], vi.fn())).toThrow();
    expect(() => createVillageGuardianController([
      { term: " ", translation: "blank" },
    ], vi.fn())).toThrow(/blank/i);
  });

  it("moves the standard-pack player sprite with the player, and never pins it to a fixed corner", () => {
    const inputController = mutableInputController();
    const cartridge = createVillageGuardianCartridge();
    const config = cartridge.createGameConfig({
      input: [...SENTENCES],
      edition: createCatalogStandardEdition(["world:ground", "player:idle", "enemy:idle"], "/pack", "village-guardian"),
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 5,
    });
    const scene = config.scene as {
      preload: (this: unknown) => void;
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: { apkCaptureResponsiveState: () => VillageGuardianSnapshot };
    };
    const host = sceneHost();
    scene.preload.call(host.host);
    scene.create.call(host.host);

    expect(host.loadedImages.length, "the cartridge must load its own art").toBeGreaterThan(0);
    const playerSprite = host.sprites.find((sprite) => sprite.setPosition.mock.calls.length > 0);
    expect(playerSprite, "the player must own a sprite").toBeDefined();
    const before = playerSprite!.setPosition.mock.calls.at(-1);

    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowRight"] }));
    scene.update.call(host.host, 0, 16);
    const after = playerSprite!.setPosition.mock.calls.at(-1);

    expect(after, "the sprite must follow the player").not.toEqual(before);
    expect(scene.extend.apkCaptureResponsiveState().player.x).toBeGreaterThan(0);
  });

});
