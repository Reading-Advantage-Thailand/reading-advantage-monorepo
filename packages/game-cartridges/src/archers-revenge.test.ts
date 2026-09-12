import type {
  APKInputController,
  APKInputSnapshot,
} from "@reading-advantage/advantage-play-kit";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ARCHERS_REVENGE_CANVAS,
  clampArchersRevengeLabelX,
  createArchersRevengeCartridge,
  createArchersRevengeController,
  getArchersRevengeColumnFromPointer,
  type ArchersRevengeSnapshot,
} from "./archers-revenge.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const INPUT = [
  { term: "brave", translation: "courageous" },
  { term: "swift", translation: "fast" },
  { term: "calm", translation: "peaceful" },
];

const LARGE_INPUT = Array.from({ length: 45 }, (_, index) => ({
  term: `term-${index}`,
  translation: `translation-${index}`,
}));

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

function createInputController(): APKInputController & {
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

function createSceneHost() {
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
  for (const method of [
    "clear",
    "fillStyle",
    "fillRect",
    "fillCircle",
    "fillRoundedRect",
    "lineStyle",
    "strokeRoundedRect",
  ] as const) {
    graphics[method].mockReturnValue(graphics);
  }

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
    add: {
      graphics: vi.fn(() => graphics),
      text: vi.fn(() => createText()),
    },
    events: {
      once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
    },
    game: {
      canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: ARCHERS_REVENGE_CANVAS.width, height: ARCHERS_REVENGE_CANVAS.height }),
      },
    },
    scale: { width: ARCHERS_REVENGE_CANVAS.width, height: ARCHERS_REVENGE_CANVAS.height },
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

function currentTarget(snapshot: ArchersRevengeSnapshot) {
  const target = snapshot.enemies.find((enemy) => !enemy.shielded);
  if (!target) throw new Error("The formation needs one unshielded target");
  return target;
}

function currentFrontlineShielded(snapshot: ArchersRevengeSnapshot) {
  const target = snapshot.enemies.find((enemy) => !enemy.shielded);
  const shielded = snapshot.enemies.find((enemy) => enemy.shielded
    && !snapshot.enemies.some((candidate) => candidate.column === enemy.column && candidate.row > enemy.row));
  if (!target || !shielded) throw new Error("The formation needs a frontline target and distractor");
  return shielded;
}

function clearFormation(controller: ReturnType<typeof createArchersRevengeController>): void {
  while (controller.snapshot().phase === "playing") {
    const target = currentTarget(controller.snapshot());
    controller.aimColumn(target.column);
    controller.fire();
    controller.tick(600);
  }
}

describe("Archer's Revenge cartridge", () => {
  it("keeps measured frontline labels inside their lanes at formation edges", () => {
    const laneWidth = ARCHERS_REVENGE_CANVAS.width / 5;
    const labelWidth = laneWidth - 12;

    expect(clampArchersRevengeLabelX(-40, 0, labelWidth, ARCHERS_REVENGE_CANVAS.width)).toBe(laneWidth / 2);
    expect(clampArchersRevengeLabelX(ARCHERS_REVENGE_CANVAS.width + 40, 4, labelWidth, ARCHERS_REVENGE_CANVAS.width))
      .toBe(ARCHERS_REVENGE_CANVAS.width - laneWidth / 2);
  });

  it("exposes a bespoke three-row formation and deterministic target", () => {
    const first = createArchersRevengeController(INPUT, vi.fn(), { seed: 7 });
    const second = createArchersRevengeController(INPUT, vi.fn(), { seed: 7 });

    expect(createArchersRevengeCartridge().manifest).toMatchObject({
      id: "archers-revenge",
      title: "Archer's Revenge",
      inputMode: "vocabulary",
      runtimeApiVersion: "1.0.0",
    });
    expect(first.snapshot()).toMatchObject({
      phase: "playing",
      wave: 1,
      maxWaves: 3,
      targetIndex: 0,
      targetCount: INPUT.length,
      hp: 3,
      combo: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      arrows: [],
      enemyProjectiles: [],
      destroyed: false,
      prompt: INPUT[0].translation,
      answer: INPUT[0].term,
      correctAction: "confirm",
      availableActions: ["move-left", "move-right", "confirm"],
      lives: 3,
      energy: 0,
    });
    expect(first.snapshot().enemies).toHaveLength(15);
    expect(first.snapshot().enemies.filter((enemy) => !enemy.shielded)).toHaveLength(1);
    expect(first.snapshot()).toEqual(second.snapshot());
  });

  it("aims by column, fires a travelling arrow, and awards a correct collision", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), { seed: 1 });
    const target = currentTarget(controller.snapshot());

    const fired = controller.fire(target.column);
    expect(fired.accepted).toBe(true);
    expect(fired.snapshot.arrows).toHaveLength(1);
    expect(fired.snapshot.aimColumn).toBe(target.column);

    const inFlight = controller.tick(100);
    expect(inFlight.arrowHits).toEqual([]);
    expect(inFlight.snapshot.arrows).toHaveLength(1);

    const collision = controller.tick(900);
    expect(collision.arrowHits).toEqual([{ enemyId: target.id, correct: true }]);
    expect(collision.snapshot).toMatchObject({
      score: 100,
      combo: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      targetIndex: 1,
      lastOutcome: "correct",
    });
    expect(collision.snapshot.target).toMatchObject({
      term: INPUT[1].term,
      translation: INPUT[1].translation,
    });
    expect(collision.snapshot.enemies).not.toContainEqual(target);
  });

  it("uses actual horizontal distance after formation motion for arrow misses and hits", () => {
    const miss = createArchersRevengeController(INPUT, vi.fn(), {
      seed: 1,
      formationDescendSpeed: 0,
      formationSpeed: 200,
      formationTravel: 120,
    });
    const missTarget = currentTarget(miss.snapshot());
    miss.fire(missTarget.column);
    const missed = miss.tick(400);

    expect(missed.snapshot.formationOffset).toBe(80);
    expect(missed.arrowHits).toEqual([]);
    expect(missed.snapshot).toMatchObject({ targetIndex: 0, totalAttempts: 0 });

    const hit = createArchersRevengeController(INPUT, vi.fn(), {
      seed: 1,
      formationDescendSpeed: 0,
      formationSpeed: 50,
      formationTravel: 120,
    });
    const hitTarget = currentTarget(hit.snapshot());
    hit.fire(hitTarget.column);
    const collided = hit.tick(400);

    expect(collided.snapshot.formationOffset).toBe(20);
    expect(collided.arrowHits).toEqual([{ enemyId: hitTarget.id, correct: true }]);
    expect(collided.snapshot).toMatchObject({ targetIndex: 1, lastOutcome: "correct" });
  });

  it("supports the shared semantic choose and hazard results", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), { seed: 2 });

    const moved = controller.choose("move-right");
    expect(moved).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(moved.snapshot.aimColumn).toBe(1);

    const hazard = controller.applyHazard();
    expect(hazard).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(hazard.snapshot.enemyProjectiles).toHaveLength(1);
    expect(hazard.snapshot.targetIndex).toBe(0);
  });

  it("treats a shielded hit as wrong and spawns an enemy projectile", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), { seed: 2 });
    const before = controller.snapshot();
    const shielded = currentFrontlineShielded(controller.snapshot());

    controller.aimColumn(shielded.column);
    controller.fire();
    const collision = controller.tick(1_000);

    expect(collision.arrowHits).toEqual([{ enemyId: shielded.id, correct: false }]);
    expect(collision.snapshot).toMatchObject({
      combo: 0,
      correctAnswers: 0,
      totalAttempts: 1,
      lastOutcome: "incorrect",
    });
    expect(collision.snapshot.enemies).toContainEqual(expect.objectContaining({
      id: shielded.id,
      column: shielded.column,
      shielded: true,
    }));
    expect(collision.snapshot.enemyProjectiles).toHaveLength(1);
    expect(collision.snapshot.target).toEqual(before.target);
  });

  it("damages the player when an enemy projectile reaches the aimed player", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), { seed: 3 });
    const shielded = currentFrontlineShielded(controller.snapshot());

    controller.aimColumn(shielded.column);
    controller.fire();
    controller.tick(1_000);
    const beforeProjectile = controller.snapshot();
    const result = controller.tick(2_000);

    expect(result.projectileHits).toBe(1);
    expect(result.snapshot.hp).toBe(beforeProjectile.hp - 1);
    expect(result.snapshot.combo).toBe(0);
    expect(result.snapshot.enemyProjectiles).toHaveLength(0);
  });

  it("advances the wave only after every fifteen-enemy formation target is cleared", () => {
    const controller = createArchersRevengeController(LARGE_INPUT.slice(0, 30), vi.fn(), { seed: 4, maxWaves: 2 });

    for (let index = 0; index < 15; index += 1) {
      const target = currentTarget(controller.snapshot());
      controller.aimColumn(target.column);
      controller.fire();
      const result = controller.tick(600);
      expect(result.snapshot.wave).toBe(index === 14 ? 2 : 1);
    }

    expect(controller.snapshot()).toMatchObject({
      phase: "playing",
      wave: 2,
      targetIndex: 15,
      enemies: expect.arrayContaining([
        expect.objectContaining({ column: 0 }),
        expect.objectContaining({ column: 4 }),
      ]),
    });
    expect(controller.snapshot().enemies).toHaveLength(15);
    expect(controller.snapshot().enemies.filter((enemy) => !enemy.shielded)).toHaveLength(1);
  });

  it("clears short input once without cycling a learning target", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), {
      seed: 6,
      targetChangeIntervalMs: 60_000,
    });
    const targetTerms: string[] = [];

    while (controller.snapshot().phase === "playing") {
      const state = controller.snapshot();
      targetTerms.push(state.target.term);
      controller.fire(state.target.column);
      controller.tick(1_000);
    }

    expect(targetTerms).toEqual(INPUT.map((item) => item.term));
    expect(controller.snapshot()).toMatchObject({
      phase: "victory",
      targetCount: INPUT.length,
      targetIndex: INPUT.length,
      correctAnswers: INPUT.length,
      totalAttempts: INPUT.length,
    });
  });

  it("resolves each of 45 input targets across three waves without cycling", () => {
    const controller = createArchersRevengeController(LARGE_INPUT, vi.fn(), {
      seed: 9,
      targetChangeIntervalMs: 60_000,
    });
    const waves = [controller.snapshot().wave];
    const targetTerms: string[] = [];

    while (controller.snapshot().phase === "playing") {
      const target = currentTarget(controller.snapshot());
      targetTerms.push(controller.snapshot().target.term);
      controller.fire(target.column);
      const result = controller.tick(1_000);
      if (result.snapshot.wave !== waves[waves.length - 1]) waves.push(result.snapshot.wave);
    }

    expect(waves).toEqual([1, 2, 3]);
    expect(targetTerms).toHaveLength(45);
    expect(targetTerms).toEqual(LARGE_INPUT.map((item) => item.term));
    expect(controller.snapshot()).toMatchObject({
      phase: "victory",
      targetCount: 45,
      targetIndex: 45,
      correctAnswers: 45,
      totalAttempts: 45,
      enemies: [],
    });
  });

  it("moves the formation and reverses at deterministic horizontal edges", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), {
      seed: 10,
      formationSpeed: 40,
      formationTravel: 50,
      formationDescendSpeed: 0,
    });
    const initial = controller.snapshot();
    const moved = controller.tick(1_000).snapshot;
    expect(moved.formationOffset).toBe(40);
    expect(moved.formationDirection).toBe(1);
    expect(moved.enemies[0]?.x).toBe(initial.enemies[0]!.x + 40);

    const edge = controller.tick(250).snapshot;
    expect(edge.formationOffset).toBe(50);
    expect(edge.formationDirection).toBe(-1);

    const reversed = controller.tick(500).snapshot;
    expect(reversed.formationOffset).toBe(30);
    expect(reversed.formationDirection).toBe(-1);
  });

  it("changes the active target on a deterministic timer", () => {
    const first = createArchersRevengeController(INPUT, vi.fn(), {
      seed: 11,
      formationDescendSpeed: 0,
      targetChangeIntervalMs: 1_000,
    });
    const second = createArchersRevengeController(INPUT, vi.fn(), {
      seed: 11,
      formationDescendSpeed: 0,
      targetChangeIntervalMs: 1_000,
    });
    const before = first.snapshot();
    const after = first.tick(1_000).snapshot;
    const deterministic = second.tick(1_000).snapshot;

    expect(after.target.column).not.toBe(before.target.column);
    expect(after.target.term).toBe(before.target.term);
    expect(after.target.translation).toBe(before.target.translation);
    expect(after.targetChangeCount).toBe(1);
    expect(after.targetChangeTimer).toBe(1_000);
    expect(after).toEqual(deterministic);
  });

  it("emits one result for finite-wave victory and ignores later shots", () => {
    const deliver = vi.fn();
    const controller = createArchersRevengeController(INPUT, deliver, { seed: 5, maxWaves: 1 });

    clearFormation(controller);
    const terminal = controller.snapshot();
    const after = controller.fire();
    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);

    expect(terminal).toMatchObject({ phase: "victory", wave: 1, targetIndex: INPUT.length, enemies: [] });
    expect(after.accepted).toBe(false);
    expect(result).toMatchObject({
      accuracy: 1,
      score: 300,
      correctAnswers: INPUT.length,
      totalAttempts: INPUT.length,
    });
    expect(deliver).toHaveBeenCalledWith(expect.anything(), "victory");
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("returns the first terminal result from first and subsequent choose calls", () => {
    const deliver = vi.fn();
    const controller = createArchersRevengeController(INPUT.slice(0, 1), deliver, {
      seed: 5,
      formationDescendSpeed: 0,
    });
    const target = currentTarget(controller.snapshot());
    controller.fire(target.column);
    controller.tick(1_000);

    const delivered = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);
    const firstTerminalChoose = controller.choose("confirm");
    const subsequentTerminalChoose = controller.choose("move-right");

    expect(firstTerminalChoose).toMatchObject({
      accepted: false,
      terminal: true,
      completed: true,
      result: delivered,
      snapshot: { phase: "victory" },
    });
    expect(subsequentTerminalChoose).toMatchObject({
      accepted: false,
      terminal: true,
      completed: true,
      result: delivered,
      snapshot: { phase: "victory" },
    });
    expect(firstTerminalChoose.result).toEqual(subsequentTerminalChoose.result);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("passes victory through context completion with an explicit outcome", () => {
    const complete = vi.fn();
    const cartridge = createArchersRevengeCartridge();
    cartridge.createGameConfig({
      input: INPUT.slice(0, 1),
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: createInputController(),
      seed: 5,
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

  it("defeats at zero HP and after the last formation-breach life", () => {
    const projectileDelivery = vi.fn();
    const projectileController = createArchersRevengeController(
      INPUT,
      projectileDelivery,
      { seed: 6, maxHp: 1 },
    );
    const shielded = currentFrontlineShielded(projectileController.snapshot());
    projectileController.aimColumn(shielded.column);
    projectileController.fire();
    projectileController.tick(1_000);
    const defeat = projectileController.tick(2_000);

    expect(defeat.snapshot).toMatchObject({ phase: "defeat", hp: 0 });
    const projectileResult = gameResultsSchema.parse(projectileDelivery.mock.calls[0]?.[0]);
    expect(projectileResult).toMatchObject({
      accuracy: 0,
      correctAnswers: 0,
      totalAttempts: 1,
    });
    expect(projectileDelivery).toHaveBeenCalledWith(projectileResult, "defeat");
    expect(projectileController.choose("confirm")).toMatchObject({
      accepted: false,
      terminal: true,
      completed: true,
      result: projectileResult,
      snapshot: { phase: "defeat" },
    });
    expect(projectileDelivery).toHaveBeenCalledOnce();

    const breachDelivery = vi.fn();
    const breachController = createArchersRevengeController(
      INPUT,
      breachDelivery,
      { seed: 7, formationDescendSpeed: 100 },
    );
    const firstBreach = breachController.tick(3_000);
    expect(firstBreach).toMatchObject({
      breached: true,
      terminal: false,
      snapshot: { phase: "playing", hp: 2 },
    });
    expect(breachDelivery).not.toHaveBeenCalled();
    expect(breachController.tick(16)).toMatchObject({
      breached: false,
      terminal: false,
      snapshot: { phase: "playing", hp: 2 },
    });

    const secondBreach = breachController.tick(3_000);
    expect(secondBreach).toMatchObject({
      breached: true,
      terminal: false,
      snapshot: { phase: "playing", hp: 1 },
    });

    const lastBreach = breachController.tick(3_000);
    expect(lastBreach).toMatchObject({
      breached: true,
      terminal: true,
      snapshot: { phase: "defeat", hp: 0 },
    });
    expect(breachDelivery).toHaveBeenCalledWith(expect.anything(), "defeat");
    expect(breachDelivery).toHaveBeenCalledOnce();
  });

  it("keeps a clock-only descent playing while health remains", () => {
    const deliver = vi.fn();
    const controller = createArchersRevengeController(INPUT, deliver, { seed: 7 });
    const afterFirstLine = controller.tick(65_100);

    expect(afterFirstLine).toMatchObject({
      breached: true,
      terminal: false,
      snapshot: {
        phase: "playing",
        hp: 2,
        maxHp: 3,
        totalAttempts: 0,
      },
    });
    expect(deliver).not.toHaveBeenCalled();
    expect(controller.snapshot().result).toBeUndefined();
  });

  it("hits a shielded enemy on the tutorial incorrect step", () => {
    const complete = vi.fn();
    const cartridge = createArchersRevengeCartridge();
    const tutorial = cartridge.standardExperience.definition.tutorial;
    const incorrectStep = tutorial.steps[0];
    if (!incorrectStep) throw new Error("Expected an incorrect tutorial step");
    const config = cartridge.createGameConfig({
      input: INPUT,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: createInputController(),
      seed: tutorial.seed,
      sessionMode: "tutorial",
    });
    const scene = config.scene as {
      extend: { apkCaptureResponsiveState(): ArchersRevengeSnapshot };
    };

    cartridge.standardExperience.createTutorialActionDriver().execute({
      tutorial,
      step: incorrectStep,
      seed: tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });

    const afterIncorrect = scene.extend.apkCaptureResponsiveState();
    const hitEnemy = afterIncorrect.enemies.find((enemy) =>
      enemy.column !== afterIncorrect.target.column
      && afterIncorrect.enemyProjectiles.some((projectile) => projectile.column === enemy.column));
    expect(afterIncorrect).toMatchObject({
      phase: "playing",
      lastOutcome: "incorrect",
      score: 0,
      correctAnswers: 0,
      totalAttempts: 1,
      targetIndex: 0,
    });
    expect(hitEnemy).toMatchObject({ shielded: true });
    expect(complete).not.toHaveBeenCalled();
  });

  it("keeps the English target choice distinct from shielded distractors", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), {
      seed: 29,
      formationDescendSpeed: 0,
      targetChangeIntervalMs: 1_000,
    });
    const assertShieldedTextDiffers = (snapshot: ArchersRevengeSnapshot): void => {
      expect(snapshot.enemies.filter((enemy) => !enemy.shielded)).toHaveLength(1);
      expect(
        snapshot.enemies.some((enemy) =>
          enemy.shielded && enemy.translation === snapshot.target.translation),
      ).toBe(false);
    };

    assertShieldedTextDiffers(controller.snapshot());
    assertShieldedTextDiffers(controller.tick(1_000).snapshot);
  });

  it("accepts keyboard and pointer scene input, preserves responsive state, and cleans up", () => {
    const inputController = createInputController();
    const complete = vi.fn();
    const cartridge = createArchersRevengeCartridge();
    const config = cartridge.createGameConfig({
      input: INPUT,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
      seed: 8,
    });
    const scene = config.scene as {
      create(this: unknown): void;
      update(this: unknown, time?: number, delta?: number): void;
      extend: {
        apkCaptureResponsiveState(): ArchersRevengeSnapshot;
        apkRestoreResponsiveState(state: unknown): void;
        apkRecompose(composition: unknown): void;
      };
    };
    const host = createSceneHost();
    scene.create.call(host.host);
    const initial = scene.extend.apkCaptureResponsiveState();
    expect(host.texts[1]?.setText).toHaveBeenLastCalledWith(initial.target.translation);
    const frontlineTerms = initial.enemies.filter((enemy) =>
      !initial.enemies.some((candidate) => candidate.column === enemy.column && candidate.row > enemy.row))
      .map((enemy) => enemy.term);
    expect(frontlineTerms).toContain(initial.target.term);
    expect(host.texts.slice(5).map((label) => label.setText.mock.calls.at(-1)?.[0]).filter(Boolean))
      .toEqual(expect.arrayContaining(frontlineTerms));

    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowRight"] }));
    scene.update.call(host.host, 0, 16);
    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowLeft"] }));
    scene.update.call(host.host, 0, 16);
    const aimed = scene.extend.apkCaptureResponsiveState();
    expect(aimed.aimColumn).toBe(0);

    inputController.setSnapshot(inputSnapshot({
      pointer: { released: true, x: ARCHERS_REVENGE_CANVAS.width * 0.1, y: 250 },
    }));
    scene.update.call(host.host, 0, 16);
    const captured = scene.extend.apkCaptureResponsiveState();
    scene.extend.apkRecompose({ profile: "compact" });
    expect(() => scene.extend.apkRestoreResponsiveState({ ...captured, seed: captured.seed + 1 })).toThrow();
    scene.extend.apkRestoreResponsiveState(captured);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(captured);

    host.emit("shutdown");
    host.emit("destroy");
    expect(scene.extend.apkCaptureResponsiveState().destroyed).toBe(true);
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(host.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect(complete).not.toHaveBeenCalled();
  });

  it("rejects invalid setup, pointer, and simulation values", () => {
    expect(() => createArchersRevengeController([], vi.fn())).toThrow();
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { seed: -1 })).toThrow(/seed/u);
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { seed: 1.5 })).toThrow(/seed/u);
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { maxWaves: 0 })).toThrow(/maxWaves/u);
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { maxHp: 0 })).toThrow(/maxHp/u);
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { arrowSpeed: 0 })).toThrow(/arrowSpeed/u);
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { projectileSpeed: Number.NaN })).toThrow(/projectileSpeed/u);
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { formationDescendSpeed: -1 })).toThrow(/formationDescendSpeed/u);
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { formationSpeed: -1 })).toThrow(/formationSpeed/u);
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { formationTravel: 0 })).toThrow(/formationTravel/u);
    expect(() => createArchersRevengeController(INPUT, vi.fn(), { targetChangeIntervalMs: 0 })).toThrow(/targetChangeIntervalMs/u);
    expect(() => getArchersRevengeColumnFromPointer(Number.NaN, ARCHERS_REVENGE_CANVAS.width)).toThrow();
    expect(() => getArchersRevengeColumnFromPointer(10, 0)).toThrow();

    const controller = createArchersRevengeController(INPUT, vi.fn());
    expect(() => controller.tick(-1)).toThrow();
    expect(() => controller.tick(Number.POSITIVE_INFINITY)).toThrow();
  });

  it("bounds aim, rejects unavailable actions, and enforces arrow cooldown", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), { formationDescendSpeed: 0 });

    expect(controller.aimColumn(Number.NaN)).toMatchObject({ accepted: true, column: 0 });
    expect(controller.aimColumn(99).column).toBe(4);
    expect(controller.aimColumn(-99).column).toBe(0);
    expect(controller.choose("unknown-action" as never)).toMatchObject({ accepted: false, terminal: false });

    expect(controller.fire().accepted).toBe(true);
    expect(controller.fire().accepted).toBe(false);
    controller.tick(160);
    expect(controller.fire().accepted).toBe(true);
  });

  it("rejects incompatible responsive snapshots and restores a terminal victory", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), { seed: 12, formationDescendSpeed: 0 });
    const captured = controller.capture();
    const invalidStates: ArchersRevengeSnapshot[] = [
      null as never,
      { ...captured, phase: "invalid" as never },
      { ...captured, status: "defeat" as never },
      { ...captured, availableActions: ["confirm"] },
      { ...captured, maxWaves: captured.maxWaves + 1 },
      { ...captured, maxHp: captured.maxHp + 1 },
      { ...captured, wave: 0 },
      { ...captured, targetCount: captured.targetCount + 1 },
      { ...captured, targetIndex: -1 },
      { ...captured, target: { ...captured.target, term: "altered" } },
      { ...captured, aimColumn: 99 },
      { ...captured, hp: captured.maxHp + 1 },
      { ...captured, score: 1 },
      { ...captured, correctAnswers: 1 },
      { ...captured, totalAttempts: -1 },
      { ...captured, gameTime: -1 },
      { ...captured, lastOutcome: "unknown" as never },
      { ...captured, enemies: [captured.enemies[0]!] },
      { ...captured, enemies: captured.enemies.map((enemy, index) => index === 0 ? { ...enemy, x: enemy.x + 1 } : enemy) },
      { ...captured, arrows: [{ id: "arrow:0", column: 99, x: 0, y: 0 }] },
      { ...captured, enemyProjectiles: [{ id: "projectile:0", column: 99, x: 0, y: 0 }] },
      { ...captured, targetChangeTimer: -1 },
    ];

    for (const state of invalidStates) expect(() => controller.restore(state)).toThrow();

    const victoryController = createArchersRevengeController(INPUT.slice(0, 1), vi.fn(), {
      seed: 12,
      formationDescendSpeed: 0,
    });
    clearFormation(victoryController);
    const victory = victoryController.capture();
    const restored = createArchersRevengeController(INPUT.slice(0, 1), vi.fn(), {
      seed: 12,
      formationDescendSpeed: 0,
    });
    restored.restore(victory);
    expect(restored.snapshot()).toEqual(victory);
    expect(restored.choose("confirm")).toMatchObject({ terminal: true, completed: true });
  });

  it("seals controller actions after destruction and renders active projectiles", () => {
    const controller = createArchersRevengeController(INPUT, vi.fn(), { seed: 2 });
    controller.destroy();
    controller.destroy();

    expect(controller.choose("confirm")).toMatchObject({ accepted: false, terminal: false });
    expect(controller.applyHazard()).toMatchObject({ accepted: false, terminal: false });
    expect(controller.fire()).toMatchObject({ accepted: false });
    expect(controller.tick(16).snapshot.destroyed).toBe(true);
    expect(controller.aimColumn(2).accepted).toBe(false);

    const inputController = createInputController();
    const config = createArchersRevengeCartridge().createGameConfig({
      input: INPUT,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 2,
    });
    const scene = config.scene as { create(this: unknown): void; update(this: unknown, time?: number, delta?: number): void };
    const host = createSceneHost();
    scene.create.call(host.host);
    inputController.setSnapshot(inputSnapshot({ pressed: ["Space"] }));
    scene.update.call(host.host, 0, 0);
    expect(host.graphics.fillRect).toHaveBeenCalled();
    host.emit("shutdown");
    host.emit("destroy");
  });
});
