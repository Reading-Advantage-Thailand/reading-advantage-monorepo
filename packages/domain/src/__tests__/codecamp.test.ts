import { describe, it, expect, vi } from "vitest";
import {
  getModulesWithProgress,
  getModuleBySlug,
  getLessonsForModule,
  getLessonWithContent,
  submitExerciseAttempt,
  submitQuizAnswers,
  saveChatMessage,
  getChatHistory,
  getUserConversations,
  updateUserProgress,
  getUserDashboard,
  getExerciseRepos,
  getExerciseRepoByUrl,
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
  getChatContext,
} from "../codecamp/index.js";
import { chatMessageInputSchema } from "@reading-advantage/types";
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

// ─── getModuleBySlug ──────────────────────────────────────

describe("getModuleBySlug", () => {
  it("returns published module with lessons and progress", async () => {
    const moduleRow = { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() };
    const lessons = [
      { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
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

    const result = await getModuleBySlug({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { slug: "mod1" },
    });

    expect(result.id).toBe("m1");
    expect(result.lessons).toHaveLength(1);
    expect(result.lessonCount).toBe(1);
    expect(result.completedLessons).toBe(1);
    expect(result.progress).toBe(100);
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
      getModuleBySlug({ db: wrapDb(db), user: student, tenant: globalTenant, input: { slug: "mod1" } })
    ).rejects.toThrow(/Module not found/);
  });

  it("throws when module does not exist", async () => {
    const db = createMockDb({ selectResults: [] });

    await expect(
      getModuleBySlug({ db: wrapDb(db), user: student, tenant: globalTenant, input: { slug: "missing" } })
    ).rejects.toThrow(/Module not found/);
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

  it("returns null userScore when no progress exists", async () => {
    const lesson = { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: { sections: [] }, createdAt: new Date(), updatedAt: new Date() };
    const moduleRow = { id: "m1", title: "Module 1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() };

    const db = createMockDb();
    let selectCallCount = 0;
    db.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          selectCallCount++;
          const calls = [
            queryResult([lesson]),
            queryResult([moduleRow]),
            queryResult([]),
            queryResult([]),
            queryResult([]),
          ];
          return calls[selectCallCount - 1] ?? queryResult([]);
        }),
        orderBy: vi.fn().mockImplementation(() => {
          selectCallCount++;
          const calls = [
            queryResult([lesson]),
            queryResult([moduleRow]),
            queryResult([]),
            queryResult([]),
            queryResult([]),
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

    expect(result.userStatus).toBe("not_started");
    expect(result.userScore).toBeNull();
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

  it("saves assistant message to existing conversation", async () => {
    const existingConv = { id: "c1", userId: "st1", title: "Prev", moduleId: null, lessonId: null, createdAt: new Date(), updatedAt: new Date() };
    const message = { id: "m3", conversationId: "c1", role: "assistant", content: "Here is the answer.", createdAt: new Date() };

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
      input: { conversationId: "c1", message: "Here is the answer.", role: "assistant" },
    });

    expect(result.conversationId).toBe("c1");
    expect(result.message.role).toBe("assistant");
  });

  it("throws when assistant message has no conversationId", async () => {
    const db = createMockDb();

    await expect(
      saveChatMessage({ db: wrapDb(db), user: student, tenant: globalTenant, input: { message: "Hi", role: "assistant" } })
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

// ─── getUserConversations ─────────────────────────────────

describe("getUserConversations", () => {
  it("returns user's conversations ordered by updatedAt", async () => {
    const conversations = [
      { id: "c1", userId: "st1", title: "Chat 1", moduleId: null, lessonId: null, createdAt: new Date(), updatedAt: new Date("2026-01-02") },
      { id: "c2", userId: "st1", title: "Chat 2", moduleId: null, lessonId: null, createdAt: new Date(), updatedAt: new Date("2026-01-01") },
    ];

    const db = createMockDb({ selectResults: conversations });

    const result = await getUserConversations({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("c1");
    expect(result[1].id).toBe("c2");
  });

  it("rejects unauthenticated users", async () => {
    const db = createMockDb();
    const invalidUser = { id: "x", username: "x", name: "X", role: "GUEST" as unknown as typeof student.role, schoolId: "s1" };

    await expect(
      getUserConversations({ db: wrapDb(db), user: invalidUser, tenant: globalTenant })
    ).rejects.toThrow(/codecamp:read/);
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

  it("returns empty array when no repos exist for module", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await getExerciseRepos({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { moduleId: "m1" },
    });

    expect(result).toHaveLength(0);
  });

  it("returns all repos when moduleId is omitted", async () => {
    const repos = [
      { id: "r1", moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1, createdAt: new Date() },
      { id: "r2", moduleId: "m2", repoUrl: "https://github.com/org/repo2", description: "Repo 2", order: 1, createdAt: new Date() },
    ];
    const db = createMockDb({ selectResults: repos });

    const result = await getExerciseRepos({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: {},
    });

    expect(result).toHaveLength(2);
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
    const existingModule = { id: "m1" };
    const repo = { id: "r1", moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1, createdAt: new Date() };
    const db = createMockDb({
      insertReturning: [repo],
      selectSequence: [[existingModule]],
    });

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

  it("rejects when module does not exist", async () => {
    const db = createMockDb({ selectResults: [] });
    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };

    await expect(
      linkExerciseRepo({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        input: { moduleId: "nonexistent", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1 },
      })
    ).rejects.toThrow(/Module not found/);
  });
});

describe("getExerciseRepoByUrl", () => {
  it("returns the repo matching a URL", async () => {
    const repo = { id: "r1", moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1, createdAt: new Date() };
    const db = createMockDb({ selectResults: [repo] });

    const result = await getExerciseRepoByUrl({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { repoUrl: "https://github.com/org/repo1" },
    });

    expect(result).toEqual(repo);
  });

  it("returns null when no repo matches", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await getExerciseRepoByUrl({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { repoUrl: "https://github.com/org/unknown" },
    });

    expect(result).toBeNull();
  });

  it("rejects unauthenticated users", async () => {
    const db = createMockDb();
    const invalidUser = { id: "x", username: "x", name: "X", role: "GUEST" as unknown as typeof student.role, schoolId: "s1" };

    await expect(
      getExerciseRepoByUrl({ db: wrapDb(db), user: invalidUser, tenant: globalTenant, input: { repoUrl: "https://github.com/org/repo1" } })
    ).rejects.toThrow(/codecamp:read/);
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
    const repo = { id: "r1", moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Test repo", order: 1, createdAt: new Date() };
    const db = createMockDb({
      insertReturning: [review],
      // 1st select: exercise repo lookup → returns [repo]
      // 2nd select: duplicate PR review check → returns [] (no duplicate)
      selectSequence: [[repo], []],
    });

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
    ).rejects.toThrow(/codecamp:submit/);
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

  it("does not overwrite reviewedAt when status is pending", async () => {
    const existingReview = {
      id: "pr1",
      exerciseRepoId: "r1",
      userId: "st1",
      prUrl: "https://github.com/org/repo1/pull/1",
      reviewStatus: "pending",
      llmReviewSummary: null,
      reviewedAt: new Date("2026-01-01T00:00:00Z"),
      createdAt: new Date(),
    };
    const db = createMockDb({ updateReturning: [existingReview] });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    const result = await updatePrReview({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { reviewId: "pr1", reviewStatus: "pending" },
    });

    expect(result.reviewStatus).toBe("pending");
    const setCall = db.update.mock.results[0]?.value?.set?.mock?.calls?.[0]?.[0];
    if (setCall) {
      expect(setCall.reviewedAt).not.toBeInstanceOf(Date);
    }
  });

  it("sets reviewedAt when status is approved", async () => {
    const review = {
      id: "pr1",
      exerciseRepoId: "r1",
      userId: "st1",
      prUrl: "https://github.com/org/repo1/pull/1",
      reviewStatus: "approved",
      llmReviewSummary: "Great work!",
      reviewedAt: new Date(),
      createdAt: new Date(),
    };
    const db = createMockDb({ updateReturning: [review] });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    const result = await updatePrReview({
      db: wrapDb(db),
      user: admin,
      tenant: globalTenant,
      input: { reviewId: "pr1", reviewStatus: "approved", llmReviewSummary: "Great work!" },
    });

    expect(result.reviewStatus).toBe("approved");
    const setCall = db.update.mock.results[0]?.value?.set?.mock?.calls?.[0]?.[0];
    if (setCall) {
      expect(setCall.reviewedAt).toBeInstanceOf(Date);
    }
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

  it("allows SYSTEM user to look up any PR review by URL", async () => {
    const review = { id: "pr1", exerciseRepoId: "r1", userId: "st1", prUrl: "https://github.com/org/repo1/pull/1", reviewStatus: "pending", llmReviewSummary: null, reviewedAt: null, createdAt: new Date() };
    const db = createMockDb({ selectResults: [review] });
    const systemUser = { id: "system", username: "system", name: "System", role: "SYSTEM" as const, schoolId: null };

    const result = await getPrReviewByPrUrl({
      db: wrapDb(db),
      user: systemUser,
      tenant: globalTenant,
      input: { prUrl: "https://github.com/org/repo1/pull/1" },
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe("pr1");
  });
});

// ─── Expanded Curriculum Queries ──────────────────────────

describe("getModulesByPhase", () => {
  it("returns modules grouped by phase A with computed fields", async () => {
    const modules = [
      { id: "m1", title: "Module 1", description: "Desc", slug: "mod-1", order: 1, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() },
      { id: "m2", title: "Module 2", description: "Desc", slug: "mod-2", order: 2, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() },
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

    const result = await getModulesByPhase({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { phase: "A" },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty("lessonCount");
    expect(result[0]).toHaveProperty("progress");
  });

  it("returns modules for all valid phases", async () => {
    for (const phase of ["A", "B", "C", "D"] as const) {
      const modules = [
        { id: `m-${phase}`, title: `Module ${phase}`, description: "Desc", slug: `mod-${phase.toLowerCase()}`, order: 1, phase, status: "published", createdAt: new Date(), updatedAt: new Date() },
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

  it("skips unpublished modules when finding prerequisite", async () => {
    const modules = [
      { id: "m1", title: "M1", description: "Desc", slug: "mod1", order: 1, status: "published", createdAt: new Date(), updatedAt: new Date() },
      { id: "m2", title: "M2", description: "Desc", slug: "mod2", order: 2, status: "draft", createdAt: new Date(), updatedAt: new Date() },
      { id: "m3", title: "M3", description: "Desc", slug: "mod3", order: 3, status: "published", createdAt: new Date(), updatedAt: new Date() },
    ];
    const lessons = [
      { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
    ];
    const progress = [
      { id: "p1", userId: "st1", moduleId: "m1", lessonId: "l1", status: "completed", score: 100, completedAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
    ];

    // Sequenced mock: select target module (m3), select prev published module (m1), select lessons for m1, select progress
    const db = createSequencedMockDb([[modules[2]], [modules[0]], lessons, progress]);

    const result = await checkModulePrerequisite({
      db: db as unknown as ReturnType<typeof wrapDb>,
      user: student,
      tenant: globalTenant,
      input: { moduleId: "m3" },
    });

    expect(result.canStart).toBe(true);
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
      input: { username: "intern1", name: "Intern One", password: "Password1" },
    });

    expect(result.id).toBe("u1");
    expect(result.role).toBe("INTERN");
  });

  it("rejects duplicate username", async () => {
    const existingUser = { id: "u2", username: "intern1", name: "Existing", role: "INTERN", schoolId: null, createdAt: new Date() };
    const db = createMockDb({ selectResults: [existingUser] });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    await expect(
      createInternAccount({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        input: { username: "intern1", name: "Intern One", password: "Password1" },
      })
    ).rejects.toThrow(/Username already exists/);
  });

  it("rejects passwords lacking complexity requirements", async () => {
    const db = createMockDb();

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    await expect(
      createInternAccount({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        input: { username: "intern2", name: "Intern Two", password: "password123" },
      })
    ).rejects.toThrow(/Password must contain/);
  });

  it("rejects non-admin users", async () => {
    const db = createMockDb();

    await expect(
      createInternAccount({
        db: wrapDb(db),
        user: student,
        tenant: globalTenant,
        input: { username: "intern1", name: "Intern One", password: "Password1" },
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
    const lessons = [
      { id: "l1", moduleId: "m1", title: "Lesson 1", description: "Desc", order: 1, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
      { id: "l2", moduleId: "m1", title: "Lesson 2", description: "Desc", order: 2, type: "theory" as const, contentJson: {}, createdAt: new Date(), updatedAt: new Date() },
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
          if (selectCallCount === 3) return queryResult(lessons);
          if (selectCallCount === 4) return queryResult(progress);
          return queryResult([]);
        }),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([intern]);
          if (selectCallCount === 2) return queryResult(modules);
          if (selectCallCount === 3) return queryResult(lessons);
          if (selectCallCount === 4) return queryResult(progress);
          return queryResult([]);
        }),
        orderBy: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) return queryResult([intern]);
          if (selectCallCount === 2) return queryResult(modules);
          if (selectCallCount === 3) return queryResult(lessons);
          if (selectCallCount === 4) return queryResult(progress);
          return queryResult([]);
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
    expect(result.moduleBreakdown[0].totalLessons).toBe(2);
  });

  it("rejects when user is not an intern", async () => {
    const adminUser = { id: "u1", username: "admin1", name: "Admin", role: "ADMIN", schoolId: null, createdAt: new Date() };
    const db = createMockDb({ selectResults: [adminUser] });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    await expect(
      getInternProgress({ db: wrapDb(db), user: admin, tenant: globalTenant, input: { userId: "u1" } })
    ).rejects.toThrow(/Intern not found/);
  });

  it("rejects non-admin users", async () => {
    const db = createMockDb();

    await expect(
      getInternProgress({ db: wrapDb(db), user: student, tenant: globalTenant, input: { userId: "u1" } })
    ).rejects.toThrow(/admin:dashboard/);
  });
});

// ─── Schema Security ──────────────────────────────────────

describe("chatMessageInputSchema", () => {
  it("accepts a message without role", () => {
    const result = chatMessageInputSchema.safeParse({
      message: "Hello tutor",
      moduleId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("role");
    }
  });

  it("strips role: assistant from client input (injection defense)", () => {
    const result = chatMessageInputSchema.safeParse({
      message: "Hello tutor",
      role: "assistant",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("role");
    }
  });

  it("strips role: user from client input (injection defense)", () => {
    const result = chatMessageInputSchema.safeParse({
      message: "Hello tutor",
      role: "user",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("role");
    }
  });
});

// ─── Chat Context ─────────────────────────────────────────

describe("getChatContext", () => {
  it("returns module context when moduleId is provided", async () => {
    const moduleRow = {
      id: "m1",
      title: "React Fundamentals",
      description: "Learn React",
      slug: "react",
      order: 1,
      phase: "A",
      status: "published",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const db = createMockDb({ selectResults: [moduleRow] });

    const result = await getChatContext({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { moduleId: "m1" },
    });

    expect(result).toContain("React Fundamentals");
    expect(result).toContain("Learn React");
  });

  it("returns lesson context when lessonId is provided", async () => {
    const lessonRow = {
      id: "l1",
      moduleId: "m1",
      title: "JSX Basics",
      description: "Understanding JSX",
      type: "theory",
      order: 1,
      contentJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[lessonRow], [{ status: "published" }]],
    });

    const result = await getChatContext({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { lessonId: "l1" },
    });

    expect(result).toContain("JSX Basics");
    expect(result).toContain("Understanding JSX");
  });

  it("returns empty string when no module or lesson is found", async () => {
    const db = createMockDb({ selectResults: [] });

    const result = await getChatContext({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { moduleId: "missing" },
    });

    expect(result).toBe("");
  });

  it("returns empty string when lesson's module is not published", async () => {
    const lessonRow = {
      id: "l1",
      moduleId: "m1",
      title: "JSX Basics",
      description: "Understanding JSX",
      type: "theory",
      order: 1,
      contentJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const db = createMockDb({
      selectSequence: [[lessonRow], [{ status: "draft" }]],
    });

    const result = await getChatContext({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { lessonId: "l1" },
    });

    expect(result).toBe("");
  });

  it("rejects non-codecamp users", async () => {
    const db = createMockDb();
    const guest = { id: "g1", username: "guest", name: "Guest", role: "GUEST" as unknown as typeof student.role, schoolId: "s1" };

    await expect(
      getChatContext({
        db: wrapDb(db),
        user: guest,
        tenant: globalTenant,
        input: {},
      })
    ).rejects.toThrow(/codecamp:chat/);
  });
});

// ─── Data Integrity ───────────────────────────────────────

describe("getExerciseRepos optional moduleId", () => {
  it("returns all repos when moduleId is omitted", async () => {
    const repos = [
      { id: "r1", moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Repo 1", order: 1, createdAt: new Date() },
      { id: "r2", moduleId: "m2", repoUrl: "https://github.com/org/repo2", description: "Repo 2", order: 1, createdAt: new Date() },
    ];
    const db = createMockDb({ selectResults: repos });

    const result = await getExerciseRepos({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: {},
    });

    expect(result).toHaveLength(2);
  });
});

describe("createPrReview duplicate prevention", () => {
  it("throws when a review for the same PR URL already exists", async () => {
    const repo = { id: "r1", moduleId: "m1", repoUrl: "https://github.com/org/repo1", description: "Test repo", order: 1, createdAt: new Date() };
    const existing = { id: "pr1", exerciseRepoId: "r1", userId: "st1", prUrl: "https://github.com/org/repo1/pull/1", reviewStatus: "pending", llmReviewSummary: null, reviewedAt: null, createdAt: new Date() };
    const db = createMockDb({
      insertReturning: [existing],
      selectSequence: [[repo], [existing]],
    });

    const admin = { id: "a1", username: "admin1", name: "Admin", role: "ADMIN" as const, schoolId: "s1" };
    await expect(
      createPrReview({
        db: wrapDb(db),
        user: admin,
        tenant: globalTenant,
        input: { exerciseRepoId: "r1", prUrl: "https://github.com/org/repo1/pull/1" },
      })
    ).rejects.toThrow(/already exists/);
  });
});

describe("getLessonWithContent JSONB runtime validation", () => {
  it("returns empty content when contentJson is not an object", async () => {
    const lesson = {
      id: "l1",
      moduleId: "m1",
      title: "Lesson",
      description: "Desc",
      type: "theory",
      order: 1,
      contentJson: "invalid-string",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const moduleRow = { id: "m1", title: "Module", description: "Desc", slug: "mod", order: 1, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() };
    const db = createMockDb({ selectSequence: [[lesson], [moduleRow], [], [], []] });

    const result = await getLessonWithContent({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { lessonId: "l1" },
    });

    expect(result.content).toEqual({});
  });

  it("returns empty hints when hintsJson is not an array", async () => {
    const lesson = {
      id: "l1",
      moduleId: "m1",
      title: "Lesson",
      description: "Desc",
      type: "exercise",
      order: 1,
      contentJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const exercise = {
      id: "e1",
      lessonId: "l1",
      type: "coding",
      instructions: "Do this",
      hintsJson: 12345,
      starterCode: "",
      solutionCode: "",
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const moduleRow = { id: "m1", title: "Module", description: "Desc", slug: "mod", order: 1, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() };
    const db = createMockDb({ selectSequence: [[lesson], [moduleRow], [exercise], [], []] });

    const result = await getLessonWithContent({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { lessonId: "l1" },
    });

    expect(result.exercises[0].hints).toEqual([]);
  });

  it("returns empty options when optionsJson is not an array", async () => {
    const lesson = {
      id: "l1",
      moduleId: "m1",
      title: "Lesson",
      description: "Desc",
      type: "quiz",
      order: 1,
      contentJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const question = {
      id: "q1",
      lessonId: "l1",
      question: "What is 2+2?",
      optionsJson: null,
      correctAnswer: "4",
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const moduleRow = { id: "m1", title: "Module", description: "Desc", slug: "mod", order: 1, phase: "A", status: "published", createdAt: new Date(), updatedAt: new Date() };
    const db = createMockDb({ selectSequence: [[lesson], [moduleRow], [], [question], []] });

    const result = await getLessonWithContent({
      db: wrapDb(db),
      user: student,
      tenant: globalTenant,
      input: { lessonId: "l1" },
    });

    expect(result.quizQuestions[0].options).toEqual([]);
  });
});
