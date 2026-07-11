import type { SentenceInput } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import { primaryChibiEdition, secondaryEpicEdition } from "../../editions";
import {
  griffinRidersEscapeCartridge,
  GRIFFIN_RIDERS_ASSET_SLOTS,
} from "./definition";

const input: SentenceInput = [{ term: "The griffin flies", translation: "กริฟฟินบิน" }];
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

describe("Griffin Riders Escape cartridge", () => {
  it("declares its sentence identity, swipe systems, and semantic assets", () => {
    expect(griffinRidersEscapeCartridge.manifest).toMatchObject({
      id: "griffin-riders-escape",
      inputMode: "sentence",
      runtimeApiVersion: "1.0.0",
    });
    expect(GRIFFIN_RIDERS_ASSET_SLOTS).toContain("target.gate");
    expect(GRIFFIN_RIDERS_ASSET_SLOTS).toContain("hazard.obstacle");
  });

  it.each([primaryChibiEdition, secondaryEpicEdition])(
    "builds one responsive Phaser scene for $id",
    (edition) => {
      const config = griffinRidersEscapeCartridge.createGameConfig({
        input,
        edition,
        complete: vi.fn(),
        diagnostic: vi.fn(),
        inputController,
        seed: 17,
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
