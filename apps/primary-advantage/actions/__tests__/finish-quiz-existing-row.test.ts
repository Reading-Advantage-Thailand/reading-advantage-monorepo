// @vitest-environment node
/** finishQuiz with an existing user_activity row (FR-6, STU-03). */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  enqueue: vi.fn(),
  grantGp: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/primary-evidence-queue", () => ({ enqueuePrimaryEvidenceJob: mocks.enqueue }));
vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select, insert: mocks.insert, update: mocks.update, transaction: mocks.transaction },
  users: { id: "users.id", xp: "users.xp" },
  userActivity: { id: "ua.id", userId: "ua.userId", activityType: "ua.type", targetId: "ua.target", completed: "ua.completed" },
  articleActivityLogs: { id: "al.id", articleId: "al.articleId", userId: "al.userId" },
  xpLogs: { id: "xp.id", __name: "xpLogs" },
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  or: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
}));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({ grantGpForXp: mocks.grantGp }));
vi.mock("@/server/utils/assistant", () => ({ getLaqFeedback: vi.fn(), getSaqFeedback: vi.fn() }));

import { finishQuiz } from "../question";
import { ActivityType } from "@/types/enum";
import { xpLogs } from "@reading-advantage/db";

const ARTICLE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROW = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "where", "limit", "values", "set", "returning", "onConflictDoUpdate"]) stub[method] = () => stub;
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) => Promise.resolve(value).then(resolve);
  return stub;
}

/** Sets the rows that the activity upsert returns, and records each insert target. */
function setup(upsertRows: Array<{ id: string }>) {
  const inserts: Array<{ table: unknown; row: unknown }> = [];
  mocks.currentUser.mockResolvedValue({ id: "student-1", schoolId: "55555555-5555-4555-8555-555555555555" });
  mocks.select.mockReset();
  mocks.select.mockReturnValueOnce(chain([{ xp: 10 }])).mockReturnValueOnce(chain([]));
  mocks.insert.mockImplementation((table: unknown) => ({
    values: (row: unknown) => {
      inserts.push({ table, row });
      return table === xpLogs || (table as { id?: string }).id === "al.id" ? chain(undefined) : chain(upsertRows);
    },
  }));
  mocks.update.mockReturnValue(chain(undefined));
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ select: mocks.select, insert: mocks.insert, update: mocks.update }),
  );
  mocks.enqueue.mockResolvedValue(true);
  mocks.grantGp.mockResolvedValue(0);
  return inserts;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("finishQuiz with an existing activity row", () => {
  it("completes a not-complete row: one XP log, the GP grant, the user update, and the evidence job", async () => {
    const inserts = setup([{ id: ROW }]);
    const result = await finishQuiz(ARTICLE, { responses: [], score: 1, timer: 9 }, ActivityType.MC_QUESTION);
    expect(result).toEqual({ success: true });
    expect(inserts.filter((i) => i.table === xpLogs)).toHaveLength(1);
    expect(mocks.grantGp).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.enqueue).toHaveBeenCalledWith({ sourceTable: "user_activity", rowId: ROW }, "55555555-5555-4555-8555-555555555555");
  });

  it("returns success and writes no XP log, no XP, and no job for an already complete row", async () => {
    const inserts = setup([]);
    const result = await finishQuiz(ARTICLE, { responses: [], score: 1, timer: 9 }, ActivityType.MC_QUESTION);
    expect(result).toEqual({ success: true });
    expect(inserts.filter((i) => i.table === xpLogs)).toHaveLength(0);
    expect(mocks.grantGp).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("inserts a row for a new article", async () => {
    const inserts = setup([{ id: ROW }]);
    await finishQuiz(ARTICLE, { responses: [], score: 0, timer: 1 }, ActivityType.MC_QUESTION);
    expect(inserts[0].row).toMatchObject({ userId: "student-1", targetId: ARTICLE, completed: true });
  });

  it("runs every write inside one transaction", async () => {
    setup([{ id: ROW }]);
    const outer = vi.fn();
    const mod = await import("@reading-advantage/db");
    (mod.db as unknown as Record<string, unknown>).insert = outer;
    await finishQuiz(ARTICLE, { responses: [], score: 1, timer: 1 }, ActivityType.MC_QUESTION);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
    (mod.db as unknown as Record<string, unknown>).insert = mocks.insert;
  });
});
