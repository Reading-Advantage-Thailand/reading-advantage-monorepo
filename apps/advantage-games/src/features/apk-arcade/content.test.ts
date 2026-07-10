import { cartridgeCatalog } from "@reading-advantage/game-cartridges/catalog";

import {
  getArcadeContent,
  getNextCartridgeId,
  listArcadeCartridgeIds,
} from "./content";

describe("APK arcade content", () => {
  it("derives the exact published IDs and deterministic rotation from the package catalog", () => {
    expect(listArcadeCartridgeIds()).toEqual(
      cartridgeCatalog.map(({ id }) => id),
    );
    expect(getNextCartridgeId("dragon-flight")).toBe("dungeon-liberator");
    expect(getNextCartridgeId("sorcerer-ziggurat")).toBe("dragon-flight");
  });

  it("returns stable strict vocabulary and sentence arrays", () => {
    const vocabulary = getArcadeContent("vocabulary");
    const sentence = getArcadeContent("sentence");

    expect(getArcadeContent("vocabulary")).toBe(vocabulary);
    expect(getArcadeContent("sentence")).toBe(sentence);
    expect(vocabulary).toEqual([
      { term: "journey", translation: "voyage" },
      { term: "bridge", translation: "pont" },
      { term: "forest", translation: "forêt" },
      { term: "lantern", translation: "lanterne" },
    ]);
    expect(sentence).toEqual([
      {
        term: "The curious fox crossed the quiet bridge",
        translation: "Narrative sentence",
      },
      {
        term: "We practice new words every morning",
        translation: "Habit sentence",
      },
    ]);
  });
});
