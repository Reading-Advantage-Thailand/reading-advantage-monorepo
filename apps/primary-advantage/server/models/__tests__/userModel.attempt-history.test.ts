// @vitest-environment node
/**
 * Reports keep the work of closed lesson attempts (track primary_parity_lesson_repeat_20261011, S4):
 * `getUserActivity` and `getUserArticleRecords` add the activity rows that moved into
 * `primary_lesson_attempts`, with their attempt number. The XP logs stay as they are.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ results: [] as unknown[][] }));

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn(), currentUser: vi.fn() }));
vi.mock("@/server/utils/passwordEvents", () => ({ afterPasswordWrite: vi.fn() }));
vi.mock("@/server/utils/credentials", () => ({ hashNewPassword: vi.fn(), upsertCredentialAccount: vi.fn() }));
vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  /**
   * Builds a chainable select stub that resolves to the next queued result.
   * @returns The stub.
   */
  const select = () => {
    const rows = mocks.results.shift() ?? [];
    const stub: Record<string, unknown> = {};
    for (const method of ["from", "orderBy", "limit", "offset", "where"]) stub[method] = () => stub;
    stub.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve);
    return stub;
  };
  return { ...actual, db: { select } };
});

import { getUserActivity, getUserArticleRecords } from "../userModel";

const T1 = new Date("2026-10-01T08:00:00Z");
const T2 = new Date("2026-10-09T08:00:00Z");
const moved = { id: "old-1", userId: "s1", activityType: "MC_QUESTION", targetId: "article-1", completed: true, details: { progress: [1, 1, 0, 1] }, createdAt: T1.toISOString(), updatedAt: T1.toISOString() };
const live = { id: "new-1", userId: "s1", activityType: "MC_QUESTION", targetId: "article-1", completed: true, details: { progress: [1, 1, 1, 1] }, createdAt: T2, updatedAt: T2 };

beforeEach(() => {
  mocks.results.length = 0;
});

describe("getUserActivity with closed attempts", () => {
  it("adds the moved rows with their attempt number, numbers the live rows after them, and keeps the XP logs", async () => {
    const xp = [{ id: "x1", activityId: "old-1", xpEarned: 20 }, { id: "x2", activityId: "new-1", xpEarned: 30 }];
    mocks.results.push([{ id: "s1", name: "Ann", username: "ann", cefrLevel: "A1" }], [live], xp, [{ articleId: "article-1", attemptNumber: 1, activities: [moved] }]);
    const result = await getUserActivity("s1");
    expect(result?.xpLogs).toEqual(xp);
    expect(result?.activity.map((row) => [row.id, (row as { attemptNumber?: number }).attemptNumber])).toEqual([["new-1", 2], ["old-1", 1]]);
    expect(result?.activity[1].createdAt).toEqual(T1);
  });

  it("numbers a live row 1 when the student has no closed attempt", async () => {
    mocks.results.push([{ id: "s1", name: "Ann", username: "ann", cefrLevel: "A1" }], [live], [], []);
    const result = await getUserActivity("s1");
    expect(result?.activity.map((row) => (row as { attemptNumber?: number }).attemptNumber)).toEqual([1]);
  });
});

describe("getUserArticleRecords with closed attempts", () => {
  it("keeps an article in the history when all its rows moved, and shows the latest score", async () => {
    mocks.results.push([], [{ articleId: "article-1", attemptNumber: 1, activities: [moved] }], [{ id: "article-1", title: "The Moon", rating: 0 }]);
    const result = await getUserArticleRecords("s1");
    expect(result.data).toEqual([{ id: "article-1", title: "The Moon", scores: "75%", updated_at: T1.toISOString(), rated: 0, status: "COMPLETED_MCQ" }]);
  });

  it("shows the score of the latest attempt when the article has a live row and a moved row", async () => {
    mocks.results.push([live], [{ articleId: "article-1", attemptNumber: 1, activities: [moved] }], [{ id: "article-1", title: "The Moon", rating: 0 }]);
    const result = await getUserArticleRecords("s1");
    expect(result.data[0]).toMatchObject({ scores: "100%", updated_at: T2.toISOString() });
  });
});
