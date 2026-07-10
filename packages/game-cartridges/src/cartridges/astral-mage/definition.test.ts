import type { SentenceInput } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  ASTRAL_MAGE_ASSET_SLOTS,
  astralMageCartridge,
} from "./definition";
import { distanceToProjectilePath } from "./scene";

const input: SentenceInput = [
  { term: "Stars light the path", translation: "Las estrellas iluminan el camino" },
];

describe("Astral Mage cartridge", () => {
  it("declares the public sentence identity, semantic slots, and Phaser systems", () => {
    expect(astralMageCartridge.manifest).toMatchObject({
      id: "astral-mage",
      title: "Astral Mage",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
    });
    expect(astralMageCartridge.manifest.capabilities).toEqual(
      expect.arrayContaining([
        "arcade-physics",
        "camera",
        "object-pool",
        "particles",
        "timers",
        "tweens",
      ]),
    );
    expect(astralMageCartridge.manifest.requiredAssetSlots).toEqual(
      ASTRAL_MAGE_ASSET_SLOTS,
    );
    expect(ASTRAL_MAGE_ASSET_SLOTS).toEqual(
      expect.arrayContaining([
        "world.background",
        "player.hero",
        "target.correct",
        "target.incorrect",
        "target.word-crystal",
        "projectile.magic",
        "feedback.correct",
        "feedback.incorrect",
        "indicator.offscreen",
        "portal.complete",
        "ui.panel",
      ]),
    );
  });

  it("builds one Phaser 4 scene from the frozen sentence array", () => {
    const config = astralMageCartridge.createGameConfig({
      input,
      edition: {
        id: "test-edition",
        title: "Test Edition",
        runtimeApiVersion: "1.0.0",
        assets: Object.fromEntries(
          ASTRAL_MAGE_ASSET_SLOTS.map((key) => [
            key,
            {
              key,
              type: "procedural",
              provenance: { source: "test", license: "LicenseRef-Test" },
              metadata: { version: "1.0.0", format: "procedural", optimized: true },
            },
          ]),
        ),
        palette: {
          background: 0x020617,
          player: 0x60a5fa,
          friendly: 0x34d399,
          hostile: 0xef4444,
          accent: 0xa78bfa,
          text: "#f8fafc",
        },
        tuning: {
          speed: 1,
          targetScale: 1,
          collisionScale: 1,
          intensity: 0.8,
        },
      },
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: { snapshot: vi.fn(), destroy: vi.fn() },
      seed: 31,
    });

    expect(config).toMatchObject({
      width: 960,
      height: 540,
      physics: { default: "arcade" },
    });
    expect(config.scene).toMatchObject({
      preload: expect.any(Function),
      create: expect.any(Function),
      update: expect.any(Function),
    });
  });

  it("detects a target crossed between physics frames without timer scoring", () => {
    expect(distanceToProjectilePath(50, 10, 0, 10, 100, 10)).toBe(0);
    expect(distanceToProjectilePath(50, 30, 0, 10, 100, 10)).toBe(20);
    expect(distanceToProjectilePath(8, 9, 8, 9, 8, 9)).toBe(0);
  });
});
