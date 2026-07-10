import { describe, expect, it } from "vitest";

import { buildDailyQueue } from "../srs/queue.js";
import type {
  ObjectivePracticePolicy,
  SrsCardState,
  SrsSessionConfig,
} from "../srs/contract.js";

const FIXTURE_PROVENANCE = Object.freeze({
  specVersion: "kst-srs.v3",
  configVersion: "daily-queue.v3",
  graphRelease: "codecamp.synthetic.v1",
  paramsVersion: "fsrs.v5.3.2.defaults",
});

const NOW = "2026-07-10T00:00:00.000Z";
const DAY_MS = 86_400_000;
const CONFIG: SrsSessionConfig = {
  newCardsPerDay: 4,
  maxReviewsPerDay: 20,
  prioritizeOverdue: true,
};

function isoDaysBefore(days: number): string {
  return new Date(Date.parse(NOW) - days * DAY_MS).toISOString();
}

function reviewCard(index: number): SrsCardState {
  return {
    cardId: `review-${String(index).padStart(2, "0")}`,
    studentId: "student-queue",
    objectiveId: `objective-${String(index).padStart(2, "0")}`,
    variantKey: `variant-${index}`,
    stability: index,
    difficulty: 5,
    state: "review",
    dueDate: isoDaysBefore(30 - index),
    elapsedDays: 10,
    scheduledDays: 1,
    reps: 3,
    lapses: 0,
    lastReview: isoDaysBefore(10),
    createdAt: isoDaysBefore(40),
    updatedAt: isoDaysBefore(10),
  };
}

function newCard(index: number): SrsCardState {
  return {
    ...reviewCard(30 + index),
    cardId: `new-${index}`,
    objectiveId: `new-objective-${index}`,
    variantKey: `new-variant-${index}`,
    stability: 0,
    state: "new",
    dueDate: NOW,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lastReview: null,
  };
}

function policiesFor(
  cards: SrsCardState[],
): Map<string, ObjectivePracticePolicy> {
  return new Map(
    cards.map((card) => [
      card.objectiveId,
      { objectiveId: card.objectiveId, priority: "essential" as const },
    ]),
  );
}

describe("kst-srs.v3 daily queue", () => {
  it("enters backlog mode with 25 due reviews: 20 lowest-retention reviews and zero new cards", () => {
    expect(FIXTURE_PROVENANCE.configVersion).toBe("daily-queue.v3");

    const reviews = Array.from({ length: 25 }, (_, index) =>
      reviewCard(index + 1),
    );
    const newCards = Array.from({ length: 6 }, (_, index) =>
      newCard(index + 1),
    );
    const cards = [...reviews, ...newCards];

    const queue = buildDailyQueue(cards, policiesFor(cards), CONFIG, NOW);

    expect(queue).toHaveLength(20);
    expect(queue.every((item) => item.card.state !== "new")).toBe(true);
    expect(queue.map((item) => item.card.cardId)).toEqual(
      reviews.slice(0, 20).map((card) => card.cardId),
    );
  });

  it("orders due reviews by predicted retention rather than raw days overdue", () => {
    const highRetentionButMoreOverdue: SrsCardState = {
      ...reviewCard(100),
      cardId: "high-retention-more-overdue",
      stability: 100,
      dueDate: isoDaysBefore(20),
      lastReview: isoDaysBefore(20),
      elapsedDays: 20,
    };
    const lowRetentionButLessOverdue: SrsCardState = {
      ...reviewCard(101),
      cardId: "low-retention-less-overdue",
      stability: 2,
      dueDate: isoDaysBefore(1),
      lastReview: isoDaysBefore(8),
      elapsedDays: 8,
    };
    const cards = [highRetentionButMoreOverdue, lowRetentionButLessOverdue];

    const queue = buildDailyQueue(cards, policiesFor(cards), CONFIG, NOW);

    expect(queue.map((item) => item.card.cardId)).toEqual([
      "low-retention-less-overdue",
      "high-retention-more-overdue",
    ]);
  });

  it("admits reviews before at most newCardsPerDay new cards on a normal day", () => {
    const reviews = Array.from({ length: 12 }, (_, index) =>
      reviewCard(index + 1),
    );
    const newCards = Array.from({ length: 6 }, (_, index) =>
      newCard(index + 1),
    );
    const cards = [...reviews, ...newCards];

    const queue = buildDailyQueue(cards, policiesFor(cards), CONFIG, NOW);
    const firstNewIndex = queue.findIndex((item) => item.card.state === "new");

    expect(queue).toHaveLength(16);
    expect(firstNewIndex).toBe(12);
    expect(queue.filter((item) => item.card.state === "new")).toHaveLength(4);
  });
});
