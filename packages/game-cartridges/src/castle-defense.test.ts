import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gameResultsSchema } from "@reading-advantage/game-contracts";
import type {
  APKInputController,
  APKInputSnapshot,
  APKPointerState,
} from "@reading-advantage/advantage-play-kit";
import { describe, expect, it, vi } from "vitest";

import {
  createCastleDefenseCartridge,
  createCastleDefenseController,
  type CastleDefenseController,
  type CastleDefenseSnapshot,
} from "./castle-defense.js";
import { createCatalogStandardEdition } from "./catalog-standard-art.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const SENTENCES = [
  { term: "Build strong walls", translation: "Construye muros fuertes" },
  { term: "Guard every gate", translation: "Protege cada puerta" },
];

const PUBLIC_SENTENCES = [
  { term: "The dragon crosses the bridge", translation: "มังกรข้ามสะพาน" },
  { term: "A lantern glows in the forest", translation: "โคมไฟส่องแสงในป่า" },
];

const SEVEN_SENTENCES = [
  { term: "Guard the north wall", translation: "Guarda el muro norte" },
  { term: "Guard the south wall", translation: "Guarda el muro sur" },
  { term: "Guard the east wall", translation: "Guarda el muro este" },
  { term: "Guard the west wall", translation: "Guarda el muro oeste" },
  { term: "Guard the inner wall", translation: "Guarda el muro interno" },
  { term: "Guard the outer wall", translation: "Guarda el muro externo" },
  { term: "Guard the last wall", translation: "Guarda el muro final" },
];

function collectSentence(controller: CastleDefenseController): void {
  while (!controller.snapshot().sentenceComplete) {
    const state = controller.snapshot();
    const word = state.words.find((candidate) => candidate.wordIndex === state.nextWordIndex);
    if (!word) throw new Error("Castle Defense did not expose the next prisoner word");
    controller.collectWord(word.wordIndex);
  }
}

function confirmTower(controller: CastleDefenseController): void {
  for (let step = 0; step < 40; step += 1) {
    const state = controller.snapshot();
    if (state.phase !== "collecting" || !state.sentenceComplete) {
      throw new Error("Castle Defense is not ready to build a tower");
    }
    const result = controller.dispatch(state.correctAction);
    if (result.event === "tower-built") return;
    if (!result.accepted) throw new Error("Castle Defense could not build a tower");
  }
  throw new Error("Castle Defense could not reach a free tower slot");
}

function completeVictory(controller: CastleDefenseController): void {
  for (let tick = 0; tick < 2_000 && controller.snapshot().phase !== "victory"; tick += 1) {
    const state = controller.snapshot();
    if (state.phase === "collecting") {
      if (!state.sentenceComplete) collectSentence(controller);
      confirmTower(controller);
    } else {
      controller.advance(100);
    }
  }
  if (controller.snapshot().phase !== "victory") throw new Error("Castle Defense did not reach victory");
}

function createMutableInputController(): APKInputController & {
  setKeys(keys: readonly string[], pressed?: readonly string[]): void;
  setPointer(pointer: Partial<APKPointerState>): void;
  setSnapshot(snapshot: APKInputSnapshot): void;
} {
  const emptyPointer: APKPointerState = {
    down: false,
    released: false,
    cancelled: false,
    id: null,
    kind: null,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0,
  };
  let current: APKInputSnapshot = { keys: [], pressed: [], pointer: emptyPointer, destroyed: false };
  let destroyed = false;
  return {
    snapshot: () => {
      const snapshot = { ...current, pointer: { ...current.pointer }, destroyed };
      current = { ...current, pressed: [], pointer: { ...current.pointer, released: false } };
      return snapshot;
    },
    setKeys: (keys, pressed = keys) => {
      current = { ...current, keys: [...keys], pressed: [...pressed] };
    },
    setPointer: (pointer) => {
      current = { ...current, pointer: { ...current.pointer, ...pointer } };
    },
    setSnapshot: (snapshot) => {
      current = snapshot;
    },
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(() => {
      destroyed = true;
    }),
  };
}

interface FakeGraphics {
  clear(): FakeGraphics;
  fillStyle(color: number, alpha?: number): FakeGraphics;
  fillRect(x: number, y: number, width: number, height: number): FakeGraphics;
  fillCircle(x: number, y: number, radius: number): FakeGraphics;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius?: number): FakeGraphics;
  lineStyle(width: number, color: number, alpha?: number): FakeGraphics;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius?: number): FakeGraphics;
  destroy(): void;
}

interface FakeText {
  value: string;
  style: Readonly<Record<string, unknown>> | undefined;
  setPosition(x: number, y: number): FakeText;
  setText(value: string): FakeText;
  destroy(): void;
}

interface FakeImage {
  setOrigin: ReturnType<typeof vi.fn>;
  setDisplaySize: ReturnType<typeof vi.fn>;
  setDepth: ReturnType<typeof vi.fn>;
  setPosition: ReturnType<typeof vi.fn>;
  setVisible: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

interface FakeScene {
  add: {
    graphics(): FakeGraphics;
    text(x: number, y: number, value: string, style?: Readonly<Record<string, unknown>>): FakeText;
    image?: (x: number, y: number, key: string, frame?: number) => FakeImage;
    sprite?: (x: number, y: number, key: string, frame?: number) => FakeImage;
    tileSprite?: (x: number, y: number, width: number, height: number, key: string) => FakeImage;
  };
  load?: {
    image?: (key: string, url: string) => unknown;
    spritesheet?: (key: string, url: string, config?: { frameWidth: number; frameHeight: number }) => unknown;
  };
  events: { once(event: string, listener: () => void): void };
  game: { canvas: { getBoundingClientRect(): { left: number; top?: number; width: number; height?: number } } };
  scale: { width: number; height: number };
  emit(event: string): void;
}

function createFakeScene(
  rect: { left: number; top?: number; width: number; height?: number } = { left: 0, width: 960 },
): { scene: FakeScene; graphics: FakeGraphics; texts: FakeText[] } {
  const graphics: FakeGraphics = {
    clear: vi.fn(() => graphics),
    fillStyle: vi.fn(() => graphics),
    fillRect: vi.fn(() => graphics),
    fillCircle: vi.fn(() => graphics),
    fillRoundedRect: vi.fn(() => graphics),
    lineStyle: vi.fn(() => graphics),
    strokeRoundedRect: vi.fn(() => graphics),
    destroy: vi.fn(),
  };
  const texts: FakeText[] = [];
  const listeners = new Map<string, () => void>();
  const scene: FakeScene = {
    add: {
      graphics: () => graphics,
      text: (_x, _y, value, style) => {
        const text: FakeText = {
          value,
          style,
          setPosition: vi.fn(() => text),
          setText: vi.fn((next: string) => {
            text.value = next;
            return text;
          }),
          destroy: vi.fn(),
        };
        texts.push(text);
        return text;
      },
    },
    events: { once: (event, listener) => listeners.set(event, listener) },
    game: { canvas: { getBoundingClientRect: () => rect } },
    scale: { width: 960, height: 540 },
    emit: (event) => listeners.get(event)?.(),
  };
  return { scene, graphics, texts };
}

function createPlayingConfig(sessionMode: "playing" | "tutorial" = "playing") {
  const inputController = createMutableInputController();
  const complete = vi.fn();
  const diagnostic = vi.fn();
  const config = createCastleDefenseCartridge().createGameConfig({
    input: SENTENCES,
    edition: PHASE3_RUNTIME_EDITION,
    complete,
    diagnostic,
    inputController,
    seed: 17,
    sessionMode,
    composition: { profile: "compact", safeRect: { width: 390 } } as never,
  });
  return { config, inputController, complete, diagnostic };
}

describe("Castle Defense bespoke APK cartridge", () => {
  it("keeps the manifest identity and uses the standard guided experience", () => {
    const cartridge = createCastleDefenseCartridge();

    expect(cartridge.manifest).toMatchObject({
      id: "castle-defense",
      title: "Castle Defense",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
      requiredAssetBindings: ["legacy-catalog/castle-defense/fortress"],
    });
    expect(cartridge.standardExperience.definition).toMatchObject({
      briefing: { startPhase: "tutorial", learningPreview: { heading: "Sentences to practice" } },
      tutorial: {
        lifecycle: {
          complete: { to: "playing" },
          productionEffects: { emitGameResults: false, persistProgress: false, awardAuthoritativeXp: false },
        },
      },
      debrief: { outcome: "complete", requiredCredit: "Pixel art assets by ElvGames" },
    });
  });

  it("rejects empty or non-canonical sentence content", () => {
    expect(() => createCastleDefenseController([], vi.fn())).toThrow(/empty/i);
    expect(() => createCastleDefenseController([{ ...SENTENCES[0], legacyId: "legacy" }], vi.fn())).toThrow();
    expect(() => createCastleDefenseController(SENTENCES, vi.fn(), Number.NaN)).toThrow(/finite/i);
  });

  it("rejects invalid actions and responsive state before mutating the active session", () => {
    const controller = createCastleDefenseController(SENTENCES, vi.fn(), 17);
    const captured = controller.capture();

    expect(controller.dispatch("unknown" as never)).toMatchObject({ accepted: false, event: "ignored" });
    expect(controller.collectWord("missing-word")).toMatchObject({ accepted: false, event: "ignored" });
    expect(controller.collectWord(0)).toMatchObject({ accepted: true, correct: true });
    expect(controller.collectWord(0)).toMatchObject({ accepted: false, event: "ignored" });
    expect(() => controller.advance(Number.NaN)).toThrow(/nonnegative and finite/i);
    expect(() => controller.advance(-1)).toThrow(/nonnegative and finite/i);

    const invalid = [
      [null, /object/i],
      [{ ...captured, seed: 18 }, /identity/i],
      [{ ...captured, phase: "paused" }, /phase/i],
      [{ ...captured, currentSentenceIndex: 1 }, /sentence/i],
      [{ ...captured, targetCount: 1 }, /target count/i],
      [{ ...captured, score: 1 }, /resources/i],
      [{ ...captured, nextWordIndex: 9 }, /word progress/i],
      [{ ...captured, targetIndex: 2 }, /target index/i],
      [{ ...captured, correctAction: "wrong" }, /common actions/i],
      [{ ...captured, enemiesSpawned: 0 }, /enemy wave/i],
      [{ ...captured, result: {} }, /active state/i],
    ] as const;
    for (const [state, pattern] of invalid) expect(() => controller.restore(state as never)).toThrow(pattern);
    expect(controller.snapshot().nextWordIndex).toBe(1);
  });

  it("moves in four directions and exposes deterministic prisoner words and enemies", () => {
    const first = createCastleDefenseController(SENTENCES, vi.fn(), 17).snapshot();
    const second = createCastleDefenseController(SENTENCES, vi.fn(), 17).snapshot();
    const controller = createCastleDefenseController(SENTENCES, vi.fn(), 17);
    const initial = controller.snapshot();

    expect(first).toEqual(second);
    expect(initial).toMatchObject({
      phase: "collecting",
      waveIndex: 0,
      waveCount: SENTENCES.length,
      currentSentenceIndex: 0,
      targetIndex: 0,
      targetCount: 6,
      nextWordIndex: 0,
      sentenceComplete: false,
      inventory: [],
      base: { hp: 100, maxHp: 100 },
      lives: 100,
      energy: 0,
      enemies: [{ type: "soldier", hp: 100 }],
      correctAnswers: 0,
      totalAttempts: 0,
      score: 0,
    });
    expect(initial.words).toHaveLength(3);
    expect(initial.words[0]).toMatchObject({ role: "prisoner", wordIndex: 0, collected: false });
    expect(initial.availableActions).toEqual([
      "move-left",
      "move-right",
      "move-up",
      "move-down",
      "confirm",
    ]);
    expect(initial.correctAction).toMatch(/move-|confirm/u);
    expect(initial.result).toBeUndefined();

    const before = initial.player;
    controller.dispatch("move-left");
    controller.dispatch("move-up");
    controller.dispatch("move-right");
    controller.dispatch("move-down");
    const after = controller.snapshot().player;
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
  });

  it("freezes enemy simulation while collecting", () => {
    const controller = createCastleDefenseController(SENTENCES, vi.fn(), 17);
    const initial = controller.snapshot();

    const paused = controller.advance(30_000);

    expect(paused).toMatchObject({
      phase: "collecting",
      base: { hp: 100 },
      enemiesSpawned: initial.enemiesSpawned,
      elapsedMs: 0,
      spawnTimer: 0,
    });
    expect(paused.enemies).toEqual(initial.enemies);
  });

  it("collects sentence words in order and resets only the current chain on a wrong word", () => {
    const controller = createCastleDefenseController(SENTENCES, vi.fn(), 17);
    const first = controller.collectWord(0);
    const wrong = controller.collectWord(2);

    expect(first).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(wrong).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(wrong.snapshot).toMatchObject({
      waveIndex: 0,
      targetIndex: 0,
      nextWordIndex: 0,
      inventory: [],
      sentenceComplete: false,
      correctAnswers: 1,
      totalAttempts: 2,
      score: 100,
      base: { hp: 100 },
      towers: [],
    });
    expect(wrong.snapshot.words.every((word) => !word.collected)).toBe(true);

    collectSentence(controller);
    expect(controller.snapshot()).toMatchObject({
      targetIndex: 3,
      targetCount: 6,
      nextWordIndex: 3,
      sentenceComplete: true,
      inventory: ["Build", "strong", "walls"],
      correctAnswers: 4,
      totalAttempts: 5,
      score: 400,
    });
  });

  it("builds a tower only after ordered collection and confirm near a slot", () => {
    const controller = createCastleDefenseController(SENTENCES, vi.fn(), 17);
    collectSentence(controller);

    const built = controller.dispatch("confirm");
    expect(built).toMatchObject({ accepted: true, event: "tower-built", terminal: false });
    expect(built.snapshot).toMatchObject({ phase: "defending", inventory: [], towers: [{ slotId: "slot-0" }] });
    expect(built.snapshot.towers[0]?.materials).toEqual(["Build", "strong", "walls"]);

    const duplicate = controller.dispatch("confirm");
    expect(duplicate.accepted).toBe(false);
    expect(controller.snapshot().towers).toHaveLength(1);
  });

  it("lets towers damage enemies and preserves defeat for an under-defended wave", () => {
    const towerController = createCastleDefenseController(SENTENCES, vi.fn(), 17);
    collectSentence(towerController);
    towerController.dispatch("confirm");
    const beforeAttack = towerController.snapshot().enemies[0]?.hp;
    towerController.advance(300);
    expect(towerController.snapshot().enemies[0]?.hp).toBeLessThan(beforeAttack ?? 101);

    const defeatDelivery = vi.fn();
    const defeatController = createCastleDefenseController(SENTENCES, defeatDelivery, 17);
    collectSentence(defeatController);
    const built = defeatController.dispatch("confirm");
    expect(built.snapshot.towers).toHaveLength(1);
    defeatController.advance(30_000);
    expect(defeatController.snapshot()).toMatchObject({ phase: "defeat", base: { hp: 0 } });
    expect(defeatDelivery).toHaveBeenCalledOnce();
    expect(defeatDelivery).toHaveBeenCalledWith(expect.any(Object), "defeat");
    expect(gameResultsSchema.parse(defeatDelivery.mock.calls[0]?.[0])).toEqual({
      accuracy: 1,
      xp: 70,
      score: 300,
      correctAnswers: 3,
      totalAttempts: 3,
    });
  });

  it("wins after every configured sentence wave and emits one strict result", () => {
    const deliver = vi.fn();
    const controller = createCastleDefenseController(SENTENCES, deliver, 17);

    completeVictory(controller);

    const state = controller.snapshot();
    const result = gameResultsSchema.parse(deliver.mock.calls[0]?.[0]);
    expect(state).toMatchObject({ phase: "victory", waveIndex: SENTENCES.length, waveCount: SENTENCES.length });
    expect(result).toEqual({ accuracy: 1, xp: 130, score: 600, correctAnswers: 6, totalAttempts: 6 });
    expect(state.result).toEqual(result);
    expect(deliver).toHaveBeenCalledOnce();
    expect(controller.advance(1000)).toEqual(state);
  });

  it("lets a seventh sentence wave build a tower and finish instead of deadlocking on six slots", () => {
    const deliver = vi.fn();
    const controller = createCastleDefenseController(SEVEN_SENTENCES, deliver, 17);

    for (let wave = 0; wave < 6; wave += 1) {
      collectSentence(controller);
      confirmTower(controller);
      for (let tick = 0; tick < 2_000 && controller.snapshot().phase === "defending"; tick += 1) {
        controller.advance(100);
      }
    }

    const seventh = controller.snapshot();
    expect(seventh).toMatchObject({
      phase: "collecting",
      waveIndex: 6,
      waveCount: 7,
      sentenceComplete: false,
    });
    expect(seventh.towerSlots.some((slot) => !slot.occupied)).toBe(true);

    collectSentence(controller);
    confirmTower(controller);
    expect(controller.snapshot().phase).toBe("defending");

    for (let tick = 0; tick < 2_000 && controller.snapshot().phase === "defending"; tick += 1) {
      controller.advance(100);
    }

    expect(controller.snapshot().phase).toBe("victory");
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "victory");
  });

  it("completes the public seed-29 fixture by choosing the correct action", () => {
    const deliver = vi.fn();
    const controller = createCastleDefenseController(PUBLIC_SENTENCES, deliver, 29);

    for (let step = 0; step < 2_000 && controller.snapshot().phase !== "victory"; step += 1) {
      const state = controller.snapshot();
      if (state.phase === "collecting") {
        const action = controller.choose(state.correctAction);
        expect(action.accepted).toBe(true);
        continue;
      }
      if (state.phase === "defending") {
        controller.advance(20);
        continue;
      }
      throw new Error(`Castle Defense ended before victory: ${state.phase}`);
    }

    expect(controller.snapshot()).toMatchObject({
      phase: "victory",
      targetCount: 11,
      targetIndex: 11,
      correctAnswers: 11,
      totalAttempts: 11,
    });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("captures, restores, recomposes, and accepts real keyboard and pointer input in the scene", () => {
    const { config, inputController, complete, diagnostic } = createPlayingConfig();
    const scene = config.scene as unknown as {
      key: string;
      create(this: FakeScene): void;
      update(this: FakeScene, time?: number, delta?: number): void;
      extend: {
        apkCaptureResponsiveState(): CastleDefenseSnapshot;
        apkRestoreResponsiveState(state: unknown): void;
        apkRecompose(composition: unknown): void;
      };
    };
    const fake = createFakeScene();
    scene.create.call(fake.scene);
    expect(scene.key).toBe("castle-defense");
    expect(fake.texts[1]?.style?.wordWrap).toEqual({ width: 342 });

    inputController.setKeys(["ArrowLeft"], ["ArrowLeft"]);
    scene.update.call(fake.scene, 0, 16);
    const moved = scene.extend.apkCaptureResponsiveState();
    expect(moved.player.x).toBeLessThan(480);

    const firstWord = moved.words[0]!;
    inputController.setKeys([], []);
    inputController.setPointer({
      released: true,
      startX: firstWord.x,
      startY: firstWord.y,
      x: firstWord.x,
      y: firstWord.y,
      kind: "touch",
    });
    scene.update.call(fake.scene, 16, 16);
    const collected = scene.extend.apkCaptureResponsiveState();
    expect(collected.totalAttempts).toBe(0);
    expect(collected.correctAnswers).toBe(0);
    expect(collected.player).not.toEqual(moved.player);
    expect(fake.texts.some((text) => text.value === "Build")).toBe(true);

    scene.extend.apkRecompose({ profile: "compact" });
    scene.extend.apkRestoreResponsiveState(moved);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(moved);
    expect(complete).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "CASTLE_DEFENSE_READY" }));
  });

  it("ignores live movement input during the guided tutorial", () => {
    const { config, inputController, complete } = createPlayingConfig("tutorial");
    const scene = config.scene as unknown as {
      create(this: FakeScene): void;
      update(this: FakeScene, time?: number, delta?: number): void;
      extend: { apkCaptureResponsiveState(): CastleDefenseSnapshot };
    };
    const fake = createFakeScene();
    scene.create.call(fake.scene);
    const before = scene.extend.apkCaptureResponsiveState();

    inputController.setKeys(["ArrowLeft"], ["ArrowLeft"]);
    scene.update.call(fake.scene, 0, 16);

    const after = scene.extend.apkCaptureResponsiveState();
    expect(after.player).toEqual(before.player);
    expect(after.elapsedMs).toBe(before.elapsedMs);
    expect(complete).not.toHaveBeenCalled();
  });

  it("uses a seeded multi-segment route for enemy traversal", () => {
    const first = createCastleDefenseController(SENTENCES, vi.fn(), 17);
    const sameSeed = createCastleDefenseController(SENTENCES, vi.fn(), 17);
    const otherSeed = createCastleDefenseController(SENTENCES, vi.fn(), 18);
    const initial = first.snapshot().enemies[0];
    const sameInitial = sameSeed.snapshot().enemies[0];
    const otherInitial = otherSeed.snapshot().enemies[0];

    expect(initial?.route.length).toBeGreaterThan(2);
    expect(initial?.route[0]).toEqual({ x: 80, y: 270 });
    expect(initial?.route.at(-1)).toEqual({ x: 880, y: 270 });
    expect(initial?.route).toEqual(sameInitial?.route);
    expect(initial?.route).not.toEqual(otherInitial?.route);

    collectSentence(first);
    first.dispatch("confirm");
    first.advance(2_000);
    const traversed = first.snapshot().enemies[0];
    expect(traversed?.routeSegment).toBeGreaterThan(0);
    expect(traversed?.routeDistance).toBeGreaterThan(0);
    expect(traversed?.y).not.toBe(initial?.y);
  });

  it("enforces the common controller actions and seals terminal restore", () => {
    const deliver = vi.fn();
    const controller = createCastleDefenseController(SENTENCES, deliver, 17);
    const moved = controller.choose("move-left");

    expect(moved).toMatchObject({
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      completed: false,
    });
    expect(moved).toHaveProperty("snapshot");
    expect(moved.snapshot).toMatchObject({
      phase: "collecting",
      targetIndex: 0,
      targetCount: 6,
      prompt: "Construye muros fuertes",
      answer: "Build",
      correctAction: expect.any(String),
      availableActions: expect.any(Array),
      lives: 100,
      energy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      lastOutcome: undefined,
      result: undefined,
      destroyed: false,
    });

    controller.applyHazard();
    const defeat = controller.applyHazard();
    expect(defeat).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: true, completed: true });
    expect(defeat.result).toEqual(defeat.snapshot.result);
    expect(() => controller.restore(defeat.snapshot)).toThrow(/terminal/i);
    expect(controller.snapshot().phase).toBe("defeat");
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("keeps tutorial and demo controller actions outside result delivery", () => {
    for (const sessionMode of ["tutorial", "demo"] as const) {
      const complete = vi.fn();
      const cartridge = createCastleDefenseCartridge();
      const inputController = createMutableInputController();
      cartridge.createGameConfig({
        input: SENTENCES,
        edition: PHASE3_RUNTIME_EDITION,
        complete,
        diagnostic: vi.fn(),
        inputController,
        seed: 17,
        sessionMode,
        composition: { profile: "compact", safeRect: { width: 390 } } as never,
      });
      const definition = cartridge.standardExperience.definition;
      const step = definition.tutorial.steps[1];
      if (!step) throw new Error("Castle Defense tutorial step is missing");
      const driver = cartridge.standardExperience.createTutorialActionDriver();
      for (const actionId of ["action:select-correct", "action:select-incorrect"]) {
        driver.execute({
          tutorial: definition.tutorial,
          step: { ...step, actionId },
          seed: definition.tutorial.seed,
          mode: "tutorial",
          diagnostics: { report: vi.fn() },
        });
      }
      expect(complete).not.toHaveBeenCalled();
    }
  });

  it("cleans every scene resource once and rejects a metadata-only wrapper", () => {
    const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "castle-defense.ts"), "utf8");
    expect(source).not.toMatch(/createLegacyCatalog(?:Controller|Cartridge)/u);
    expect(source).toMatch(/function createScene/u);
    expect(source).toMatch(/tower/u);
    expect(source).toMatch(/enemies/u);

    const { config } = createPlayingConfig();
    const scene = config.scene as unknown as { create(this: FakeScene): void };
    const fake = createFakeScene();
    scene.create.call(fake.scene);
    fake.scene.emit("shutdown");
    fake.scene.emit("shutdown");
    fake.scene.emit("destroy");

    expect(fake.graphics.destroy).toHaveBeenCalledOnce();
    for (const text of fake.texts) expect(text.destroy).toHaveBeenCalledOnce();
  });

  it("maps pointer coordinates with the canvas top offset", () => {
    const { config, inputController } = createPlayingConfig();
    const scene = config.scene as {
      create(this: FakeScene): void;
      update(this: FakeScene, time?: number, delta?: number): void;
      extend: { apkCaptureResponsiveState(): CastleDefenseSnapshot };
    };
    const fake = createFakeScene({ left: 10, top: 40, width: 480, height: 270 });
    scene.create.call(fake.scene);

    inputController.setPointer({
      released: true,
      startX: 250,
      startY: 240,
      x: 250,
      y: 240,
      kind: "touch",
    });
    scene.update.call(fake.scene, 0, 0);

    expect(scene.extend.apkCaptureResponsiveState().player.y).toBe(376);
  });

  it("seals controller cleanup without emitting a result", () => {
    const deliver = vi.fn();
    const controller = createCastleDefenseController(SENTENCES, deliver, 17);

    controller.destroy();
    controller.destroy();

    expect(controller.snapshot().destroyed).toBe(true);
    expect(controller.collectWord(0)).toMatchObject({ accepted: false, terminal: false });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("covers wide scene input, defending restore, and the non-playing pointer path", () => {
    const inputController = createMutableInputController();
    const diagnostic = vi.fn();
    const config = createCastleDefenseCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic,
      inputController,
      composition: { profile: "wide", safeRect: { width: 960 } } as never,
    });
    const scene = config.scene as {
      create(this: FakeScene): void;
      update(this: FakeScene, time?: number, delta?: number): void;
      extend: {
        apkCaptureResponsiveState(): CastleDefenseSnapshot;
        apkRestoreResponsiveState(state: unknown): void;
        apkRecompose(composition: unknown): void;
      };
    };
    const fake = createFakeScene();
    expect(() => scene.create.call({} as FakeScene)).toThrow(/display services/i);
    scene.create.call(fake.scene);
    scene.create.call(fake.scene);
    scene.extend.apkRecompose({ profile: "wide" });

    inputController.setKeys(["KeyQ"], ["KeyQ"]);
    scene.update.call(fake.scene, 0, 16);
    inputController.setPointer({ released: true, startX: 200, startY: 240, x: 280, y: 240, kind: "touch" });
    scene.update.call(fake.scene, 16, 16);
    inputController.setPointer({ released: true, startX: 400, startY: 200, x: 400, y: 200, kind: "touch" });
    scene.update.call(fake.scene, 32, 16);
    expect(scene.extend.apkCaptureResponsiveState().player.x).toBeGreaterThan(480);

    const defending = createCastleDefenseController(SENTENCES, vi.fn(), 0);
    collectSentence(defending);
    const built = defending.dispatch("confirm");
    expect(built.snapshot.phase).toBe("defending");
    scene.extend.apkRestoreResponsiveState(defending.capture());
    scene.update.call(fake.scene, 48, 16);
    inputController.setPointer({ released: true, startX: 400, startY: 200, x: 400, y: 200, kind: "touch" });
    scene.update.call(fake.scene, 64, 16);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ phase: "defending", towers: [{ slotId: "slot-0" }] });
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "CASTLE_DEFENSE_READY" }));
  });

  it("paints grass, a dirt road, keep, gate, and unit sprites from the catalog edition", () => {
    const edition = createCatalogStandardEdition(
      ["legacy-catalog/castle-defense/fortress"],
      "/assets/apk/standard-pack-qc/",
      "castle-defense",
    );
    const inputController = createMutableInputController();
    const config = createCastleDefenseCartridge().createGameConfig({
      input: SENTENCES,
      edition,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      seed: 17,
      sessionMode: "playing",
      composition: { profile: "wide", safeRect: { width: 960 } } as never,
    });
    const scene = config.scene as {
      key: string;
      preload(this: FakeScene): void;
      create(this: FakeScene): void;
      update(this: FakeScene, time?: number, delta?: number): void;
    };

    const imageKeys: string[] = [];
    const spriteKeys: string[] = [];
    const tileKeys: string[] = [];
    const loadedImages: Array<[string, string]> = [];
    const loadedSheets: Array<[string, string]> = [];
    const makeImage = (key: string) => {
      const image = {
        key,
        setOrigin: vi.fn(() => image),
        setDisplaySize: vi.fn(() => image),
        setDepth: vi.fn(() => image),
        setPosition: vi.fn(() => image),
        setVisible: vi.fn(() => image),
        destroy: vi.fn(),
      };
      return image;
    };
    const fake = createFakeScene();
    fake.scene.load = {
      image: vi.fn((key: string, url: string) => {
        loadedImages.push([key, url]);
      }),
      spritesheet: vi.fn((key: string, url: string) => {
        loadedSheets.push([key, url]);
      }),
    };
    fake.scene.add.image = vi.fn((x: number, y: number, key: string) => {
      imageKeys.push(key);
      return makeImage(key);
    });
    fake.scene.add.sprite = vi.fn((x: number, y: number, key: string) => {
      spriteKeys.push(key);
      return makeImage(key);
    });
    fake.scene.add.tileSprite = vi.fn((x: number, y: number, width: number, height: number, key: string) => {
      tileKeys.push(key);
      return makeImage(key);
    });

    scene.preload.call(fake.scene);
    scene.create.call(fake.scene);

    expect(loadedImages.map(([key]) => key)).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:tile-grass",
      "apk:catalog-standard-pack:tile-dirt",
      "apk:catalog-standard-pack:prop-keep",
      "apk:catalog-standard-pack:prop-gate",
      "apk:catalog-standard-pack:prop-tower",
      "apk:catalog-standard-pack:prop-tree",
    ]));
    expect(loadedSheets.map(([key]) => key)).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:player-knight",
      "apk:catalog-standard-pack:enemy-beast",
      "apk:catalog-standard-pack:player-mage",
    ]));
    expect(tileKeys).toContain("apk:catalog-standard-pack:tile-grass");
    expect(imageKeys.concat(spriteKeys)).toEqual(expect.arrayContaining([
      "apk:catalog-standard-pack:tile-dirt",
      "apk:catalog-standard-pack:prop-keep",
      "apk:catalog-standard-pack:prop-gate",
      "apk:catalog-standard-pack:prop-tree",
      "apk:catalog-standard-pack:player-knight",
      "apk:catalog-standard-pack:enemy-beast",
      "apk:catalog-standard-pack:player-mage",
    ]));
    expect(fake.graphics.fillRect).not.toHaveBeenCalledWith(0, 0, 960, 540);
    const circleRadii = vi.mocked(fake.graphics.fillCircle).mock.calls.map((call) => call[2]);
    expect(circleRadii.every((radius) => radius === 36)).toBe(true);
  });
});
