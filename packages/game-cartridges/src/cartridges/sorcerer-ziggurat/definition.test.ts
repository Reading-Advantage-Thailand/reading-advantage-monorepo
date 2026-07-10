import type { RuntimeEdition } from "@reading-advantage/advantage-play-kit";
import { sentenceInputSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  createSorcererZigguratGameConfig,
  SORCERER_ZIGGURAT_ASSET_SLOTS,
  sorcererZigguratCartridge,
} from "./definition";
import { createCompletionEmitter } from "./scene";

function createEdition(): RuntimeEdition {
  return {
    id: "primary-chibi",
    title: "Primary Chibi",
    runtimeApiVersion: "1.0.0",
    assets: Object.fromEntries(
      SORCERER_ZIGGURAT_ASSET_SLOTS.map((key) => [
        key,
        {
          key,
          type: "procedural" as const,
          provenance: {
            source: "Ziggurat test artwork",
            license: "LicenseRef-Reading-Advantage-Original",
          },
          metadata: { version: "1.0.0", format: "procedural", optimized: true },
        },
      ]),
    ),
    palette: {
      background: 0x111827,
      player: 0xfacc15,
      friendly: 0x34d399,
      hostile: 0xef4444,
      accent: 0xa78bfa,
      text: "#f8fafc",
    },
    tuning: { speed: 0.8, targetScale: 1.2, collisionScale: 1.3, intensity: 0.7 },
  };
}

describe("Sorcerer's Ziggurat definition", () => {
  const input = sentenceInputSchema.parse([
    { term: "Ancient runes awaken", translation: "Les runes anciennes se réveillent" },
  ]);

  it("publishes the sentence cartridge identity, semantic slots, and Phaser capabilities", () => {
    expect(sorcererZigguratCartridge.manifest).toMatchObject({
      id: "sorcerer-ziggurat",
      title: "The Sorcerer's Ziggurat",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
    });
    expect(sorcererZigguratCartridge.manifest.requiredAssetSlots).toEqual(
      SORCERER_ZIGGURAT_ASSET_SLOTS,
    );
    expect(sorcererZigguratCartridge.manifest.capabilities).toEqual(
      expect.arrayContaining(["camera", "particles", "tweens"]),
    );
  });

  it("creates one Phaser scene from the stable sentence input", () => {
    const config = createSorcererZigguratGameConfig({
      input,
      edition: createEdition(),
      complete: vi.fn(),
      diagnostics: vi.fn(),
      seed: 5,
    });

    expect(config).toMatchObject({ width: 960, height: 540 });
    expect(config.scene).toMatchObject({
      preload: expect.any(Function),
      create: expect.any(Function),
    });
  });

  it("guards scene completion so the host receives one result", () => {
    const complete = vi.fn();
    const diagnostics = vi.fn();
    const emit = createCompletionEmitter(complete, diagnostics);
    const result = {
      accuracy: 1,
      xp: 30,
      score: 300,
      correctAnswers: 3,
      totalAttempts: 3,
    };

    emit(result);
    emit(result);

    expect(complete).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith(result);
    expect(diagnostics).toHaveBeenCalledOnce();
  });
});
