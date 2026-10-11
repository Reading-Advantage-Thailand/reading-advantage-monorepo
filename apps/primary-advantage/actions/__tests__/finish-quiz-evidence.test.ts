// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  enqueue: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/primary-evidence-queue", () => ({ enqueuePrimaryEvidenceJob: mocks.enqueue }));
vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select, insert: mocks.insert, update: mocks.update, transaction: mocks.transaction },
  users: { id: "users.id", xp: "users.xp" },
  userActivity: { id: "userActivity.id" },
  articleActivityLogs: { id: "articleActivityLogs.id", articleId: "articleActivityLogs.articleId", userId: "articleActivityLogs.userId" },
  xpLogs: { id: "xpLogs.id" },
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
}));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({ grantGpForXp: vi.fn().mockResolvedValue(0) }));
vi.mock("@/server/utils/assistant", () => ({ getLaqFeedback: vi.fn(), getSaqFeedback: vi.fn() }));

import { finishQuiz } from "../question";
import { ActivityType } from "@/types/enum";

const ARTICLE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROW = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const Q1 = "11111111-1111-4111-8111-111111111111";

function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "where", "limit", "values", "set", "returning"]) stub[method] = () => stub;
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) => Promise.resolve(value).then(resolve);
  return stub;
}

describe("finishQuiz evidence keys (track primary_mastery_evidence_20261006, FR-5a)", () => {
  const inserted: Array<Record<string, unknown>> = [];

  beforeEach(() => {
    inserted.length = 0;
    mocks.currentUser.mockResolvedValue({ id: "student-1", schoolId: "55555555-5555-4555-8555-555555555555" });
    mocks.select
      .mockReturnValueOnce(chain([{ xp: 10 }]))
      .mockReturnValueOnce(chain([{ id: "log-1" }]));
    mocks.insert.mockImplementation(() => ({
      values: (row: Record<string, unknown>) => {
        inserted.push(row);
        return chain([{ id: ROW }]);
      },
    }));
    mocks.update.mockReturnValue(chain(undefined));
    mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({ insert: () => ({ values: () => chain(undefined) }), update: () => ({ set: () => chain(undefined) }) }));
    mocks.enqueue.mockResolvedValue(true);
  });

  it("stores the question ids, outcomes, and mode beside the legacy keys and enqueues one evidence job for the row", async () => {
    const result = await finishQuiz(
      ARTICLE,
      { responses: [{ question: "What is in the box?", answer: "A puppy", isCorrect: "A puppy" }] as unknown as string[], score: 1, timer: 30, questions: [{ questionId: Q1, questionType: "mcq", correct: true, firstTry: true }], mode: "independent", audioPlayed: true },
      ActivityType.MC_QUESTION,
    );
    expect(result).toEqual({ success: true });
    expect(inserted[0]).toMatchObject({ details: { score: 1, questions: [{ questionId: Q1, questionType: "mcq", correct: true, firstTry: true }], mode: "independent", audioPlayed: true } });
    expect(mocks.enqueue).toHaveBeenCalledTimes(1);
    expect(mocks.enqueue).toHaveBeenCalledWith({ sourceTable: "user_activity", rowId: ROW }, "55555555-5555-4555-8555-555555555555");
  });

  it("keeps a legacy call (no evidence keys) as before and still enqueues, so the text fallback records it", async () => {
    await finishQuiz(ARTICLE, { responses: [], score: 0, timer: 5 }, ActivityType.MC_QUESTION);
    expect(inserted[0]).toMatchObject({ details: { score: 0 } });
    expect((inserted[0].details as Record<string, unknown>).questions).toBeUndefined();
    expect(mocks.enqueue).toHaveBeenCalledWith({ sourceTable: "user_activity", rowId: ROW }, "55555555-5555-4555-8555-555555555555");
  });
});
