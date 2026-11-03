import { describe, it, expect, vi, afterEach } from "vitest";
import { startQuiz, submitAttempt } from "../quiz/submit-attempt.js";
import { createMockDb } from "./mock-db.js";

let quizMockDb = createMockDb();

vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  return {
    ...actual,
    get db() {
      return quizMockDb;
    },
  };
});

const student = { id: "s1", role: "STUDENT" as const, schoolId: "school-1" };
const tenant = { schoolId: "school-1" };
const lesson = { id: "lesson-1", slug: "forces" };
const startedAt = new Date("2026-02-01T00:00:00.000Z");

function bank(count: number, points = 2) {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${i + 1}`, lessonId: "lesson-1", type: "MULTIPLE_CHOICE", text: `Q${i + 1}`,
    options: ["A", "B"], correctAnswer: "A", points, order: i + 1,
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("startQuiz", () => {
  it("throws for a role without quiz:submit", async () => {
    quizMockDb = createMockDb();
    await expect(startQuiz({ user: { id: "t1", role: "TEACHER", schoolId: "school-1" }, tenant, lessonSlug: "forces" })).rejects.toThrow();
  });

  it("returns 404 when the lesson does not exist", async () => {
    quizMockDb = createMockDb({ selectSequence: [[]] });
    const res = await startQuiz({ user: student, tenant, lessonSlug: "missing" });
    expect(res).toEqual({ status: 404, body: { error: "Lesson not found" } });
  });

  it("returns 403 when the lesson is in no class", async () => {
    quizMockDb = createMockDb({ selectSequence: [[lesson], []] });
    const res = await startQuiz({ user: student, tenant, lessonSlug: "forces" });
    expect(res.status).toBe(403);
    expect(quizMockDb.insert).not.toHaveBeenCalled();
  });

  it("returns 403 when the student is not enrolled in a class with the lesson", async () => {
    quizMockDb = createMockDb({ selectSequence: [[lesson], [{ classId: "c1", teacherId: "t1" }], []] });
    const res = await startQuiz({ user: student, tenant, lessonSlug: "forces" });
    expect(res).toEqual({ status: 403, body: { error: "Not enrolled in class with this lesson" } });
  });

  it("returns 500 when the bank has fewer than four questions", async () => {
    quizMockDb = createMockDb({ selectSequence: [[lesson], [{ classId: "c1", teacherId: "t1" }], [{ classId: "c1" }], bank(3)] });
    const res = await startQuiz({ user: student, tenant, lessonSlug: "forces" });
    expect(res).toEqual({ status: 500, body: { error: "Insufficient questions in question bank" } });
    expect(quizMockDb.insert).not.toHaveBeenCalled();
  });

  it("returns 500 when selected questions have no points", async () => {
    quizMockDb = createMockDb({
      selectSequence: [[lesson], [{ classId: "c1", teacherId: "t1" }], [{ classId: "c1" }], bank(4, 0), [{ c: 0 }]],
    });
    const res = await startQuiz({ user: student, tenant, lessonSlug: "forces" });
    expect(res).toEqual({ status: 500, body: { error: "Quiz questions must have positive points" } });
    expect(quizMockDb.insert).not.toHaveBeenCalled();
  });

  it("selects a quarter of the bank, numbers the attempt, and creates a completion", async () => {
    quizMockDb = createMockDb({
      selectSequence: [[lesson], [{ classId: "c1", teacherId: "t1" }], [{ classId: "c1" }], bank(8), [{ c: 2 }], []],
      insertReturning: [{ id: "attempt-9", startedAt }],
    });
    const res = await startQuiz({ user: student, tenant, lessonSlug: "forces" });

    expect(res.status).toBe(200);
    const body = res.body as { quizId: string; questions: Array<{ order: number; points: number }>; totalPoints: number; startedAt: string };
    expect(body.quizId).toBe("attempt-9");
    expect(body.questions).toHaveLength(2);
    expect(body.questions.map((q) => q.order)).toEqual([1, 2]);
    expect(body.questions[0]).not.toHaveProperty("correctAnswer");
    expect(body.totalPoints).toBe(4);
    expect(body.startedAt).toBe(startedAt.toISOString());

    const valuesSpy = quizMockDb.insert.mock.results[0].value.values;
    const attemptValues = valuesSpy.mock.calls[0][0];
    expect(attemptValues).toMatchObject({ studentId: "s1", lessonId: "lesson-1", schoolId: "school-1", maxScore: 4, attemptNumber: 3 });
    expect(attemptValues.selectedQuestionIds).toHaveLength(2);
    expect(valuesSpy.mock.calls[1][0]).toMatchObject({ studentId: "s1", lessonId: "lesson-1", status: "IN_PROGRESS", attemptsCount: 0 });
  });

  it("allows the class teacher id without an enrollment lookup", async () => {
    quizMockDb = createMockDb({
      selectSequence: [[lesson], [{ classId: "c1", teacherId: "s1" }], bank(4), [{ c: 0 }], [{ id: "comp-1", status: "COMPLETED" }]],
      insertReturning: [{ id: "attempt-1", startedAt }],
    });
    const res = await startQuiz({ user: student, tenant, lessonSlug: "lesson-1" });
    expect(res.status).toBe(200);
    expect(quizMockDb.select).toHaveBeenCalledTimes(5);
    // a COMPLETED completion is left as it is
    expect(quizMockDb.update).not.toHaveBeenCalled();
  });

  it("moves a NOT_STARTED completion to IN_PROGRESS", async () => {
    quizMockDb = createMockDb({
      selectSequence: [[lesson], [{ classId: "c1", teacherId: "t1" }], [{ classId: "c1" }], bank(4), [{ c: 0 }], [{ id: "comp-1", status: "NOT_STARTED" }]],
      insertReturning: [{ id: "attempt-1", startedAt }],
    });
    const res = await startQuiz({ user: student, tenant, lessonSlug: "forces" });
    expect(res.status).toBe(200);
    expect(quizMockDb.insert).toHaveBeenCalledTimes(1);
    expect(quizMockDb.update.mock.results[0].value.set.mock.calls[0][0]).toMatchObject({ status: "IN_PROGRESS" });
  });
});

const attempt = {
  id: "attempt-1", studentId: "s1", lessonId: "lesson-1", schoolId: "school-1", score: 0,
  maxScore: 4, selectedQuestionIds: ["q1", "q2"], attemptNumber: 1, completedAt: null,
};

function submitDeps() {
  return {
    gradeAnswer: vi.fn((_type: string, answer: unknown, correct: unknown) => answer === correct),
    calculateXpForQuiz: vi.fn(() => ({ baseXp: 10, firstAttemptBonus: 5, totalXp: 15 })),
    awardXp: vi.fn(async () => ({ xp: 115, level: 2, levelName: "Explorer", levelUp: true })),
    updateStreakForProfile: vi.fn(async () => ({ streak: 3, milestoneBonus: 7 })),
    checkBadgeConditions: vi.fn(async () => ({ newlyUnlocked: ["b1"], achievements: [] })),
    processMasteryRun: vi.fn(async () => ({ status: "COMPLETED", updatedCount: 1 })),
  };
}

const answers = [
  { questionId: "q1", studentAnswer: "A", timeSpentSeconds: 5 },
  { questionId: "q2", studentAnswer: "B", timeSpentSeconds: 7 },
];

describe("submitAttempt", () => {
  it("returns 404 when the attempt does not exist", async () => {
    quizMockDb = createMockDb({ selectSequence: [[]] });
    const res = await submitAttempt({ user: student, tenant, input: { attemptId: "x", responses: answers }, deps: submitDeps() });
    expect(res.status).toBe(404);
  });

  it("returns 403 for another student's attempt", async () => {
    quizMockDb = createMockDb({ selectSequence: [[{ ...attempt, studentId: "s2" }]] });
    const res = await submitAttempt({ user: student, tenant, input: { attemptId: "attempt-1", responses: answers }, deps: submitDeps() });
    expect(res.status).toBe(403);
  });

  it("returns 409 for an attempt already completed", async () => {
    quizMockDb = createMockDb({ selectSequence: [[{ ...attempt, completedAt: startedAt }]] });
    const res = await submitAttempt({ user: student, tenant, input: { attemptId: "attempt-1", responses: answers }, deps: submitDeps() });
    expect(res).toEqual({ status: 409, body: { error: "Attempt already submitted" } });
  });

  it("returns 409 for a legacy attempt with no selected questions", async () => {
    quizMockDb = createMockDb({ selectSequence: [[{ ...attempt, selectedQuestionIds: [] }]] });
    const res = await submitAttempt({ user: student, tenant, input: { attemptId: "attempt-1", responses: [] }, deps: submitDeps() });
    expect(res.status).toBe(409);
  });

  it("returns 400 when a selected question is not in the lesson bank", async () => {
    quizMockDb = createMockDb({ selectSequence: [[attempt], bank(1)] });
    const deps = submitDeps();
    const res = await submitAttempt({ user: student, tenant, input: { attemptId: "attempt-1", responses: answers }, deps });
    expect(res).toEqual({ status: 400, body: { error: "Invalid question ID: q2" } });
    expect(quizMockDb.transaction).not.toHaveBeenCalled();
  });

  it("grades answers, writes the completion, and awards XP with the streak bonus", async () => {
    quizMockDb = createMockDb({
      selectSequence: [[attempt], bank(2), [], []],
      updateReturning: [{ id: "attempt-1" }],
      insertReturning: [{ id: "profile-1" }],
    });
    const deps = submitDeps();
    const res = await submitAttempt({ user: student, tenant, input: { attemptId: "attempt-1", responses: answers }, deps });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      attemptId: "attempt-1", score: 2, maxScore: 4, percentage: 50, attemptNumber: 1,
      mastery: { status: "COMPLETED", updatedCount: 1 },
      gamification: { xpAwarded: 22, baseXp: 10, firstAttemptBonus: 5, streakMilestoneBonus: 7, currentStreak: 3, level: 2, levelUp: true, totalXp: 115, badgesUnlocked: ["b1"] },
    });
    const breakdown = (res.body as { breakdown: Array<{ isCorrect: boolean; points: number }> }).breakdown;
    expect(breakdown.map((b) => [b.isCorrect, b.points])).toEqual([[true, 2], [false, 0]]);
    expect(deps.calculateXpForQuiz).toHaveBeenCalledWith(50, 1);
    expect(deps.awardXp).toHaveBeenCalledWith(expect.objectContaining({ input: { profileId: "profile-1", amount: 15 } }));

    const claim = quizMockDb.update.mock.results[0].value.set.mock.calls[0][0];
    expect(claim).toMatchObject({ score: 2 });
    const valuesSpy = quizMockDb.insert.mock.results[0].value.values;
    expect(valuesSpy.mock.calls[0][0]).toHaveLength(2);
    expect(valuesSpy.mock.calls[1][0]).toMatchObject({
      status: "COMPLETED", attemptsCount: 1, bestScore: 2, bestScorePercentage: 50, totalTimeSpentSeconds: 12,
    });
    expect(valuesSpy.mock.calls[2][0]).toMatchObject({ attemptId: "attempt-1", status: "PENDING" });
    expect(valuesSpy.mock.calls[3][0]).toMatchObject({ userId: "s1", xp: 0, level: 1 });
  });

  it("keeps the higher best score when a retry scores lower", async () => {
    const completion = {
      id: "comp-1", attemptsCount: 1, bestScore: 4, bestScorePercentage: 100, totalTimeSpentSeconds: 30,
    };
    quizMockDb = createMockDb({
      selectSequence: [[attempt], bank(2), [completion], [{ id: "profile-1" }]],
      updateReturning: [{ id: "attempt-1" }],
    });
    const res = await submitAttempt({ user: student, tenant, input: { attemptId: "attempt-1", responses: answers }, deps: submitDeps() });
    expect(res.status).toBe(200);
    const completionSet = quizMockDb.update.mock.results[0].value.set.mock.calls[1][0];
    expect(completionSet).toMatchObject({
      attemptsCount: 2, mostRecentScore: 2, mostRecentScorePercentage: 50, bestScore: 4, bestScorePercentage: 100,
      totalTimeSpentSeconds: 42, status: "COMPLETED",
    });
    // existing profile: no profile insert
    expect(quizMockDb.insert.mock.results[0].value.values).toHaveBeenCalledTimes(2);
  });

  it("uses the new score as best when the stored best is null", async () => {
    const completion = { id: "comp-1", attemptsCount: 0, bestScore: null, bestScorePercentage: null, totalTimeSpentSeconds: 0 };
    quizMockDb = createMockDb({
      selectSequence: [[attempt], bank(2), [completion], [{ id: "profile-1" }]],
      updateReturning: [{ id: "attempt-1" }],
    });
    await submitAttempt({ user: student, tenant, input: { attemptId: "attempt-1", responses: answers }, deps: submitDeps() });
    const completionSet = quizMockDb.update.mock.results[0].value.set.mock.calls[1][0];
    expect(completionSet).toMatchObject({ bestScore: 2, bestScorePercentage: 50 });
  });
});
