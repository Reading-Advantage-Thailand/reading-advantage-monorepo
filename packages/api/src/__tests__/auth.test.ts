import { describe, it, expect, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import bcrypt from "bcryptjs";
import { authRouter } from "../routers/auth.js";
import { createTokenPair, verifyAccessToken } from "@reading-advantage/auth";

vi.mock("@reading-advantage/db/schema", () => ({
  users: { email: "email", id: "id" },
  refreshTokens: { token: "token", id: "id", userId: "userId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "eq" })),
}));

function createMockDb(opts: {
  selectResult?: unknown[];
  insertReturning?: unknown[];
} = {}) {
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(opts.selectResult ?? []),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(opts.selectResult ?? []),
        }),
      }),
      // select with projection for register duplicate check
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(opts.insertReturning ?? []),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(opts.insertReturning ?? []),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
  return mockDb;
}

const t = initTRPC.context<{ db: ReturnType<typeof createMockDb>; auth: { user: { id: string }; tenant: { schoolId: string | null } } | null }>().create({
  transformer: superjson,
});

const appRouter = t.router({ auth: authRouter });

function createCaller(db: ReturnType<typeof createMockDb>, auth: { user: { id: string }; tenant: { schoolId: string | null } } | null = null) {
  const caller = t.createCallerFactory(appRouter)({ db, auth });
  return caller;
}

describe("auth router", () => {
  describe("login", () => {
    it("returns tokens on valid credentials", async () => {
      const hashedPw = await bcrypt.hash("password123", 10);
      const userRow = {
        id: "u1",
        email: "test@example.com",
        name: "Test User",
        password: hashedPw,
        role: "STUDENT",
        schoolId: "s1",
      };
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db);

      const result = await caller.auth.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe("u1");
      expect(result.user.email).toBe("test@example.com");

      // Verify access token is valid
      const payload = verifyAccessToken(result.accessToken);
      expect(payload.userId).toBe("u1");
      expect(payload.role).toBe("STUDENT");
    });

    it("throws UNAUTHORIZED on wrong password", async () => {
      const hashedPw = await bcrypt.hash("correctpassword", 10);
      const userRow = {
        id: "u1",
        email: "test@example.com",
        name: "Test",
        password: hashedPw,
        role: "STUDENT",
        schoolId: null,
      };
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db);

      await expect(
        caller.auth.login({ email: "test@example.com", password: "wrongpassword" })
      ).rejects.toThrow(/Invalid email or password/);
    });

    it("throws UNAUTHORIZED on non-existent user", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(db);

      await expect(
        caller.auth.login({ email: "nobody@example.com", password: "password" })
      ).rejects.toThrow(/Invalid email or password/);
    });

    it("throws UNAUTHORIZED on user with no password (OAuth user)", async () => {
      const userRow = {
        id: "u1",
        email: "oauth@example.com",
        name: "OAuth User",
        password: null,
        role: "STUDENT",
        schoolId: null,
      };
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db);

      await expect(
        caller.auth.login({ email: "oauth@example.com", password: "anypassword" })
      ).rejects.toThrow(/Invalid email or password/);
    });

    it("throws UNAUTHORIZED with MIGRATION_REQUIRED for Firebase-only user", async () => {
      const userRow = {
        id: "u1",
        email: "firebase@example.com",
        name: "Firebase User",
        password: null,
        firebaseUid: "firebase-uid-123",
        role: "STUDENT",
        schoolId: null,
      };
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db);

      await expect(
        caller.auth.login({ email: "firebase@example.com", password: "anypassword" })
      ).rejects.toThrow("MIGRATION_REQUIRED");
    });
  });

  describe("register", () => {
    it("creates user and returns tokens", async () => {
      // First select (duplicate check) returns empty
      const db = createMockDb({
        selectResult: [],
        insertReturning: [
          {
            id: "new-u1",
            email: "new@example.com",
            name: "New User",
            role: "STUDENT",
            schoolId: null,
          },
        ],
      });
      const caller = createCaller(db);

      const result = await caller.auth.register({
        email: "new@example.com",
        password: "securepass123",
        name: "New User",
      });

      expect(result.user.email).toBe("new@example.com");
      expect(result.user.role).toBe("STUDENT");
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("throws CONFLICT on duplicate email", async () => {
      const db = createMockDb({ selectResult: [{ id: "existing-u1" }] });
      const caller = createCaller(db);

      await expect(
        caller.auth.register({
          email: "existing@example.com",
          password: "password123",
          name: "Existing",
        })
      ).rejects.toThrow(/Email already registered/);
    });
  });

  describe("session", () => {
    it("returns user and tenant when authenticated", async () => {
      const auth = {
        user: { id: "u1", email: "test@test.com", name: "Test", role: "TEACHER", schoolId: "s1" },
        tenant: { schoolId: "s1" },
      };
      const db = createMockDb();
      const caller = createCaller(db, auth);

      const result = await caller.auth.session();
      expect(result.user.id).toBe("u1");
      expect(result.tenant.schoolId).toBe("s1");
    });

    it("throws UNAUTHORIZED without auth", async () => {
      const db = createMockDb();
      const caller = createCaller(db, null);

      await expect(caller.auth.session()).rejects.toThrow(/Not authenticated/);
    });
  });

  describe("refresh", () => {
    it("issues new token pair with valid refresh token", async () => {
      const { refreshToken } = createTokenPair({
        userId: "u1",
        email: "test@test.com",
        role: "STUDENT",
        schoolId: null,
      });

      const userRow = {
        id: "u1",
        email: "test@test.com",
        name: "Test",
        role: "STUDENT",
        schoolId: null,
      };

      const storedToken = {
        token: refreshToken,
        userId: "u1",
        expiresAt: new Date(Date.now() + 86400000),
      };

      // select first call: refresh token lookup, second call: user lookup
      let selectCallCount = 0;
      const db = createMockDb();
      db.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              selectCallCount++;
              if (selectCallCount === 1) return Promise.resolve([storedToken]);
              return Promise.resolve([userRow]);
            }),
          }),
        }),
      });

      const caller = createCaller(db);
      const result = await caller.auth.refresh({ refreshToken });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // Verify new tokens are valid JWT strings
      expect(result.accessToken.split(".")).toHaveLength(3);
      expect(result.refreshToken.split(".")).toHaveLength(3);
    });

    it("throws UNAUTHORIZED with invalid refresh token", async () => {
      const db = createMockDb({ selectResult: [] });
      const caller = createCaller(db);

      await expect(
        caller.auth.refresh({ refreshToken: "invalid-token" })
      ).rejects.toThrow(/Invalid refresh token/);
    });
  });

  describe("migrate", () => {
    it("sets password and returns tokens for Firebase-only user", async () => {
      const userRow = {
        id: "u1",
        email: "firebase@example.com",
        name: "Firebase User",
        password: null,
        firebaseUid: "firebase-uid-123",
        role: "STUDENT",
        schoolId: null,
      };

      const db = createMockDb({ selectResult: [userRow] });
      db.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...userRow, password: "hashed" }]),
          }),
        }),
      });

      const caller = createCaller(db);
      const result = await caller.auth.migrate({
        email: "firebase@example.com",
        password: "newpassword123",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe("firebase@example.com");
    });

    it("throws BAD_REQUEST when user has no firebaseUid", async () => {
      const userRow = {
        id: "u1",
        email: "regular@example.com",
        name: "Regular User",
        password: null,
        firebaseUid: null,
        role: "STUDENT",
        schoolId: null,
      };
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db);

      await expect(
        caller.auth.migrate({ email: "regular@example.com", password: "newpassword123" })
      ).rejects.toThrow(/Migration not available/);
    });

    it("throws BAD_REQUEST when user already has a password", async () => {
      const hashedPw = await bcrypt.hash("existingpassword", 10);
      const userRow = {
        id: "u1",
        email: "migrated@example.com",
        name: "Migrated User",
        password: hashedPw,
        firebaseUid: "firebase-uid-123",
        role: "STUDENT",
        schoolId: null,
      };
      const db = createMockDb({ selectResult: [userRow] });
      const caller = createCaller(db);

      await expect(
        caller.auth.migrate({ email: "migrated@example.com", password: "newpassword123" })
      ).rejects.toThrow(/Migration not available/);
    });
  });

  describe("logout", () => {
    it("returns success when authenticated", async () => {
      const auth = {
        user: { id: "u1", email: "test@test.com", name: "Test", role: "STUDENT", schoolId: null },
        tenant: { schoolId: null },
      };
      const db = createMockDb();
      const caller = createCaller(db, auth);

      const result = await caller.auth.logout({ refreshToken: "some-token" });
      expect(result.success).toBe(true);
    });

    it("throws UNAUTHORIZED without auth", async () => {
      const db = createMockDb();
      const caller = createCaller(db, null);

      await expect(
        caller.auth.logout({ refreshToken: "some-token" })
      ).rejects.toThrow(/Not authenticated/);
    });
  });
});
