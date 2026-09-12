import { readFileSync } from "node:fs";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ENCHANTED_LIBRARY_CANVAS,
  ENCHANTED_LIBRARY_DURATION_MS,
  ENCHANTED_LIBRARY_ACTIONS,
  ENCHANTED_LIBRARY_KEYBOARD_BINDINGS,
  INITIAL_MANA,
  MANA_GAIN_CORRECT,
  MANA_LOSS_INCORRECT,
  MANA_LOSS_SPIRIT_HIT,
  MAX_SHIELD_CHARGES,
  SHIELD_DURATION_MS,
  SPIRIT_SPAWN_RATE_MS,
  calculateEnchantedLibraryXP,
  calculateEnchantedLibraryShelfPlacements,
  createEnchantedLibraryCartridge,
  createEnchantedLibraryController,
  type EnchantedLibraryDirection,
  type EnchantedLibrarySnapshot,
} from "./enchanted-library.js";

const VOCABULARY = [
  { term: "luminous", translation: "ส่องสว่าง" },
  { term: "ancient", translation: "โบราณ" },
  { term: "swift", translation: "รวดเร็ว" },
  { term: "quiet", translation: "เงียบ" },
] as const;

type InputSnapshot = {
  readonly keys: readonly string[];
  readonly pressed: readonly string[];
  readonly pointer: {
    readonly down: boolean;
    readonly released: boolean;
    readonly cancelled: boolean;
    readonly id: null;
    readonly kind: "mouse" | "touch" | null;
    readonly startX: number;
    readonly startY: number;
    readonly x: number;
    readonly y: number;
  };
  readonly destroyed: boolean;
};

function inputSnapshot(overrides: Partial<InputSnapshot> = {}): InputSnapshot {
  return {
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
    ...overrides,
  };
}

function createInputController() {
  let current = inputSnapshot();
  return {
    snapshot: vi.fn(() => current),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
    setSnapshot(next: InputSnapshot): void {
      current = next;
    },
  };
}

function createSceneHost(canvasWidth = 960, sceneSize = ENCHANTED_LIBRARY_CANVAS) {
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
    readonly setPosition: ReturnType<typeof vi.fn>;
    readonly setText: ReturnType<typeof vi.fn>;
    readonly setFontSize: ReturnType<typeof vi.fn>;
    readonly setOrigin: ReturnType<typeof vi.fn>;
    readonly setWordWrapWidth: ReturnType<typeof vi.fn>;
    readonly destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const createText = () => {
    const text = {
      setPosition: vi.fn(),
      setText: vi.fn(),
      setFontSize: vi.fn(),
      setOrigin: vi.fn(),
      setWordWrapWidth: vi.fn(),
      destroy: vi.fn(),
    };
    text.setPosition.mockReturnValue(text);
    text.setText.mockReturnValue(text);
    text.setFontSize.mockReturnValue(text);
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
        getBoundingClientRect: () => ({ left: 0, top: 0, width: canvasWidth, height: sceneSize.height }),
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

function moveToBook(
  controller: ReturnType<typeof createEnchantedLibraryController>,
  bookId: string,
): ReturnType<typeof controller.move> {
  let result: ReturnType<typeof controller.move> | undefined;
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const state = controller.snapshot();
    const book = state.books.find((candidate) => candidate.id === bookId);
    if (!book) throw new Error(`Book ${bookId} is not visible`);
    const horizontal: EnchantedLibraryDirection = state.player.x < book.x
      ? "move-right"
      : state.player.x > book.x
        ? "move-left"
        : "move-up";
    const vertical: EnchantedLibraryDirection = state.player.y < book.y
      ? "move-down"
      : state.player.y > book.y
        ? "move-up"
        : horizontal;
    if (Math.abs(state.player.x - book.x) > 36) {
      result = controller.move(horizontal);
    } else if (Math.abs(state.player.y - book.y) > 36) {
      result = controller.move(vertical);
    } else {
      result = controller.move(horizontal);
    }
    if (result.event === "book-correct" || result.event === "book-wrong" || result.terminal) return result;
  }
  throw new Error(`Player did not reach book ${bookId}`);
}

function restoreWithSpirit(
  controller: ReturnType<typeof createEnchantedLibraryController>,
  state: EnchantedLibrarySnapshot,
): void {
  controller.restore({
    ...state,
    spirits: [{
      id: "test-spirit",
      x: state.player.x,
      y: state.player.y,
      radius: 15,
      velocityX: 3,
      velocityY: 0,
      speed: 3,
      bounced: false,
      hasHitPlayer: false,
    }],
  });
}

function latestText(text: { readonly setText: { readonly mock: { readonly calls: unknown[][] } } }): string {
  return String(text.setText.mock.calls.at(-1)?.[0] ?? "");
}

function trackBookDrawColors(graphics: ReturnType<typeof createSceneHost>["graphics"]): {
  readonly fills: number[];
  readonly strokes: number[];
  reset(): void;
} {
  const fills: number[] = [];
  const strokes: number[] = [];
  let fillColor = 0;
  let strokeColor = 0;
  const bookWidth = Math.min(172, ENCHANTED_LIBRARY_CANVAS.width * 0.19);
  const bookHeight = Math.min(68, ENCHANTED_LIBRARY_CANVAS.height * 0.14);
  const isBookSize = (width: number, height: number): boolean => (
    Math.abs(width - bookWidth) < 0.5 && Math.abs(height - bookHeight) < 0.5
  );

  graphics.fillStyle.mockImplementation((color: number) => {
    fillColor = color;
    return graphics;
  });
  graphics.lineStyle.mockImplementation((_width: number, color: number) => {
    strokeColor = color;
    return graphics;
  });
  graphics.fillRoundedRect.mockImplementation((_x: number, _y: number, width: number, height: number) => {
    if (isBookSize(width, height)) fills.push(fillColor);
    return graphics;
  });
  graphics.strokeRoundedRect.mockImplementation((_x: number, _y: number, width: number, height: number) => {
    if (isBookSize(width, height)) strokes.push(strokeColor);
    return graphics;
  });

  return {
    fills,
    strokes,
    reset(): void {
      fills.length = 0;
      strokes.length = 0;
    },
  };
}

function mountEnchantedLibraryScene() {
  const input = createInputController();
  const cartridge = createEnchantedLibraryCartridge();
  const config = cartridge.createGameConfig({
    input: VOCABULARY.map((item) => ({ ...item })),
    edition: {
      id: "test-edition",
      title: "Test edition",
      runtimeApiVersion: "1.0.0",
      pack: { id: "test-pack", version: "1.0.0", root: "/test", files: {} },
      bindings: {},
      tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
    },
    complete: vi.fn(),
    diagnostic: vi.fn(),
    inputController: input,
    seed: 19,
  });
  const scene = config.scene as {
    create: (this: unknown) => void;
    update: (this: unknown, time?: number, delta?: number) => void;
    extend: {
      apkCaptureResponsiveState: () => { game: EnchantedLibrarySnapshot };
    };
  };
  const host = createSceneHost();
  const bookColors = trackBookDrawColors(host.graphics);
  scene.create.call(host.host);
  return { scene, host, bookColors, input };
}

describe("Enchanted Library bespoke cartridge", () => {
  it("declares the library manifest, deterministic books, and strict input boundary", () => {
    const cartridge = createEnchantedLibraryCartridge();
    const controller = createEnchantedLibraryController(VOCABULARY, vi.fn());
    const snapshot = controller.snapshot();

    expect(cartridge.manifest).toMatchObject({
      id: "enchanted-library",
      title: "Enchanted Library",
      inputMode: "vocabulary",
      runtimeApiVersion: "1.0.0",
      capabilities: expect.arrayContaining([
        "capability:book-collision-collection",
        "capability:four-way-library-movement",
        "capability:library-shield",
        "capability:spirit-mana-hazard",
        "capability:time-and-frame-loop",
      ]),
    });
    expect(snapshot).toMatchObject({
      phase: "playing",
      status: "playing",
      targetIndex: 0,
      targetCount: VOCABULARY.length,
      targetTerm: VOCABULARY[0].term,
      prompt: VOCABULARY[0].translation,
      answer: VOCABULARY[0].term,
      mana: INITIAL_MANA,
      correctAnswers: 0,
      totalAttempts: 0,
      player: { x: 400, y: 300, shieldCharges: MAX_SHIELD_CHARGES },
      mechanic: "book-collection-and-shield",
      availableActions: ENCHANTED_LIBRARY_ACTIONS,
      lives: INITIAL_MANA,
      energy: INITIAL_MANA,
      score: 0,
      seed: 0,
    });
    expect(snapshot.books).toHaveLength(4);
    expect(snapshot.books.every((book) => book.translation.length > 0)).toBe(true);
    expect(snapshot.books.filter((book) => book.isCorrect)).toHaveLength(1);
    expect(snapshot.books.map((book) => `${book.x}:${book.y}`)).toEqual([
      ...new Set(snapshot.books.map((book) => `${book.x}:${book.y}`)),
    ]);
    expect(() => createEnchantedLibraryController([], vi.fn())).toThrow(/empty/i);
    expect(() => createEnchantedLibraryController([{ ...VOCABULARY[0], extra: true }], vi.fn())).toThrow();
    expect(() => createEnchantedLibraryController([VOCABULARY[0], VOCABULARY[0]], vi.fn())).toThrow(/unique/i);
    expect(() => createEnchantedLibraryController(VOCABULARY, vi.fn(), Number.NaN)).toThrow(/seed/i);
  });

  it("calculates bounded XP for empty, accurate, survival, and capped runs", () => {
    expect(calculateEnchantedLibraryXP({ mana: INITIAL_MANA, gameTime: 0 }, 0, 0)).toBe(0);
    expect(calculateEnchantedLibraryXP({ mana: INITIAL_MANA, gameTime: 0 }, 1, 1)).toBe(5);
    expect(calculateEnchantedLibraryXP({ mana: 1, gameTime: ENCHANTED_LIBRARY_DURATION_MS }, 2, 3)).toBe(2);
    expect(calculateEnchantedLibraryXP({ mana: INITIAL_MANA, gameTime: 0 }, 20, 20)).toBe(10);
  });

  it("describes one collection per vocabulary item", () => {
    const cartridge = createEnchantedLibraryCartridge();

    expect(cartridge.standardExperience.definition.briefing.objective).toBe(
      "Collect the matching English word once for every Thai prompt before the library timer ends.",
    );
    expect(cartridge.standardExperience.definition.briefing.objective).not.toMatch(/twice/i);
  });

  it("uses the four-way movement contract and deterministic book placement", () => {
    const controller = createEnchantedLibraryController(VOCABULARY, vi.fn());
    const start = controller.snapshot().player;

    controller.move("move-left");
    controller.move("move-up");
    const moved = controller.snapshot().player;
    expect(moved.x).toBeLessThan(start.x);
    expect(moved.y).toBeLessThan(start.y);
    expect(ENCHANTED_LIBRARY_KEYBOARD_BINDINGS).toMatchObject({
      KeyW: "move-up",
      KeyA: "move-left",
      KeyS: "move-down",
      KeyD: "move-right",
      Space: "confirm",
    });

    const second = createEnchantedLibraryController(VOCABULARY, vi.fn());
    expect(second.snapshot().books).toEqual(controller.snapshot().books);
  });

  it("exposes the shared controller contract and seeds book and hazard order", () => {
    const first = createEnchantedLibraryController(VOCABULARY, vi.fn(), { seed: 19 });
    const second = createEnchantedLibraryController(VOCABULARY, vi.fn(), { seed: 19 });
    const different = createEnchantedLibraryController(VOCABULARY, vi.fn(), { seed: 20 });
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
      phase: "playing",
      mechanic: "book-collection-and-shield",
      targetIndex: 0,
      targetCount: VOCABULARY.length,
      prompt: VOCABULARY[0].translation,
      answer: VOCABULARY[0].term,
      correctAction: expect.stringMatching(/^move-/),
      availableActions: ENCHANTED_LIBRARY_ACTIONS,
      lives: INITIAL_MANA,
      energy: INITIAL_MANA,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      destroyed: false,
    }));
    expect(first.snapshot().books).toEqual(second.snapshot().books);
    expect(first.snapshot().books).not.toEqual(different.snapshot().books);

    const choice = first.choose(initial.correctAction);
    expect(choice).toEqual(expect.objectContaining({
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      snapshot: expect.any(Object),
    }));

    first.restore(initial);
    first.tick(SPIRIT_SPAWN_RATE_MS);
    second.tick(SPIRIT_SPAWN_RATE_MS);
    different.tick(SPIRIT_SPAWN_RATE_MS);
    expect(first.snapshot().spirits).toEqual(second.snapshot().spirits);
    expect(first.snapshot().spirits).not.toEqual(different.snapshot().spirits);
  });

  it("returns the full choose result contract at victory", () => {
    const deliver = vi.fn();
    const controller = createEnchantedLibraryController([VOCABULARY[0]], deliver, { seed: 0 });
    let terminal: ReturnType<typeof controller.choose> | undefined;

    for (let step = 0; step < 100 && controller.snapshot().phase === "playing"; step += 1) {
      terminal = controller.choose(controller.snapshot().correctAction);
    }

    expect(terminal).toMatchObject({
      accepted: true,
      correct: true,
      progressed: true,
      terminal: true,
      completed: true,
      result: {
        accuracy: 1,
        score: 100,
        correctAnswers: 1,
        totalAttempts: 1,
      },
    });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("collects a wrong book without changing the target and loses exact mana", () => {
    const controller = createEnchantedLibraryController(VOCABULARY, vi.fn());
    const initial = controller.snapshot();
    const wrongBook = initial.books.find((book) => !book.isCorrect)!;
    const result = moveToBook(controller, wrongBook.id);

    expect(result).toMatchObject({
      accepted: true,
      correct: false,
      progressed: false,
      terminal: false,
      event: "book-wrong",
    });
    expect(result.snapshot.targetIndex).toBe(0);
    expect(result.snapshot.targetTerm).toBe(initial.targetTerm);
    expect(result.snapshot.mana).toBe(INITIAL_MANA - MANA_LOSS_INCORRECT);
    expect(result.snapshot.totalAttempts).toBe(1);
    expect(result.snapshot.correctAnswers).toBe(0);

    controller.activateShield();
    const correctBook = controller.snapshot().books.find((book) => book.isCorrect)!;
    const correct = moveToBook(controller, correctBook.id);
    expect(correct.correct).toBe(true);
    expect(correct.snapshot.player.shieldCharges).toBe(MAX_SHIELD_CHARGES);
    expect(correct.snapshot.mana).toBe(INITIAL_MANA - MANA_LOSS_INCORRECT + MANA_GAIN_CORRECT);
  });

  it("requires one correct book collision per vocabulary item and scores 100 points", () => {
    const deliver = vi.fn();
    const controller = createEnchantedLibraryController(VOCABULARY.slice(0, 2), deliver);

    for (let collection = 0; collection < 2; collection += 1) {
      const state = controller.snapshot();
      const expected = VOCABULARY[collection % 2];
      expect(state.targetTerm).toBe(expected.term);
      const correctBook = state.books.find((book) => book.isCorrect)!;
      const result = moveToBook(controller, correctBook.id);
      expect(result.correct).toBe(true);
      expect(result.snapshot.vocabularyProgress.get(expected.term)).toBe(
        1,
      );
      if (collection < 1) expect(result.terminal).toBe(false);
    }

    const completed = controller.snapshot();
    expect(completed).toMatchObject({
      phase: "victory",
      status: "victory",
      targetIndex: 2,
      targetCount: 2,
      correctAnswers: 2,
      totalAttempts: 2,
      score: 200,
      mana: INITIAL_MANA + MANA_GAIN_CORRECT * 2,
    });
    expect([...completed.vocabularyProgress.values()]).toEqual([1, 1]);
    expect(deliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toEqual({
      accuracy: 1,
      xp: 6,
      score: 200,
      correctAnswers: 2,
      totalAttempts: 2,
    });
  });

  it("activates one shield charge on confirm and blocks spirit mana damage", () => {
    const movingController = createEnchantedLibraryController(VOCABULARY, vi.fn());
    const movingStart = movingController.snapshot();
    movingController.restore({
      ...movingStart,
      spirits: [{
        id: "moving-spirit",
        x: 100,
        y: 100,
        radius: 15,
        velocityX: 30,
        velocityY: 0,
        speed: 30,
        bounced: false,
        hasHitPlayer: false,
      }],
    });
    const moving = movingController.tick(16).snapshot.spirits[0]!;
    expect(moving.x).toBeGreaterThan(100);

    const controller = createEnchantedLibraryController(VOCABULARY, vi.fn());
    const initial = controller.snapshot();
    restoreWithSpirit(controller, initial);
    const damaged = controller.tick(0);
    expect(damaged.snapshot.mana).toBe(INITIAL_MANA - MANA_LOSS_SPIRIT_HIT);
    expect(damaged.snapshot.spirits[0]?.hasHitPlayer).toBe(true);

    const shieldController = createEnchantedLibraryController(VOCABULARY, vi.fn());
    const shieldStart = shieldController.activateShield();
    expect(shieldStart).toMatchObject({ accepted: true, event: "shield-activated" });
    expect(shieldStart.snapshot.player.shieldCharges).toBe(MAX_SHIELD_CHARGES - 1);
    expect(shieldStart.snapshot.shieldActive).toBe(true);
    restoreWithSpirit(shieldController, shieldStart.snapshot);
    const blocked = shieldController.tick(0);
    expect(blocked.snapshot.mana).toBe(INITIAL_MANA);
    expect(blocked.snapshot.spirits[0]?.bounced).toBe(true);
    expect(shieldController.activateShield().snapshot.player.shieldCharges).toBe(
      MAX_SHIELD_CHARGES - 1,
    );
    expect(shieldController.tick(SHIELD_DURATION_MS).snapshot.shieldActive).toBe(false);
  });

  it("rejects repeated shield use, records a repeated spirit contact, and covers every spawn wall", () => {
    const shieldController = createEnchantedLibraryController(VOCABULARY, vi.fn());
    expect(shieldController.choose("confirm")).toMatchObject({ accepted: true, event: "shield-activated" });
    expect(shieldController.choose("confirm")).toMatchObject({ accepted: false, event: "shield-unavailable" });

    const contactController = createEnchantedLibraryController(VOCABULARY, vi.fn());
    restoreWithSpirit(contactController, contactController.capture());
    const first = contactController.tick(0);
    const second = contactController.tick(0);
    expect(first.event).toBe("spirit-hit");
    expect(second.event).toBe("none");
    expect(second.snapshot.mana).toBe(first.snapshot.mana);

    for (const seed of [1, 2, 3]) {
      const controller = createEnchantedLibraryController(VOCABULARY, vi.fn(), seed);
      controller.tick(SPIRIT_SPAWN_RATE_MS);
      expect(controller.snapshot().spirits).toHaveLength(1);
    }
  });

  it("defeats at zero mana and emits one exact result", () => {
    const deliver = vi.fn();
    const controller = createEnchantedLibraryController(VOCABULARY, deliver);

    for (let attempt = 0; attempt < INITIAL_MANA / MANA_LOSS_INCORRECT; attempt += 1) {
      const wrongBook = controller.snapshot().books.find((book) => !book.isCorrect)!;
      const result = moveToBook(controller, wrongBook.id);
      if (result.terminal) break;
    }

    expect(controller.snapshot()).toMatchObject({ phase: "defeat", status: "defeat", mana: 0 });
    expect(deliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: INITIAL_MANA / MANA_LOSS_INCORRECT,
    });
    expect(controller.tick(1).accepted).toBe(false);
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("defeats on timer expiry even while mana remains", () => {
    const deliver = vi.fn();
    const controller = createEnchantedLibraryController(VOCABULARY, deliver);
    const result = controller.tick(ENCHANTED_LIBRARY_DURATION_MS);

    expect(result).toMatchObject({ terminal: true, event: "timer-expired" });
    expect(result.snapshot).toMatchObject({ phase: "defeat", mana: INITIAL_MANA, timeRemaining: 0 });
    expect(gameResultsSchema.parse(result.result)).toMatchObject({
      accuracy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("rejects malformed responsive snapshots before changing state", () => {
    const controller = createEnchantedLibraryController(VOCABULARY, vi.fn(), { seed: 7 });
    const captured = controller.capture();
    const invalidStates = [
      { ...captured, seed: 8 },
      { ...captured, score: 100 },
      { ...captured, books: [] },
      { ...captured, vocabularyProgress: new Map([[VOCABULARY[0].term, 1]]) },
      { ...captured, player: { ...captured.player, x: -1 } },
      { ...captured, result: { accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 } },
    ];

    for (const invalid of invalidStates) expect(() => controller.restore(invalid as EnchantedLibrarySnapshot)).toThrow();
    expect(controller.snapshot()).toEqual(captured);
  });

  it("rejects responsive states with invalid gameplay fields", () => {
    const controller = createEnchantedLibraryController(VOCABULARY, vi.fn(), { seed: 7 });
    const captured = controller.capture();
    const firstBook = captured.books[0]!;
    const secondBook = captured.books[1]!;
    const invalidStates: Array<Partial<EnchantedLibrarySnapshot>> = [
      { phase: "paused" as EnchantedLibrarySnapshot["phase"] },
      { status: "victory" },
      { mechanic: "forged" },
      { targetTerm: "forged" },
      { availableActions: [] },
      { correctAction: "confirm" },
      { books: [{ ...firstBook, id: secondBook.id }, ...captured.books.slice(1)] },
      { books: [{ ...firstBook, x: secondBook.x, y: secondBook.y }, ...captured.books.slice(1)] },
      { books: captured.books.map((book) => ({ ...book, isCorrect: false })) },
      { spirits: "not-an-array" as unknown as EnchantedLibrarySnapshot["spirits"] },
      { spirits: [{ ...captured.spirits, id: "spirit" }] as unknown as EnchantedLibrarySnapshot["spirits"] },
      { mana: -1 },
      { lives: 1 },
      { shieldTimer: SHIELD_DURATION_MS + 1 },
      { shieldActive: true },
      { gameTime: -1 },
      { timeRemaining: 1 },
      { spiritSpawnTimer: SPIRIT_SPAWN_RATE_MS + 1 },
      { layoutIndex: -1 },
      { vocabularyProgress: new Map([[VOCABULARY[0].term, 2], ...VOCABULARY.slice(1).map((item) => [item.term, 0] as const)]) },
      { correctAnswers: 1 },
      { lastOutcome: "forged" as EnchantedLibrarySnapshot["lastOutcome"] },
      { destroyed: "no" as unknown as boolean },
      { result: { accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 } },
    ];

    for (const invalid of invalidStates) {
      expect(() => controller.restore({ ...captured, ...invalid })).toThrow();
    }
    expect(controller.snapshot()).toEqual(captured);
  });

  it("rejects forged terminal XP and counters before changing active state", () => {
    const terminalController = createEnchantedLibraryController([VOCABULARY[0]], vi.fn());
    const correctBook = terminalController.snapshot().books.find((book) => book.isCorrect)!;
    const terminalResult = moveToBook(terminalController, correctBook.id);
    expect(terminalResult.terminal).toBe(true);
    const terminal = terminalController.capture();
    const controller = createEnchantedLibraryController([VOCABULARY[0]], vi.fn());
    const active = controller.capture();
    const result = terminal.result!;
    const forgedResults = [
      { ...result, xp: result.xp + 1 },
      { ...result, score: result.score + 100 },
      { ...result, accuracy: 0 },
      { ...result, correctAnswers: 0 },
      { ...result, totalAttempts: result.totalAttempts + 1 },
    ];

    for (const forgedResult of forgedResults) {
      expect(() => controller.restore({ ...terminal, result: forgedResult })).toThrow();
      expect(controller.snapshot()).toEqual(active);
    }
  });

  it("suppresses completion delivery in tutorial and demo sessions", () => {
    for (const sessionMode of ["tutorial", "demo"] as const) {
      const input = createInputController();
      const complete = vi.fn();
      const cartridge = createEnchantedLibraryCartridge();
      const config = cartridge.createGameConfig({
        input: [VOCABULARY[0]],
        edition: {
          id: "test-edition",
          title: "Test edition",
          runtimeApiVersion: "1.0.0",
          pack: { id: "test-pack", version: "1.0.0", root: "/test", files: {} },
          bindings: {},
          tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
        },
        complete,
        diagnostic: vi.fn(),
        inputController: input,
        seed: 19,
        sessionMode,
      });
      const tutorial = cartridge.standardExperience.definition.tutorial;
      for (const step of tutorial.steps) {
        cartridge.standardExperience.createTutorialActionDriver().execute({
          tutorial,
          step,
          seed: tutorial.seed,
          mode: "tutorial",
          diagnostics: { report: vi.fn() },
        });
      }

      expect(config).toBeTruthy();
      expect(complete).not.toHaveBeenCalled();
    }
  });

  it("uses real book selection for incorrect and correct tutorial actions without a result", () => {
    const complete = vi.fn();
    const cartridge = createEnchantedLibraryCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY.slice(0, 2),
      edition: {
        id: "test-edition",
        title: "Test edition",
        runtimeApiVersion: "1.0.0",
        pack: { id: "test-pack", version: "1.0.0", root: "/test", files: {} },
        bindings: {},
        tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
      },
      complete,
      diagnostic: vi.fn(),
      inputController: createInputController(),
      seed: 19,
      sessionMode: "tutorial",
    });
    const definition = cartridge.standardExperience.definition;
    const driver = cartridge.standardExperience.createTutorialActionDriver();
    const scene = config.scene as {
      extend: { apkCaptureResponsiveState: () => { game: EnchantedLibrarySnapshot } };
    };
    const context = (stepIndex: number) => {
      const step = definition.tutorial.steps[stepIndex];
      if (!step) throw new Error("Expected tutorial step");
      return {
        tutorial: definition.tutorial,
        step,
        seed: definition.tutorial.seed,
        mode: "tutorial" as const,
        diagnostics: { report: vi.fn() },
      };
    };
    // The runtime plans on execute, then replays the route across the demonstration window.
    const execute = (stepIndex: number, frames = 1): void => {
      driver.execute(context(stepIndex));
      for (let frame = 1; frame <= frames; frame += 1) {
        driver.advanceFrame?.({
          ...context(stepIndex),
          elapsedMs: frame,
          progress: frame / frames,
        });
      }
    };

    // A demonstration that stops halfway must leave the player between the start and the book.
    const start = scene.extend.apkCaptureResponsiveState().game.player;
    driver.execute(context(0));
    driver.advanceFrame?.({ ...context(0), elapsedMs: 1, progress: 0.5 });
    const halfway = scene.extend.apkCaptureResponsiveState().game;
    expect(halfway.totalAttempts, "a halfway demonstration must not score yet").toBe(0);
    expect(
      halfway.player.x !== start.x || halfway.player.y !== start.y,
      "a halfway demonstration must move the player",
    ).toBe(true);
    driver.advanceFrame?.({ ...context(0), elapsedMs: 2, progress: 1 });

    expect(scene.extend.apkCaptureResponsiveState().game).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      totalAttempts: 1,
      correctAnswers: 0,
      lastOutcome: "incorrect",
      shieldActive: false,
      player: { shieldCharges: MAX_SHIELD_CHARGES },
    });

    execute(1);
    expect(scene.extend.apkCaptureResponsiveState().game).toMatchObject({
      phase: "playing",
      targetIndex: 1,
      totalAttempts: 2,
      correctAnswers: 1,
      lastOutcome: "correct",
      score: 100,
      shieldActive: false,
      player: { shieldCharges: MAX_SHIELD_CHARGES },
    });
    expect(complete).not.toHaveBeenCalled();
  });

  it("delivers explicit victory and defeat outcomes for authoritative play", () => {
    const edition = {
      id: "test-edition",
      title: "Test edition",
      runtimeApiVersion: "1.0.0",
      pack: { id: "test-pack", version: "1.0.0", root: "/test", files: {} },
      bindings: {},
      tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
    };
    const run = (actionIndex: number, attempts: number, input = VOCABULARY.slice(0, 2)): ReturnType<typeof vi.fn> => {
      const complete = vi.fn();
      const cartridge = createEnchantedLibraryCartridge();
      cartridge.createGameConfig({
        input,
        edition,
        complete,
        diagnostic: vi.fn(),
        inputController: createInputController(),
        seed: 19,
        sessionMode: "playing",
      });
      const definition = cartridge.standardExperience.definition;
      const step = definition.tutorial.steps[actionIndex];
      if (!step) throw new Error("Expected tutorial step");
      const driver = cartridge.standardExperience.createTutorialActionDriver();
      const context = {
        tutorial: definition.tutorial,
        step,
        seed: definition.tutorial.seed,
        mode: "tutorial" as const,
        diagnostics: { report: vi.fn() },
      };
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        driver.execute(context);
        driver.advanceFrame?.({ ...context, elapsedMs: 1, progress: 1 });
      }
      return complete;
    };

    expect(run(1, 1, VOCABULARY.slice(0, 1))).toHaveBeenCalledWith(expect.any(Object), "victory");
    expect(run(0, INITIAL_MANA / MANA_LOSS_INCORRECT)).toHaveBeenCalledWith(expect.any(Object), "defeat");
  });

  it("supports held keyboard, pointer steering, shield targeting, responsive state, and cleanup", () => {
    const input = createInputController();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const cartridge = createEnchantedLibraryCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY.map((item) => ({ ...item })),
      edition: {
        id: "test-edition",
        title: "Test edition",
        runtimeApiVersion: "1.0.0",
        pack: { id: "test-pack", version: "1.0.0", root: "/test", files: {} },
        bindings: {},
        tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
      },
      complete,
      diagnostic,
      inputController: input,
      seed: 19,
    });
    const scene = config.scene as {
      create: (this: unknown) => void;
      update: (this: unknown, time?: number, delta?: number) => void;
      extend: {
        apkCaptureResponsiveState: () => unknown;
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const host = createSceneHost();

    scene.create.call(host.host);
    input.setSnapshot(inputSnapshot({ keys: ["ArrowRight"] }));
    scene.update.call(host.host, 0, 16);
    const afterKeyboard = scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot };
    expect(afterKeyboard.game.player.x).toBeGreaterThan(400);

    input.setSnapshot(inputSnapshot({
      pointer: {
        down: false,
        released: true,
        cancelled: true,
        id: null,
        kind: "touch",
        startX: 400,
        startY: 250,
        x: 400,
        y: 250,
      },
    }));
    scene.update.call(host.host, 16, 16);
    expect((scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot }).game.shieldActive).toBe(false);

    input.setSnapshot(inputSnapshot({
      pointer: {
        down: true,
        released: false,
        cancelled: false,
        id: null,
        kind: "touch",
        startX: 700,
        startY: 300,
        x: 700,
        y: 300,
      },
    }));
    scene.update.call(host.host, 32, 100);
    const afterPointerHold = scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot };
    expect(afterPointerHold.game.player.x).toBeGreaterThan(afterKeyboard.game.player.x);
    input.setSnapshot(inputSnapshot({ pointer: {
      down: true, released: false, cancelled: false, id: null, kind: "touch",
      startX: 700, startY: 300, x: 200, y: 300,
    } }));
    scene.update.call(host.host, 132, 100);
    const afterPointerRetarget = scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot };
    expect(afterPointerRetarget.game.player.x).toBeLessThan(afterPointerHold.game.player.x);
    input.setSnapshot(inputSnapshot({ pointer: {
      down: false, released: true, cancelled: false, id: null, kind: "touch",
      startX: 700, startY: 300, x: 200, y: 300,
    } }));
    scene.update.call(host.host, 200, 100);
    expect((scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot }).game.player)
      .toEqual(afterPointerRetarget.game.player);

    input.setSnapshot(inputSnapshot({ pointer: {
      down: true, released: false, cancelled: false, id: null, kind: "touch",
      startX: 100, startY: 50, x: 920, y: 36,
    } }));
    scene.update.call(host.host, 208, 8);
    input.setSnapshot(inputSnapshot({ pointer: {
      down: false, released: true, cancelled: false, id: null, kind: "touch",
      startX: 100, startY: 50, x: 920, y: 36,
    } }));
    scene.update.call(host.host, 212, 4);
    expect((scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot }).game.shieldActive).toBe(false);

    input.setSnapshot(inputSnapshot({ pointer: {
      down: true, released: false, cancelled: false, id: null, kind: "touch",
      startX: 920, startY: 36, x: 200, y: 300,
    } }));
    scene.update.call(host.host, 216, 16);
    expect((scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot }).game.player)
      .toEqual(afterPointerRetarget.game.player);
    input.setSnapshot(inputSnapshot({
      pointer: {
        down: false,
        released: true,
        cancelled: false,
        id: null,
        kind: "touch",
        startX: 920,
        startY: 36,
        x: 200,
        y: 300,
      },
    }));
    scene.update.call(host.host, 232, 16);
    expect((scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot }).game.shieldActive).toBe(false);
    input.setSnapshot(inputSnapshot({ pointer: {
      down: false, released: true, cancelled: false, id: null, kind: "touch",
      startX: 920, startY: 36, x: 920, y: 36,
    } }));
    scene.update.call(host.host, 248, 16);
    const afterTouch = scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot };
    expect(afterTouch.game.shieldActive).toBe(true);

    const captured = scene.extend.apkCaptureResponsiveState();
    input.setSnapshot(inputSnapshot({ keys: ["ArrowLeft"] }));
    scene.update.call(host.host, 32, 16);
    scene.extend.apkRestoreResponsiveState(captured);
    expect((scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot }).game).toEqual(
      (captured as { game: EnchantedLibrarySnapshot }).game,
    );
    expect(() => scene.extend.apkRecompose({ profile: "compact" })).not.toThrow();

    host.emit("shutdown");
    host.emit("destroy");
    expect((scene.extend.apkCaptureResponsiveState() as { game: EnchantedLibrarySnapshot }).game.destroyed).toBe(true);
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(input.cancelActiveGesture).toHaveBeenCalledOnce();
    expect(host.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect(complete).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "ENCHANTED_LIBRARY_READY" }));
  });

  it("shows the Thai translation alone and prints English terms on every book", () => {
    const { scene, host, bookColors } = mountEnchantedLibraryScene();
    const term = VOCABULARY[0].term;
    const translation = VOCABULARY[0].translation;
    const hudTexts = host.texts.slice(0, 7).map(latestText);
    const prompt = hudTexts[1];
    const bookTexts = host.texts.slice(7).map(latestText).filter(Boolean);
    const goldBookStrokes = bookColors.strokes.filter((color) => color === 0xffd166);

    expect(prompt).toBe(translation);
    expect(hudTexts.join("\n")).not.toMatch(/ENCHANTED LIBRARY|Find:|Find the translation|Walk into|Keyboard:|Compact stacks|Arcane stacks/);
    expect(bookTexts).toEqual(expect.arrayContaining(VOCABULARY.map((item) => item.term)));
    expect(bookTexts).not.toContain(translation);
    expect(bookTexts).toContain(term);
    expect(bookColors.fills).toHaveLength(4);
    expect(bookColors.strokes).toHaveLength(4);
    expect(new Set(bookColors.fills).size).toBe(1);
    expect(new Set(bookColors.strokes).size).toBe(1);
    expect(goldBookStrokes).toHaveLength(0);

    bookColors.reset();
    scene.update.call(host.host, 0, 16);
    const hudAfterUpdate = host.texts.slice(0, 7).map(latestText);
    expect(hudAfterUpdate[1]).toBe(translation);
    expect(new Set(bookColors.fills).size).toBe(1);
    expect(new Set(bookColors.strokes).size).toBe(1);
    expect(bookColors.strokes.filter((color) => color === 0xffd166)).toHaveLength(0);
  });

  it("keeps the Thai target and complete English choices readable when CSS scales the canvas", () => {
    const input = createInputController();
    const cartridge = createEnchantedLibraryCartridge();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: {
        id: "test-edition",
        title: "Test edition",
        runtimeApiVersion: "1.0.0",
        pack: { id: "test-pack", version: "1.0.0", root: "/test", files: {} },
        bindings: {},
        tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
      },
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      seed: 19,
    });
    const scene = config.scene as { create(this: ReturnType<typeof createSceneHost>["host"]): void };
    const host = createSceneHost(336);

    scene.create.call(host.host);

    expect(latestText(host.texts[1]!)).toBe(VOCABULARY[0].translation);
    expect(host.texts[1]?.setFontSize).toHaveBeenLastCalledWith(75);
    for (const book of host.texts.slice(7, 11)) {
      expect(latestText(book)).toMatch(/\S/);
      expect(book.setFontSize).toHaveBeenLastCalledWith(46);
      expect(book.setWordWrapWidth).toHaveBeenLastCalledWith(expect.any(Number), true);
    }
  });

  it("keeps every boundary shelf clear of every possible book label", () => {
    const anchors = [
      { x: 140, y: 160 }, { x: 660, y: 160 }, { x: 140, y: 440 }, { x: 660, y: 440 },
      { x: 400, y: 120 }, { x: 680, y: 300 }, { x: 400, y: 480 }, { x: 120, y: 300 },
    ];
    for (const { width, height } of [{ width: 336, height: 733 }, { width: 960, height: 540 }]) {
      const bookWidth = Math.min(172, width * 0.19);
      const bookHeight = Math.min(68, height * 0.14);
      const shelves = calculateEnchantedLibraryShelfPlacements(width, height);
      expect(shelves).toHaveLength(6);
      for (const shelf of shelves) {
        for (const anchor of anchors) {
          const bookX = anchor.x * (width / 800);
          const bookY = anchor.y * (height / 600);
          const separated = shelf.x + shelf.width / 2 < bookX - bookWidth / 2
            || shelf.x - shelf.width / 2 > bookX + bookWidth / 2
            || shelf.y + shelf.height / 2 < bookY - bookHeight / 2
            || shelf.y - shelf.height / 2 > bookY + bookHeight / 2;
          expect(separated).toBe(true);
        }
      }
    }
  });

  it("does not call shared legacy catalog factories", () => {
    const source = readFileSync(new URL("./enchanted-library.ts", import.meta.url), "utf8");
    expect(source).not.toContain("createLegacyCatalogController");
    expect(source).not.toContain("createLegacyCatalogCartridge");
  });
});
