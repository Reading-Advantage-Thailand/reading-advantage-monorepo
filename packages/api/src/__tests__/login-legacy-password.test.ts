/**
 * Legacy Primary Advantage rows keep the password hash on users.password only.
 * The shared login must verify that hash and adopt it into the credential
 * account (bcrypt becomes Argon2id).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { handleLogin } from "../routes/auth/login.js";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({
  adoptLegacyPassword: vi.fn().mockResolvedValue(undefined),
  rehashOnLogin: vi.fn().mockResolvedValue({ migrated: false }),
  verifyPassword: vi.fn().mockResolvedValue(true),
}));

vi.mock("@reading-advantage/db", () => ({ db: mockDb }));
vi.mock("@reading-advantage/db/schema", () => ({
  users: { id: "users.id", username: "users.username" },
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
    recordFailure: vi.fn(),
    resetLimit: vi.fn(),
    SESSION_COOKIE_NAME: "session_token",
    recordAuditEvent: vi.fn().mockResolvedValue(undefined),
  };
});

/**
 * Builds a Drizzle select stub that resolves to the given rows.
 * @param rows The rows to return.
 * @returns A chainable select result.
 */
function selectResult(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

const userRow = {
  id: "u1",
  username: "teacher1",
  name: "Teacher",
  role: "TEACHER",
  schoolId: "s1",
  password: "$2a$10$legacyhashlegacyhashlegacyhashlegacyhashlegacyhash",
};

/**
 * Queues the select results for one login attempt.
 * @param accountRows The credential account rows.
 */
function queueLogin(accountRows: unknown[]) {
  mockDb.select
    .mockReturnValueOnce(selectResult([userRow]))
    .mockReturnValueOnce(selectResult(accountRows))
    .mockReturnValueOnce(
      selectResult([{ xp: 0, level: 1, cefrLevel: "A1-", email: null, image: null }]),
    );
}

/**
 * Sends a login request.
 * @returns The route response.
 */
function login() {
  return handleLogin(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "teacher1", password: "Password123!" }),
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.select.mockReset();
  authMocks.verifyPassword.mockResolvedValue(true);
});

describe("login with a legacy users.password hash", () => {
  it("verifies users.password when no credential account exists and adopts it", async () => {
    queueLogin([]);

    const response = await login();

    expect(response.status).toBe(200);
    expect(authMocks.verifyPassword).toHaveBeenCalledWith("Password123!", userRow.password);
    expect(authMocks.adoptLegacyPassword).toHaveBeenCalledWith(
      mockDb,
      "u1",
      "Password123!",
      userRow.password,
    );
    expect(authMocks.rehashOnLogin).not.toHaveBeenCalled();
  });

  it("rejects a wrong password against the legacy hash", async () => {
    authMocks.verifyPassword.mockResolvedValue(false);
    queueLogin([]);

    const response = await login();

    expect(response.status).toBe(401);
    expect(authMocks.adoptLegacyPassword).not.toHaveBeenCalled();
  });

  it("prefers the credential account hash and rehashes it", async () => {
    queueLogin([{ userId: "u1", providerId: "credential", password: "$2a$10$accounthash" }]);

    const response = await login();

    expect(response.status).toBe(200);
    expect(authMocks.verifyPassword).toHaveBeenCalledWith("Password123!", "$2a$10$accounthash");
    expect(authMocks.rehashOnLogin).toHaveBeenCalledWith(
      mockDb,
      "u1",
      "Password123!",
      "$2a$10$accounthash",
    );
    expect(authMocks.adoptLegacyPassword).not.toHaveBeenCalled();
  });
});
