import { gameResultsSchema, sentenceInputSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import {
  attemptZigguratStep,
  createZigguratState,
  getCorrectAdjacentNode,
} from "./systems";

const sentences = sentenceInputSchema.parse([
  { term: "Very very bright", translation: "Très très lumineux" },
  { term: "Runes awaken", translation: "Les runes se réveillent" },
]);

describe("Sorcerer's Ziggurat systems", () => {
  it("is deterministic and retains translation as the active meaning prompt", () => {
    const first = createZigguratState(sentences, 73);
    const second = createZigguratState(sentences, 73);

    expect(first).toEqual(second);
    expect(first.activeTranslation).toBe("Très très lumineux");
    expect(first.graph.levels[0]!.find((node) => node.correct)?.tokenId).toBe("0:0");
    expect(first.graph.levels[1]!.find((node) => node.correct)?.tokenId).toBe("0:1");
  });

  it("counts wrong legal steps without advancing and ignores illegal selections", () => {
    const initial = createZigguratState(sentences, 19);
    const legal = initial.graph.levels[0]!;
    const wrong = legal.find((node) => !node.correct)!;
    const future = initial.graph.levels[1]![0]!;

    expect(attemptZigguratStep(initial, "missing")).toBe(initial);
    expect(attemptZigguratStep(initial, future.id)).toBe(initial);

    const afterWrong = attemptZigguratStep(initial, wrong.id);
    expect(afterWrong.expectedTokenIndex).toBe(0);
    expect(afterWrong.currentNodeId).toBe(initial.currentNodeId);
    expect(afterWrong.totalAttempts).toBe(1);
    expect(afterWrong.correctAnswers).toBe(0);
    expect(afterWrong.lastOutcome).toBe("incorrect");
  });

  it("advances one adjacent token at a time and ignores repeated nodes", () => {
    const initial = createZigguratState(sentences, 23);
    const correct = getCorrectAdjacentNode(initial);
    const advanced = attemptZigguratStep(initial, correct.id);

    expect(advanced.expectedTokenIndex).toBe(1);
    expect(advanced.currentNodeId).toBe(correct.id);
    expect(advanced.correctAnswers).toBe(1);
    expect(advanced.totalAttempts).toBe(1);
    expect(attemptZigguratStep(advanced, correct.id)).toBe(advanced);
  });

  it("completes duplicate words and multiple ritual tiers with the exact result ABI", () => {
    let state = createZigguratState(sentences, 31);
    const wrong = state.graph.levels[0]!.find((node) => !node.correct)!;
    state = attemptZigguratStep(state, wrong.id);

    while (!state.complete) {
      state = attemptZigguratStep(state, getCorrectAdjacentNode(state).id);
    }

    expect(state.completedRituals).toBe(2);
    expect(gameResultsSchema.parse(state.results)).toEqual({
      accuracy: 5 / 6,
      xp: 47,
      score: 475,
      correctAnswers: 5,
      totalAttempts: 6,
    });
    expect(Object.keys(state.results!).sort()).toEqual(
      ["accuracy", "xp", "score", "correctAnswers", "totalAttempts"].sort(),
    );
    expect(attemptZigguratStep(state, "anything")).toBe(state);
  });

  it.each([
    ["empty input", []],
    ["blank term", [{ term: "   ", translation: "meaning" }]],
    ["blank translation", [{ term: "Valid words", translation: "   " }]],
  ])("rejects %s", (_label, input) => {
    expect(() => createZigguratState(input, 1)).toThrow();
  });
});
