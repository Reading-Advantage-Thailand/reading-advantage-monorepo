import { describe, it, expect, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { submitAttempt, submitScienceAttempt, getStudentScienceAttempts } from "../quiz/index.js";
import { createTenantDB } from "../db-contract.js";
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

const mockStudent = { id: "s1", role: "STUDENT" as const, schoolId: "school-1" };
const mockTeacher = { id: "t1", role: "TEACHER" as const, schoolId: "school-1" };
const mockTenant = { schoolId: "school-1" };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, mockTenant);
}

function createSubmitDeps() {
  return {
    gradeAnswer: vi.fn(() => true),
    calculateXpForQuiz: vi.fn(() => ({ baseXp: 10, firstAttemptBonus: 5, totalXp: 15 })),
    awardXp: vi.fn(),
    updateStreakForProfile: vi.fn(),
    checkBadgeConditions: vi.fn(),
    processMasteryRun: vi.fn(),
  };
}

const selectedAttempt = {
  id: "attempt-1",
  studentId: mockStudent.id,
  lessonId: "lesson-1",
  schoolId: mockTenant.schoolId,
  score: 0,
  maxScore: 2,
  selectedQuestionIds: ["question-1", "question-2"],
  attemptNumber: 1,
  completedAt: null,
};

describe("submitAttempt integrity", () => {
  it("rejects duplicate responses before response or reward writes", async () => {
    quizMockDb = createMockDb({ selectResults: [selectedAttempt] });
    const deps = createSubmitDeps();

    const result = await submitAttempt({
      user: mockStudent,
      tenant: mockTenant,
      input: {
        attemptId: selectedAttempt.id,
        responses: [
          { questionId: "question-1", studentAnswer: "A" },
          { questionId: "question-1", studentAnswer: "A" },
        ],
      },
      deps,
    });

    expect(result.status).toBe(400);
    expect(quizMockDb.insert).not.toHaveBeenCalled();
    expect(deps.awardXp).not.toHaveBeenCalled();
  });

  it("rejects responses outside the selected question set", async () => {
    quizMockDb = createMockDb({ selectResults: [selectedAttempt] });
    const deps = createSubmitDeps();

    const result = await submitAttempt({
      user: mockStudent,
      tenant: mockTenant,
      input: {
        attemptId: selectedAttempt.id,
        responses: [
          { questionId: "question-1", studentAnswer: "A" },
          { questionId: "question-3", studentAnswer: "A" },
        ],
      },
      deps,
    });

    expect(result.status).toBe(400);
    expect(quizMockDb.insert).not.toHaveBeenCalled();
    expect(deps.processMasteryRun).not.toHaveBeenCalled();
  });

  it("returns a conflict when another submission wins the atomic claim", async () => {
    quizMockDb = createMockDb({
      selectSequence: [
        [selectedAttempt],
        [
          { id: "question-1", lessonId: "lesson-1", type: "MULTIPLE_CHOICE", text: "Q1", correctAnswer: "A", points: 1 },
          { id: "question-2", lessonId: "lesson-1", type: "MULTIPLE_CHOICE", text: "Q2", correctAnswer: "A", points: 1 },
        ],
      ],
      updateReturning: [],
    });
    const deps = createSubmitDeps();

    const result = await submitAttempt({
      user: mockStudent,
      tenant: mockTenant,
      input: {
        attemptId: selectedAttempt.id,
        responses: [
          { questionId: "question-1", studentAnswer: "A" },
          { questionId: "question-2", studentAnswer: "A" },
        ],
      },
      deps,
    });

    expect(result).toEqual({ status: 409, body: { error: "Attempt already submitted" } });
    expect(quizMockDb.insert).not.toHaveBeenCalled();
    expect(deps.processMasteryRun).not.toHaveBeenCalled();
    expect(deps.awardXp).not.toHaveBeenCalled();
  });
});

describe("submitScienceAttempt", () => {
  it("creates an attempt and returns it", async () => {
    const attempt = { id: "att-1", studentId: "s1", lessonId: "l1", score: 8, maxScore: 10, attemptNumber: 1 };
    const db = createMockDb({ insertReturning: [attempt] });

    const result = await submitScienceAttempt({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { lessonId: "l1", score: 8, maxScore: 10, attemptNumber: 1 },
    });

    expect(result.score).toBe(8);
    expect(result.lessonId).toBe("l1");
    expect(db.insert).toHaveBeenCalled();
  });

  it("throws when non-student tries to submit an attempt", async () => {
    const db = createMockDb();

    await expect(
      submitScienceAttempt({
        db: wrapDb(db),
        user: mockTeacher,
        tenant: mockTenant,
        input: { lessonId: "l1", score: 10, maxScore: 10, attemptNumber: 1 },
      })
    ).rejects.toThrow(/quiz:submit/);
  });
});

describe("getStudentScienceAttempts", () => {
  it("returns attempts for a student's lesson", async () => {
    const db = createMockDb({
      selectResults: [
        { id: "att-1", studentId: "s1", lessonId: "l1", score: 7, maxScore: 10, attemptNumber: 1 },
        { id: "att-2", studentId: "s1", lessonId: "l1", score: 9, maxScore: 10, attemptNumber: 2 },
      ],
    });

    const result = await getStudentScienceAttempts({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { studentId: "s1", lessonId: "l1" },
    });

    expect(result).toHaveLength(2);
    expect(result[1].score).toBe(9);
  });

  it("allows teacher to read any student's attempts", async () => {
    const db = createMockDb({ selectResults: [{ id: "att-1", studentId: "s2" }] });

    const result = await getStudentScienceAttempts({
      db: wrapDb(db),
      user: mockTeacher,
      tenant: mockTenant,
      input: { studentId: "s2", lessonId: "l1" },
    });

    expect(result).toHaveLength(1);
  });

  it("throws when student reads another student's attempts", async () => {
    const db = createMockDb();

    await expect(
      getStudentScienceAttempts({
        db: wrapDb(db),
        user: mockStudent,
        tenant: mockTenant,
        input: { studentId: "other-student", lessonId: "l1" },
      })
    ).rejects.toThrow(/quiz:read/);
  });

  it("returns empty list when no attempts exist", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await getStudentScienceAttempts({
      db: wrapDb(db),
      user: mockStudent,
      tenant: mockTenant,
      input: { studentId: "s1", lessonId: "l1" },
    });

    expect(result).toEqual([]);
  });
});
