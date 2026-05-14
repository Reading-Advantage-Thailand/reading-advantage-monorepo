import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { codecampRouter } from "../routers/codecamp.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";
import { AuthError } from "@reading-advantage/auth";

vi.mock("@reading-advantage/domain/codecamp", () => ({
  getModulesWithProgress: vi.fn(),
  getLessonsForModule: vi.fn(),
  getLessonWithContent: vi.fn(),
  submitExerciseAttempt: vi.fn(),
  submitQuizAnswers: vi.fn(),
  saveChatMessage: vi.fn(),
  getChatHistory: vi.fn(),
  getUserConversations: vi.fn(),
  updateUserProgress: vi.fn(),
  getUserDashboard: vi.fn(),
  getExerciseRepos: vi.fn(),
  linkExerciseRepo: vi.fn(),
  getPrReviewsForUser: vi.fn(),
  createPrReview: vi.fn(),
  updatePrReview: vi.fn(),
  getPrReviewByPrUrl: vi.fn(),
  getModulesByPhase: vi.fn(),
  getModuleWithExercises: vi.fn(),
  checkModulePrerequisite: vi.fn(),
}));

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
  getExerciseRepos,
  linkExerciseRepo,
  getPrReviewsForUser,
  createPrReview,
  updatePrReview,
  getPrReviewByPrUrl,
  getModulesByPhase,
  getModuleWithExercises,
  checkModulePrerequisite,
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
          phase: "A",
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

  describe("lessons", () => {
    it("returns lessons for a module", async () => {
      const lessonRows = [
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          moduleId: "550e8400-e29b-41d4-a716-446655440001",
          title: "Lesson 1",
          description: "Desc",
          order: 1,
          type: "theory",
          userStatus: "not_started",
          userScore: null,
          createdAt: testDate,
          updatedAt: testDate,
          extraField: "should-be-stripped",
        },
      ];
      vi.mocked(getLessonsForModule).mockResolvedValue(lessonRows as unknown as Awaited<ReturnType<typeof getLessonsForModule>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.lessons({ moduleId: "550e8400-e29b-41d4-a716-446655440001" });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("550e8400-e29b-41d4-a716-446655440002");
      expect(result[0]).not.toHaveProperty("extraField");
    });

    it("maps 'Module not found' to NOT_FOUND", async () => {
      vi.mocked(getLessonsForModule).mockRejectedValue(new Error("Module not found"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(caller.codecamp.lessons({ moduleId: "550e8400-e29b-41d4-a716-446655440001" }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("lesson", () => {
    it("returns lesson with safe fields", async () => {
      const lessonRow = {
        id: "550e8400-e29b-41d4-a716-446655440002",
        moduleId: "550e8400-e29b-41d4-a716-446655440001",
        moduleSlug: "test-module",
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
    it("returns dashboard data with phase grouping", async () => {
      const resultRow = {
        phases: {
          A: { title: "Foundations", description: "Desc", portfolioProject: "Portfolio", modules: [], completedLessons: 0, totalLessons: 0 },
          B: { title: "Frameworks", description: "Desc", portfolioProject: "Dashboard", modules: [], completedLessons: 0, totalLessons: 0 },
          C: { title: "Backend & Data", description: "Desc", portfolioProject: "Tracker", modules: [], completedLessons: 0, totalLessons: 0 },
          D: { title: "Production", description: "Desc", portfolioProject: "Production Tracker", modules: [], completedLessons: 0, totalLessons: 0 },
        },
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
      expect(result.phases.A.title).toBe("Foundations");
      expect(result.phases.D.portfolioProject).toBe("Production Tracker");
    });
  });

  describe("exerciseRepos", () => {
    it("returns exercise repos for a module", async () => {
      const repoRows = [
        {
          id: "550e8400-e29b-41d4-a716-446655440010",
          moduleId: "550e8400-e29b-41d4-a716-446655440001",
          repoUrl: "https://github.com/org/repo1",
          description: "Exercise repo 1",
          order: 1,
          createdAt: testDate,
        },
      ];
      vi.mocked(getExerciseRepos).mockResolvedValue(repoRows as unknown as Awaited<ReturnType<typeof getExerciseRepos>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.exerciseRepos({ moduleId: "550e8400-e29b-41d4-a716-446655440001" });

      expect(result).toHaveLength(1);
      expect(result[0].repoUrl).toBe("https://github.com/org/repo1");
    });
  });

  describe("linkExerciseRepo", () => {
    it("links a repo to a module", async () => {
      const repoRow = {
        id: "550e8400-e29b-41d4-a716-446655440010",
        moduleId: "550e8400-e29b-41d4-a716-446655440001",
        repoUrl: "https://github.com/org/repo1",
        description: "Exercise repo 1",
        order: 1,
        createdAt: testDate,
      };
      vi.mocked(linkExerciseRepo).mockResolvedValue(repoRow as unknown as Awaited<ReturnType<typeof linkExerciseRepo>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.linkExerciseRepo({
        moduleId: "550e8400-e29b-41d4-a716-446655440001",
        repoUrl: "https://github.com/org/repo1",
        description: "Exercise repo 1",
        order: 1,
      });

      expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440010");
    });

    it("maps AuthError to FORBIDDEN for non-admin", async () => {
      vi.mocked(linkExerciseRepo).mockRejectedValue(new AuthError("Forbidden", "FORBIDDEN"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(
        caller.codecamp.linkExerciseRepo({
          moduleId: "550e8400-e29b-41d4-a716-446655440001",
          repoUrl: "https://github.com/org/repo1",
          description: "Exercise repo 1",
          order: 1,
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("prReviews", () => {
    it("returns PR reviews for the current user", async () => {
      const reviewRows = [
        {
          id: "550e8400-e29b-41d4-a716-446655440011",
          exerciseRepoId: "550e8400-e29b-41d4-a716-446655440010",
          userId: "u1",
          prUrl: "https://github.com/org/repo1/pull/1",
          reviewStatus: "pending",
          llmReviewSummary: null,
          reviewedAt: null,
          createdAt: testDate,
        },
      ];
      vi.mocked(getPrReviewsForUser).mockResolvedValue(reviewRows as unknown as Awaited<ReturnType<typeof getPrReviewsForUser>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.prReviews();

      expect(result).toHaveLength(1);
      expect(result[0].reviewStatus).toBe("pending");
    });
  });

  describe("createPrReview", () => {
    it("creates a pending PR review", async () => {
      const reviewRow = {
        id: "550e8400-e29b-41d4-a716-446655440011",
        exerciseRepoId: "550e8400-e29b-41d4-a716-446655440010",
        userId: "u1",
        prUrl: "https://github.com/org/repo1/pull/1",
        reviewStatus: "pending",
        llmReviewSummary: null,
        reviewedAt: null,
        createdAt: testDate,
      };
      vi.mocked(createPrReview).mockResolvedValue(reviewRow as unknown as Awaited<ReturnType<typeof createPrReview>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.createPrReview({
        exerciseRepoId: "550e8400-e29b-41d4-a716-446655440010",
        prUrl: "https://github.com/org/repo1/pull/1",
      });

      expect(result.reviewStatus).toBe("pending");
    });
  });

  describe("updatePrReview", () => {
    it("updates review status and summary", async () => {
      const reviewRow = {
        id: "550e8400-e29b-41d4-a716-446655440011",
        exerciseRepoId: "550e8400-e29b-41d4-a716-446655440010",
        userId: "u1",
        prUrl: "https://github.com/org/repo1/pull/1",
        reviewStatus: "approved",
        llmReviewSummary: "Great work!",
        reviewedAt: testDate,
        createdAt: testDate,
      };
      vi.mocked(updatePrReview).mockResolvedValue(reviewRow as unknown as Awaited<ReturnType<typeof updatePrReview>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.updatePrReview({
        reviewId: "550e8400-e29b-41d4-a716-446655440011",
        reviewStatus: "approved",
        llmReviewSummary: "Great work!",
      });

      expect(result.reviewStatus).toBe("approved");
      expect(result.llmReviewSummary).toBe("Great work!");
    });

    it("maps AuthError to FORBIDDEN for non-admin", async () => {
      vi.mocked(updatePrReview).mockRejectedValue(new AuthError("Forbidden", "FORBIDDEN"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(
        caller.codecamp.updatePrReview({
          reviewId: "550e8400-e29b-41d4-a716-446655440011",
          reviewStatus: "approved",
        })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("prReviewByPrUrl", () => {
    it("returns review by PR URL", async () => {
      const reviewRow = {
        id: "550e8400-e29b-41d4-a716-446655440011",
        exerciseRepoId: "550e8400-e29b-41d4-a716-446655440010",
        userId: "u1",
        prUrl: "https://github.com/org/repo1/pull/1",
        reviewStatus: "pending",
        llmReviewSummary: null,
        reviewedAt: null,
        createdAt: testDate,
      };
      vi.mocked(getPrReviewByPrUrl).mockResolvedValue(reviewRow as unknown as Awaited<ReturnType<typeof getPrReviewByPrUrl>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.prReviewByPrUrl({ prUrl: "https://github.com/org/repo1/pull/1" });

      expect(result).not.toBeNull();
      expect(result?.prUrl).toBe("https://github.com/org/repo1/pull/1");
    });

    it("returns null when no review found", async () => {
      vi.mocked(getPrReviewByPrUrl).mockResolvedValue(null);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.prReviewByPrUrl({ prUrl: "https://github.com/org/repo1/pull/99" });

      expect(result).toBeNull();
    });
  });

  describe("modulesByPhase", () => {
    it("returns modules for a given phase", async () => {
      const moduleRows = [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          title: "Module 1",
          description: "Desc",
          slug: "module-1",
          order: 1,
          phase: "A",
          status: "published",
          lessonCount: 5,
          completedLessons: 2,
          progress: 40,
          createdAt: testDate,
          updatedAt: testDate,
        },
      ];
      vi.mocked(getModulesByPhase).mockResolvedValue(moduleRows as unknown as Awaited<ReturnType<typeof getModulesByPhase>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.modulesByPhase({ phase: "A" });

      expect(result).toHaveLength(1);
      expect(result[0].phase).toBe("A");
    });
  });

  describe("moduleWithExercises", () => {
    it("returns module with exercise repos", async () => {
      const moduleRow = {
        id: "550e8400-e29b-41d4-a716-446655440001",
        title: "Module 1",
        description: "Desc",
        slug: "module-1",
        order: 1,
        phase: "A",
        status: "published",
        lessons: [],
        lessonCount: 0,
        completedLessons: 0,
        progress: 0,
        exerciseRepos: [
          {
            id: "550e8400-e29b-41d4-a716-446655440010",
            moduleId: "550e8400-e29b-41d4-a716-446655440001",
            repoUrl: "https://github.com/org/repo1",
            description: "Repo 1",
            order: 1,
            createdAt: testDate,
          },
        ],
        createdAt: testDate,
        updatedAt: testDate,
      };
      vi.mocked(getModuleWithExercises).mockResolvedValue(moduleRow as unknown as Awaited<ReturnType<typeof getModuleWithExercises>>);
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.moduleWithExercises({ moduleId: "550e8400-e29b-41d4-a716-446655440001" });

      expect(result.exerciseRepos).toHaveLength(1);
      expect(result.exerciseRepos[0].repoUrl).toBe("https://github.com/org/repo1");
    });

    it("maps 'Module not found' to NOT_FOUND", async () => {
      vi.mocked(getModuleWithExercises).mockRejectedValue(new Error("Module not found"));
      const caller = createCaller({ user: testUser, tenant: testTenant });

      await expect(caller.codecamp.moduleWithExercises({ moduleId: "550e8400-e29b-41d4-a716-446655440001" }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("checkPrerequisite", () => {
    it("returns canStart status", async () => {
      vi.mocked(checkModulePrerequisite).mockResolvedValue({ canStart: true });
      const caller = createCaller({ user: testUser, tenant: testTenant });

      const result = await caller.codecamp.checkPrerequisite({ moduleId: "550e8400-e29b-41d4-a716-446655440002" });

      expect(result.canStart).toBe(true);
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
