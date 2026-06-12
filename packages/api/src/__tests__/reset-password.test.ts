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
import { handleResetPassword } from "../routes/auth/reset-password.js";

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
  role: "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM",
  schoolId: string | null
) {
  const auth = require("@reading-advantage/auth") as unknown as {
    requireAuth: ReturnType<typeof vi.fn>;
    requireRole: ReturnType<typeof vi.fn>;
  };
  const session = {
    id: `sess-${userId}`,
    token: "actor-token",
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
  auth.requireAuth.mockResolvedValueOnce(session);
  auth.requireRole.mockResolvedValueOnce(session);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
});

describe("Phase 2 — Task 15: FR-7b reset-password authorization matrix", () => {
  it("returns 401 when the request has no session_token cookie", async () => {
    const auth = require("@reading-advantage/auth") as unknown as {
      requireAuth: ReturnType<typeof vi.fn>;
    };
    auth.requireAuth.mockRejectedValueOnce(
      Object.assign(new Error("Auth required"), {
        name: "AuthError",
        code: "UNAUTHORIZED",
      }),
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
    setActorSession("student-actor", "STUDENT", "school-1");
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
    // Target student lookup
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
      );

    const auth = require("@reading-advantage/auth") as unknown as {
      hashPassword: ReturnType<typeof vi.fn>;
      revokeAllUserSessions: ReturnType<typeof vi.fn>;
    };
    // update() returns the row count via .where().returning() chain
    mockDb.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ userId: "target-1" }]),
        }),
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
      auth.revokeAllUserSessions,
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
      );
    mockDb.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ userId: "target-1" }]),
        }),
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
});
