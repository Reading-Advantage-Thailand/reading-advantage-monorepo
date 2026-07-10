import { gameResultsSchema, vocabularyInputSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import {
  chooseGate,
  createGateRunnerState,
  gateRunnerCartridge,
} from "../gate-runner";

const vocabulary = vocabularyInputSchema.parse([
  { term: "แมว", translation: "cat" },
  { term: "หมา", translation: "dog" },
  { term: "น้ำ", translation: "water" },
]);

describe("gate runner cartridge", () => {
  it("creates the same rounds from the same seed", () => {
    const first = createGateRunnerState(vocabulary, 42);
    const second = createGateRunnerState(vocabulary, 42);
    expect(first.rounds).toEqual(second.rounds);
  });

  it("never pairs a round with an indistinguishable translation", () => {
    const state = createGateRunnerState(
      [
        { term: "first", translation: "same" },
        { term: "second", translation: "same" },
        { term: "third", translation: "other" },
      ],
      1,
    );

    for (const round of state.rounds) {
      expect(new Set(round.options.map((option) => option.toLocaleLowerCase())).size).toBe(2);
    }
  });

  it("records correct and incorrect gate choices deterministically", () => {
    let state = createGateRunnerState(vocabulary, 7);
    const firstRound = state.rounds[state.roundIndex];
    const wrongChoice = firstRound.options.findIndex(
      (option) => option !== firstRound.correctTranslation,
    );
    state = chooseGate(state, wrongChoice);
    expect(state.correctAnswers).toBe(0);
    expect(state.totalAttempts).toBe(1);

    state = chooseGate(state, firstRound.correctOptionIndex);
    while (!state.complete) {
      const round = state.rounds[state.roundIndex];
      state = chooseGate(state, round.correctOptionIndex);
    }

    expect(gameResultsSchema.parse(state.results)).toEqual({
      accuracy: 0.75,
      xp: 28,
      score: 280,
      correctAnswers: 3,
      totalAttempts: 4,
    });
  });

  it("rejects undersized input and ignores invalid or post-completion choices", () => {
    expect(() => createGateRunnerState(vocabulary.slice(0, 1), 1)).toThrow(/at least two/i);
    expect(() =>
      createGateRunnerState(
        [
          { term: " ", translation: "one" },
          { term: "two", translation: "two" },
        ],
        1,
      ),
    ).toThrow(/non-empty/i);
    expect(() =>
      createGateRunnerState(
        [
          { term: "one", translation: "same" },
          { term: "two", translation: "same" },
        ],
        1,
      ),
    ).toThrow(/distinct translations/i);
    const initial = createGateRunnerState(vocabulary, 2);
    expect(chooseGate(initial, 9)).toBe(initial);
    let complete = initial;
    while (!complete.complete) {
      const round = complete.rounds[complete.roundIndex];
      complete = chooseGate(complete, round.correctOptionIndex);
    }
    expect(chooseGate(complete, 0)).toBe(complete);
  });

  it("declares Arcade Physics, camera, and tween capabilities", () => {
    expect(gateRunnerCartridge.manifest.inputMode).toBe("vocabulary");
    expect(gateRunnerCartridge.manifest.capabilities).toEqual(
      expect.arrayContaining(["arcade-physics", "camera", "tweens"]),
    );
  });
});
