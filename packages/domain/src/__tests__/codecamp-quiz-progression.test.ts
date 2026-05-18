import { describe, it, expect, vi } from "vitest";
import {
  submitQuizAnswers,
  markTheoryComplete,
  QUIZ_PASS_THRESHOLD,
} from "../codecamp/index.js";
import { createMockDb } from "./mock-db.js";
import { createTenantDB } from "../db-contract.js";
import type { DB } from "@reading-advantage/db";

const student = {
  id: "st1",
  username: "student1",
  name: "Student",
  role: "STUDENT" as const,
  schoolId: "s1",
};

const globalTenant = { schoolId: null };

function wrapDb(db: ReturnType<typeof createMockDb>) {
  return createTenantDB(db as unknown as DB, globalTenant);
}

function queryResult<T>(value: T) {
  const result = Object.assign(Promise.resolve(value), {
    limit: vi.fn().mockImplementation(() => result),
    orderBy: vi.fn().mockImplementation(() => result),
  });
  return result;
}

// ─── QUIZ_PASS_THRESHOLD ──────────────────────────────────

describe("QUIZ_PASS_THRESHOLD", () => {
  it("is 70", () => {
    expect(QUIZ_PASS_THRESHOLD).toBe(70);
  });
});

// ─── submitQuizAnswers — pass threshold ───────────────────

describe("submitQuizAnswers — pass/fail threshold", () => {
  function makeQuestions(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `q${i + 1}`,
      lessonId: "l1",
      question: `Q${i + 1}`,
      optionsJson: ["A", "B"],
      correctAnswer: "A",
      explanation: `Because A${i + 1}`,
      order: i + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  function makeDb(questions: ReturnType<typeof makeQuestions>) {
    const progressRow = {
      id: "prog1",
      userId: "st1",
      moduleId: "m1",
      lessonId: "l1",
      status: "in_progress",
      score: 0,
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = createMockDb({
      insertReturning: [progressRow],
    });

    // select is used once for quiz questions; subsequent selects are for updateUserProgress's lesson lookup
    const lessonRow = {
      id: "l1",
      moduleId: "m1",
      title: "Lesson 1",
      type: "quiz",
      order: 1,
      description: "",
      contentJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let selectCallCount = 0;
    db.select = vi.fn().mockImplementation(() => {
      selectCallCount++;
      const isFirst = selectCallCount === 1;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue(queryResult(isFirst ? questions : [lessonRow])),
            limit: vi.fn().mockReturnValue(queryResult(isFirst ? questions : [lessonRow])),
          }),
        }),
      };
    });

    return db;
  }

  it("score < 70: updateUserProgress called with status in_progress, result.passed = false", async () => {
    // 1 correct out of 10 = 10%
    const questions = makeQuestions(10);
    const db = makeDb(questions);

    const result = await submitQuizAnswers({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: {
        lessonId: "l1",
        answers: [
          { questionId: "q1", answer: "A" }, // correct
          ...questions.slice(1).map((q) => ({ questionId: q.id, answer: "B" })), // wrong
        ],
      },
    });

    expect(result.score).toBe(10);
    expect(result.passed).toBe(false);

    // Verify insert was called with status "in_progress"
    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    expect(insertMock).toHaveBeenCalled();
    const insertValues = insertMock.mock.results[0].value.values as ReturnType<typeof vi.fn>;
    const insertedData = insertValues.mock.calls[0][0] as { status: string };
    expect(insertedData.status).toBe("in_progress");
  });

  it("score = 70: updateUserProgress called with status completed, result.passed = true", async () => {
    // 7 correct out of 10 = 70%
    const questions = makeQuestions(10);
    const db = makeDb(questions);

    const result = await submitQuizAnswers({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: {
        lessonId: "l1",
        answers: [
          ...questions.slice(0, 7).map((q) => ({ questionId: q.id, answer: "A" })), // correct
          ...questions.slice(7).map((q) => ({ questionId: q.id, answer: "B" })), // wrong
        ],
      },
    });

    expect(result.score).toBe(70);
    expect(result.passed).toBe(true);

    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    expect(insertMock).toHaveBeenCalled();
    const insertValues = insertMock.mock.results[0].value.values as ReturnType<typeof vi.fn>;
    const insertedData = insertValues.mock.calls[0][0] as { status: string };
    expect(insertedData.status).toBe("completed");
  });

  it("score = 100: updateUserProgress called with status completed, result.passed = true", async () => {
    const questions = makeQuestions(4);
    const db = makeDb(questions);

    const result = await submitQuizAnswers({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: {
        lessonId: "l1",
        answers: questions.map((q) => ({ questionId: q.id, answer: "A" })),
      },
    });

    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);

    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    expect(insertMock).toHaveBeenCalled();
    const insertValues = insertMock.mock.results[0].value.values as ReturnType<typeof vi.fn>;
    const insertedData = insertValues.mock.calls[0][0] as { status: string };
    expect(insertedData.status).toBe("completed");
  });
});

// ─── markTheoryComplete ───────────────────────────────────

describe("markTheoryComplete", () => {
  const theoryLesson = {
    id: "l1",
    moduleId: "m1",
    title: "Theory Lesson",
    type: "theory" as const,
    order: 1,
    description: "Learn something",
    contentJson: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const exerciseLesson = {
    ...theoryLesson,
    id: "l2",
    type: "exercise" as const,
    title: "Exercise Lesson",
  };

  it("marks a theory lesson as completed", async () => {
    const progressRow = {
      id: "prog1",
      userId: "st1",
      moduleId: "m1",
      lessonId: "l1",
      status: "completed",
      score: 0,
      completedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = createMockDb({ insertReturning: [progressRow] });

    // First select call returns the theory lesson; second select (inside updateUserProgress) also returns it
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(
          queryResult([theoryLesson])
        ),
      }),
    });

    const result = await markTheoryComplete({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { lessonId: "l1" },
    });

    expect(result).toBeDefined();

    // Verify insert was called with status "completed"
    const insertMock = db.insert as ReturnType<typeof vi.fn>;
    expect(insertMock).toHaveBeenCalled();
    const insertValues = insertMock.mock.results[0].value.values as ReturnType<typeof vi.fn>;
    const insertedData = insertValues.mock.calls[0][0] as { status: string };
    expect(insertedData.status).toBe("completed");
  });

  it("throws 'Lesson is not a theory lesson' for an exercise lesson", async () => {
    const db = createMockDb();
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(
          queryResult([exerciseLesson])
        ),
      }),
    });

    await expect(
      markTheoryComplete({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { lessonId: "l2" },
      })
    ).rejects.toThrow("Lesson is not a theory lesson");
  });

  it("throws 'Lesson not found' for a non-existent lesson", async () => {
    const db = createMockDb();
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue(
          queryResult([])
        ),
      }),
    });

    await expect(
      markTheoryComplete({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { lessonId: "nonexistent" },
      })
    ).rejects.toThrow("Lesson not found");
  });
});
