import { describe, expect, it } from "vitest";
import corpus from "../game-corpus.json";
import profiles from "../responsive-composition-matrix.json";

describe("APK responsive composition matrix", () => {
  it("maps every game once", () => {
    expect(profiles.map((item) => item.gameId).sort()).toEqual(
      corpus.games.map((item) => item.id).sort(),
    );
  });
  it("declares intentional compact and wide composition", () => {
    for (const profile of profiles) {
      for (const mode of [profile.compact, profile.wide]) {
        expect(mode.strategies.length, profile.gameId).toBeGreaterThan(0);
        expect(mode.inputModes.length, profile.gameId).toBeGreaterThan(0);
        expect(mode.reservedRegions.length, profile.gameId).toBeGreaterThan(0);
        expect(mode.cameraPolicy.length, profile.gameId).toBeGreaterThan(10);
      }
      expect(profile.statePreserved).toContain("current content step");
      expect(profile.fixtures.thaiWorstCase.length).toBeGreaterThan(20);
      expect(profile.fixtures.englishWorstCase.length).toBeGreaterThan(20);
    }
  });
});
