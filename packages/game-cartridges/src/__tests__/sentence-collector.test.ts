import { gameResultsSchema, sentenceInputSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import {
  collectSentenceToken,
  createSentenceCollectorState,
  dungeonLiberatorCartridge,
} from "../sentence-collector";

const sentences = sentenceInputSchema.parse([
  { term: "The dragon flies", translation: "มังกรบิน" },
  { term: "Knights guard castles", translation: "อัศวินเฝ้าปราสาท" },
]);

describe("sentence collector cartridge", () => {
  it("creates the same token field from the same seed", () => {
    expect(createSentenceCollectorState(sentences, 99).tokens).toEqual(
      createSentenceCollectorState(sentences, 99).tokens,
    );
  });

  it("requires sentence tokens in order and emits the stable result ABI", () => {
    let state = createSentenceCollectorState(sentences, 11);
    const wrongToken = state.tokens.find(
      (token) => token.text !== state.expectedTokens[0],
    );
    expect(wrongToken).toBeDefined();
    state = collectSentenceToken(state, wrongToken!.id);

    while (!state.complete) {
      const expected = state.expectedTokens[state.expectedTokenIndex];
      const correct = state.tokens.find(
        (token) => !token.collected && token.text === expected,
      );
      expect(correct).toBeDefined();
      state = collectSentenceToken(state, correct!.id);
    }

    expect(gameResultsSchema.parse(state.results)).toEqual({
      accuracy: 6 / 7,
      xp: 55,
      score: 550,
      correctAnswers: 6,
      totalAttempts: 7,
    });
  });

  it("rejects empty sentences and ignores missing or already-collected tokens", () => {
    expect(() => createSentenceCollectorState([], 1)).toThrow(/at least one/i);
    expect(() => createSentenceCollectorState([{ term: "   ", translation: "empty" }], 1)).toThrow(/with words/i);
    expect(() =>
      createSentenceCollectorState(
        [
          { term: "First sentence", translation: "first" },
          { term: "   ", translation: "second" },
        ],
        1,
      ),
    ).toThrow(/every sentence/i);
    expect(() =>
      createSentenceCollectorState(
        [{ term: "Valid sentence", translation: " " }],
        1,
      ),
    ).toThrow(/non-empty/i);
    const initial = createSentenceCollectorState(sentences, 3);
    expect(collectSentenceToken(initial, "missing")).toBe(initial);
    const expected = initial.expectedTokens[0];
    const token = initial.tokens.find((candidate) => candidate.text === expected)!;
    const advanced = collectSentenceToken(initial, token.id);
    expect(collectSentenceToken(advanced, token.id)).toBe(advanced);
  });

  it("declares Arcade Physics, camera, particles, and tweens", () => {
    expect(dungeonLiberatorCartridge.manifest.id).toBe("dungeon-liberator");
    expect(dungeonLiberatorCartridge.manifest.inputMode).toBe("sentence");
    expect(dungeonLiberatorCartridge.manifest.capabilities).toEqual(
      expect.arrayContaining([
        "arcade-physics",
        "camera",
        "particles",
        "tweens",
      ]),
    );
  });
});
