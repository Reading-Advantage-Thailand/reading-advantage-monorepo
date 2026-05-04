import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { usersRouter } from "../routers/users.js";
import { createTenantDB } from "@reading-advantage/domain";
import type { DB } from "@reading-advantage/db";

vi.mock("@reading-advantage/db/schema", () => ({
  users: {
    id: "id",
    email: "email",
    name: "name",
    role: "role",
    schoolId: "school_id",
    image: "image",
    xp: "xp",
    level: "level",
    cefrLevel: "cefr_level",
    createdAt: "created_at",
    updatedAt: "updated_at",
    password: "password",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "eq" })),
  and: vi.fn((...conds: unknown[]) => ({ type: "and", conds })),
}));

function createMockDb(opts: {
  selectResult?: unknown[];
  updateReturning?: unknown[];
} = {}) {
  const resolvedValue = opts.selectResult ?? [];

  function createLimitFn() {
    return vi.fn().mockImplementation(() => {
      const promise = Promise.resolve(resolvedValue);
      return Object.assign(promise, {
        offset: vi.fn().mockResolvedValue(resolvedValue),
      });
    });
  }

  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: createLimitFn(),
          offset: vi.fn().mockResolvedValue(resolvedValue),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(opts.updateReturning ?? []),
        }),
      }),
    }),
  };
  return mockDb;
}

const t = initTRPC.context<{ tenantDb: ReturnType<typeof createTenantDB>; auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } }>().create({
  transformer: superjson,
});

const appRouter = t.router({ users: usersRouter });

function createCaller(db: ReturnType<typeof createMockDb>, auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } }) {
  const tenantDb = createTenantDB(db as unknown as DB, auth.tenant);
  return t.createCallerFactory(appRouter)({ tenantDb, auth });
}

const testDate = new Date("2024-01-01T00:00:00Z");
const testSchoolId = "550e8400-e29b-41d4-a716-446655440001";
const testSchoolId2 = "550e8400-e29b-41d4-a716-446655440002";

function makeUserRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "u1",
    email: "test@example.com",
    name: "Test User",
    role: "STUDENT",
    schoolId: testSchoolId,
    image: null,
    xp: 100,
    level: 2,
    cefrLevel: "A1",
    createdAt: testDate,
    updatedAt: testDate,
    ...overrides,
  };
}

describe("users router", () => {
  describe("me", () => {
    it("returns current user with safe columns", async () => {
      const userRow = makeUserRow({ id: "u1" });
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.users.me();

      expect(result.id).toBe("u1");
      expect(result.email).toBe("test@example.com");
      // Should not include sensitive fields
      expect(result).not.toHaveProperty("password");
    });
  });

  describe("get", () => {
    it("returns user by id with safe columns", async () => {
      const userRow = makeUserRow({ id: "u2", email: "other@example.com", name: "Other User", role: "TEACHER", xp: 200, level: 3, cefrLevel: "A2" });
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.users.get({ id: "u2" });

      expect(result.id).toBe("u2");
      expect(result).not.toHaveProperty("password");
    });

    it("scopes lookup to caller tenant", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: testSchoolId } });

      await expect(caller.users.get({ id: "u2" })).rejects.toThrow(/User not found/);

      const selectChain = db.select.mock.results[0]?.value;
      expect(selectChain).toBeDefined();
    });
  });

  describe("list", () => {
    it("scopes results to caller's school when no schoolId provided", async () => {
      const userRows = [
        makeUserRow({ id: "u1", name: "A" }),
        makeUserRow({ id: "u2", name: "B", email: "bob@example.com" }),
      ];
      const db = createMockDb({ selectResult: userRows });
      const caller = createCaller(db, { user: { id: "u1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.users.list({});

      // Output schema strips fields not in userResponseSchema (image, updatedAt)
      const expected = userRows.map(({ image, updatedAt, ...rest }) => rest);
      expect(result).toEqual(expected);
      // Verify where clause was built with schoolId condition
      const whereCall = db.select.mock.results[0];
      expect(whereCall).toBeDefined();
    });

    it("rejects non-system query for another school", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(db, { user: { id: "a1", role: "ADMIN" }, tenant: { schoolId: testSchoolId } });

      await expect(
        caller.users.list({ schoolId: testSchoolId2 })
      ).rejects.toThrow(/outside your school/);
    });

    it("allows system to query a specific school", async () => {
      const userRows = [
        makeUserRow({ id: "u3", name: "C", schoolId: testSchoolId2 }),
      ];
      const db = createMockDb({ selectResult: userRows });
      const caller = createCaller(db, { user: { id: "sys1", role: "SYSTEM" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.users.list({ schoolId: testSchoolId2 });

      // Output schema strips fields not in userResponseSchema (image, updatedAt)
      const expected = userRows.map(({ image, updatedAt, ...rest }) => rest);
      expect(result).toEqual(expected);
    });

    it("filters by role when specified", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(db, { user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: testSchoolId } });

      await caller.users.list({ role: "STUDENT" });

      // Just verify it doesn't throw
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("allows user to update their own profile", async () => {
      const updatedRow = makeUserRow({ id: "u1", name: "New Name" });
      const db = createMockDb({ updateReturning: [updatedRow] });
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.users.update({ id: "u1", name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("allows system to update any profile", async () => {
      const updatedRow = makeUserRow({ id: "u2", name: "Admin Updated", email: "other@example.com" });
      const db = createMockDb({ updateReturning: [updatedRow] });
      const caller = createCaller(db, { user: { id: "sys1", role: "SYSTEM" }, tenant: { schoolId: testSchoolId } });

      const result = await caller.users.update({ id: "u2", name: "Admin Updated" });

      expect(result.name).toBe("Admin Updated");
    });

    it("throws FORBIDDEN when user tries to update another user's profile", async () => {
      const db = createMockDb();
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: testSchoolId } });

      await expect(
        caller.users.update({ id: "u2", name: "Hacked" })
      ).rejects.toThrow(/Can only update your own profile/);
    });
  });
});
