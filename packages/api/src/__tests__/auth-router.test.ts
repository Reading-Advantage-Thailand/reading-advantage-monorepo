import { describe, it, expect } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { authRouter } from "../routers/auth.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

const t = initTRPC.context<{
  tenantDb: ReturnType<typeof createTenantDB>;
  auth: {
    user: { id: string; username: string; name: string | null; role: string; schoolId: string | null };
    tenant: { schoolId: string | null };
  };
}>().create({
  transformer: superjson,
});

const appRouter = t.router({ auth: authRouter });

function createCaller(auth: {
  user: { id: string; username: string; name: string | null; role: string; schoolId: string | null };
  tenant: { schoolId: string | null };
}) {
  const tenantDb = createTenantDB({} as unknown as DB, auth.tenant);
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testUser = {
  id: "u1",
  username: "user1",
  name: "Test User",
  role: "STUDENT",
  schoolId: "s1",
};

describe("auth router", () => {
  describe("session", () => {
    it("returns user and tenant", async () => {
      const caller = createCaller({ user: testUser, tenant: { schoolId: "s1" } });

      const result = await caller.auth.session();

      expect(result.user.id).toBe("u1");
      expect(result.tenant.schoolId).toBe("s1");
    });

    it("strips extraneous fields from user", async () => {
      const caller = createCaller({
        user: { ...testUser, extraField: "should-be-stripped" } as unknown as typeof testUser,
        tenant: { schoolId: "s1" },
      });

      const result = await caller.auth.session();

      expect(result).not.toHaveProperty("extraField");
      expect(result.user).toHaveProperty("id");
      expect(result.user).toHaveProperty("role");
    });
  });
});
