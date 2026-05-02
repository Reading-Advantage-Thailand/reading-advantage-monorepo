import { describe, it, expect, vi } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

/**
 * Test the isAuthed middleware pattern used in trpc.ts
 * by recreating the same middleware locally.
 */
interface TestContext {
  auth: { user: { id: string }; tenant: { schoolId: string } } | null;
}

function createTestTrpc() {
  const t = initTRPC.context<TestContext>().create();

  const isAuthed = t.middleware(async ({ ctx, next }) => {
    if (!ctx.auth) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }
    return next({ ctx: { ...ctx, auth: ctx.auth } });
  });

  const router = t.router;
  const publicProcedure = t.procedure;
  const protectedProcedure = t.procedure.use(isAuthed);

  const appRouter = router({
    publicPing: publicProcedure.query(() => "pong"),
    protectedPing: protectedProcedure.query(({ ctx }) => {
      return { userId: ctx.auth.user.id };
    }),
    protectedMutation: protectedProcedure
      .input(z.object({ value: z.string() }))
      .mutation(({ ctx, input }) => {
        return { userId: ctx.auth.user.id, value: input.value };
      }),
  });

  return { appRouter, router, publicProcedure, protectedProcedure };
}

const { appRouter } = createTestTrpc();

type AppRouter = typeof appRouter;

function createCaller(auth: TestContext["auth"]) {
  const { appRouter } = createTestTrpc();
  const caller = appRouter.createCaller({ auth });
  return caller;
}

describe("publicProcedure", () => {
  it("works without auth context", async () => {
    const caller = createCaller(null);
    const result = await caller.publicPing();
    expect(result).toBe("pong");
  });
});

describe("protectedProcedure", () => {
  it("throws UNAUTHORIZED when auth is null", async () => {
    const caller = createCaller(null);
    await expect(caller.protectedPing()).rejects.toThrow(/Not authenticated/);
  });

  it("throws UNAUTHORIZED error code", async () => {
    const caller = createCaller(null);
    try {
      await caller.protectedPing();
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      expect((err as TRPCError).code).toBe("UNAUTHORIZED");
    }
  });

  it("passes through when auth is present", async () => {
    const auth = {
      user: { id: "u1", email: "test@test.com", name: "Test", role: "TEACHER", schoolId: "s1" },
      tenant: { schoolId: "s1" },
    };
    const caller = createCaller(auth);
    const result = await caller.protectedPing();
    expect(result).toEqual({ userId: "u1" });
  });

  it("mutation works with auth", async () => {
    const auth = {
      user: { id: "u1", email: "test@test.com", name: "Test", role: "TEACHER", schoolId: "s1" },
      tenant: { schoolId: "s1" },
    };
    const caller = createCaller(auth);
    const result = await caller.protectedMutation({ value: "hello" });
    expect(result).toEqual({ userId: "u1", value: "hello" });
  });
});
