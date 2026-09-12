import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";
import { cartridgeLoaders } from "./catalog.js";
import { DRAGON_FLIGHT_GATE_TRAVEL_MS, chooseGateFromPointer, createDragonFlightCartridge, createDragonFlightController, createDragonRiderCartridge } from "./dragon-flight.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";
import { createCatalogStandardEdition } from "./catalog-standard-art.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const VOCABULARY = [
  { term: "bridge", translation: "สะพาน" },
  { term: "forest", translation: "ป่า" },
  { term: "river", translation: "แม่น้ำ" },
];

function fakeInputController() {
  return {
    snapshot: () => ({
      keys: [], pressed: [],
      pointer: { down: false, released: false, cancelled: false, id: null, kind: null, startX: 0, startY: 0, x: 0, y: 0 },
      destroyed: false,
    }),
    cancelActiveGesture: vi.fn(), destroy: vi.fn(),
  };
}

function fakeSceneHost(renderedWidth = 960, textHeights: readonly number[] = [], logicalWidth = 960, logicalHeight = 540) {
  let textIndex = 0;
  const chain = () => {
    const object = {
      setOrigin: vi.fn(), setDisplaySize: vi.fn(), setDepth: vi.fn(), setPosition: vi.fn(),
      setAlpha: vi.fn(), setFrame: vi.fn(), setTilePosition: vi.fn(), setTileScale: vi.fn(), destroy: vi.fn(),
    };
    for (const method of Object.values(object)) method.mockReturnValue(object);
    return object;
  };
  const graphics = {
    clear: vi.fn(), fillStyle: vi.fn(), fillRect: vi.fn(), fillCircle: vi.fn(),
    fillRoundedRect: vi.fn(), fillTriangle: vi.fn(), lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(), setDepth: vi.fn(), destroy: vi.fn(),
  };
  for (const method of Object.values(graphics)) method.mockReturnValue(graphics);
  const text = () => {
    const object = { height: textHeights[textIndex] ?? 0, setPosition: vi.fn(), setText: vi.fn(), setFontSize: vi.fn(), setWordWrapWidth: vi.fn(), setDepth: vi.fn(), destroy: vi.fn() };
    textIndex += 1;
    for (const method of Object.values(object)) {
      if (typeof method === "function") method.mockReturnValue(object);
    }
    return object;
  };
  return {
    add: { graphics: () => graphics, text: vi.fn(text), image: vi.fn(chain), sprite: vi.fn(chain), tileSprite: vi.fn(chain) },
    events: { once: vi.fn() },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, width: renderedWidth }) } },
    scale: { width: logicalWidth, height: logicalHeight },
  };
}

describe("Dragon Flight rules", () => {
  it("shows a Thai target with two English gates", () => {
    const state = createDragonFlightController(VOCABULARY, vi.fn(), { seed: 17 }).snapshot();
    expect(state.prompt).toBe("สะพาน");
    expect(["bridge", "forest", "river"]).toContain(state.gates.left);
    expect(["bridge", "forest", "river"]).toContain(state.gates.right);
    expect([state.gates.left, state.gates.right]).toContain("bridge");
    expect([state.gates.leftItemPosition, state.gates.rightItemPosition]).toContain(0);
  });

  it("uses stable seeded placement without fixed target-index alternation", () => {
    const sides = [11, 12, 13, 14, 15].map((seed) => createDragonFlightController(VOCABULARY, vi.fn(), { seed }).snapshot().gates.correctChoice);
    expect(new Set(sides).size).toBe(2);
    expect(createDragonFlightController(VOCABULARY, vi.fn(), { seed: 12 }).snapshot().gates)
      .toEqual(createDragonFlightController(VOCABULARY, vi.fn(), { seed: 12 }).snapshot().gates);
  });

  it("treats both gates as correct without a distinct English distractor", () => {
    const single = createDragonFlightController([{ term: "bridge", translation: "สะพาน" }], vi.fn(), { seed: 5 });
    expect(single.snapshot().gates).toMatchObject({ left: "bridge", right: "bridge", correctChoices: ["left", "right"] });
    expect(single.choose("right")).toMatchObject({ accepted: true, correct: true });
  });

  it("keeps duplicate English meanings truthful", () => {
    const controller = createDragonFlightController([
      { term: "bridge", translation: "สะพาน" },
      { term: "overpass", translation: "สะพาน" },
    ], vi.fn(), { seed: 6 });
    expect(controller.snapshot().gates).toMatchObject({
      left: "bridge", right: "overpass", leftItemPosition: 0, rightItemPosition: 1, correctChoices: ["left", "right"],
    });
  });

  it("accepts one deliberate selection per moving-gate encounter", () => {
    const controller = createDragonFlightController(VOCABULARY, vi.fn(), { seed: 9, gateTravelMs: 650 });
    const first = controller.snapshot();
    const correct = controller.snapshot().gates.correctChoice;
    expect(controller.choose(correct)).toMatchObject({ accepted: true, correct: true });
    expect(controller.snapshot()).toMatchObject({ targetIndex: 0, pendingTargetIndex: 1, gates: first.gates });
    expect(controller.choose(correct)).toMatchObject({ accepted: false });
    controller.advance(700);
    expect(controller.snapshot()).toMatchObject({ targetIndex: 1, pendingTargetIndex: null });
    expect(controller.choose(controller.snapshot().gates.correctChoice).accepted).toBe(true);
  });

  it("grows the flock after a correct choice and recovers after a wrong choice", () => {
    const controller = createDragonFlightController(VOCABULARY, vi.fn(), { seed: 21, gateTravelMs: 650 });
    controller.choose(controller.snapshot().gates.correctChoice);
    expect(controller.snapshot().flockSize).toBe(2);
    controller.advance(700);
    const next = controller.snapshot();
    controller.choose(next.gates.correctChoice === "left" ? "right" : "left");
    expect(controller.snapshot()).toMatchObject({ flockSize: 1, targetIndex: 1, totalAttempts: 2 });
  });

  it("moves from timed flight to one guardian encounter and emits one five-field result", () => {
    const complete = vi.fn();
    const controller = createDragonFlightController(VOCABULARY, complete, { seed: 4, durationMs: 1_000, guardianDurationMs: 500 });
    controller.choose(controller.snapshot().gates.correctChoice);
    controller.advance(1_000);
    expect(controller.snapshot()).toMatchObject({ phase: "guardian", guardianProgress: 0 });
    controller.advance(500);
    controller.advance(500);
    expect(controller.snapshot().phase).toBe("complete");
    expect(complete).toHaveBeenCalledOnce();
    expect(Object.keys(gameResultsSchema.parse(complete.mock.calls[0]?.[0])).sort()).toEqual(["accuracy", "correctAnswers", "score", "totalAttempts", "xp"].sort());
  });

  it("changes phase at exact timer boundaries", () => {
    const controller = createDragonFlightController(VOCABULARY, vi.fn(), { durationMs: 1_000, guardianDurationMs: 500 });
    controller.advance(999);
    expect(controller.snapshot()).toMatchObject({ phase: "gate", timeRemainingMs: 1 });
    controller.advance(1);
    expect(controller.snapshot()).toMatchObject({ phase: "guardian", guardianProgress: 0 });
    controller.advance(499);
    expect(controller.snapshot().phase).toBe("guardian");
    controller.advance(1);
    expect(controller.snapshot()).toMatchObject({ phase: "complete", guardianProgress: 1 });
  });

  it("resolves guardian health from flock strength", () => {
    const strong = createDragonFlightController(VOCABULARY, vi.fn(), {
      seed: 8, durationMs: 500, gateTravelMs: 100, guardianDurationMs: 400,
    });
    strong.choose(strong.snapshot().gates.correctChoice);
    strong.advance(100);
    strong.choose(strong.snapshot().gates.correctChoice);
    strong.advance(400);
    expect(strong.snapshot()).toMatchObject({ phase: "guardian", flockSize: 3, guardianHealth: 6 });
    strong.advance(400);
    expect(strong.snapshot()).toMatchObject({ phase: "complete", outcome: "victory", guardianHealth: 0 });

    const weak = createDragonFlightController(VOCABULARY, vi.fn(), { durationMs: 100, guardianDurationMs: 400 });
    weak.advance(500);
    expect(weak.snapshot()).toMatchObject({ phase: "complete", outcome: "defeat", flockSize: 0, guardianHealth: 5 });
  });

  it("creates independent replay sessions with one completion each", () => {
    const firstComplete = vi.fn();
    const secondComplete = vi.fn();
    const first = createDragonFlightController(VOCABULARY, firstComplete, { seed: 3, durationMs: 10, guardianDurationMs: 10 });
    const second = createDragonFlightController(VOCABULARY, secondComplete, { seed: 3, durationMs: 10, guardianDurationMs: 10 });
    expect(first.snapshot().gates).toEqual(second.snapshot().gates);
    first.advance(20);
    first.advance(20);
    second.advance(20);
    expect(firstComplete).toHaveBeenCalledOnce();
    expect(secondComplete).toHaveBeenCalledOnce();
  });

  it("captures and restores timer, encounter, flock, and selection state", () => {
    const controller = createDragonFlightController(VOCABULARY, vi.fn(), { seed: 31, durationMs: 5_000, gateTravelMs: 650 });
    controller.advance(900);
    controller.choose(controller.snapshot().gates.correctChoice);
    const captured = controller.capture();
    controller.advance(2_000);
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);
    expect(controller.choose(captured.gates.correctChoice).accepted).toBe(false);
  });
});

describe("Dragon Flight public cartridges", () => {
  it("keeps Dragon Flight and Dragon Rider as separate identities on one engine", async () => {
    expect((await cartridgeLoaders["dragon-flight"]()).manifest.id).toBe("dragon-flight");
    expect((await cartridgeLoaders["dragon-rider"]()).manifest.id).toBe("dragon-rider");
    expect(createDragonFlightCartridge().manifest.title).toBe("Dragon Flight");
    expect(createDragonRiderCartridge().manifest.title).toBe("Dragon Rider");
  });

  it("creates a valid responsive Phaser scene", () => {
    const config = createDragonFlightCartridge().createGameConfig({ input: VOCABULARY, edition: PHASE3_RUNTIME_EDITION, complete: vi.fn(), diagnostic: vi.fn(), inputController: fakeInputController(), seed: 11 });
    expect(config).toMatchObject({ width: 960, height: 540, render: { antialias: false, pixelArt: true } });
    expect(config.scene).toMatchObject({ key: "dragon-flight" });
  });

  it("plays numbered English gate audio separately and scores only physical traversal after playback", () => {
    let input = {
      ...fakeInputController().snapshot(),
      keys: [] as readonly string[],
      pressed: [] as readonly string[],
    };
    const inputController = {
      snapshot: () => input,
      cancelActiveGesture: vi.fn(),
      destroy: vi.fn(),
    };
    const answerAudio = {
      setQuestion: vi.fn(),
      getChoiceSnapshot: vi.fn(() => ({ status: "idle" })),
      playChoice: vi.fn(async () => undefined),
      canConfirmChoice: vi.fn(() => false),
      confirmChoice: vi.fn(),
      cancel: vi.fn(),
    };
    const config = createDragonFlightCartridge().createGameConfig({
      input: VOCABULARY,
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      answerAudio: answerAudio as never,
      seed: 11,
    });
    const scene = config.scene as {
      create(this: unknown): void;
      update(this: unknown, time: number, delta: number): void;
      extend: { apkCaptureResponsiveState(): ReturnType<ReturnType<typeof createDragonFlightController>["snapshot"]> };
    };
    const host = fakeSceneHost();
    scene.create.call(host);
    const initial = scene.extend.apkCaptureResponsiveState();

    expect(answerAudio.setQuestion).toHaveBeenCalledWith(0, [initial.gates.leftItemPosition, initial.gates.rightItemPosition]);
    const rendered = host.add.text.mock.results.flatMap(({ value }) => value.setText.mock.calls.map(([text]) => text));
    expect(rendered).toEqual(expect.arrayContaining([initial.prompt, "1", "2", "1 🔊", "2 🔊"]));

    input = { ...input, pointer: { ...input.pointer, released: true, x: 291, y: 178 } };
    scene.update.call(host, 0, 0);
    expect(answerAudio.playChoice).toHaveBeenCalledWith(0, initial.gates.leftItemPosition);
    expect(scene.extend.apkCaptureResponsiveState().totalAttempts).toBe(0);

    input = { ...input, pressed: [initial.gates.correctChoice === "left" ? "KeyA" : "KeyD"], pointer: { ...input.pointer, released: false } };
    scene.update.call(host, 0, 0);
    expect(answerAudio.confirmChoice).not.toHaveBeenCalled();
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      selectedGate: initial.gates.correctChoice,
      totalAttempts: 0,
    });

    answerAudio.canConfirmChoice.mockReturnValue(true);
    answerAudio.confirmChoice.mockReturnValue({ completedQuestion: true });
    input = { ...input, pressed: [] };
    scene.update.call(host, 0, DRAGON_FLIGHT_GATE_TRAVEL_MS);
    expect(answerAudio.confirmChoice).toHaveBeenCalledWith(
      0,
      initial.gates.correctChoice === "left" ? initial.gates.leftItemPosition : initial.gates.rightItemPosition,
    );
    expect(scene.extend.apkCaptureResponsiveState().totalAttempts).toBe(1);
    const next = scene.extend.apkCaptureResponsiveState();
    expect(answerAudio.setQuestion).toHaveBeenLastCalledWith(
      next.targetIndex,
      [next.gates.leftItemPosition, next.gates.rightItemPosition],
    );
  });

  it("keeps the Thai prompt and English labels above portal artwork", () => {
    const cartridge = createDragonFlightCartridge();
    const edition = createCatalogStandardEdition([], "/assets/apk/standard-pack-qc/", "dragon-flight");
    const config = cartridge.createGameConfig({ input: VOCABULARY, edition, complete: vi.fn(), diagnostic: vi.fn(), inputController: fakeInputController(), seed: 11 });
    const scene = config.scene as { create(this: unknown): void; update(this: unknown, time: number, delta: number): void };
    const host = fakeSceneHost();
    scene.create.call(host);
    const imageDepths = [...host.add.image.mock.results, ...host.add.sprite.mock.results]
      .flatMap(({ value }) => value.setDepth.mock.calls.map(([depth]) => Number(depth)));
    expect(imageDepths.length).toBeGreaterThan(0);
    const textObjects = host.add.text.mock.results.map(({ value }) => value);
    const prompt = textObjects.find((text) => text.setText.mock.calls.some(([value]) => value === "สะพาน"));
    const choices = textObjects.filter((text) => text.setText.mock.calls.some(([value]) => VOCABULARY.some(({ term }) => term === value)));
    expect(prompt).toBeDefined();
    expect(choices).toHaveLength(2);
    for (const text of [prompt!, ...choices]) {
      expect(Number(text.setDepth.mock.lastCall?.[0])).toBeGreaterThan(Math.max(...imageDepths));
    }
    const promptY = Number(prompt!.setPosition.mock.lastCall?.[1]);
    for (const choice of choices) {
      expect(Number(choice.setPosition.mock.lastCall?.[1])).toBeGreaterThan(promptY + 48);
    }
  });

  it("keeps the Thai target and two English lanes legible on a 340px portrait host", () => {
    const cartridge = createDragonFlightCartridge();
    const edition = createCatalogStandardEdition([], "/assets/apk/standard-pack-qc/", "dragon-flight");
    const config = cartridge.createGameConfig({ input: VOCABULARY, edition, complete: vi.fn(), diagnostic: vi.fn(), inputController: fakeInputController(), seed: 11 });
    const scene = config.scene as { create(this: unknown): void };
    const host = fakeSceneHost(336);
    scene.create.call(host);
    const textObjects = host.add.text.mock.results.map(({ value }) => value);
    const prompt = textObjects.find((text) => text.setText.mock.calls.some(([value]) => value === "สะพาน"));
    const choices = textObjects.filter((text) => text.setText.mock.calls.some(([value]) => VOCABULARY.some(({ term }) => term === value)));
    expect(prompt?.setFontSize).toHaveBeenLastCalledWith(52);
    expect(choices).toHaveLength(2);
    for (const choice of choices) expect(choice.setFontSize).toHaveBeenLastCalledWith(46);
    expect(textObjects.some((text) => text.setText.mock.calls.some(([value]) => typeof value === "string" && /choose|fly|gate/iu.test(value)))).toBe(false);
  });

  it("preserves Dragon Flight text sizes on a wide host", () => {
    const config = createDragonFlightCartridge().createGameConfig({ input: VOCABULARY, edition: PHASE3_RUNTIME_EDITION, complete: vi.fn(), diagnostic: vi.fn(), inputController: fakeInputController(), seed: 11 });
    const scene = config.scene as { create(this: unknown): void };
    const host = fakeSceneHost();
    scene.create.call(host);
    const textObjects = host.add.text.mock.results.map(({ value }) => value);
    const prompt = textObjects.find((text) => text.setText.mock.calls.some(([value]) => value === "สะพาน"));
    const choices = textObjects.filter((text) => text.setText.mock.calls.some(([value]) => VOCABULARY.some(({ term }) => term === value)));
    expect(prompt?.setFontSize).toHaveBeenLastCalledWith(44);
    for (const choice of choices) expect(choice.setFontSize).toHaveBeenLastCalledWith(19);
  });

  it("keeps long Thai and English labels complete within compact lane cards", () => {
    const longVocabulary = [
      { term: "environmental conservation", translation: "การอนุรักษ์สิ่งแวดล้อม" },
      { term: "responsible consumption", translation: "การบริโภคอย่างรับผิดชอบ" },
    ];
    const edition = createCatalogStandardEdition([], "/assets/apk/standard-pack-qc/", "dragon-flight");
    const config = createDragonFlightCartridge().createGameConfig({ input: longVocabulary, edition, complete: vi.fn(), diagnostic: vi.fn(), inputController: fakeInputController(), seed: 11 });
    const scene = config.scene as { create(this: unknown): void };
    const host = fakeSceneHost(336, [0, 60, 0, 138, 92]);
    scene.create.call(host);
    const textObjects = host.add.text.mock.results.map(({ value }) => value);
    const prompt = textObjects.find((text) => text.setText.mock.calls.some(([value]) => value === longVocabulary[0]?.translation));
    const choices = textObjects.filter((text) => text.setText.mock.calls.some(([value]) => longVocabulary.some(({ term }) => term === value)));
    expect(prompt?.setWordWrapWidth).toHaveBeenLastCalledWith(896, true);
    expect(choices).toHaveLength(2);
    for (const choice of choices) {
      expect(choice.setFontSize).toHaveBeenLastCalledWith(46);
      expect(choice.setWordWrapWidth).toHaveBeenLastCalledWith(402);
    }
    expect(host.add.graphics().fillRoundedRect.mock.calls.filter(([, , cardWidth, cardHeight]) => cardWidth === 426 && cardHeight === 154)).toHaveLength(2);
  });

  it("keeps complete readable labels on a native 336px compact scene", () => {
    const longVocabulary = [
      { term: "environmental conservation", translation: "การอนุรักษ์สิ่งแวดล้อม" },
      { term: "responsible consumption", translation: "การบริโภคอย่างรับผิดชอบ" },
    ];
    const edition = createCatalogStandardEdition([], "/assets/apk/standard-pack-qc/", "dragon-flight");
    const config = createDragonFlightCartridge().createGameConfig({ input: longVocabulary, edition, complete: vi.fn(), diagnostic: vi.fn(), inputController: fakeInputController(), seed: 11 });
    const scene = config.scene as { create(this: unknown): void; update(this: unknown, time: number, delta: number): void };
    const host = fakeSceneHost(336, [0, 60, 0, 138, 92], 336, 733);
    scene.create.call(host);
    const textObjects = host.add.text.mock.results.map(({ value }) => value);
    const prompt = textObjects.find((text) => text.setText.mock.calls.some(([value]) => value === longVocabulary[0]?.translation));
    const choices = textObjects.filter((text) => text.setText.mock.calls.some(([value]) => longVocabulary.some(({ term }) => term === value)));
    expect(prompt?.setFontSize).toHaveBeenLastCalledWith(22);
    expect(prompt?.setWordWrapWidth).toHaveBeenLastCalledWith(288, true);
    const promptUpdates = prompt!.setText.mock.calls.length;
    host.add.graphics().fillRoundedRect.mockClear();
    scene.update.call(host, 0, 16);
    expect(prompt?.setText).toHaveBeenCalledTimes(promptUpdates);
    expect(choices).toHaveLength(2);
    for (const choice of choices) {
      expect(choice.setFontSize).toHaveBeenLastCalledWith(19);
      expect(choice.setWordWrapWidth).toHaveBeenLastCalledWith(116);
    }
    expect(host.add.graphics().fillRoundedRect.mock.calls.filter(([, , cardWidth, cardHeight]) => cardWidth === 140 && cardHeight === 154)).toHaveLength(2);
    expect(chooseGateFromPointer(80, 336)).toBe("left");
    expect(chooseGateFromPointer(256, 336)).toBe("right");
  });

  it("keeps the landscape visible below one sparse cloud layer", () => {
    const cartridge = createDragonFlightCartridge();
    const edition = createCatalogStandardEdition([], "/assets/apk/standard-pack-qc/", "dragon-flight");
    const config = cartridge.createGameConfig({ input: VOCABULARY, edition, complete: vi.fn(), diagnostic: vi.fn(), inputController: fakeInputController(), seed: 11 });
    const scene = config.scene as { create(this: unknown): void };
    const host = fakeSceneHost();
    scene.create.call(host);
    const [, sky, clouds, landscape] = host.add.tileSprite.mock.results.map(({ value }) => value);
    expect({
      landscapeDepth: landscape?.setDepth.mock.lastCall?.[0],
      landscapeAlpha: landscape?.setAlpha.mock.lastCall?.[0],
      skyAlpha: sky?.setAlpha.mock.lastCall?.[0],
      cloudAlpha: clouds?.setAlpha.mock.lastCall?.[0],
      cloudScale: clouds?.setTileScale.mock.lastCall,
    }).toEqual({ landscapeDepth: -34, landscapeAlpha: 1, skyAlpha: 0, cloudAlpha: 0.3, cloudScale: [4, 4] });
  });

  it("freezes timed flight outside the playing session", () => {
    const config = createDragonFlightCartridge().createGameConfig({
      input: VOCABULARY, edition: PHASE3_RUNTIME_EDITION, complete: vi.fn(), diagnostic: vi.fn(),
      inputController: fakeInputController(), seed: 11, sessionMode: "tutorial",
    });
    const scene = config.scene as {
      create(this: unknown): void;
      update(this: unknown, time: number, delta: number): void;
      extend: { apkCaptureResponsiveState(): { timeRemainingMs: number } };
    };
    const host = fakeSceneHost();
    scene.create.call(host);
    const before = scene.extend.apkCaptureResponsiveState().timeRemainingMs;
    scene.update.call(host, 0, 5_000);
    expect(scene.extend.apkCaptureResponsiveState().timeRemainingMs).toBe(before);
  });

  it("maps pointer regions and stays independent from applications and servers", () => {
    expect(chooseGateFromPointer(100, 960)).toBe("left");
    expect(chooseGateFromPointer(860, 960)).toBe("right");
    const source = readFileSync(resolve(REPO_ROOT, "packages/game-cartridges/src/dragon-flight.ts"), "utf8");
    expect(source).not.toMatch(/(?:from|import\()\s*["'](?:next(?:\/|["'])|@reading-advantage\/(?:db|domain|api)(?:\/|["']))/u);
    expect(source).not.toMatch(/(?:drizzle|firebase)/iu);
    expect(source).not.toMatch(/from\s+["']phaser["']/u);
  });
});
