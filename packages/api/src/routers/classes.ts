import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { classroomResponseSchema } from "@reading-advantage/types";
import { createClass, listClasses } from "@reading-advantage/domain/classes";

export const classesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      })
    )
    .output(classroomResponseSchema)
    .mutation(async ({ ctx, input }) => {
      return createClass({
        db: ctx.tenantDb,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
        input,
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
      })
    )
    .output(z.array(classroomResponseSchema))
    .query(async ({ ctx, input }) => {
      return listClasses({
        db: ctx.tenantDb,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
        input,
      });
    }),
});
