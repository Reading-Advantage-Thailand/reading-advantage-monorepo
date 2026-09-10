import { gameResultsSchema, type ListeningEvidence } from "@reading-advantage/game-contracts";
import {
  createAnswerChoiceAudioController,
  type ListeningAudioController,
  type ListeningAudioSnapshot,
} from "@reading-advantage/advantage-play-kit";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  GRAVEYARD_SOLIDS,
  GRAVEYARD_FEATURES,
  ANSWER_AUDIO_PROTECTION_DURATION,
  WIZARD_ZOMBIE_SPAWN_GATES,
  INITIAL_HP,
  INVULNERABILITY_DURATION,
  MAX_SHOCKWAVE_CHARGES,
  ORB_RADIUS,
  WIZARD_MOVE_SPEED,
  WIZARD_RADIUS,
  WIZARD_VS_ZOMBIE_CANVAS,
  hitsGraveyardSolid,
  findGraveyardRoute,
  getWizardArenaProjection,
  getWizardAnswerAudioControlBounds,
  getWizardListeningControlBounds,
  getWizardShockwaveButtonBounds,
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
    setAlign: vi.fn(function (this: unknown, _alignment: string) { return this; }),
    setFontSize: vi.fn(function (this: unknown, _size: number | string) { return this; }),
    setPosition: vi.fn(function (this: unknown, _x: number, _y: number) { return this; }),
    setText: vi.fn(function (this: unknown, _value: string) { return this; }),
    setVisible: vi.fn(function (this: unknown, _visible: boolean) { return this; }),
    setWordWrapWidth: vi.fn(function (this: unknown, _width: number, _useAdvancedWrap?: boolean) { return this; }),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function listeningController(play: ListeningAudioController["play"]): ListeningAudioController {
  return {
    prepare: vi.fn(),
    play,
    replay: vi.fn(play),
    recordTranscriptAssistance: vi.fn(),
    recordReadingFallback: vi.fn(),
    setMuted: vi.fn(),
    pause: vi.fn(),
    restart: vi.fn(),
    destroy: vi.fn(),
    getSnapshot: vi.fn((): ListeningAudioSnapshot => ({ status: "idle", muted: false })),
    getEvidence: vi.fn((): ListeningEvidence => ({
      schemaVersion: 1,
      declaredModality: "listen-to-select",
      effectiveModality: "listen-to-select",
      sourceLocale: "en-US",
      targetLocale: "th-TH",
      itemCount: VOCABULARY.length,
      assistedItemPositions: [],
      fallbackItemPositions: [],
      replayCounts: [],
      audioFailures: [],
    })),
  };
}

function answerAudioController(play: (itemPosition: number) => Promise<void> = async () => undefined) {
  return createAnswerChoiceAudioController({
    session: {
      modality: "read-to-select-audio",
      promptLocale: "th-TH",
      answerLocale: "en-US",
      promptField: "translation",
      answerField: "term",
      scored: true,
    },
    clips: VOCABULARY.map((_item, itemPosition) => ({
      itemPosition,
      url: `/audio/${itemPosition}.mp3`,
      mediaType: "audio/mpeg",
    })),
    preparationTimeoutMs: 1_000,
    preparation: {
      prepare: async (reference) => ({ itemPosition: reference.itemPosition }),
      release: vi.fn(),
    },
    playback: { play: async (clip) => play(clip.itemPosition) },
    ducking: { duck: () => vi.fn() },
  });
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function mockGraphics() {
  const graphics = {
    clear: vi.fn(function (this: unknown) { return this; }),
    fillCircle: vi.fn(function (this: unknown, _x: number, _y: number, _radius: number) { return this; }),
    fillRect: vi.fn(function (this: unknown, _x: number, _y: number, _width: number, _height: number) { return this; }),
    fillRoundedRect: vi.fn(function (this: unknown) { return this; }),
    fillStyle: vi.fn(function (this: unknown) { return this; }),
    lineStyle: vi.fn(function (this: unknown) { return this; }),
    strokeRoundedRect: vi.fn(function (this: unknown) { return this; }),
    strokeCircle: vi.fn(function (this: unknown) { return this; }),
    setDepth: vi.fn(function (this: unknown, _depth: number) { return this; }),
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
      text: vi.fn((_x: number, _y: number, _value: string, _style?: Readonly<Record<string, unknown>>) => {
        const text = mockText();
        createdTexts.push(text);
        return text;
      }),
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
    expect(nonFiniteSeed.snapshot().orbs).toHaveLength(3);

    const defaults = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      initialZombies: [{ x: 100, y: 100 }],
    });
    expect(defaults.snapshot().zombies[0]).toMatchObject({ id: "zombie-0", speed: 96, damage: 10, radius: 15 });
    expect(defaults.moveTo({ x: -100, y: 999 })).toMatchObject({ accepted: true, attempted: false });
    expect(defaults.snapshot().wizard).toMatchObject({ x: 480, y: 474 });
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
    expect(cast.snapshot.zombies[0]?.x).toBeGreaterThan(480);
    expect(hitsGraveyardSolid({ x: (cast.snapshot.zombies[0]?.x ?? 0) - 15, y: (cast.snapshot.zombies[0]?.y ?? 0) - 15, width: 30, height: 30 })).toBe(false);

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
      description: "Match Thai words to their English meanings while you avoid zombies.",
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
        instructions: [
          expect.objectContaining({
            description: "Read the Thai word. Read the English choices, or use the speakers in audio mode. Hold the graveyard and drag to steer toward a crystal. Use a shockwave to escape zombies.",
          }),
          expect.any(Object),
        ],
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
      wizard: { x: 480, y: 474 },
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

  it("plays the scripted English answer before an audio Practice action changes the target", async () => {
    const playback = deferred<void>();
    let playbackStatus: "playing" | "completed" = "playing";
    const answerAudio = {
      setQuestion: vi.fn(),
      playChoice: vi.fn(async () => {
        await playback.promise;
        playbackStatus = "completed";
        return { status: "completed", questionPosition: 0, choices: [], muted: false } as const;
      }),
      getChoiceSnapshot: vi.fn((questionPosition: number, clipItemPosition: number) => ({
        questionPosition,
        clipItemPosition,
        status: playbackStatus,
        playCount: 1,
        replayCount: 0,
        canConfirm: playbackStatus === "completed",
        submitted: false,
      } as const)),
    };
    const cartridge = createWizardVsZombieCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() },
      sessionMode: "tutorial",
    });
    const scene = config.scene as { extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot } };
    const step = cartridge.standardExperience.definition.tutorial.steps[1];
    if (!step) throw new Error("Expected a correct Practice step");

    const execution = cartridge.standardExperience.createTutorialActionDriver({ answerAudio }).execute({
      tutorial: cartridge.standardExperience.definition.tutorial,
      step,
      seed: cartridge.standardExperience.definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });
    await flushPromises();

    expect(answerAudio.setQuestion).toHaveBeenCalledWith(0, expect.arrayContaining([0, 1, 2]));
    expect(answerAudio.playChoice).toHaveBeenCalledWith(0, 0);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ targetIndex: 0, totalAttempts: 0 });

    playback.resolve();
    await execution;

    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      targetIndex: 1,
      totalAttempts: 1,
      correctAnswers: 1,
    });
  });

  it("does not apply a late audio Practice action after the tutorial is aborted", async () => {
    const playback = deferred<void>();
    let playbackStatus: "playing" | "completed" = "playing";
    const answerAudio = {
      setQuestion: vi.fn(),
      playChoice: vi.fn(async () => {
        await playback.promise;
        playbackStatus = "completed";
        return { status: "completed", questionPosition: 0, choices: [], muted: false } as const;
      }),
      getChoiceSnapshot: vi.fn((questionPosition: number, clipItemPosition: number) => ({
        questionPosition,
        clipItemPosition,
        status: playbackStatus,
        playCount: 1,
        replayCount: 0,
        canConfirm: playbackStatus === "completed",
        submitted: false,
      } as const)),
    };
    const cartridge = createWizardVsZombieCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() },
      sessionMode: "tutorial",
    });
    const scene = config.scene as { extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot } };
    const step = cartridge.standardExperience.definition.tutorial.steps[1];
    if (!step) throw new Error("Expected a correct Practice step");
    const abortController = new AbortController();

    const execution = cartridge.standardExperience.createTutorialActionDriver({ answerAudio }).execute({
      tutorial: cartridge.standardExperience.definition.tutorial,
      step,
      seed: cartridge.standardExperience.definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
      signal: abortController.signal,
    });
    await flushPromises();
    abortController.abort();
    playback.resolve();
    await execution;

    expect(answerAudio.getChoiceSnapshot).not.toHaveBeenCalled();
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      targetIndex: 0,
      totalAttempts: 0,
      correctAnswers: 0,
    });
  });

  it("keeps the Practice target unchanged when answer audio fails", async () => {
    const answerAudio = {
      setQuestion: vi.fn(),
      playChoice: vi.fn(async () => {
        throw new Error("audio failed");
      }),
      getChoiceSnapshot: vi.fn(),
    };
    const cartridge = createWizardVsZombieCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() },
      sessionMode: "tutorial",
    });
    const scene = config.scene as { extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot } };
    const step = cartridge.standardExperience.definition.tutorial.steps[1];
    if (!step) throw new Error("Expected a correct Practice step");

    await expect(cartridge.standardExperience.createTutorialActionDriver({ answerAudio }).execute({
      tutorial: cartridge.standardExperience.definition.tutorial,
      step,
      seed: cartridge.standardExperience.definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    })).rejects.toThrow("audio failed");
    expect(answerAudio.getChoiceSnapshot).not.toHaveBeenCalled();
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      targetIndex: 0,
      totalAttempts: 0,
      correctAnswers: 0,
    });
  });

  it("rejects empty or blank vocabulary", () => {
    expect(() => createWizardVsZombieController([], vi.fn())).toThrow(/empty playable content/i);
    expect(() => createWizardVsZombieController([{ term: " ", translation: "answer" }], vi.fn())).toThrow();
  });

  it("moves the wizard in four directions and clamps the arena", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const initial = controller.snapshot().wizard;

    controller.move("move-right");
    controller.move("move-up");
    expect(controller.snapshot().wizard.x).toBeGreaterThan(initial.x);
    expect(controller.snapshot().wizard.y).toBeLessThan(initial.y);

    for (let index = 0; index < 100; index += 1) controller.move("move-right");
    for (let index = 0; index < 100; index += 1) controller.move("move-down");
    const edge = controller.snapshot().wizard;
    expect(edge.x).toBeLessThanOrEqual(WIZARD_VS_ZOMBIE_CANVAS.width - edge.radius);
    expect(edge.y).toBeLessThanOrEqual(WIZARD_VS_ZOMBIE_CANVAS.height - edge.radius);
  });

  it("creates the same orb terms and positions for the same seed", () => {
    const first = createWizardVsZombieController(VOCABULARY, vi.fn(), { seed: 17 }).snapshot();
    const second = createWizardVsZombieController(VOCABULARY, vi.fn(), { seed: 17 }).snapshot();

    expect(first.orbs).toEqual(second.orbs);
    expect(first.orbs).toHaveLength(3);
    expect(new Set(first.orbs.map((orb) => `${orb.x}:${orb.y}`)).size).toBe(3);
  });

  it("never marks an identical displayed English term as a wrong orb", () => {
    const controller = createWizardVsZombieController([
      { term: "same", translation: "หนึ่ง" },
      { term: " same ", translation: "สอง" },
      { term: "light", translation: "แสง" },
      { term: "shade", translation: "เงา" },
    ], vi.fn(), { seed: 2 });
    const matching = controller.snapshot().orbs.filter((orb) => orb.term.trim().toLowerCase() === "same");

    expect(matching).toHaveLength(1);
    expect(matching[0]?.isCorrect).toBe(true);
    expect(controller.snapshot().orbs.filter((orb) => orb.isCorrect)).toHaveLength(1);
  });

  it("uses one fair orb when a deck has no distinct English distractor", () => {
    const controller = createWizardVsZombieController([
      { term: "same", translation: "หนึ่ง" },
      { term: " same ", translation: "สอง" },
    ], vi.fn());

    expect(controller.snapshot().orbs).toHaveLength(1);
    expect(controller.snapshot().orbs[0]?.isCorrect).toBe(true);
    expect(() => controller.restore({
      ...controller.capture(),
      orbs: [
        controller.snapshot().orbs[0]!,
        { ...controller.snapshot().orbs[0]!, id: "unfair", isCorrect: false },
      ],
    })).toThrow(/orb fairness/iu);
  });

  it("shows each distinct answer label once in short decks", () => {
    const two = createWizardVsZombieController(VOCABULARY.slice(0, 2), vi.fn()).snapshot();
    const three = createWizardVsZombieController(VOCABULARY, vi.fn()).snapshot();

    expect(two.orbs).toHaveLength(2);
    expect(new Set(two.orbs.map((orb) => orb.term)).size).toBe(2);
    expect(three.orbs).toHaveLength(3);
    expect(new Set(three.orbs.map((orb) => orb.term)).size).toBe(3);
  });

  it("shows every available answer once across target and slot offsets", () => {
    const items = [...VOCABULARY, { term: "forest", translation: "bosque" }];
    for (let seed = 0; seed < 4; seed += 1) {
      const controller = createWizardVsZombieController(items, vi.fn(), { seed });
      for (let target = 0; target < items.length; target += 1) {
        const state = controller.snapshot();
        expect(new Set(state.orbs.map((orb) => orb.term)).size).toBe(state.orbs.length);
        const correct = state.orbs.find((orb) => orb.isCorrect);
        if (!correct) throw new Error("The offset fixture needs a correct orb");
        controller.collectOrb(correct.id);
      }
    }
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

  it("records one correct attempt while the wizard remains inside a crystal zone", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const correct = controller.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!correct) throw new Error("The controller did not create a correct orb");

    controller.setWizardPosition(correct);
    controller.resolveCollisions();
    for (let index = 0; index < 5; index += 1) controller.advance(16);

    expect(controller.snapshot()).toMatchObject({
      targetIndex: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      orbContactLatched: true,
    });
  });

  it("rearms crystal contact after the wizard leaves and reenters a zone", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const first = controller.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!first) throw new Error("The controller did not create a correct orb");
    controller.setWizardPosition(first);
    controller.resolveCollisions();

    controller.setWizardPosition({
      x: WIZARD_VS_ZOMBIE_CANVAS.width / 2,
      y: WIZARD_VS_ZOMBIE_CANVAS.height / 2,
    });
    controller.resolveCollisions();
    expect(controller.snapshot().orbContactLatched).toBe(false);

    const second = controller.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!second) throw new Error("The controller did not create the next correct orb");
    controller.setWizardPosition(second);
    controller.resolveCollisions();

    expect(controller.snapshot()).toMatchObject({
      targetIndex: 2,
      correctAnswers: 2,
      totalAttempts: 2,
      orbContactLatched: true,
    });
  });

  it("persists a crystal contact latch across responsive restore", () => {
    const source = createWizardVsZombieController(VOCABULARY, vi.fn());
    const wrong = source.snapshot().orbs.find((orb) => !orb.isCorrect);
    if (!wrong) throw new Error("The controller did not create a decoy orb");
    source.setWizardPosition(wrong);
    source.resolveCollisions();
    const captured = source.capture();
    const restored = createWizardVsZombieController(VOCABULARY, vi.fn());

    restored.restore(captured);
    for (let index = 0; index < 5; index += 1) restored.advance(16);

    expect(restored.snapshot()).toMatchObject({
      targetIndex: 0,
      correctAnswers: 0,
      totalAttempts: 1,
      orbContactLatched: true,
    });

    restored.setWizardPosition({
      x: WIZARD_VS_ZOMBIE_CANVAS.width / 2,
      y: WIZARD_VS_ZOMBIE_CANVAS.height / 2,
    });
    restored.resolveCollisions();
    const correct = restored.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!correct) throw new Error("The restored controller did not create a correct orb");
    restored.setWizardPosition(correct);
    restored.resolveCollisions();
    expect(restored.snapshot()).toMatchObject({ targetIndex: 1, correctAnswers: 1, totalAttempts: 2 });
  });

  it("moves zombies toward the wizard and applies bounded collision damage", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      initialZombies: [{ id: "zombie-a", ...WIZARD_ZOMBIE_SPAWN_GATES[0]!, speed: 120, damage: 10 }],
    });
    const initial = controller.snapshot();
    for (let index = 0; index < 30; index += 1) controller.advance(100);
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

  it("applies distinct zombie intents without changing configured base speeds", () => {
    const spawn = WIZARD_ZOMBIE_SPAWN_GATES[0]!;
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      seed: 3,
      initialZombies: [
        { id: "zombie-1", ...spawn, speed: 120, damage: 0 },
        { id: "zombie-2", ...spawn, speed: 120, damage: 0 },
      ],
    });

    for (let index = 0; index < 12; index += 1) controller.advance(100);
    const first = controller.snapshot().zombies.find((zombie) => zombie.id === "zombie-1");
    const second = controller.snapshot().zombies.find((zombie) => zombie.id === "zombie-2");

    expect(first).toMatchObject({ speed: 120 });
    expect(second).toMatchObject({ speed: 120 });
    expect(first).not.toMatchObject({ x: second?.x, y: second?.y });
  });

  it("routes zombies from every gate around graveyard solids", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      initialZombies: WIZARD_ZOMBIE_SPAWN_GATES.map((gate, index) => ({
        id: `gate-${index}`,
        ...gate,
        speed: 150,
        damage: 0,
      })),
    });
    const center = controller.snapshot().wizard;
    const initial = new Map(controller.snapshot().zombies.map((zombie) => [zombie.id, Math.hypot(zombie.x - center.x, zombie.y - center.y)]));

    for (let index = 0; index < 240; index += 1) controller.advance(16);

    for (const zombie of controller.snapshot().zombies.filter((candidate) => candidate.id.startsWith("gate-"))) {
      expect(Math.hypot(zombie.x - center.x, zombie.y - center.y)).toBeLessThan(initial.get(zombie.id)! - 180);
      expect(hitsGraveyardSolid({ x: zombie.x - zombie.radius, y: zombie.y - zombie.radius, width: zombie.radius * 2, height: zombie.radius * 2 })).toBe(false);
    }
  });

  it("repaths toward a moving wizard and escapes the north spawn lane", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn(), {
      initialZombies: [{ id: "tracker", ...WIZARD_ZOMBIE_SPAWN_GATES[0]!, speed: 140, damage: 0 }],
    });
    for (let index = 0; index < 100; index += 1) controller.advance(16);
    const aroundCrypt = controller.snapshot().zombies.find((zombie) => zombie.id === "tracker")!;
    expect(Math.abs(aroundCrypt.x - WIZARD_ZOMBIE_SPAWN_GATES[0]!.x)).toBeGreaterThan(20);

    controller.setWizardPosition({ x: 760, y: 390 });
    const before = controller.snapshot().zombies.find((zombie) => zombie.id === "tracker")!;
    const beforeDistance = Math.hypot(before.x - 760, before.y - 390);
    for (let index = 0; index < 120; index += 1) controller.advance(16);
    const after = controller.snapshot().zombies.find((zombie) => zombie.id === "tracker")!;
    expect(Math.hypot(after.x - 760, after.y - 390)).toBeLessThan(beforeDistance);
  });

  it("keeps every orb position safe and route-reachable from the center", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    for (const orb of controller.snapshot().orbs) {
      expect(hitsGraveyardSolid({ x: orb.x - orb.radius, y: orb.y - orb.radius, width: orb.radius * 2, height: orb.radius * 2 })).toBe(false);
      const path = findGraveyardRoute(controller.snapshot().wizard, orb, WIZARD_RADIUS);
      expect(path.length).toBeGreaterThan(0);
      expect(Math.hypot(path.at(-1)!.x - orb.x, path.at(-1)!.y - orb.y)).toBeLessThan(50);
    }
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

  it("keeps wall, boundary, and zero-distance knockback positions safe", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const correctOrb = controller.snapshot().orbs.find((orb) => orb.isCorrect)!;
    controller.setWizardPosition({ x: correctOrb.x, y: correctOrb.y });
    controller.resolveCollisions();
    controller.setWizardPosition({ x: 480, y: 270 });
    controller.addZombie({ id: "zero", x: 480, y: 270, speed: 0, damage: 0 });
    controller.addZombie({ id: "wall", x: 650, y: 300, speed: 0, damage: 0 });
    controller.addZombie({ id: "edge", x: 40, y: 270, speed: 0, damage: 0 });

    const result = controller.castShockwave();
    for (const zombie of result.snapshot.zombies) {
      expect(zombie.x).toBeGreaterThanOrEqual(-65);
      expect(zombie.x).toBeLessThanOrEqual(1025);
      expect(zombie.y).toBeGreaterThanOrEqual(-65);
      expect(zombie.y).toBeLessThanOrEqual(605);
      expect(hitsGraveyardSolid({ x: zombie.x - zombie.radius, y: zombie.y - zombie.radius, width: zombie.radius * 2, height: zombie.radius * 2 })).toBe(false);
    }
    expect(result.snapshot.zombies.find((zombie) => zombie.id === "zero")).not.toMatchObject({ x: 480, y: 270 });
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
      initialZombies: [{ id: "zombie-a", x: 240, y: 240, speed: 20, damage: 10 }],
    });
    controller.move("move-right");
    controller.move("move-up");
    const captured = controller.capture();
    controller.move("move-left");
    controller.advance(200);
    controller.restore(captured);

    expect(controller.snapshot()).toEqual(captured);
  });

  it("restores a later active target into a fresh controller", () => {
    const source = createWizardVsZombieController(VOCABULARY, vi.fn());
    const correct = source.snapshot().orbs.find((orb) => orb.isCorrect);
    if (!correct) throw new Error("The source controller needs a correct orb");
    source.collectOrb(correct.id);
    source.advance(375);
    const captured = source.capture();
    const restored = createWizardVsZombieController(VOCABULARY, vi.fn());

    restored.restore(captured);
    expect(restored.snapshot()).toEqual(captured);
  });

  it("preserves a partial spawn interval across repeated restores", () => {
    const source = createWizardVsZombieController(VOCABULARY, vi.fn());
    source.advance(750);
    const captured = source.capture();
    const restored = createWizardVsZombieController(VOCABULARY, vi.fn());

    restored.restore(captured);
    restored.restore(restored.capture());
    restored.advance(250);
    expect(restored.snapshot()).toMatchObject({ spawnCount: 1, spawnTimerMs: 0 });
    expect(restored.snapshot().zombies).toHaveLength(1);
  });

  it("rejects restored entities inside solids or outside horde bounds", () => {
    const controller = createWizardVsZombieController(VOCABULARY, vi.fn());
    const captured = controller.capture();
    const blockedPoint = { x: 480, y: 124 };
    const correct = captured.orbs.find((orb) => orb.isCorrect);
    if (!correct) throw new Error("The restore fixture needs a correct orb");

    expect(() => controller.restore({
      ...captured,
      wizard: { ...captured.wizard, ...blockedPoint },
      player: { ...captured.player, ...blockedPoint },
    })).toThrow(/wizard.*solid/iu);
    expect(() => controller.restore({
      ...captured,
      zombies: [{ id: "blocked", ...blockedPoint, speed: 10, damage: 10, radius: 15 }],
    })).toThrow(/zombie.*solid/iu);
    expect(() => controller.restore({
      ...captured,
      zombies: [{ id: "outside", x: -100, y: 270, speed: 10, damage: 10, radius: 15 }],
    })).toThrow(/zombie.*bounds/iu);
    expect(() => controller.restore({
      ...captured,
      orbs: captured.orbs.map((orb) => orb.id === correct.id ? { ...orb, ...blockedPoint } : orb),
    })).toThrow(/orb.*solid|orb.*route/iu);
  });

  it("aligns the mausoleum solid with its visible base", () => {
    const mausoleum = GRAVEYARD_FEATURES.find((feature) => feature.kind === "mausoleum");

    expect(mausoleum?.solid).toBeDefined();
    expect(mausoleum?.displayWidth).toBe(96);
    expect(mausoleum?.displayHeight).toBe(128);
    expect(mausoleum?.solid?.x).toBeLessThan(mausoleum?.position.x ?? 0);
    expect((mausoleum?.solid?.y ?? 0) + (mausoleum?.solid?.height ?? 0)).toBe(mausoleum?.position.y ?? 0);
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
      [{ ...captured, orbContactLatched: true }, /contact zone/iu],
      [{ ...captured, orbContactZone: { ...captured.wizard, radius: ORB_RADIUS } }, /contact zone/iu],
      [{ ...captured, spawnTimerMs: -1 }, /spawn state/iu],
      [{ ...captured, invulnerabilityMs: ANSWER_AUDIO_PROTECTION_DURATION + 1 }, /immunity/iu],
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
    snapshots.push(inputSnapshot({
      pointer: {
        released: true,
        kind: "touch",
        startX: 480,
        startY: 250,
        x: 480,
        y: 250,
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

  it("steers throughout an arena hold and stops on release, cancel, and ability gestures", () => {
    let currentInput = inputSnapshot();
    const inputController = { snapshot: vi.fn(() => currentInput), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width: 960, height: 540 },
    } as never);
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    currentInput = inputSnapshot({ pointer: { down: true, id: 1, kind: "touch", startX: 760, startY: 280, x: 760, y: 280 } });
    scene.update.call(fake.scene, 0, 100);
    const afterFirstHold = scene.extend.apkCaptureResponsiveState().wizard;
    currentInput = inputSnapshot({ pointer: { down: true, id: 1, kind: "touch", startX: 760, startY: 280, x: 260, y: 280 } });
    scene.update.call(fake.scene, 100, 100);
    const afterRetarget = scene.extend.apkCaptureResponsiveState().wizard;
    expect(afterFirstHold.x).toBeGreaterThan(480);
    expect(afterRetarget.x).toBeLessThan(afterFirstHold.x);

    currentInput = inputSnapshot({ pointer: { released: true, id: null, kind: "touch", startX: 760, startY: 280, x: 260, y: 280 } });
    scene.update.call(fake.scene, 200, 100);
    expect(scene.extend.apkCaptureResponsiveState().wizard).toEqual(afterRetarget);
    currentInput = inputSnapshot({ pointer: { down: true, id: 2, kind: "touch", startX: 800, startY: 300, x: 800, y: 300 } });
    scene.update.call(fake.scene, 300, 100);
    const beforeCancel = scene.extend.apkCaptureResponsiveState().wizard;
    currentInput = inputSnapshot({ pointer: { down: true, cancelled: true, id: 2, kind: "touch", startX: 800, startY: 300, x: 800, y: 300 } });
    scene.update.call(fake.scene, 400, 100);
    expect(scene.extend.apkCaptureResponsiveState().wizard).toEqual(beforeCancel);

    const ability = getWizardShockwaveButtonBounds(960, 540);
    currentInput = inputSnapshot({ pointer: {
      down: true,
      id: 3,
      kind: "touch",
      startX: ability.x + ability.width / 2,
      startY: ability.y + ability.height / 2,
      x: 760,
      y: 280,
    } });
    scene.update.call(fake.scene, 500, 100);
    expect(scene.extend.apkCaptureResponsiveState().wizard).toEqual(beforeCancel);
  });

  it("maps compact arena taps back through the HUD projection", () => {
    const width = 390;
    const height = 844;
    const projection = getWizardArenaProjection(width, height, true, false);
    const target = { x: 530, y: 200 };
    const pointer = {
      released: true,
      kind: "touch" as const,
      startX: projection.x + target.x * projection.scaleX,
      startY: projection.y + target.y * projection.scaleY,
      x: projection.x + target.x * projection.scaleX,
      y: projection.y + target.y * projection.scaleY,
    };
    const inputController = {
      snapshot: vi.fn(() => inputSnapshot({ pointer })),
      cancelActiveGesture: vi.fn(),
      destroy: vi.fn(),
    };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width, height },
    } as never);
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot };
    };
    const fake = mockScene();
    fake.scene.scale = { width, height };
    fake.scene.game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height });
    scene.create.call(fake.scene);
    const before = scene.extend.apkCaptureResponsiveState().wizard;

    scene.update.call(fake.scene, 0, 16);

    const after = scene.extend.apkCaptureResponsiveState().wizard;
    expect(after.x).toBe(before.x);
    expect(after.y).toBeLessThan(before.y);
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

  it("renders and routes a visible compact touch ability target", () => {
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
    const scene = config.scene as {
      create: () => void;
      update: (time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState: () => WizardVsZombieSnapshot;
        apkRestoreResponsiveState: (state: WizardVsZombieSnapshot) => void;
      };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    const state = scene.extend.apkCaptureResponsiveState();
    scene.extend.apkRestoreResponsiveState({
      ...state,
      shockwaveCharges: 1,
      energy: 1,
      player: { ...state.player, shockwaveCharges: 1 },
    });
    const bounds = getWizardShockwaveButtonBounds(960, 540);
    inputController.snapshot.mockReturnValueOnce(inputSnapshot({
      pointer: {
        released: true,
        kind: "touch",
        startX: bounds.x + bounds.width / 2,
        startY: bounds.y + bounds.height / 2,
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      },
    }));
    scene.update.call(fake.scene, 0, 16);

    expect(bounds.width).toBeGreaterThanOrEqual(48);
    expect(bounds.height).toBeGreaterThanOrEqual(48);
    expect(fake.createdTexts.some((_text, index) => fake.scene.add.text.mock.calls[index]?.[2] === "✦ 0")).toBe(true);
    expect(fake.createdGraphics.some((graphics) => graphics.strokeRoundedRect.mock.calls.length > 0)).toBe(true);
    expect(fake.createdGraphics.some((graphics) => graphics.strokeCircle.mock.calls.length > 0)).toBe(true);
  });

  it("uses a dominant compact target and screen-safe icon controls", () => {
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width: 360, height: 704 },
    } as never);
    const scene = config.scene as { create(): void };
    const fake = mockScene();
    fake.scene.scale = { width: 360, height: 704 };
    fake.scene.game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 704 });
    scene.create.call(fake.scene);

    const ability = getWizardShockwaveButtonBounds(360, 704);
    const listening = getWizardListeningControlBounds(360, 704);
    expect(ability).toMatchObject({ x: 290, y: 18, width: 54, height: 54 });
    expect(ability.width).toBeGreaterThanOrEqual(44);
    expect(listening.audio.x + listening.audio.width).toBeLessThan(ability.x);
    expect(listening.transcript.y).toBeGreaterThan(ability.y + ability.height);
    expect(listening.fallback.y).toBe(listening.transcript.y);
    expect(fake.createdTexts[0]?.setVisible).toHaveBeenCalledWith(false);
    expect(fake.createdTexts[1]?.setText).toHaveBeenLastCalledWith("brillante");
    expect(fake.createdTexts[1]?.setFontSize).toHaveBeenLastCalledWith(34);
    expect(fake.createdTexts[2]?.setVisible).toHaveBeenLastCalledWith(false);
    expect(fake.createdTexts[3]?.setText).toHaveBeenLastCalledWith("♥");
    const renderedText = fake.createdTexts.flatMap((text) => text.setText.mock.calls.map((call) => String(call[0])));
    expect(renderedText).not.toEqual(expect.arrayContaining([
      expect.stringContaining("WIZARD VS ZOMBIE"),
      expect.stringContaining("Horde"),
      expect.stringContaining("Health"),
      expect.stringContaining("Take the true soul"),
      expect.stringContaining("Hold WASD"),
    ]));
  });

  it("places wide listening controls in a two-row HUD grid", () => {
    const ability = getWizardShockwaveButtonBounds(960, 540);
    const listening = getWizardListeningControlBounds(960, 540);

    expect(listening.audio.y).toBe(ability.y);
    expect(listening.audio.x + listening.audio.width).toBeLessThan(ability.x);
    expect(listening.transcript.y).toBeGreaterThan(ability.y + ability.height);
    expect(listening.fallback.y).toBe(listening.transcript.y);
    for (const control of [ability, listening.audio, listening.transcript, listening.fallback]) {
      expect(control.y + control.height).toBeLessThanOrEqual(148);
    }
  });

  it.each([
    { label: "wide reading", width: 960, height: 540, listening: false },
    { label: "wide listening", width: 960, height: 540, listening: true },
    { label: "compact reading", width: 360, height: 704, listening: false },
    { label: "compact listening", width: 360, height: 704, listening: true },
  ])("keeps the initial wizard and every crystal inside the visible arena for $label", ({ width, height, listening: usesListening }) => {
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const listening = usesListening
      ? listeningController(vi.fn(async (): Promise<ListeningAudioSnapshot> => ({ status: "completed", activeItemPosition: 0, muted: false })))
      : undefined;
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      listening,
      sessionMode: "playing",
      composition: { profile: width <= 520 ? "compact" : "standard", width, height },
    } as never);
    const scene = config.scene as { create(): void; extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot } };
    const fake = mockScene();
    fake.scene.scale = { width, height };
    scene.create.call(fake.scene);

    const state = scene.extend.apkCaptureResponsiveState();
    const gameplay = fake.createdGraphics[1]!;
    const hud = fake.createdGraphics[2]!;
    const topPanelBottom = Number(hud.fillRect.mock.calls[0]?.[3]);
    const projection = getWizardArenaProjection(width, height, width <= 520, usesListening);
    const arenaBottom = projection.y + projection.height;
    const bodyCircles = gameplay.fillCircle.mock.calls.slice(0, state.orbs.length + 1);
    expect(bodyCircles).toHaveLength(state.orbs.length + 1);
    for (const call of bodyCircles) {
      const y = Number(call[1]);
      const radius = Number(call[2]);
      expect(y - radius).toBeGreaterThanOrEqual(topPanelBottom);
      expect(y + radius).toBeLessThanOrEqual(arenaBottom);
    }

    const projectRect = (bounds: { x: number; y: number; width: number; height: number }) => ({
      left: projection.x + bounds.x * projection.scaleX,
      top: projection.y + bounds.y * projection.scaleY,
      right: projection.x + (bounds.x + bounds.width) * projection.scaleX,
      bottom: projection.y + (bounds.y + bounds.height) * projection.scaleY,
    });
    for (const bounds of [
      { x: WIZARD_RADIUS, y: WIZARD_RADIUS, width: WIZARD_VS_ZOMBIE_CANVAS.width - WIZARD_RADIUS * 2, height: WIZARD_VS_ZOMBIE_CANVAS.height - WIZARD_RADIUS * 2 },
      ...GRAVEYARD_SOLIDS,
      ...state.orbs.map((orb) => ({ x: orb.x - orb.radius, y: orb.y - orb.radius, width: orb.radius * 2, height: orb.radius * 2 })),
    ]) {
      const displayed = projectRect(bounds);
      expect(displayed.left).toBeGreaterThanOrEqual(projection.x);
      expect(displayed.top).toBeGreaterThanOrEqual(projection.y);
      expect(displayed.right).toBeLessThanOrEqual(projection.x + projection.width);
      expect(displayed.bottom).toBeLessThanOrEqual(projection.y + projection.height);
    }
  });

  it("shows one dominant Thai target and separate English pickup labels", () => {
    const width = 390;
    const height = 704;
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: [
        { term: "bridge", translation: "สะพาน" },
        { term: "lantern", translation: "โคมไฟ" },
        { term: "forest", translation: "ป่า" },
      ],
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width, height },
    } as never);
    const scene = config.scene as { create(): void };
    const fake = mockScene();
    fake.scene.scale = { width, height };
    fake.scene.game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width, height });
    scene.create.call(fake.scene);
    const topLabels = fake.createdTexts.slice(10, 12).map((label) => ({
      x: Number(label.setPosition.mock.calls.at(-1)?.[0]),
      width: Number(label.setWordWrapWidth.mock.calls.at(-1)?.[0]),
    }));

    expect(fake.createdTexts[1]?.setText).toHaveBeenLastCalledWith("สะพาน");
    expect(fake.createdTexts[1]?.setFontSize).toHaveBeenLastCalledWith(34);
    expect(fake.createdTexts.slice(10, 13).map((label) => label.setText.mock.calls.at(-1)?.[0]))
      .toEqual(expect.arrayContaining(["bridge", "lantern", "forest"]));
    for (const label of fake.createdTexts.slice(10, 13)) {
      expect(label.setFontSize).toHaveBeenLastCalledWith(16);
      expect(label.setWordWrapWidth.mock.calls.at(-1)?.[0]).toBeGreaterThanOrEqual(96);
    }
    expect(topLabels[0]!.x + topLabels[0]!.width).toBeLessThan(topLabels[1]!.x);
  });

  it("keeps the Thai target and four English choices readable on a scaled compact canvas", () => {
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: [
        { term: "bridge", translation: "สะพาน" },
        { term: "lantern", translation: "โคมไฟ" },
        { term: "forest", translation: "ป่า" },
        { term: "mountain", translation: "ภูเขา" },
      ],
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width: 960, height: 540 },
    } as never);
    const scene = config.scene as { create(): void };
    const fake = mockScene();
    fake.scene.game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 336, height: 190 });
    scene.create.call(fake.scene);

    expect(fake.createdTexts[1]?.setText).toHaveBeenLastCalledWith("สะพาน");
    expect(fake.createdTexts[1]?.setFontSize).toHaveBeenLastCalledWith(52);
    expect(fake.createdTexts.slice(10, 14).map((label) => label.setText.mock.calls.at(-1)?.[0]))
      .toEqual(expect.arrayContaining(["bridge", "lantern", "forest", "mountain"]));
    for (const label of fake.createdTexts.slice(10, 14)) {
      expect(label.setFontSize).toHaveBeenLastCalledWith(46);
      expect(label.setWordWrapWidth.mock.calls.at(-1)?.[0]).toBeGreaterThanOrEqual(274);
    }
    const hud = fake.createdGraphics[2]!;
    expect(hud.fillRoundedRect.mock.calls.length).toBeGreaterThanOrEqual(5);
    const labelBackgrounds = hud.fillRoundedRect.mock.calls.slice(-4);
    for (const background of labelBackgrounds) {
      expect(Number(background[2])).toBeLessThan(274);
      expect(Number(background[3])).toBeLessThan(90);
    }
  });

  it("shows numbered audio choices and permits safe HUD audition", async () => {
    const width = 390;
    const height = 704;
    const answerAudio = answerAudioController();
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: [
        { term: "bridge", translation: "สะพาน" },
        { term: "lantern", translation: "โคมไฟ" },
        { term: "forest", translation: "ป่า" },
      ],
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      answerAudio,
      sessionMode: "playing",
      composition: { profile: "compact", width, height },
    } as never);
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot };
    };
    const fake = mockScene();
    fake.scene.scale = { width, height };
    scene.create.call(fake.scene);

    expect(fake.createdTexts[1]?.setText).toHaveBeenLastCalledWith("สะพาน");
    expect(fake.createdTexts.slice(10, 13).map((label) => label.setText.mock.calls.at(-1)?.[0]))
      .toEqual(["1", "2", "3"]);
    expect(fake.createdTexts.slice(14, 17).map((label) => label.setText.mock.calls.at(-1)?.[0]))
      .toEqual(["1 🔊", "2 🔊", "3 🔊"]);
    const visibleText = fake.createdTexts.flatMap((label) => label.setText.mock.calls.map((call) => call[0]));
    expect(visibleText).not.toEqual(expect.arrayContaining(["bridge", "lantern", "forest"]));
    expect(getWizardArenaProjection(width, height, true, true).y).toBeGreaterThan(
      getWizardAnswerAudioControlBounds(width, height)[0]!.y,
    );
    const firstOrb = scene.extend.apkCaptureResponsiveState().orbs[0]!;
    const clipPosition = ["bridge", "lantern", "forest"].indexOf(firstOrb.term);
    const firstControl = getWizardAnswerAudioControlBounds(width, height)[0]!;
    const clientX = (firstControl.x + 4) * 960 / width;
    const clientY = (firstControl.y + 4) * 540 / height;
    inputController.snapshot.mockReturnValue(inputSnapshot({
      pointer: {
        released: true,
        kind: "touch",
        startX: clientX,
        startY: clientY,
        x: clientX,
        y: clientY,
      },
    }));
    scene.update.call(fake.scene, 0, 0);
    await vi.waitFor(() => expect(answerAudio.getChoiceSnapshot(0, clipPosition)).toMatchObject({ playCount: 1, canConfirm: true }));
    expect(answerAudio.getChoiceSnapshot(0, clipPosition)).toMatchObject({ playCount: 1, canConfirm: true });
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      totalAttempts: 0,
      invulnerabilityMs: ANSWER_AUDIO_PROTECTION_DURATION,
      wizard: { x: 480, y: 474 },
    });
    inputController.snapshot.mockReturnValue(inputSnapshot());
    expect(fake.createdTexts[3]?.setText).toHaveBeenLastCalledWith("♥ 🛡");
    for (let frame = 0; frame < 160; frame += 1) scene.update.call(fake.scene, frame + 1, 50);
    inputController.snapshot.mockReturnValue(inputSnapshot({
      pointer: { released: true, kind: "touch", startX: clientX, startY: clientY, x: clientX, y: clientY },
    }));
    scene.update.call(fake.scene, 161, 0);
    await vi.waitFor(() => expect(answerAudio.getChoiceSnapshot(0, clipPosition).playCount).toBe(2));
    expect(scene.extend.apkCaptureResponsiveState().invulnerabilityMs).toBe(0);
  });

  it("shows a numbered retry control when English answer audio fails", async () => {
    const width = 390;
    const height = 704;
    const answerAudio = answerAudioController(async () => { throw new Error("audio failed"); });
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: [
        { term: "bridge", translation: "สะพาน" },
        { term: "lantern", translation: "โคมไฟ" },
        { term: "forest", translation: "ป่า" },
      ],
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      answerAudio,
      sessionMode: "playing",
      composition: { profile: "compact", width, height },
    } as never);
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot };
    };
    const fake = mockScene();
    fake.scene.scale = { width, height };
    scene.create.call(fake.scene);
    const firstOrb = scene.extend.apkCaptureResponsiveState().orbs[0]!;
    const clipPosition = ["bridge", "lantern", "forest"].indexOf(firstOrb.term);
    const firstControl = getWizardAnswerAudioControlBounds(width, height)[0]!;
    const clientX = (firstControl.x + 4) * 960 / width;
    const clientY = (firstControl.y + 4) * 540 / height;
    inputController.snapshot.mockReturnValue(inputSnapshot({
      pointer: { released: true, kind: "touch", startX: clientX, startY: clientY, x: clientX, y: clientY },
    }));

    scene.update.call(fake.scene, 0, 0);
    await vi.waitFor(() => expect(answerAudio.getChoiceSnapshot(0, clipPosition).status).toBe("failed"));
    inputController.snapshot.mockReturnValue(inputSnapshot());
    scene.update.call(fake.scene, 1, 0);

    expect(fake.createdTexts[1]?.setText).toHaveBeenLastCalledWith("สะพาน");
    expect(fake.createdTexts[14]?.setText).toHaveBeenLastCalledWith("1 ↻");
    expect(fake.createdGraphics[2]?.lineStyle).toHaveBeenCalledWith(3, 0xfca5a5, 1);
    const visibleText = fake.createdTexts.flatMap((label) => label.setText.mock.calls.map((call) => call[0]));
    expect(visibleText).not.toEqual(expect.arrayContaining(["audio failed", "Try the audio again"]));
  });

  it("auditions before scoring and requires a new contact after playback", async () => {
    const played: number[] = [];
    const playback = deferred<void>();
    const answerAudio = answerAudioController(async (itemPosition) => {
      played.push(itemPosition);
      await playback.promise;
    });
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      answerAudio,
      sessionMode: "playing",
    } as never);
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: {
        apkCaptureResponsiveState(): WizardVsZombieSnapshot;
        apkRestoreResponsiveState(state: WizardVsZombieSnapshot): void;
      };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    const initial = scene.extend.apkCaptureResponsiveState();
    const correct = initial.orbs.find((orb) => orb.isCorrect);
    if (!correct) throw new Error("The audio round needs a correct crystal");
    const contact = {
      ...initial,
      wizard: { ...initial.wizard, x: correct.x, y: correct.y },
      player: { ...initial.player, x: correct.x, y: correct.y },
      correctAction: "confirm" as const,
      orbContactLatched: false,
      orbContactZone: undefined,
    };

    scene.extend.apkRestoreResponsiveState(contact);
    scene.update.call(fake.scene, 0, 0);
    await vi.waitFor(() => expect(played).toEqual([0]));
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      totalAttempts: 0,
      orbContactLatched: true,
      invulnerabilityMs: ANSWER_AUDIO_PROTECTION_DURATION,
    });

    inputController.snapshot.mockReturnValue(inputSnapshot({ keys: ["ArrowRight"] }));
    scene.update.call(fake.scene, 1, 100);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      totalAttempts: 0,
      gameTimeMs: 50,
      invulnerabilityMs: ANSWER_AUDIO_PROTECTION_DURATION - 50,
    });
    expect(scene.extend.apkCaptureResponsiveState().wizard.x).toBeGreaterThan(correct.x);

    playback.resolve();
    await vi.waitFor(() => expect(answerAudio.canConfirmChoice(0, 0)).toBe(true));
    inputController.snapshot.mockReturnValue(inputSnapshot());
    scene.update.call(fake.scene, 2, 0);
    expect(scene.extend.apkCaptureResponsiveState().totalAttempts).toBe(0);

    scene.extend.apkRestoreResponsiveState(initial);
    scene.update.call(fake.scene, 3, 0);
    scene.extend.apkRestoreResponsiveState(contact);
    scene.update.call(fake.scene, 4, 0);

    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      targetIndex: 1,
      totalAttempts: 1,
      correctAnswers: 1,
    });
    expect(answerAudio.getEvidence().questions[0]?.selectionAttempts).toEqual([
      expect.objectContaining({ clipItemPosition: 0, playbackResult: "completed", submitted: true, completedQuestion: true }),
    ]);
    expect(answerAudio.getSnapshot().questionPosition).toBe(1);
  });

  it("freezes play until the current listening prompt completes", async () => {
    const pending = deferred<ListeningAudioSnapshot>();
    const listening = listeningController(vi.fn(() => pending.promise));
    const inputController = {
      snapshot: vi.fn(() => inputSnapshot({ keys: ["ArrowRight"] })),
      cancelActiveGesture: vi.fn(),
      destroy: vi.fn(),
    };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      listening,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    const initial = scene.extend.apkCaptureResponsiveState();
    scene.update.call(fake.scene, 0, 100);

    expect(listening.play).toHaveBeenCalledWith(0);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      gameTimeMs: 0,
      wizard: initial.wizard,
    });

    pending.resolve({ status: "completed", activeItemPosition: 0, muted: false });
    await flushPromises();
    scene.update.call(fake.scene, 100, 100);
    expect(scene.extend.apkCaptureResponsiveState().gameTimeMs).toBeGreaterThan(0);
    expect(scene.extend.apkCaptureResponsiveState().wizard.x).toBeGreaterThan(initial.wizard.x);

    const controls = getWizardListeningControlBounds(960, 540);
    inputController.snapshot.mockReturnValueOnce(inputSnapshot({
      pointer: {
        released: true,
        kind: "touch",
        startX: controls.audio.x + 4,
        startY: controls.audio.y + 4,
        x: controls.audio.x + 4,
        y: controls.audio.y + 4,
      },
    }));
    scene.update.call(fake.scene, 200, 0);
    expect(listening.replay).toHaveBeenCalledWith(0);
  });

  it("keeps failed listening unplayed and offers explicit assistance", async () => {
    const listening = listeningController(vi.fn(async (): Promise<ListeningAudioSnapshot> => ({
      status: "failed",
      activeItemPosition: 0,
      muted: false,
      failure: { code: "playback-failed", itemPosition: 0, message: "Playback blocked" },
    })));
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      listening,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: {
        apkCaptureResponsiveState(): WizardVsZombieSnapshot;
        apkRestoreResponsiveState(state: WizardVsZombieSnapshot): void;
      };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    await flushPromises();
    const failedState = scene.extend.apkCaptureResponsiveState();
    const blockedOrb = failedState.orbs.find((orb) => orb.isCorrect);
    if (!blockedOrb) throw new Error("The failed listening round needs a correct orb");
    scene.extend.apkRestoreResponsiveState({
      ...failedState,
      correctAction: "confirm",
      wizard: { ...failedState.wizard, x: blockedOrb.x, y: blockedOrb.y },
      player: { ...failedState.player, x: blockedOrb.x, y: blockedOrb.y },
    });
    scene.update.call(fake.scene, 0, 200);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ gameTimeMs: 0, totalAttempts: 0 });

    const controls = getWizardListeningControlBounds(960, 540);
    inputController.snapshot.mockReturnValueOnce(inputSnapshot({
      pointer: {
        released: true,
        kind: "touch",
        startX: controls.transcript.x + 4,
        startY: controls.transcript.y + 4,
        x: controls.transcript.x + 4,
        y: controls.transcript.y + 4,
      },
    }));
    scene.update.call(fake.scene, 200, 16);
    expect(listening.recordTranscriptAssistance).toHaveBeenCalledWith(0);
    const rendered = fake.createdTexts.flatMap((text) => text.setText.mock.calls.map((call) => String(call[0])));
    expect(rendered).toContain("brillante");
    expect(rendered).toContain("↻");
    expect(rendered).toContain("Aa");
    expect(rendered).toContain("A");
  });

  it("keeps muted cancellation blocked until explicit retry completes", async () => {
    const play = vi.fn()
      .mockResolvedValueOnce({ status: "cancelled", activeItemPosition: 0, muted: true } satisfies ListeningAudioSnapshot)
      .mockResolvedValueOnce({ status: "completed", activeItemPosition: 0, muted: false } satisfies ListeningAudioSnapshot);
    const listening = listeningController(play);
    const inputController = {
      snapshot: vi.fn(() => inputSnapshot({ keys: ["ArrowRight"] })),
      cancelActiveGesture: vi.fn(),
      destroy: vi.fn(),
    };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      listening,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: { apkCaptureResponsiveState(): WizardVsZombieSnapshot };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    await flushPromises();
    scene.update.call(fake.scene, 0, 100);
    expect(scene.extend.apkCaptureResponsiveState().gameTimeMs).toBe(0);

    const controls = getWizardListeningControlBounds(960, 540);
    inputController.snapshot.mockReturnValueOnce(inputSnapshot({
      pointer: {
        released: true,
        kind: "touch",
        startX: controls.audio.x + 4,
        startY: controls.audio.y + 4,
        x: controls.audio.x + 4,
        y: controls.audio.y + 4,
      },
    }));
    scene.update.call(fake.scene, 100, 0);
    await flushPromises();
    scene.update.call(fake.scene, 101, 100);
    expect(play).toHaveBeenCalledTimes(2);
    expect(scene.extend.apkCaptureResponsiveState().gameTimeMs).toBeGreaterThan(0);
  });

  it("starts each next listening prompt and blocks the new round", async () => {
    const nextPrompt = deferred<ListeningAudioSnapshot>();
    const listening = listeningController(vi.fn((position: number): Promise<ListeningAudioSnapshot> => position === 0
      ? Promise.resolve({ status: "completed", activeItemPosition: 0, muted: false })
      : nextPrompt.promise));
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: VOCABULARY,
      edition: {} as never,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      listening,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: {
        apkCaptureResponsiveState(): WizardVsZombieSnapshot;
        apkRestoreResponsiveState(state: WizardVsZombieSnapshot): void;
      };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    await flushPromises();
    const state = scene.extend.apkCaptureResponsiveState();
    const correct = state.orbs.find((orb) => orb.isCorrect);
    if (!correct) throw new Error("The listening round needs a correct orb");
    scene.extend.apkRestoreResponsiveState({
      ...state,
      correctAction: "confirm",
      wizard: { ...state.wizard, x: correct.x, y: correct.y },
      player: { ...state.player, x: correct.x, y: correct.y },
    });
    scene.update.call(fake.scene, 0, 16);
    const advanced = scene.extend.apkCaptureResponsiveState();
    expect(advanced.targetIndex).toBe(1);
    expect(listening.play).toHaveBeenNthCalledWith(2, 1);
    scene.update.call(fake.scene, 16, 100);
    expect(scene.extend.apkCaptureResponsiveState().gameTimeMs).toBe(advanced.gameTimeMs);
  });

  it("makes explicit reading fallback unscored and ignores stale audio", async () => {
    const retry = deferred<ListeningAudioSnapshot>();
    const play = vi.fn()
      .mockResolvedValueOnce({
        status: "failed",
        activeItemPosition: 0,
        muted: false,
        failure: { code: "playback-failed", itemPosition: 0, message: "Playback blocked" },
      })
      .mockImplementationOnce(() => retry.promise);
    const listening = listeningController(play);
    listening.getEvidence = vi.fn((): ListeningEvidence => ({
      schemaVersion: 1,
      declaredModality: "listen-to-select",
      effectiveModality: "reading-fallback",
      sourceLocale: "en-US",
      targetLocale: "th-TH",
      itemCount: 1,
      assistedItemPositions: [],
      fallbackItemPositions: [0],
      replayCounts: [],
      audioFailures: [{ itemPosition: 0, code: "playback-failed" }],
    }));
    const complete = vi.fn();
    const inputController = { snapshot: vi.fn(() => inputSnapshot()), cancelActiveGesture: vi.fn(), destroy: vi.fn() };
    const config = createWizardVsZombieCartridge().createGameConfig({
      input: [VOCABULARY[0]!],
      edition: {} as never,
      complete,
      diagnostic: vi.fn(),
      inputController,
      listening,
      sessionMode: "playing",
    });
    const scene = config.scene as {
      create(): void;
      update(time: number, delta: number): void;
      extend: {
        apkCaptureResponsiveState(): WizardVsZombieSnapshot;
        apkRestoreResponsiveState(state: WizardVsZombieSnapshot): void;
      };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    await flushPromises();
    const controls = getWizardListeningControlBounds(960, 540);
    inputController.snapshot.mockReturnValueOnce(inputSnapshot({
      pointer: {
        released: true,
        kind: "touch",
        startX: controls.audio.x + 4,
        startY: controls.audio.y + 4,
        x: controls.audio.x + 4,
        y: controls.audio.y + 4,
      },
    }));
    scene.update.call(fake.scene, 0, 0);
    expect(play).toHaveBeenCalledTimes(2);

    inputController.snapshot.mockReturnValueOnce(inputSnapshot({
      pointer: {
        released: true,
        kind: "touch",
        startX: controls.fallback.x + 4,
        startY: controls.fallback.y + 4,
        x: controls.fallback.x + 4,
        y: controls.fallback.y + 4,
      },
    }));
    scene.update.call(fake.scene, 1, 0);
    expect(listening.recordReadingFallback).toHaveBeenCalledWith(0);
    expect(listening.pause).toHaveBeenCalled();
    retry.resolve({ status: "completed", activeItemPosition: 0, muted: false });
    await flushPromises();
    scene.update.call(fake.scene, 1, 0);
    const audioLabels = fake.createdTexts[5]?.setText.mock.calls.map((call) => String(call[0]));
    expect(audioLabels?.at(-1)).toBe("🔊");

    const state = scene.extend.apkCaptureResponsiveState();
    const correct = state.orbs.find((orb) => orb.isCorrect);
    if (!correct) throw new Error("The fallback round needs a correct orb");
    scene.extend.apkRestoreResponsiveState({
      ...state,
      correctAction: "confirm",
      wizard: { ...state.wizard, x: correct.x, y: correct.y },
      player: { ...state.player, x: correct.x, y: correct.y },
    });
    scene.update.call(fake.scene, 2, 16);
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ xp: 0, score: 0 }), "victory");
  });

  it("does not reveal the correct orb through its scene color", () => {
    const source = readFileSync(new URL("./wizard-vs-zombie.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/fillStyle\(orb\.isCorrect\s*\?/u);
  });

  it("reflows the isolated target through a compact and wide responsive round trip", () => {
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
      extend: {
        apkCaptureResponsiveState: () => WizardVsZombieSnapshot;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const fake = mockScene();
    scene.create.call(fake.scene);
    const stateBeforeRecompose = scene.extend.apkCaptureResponsiveState();

    const printed = (): string[] => fake.createdTexts
      .flatMap((text) => text.setText.mock.calls.map((call) => String(call[0])));
    expect(fake.createdTexts[1]?.setText).toHaveBeenLastCalledWith("brillante");
    expect(printed()).not.toEqual(expect.arrayContaining([
      expect.stringContaining("Night arena"),
      expect.stringContaining("Horde"),
      expect.stringContaining("Health"),
    ]));

    fake.scene.scale = { width: 371, height: 704 };
    fake.scene.game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 371, height: 704 });
    scene.extend.apkRecompose({ profile: "compact", safeRect: { width: 371, height: 704 } });
    const compactTargetWidth = Number(fake.createdTexts[1]?.setWordWrapWidth.mock.calls.at(-1)?.[0]);
    expect(fake.createdTexts[1]?.setFontSize).toHaveBeenLastCalledWith(34);
    expect(fake.createdTexts[2]?.setVisible).toHaveBeenLastCalledWith(false);
    expect(fake.createdTexts[8]?.setVisible).toHaveBeenLastCalledWith(false);

    fake.scene.scale = { width: 986, height: 560 };
    fake.scene.game.canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 986, height: 560 });
    scene.extend.apkRecompose({ profile: "wide", safeRect: { width: 986, height: 560 } });
    const wideTargetWidth = Number(fake.createdTexts[1]?.setWordWrapWidth.mock.calls.at(-1)?.[0]);
    expect(wideTargetWidth).toBeGreaterThan(compactTargetWidth);
    expect(fake.createdTexts[1]?.setFontSize).toHaveBeenLastCalledWith(44);
    expect(fake.createdTexts[9]?.setVisible).toHaveBeenLastCalledWith(false);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(stateBeforeRecompose);
    expect(inputController.snapshot).not.toHaveBeenCalled();
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

  it("paints the authored graveyard, mage, varied zombies, and crystal sprites", () => {
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
      update(this: unknown, time: number, delta: number): void;
    };

    const loadedImages: string[] = [];
    const loadedSheets: string[] = [];
    const placedKeys: string[] = [];
    const tileKeys: string[] = [];
    const originsByKey = new Map<string, unknown[][]>();
    const makeImage = (key: string) => {
      const image = {
        setOrigin: vi.fn((...values: unknown[]) => {
          originsByKey.set(key, [...(originsByKey.get(key) ?? []), values]);
          return image;
        }),
        setDisplaySize: vi.fn(() => image),
        setFrame: vi.fn(() => image),
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
    for (let frame = 0; frame < 20; frame += 1) scene.update.call(fake.scene, frame * 50, 50);

    expect(loadedImages).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:tile-grass",
      "apk:catalog-standard-pack:wizard-floor",
      "apk:catalog-standard-pack:tile-dirt",
      "apk:catalog-standard-pack:wizard-grave",
      "apk:catalog-standard-pack:wizard-gate",
      "apk:catalog-standard-pack:wizard-mausoleum",
    ]));
    expect(loadedSheets).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:wizard-player",
      "apk:catalog-standard-pack:wizard-undead",
      "apk:catalog-standard-pack:prop-crystal-blue",
      "apk:catalog-standard-pack:wizard-fence",
    ]));
    expect(tileKeys).toContain("apk:catalog-standard-pack:tile-grass");
    expect(tileKeys).toContain("apk:catalog-standard-pack:tile-dirt");
    expect(placedKeys).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:wizard-grave",
      "apk:catalog-standard-pack:wizard-gate",
      "apk:catalog-standard-pack:wizard-mausoleum",
      "apk:catalog-standard-pack:wizard-fence",
      "apk:catalog-standard-pack:wizard-player",
      "apk:catalog-standard-pack:prop-crystal-blue",
    ]));
    expect(originsByKey.get("apk:catalog-standard-pack:prop-crystal-blue")).toContainEqual([0.5, 0.5]);
    expect(originsByKey.get("apk:catalog-standard-pack:wizard-undead")).toContainEqual([0.5, 0.78]);
    expect(originsByKey.get("apk:catalog-standard-pack:wizard-player")).toContainEqual([0.5, 0.78]);
    expect(originsByKey.get("apk:catalog-standard-pack:wizard-mausoleum")).toContainEqual([0.5, 1]);
    expect(fake.createdGraphics.some((graphics) => graphics.fillRect.mock.calls.length > 0)).toBe(true);
    expect(fake.createdGraphics.some((graphics) => graphics.fillRoundedRect.mock.calls.length > 0)).toBe(true);
    expect(fake.createdGraphics.some((graphics) => graphics.setDepth.mock.calls.some((call) => call[0] === 10))).toBe(true);
  });
});
