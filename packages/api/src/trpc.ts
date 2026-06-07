import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { DB } from "@reading-advantage/db";
import type { TenantDB } from "@reading-advantage/domain";
import type { AuthContext } from "@reading-advantage/auth";

export interface Context {
  db: DB;
  /** Tenant-scoped DB wrapper. ONLY intercepts select/update/delete builders;
   *  relational queries (db.query.*) bypass tenant scoping. */
  tenantDb: TenantDB;
  auth: AuthContext | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;

/**
 * Scrubs sensitive fields (passwords, tokens, secrets) from input
 * before logging.
 */
function scrubSensitiveFields(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = { ...(input as Record<string, unknown>) };
  for (const key of Object.keys(obj)) {
    if (/password|token|secret|cookie|authorization/i.test(key)) {
      obj[key] = "[REDACTED]";
    }
  }
  return obj;
}

/**
 * Observability logging middleware for tRPC procedures.
 * Captures procedure name, input (scrubbed of sensitive fields),
 * latency, and status code as structured JSON logs.
 */
const loggingMiddleware = middleware(async ({ path, type, next, getRawInput }) => {
  const start = performance.now();
  const rawInput = await getRawInput();
  const input = scrubSensitiveFields(rawInput);

  let status: "ok" | "error" = "ok";
  let errorMessage: string | undefined;

  try {
    const result = await next();
    return result;
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const latencyMs = Math.round(performance.now() - start);
    console.log(
      JSON.stringify({
        level: status === "error" ? "error" : "info",
        event: "trpc_request",
        path,
        type,
        latencyMs,
        status,
        ...(errorMessage && { error: errorMessage }),
        input: input ?? undefined,
      }),
    );
  }
});

export const publicProcedure = t.procedure.use(loggingMiddleware);

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

export const protectedProcedure = t.procedure.use(loggingMiddleware).use(isAuthed);

const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  if (ctx.auth.user.role !== "ADMIN" && ctx.auth.user.role !== "SYSTEM") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({
    ctx: {
      ...ctx,
      auth: ctx.auth,
    },
  });
});

export const adminProcedure = t.procedure.use(loggingMiddleware).use(isAdmin);
