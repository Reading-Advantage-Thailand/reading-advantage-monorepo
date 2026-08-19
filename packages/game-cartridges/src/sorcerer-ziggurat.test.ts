import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  chooseZigguratDirectionFromPointer,
  createSorcererZigguratCartridge,
  createSorcererZigguratController,
  SORCERER_ZIGGURAT_KEYBOARD_BINDINGS,
} from "./sorcerer-ziggurat.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SENTENCES = [
  { term: "Ancient runes awaken", translation: "Las runas antiguas despiertan" },
  { term: "Magic lights paths", translation: "La magia ilumina caminos" },
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

function wrongDirection(direction: "left" | "forward" | "right"): "left" | "forward" | "right" {
  return direction === "left" ? "right" : "left";
}

function completeSession(controller: ReturnType<typeof createSorcererZigguratController>): void {
  while (controller.snapshot().phase !== "complete") {
    controller.step(controller.snapshot().runes.correctDirection);
  }
}

describe("Sorcerer's Ziggurat public cartridge", () => {
  it("rejects a wrong rune without climbing and advances one ritual step at a time", () => {
    const controller = createSorcererZigguratController(SENTENCES, vi.fn(), 23);
    const initial = controller.snapshot();

    const wrong = controller.step(wrongDirection(initial.runes.correctDirection));
    expect(wrong.correct).toBe(false);
    expect(wrong.progressed).toBe(false);
    expect(wrong.snapshot.sentenceIndex).toBe(0);
    expect(wrong.snapshot.wordIndex).toBe(0);
    expect(wrong.snapshot.totalAttempts).toBe(1);

    const correct = controller.step(initial.runes.correctDirection);
    expect(correct.correct).toBe(true);
    expect(correct.progressed).toBe(true);
    expect(correct.snapshot.wordIndex).toBe(1);
    expect(correct.snapshot.correctAnswers).toBe(1);
  });

  it("completes both rituals once with a valid result", () => {
    const complete = vi.fn();
    const controller = createSorcererZigguratController(SENTENCES, complete, 7);

    completeSession(controller);
    const afterCompletion = controller.step("left");

    expect(afterCompletion.accepted).toBe(false);
    expect(complete).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(complete.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 1,
      correctAnswers: 6,
      totalAttempts: 6,
      score: 600,
    });
  });

  it("seals the controller during scene cleanup without completing", () => {
    const complete = vi.fn();
    const controller = createSorcererZigguratController(SENTENCES, complete, 7);

    controller.destroy();

    expect(controller.step("left")).toMatchObject({ accepted: false });
    expect(complete).not.toHaveBeenCalled();
  });

  it("maps keyboard and pointer/touch rune choices without an engine import", () => {
    expect(SORCERER_ZIGGURAT_KEYBOARD_BINDINGS).toMatchObject({
      ArrowLeft: "move-left",
      ArrowUp: "move-up",
      ArrowRight: "move-right",
    });
    expect(chooseZigguratDirectionFromPointer(100, 960)).toBe("left");
    expect(chooseZigguratDirectionFromPointer(480, 960)).toBe("forward");
    expect(chooseZigguratDirectionFromPointer(860, 960)).toBe("right");

    const source = readFileSync(resolve(REPO_ROOT, "packages/game-cartridges/src/sorcerer-ziggurat.ts"), "utf8");
    expect(source).not.toMatch(/(?:from|import\()\s*["'](?:next(?:\/|["'])|@reading-advantage\/(?:db|domain|api)(?:\/|["']))/u);
    expect(source).not.toMatch(/(?:drizzle|firebase)/iu);
    expect(source).not.toMatch(/from\s+["']phaser["']/u);
  });

  it("creates a responsive runtime scene with structured diagnostics", () => {
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const config = createSorcererZigguratCartridge().createGameConfig({
      input: SENTENCES,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic,
      inputController: createInputController(),
      seed: 19,
    });

    expect(config).toMatchObject({ width: 960, height: 540 });
    expect(config.scene).toMatchObject({
      key: "sorcerer-ziggurat",
      create: expect.any(Function),
      update: expect.any(Function),
      extend: {
        apkCaptureResponsiveState: expect.any(Function),
        apkRestoreResponsiveState: expect.any(Function),
        apkRecompose: expect.any(Function),
      },
    });
    expect(complete).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ code: "SORCERER_ZIGGURAT_READY" }));
  });

  it("forwards victory from a completing createGameConfig scene", () => {
    const complete = vi.fn();
    const config = createSorcererZigguratCartridge().createGameConfig({
      input: [{ term: "Awaken", translation: "Despertar" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: {
        ...createInputController(),
        snapshot: vi.fn(() => runtimeInputSnapshot(["ArrowLeft"])),
      },
      seed: 0,
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

  it("labels rune cubes from sentence words instead of English sigil placeholders", () => {
    const oneWord = createSorcererZigguratController([{ term: "Awaken", translation: "Despertar" }], vi.fn());
    const many = createSorcererZigguratController(SENTENCES, vi.fn(), 23);
    const words = SENTENCES.flatMap((item) => item.term.split(/\s+/u));
    const oneWordRunes = [oneWord.snapshot().runes.left, oneWord.snapshot().runes.forward, oneWord.snapshot().runes.right];
    const manyRunes = [many.snapshot().runes.left, many.snapshot().runes.forward, many.snapshot().runes.right];

    expect(oneWordRunes.every((label) => label === "Awaken")).toBe(true);
    expect(manyRunes.every((label) => words.includes(label))).toBe(true);
    expect(manyRunes.join(" ")).not.toMatch(/Moon sigil|Sun sigil|Echo rune/u);
  });
});
