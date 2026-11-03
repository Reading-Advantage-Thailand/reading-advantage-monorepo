import { describe, it, expect, vi, afterEach } from "vitest";
import { scheduleFsrsReview, scheduleFsrsReviewNow, type FsrsRating } from "../reading/fsrs-scheduler.js";

const DAY = 24 * 60 * 60 * 1000;
const due = new Date("2026-05-01T00:00:00.000Z");
const card = { due, stability: 10, difficulty: 5, reps: 2, lapses: 1, state: 2 };

function daysAfter(rating: FsrsRating, overrides: Partial<typeof card> = {}) {
  const out = scheduleFsrsReview({ ...card, ...overrides, rating });
  return (out.due.getTime() - (overrides.due ?? due).getTime()) / DAY;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("scheduleFsrsReview", () => {
  it("schedules Again for now and counts a lapse", () => {
    const out = scheduleFsrsReview({ ...card, rating: 1 });
    expect(out.due.getTime()).toBe(due.getTime());
    expect(out).toMatchObject({ reps: 3, lapses: 2, state: 3, difficulty: 6.5, stability: 4 });
  });

  it("computes Hard, Good and Easy intervals at difficulty 5", () => {
    expect(daysAfter(2)).toBeCloseTo(9);
    expect(daysAfter(3)).toBeCloseTo(15);
    expect(daysAfter(4)).toBeCloseTo(24);
  });

  it("updates stability, difficulty and state per rating", () => {
    expect(scheduleFsrsReview({ ...card, rating: 2 })).toMatchObject({ stability: 8, difficulty: 5.5, lapses: 1, state: 2 });
    expect(scheduleFsrsReview({ ...card, rating: 3 }).stability).toBeCloseTo(12);
    expect(scheduleFsrsReview({ ...card, rating: 3 }).difficulty).toBe(5);
    expect(scheduleFsrsReview({ ...card, rating: 4 })).toMatchObject({ stability: 16, difficulty: 4.25 });
  });

  it.each([
    [1, 1], [5, 10], [10, 10], [3, 1],
  ])("keeps difficulty in 1..10 (start %d)", (difficulty) => {
    for (const rating of [1, 2, 3, 4] as FsrsRating[]) {
      const d = scheduleFsrsReview({ ...card, difficulty, rating }).difficulty;
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });

  it("clamps difficulty at the bounds", () => {
    expect(scheduleFsrsReview({ ...card, difficulty: 10, rating: 1 }).difficulty).toBe(10);
    expect(scheduleFsrsReview({ ...card, difficulty: 1, rating: 4 }).difficulty).toBe(1);
  });

  it("maps a NaN difficulty to 5", () => {
    expect(scheduleFsrsReview({ ...card, difficulty: Number.NaN, rating: 3 }).difficulty).toBe(5);
  });

  it("floors stability at 0.01 for a new card", () => {
    const out = scheduleFsrsReview({ ...card, stability: 0, rating: 1 });
    expect(out.stability).toBe(0.01);
    expect(daysAfter(3, { stability: 0 })).toBeGreaterThan(0);
  });

  it("treats negative reps as zero", () => {
    expect(scheduleFsrsReview({ ...card, reps: -4, rating: 3 }).reps).toBe(1);
  });

  it.each([1, 3, 5, 8, 10])("never schedules a lower rating later than a higher one (difficulty %d)", (difficulty) => {
    for (const stability of [0, 0.5, 3, 40]) {
      const d = [1, 2, 3, 4].map((r) => daysAfter(r as FsrsRating, { difficulty, stability }));
      expect(d[0]).toBeLessThanOrEqual(d[1]);
      expect(d[1]).toBeLessThanOrEqual(d[2]);
      expect(d[2]).toBeLessThanOrEqual(d[3]);
    }
  });

  it("does not mutate its input", () => {
    const input = { ...card, rating: 4 as const };
    const copy = { ...input, due: new Date(input.due) };
    scheduleFsrsReview(input);
    expect(input).toEqual(copy);
  });
});

describe("scheduleFsrsReviewNow", () => {
  it("starts from the current time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(due);
    const { due: _ignored, ...current } = card;
    const out = scheduleFsrsReviewNow(current, 3);
    expect((out.due.getTime() - due.getTime()) / DAY).toBeCloseTo(15);
    expect(out.reps).toBe(3);
  });
});
