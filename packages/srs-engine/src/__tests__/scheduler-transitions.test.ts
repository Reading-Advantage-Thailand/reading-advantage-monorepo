import { describe, expect, it } from "vitest";
import {
  createCard,
  getDueCards,
  previewInterval,
  resolveRequestRetention,
  reviewCard,
} from "../srs/scheduler.js";
import type { SrsCardState, SrsRating } from "../srs/contract.js";

const NOW = "2026-11-03T00:00:00.000Z";
const DAY_MS = 86_400_000;

function newCard(overrides: Partial<SrsCardState> = {}): SrsCardState {
  return { ...createCard({ studentId: "s1", objectiveId: "o1", now: NOW }), ...overrides };
}

function reviewedCard(): SrsCardState {
  const first = reviewCard(newCard(), "Good", NOW, { enableIntervalFuzz: false });
  return reviewCard(first, "Good", first.dueDate, { enableIntervalFuzz: false });
}

describe("createCard", () => {
  it("defaults variantKey to objectiveId", () => {
    expect(newCard().variantKey).toBe("o1");
  });

  it("keeps an explicit variantKey", () => {
    const card = createCard({ studentId: "s1", objectiveId: "o1", variantKey: "v1", now: NOW });
    expect(card.variantKey).toBe("v1");
  });

  it("makes a new card due at creation time", () => {
    const card = newCard();
    expect(card.dueDate).toBe(NOW);
    expect(card.createdAt).toBe(NOW);
    expect(card.updatedAt).toBe(NOW);
    expect(card.lastReview).toBeNull();
  });

  it("generates distinct card ids", () => {
    const a = newCard();
    const b = newCard();
    expect(a.cardId).toMatch(/^card_[0-9a-f]{32}$/);
    expect(a.cardId).not.toBe(b.cardId);
  });
});

describe("reviewCard without fuzz", () => {
  const cases: Array<[SrsRating, number]> = [
    ["Again", 1],
    ["Hard", 2],
    ["Good", 3],
    ["Easy", 8],
  ];

  it.each(cases)("schedules a new card rated %s for %i days", (rating, days) => {
    const updated = reviewCard(newCard(), rating, NOW, { enableIntervalFuzz: false });
    expect(updated.state).toBe("review");
    expect(updated.reps).toBe(1);
    expect(updated.scheduledDays).toBe(days);
    expect(updated.dueDate).toBe(new Date(Date.parse(NOW) + days * DAY_MS).toISOString());
    expect(updated.lastReview).toBe(NOW);
    expect(updated.updatedAt).toBe(NOW);
  });

  it("keeps identity fields across a review", () => {
    const card = newCard({ variantKey: "v9" });
    const updated = reviewCard(card, "Good", NOW, { enableIntervalFuzz: false });
    expect(updated.cardId).toBe(card.cardId);
    expect(updated.studentId).toBe("s1");
    expect(updated.objectiveId).toBe("o1");
    expect(updated.variantKey).toBe("v9");
  });

  it("does not mutate the input card", () => {
    const card = newCard();
    const snapshot = { ...card };
    reviewCard(card, "Good", NOW);
    expect(card).toEqual(snapshot);
  });

  it("counts a lapse and stays in review when a review card is rated Again", () => {
    const card = reviewedCard();
    const lapsed = reviewCard(card, "Again", card.dueDate, { enableIntervalFuzz: false });
    expect(lapsed.lapses).toBe(card.lapses + 1);
    expect(lapsed.state).toBe("review");
    expect(lapsed.scheduledDays).toBe(2);
  });

  it("orders intervals Again <= Hard <= Good <= Easy for a review card", () => {
    const card = reviewedCard();
    const days = (["Again", "Hard", "Good", "Easy"] as const).map(
      (rating) => reviewCard(card, rating, card.dueDate, { enableIntervalFuzz: false }).scheduledDays,
    );
    expect([...days].sort((a, b) => a - b)).toEqual(days);
  });

  it("keeps Again within a small maximumInterval", () => {
    const card = reviewedCard();
    const updated = reviewCard(card, "Again", card.dueDate, {
      enableIntervalFuzz: false,
      maximumInterval: 2,
    });
    expect(updated.scheduledDays).toBeLessThanOrEqual(2);
  });


  it("schedules shorter intervals for higher-retention priorities", () => {
    const card = reviewedCard();
    const at = card.dueDate;
    const essential = reviewCard(card, "Good", at, { enableIntervalFuzz: false }, "essential");
    const extension = reviewCard(card, "Good", at, { enableIntervalFuzz: false }, "extension");
    expect(essential.scheduledDays).toBeLessThanOrEqual(extension.scheduledDays);
  });

  it("rejects an out-of-range priority retention override", () => {
    expect(() =>
      reviewCard(newCard(), "Good", NOW, { requestRetentionByPriority: { essential: 1.5 } }, "essential"),
    ).toThrow(RangeError);
  });

});

describe("reviewCard with fuzz", () => {
  it("keeps the fuzzed due date within 5 percent of the FSRS interval", () => {
    const card = reviewedCard();
    const at = card.dueDate;
    const plain = reviewCard(card, "Good", at, { enableIntervalFuzz: false });
    const fuzzed = reviewCard(card, "Good", at);
    const baseMs = plain.scheduledDays * DAY_MS;
    const fuzzedMs = Date.parse(fuzzed.dueDate) - Date.parse(at);
    expect(Math.abs(fuzzedMs - baseMs)).toBeLessThanOrEqual(baseMs * 0.05);
    expect(fuzzed.scheduledDays).toBeCloseTo(fuzzedMs / DAY_MS, 10);
  });

  it("is deterministic for the same card, reps, and time", () => {
    const card = reviewedCard();
    const a = reviewCard(card, "Good", card.dueDate);
    const b = reviewCard(card, "Good", card.dueDate);
    expect(a.dueDate).toBe(b.dueDate);
  });

  it("balances onto a UTC day inside the 5 percent window when loads are given", () => {
    const card = reviewedCard();
    const at = card.dueDate;
    const plain = reviewCard(card, "Good", at, { enableIntervalFuzz: false });
    const balanced = reviewCard(card, "Good", at, {
      projectedLoadByDate: { "2000-01-01": 1 },
    });
    const dueMs = Date.parse(balanced.dueDate);
    const atMs = Date.parse(at);
    expect(dueMs).toBeGreaterThanOrEqual(atMs + plain.scheduledDays * 0.95 * DAY_MS - DAY_MS);
    expect(dueMs).toBeLessThanOrEqual(atMs + plain.scheduledDays * 1.05 * DAY_MS);
    expect(balanced.scheduledDays).toBeCloseTo((dueMs - atMs) / DAY_MS, 10);
  });
});

describe("getDueCards", () => {
  it("returns an empty list for no cards", () => {
    expect(getDueCards([], NOW)).toEqual([]);
  });

  it("includes a card due exactly now", () => {
    const card = newCard({ dueDate: NOW });
    expect(getDueCards([card], NOW)).toEqual([card]);
  });

  it("excludes a card due one millisecond later", () => {
    const card = newCard({ dueDate: "2026-11-03T00:00:00.001Z" });
    expect(getDueCards([card], NOW)).toEqual([]);
  });

  it("compares instants across time-zone offsets", () => {
    const card = newCard({ dueDate: "2026-11-03T07:00:00+07:00" });
    expect(getDueCards([card], NOW)).toEqual([card]);
    expect(getDueCards([card], "2026-11-02T23:59:59.999Z")).toEqual([]);
  });

  it("excludes a card with an unparseable due date", () => {
    expect(getDueCards([newCard({ dueDate: "not-a-date" })], NOW)).toEqual([]);
  });
});

describe("previewInterval", () => {
  it("matches the unfuzzed review interval and leaves the card unchanged", () => {
    const card = reviewedCard();
    const snapshot = { ...card };
    const days = previewInterval(card, "Good", card.dueDate);
    expect(days).toBe(reviewCard(card, "Good", card.dueDate, { enableIntervalFuzz: false }).scheduledDays);
    expect(card).toEqual(snapshot);
  });

  it("previews a new card rated Easy as 8 days", () => {
    expect(previewInterval(newCard(), "Easy", NOW)).toBe(8);
  });
});

describe("resolveRequestRetention", () => {
  it("uses the normative priority target by default", () => {
    expect(resolveRequestRetention("essential")).toBe(0.95);
    expect(resolveRequestRetention("supporting")).toBe(0.9);
    expect(resolveRequestRetention("extension")).toBe(0.8);
  });

  it("uses the scalar default for triaged objectives", () => {
    expect(resolveRequestRetention("triaged")).toBe(0.9);
  });

  it("prefers a per-priority override over the scalar", () => {
    expect(
      resolveRequestRetention("extension", {
        requestRetention: 0.7,
        requestRetentionByPriority: { extension: 0.85 },
      }),
    ).toBe(0.85);
  });

  it("uses the normative target when another priority is overridden", () => {
    expect(
      resolveRequestRetention("supporting", {
        requestRetention: 0.7,
        requestRetentionByPriority: { essential: 0.99 },
      }),
    ).toBe(0.9);
  });

  it("uses the scalar for triaged when only other priorities are overridden", () => {
    expect(
      resolveRequestRetention("triaged", {
        requestRetention: 0.7,
        requestRetentionByPriority: { essential: 0.99 },
      }),
    ).toBe(0.7);
  });

  it("accepts a retention of exactly 1", () => {
    expect(resolveRequestRetention("essential", { requestRetentionByPriority: { essential: 1 } })).toBe(1);
  });

  it.each([0, -0.1, 1.01, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects a retention of %s",
    (value) => {
      expect(() => resolveRequestRetention("triaged", { requestRetention: value })).toThrow(
        "requestRetention must be finite and in (0, 1]",
      );
    },
  );
});
