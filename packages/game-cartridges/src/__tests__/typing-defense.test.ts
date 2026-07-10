import { gameResultsSchema, vocabularyInputSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import {
  createTouchAnswers,
  createTypingDefenseState,
  submitDefenseAnswer,
  typingDefenseCartridge,
} from "../typing-defense";

const vocabulary = vocabularyInputSchema.parse([
  { term: "fire", translation: "ไฟ" },
  { term: "water", translation: "น้ำ" },
  { term: "shield", translation: "โล่" },
]);

describe("typing defense cartridge", () => {
  it("spawns vocabulary waves deterministically from a seed", () => {
    expect(createTypingDefenseState(vocabulary, 123).waves).toEqual(
      createTypingDefenseState(vocabulary, 123).waves,
    );
  });

  it("normalizes typed answers and emits stable results", () => {
    let state = createTypingDefenseState(vocabulary, 19);
    state = submitDefenseAnswer(state, "incorrect");
    while (!state.complete) {
      const wave = state.waves[state.waveIndex];
      state = submitDefenseAnswer(state, `  ${wave.translation.toUpperCase()}  `);
    }

    expect(gameResultsSchema.parse(state.results)).toEqual({
      accuracy: 0.75,
      xp: 33,
      score: 330,
      correctAnswers: 3,
      totalAttempts: 4,
    });
  });

  it("rejects empty input and ignores answers after completion", () => {
    expect(() => createTypingDefenseState([], 1)).toThrow(/at least one/i);
    expect(() =>
      createTypingDefenseState([{ term: " ", translation: "answer" }], 1),
    ).toThrow(/non-empty/i);
    expect(() =>
      createTypingDefenseState([{ term: "prompt", translation: " " }], 1),
    ).toThrow(/non-empty/i);
    let state = createTypingDefenseState(vocabulary.slice(0, 1), 4);
    state = submitDefenseAnswer(state, state.waves[0].translation);
    expect(state.complete).toBe(true);
    expect(submitDefenseAnswer(state, "again")).toBe(state);
  });

  it("always includes the correct answer in the four touch choices", () => {
    const translations = ["correct", "d1", "d2", "d3", "d4", "d5"];

    expect(createTouchAnswers("correct", translations, 1, 4)).toHaveLength(4);
    expect(createTouchAnswers("correct", translations, 1, 4)).toContain("correct");
  });

  it("declares Arcade Physics, timers, tweens, and object pooling", () => {
    expect(typingDefenseCartridge.manifest.inputMode).toBe("vocabulary");
    expect(typingDefenseCartridge.manifest.capabilities).toEqual(
      expect.arrayContaining([
        "arcade-physics",
        "timers",
        "tweens",
        "object-pool",
      ]),
    );
  });
});
