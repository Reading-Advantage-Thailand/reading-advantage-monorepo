import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { listStudents, importRoster } from "@reading-advantage/domain/students";

export const studentsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        classroomId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      return listStudents({
        db: ctx.db,
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
    .mutation(async ({ ctx, input }) => {
      return importRoster({
        db: ctx.db,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
        input,
      });
    }),
});
