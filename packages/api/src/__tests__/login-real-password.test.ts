/**
 * Login tests that use the real password functions from @reading-advantage/auth.
 * Only the database, sessions, rate limiter and audit log are mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { hashPassword, verifyPassword, ARGON2ID_OPTS } from "@reading-advantage/auth";
import { createLoginHandler, handleLogin, getDummyHash } from "../routes/auth/login.js";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({
  recordFailure: vi.fn(),
  resetLimit: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({ db: mockDb }));
vi.mock("@reading-advantage/db/schema", () => ({
  users: { id: "users.id", username: "users.username", password: "users.password" },
  accounts: {
    id: "accounts.id",
    userId: "accounts.user_id",
    providerId: "accounts.provider_id",
    password: "accounts.password",
  },
  schools: { id: "schools.id", name: "schools.name" },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
}));
vi.mock("@reading-advantage/auth", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/auth")>(
    "@reading-advantage/auth",
  );
  return {
    ...actual,
    ...authMocks,
    createSession: vi.fn().mockResolvedValue({ token: "session-token" }),
    checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
    SESSION_COOKIE_NAME: "session_token",
    recordAuditEvent: vi.fn().mockResolvedValue(undefined),
    configurePostgresRateLimiter: vi.fn(),
  };
});

/** Builds a chainable select stub that resolves to the given rows. */
function selectResult(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
    }),
  };
}

/** Builds a transaction mock that records the credential row and the users update. */
function mockTransaction() {
  const written: { password?: string } = {};
  const setUsers = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
  const tx = {
    insert: () => ({
      values: (row: { password: string }) => {
        written.password = row.password;
        return { onConflictDoUpdate: () => ({ returning: vi.fn().mockResolvedValue([{ id: "u_credential" }]) }) };
      },
    }),
    update: () => ({ set: setUsers }),
  };
  mockDb.transaction.mockImplementation(async (cb: (t: unknown) => Promise<void>) => cb(tx));
  return { written, setUsers };
}

const baseUser = { id: "u1", username: "teacher1", name: "Teacher", role: "TEACHER", schoolId: "s1" };

/** Queues the selects for one login attempt. */
function queueLogin(user: Record<string, unknown>, accountRows: unknown[]) {
  mockDb.select
    .mockReturnValueOnce(selectResult([user]))
    .mockReturnValueOnce(selectResult(accountRows))
    .mockReturnValueOnce(selectResult([{ xp: 0, level: 1, cefrLevel: "A1-", email: null, image: null }]));
}

/** Builds a login request. */
function req(password: string) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "teacher1", password }),
    headers: { "Content-Type": "application/json" },
  });
}

const handleLegacy = createLoginHandler({ legacyUsersPasswordFallback: true });

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.select.mockReset();
  mockDb.transaction.mockReset();
});

vi.setConfig({ testTimeout: 30000 });

describe("dummy hash (timing oracle)", () => {
  it("is a valid Argon2id hash with the production parameters", async () => {
    const hash = await getDummyHash();
    expect(hash.startsWith("$argon2id$")).toBe(true);
    const { memoryCost, timeCost, parallelism } = ARGON2ID_OPTS;
    expect(hash).toContain(`m=${memoryCost},t=${timeCost},p=${parallelism}`);
  });

  it("is built once and cached", async () => {
    expect(await getDummyHash()).toBe(await getDummyHash());
  });

  it("verifies without throwing and rejects a guess", async () => {
    const hash = await getDummyHash();
    await expect(verifyPassword("Password123!", hash)).resolves.toBe(false);
  });
});

describe("real legacy password login", () => {
  it("adopts a correct bcrypt legacy password as an Argon2id credential hash", async () => {
    const bcrypt = await import("bcryptjs");
    const legacy = await bcrypt.hash("Password123!", 4);
    const tx = mockTransaction();
    queueLogin({ ...baseUser, password: legacy }, []);

    const response = await handleLegacy(req("Password123!"));

    expect(response.status).toBe(200);
    expect(tx.written.password?.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword("Password123!", tx.written.password!)).toBe(true);
    expect(tx.setUsers).toHaveBeenCalledWith({ password: null });
  });

  it("returns 401 and records a failure for a wrong legacy password", async () => {
    const legacy = await hashPassword("Password123!");
    const tx = mockTransaction();
    queueLogin({ ...baseUser, password: legacy }, []);

    const response = await handleLegacy(req("WrongPassword1!"));

    expect(response.status).toBe(401);
    expect(authMocks.recordFailure).toHaveBeenCalled();
    expect(tx.written.password).toBeUndefined();
  });

  it("falls back to users.password when the credential row has a null password", async () => {
    const legacy = await hashPassword("Password123!");
    mockTransaction();
    queueLogin({ ...baseUser, password: legacy }, [{ userId: "u1", providerId: "credential", password: null }]);

    expect((await handleLegacy(req("Password123!"))).status).toBe(200);
  });
});

describe("legacy fallback is opt-in", () => {
  it("handleLogin rejects a legacy-only row with 401 and records a failure", async () => {
    const legacy = await hashPassword("Password123!");
    queueLogin({ ...baseUser, password: legacy }, []);

    const response = await handleLogin(req("Password123!"));

    expect(response.status).toBe(401);
    expect(authMocks.recordFailure).toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it("createLoginHandler({}) also keeps the fallback off", async () => {
    const legacy = await hashPassword("Password123!");
    queueLogin({ ...baseUser, password: legacy }, []);

    expect((await createLoginHandler({})(req("Password123!"))).status).toBe(401);
  });
});

describe("password length", () => {
  it("rejects a password longer than 128 characters with 400", async () => {
    expect((await handleLogin(req("a".repeat(129)))).status).toBe(400);
  });
});
