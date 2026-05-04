import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { studentResponseSchema, rosterImportResultSchema } from "@reading-advantage/types";
import { listStudents, importRoster } from "@reading-advantage/domain/students";

export const studentsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        classroomId: z.string().uuid(),
      })
    )
    .output(z.array(studentResponseSchema))
    .query(async ({ ctx, input }) => {
      return listStudents({
        db: ctx.tenantDb,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
        input,
      });
    }),

  importRoster: protectedProcedure
    .input(
      z.object({
        classroomId: z.string().uuid(),
        students: z.array(
          z.object({
            name: z.string(),
            username: z.string().min(1).max(100),
          })
        ),
      })
    )
    .output(z.array(rosterImportResultSchema))
    .mutation(async ({ ctx, input }) => {
      return importRoster({
        db: ctx.tenantDb,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
        input,
      });
    }),
});
