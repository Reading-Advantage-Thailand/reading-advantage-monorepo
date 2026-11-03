// @vitest-environment node
/** retakeQuiz, finishQuiz, and getFeedback: the gates, the XP award input, and the log writes. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  enqueue: vi.fn(),
  awardQuestionXp: vi.fn(),
  laq: vi.fn(),
  saq: vi.fn(),
  selectRows: [] as unknown[][],
  deletedRows: [] as unknown[],
  deleteError: null as Error | null,
  inserts: [] as unknown[],
  updates: [] as unknown[],
}));

/**
 * Chainable select stub that resolves to the next queued rows.
 * @returns The chain.
 */
function selectChain() {
  const stub: Record<string, unknown> = {};
  for (const m of ["from", "where", "limit"]) stub[m] = () => stub;
  stub.then = (resolve: (v: unknown) => unknown) => Promise.resolve(mocks.selectRows.shift() ?? []).then(resolve);
  return stub;
}

const tx = {
  select: () => selectChain(),
  insert: () => ({ values: async (row: unknown) => mocks.inserts.push(row) }),
  update: () => ({ set: (row: unknown) => ({ where: async () => mocks.updates.push(row) }) }),
};

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@/lib/primary-evidence-queue", () => ({ enqueuePrimaryEvidenceJob: mocks.enqueue }));
vi.mock("@/server/xp/award-question-xp", () => ({ awardQuestionXp: mocks.awardQuestionXp }));
vi.mock("@/server/utils/assistant", () => ({ getLaqFeedback: mocks.laq, getSaqFeedback: mocks.saq }));
vi.mock("@reading-advantage/db", () => ({
  db: {
    select: () => selectChain(),
    delete: () => ({
      where: () => ({
        returning: async () => {
          if (mocks.deleteError) throw mocks.deleteError;
          return mocks.deletedRows;
        },
      }),
    }),
    transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  },
  eq: vi.fn(),
  and: vi.fn(),
  userActivity: { id: "ua.id", targetId: "ua.t", activityType: "ua.a", userId: "ua.u" },
  articleActivityLogs: { id: "al.id", articleId: "al.a", userId: "al.u" },
}));

import { finishQuiz, getFeedback, retakeQuiz } from "../question";
import { ActivityType } from "@/types/enum";

const STUDENT = { id: "stu-1", role: "STUDENT", schoolId: "school-1" };
const ARTICLE = "article-1";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.selectRows = [];
  mocks.deletedRows = [];
  mocks.deleteError = null;
  mocks.inserts = [];
  mocks.updates = [];
  mocks.currentUser.mockResolvedValue(STUDENT);
  mocks.awardQuestionXp.mockResolvedValue({ status: "saved", activityId: "act-1" });
});

describe("retakeQuiz", () => {
  it("refuses without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await retakeQuiz(ARTICLE, ActivityType.MC_QUESTION)).toEqual({ error: "User not found" });
  });

  it("refuses staff in Preview mode", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t1", role: "TEACHER", schoolId: "school-1" });
    expect(await retakeQuiz(ARTICLE, ActivityType.MC_QUESTION)).toEqual({ status: "preview" });
  });

  it("answers not found when the student has no activity row", async () => {
    mocks.selectRows = [[]];
    expect(await retakeQuiz(ARTICLE, ActivityType.MC_QUESTION)).toEqual({ error: "User activity not found" });
  });

  it("answers an error when the delete removes no row", async () => {
    mocks.selectRows = [[{ id: "act-1" }]];
    mocks.deletedRows = [];
    expect(await retakeQuiz(ARTICLE, ActivityType.MC_QUESTION)).toEqual({ error: "Failed to delete user activity" });
  });

  it("deletes the activity row", async () => {
    mocks.selectRows = [[{ id: "act-1" }]];
    mocks.deletedRows = [{ id: "act-1" }];
    expect(await retakeQuiz(ARTICLE, ActivityType.MC_QUESTION)).toEqual({ success: true });
  });

  it("answers a generic error when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.selectRows = [[{ id: "act-1" }]];
    mocks.deleteError = new Error("db");
    expect(await retakeQuiz(ARTICLE, ActivityType.MC_QUESTION)).toEqual({ error: "Failed to retake quiz" });
  });
});

describe("finishQuiz", () => {
  it("refuses without a user and pays nothing", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await finishQuiz(ARTICLE, {}, ActivityType.MC_QUESTION)).toEqual({ error: "User not found" });
    expect(mocks.awardQuestionXp).not.toHaveBeenCalled();
  });

  it("refuses staff in Preview mode and pays nothing", async () => {
    mocks.currentUser.mockResolvedValue({ id: "a1", role: "ADMIN", schoolId: "school-1" });
    expect(await finishQuiz(ARTICLE, {}, ActivityType.MC_QUESTION)).toEqual({ status: "preview" });
    expect(mocks.awardQuestionXp).not.toHaveBeenCalled();
  });

  it("pays one XP per correct MC answer and ignores a malformed one", async () => {
    mocks.selectRows = [[]];
    await finishQuiz(
      ARTICLE,
      {
        responses: [
          { answer: "a", isCorrect: "a" },
          { answer: "b", isCorrect: "c" },
          { answer: "d", isCorrect: "d" },
          null,
        ] as never,
      },
      ActivityType.MC_QUESTION,
    );
    expect(mocks.awardQuestionXp).toHaveBeenCalledWith(tx, expect.objectContaining({ xpEarned: 2, userId: "stu-1", schoolId: "school-1", targetId: ARTICLE }));
    expect(mocks.inserts).toEqual([{ articleId: ARTICLE, userId: "stu-1", isMultipleChoiceQuestionCompleted: true }]);
  });

  it("clamps the SA score to 5 XP and marks the SA flag on an existing log", async () => {
    mocks.selectRows = [[{ id: "log-1" }]];
    await finishQuiz(ARTICLE, { score: 99 }, ActivityType.SA_QUESTION);
    expect(mocks.awardQuestionXp).toHaveBeenCalledWith(tx, expect.objectContaining({ xpEarned: 5 }));
    expect(mocks.updates).toEqual([{ isShortAnswerQuestionCompleted: true }]);
    expect(mocks.inserts).toHaveLength(0);
  });

  it("clamps the LA score to 25 XP and marks the LA flag", async () => {
    mocks.selectRows = [[]];
    await finishQuiz(ARTICLE, { score: 40 }, ActivityType.LA_QUESTION);
    expect(mocks.awardQuestionXp).toHaveBeenCalledWith(tx, expect.objectContaining({ xpEarned: 25 }));
    expect(mocks.inserts).toEqual([{ articleId: ARTICLE, userId: "stu-1", isLongAnswerQuestionCompleted: true }]);
  });

  it("pays no XP for a negative score", async () => {
    mocks.selectRows = [[]];
    await finishQuiz(ARTICLE, { score: -3 }, ActivityType.SA_QUESTION);
    expect(mocks.awardQuestionXp).toHaveBeenCalledWith(tx, expect.objectContaining({ xpEarned: 0 }));
  });

  it("sets no completion flag for another activity type", async () => {
    mocks.selectRows = [[]];
    await finishQuiz(ARTICLE, {}, ActivityType.VOCABULARY_MATCHING);
    expect(mocks.inserts).toEqual([{ articleId: ARTICLE, userId: "stu-1" }]);
  });

  it("adds the evidence keys with the independent mode by default", async () => {
    mocks.selectRows = [[]];
    const questions = [{ questionId: "q1", correct: true }] as never;
    await finishQuiz(ARTICLE, { questions, hintUsed: true }, ActivityType.MC_QUESTION);
    expect(mocks.awardQuestionXp.mock.calls[0][1].details).toMatchObject({ questions, mode: "independent", hintUsed: true });
  });

  it("enqueues the evidence job for a saved row", async () => {
    mocks.selectRows = [[]];
    expect(await finishQuiz(ARTICLE, {}, ActivityType.MC_QUESTION)).toEqual({ success: true });
    expect(mocks.enqueue).toHaveBeenCalledWith({ sourceTable: "user_activity", rowId: "act-1" }, "school-1");
  });

  it("answers success with no log write and no job for an already complete row", async () => {
    mocks.awardQuestionXp.mockResolvedValue({ status: "already-complete" });
    expect(await finishQuiz(ARTICLE, {}, ActivityType.MC_QUESTION)).toEqual({ success: true });
    expect(mocks.inserts).toHaveLength(0);
    expect(mocks.updates).toHaveLength(0);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("answers user not found when the user row is gone", async () => {
    mocks.awardQuestionXp.mockResolvedValue(null);
    expect(await finishQuiz(ARTICLE, {}, ActivityType.MC_QUESTION)).toEqual({ error: "User not found" });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("passes a null school when the user has none", async () => {
    mocks.currentUser.mockResolvedValue({ id: "stu-2", role: "STUDENT" });
    mocks.selectRows = [[]];
    await finishQuiz(ARTICLE, {}, ActivityType.MC_QUESTION);
    expect(mocks.awardQuestionXp).toHaveBeenCalledWith(tx, expect.objectContaining({ schoolId: null }));
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.anything(), undefined);
  });
});

describe("getFeedback", () => {
  const value = (activityType: ActivityType) => ({
    data: { articleId: ARTICLE, question: "q", answer: "a", preferredLanguage: "en" },
    activityType,
  });

  it("refuses without a user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    expect(await getFeedback(value(ActivityType.LA_QUESTION))).toEqual({ error: "User not found" });
    expect(mocks.laq).not.toHaveBeenCalled();
  });

  it("sends an LA answer to the LA grader", async () => {
    mocks.laq.mockResolvedValue({ score: 3 });
    expect(await getFeedback(value(ActivityType.LA_QUESTION))).toEqual({ score: 3 });
    expect(mocks.saq).not.toHaveBeenCalled();
  });

  it("sends an SA answer to the SA grader", async () => {
    mocks.saq.mockResolvedValue({ score: 1 });
    expect(await getFeedback(value(ActivityType.SA_QUESTION))).toEqual({ score: 1 });
    expect(mocks.laq).not.toHaveBeenCalled();
  });

  it("answers nothing for another type", async () => {
    expect(await getFeedback(value(ActivityType.MC_QUESTION))).toBeUndefined();
  });
});
