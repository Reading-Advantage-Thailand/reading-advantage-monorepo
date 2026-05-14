import { describe, it, expect, vi } from "vitest";
import {
  getModulesWithProgress,
  getLessonsForModule,
  getLessonWithContent,
  submitExerciseAttempt,
  submitQuizAnswers,
  saveChatMessage,
  getChatHistory,
  updateUserProgress,
  getUserDashboard,
  getExerciseRepos,
  linkExerciseRepo,
  getPrReviewsForUser,
  createPrReview,
  updatePrReview,
  getPrReviewByPrUrl,
  getModulesByPhase,
  getModuleWithExercises,
  checkModulePrerequisite,
  createInternAccount,
  listInterns,
  getInternProgress,
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

  it("returns phase for each module", async () => {
    const modules = [
      { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() },
      { id: "m2", title: "Module 2", description: "Desc", slug: "mod2", order: 2, phase: "B", status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const lessons: typeof modules = [];
    const progress: typeof modules = [];

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

    expect(result).toHaveLength(2);
    expect(result[0].phase).toBe("A");
    expect(result[1].phase).toBe("B");
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
  it("returns aggregated dashboard data with phase grouping", async () => {
    const modules = [
      { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() },
      { id: "m2", title: "Module 2", description: "Desc", slug: "mod2", order: 2, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() },
      { id: "m3", title: "Module 3", description: "Desc", slug: "mod3", order: 7, phase: "B", status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const lessons = [
      { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
      { id: "l2", moduleId: "m2", title: "Lesson 2", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
      { id: "l3", moduleId: "m3", title: "Lesson 3", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
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

    expect(result.totalLessons).toBe(3);
    expect(result.completedLessons).toBe(1);
    expect(result.overallProgress).toBe(33);
    expect(result.recentConversations).toHaveLength(1);

    // Phase grouping assertions
    expect(result.phases).toBeDefined();
    expect(result.phases.A).toBeDefined();
    expect(result.phases.B).toBeDefined();
    expect(result.phases.A.modules).toHaveLength(2);
    expect(result.phases.B.modules).toHaveLength(1);
    expect(result.phases.A.completedLessons).toBe(1);
    expect(result.phases.A.totalLessons).toBe(2);
    expect(result.phases.B.completedLessons).toBe(0);
    expect(result.phases.B.totalLessons).toBe(1);
    expect(result.phases.A.title).toBe("Foundations");
    expect(result.phases.A.portfolioProject).toBe("Personal Portfolio Website");
    expect(result.phases.B.title).toBe("Frameworks");
    expect(result.phases.B.portfolioProject).toBe("Learning Dashboard");
  });

  it("includes all four phases even when empty", async () => {
    const modules: typeof selectResults[number] = [];
    const lessons: typeof selectResults[number] = [];
    const progress: typeof selectResults[number] = [];
    const conversations: typeof selectResults[number] = [];

    const db = createMockDb();
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

    expect(result.phases.A).toBeDefined();
    expect(result.phases.B).toBeDefined();
    expect(result.phases.C).toBeDefined();
    expect(result.phases.D).toBeDefined();
    expect(result.phases.A.modules).toHaveLength(0);
    expect(result.phases.C.modules).toHaveLength(0);
  });
});

// ─── Exercise Repo Management ─────────────────────────────

describe("getExerciseRepos", () => {
  it("returns repos for a module ordered by order", async () => {
    const repos = [
      { id: "r1", moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1, createdAt: new Date() },
      { id: "r2", moduleId: "m1", repoUrl: "https://github.com/org/repo2", description: "Repo 2", order: 2, createdAt: new Date() },
    ];
    const db = createMockDb({ selectResults: repos });

    const result = await getExerciseRepos({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { moduleId: "m1" },
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("r1");
    expect(result[1].id).toBe("r2");
  });

  it("rejects unauthenticated users", async () => {
    const db = createMockDb();
    const invalidUser = { id: "x", username: "x", name: "X", role: "GUEST" as unknown as typeof student.role, schoolId: "s1" };

    await expect(
      getExerciseRepos({ db: wrapDb(db), user: invalidUser, tenant: globalTenant, input: { moduleId: "m1" } })
    ).rejects.toThrow(/codecamp:read/);
  });
});

describe("linkExerciseRepo", () => {
  it("allows admin to link a repo to a module", async () => {
    const repo = { id: "r1", moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1, createdAt: new Date() };
    const db = createMockDb({ insertReturning: [repo] });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    const result = await linkExerciseRepo({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1 },
    });

    expect(result.id).toBe("r1");
    expect(db.insert).toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    const db = createMockDb();

    await expect(
      linkExerciseRepo({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1 },
      })
    ).rejects.toThrow(/admin:dashboard/);
  });
});

describe("getPrReviewsForUser", () => {
  it("returns PR reviews for the current user", async () => {
    const reviews = [
      { id: "pr1", exerciseRepoId: "r1", userId: "st1", prUrl: "https://github.com/org/repo1/pull/1", reviewStatus: "pending", llmReviewSummary: null, reviewedAt: null, createdAt: new Date() },
    ];
    const db = createMockDb({ selectResults: reviews });

    const result = await getPrReviewsForUser({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
    });

    expect(result).toHaveLength(1);
    expect(result[0].reviewStatus).toBe("pending");
  });
});

// ─── PR Review Pipeline ───────────────────────────────────

describe("createPrReview", () => {
  it("creates a pending PR review", async () => {
    const review = { id: "pr1", exerciseRepoId: "r1", userId: "st1", prUrl: "https://github.com/org/repo1/pull/1", reviewStatus: "pending", llmReviewSummary: null, reviewedAt: null, createdAt: new Date() };
    const db = createMockDb({ insertReturning: [review] });

    const result = await createPrReview({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { exerciseRepoId: "r1", prUrl: "https://github.com/org/repo1/pull/1" },
    });

    expect(result.id).toBe("pr1");
    expect(result.reviewStatus).toBe("pending");
    expect(db.insert).toHaveBeenCalled();
  });

  it("rejects unauthenticated users", async () => {
    const db = createMockDb();
    const invalidUser = { id: "x", username: "x", name: "X", role: "GUEST" as unknown as typeof student.role, schoolId: "s1" };

    await expect(
      createPrReview({ db: wrapDb(db), user: invalidUser, tenant: globalTenant, input: { exerciseRepoId: "r1", prUrl: "https://github.com/org/repo1/pull/1" } })
    ).rejects.toThrow(/codecamp:read/);
  });
});

describe("updatePrReview", () => {
  it("updates review status and summary", async () => {
    const review = { id: "pr1", exerciseRepoId: "r1", userId: "st1", prUrl: "https://github.com/org/repo1/pull/1", reviewStatus: "approved", llmReviewSummary: "Great work!", reviewedAt: new Date(), createdAt: new Date() };
    const db = createMockDb({ updateReturning: [review] });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    const result = await updatePrReview({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { reviewId: "pr1", reviewStatus: "approved", llmReviewSummary: "Great work!" },
    });

    expect(result.reviewStatus).toBe("approved");
    expect(result.llmReviewSummary).toBe("Great work!");
    expect(db.update).toHaveBeenCalled();
  });

  it("rejects non-admin users", async () => {
    const db = createMockDb();

    await expect(
      updatePrReview({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { reviewId: "pr1", reviewStatus: "approved" },
      })
    ).rejects.toThrow(/admin:dashboard/);
  });
});

describe("getPrReviewByPrUrl", () => {
  it("returns review by PR URL", async () => {
    const review = { id: "pr1", exerciseRepoId: "r1", userId: "st1", prUrl: "https://github.com/org/repo1/pull/1", reviewStatus: "pending", llmReviewSummary: null, reviewedAt: null, createdAt: new Date() };
    const db = createMockDb({ selectResults: [review] });

    const result = await getPrReviewByPrUrl({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { prUrl: "https://github.com/org/repo1/pull/1" },
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("pr1");
  });

  it("returns null when no review found", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await getPrReviewByPrUrl({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { prUrl: "https://github.com/org/repo1/pull/99" },
    });

    expect(result).toBeNull();
  });
});

// ─── Expanded Curriculum Queries ──────────────────────────

describe("getModulesByPhase", () => {
  it("returns modules grouped by phase A", async () => {
    const modules = [
      { id: "m1", title: "Module 1", description: "Desc", slug: "mod-1", order: 1, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() },
      { id: "m2", title: "Module 2", description: "Desc", slug: "mod-2", order: 2, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const db = createMockDb({ selectResults: modules });

    const result = await getModulesByPhase({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { phase: "A" },
    });

    expect(result).toHaveLength(2);
  });

  it("returns modules for all valid phases", async () => {
    const modulesA = [
      { id: "m1", title: "Module 1", description: "Desc", slug: "mod-1", order: 1, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const modulesB = [
      { id: "m2", title: "Module 2", description: "Desc", slug: "mod-2", order: 7, phase: "B", status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const modulesC = [
      { id: "m3", title: "Module 3", description: "Desc", slug: "mod-3", order: 11, phase: "C", status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const modulesD = [
      { id: "m4", title: "Module 4", description: "Desc", slug: "mod-4", order: 14, phase: "D", status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];

    for (const [phase, expectedModules] of [
      ["A", modulesA],
      ["B", modulesB],
      ["C", modulesC],
      ["D", modulesD],
    ] as const) {
      const db = createMockDb({ selectResults: expectedModules });
      const result = await getModulesByPhase({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { phase },
      });
      expect(result).toHaveLength(1);
      expect(result[0].phase).toBe(phase);
    }
  });

  it("rejects invalid phase", async () => {
    const db = createMockDb();

    await expect(
      getModulesByPhase({ db: wrapDb(db), user: student, tenant: globalTenant, input: { phase: "Z" as "A" } })
    ).rejects.toThrow(/Invalid phase/);
  });
});

describe("getModuleWithExercises", () => {
  it("returns module with linked exercise repos", async () => {
    const moduleRow = { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() };
    const repos = [
      { id: "r1", moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1, createdAt: new Date() },
    ];

    const db = createMockDb();
    let selectCallCount = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([moduleRow]);
          return queryResult(repos);
        }),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([moduleRow]);
          return queryResult(repos);
        }),
        orderBy: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([moduleRow]);
          return queryResult(repos);
        }),
      }),
    });

    const result = await getModuleWithExercises({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { moduleId: "m1" },
    });

    expect(result.id).toBe("m1");
    expect(result.exerciseRepos).toHaveLength(1);
    expect(result.exerciseRepos[0].repoUrl).toBe("https://github.com/org/repo1");
  });

  it("throws when module not found", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      getModuleWithExercises({ db: wrapDb(db), user: student, tenant: globalTenant, input: { moduleId: "m1" } })
    ).rejects.toThrow(/Module not found/);
  });
});

function createSequencedMockDb(results: unknown[]) {
  let idx = 0;
  function nextResult() {
    const val = results[idx++] ?? [];
    const self = Object.assign(Promise.resolve(val), {
      limit: vi.fn().mockImplementation(() => self),
      orderBy: vi.fn().mockImplementation(() => self),
    });
    return self;
  }
  const db = createMockDb();
  db.select = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockImplementation(() => nextResult()),
      innerJoin: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => nextResult()),
      })),
    }),
  });
  return db;
}

describe("checkModulePrerequisite", () => {
  it("returns true when previous module is completed", async () => {
    const modules = [
      { id: "m1", title: "M1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() },
      { id: "m2", title: "M2", description: "Desc", slug: "mod2", order: 2, status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const lessons = [
      { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
    ];
    const progress = [
      { id: "p1", userId: "st1", moduleId: "m1", lessonId: "l1", status: "completed", score: 100, completedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ];

    const db = createSequencedMockDb([[modules[1]], [modules[0]], lessons, progress]);

    const result = await checkModulePrerequisite({
      db: db as unknown as ReturnType<typeof wrapDb>,
      user: student,
      tenant: globalTenant,
      input: { moduleId: "m2" },
    });

    expect(result.canStart).toBe(true);
  });

  it("returns false when previous module is not completed", async () => {
    const modules = [
      { id: "m1", title: "M1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() },
      { id: "m2", title: "M2", description: "Desc", slug: "mod2", order: 2, status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const lessons = [
      { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
    ];
    const progress: unknown[] = [];

    const db = createSequencedMockDb([[modules[1]], [modules[0]], lessons, progress]);

    const result = await checkModulePrerequisite({
      db: db as unknown as ReturnType<typeof wrapDb>,
      user: student,
      tenant: globalTenant,
      input: { moduleId: "m2" },
    });

    expect(result.canStart).toBe(false);
  });
});

// ─── Admin Domain Functions ───────────────────────────────

describe("createInternAccount", () => {
  it("allows admin to create an intern account", async () => {
    const user = { id: "u1", username: "intern1", name: "Intern One", role: "INTERN", schoolId: null, createdAt: new Date() };
    const db = createMockDb({ insertReturning: [user] });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    const result = await createInternAccount({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { username: "intern1", name: "Intern One", password: "password123" },
    });

    expect(result.id).toBe("u1");
    expect(result.role).toBe("INTERN");
  });

  it("rejects non-admin users", async () => {
    const db = createMockDb();

    await expect(
      createInternAccount({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { username: "intern1", name: "Intern One", password: "password123" },
      })
    ).rejects.toThrow(/admin:dashboard/);
  });
});

describe("listInterns", () => {
  it("returns all intern accounts with progress summary", async () => {
    const internUsers = [
      { id: "u1", username: "intern1", name: "Intern One", role: "INTERN", schoolId: null, createdAt: new Date() },
    ];
    const db = createMockDb({ selectResults: internUsers });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    const result = await listInterns({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
    });

    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe("u1");
  });

  it("rejects non-admin users", async () => {
    const db = createMockDb();

    await expect(
      listInterns({ db: wrapDb(db), user: student, tenant: globalTenant })
    ).rejects.toThrow(/admin:dashboard/);
  });
});

describe("getInternProgress", () => {
  it("returns detailed progress for a specific intern", async () => {
    const intern = { id: "u1", username: "intern1", name: "Intern One", role: "INTERN", schoolId: null, createdAt: new Date() };
    const modules = [
      { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const progress = [
      { id: "p1", userId: "u1", moduleId: "m1", lessonId: "l1", status: "completed", score: 100, completedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ];

    const db = createMockDb();
    let selectCallCount = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([intern]);
          if (selectCallCount === 2) return queryResult(modules);
          return queryResult(progress);
        }),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([intern]);
          if (selectCallCount === 2) return queryResult(modules);
          return queryResult(progress);
        }),
        orderBy: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([intern]);
          if (selectCallCount === 2) return queryResult(modules);
          return queryResult(progress);
        }),
      }),
    });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    const result = await getInternProgress({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { userId: "u1" },
    });

    expect(result.userId).toBe("u1");
    expect(result.moduleBreakdown).toHaveLength(1);
    expect(result.moduleBreakdown[0].completed).toBe(1);
  });

  it("rejects non-admin users", async () => {
    const db = createMockDb();

    await expect(
      getInternProgress({ db: wrapDb(db), user: student, tenant: globalTenant, input: { userId: "u1" } })
    ).rejects.toThrow(/admin:dashboard/);
  });
});
