import { describe, expect, it } from "vitest";

import {
  gameResultsSchema,
  hostCompletionContextSchema,
  mapGameResultsToCompletionInput,
  normalizeSentenceInput,
  normalizeVocabularyInput,
  sentenceInputSchema,
  vocabularyInputSchema,
} from "../index.js";

const vocabulary = [
  { term: "dragon", translation: "มังกร" },
  { term: "castle", translation: "ปราสาท" },
];

const results = {
  accuracy: 0.75,
  xp: 12,
  score: 240,
  correctAnswers: 3,
  totalAttempts: 4,
};

describe("frozen educational input ABI", () => {
  it("accepts vocabulary and sentence arrays without a wrapper object", () => {
    expect(vocabularyInputSchema.parse(vocabulary)).toEqual(vocabulary);
    expect(sentenceInputSchema.parse(vocabulary)).toEqual(vocabulary);
  });

  it("keeps empty-array handling at the cartridge level", () => {
    expect(vocabularyInputSchema.parse([])).toEqual([]);
    expect(sentenceInputSchema.parse([])).toEqual([]);
  });

  it.each([
    ["wrapper object", { vocabulary }],
    ["null", null],
    ["missing translation", [{ term: "dragon" }]],
    ["wrong field name", [{ word: "dragon", translation: "มังกร" }]],
    ["non-string term", [{ term: 42, translation: "มังกร" }]],
    ["strict extra field", [{ term: "dragon", translation: "มังกร", id: "v1" }]],
  ])("rejects %s", (_label, input) => {
    expect(vocabularyInputSchema.safeParse(input).success).toBe(false);
  });

  it("normalizes the legacy optional id without mutating the caller input", () => {
    const legacy = [
      { id: "v1", term: "dragon", translation: "มังกร" },
      { id: "v2", term: "castle", translation: "ปราสาท" },
    ];

    expect(normalizeVocabularyInput(legacy)).toEqual(vocabulary);
    expect(normalizeSentenceInput(legacy)).toEqual(vocabulary);
    expect(legacy[0]).toEqual({
      id: "v1",
      term: "dragon",
      translation: "มังกร",
    });
  });

  it("does not turn the legacy normalizer into an open-ended passthrough", () => {
    const unexpected = [
      { id: "v1", term: "dragon", translation: "มังกร", schoolId: "school-1" },
    ];

    expect(() => normalizeVocabularyInput(unexpected)).toThrow();
  });
});

describe("frozen GameResults ABI", () => {
  it("accepts exactly the five established result fields", () => {
    expect(gameResultsSchema.parse(results)).toEqual(results);
  });

  it.each([
    ["missing score", { ...results, score: undefined }],
    ["extra difficulty", { ...results, difficulty: "easy" }],
    ["percent accuracy", { ...results, accuracy: 75 }],
    ["negative accuracy", { ...results, accuracy: -0.01 }],
    ["NaN accuracy", { ...results, accuracy: Number.NaN }],
    ["infinite score", { ...results, score: Number.POSITIVE_INFINITY }],
    ["fractional attempts", { ...results, totalAttempts: 4.5 }],
    ["numeric-string XP", { ...results, xp: "12" }],
  ])("rejects %s", (_label, input) => {
    expect(gameResultsSchema.safeParse(input).success).toBe(false);
  });
});

describe("server completion mapping boundary", () => {
  const context = {
    gameType: "dragon-flight",
    difficulty: "medium" as const,
    duration: 45_000,
    victory: true,
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    clientTimestamp: 1_700_000_000_000,
    metadata: { edition: "primary-chibi" },
  };

  it("maps compatible metrics while dropping display XP", () => {
    expect(mapGameResultsToCompletionInput(results, context)).toEqual({
      gameType: "dragon-flight",
      difficulty: "medium",
      score: 240,
      accuracy: 0.75,
      correctAnswers: 3,
      totalAttempts: 4,
      duration: 45_000,
      victory: true,
      idempotencyKey: "11111111-1111-4111-8111-111111111111",
      clientTimestamp: 1_700_000_000_000,
      metadata: { edition: "primary-chibi" },
    });

    expect(mapGameResultsToCompletionInput({ ...results, xp: 1_000_000 }, context)).not.toHaveProperty(
      "xp",
    );
  });

  it("rejects cartridge-supplied identity or tenancy fields", () => {
    expect(() =>
      mapGameResultsToCompletionInput(
        { ...results, userId: "attacker", schoolId: "other-school" },
        context,
      ),
    ).toThrow();
  });

  it("keeps identity, tenancy, and authoritative XP out of host context", () => {
    expect(
      hostCompletionContextSchema.safeParse({
        ...context,
        userId: "user-1",
        schoolId: "school-1",
        xpEarned: 999_999,
      }).success,
    ).toBe(false);
  });
});
