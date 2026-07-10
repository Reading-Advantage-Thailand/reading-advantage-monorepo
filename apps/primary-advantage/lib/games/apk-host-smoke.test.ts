import { describe, expect, it } from "vitest";

import {
  loadPrimaryAPKSmokeCartridge,
  mapPrimaryAPKResult,
  primaryAPKSmokeConfig,
} from "./apk-host-smoke";

describe("Primary Advantage APK package consumption", () => {
  it("loads a shared Primary Chibi cartridge with the unchanged vocabulary ABI", async () => {
    const cartridge = await loadPrimaryAPKSmokeCartridge();
    expect(cartridge.manifest.id).toBe("gate-runner");
    expect(primaryAPKSmokeConfig.edition.id).toBe("primary-chibi");
    expect(primaryAPKSmokeConfig.input).toEqual([
      { term: "cat", translation: "gato" },
      { term: "dog", translation: "perro" },
    ]);
  });

  it("drops display XP and leaves identity and tenancy to the authenticated server", () => {
    const completion = mapPrimaryAPKResult(
      { accuracy: 1, xp: 999, score: 200, correctAnswers: 2, totalAttempts: 2 },
      {
        gameType: "gate-runner",
        difficulty: "easy",
        duration: 35,
        victory: true,
        idempotencyKey: "2ebdd48c-a2b1-4e15-9347-c6fcb2017f62",
        clientTimestamp: 1_800_000_000_000,
      },
    );
    expect(completion).not.toHaveProperty("xp");
    expect(completion).not.toHaveProperty("userId");
    expect(completion).not.toHaveProperty("schoolId");
  });
});
