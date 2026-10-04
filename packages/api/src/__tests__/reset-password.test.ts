/**
 * Phase 2 — Task 15: FR-7b reset-password route handler
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 2 Task 15 and `test-strategy.md` §3.
 *
 * The reset-password route is gated behind a TEACHER/ADMIN session, with
 * a 7-row authorization matrix:
 *
 *   actor      target             expected
 *   ──────     ──────             ────────
 *   no session —                  401
 *   STUDENT   any                 403
 *   TEACHER   STUDENT (same)      200 + password updated + prior sessions revoked
 *   TEACHER   STUDENT (diff)      403
 *   TEACHER   TEACHER             403
 *   ADMIN     STUDENT (any)       200
 *   ADMIN     ADMIN               403
 *
 * The Phase 1 stub returns 501 Not Implemented — every assertion in this
 * file fails in the Red state. The Green implementer fills in the
 * matrix logic in Task 24 and wires the app routes in
 * `apps/{science,codecamp,primary}-advantage/app/api/auth/reset-password/route.ts`.
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/api && npx vitest run src/__tests__/reset-password.test.ts
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { handleResetPassword, createResetPasswordHandler } from "../routes/auth/reset-password.js";
import { requireAuth, requireRole, hashPassword, revokeAllUserSessions, recordAuditEvent, AuthError } from "@reading-advantage/auth";

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({
  db: mockDb,
}));

vi.mock("@reading-advantage/db/schema", () => ({
  users: {
    id: "users.id",
    username: "users.username",
    name: "users.name",
    role: "users.role",
    schoolId: "users.school_id",
    xp: "users.xp",
    level: "users.level",
    cefrLevel: "users.cefr_level",
    email: "users.email",
    image: "users.image",
  },
  accounts: {
    id: "accounts.id",
    userId: "accounts.user_id",
    providerId: "accounts.provider_id",
    password: "accounts.password",
    updatedAt: "accounts.updated_at",
  },
  sessions: {
    id: "sessions.id",
    userId: "sessions.user_id",
    tokenHash: "sessions.token_hash",
    token: "sessions.token",
    ipAddress: "sessions.ip_address",
    userAgent: "sessions.user_agent",
    expiresAt: "sessions.expires_at",
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
    hashPassword: vi.fn().mockResolvedValue("new-arg-hash"),
    requireAuth: vi.fn(),
    requireRole: vi.fn(),
    revokeAllUserSessions: vi.fn().mockResolvedValue({ revoked: 0 }),
    recordAuditEvent: vi.fn().mockResolvedValue(undefined),
  };
});

function jsonRequest(path: string, body: unknown, cookieToken?: string) {
  const req = new NextRequest(`http://localhost${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  if (cookieToken) {
    req.cookies.set("session_token", cookieToken);
  }
  return req;
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

function setActorSession(
  userId: string,
  role: "STUDENT" | "TEACHER" | "ADMIN" | "SALES_ADMIN" | "SYSTEM",
  schoolId: string | null
) {
  const session = {
    id: `sess-${userId}`,
    userId,
    expiresAt: new Date(Date.now() + 86400000),
    user: {
      id: userId,
      username: `${role.toLowerCase()}-${userId}`,
      name: role,
      role,
      schoolId,
      xp: 0,
      level: 0,
      cefrLevel: "A1",
    },
  };
  vi.mocked(requireRole).mockResolvedValueOnce(session as unknown as Awaited<ReturnType<typeof requireRole>>);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
});

describe("Phase 2 — Task 15: FR-7b reset-password authorization matrix", () => {
  it("rejects a SALES_ADMIN actor before database access", async () => {
    setActorSession("sales-1", "SALES_ADMIN", null);

    const response = await handleResetPassword(
      jsonRequest(
        "/api/auth/reset-password",
        { userId: "target-1", newPassword: "NewPassword123!" },
        "sales-1-token"
      )
    );

    expect(response.status).toBe(403);
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("returns 401 when the request has no session_token cookie", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new AuthError("Authentication required", "UNAUTHORIZED"),
    );

    const response = await handleResetPassword(
      jsonRequest("/api/auth/reset-password", {
        userId: "target-1",
        newPassword: "NewPassword123!",
      })
    );
    expect(response.status, "no session → 401").toBe(401);
  });

  it("returns 403 when a STUDENT actor attempts to reset any password", async () => {
    vi.mocked(requireRole).mockRejectedValueOnce(
      new AuthError("Requires role TEACHER or higher", "FORBIDDEN"),
    );
    const response = await handleResetPassword(
      jsonRequest(
        "/api/auth/reset-password",
        { userId: "target-1", newPassword: "NewPassword123!" },
        "student-actor-token"
      )
    );
    expect(response.status, "STUDENT actor → 403").toBe(403);
  });

  it("returns 200 for a TEACHER resetting a STUDENT in the same school, with prior sessions revoked", async () => {
    setActorSession("teacher-1", "TEACHER", "school-1");
    // Target student lookup (1st select)
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            id: "target-1",
            username: "target-student",
            name: "Target Student",
            role: "STUDENT",
            schoolId: "school-1",
          },
        ])
      )
      // Credential account lookup (2nd select)
      .mockReturnValueOnce(
        selectResult([{ id: "target-1_credential" }])
      );

    // update() returns the row count via .where() chain
    mockDb.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const response = await handleResetPassword(
      jsonRequest(
        "/api/auth/reset-password",
        { userId: "target-1", newPassword: "NewPassword123!" },
        "teacher-1-token"
      )
    );

    expect(response.status, "TEACHER + target STUDENT (same school) → 200").toBe(200);
    expect(
      vi.mocked(revokeAllUserSessions),
      "TEACHER reset must revoke all prior sessions for the target user."
    ).toHaveBeenCalledWith(mockDb, "target-1");
    expect(
      mockDb.update,
      "TEACHER reset must update the credential account's password."
    ).toHaveBeenCalled();
  });

  it("returns 403 when a TEACHER tries to reset a STUDENT in a different school", async () => {
    setActorSession("teacher-1", "TEACHER", "school-1");
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            id: "target-1",
            username: "target-student",
            name: "Target Student",
            role: "STUDENT",
            schoolId: "school-2",
          },
        ])
      );

    const response = await handleResetPassword(
      jsonRequest(
        "/api/auth/reset-password",
        { userId: "target-1", newPassword: "NewPassword123!" },
        "teacher-1-token"
      )
    );
    expect(response.status, "TEACHER + target STUDENT (different school) → 403").toBe(403);
  });

  it("returns 403 when a TEACHER tries to reset another TEACHER", async () => {
    setActorSession("teacher-1", "TEACHER", "school-1");
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            id: "target-2",
            username: "target-teacher",
            name: "Target Teacher",
            role: "TEACHER",
            schoolId: "school-1",
          },
        ])
      );

    const response = await handleResetPassword(
      jsonRequest(
        "/api/auth/reset-password",
        { userId: "target-2", newPassword: "NewPassword123!" },
        "teacher-1-token"
      )
    );
    expect(response.status, "TEACHER + target TEACHER → 403").toBe(403);
  });

  it("returns 200 when an ADMIN resets a STUDENT in any school", async () => {
    setActorSession("admin-1", "ADMIN", null);
    // Target student lookup (1st select)
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            id: "target-1",
            username: "target-student",
            name: "Target Student",
            role: "STUDENT",
            schoolId: "school-99",
          },
        ])
      )
      // Credential account lookup (2nd select)
      .mockReturnValueOnce(
        selectResult([{ id: "target-1_credential" }])
      );
    mockDb.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const response = await handleResetPassword(
      jsonRequest(
        "/api/auth/reset-password",
        { userId: "target-1", newPassword: "NewPassword123!" },
        "admin-1-token"
      )
    );
    expect(response.status, "ADMIN + target STUDENT (any school) → 200").toBe(200);
  });

  it("returns 403 when an ADMIN tries to reset another ADMIN", async () => {
    setActorSession("admin-1", "ADMIN", null);
    mockDb.select
      .mockReturnValueOnce(
        selectResult([
          {
            id: "target-2",
            username: "target-admin",
            name: "Target Admin",
            role: "ADMIN",
            schoolId: null,
          },
        ])
      );

    const response = await handleResetPassword(
      jsonRequest(
        "/api/auth/reset-password",
        { userId: "target-2", newPassword: "NewPassword123!" },
        "admin-1-token"
      )
    );
    expect(response.status, "ADMIN + target ADMIN → 403").toBe(403);
  });

  it.each(["SYSTEM", "SALES_ADMIN"] as const)(
    "returns 403 when an ADMIN tries to reset a %s user",
    async (targetRole) => {
      setActorSession("admin-1", "ADMIN", null);
      mockDb.select.mockReturnValueOnce(
        selectResult([
          {
            id: "target-2",
            username: "target-admin",
            name: "Target Admin",
            role: targetRole,
            schoolId: null,
          },
        ])
      );

      const response = await handleResetPassword(
        jsonRequest(
          "/api/auth/reset-password",
          { userId: "target-2", newPassword: "NewPassword123!" },
          "admin-1-token"
        )
      );

      expect(response.status).toBe(403);
      expect(mockDb.update).not.toHaveBeenCalled();
    }
  );

  it("scopes the target-user query by schoolId when the actor is TEACHER", async () => {
    setActorSession("teacher-1", "TEACHER", "school-1");

    // Capture the WHERE clause passed to the first select (target-user lookup).
    const whereMock = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([]),
    });
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: whereMock }),
    });

    await handleResetPassword(
      jsonRequest(
        "/api/auth/reset-password",
        { userId: "target-1", newPassword: "NewPassword123!" },
        "teacher-1-token"
      )
    );

    expect(
      whereMock,
      "TEACHER actors must filter the target-user lookup by schoolId at the query layer, " +
        "not only in post-fetch authorization checks.",
    ).toHaveBeenCalled();

    const whereArg = whereMock.mock.calls[0]?.[0];

    /** Recursively searches an object tree for a string value matching the predicate. */
    function deepContains(
      obj: unknown,
      predicate: (s: string) => boolean,
      seen = new Set<object>()
    ): boolean {
      if (typeof obj === "string") return predicate(obj);
      if (obj && typeof obj === "object") {
        if (seen.has(obj)) return false;
        seen.add(obj);
        return Object.values(obj).some((v) => deepContains(v, predicate, seen));
      }
      return false;
    }

    expect(
      deepContains(whereArg, (s) => s.includes("school_id")),
      "The target-user WHERE clause must reference users.schoolId for TEACHER actors.",
    ).toBe(true);
    expect(
      deepContains(whereArg, (s) => s.includes("school-1")),
      "The target-user WHERE clause must constrain schoolId to the TEACHER actor's school.",
    ).toBe(true);
    expect(
      deepContains(whereArg, (s) => s === "target-1"),
      "The target-user WHERE clause must still constrain the target userId.",
    ).toBe(true);
  });
});

describe("createResetPasswordHandler authorizeTarget", () => {
  const targetRow = (role: string, schoolId: string | null) =>
    selectResult([{ id: "target-1", username: "t", name: "T", role, schoolId }]);

  it("passes the actor and the unscoped target row to authorizeTarget and refuses on false", async () => {
    setActorSession("admin-1", "ADMIN", "school-1");
    mockDb.select.mockReturnValueOnce(targetRow("TEACHER", "school-2"));
    const authorizeTarget = vi.fn().mockResolvedValue(false);
    const handler = createResetPasswordHandler({ authorizeTarget });
    const response = await handler(
      jsonRequest("/api/auth/reset-password", { userId: "target-1", newPassword: "NewPassword123!" }, "tok"),
    );
    expect(response.status).toBe(403);
    expect(authorizeTarget).toHaveBeenCalledWith(
      { id: "admin-1", role: "ADMIN", schoolId: "school-1" },
      { id: "target-1", role: "TEACHER", schoolId: "school-2" },
    );
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("resets the password when authorizeTarget returns true", async () => {
    setActorSession("admin-1", "ADMIN", "school-1");
    mockDb.select
      .mockReturnValueOnce(targetRow("TEACHER", "school-1"))
      .mockReturnValueOnce(selectResult([{ id: "target-1_credential" }]));
    const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
    const txDeleteWhere = vi.fn().mockResolvedValue(undefined);
    const tx = {
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: txUpdateWhere }) }),
      delete: vi.fn().mockReturnValue({ where: txDeleteWhere }),
    };
    mockDb.transaction.mockImplementationOnce(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
    const handler = createResetPasswordHandler({ authorizeTarget: () => true });
    const response = await handler(
      jsonRequest("/api/auth/reset-password", { userId: "target-1", newPassword: "NewPassword123!" }, "tok"),
    );
    expect(response.status).toBe(200);
    expect(txUpdateWhere).toHaveBeenCalledTimes(1);
    expect(txDeleteWhere).toHaveBeenCalledTimes(1);
  });

  it("keeps the default matrix when no option is set", async () => {
    setActorSession("admin-1", "ADMIN", "school-1");
    mockDb.select
      .mockReturnValueOnce(targetRow("TEACHER", "school-2"))
      .mockReturnValueOnce(selectResult([{ id: "target-1_credential" }]));
    mockDb.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });
    const response = await handleResetPassword(
      jsonRequest("/api/auth/reset-password", { userId: "target-1", newPassword: "NewPassword123!" }, "tok"),
    );
    expect(response.status).toBe(200);
  });
});

describe("authorizeTarget path: atomic reset and no existence oracle", () => {
  const targetRow = (role: string, schoolId: string | null) =>
    selectResult([{ id: "target-1", username: "t", name: "T", role, schoolId }]);
  const body = { userId: "target-1", newPassword: "NewPassword123!" };

  it("updates the password and deletes sessions inside one transaction (L-1)", async () => {
    setActorSession("admin-1", "ADMIN", "school-1");
    mockDb.select
      .mockReturnValueOnce(targetRow("TEACHER", "school-1"))
      .mockReturnValueOnce(selectResult([{ id: "target-1_credential" }]));
    const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
    const txDeleteWhere = vi.fn().mockResolvedValue(undefined);
    const tx = {
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: txUpdateWhere }) }),
      delete: vi.fn().mockReturnValue({ where: txDeleteWhere }),
    };
    mockDb.transaction.mockImplementationOnce(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
    const handler = createResetPasswordHandler({ authorizeTarget: () => true });
    const response = await handler(jsonRequest("/api/auth/reset-password", body, "tok"));
    expect(response.status).toBe(200);
    expect(txUpdateWhere).toHaveBeenCalledTimes(1);
    expect(txDeleteWhere).toHaveBeenCalledTimes(1);
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(vi.mocked(revokeAllUserSessions)).not.toHaveBeenCalled();
  });

  it("keeps the password unchanged when session revocation fails (L-1)", async () => {
    setActorSession("admin-1", "ADMIN", "school-1");
    mockDb.select
      .mockReturnValueOnce(targetRow("TEACHER", "school-1"))
      .mockReturnValueOnce(selectResult([{ id: "target-1_credential" }]));
    const txUpdateWhere = vi.fn().mockResolvedValue(undefined);
    const tx = {
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: txUpdateWhere }) }),
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockRejectedValue(new Error("boom")) }),
    };
    // A real transaction rolls back when the callback throws; the handler must not catch it inside.
    mockDb.transaction.mockImplementationOnce(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
    const handler = createResetPasswordHandler({ authorizeTarget: () => true });
    const response = await handler(jsonRequest("/api/auth/reset-password", body, "tok"));
    expect(response.status).toBe(500);
    // The write and the revocation share one transaction; the top-level client writes nothing.
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(txUpdateWhere).toHaveBeenCalledTimes(1);
    expect(mockDb.update).not.toHaveBeenCalled();
    expect(vi.mocked(revokeAllUserSessions)).not.toHaveBeenCalled();
  });

  it("logs the effective actor rank that authorizeTarget returns (L-2)", async () => {
    setActorSession("co-admin", "TEACHER", "school-1");
    mockDb.select
      .mockReturnValueOnce(targetRow("STUDENT", "school-1"))
      .mockReturnValueOnce(selectResult([{ id: "target-1_credential" }]));
    const tx = {
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    };
    mockDb.transaction.mockImplementationOnce(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));
    const handler = createResetPasswordHandler({
      authorizeTarget: () => ({ allowed: true, actorRole: "ADMIN" }),
    });
    const response = await handler(jsonRequest("/api/auth/reset-password", body, "tok"));
    expect(response.status).toBe(200);
    expect(vi.mocked(recordAuditEvent)).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "co-admin", actorRole: "ADMIN" }),
      expect.objectContaining({ action: "auth:password_reset" }),
    );
  });

  it("answers an unknown id and another school's id with the same status and body (L-3)", async () => {
    setActorSession("admin-1", "ADMIN", "school-1");
    mockDb.select.mockReturnValueOnce(selectResult([]));
    const handler = createResetPasswordHandler({ authorizeTarget: () => false });
    const unknown = await handler(jsonRequest("/api/auth/reset-password", body, "tok"));
    setActorSession("admin-1", "ADMIN", "school-1");
    mockDb.select.mockReturnValueOnce(targetRow("TEACHER", "school-2"));
    const otherSchool = await handler(jsonRequest("/api/auth/reset-password", body, "tok"));
    expect(unknown.status).toBe(otherSchool.status);
    expect(await unknown.json()).toEqual(await otherSchool.json());
  });
});
