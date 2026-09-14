// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  XP_PER_CORRECT_MC_ANSWER,
  XP_SA_MAX,
  XP_LA_MAX,
  resolveQuestionXpAward,
  resolveFlashcardGameXpAward,
  resolveXpAward,
} from "../authorization";
import { ActivityType } from "@/types/enum";

/**
 * Builds the shared question payload shape.
 * @param score The client-submitted score.
 * @param responses The client-submitted responses.
 * @returns A question payload.
 */
function payload(score?: unknown, responses?: unknown) {
  return { score, responses };
}

describe("server-side question XP awards", () => {
  it("publishes the award constants", () => {
    expect(XP_PER_CORRECT_MC_ANSWER).toBe(1);
    expect(XP_SA_MAX).toBe(5);
    expect(XP_LA_MAX).toBe(25);
  });

  it("pays one XP per correct multiple-choice answer", () => {
    expect(
      resolveQuestionXpAward(
        ActivityType.MC_QUESTION,
        payload(undefined, [
          { answer: "a", isCorrect: "a" },
          { answer: "b", isCorrect: "c" },
        ]),
      ),
    ).toBe(1);

    const tenCorrect = Array.from({ length: 10 }, (_, i) => ({
      answer: `a${i}`,
      isCorrect: `a${i}`,
    }));
    expect(
      resolveQuestionXpAward(ActivityType.MC_QUESTION, payload(undefined, tenCorrect)),
    ).toBe(10);
  });

  it("counts malformed multiple-choice entries as zero and never returns NaN", () => {
    const missing = [
      undefined, // data missing entirely
      null,
      payload(), // responses missing
      payload(undefined, "nope"), // non-array responses
      payload(undefined, 42),
      payload(undefined, { 0: { answer: "a", isCorrect: "a" } }),
      // Non-object entries never count.
      payload(undefined, [null, 5, "x"]),
      // Entries without answer/isCorrect never count.
      payload(undefined, [{}, { question: "q" }]),
      payload(undefined, [{ answer: undefined, isCorrect: undefined }]),
      // Null answers and null correct-answer fields never count.
      payload(undefined, [{ answer: null, isCorrect: null }]),
      payload(undefined, [{ answer: null, isCorrect: "a" }]),
      payload(undefined, [{ answer: "a", isCorrect: null }]),
    ];
    for (const data of missing) {
      const award = resolveQuestionXpAward(ActivityType.MC_QUESTION, data);
      expect(award).toBe(0);
      expect(Number.isNaN(award)).toBe(false);
      expect(Number.isInteger(award)).toBe(true);
    }
  });

  it("counts correct answers past malformed entries only", () => {
    const mixed = [
      { answer: "a", isCorrect: "a" },
      null,
      { answer: "b", isCorrect: "b" },
      {},
      { answer: "c", isCorrect: "c" },
    ];
    expect(
      resolveQuestionXpAward(ActivityType.MC_QUESTION, payload(undefined, mixed)),
    ).toBe(3);
  });

  it("counts only the valid entry among null-answer entries", () => {
    const mixed = [
      { answer: null, isCorrect: null },
      { answer: "a", isCorrect: "a" },
      { answer: null, isCorrect: "a" },
      { answer: "a", isCorrect: null },
    ];
    expect(
      resolveQuestionXpAward(ActivityType.MC_QUESTION, payload(undefined, mixed)),
    ).toBe(1);
  });

  it("clamps short-answer scores into [0, 5]", () => {
    expect(resolveQuestionXpAward(ActivityType.SA_QUESTION, payload(3))).toBe(3);
    expect(resolveQuestionXpAward(ActivityType.SA_QUESTION, payload(7))).toBe(5);
    expect(resolveQuestionXpAward(ActivityType.SA_QUESTION, payload(-2))).toBe(0);
    expect(resolveQuestionXpAward(ActivityType.SA_QUESTION, payload(2.7))).toBe(2);
    expect(
      resolveQuestionXpAward(ActivityType.SA_QUESTION, payload(undefined)),
    ).toBe(0);
    expect(resolveQuestionXpAward(ActivityType.SA_QUESTION, null)).toBe(0);
    expect(
      Number.isNaN(resolveQuestionXpAward(ActivityType.SA_QUESTION, payload("9"))),
    ).toBe(false);
  });

  it("clamps long-answer scores into [0, 25]", () => {
    expect(resolveQuestionXpAward(ActivityType.LA_QUESTION, payload(20))).toBe(20);
    expect(resolveQuestionXpAward(ActivityType.LA_QUESTION, payload(30))).toBe(25);
    expect(
      resolveQuestionXpAward(ActivityType.LA_QUESTION, payload(undefined)),
    ).toBe(0);
    expect(Number.isNaN(resolveQuestionXpAward(ActivityType.LA_QUESTION, null))).toBe(
      false,
    );
  });

  it("delegates non-question activity types to the table award unchanged", () => {
    const questionShapedPayload = payload(99, [{ answer: "a", isCorrect: "a" }]);
    for (const activityType of [
      ActivityType.ARTICLE_READ,
      ActivityType.LEVEL_TEST,
    ]) {
      expect(
        resolveQuestionXpAward(activityType, questionShapedPayload),
      ).toBe(resolveXpAward(activityType));
    }
  });
});

describe("server-side flashcard game XP awards", () => {
  it("pays twice the correct-item count inside the deck size", () => {
    expect(resolveFlashcardGameXpAward(4, 10)).toBe(8);
    expect(resolveFlashcardGameXpAward(3, 10)).toBe(6);
  });

  it("clamps scores above the deck size to the deck maximum", () => {
    expect(resolveFlashcardGameXpAward(99, 10)).toBe(20);
  });

  it("pays zero for negative or missing input and never returns NaN", () => {
    expect(resolveFlashcardGameXpAward(-1, 10)).toBe(0);
    expect(resolveFlashcardGameXpAward(undefined, 10)).toBe(0);
    expect(resolveFlashcardGameXpAward(5, undefined)).toBe(0);
    expect(Number.isNaN(resolveFlashcardGameXpAward("many", 10))).toBe(false);
    expect(Number.isInteger(resolveFlashcardGameXpAward(2.7, 10))).toBe(true);
    expect(resolveFlashcardGameXpAward(2.7, 10)).toBe(4);
  });
});
