import { describe, it, expect, vi } from "vitest";
import {
  getModulesWithProgress,
  getLessonsForModule,
  getLessonWithContent,
  submitExerciseAttempt,
  submitQuizAnswers,
  saveChatMessage,
  getChatHistory,
  getUserConversations,
  updateUserProgress,
  getUserDashboard,
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
const teacher = {
  id: "t1",
  username: "teacher1",
  name: "Teacher",
  role: "TEACHER" as const,
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

// ─── getModulesWithProgress ───────────────────────────────

describe("getModulesWithProgress", () => {
  it("returns published modules with lesson counts and progress", async () => {
    const modules = [
      { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const lessons = [
      { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
    ];
    const progress = [
      { id: "p1", userId: "st1", moduleId: "m1", lessonId: "l1", status: "completed", score: 100, completedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ];

    const db = createMockDb();
    let selectCallCount = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult(modules);
          if (selectCallCount === 2) return queryResult(lessons);
          return queryResult(progress);
        }),
        orderBy: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult(modules);
          if (selectCallCount === 2) return queryResult(lessons);
          return queryResult(progress);
        }),
      }),
    });

    const result = await getModulesWithProgress({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
    });

    expect(result).toHaveLength(1);
    expect(result[0].lessonCount).toBe(1);
    expect(result[0].completedLessons).toBe(1);
    expect(result[0].progress).toBe(100);
  });

  it("rejects unauthenticated users", async () => {
    const db = createMockDb();
    const invalidUser = { id: "x", username: "x", name: "X", role: "GUEST" as unknown as typeof student.role, schoolId: "s1" };

    await expect(
      getModulesWithProgress({ db: wrapDb(db), user: invalidUser, tenant: globalTenant })
    ).rejects.toThrow(/codecamp:read/);
  });
});

// ─── getLessonsForModule ──────────────────────────────────

describe("getLessonsForModule", () => {
  it("returns lessons for a published module with user progress", async () => {
    const moduleRow = { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() };
    const lessons = [
      { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
      { id: "l2", moduleId: "m1", title: "Lesson 2", description: "Desc", order: 2, type: "exercise" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
    ];
    const progress = [
      { id: "p1", userId: "st1", moduleId: "m1", lessonId: "l1", status: "completed" as const, score: 100, completedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ];

    const db = createMockDb();
    let selectCallCount = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([moduleRow]);
          if (selectCallCount === 2) return queryResult(lessons);
          return queryResult(progress);
        }),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([moduleRow]);
          if (selectCallCount === 2) return queryResult(lessons);
          return queryResult(progress);
        }),
        orderBy: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([moduleRow]);
          if (selectCallCount === 2) return queryResult(lessons);
          return queryResult(progress);
        }),
      }),
    });

    const result = await getLessonsForModule({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { moduleId: "m1" },
    });

    expect(result).toHaveLength(2);
    expect(result[0].userStatus).toBe("completed");
    expect(result[0].userScore).toBe(100);
    expect(result[1].userStatus).toBe("not_started");
    expect(result[1].userScore).toBeNull();
  });

  it("throws when module is not published", async () => {
    const moduleRow = { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, status: "draft", createdAt: new Date(), updatedAt: new Date() };

    const db = createMockDb();
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([moduleRow]),
        }),
      }),
    });

    await expect(
      getLessonsForModule({ db: wrapDb(db), user: student, tenant: globalTenant, input: { moduleId: "m1" } })
    ).rejects.toThrow(/Module not found/);
  });

  it("throws when module does not exist", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      getLessonsForModule({ db: wrapDb(db), user: student, tenant: globalTenant, input: { moduleId: "m1" } })
    ).rejects.toThrow(/Module not found/);
  });
});

// ─── getLessonWithContent ─────────────────────────────────

describe("getLessonWithContent", () => {
  it("returns lesson with exercises, quiz questions, and progress", async () => {
    const lesson = { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: { sections: [] }, createdAt: new Date(), updatedAt: new Date() };
    const moduleRow = { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() };
    const exercise = { id: "e1", lessonId: "l1", title: "Ex 1", instructions: "Do this", starterCode: null, expectedOutput: null, hintsJson: ["hint1"], order: 1, createdAt: new Date(), updatedAt: new Date() };
    const quiz = { id: "q1", lessonId: "l1", question: "Q1", optionsJson: ["A", "B"], correctAnswer: "A", explanation: "Because", order: 1, createdAt: new Date(), updatedAt: new Date() };
    const progress = { id: "p1", userId: "st1", moduleId: "m1", lessonId: "l1", status: "completed" as const, score: 100, completedAt: new Date(), createdAt: new Date(), updatedAt: new Date() };

    const db = createMockDb();
    let selectCallCount = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          const calls = [
            queryResult([lesson]),
            queryResult([moduleRow]),
            queryResult([exercise]),
            queryResult([quiz]),
            queryResult([progress]),
          ];
          return calls[selectCallCount - 1] ?? queryResult([]);
        }),
        orderBy: vi.fn().mockImplementation(() => {
          selectCallCount++;
          const calls = [
            queryResult([lesson]),
            queryResult([moduleRow]),
            queryResult([exercise]),
            queryResult([quiz]),
            queryResult([progress]),
          ];
          return calls[selectCallCount - 1] ?? queryResult([]);
        }),
      }),
    });

    const result = await getLessonWithContent({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { lessonId: "l1" },
    });

    expect(result.id).toBe("l1");
    expect(result.exercises).toHaveLength(1);
    expect(result.quizQuestions).toHaveLength(1);
    expect(result.userStatus).toBe("completed");
    expect(result.userScore).toBe(100);
  });

  it("throws when lesson not found", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      getLessonWithContent({ db: wrapDb(db), user: student, tenant: globalTenant, input: { lessonId: "l1" } })
    ).rejects.toThrow(/Lesson not found/);
  });

  it("throws when module is not published", async () => {
    const lesson = { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() };
    const moduleRow = { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, status: "draft", createdAt: new Date(), updatedAt: new Date() };

    const db = createMockDb();
    let selectCallCount = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([lesson]);
          return queryResult([moduleRow]);
        }),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([lesson]);
          return queryResult([moduleRow]);
        }),
      }),
    });

    await expect(
      getLessonWithContent({ db: wrapDb(db), user: student, tenant: globalTenant, input: { lessonId: "l1" } })
    ).rejects.toThrow(/Lesson not found/);
  });
});

// ─── submitExerciseAttempt ────────────────────────────────

describe("submitExerciseAttempt", () => {
  it("returns exercise result and updates progress", async () => {
    const exercise = { id: "e1", lessonId: "l1", title: "Ex 1", instructions: "Do this", starterCode: null, expectedOutput: null, hintsJson: ["hint1"], order: 1, createdAt: new Date(), updatedAt: new Date() };
    const db = createMockDb({ selectResults: [exercise] });

    const result = await submitExerciseAttempt({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { exerciseId: "e1", code: "const x = 1;" },
    });

    expect(result.exerciseId).toBe("e1");
    expect(result.passed).toBe(false);
    expect(result.hints).toEqual(["hint1"]);
  });

  it("throws when exercise not found", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      submitExerciseAttempt({ db: wrapDb(db), user: student, tenant: globalTenant, input: { exerciseId: "e1", code: "" } })
    ).rejects.toThrow(/Exercise not found/);
  });
});

// ─── submitQuizAnswers ────────────────────────────────────

describe("submitQuizAnswers", () => {
  it("scores quiz and updates progress", async () => {
    const questions = [
      { id: "q1", lessonId: "l1", question: "Q1", optionsJson: ["A", "B"], correctAnswer: "A", explanation: "Because A", order: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: "q2", lessonId: "l1", question: "Q2", optionsJson: ["A", "B"], correctAnswer: "B", explanation: "Because B", order: 2, createdAt: new Date(), updatedAt: new Date() },
    ];

    const db = createMockDb();
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue(queryResult(questions)),
          limit: vi.fn().mockReturnValue(queryResult(questions)),
        }),
      }),
    });

    const result = await submitQuizAnswers({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: {
        lessonId: "l1",
        answers: [
          { questionId: "q1", answer: "A" },
          { questionId: "q2", answer: "B" },
        ],
      },
    });

    expect(result.score).toBe(100);
    expect(result.correctCount).toBe(2);
    expect(result.details).toHaveLength(2);
  });

  it("throws when no quiz questions exist", async () => {
    const db = createMockDb();
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(
      submitQuizAnswers({ db: wrapDb(db), user: student, tenant: globalTenant, input: { lessonId: "l1", answers: [] } })
    ).rejects.toThrow(/No quiz questions found/);
  });
});

// ─── saveChatMessage ──────────────────────────────────────

describe("saveChatMessage", () => {
  it("creates a new conversation and message", async () => {
    const conversation = { id: "c1", userId: "st1", title: "Hello...", moduleId: null, lessonId: null, createdAt: new Date(), updatedAt: new Date() };
    const message = { id: "m1", conversationId: "c1", role: "user", content: "Hello", createdAt: new Date() };

    const db = createMockDb();
    let insertReturningIdx = 0;
    const insertReturnings = [[conversation], [message]];
    db.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockImplementation(() => {
          const result = insertReturnings[insertReturningIdx] ?? [];
          insertReturningIdx++;
          return Promise.resolve(result);
        }),
      }),
    });

    const result = await saveChatMessage({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { message: "Hello" },
    });

    expect(result.conversationId).toBe("c1");
    expect(db.transaction).toHaveBeenCalled();
  });

  it("appends to existing conversation after verifying ownership", async () => {
    const existingConv = { id: "c1", userId: "st1", title: "Prev", moduleId: null, lessonId: null, createdAt: new Date(), updatedAt: new Date() };
    const message = { id: "m2", conversationId: "c1", role: "user", content: "Follow-up", createdAt: new Date() };

    const db = createMockDb();
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existingConv]),
        }),
      }),
    });
    db.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([message]),
      }),
    });

    const result = await saveChatMessage({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { conversationId: "c1", message: "Follow-up" },
    });

    expect(result.conversationId).toBe("c1");
  });

  it("throws when appending to someone else's conversation", async () => {
    const db = createMockDb();
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(
      saveChatMessage({ db: wrapDb(db), user: student, tenant: globalTenant, input: { conversationId: "c1", message: "Hi" } })
    ).rejects.toThrow(/Conversation not found/);
  });
});

// ─── getChatHistory ───────────────────────────────────────

describe("getChatHistory", () => {
  it("returns conversation with messages", async () => {
    const conversation = { id: "c1", userId: "st1", title: "Chat", moduleId: null, lessonId: null, createdAt: new Date(), updatedAt: new Date() };
    const messages = [
      { id: "m1", conversationId: "c1", role: "user", content: "Hello", createdAt: new Date() },
      { id: "m2", conversationId: "c1", role: "assistant", content: "Hi there", createdAt: new Date() },
    ];

    const db = createMockDb();
    let selectCallCount = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return queryResult([conversation]);
          }
          return queryResult(messages);
        }),
        orderBy: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return queryResult([conversation]);
          }
          return queryResult(messages);
        }),
      }),
    });

    const result = await getChatHistory({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { conversationId: "c1" },
    });

    expect(result.id).toBe("c1");
    expect(result.messages).toHaveLength(2);
  });

  it("throws when conversation not found", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      getChatHistory({ db: wrapDb(db), user: student, tenant: globalTenant, input: { conversationId: "c1" } })
    ).rejects.toThrow(/Conversation not found/);
  });
});

// ─── updateUserProgress ───────────────────────────────────

describe("updateUserProgress", () => {
  it("upserts progress with onConflictDoUpdate", async () => {
    const lesson = { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() };
    const progress = { id: "p1", userId: "st1", moduleId: "m1", lessonId: "l1", status: "completed" as const, score: 100, completedAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
    const db = createMockDb({ selectResults: [lesson], insertReturning: [progress] });

    const result = await updateUserProgress({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { lessonId: "l1", status: "completed", score: 100 },
    });

    expect(result.status).toBe("completed");
    expect(result.score).toBe(100);
    expect(db.insert).toHaveBeenCalled();
  });

  it("throws when lesson not found", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      updateUserProgress({ db: wrapDb(db), user: student, tenant: globalTenant, input: { lessonId: "l1" } })
    ).rejects.toThrow(/Lesson not found/);
  });
});

// ─── getUserDashboard ─────────────────────────────────────

describe("getUserDashboard", () => {
  it("returns aggregated dashboard data", async () => {
    const modules = [
      { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const lessons = [
      { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
    ];
    const progress = [
      { id: "p1", userId: "st1", moduleId: "m1", lessonId: "l1", status: "completed", score: 100, completedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ];
    const conversations = [
      { id: "c1", title: "Chat", updatedAt: new Date() },
    ];

    const db = createMockDb();
    // getModulesWithProgress uses db.select 3 times (modules, lessons, progress)
    // getUserDashboard uses db.select 1 more time (conversations)
    const selectResults = [
      modules, lessons, progress, conversations,
    ];
    let selectIdx = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          const result = selectResults[selectIdx] ?? [];
          selectIdx++;
          return queryResult(result);
        }),
        orderBy: vi.fn().mockImplementation(() => {
          const result = selectResults[selectIdx] ?? [];
          selectIdx++;
          return queryResult(result);
        }),
      }),
    });

    const result = await getUserDashboard({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
    });

    expect(result.totalLessons).toBe(1);
    expect(result.completedLessons).toBe(1);
    expect(result.overallProgress).toBe(100);
    expect(result.recentConversations).toHaveLength(1);
  });
});
