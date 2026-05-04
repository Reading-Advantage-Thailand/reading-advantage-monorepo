import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { ExternalLessonId } from "@reading-advantage/types";
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
      recordActivity({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  getStudentProgress: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .query(({ ctx, input }) =>
      getStudentProgress({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  getLessonProgress: protectedProcedure
    .input(z.object({ lessonId: z.string().transform((v) => ExternalLessonId.parse(v)) }))
    .query(({ ctx, input }) =>
      getLessonProgress({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  updateLessonProgress: protectedProcedure
    .input(
      z.object({
        lessonId: z.string().transform((v) => ExternalLessonId.parse(v)),
        status: z.string(),
        progress: z.number().min(0).max(100),
      })
    )
    .mutation(({ ctx, input }) =>
      updateLessonProgress({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),
});
