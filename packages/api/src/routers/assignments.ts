import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { assignments, studentAssignments, classrooms } from "@reading-advantage/db/schema";
import { assertCan } from "@reading-advantage/auth";

export const assignmentsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        classroomId: z.string().uuid(),
        articleId: z.string().uuid().optional(),
        lessonId: z.string().uuid().optional(),
        dueDate: z.date().optional(),
        type: z.string(),
        studentIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.auth.user, "assignment:create", ctx.auth.tenant);

      const result = await ctx.db.transaction(async (tx) => {
        const [assignment] = await tx
          .insert(assignments)
          .values({
            title: input.title,
            classroomId: input.classroomId,
            teacherId: ctx.auth.user.id,
            articleId: input.articleId ?? null,
            lessonId: input.lessonId ?? null,
            dueDate: input.dueDate ?? null,
            type: input.type,
          })
          .returning();

        // Create student assignment records
        if (input.studentIds?.length) {
          await tx
            .insert(studentAssignments)
            .values(
              input.studentIds.map((studentId) => ({
                assignmentId: assignment.id,
                studentId,
              }))
            );
        }

        return assignment;
      });

      return result;
    }),

  list: protectedProcedure
    .input(
      z.object({
        classroomId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      assertCan(ctx.auth.user, "assignment:list", ctx.auth.tenant);

      return ctx.db
        .select()
        .from(assignments)
        .where(eq(assignments.classroomId, input.classroomId));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      assertCan(ctx.auth.user, "assignment:read", ctx.auth.tenant);

      const [assignment] = await ctx.db
        .select()
        .from(assignments)
        .where(eq(assignments.id, input.id))
        .limit(1);

      if (!assignment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      }

      return assignment;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        dueDate: z.date().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.auth.user, "assignment:update", ctx.auth.tenant);

      const { id, ...updates } = input;

      const [updated] = await ctx.db
        .update(assignments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(assignments.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.auth.user, "assignment:delete", ctx.auth.tenant);

      await ctx.db
        .delete(assignments)
        .where(eq(assignments.id, input.id));

      return { success: true };
    }),

  submit: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().uuid(),
        score: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCan(ctx.auth.user, "assignment:submit", ctx.auth.tenant);

      const [updated] = await ctx.db
        .update(studentAssignments)
        .set({
          completed: true,
          score: input.score,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(studentAssignments.assignmentId, input.assignmentId),
            eq(studentAssignments.studentId, ctx.auth.user.id)
          )
        )
        .returning();

      return updated;
    }),
});
