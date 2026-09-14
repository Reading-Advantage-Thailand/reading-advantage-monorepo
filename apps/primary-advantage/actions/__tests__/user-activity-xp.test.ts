// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  currentUser: mocks.currentUser,
  getCurrentUser: mocks.currentUser,
}));
vi.mock("@reading-advantage/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
    transaction: mocks.transaction,
  },
  users: { id: "users.id", xp: "users.xp" },
  userActivity: { id: "userActivity.id" },
  articleActivityLogs: { id: "articleActivityLogs.id" },
  xpLogs: { id: "xpLogs.id" },
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
}));

import { updateUserActivity } from "../user";
import { ActivityType, UserXpEarned } from "@/types/enum";

/**
 * Builds a chainable Drizzle stub resolving to rows.
 * @param value The rows returned when awaited.
 * @returns A stub with from/where/values/set/returning support.
 */
function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "where", "limit", "values", "set", "returning"]) {
    stub[method] = () => stub;
  }
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) =>
    Promise.resolve(value).then(resolve);
  return stub;
}

interface TxCapture {
  xpRows: Array<{ xpEarned: number }>;
  userRows: Array<{ xp: number }>;
}

/**
 * Builds a transaction stub capturing inserted rows.
 * @param capture The arrays receiving written rows.
 * @returns A tx stub with insert/update support.
 */
function txStub(capture: TxCapture) {
  return {
    insert: () => ({
      values: (row: { xpEarned: number }) => {
        capture.xpRows.push(row);
        return chain(undefined);
      },
    }),
    update: () => ({
      set: (row: { xp: number }) => {
        capture.userRows.push(row);
        return chain(undefined);
      },
    }),
  };
}

/**
 * Primes the database mocks for one activity write.
 * @param userXp The current XP of the caller.
 * @param capture The arrays receiving written rows.
 */
function primeDb(userXp: number, capture: TxCapture) {
  mocks.select
    .mockReturnValueOnce(chain([{ xp: userXp }]))
    .mockReturnValueOnce(chain([]));
  mocks.insert
    .mockReturnValueOnce(chain([{ id: "activity-1" }]))
    .mockReturnValueOnce(chain(undefined));
  mocks.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb(txStub(capture)),
  );
}

describe("updateUserActivity server XP authority", () => {
  beforeEach(() => vi.clearAllMocks());

  it("awards the server table value, not the legacy client value", async () => {
    mocks.currentUser.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    const capture: TxCapture = { xpRows: [], userRows: [] };
    primeDb(100, capture);

    const result = await updateUserActivity(
      "article-1",
      ActivityType.VOCABULARY_FLASHCARDS,
      42,
      {},
    );

    expect(result).toEqual({ success: true });
    // Legacy clients sent 20 for this game; the enum and server award 15.
    expect(capture.xpRows).toEqual([
      expect.objectContaining({ xpEarned: UserXpEarned.VOCABULARY_FLASHCARDS }),
    ]);
    expect(capture.xpRows[0]?.xpEarned).toBe(15);
    expect(capture.userRows[0]?.xp).toBe(115);
  });

  it("awards the MC award for multiple-choice activities", async () => {
    mocks.currentUser.mockResolvedValue({ id: "student-1", role: "STUDENT" });
    const capture: TxCapture = { xpRows: [], userRows: [] };
    primeDb(0, capture);

    await updateUserActivity("article-1", ActivityType.MC_QUESTION, 30, {});

    expect(capture.xpRows[0]?.xpEarned).toBe(UserXpEarned.MCQuestion);
    expect(capture.userRows[0]?.xp).toBe(UserXpEarned.MCQuestion);
  });

  it("rejects anonymous callers without writing", async () => {
    mocks.currentUser.mockResolvedValue(null);

    const result = await updateUserActivity(
      "article-1",
      ActivityType.MC_QUESTION,
      30,
      {},
    );

    expect(result).toEqual({ error: "User not found" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
