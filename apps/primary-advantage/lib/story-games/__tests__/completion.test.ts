import { gameCompletionInputSchema, type StoryGameEvidence } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import { storyCompletionInput, storyGameType } from "../completion";

const evidence: StoryGameEvidence = {
  schemaVersion: 1,
  kind: "story-game",
  gameId: "potion-rush",
  inputId: "saved",
  level: "A0",
  seed: 7,
  durationMs: 60_000,
  items: [
    { itemId: "w-1", itemKind: "word", label: "brave", attempts: 1, correctFirstTry: true, solved: true },
    { itemId: "w-2", itemKind: "word", label: "night", attempts: 2, correctFirstTry: false, solved: true },
  ],
  practice: ["night"],
};

const result = { score: 120, accuracy: 0.5, correctAnswers: 2, totalAttempts: 3, xp: 4 };

describe("storyCompletionInput", () => {
  it("names the game type apart from the catalog game of the same id", () => {
    expect(storyGameType("labyrinth")).toBe("labyrinth-story");
  });

  it("builds a valid server completion with the story evidence and no display XP", () => {
    const input = storyCompletionInput("potion-rush", result, evidence, {
      startedAt: 1_000,
      now: 61_400,
      helper: true,
      victory: true,
      idempotencyKey: "6f1c2c3a-8f60-4c6e-9d3a-1a2b3c4d5e6f",
    });
    expect(gameCompletionInputSchema.safeParse(input).success).toBe(true);
    expect(input).toMatchObject({ gameType: "potion-rush-story", difficulty: "easy", duration: 60, victory: true, correctAnswers: 2, totalAttempts: 3 });
    expect(input).not.toHaveProperty("xp");
    expect(input.metadata).toEqual({ learningEvidence: evidence });
  });

  it("uses medium difficulty when helper mode is off", () => {
    const input = storyCompletionInput("labyrinth", result, evidence, { startedAt: 0, now: 5_000, helper: false, victory: false, idempotencyKey: "6f1c2c3a-8f60-4c6e-9d3a-1a2b3c4d5e6f" });
    expect(input.difficulty).toBe("medium");
    expect(input.victory).toBe(false);
  });
});
