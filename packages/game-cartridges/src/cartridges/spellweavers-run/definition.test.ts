import type { SentenceInput } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import { primaryChibiEdition, secondaryEpicEdition } from "../../editions";
import {
  spellweaversRunCartridge,
  SPELLWEAVERS_RUN_ASSET_SLOTS,
} from "./definition";

const input: SentenceInput = [
  { term: "The cat sits", translation: "แมวนั่ง" },
];
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

describe("Spellweavers Run cartridge", () => {
  it("declares the frozen sentence identity and semantic slots", () => {
    expect(spellweaversRunCartridge.manifest).toMatchObject({
      id: "spellweavers-run",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
    });
    expect(SPELLWEAVERS_RUN_ASSET_SLOTS).toContain("target.word-orb");
    expect(SPELLWEAVERS_RUN_ASSET_SLOTS).toContain("zone.collection");
  });

  it.each([primaryChibiEdition, secondaryEpicEdition])(
    "builds one responsive Phaser scene for $id",
    (edition) => {
      const config = spellweaversRunCartridge.createGameConfig({
        input,
        edition,
        complete: vi.fn(),
        diagnostic: vi.fn(),
        inputController,
        seed: 13,
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
