import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { authRouter } from "../routers/auth.js";
import type { AuthContext } from "@reading-advantage/auth";
import type { Context } from "../trpc.js";

vi.mock("@reading-advantage/db/schema", () => ({
  users: { id: "id", username: "username" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "eq" })),
}));

function createContext(auth: AuthContext | null = null) {
  return {
    db: {} as Context["db"],
    tenantDb: {} as Context["tenantDb"],
    auth,
  };
}

const t = initTRPC.context<ReturnType<typeof createContext>>().create({
  transformer: superjson,
});

const mockCaller = t.createCallerFactory(authRouter);

describe("auth router", () => {
  describe("session", () => {
    it("returns user and tenant when authenticated", async () => {
      const auth: AuthContext = {
        user: {
          id: "u1",
          username: "testuser",
          name: "Test",
          role: "TEACHER",
          schoolId: "s1",
        },
        tenant: { schoolId: "s1" },
      };

      const caller = mockCaller(createContext(auth));
      const result = await caller.session();

      expect(result.user.id).toBe("u1");
      expect(result.user.username).toBe("testuser");
      expect(result.tenant.schoolId).toBe("s1");
    });

    it("throws UNAUTHORIZED when not authenticated", async () => {
      const caller = mockCaller(createContext(null));
      await expect(caller.session()).rejects.toThrow("Not authenticated");
    });
  });
});
