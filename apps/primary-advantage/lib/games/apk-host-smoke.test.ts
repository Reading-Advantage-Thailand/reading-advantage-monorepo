import { describe, expect, it } from "vitest";

import {
  loadPrimaryAPKSmokeCartridge,
  mapPrimaryAPKResult,
  primaryAPKSmokeConfigs,
} from "./apk-host-smoke";

describe("Primary Advantage APK package consumption", () => {
  it.each(primaryAPKSmokeConfigs)(
    "loads public $cartridgeId with the Primary Chibi edition and $inputMode ABI",
    async ({ cartridgeId, edition, input, inputMode }) => {
      const cartridge = await loadPrimaryAPKSmokeCartridge(cartridgeId);

      expect(cartridge.manifest.id).toBe(cartridgeId);
      expect(edition.id).toBe("primary-chibi");
      expect(cartridge.manifest.inputMode).toBe(inputMode);
      expect(input).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            term: expect.any(String),
            translation: expect.any(String),
          }),
        ]),
      );
      expect(
        input.every(
          (item) => Object.keys(item).sort().join(",") === "term,translation",
        ),
      ).toBe(true);
    },
  );

  it("maps the unchanged result fields while dropping display XP and client identity", () => {
    const completion = mapPrimaryAPKResult(
      { accuracy: 1, xp: 999, score: 200, correctAnswers: 2, totalAttempts: 2 },
      {
        gameType: "dragon-flight",
        difficulty: "easy",
        duration: 35,
        victory: true,
        idempotencyKey: "2ebdd48c-a2b1-4e15-9347-c6fcb2017f62",
        clientTimestamp: 1_800_000_000_000,
      },
    );

    expect(completion).toEqual({
      accuracy: 1,
      score: 200,
      correctAnswers: 2,
      totalAttempts: 2,
      gameType: "dragon-flight",
      difficulty: "easy",
      duration: 35,
      victory: true,
      idempotencyKey: "2ebdd48c-a2b1-4e15-9347-c6fcb2017f62",
      clientTimestamp: 1_800_000_000_000,
    });
    expect(completion).not.toHaveProperty("xp");
    expect(completion).not.toHaveProperty("userId");
    expect(completion).not.toHaveProperty("schoolId");
  });
});
