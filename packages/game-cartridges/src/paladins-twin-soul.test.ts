import type {
  APKInputController,
  APKInputSnapshot,
} from "@reading-advantage/advantage-play-kit";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import {
  PALADINS_TWIN_SOUL_CANVAS,
  PALADINS_TWIN_SOUL_KEYBOARD_BINDINGS,
  PALADINS_TWIN_SOUL_RULES,
  createPaladinsTwinSoulCartridge,
  createPaladinsTwinSoulController,
  type PaladinsTwinSoulController,
  type PaladinsTwinSoulSnapshot,
} from "./paladins-twin-soul.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const VOCABULARY = [
  { term: "ward", translation: "protect" },
  { term: "reunite", translation: "join" },
] as const;
const FOUR_WORD_LIST = [
  { term: "ward", translation: "protect" },
  { term: "reunite", translation: "join" },
  { term: "oath", translation: "promise" },
  { term: "shield", translation: "guard" },
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

function createMutableInputController(): APKInputController & {
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

function createSceneHost(canvasWidth = 960, sceneSize = { width: 960, height: 540 }) {
  const loadedImages: string[] = [];
  const loadedSheets: string[] = [];
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
    setBackgroundColor: ReturnType<typeof vi.fn>;
    setPadding: ReturnType<typeof vi.fn>;
    setOrigin: ReturnType<typeof vi.fn>;
    setWordWrapWidth: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const createText = () => {
    const text = {
      setPosition: vi.fn(),
      setText: vi.fn(),
      setFontSize: vi.fn(),
      setBackgroundColor: vi.fn(),
      setPadding: vi.fn(),
      setOrigin: vi.fn(),
      setWordWrapWidth: vi.fn(),
      destroy: vi.fn(),
    };
    text.setPosition.mockReturnValue(text);
    text.setText.mockReturnValue(text);
    text.setFontSize.mockReturnValue(text);
    text.setBackgroundColor.mockReturnValue(text);
    text.setPadding.mockReturnValue(text);
    text.setOrigin.mockReturnValue(text);
    text.setWordWrapWidth.mockReturnValue(text);
    texts.push(text);
    return text;
  };

  const listeners = new Map<string, () => void>();
  const host = {
    load: {
      image: vi.fn((key: string) => loadedImages.push(key)),
      spritesheet: vi.fn((key: string) => loadedSheets.push(key)),
    },
    add: {
      graphics: vi.fn(() => graphics),
      text: vi.fn(() => createText()),
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
    loadedImages,
    loadedSheets,
    texts,
    emit(event: string): void {
      listeners.get(event)?.();
    },
  };
}

function clearTarget(controller: PaladinsTwinSoulController): void {
  const result = controller.choose(controller.snapshot().correctAction);
  if (!result.correct || !result.progressed) throw new Error("Target was not cleared");
}

function currentTargetEnemy(controller: PaladinsTwinSoulController) {
  const state = controller.snapshot();
  const enemy = state.enemies.find((candidate) => candidate.id === state.correctAction);
  if (!enemy) throw new Error("Expected a current vocabulary target");
  return enemy;
}

function moveUnderEnemy(controller: PaladinsTwinSoulController, enemyId: string): void {
  for (let step = 0; step < 240; step += 1) {
    const state = controller.snapshot();
    if (state.phase !== "playing") return;
    const enemy = state.enemies.find((candidate) => candidate.id === enemyId);
    if (!enemy) return;
    if (Math.abs(state.player.x - enemy.x) <= PALADINS_TWIN_SOUL_RULES.enemyWidth / 4) return;
    controller.tick(16, state.player.x < enemy.x ? 1 : -1);
  }
}

function fireAtCurrentTarget(controller: PaladinsTwinSoulController): void {
  const targetId = controller.snapshot().correctAction;
  moveUnderEnemy(controller, targetId);
  const before = controller.snapshot();
  controller.choose("confirm");
  for (let step = 0; step < 90; step += 1) {
    const state = controller.snapshot();
    if (state.phase !== "playing") return;
    if (state.targetIndex !== before.targetIndex) return;
    controller.tick(16, 0);
  }
  if (controller.snapshot().targetIndex === before.targetIndex && controller.snapshot().phase === "playing") {
    throw new Error(`Confirmed shot did not hit ${currentTargetEnemy(controller).term}`);
  }
}

describe("Paladin's Twin-Soul cartridge", () => {
  it("exposes a bespoke manifest and does not call legacy catalog factories", () => {
    const source = readFileSync(resolve(REPO_ROOT, "packages/game-cartridges/src/paladins-twin-soul.ts"), "utf8");

    expect(createPaladinsTwinSoulCartridge().manifest).toMatchObject({
      id: "paladins-twin-soul",
      title: "Paladin's Twin-Soul",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
    });
    expect(source).not.toMatch(/legacy-catalog/u);
    expect(source).not.toMatch(/choose\(state\.correctAction\)/u);
    expect(source).not.toMatch(/choose\(wrongEnemy\.id\)/u);
  });

  it("lists Enter instead of pointer text in the briefing keyboard row", () => {
    const keyboard = createPaladinsTwinSoulCartridge().standardExperience.definition.briefing.controls
      .find((control) => control.mode === "keyboard");

    expect(keyboard?.keys).toEqual(["A", "Left Arrow", "D", "Right Arrow", "Space", "Enter"]);
    expect(keyboard?.keys).not.toContain("Touch or click");
  });

  it("labels formation enemies from vocabulary instead of English decoy placeholders", () => {
    const oneItem = createPaladinsTwinSoulController([{ term: "ward", translation: "protect" }], vi.fn());
    const terms = oneItem.snapshot().enemies.map((enemy) => enemy.term);
    const translations = oneItem.snapshot().enemies.map((enemy) => enemy.translation);

    expect(terms.every((term) => term === "ward")).toBe(true);
    expect(translations.every((translation) => translation === "protect")).toBe(true);
    expect(terms.join(" ")).not.toMatch(/decoy-/u);
  });

  it("rejects empty, blank, and non-canonical vocabulary input", () => {
    expect(() => createPaladinsTwinSoulController([], vi.fn())).toThrow(/empty/i);
    expect(() => createPaladinsTwinSoulController([{ term: " ", translation: "protect" }], vi.fn())).toThrow();
    expect(() => createPaladinsTwinSoulController([{ ...VOCABULARY[0], id: "legacy" }], vi.fn())).toThrow();
  });

  it("lets a player win a 4-word list by moving under the current target and confirming a shot", () => {
    const deliver = vi.fn();
    const controller = createPaladinsTwinSoulController([...FOUR_WORD_LIST], deliver);

    for (let index = 0; index < FOUR_WORD_LIST.length; index += 1) {
      expect(controller.snapshot().phase).toBe("playing");
      fireAtCurrentTarget(controller);
      expect(controller.snapshot().correctAnswers).toBe(index + 1);
    }

    expect(controller.snapshot().phase).toBe("victory");
    expect(controller.snapshot().gameTime).toBeGreaterThan(0);
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({
      accuracy: 1,
      correctAnswers: 4,
      totalAttempts: 4,
      score: 400,
    }), "victory");
  });

  it("does not auto-fire or record unchosen decoy hits, and still loses to enemy projectiles", () => {
    const deliver = vi.fn();
    const controller = createPaladinsTwinSoulController([...FOUR_WORD_LIST], deliver);

    controller.tick(2_000, 0);
    expect(controller.snapshot().phase).toBe("playing");
    expect(controller.snapshot().totalAttempts).toBe(0);
    expect(controller.snapshot().correctAnswers).toBe(0);
    expect(controller.snapshot().lastOutcome).toBeUndefined();
    expect(controller.snapshot().bullets.filter((bullet) => bullet.isPlayer)).toHaveLength(0);
    expect(deliver).not.toHaveBeenCalled();

    while (controller.snapshot().phase === "playing" && controller.snapshot().gameTime < 20_000) {
      controller.tick(100, 0);
    }

    expect(controller.snapshot()).toMatchObject({
      phase: "defeat",
      player: { hp: 0 },
      totalAttempts: 0,
      correctAnswers: 0,
    });
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({
      correctAnswers: 0,
      totalAttempts: 0,
    }), "defeat");
  });

  it("records a confirmed decoy shot as a chosen miss and still keeps a projectile defeat path", () => {
    const deliver = vi.fn();
    const controller = createPaladinsTwinSoulController([...FOUR_WORD_LIST], deliver);
    const before = controller.snapshot();
    const decoy = before.enemies.find((enemy) => {
      return enemy.id !== before.correctAction
        && enemy.row === PALADINS_TWIN_SOUL_RULES.formationRows - 1;
    });
    if (!decoy) throw new Error("Expected a front-row decoy");

    moveUnderEnemy(controller, decoy.id);
    controller.choose("confirm");
    for (let step = 0; step < 90 && controller.snapshot().lastOutcome !== "incorrect"; step += 1) {
      controller.tick(16, 0);
    }

    expect(controller.snapshot()).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      correctAnswers: 0,
      totalAttempts: 1,
      lastOutcome: "incorrect",
    });

    for (let hit = 0; hit < PALADINS_TWIN_SOUL_RULES.initialHp; hit += 1) controller.applyHazard();
    expect(controller.snapshot().phase).toBe("defeat");
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({
      correctAnswers: 0,
      totalAttempts: 1,
    }), "defeat");
  });

  it("moves horizontally, fires only on confirm, and advances the deterministic enemy formation", () => {
    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn());
    const initial = controller.snapshot();
    const initialEnemyX = initial.enemies[0]?.x;

    expect(initial.enemies).toHaveLength(24);
    expect(new Set(initial.enemies.map((enemy) => enemy.row))).toEqual(new Set([0, 1, 2, 3]));
    expect(new Set(initial.enemies.map((enemy) => enemy.column))).toEqual(new Set([0, 1, 2, 3, 4, 5]));
    expect(initial.enemies.filter((enemy) => enemy.term === initial.targetTerm)).toHaveLength(1);

    controller.tick(16, 1);
    expect(controller.snapshot().player.x).toBeGreaterThan(initial.player.x);
    expect(controller.snapshot().bullets.filter((bullet) => bullet.isPlayer)).toHaveLength(0);

    controller.choose("confirm");
    expect(controller.snapshot().bullets.filter((bullet) => bullet.isPlayer)).toHaveLength(1);
    controller.tick(16, 1);
    expect(controller.snapshot().bullets.filter((bullet) => bullet.isPlayer)).toHaveLength(1);
    controller.tick(500, 0);
    expect(controller.snapshot().enemies[0]?.x).not.toBe(initialEnemyX);
  });

  it("creates exactly one correct target for one vocabulary item", () => {
    const controller = createPaladinsTwinSoulController([{ term: "ward", translation: "protect" }], vi.fn());
    const state = controller.snapshot();

    expect(state.enemies).toHaveLength(PALADINS_TWIN_SOUL_RULES.formationRows * PALADINS_TWIN_SOUL_RULES.formationColumns);
    expect(state.enemies.filter((enemy) => enemy.id === state.correctAction)).toHaveLength(1);
    expect(state.enemies.every((enemy) => enemy.term === "ward" && enemy.translation === "protect")).toBe(true);
    expect(state.enemies.every((enemy) => !enemy.term.startsWith("decoy-"))).toBe(true);
    expect(new Set(state.enemies.map((enemy) => enemy.id)).size).toBe(state.enemies.length);
  });

  it("creates one stable target and reuses vocabulary labels for duplicate items", () => {
    const input = [
      { term: "ward", translation: "protect" },
      { term: "ward", translation: "protect" },
    ];
    const first = createPaladinsTwinSoulController(input, vi.fn(), { seed: 23 });
    const second = createPaladinsTwinSoulController(input, vi.fn(), { seed: 23 });
    const state = first.snapshot();

    expect(state.enemies).toEqual(second.snapshot().enemies);
    expect(state.enemies.filter((enemy) => enemy.id === state.correctAction)).toHaveLength(1);
    expect(state.enemies.every((enemy) => enemy.term === "ward" && enemy.translation === "protect")).toBe(true);
    expect(state.enemies.every((enemy) => !enemy.term.startsWith("decoy-"))).toBe(true);
    expect(first.choose(state.correctAction)).toMatchObject({ correct: true, progressed: true });
    expect(first.snapshot().targetTerm).toBe("ward");
  });

  it("records a wrong enemy hit without advancing the vocabulary target", () => {
    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn());
    const wrongEnemy = controller.snapshot().enemies.find(
      (enemy) => enemy.term !== controller.snapshot().targetTerm,
    );
    if (!wrongEnemy) throw new Error("The formation needs a distractor");

    controller.choose(wrongEnemy.id);

    expect(controller.snapshot()).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      correctAnswers: 0,
      totalAttempts: 1,
      lastOutcome: "incorrect",
    });
    expect(controller.snapshot().bullets.filter((bullet) => !bullet.isPlayer)).toHaveLength(1);
  });

  it("counts every enemy with the visible correct English term as correct", () => {
    const controller = createPaladinsTwinSoulController([
      { term: "ward", translation: "protect" },
      { term: "ward", translation: "protect" },
    ], vi.fn(), { seed: 23 });
    const before = controller.snapshot();
    const matchingEnemy = before.enemies.find((enemy) => enemy.id !== before.correctAction);
    if (!matchingEnemy) throw new Error("The formation needs another matching enemy");

    expect(controller.choose(matchingEnemy.id)).toMatchObject({
      accepted: true,
      correct: true,
      progressed: true,
      snapshot: { targetIndex: 1, totalAttempts: 1 },
    });
  });

  it("adds 100 and advances exactly one target wave after the correct enemy hit", () => {
    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn());
    clearTarget(controller);

    expect(controller.snapshot()).toMatchObject({
      phase: "playing",
      wave: 2,
      targetIndex: 1,
      targetTerm: "reunite",
      correctAnswers: 1,
      totalAttempts: 1,
    });
    expect(controller.snapshot().enemies).toHaveLength(24);
  });

  it("captures the twin with one deterministic enemy and doubles fire strength after rescue", () => {
    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn());

    controller.tick(1_300, 0);
    const captured = controller.snapshot();
    expect(captured.player.isCaptured).toBe(true);
    expect(captured.enemies.filter((enemy) => enemy.hasCapturedTwin)).toHaveLength(1);

    const captor = captured.enemies.find((enemy) => enemy.hasCapturedTwin);
    if (!captor) throw new Error("Expected a capturing enemy");
    controller.choose(captor.id);

    expect(controller.snapshot()).toMatchObject({
      player: { isCaptured: false, hasTwinSoul: true, fireStrength: 2 },
    });
    expect(controller.snapshot().enemies.some((enemy) => enemy.hasCapturedTwin)).toBe(false);
  });

  it("moves enemy projectiles into the player and reduces HP", () => {
    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn());
    const initialHp = controller.snapshot().player.hp;

    controller.tick(900, 0);
    expect(controller.snapshot().bullets.some((bullet) => !bullet.isPlayer)).toBe(true);
    for (let step = 0; step < 30 && controller.snapshot().player.hp === initialHp; step += 1) {
      controller.tick(100, 0);
    }

    expect(controller.snapshot().player.hp).toBeLessThan(initialHp);
  });

  it("emits one exact victory result after all target waves", () => {
    const deliver = vi.fn();
    const controller = createPaladinsTwinSoulController(VOCABULARY, deliver);

    clearTarget(controller);
    clearTarget(controller);

    const snapshot = controller.snapshot();
    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);
    expect(snapshot).toMatchObject({ phase: "victory", wave: 3, targetIndex: 2 });
    expect(result).toEqual({
      accuracy: 1,
      xp: 50,
      score: 200,
      correctAnswers: 2,
      totalAttempts: 2,
    });
    expect(snapshot.result).toEqual(result);
    expect(deliver).toHaveBeenCalledWith(result, "victory");
    expect(deliver).toHaveBeenCalledOnce();
    expect(controller.snapshot()).toEqual(snapshot);
  });

  it("emits one exact defeat result when enemy fire reaches zero HP", () => {
    const deliver = vi.fn();
    const controller = createPaladinsTwinSoulController(VOCABULARY, deliver);

    for (let step = 0; step < PALADINS_TWIN_SOUL_RULES.initialHp; step += 1) controller.applyHazard();

    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);
    expect(controller.snapshot()).toMatchObject({ phase: "defeat", player: { hp: 0 } });
    expect(result).toMatchObject({ accuracy: expect.any(Number), score: expect.any(Number) });
    expect(deliver).toHaveBeenCalledWith(result, "defeat");
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("passes the explicit victory outcome through context.complete", () => {
    const victoryComplete = vi.fn();
    const cartridge = createPaladinsTwinSoulCartridge();
    cartridge.createGameConfig({
      input: [{ term: "ward", translation: "protect" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: victoryComplete,
      diagnostic: vi.fn(),
      inputController: createMutableInputController(),
      seed: 17,
    });
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const step = tutorial.steps[1];
    if (!step) throw new Error("Expected a correct tutorial step");
    driver.execute({ tutorial, step, seed: tutorial.seed, mode: "tutorial", diagnostics: { report: vi.fn() } });
    expect(victoryComplete).toHaveBeenCalledWith(expect.any(Object), "victory");
  });

  it("exposes the shared action contract and keeps the target answer private to rendering", () => {
    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: 17 });
    const initial = controller.snapshot();
    const wrongEnemy = initial.enemies.find((enemy) => enemy.id !== initial.correctAction);

    expect(initial).toMatchObject({
      phase: "playing",
      prompt: "protect",
      answer: "ward",
      correctAction: expect.any(String),
      availableActions: expect.arrayContaining(["move-left", "move-right", "confirm", initial.correctAction]),
      lives: 3,
      energy: 1,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      destroyed: false,
    });
    expect(wrongEnemy).toBeDefined();
    expect(controller.choose(wrongEnemy!.id)).toMatchObject({
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      snapshot: { targetIndex: 0, totalAttempts: 1 },
    });
    expect(controller.applyHazard()).toMatchObject({ accepted: true, correct: false, progressed: false });
  });

  it("uses the host seed for formation content and counterfire order", () => {
    const first = createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: 17 });
    const second = createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: 17 });
    const different = createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: 18 });

    expect(first.snapshot()).toEqual(second.snapshot());
    expect(different.snapshot().enemies).not.toEqual(first.snapshot().enemies);

    const wrong = first.snapshot().enemies.find((enemy) => enemy.id !== first.snapshot().correctAction)!;
    const otherWrong = different.snapshot().enemies.find((enemy) => enemy.id !== different.snapshot().correctAction)!;
    first.choose(wrong.id);
    different.choose(otherWrong.id);
    expect(first.snapshot().bullets.filter((bullet) => !bullet.isPlayer)).not.toEqual(
      different.snapshot().bullets.filter((bullet) => !bullet.isPlayer),
    );
  });

  it("normalizes keyboard and pointer or touch scene movement", () => {
    const inputController = createMutableInputController();
    const config = createPaladinsTwinSoulCartridge().createGameConfig({
      input: [...VOCABULARY],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 17,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time: number, delta: number) => void;
    };
    const host = createSceneHost();
    scene.create.call(host.host);

    const before = (config.scene as { extend: { apkCaptureResponsiveState: () => { game: PaladinsTwinSoulSnapshot } } }).extend.apkCaptureResponsiveState().game;
    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowLeft"] }));
    scene.update.call(host.host, 0, 16);
    const afterKeyboard = (config.scene as { extend: { apkCaptureResponsiveState: () => { game: PaladinsTwinSoulSnapshot } } }).extend.apkCaptureResponsiveState().game;
    expect(afterKeyboard.player.x).toBeLessThan(before.player.x);

    inputController.setSnapshot(inputSnapshot({
      pointer: { released: true, kind: "touch", x: 900, y: 400 },
    }));
    scene.update.call(host.host, 16, 16);
    const afterPointer = (config.scene as { extend: { apkCaptureResponsiveState: () => { game: PaladinsTwinSoulSnapshot } } }).extend.apkCaptureResponsiveState().game;
    expect(afterPointer.player.x).toBeGreaterThan(afterKeyboard.player.x);
    const bulletsBeforeConfirm = afterPointer.bullets.length;
    inputController.setSnapshot(inputSnapshot({ pressed: ["Space"] }));
    scene.update.call(host.host, 32, 16);
    const afterConfirm = (config.scene as { extend: { apkCaptureResponsiveState: () => { game: PaladinsTwinSoulSnapshot } } }).extend.apkCaptureResponsiveState().game;
    expect(afterConfirm.bullets.length).toBeGreaterThan(bulletsBeforeConfirm);
    expect(PALADINS_TWIN_SOUL_KEYBOARD_BINDINGS).toMatchObject({
      ArrowLeft: "move-left",
      KeyA: "move-left",
      ArrowRight: "move-right",
      KeyD: "move-right",
    });
  });

  it("shows the bare Thai prompt and readable bottom-row English choices without live prose", () => {
    const inputController = createMutableInputController();
    const config = createPaladinsTwinSoulCartridge().createGameConfig({
      input: [...VOCABULARY],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 7,
    });
    const scene = config.scene as { create: (this: unknown) => void };
    const host = createSceneHost(336, { width: 336, height: 733 });
    scene.create.call(host.host);
    const state = (config.scene as { extend: { apkCaptureResponsiveState: () => { game: PaladinsTwinSoulSnapshot } } }).extend.apkCaptureResponsiveState().game;
    const renderedText = host.texts.flatMap((text) => text.setText.mock.calls.map(([value]) => String(value)));

    expect(renderedText).toContain(state.prompt);
    expect(renderedText).not.toContain(`Translation prompt: ${state.prompt}`);
    for (const enemy of state.enemies.filter((candidate) => candidate.row === 3)) expect(renderedText).toContain(enemy.term);
    expect(renderedText.join(" ")).not.toMatch(/PALADIN'S TWIN-SOUL|Compact formation|Twin-Soul formation|Move beneath|Keyboard:/);
    const labels = host.texts.slice(5).filter((text) => text.setText.mock.calls.at(-1)?.[0]);
    expect(labels.every((label) => label.setFontSize.mock.calls.at(-1)?.[0] === 16)).toBe(true);
    expect(labels.every((label) => label.setBackgroundColor.mock.calls.at(-1)?.[0] === "rgba(15, 23, 42, 0.9)")).toBe(true);
    expect(renderedText.some((value) => value.startsWith("Answer:"))).toBe(false);
    expect(host.graphics.fillStyle.mock.calls.filter(([color]) => color === 0xdc2626)).toHaveLength(state.enemies.length);
  });

  it("uses the full portrait arena below the Thai HUD without tiled terrain", () => {
    const rescuedController = createPaladinsTwinSoulController(VOCABULARY, vi.fn());
    rescuedController.tick(1_300, 0);
    const captor = rescuedController.snapshot().enemies.find((enemy) => enemy.hasCapturedTwin);
    if (!captor) throw new Error("Expected the portrait fixture to capture the twin");
    rescuedController.choose(captor.id);
    const rescuedState = rescuedController.capture();
    const config = createPaladinsTwinSoulCartridge().createGameConfig({
      input: [...VOCABULARY],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: createMutableInputController(),
      seed: 0,
    });
    const scene = config.scene as {
      preload(this: ReturnType<typeof createSceneHost>["host"]): void;
      create(this: ReturnType<typeof createSceneHost>["host"]): void;
      extend: { apkRestoreResponsiveState(value: { game: PaladinsTwinSoulSnapshot }): void };
    };
    const host = createSceneHost(336, { width: 336, height: 733 });

    scene.extend.apkRestoreResponsiveState({ game: rescuedState });
    scene.preload.call(host.host);
    scene.create.call(host.host);

    const positionScaleY = (733 - 130 - 16) / PALADINS_TWIN_SOUL_CANVAS.height;
    const playerY = 130 + PALADINS_TWIN_SOUL_RULES.playerY * positionScaleY;
    const actorScale = 0.65;
    expect(host.graphics.fillRect).toHaveBeenCalledWith(0, 0, 336, 733);
    expect([...host.loadedImages, ...host.loadedSheets].some((key) => key.includes("ground"))).toBe(false);
    expect(host.graphics.fillRoundedRect).toHaveBeenCalledWith(
      expect.any(Number),
      playerY - 22 * actorScale,
      44 * actorScale,
      44 * actorScale,
      10 * actorScale,
    );
    expect(playerY).toBeGreaterThan(600);
    expect(playerY + 22 * actorScale).toBeLessThan(733 - 16);
    expect(host.graphics.fillCircle).toHaveBeenCalledWith(
      expect.any(Number),
      playerY,
      16 * actorScale,
    );
  });

  it("round-trips responsive state and cleans scene resources without a result", () => {
    const inputController = createMutableInputController();
    const complete = vi.fn();
    const config = createPaladinsTwinSoulCartridge().createGameConfig({
      input: [...VOCABULARY],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
      seed: 29,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState: () => unknown;
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const host = createSceneHost();
    scene.create.call(host.host);
    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowRight"] }));
    scene.update.call(host.host, 0, 16);
    const captured = scene.extend.apkCaptureResponsiveState();
    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowLeft"] }));
    scene.update.call(host.host, 16, 16);
    scene.extend.apkRestoreResponsiveState(captured);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(captured);
    scene.extend.apkRecompose({ profile: "compact" });

    host.emit("shutdown");
    host.emit("destroy");
    expect((scene.extend.apkCaptureResponsiveState() as { game: PaladinsTwinSoulSnapshot }).game.destroyed).toBe(true);
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(host.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect(complete).not.toHaveBeenCalled();
  });

  it("rejects invalid responsive state before mutation", () => {
    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: 11 });
    const captured = controller.capture();

    expect(() => controller.restore({ ...captured, seed: 12 })).toThrow(/seed/i);
    expect(() => controller.restore({ ...captured, answer: "forged" })).toThrow(/target|answer/i);
    expect(controller.snapshot()).toEqual(captured);
  });

  it("rejects forged formation positions and duplicate projectile identities on restore", () => {
    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: 11 });
    controller.choose("confirm");
    const captured = controller.capture();
    const firstEnemy = captured.enemies[0]!;
    const firstBullet = captured.bullets[0]!;

    expect(() => controller.restore({
      ...captured,
      enemies: [{ ...firstEnemy, x: firstEnemy.x + 1 }, ...captured.enemies.slice(1)],
    })).toThrow(/enemy/i);
    expect(() => controller.restore({
      ...captured,
      bullets: [firstBullet, { ...firstBullet }],
    })).toThrow(/bullet/i);
    expect(controller.snapshot()).toEqual(captured);
  });

  it.each(["tutorial", "demo"] as const)("suppresses completion in %s sessions", (sessionMode) => {
    const complete = vi.fn();
    const cartridge = createPaladinsTwinSoulCartridge();
    const inputController = createMutableInputController();
    cartridge.createGameConfig({
      input: [...VOCABULARY],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
      seed: 41,
      sessionMode,
    });
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const step = tutorial.steps[0];
    if (!step) throw new Error("Expected a tutorial step");

    for (let attempt = 0; attempt < 500; attempt += 1) {
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

  it("uses the real incorrect and correct mechanics during the guided tutorial", () => {
    const complete = vi.fn();
    const cartridge = createPaladinsTwinSoulCartridge();
    const inputController = createMutableInputController();
    const config = cartridge.createGameConfig({
      input: [...VOCABULARY],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
      seed: 41,
      sessionMode: "tutorial",
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      extend: { apkCaptureResponsiveState: () => { game: PaladinsTwinSoulSnapshot } };
    };
    const host = createSceneHost();
    scene.create.call(host.host);
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const execute = (stepIndex: number): void => {
      const step = tutorial.steps[stepIndex];
      if (!step) throw new Error("Expected tutorial step");
      driver.execute({ tutorial, step, seed: tutorial.seed, mode: "tutorial", diagnostics: { report: vi.fn() } });
    };

    execute(0);
    expect(scene.extend.apkCaptureResponsiveState().game).toMatchObject({ targetIndex: 0, totalAttempts: 1, lastOutcome: "incorrect" });
    execute(1);
    expect(scene.extend.apkCaptureResponsiveState().game).toMatchObject({ targetIndex: 1, correctAnswers: 1, score: 100 });
    expect(complete).not.toHaveBeenCalled();
  });

  it("rejects invalid timing, movement, seed, and responsive states", () => {
    expect(() => createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: -1 })).toThrow(/seed/i);
    expect(() => createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: 1.5 })).toThrow(/seed/i);

    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: 9 });
    expect(() => controller.tick(Number.NaN)).toThrow(/delta/i);
    expect(() => controller.tick(16, 2 as never)).toThrow(/movement/i);
    expect(() => controller.restore(null as never)).toThrow(/responsive/i);

    const captured = controller.capture();
    const invalidStates: PaladinsTwinSoulSnapshot[] = [
      { ...captured, phase: "paused" as never },
      { ...captured, targetIndex: 1, wave: 1 },
      { ...captured, player: { ...captured.player, hp: -1 } },
      { ...captured, availableActions: [] },
      { ...captured, enemies: [] },
      { ...captured, bullets: [{ id: "bullet", x: Number.NaN, y: 10, isPlayer: true }] },
      { ...captured, destroyed: "no" as never },
    ];

    for (const invalid of invalidStates) expect(() => controller.restore(invalid)).toThrow();
    expect(controller.snapshot()).toEqual(captured);
  });

  it("reverses the formation at its travel boundary and seals terminal actions", () => {
    const controller = createPaladinsTwinSoulController(VOCABULARY, vi.fn(), { seed: 4 });
    const initial = controller.capture();
    controller.restore({ ...initial, nextCaptureAt: 1_000_000, lastEnemyFireAt: 1_000_000 });
    controller.tick(2_500);
    expect(controller.snapshot().formationDirection).toBe(-1);

    const deliver = vi.fn();
    const defeated = createPaladinsTwinSoulController(VOCABULARY, deliver);
    for (let hit = 0; hit < PALADINS_TWIN_SOUL_RULES.initialHp; hit += 1) defeated.applyHazard();
    expect(defeated.applyHazard()).toMatchObject({ accepted: false, terminal: false });
    defeated.destroy();
    defeated.destroy();
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("restores a terminal victory snapshot without delivering a second result", () => {
    const source = createPaladinsTwinSoulController([{ term: "ward", translation: "protect" }], vi.fn(), { seed: 6 });
    clearTarget(source);
    const terminal = source.capture();
    const deliver = vi.fn();
    const restored = createPaladinsTwinSoulController([{ term: "ward", translation: "protect" }], deliver, { seed: 6 });

    restored.restore(terminal);
    expect(restored.snapshot()).toEqual(terminal);
    expect(restored.choose("confirm")).toMatchObject({ accepted: false, terminal: false });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("handles pointer drag, cancelled input, and compact scene recomposition", () => {
    const inputController = createMutableInputController();
    const config = createPaladinsTwinSoulCartridge().createGameConfig({
      input: [...VOCABULARY],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 17,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState: () => { game: PaladinsTwinSoulSnapshot };
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const host = createSceneHost();
    scene.create.call(host.host);
    const before = scene.extend.apkCaptureResponsiveState();

    inputController.setSnapshot(inputSnapshot({
      pointer: { down: true, startX: 800, startY: 200, x: 600, y: 200 },
    }));
    scene.update.call(host.host, 0, 16);
    const afterDrag = scene.extend.apkCaptureResponsiveState();
    expect(afterDrag.game.player.x).toBeLessThan(before.game.player.x);

    inputController.setSnapshot(inputSnapshot({
      pointer: { released: true, cancelled: true, x: 900, y: 400 },
    }));
    scene.update.call(host.host, 16, 16);
    expect(scene.extend.apkCaptureResponsiveState().game.phase).toBe("playing");
    scene.extend.apkRecompose({ profile: "compact" });
    scene.update.call(host.host, 32, 16);
    expect(host.texts.some((text) => text.setText.mock.calls.some(([value]) => String(value).includes("Compact formation")))).toBe(true);
    expect(() => scene.extend.apkRestoreResponsiveState(null)).toThrow(/responsive/i);
  });
});
