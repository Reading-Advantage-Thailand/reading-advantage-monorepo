import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../trpc.js";
import { getAIClient } from "@reading-advantage/ai";
import { getCachedDashboard } from "../cache/dashboard-cache.js";
import { AuthError } from "@reading-advantage/auth";
import * as codecamp from "@reading-advantage/domain/codecamp";
import { reviewExercise, reviewResultSchema, aiClientToGenerateReview } from "@reading-advantage/domain/codecamp";
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
  webhookEventSchema,
  reviewJobSchema,
  listDeadReviewJobsInputSchema,
  requeueReviewJobInputSchema,
  moduleWithReposSchema,
  internAccountInputSchema,
  internAccountResponseSchema,
  internProgressSchema,
  internDetailSchema,
} from "@reading-advantage/types";

/**
 * Maps domain errors to appropriate tRPC TRPCError instances.
 * Logs the original error with its stack trace for server-side
 * observability before re-throwing as a sanitized tRPC error.
 *
 * @param err - The error to map
 * @returns Never returns; always throws a TRPCError
 */
function mapDomainError(err: unknown): never {
  if (err instanceof AuthError) {
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  }
  if (err instanceof Error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "domain_error",
        message: err.message,
        stack: err.stack,
      }),
    );
    if (err.message === "Lesson not found" || err.message === "Module not found" || err.message === "Exercise not found" || err.message === "Conversation not found" || err.message === "Intern not found" || err.message === "Exercise repo not found" || err.message === "Review not found") {
      throw new TRPCError({ code: "NOT_FOUND", message: err.message });
    }
    if (err.message === "No quiz questions found for this lesson" || err.message === "Invalid phase" || err.message === "Username already exists" || err.message === "GitHub username already exists" || err.message === "A review for this PR URL already exists" || err.message === "A repo with this URL already exists" || err.message === "Lesson is not a theory lesson" || err.message.startsWith("Password must contain") || err.message === "Invalid PR URL" || err.message === "PR URL must be a GitHub URL" || err.message.startsWith("Invalid PR URL: must be a GitHub pull request URL") || err.message.startsWith("PR URL must be for the")) {
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

  markTheoryLessonComplete: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.markTheoryComplete({
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
        // Short-TTL, tenant+user-scoped memo of the per-request dashboard
        // load: warms repeat hits on a `min-instances=1` instance while
        // bounding staleness (a completed lesson surfaces within the TTL)
        // and memory. The cache key carries `schoolId` + `user.id`, so it
        // can never serve one subject's dashboard to another.
        return await getCachedDashboard(
          { tenant: { schoolId: ctx.auth.tenant.schoolId }, user: { id: ctx.auth.user.id } },
          () =>
            codecamp.getUserDashboard({
              db: ctx.tenantDb,
              user: ctx.auth.user,
              tenant: ctx.auth.tenant,
            }),
        );
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  // ─── GitHub Practice Issues (Module 18) ──────────────────

  practiceIssues: protectedProcedure
    .output(
      z.array(
        z.object({
          number: z.number(),
          title: z.string(),
          body: z.string().nullable(),
          htmlUrl: z.string(),
          labels: z.array(z.string()),
          state: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
        })
      )
    )
    .query(async () => {
      return codecamp.getPracticeIssues(
        "Reading-Advantage-Thailand",
        "codecamp-progress-tracker"
      );
    }),

  // ─── Exercise Repos ───────────────────────────────────────

  exerciseRepos: protectedProcedure
    .input(z.object({ moduleId: z.string().uuid().optional() }))
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

  reviewExercise: adminProcedure
    .input(z.object({
      prDiff: z.string().min(1).max(50000),
      moduleId: z.string().uuid().optional(),
      repoUrl: z.string().url().optional(),
    }))
    .output(reviewResultSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const generateReview = aiClientToGenerateReview(getAIClient(), reviewResultSchema);

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

  createIntern: adminProcedure
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

  updateInternGithubUsername: adminProcedure
    .input(z.object({
      userId: z.string(),
      githubUsername: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.updateInternGithubUsername({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  listInterns: adminProcedure
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

  getInternProgress: adminProcedure
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

  webhookEvents: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .output(z.array(webhookEventSchema))
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.listWebhookEvents({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input: { limit: input?.limit },
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  // ─── Review Jobs (DLQ + requeue) ─────────────────────────────
  // Track: webhook_review_reliability_20260605. Admins use these to
  // inspect dead-lettered review jobs and manually replay them.

  listDeadReviewJobs: adminProcedure
    .input(listDeadReviewJobsInputSchema)
    .output(z.array(reviewJobSchema))
    .query(async ({ ctx, input }) => {
      try {
        return await codecamp.listDeadReviewJobs({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        throw mapDomainError(err);
      }
    }),

  requeueReviewJob: adminProcedure
    .input(requeueReviewJobInputSchema)
    .output(reviewJobSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await codecamp.requeueReviewJob({
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
