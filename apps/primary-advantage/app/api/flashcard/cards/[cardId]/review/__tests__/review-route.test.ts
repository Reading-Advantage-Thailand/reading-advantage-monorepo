// @vitest-environment node
/** POST /api/flashcard/cards/[cardId]/review: the gates, the rating check, the writes, and the XP award. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  assertCan: vi.fn(),
  grantGp: vi.fn(),
  enqueue: vi.fn(),
  processReview: vi.fn(),
  cardRows: [] as unknown[],
  inserts: [] as { table: unknown; row: Record<string, unknown> }[],
  updates: [] as { table: unknown; row: Record<string, unknown> }[],
  /** Unique keys already stored, as the schema's unique constraints see them. */
  keys: new Set<string>(),
}));

const tables = vi.hoisted(() => ({
  flashcardCards: { id: "cards.id", deckId: "cards.deckId", __t: "flashcardCards" },
  flashcardDecks: { id: "decks.id", userId: "decks.userId", __t: "flashcardDecks" },
  cardReviews: { __t: "cardReviews" },
  userActivity: { __t: "userActivity" },
  xpLogs: { __t: "xpLogs" },
  users: { id: "users.id", xp: "users.xp", __t: "users" },
}));

vi.mock("@reading-advantage/db/schema", () => tables);
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({ grantGpForXp: mocks.grantGp }));
vi.mock("@/lib/primary-evidence-queue", () => ({ enqueuePrimaryEvidenceJob: mocks.enqueue }));
vi.mock("@/lib/fsrs-service", () => ({ fsrsService: { processReview: mocks.processReview } }));
vi.mock("@reading-advantage/auth", () => {
  class AuthError extends Error {}
  return { AuthError, assertCan: mocks.assertCan };
});

/**
 * Write handle that records rows and enforces the user_activity and xp_logs unique keys
 * (packages/db/src/schema/progress.ts:24, packages/db/src/schema/analytics.ts:25).
 * @returns The handle.
 */
function writer() {
  return {
    insert: (table: { __t: string }) => ({
      values: (row: Record<string, unknown>) => {
        const key =
          table.__t === "userActivity" ? `ua:${row.userId}:${row.activityType}:${row.targetId}` :
          table.__t === "xpLogs" ? `xp:${row.userId}:${row.activityId}` : null;
        if (key && mocks.keys.has(key)) throw new Error(`duplicate key value violates unique constraint (${key})`);
        if (key) mocks.keys.add(key);
        mocks.inserts.push({ table, row });
        const result = Promise.resolve(undefined) as Promise<unknown> & { returning?: () => Promise<unknown[]> };
        result.returning = async () => [{ id: `${table.__t}-1`, ...row }];
        return result;
      },
    }),
    update: (table: unknown) => ({
      set: (row: Record<string, unknown>) => {
        mocks.updates.push({ table, row });
        const where = () => {
          const result = Promise.resolve(undefined) as Promise<unknown> & { returning?: () => Promise<unknown[]> };
          result.returning = async () => [{ id: "card-1", ...row }];
          return result;
        };
        return { where };
      },
    }),
  };
}

const flashDb = {
  select: () => {
    const stub: Record<string, unknown> = {};
    for (const m of ["from", "innerJoin", "where"]) stub[m] = () => stub;
    stub.limit = async () => mocks.cardRows;
    return stub;
  },
};

vi.mock("@reading-advantage/domain", () => ({
  getUnscopedDB: () => flashDb,
  getTenantDB: () => ({
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const w = writer();
      return fn({ ...w, unscoped: () => w });
    },
  }),
}));

import { AuthError } from "@reading-advantage/auth";
import { POST } from "../route";

const STUDENT = { id: "stu-1", role: "STUDENT", schoolId: "school-1" };
const params = { params: Promise.resolve({ cardId: "card-1" }) };
const due = new Date("2026-11-10T00:00:00Z");

/**
 * Builds a review request.
 * @param body The JSON body.
 * @returns The response.
 */
function review(body: unknown) {
  const req = new Request("http://x/api/flashcard/cards/card-1/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return POST(req as never, params);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.cardRows = [{ card: { id: "card-1", deckId: "deck-1", type: "VOCABULARY", state: "NEW" }, deck: { id: "deck-1", userId: "stu-1" } }];
  mocks.inserts = [];
  mocks.updates = [];
  mocks.keys = new Set();
  mocks.assertCan.mockImplementation(() => undefined);
  mocks.currentUser.mockResolvedValue(STUDENT);
  mocks.processReview.mockReturnValue({
    updatedCard: { due, stability: 3, difficulty: 5, elapsedDays: 0, scheduledDays: 3, reps: 1, lapses: 0, state: "REVIEW", lastReview: new Date() },
    reviewLog: { rating: 3 },
  });
});

describe("POST /api/flashcard/cards/[cardId]/review", () => {
  it("answers 401 without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect((await review({ rating: 3 })).status).toBe(401);
  });

  it("refuses staff in Preview mode and writes nothing", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "school-1" });
    expect((await review({ rating: 3 })).status).toBe(403);
    expect(mocks.inserts).toHaveLength(0);
  });

  it("answers 403 when the policy refuses", async () => {
    mocks.assertCan.mockImplementation(() => {
      throw new AuthError("no");
    });
    expect((await review({ rating: 3 })).status).toBe(403);
  });

  it("answers 400 for a rating outside 1-4", async () => {
    expect((await review({ rating: 0 })).status).toBe(400);
    expect((await review({ rating: 5 })).status).toBe(400);
    expect((await review({ rating: "3" })).status).toBe(400);
    expect(mocks.inserts).toHaveLength(0);
  });

  it("answers 404 for a card outside the user's decks", async () => {
    mocks.cardRows = [];
    expect((await review({ rating: 3 })).status).toBe(404);
    expect(mocks.inserts).toHaveLength(0);
  });

  it("writes the card, the review, the activity, and 15 XP for a vocabulary card", async () => {
    const res = await review({ rating: 3, timeSpent: 9 });
    expect(res.status).toBe(200);
    const byTable = (t: string) => mocks.inserts.filter((i) => (i.table as { __t: string }).__t === t).map((i) => i.row);
    expect(byTable("cardReviews")[0]).toMatchObject({ cardId: "card-1", rating: 3, timeSpent: 9 });
    expect(byTable("userActivity")[0]).toMatchObject({ userId: "stu-1", activityType: "VOCABULARY_FLASHCARDS", targetId: "card-1", completed: true, details: { rating: 3, previousState: "NEW", newState: "REVIEW", intervalDays: 3 } });
    expect(byTable("xpLogs")[0]).toMatchObject({ userId: "stu-1", xpEarned: 15, activityId: "card-1" });
    expect(mocks.grantGp).toHaveBeenCalledWith(expect.objectContaining({ schoolId: "school-1", userId: "stu-1", sourceKey: "xp:card-1", xpEarned: 15 }));
    expect(mocks.updates.map((u) => (u.table as { __t: string }).__t)).toEqual(["flashcardCards", "users"]);
    expect(mocks.updates[0].row).toMatchObject({ due, state: "REVIEW", reps: 1 });
    expect(mocks.enqueue).toHaveBeenCalledWith({ sourceTable: "card_reviews", rowId: "cardReviews-1" }, "school-1");
  });

  it("uses the sentence activity for a non-vocabulary card", async () => {
    mocks.cardRows = [{ card: { id: "card-1", type: "SENTENCE" }, deck: {} }];
    await review({ rating: 1 });
    expect(mocks.inserts.find((i) => (i.table as { __t: string }).__t === "userActivity")?.row.activityType).toBe("SENTENCE_FLASHCARDS");
  });

  it("answers 500 and enqueues nothing when a write fails", async () => {
    mocks.grantGp.mockRejectedValueOnce(new Error("gp"));
    expect((await review({ rating: 3 })).status).toBe(500);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
