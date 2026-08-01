import { describe, expect, it, vi } from "vitest";

import type {
  CartridgeGameConfigContext,
  RuntimeEdition,
} from "@reading-advantage/advantage-play-kit/runtime";

import { createRuntimeEdition } from "@reading-advantage/advantage-play-kit/testing";
import { loadDragonFlightHostProofCartridge } from "./host-proof.js";

/** Creates a valid edition for every Dragon Flight semantic role without selecting app-local assets. */
function createDragonFlightEdition(): RuntimeEdition {
  const base = createRuntimeEdition();
  const template = base.bindings["player.hero.top.idle.down"];
  if (!template) throw new Error("Runtime fixture must provide a canonical actor binding");
  return createRuntimeEdition({
    bindings: {
      "audio/native/combat/hit-01": { ...template, key: "audio/native/combat/hit-01" },
      "effects/32x32/combat/hit-01": { ...template, key: "effects/32x32/combat/hit-01" },
      "top-down/32x32/characters/hero-01": { ...template, key: "top-down/32x32/characters/hero-01" },
    },
  });
}

describe("Dragon Flight same-frame title actions", () => {
  it("records a gate choice and launch from one browser snapshot before completing once", async () => {
    const cartridge = await loadDragonFlightHostProofCartridge();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const context = {
      input: [{ term: "dragon", translation: "drago" }],
      edition: createDragonFlightEdition(),
      complete,
      diagnostic,
      inputController: {
        snapshot: vi.fn(() => ({
          pressed: ["ArrowRight", "Enter"],
          pointer: { released: false, cancelled: false, x: 0 },
        })),
      },
    } as unknown as CartridgeGameConfigContext;
    const config = cartridge.createGameConfig(context);
    const scene = config.scene as {
      update(this: { sound: { play: ReturnType<typeof vi.fn> } }): void;
    };

    scene.update.call({ sound: { play: vi.fn() } });

    expect(diagnostic.mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({
        code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
        details: expect.objectContaining({ kind: "choose-gate", gate: "right", elapsedMs: expect.any(Number) }),
      }),
      expect.objectContaining({
        code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
        details: expect.objectContaining({ kind: "launch", elapsedMs: expect.any(Number) }),
      }),
    ]);
    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith({
      accuracy: 1,
      xp: 5,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
    });
  });
});
