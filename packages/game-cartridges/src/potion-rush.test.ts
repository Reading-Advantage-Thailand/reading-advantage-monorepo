import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";
import {
  POTION_RUSH_CANVAS,
  POTION_RUSH_KEYBOARD_BINDINGS,
  createPotionRushCartridge,
  createPotionRushController,
  getPotionRushPointerTarget,
} from "./potion-rush.js";

const INPUT = [
  { term: "brew red", translation: "red brew" },
  { term: "serve blue", translation: "blue service" },
];

function ingredientIdFor(controller: ReturnType<typeof createPotionRushController>, word: string): string {
  const ingredient = controller.snapshot().conveyor.find((candidate) => candidate.word === word);
  if (!ingredient) throw new Error(`Missing ingredient ${word}`);
  return ingredient.id;
}

function brewCustomer(
  controller: ReturnType<typeof createPotionRushController>,
  slot: number,
): string {
  const state = controller.snapshot();
  const customerId = state.cauldrons[slot]?.customerId;
  if (!customerId) throw new Error(`Cauldron ${slot} has no customer`);
  const customer = state.customers.find((candidate) => candidate.id === customerId);
  if (!customer) throw new Error(`Missing customer ${customerId}`);
  for (const word of customer.request.term.split(/\s+/u)) {
    controller.placeIngredient(ingredientIdFor(controller, word), slot);
  }
  return customerId;
}

function serveEveryCustomer(
  controller: ReturnType<typeof createPotionRushController>,
): void {
  for (const customer of controller.snapshot().customers) {
    const state = controller.snapshot();
    const slot = state.activeCustomerIds.indexOf(customer.id);
    if (slot < 0) continue;
    const customerId = brewCustomer(controller, slot);
    controller.serveCustomer(customerId, slot);
  }
}

function tickMany(
  controller: ReturnType<typeof createPotionRushController>,
  count: number,
): void {
  for (let index = 0; index < count; index += 1) controller.tick(0.05);
}

interface FakeInput {
  pressed: string[];
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
  snapshot: () => {
    keys: readonly string[];
    pressed: readonly string[];
    pointer: FakeInput["pointer"];
    destroyed: false;
  };
  cancelActiveGesture: ReturnType<typeof vi.fn> & (() => void);
  destroy: ReturnType<typeof vi.fn> & (() => void);
}

function createFakeInput(): FakeInput {
  const input: FakeInput = {
    pressed: [],
    pointer: { down: false, released: false, cancelled: false, id: null, kind: null, startX: 0, startY: 0, x: 0, y: 0 },
    snapshot: () => ({
      keys: [],
      pressed: [...input.pressed],
      pointer: { ...input.pointer },
      destroyed: false,
    }),
    cancelActiveGesture: vi.fn() as ReturnType<typeof vi.fn> & (() => void),
    destroy: vi.fn() as ReturnType<typeof vi.fn> & (() => void),
  };
  return input;
}

function createFakeScene(input: FakeInput, canvasWidth = 960, sceneSize = { width: 960, height: 540 }) {
  const listeners = new Map<string, () => void>();
  const destroyed = vi.fn();
  const graphics = {
    clear: vi.fn(function (this: object) { return this; }),
    fillStyle: vi.fn(function (this: object) { return this; }),
    fillRect: vi.fn(function (this: object) { return this; }),
    fillCircle: vi.fn(function (this: object) { return this; }),
    fillRoundedRect: vi.fn(function (this: object) { return this; }),
    lineStyle: vi.fn(function (this: object) { return this; }),
    strokeRoundedRect: vi.fn(function (this: object) { return this; }),
    destroy: destroyed,
  };
  const textObjects: Array<{
    setPosition: ReturnType<typeof vi.fn>;
    setText: ReturnType<typeof vi.fn>;
    setFontSize: ReturnType<typeof vi.fn>;
    setOrigin: ReturnType<typeof vi.fn>;
    setWordWrapWidth: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  }> = [];
  const tileSprite = vi.fn(() => ({
    setOrigin: vi.fn().mockReturnThis(),
    setDisplaySize: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  }));
  const scene = {
    scale: sceneSize,
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: canvasWidth, height: sceneSize.height }) } },
    add: {
      graphics: () => graphics,
      tileSprite,
      text: () => {
        const text = {
          setPosition: vi.fn(function (this: object) { return this; }),
          setText: vi.fn(function (this: object) { return this; }),
          setFontSize: vi.fn(function (this: object) { return this; }),
          setOrigin: vi.fn(function (this: object) { return this; }),
          setWordWrapWidth: vi.fn(function (this: object) { return this; }),
          destroy: vi.fn(),
        };
        textObjects.push(text);
        return text;
      },
    },
    events: { once: (event: string, listener: () => void) => listeners.set(event, listener) },
  };
  return {
    input,
    scene,
    listeners,
    graphics,
    textObjects,
    tileSprite,
    destroyed,
  };
}

describe("Potion Rush bespoke cartridge", () => {
  it("rejects empty sentence sessions", () => {
    expect(() => createPotionRushController([], vi.fn())).toThrow();
    expect(() => createPotionRushController(INPUT, vi.fn(), { seed: Number.NaN })).toThrow(/seed/i);
  });

  it("rejects invalid selections, targets, and timing inputs", () => {
    const controller = createPotionRushController(INPUT, vi.fn());
    const initial = controller.snapshot();

    expect(controller.selectIngredient("missing").selectedIngredientId).toBeUndefined();
    expect(controller.selectCauldron(-1).selectedCauldronIndex).toBe(0);
    expect(controller.selectCauldron(3).selectedCauldronIndex).toBe(0);
    expect(controller.placeIngredient("missing", 0)).toMatchObject({ accepted: false, served: false });
    expect(controller.placeIngredient(initial.conveyor[0]!.id, -1)).toMatchObject({ accepted: false, served: false });
    expect(controller.dumpCauldron(0)).toMatchObject({ accepted: false, served: false });
    expect(controller.dumpCauldron(-1)).toMatchObject({ accepted: false, served: false });
    expect(controller.serveCustomer("missing", 0)).toMatchObject({ accepted: false, served: false });
    expect(controller.choose("move-right")).toMatchObject({ accepted: true });
    expect(controller.choose("move-up")).toMatchObject({ accepted: true });
    expect(controller.choose("move-down")).toMatchObject({ accepted: true });
    expect(controller.choose("cancel")).toMatchObject({ accepted: true });
    expect(controller.choose("unknown-action" as never)).toMatchObject({ accepted: false, served: false });
    expect(controller.choose("confirm")).toMatchObject({ accepted: false, served: false });
    expect(controller.tick(0)).toEqual(controller.snapshot());
    expect(() => controller.tick(-1)).toThrow(/delta/i);
    expect(() => controller.tick(1, 0)).toThrow(/viewport/i);
    expect(() => controller.tick(1, Number.NaN)).toThrow(/viewport/i);
  });

  it("builds a deterministic queue with only supplied sentence words and stable ingredient identities", () => {
    const controller = createPotionRushController(INPUT, vi.fn());
    const initial = controller.snapshot();

    expect(initial.queue).toEqual(["customer:0", "customer:1"]);
    expect(initial.activeCustomerIds).toEqual(["customer:0", "customer:1", null]);
    expect(initial.cauldrons).toHaveLength(3);
    expect(initial.conveyor.map((ingredient) => ingredient.word)).toEqual([
      "brew", "red", "serve", "blue",
    ]);
    expect(initial.conveyor.map((ingredient) => ingredient.id)).toEqual([
      "ingredient:0", "ingredient:1", "ingredient:2", "ingredient:3",
    ]);
    const moved = controller.tick(1).conveyor;
    expect(moved[0]?.x).toBeLessThan(initial.conveyor[0]!.x);
  });

  it("brews each customer sentence in strict word order", () => {
    const controller = createPotionRushController(INPUT, vi.fn());
    const firstWord = controller.placeIngredient(ingredientIdFor(controller, "brew"), 0);
    expect(firstWord).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(firstWord.snapshot.cauldrons[0]).toMatchObject({ state: "brewing", currentWords: ["brew"] });

    const completed = controller.placeIngredient(ingredientIdFor(controller, "red"), 0);
    expect(completed).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(completed.snapshot.cauldrons[0]).toMatchObject({ state: "completed", currentWords: ["brew", "red"] });
  });

  it("spoils a cauldron on a wrong ingredient and requires a dump", () => {
    const controller = createPotionRushController(INPUT, vi.fn());
    const wrong = controller.placeIngredient(ingredientIdFor(controller, "serve"), 0);

    expect(wrong).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(wrong.snapshot.cauldrons[0]).toMatchObject({ state: "spoiled", currentWords: ["serve"] });
    expect(getPotionRushPointerTarget(480, 378, 960, 540, wrong.snapshot)).toEqual({ kind: "dump", cauldronIndex: 0 });
    expect(controller.placeIngredient(ingredientIdFor(controller, "brew"), 0).accepted).toBe(false);

    const dumped = controller.dumpCauldron(0);
    expect(dumped).toMatchObject({ accepted: true, correct: false });
    expect(dumped.snapshot.cauldrons[0]).toMatchObject({ state: "idle", currentWords: [] });
    expect(dumped.snapshot.conveyor.some((ingredient) => ingredient.word === "serve")).toBe(true);

    const expiring = createPotionRushController(INPUT, vi.fn());
    expiring.placeIngredient(ingredientIdFor(expiring, "serve"), 0);
    const expired = expiring.applyHazard();
    expect(expired.snapshot.lastOutcome).toBe("expired");
    expect(expired.snapshot.conveyor.some((ingredient) => ingredient.word === "serve")).toBe(true);
  });

  it("serves only the matching completed customer after awarding word score", () => {
    const controller = createPotionRushController(INPUT, vi.fn());
    const firstCustomerId = brewCustomer(controller, 0);
    expect(controller.serveCustomer("customer:1", 0).accepted).toBe(false);

    const served = controller.serveCustomer(firstCustomerId, 0);
    expect(served).toMatchObject({ accepted: true, correct: true, progressed: true, served: true });
    expect(served.snapshot.score).toBe(200);
    expect(served.snapshot.customers[0]).toMatchObject({ id: firstCustomerId, state: "served" });
    expect(served.snapshot.cauldrons[0].customerId).toBe(null);
  });

  it("reduces patience on ticks and lowers reputation when a customer expires", () => {
    const controller = createPotionRushController([{ term: "brew", translation: "brew" }], vi.fn());
    tickMany(controller, 240);
    expect(controller.snapshot().customers[0]?.patience).toBeCloseTo(48, 6);
    tickMany(controller, 960);
    const expired = controller.snapshot();

    expect(expired.customers[0]).toMatchObject({ state: "waiting", patience: 60, slot: expect.any(Number) });
    expect(expired.reputation).toBe(75);
    expect(expired.lastOutcome).toBe("expired");
    expect(expired.phase).toBe("playing");
  });

  it.each([1, 2, 3])("requeues an unserved sentence after expiry with %s customer(s)", (customerCount) => {
    const input = Array.from({ length: customerCount }, (_, index) => ({
      term: `word${index}`,
      translation: `translation${index}`,
    }));
    const deliver = vi.fn();
    const controller = createPotionRushController(input, deliver);

    const expiries = Array.from({ length: customerCount }, () => controller.applyHazard());
    const expired = expiries[customerCount - 1]!;

    expect(expired).toMatchObject({ accepted: true, progressed: false, terminal: false });
    expect(expired.snapshot).toMatchObject({ phase: "playing", reputation: 100 - customerCount * 25 });
    expect(expired.snapshot.customers.every((customer) => customer.state === "waiting")).toBe(true);
    expect(expired.snapshot.activeCustomerIds.some((customerId) => customerId !== null)).toBe(true);

    serveEveryCustomer(controller);

    expect(controller.snapshot()).toMatchObject({ phase: "victory", servedCustomers: customerCount });
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "victory");
  });

  it("enters defeat after reputation exhausts while no unserved sentence can be requeued", () => {
    const deliver = vi.fn();
    const controller = createPotionRushController([{ term: "brew", translation: "brew" }], deliver);

    const expiries = [controller.applyHazard(), controller.applyHazard(), controller.applyHazard(), controller.applyHazard()];
    const defeated = expiries[3]!;

    expect(defeated).toMatchObject({ accepted: true, terminal: true, completed: true });
    expect(defeated.snapshot).toMatchObject({ phase: "defeat", reputation: 0, activeCustomerIds: [null, null, null] });
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "defeat");
  });

  it("enters defeat at zero reputation and victory after all customers are served", () => {
    const defeatDeliver = vi.fn();
    const defeat = createPotionRushController(
      [
        { term: "one", translation: "one" },
        { term: "two", translation: "two" },
        { term: "three", translation: "three" },
        { term: "four", translation: "four" },
      ],
      defeatDeliver,
    );
    defeat.applyHazard();
    defeat.applyHazard();
    defeat.applyHazard();
    const defeatedAction = defeat.applyHazard();
    const defeated = defeatedAction.snapshot;
    expect(defeated.phase).toBe("defeat");
    expect(defeated.reputation).toBe(0);
    expect(defeatDeliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(defeatDeliver.mock.calls[0]?.[0])).toMatchObject({ score: 0, correctAnswers: 0 });

    const victoryDeliver = vi.fn();
    const victory = createPotionRushController([{ term: "brew", translation: "brew" }], victoryDeliver);
    const customerId = brewCustomer(victory, 0);
    const terminal = victory.serveCustomer(customerId, 0);
    expect(terminal).toMatchObject({ terminal: true, completed: true, served: true });
    expect(terminal.snapshot.phase).toBe("victory");
    const result = gameResultsSchema.parse(terminal.result);
    expect(result).toMatchObject({ accuracy: 1, correctAnswers: 1, totalAttempts: 1, score: 100 });
    expect(victoryDeliver).toHaveBeenCalledOnce();
    expect(victoryDeliver).toHaveBeenCalledWith(expect.any(Object), "victory");
    expect(victory.choose("confirm")).toMatchObject({ accepted: false, terminal: false });
    expect(victoryDeliver).toHaveBeenCalledOnce();
  });

  it("counts every ordered word across every sentence before victory", () => {
    const deliver = vi.fn();
    const controller = createPotionRushController(INPUT, deliver);

    const firstCustomer = brewCustomer(controller, 0);
    controller.serveCustomer(firstCustomer, 0);
    const secondCustomer = brewCustomer(controller, 1);
    const terminal = controller.serveCustomer(secondCustomer, 1);

    expect(terminal).toMatchObject({ terminal: true, completed: true, served: true });
    expect(terminal.snapshot).toMatchObject({ targetIndex: 4, targetCount: 4, correctAnswers: 4, totalAttempts: 4, score: 400, phase: "victory" });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("clamps controller gameplay deltas to 50 milliseconds", () => {
    const controller = createPotionRushController([{ term: "brew", translation: "brew" }], vi.fn());
    const before = controller.snapshot();
    const after = controller.tick(10);

    expect(after.customers[0]?.patience).toBeCloseTo(before.customers[0]!.patience - 0.05, 6);
    expect(after.conveyor[0]!.x).toBeCloseTo(before.conveyor[0]!.x - 90 * 0.05, 6);
  });

  it("rejects inconsistent responsive customer and cauldron assignments", () => {
    const controller = createPotionRushController(INPUT, vi.fn());
    const captured = controller.capture();
    const inconsistent = {
      ...captured,
      cauldrons: captured.cauldrons.map((cauldron, index) => index === 0
        ? { ...cauldron, customerId: "customer:1" }
        : cauldron),
    };

    expect(() => controller.restore(inconsistent)).toThrow(/assignment/i);
  });

  it("rejects forged active responsive fields and completed-state rewinds", () => {
    const controller = createPotionRushController(INPUT, vi.fn(), { seed: 7 });
    const captured = controller.capture();
    const invalidStates: Array<Partial<ReturnType<typeof controller.capture>>> = [
      { phase: "paused" as ReturnType<typeof controller.capture>["phase"] },
      { status: "victory" },
      { seed: 8 },
      { customers: [] },
      { cauldrons: [] },
      { activeCustomerIds: [] },
      { selectedCauldronIndex: -1 },
      { targetCount: 99 },
      { targetIndex: -1 },
      { reputation: -1 },
      { lives: 1 },
      { score: -1 },
      { correctAnswers: 1 },
      { totalAttempts: -1 },
      { servedCustomers: -1 },
      { availableActions: [] },
      { hazardCursor: -1 },
      { destroyed: "no" as unknown as boolean },
      { result: { accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 } },
      { customers: captured.customers.map((customer, index) => index === 0 ? { ...customer, id: "forged" } : customer) },
      { customers: captured.customers.map((customer, index) => index === 0 ? { ...customer, slot: 3 } : customer) },
      { cauldrons: captured.cauldrons.map((cauldron, index) => index === 0 ? { ...cauldron, id: 3 } : cauldron) },
      { cauldrons: captured.cauldrons.map((cauldron, index) => index === 0 ? { ...cauldron, state: "forged" as never } : cauldron) },
      { conveyor: captured.conveyor.map((ingredient, index) => index === 0 ? { ...ingredient, width: 1 } : ingredient) },
      { selectedIngredientId: "missing" },
      { conveyor: captured.conveyor.map((ingredient, index) => index < 2 ? { ...ingredient, selected: true } : ingredient) },
      { prompt: "forged" },
    ];

    for (const invalid of invalidStates) {
      expect(() => controller.restore({ ...captured, ...invalid })).toThrow();
    }
    expect(controller.snapshot()).toEqual(captured);

    const completed = createPotionRushController([{ term: "brew", translation: "brew" }], vi.fn());
    const customerId = brewCustomer(completed, 0);
    completed.serveCustomer(customerId, 0);
    expect(() => completed.restore(captured)).toThrow(/completion/i);
  });

  for (const field of ["xp", "score", "accuracy", "correctAnswers", "totalAttempts"] as const) {
    it(`rejects a forged terminal ${field} during responsive restore`, () => {
      const controller = createPotionRushController([{ term: "brew", translation: "brew" }], vi.fn());
      const customerId = brewCustomer(controller, 0);
      controller.serveCustomer(customerId, 0);
      const captured = controller.capture();
      if (!captured.result) throw new Error("Expected a terminal result");

      const forgedValues = {
        xp: 0,
        score: 0,
        accuracy: 0,
        correctAnswers: 0,
        totalAttempts: 2,
      };
      const forged = {
        ...captured,
        result: { ...captured.result, [field]: forgedValues[field] },
      };

      expect(() => controller.restore(forged)).toThrow(/result is inconsistent/i);
    });
  }

  it("exposes the shared controller, snapshot, and choose result contract", () => {
    const controller = createPotionRushController(INPUT, vi.fn());
    const initial = controller.snapshot();

    expect(controller).toEqual(expect.objectContaining({
      snapshot: expect.any(Function),
      choose: expect.any(Function),
      applyHazard: expect.any(Function),
      capture: expect.any(Function),
      restore: expect.any(Function),
      destroy: expect.any(Function),
    }));
    expect(initial).toMatchObject({
      phase: "playing",
      targetIndex: 0,
      targetCount: 4,
      prompt: "red brew",
      answer: "brew",
      correctAction: "confirm",
      lives: 100,
      energy: 60,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      lastOutcome: undefined,
      result: undefined,
      destroyed: false,
    });
    expect(initial.availableActions).toEqual(["move-left", "move-right", "move-up", "move-down", "confirm", "cancel"]);

    const choice = controller.choose("move-left");
    expect(choice).toMatchObject({ accepted: true, correct: false, progressed: false, terminal: false, completed: false });
    expect(choice.snapshot).toEqual(expect.objectContaining({ targetIndex: 0, targetCount: 4, correctAction: "confirm" }));
  });

  it("uses the seed for deterministic choices and ingredient placements", () => {
    const first = createPotionRushController(INPUT, vi.fn(), { seed: 17 }).snapshot();
    const second = createPotionRushController(INPUT, vi.fn(), { seed: 17 }).snapshot();
    const different = createPotionRushController(INPUT, vi.fn(), { seed: 18 }).snapshot();

    expect(second.conveyor).toEqual(first.conveyor);
    expect(different.conveyor).not.toEqual(first.conveyor);
  });

  it("supports pointer hit regions and keyboard equivalents in the procedural scene", () => {
    expect(POTION_RUSH_KEYBOARD_BINDINGS).toMatchObject({ KeyA: "move-left", KeyD: "move-right", KeyW: "move-up", KeyS: "move-down", Enter: "confirm", Escape: "cancel" });
    const initial = createPotionRushController([{ term: "brew", translation: "brew" }], vi.fn()).snapshot();
    const ingredient = initial.conveyor[0]!;
    expect(getPotionRushPointerTarget(ingredient.x, 420, 960, 540, initial)).toEqual({ kind: "ingredient", ingredientId: ingredient.id });
    expect(getPotionRushPointerTarget(192, 300, 960, 540, initial)).toEqual({ kind: "cauldron", cauldronIndex: 0 });

    const input = createFakeInput();
    const harness = createFakeScene(input);
    const keyboardDiagnostic = vi.fn();
    const keyboardComplete = vi.fn();
    const config = createPotionRushCartridge().createGameConfig({
      input: [{ term: "brew", translation: "brew" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: keyboardComplete,
      diagnostic: keyboardDiagnostic,
      inputController: input,
      sessionMode: "playing",
    });
    const scene = config.scene as { create: (this: typeof harness.scene) => void; update: (this: typeof harness.scene, time?: number, delta?: number) => void };
    scene.create.call(harness.scene);
    input.pressed = ["Enter"];
    scene.update.call(harness.scene, 0, 16);
    expect(keyboardDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "POTION_RUSH_ACTION" }));
    input.pressed = ["Enter"];
    scene.update.call(harness.scene, 0, 16);
    expect(keyboardDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "POTION_RUSH_TERMINAL" }));
    expect(keyboardComplete).toHaveBeenCalledWith(expect.any(Object), "victory");
    expect((config.scene as { key: string }).key).toBe("potion-rush");

    const sceneController = createPotionRushController([{ term: "brew", translation: "brew" }], vi.fn());
    const sceneState = sceneController.snapshot();
    const pointerInput = createFakeInput();
    const pointerHarness = createFakeScene(pointerInput);
    const pointerDiagnostic = vi.fn();
    const pointerConfig = createPotionRushCartridge().createGameConfig({
      input: [{ term: "brew", translation: "brew" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: pointerDiagnostic,
      inputController: pointerInput,
      sessionMode: "playing",
    });
    const pointerScene = pointerConfig.scene as typeof scene;
    pointerScene.create.call(pointerHarness.scene);
    pointerInput.pointer = {
      down: false,
      released: true,
      cancelled: false,
      id: null,
      kind: "touch",
      startX: sceneState.conveyor[0]!.x,
      startY: 420,
      x: 192,
      y: 300,
    };
    pointerScene.update.call(pointerHarness.scene, 0, 0);
    expect(pointerDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "POTION_RUSH_ACTION" }));
    expect((pointerConfig.scene as { key: string }).key).toBe("potion-rush");
    expect(pointerHarness.listeners.get("shutdown")).toBeDefined();

    expect(getPotionRushPointerTarget(950, 420, 960, 540, initial)).toEqual({ kind: "none" });
    expect(getPotionRushPointerTarget(480, 350, 960, 540, initial)).toEqual({ kind: "cauldron", cauldronIndex: 1 });
  });

  it("shows a bare Thai sentence and complete English ingredients on the quiet compact board", () => {
    const input = createFakeInput();
    const harness = createFakeScene(input, 336, { width: 336, height: 733 });
    const config = createPotionRushCartridge().createGameConfig({
      input: [
        { term: "brew restoration potion", translation: "ปรุงยาฟื้นฟู" },
        { term: "serve luminous tonic", translation: "เสิร์ฟยาบำรุงเรืองแสง" },
      ],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
    });
    const scene = config.scene as { create(this: typeof harness.scene): void };

    scene.create.call(harness.scene);

    const latestText = (index: number): string => String(harness.textObjects[index]?.setText.mock.calls.at(-1)?.[0] ?? "");
    expect(latestText(1)).toBe("ปรุงยาฟื้นฟู");
    expect(harness.textObjects.slice(0, 5).map((_text, index) => latestText(index)).join(" "))
      .not.toMatch(/POTION RUSH|Brew in order|Compact shop|Potion shop|Select or drag|Keyboard:/);
    const ingredientLabels = harness.textObjects.slice(12, 18);
    const visibleIngredients = ingredientLabels.filter((text) => text.setText.mock.calls.at(-1)?.[0]);
    expect(visibleIngredients.map((text) => text.setText.mock.calls.at(-1)?.[0])).toEqual(["brew", "restoration"]);
    expect(visibleIngredients.every((text) => text.setFontSize.mock.calls.at(-1)?.[0] === 16)).toBe(true);
    expect(visibleIngredients.every((text) => text.setWordWrapWidth.mock.calls.at(-1)?.[1] === true)).toBe(true);
    expect(harness.tileSprite).not.toHaveBeenCalled();
    expect(harness.graphics.fillRect).toHaveBeenCalledWith(0, 0, 336, 733);
  });

  it("keeps native conveyor cards distinct for four supplied sentences", () => {
    const input = createFakeInput();
    const harness = createFakeScene(input, 390, { width: 390, height: 704 });
    const vocabulary = [
      { term: "mix red", translation: "ผสมสีแดง" },
      { term: "pour blue", translation: "เทสีน้ำเงิน" },
      { term: "stir gold", translation: "คนสีทอง" },
      { term: "serve green", translation: "เสิร์ฟสีเขียว" },
    ];
    const config = createPotionRushCartridge().createGameConfig({
      input: vocabulary,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
    });
    const scene = config.scene as { create(this: typeof harness.scene): void };

    scene.create.call(harness.scene);

    const ingredientLabels = harness.textObjects.slice(12, 20)
      .filter((text) => text.setText.mock.calls.at(-1)?.[0]);
    const bounds = ingredientLabels.map((text) => {
      const x = Number(text.setPosition.mock.calls.at(-1)?.[0]);
      return { left: x - 52, right: x + 52 };
    }).sort((left, right) => left.left - right.left);
    const suppliedWords = vocabulary.flatMap((item) => item.term.split(" "));

    expect(ingredientLabels.length).toBeGreaterThan(1);
    expect(ingredientLabels.map((text) => text.setText.mock.calls.at(-1)?.[0])
      .every((word) => suppliedWords.includes(String(word)))).toBe(true);
    expect(bounds.every((bound) => bound.left >= 0 && bound.right <= 390)).toBe(true);
    expect(bounds.slice(1).every((bound, index) => bound.left >= bounds[index]!.right)).toBe(true);
  });

  it("keeps conveyor spacing through one full four-sentence circulation", () => {
    const controller = createPotionRushController([
      { term: "mix", translation: "ผสม" },
      { term: "pour", translation: "เท" },
      { term: "stir", translation: "คน" },
      { term: "serve", translation: "เสิร์ฟ" },
    ], vi.fn());
    controller.placeIngredient(ingredientIdFor(controller, "pour"), 0);
    controller.dumpCauldron(0);
    const seen = new Set<string>();

    for (let frame = 0; frame < 160; frame += 1) {
      const state = controller.tick(0.05, 390);
      const visible = state.conveyor
        .filter((ingredient) => ingredient.x >= ingredient.width / 2 && ingredient.x <= 390 - ingredient.width / 2)
        .sort((left, right) => left.x - right.x);
      visible.forEach((ingredient) => seen.add(ingredient.id));
      const bounds = visible.map((ingredient) => ({
        left: ingredient.x - ingredient.width / 2,
        right: ingredient.x + ingredient.width / 2,
      }));
      expect(bounds.slice(1).every((bound, index) => bound.left >= bounds[index]!.right)).toBe(true);
    }

    expect(seen).toEqual(new Set(["ingredient:0", "ingredient:2", "ingredient:3", "ingredient:return:4"]));
  });

  it("renders brewing and completed cauldrons before terminal service", () => {
    const input = createFakeInput();
    const harness = createFakeScene(input);
    const diagnostic = vi.fn();
    const config = createPotionRushCartridge().createGameConfig({
      input: [{ term: "brew red", translation: "red brew" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic,
      inputController: input,
      sessionMode: "playing",
      composition: { profile: "compact" } as never,
    });
    const scene = config.scene as { create: (this: typeof harness.scene) => void; update: (this: typeof harness.scene, time?: number, delta?: number) => void };
    scene.create.call(harness.scene);
    input.pressed = ["Enter"];
    scene.update.call(harness.scene, 0, 16);
    input.pressed = ["Enter"];
    scene.update.call(harness.scene, 0, 16);
    input.pressed = ["Enter"];
    scene.update.call(harness.scene, 0, 16);
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "POTION_RUSH_TERMINAL" }));
    harness.listeners.get("shutdown")?.();
  });

  it("captures and restores responsive state and cleans scene resources exactly once", () => {
    const controller = createPotionRushController([{ term: "brew", translation: "brew" }], vi.fn());
    const captured = controller.capture();
    controller.placeIngredient(ingredientIdFor(controller, "brew"), 0);
    controller.restore(captured);
    expect(controller.snapshot().cauldrons[0]).toMatchObject({ state: "idle", currentWords: [] });

    const input = createFakeInput();
    const harness = createFakeScene(input);
    const config = createPotionRushCartridge().createGameConfig({
      input: [{ term: "brew", translation: "brew" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
    });
    const scene = config.scene as { create: (this: typeof harness.scene) => void };
    scene.create.call(harness.scene);
    harness.listeners.get("shutdown")?.();
    harness.listeners.get("destroy")?.();

    expect(input.cancelActiveGesture).toHaveBeenCalledOnce();
    expect(harness.destroyed).toHaveBeenCalledOnce();
    expect(harness.textObjects.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
  });
});
