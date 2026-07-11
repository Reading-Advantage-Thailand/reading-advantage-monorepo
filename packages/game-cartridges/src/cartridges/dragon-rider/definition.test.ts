import { describe, expect, it, vi } from "vitest";
import type { VocabularyInput } from "@reading-advantage/game-contracts";

import { primaryChibiEdition, secondaryEpicEdition } from "../../editions";
import { dragonRiderCartridge, DRAGON_RIDER_ASSET_SLOTS } from "./definition";

const input: VocabularyInput = [
  { term: "สวัสดี", translation: "Hello" },
  { term: "ขอบคุณ", translation: "Thank you" },
];

describe("Dragon Rider cartridge", () => {
  it("declares its frozen identity, systems, and semantic assets", () => {
    expect(dragonRiderCartridge.manifest).toMatchObject({
      id: "dragon-rider",
      inputMode: "vocabulary",
      runtimeApiVersion: "1.0.0",
    });
    expect(dragonRiderCartridge.manifest.capabilities).toEqual(
      expect.arrayContaining(["arcade-physics", "camera", "timers", "tweens"]),
    );
    expect(DRAGON_RIDER_ASSET_SLOTS).toEqual([
      "world.background",
      "player.hero",
      "target.correct",
      "target.incorrect",
      "feedback.correct",
      "feedback.incorrect",
      "ui.panel",
      "target.gate",
      "ally.dragon",
      "enemy.boss",
    ]);
  });

  it.each([primaryChibiEdition, secondaryEpicEdition])(
    "builds one Phaser scene for edition $id",
    (edition) => {
      const config = dragonRiderCartridge.createGameConfig({
        input,
        edition,
        complete: vi.fn(),
        diagnostic: vi.fn(),
        inputController: { snapshot: vi.fn(() => ({
          keys: [],
          pointer: {
            down: false,
            cancelled: false,
            id: null,
            kind: null,
            startX: 0,
            startY: 0,
            x: 0,
            y: 0,
          },
          destroyed: false,
        })), destroy: vi.fn() },
        seed: 11,
      });
      expect(config).toMatchObject({
        width: 960,
        height: 540,
        physics: { default: "arcade" },
        scene: {
          preload: expect.any(Function),
          create: expect.any(Function),
          update: expect.any(Function),
        },
      });
    },
  );
});
