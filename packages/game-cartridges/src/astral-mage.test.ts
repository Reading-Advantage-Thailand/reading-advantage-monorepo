import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ASTRAL_MAGE_KEYBOARD_BINDINGS,
  chooseAstralMageCrystalFromPointer,
  createAstralMageCartridge,
  createAstralMageController,
  getAstralMageCrystalPoints,
} from "./astral-mage.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SENTENCES = [
  { term: "Stars guide us", translation: "Las estrellas nos guían" },
  { term: "Runes sing", translation: "Las runas cantan" },
];

function createInputController() {
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

function runtimeInputSnapshot(pointer: { readonly x: number; readonly y: number }) {
  return {
    keys: [],
    pressed: [],
    pointer: {
      down: false,
      released: true,
      cancelled: false,
      id: 1,
      kind: "mouse" as const,
      startX: pointer.x,
      startY: pointer.y,
      x: pointer.x,
      y: pointer.y,
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

function completeSession(controller: ReturnType<typeof createAstralMageController>): void {
  while (controller.snapshot().phase !== "complete") {
    const targetId = controller.snapshot().nextCrystalId;
    if (!targetId) throw new Error("Astral Mage has no remaining crystal target");
    controller.shoot(targetId);
  }
}

describe("Astral Mage public cartridge", () => {
  it("keeps an incorrect crystal in place and advances through ordered sentence words", () => {
    const controller = createAstralMageController(SENTENCES, vi.fn());
    const initial = controller.snapshot();
    const wrongId = initial.crystals.find((crystal) => crystal.id !== initial.nextCrystalId)?.id;
    if (!wrongId) throw new Error("Astral Mage test input needs a wrong crystal");

    const wrong = controller.shoot(wrongId);
    expect(wrong.correct).toBe(false);
    expect(wrong.progressed).toBe(false);
    expect(wrong.snapshot.sentenceIndex).toBe(0);
    expect(wrong.snapshot.wordIndex).toBe(0);
    expect(wrong.snapshot.totalAttempts).toBe(1);

    const firstCorrect = controller.shoot(initial.nextCrystalId!);
    expect(firstCorrect.correct).toBe(true);
    expect(firstCorrect.progressed).toBe(true);
    expect(firstCorrect.snapshot.wordIndex).toBe(1);
    expect(firstCorrect.snapshot.correctAnswers).toBe(1);

    controller.shoot(controller.snapshot().nextCrystalId!);
    const finalWord = controller.shoot(controller.snapshot().nextCrystalId!);
    expect(finalWord.ritualCompleted).toBe(true);
    expect(finalWord.snapshot.sentenceIndex).toBe(1);
    expect(finalWord.snapshot.wordIndex).toBe(0);
  });

  it("emits one valid result after all sentence crystals are bound", () => {
    const complete = vi.fn();
    const controller = createAstralMageController(SENTENCES, complete);

    completeSession(controller);
    const afterCompletion = controller.shoot("word:0:0");

    expect(afterCompletion.accepted).toBe(false);
    expect(complete).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(complete.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 1,
      correctAnswers: 5,
      totalAttempts: 5,
      score: 500,
    });
  });

  it("seals the controller during scene cleanup without completing", () => {
    const complete = vi.fn();
    const controller = createAstralMageController(SENTENCES, complete);

    controller.destroy();

    expect(controller.shoot("word:0:0")).toMatchObject({ accepted: false });
    expect(complete).not.toHaveBeenCalled();
  });

  it("maps keyboard and pointer/touch controls without an engine import", () => {
    const controller = createAstralMageController(SENTENCES, vi.fn());
    const crystals = controller.snapshot().crystals;
    const points = getAstralMageCrystalPoints(crystals, 960, 540);

    expect(ASTRAL_MAGE_KEYBOARD_BINDINGS).toMatchObject({
      ArrowLeft: "move-left",
      ArrowUp: "move-up",
      Space: "confirm",
    });
    expect(chooseAstralMageCrystalFromPointer(points[0]!.x, points[0]!.y, crystals, 960, 540)).toBe(points[0]!.id);

    const source = readFileSync(resolve(REPO_ROOT, "packages/game-cartridges/src/astral-mage.ts"), "utf8");
    expect(source).not.toMatch(/(?:from|import\()\s*["'](?:next(?:\/|["'])|@reading-advantage\/(?:db|domain|api)(?:\/|["']))/u);
    expect(source).not.toMatch(/(?:drizzle|firebase)/iu);
    expect(source).not.toMatch(/from\s+["']phaser["']/u);
  });

  it("creates a responsive runtime scene with structured diagnostics", () => {
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const config = createAstralMageCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic,
      inputController: createInputController(),
      seed: 41,
    });

    expect(config).toMatchObject({ width: 960, height: 540 });
    expect(config.scene).toMatchObject({
      key: "astral-mage",
      create: expect.any(Function),
      update: expect.any(Function),
      extend: {
        apkCaptureResponsiveState: expect.any(Function),
        apkRestoreResponsiveState: expect.any(Function),
        apkRecompose: expect.any(Function),
      },
    });
    expect(complete).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "ASTRAL_MAGE_READY" }));
  });

  it("forwards victory from a completing createGameConfig scene", () => {
    const complete = vi.fn();
    const crystal = getAstralMageCrystalPoints(
      [{ id: "word:0:0", label: "Stars" }, { id: "echo:0", label: "Runes" }],
      960,
      540,
    )[0]!;
    const inputController = {
      ...createInputController(),
      snapshot: vi.fn(() => runtimeInputSnapshot(crystal)),
    };
    const config = createAstralMageCartridge().createGameConfig({
      input: [{ term: "Stars", translation: "Estrellas" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
      seed: 41,
    });
    const scene = config.scene as {
      create?: (this: unknown) => void;
      update?: (this: unknown, time: number, delta: number) => void;
    };
    const host = fakeRuntimeScene();

    scene.create?.call(host);
    scene.update?.call(host, 0, 16);

    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 1 }), "victory");
  });

  it("labels decoy crystals from sentence words instead of English placeholders", () => {
    const oneWord = createAstralMageController([{ term: "Stars", translation: "Estrellas" }], vi.fn());
    const many = createAstralMageController(SENTENCES, vi.fn());
    const words = new Set(SENTENCES.flatMap((item) => item.term.split(/\s+/u)));

    expect(oneWord.snapshot().crystals.map((crystal) => crystal.label)).toEqual(["Stars", "Stars"]);
    expect(many.snapshot().crystals.every((crystal) => words.has(crystal.label))).toBe(true);
    expect(many.snapshot().crystals.map((crystal) => crystal.label).join(" ")).not.toMatch(/Void echo/u);
  });
});
