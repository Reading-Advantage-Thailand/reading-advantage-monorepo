import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  APKInputController,
  APKInputSnapshot,
} from "@reading-advantage/advantage-play-kit";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  RPG_BATTLE_CANVAS,
  RPG_BATTLE_BASIC_DAMAGE,
  RPG_BATTLE_ENEMY_DAMAGE,
  RPG_BATTLE_FEEDBACK_LOCK_MS,
  RPG_BATTLE_POWER_DAMAGE,
  RPG_BATTLE_PLAYER_MAX_HEALTH,
  RPG_BATTLE_SCORE_PER_CORRECT,
  createRpgBattleCartridge,
  createRpgBattleController,
  getRpgBattleChoiceIndex,
  rpgBattleChoiceRect,
  type RpgBattleController,
  type RpgBattleSnapshot,
} from "./rpg-battle.js";
import { createCatalogStandardEdition } from "./catalog-standard-art.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const VOCABULARY = [
  { term: "brave", translation: "valiente" },
  { term: "swift", translation: "veloz" },
];

function vocabularyOf(count: number): Array<{ term: string; translation: string }> {
  return Array.from({ length: count }, (_value, index) => ({
    term: `term-${index + 1}`,
    translation: `translation-${index + 1}`,
  }));
}

function inputSnapshot(overrides: Omit<Partial<APKInputSnapshot>, "pointer"> & {
  readonly pointer?: Partial<APKInputSnapshot["pointer"]>;
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

function createSceneHost(
  sceneSize = RPG_BATTLE_CANVAS,
  canvasRect: { left: number; top: number; width: number; height: number } = { left: 0, top: 0, width: 960, height: 540 },
) {
  const graphics = {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    fillCircle: vi.fn(),
    fillEllipse: vi.fn(),
    fillRoundedRect: vi.fn(),
    lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(),
    destroy: vi.fn(),
  };
  graphics.clear.mockReturnValue(graphics);
  graphics.fillStyle.mockReturnValue(graphics);
  graphics.fillRect.mockReturnValue(graphics);
  graphics.fillCircle.mockReturnValue(graphics);
  graphics.fillEllipse.mockReturnValue(graphics);
  graphics.fillRoundedRect.mockReturnValue(graphics);
  graphics.lineStyle.mockReturnValue(graphics);
  graphics.strokeRoundedRect.mockReturnValue(graphics);

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
    game: {
      canvas: {
        getBoundingClientRect: () => canvasRect,
      },
    },
    scale: sceneSize,
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

function submitCorrect(controller: RpgBattleController): ReturnType<RpgBattleController["submit"]> {
  return controller.submit(controller.snapshot().answer);
}

function submitWrong(controller: RpgBattleController): ReturnType<RpgBattleController["submit"]> {
  const state = controller.snapshot();
  const wrong = state.answerChoices.find((choice) => choice !== state.answer);
  if (!wrong) throw new Error("RPG Battle needs a deterministic wrong choice");
  return controller.submit(wrong);
}

function releaseWrongAnswerLock(controller: RpgBattleController): void {
  controller.advanceTime(RPG_BATTLE_FEEDBACK_LOCK_MS);
}

function choiceHitPoint(index: number): { x: number; y: number } {
  const card = rpgBattleChoiceRect(RPG_BATTLE_CANVAS.width, RPG_BATTLE_CANVAS.height, index);
  return { x: card.x + card.width / 2, y: card.y + card.height / 2 };
}

describe("RPG Battle bespoke cartridge", () => {
  it("covers semantic aliases, empty submissions, and pointer boundary validation", () => {
    const controller = createRpgBattleController(VOCABULARY, vi.fn(), { rng: () => 0.25 });

    expect(controller.submit()).toMatchObject({ accepted: false, correct: false, terminal: false });
    expect(controller.snapshot().feedback).toMatch(/English answer required/u);
    expect(controller.typeAnswer("brave").typedAnswer).toBe("brave");
    expect(controller.choose("cancel")).toMatchObject({ accepted: true, progressed: false });
    expect(controller.snapshot().typedAnswer).toBe("brav");
    expect(controller.type("e").typedAnswer).toBe("brave");
    expect(controller.choose("confirm")).toMatchObject({ accepted: true, correct: true });
    controller.tick(0);

    expect(getRpgBattleChoiceIndex(0, 0, RPG_BATTLE_CANVAS.width, RPG_BATTLE_CANVAS.height)).toBeUndefined();
    expect(getRpgBattleChoiceIndex(480, 100, RPG_BATTLE_CANVAS.width, RPG_BATTLE_CANVAS.height, 0)).toBeUndefined();
    expect(getRpgBattleChoiceIndex(100, 400, RPG_BATTLE_CANVAS.width, RPG_BATTLE_CANVAS.height)).toBeUndefined();
    expect(getRpgBattleChoiceIndex(100, 500, RPG_BATTLE_CANVAS.width, RPG_BATTLE_CANVAS.height)).toBeUndefined();
    const firstCard = rpgBattleChoiceRect(RPG_BATTLE_CANVAS.width, RPG_BATTLE_CANVAS.height, 0);
    expect(getRpgBattleChoiceIndex(firstCard.x + 10, firstCard.y + firstCard.height + 2, RPG_BATTLE_CANVAS.width, RPG_BATTLE_CANVAS.height)).toBeUndefined();
    expect(() => controller.advanceTime(Number.NaN)).toThrow(/finite nonnegative/u);
  });

  it("publishes the preserved identity and owns a turn-battle contract", () => {
    const cartridge = createRpgBattleCartridge();
    const controller = createRpgBattleController(VOCABULARY, vi.fn());

    expect(cartridge.manifest).toMatchObject({
      id: "rpg-battle",
      inputMode: "vocabulary",
      runtimeApiVersion: "1.0.0",
    });
    expect(cartridge.standardExperience.definition).toMatchObject({
      briefing: { startPhase: "tutorial", learningPreview: { heading: "Words to learn" } },
      tutorial: {
        lifecycle: {
          complete: { to: "playing" },
          productionEffects: { emitGameResults: false, persistProgress: false },
        },
      },
      debrief: { outcome: "complete", requiredCredit: "Pixel art assets by ElvGames" },
    });
    expect(controller.snapshot()).toMatchObject({
      phase: "playing",
      prompt: "valiente",
      answer: "brave",
      targetIndex: 0,
      targetCount: 2,
      playerHealth: RPG_BATTLE_PLAYER_MAX_HEALTH,
      enemyHealth: expect.any(Number),
      score: 0,
      streak: 0,
      totalAttempts: 0,
    });
  });

  it("types a translation into a buffer and submits only on Enter-equivalent submission", () => {
    const controller = createRpgBattleController(VOCABULARY, vi.fn());

    controller.type(" brave ");
    expect(controller.snapshot().typedAnswer).toBe(" brave ");
    controller.backspace();
    expect(controller.snapshot().typedAnswer).toBe(" brave");
    expect(controller.snapshot().totalAttempts).toBe(0);

    const result = controller.submitAnswer();
    expect(result).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(result.snapshot.typedAnswer).toBe("");
  });

  it("deals deterministic player damage, records score, and keeps the hero unharmed after a correct translation", () => {
    const controller = createRpgBattleController(VOCABULARY, vi.fn());
    const before = controller.snapshot();
    const result = submitCorrect(controller);
    const expectedBaseDamage = result.actionPower === "power" ? RPG_BATTLE_POWER_DAMAGE : RPG_BATTLE_BASIC_DAMAGE;

    expect(result).toMatchObject({
      accepted: true,
      correct: true,
      playerDamage: expectedBaseDamage + Math.floor(before.streak / 2),
      enemyDamage: 0,
      streakBonus: 0,
    });
    expect(result.snapshot).toMatchObject({
      enemyHealth: before.enemyHealth - result.playerDamage,
      playerHealth: RPG_BATTLE_PLAYER_MAX_HEALTH,
      score: RPG_BATTLE_SCORE_PER_CORRECT,
      streak: 1,
      targetIndex: 1,
      turn: "player",
      lastActor: "player",
      turnHistory: ["player"],
      turnsTaken: 1,
      playerAttacks: 1,
      enemyCounterattacks: 0,
    });
  });

  it("restores source power damage and adds the streak bonus before the next target", () => {
    const vocabulary = [
      ...VOCABULARY,
      { term: "calm", translation: "calma" },
    ];
    const controller = createRpgBattleController(vocabulary, vi.fn(), { seed: 17 });

    submitCorrect(controller);
    submitCorrect(controller);
    const before = controller.snapshot();
    const result = submitCorrect(controller);
    const baseDamage = result.actionPower === "power" ? RPG_BATTLE_POWER_DAMAGE : RPG_BATTLE_BASIC_DAMAGE;

    expect(before.streak).toBe(2);
    expect(result).toMatchObject({
      actionPower: expect.any(String),
      streakBonus: 1,
      playerDamage: baseDamage + 1,
      progressed: true,
      terminal: true,
    });
    expect(result.snapshot).toMatchObject({
      score: vocabulary.length * RPG_BATTLE_SCORE_PER_CORRECT,
      targetIndex: vocabulary.length,
      phase: "victory",
    });
  });

  it("locks wrong answers without revealing the answer, counterattacks, and preserves the target", () => {
    const controller = createRpgBattleController(VOCABULARY, vi.fn());
    const result = submitWrong(controller);

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, enemyDamage: RPG_BATTLE_ENEMY_DAMAGE });
    expect(result.snapshot).toMatchObject({
      targetIndex: 0,
      inputLocked: true,
      locked: true,
      revealedTranslation: undefined,
      feedback: "Incorrect. The enemy counterattacks.",
      streak: 0,
      playerHealth: RPG_BATTLE_PLAYER_MAX_HEALTH - RPG_BATTLE_ENEMY_DAMAGE,
      totalAttempts: 1,
      enemyCounterattacks: 1,
    });
    expect(controller.submit(controller.snapshot().answer).accepted).toBe(false);

    releaseWrongAnswerLock(controller);
    expect(controller.snapshot().inputLocked).toBe(false);
    expect(submitCorrect(controller).accepted).toBe(true);
  });

  it("resets streak on a wrong answer and increments it on each later correct answer", () => {
    const controller = createRpgBattleController(VOCABULARY, vi.fn());

    submitCorrect(controller);
    expect(controller.snapshot().streak).toBe(1);
    submitWrong(controller);
    expect(controller.snapshot().streak).toBe(0);
    releaseWrongAnswerLock(controller);
    submitCorrect(controller);
    expect(controller.snapshot().streak).toBe(1);
  });

  it("uses a host seed for weighted basic and power action choices", () => {
    const seeded = createRpgBattleController(VOCABULARY, vi.fn(), { seed: 17 });
    const repeated = createRpgBattleController(VOCABULARY, vi.fn(), { seed: 17 });
    const powers = new Set(
      Array.from({ length: 100 }, (_value, seed) => (
        createRpgBattleController(VOCABULARY, vi.fn(), { seed }).snapshot().actionPower
      )),
    );

    expect(seeded.snapshot()).toMatchObject({
      actionPower: repeated.snapshot().actionPower,
      answerChoices: repeated.snapshot().answerChoices,
      answerChoicePowers: repeated.snapshot().answerChoicePowers,
    });
    expect(powers).toEqual(new Set(["basic", "power"]));
  });

  it("exposes the shared controller contract and applies hazards without advancing learning", () => {
    const controller = createRpgBattleController(VOCABULARY, vi.fn(), { seed: 17 });
    const before = controller.snapshot();

    expect(before).toMatchObject({
      correctAction: before.answer,
      availableActions: before.answerChoices,
      lives: before.playerHealth,
      energy: before.streak,
      destroyed: false,
    });

    const wrong = submitWrong(controller);
    expect(wrong).toMatchObject({
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      result: undefined,
      streakBonus: 0,
    });
    releaseWrongAnswerLock(controller);
    const hazardBefore = controller.snapshot();
    const hazard = controller.applyHazard();

    expect(hazard).toMatchObject({
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
      result: undefined,
      enemyDamage: RPG_BATTLE_ENEMY_DAMAGE,
      streakBonus: 0,
    });
    expect(hazard.snapshot).toMatchObject({
      targetIndex: hazardBefore.targetIndex,
      totalAttempts: hazardBefore.totalAttempts,
      lastOutcome: "hazard",
      playerHealth: hazardBefore.playerHealth - RPG_BATTLE_ENEMY_DAMAGE,
    });
  });

  it("rejects inconsistent and terminal-reopening responsive states without stale results", () => {
    const controller = createRpgBattleController(VOCABULARY, vi.fn(), { seed: 17 });
    const captured = controller.capture();

    expect(() => controller.restore({ ...captured, score: 1 })).toThrow(/score is invalid/i);
    expect(controller.snapshot()).toEqual(captured);

    submitCorrect(controller);
    const terminalResult = submitCorrect(controller);
    const terminalSnapshot = controller.capture();
    expect(terminalResult.result).toBeDefined();
    expect(() => controller.restore(captured)).toThrow(/reopens a terminal battle/i);
    expect(() => controller.restore({ ...terminalSnapshot, phase: "playing" })).toThrow();
    expect(controller.choose(0)).toMatchObject({ accepted: false, terminal: false, result: undefined });
  });

  it("restores a progressed battle and rejects malformed state at each contract boundary", () => {
    const controller = createRpgBattleController(VOCABULARY, vi.fn(), { seed: 17 });
    submitCorrect(controller);
    const captured = controller.capture();

    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);

    const invalidStates = [
      [null, /object/iu],
      [{ ...captured, phase: "paused" }, /phase/iu],
      [{ ...captured, seed: 18 }, /seed/iu],
      [{ ...captured, targetIndex: 9 }, /target progress/iu],
      [{ ...captured, prompt: "wrong" }, /target content/iu],
      [{ ...captured, answerChoices: [] }, /answer choices/iu],
      [{ ...captured, availableActions: [] }, /available actions/iu],
      [{ ...captured, answerChoicePowers: [] }, /action power/iu],
      [{ ...captured, correctAnswers: 0 }, /result counters/iu],
      [{ ...captured, playerMaxHealth: 1 }, /health limits/iu],
      [{ ...captured, enemyHealth: -1 }, /enemy health/iu],
      [{ ...captured, playerHealth: -1 }, /player health/iu],
      [{ ...captured, streak: -1, energy: -1 }, /streak/iu],
      [{ ...captured, typedAnswer: 1 }, /text/iu],
      [{ ...captured, inputLocked: true }, /lock/iu],
      [{ ...captured, lastOutcome: "other" }, /outcome/iu],
      [{ ...captured, destroyed: 1 }, /destroyed/iu],
      [{ ...captured, turn: "spectator" }, /turn/iu],
      [{ ...captured, turnHistory: ["spectator"] }, /turn/iu],
      [{ ...captured, playerAttacks: 0 }, /player turn counters/iu],
      [{ ...captured, enemyCounterattacks: 4 }, /enemy turn counters/iu],
      [{ ...captured, lastActor: "spectator" }, /last actor/iu],
      [{ ...captured, lastActor: "enemy" }, /last actor/iu],
    ] as const;

    for (const [state, pattern] of invalidStates) {
      expect(() => controller.restore(state as never)).toThrow(pattern);
    }
    expect(controller.snapshot()).toEqual(captured);
  });

  it("requires every target and zero enemy health for victory with exact counters", () => {
    const deliver = vi.fn();
    const controller = createRpgBattleController(VOCABULARY, deliver);

    const first = submitCorrect(controller);
    const final = controller.choose(controller.snapshot().correctChoiceIndex);
    const duplicate = controller.submitAnswer(controller.snapshot().answer);

    expect(first.terminal).toBe(false);
    expect(final).toMatchObject({ terminal: true, completed: true, playerDamage: expect.any(Number), result: expect.any(Object) });
    expect(final.snapshot).toMatchObject({ phase: "victory", targetIndex: 2, enemyHealth: 0, score: 2 * RPG_BATTLE_SCORE_PER_CORRECT });
    expect(duplicate.accepted).toBe(false);
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(final.result, "victory");
    expect(gameResultsSchema.parse(final.result)).toMatchObject({
      accuracy: 1,
      correctAnswers: 2,
      totalAttempts: 2,
      score: 2 * RPG_BATTLE_SCORE_PER_CORRECT,
    });
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toEqual(final.result);
  });

  it("reaches defeat at zero player health and emits one result", () => {
    const deliver = vi.fn();
    const controller = createRpgBattleController(VOCABULARY, deliver);
    const wrongTurns = Math.ceil(RPG_BATTLE_PLAYER_MAX_HEALTH / RPG_BATTLE_ENEMY_DAMAGE);
    let terminal: ReturnType<RpgBattleController["choose"]> | undefined;

    for (let index = 0; index < wrongTurns; index += 1) {
      if (controller.snapshot().phase !== "playing") break;
      const state = controller.snapshot();
      const wrong = state.answerChoices.find((choice) => choice !== state.answer);
      if (!wrong) throw new Error("RPG Battle needs a deterministic wrong choice");
      const result = controller.choose(wrong);
      if (result.terminal) terminal = result;
      releaseWrongAnswerLock(controller);
    }

    expect(controller.snapshot()).toMatchObject({ phase: "defeat", playerHealth: 0, enemyHealth: expect.any(Number) });
    expect(controller.snapshot().totalAttempts).toBe(wrongTurns);
    expect(terminal).toMatchObject({ terminal: true, completed: true, result: expect.any(Object) });
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(terminal?.result, "defeat");
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 0,
      correctAnswers: 0,
      totalAttempts: wrongTurns,
      score: 0,
    });
  });

  it("does not complete tutorial or demo sessions", () => {
    for (const sessionMode of ["tutorial", "demo"] as const) {
      const complete = vi.fn();
      createRpgBattleCartridge().createGameConfig({
        input: VOCABULARY,
        edition: PHASE3_RUNTIME_EDITION,
        complete,
        diagnostic: vi.fn(),
        inputController: createMutableInputController(),
        sessionMode,
      });

      expect(complete).not.toHaveBeenCalled();
    }
  });

  it("keeps exact result counters after mixed wrong and correct turns", () => {
    const deliver = vi.fn();
    const controller = createRpgBattleController(VOCABULARY, deliver);

    submitWrong(controller);
    releaseWrongAnswerLock(controller);
    submitCorrect(controller);
    submitWrong(controller);
    releaseWrongAnswerLock(controller);
    const final = submitCorrect(controller);

    expect(final.snapshot).toMatchObject({
      phase: "victory",
      correctAnswers: 2,
      totalAttempts: 4,
      score: 2 * RPG_BATTLE_SCORE_PER_CORRECT,
      turnsTaken: 6,
      enemyCounterattacks: 2,
    });
    expect(gameResultsSchema.parse(final.result)).toMatchObject({
      accuracy: 0.5,
      correctAnswers: 2,
      totalAttempts: 4,
      score: 2 * RPG_BATTLE_SCORE_PER_CORRECT,
    });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("accepts keyboard typing, Enter, and touch answer choices in the owned scene", () => {
    const inputController = createMutableInputController();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const config = createRpgBattleCartridge().createGameConfig({
      input: VOCABULARY,
      edition: createCatalogStandardEdition(["legacy-catalog/rpg-battle/arena"], "/assets/apk/standard-pack-qc/", "rpg-battle"),
      complete,
      diagnostic,
      inputController,
      seed: 11,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: { apkCaptureResponsiveState: () => RpgBattleSnapshot };
    };
    const host = createSceneHost();
    scene.create.call(host.host);

    inputController.setSnapshot(inputSnapshot({ pressed: ["KeyV"] }));
    scene.update.call(host.host, 0, 0);
    inputController.setSnapshot(inputSnapshot({ pressed: ["Backspace"] }));
    scene.update.call(host.host, 0, 0);

    for (const code of ["KeyB", "KeyR", "KeyA", "KeyV", "KeyE"]) {
      inputController.setSnapshot(inputSnapshot({ pressed: [code], keys: [code] }));
      scene.update.call(host.host, 0, 0);
    }
    inputController.setSnapshot(inputSnapshot({ pressed: ["Enter"] }));
    scene.update.call(host.host, 0, 0);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ targetIndex: 1, totalAttempts: 1 });

    const currentState = scene.extend.apkCaptureResponsiveState();
    const choiceIndex = currentState.correctChoiceIndex;
    const hit = choiceHitPoint(choiceIndex);
    expect(getRpgBattleChoiceIndex(hit.x, hit.y, RPG_BATTLE_CANVAS.width, RPG_BATTLE_CANVAS.height)).toBe(choiceIndex);
    inputController.setSnapshot(inputSnapshot({ pointer: { released: true, x: hit.x, y: hit.y } }));
    scene.update.call(host.host, 0, 0);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ phase: "victory", totalAttempts: 2 });
    expect(complete).toHaveBeenCalledWith(expect.any(Object), "victory");
  });

  it("reports both nonterminal and terminal pointer turns", () => {
    const inputController = createMutableInputController();
    const diagnostic = vi.fn();
    const config = createRpgBattleCartridge().createGameConfig({
      input: VOCABULARY,
      edition: createCatalogStandardEdition(
        ["legacy-catalog/rpg-battle/arena"],
        "/assets/apk/standard-pack-qc/",
        "rpg-battle",
      ),
      complete: vi.fn(),
      diagnostic,
      inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width: 390, height: 844 },
    } as never);
    const scene = config.scene as { create: (this: unknown) => void; update: (this: unknown, time?: number, delta?: number) => void };
    const host = createSceneHost();
    scene.create.call(host.host);

    const initial = createRpgBattleController(VOCABULARY, vi.fn()).snapshot();
    const wrongIndex = initial.answerChoices.findIndex((choice) => choice !== initial.answer);
    const wrongHit = choiceHitPoint(wrongIndex);
    inputController.setSnapshot(inputSnapshot({ pointer: { released: true, x: wrongHit.x, y: wrongHit.y } }));
    scene.update.call(host.host, 0, 0);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "RPG_BATTLE_TURN" }));

    inputController.setSnapshot(inputSnapshot());
    for (let index = 0; index < RPG_BATTLE_FEEDBACK_LOCK_MS / 50; index += 1) {
      scene.update.call(host.host, 0, 50);
    }
    const state = (config.scene as { extend: { apkCaptureResponsiveState: () => RpgBattleSnapshot } }).extend.apkCaptureResponsiveState();
    const correctHit = choiceHitPoint(state.correctChoiceIndex);
    inputController.setSnapshot(inputSnapshot({ pointer: { released: true, x: correctHit.x, y: correctHit.y } }));
    scene.update.call(host.host, 0, 0);
    const finalState = (config.scene as { extend: { apkCaptureResponsiveState: () => RpgBattleSnapshot } }).extend.apkCaptureResponsiveState();
    const finalHit = choiceHitPoint(finalState.correctChoiceIndex);
    inputController.setSnapshot(inputSnapshot({ pointer: { released: true, x: finalHit.x, y: finalHit.y } }));
    scene.update.call(host.host, 0, 0);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "RPG_BATTLE_TERMINAL" }));
  });

  it("renders all initial touch choices with equal styling before feedback", () => {
    const inputController = createMutableInputController();
    const config = createRpgBattleCartridge().createGameConfig({
      input: VOCABULARY,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 11,
    });
    const scene = config.scene as { create: (this: unknown) => void };
    const host = createSceneHost();

    scene.create.call(host.host);

    const choiceFillStyles = host.graphics.fillStyle.mock.calls.slice(-3);
    const choiceBorderStyles = host.graphics.lineStyle.mock.calls.slice(-3);
    expect(new Set(choiceFillStyles.map(([color, alpha]) => `${color}:${alpha}`)).size).toBe(1);
    expect(new Set(choiceBorderStyles.map(([width, color, alpha]) => `${width}:${color}:${alpha}`)).size).toBe(1);
  });

  it("renders plain English choices and aligns readable health values with both fighters", () => {
    const inputController = createMutableInputController();
    const config = createRpgBattleCartridge().createGameConfig({
      input: [
        { term: "bridge", translation: "สะพาน" },
        { term: "forest", translation: "ป่า" },
      ],
      edition: createCatalogStandardEdition(
        ["legacy-catalog/rpg-battle/arena"],
        "/assets/apk/standard-pack-qc/",
        "rpg-battle",
      ),
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 17,
    });
    const scene = config.scene as { create(this: ReturnType<typeof createSceneHost>["host"]): void };
    const host = createSceneHost();

    scene.create.call(host.host);

    const latest = (index: number): string => String(host.texts[index]?.setText.mock.calls.at(-1)?.[0] ?? "");
    expect(host.graphics.fillEllipse).toHaveBeenCalled();
    expect(latest(1)).toBe("สะพาน");
    expect(host.texts.slice(7).map((_text, index) => latest(index + 7)).join(" ")).toContain("bridge");
    expect(host.texts.slice(7).map((_text, index) => latest(index + 7)).join(" ")).not.toMatch(/\[(?:basic|power)\]/u);
    expect(latest(2)).toMatch(/^HP 100\/100$/u);
    expect(latest(4)).toMatch(/^HP \d+\/\d+$/u);
    expect(latest(3)).toBe("");
    expect(host.texts.slice(0, 7).map((_text, index) => latest(index)).join("\n"))
      .not.toMatch(/RPG BATTLE|Translate:|What will HERO do|Type with the keyboard|tap a translation choice/u);
  });

  it("accepts a fast native pointer release inside the visible correct card", () => {
    const inputController = createMutableInputController();
    const config = createRpgBattleCartridge().createGameConfig({
      input: [{ term: "bridge", translation: "สะพาน" }, { term: "forest", translation: "ป่า" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 17,
    });
    const scene = config.scene as {
      create(this: ReturnType<typeof createSceneHost>["host"]): void;
      update(this: ReturnType<typeof createSceneHost>["host"], time?: number, delta?: number): void;
      extend: { apkCaptureResponsiveState: () => RpgBattleSnapshot };
    };
    const sceneSize = { width: 390, height: 733 };
    const canvasRect = { left: 12, top: 96, width: 390, height: 733 };
    const host = createSceneHost(sceneSize, canvasRect);
    scene.create.call(host.host);
    const state = scene.extend.apkCaptureResponsiveState();
    const card = rpgBattleChoiceRect(sceneSize.width, sceneSize.height, state.correctChoiceIndex);
    inputController.setSnapshot(inputSnapshot({
      pointer: { released: true, x: canvasRect.left + card.x + card.width / 2, y: canvasRect.top + card.y + card.height / 2 },
    }));

    scene.update.call(host.host, 0, 0);

    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ targetIndex: 1, totalAttempts: 1, correctAnswers: 1 });
  });

  it("owns responsive state and cleans scene resources without a late result", () => {
    const inputController = createMutableInputController();
    const complete = vi.fn();
    const config = createRpgBattleCartridge().createGameConfig({
      input: VOCABULARY,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
      seed: 11,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: {
        apkCaptureResponsiveState: () => RpgBattleSnapshot;
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const host = createSceneHost();
    scene.create.call(host.host);
    inputController.setSnapshot(inputSnapshot({ pressed: ["KeyV"], keys: ["KeyV"] }));
    scene.update.call(host.host, 0, 0);
    const captured = scene.extend.apkCaptureResponsiveState();
    scene.extend.apkRecompose({ profile: "compact" });
    scene.extend.apkRestoreResponsiveState(captured);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(captured);

    host.emit("shutdown");
    host.emit("destroy");
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ destroyed: true, typedAnswer: "v" });
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(host.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect(complete).not.toHaveBeenCalled();
  });

  it("wins a perfect run of 15 vocabulary items without a counterattack on correct answers", () => {
    const deliver = vi.fn();
    const items = vocabularyOf(15);
    const controller = createRpgBattleController(items, deliver);
    let terminal: ReturnType<RpgBattleController["submit"]> | undefined;

    for (let index = 0; index < items.length; index += 1) {
      const result = submitCorrect(controller);
      expect(result).toMatchObject({ accepted: true, correct: true, enemyDamage: 0 });
      expect(result.snapshot.phase).not.toBe("defeat");
      expect(result.snapshot.playerHealth).toBe(RPG_BATTLE_PLAYER_MAX_HEALTH);
      if (result.terminal) terminal = result;
    }

    expect(terminal).toMatchObject({ terminal: true, completed: true, result: expect.any(Object) });
    expect(controller.snapshot()).toMatchObject({
      phase: "victory",
      targetIndex: items.length,
      playerHealth: RPG_BATTLE_PLAYER_MAX_HEALTH,
      enemyHealth: 0,
      score: items.length * RPG_BATTLE_SCORE_PER_CORRECT,
    });
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(terminal?.result, "victory");
  });

  it("shows a Thai target with English typed and choice answers", () => {
    const oneItem = createRpgBattleController([{ term: "brave", translation: "กล้าหาญ" }], vi.fn());
    const twoItem = createRpgBattleController(VOCABULARY, vi.fn());
    const terms = new Set(VOCABULARY.map((item) => item.term));

    expect(oneItem.snapshot()).toMatchObject({ prompt: "กล้าหาญ", answer: "brave" });
    expect(oneItem.snapshot().answerChoices).toHaveLength(3);
    expect(oneItem.snapshot().answerChoices.every((choice) => choice === "brave")).toBe(true);
    expect(oneItem.snapshot().answerChoices.join(" ")).not.toMatch(/Decoy translation/u);
    expect(twoItem.snapshot().answerChoices).toHaveLength(3);
    expect(twoItem.snapshot().answerChoices.every((choice) => terms.has(choice))).toBe(true);
    expect(twoItem.snapshot().answerChoices).not.toContain("Decoy translation 1");
    expect(twoItem.snapshot().answerChoices).not.toContain("Decoy translation 2");
  });

  it("keeps compact and CSS-scaled choice cards inside the displayed battle width", () => {
    for (const [sceneWidth, sceneHeight, renderedScale] of [[390, 733, 1], [960, 540, 336 / 960]] as const) {
      const cards = [0, 1, 2].map((index) => rpgBattleChoiceRect(sceneWidth, sceneHeight, index, renderedScale));
      for (const card of cards) {
        expect(card.x).toBeGreaterThanOrEqual(0);
        expect((card.x + card.width) * renderedScale).toBeLessThanOrEqual(sceneWidth * renderedScale);
        expect(card.height * renderedScale).toBeGreaterThanOrEqual(40);
      }
      if (renderedScale < 0.75) {
        expect(cards[0]!.x + cards[0]!.width).toBeLessThanOrEqual(cards[1]!.x);
        expect(cards[1]!.x + cards[1]!.width).toBeLessThanOrEqual(cards[2]!.x);
      } else {
        expect(cards[0]!.y + cards[0]!.height).toBeLessThanOrEqual(cards[1]!.y);
        expect(cards[1]!.y + cards[1]!.height).toBeLessThanOrEqual(cards[2]!.y);
      }
    }
  });

  it("advances the tutorial correct step even when the previous step still holds the 900ms lock", () => {
    const complete = vi.fn();
    const cartridge = createRpgBattleCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: createMutableInputController(),
      sessionMode: "tutorial",
      seed: 11,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      extend: { apkCaptureResponsiveState: () => RpgBattleSnapshot };
    };
    const host = createSceneHost();
    scene.create.call(host.host);
    const definition = cartridge.standardExperience.definition;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const runStep = (index: number): void => {
      const step = definition.tutorial.steps[index];
      if (!step) throw new Error("RPG Battle tutorial step is missing");
      driver.execute({
        tutorial: definition.tutorial,
        step,
        seed: definition.tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: vi.fn() },
      });
    };

    runStep(0);
    const afterIncorrect = scene.extend.apkCaptureResponsiveState();
    expect(afterIncorrect).toMatchObject({
      lastOutcome: "incorrect",
      targetIndex: 0,
      inputLocked: true,
    });

    runStep(1);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      lastOutcome: "correct",
      targetIndex: 1,
      correctAnswers: 1,
      score: RPG_BATTLE_SCORE_PER_CORRECT,
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it("paints a grass arena, platforms, and fighter sprites from the catalog edition", () => {
    const edition = createCatalogStandardEdition(
      ["legacy-catalog/rpg-battle/arena"],
      "/assets/apk/standard-pack-qc/",
      "rpg-battle",
    );
    const config = createRpgBattleCartridge().createGameConfig({
      input: VOCABULARY,
      edition,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: createMutableInputController(),
      seed: 11,
    });
    const scene = config.scene as {
      preload: (this: unknown) => void;
      create: (this: unknown) => void;
    };

    const loadedImages: string[] = [];
    const loadedSheets: string[] = [];
    const placedKeys: string[] = [];
    const spritePositions: Array<{ key: string; x: number; y: number }> = [];
    const tileSprites: Array<{ key: string; width: number; height: number }> = [];
    const makeImage = (key: string) => {
      const image = {
        setOrigin: vi.fn(() => image),
        setDisplaySize: vi.fn(() => image),
        setDepth: vi.fn(() => image),
        setPosition: vi.fn((x: number, y: number) => {
          spritePositions.push({ key, x, y });
          return image;
        }),
        setVisible: vi.fn(() => image),
        setFlipX: vi.fn(() => image),
        destroy: vi.fn(),
      };
      placedKeys.push(key);
      return image;
    };
    const host = createSceneHost();
    Object.assign(host.host, {
      load: {
        image: vi.fn((key: string) => {
          loadedImages.push(key);
        }),
        spritesheet: vi.fn((key: string) => {
          loadedSheets.push(key);
        }),
      },
    });
    Object.assign(host.host.add, {
      image: vi.fn((_x: number, _y: number, key: string) => makeImage(key)),
      sprite: vi.fn((x: number, y: number, key: string) => {
        spritePositions.push({ key, x, y });
        return makeImage(key);
      }),
      tileSprite: vi.fn((_x: number, _y: number, width: number, height: number, key: string) => {
        tileSprites.push({ key, width, height });
        return makeImage(key);
      }),
    });
    scene.preload.call(host.host);
    scene.create.call(host.host);

    expect(loadedImages).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:tile-grass",
      "apk:catalog-standard-pack:tile-dirt",
      "apk:catalog-standard-pack:prop-tree",
    ]));
    expect(loadedSheets).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:player-knight",
      "apk:catalog-standard-pack:enemy-beast",
    ]));
    expect(placedKeys).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:tile-grass",
      "apk:catalog-standard-pack:prop-tree",
      "apk:catalog-standard-pack:player-knight",
      "apk:catalog-standard-pack:enemy-beast",
    ]));
    expect(tileSprites).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "apk:catalog-standard-pack:prop-tree", height: 48 }),
    ]));
    const player = spritePositions.find((entry) => entry.key === "apk:catalog-standard-pack:player-knight");
    const enemy = spritePositions.find((entry) => entry.key === "apk:catalog-standard-pack:enemy-beast");
    expect(player?.y).toBe(enemy?.y);
    expect(host.graphics.fillRect).not.toHaveBeenCalledWith(0, 0, 960, 540);
    expect(host.graphics.fillCircle).not.toHaveBeenCalled();
    expect(host.graphics.fillEllipse).toHaveBeenCalled();
  });

  it("keeps the bespoke source independent from shared legacy catalog factories and providers", () => {
    const source = readFileSync(resolve(REPO_ROOT, "packages/game-cartridges/src/rpg-battle.ts"), "utf8");

    expect(source).not.toMatch(/createLegacyCatalog(?:Cartridge|Controller)/u);
    expect(source).not.toMatch(/(?:next(?:\/|["'])|@reading-advantage\/(?:db|domain|api))/u);
    expect(source).not.toMatch(/(?:drizzle|firebase|from\s+["']phaser["'])/iu);
  });
});
