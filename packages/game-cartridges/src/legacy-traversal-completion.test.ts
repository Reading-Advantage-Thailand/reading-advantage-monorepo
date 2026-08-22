import { describe, expect, it, vi } from "vitest";

import type { GameInput } from "@reading-advantage/advantage-play-kit";

import {
  createDragonRiderCartridge,
  createGriffinRidersEscapeCartridge,
  createLabyrinthGoblinKingCartridge,
  createShadowGateDungeonCartridge,
  createSpellweaversRunCartridge,
} from "./legacy-traversal-cartridges.js";
import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";

function runtimeInputSnapshot() {
  return {
    keys: [],
    pressed: ["ArrowLeft"],
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

describe("legacy traversal runtime completion", () => {
  it.each([
    ["dragon-rider", createDragonRiderCartridge, [{ term: "brave", translation: "courageous" }]],
    ["spellweavers-run", createSpellweaversRunCartridge, [{ term: "Run", translation: "Correr" }]],
    ["shadow-gate-dungeon", createShadowGateDungeonCartridge, [{ term: "Enter", translation: "Entrar" }]],
    ["labyrinth-goblin-king", createLabyrinthGoblinKingCartridge, [{ term: "Find", translation: "Encontrar" }]],
    ["griffin-riders-escape", createGriffinRidersEscapeCartridge, [{ term: "Fly", translation: "Volar" }]],
  ] as const)("forwards victory for %s from a completing createGameConfig scene", (_id, createCartridge, input) => {
    const complete = vi.fn();
    const inputController = {
      snapshot: vi.fn(() => runtimeInputSnapshot()),
      cancelActiveGesture: vi.fn(),
      destroy: vi.fn(),
    };
    const config = createCartridge().createGameConfig({
      input: input as unknown as GameInput,
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController,
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
});
