import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import { cartridgeLoaders, cartridgeCatalog } from "./catalog.js";
import {
  chooseGateFromPointer,
  createDragonFlightCartridge,
  createDragonFlightController,
} from "./dragon-flight.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const VOCABULARY = [
  { term: "brave", translation: "courageous" },
  { term: "swift", translation: "fast" },
];

function fakeInputController() {
  return {
    snapshot: () => ({
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
    }),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
  };
}

function runtimeInputSnapshot(pressed: readonly string[] = []) {
  return {
    keys: [],
    pressed,
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
}

function fakeRuntimeScene() {
  const graphics = {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    fillCircle: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillTriangle: vi.fn(),
    lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(),
    destroy: vi.fn(),
  };
  for (const method of [
    graphics.clear,
    graphics.fillStyle,
    graphics.fillRect,
    graphics.fillCircle,
    graphics.fillRoundedRect,
    graphics.fillTriangle,
    graphics.lineStyle,
    graphics.strokeRoundedRect,
  ]) method.mockReturnValue(graphics);

  const text = () => {
    const value = {
      setPosition: vi.fn(),
      setText: vi.fn(),
      destroy: vi.fn(),
    };
    value.setPosition.mockReturnValue(value);
    value.setText.mockReturnValue(value);
    return value;
  };

  return {
    add: { graphics: () => graphics, text },
    events: { once: vi.fn() },
    scale: { width: 960, height: 540 },
  };
}

describe("Dragon Flight public cartridge", () => {
  it("resolves from the public catalog through its dynamic loader", async () => {
    expect(cartridgeCatalog[0]?.id).toBe("dragon-flight");
    expect(cartridgeCatalog).toHaveLength(28);
    const cartridge = await cartridgeLoaders["dragon-flight"]();
    expect(cartridge.manifest.id).toBe("dragon-flight");
    expect(cartridge.manifest.inputMode).toBe("vocabulary");
    expect(cartridgeCatalog[0]?.requiredAssetBindings).toEqual([]);
  });

  it("creates a valid Phaser configuration from the stable vocabulary array", async () => {
    const cartridge = await cartridgeLoaders["dragon-flight"]();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const config = cartridge.createGameConfig({
      input: VOCABULARY,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic,
      inputController: fakeInputController(),
      seed: 11,
    });

    expect(config).toMatchObject({
      width: 960,
      height: 540,
      render: { antialias: false, pixelArt: true },
    });
    expect(config.scene).toBeTypeOf("object");
    expect(config.scene).toMatchObject({ key: "dragon-flight" });
    expect((config.scene as { create?: unknown }).create).toBeTypeOf("function");
    expect((config.scene as { update?: unknown }).update).toBeTypeOf("function");
    expect(complete).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "DRAGON_FLIGHT_READY" }));
  });

  it("forwards victory from a completing createGameConfig scene", async () => {
    const complete = vi.fn();
    const inputController = {
      ...fakeInputController(),
      snapshot: vi.fn()
        .mockReturnValueOnce(runtimeInputSnapshot(["ArrowLeft"]))
        .mockReturnValueOnce(runtimeInputSnapshot(["ArrowRight"])),
    };
    const config = createDragonFlightCartridge().createGameConfig({
      input: VOCABULARY,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
      seed: 11,
    });
    const scene = config.scene as {
      create?: (this: unknown) => void;
      update?: (this: unknown, time: number, delta: number) => void;
    };
    const host = fakeRuntimeScene();

    scene.create?.call(host);
    scene.update?.call(host, 0, 16);
    scene.update?.call(host, 16, 16);

    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 2 }), "victory");
  });

  it("keeps an incorrect gate on the same target and advances on the correct gate", () => {
    const controller = createDragonFlightController(VOCABULARY, vi.fn());
    const initial = controller.snapshot();
    const wrong: "left" | "right" = initial.gates.correctChoice === "left" ? "right" : "left";

    const incorrect = controller.choose(wrong);
    expect(incorrect.correct).toBe(false);
    expect(incorrect.progressed).toBe(false);
    expect(incorrect.snapshot.targetIndex).toBe(0);
    expect(incorrect.snapshot.totalAttempts).toBe(1);

    const correct = controller.choose(initial.gates.correctChoice);
    expect(correct.correct).toBe(true);
    expect(correct.progressed).toBe(true);
    expect(correct.snapshot.targetIndex).toBe(1);
    expect(correct.snapshot.correctAnswers).toBe(1);
  });

  it("emits one valid terminal result even when completion is attempted again", () => {
    const complete = vi.fn();
    const controller = createDragonFlightController(VOCABULARY, complete);

    const first = controller.choose(controller.snapshot().gates.correctChoice);
    const second = controller.choose(controller.snapshot().gates.correctChoice);
    const third = controller.choose("left");

    expect(first.completed).toBe(false);
    expect(second.completed).toBe(true);
    expect(third.accepted).toBe(false);
    expect(complete).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(complete.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 1,
      correctAnswers: 2,
      totalAttempts: 2,
      score: 200,
    });
  });

  it("maps both pointer regions without importing application or server code", () => {
    expect(chooseGateFromPointer(100, 960)).toBe("left");
    expect(chooseGateFromPointer(860, 960)).toBe("right");

    const source = readFileSync(resolve(REPO_ROOT, "packages/game-cartridges/src/dragon-flight.ts"), "utf8");
    expect(source).not.toMatch(/(?:from|import\()\s*["'](?:next(?:\/|["'])|@reading-advantage\/(?:db|domain|api)(?:\/|["']))/u);
    expect(source).not.toMatch(/(?:drizzle|firebase)/iu);
    expect(source).not.toMatch(/from\s+["']phaser["']/u);
  });

  it("exposes the same cartridge identity from the direct factory", () => {
    expect(createDragonFlightCartridge().manifest).toMatchObject({
      id: "dragon-flight",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
    });
  });

  it("fills small-deck gate labels from real translations instead of English placeholders", () => {
    const oneItem = createDragonFlightController([{ term: "brave", translation: "valiente" }], vi.fn());
    const twoItem = createDragonFlightController(VOCABULARY, vi.fn());
    const translations = new Set(VOCABULARY.map((item) => item.translation));

    expect([oneItem.snapshot().gates.left, oneItem.snapshot().gates.right].every((label) => label === "valiente")).toBe(true);
    expect(`${oneItem.snapshot().gates.left} ${oneItem.snapshot().gates.right}`).not.toMatch(/Storm cloud/u);
    expect(translations.has(twoItem.snapshot().gates.left)).toBe(true);
    expect(translations.has(twoItem.snapshot().gates.right)).toBe(true);
  });
});
