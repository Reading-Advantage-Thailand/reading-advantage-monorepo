import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { userActivity, userWordRecords, userSentenceRecords, lessonProgress } from "@reading-advantage/db/schema";

export const progressRouter = router({
  recordActivity: protectedProcedure
    .input(
      z.object({
        activityType: z.string(),
        xpEarned: z.number().min(0).default(0),
        metadata: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [activity] = await ctx.db
        .insert(userActivity)
        .values({
          userId: ctx.auth.user.id,
          activityType: input.activityType,
          xpEarned: input.xpEarned,
          metadata: input.metadata,
        })
        .returning();

      return activity;
    }),

  getStudentProgress: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const activities = await ctx.db
        .select()
        .from(userActivity)
        .where(eq(userActivity.userId, input.studentId));

      const wordRecords = await ctx.db
        .select()
        .from(userWordRecords)
        .where(eq(userWordRecords.userId, input.studentId));

      const sentenceRecords = await ctx.db
        .select()
        .from(userSentenceRecords)
        .where(eq(userSentenceRecords.userId, input.studentId));

      return {
        activities,
        wordRecords,
        sentenceRecords,
      };
    }),

  getLessonProgress: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [progress] = await ctx.db
        .select()
        .from(lessonProgress)
        .where(eq(lessonProgress.lessonId, input.lessonId))
        .limit(1);

      return progress ?? null;
    }),

  updateLessonProgress: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        status: z.string(),
        progress: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .insert(lessonProgress)
        .values({
          userId: ctx.auth.user.id,
          lessonId: input.lessonId,
          status: input.status,
          progress: input.progress,
          completedAt: input.status === "completed" ? new Date() : null,
        })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonId],
          set: {
            status: input.status,
            progress: input.progress,
            completedAt: input.status === "completed" ? new Date() : null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return updated;
    }),
});
