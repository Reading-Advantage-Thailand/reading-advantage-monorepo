import { describe, expect, it } from "vitest";

import {
  MAX_STORY_GAME_EVIDENCE_ITEMS,
  completionMetadataSchema,
  learningEvidenceSchema,
  practiceOf,
  storyGameEvidenceSchema,
} from "../index.js";

const items = [
  { itemId: "w-brave", itemKind: "word", label: "brave", attempts: 1, correctFirstTry: true, solved: true },
  {
    itemId: "s-1",
    itemKind: "sentence",
    label: "Pip is a brave puppy now.",
    attempts: 2,
    correctFirstTry: false,
    solved: true,
    paragraph: 1,
  },
  { itemId: "q-1", itemKind: "question", label: "What is Pip?", attempts: 3, correctFirstTry: false, solved: false },
] as const;

const evidence = {
  schemaVersion: 1,
  kind: "story-game",
  gameId: "monster-encounters",
  inputId: "pip-the-puppy",
  level: "A0",
  seed: 42,
  durationMs: 120_000,
  items,
  practice: ["Pip is a brave puppy now.", "What is Pip?"],
} as const;

describe("story-game evidence contract", () => {
  it("accepts a story-game run as learning evidence", () => {
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(learningEvidenceSchema.parse(evidence)).toEqual(evidence);
  });

  it("accepts the evidence inside completion metadata", () => {
    expect(completionMetadataSchema.safeParse({ learningEvidence: evidence }).success).toBe(true);
    expect(
      completionMetadataSchema.safeParse({ learningEvidence: { ...evidence, kind: "other" } }).success,
    ).toBe(false);
  });

  it.each([
    ["unknown kind", { ...evidence, kind: "listening" }],
    ["unknown field", { ...evidence, stars: 3 }],
    ["unknown level", { ...evidence, level: "C2" }],
    ["fractional seed", { ...evidence, seed: 1.5 }],
    ["negative duration", { ...evidence, durationMs: -1 }],
    ["zero attempts", { ...evidence, items: [{ ...items[0], attempts: 0 }] }],
    ["first try correct but unsolved", { ...evidence, items: [{ ...items[0], solved: false }] }],
    ["unknown item kind", { ...evidence, items: [{ ...items[0], itemKind: "paragraph" }] }],
    ["too many items", { ...evidence, items: Array.from({ length: MAX_STORY_GAME_EVIDENCE_ITEMS + 1 }, () => items[0]) }],
  ])("rejects %s", (_label, candidate) => {
    expect(storyGameEvidenceSchema.safeParse(candidate).success).toBe(false);
    expect(learningEvidenceSchema.safeParse(candidate).success).toBe(false);
  });

  it("derives the practice list from items not correct on the first try", () => {
    expect(practiceOf(items)).toEqual(["Pip is a brave puppy now.", "What is Pip?"]);
    expect(practiceOf([])).toEqual([]);
  });
});
