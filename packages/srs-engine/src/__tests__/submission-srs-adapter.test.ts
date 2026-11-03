import { afterEach, describe, expect, it, vi } from "vitest";
import {
  InMemoryPracticeVariantResolver,
  InMemorySubmissionSrsAdapter,
  InMemoryTimingBaselineResolver,
  SubmissionSrsAdapter,
} from "../srs/submission-srs-adapter.js";
import { InMemoryCardStore, InMemoryReviewLogStore } from "../srs/adapters.js";
import { createCard } from "../srs/scheduler.js";
import type {
  PracticeSubmissionEnvelope,
  PracticeTimingBaseline,
  SrsCardState,
  SrsReviewLogEntry,
} from "../srs/contract.js";

const NOW = "2026-11-03T00:00:00.000Z";

type Part = PracticeSubmissionEnvelope["parts"][number];

function submission(
  parts: Part[],
  extra: Partial<PracticeSubmissionEnvelope> = {},
): PracticeSubmissionEnvelope {
  return {
    contractVersion: "practice.v1",
    activityId: "activity-a" as PracticeSubmissionEnvelope["activityId"],
    mode: "independent_practice",
    status: "submitted",
    attemptNumber: 2,
    submittedAt: NOW,
    answers: {},
    parts,
    ...extra,
  };
}

function registeredAdapter(): InMemorySubmissionSrsAdapter {
  const adapter = new InMemorySubmissionSrsAdapter();
  adapter.getResolver().register("activity-a", { objectiveId: "objective-a", variantKey: "variant-a" });
  return adapter;
}

const input = (parts: Part[], extra: Partial<PracticeSubmissionEnvelope> = {}) => ({
  submission: submission(parts, extra),
  studentId: "student-a",
  activityId: "activity-a",
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SubmissionSrsAdapter skips and errors", () => {
  it("skips with no_blueprint and writes nothing for an unknown activity", async () => {
    const adapter = new InMemorySubmissionSrsAdapter();
    const result = await adapter.processSubmission(input([{ partId: "p1", rawAnswer: 1, isCorrect: true }]));
    expect(result).toEqual({ ok: false, skipped: true, reason: "no_blueprint" });
    expect(await adapter.getCardStore().getCardsByStudent("student-a")).toEqual([]);
    expect(await adapter.getReviewLogStore().getReviewsByStudent("student-a")).toEqual([]);
  });

  it("returns the error message when a resolver throws an Error", async () => {
    const adapter = new SubmissionSrsAdapter({
      cardStore: new InMemoryCardStore(),
      reviewLogStore: new InMemoryReviewLogStore(),
      resolver: { resolve: async () => Promise.reject(new Error("resolver down")) },
      baselineResolver: new InMemoryTimingBaselineResolver(),
    });
    const result = await adapter.processSubmission(input([]));
    expect(result).toEqual({ ok: false, skipped: false, error: "resolver down" });
  });

  it("stringifies a non-Error rejection", async () => {
    const adapter = new SubmissionSrsAdapter({
      cardStore: new InMemoryCardStore(),
      reviewLogStore: new InMemoryReviewLogStore(),
      resolver: { resolve: async () => ({ objectiveId: "o", variantKey: "v" }) },
      baselineResolver: { getBaseline: async () => Promise.reject("baseline down") },
    });
    const result = await adapter.processSubmission(input([]));
    expect(result).toEqual({ ok: false, skipped: false, error: "baseline down" });
  });
});

describe("SubmissionSrsAdapter first review", () => {
  it("creates, reviews, and stores one card and one review", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
    const adapter = registeredAdapter();

    const result = await adapter.processSubmission(input([{ partId: "p1", rawAnswer: 1, isCorrect: true }]));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cards = await adapter.getCardStore().getCardsByStudent("student-a");
    expect(cards).toHaveLength(1);
    expect(cards[0]).toEqual(result.card);
    expect(result.card).toMatchObject({ objectiveId: "objective-a", variantKey: "variant-a", reps: 1 });
    expect(result.reviewLog.rating).toBe("Good");
    expect(result.reviewLog.reviewId).toMatch(/^rev_[0-9a-f]{32}$/);
    expect(result.reviewLog.reviewedAt).toBe(NOW);
    expect(result.reviewLog.stateBefore).toEqual({ stability: 0, difficulty: 0, state: "new", reps: 0, lapses: 0 });
    expect(result.reviewLog.stateAfter.reps).toBe(1);
    expect(result.reviewLog.evidence).toEqual({
      baseRating: "Good",
      timingAdjusted: false,
      reasons: ["timing_missing"],
      misconceptionTags: undefined,
    });

    const reviews = await adapter.getReviewLogStore().getReviewsByCard(result.card.cardId);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({ studentId: "student-a", submissionId: "activity-a-2" });
  });

  it("rates an empty submission Again", async () => {
    const result = await registeredAdapter().processSubmission(input([]));
    expect(result.ok && result.reviewLog.rating).toBe("Again");
  });

  it("rates an incorrect part Again and dedupes misconception tags", async () => {
    const result = await registeredAdapter().processSubmission(
      input([
        { partId: "p1", rawAnswer: 1, isCorrect: false, misconceptionTags: ["sign", "unit"] },
        { partId: "p2", rawAnswer: 2, isCorrect: false, misconceptionTags: ["sign"] },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reviewLog.rating).toBe("Again");
    expect(result.reviewLog.evidence.misconceptionTags).toEqual(["sign", "unit"]);
  });

  it("omits timing_missing when the submission has timing", async () => {
    const adapter = registeredAdapter();
    const baseline: PracticeTimingBaseline = {
      variantKey: "variant-a",
      sampleCount: 50,
      medianActiveMs: 40000,
      lastComputedAt: NOW,
      minSamplesMet: true,
    };
    adapter.getBaselineResolver().setBaseline("variant-a", baseline);
    const result = await adapter.processSubmission(
      input([{ partId: "p1", rawAnswer: 1, isCorrect: true }], {
        timing: {
          startedAt: NOW,
          submittedAt: NOW,
          wallClockMs: 40000,
          activeMs: 40000,
          idleMs: 0,
          pauseCount: 0,
          focusLossCount: 0,
          visibilityHiddenCount: 0,
          confidence: "high",
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reviewLog.evidence.reasons).not.toContain("timing_missing");
  });
});

describe("SubmissionSrsAdapter repeat review", () => {
  it("reuses the existing card for the same student and variant", async () => {
    const adapter = registeredAdapter();
    const first = await adapter.processSubmission(input([{ partId: "p1", rawAnswer: 1, isCorrect: true }]));
    const second = await adapter.processSubmission(input([{ partId: "p1", rawAnswer: 1, isCorrect: true }]));
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.card.cardId).toBe(first.card.cardId);
    expect(second.reviewLog.stateBefore.reps).toBe(1);
    expect(second.card.reps).toBe(2);
    expect(await adapter.getCardStore().getCardsByStudent("student-a")).toHaveLength(1);
    expect(await adapter.getReviewLogStore().getReviewsByCard(first.card.cardId)).toHaveLength(2);
  });

  it("keeps separate cards for separate students", async () => {
    const adapter = registeredAdapter();
    await adapter.processSubmission(input([]));
    await adapter.processSubmission({ ...input([]), studentId: "student-b" });
    expect(await adapter.getCardStore().getCardsByObjective("objective-a")).toHaveLength(2);
  });
});

describe("SubmissionSrsAdapter atomic save", () => {
  function atomicStore(fail = false) {
    const store = new InMemoryCardStore();
    const saveCard = vi.spyOn(store, "saveCard");
    const saveCardAndReview = vi.fn(async (card: SrsCardState, review: SrsReviewLogEntry) => {
      if (fail) throw new Error("tx failed");
      await store.saveCard(card);
      void review;
    });
    Object.assign(store, { saveCardAndReview });
    return { store, saveCard, saveCardAndReview };
  }

  function adapterWith(store: InMemoryCardStore, reviewLogStore: InMemoryReviewLogStore) {
    const resolver = new InMemoryPracticeVariantResolver();
    resolver.register("activity-a", { objectiveId: "objective-a", variantKey: "variant-a" });
    return new SubmissionSrsAdapter({
      cardStore: store,
      reviewLogStore,
      resolver,
      baselineResolver: new InMemoryTimingBaselineResolver(),
    });
  }

  it("uses saveCardAndReview instead of the review log store", async () => {
    const { store, saveCardAndReview } = atomicStore();
    const reviewLogStore = new InMemoryReviewLogStore();
    const saveReview = vi.spyOn(reviewLogStore, "saveReview");
    const result = await adapterWith(store, reviewLogStore).processSubmission(input([]));
    expect(result.ok).toBe(true);
    expect(saveCardAndReview).toHaveBeenCalledTimes(1);
    expect(saveReview).not.toHaveBeenCalled();
  });

  it("does not pre-save an existing card on the atomic path", async () => {
    const { store, saveCard, saveCardAndReview } = atomicStore();
    const existing = createCard({ studentId: "student-a", objectiveId: "objective-a", variantKey: "variant-a", now: NOW });
    await store.saveCard(existing);
    saveCard.mockClear();
    await adapterWith(store, new InMemoryReviewLogStore()).processSubmission(input([]));
    expect(saveCardAndReview.mock.calls[0][0].cardId).toBe(existing.cardId);
    expect(saveCard).toHaveBeenCalledTimes(1);
  });

  it("returns an error when the atomic save fails", async () => {
    const { store } = atomicStore(true);
    const result = await adapterWith(store, new InMemoryReviewLogStore()).processSubmission(input([]));
    expect(result).toEqual({ ok: false, skipped: false, error: "tx failed" });
  });

  it.fails("leaves no new card behind when the atomic save fails", async () => {
    const { store } = atomicStore(true);
    await adapterWith(store, new InMemoryReviewLogStore()).processSubmission(input([]));
    expect(await store.getCardsByStudent("student-a")).toEqual([]);
  });
});

describe("InMemorySubmissionSrsAdapter stores", () => {
  it("finds due cards at the exact due instant and by card id", async () => {
    const adapter = registeredAdapter();
    const result = await adapter.processSubmission(input([]));
    if (!result.ok) throw new Error("expected ok");
    const store = adapter.getCardStore();
    expect(await store.getCard(result.card.cardId)).toEqual(result.card);
    expect(await store.getCard("missing")).toBeNull();
    expect(await store.getDueCards("student-a", result.card.dueDate)).toHaveLength(1);
    const before = new Date(Date.parse(result.card.dueDate) - 1).toISOString();
    expect(await store.getDueCards("student-a", before)).toEqual([]);
    expect(await store.getDueCards("student-b", result.card.dueDate)).toEqual([]);
  });

  it("saves many cards and filters by objective", async () => {
    const store = new InMemorySubmissionSrsAdapter().getCardStore();
    const a = createCard({ studentId: "s", objectiveId: "o1", now: NOW });
    const b = createCard({ studentId: "s", objectiveId: "o2", now: NOW });
    await store.saveCards([a, b]);
    expect(await store.getCardsByObjective("o1")).toEqual([a]);
    expect(await store.getCardByStudentAndVariant("s", "o2")).toEqual(b);
    expect(await store.getCardByStudentAndVariant("s", "o3")).toBeNull();
  });

  it("filters reviews by since inclusively and sorts by time", async () => {
    const logs = new InMemorySubmissionSrsAdapter().getReviewLogStore();
    const entry = (reviewId: string, reviewedAt: string, studentId = "s") =>
      ({ reviewId, cardId: "c", studentId, reviewedAt }) as unknown as SrsReviewLogEntry;
    await logs.saveReview(entry("r2", "2026-11-03T12:00:00.000Z"));
    await logs.saveReview(entry("r1", "2026-11-02T23:59:59.999Z"));
    await logs.saveReview(entry("r3", "2026-11-03T00:00:00.000Z"));
    await logs.saveReview(entry("x", "2026-11-03T00:00:00.000Z", "other"));

    expect((await logs.getReviewsByStudent("s")).map((r) => r.reviewId)).toEqual(["r1", "r3", "r2"]);
    expect((await logs.getReviewsByStudent("s", "2026-11-03T07:00:00+07:00")).map((r) => r.reviewId)).toEqual([
      "r3",
      "r2",
    ]);
    expect((await logs.getReviewsByCard("c")).map((r) => r.reviewId)).toEqual(["r1", "r3", "x", "r2"]);
  });
});
