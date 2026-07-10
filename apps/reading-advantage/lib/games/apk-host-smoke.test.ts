import {
  loadReadingAPKSmokeCartridge,
  mapReadingAPKResult,
  readingAPKSmokeConfigs,
} from "./apk-host-smoke";

describe("Reading Advantage APK package consumption", () => {
  it.each(readingAPKSmokeConfigs)(
    "loads public $cartridgeId with the Secondary Epic edition and $inputMode ABI",
    async ({ cartridgeId, edition, input, inputMode }) => {
      const cartridge = await loadReadingAPKSmokeCartridge(cartridgeId);

      expect(cartridge.manifest.id).toBe(cartridgeId);
      expect(edition.id).toBe("secondary-epic");
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
    const completion = mapReadingAPKResult(
      {
        accuracy: 0.75,
        xp: 999,
        score: 300,
        correctAnswers: 3,
        totalAttempts: 4,
      },
      {
        gameType: "magic-defense",
        difficulty: "hard",
        duration: 90,
        victory: true,
        idempotencyKey: "7d5f1290-67de-4b89-8669-7c6a721d73d4",
        clientTimestamp: 1_800_000_000_000,
      },
    );

    expect(completion).toEqual({
      accuracy: 0.75,
      score: 300,
      correctAnswers: 3,
      totalAttempts: 4,
      gameType: "magic-defense",
      difficulty: "hard",
      duration: 90,
      victory: true,
      idempotencyKey: "7d5f1290-67de-4b89-8669-7c6a721d73d4",
      clientTimestamp: 1_800_000_000_000,
    });
    expect(completion).not.toHaveProperty("xp");
    expect(completion).not.toHaveProperty("userId");
    expect(completion).not.toHaveProperty("schoolId");
  });
});
