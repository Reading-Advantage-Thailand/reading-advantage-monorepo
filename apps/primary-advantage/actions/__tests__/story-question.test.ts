// @vitest-environment node
/** Chapter question actions (STU-04 S5): STORIES_* rows, once-only XP, preview guard, no evidence. */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  transaction: vi.fn(),
  award: vi.fn(),
  gradeMcq: vi.fn(),
  buildRetake: vi.fn(),
  resolveWritten: vi.fn(),
  writtenQuestion: vi.fn(),
  saqFeedback: vi.fn(),
  laqFeedback: vi.fn(),
  saveChapter: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser, getCurrentUser: mocks.currentUser }));
vi.mock("@reading-advantage/db", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: (d: unknown) => d }));
vi.mock("@reading-advantage/domain/stories", () => ({
  gradeChapterMcq: mocks.gradeMcq,
  retakeChapterMcq: mocks.buildRetake,
  resolveChapterWritten: mocks.resolveWritten,
  getChapterWrittenQuestion: mocks.writtenQuestion,
  storyLaMinChars: (level: number) => Math.max(1, Math.floor(level)) * 30,
}));
vi.mock("@/server/xp/award-question-xp", () => ({ awardQuestionXp: mocks.award }));
vi.mock("@/server/utils/assistant", () => ({
  getSaqFeedback: mocks.saqFeedback,
  getLaqFeedback: mocks.laqFeedback,
}));
vi.mock("../flashcard", () => ({ saveChapterToFlashcard: mocks.saveChapter }));

import {
  getChapterWrittenFeedback,
  retakeChapterMcq,
  submitChapterMcq,
  submitChapterWritten,
} from "../story-question";

const CHAPTER = "22222222-2222-4222-8222-222222222222";
const Q1 = "11111111-1111-4111-8111-111111111111";
const student = { id: "s1", role: "STUDENT", level: 5, cefrLevel: "A2", schoolId: "sch" };
const answers = [{ questionId: Q1, answer: "b" }];
const grade = {
  score: 4,
  total: 5,
  xpEarned: 8,
  results: [{ questionId: Q1, question: "Q?", answer: "b", correct: true, correctAnswer: "b", textualEvidence: null }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.currentUser.mockResolvedValue({ ...student });
  mocks.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({}));
  mocks.award.mockResolvedValue({ status: "saved", activityId: "a1" });
  mocks.saveChapter.mockResolvedValue({ success: true, data: { wordsCreated: 3, sentencesCreated: 2, alreadyExists: false } });
});

describe("submitChapterMcq", () => {
  it("grades on the server and pays 8 XP for 4 of 5 through the shared XP block", async () => {
    mocks.gradeMcq.mockResolvedValue(grade);
    const res = await submitChapterMcq(CHAPTER, answers);
    expect(res).toMatchObject({ success: true, score: 4, total: 5, xpEarned: 8 });
    expect(mocks.gradeMcq).toHaveBeenCalledOnce();
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.award).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "s1",
        activityType: "STORIES_MC_QUESTION",
        targetId: CHAPTER,
        xpEarned: 8,
      }),
    );
    expect(mocks.saveChapter).toHaveBeenCalledWith(CHAPTER);
  });

  it("shows the new score with no second XP on a resubmit after a retake", async () => {
    mocks.gradeMcq.mockResolvedValue({ ...grade, score: 5, xpEarned: 10 });
    mocks.award.mockResolvedValue({ status: "already-complete" });
    const res = await submitChapterMcq(CHAPTER, answers);
    expect(res).toMatchObject({ success: true, score: 5, xpEarned: 0 });
    expect(mocks.award).toHaveBeenCalledWith({}, expect.objectContaining({ refreshDetails: expect.objectContaining({ score: 5 }) }));
    expect(mocks.saveChapter).not.toHaveBeenCalled();
  });

  it("refuses a bad chapter id before grading", async () => {
    expect(await submitChapterMcq("x", answers)).toEqual({ error: "invalid" });
    expect(mocks.gradeMcq).not.toHaveBeenCalled();
  });

  it("saves nothing in staff preview", async () => {
    mocks.currentUser.mockResolvedValue({ ...student, role: "TEACHER" });
    expect(await submitChapterMcq(CHAPTER, answers)).toEqual({ status: "preview" });
    expect(mocks.gradeMcq).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe("retakeChapterMcq", () => {
  it("returns fresh questions with the XP flag and writes nothing", async () => {
    const fresh = [{ id: Q1, question: "Q? (new)", options: ["a", "b"] }];
    mocks.buildRetake.mockResolvedValue({ chapterId: CHAPTER, mcq: fresh, xpAvailable: false });
    expect(await retakeChapterMcq(CHAPTER)).toEqual({ success: true, mcq: fresh, xpAvailable: false });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe("getChapterWrittenFeedback", () => {
  it("refuses an LAQ answer under level x 30 characters before the AI call", async () => {
    const res = await getChapterWrittenFeedback(CHAPTER, "la", Q1, "short", "th");
    expect(res).toEqual({ error: "too_short", minChars: 150 });
    expect(mocks.laqFeedback).not.toHaveBeenCalled();
  });

  it("reads the chapter question and returns the SAQ feedback and score", async () => {
    mocks.writtenQuestion.mockResolvedValue({ question: "Why?", suggestedAnswer: "Because." });
    mocks.saqFeedback.mockResolvedValue({ score: 4, feedback: "Good." });
    const res = await getChapterWrittenFeedback(CHAPTER, "sa", Q1, "Because.", "th");
    expect(res).toEqual({ success: true, feedback: "Good.", score: 4 });
    expect(mocks.saqFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ chapterId: CHAPTER, question: "Why?" }) }),
    );
  });

  it("sums the LAQ rubric dimensions into one score", async () => {
    mocks.writtenQuestion.mockResolvedValue({ question: "Tell.", suggestedAnswer: null });
    mocks.laqFeedback.mockResolvedValue({
      scores: { a: 4, b: 4, c: 4, d: 3, e: 3 },
      overallImpression: "Fine.",
    });
    const res = await getChapterWrittenFeedback(CHAPTER, "la", Q1, "x".repeat(150), "th");
    expect(res).toEqual({ success: true, feedback: "Fine.", score: 18 });
  });
});

describe("submitChapterWritten", () => {
  it("pays the AI score as XP through the shared block (SA up to 5)", async () => {
    mocks.resolveWritten.mockResolvedValue({ question: "Why?", suggestedAnswer: "Because.", xpEarned: 4 });
    const res = await submitChapterWritten(CHAPTER, "sa", Q1, "Because.", 4);
    expect(res).toMatchObject({ success: true, xpEarned: 4 });
    expect(mocks.award).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ activityType: "STORIES_SA_QUESTION", targetId: CHAPTER, xpEarned: 4 }),
    );
    expect(mocks.saveChapter).toHaveBeenCalledWith(CHAPTER);
  });

  it("returns 0 XP when the shared block did not save", async () => {
    mocks.resolveWritten.mockResolvedValue({ question: "Why?", suggestedAnswer: "Because.", xpEarned: 4 });
    mocks.award.mockResolvedValue({ status: "already-complete" });
    const res = await submitChapterWritten(CHAPTER, "sa", Q1, "Because.", 4);
    expect(res).toMatchObject({ success: true, xpEarned: 0 });
    expect(mocks.saveChapter).not.toHaveBeenCalled();
  });

  it("refuses a second submit for the chapter", async () => {
    mocks.resolveWritten.mockRejectedValue(new Error("Chapter SA already submitted"));
    expect(await submitChapterWritten(CHAPTER, "sa", Q1, "Because.", 4)).toEqual({ error: "already_submitted" });
    expect(mocks.award).not.toHaveBeenCalled();
  });

  it("saves nothing in staff preview", async () => {
    mocks.currentUser.mockResolvedValue({ ...student, role: "ADMIN" });
    expect(await submitChapterWritten(CHAPTER, "sa", Q1, "Because.", 4)).toEqual({ status: "preview" });
    expect(mocks.resolveWritten).not.toHaveBeenCalled();
  });
});
