import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { users } from "@reading-advantage/db/schema";

const safeUserCols = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  schoolId: users.schoolId,
  image: users.image,
  xp: users.xp,
  level: users.level,
  cefrLevel: users.cefrLevel,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export const usersRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select(safeUserCols)
      .from(users)
      .where(eq(users.id, ctx.auth.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(users.id, input.id)];
      if (ctx.auth.user.role !== "SYSTEM" && ctx.auth.tenant.schoolId) {
        conditions.push(eq(users.schoolId, ctx.auth.tenant.schoolId));
      }

      const [user] = await ctx.db
        .select(safeUserCols)
        .from(users)
        .where(and(...conditions))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return user;
    }),

  list: protectedProcedure
    .input(
      z.object({
        schoolId: z.string().uuid().optional(),
        role: z.enum(["STUDENT", "TEACHER", "ADMIN", "SYSTEM"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.schoolId) {
        if (
          ctx.auth.user.role !== "SYSTEM" &&
          input.schoolId !== ctx.auth.tenant.schoolId
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Cannot list users outside your school",
          });
        }
        conditions.push(eq(users.schoolId, input.schoolId));
      } else if (ctx.auth.tenant.schoolId) {
        conditions.push(eq(users.schoolId, ctx.auth.tenant.schoolId));
      }

      if (input.role) {
        conditions.push(eq(users.role, input.role));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return ctx.db
        .select(safeUserCols)
        .from(users)
        .where(whereClause)
        .limit(input.limit)
        .offset(input.offset);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Users can only update themselves (admins can update anyone)
      if (
        input.id !== ctx.auth.user.id &&
        ctx.auth.user.role !== "ADMIN" &&
        ctx.auth.user.role !== "SYSTEM"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Can only update your own profile",
        });
      }

      const { id, ...updates } = input;
      const conditions = [eq(users.id, id)];
      if (ctx.auth.user.role !== "SYSTEM" && ctx.auth.tenant.schoolId) {
        conditions.push(eq(users.schoolId, ctx.auth.tenant.schoolId));
      }

      const [updated] = await ctx.db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(...conditions))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return updated;
    }),
});
