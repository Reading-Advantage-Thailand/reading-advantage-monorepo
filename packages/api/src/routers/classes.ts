import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import { createClass, listClasses } from "@reading-advantage/domain/classes";

export const classesRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createClass({
        db: ctx.db,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
        input,
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        schoolId: z.string().uuid().optional(),
        includeArchived: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return listClasses({
        db: ctx.db,
        user: ctx.auth.user,
        tenant: ctx.auth.tenant,
        input,
      });
    }),
});
