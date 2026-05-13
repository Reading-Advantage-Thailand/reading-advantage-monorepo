import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { AuthError } from "@reading-advantage/auth";
import * as codecamp from "@reading-advantage/domain/codecamp";
import {
  moduleResponseSchema,
  lessonResponseSchema,
  exerciseResultSchema,
  quizSubmissionSchema,
  quizResultSchema,
  chatMessageInputSchema,
  chatConversationSchema,
  progressUpdateSchema,
  progressResponseSchema,
  dashboardResponseSchema,
} from "@reading-advantage/types";

function mapDomainError(err: unknown): never {
  if (err instanceof AuthError) {
    throw new TRPCError({ code: "FORBIDDEN", message: err.message });
  }
  if (err instanceof Error) {
    if (err.message === "Lesson not found" || err.message === "Exercise not found" || err.message === "Conversation not found") {
      throw new TRPCError({ code: "NOT_FOUND", message: err.message });
    }
    if (err.message === "No quiz questions found for this lesson") {
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
        mapDomainError(err);
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
        mapDomainError(err);
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
        mapDomainError(err);
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
        mapDomainError(err);
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
        mapDomainError(err);
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
        mapDomainError(err);
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
        mapDomainError(err);
      }
    }),

  updateProgress: protectedProcedure
    .input(progressUpdateSchema)
    .output(progressResponseSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const [result] = await codecamp.updateUserProgress({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
        return result;
      } catch (err) {
        mapDomainError(err);
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
        mapDomainError(err);
      }
    }),
});
