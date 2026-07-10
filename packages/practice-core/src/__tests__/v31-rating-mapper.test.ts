import { describe, expect, it } from "vitest";
import {
  mapPracticeToSrsRating,
  type SrsRatingInput,
} from "../practice/srs-rating.js";

const reliable = {
  hasReliableTiming: true,
  confidence: "medium" as const,
  reasons: [],
};

function input(
  overrides: Partial<SrsRatingInput> & Record<string, unknown> = {},
): SrsRatingInput {
  return {
    parts: [
      {
        isCorrect: true,
        hintsUsed: 0,
        revealStepsSeen: 0,
        misconceptionTags: [],
      },
    ],
    timingFeatures: {
      hasReliableTiming: false,
      confidence: "low",
      reasons: ["fixture_no_timing"],
    },
    baselineSampleCount: 0,
    ...overrides,
  } as SrsRatingInput;
}

describe("v3.1 staged SRS rating mapper (§8.4)", () => {
  it.each([
    { hintsUsed: 1, rating: "Good" },
    { hintsUsed: 2, rating: "Good" },
    { hintsUsed: 3, rating: "Hard" },
  ] as const)(
    "maps $hintsUsed hints to the normative $rating cap",
    ({ hintsUsed, rating }) => {
      const result = mapPracticeToSrsRating(
        input({
          parts: [
            {
              isCorrect: true,
              hintsUsed,
              revealStepsSeen: 0,
              misconceptionTags: [],
            },
          ],
        }),
      );
      expect(result.rating).toBe(rating);
    },
  );

  it("maps any reveal to Hard and all revealed steps to Again", () => {
    expect(
      mapPracticeToSrsRating(
        input({
          parts: [
            {
              isCorrect: true,
              hintsUsed: 0,
              revealStepsSeen: 1,
              misconceptionTags: [],
            },
          ],
          totalRevealSteps: 3,
        }),
      ).rating,
    ).toBe("Hard");
    expect(
      mapPracticeToSrsRating(
        input({
          parts: [
            {
              isCorrect: true,
              hintsUsed: 0,
              revealStepsSeen: 3,
              misconceptionTags: [],
            },
          ],
          totalRevealSteps: 3,
        }),
      ).rating,
    ).toBe("Again");
  });

  it("uses reliable z-score boundaries and ignores unreliable baselines", () => {
    const fast = mapPracticeToSrsRating(
      input({
        timingFeatures: { ...reliable, zScore: -1 },
        baselineSampleCount: 10,
      }),
    );
    const slow = mapPracticeToSrsRating(
      input({
        timingFeatures: { ...reliable, zScore: 2 },
        baselineSampleCount: 10,
      }),
    );
    const insufficient = mapPracticeToSrsRating(
      input({
        timingFeatures: { ...reliable, zScore: -2, speedBand: "fast" },
        baselineSampleCount: 9,
      }),
    );

    expect(fast.rating).toBe("Easy");
    expect(slow.rating).toBe("Hard");
    expect(insufficient.rating).toBe("Good");
  });

  it("caps minor and severe misconceptions and reports the cap explicitly", () => {
    const minor = mapPracticeToSrsRating(
      input({
        parts: [
          {
            isCorrect: true,
            hintsUsed: 0,
            revealStepsSeen: 0,
            misconceptionTags: ["sign-error"],
          },
        ],
        severityByTag: { "sign-error": "minor" },
      }),
    ) as ReturnType<typeof mapPracticeToSrsRating> & {
      misconceptionCapped?: boolean;
    };
    const severe = mapPracticeToSrsRating(
      input({
        parts: [
          {
            isCorrect: true,
            hintsUsed: 0,
            revealStepsSeen: 0,
            misconceptionTags: ["fabricated-rule"],
          },
        ],
        severityByTag: { "fabricated-rule": "severe" },
      }),
    ) as ReturnType<typeof mapPracticeToSrsRating> & {
      misconceptionCapped?: boolean;
    };

    expect(minor.rating).toBe("Hard");
    expect(minor.misconceptionCapped).toBe(true);
    expect(severe.rating).toBe("Again");
    expect(severe.misconceptionCapped).toBe(true);
  });
});
