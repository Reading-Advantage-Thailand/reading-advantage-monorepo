import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { DB } from "@reading-advantage/db";
import type { TenantDB } from "@reading-advantage/domain";
import type { AuthContext } from "@reading-advantage/auth";

export interface Context {
  db: DB;
  tenantDb: TenantDB;
  auth: AuthContext | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;
export const publicProcedure = t.procedure;

const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: {
      ...ctx,
      auth: ctx.auth,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
