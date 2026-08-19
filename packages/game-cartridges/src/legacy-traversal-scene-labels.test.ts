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

type FakeText = {
  readonly setPosition: ReturnType<typeof vi.fn>;
  readonly setText: ReturnType<typeof vi.fn>;
  readonly destroy: ReturnType<typeof vi.fn>;
};

type SceneLabelCase = {
  readonly id: string;
  readonly createCartridge: () => ReturnType<typeof createDragonRiderCartridge>;
  readonly input: readonly { readonly term: string; readonly translation: string }[];
  readonly promptPrefix: string;
  readonly learningTarget: string;
  readonly forbiddenOnButtons: readonly string[];
  readonly expectedChoiceLabels: readonly string[];
};

const SCENE_LABEL_CASES: readonly SceneLabelCase[] = [
  {
    id: "dragon-rider",
    createCartridge: createDragonRiderCartridge,
    input: [{ term: "serendipity", translation: "afortunado" }],
    promptPrefix: "Choose the route for:",
    learningTarget: "serendipity",
    forbiddenOnButtons: ["serendipity", "afortunado"],
    expectedChoiceLabels: ["Left route", "Right route"],
  },
  {
    id: "spellweavers-run",
    createCartridge: createSpellweaversRunCartridge,
    input: [{ term: "Illuminate", translation: "Iluminar" }],
    promptPrefix: "Build the sentence for:",
    learningTarget: "Iluminar",
    forbiddenOnButtons: ["Illuminate", "Iluminar"],
    expectedChoiceLabels: ["Left route", "Center route", "Right route"],
  },
  {
    id: "shadow-gate-dungeon",
    createCartridge: createShadowGateDungeonCartridge,
    input: [{ term: "Descend", translation: "Descender" }],
    promptPrefix: "Build the sentence for:",
    learningTarget: "Descender",
    forbiddenOnButtons: ["Descend", "Descender"],
    expectedChoiceLabels: ["Left route", "Up route", "Down route", "Right route"],
  },
  {
    id: "labyrinth-goblin-king",
    createCartridge: createLabyrinthGoblinKingCartridge,
    input: [{ term: "Discover", translation: "Descubrir" }],
    promptPrefix: "Build the sentence for:",
    learningTarget: "Descubrir",
    forbiddenOnButtons: ["Discover", "Descubrir"],
    expectedChoiceLabels: ["Left route", "Up route", "Down route", "Right route"],
  },
  {
    id: "griffin-riders-escape",
    createCartridge: createGriffinRidersEscapeCartridge,
    input: [{ term: "Soar", translation: "Planear" }],
    promptPrefix: "Build the sentence for:",
    learningTarget: "Planear",
    forbiddenOnButtons: ["Soar", "Planear"],
    expectedChoiceLabels: ["Left route", "Right route"],
  },
];

function latestText(text: FakeText): string {
  const calls = text.setText.mock.calls;
  return String(calls.at(-1)?.[0] ?? "");
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

  const texts: FakeText[] = [];
  const text = () => {
    const value = {
      setPosition: vi.fn(),
      setText: vi.fn(),
      destroy: vi.fn(),
    };
    value.setPosition.mockReturnValue(value);
    value.setText.mockReturnValue(value);
    texts.push(value);
    return value;
  };

  return {
    add: { graphics: () => graphics, text },
    events: { once: vi.fn() },
    scale: { width: 960, height: 540 },
    texts,
  };
}

describe("legacy traversal scene labels", () => {
  it.each(SCENE_LABEL_CASES)(
    "prints only route names on $id gates and keeps the prompt as the learning target",
    ({ createCartridge, input, promptPrefix, learningTarget, forbiddenOnButtons, expectedChoiceLabels }) => {
      const config = createCartridge().createGameConfig({
        input: input as unknown as GameInput,
        edition: PHASE3_RUNTIME_EDITION,
        complete: vi.fn(),
        diagnostic: vi.fn(),
        inputController: {
          snapshot: vi.fn(() => ({
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
          })),
          cancelActiveGesture: vi.fn(),
          destroy: vi.fn(),
        },
        seed: 0,
      });
      const scene = config.scene as { create?: (this: unknown) => void };
      const host = fakeRuntimeScene();

      scene.create?.call(host);

      const choiceTexts = host.texts.slice(-expectedChoiceLabels.length);
      const choiceLabels = choiceTexts.map(latestText);
      const promptText = host.texts
        .map(latestText)
        .find((value) => value.startsWith(promptPrefix));

      expect(choiceLabels).toEqual([...expectedChoiceLabels]);
      for (const label of choiceLabels) {
        for (const forbidden of forbiddenOnButtons) {
          expect(label).not.toContain(forbidden);
        }
      }
      expect(promptText).toBe(`${promptPrefix} ${learningTarget}`);
    },
  );
});
