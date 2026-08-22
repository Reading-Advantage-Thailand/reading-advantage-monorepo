import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  GRAVEYARD_SOLIDS,
  INITIAL_HP,
  INVULNERABILITY_DURATION,
  MAX_SHOCKWAVE_CHARGES,
  WIZARD_MOVE_SPEED,
  WIZARD_VS_ZOMBIE_CANVAS,
  hitsGraveyardSolid,
  type WizardVsZombieSnapshot,
  createWizardVsZombieCartridge,
  createWizardVsZombieController,
} from "./wizard-vs-zombie.js";
import { createCatalogStandardEdition } from "./catalog-standard-art.js";

const VOCABULARY = [
  { term: "bright", translation: "brillante" },
  { term: "shadow", translation: "sombra" },
  { term: "whisper", translation: "susurro" },
];

function mockText() {
  return {
    destroy: vi.fn(),
    setPosition: vi.fn(function (this: unknown) { return this; }),
    setText: vi.fn(function (this: unknown, _value: string) { return this; }),
  };
}

function mockGraphics() {
  const graphics = {
    clear: vi.fn(function (this: unknown) { return this; }),
    fillCircle: vi.fn(function (this: unknown) { return this; }),
    fillRect: vi.fn(function (this: unknown) { return this; }),
    fillRoundedRect: vi.fn(function (this: unknown) { return this; }),
    fillStyle: vi.fn(function (this: unknown) { return this; }),
    lineStyle: vi.fn(function (this: unknown) { return this; }),
    strokeRoundedRect: vi.fn(function (this: unknown) { return this; }),
    setDepth: vi.fn(function (this: unknown) { return this; }),
    destroy: vi.fn(),
  };
  return graphics;
}

function mockScene() {
  const listeners = new Map<string, () => void>();
  const createdGraphics: ReturnType<typeof mockGraphics>[] = [];
  const createdTexts: ReturnType<typeof mockText>[] = [];
  const scene = {
    add: {
      graphics: vi.fn(() => {
        const graphics = mockGraphics();
        createdGraphics.push(graphics);
        return graphics;
      }),
      text: vi.fn(() => { const text = mockText(); createdTexts.push(text); return text; }),
    },
    events: {
      once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
    },
    game: {
      canvas: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }),
      },
    },
    scale: { width: 960, height: 540 },
  };
  return { scene, createdGraphics, createdTexts, listeners };
}

function inputSnapshot(overrides: Partial<{
  keys: readonly string[];
  pressed: readonly string[];
  pointer: Partial<{
    released: boolean;
    cancelled: boolean;
    kind: "mouse" | "pen" | "touch" | null;
    startX: number;
    startY: number;
    x: number;
    y: number;
  }>;
}> = {}) {
  const pointerOverrides = overrides.pointer ?? {};
  return {
    keys: overrides.keys ?? [],
    pressed: overrides.pressed ?? [],
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
      ...pointerOverrides,
    },
    destroyed: false,
  };
}

describe("Wizard vs Zombie cartridge", () => {
  it("covers numeric and RNG seeds, bounded movement, aliases, and shockwave edge cases", () => {
    const numeric = createWizardVsZombieController(VOCABULARY, vi.fn(), 17);
    expect(numeric.snapshot().phase).toBe("playing");
    const nonFiniteSeed = createWizardVsZombieController(VOCABULARY, vi.fn(), { rng: () => Number.NaN });
    expect(nonFiniteSeed.snapshot().orbs).toHaveLength(4);

    const defaults = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      initialZombies: [{ x: 100, y: 100 }],
    });
    expect(defaults.snapshot().zombies[0]).toMatchObject({ id: "zombie-0", speed: 96, damage: 10, radius: 15 });
    expect(defaults.moveTo({ x: -100, y: 999 })).toMatchObject({ accepted: true, attempted: false });
    expect(defaults.snapshot().wizard).toMatchObject({ x: 20, y: 520 });
    expect(defaults.collectOrb("missing")).toMatchObject({ accepted: false, attempted: false });
    expect(defaults.dispatch("unknown" as never)).toMatchObject({ accepted: false, attempted: false });
    expect(defaults.advance(Number.NaN)).toMatchObject({ accepted: false, attempted: false });
    expect(defaults.tick(1)).toBeDefined();

    const shockwave = createWizardVsZombieController(VOCABULARY, vi.fn());
    const correctOrb = shockwave.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!correctOrb) throw new Error("The controller did not create a correct orb");
    shockwave.collectOrb(correctOrb.id);
    shockwave.setWizardPosition({ x: 480, y: 270 });
    shockwave.addZombie({ x: 480, y: 270, speed: 0, damage: 0 });
    const cast = shockwave.dispatch("confirm");
    expect(cast).toMatchObject({ accepted: true, attempted: false, snapshot: { shockwaveCharges: 0 } });
    expect(cast.snapshot.zombies[0]?.x).toBe(780);

    shockwave.destroy();
    const destroyed = shockwave.snapshot();
    shockwave.destroy();
    shockwave.setWizardPosition({ x: 100, y: 100 });
    shockwave.addZombie({ x: 100, y: 100 });
    expect(shockwave.snapshot()).toEqual(destroyed);
  });

  it("preserves its vocabulary manifest and standard experience", () => {
    const cartridge = createWizardVsZombieCartridge();
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());

    expect(cartridge.manifest).toEqual({
      id: "wizard-vs-zombie",
      title: "Wizard vs Zombie",
      description: "Survive the graveyard. Collect the true soul. Hold the horde back.",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["legacy-catalog/wizard-vs-zombie/zombie-orbs"],
      capabilities: [
        "capability:bounded-frame-delta",
        "capability:input-action-normalization",
        "capability:nonempty-content-precondition",
        "capability:result-accounting",
        "capability:single-completion-emission",
        "capability:orb-lane-collection",
        "capability:shockwave-energy-charge",
        "capability:zombie-hazard-pressure",
      ],
    });
    expect(cartridge.standardExperience.definition).toMatchObject({
      briefing: {
        startPhase: "tutorial",
        learningPreview: { heading: "Words to learn" },
      },
      tutorial: {
        lifecycle: {
          complete: { to: "playing" },
          productionEffects: {
            emitGameResults: false,
            persistProgress: false,
            awardAuthoritativeXp: false,
            writeLeaderboard: false,
            applyFailureConsequences: false,
          },
        },
      },
      debrief: {
        outcome: "complete",
        requiredCredit: "Pixel art assets by ElvGames",
      },
    });
    expect(controller.snapshot()).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      targetCount: VOCABULARY.length,
      prompt: "bright",
      answer: "brillante",
      wizard: { x: WIZARD_VS_ZOMBIE_CANVAS.width / 2, y: WIZARD_VS_ZOMBIE_CANVAS.height / 2 },
      health: INITIAL_HP,
      shockwaveCharges: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      orbs: expect.arrayContaining([
        expect.objectContaining({ translation: "brillante", isCorrect: true }),
      ]),
      zombies: [],
      destroyed: false,
    });
    expect(controller.snapshot()).toMatchObject({
      correctAction: expect.any(String),
      availableActions: expect.arrayContaining([
        "move-left",
        "move-right",
        "move-up",
        "move-down",
        "confirm",
      ]),
      lives: INITIAL_HP,
      energy: 0,
    });
  });

  it("keeps tutorial demonstrations outside production result delivery", () => {
    const complete = vi.fn();
    const cartridge = createWizardVsZombieCartridge();
    const inputController = {
      snapshot: vi.fn(() => inputSnapshot()),
      cancelActiveGesture: vi.fn(),
      destroy: vi.fn(),
    };
    cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete,
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "tutorial",
    });
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
  });

  it("rejects empty or blank vocabulary", () => {
    expect(() => createWizardVsZombieController([], vi.fn())).toThrow(/empty playable content/i);
    expect(() => createWizardVsZombieController([{ term: " ", translation: "answer" }], vi.fn())).toThrow();
  });

  it("moves the wizard in four directions and clamps the arena", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const initial = controller.snapshot().wizard;

    controller.move("move-right");
    controller.move("move-down");
    expect(controller.snapshot().wizard.x).toBeGreaterThan(initial.x);
    expect(controller.snapshot().wizard.y).toBeGreaterThan(initial.y);

    for (let index = 0; index < 100; index += 1) controller.move("move-right");
    for (let index = 0; index < 100; index += 1) controller.move("move-down");
    const edge = controller.snapshot().wizard;
    expect(edge.x).toBeLessThanOrEqual(WIZARD_VS_ZOMBIE_CANVAS.width - edge.radius);
    expect(edge.y).toBeLessThanOrEqual(WIZARD_VS_ZOMBIE_CANVAS.height - edge.radius);
  });

  it("creates the same orb translations and positions for the same seed", () => {
    const first = createWizardVsZombieController(VOCABULARY, vi.fn(), { seed: 17 }).snapshot();
    const second = createWizardVsZombieController(VOCABULARY, vi.fn(), { seed: 17 }).snapshot();

    expect(first.orbs).toEqual(second.orbs);
    expect(first.orbs).toHaveLength(4);
    expect(new Set(first.orbs.map((orb) => `${orb.x}:${orb.y}`)).size).toBe(4);
  });

  it("heals, scores, charges, and advances once per correct input item", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const initial = controller.snapshot();
    const correctOrb = initial.orbs.find((orb) => orb.isCorrect);
    if (!correctOrb) throw new Error("The controller did not create a correct orb");

    controller.applyHazard();
    controller.setWizardPosition({ x: correctOrb.x, y: correctOrb.y });
    const result = controller.resolveCollisions();

    expect(result).toMatchObject({ accepted: true, correct: true, progressed: true, terminal: false });
    expect(result.snapshot).toMatchObject({
      targetIndex: 1,
      health: INITIAL_HP,
      shockwaveCharges: 1,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });

    const nextCorrectOrb = result.snapshot.orbs.find((orb) => orb.isCorrect);
    if (!nextCorrectOrb) throw new Error("The controller did not create the next correct orb");
    controller.setWizardPosition({ x: nextCorrectOrb.x, y: nextCorrectOrb.y });
    const second = controller.resolveCollisions();

    expect(second.snapshot.targetIndex).toBe(2);
    expect(second.snapshot.score).toBe(200);
  });

  it("caps healing and shockwave charges on correct collisions", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const first = controller.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!first) throw new Error("The controller did not create a correct orb");

    controller.setWizardPosition({ x: first.x, y: first.y });
    controller.resolveCollisions();
    controller.setWizardPosition({ x: 480, y: 270 });
    const second = controller.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!second) throw new Error("The controller did not create a second correct orb");
    controller.setWizardPosition({ x: second.x, y: second.y });
    controller.resolveCollisions();

    expect(controller.snapshot().health).toBe(INITIAL_HP);
    expect(controller.snapshot().shockwaveCharges).toBeLessThanOrEqual(MAX_SHOCKWAVE_CHARGES);
  });

  it("penalizes a wrong orb and relocates it without advancing", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const initial = controller.snapshot();
    const wrongOrb = initial.orbs.find((orb) => !orb.isCorrect);
    if (!wrongOrb) throw new Error("The controller did not create a decoy orb");

    controller.setWizardPosition({ x: wrongOrb.x, y: wrongOrb.y });
    const result = controller.resolveCollisions();

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false });
    expect(result.snapshot.targetIndex).toBe(initial.targetIndex);
    expect(result.snapshot.totalAttempts).toBe(1);
    expect(result.snapshot.score).toBe(0);
    expect(result.snapshot.health).toBe(initial.health);
    expect(result.snapshot.shockwaveCharges).toBe(initial.shockwaveCharges);
    expect(result.snapshot.orbs).not.toEqual(initial.orbs);
    expect(result.snapshot.orbs.map((orb) => `${orb.x}:${orb.y}`)).not.toEqual(
      initial.orbs.map((orb) => `${orb.x}:${orb.y}`),
    );
  });

  it("applies the frozen wrong-choice consequence after a correct target", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const firstCorrect = controller.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!firstCorrect) throw new Error("The controller did not create a correct orb");

    controller.setWizardPosition({ x: firstCorrect.x, y: firstCorrect.y });
    controller.resolveCollisions();
    const beforeWrong = controller.snapshot();
    const wrong = beforeWrong.orbs.find((orb) => !orb.isCorrect);
    if (!wrong) throw new Error("The controller did not create a decoy orb");

    controller.setWizardPosition({ x: wrong.x, y: wrong.y });
    const result = controller.resolveCollisions();

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, attempted: true });
    expect(result.snapshot).toMatchObject({
      targetIndex: 1,
      prompt: VOCABULARY[1]!.term,
      score: 95,
      correctAnswers: 1,
      totalAttempts: 2,
      lastOutcome: "incorrect",
    });
  });

  it("moves zombies toward the wizard and applies bounded collision damage", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      initialZombies: [{ id: "zombie-a", x: 100, y: 100, speed: 120, damage: 10 }],
    });
    const initial = controller.snapshot();
    controller.advance(100);
    const moved = controller.snapshot();
    const zombie = moved.zombies[0];
    if (!zombie) throw new Error("The controller removed the test zombie");

    expect(Math.hypot(zombie.x - moved.wizard.x, zombie.y - moved.wizard.y)).toBeLessThan(
      Math.hypot(initial.zombies[0]!.x - initial.wizard.x, initial.zombies[0]!.y - initial.wizard.y),
    );

    controller.setWizardPosition({ x: zombie.x, y: zombie.y });
    const hit = controller.resolveCollisions();
    expect(hit.snapshot.health).toBe(INITIAL_HP - 10);
    expect(hit.snapshot.invulnerabilityMs).toBe(INVULNERABILITY_DURATION);
  });

  it("does not damage the wizard again during invulnerability", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      initialZombies: [{ id: "zombie-a", x: 480, y: 270, speed: 0, damage: 10 }],
    });
    controller.resolveCollisions();
    const afterFirstHit = controller.snapshot();
    controller.resolveCollisions();

    expect(controller.snapshot().health).toBe(afterFirstHit.health);
    controller.advance(INVULNERABILITY_DURATION);
    expect(controller.snapshot().invulnerabilityMs).toBe(0);
  });

  it("casts a charged shockwave that pushes only zombies inside its radius", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      initialZombies: [
        { id: "near", x: 520, y: 270, speed: 0, damage: 10 },
        { id: "far", x: 650, y: 270, speed: 0, damage: 10 },
        { id: "outside", x: 850, y: 270, speed: 0, damage: 10 },
      ],
    });
    const correctOrb = controller.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!correctOrb) throw new Error("The controller did not create a correct orb");
    controller.setWizardPosition({ x: correctOrb.x, y: correctOrb.y });
    controller.resolveCollisions();
    controller.setWizardPosition({
      x: WIZARD_VS_ZOMBIE_CANVAS.width / 2,
      y: WIZARD_VS_ZOMBIE_CANVAS.height / 2,
    });
    const beforeCast = controller.snapshot();
    const farBefore = beforeCast.zombies.find((zombie) => zombie.id === "far");
    if (!farBefore) throw new Error("The controller did not create the far zombie");

    const cast = controller.castShockwave();
    const farAfter = cast.snapshot.zombies.find((zombie) => zombie.id === "far");
    expect(cast.accepted).toBe(true);
    expect(cast.snapshot.shockwaveCharges).toBe(0);
    const nearAfter = cast.snapshot.zombies.find((zombie) => zombie.id === "near");
    const outsideAfter = cast.snapshot.zombies.find((zombie) => zombie.id === "outside");
    expect(nearAfter).toBeDefined();
    expect(farAfter).toBeDefined();
    expect(outsideAfter).toEqual(expect.objectContaining({ id: "outside", x: 850, y: 270 }));
    expect(cast.snapshot.zombies).toHaveLength(beforeCast.zombies.length);
    expect(new Set(cast.snapshot.zombies.map((zombie) => zombie.id))).toEqual(
      new Set(beforeCast.zombies.map((zombie) => zombie.id)),
    );
    expect(Math.hypot(nearAfter!.x - cast.snapshot.wizard.x, nearAfter!.y - cast.snapshot.wizard.y)).toBeGreaterThan(
      Math.hypot(520 - beforeCast.wizard.x, 270 - beforeCast.wizard.y),
    );
    expect(Math.hypot(farAfter!.x - cast.snapshot.wizard.x, farAfter!.y - cast.snapshot.wizard.y)).toBeGreaterThan(
      Math.hypot(farBefore.x - beforeCast.wizard.x, farBefore.y - beforeCast.wizard.y),
    );
  });

  it("returns complete choose and hazard result fields", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const choice = controller.choose("move-right");
    const hazard = controller.applyHazard();

    expect(choice).toMatchObject({
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
      snapshot: expect.any(Object),
    });
    expect(hazard).toMatchObject({
      accepted: true,
      correct: false,
      progressed: false,
      attempted: false,
      terminal: false,
      completed: false,
      snapshot: expect.any(Object),
    });
  });

  it("emits one exact result for victory and rejects later actions", () => {
    const deliver = vi.fn();
    const controller = createWizardVsZombieController(VOCABULARY, deliver);
    let terminal;

    for (let index = 0; index < VOCABULARY.length; index += 1) {
      const correctOrb = controller.snapshot().orbs.find((orb) => orb.isCorrect);
      if (!correctOrb) throw new Error("The controller did not create a correct orb");
      controller.setWizardPosition({ x: correctOrb.x, y: correctOrb.y });
      terminal = controller.resolveCollisions();
    }

    if (!terminal) throw new Error("Wizard vs Zombie did not reach victory");
    const result = gameResultsSchema.parse(terminal.result);
    expect(terminal).toMatchObject({ terminal: true, completed: true });
    expect(terminal.snapshot.phase).toBe("victory");
    expect(result).toEqual({
      accuracy: 1,
      xp: 70,
      score: 300,
      correctAnswers: VOCABULARY.length,
      totalAttempts: VOCABULARY.length,
    });
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "victory");
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toEqual(result);
    expect(controller.castShockwave().accepted).toBe(false);
    expect(controller.resolveCollisions().accepted).toBe(false);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("emits one exact defeat result at zero health", () => {
    const deliver = vi.fn();
    const controller = createWizardVsZombieController(VOCABULARY, deliver);
    let terminal;
    for (let index = 0; index < INITIAL_HP / 10; index += 1) {
      terminal = controller.applyHazard();
    }

    if (!terminal) throw new Error("Wizard vs Zombie did not reach defeat");
    expect(terminal.snapshot).toMatchObject({ phase: "defeat", health: 0 });
    expect(gameResultsSchema.parse(terminal.result)).toEqual({
      accuracy: 0,
      xp: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "defeat");
    expect(controller.applyHazard().accepted).toBe(false);
  });

  it("restores the full arena state after a responsive recompose", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      initialZombies: [{ id: "zombie-a", x: 100, y: 100, speed: 20, damage: 10 }],
    });
    controller.move("move-right");
    controller.move("move-up");
    const captured = controller.capture();
    controller.move("move-left");
    controller.advance(200);
    controller.restore(captured);

    expect(controller.snapshot()).toEqual(captured);
  });

  it("restores active and terminal states, while rejecting malformed snapshots", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const wrong = controller.snapshot().orbs.find((orb) => !orb.isCorrect);
    if (!wrong) throw new Error("The controller did not create a decoy orb");
    controller.collectOrb(wrong.id);
    const captured = controller.capture();
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);

    const invalid = [
      [null, /state is invalid/iu],
      [{ ...captured, destroyed: 1 }, /destroyed state/iu],
      [{ ...captured, phase: "paused" }, /phase/iu],
      [{ ...captured, targetCount: 1 }, /target progress/iu],
      [{ ...captured, mechanic: "other" }, /mechanic/iu],
      [{ ...captured, orbs: null }, /entities/iu],
      [{ ...captured, orbs: [captured.orbs[0]!, captured.orbs[0]!] }, /orb state/iu],
      [{ ...captured, zombies: [{ ...captured.zombies[0]!, id: "zombie", speed: -1 }] }, /zombie state/iu],
      [{ ...captured, wizard: { ...captured.wizard, radius: 1 } }, /wizard position/iu],
      [{ ...captured, wizard: { ...captured.wizard, x: -1 } }, /wizard bounds/iu],
      [{ ...captured, player: { ...captured.player, x: 1 } }, /player position/iu],
      [{ ...captured, health: -1 }, /health/iu],
      [{ ...captured, maxHealth: 1 }, /health aliases/iu],
      [{ ...captured, shockwaveCharges: 4 }, /charges/iu],
      [{ ...captured, energy: 4 }, /energy aliases/iu],
      [{ ...captured, score: 101 }, /score/iu],
      [{ ...captured, layoutRevision: -1 }, /layout/iu],
      [{ ...captured, spawnTimerMs: -1 }, /spawn state/iu],
      [{ ...captured, invulnerabilityMs: INVULNERABILITY_DURATION + 1 }, /immunity/iu],
      [{ ...captured, gameTime: 1 }, /clock aliases/iu],
      [{ ...captured, prompt: "wrong" }, /target content/iu],
      [{ ...captured, availableActions: [] }, /available actions/iu],
      [{ ...captured, correctAction: "wrong" }, /correct action/iu],
      [{ ...captured, lastOutcome: "hazard" }, /outcome/iu],
      [{ ...captured, totalAttempts: 0, lastOutcome: "correct" }, /outcome is inconsistent/iu],
    ] as const;
    for (const [state, pattern] of invalid) expect(() => controller.restore(state as never)).toThrow(pattern);

    const terminalController = createWizardVsZombieController([{ term: "one", translation: "uno" }], vi.fn());
    const terminalOrb = terminalController.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!terminalOrb) throw new Error("The terminal controller did not create a correct orb");
    terminalController.collectOrb(terminalOrb.id);
    const terminalSnapshot = terminalController.capture();
    const restoredTerminal = createWizardVsZombieController([{ term: "one", translation: "uno" }], vi.fn());
    restoredTerminal.restore(terminalSnapshot);
    expect(restoredTerminal.snapshot()).toEqual(terminalSnapshot);
  });

  it("rejects inconsistent responsive state instead of reopening a terminal session", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const captured = controller.capture();
    const terminalResult = {
      accuracy: 0,
      xp: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    };

    expect(() => controller.restore({
      ...captured,
      phase: "playing",
      result: terminalResult,
    })).toThrow(/terminal result|state/i);
    expect(() => controller.restore({
      ...captured,
      phase: "victory",
      targetIndex: VOCABULARY.length,
      prompt: VOCABULARY[VOCABULARY.length - 1]!.term,
      answer: VOCABULARY[VOCABULARY.length - 1]!.translation,
      targetWord: VOCABULARY[VOCABULARY.length - 1]!.term,
      result: undefined,
    })).toThrow(/result|terminal/i);
  });

  it("slides with held keys using APK frame time and stops at crypt collision", () => {
    const inputController = {
      snapshot: vi.fn(() => inputSnapshot({ keys: ["ArrowRight"] })),
      cancelActiveGesture: vi.fn(),
      destroy: vi.fn(),
    };
    const cartridge = createWizardVsZombieCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create: () => void;
      update: (time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => WizardVsZombieSnapshot };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    const startX = scene.extend.apkCaptureResponsiveState().wizard.x;
    scene.update.call(fake.scene, 0, 16);
    scene.update.call(fake.scene, 16, 16);
    scene.update.call(fake.scene, 32, 16);
    const afterHold = scene.extend.apkCaptureResponsiveState().wizard.x;
    expect(afterHold).toBeGreaterThan(startX);
    expect(afterHold - startX).toBeGreaterThan(8);
    expect(afterHold - startX).toBeLessThan(24);

    const blocked = createWizardVsZombieController(VOCABULARY, vi.fn());
    blocked.setWizardPosition({ x: 480, y: 210 });
    for (let index = 0; index < 40; index += 1) {
      blocked.steer({ x: 0, y: -WIZARD_MOVE_SPEED }, 16);
    }
    expect(blocked.snapshot().wizard.y).toBeGreaterThan(140);
    expect(hitsGraveyardSolid({
      x: blocked.snapshot().wizard.x - 20,
      y: blocked.snapshot().wizard.y - 20,
      width: 40,
      height: 40,
    })).toBe(false);
    expect(GRAVEYARD_SOLIDS.length).toBeGreaterThan(6);
  });

  it("routes keyboard and pointer or touch movement through the arena scene", () => {
    const snapshots = [
      inputSnapshot({ pressed: ["ArrowRight"] }),
      inputSnapshot({
        pointer: {
          released: true,
          kind: "touch",
          startX: 300,
          startY: 250,
          x: 300,
          y: 340,
        },
      }),
    ];
    const inputController = { snapshot: vi.fn(() => snapshots.shift() ?? inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const cartridge = createWizardVsZombieCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width: 390, height: 844 },
    } as never);
    const scene = config.scene as { create: () => void; update: (time: number, delta: number) => void; extend: { apkCaptureResponsiveState: () => WizardVsZombieSnapshot } };
    const fake = mockScene();
    scene.create.call(fake.scene);
    scene.update.call(fake.scene, 0, 16);
    const afterKeyboard = scene.extend.apkCaptureResponsiveState();
    scene.update.call(fake.scene, 16, 16);
    const afterTouch = scene.extend.apkCaptureResponsiveState();
    const correctOrb = afterTouch.orbs.find((orb) => orb.isCorrect);
    if (!correctOrb) throw new Error("The scene did not retain a correct orb");
    snapshots.push(inputSnapshot({
      pointer: {
        released: true,
        kind: "touch",
        startX: correctOrb.x,
        startY: correctOrb.y,
        x: correctOrb.x,
        y: correctOrb.y,
      },
    }));
    scene.update.call(fake.scene, 32, 16);
    const afterTap = scene.extend.apkCaptureResponsiveState();

    expect(afterKeyboard.wizard.x).toBeGreaterThan(WIZARD_VS_ZOMBIE_CANVAS.width / 2);
    expect(afterTouch.wizard.y).toBeGreaterThan(afterKeyboard.wizard.y);
    expect(afterTap.totalAttempts).toBe(0);
    expect(afterTap.correctAnswers).toBe(0);
    expect(afterTap.wizard).not.toEqual(afterTouch.wizard);
  });

  it("routes a charged keyboard and pointer shockwave through the compact scene", () => {
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const cartridge = createWizardVsZombieCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width: 390, height: 844 },
    } as never);
    const step = cartridge.standardExperience.definition.tutorial.steps[1];
    if (!step) throw new Error("Wizard vs Zombie tutorial step is missing");
    cartridge.standardExperience.createTutorialActionDriver().execute({
      tutorial: cartridge.standardExperience.definition.tutorial,
      step,
      seed: cartridge.standardExperience.definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });

    const scene = config.scene as { create: () => void; update: (time: number, delta: number) => void };
    const fake = mockScene();
    scene.create.call(fake.scene);
    inputController.snapshot.mockReturnValueOnce(inputSnapshot({ pressed: ["Space"] }));
    scene.update.call(fake.scene, 0, 0);
    inputController.snapshot.mockReturnValueOnce(inputSnapshot({
      pointer: { released: true, kind: "touch", startX: 900, startY: 40, x: 900, y: 40 },
    }));
    scene.update.call(fake.scene, 16, 0);
    expect(fake.createdGraphics.some((graphics) => graphics.fillCircle.mock.calls.length > 0)).toBe(true);
  });

  it("does not reveal the correct orb through its scene color", () => {
    const source = readFileSync(new URL("./wizard-vs-zombie.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/fillStyle\(orb\.isCorrect\s*\?/u);
  });

  it("applies a recomposed layout profile to the scene, so apkRecompose cannot become dead code", () => {
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const cartridge = createWizardVsZombieCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      composition: { profile: "wide", safeRect: { width: 960 } } as never,
    });
    const scene = config.scene as {
      create: () => void;
      update: (time: number, delta: number) => void;
      extend: { apkRecompose: (composition: unknown) => void };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);

    const printed = (): string[] => fake.createdTexts
      .flatMap((text) => text.setText.mock.calls.map((call) => String(call[0])));
    expect(printed().some((value) => value.includes("Night arena"))).toBe(true);

    scene.extend.apkRecompose({ profile: "compact", safeRect: { width: 420 } });
    scene.update.call(fake.scene, 0, 16);

    expect(
      printed().some((value) => value.includes("Compact arena")),
      "the scene must use the recomposed profile, not the mount-time one",
    ).toBe(true);
  });

  it("cleans scene resources and seals the controller once", () => {
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const cartridge = createWizardVsZombieCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
    });
    const scene = config.scene as { create: () => void; update: (time: number, delta: number) => void; extend: { apkCaptureResponsiveState: () => { destroyed: boolean } } };
    const fake = mockScene();
    scene.create.call(fake.scene);
    fake.listeners.get("shutdown")?.();
    fake.listeners.get("destroy")?.();
    scene.update.call(fake.scene, 0, 16);

    expect(fake.createdGraphics.some((graphics) => graphics.destroy.mock.calls.length > 0)).toBe(true);
    expect(scene.extend.apkCaptureResponsiveState().destroyed).toBe(true);
  });

  it("paints graveyard dirt, crypts, gravestones, mage, skeleton, and crystal sprites", () => {
    const edition = createCatalogStandardEdition(
      ["legacy-catalog/wizard-vs-zombie/zombie-orbs"],
      "/assets/apk/standard-pack-qc/",
      "wizard-vs-zombie",
    );
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 3,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      preload(this: unknown): void;
      create(this: unknown): void;
    };

    const loadedImages: string[] = [];
    const loadedSheets: string[] = [];
    const placedKeys: string[] = [];
    const tileKeys: string[] = [];
    const makeImage = (key: string) => {
      const image = {
        setOrigin: vi.fn(() => image),
        setDisplaySize: vi.fn(() => image),
        setDepth: vi.fn(() => image),
        setPosition: vi.fn(() => image),
        setVisible: vi.fn(() => image),
        destroy: vi.fn(),
      };
      placedKeys.push(key);
      return image;
    };
    const fake = mockScene();
    Object.assign(fake.scene, {
      load: {
        image: vi.fn((key: string) => {
          loadedImages.push(key);
        }),
        spritesheet: vi.fn((key: string) => {
          loadedSheets.push(key);
        }),
      },
    });
    Object.assign(fake.scene.add, {
      image: vi.fn((_x: number, _y: number, key: string) => makeImage(key)),
      sprite: vi.fn((_x: number, _y: number, key: string) => makeImage(key)),
      tileSprite: vi.fn((_x: number, _y: number, _width: number, _height: number, key: string) => {
        tileKeys.push(key);
        return makeImage(key);
      }),
    });

    scene.preload.call(fake.scene);
    scene.create.call(fake.scene);

    expect(loadedImages).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:tile-grave-dirt",
      "apk:catalog-standard-pack:prop-grave",
      "apk:catalog-standard-pack:prop-tower",
      "apk:catalog-standard-pack:enemy-skeleton",
    ]));
    expect(loadedSheets).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:player-mage",
      "apk:catalog-standard-pack:prop-crystal-blue",
    ]));
    expect(tileKeys).toContain("apk:catalog-standard-pack:tile-grave-dirt");
    expect(placedKeys).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:prop-grave",
      "apk:catalog-standard-pack:prop-tower",
      "apk:catalog-standard-pack:player-mage",
      "apk:catalog-standard-pack:prop-crystal-blue",
    ]));
    expect(fake.createdGraphics.some((graphics) => graphics.fillRect.mock.calls.length > 0)).toBe(true);
    expect(fake.createdGraphics.every((graphics) => graphics.fillRoundedRect.mock.calls.length === 0)).toBe(true);
  });
});
