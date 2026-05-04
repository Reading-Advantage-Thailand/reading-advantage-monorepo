import { z } from "zod";
import { eq } from "drizzle-orm";
import { classrooms } from "@reading-advantage/db/schema";
import { router, protectedProcedure } from "../trpc.js";
import { studentProgressReportSchema, classAnalyticsSchema, teacherDashboardSchema } from "@reading-advantage/types";
import { reports } from "@reading-advantage/domain";

export const reportsRouter = router({
  studentProgress: protectedProcedure
    .input(z.object({ studentId: z.string() }))
    .output(studentProgressReportSchema)
    .query(async ({ ctx, input }) => {
      return reports.getStudentProgress({
        db: ctx.tenantDb,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
        input,
      });
    }),

  classAnalytics: protectedProcedure
    .input(z.object({ classId: z.string() }))
    .output(classAnalyticsSchema)
    .query(async ({ ctx, input }) => {
      return reports.getClassAnalytics({
        db: ctx.tenantDb,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
        input,
      });
    }),

  teacherDashboard: protectedProcedure
    .output(teacherDashboardSchema)
    .query(async ({ ctx }) => {
      const classes = await ctx.tenantDb
        .select({ id: classrooms.id, name: classrooms.name })
        .from(classrooms)
        .where(eq(classrooms.teacherId, ctx.auth.user.id));

      return {
        classCount: classes.length,
        classes: classes.map((c) => ({
          id: c.id,
          name: c.name,
        })),
      };
    }),
});
