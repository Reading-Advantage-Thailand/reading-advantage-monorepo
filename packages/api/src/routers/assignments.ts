import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { assignmentResponseSchema } from "@reading-advantage/types";
import {
  createAssignment,
  listAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
} from "@reading-advantage/domain/assignments";

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
    .output(assignmentResponseSchema)
    .mutation(({ ctx, input }) =>
      createAssignment({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  list: protectedProcedure
    .input(
      z.object({
        classroomId: z.string().uuid(),
      })
    )
    .output(z.array(assignmentResponseSchema))
    .query(({ ctx, input }) =>
      listAssignments({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(assignmentResponseSchema)
    .query(({ ctx, input }) =>
      getAssignment({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        dueDate: z.date().nullable().optional(),
      })
    )
    .output(assignmentResponseSchema)
    .mutation(({ ctx, input }) =>
      updateAssignment({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ success: z.boolean() }))
    .mutation(({ ctx, input }) =>
      deleteAssignment({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  submit: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().uuid(),
        score: z.number().min(0).max(100),
      })
    )
    .output(z.object({
      id: z.string().uuid(),
      assignmentId: z.string().uuid(),
      studentId: z.string(),
      completed: z.boolean(),
      score: z.number().nullable(),
      completedAt: z.date().nullable(),
      createdAt: z.date(),
      updatedAt: z.date(),
    }))
    .mutation(({ ctx, input }) =>
      submitAssignment({ db: ctx.tenantDb, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),
});
