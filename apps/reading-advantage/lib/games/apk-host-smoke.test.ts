import {
  loadReadingAPKSmokeCartridge,
  mapReadingAPKResult,
  readingAPKSmokeConfig,
} from "./apk-host-smoke";

describe("Reading Advantage APK package consumption", () => {
  it("loads a shared Secondary cartridge with the unchanged vocabulary ABI", async () => {
    const cartridge = await loadReadingAPKSmokeCartridge();
    expect(cartridge.manifest.id).toBe("typing-defense");
    expect(readingAPKSmokeConfig.edition.id).toBe("secondary-epic");
    expect(readingAPKSmokeConfig.input).toEqual([
      { term: "analyze", translation: "examine closely" },
      { term: "infer", translation: "reach a conclusion" },
    ]);
  });

  it("drops display XP and leaves identity and tenancy to the authenticated server", () => {
    const completion = mapReadingAPKResult(
      { accuracy: 0.75, xp: 999, score: 300, correctAnswers: 3, totalAttempts: 4 },
      {
        gameType: "typing-defense",
        difficulty: "hard",
        duration: 90,
        victory: true,
        idempotencyKey: "7d5f1290-67de-4b89-8669-7c6a721d73d4",
        clientTimestamp: 1_800_000_000_000,
      },
    );
    expect(completion).not.toHaveProperty("xp");
    expect(completion).not.toHaveProperty("userId");
    expect(completion).not.toHaveProperty("schoolId");
  });
});
