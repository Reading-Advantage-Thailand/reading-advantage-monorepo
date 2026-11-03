// @vitest-environment node
/** Finding 1 of authz-primary-report.md: retake, finish, and award must not mint XP twice. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
  enqueue: vi.fn(),
  grantGp: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@/lib/primary-evidence-queue", () => ({ enqueuePrimaryEvidenceJob: mocks.enqueue }));
vi.mock("@reading-advantage/db", () => ({
  db: { select: mocks.select, insert: mocks.insert, update: mocks.update, delete: mocks.delete, transaction: mocks.transaction },
  users: { id: "users.id", xp: "users.xp" },
  userActivity: { id: "ua.id", userId: "ua.userId", activityType: "ua.type", targetId: "ua.target", completed: "ua.completed" },
  articleActivityLogs: { id: "al.id", articleId: "al.articleId", userId: "al.userId" },
  multipleChoiceQuestions: { question: "mcq.question", answer: "mcq.answer", options: "mcq.options", correctAnswer: "mcq.correctAnswer", articleId: "mcq.articleId" },
  xpLogs: { id: "xp.id", userId: "xp.userId", activityId: "xp.activityId", __name: "xpLogs" },
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  or: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({ grantGpForXp: mocks.grantGp }));
vi.mock("@/server/utils/assistant", () => ({ getLaqFeedback: vi.fn(), getSaqFeedback: vi.fn() }));

import { finishQuiz, retakeQuiz } from "../question";
import { awardQuestionXp, type QuestionXpTx } from "@/server/xp/award-question-xp";
import { ActivityType } from "@/types/enum";
import { xpLogs } from "@reading-advantage/db";

const ARTICLE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROW = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function chain<T>(value: T) {
  const stub: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ["from", "where", "limit", "values", "set", "returning", "onConflictDoUpdate", "onConflictDoNothing"]) stub[method] = () => stub;
  (stub as Record<string, unknown>).then = (resolve: (value: T) => unknown) => Promise.resolve(value).then(resolve);
  return stub;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.select.mockReset();
  mocks.currentUser.mockResolvedValue({ id: "student-1", role: "STUDENT", schoolId: "55555555-5555-4555-8555-555555555555" });
  mocks.update.mockReturnValue(chain([{ id: ROW, xp: 10 }]));
  mocks.delete.mockReturnValue(chain([{ id: ROW }]));
  mocks.enqueue.mockResolvedValue(true);
  mocks.grantGp.mockResolvedValue(0);
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({ select: mocks.select, insert: mocks.insert, update: mocks.update }),
  );
});

describe("retakeQuiz", () => {
  it("keeps the activity row, so the XP log stays tied to it", async () => {
    mocks.select.mockReturnValue(chain([{ id: ROW }]));
    const result = await retakeQuiz(ARTICLE, ActivityType.MC_QUESTION);
    expect(result).toEqual({ success: true });
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it.each([ActivityType.STORIES_SA_QUESTION, ActivityType.STORIES_LA_QUESTION, ActivityType.ARTICLE_READ])(
    "refuses the %s type (it reopened submitChapterWritten and other awards)",
    async (type) => {
      mocks.select.mockReturnValue(chain([{ id: ROW }]));
      const result = await retakeQuiz(ARTICLE, type);
      expect(result).toEqual({ error: "Invalid retake" });
      expect(mocks.delete).not.toHaveBeenCalled();
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );

  it("refuses an article id that is not a uuid", async () => {
    const result = await retakeQuiz("not-a-uuid", ActivityType.MC_QUESTION);
    expect(result).toEqual({ error: "Invalid retake" });
    expect(mocks.select).not.toHaveBeenCalled();
  });
});

describe("finishQuiz grades MC answers on the server", () => {
  it("counts only answers that match the stored key, once per question", async () => {
    const xpRows: Array<Record<string, unknown>> = [];
    mocks.select
      // The answer key of the article.
      .mockReturnValueOnce(chain([
        { question: "Q1", answer: "A", options: ["A", "B"], correctAnswer: 0 },
        { question: "Q2", answer: null, options: ["C", "D"], correctAnswer: 1 },
      ]))
      .mockReturnValueOnce(chain([{ id: "student-1" }]))
      .mockReturnValueOnce(chain([]));
    mocks.insert.mockImplementation((table: unknown) => ({
      values: (row: Record<string, unknown>) => {
        if (table === xpLogs) xpRows.push(row);
        return chain(table === xpLogs ? [{ id: "log-1" }] : [{ id: ROW }]);
      },
    }));
    const forged = [
      { question: "Q1", answer: "B", isCorrect: "B" },
      { question: "Q2", answer: "D", isCorrect: "D" },
      ...Array.from({ length: 50 }, () => ({ question: "Q2", answer: "D", isCorrect: "D" })),
      { question: "Made up", answer: "X", isCorrect: "X" },
    ];
    const result = await finishQuiz(ARTICLE, { responses: forged as unknown as string[], score: 52, timer: 5 }, ActivityType.MC_QUESTION);
    expect(result).toEqual({ success: true });
    expect(xpRows).toHaveLength(1);
    expect(xpRows[0].xpEarned).toBe(1);
  });
});

describe("awardQuestionXp", () => {
  it("refuses a second award for the same user, type, and target", async () => {
    const userUpdates: unknown[] = [];
    const tx = {
      select: () => chain([{ id: "student-1" }]),
      insert: (table: unknown) => ({
        values: () => chain(table === xpLogs ? [] : [{ id: ROW }]),
      }),
      update: () => {
        userUpdates.push(1);
        return chain([{ xp: 10 }]);
      },
    } as unknown as QuestionXpTx;
    const result = await awardQuestionXp(tx, {
      userId: "student-1",
      schoolId: "s1",
      activityType: ActivityType.STORIES_LA_QUESTION,
      targetId: ARTICLE,
      details: {},
      xpEarned: 25,
    });
    expect(result).toEqual({ status: "saved", activityId: ROW });
    expect(mocks.grantGp).not.toHaveBeenCalled();
    expect(userUpdates).toHaveLength(0);
  });
});
