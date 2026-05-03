import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { handleImpersonate } from "../routes/auth/impersonate.js";
import { handleLogin } from "../routes/auth/login.js";
import { handleRegister } from "../routes/auth/register.js";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({
  db: mockDb,
}));

vi.mock("@reading-advantage/db/schema", () => ({
  users: {
    id: "users.id",
    username: "users.username",
  },
  accounts: {
    userId: "accounts.user_id",
    providerId: "accounts.provider_id",
  },
  schools: {
    id: "schools.id",
    name: "schools.name",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ type: "eq", col, val })),
  and: vi.fn((...conds: unknown[]) => ({ type: "and", conds })),
}));

vi.mock("@reading-advantage/auth", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/auth")>(
    "@reading-advantage/auth"
  );
  return {
    ...actual,
    hashPassword: vi.fn().mockResolvedValue("hash"),
    verifyPassword: vi.fn().mockResolvedValue(true),
    createSession: vi.fn().mockResolvedValue({ token: "session-token" }),
    checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
    recordFailure: vi.fn(),
    resetLimit: vi.fn(),
    SESSION_COOKIE_NAME: "session_token",
  };
});

function jsonRequest(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function selectResult(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

describe("auth route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  it("rejects registration with unknown school ID", async () => {
    mockDb.select
      .mockReturnValueOnce(selectResult([]))
      .mockReturnValueOnce(selectResult([]));

    const response = await handleRegister(
      jsonRequest("/api/auth/register", {
        username: "student1",
        password: "Password123!",
        name: "Student One",
        schoolId: "550e8400-e29b-41d4-a716-446655440001",
      })
    );

    expect(response.status).toBe(400);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("rejects registration when schoolId field is missing", async () => {
    const response = await handleRegister(
      jsonRequest("/api/auth/register", {
        username: "student1",
        password: "Password123!",
        name: "Student One",
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Invalid input");
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("creates user and account atomically for valid registration", async () => {
    const createdUser = {
      id: "new-user-id",
      username: "student1",
      name: "Student One",
      role: "STUDENT",
      schoolId: "550e8400-e29b-41d4-a716-446655440001",
    };

    const txInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdUser]),
      }),
    });

    const txMock = { insert: txInsert };

    mockDb.select
      .mockReturnValueOnce(selectResult([]))
      .mockReturnValueOnce(
        selectResult([{ id: "550e8400-e29b-41d4-a716-446655440001" }])
      );

    mockDb.transaction.mockImplementation(async (fn: unknown) =>
      (fn as (tx: typeof txMock) => Promise<unknown>)(txMock)
    );

    const response = await handleRegister(
      jsonRequest("/api/auth/register", {
        username: "student1",
        password: "Password123!",
        name: "Student One",
        schoolId: "550e8400-e29b-41d4-a716-446655440001",
      })
    );

    expect(response.status).toBe(200);
    expect(txInsert).toHaveBeenCalledTimes(2); // user + account insert

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.username).toBe("student1");
    expect(body.user.schoolId).toBe("550e8400-e29b-41d4-a716-446655440001");
  });

  it("blocks impersonation in production even when DEV_AUTH_ENABLED is true", async () => {
    process.env.NODE_ENV = "production";
    process.env.DEV_AUTH_ENABLED = "true";

    const response = await handleImpersonate(
      jsonRequest("/api/auth/impersonate", { userId: "admin_demo" })
    );

    expect(response.status).toBe(404);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("looks up credential accounts deterministically during login", async () => {
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            id: "u1",
            username: "student1",
            name: "Student One",
            role: "STUDENT",
            schoolId: "s1",
          },
        ])
      )
      .mockReturnValueOnce(
        selectResult([
          {
            userId: "u1",
            providerId: "credential",
            password: "hash",
          },
        ])
      );

    const response = await handleLogin(
      jsonRequest("/api/auth/login", {
        username: "student1",
        password: "Password123!",
      })
    );

    expect(response.status).toBe(200);
    const accountWhere = mockDb.select.mock.results[1]?.value.from.mock.results[0]?.value.where;
    expect(accountWhere).toHaveBeenCalledWith({
      type: "and",
      conds: [
        { type: "eq", col: "accounts.user_id", val: "u1" },
        { type: "eq", col: "accounts.provider_id", val: "credential" },
      ],
    });
  });

  it("succeeds with credential login even when user has multiple provider accounts", async () => {
    // Simulate a user who has both "credential" and "google" provider accounts.
    // The login query filters by providerId === "credential", so only the
    // credential row is considered regardless of other provider rows.
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            id: "u1",
            username: "student1",
            name: "Student One",
            role: "STUDENT",
            schoolId: "s1",
          },
        ])
      )
      .mockReturnValueOnce(
        selectResult([
          {
            userId: "u1",
            providerId: "credential",
            password: "hash",
          },
        ])
      );

    const response = await handleLogin(
      jsonRequest("/api/auth/login", {
        username: "student1",
        password: "Password123!",
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.id).toBe("u1");
    expect(body.user.role).toBe("STUDENT");
  });
});
