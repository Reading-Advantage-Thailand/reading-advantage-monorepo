import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { router, protectedProcedure } from "../trpc.js";
import { AuthError } from "@reading-advantage/auth";
import * as codecamp from "@reading-advantage/domain/codecamp";
import { reviewExercise, reviewResultSchema } from "@reading-advantage/domain/codecamp";
import {
  moduleResponseSchema,
  moduleBySlugResponseSchema,
  lessonResponseSchema,
  lessonListItemSchema,
  exerciseResultSchema,
  quizSubmissionSchema,
  quizResultSchema,
  chatMessageInputSchema,
  chatConversationSchema,
  progressUpdateSchema,
  progressResponseSchema,
  dashboardResponseSchema,
  exerciseRepoSchema,
  exerciseRepoInputSchema,
  prReviewSchema,
  prReviewInputSchema,
  prReviewUpdateSchema,
  moduleWithReposSchema,
  internAccountInputSchema,
  internAccountResponseSchema,
  internProgressSchema,
  internDetailSchema,
} from "@reading-advantage/types";

function mapDomainError(err: unknown): never {
  if (err instanceof AuthError) {
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  }
  if (err instanceof Error) {
    if (err.message === "Lesson not found" || err.message === "Module not found" || err.message === "Exercise not found" || err.message === "Conversation not found" || err.message === "Intern not found") {
      throw new TRPCError({ code: "NOT_FOUND", message: err.message });
    }
    if (err.message === "No quiz questions found for this lesson" || err.message === "Invalid phase" || err.message === "Username already exists") {
      throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
    }
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
  }
  throw err;
}

export const codecampRouter = router({
  modules: protectedProcedure
    .output(z.array(moduleResponseSchema))
    .query(async ({ ctx }) => {
      try {
        return await codecamp.getModulesWithProgress({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  moduleBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .output(moduleBySlugResponseSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.getModuleBySlug({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  lessons: protectedProcedure
    .input(z.object({ moduleId: z.string().uuid() }))
    .output(z.array(lessonListItemSchema))
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.getLessonsForModule({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  lesson: protectedProcedure
    .input(z.object({ lessonId: z.string().uuid() }))
    .output(lessonResponseSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.getLessonWithContent({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  submitExercise: protectedProcedure
    .input(z.object({ exerciseId: z.string().uuid(), code: z.string() }))
    .output(exerciseResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.submitExerciseAttempt({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  submitQuiz: protectedProcedure
    .input(quizSubmissionSchema)
    .output(quizResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.submitQuizAnswers({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  saveChatMessage: protectedProcedure
    .input(chatMessageInputSchema)
    .output(
      z.object({
        conversationId: z.string().uuid(),
        message: z.object({
          id: z.string().uuid(),
          role: z.string(),
          content: z.string(),
          createdAt: z.date(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.saveChatMessage({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  chatHistory: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .output(chatConversationSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.getChatHistory({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  conversations: protectedProcedure
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          userId: z.string(),
          title: z.string().nullable(),
          moduleId: z.string().uuid().nullable(),
          lessonId: z.string().uuid().nullable(),
          createdAt: z.date(),
          updatedAt: z.date(),
        })
      )
    )
    .query(async ({ ctx }) => {
      try {
        return await codecamp.getUserConversations({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  updateProgress: protectedProcedure
    .input(progressUpdateSchema)
    .output(progressResponseSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.updateUserProgress({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  dashboard: protectedProcedure
    .output(dashboardResponseSchema)
    .query(async ({ ctx }) => {
      try {
        return await codecamp.getUserDashboard({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  // ─── Exercise Repos ───────────────────────────────────────

  exerciseRepos: protectedProcedure
    .input(z.object({ moduleId: z.string().uuid() }))
    .output(z.array(exerciseRepoSchema))
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.getExerciseRepos({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  linkExerciseRepo: protectedProcedure
    .input(exerciseRepoInputSchema)
    .output(exerciseRepoSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.linkExerciseRepo({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  // ─── PR Reviews ───────────────────────────────────────────

  prReviews: protectedProcedure
    .output(z.array(prReviewSchema))
    .query(async ({ ctx }) => {
      try {
        return await codecamp.getPrReviewsForUser({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  createPrReview: protectedProcedure
    .input(prReviewInputSchema)
    .output(prReviewSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.createPrReview({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  updatePrReview: protectedProcedure
    .input(z.object({ reviewId: z.string().uuid() }).merge(prReviewUpdateSchema))
    .output(prReviewSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.updatePrReview({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  prReviewByPrUrl: protectedProcedure
    .input(z.object({ prUrl: z.string().url() }))
    .output(prReviewSchema.nullable())
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.getPrReviewByPrUrl({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  // ─── Module Phase & Prerequisites ─────────────────────────

  modulesByPhase: protectedProcedure
    .input(z.object({ phase: z.enum(["A", "B", "C", "D"]) }))
    .output(z.array(moduleResponseSchema))
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.getModulesByPhase({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  moduleWithExercises: protectedProcedure
    .input(z.object({ moduleId: z.string().uuid() }))
    .output(moduleWithReposSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.getModuleWithExercises({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  checkPrerequisite: protectedProcedure
    .input(z.object({ moduleId: z.string().uuid() }))
    .output(z.object({ canStart: z.boolean() }))
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.checkModulePrerequisite({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  reviewExercise: protectedProcedure
    .input(z.object({
      prDiff: z.string().min(1).max(50000),
      moduleId: z.string().uuid().optional(),
      repoUrl: z.string().url().optional(),
    }))
    .output(reviewResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const openrouter = createOpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: "https://openrouter.ai/api/v1",
        });

        async function generateReview(system: string, prompt: string) {
          if (!process.env.OPENROUTER_API_KEY) {
            return {
              passed: false,
              summary: "[Mock review — LLM not configured] No automated review available. Please ensure OPENROUTER_API_KEY is set for production reviews.",
              comments: [],
            };
          }

          const { object } = await generateObject({
            model: openrouter("openrouter/free"),
            system,
            prompt,
            schema: reviewResultSchema,
            maxTokens: 2048,
          });

          return object;
        }

        return await reviewExercise({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          prDiff: input.prDiff,
          moduleId: input.moduleId,
          repoUrl: input.repoUrl,
          generateReview,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  // ─── Admin ────────────────────────────────────────────────

  createIntern: protectedProcedure
    .input(internAccountInputSchema)
    .output(internAccountResponseSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.createInternAccount({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  listInterns: protectedProcedure
    .output(z.array(internProgressSchema))
    .query(async ({ ctx }) => {
      try {
        return await codecamp.listInterns({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  getInternProgress: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .output(internDetailSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.getInternProgress({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),
});
