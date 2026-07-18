// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { createContext } from "../context.js";
import { salesRouter } from "../routers/sales.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";
import type { Context } from "../trpc.js";

const { mockValidateSession, mockCookies } = vi.hoisted(() => ({
  mockValidateSession: vi.fn(),
  mockCookies: vi.fn(),
}));

vi.mock("@reading-advantage/auth", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@reading-advantage/auth")>();
  return { ...actual, validateSession: mockValidateSession };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

function salesSession(role: "SALES_REP" | "SALES_ADMIN") {
  return {
    id: "session-1",
    userId: "user-1",
    expiresAt: new Date(Date.now() + 86_400_000),
    user: {
      id: "user-1",
      username: "salesuser",
      name: "Sales User",
      role,
      schoolId: "school-1",
      xp: 0,
      level: 1,
      cefrLevel: "A1",
    },
  };
}

const t = initTRPC.context<Context>().create({ transformer: superjson });
const appRouter = t.router({ sales: salesRouter });

function createCaller(
  auth: Context["auth"],
  db: DB = {} as DB,
) {
  const tenantDb = createTenantDB(db, auth?.tenant ?? { schoolId: null });
  return t.createCallerFactory(appRouter)({ db, tenantDb, auth });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name === "session_token" ? { value: "test-session-token" } : undefined,
  });
});

describe("Sales auth context integration", () => {
  it("verified-principal mode stays anonymous without consulting legacy auth", async () => {
    const ctx = await createContext({
      mode: "verified-principal",
      principal: null,
      productScope: null,
    });

    expect(ctx.auth).toBeNull();
    expect(mockCookies).not.toHaveBeenCalled();
    expect(mockValidateSession).not.toHaveBeenCalled();
  });

  it("rejects partial or mixed verified company scope as anonymous", async () => {
    const principal = {
      id: "sales-company-admin",
      username: "sales.admin",
      name: "Sales Admin",
      role: "SALES_ADMIN" as const,
      schoolId: null,
      xp: 0,
      level: 1,
      cefrLevel: "N/A",
    };
    const partial = await createContext({
      mode: "verified-principal",
      principal,
      productScope: {
        kind: "company",
        applicationKey: "sales",
        organizationId: "20000000-0000-4000-8000-000000000003",
      } as never,
    });
    const mixed = await createContext({
      mode: "verified-principal",
      principal,
      productScope: {
        kind: "company",
        applicationKey: "sales",
        organizationId: "20000000-0000-4000-8000-000000000003",
        organizationKey: "internal-company",
        schoolId: "school-a",
      } as never,
    });

    expect(partial.auth).toBeNull();
    expect(mixed.auth).toBeNull();
  });

  it("preserves the verified company organization without requiring a school", async () => {
    const ctx = await createContext({
      mode: "verified-principal",
      principal: {
        id: "sales-company-admin",
        username: "sales.admin",
        name: "Sales Admin",
        role: "SALES_ADMIN",
        schoolId: null,
        xp: 0,
        level: 1,
        cefrLevel: "N/A",
      },
      productScope: {
        kind: "company",
        applicationKey: "sales",
        organizationId: "20000000-0000-4000-8000-000000000003",
        organizationKey: "internal-company",
      },
    });

    expect(ctx.auth?.tenant).toEqual({ schoolId: null });
    expect(ctx.auth?.productScope).toEqual({
      kind: "company",
      applicationKey: "sales",
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
    });
  });

  it("SALES_REP session produces a non-null auth context", async () => {
    mockValidateSession.mockResolvedValue(salesSession("SALES_REP"));
    const ctx = await createContext();
    expect(ctx.auth, "SALES_REP must not parse to auth=null").not.toBeNull();
    expect(ctx.auth?.user.role).toBe("SALES_REP");
  });

  it("SALES_ADMIN session produces a non-null auth context", async () => {
    mockValidateSession.mockResolvedValue(salesSession("SALES_ADMIN"));
    const ctx = await createContext();
    expect(ctx.auth, "SALES_ADMIN must not parse to auth=null").not.toBeNull();
    expect(ctx.auth?.user.role).toBe("SALES_ADMIN");
  });

  it("admin procedures reject a SALES_REP caller", async () => {
    const repCaller = createCaller({
      user: {
        id: "rep-1",
        username: "rep1",
        name: "Rep",
        role: "SALES_REP",
        schoolId: "school-1",
        xp: 0,
        level: 1,
        cefrLevel: "A1",
      },
      tenant: { schoolId: "school-1" },
    });
    await expect(
      repCaller.sales.admin.cohortOverview(),
    ).rejects.toThrow(/Sales admin access required/);
  });

  it("legacy shared Sales roles cannot enter the Sales API root", async () => {
    const legacyCaller = createCaller({
      user: {
        id: "admin-a",
        username: "admina",
        name: "Admin A",
        role: "SALES_ADMIN",
        schoolId: "school-a",
        xp: 0,
        level: 1,
        cefrLevel: "A1",
      },
      tenant: { schoolId: "school-a" },
    });

    await expect(legacyCaller.sales.admin.cohortOverview()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
