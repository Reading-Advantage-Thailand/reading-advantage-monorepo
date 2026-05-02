import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import {
  recordActivity,
  getStudentProgress,
  getLessonProgress,
  updateLessonProgress,
} from "@reading-advantage/domain/progress";

export const progressRouter = router({
  recordActivity: protectedProcedure
    .input(
      z.object({
        activityType: z.string(),
        xpEarned: z.number().min(0).default(0),
        metadata: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      recordActivity({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  getStudentProgress: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(({ ctx, input }) =>
      getStudentProgress({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  getLessonProgress: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .query(({ ctx, input }) =>
      getLessonProgress({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  updateLessonProgress: protectedProcedure
    .input(
      z.object({
        lessonId: z.string(),
        status: z.string(),
        progress: z.number().min(0).max(100),
      })
    )
    .mutation(({ ctx, input }) =>
      updateLessonProgress({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),
});
