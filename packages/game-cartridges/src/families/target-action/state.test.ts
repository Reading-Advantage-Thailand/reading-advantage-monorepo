import { gameResultsSchema, sentenceInputSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import {
  createTargetActionState,
  resolveTargetHit,
} from "./state";

const sentences = sentenceInputSchema.parse([
  { term: "Stars guide stars", translation: "Las estrellas guían estrellas" },
  { term: "Mages cross the void", translation: "Los magos cruzan el vacío" },
]);

describe("target-action state", () => {
  it("creates deterministic rounds with stable IDs for duplicate words", () => {
    const first = createTargetActionState(sentences, 41);
    const second = createTargetActionState(sentences, 41);

    expect(first.targets).toEqual(second.targets);
    expect(first.targets.map(({ id }) => id)).toEqual(["0-0", "0-1", "0-2"]);
    expect(new Set(first.targets.map(({ id }) => id)).size).toBe(3);
    expect(first.targets[0]?.text).toBe("Stars");
    expect(first.targets[2]?.text).toBe("stars");
  });

  it("accepts either visually identical duplicate without a hidden-index penalty", () => {
    let state = createTargetActionState(
      sentenceInputSchema.parse([
        { term: "stars Stars", translation: "estrellas estrellas" },
      ]),
      13,
    );
    const laterDuplicate = state.targets.find(({ tokenIndex }) => tokenIndex === 1)!;

    state = resolveTargetHit(state, laterDuplicate.id);
    expect(state).toMatchObject({
      expectedTokenIndex: 1,
      correctAnswers: 1,
      totalAttempts: 1,
      score: 100,
    });

    const remainingDuplicate = state.targets.find(({ active }) => active)!;
    state = resolveTargetHit(state, remainingDuplicate.id);
    expect(gameResultsSchema.parse(state.results)).toEqual({
      accuracy: 1,
      xp: 20,
      score: 200,
      correctAnswers: 2,
      totalAttempts: 2,
    });
  });

  it("counts a wrong live target without advancing and ignores unknown targets", () => {
    const initial = createTargetActionState(sentences, 9);
    const wrong = initial.targets.find(({ tokenIndex }) => tokenIndex === 1)!;
    const afterWrong = resolveTargetHit(initial, wrong.id);

    expect(afterWrong).toMatchObject({
      expectedTokenIndex: 0,
      correctAnswers: 0,
      totalAttempts: 1,
      score: 0,
    });
    expect(resolveTargetHit(afterWrong, "missing-target")).toBe(afterWrong);
  });

  it("advances correct targets once and emits the exact result after every sentence", () => {
    let state = createTargetActionState(sentences, 17);
    const firstTargetId = state.targets.find(({ tokenIndex }) => tokenIndex === 0)!.id;
    state = resolveTargetHit(state, firstTargetId);
    expect(state.expectedTokenIndex).toBe(1);
    expect(resolveTargetHit(state, firstTargetId)).toBe(state);

    while (!state.complete) {
      const target = state.targets.find(
        ({ tokenIndex, active }) => active && tokenIndex === state.expectedTokenIndex,
      );
      expect(target).toBeDefined();
      state = resolveTargetHit(state, target!.id);
    }

    expect(state.sentenceIndex).toBe(sentences.length);
    expect(gameResultsSchema.parse(state.results)).toEqual({
      accuracy: 1,
      xp: 70,
      score: 700,
      correctAnswers: 7,
      totalAttempts: 7,
    });
    expect(resolveTargetHit(state, "1-3")).toBe(state);
  });

  it.each([
    [[], /at least one sentence/i],
    [[{ term: "   ", translation: "meaning" }], /every sentence to contain words/i],
    [[{ term: "Valid sentence", translation: "   " }], /non-empty translations/i],
  ])("rejects malformed sentence input %#", (input, message) => {
    expect(() => createTargetActionState(input, 1)).toThrow(message);
  });
});
