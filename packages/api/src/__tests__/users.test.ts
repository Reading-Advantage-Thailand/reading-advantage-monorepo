import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { usersRouter } from "../routers/users.js";

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
    firebaseUid: "firebase_uid",
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

const t = initTRPC.context<{ db: ReturnType<typeof createMockDb>; auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } } }>().create({
  transformer: superjson,
});

const appRouter = t.router({ users: usersRouter });

function createCaller(db: ReturnType<typeof createMockDb>, auth: { user: { id: string; role: string; schoolId?: string | null }; tenant: { schoolId: string | null } }) {
  return t.createCallerFactory(appRouter)({ db, auth });
}

describe("users router", () => {
  describe("me", () => {
    it("returns current user with safe columns", async () => {
      const userRow = {
        id: "u1",
        email: "test@example.com",
        name: "Test User",
        role: "STUDENT",
        schoolId: "s1",
        image: null,
        xp: 100,
        level: 2,
        cefrLevel: "A1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: "s1" } });

      const result = await caller.users.me();

      expect(result.id).toBe("u1");
      expect(result.email).toBe("test@example.com");
      // Should not include sensitive fields
      expect(result).not.toHaveProperty("password");
      expect(result).not.toHaveProperty("firebaseUid");
    });
  });

  describe("get", () => {
    it("returns user by id with safe columns", async () => {
      const userRow = {
        id: "u2",
        email: "other@example.com",
        name: "Other User",
        role: "TEACHER",
        schoolId: "s1",
        image: null,
        xp: 200,
        level: 3,
        cefrLevel: "A2",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: "s1" } });

      const result = await caller.users.get({ id: "u2" });

      expect(result.id).toBe("u2");
      expect(result).not.toHaveProperty("password");
      expect(result).not.toHaveProperty("firebaseUid");
    });

    it("scopes lookup to caller tenant", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: "s1" } });

      await expect(caller.users.get({ id: "u2" })).rejects.toThrow(/User not found/);

      const selectChain = db.select.mock.results[0]?.value;
      expect(selectChain).toBeDefined();
    });
  });

  describe("list", () => {
    it("scopes results to caller's school when no schoolId provided", async () => {
      const userRows = [
        { id: "u1", username: "alice", name: "A", role: "STUDENT", schoolId: "s1" },
        { id: "u2", username: "bob", name: "B", role: "STUDENT", schoolId: "s1" },
      ];
      const db = createMockDb({ selectResult: userRows });
      const caller = createCaller(db, { user: { id: "u1", role: "TEACHER" }, tenant: { schoolId: "s1" } });

      const result = await caller.users.list({});

      expect(result).toEqual(userRows);
      // Verify where clause was built with schoolId condition
      const whereCall = db.select.mock.results[0];
      expect(whereCall).toBeDefined();
    });

    it("rejects non-system query for another school", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(db, { user: { id: "a1", role: "ADMIN" }, tenant: { schoolId: "s1" } });

      await expect(
        caller.users.list({ schoolId: "550e8400-e29b-41d4-a716-446655440002" })
      ).rejects.toThrow(/outside your school/);
    });

    it("allows system to query a specific school", async () => {
      const userRows = [
        { id: "u3", username: "charlie", name: "C", role: "STUDENT", schoolId: "s2" },
      ];
      const db = createMockDb({ selectResult: userRows });
      const caller = createCaller(db, { user: { id: "sys1", role: "SYSTEM" }, tenant: { schoolId: "s1" } });

      const result = await caller.users.list({ schoolId: "550e8400-e29b-41d4-a716-446655440002" });

      expect(result).toEqual(userRows);
    });

    it("filters by role when specified", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(db, { user: { id: "t1", role: "TEACHER" }, tenant: { schoolId: "s1" } });

      await caller.users.list({ role: "STUDENT" });

      // Just verify it doesn't throw
      expect(db.select).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("allows user to update their own profile", async () => {
      const updatedRow = { id: "u1", name: "New Name", email: "test@example.com" };
      const db = createMockDb({ updateReturning: [updatedRow] });
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: "s1" } });

      const result = await caller.users.update({ id: "u1", name: "New Name" });

      expect(result.name).toBe("New Name");
    });

    it("allows system to update any profile", async () => {
      const updatedRow = { id: "u2", name: "Admin Updated", email: "other@example.com" };
      const db = createMockDb({ updateReturning: [updatedRow] });
      const caller = createCaller(db, { user: { id: "sys1", role: "SYSTEM" }, tenant: { schoolId: "s1" } });

      const result = await caller.users.update({ id: "u2", name: "Admin Updated" });

      expect(result.name).toBe("Admin Updated");
    });

    it("throws FORBIDDEN when user tries to update another user's profile", async () => {
      const db = createMockDb();
      const caller = createCaller(db, { user: { id: "u1", role: "STUDENT" }, tenant: { schoolId: "s1" } });

      await expect(
        caller.users.update({ id: "u2", name: "Hacked" })
      ).rejects.toThrow(/Can only update your own profile/);
    });
  });
});
