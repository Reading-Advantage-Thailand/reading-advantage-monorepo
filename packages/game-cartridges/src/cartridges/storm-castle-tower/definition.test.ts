import type { SentenceInput } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import { primaryChibiEdition, secondaryEpicEdition } from "../../editions";
import {
  stormCastleTowerCartridge,
  STORM_CASTLE_ASSET_SLOTS,
} from "./definition";

const input: SentenceInput = [{ term: "The bird flies", translation: "นกบิน" }];
const inputController = {
  snapshot: vi.fn(() => ({
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
  })),
  destroy: vi.fn(),
};

describe("Storm Castle Tower cartridge", () => {
  it("declares its vertical sentence identity and semantic assets", () => {
    expect(stormCastleTowerCartridge.manifest).toMatchObject({
      id: "storm-castle-tower",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
    });
    expect(STORM_CASTLE_ASSET_SLOTS).toContain("terrain.tower");
    expect(STORM_CASTLE_ASSET_SLOTS).toContain("target.window");
    expect(STORM_CASTLE_ASSET_SLOTS).toContain("hazard.oil");
    expect(STORM_CASTLE_ASSET_SLOTS).toContain("hazard.rock");
  });

  it.each([primaryChibiEdition, secondaryEpicEdition])(
    "builds one responsive Phaser scene for $id",
    (edition) => {
      const config = stormCastleTowerCartridge.createGameConfig({
        input,
        edition,
        complete: vi.fn(),
        diagnostic: vi.fn(),
        inputController,
        seed: 19,
      });
      expect(config).toMatchObject({
        width: 960,
        height: 540,
        scene: {
          preload: expect.any(Function),
          create: expect.any(Function),
          update: expect.any(Function),
        },
      });
    },
  );
});
