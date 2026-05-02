import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
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
    .mutation(({ ctx, input }) =>
      createAssignment({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  list: protectedProcedure
    .input(
      z.object({
        classroomId: z.string().uuid(),
      })
    )
    .query(({ ctx, input }) =>
      listAssignments({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) =>
      getAssignment({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        dueDate: z.date().nullable().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      updateAssignment({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      deleteAssignment({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),

  submit: protectedProcedure
    .input(
      z.object({
        assignmentId: z.string().uuid(),
        score: z.number().min(0).max(100),
      })
    )
    .mutation(({ ctx, input }) =>
      submitAssignment({ db: ctx.db, user: ctx.auth.user, tenant: ctx.auth.tenant, input })
    ),
});
