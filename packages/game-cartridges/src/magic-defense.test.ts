import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import { createCatalogStandardEdition } from "./catalog-standard-art.js";
import {
  MAGIC_DEFENSE_CHOICE_Y_RATIO,
  MAGIC_DEFENSE_ENEMY_NEAR_SIZE,
  MAGIC_DEFENSE_HORIZON_Y_RATIO,
  MAGIC_DEFENSE_MAX_CASTLE_HEALTH,
  MAGIC_DEFENSE_MAX_MANA,
  MAGIC_DEFENSE_MISSILE_SPAWN_INTERVAL_MS,
  MAGIC_DEFENSE_TOWER_Y_RATIO,
  createMagicDefenseCartridge,
  createMagicDefenseController,
  magicDefenseApproachPose,
  type MagicDefenseController,
  type MagicDefenseSnapshot,
} from "./magic-defense.js";

const VOCABULARY = [
  { term: "ward", translation: "proteger" },
  { term: "shield", translation: "escudo" },
  { term: "spell", translation: "hechizo" },
];

function typeText(controller: MagicDefenseController, text: string): void {
  for (const character of text) controller.typeCharacter(character);
}

function finishCurrentTarget(controller: MagicDefenseController) {
  typeText(controller, controller.snapshot().answer);
  return controller.submitAnswer();
}

function createText(value = "") {
  const text = {
    value,
    destroyed: false,
    setPosition: vi.fn(() => text),
    setText: vi.fn((next: string) => { text.value = next; return text; }),
    setDepth: vi.fn(() => text),
    destroy: vi.fn(() => { text.destroyed = true; }),
  };
  return text;
}

function createImage() {
  const image = {
    destroyed: false,
    setOrigin: vi.fn(() => image),
    setDisplaySize: vi.fn(() => image),
    setDepth: vi.fn(() => image),
    setPosition: vi.fn(() => image),
    setVisible: vi.fn(() => image),
    destroy: vi.fn(() => { image.destroyed = true; }),
  };
  return image;
}

function createSceneHarness() {
  const events = new Map<string, () => void>();
  const graphics = {
    clear: vi.fn(() => graphics),
    fillStyle: vi.fn(() => graphics),
    fillRect: vi.fn(() => graphics),
    fillCircle: vi.fn(() => graphics),
    fillRoundedRect: vi.fn(() => graphics),
    fillTriangle: vi.fn(() => graphics),
    lineStyle: vi.fn(() => graphics),
    strokeRoundedRect: vi.fn(() => graphics),
    setDepth: vi.fn(() => graphics),
    destroy: vi.fn(),
  };
  const texts: ReturnType<typeof createText>[] = [];
  let nextInput = {
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
  const images: ReturnType<typeof createImage>[] = [];
  const scene = {
    load: {
      image: vi.fn(),
      spritesheet: vi.fn(),
    },
    add: {
      graphics: vi.fn(() => graphics),
      text: vi.fn((_x: number, _y: number, value: string) => {
        const text = createText(value);
        texts.push(text);
        return text;
      }),
      image: vi.fn(() => {
        const image = createImage();
        images.push(image);
        return image;
      }),
      sprite: vi.fn(() => {
        const image = createImage();
        images.push(image);
        return image;
      }),
      tileSprite: vi.fn(() => {
        const image = createImage();
        images.push(image);
        return image;
      }),
    },
    events: { once: vi.fn((event: string, listener: () => void) => events.set(event, listener)) },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) } },
    scale: { width: 960, height: 540 },
  };
  let inputSnapshotCalls = 0;
  const inputController = {
    snapshot: vi.fn(() => {
      inputSnapshotCalls += 1;
      const snapshot = nextInput;
      nextInput = { ...nextInput, pointer: { ...nextInput.pointer, released: false } };
      return snapshot;
    }),
  };
  return {
    scene,
    inputController,
    graphics,
    texts,
    images,
    inputSnapshotCalls: () => inputSnapshotCalls,
    setInput(input: {
      readonly keys?: readonly string[];
      readonly pressed?: readonly string[];
      readonly pointer?: Partial<typeof nextInput.pointer>;
    }): void {
      nextInput = {
        ...nextInput,
        ...input,
        pointer: { ...nextInput.pointer, ...input.pointer },
      };
    },
    shutdown(): void { events.get("shutdown")?.(); },
  };
}

describe("Magic Defense cartridge", () => {
  it("covers controller aliases, typed-input rejection, timer validation, and falling missiles", () => {
    expect(() => createMagicDefenseController(VOCABULARY, vi.fn(), { timerSeconds: 0 })).toThrow(/greater than zero/u);
    expect(() => createMagicDefenseController(VOCABULARY, vi.fn(), { seed: Number.NaN })).toThrow(/finite/u);

    const controller = createMagicDefenseController(VOCABULARY, vi.fn(), 17);
    expect(controller.type("").accepted).toBe(false);
    expect(controller.type("ab").accepted).toBe(false);
    expect(controller.type("\u0000").accepted).toBe(false);
    typeText(controller, "a".repeat(121));
    expect(controller.snapshot().typingBuffer).toHaveLength(120);
    expect(controller.backspace().accepted).toBe(true);
    expect(controller.submit(1 as never).accepted).toBe(false);
    expect(controller.choose("not-an-answer").accepted).toBe(false);
    expect(controller.missMissile("missing").accepted).toBe(false);
    expect(controller.useStorm().accepted).toBe(false);
    expect(controller.storm().accepted).toBe(false);
    expect(() => controller.advanceTime(-1)).toThrow(/nonnegative/u);
    expect(() => controller.tick(-1)).toThrow(/nonnegative/u);

    const falling = createMagicDefenseController(VOCABULARY, vi.fn(), { seed: 17 });
    const initialMissile = falling.snapshot().activeMissiles[0];
    expect(initialMissile).toBeDefined();
    const ticked = falling.tick(8_000);
    expect(ticked.snapshot.totalAttempts).toBe(1);
    expect(ticked.snapshot.lastOutcome).toBe("missed");
    expect(ticked.snapshot.activeMissiles.some((missile) => missile.id !== initialMissile?.id)).toBe(true);
  });

  it("publishes the preserved manifest and deterministic three-castle opening", () => {
    const cartridge = createMagicDefenseCartridge();
    const snapshot = createMagicDefenseController(VOCABULARY, vi.fn()).snapshot();

    expect(cartridge.manifest).toMatchObject({
      id: "magic-defense",
      title: "Magic Defense",
      inputMode: "vocabulary",
      requiredAssetBindings: ["legacy-catalog/magic-defense/arcane-castle"],
    });
    expect(cartridge.standardExperience.definition).toMatchObject({
      briefing: { startPhase: "tutorial", learningPreview: { heading: "Words to learn" } },
      tutorial: { lifecycle: { complete: { to: "playing" } } },
      debrief: { outcome: "complete", requiredCredit: "Pixel art assets by ElvGames" },
    });
    expect(snapshot).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      targetCount: 3,
      prompt: "ward",
      answer: "proteger",
      typingBuffer: "",
      score: 0,
      combo: 0,
      mana: 0,
      totalAttempts: 0,
      castleHealth: { left: 3, center: 3, right: 3 },
      activeMissiles: [{ id: "missile:0", targetCastleId: "left", prompt: "ward" }],
    });
  });

  it("rejects empty content and validates typed answers with Backspace semantics", () => {
    expect(() => createMagicDefenseController([], vi.fn())).toThrow(/empty playable content/i);

    const controller = createMagicDefenseController(VOCABULARY, vi.fn());
    typeText(controller, "protee");
    controller.backspace();
    controller.typeCharacter("g");
    expect(controller.snapshot().typingBuffer).toBe("proteg");

    const wrong = controller.submitAnswer("wrong");
    expect(wrong).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(wrong.snapshot).toMatchObject({ combo: 0, totalAttempts: 1, targetIndex: 0, typingBuffer: "" });

    typeText(controller, "PROTEGER");
    const correct = controller.submitAnswer();
    expect(correct).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(correct.snapshot).toMatchObject({ targetIndex: 1, score: 100, combo: 1, mana: 10 });
  });

  it("accepts pointer answer choices and keeps the target until a correct translation", () => {
    const controller = createMagicDefenseController(VOCABULARY, vi.fn());
    const initial = controller.snapshot();
    const wrongChoice = initial.answerChoices.find((choice) => choice !== initial.answer);
    expect(wrongChoice).toBeDefined();

    const wrong = controller.chooseAnswer(wrongChoice!);
    expect(wrong).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(wrong.snapshot.targetIndex).toBe(0);

    const correct = controller.chooseAnswer(initial.answer);
    expect(correct.correct).toBe(true);
    expect(correct.snapshot.targetIndex).toBe(1);
  });

  it("rotates the answer choices so the correct translation does not stay in one lane", () => {
    const controller = createMagicDefenseController(VOCABULARY, vi.fn());
    const correctPositions: number[] = [];

    while (controller.snapshot().phase === "playing") {
      const state = controller.snapshot();
      correctPositions.push(state.answerChoices.indexOf(state.answer));
      finishCurrentTarget(controller);
    }

    expect(correctPositions).toEqual([2, 1, 0]);
  });

  it("damages the missile target, resets combo, and replaces a missed current missile", () => {
    const controller = createMagicDefenseController(VOCABULARY, vi.fn());
    finishCurrentTarget(controller);
    const beforeMiss = controller.snapshot();
    const result = controller.missMissile();

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(result.snapshot).toMatchObject({
      targetIndex: beforeMiss.targetIndex,
      combo: 0,
      totalAttempts: beforeMiss.totalAttempts + 1,
      castleHealth: { left: 3, center: 2, right: 3 },
    });
    expect(result.snapshot.activeMissiles[0]?.id).not.toBe(beforeMiss.activeMissiles[0]?.id);
  });

  it("retargets a fallen castle and preserves aliases through a responsive restore", () => {
    const controller = createMagicDefenseController(VOCABULARY, vi.fn(), { seed: 17 });
    const initialTarget = controller.snapshot().activeMissiles[0]?.targetCastleId;
    controller.submitAnswer("wrong");
    controller.submitAnswer("wrong");
    controller.submitAnswer("wrong");
    expect(initialTarget).toBeDefined();
    expect(controller.snapshot().castleHealth[initialTarget!]).toBe(0);
    expect(controller.snapshot()).toMatchObject({ lastOutcome: "incorrect" });
    expect(controller.snapshot().activeMissiles[0]?.targetCastleId).not.toBe(initialTarget);

    const captured = controller.capture();
    controller.submitAnswer("wrong");
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);

    const invalid = [
      [null, /invalid/iu],
      [{ ...captured, seed: 18 }, /seed/iu],
      [{ ...captured, phase: "paused" }, /phase/iu],
      [{ ...captured, prompt: "wrong" }, /target content/iu],
      [{ ...captured, availableActions: [] }, /answer actions/iu],
      [{ ...captured, answerChoices: ["wrong"] }, /answer actions/iu],
      [{ ...captured, typingBuffer: 1 }, /text state/iu],
      [{ ...captured, timer: 1 }, /timer alias/iu],
      [{ ...captured, castleHealth: { left: -1, center: 3, right: 3 } }, /castle health/iu],
      [{ ...captured, lives: 1 }, /shared resources/iu],
      [{ ...captured, castleHp: { left: 3, center: 3, right: 3 } }, /health alias/iu],
      [{ ...captured, spawnTimerMs: MAGIC_DEFENSE_MISSILE_SPAWN_INTERVAL_MS }, /spawn state/iu],
      [{ ...captured, lastOutcome: "other" }, /outcome/iu],
      [{ ...captured, activeMissiles: [{ ...captured.activeMissiles[0]!, id: "duplicate" }], missiles: captured.missiles }, /missile alias/iu],
    ] as const;
    for (const [state, pattern] of invalid) expect(() => controller.restore(state as never)).toThrow(pattern);
  });

  it("penalizes an incorrect answer without advancing the target", () => {
    const controller = createMagicDefenseController(VOCABULARY, vi.fn());
    const before = controller.snapshot();
    const wrongChoice = before.availableActions.find((action) => action !== before.correctAction);

    const result = controller.choose(wrongChoice!);

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false, completed: false });
    expect(result.snapshot).toMatchObject({
      targetIndex: before.targetIndex,
      combo: 0,
      lives: before.lives - 1,
      energy: before.energy,
      castleHealth: { left: MAGIC_DEFENSE_MAX_CASTLE_HEALTH - 1, center: 3, right: 3 },
    });
  });

  it("fills mana, then uses one storm to clear every active missile", () => {
    const controller = createMagicDefenseController(
      Array.from({ length: 11 }, (_item, index) => ({ term: `word-${index}`, translation: `answer-${index}` })),
      vi.fn(),
    );
    for (let index = 0; index < MAGIC_DEFENSE_MAX_MANA / 10; index += 1) finishCurrentTarget(controller);
    controller.spawnMissile();
    controller.spawnMissile();
    expect(controller.snapshot().mana).toBe(MAGIC_DEFENSE_MAX_MANA);
    expect(controller.snapshot().activeMissiles.length).toBeGreaterThan(1);

    const storm = controller.activateStorm();
    expect(storm).toMatchObject({ accepted: true, clearedMissiles: expect.any(Number) });
    expect(storm.snapshot).toMatchObject({ mana: 0, activeMissiles: [] });
  });

  it("defeats the session when the timer expires", () => {
    const deliver = vi.fn();
    const controller = createMagicDefenseController(VOCABULARY, deliver, { timerSeconds: 2 });

    expect(controller.advanceTime(1).snapshot.timeRemaining).toBe(1);
    const terminal = controller.advanceTime(1);

    expect(terminal).toMatchObject({ accepted: true, terminal: true, reason: "timer" });
    expect(terminal.snapshot).toMatchObject({ phase: "defeat", timeRemaining: 0 });
    expect(gameResultsSchema.parse(terminal.result)).toBeDefined();
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "defeat");
  });

  it("wins after every vocabulary target is answered and emits one strict result", () => {
    const deliver = vi.fn();
    const controller = createMagicDefenseController(VOCABULARY, deliver);
    let finalChoice: ReturnType<MagicDefenseController["submitAnswer"]> | undefined;
    while (controller.snapshot().phase === "playing") finalChoice = finishCurrentTarget(controller);

    const terminal = controller.submitAnswer("proteger");
    expect(controller.snapshot().phase).toBe("victory");
    expect(terminal).toMatchObject({ accepted: false, terminal: false });
    expect(finalChoice).toMatchObject({ accepted: true, correct: true, progressed: true, terminal: true, completed: true, result: expect.any(Object) });
    expect(deliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 1,
      score: 300,
      correctAnswers: 3,
      totalAttempts: 3,
    });
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "victory");
  });

  it("defeats the session after all three castles fall", () => {
    const deliver = vi.fn();
    const controller = createMagicDefenseController(VOCABULARY, deliver);
    let finalHazard: ReturnType<MagicDefenseController["applyHazard"]> | undefined;

    for (let index = 0; index < MAGIC_DEFENSE_MAX_CASTLE_HEALTH * 3; index += 1) {
      finalHazard = controller.applyHazard();
    }

    expect(controller.snapshot()).toMatchObject({
      phase: "defeat",
      castleHealth: { left: 0, center: 0, right: 0 },
    });
    expect(finalHazard).toMatchObject({ accepted: true, terminal: true, completed: true, result: expect.any(Object) });
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "defeat");
    expect(controller.missMissile().accepted).toBe(false);
  });

  it("exposes the shared controller and snapshot contract", () => {
    const controller = createMagicDefenseController(VOCABULARY, vi.fn(), { seed: 17 });
    const state = controller.snapshot();

    expect(state).toMatchObject({
      seed: 17,
      phase: "playing",
      targetIndex: 0,
      targetCount: VOCABULARY.length,
      prompt: "ward",
      answer: "proteger",
      correctAction: "proteger",
      availableActions: state.answerChoices,
      lives: 9,
      energy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      destroyed: false,
    });
    expect(controller.capture()).toEqual(state);
    expect(controller.applyHazard()).toMatchObject({ accepted: true, correct: false, progressed: false });
  });

  it("uses the host seed for repeatable targets, placements, and hazard order", () => {
    const first = createMagicDefenseController(VOCABULARY, vi.fn(), { seed: 17 });
    const second = createMagicDefenseController(VOCABULARY, vi.fn(), { seed: 17 });
    const different = createMagicDefenseController(VOCABULARY, vi.fn(), { seed: 18 });

    for (let index = 0; index < 4; index += 1) {
      first.spawnMissile();
      second.spawnMissile();
      different.spawnMissile();
    }

    expect(first.snapshot().activeMissiles).toEqual(second.snapshot().activeMissiles);
    expect(different.snapshot().activeMissiles).not.toEqual(first.snapshot().activeMissiles);
  });

  it("rejects an active restore after the completion latch is terminal", () => {
    const controller = createMagicDefenseController(VOCABULARY, vi.fn());
    const active = controller.capture();
    while (controller.snapshot().phase === "playing") finishCurrentTarget(controller);

    expect(() => controller.restore(active)).toThrow(/completion latch|terminal/i);
    expect(controller.snapshot().phase).toBe("victory");
  });

  it("restores responsive state without changing content progress", () => {
    const controller = createMagicDefenseController(VOCABULARY, vi.fn());
    finishCurrentTarget(controller);
    typeText(controller, "es");
    const captured = controller.capture();
    controller.submitAnswer("wrong");
    controller.restore(captured);

    expect(controller.snapshot()).toEqual(captured);
    expect(controller.snapshot().targetIndex).toBe(1);
    expect(controller.snapshot().typingBuffer).toBe("es");
  });

  it("routes scene keyboard and one pointer release, then cleans every scene resource", () => {
    const harness = createSceneHarness();
    const cartridge = createMagicDefenseCartridge();
    const complete = vi.fn();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: { id: "primary-chibi", title: "Primary Chibi", inputMode: "vocabulary" },
      complete,
      diagnostic: vi.fn(),
      inputController: harness.inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width: 390, height: 844 },
    } as never);
    const scene = config.scene as {
      create: () => void;
      update: (_time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => unknown };
    };
    scene.create.call(harness.scene);

    harness.setInput({ keys: [], pressed: [] });
    scene.update.call(harness.scene, 0, MAGIC_DEFENSE_MISSILE_SPAWN_INTERVAL_MS);
    expect((scene.extend.apkCaptureResponsiveState() as { activeMissiles: readonly unknown[] }).activeMissiles.length).toBeGreaterThan(1);

    for (const code of ["KeyP", "KeyR", "KeyO", "KeyT", "KeyE", "KeyG", "KeyE", "KeyR", "Enter"]) {
      harness.setInput({ keys: [], pressed: [code] });
      scene.update.call(harness.scene, 0, 0);
    }
    expect(complete).not.toHaveBeenCalled();
    expect((scene.extend.apkCaptureResponsiveState() as { targetIndex: number }).targetIndex).toBe(1);

    const currentState = scene.extend.apkCaptureResponsiveState() as { answerChoices: readonly string[]; answer: string };
    const current = currentState.answerChoices.indexOf(currentState.answer);
    harness.setInput({
      keys: [],
      pressed: [],
      pointer: { released: true, x: (current + 0.5) * (960 / 3), y: 470 },
    });
    const inputSnapshotCallsBeforePointer = harness.inputSnapshotCalls();
    scene.update.call(harness.scene, 0, 0);
    expect(harness.inputSnapshotCalls() - inputSnapshotCallsBeforePointer).toBe(1);
    expect((scene.extend.apkCaptureResponsiveState() as { targetIndex: number }).targetIndex).toBe(2);
    expect(harness.graphics.clear).toHaveBeenCalled();

    harness.shutdown();
    expect(harness.graphics.destroy).toHaveBeenCalledTimes(2);
    expect(harness.texts.every((text) => text.destroyed)).toBe(true);
    expect((scene.extend.apkCaptureResponsiveState() as { destroyed: boolean }).destroyed).toBe(true);
  });

  it("uses the wide scene, keyboard storm controls, and the pointer storm action", () => {
    const vocabulary = Array.from({ length: 11 }, (_item, index) => ({ term: `word-${index}`, translation: `answer-${index}` }));
    const harness = createSceneHarness();
    const complete = vi.fn();
    const cartridge = createMagicDefenseCartridge();
    const config = cartridge.createGameConfig({
      input: vocabulary,
      edition: { id: "wide", title: "Wide", inputMode: "vocabulary" },
      complete,
      diagnostic: vi.fn(),
      inputController: harness.inputController,
      sessionMode: "playing",
      composition: { profile: "wide", width: 960, height: 540 },
    } as never);
    const step = cartridge.standardExperience.definition.tutorial.steps[1];
    if (!step) throw new Error("Magic Defense tutorial step is missing");
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    for (let index = 0; index < 10; index += 1) {
      driver.execute({
        tutorial: cartridge.standardExperience.definition.tutorial,
        step,
        seed: cartridge.standardExperience.definition.tutorial.seed,
        mode: "tutorial",
        diagnostics: { report: vi.fn() },
      });
    }

    const scene = config.scene as {
      create: () => void;
      update: (_time: number, _delta: number) => void;
      extend: { apkCaptureResponsiveState: () => MagicDefenseSnapshot; apkRecompose: (value: unknown) => void };
    };
    scene.create.call(harness.scene);
    scene.extend.apkRecompose({ profile: "wide" });
    harness.setInput({ pressed: [], pointer: { released: true, x: 800, y: 40 } });
    scene.update.call(harness.scene, 0, 0);
    expect(scene.extend.apkCaptureResponsiveState().mana).toBe(0);
    harness.setInput({ pressed: ["Space"] });
    scene.update.call(harness.scene, 0, 0);
    expect(scene.extend.apkCaptureResponsiveState().typingBuffer).toBe(" ");
    harness.setInput({ pressed: ["Backspace"] });
    scene.update.call(harness.scene, 0, 0);
    harness.setInput({ pressed: ["Space"] });
    scene.update.call(harness.scene, 0, 0);
    expect(scene.extend.apkCaptureResponsiveState().mana).toBe(0);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ mana: 0, activeMissiles: [] });
    expect(complete).not.toHaveBeenCalled();
  });

  it("types a Thai translation from event.key characters and matches the target", () => {
    const thaiVocabulary = [
      { term: "bridge", translation: "สะพาน" },
      { term: "forest", translation: "ป่า" },
    ];
    const harness = createSceneHarness();
    const cartridge = createMagicDefenseCartridge();
    const config = cartridge.createGameConfig({
      input: thaiVocabulary,
      edition: { id: "primary-chibi", title: "Primary Chibi", inputMode: "vocabulary" },
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: harness.inputController,
      sessionMode: "playing",
      composition: { profile: "compact", width: 390, height: 844 },
    } as never);
    const scene = config.scene as {
      create: () => void;
      update: (_time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => MagicDefenseSnapshot };
    };
    scene.create.call(harness.scene);

    const typePressed = (codes: readonly string[]): void => {
      for (const code of codes) {
        harness.setInput({ keys: [], pressed: [code] });
        scene.update.call(harness.scene, 0, 0);
      }
    };

    typePressed(["KeyS", "KeyA"]);
    expect(scene.extend.apkCaptureResponsiveState().typingBuffer).toBe("sa");
    typePressed(["Backspace", "Backspace"]);

    const thaiAnswer = Array.from(thaiVocabulary[0]!.translation);
    typePressed(thaiAnswer);
    expect(scene.extend.apkCaptureResponsiveState().typingBuffer).toBe("สะพาน");

    typePressed(["Enter"]);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      targetIndex: 1,
      lastOutcome: "correct",
      phase: "playing",
    });
  });

  it("gives at least three seconds per item so a 30-item perfect-pace run can win", () => {
    const items = Array.from({ length: 30 }, (_item, index) => ({
      term: `term-${index}`,
      translation: `แปล-${index}`,
    }));
    const deliver = vi.fn();
    const controller = createMagicDefenseController(items, deliver);

    expect(controller.snapshot().timeRemaining).toBe(90);

    while (controller.snapshot().phase === "playing") {
      const timed = controller.advanceTime(2);
      expect(timed.snapshot.phase).toBe("playing");
      expect(timed.reason).not.toBe("timer");
      finishCurrentTarget(controller);
    }

    expect(controller.snapshot().phase).toBe("victory");
    expect(controller.snapshot().correctAnswers).toBe(30);
    expect(controller.snapshot().timeRemaining).toBe(30);
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "victory");
  });

  it("scales the hosted cartridge timer with the vocabulary count", () => {
    const items = Array.from({ length: 50 }, (_item, index) => ({
      term: `term-${index}`,
      translation: `answer-${index}`,
    }));
    const harness = createSceneHarness();
    const cartridge = createMagicDefenseCartridge();
    const config = cartridge.createGameConfig({
      input: items,
      edition: { id: "wide", title: "Wide", inputMode: "vocabulary" },
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: harness.inputController,
      sessionMode: "playing",
      composition: { profile: "wide", width: 960, height: 540 },
    } as never);
    const scene = config.scene as {
      create: () => void;
      extend: { apkCaptureResponsiveState: () => MagicDefenseSnapshot };
    };
    scene.create.call(harness.scene);

    expect(scene.extend.apkCaptureResponsiveState().timeRemaining).toBe(150);
  });

  it("keeps the 60-second floor for small decks and still defeats on the scaled timer", () => {
    expect(createMagicDefenseController(VOCABULARY, vi.fn()).snapshot().timeRemaining).toBe(60);

    const items = Array.from({ length: 30 }, (_item, index) => ({
      term: `term-${index}`,
      translation: `answer-${index}`,
    }));
    const deliver = vi.fn();
    const controller = createMagicDefenseController(items, deliver);
    const terminal = controller.advanceTime(controller.snapshot().timeRemaining);

    expect(terminal).toMatchObject({ accepted: true, terminal: true, reason: "timer" });
    expect(terminal.snapshot).toMatchObject({ phase: "defeat", timeRemaining: 0, defeatReason: "timer" });
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "defeat");
  });

  it("grows enemies from the horizon to the tower line", () => {
    const far = magicDefenseApproachPose(0, "center", 960, 540);
    const mid = magicDefenseApproachPose(0.5, "left", 960, 540);
    const near = magicDefenseApproachPose(1, "left", 960, 540);
    expect(far.y).toBe(540 * MAGIC_DEFENSE_HORIZON_Y_RATIO);
    expect(near.y).toBe(540 * MAGIC_DEFENSE_TOWER_Y_RATIO);
    expect(MAGIC_DEFENSE_TOWER_Y_RATIO).toBe(1);
    expect(MAGIC_DEFENSE_CHOICE_Y_RATIO).toBeLessThan(MAGIC_DEFENSE_TOWER_Y_RATIO);
    expect(far.size).toBeLessThan(mid.size);
    expect(mid.size).toBeLessThan(near.size);
    expect(near.size).toBe(MAGIC_DEFENSE_ENEMY_NEAR_SIZE);
    expect(Math.abs(far.x - 480)).toBeLessThan(1);
    expect(near.x).toBeLessThan(far.x);
  });

  it("owns a 2.5D grass field and scales catalog spirits toward the towers", () => {
    const harness = createSceneHarness();
    const cartridge = createMagicDefenseCartridge();
    const edition = createCatalogStandardEdition(
      ["legacy-catalog/magic-defense/arcane-castle"],
      "/assets/apk/standard-pack-qc/",
      "magic-defense",
    );
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: harness.inputController,
      sessionMode: "playing",
      composition: { profile: "wide", width: 960, height: 540 },
    } as never);
    const scene = config.scene as {
      preload: () => void;
      create: () => void;
      update: (_time: number, delta: number) => void;
    };
    scene.preload.call(harness.scene);
    scene.create.call(harness.scene);
    scene.update.call(harness.scene, 0, 2000);
    expect(harness.scene.add.tileSprite).toHaveBeenCalled();
    expect(harness.images.length).toBeGreaterThan(8);
    const sizes = harness.images
      .map((image) => image.setDisplaySize.mock.calls[0] as unknown as [number, number] | undefined)
      .filter((call): call is [number, number] => call !== undefined && Math.abs(call[0] - call[1]) < 1)
      .map((call) => call[0]);
    expect(Math.max(...sizes)).toBeGreaterThan(Math.min(...sizes));
  });
});
