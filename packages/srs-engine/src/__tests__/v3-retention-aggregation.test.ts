import { describe, expect, it } from "vitest";
import * as proficiencyModule from "../srs/srs-proficiency.js";
import { stabilityToRetention } from "../srs/srs-proficiency.js";

type ObjectiveCard = {
  cardId: string;
  variantKey: string;
  stability: number;
  elapsedDays: number;
  reps: number;
};
type AggregateObjectiveRetention = (cards: ObjectiveCard[]) => number | null;

function aggregateObjectiveRetention(cards: ObjectiveCard[]): number | null {
  const candidate = (
    proficiencyModule as unknown as {
      aggregateObjectiveRetention?: AggregateObjectiveRetention;
    }
  ).aggregateObjectiveRetention;
  expect(
    candidate,
    "v3 must export objective-level minimum retention across reviewed variants",
  ).toBeTypeOf("function");
  return candidate!(cards);
}

describe("v3 elapsed-time retention and objective aggregation (§2.1.1, §13.5)", () => {
  it("uses the FSRS power curve and requires elapsed days", () => {
    expect(stabilityToRetention(10, 0)).toBeCloseTo(1, 12);
    expect(stabilityToRetention(10, 10)).toBeCloseTo(0.9, 12);
    expect(stabilityToRetention(10, 30)).toBeCloseTo(0.766, 3);
  });

  it("takes the minimum across reviewed practice variants", () => {
    const result = aggregateObjectiveRetention([
      {
        cardId: "v1",
        variantKey: "v1",
        stability: 20,
        elapsedDays: 5,
        reps: 3,
      },
      {
        cardId: "v2",
        variantKey: "v2",
        stability: 8,
        elapsedDays: 12,
        reps: 2,
      },
      {
        cardId: "v3",
        variantKey: "v3",
        stability: 0.1,
        elapsedDays: 100,
        reps: 0,
      },
    ]);

    expect(result).toBeCloseTo(0.86, 3);
  });

  it("excludes unreviewed cards and returns no live retention without history", () => {
    expect(
      aggregateObjectiveRetention([
        {
          cardId: "new",
          variantKey: "new",
          stability: 0.1,
          elapsedDays: 100,
          reps: 0,
        },
      ]),
    ).toBeNull();
  });
});
