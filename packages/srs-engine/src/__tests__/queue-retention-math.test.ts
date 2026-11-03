import { describe, expect, it } from "vitest";
import {
  buildDailyQueue,
  daysOverdue,
  isOverdue,
  predictCardRetention,
} from "../srs/queue.js";
import type { ObjectivePracticePolicy, SrsCardState, SrsSessionConfig } from "../srs/contract.js";

const NOW = "2026-11-03T00:00:00.000Z";
const DAY_MS = 86_400_000;

function card(overrides: Partial<SrsCardState> = {}): SrsCardState {
  return {
    cardId: "card-a",
    studentId: "s1",
    objectiveId: "o1",
    variantKey: "v1",
    stability: 10,
    difficulty: 5,
    state: "review",
    dueDate: NOW,
    elapsedDays: 0,
    scheduledDays: 10,
    reps: 3,
    lapses: 0,
    lastReview: "2026-10-24T00:00:00.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-24T00:00:00.000Z",
    ...overrides,
  };
}

describe("predictCardRetention", () => {
  it("predicts 0.9 retention when elapsed days equal stability", () => {
    expect(predictCardRetention(card(), NOW)).toBeCloseTo(0.9, 12);
  });

  it("predicts 1 right after a review", () => {
    expect(predictCardRetention(card({ lastReview: NOW }), NOW)).toBe(1);
  });

  it("clamps a future lastReview to zero elapsed days", () => {
    expect(predictCardRetention(card({ lastReview: "2026-11-10T00:00:00.000Z" }), NOW)).toBe(1);
  });

  it("uses elapsedDays when lastReview is null", () => {
    expect(predictCardRetention(card({ lastReview: null, elapsedDays: 10 }), NOW)).toBeCloseTo(0.9, 12);
  });

  it("clamps negative elapsedDays to zero", () => {
    expect(predictCardRetention(card({ lastReview: null, elapsedDays: -5 }), NOW)).toBe(1);
  });

  it.each([
    [0, 0],
    [-1, 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 1],
  ])("maps stability %s to retention %s", (stability, expected) => {
    expect(predictCardRetention(card({ stability }), NOW)).toBe(expected);
  });

  it("decreases as time passes", () => {
    const early = predictCardRetention(card(), "2026-10-25T00:00:00.000Z");
    const late = predictCardRetention(card(), "2026-12-25T00:00:00.000Z");
    expect(early).toBeGreaterThan(late);
    expect(late).toBeGreaterThan(0);
  });

  it("treats an offset timestamp as the same instant", () => {
    expect(predictCardRetention(card(), "2026-11-03T07:00:00+07:00")).toBe(predictCardRetention(card(), NOW));
  });
});

describe("isOverdue and daysOverdue", () => {
  it("never marks new or learning cards overdue", () => {
    const past = "2026-10-01T00:00:00.000Z";
    expect(isOverdue(card({ state: "new", dueDate: past }), NOW)).toBe(false);
    expect(isOverdue(card({ state: "learning", dueDate: past }), NOW)).toBe(false);
    expect(daysOverdue(card({ state: "learning", dueDate: past }), NOW)).toBe(0);
  });

  it("does not mark a card due exactly now overdue", () => {
    expect(isOverdue(card({ dueDate: NOW }), NOW)).toBe(false);
    expect(daysOverdue(card({ dueDate: NOW }), NOW)).toBe(0);
  });

  it("marks a relearning card one millisecond late overdue with zero whole days", () => {
    const c = card({ state: "relearning", dueDate: new Date(Date.parse(NOW) - 1).toISOString() });
    expect(isOverdue(c, NOW)).toBe(true);
    expect(daysOverdue(c, NOW)).toBe(0);
  });

  it("floors overdue time to whole 24-hour days", () => {
    const due = Date.parse(NOW);
    expect(daysOverdue(card({ dueDate: NOW }), new Date(due + DAY_MS - 1).toISOString())).toBe(0);
    expect(daysOverdue(card({ dueDate: NOW }), new Date(due + DAY_MS).toISOString())).toBe(1);
    expect(daysOverdue(card({ dueDate: NOW }), new Date(due + 3.5 * DAY_MS).toISOString())).toBe(3);
  });

  it("counts elapsed time, not calendar days, across a UTC midnight", () => {
    const c = card({ dueDate: "2026-11-02T23:00:00.000Z" });
    expect(daysOverdue(c, "2026-11-03T01:00:00.000Z")).toBe(0);
  });
});

describe("buildDailyQueue edge cases", () => {
  const policies = new Map<string, ObjectivePracticePolicy>([
    ["o1", { objectiveId: "o1", priority: "essential" }],
    ["o2", { objectiveId: "o2", priority: "extension" }],
    ["tri", { objectiveId: "tri", priority: "triaged" }],
  ]);
  const config: SrsSessionConfig = { newCardsPerDay: 2, maxReviewsPerDay: 3, prioritizeOverdue: true };

  it("returns an empty queue for no cards", () => {
    expect(buildDailyQueue([], policies, config, NOW)).toEqual([]);
  });

  it("drops cards with triaged or missing policies", () => {
    const queue = buildDailyQueue(
      [card({ cardId: "t", objectiveId: "tri" }), card({ cardId: "m", objectiveId: "missing" })],
      policies,
      config,
      NOW,
    );
    expect(queue).toEqual([]);
  });

  it("orders due reviews by lowest retention, then due date, then card id", () => {
    const queue = buildDailyQueue(
      [
        card({ cardId: "b", stability: 10, dueDate: NOW }),
        card({ cardId: "a", stability: 10, dueDate: NOW }),
        card({ cardId: "c", stability: 10, dueDate: "2026-11-01T00:00:00.000Z" }),
        card({ cardId: "weak", stability: 2 }),
      ],
      policies,
      config,
      NOW,
      { composeSession: false },
    );
    expect(queue.map((item) => item.card.cardId)).toEqual(["weak", "c", "a"]);
  });

  it("excludes reviews due after now", () => {
    const queue = buildDailyQueue([card({ dueDate: "2026-11-03T00:00:00.001Z" })], policies, config, NOW);
    expect(queue).toEqual([]);
  });

  it("orders new cards by priority then card id and caps them per day", () => {
    const queue = buildDailyQueue(
      [
        card({ cardId: "n3", state: "new", objectiveId: "o2" }),
        card({ cardId: "n2", state: "new", objectiveId: "o1" }),
        card({ cardId: "n1", state: "new", objectiveId: "o1" }),
      ],
      policies,
      config,
      NOW,
    );
    expect(queue.map((item) => [item.card.cardId, item.kind])).toEqual([
      ["n1", "new"],
      ["n2", "new"],
    ]);
  });

  it("adds no new cards in backlog mode", () => {
    const reviews = ["r1", "r2", "r3", "r4"].map((cardId) => card({ cardId }));
    const queue = buildDailyQueue(
      [...reviews, card({ cardId: "n1", state: "new" })],
      policies,
      config,
      NOW,
    );
    expect(queue).toHaveLength(3);
    expect(queue.every((item) => item.kind === "review")).toBe(true);
  });

  it("puts remediation first and shrinks review capacity", () => {
    const remediation = {
      card: card({ cardId: "rem" }),
      objectivePriority: "essential" as const,
      isOverdue: false,
      daysOverdue: 0,
    };
    const queue = buildDailyQueue(
      [card({ cardId: "r1" }), card({ cardId: "r2" }), card({ cardId: "r3" })],
      policies,
      config,
      NOW,
      { remediationItems: [remediation, remediation] },
    );
    expect(queue.map((item) => item.kind)).toEqual(["remediation", "remediation", "review"]);
  });

  it("returns nothing when maxReviewsPerDay is zero", () => {
    const queue = buildDailyQueue(
      [card(), card({ cardId: "n1", state: "new" })],
      policies,
      { ...config, maxReviewsPerDay: 0 },
      NOW,
    );
    expect(queue).toEqual([]);
  });
});
