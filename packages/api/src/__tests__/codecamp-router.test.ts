import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { codecampRouter } from "../routers/codecamp.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";
import { AuthError } from "@reading-advantage/auth";

vi.mock("@reading-advantage/domain/codecamp", () => ({
  getModulesWithProgress: vi.fn(),
  getLessonWithContent: vi.fn(),
  submitExerciseAttempt: vi.fn(),
  submitQuizAnswers: vi.fn(),
  saveChatMessage: vi.fn(),
  getChatHistory: vi.fn(),
  getUserConversations: vi.fn(),
  updateUserProgress: vi.fn(),
  getUserDashboard: vi.fn(),
}));

import {
  getModulesWithProgress,
  getLessonWithContent,
  submitExerciseAttempt,
  submitQuizAnswers,
  saveChatMessage,
  getChatHistory,
  getUserConversations,
  updateUserProgress,
  getUserDashboard,
} from "@reading-advantage/domain/codecamp";

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } | null;
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ codecamp: codecampRouter });

function createCaller(
  auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } | null
) {
  const tenantDb = createTenantDB({} as unknown as DB, auth?.tenant ?? { schoolId: null });
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testDate = new Date("2024-01-01T00:00:00Z");
const testUser = { id: "u1", role: "STUDENT", schoolId: null };
const testTenant = { schoolId: null as string | null };

describe("codecamp router", () => {
  describe("modules", () => {
    it("returns modules with safe fields", async () => {
      const moduleRows = [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          title: "Module 1",
          description: "Desc",
          slug: "module-1",
          order: 1,
          status: "published",
          lessonCount: 5,
          completedLessons: 2,
          progress: 40,
          createdAt: testDate,
          updatedAt: testDate,
          extraField: "should-be-stripped",
        },
      ];
      vi.mocked(getModulesWithProgress).mockResolvedValue(moduleRows as unknown as Awaited<ReturnType<typeof getModulesWithProgress>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.modules();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result[0]).not.toHaveProperty("extraField");
    });
  });

  describe("lesson", () => {
    it("returns lesson with safe fields", async () => {
      const lessonRow = {
        id: "550e8400-e29b-41d4-a716-446655440002",
        moduleId: "550e8400-e29b-41d4-a716-446655440001",
        title: "Lesson 1",
        description: "Desc",
        order: 1,
        type: "theory",
        content: {},
        exercises: [],
        quizQuestions: [],
        userStatus: "not_started",
        userScore: null,
        createdAt: testDate,
        updatedAt: testDate,
        extraField: "should-be-stripped",
      };
      vi.mocked(getLessonWithContent).mockResolvedValue(lessonRow as unknown as Awaited<ReturnType<typeof getLessonWithContent>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.lesson({ lessonId: "550e8400-e29b-41d4-a716-446655440002" });

      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440002");
      expect(result).not.toHaveProperty("extraField");
    });

    it("maps 'Lesson not found' to NOT_FOUND", async () => {
      vi.mocked(getLessonWithContent).mockRejectedValue(new Error("Lesson not found"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(caller.codecamp.lesson({ lessonId: "550e8400-e29b-41d4-a716-446655440002" }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("submitExercise", () => {
    it("returns exercise result", async () => {
      const resultRow = {
        exerciseId: "550e8400-e29b-41d4-a716-446655440003",
        passed: false,
        feedback: "Try again",
        hints: ["Hint 1"],
      };
      vi.mocked(submitExerciseAttempt).mockResolvedValue(resultRow as unknown as Awaited<ReturnType<typeof submitExerciseAttempt>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.submitExercise({
        exerciseId: "550e8400-e29b-41d4-a716-446655440003",
        code: "print('hello')",
      });

      expect(result.passed).toBe(false);
      expect(result.feedback).toBe("Try again");
    });

    it("maps 'Exercise not found' to NOT_FOUND", async () => {
      vi.mocked(submitExerciseAttempt).mockRejectedValue(new Error("Exercise not found"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(caller.codecamp.submitExercise({ exerciseId: "550e8400-e29b-41d4-a716-446655440003", code: "" }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("submitQuiz", () => {
    it("returns quiz result", async () => {
      const resultRow = {
        lessonId: "550e8400-e29b-41d4-a716-446655440002",
        score: 80,
        total: 100,
        correctCount: 4,
        details: [
          {
            questionId: "550e8400-e29b-41d4-a716-446655440004",
            question: "Q1",
            userAnswer: "A",
            correctAnswer: "A",
            isCorrect: true,
            explanation: "Correct!",
          },
        ],
      };
      vi.mocked(submitQuizAnswers).mockResolvedValue(resultRow as unknown as Awaited<ReturnType<typeof submitQuizAnswers>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.submitQuiz({
        lessonId: "550e8400-e29b-41d4-a716-446655440002",
        answers: [{ questionId: "550e8400-e29b-41d4-a716-446655440004", answer: "A" }],
      });

      expect(result.score).toBe(80);
      expect(result.correctCount).toBe(4);
    });

    it("maps 'No quiz questions found' to BAD_REQUEST", async () => {
      vi.mocked(submitQuizAnswers).mockRejectedValue(new Error("No quiz questions found for this lesson"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(caller.codecamp.submitQuiz({ lessonId: "550e8400-e29b-41d4-a716-446655440002", answers: [] }))
        .rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  describe("saveChatMessage", () => {
    it("returns conversation and message", async () => {
      const resultRow = {
        conversationId: "550e8400-e29b-41d4-a716-446655440005",
        message: {
          id: "550e8400-e29b-41d4-a716-446655440006",
          role: "user",
          content: "Hello",
          createdAt: testDate,
        },
      };
      vi.mocked(saveChatMessage).mockResolvedValue(resultRow as unknown as Awaited<ReturnType<typeof saveChatMessage>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.saveChatMessage({ message: "Hello" });

      expect(result.conversationId).toBe("550e8400-e29b-41d4-a716-446655440005");
      expect(result.message.content).toBe("Hello");
    });

    it("maps 'Conversation not found' to NOT_FOUND", async () => {
      vi.mocked(saveChatMessage).mockRejectedValue(new Error("Conversation not found"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(caller.codecamp.saveChatMessage({ message: "Hi", conversationId: "550e8400-e29b-41d4-a716-446655440005" }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("chatHistory", () => {
    it("returns conversation with messages", async () => {
      const resultRow = {
        id: "550e8400-e29b-41d4-a716-446655440005",
        title: "Chat 1",
        moduleId: null,
        lessonId: null,
        messages: [
          { id: "550e8400-e29b-41d4-a716-446655440006", role: "user", content: "Hello", createdAt: testDate },
        ],
        createdAt: testDate,
        updatedAt: testDate,
      };
      vi.mocked(getChatHistory).mockResolvedValue(resultRow as unknown as Awaited<ReturnType<typeof getChatHistory>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.chatHistory({ conversationId: "550e8400-e29b-41d4-a716-446655440005" });

      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440005");
      expect(result.messages).toHaveLength(1);
    });
  });

  describe("conversations", () => {
    it("returns user's conversations", async () => {
      const convoRows = [
        {
          id: "550e8400-e29b-41d4-a716-446655440005",
          userId: "u1",
          title: "Chat 1",
          moduleId: null,
          lessonId: null,
          createdAt: testDate,
          updatedAt: testDate,
          extraField: "should-be-stripped",
        },
      ];
      vi.mocked(getUserConversations).mockResolvedValue(convoRows as unknown as Awaited<ReturnType<typeof getUserConversations>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.conversations();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("550e8400-e29b-41d4-a716-446655440005");
      expect(result[0]).not.toHaveProperty("extraField");
    });
  });

  describe("updateProgress", () => {
    it("returns updated progress", async () => {
      const resultRow = {
        lessonId: "550e8400-e29b-41d4-a716-446655440002",
        moduleId: "550e8400-e29b-41d4-a716-446655440001",
        status: "completed",
        score: 100,
        completedAt: testDate,
        updatedAt: testDate,
      };
      vi.mocked(updateUserProgress).mockResolvedValue(resultRow as unknown as Awaited<ReturnType<typeof updateUserProgress>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.updateProgress({
        lessonId: "550e8400-e29b-41d4-a716-446655440002",
        status: "completed",
        score: 100,
      });

      expect(result.lessonId).toBe("550e8400-e29b-41d4-a716-446655440002");
      expect(result.status).toBe("completed");
    });
  });

  describe("dashboard", () => {
    it("returns dashboard data", async () => {
      const resultRow = {
        modules: [],
        totalLessons: 10,
        completedLessons: 3,
        overallProgress: 30,
        recentConversations: [],
      };
      vi.mocked(getUserDashboard).mockResolvedValue(resultRow as unknown as Awaited<ReturnType<typeof getUserDashboard>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.dashboard();

      expect(result.totalLessons).toBe(10);
      expect(result.overallProgress).toBe(30);
    });
  });

  describe("error mapping", () => {
    it("maps AuthError to FORBIDDEN", async () => {
      vi.mocked(getModulesWithProgress).mockRejectedValue(new AuthError("Forbidden", "FORBIDDEN"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(caller.codecamp.modules()).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("maps unknown errors to INTERNAL_SERVER_ERROR", async () => {
      vi.mocked(getModulesWithProgress).mockRejectedValue(new Error("Something broke"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(caller.codecamp.modules()).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    });
  });
});
