import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc.js";
import { userResponseSchema } from "@reading-advantage/types";
import {
  getMe,
  getUser,
  listUsers,
  updateUser,
  UserNotFoundError,
} from "@reading-advantage/domain/users";

/**
 * Maps user domain errors to tRPC TRPCError instances.
 *
 * Uses `instanceof UserNotFoundError` for NOT_FOUND mapping so that
 * unrelated errors with the substring "User not found" do not get
 * misclassified. The cross-school forbidden check is kept as a string
 * match because the domain throws a generic Error for that case and
 * upgrading it to a typed error is out of scope for this Phase 3 fix.
 *
 * @param err - The error to map
 * @returns Never; always throws a TRPCError
 */
function mapUsersError(err: unknown): never {
  if (err instanceof UserNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: err.message });
  }
  if (err instanceof Error) {
    if (err.message.includes("outside your school")) {
      throw new TRPCError({ code: "FORBIDDEN", message: err.message });
    }
    if (err.message.includes("Can only update your own profile")) {
      throw new TRPCError({ code: "FORBIDDEN", message: err.message });
    }
  }
  throw err;
}

export const usersRouter = router({
  me: protectedProcedure
    .output(userResponseSchema)
    .query(async ({ ctx }) => {
      try {
        return await getMe({ db: ctx.tenantDb, user: ctx.auth.user });
      } catch (err) {
        mapUsersError(err);
      }
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(userResponseSchema)
    .query(async ({ ctx, input }) => {
      try {
        return await getUser({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        mapUsersError(err);
      }
    }),

  list: protectedProcedure
    .input(
      z.object({
        schoolId: z.string().uuid().optional(),
        role: z
          .enum(["INTERN", "STUDENT", "TEACHER", "ADMIN", "SYSTEM", "SALES_REP", "SALES_ADMIN"])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .output(z.array(userResponseSchema))
    .query(async ({ ctx, input }) => {
      try {
        return await listUsers({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        mapUsersError(err);
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        image: z.string().url().optional(),
      })
    )
    .output(userResponseSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUser({
          db: ctx.tenantDb,
          user: ctx.auth.user,
          tenant: ctx.auth.tenant,
          input,
        });
      } catch (err) {
        mapUsersError(err);
      }
    }),
});
