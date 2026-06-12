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
    requireAuth: vi.fn(),
    requireRole: vi.fn(),
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

  it("returns 401 when user lookup throws a DB error (not 500)", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error("connection refused")),
        }),
      }),
    });

    const response = await handleLogin(
      jsonRequest("/api/auth/login", {
        username: "student1",
        password: "Password123!",
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe("Invalid username or password");
  });

  it("returns 401 when account lookup throws a DB error (not 500)", async () => {
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
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error("connection timeout")),
          }),
        }),
      });

    const response = await handleLogin(
      jsonRequest("/api/auth/login", {
        username: "student1",
        password: "Password123!",
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe("Invalid username or password");
  });

  it("returns 401 when verifyPassword throws (not 500)", async () => {
    const { verifyPassword } = await import("@reading-advantage/auth");
    vi.mocked(verifyPassword).mockRejectedValueOnce(new Error("hash parse error"));

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
            password: "invalid-hash",
          },
        ])
      );

    const response = await handleLogin(
      jsonRequest("/api/auth/login", {
        username: "student1",
        password: "Password123!",
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe("Invalid username or password");
  });

  it("returns 401 and does not create a session when password verification fails", async () => {
    const { createSession, recordFailure, verifyPassword } = await import("@reading-advantage/auth");
    vi.mocked(verifyPassword).mockResolvedValueOnce(false);

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
        username: "Student1",
        password: "wrong-password",
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe("Invalid username or password");
    expect(recordFailure).toHaveBeenCalledWith("student1");
    expect(createSession).not.toHaveBeenCalled();
  });

  it("returns 401 and does not verify a password when credential password is missing", async () => {
    const { createSession, recordFailure, verifyPassword } = await import("@reading-advantage/auth");

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
            password: null,
          },
        ])
      );

    const response = await handleLogin(
      jsonRequest("/api/auth/login", {
        username: "student1",
        password: "Password123!",
      })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.message).toBe("Invalid username or password");
    expect(recordFailure).toHaveBeenCalledWith("student1");
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(createSession).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Task 14: FR-4 / FR-5 / FR-6 / FR-11
// ---------------------------------------------------------------------------
//
// FR-4: When the user is not found, call `await verifyPassword(password,
//       DUMMY_HASH)` before returning 401 so the unknown-username branch
//       pays the same Argon2id cost as the wrong-password branch.
// FR-5: When a DB query throws during login, return 503 (not 401) and do
//       NOT call `recordFailure` — the failure was infrastructure, not
//       a credential failure, so the rate limiter must not be touched.
// FR-6: `handleRegister` must be gated behind a TEACHER/ADMIN session —
//       a request without a valid `session_token` cookie returns 401.
// FR-11: `handleImpersonate` must require `IMPERSONATION_ENABLED === "true"`
//        in addition to `NODE_ENV !== "production"`. Default deny when
//        the env var is unset.
//
// RED expectations (current state):
//   - FR-4: handleLogin returns 401 directly without calling
//     verifyPassword in the unknown-user branch. The mock captures
//     verifyPassword calls and asserts it WAS called with DUMMY_HASH.
//   - FR-5: handleLogin returns 401 in the DB-error branch and calls
//     recordFailure. Green must remove the recordFailure call and
//     return 503.
//   - FR-6: handleRegister accepts unauthenticated self-signup and
//     returns 200/201. Green must add a session gate that returns 401.
//   - FR-11: handleImpersonate returns 200 with NODE_ENV=test. Green
//     must return 404 when IMPERSONATION_ENABLED is unset.
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 14: FR-4/FR-5/FR-6/FR-11 in the auth route handlers", () => {
  describe("FR-4: dummy-hash timing in the unknown-username branch", () => {
    it("calls verifyPassword(password, DUMMY_HASH) when the user is not found", async () => {
      const auth = await import("@reading-advantage/auth");
      const verifyPassword = vi.mocked(auth.verifyPassword);
      const dummyHash = (auth as { DUMMY_HASH?: string }).DUMMY_HASH;
      expect(
        dummyHash,
        "Phase 1 Task 8 requires login.ts to export a `DUMMY_HASH` " +
          "constant. If the constant is missing, the FR-4 timing fix has " +
          "no value to fall back on.",
      ).toBeTypeOf("string");

      // Unknown user: the first select returns []. The current
      // implementation returns 401 directly without calling
      // verifyPassword. After Green, verifyPassword MUST be awaited
      // with the dummy hash before the 401 is returned.
      mockDb.select.mockReturnValueOnce(selectResult([]));

      const response = await handleLogin(
        jsonRequest("/api/auth/login", {
          username: "nobody",
          password: "Password123!",
        })
      );

      expect(response.status, "FR-4 does not change the response status — the user still sees 401.").toBe(401);
      expect(
        verifyPassword,
        "Expected handleLogin to call verifyPassword even when the user " +
          "is not found, with DUMMY_HASH as the second arg, so the " +
          "unknown-username branch pays the same Argon2id cost as the " +
          "wrong-password branch. The current implementation skips the " +
          "verify call entirely, leaking a username-enumeration timing " +
          "oracle.",
      ).toHaveBeenCalledWith("Password123!", dummyHash);
    });

    it("calls verifyPassword(password, DUMMY_HASH) when the account row has no password", async () => {
      const auth = await import("@reading-advantage/auth");
      const verifyPassword = vi.mocked(auth.verifyPassword);
      const dummyHash = (auth as { DUMMY_HASH?: string }).DUMMY_HASH;

      // User found, credential account has password: null.
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
              password: null,
            },
          ])
        );

      const response = await handleLogin(
        jsonRequest("/api/auth/login", {
          username: "student1",
          password: "Password123!",
        })
      );

      expect(response.status).toBe(401);
      expect(
        verifyPassword,
        "Expected handleLogin to call verifyPassword with DUMMY_HASH when " +
          "the credential account has no password (orphaned user), so the " +
          "branch pays the same Argon2id cost as the wrong-password branch.",
      ).toHaveBeenCalledWith("Password123!", dummyHash);
    });
  });

  describe("FR-5: DB infrastructure failures return 503, do not touch the rate limiter", () => {
    it("returns 503 (not 401) and does not call recordFailure when user lookup throws", async () => {
      const { recordFailure } = await import("@reading-advantage/auth");

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error("connection refused")),
          }),
        }),
      });

      const response = await handleLogin(
        jsonRequest("/api/auth/login", {
          username: "student1",
          password: "Password123!",
        })
      );

      expect(
        response.status,
        "Expected a 503 Service Unavailable when the user-lookup DB " +
          "query throws — the current implementation returns 401, which " +
          "implies wrong credentials and confuses the rate-limit policy " +
          "with credential failures. FR-5 distinguishes infrastructure " +
          "failures from credential failures.",
      ).toBe(503);
      expect(
        recordFailure,
        "Expected recordFailure NOT to be called when a DB infrastructure " +
          "error happens — the rate limiter must only count credential " +
          "failures, otherwise a DB blip would lock every legitimate user " +
          "out.",
      ).not.toHaveBeenCalled();
    });

    it("returns 503 (not 401) when account lookup throws", async () => {
      const { recordFailure } = await import("@reading-advantage/auth");

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
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error("connection timeout")),
            }),
          }),
        });

      const response = await handleLogin(
        jsonRequest("/api/auth/login", {
          username: "student1",
          password: "Password123!",
        })
      );

      expect(response.status).toBe(503);
      expect(recordFailure).not.toHaveBeenCalled();
    });
  });

  describe("FR-6: handleRegister requires an authenticated TEACHER/ADMIN session", () => {
    it("returns 401 when the request has no session_token cookie", async () => {
      const { createSession } = await import("@reading-advantage/auth");

      // No cookie on the request. Current implementation accepts this
      // and proceeds with self-signup. After Green, it must return 401.
      const response = await handleRegister(
        jsonRequest("/api/auth/register", {
          username: "student1",
          password: "Password123!",
          name: "Student One",
          schoolId: "550e8400-e29b-41d4-a716-446655440001",
        })
      );

      expect(
        response.status,
        "Expected handleRegister to return 401 when the request has no " +
          "session cookie. The current implementation accepts " +
          "unauthenticated self-signup, which violates the product spec " +
          "(users are imported by admin/teacher only).",
      ).toBe(401);
      expect(
        mockDb.insert,
        "Expected handleRegister NOT to write any row when unauthenticated.",
      ).not.toHaveBeenCalled();
      expect(
        createSession,
        "Expected handleRegister NOT to call createSession when " +
          "unauthenticated — the gated endpoint is an admin operation, " +
          "not an auth-state transition.",
      ).not.toHaveBeenCalled();
    });
  });

  describe("FR-11: handleImpersonate requires IMPERSONATION_ENABLED === 'true'", () => {
    it("returns 404 when NODE_ENV=test but IMPERSONATION_ENABLED is unset", async () => {
      // Per the test-strategy §5, CI=true is mandatory for some tests
      // but FR-11 is environment-flag gating, so we explicitly clear
      // the env var to simulate a misconfigured staging deploy.
      const previousNodeEnv = process.env.NODE_ENV;
      const previousFlag = process.env.IMPERSONATION_ENABLED;
      process.env.NODE_ENV = "test";
      delete process.env.IMPERSONATION_ENABLED;

      try {
        const response = await handleImpersonate(
          jsonRequest("/api/auth/impersonate", { userId: "admin_demo" })
        );

        expect(
          response.status,
          "Expected handleImpersonate to return 404 in a non-production " +
            "environment when IMPERSONATION_ENABLED is unset. The current " +
            "implementation only checks NODE_ENV !== 'production', so a " +
            "misconfigured staging deploy would expose impersonation.",
        ).toBe(404);
        expect(
          mockDb.insert,
          "Expected no DB writes when impersonation is denied.",
        ).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = previousNodeEnv;
        if (previousFlag !== undefined) {
          process.env.IMPERSONATION_ENABLED = previousFlag;
        }
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Task 35: FR-12 login returns full AuthUser
// ---------------------------------------------------------------------------
//
// FR-12: handleLogin must return the full AuthUser shape (xp, level,
//        cefrLevel, email, image, schoolId), not just the basic fields.
//        The provider in auth-client relies on xp/level/cefrLevel — when
//        they are missing, downstream computations like
//        `(user?.level as number) * 30` produce NaN.
//
// Test strategy:
//   - Drive a successful login (correct password, valid credential account).
//   - Parse the response body and assert xp, level, cefrLevel, email,
//     image are all defined (not undefined / null).
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 35: FR-12 handleLogin returns the full AuthUser shape", () => {
  it("the response body's user includes xp, level, cefrLevel, email, image", async () => {
    const auth = await import("@reading-advantage/auth");
    vi.mocked(auth.verifyPassword).mockResolvedValue(true);

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
    expect(
      body.user,
      "Expected handleLogin to return a `user` object on the response body.",
    ).toBeDefined();
    expect(
      body.user.xp,
      "Expected the user response to include `xp` so auth-client and the " +
        "consumer apps can read it without an extra round-trip. The " +
        "current implementation only returns basic fields — apps that " +
        "SPA-navigate after login see `undefined` until a hard reload.",
    ).toBeDefined();
    expect(
      body.user.level,
      "Expected the user response to include `level`. The current " +
        "implementation does not include it; primary-advantage's " +
        "`la-question-content.tsx` then computes `(undefined as number) * " +
        "30` = NaN, breaking the lesson zod validation.",
    ).toBeDefined();
    expect(
      body.user.cefrLevel,
      "Expected the user response to include `cefrLevel`. The current " +
        "implementation does not include it.",
    ).toBeDefined();
    expect(
      body.user.email,
      "Expected the user response to include `email` (may be null for " +
        "credential-only users, but the key must exist).",
    ).not.toBeUndefined();
    expect(
      body.user.image,
      "Expected the user response to include `image` (may be null).",
    ).not.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Task 38: FR-16 register no longer self-authenticates
// ---------------------------------------------------------------------------
//
// FR-16: handleRegister (after FR-6 gating) must NOT create a session
//        for the registered user — the gated endpoint is an admin
//        operation, not an auth-state transition. The current
//        implementation creates a session and sets the session_token
//        cookie, which would replace the teacher's own session with
//        the new student's session.
//
// Test strategy:
//   - Drive a successful gated registration (skip the FR-6 gate
//     using a session-mock if necessary; we just need the post-gate
//     branch where the handler proceeds to insert + return).
//   - Assert no session_token cookie is set on the response.
//   - Assert createSession is not called.
//   - Assert the response status is 201 (per spec: the created user is
//     returned, not the session).
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 38: FR-16 register does NOT self-authenticate", () => {
  it("the response status is 201 and no session_token cookie is set", async () => {
    const { createSession } = await import("@reading-advantage/auth");

    // Stub the session gate to bypass FR-6 in this test — the FR-6 test
    // (above) covers the gate. Here we focus on the FR-16 contract: the
    // successful-gated-register path must not set a session cookie.
    vi.mocked(requireAuth).mockResolvedValueOnce({
      id: "teacher-session",
      token: "teacher-token",
      userId: "teacher-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: {
        id: "teacher-1",
        username: "teacher1",
        name: "Teacher One",
        role: "TEACHER",
        schoolId: "550e8400-e29b-41d4-a716-446655440001",
        xp: 0,
        level: 0,
        cefrLevel: "",
      },
    });
    vi.mocked(requireRole).mockResolvedValueOnce({
      id: "teacher-session",
      token: "teacher-token",
      userId: "teacher-1",
      expiresAt: new Date(Date.now() + 86400000),
      user: {
        id: "teacher-1",
        username: "teacher1",
        name: "Teacher One",
        role: "TEACHER",
        schoolId: "550e8400-e29b-41d4-a716-446655440001",
        xp: 0,
        level: 0,
        cefrLevel: "",
      },
    });

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

    const request = jsonRequest("/api/auth/register", {
      username: "student1",
      password: "Password123!",
      name: "Student One",
      schoolId: "550e8400-e29b-41d4-a716-446655440001",
    });
    request.cookies.set("session_token", "teacher-token");

    const response = await handleRegister(request);

    expect(
      response.status,
      "Expected handleRegister to return 201 (created) for a successful " +
        "teacher-gated registration. The current implementation returns " +
        "200 (OK) with a session cookie, conflating the response with a " +
        "self-signup flow.",
    ).toBe(201);
    const setCookies = response.cookies.getAll();
    const sessionCookie = setCookies.find((c) => c.name === "session_token");
    expect(
      sessionCookie,
      "Expected handleRegister NOT to set a session_token cookie — the " +
        "gated register endpoint is an admin operation, not an auth-state " +
        "transition. Setting a cookie here would replace the teacher's " +
        "own session with the new student's session.",
    ).toBeUndefined();
    expect(
      createSession,
      "Expected handleRegister NOT to call createSession. The gated " +
        "endpoint returns the created user, not a session.",
    ).not.toHaveBeenCalled();
  });
});
