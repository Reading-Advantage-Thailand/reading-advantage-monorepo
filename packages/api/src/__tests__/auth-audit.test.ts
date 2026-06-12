/**
 * Phase 2 — Task 16: FR-9 audit events for login and password reset
 *
 * Driven by `measure/tracks/auth_security_hardening_20260611/plan.md`
 * Phase 2 Task 16 and `test-strategy.md` §3.
 *
 * The plan requires three audit events to be emitted (fire-and-forget):
 *   - handleLogin success → `recordAuditEvent(... { action: "auth:login" })`
 *   - handleLogin wrong-password failure → `action: "auth:login_failed"`
 *   - handleResetPassword success → `action: "auth:password_reset"` with
 *     `targetType: "user"` and `targetId: userId`
 *
 * Per test-strategy §3, the DB-infrastructure-error branch must NOT
 * emit `auth:login_failed` — that action is for credential failures only.
 * The test below adds a negative assertion for that case.
 *
 * The current implementation calls neither handleLogin nor
 * handleResetPassword on recordAuditEvent, so all assertions fail in the
 * Red state.
 *
 * Test command (targeted, no DB / no network):
 *   cd packages/api && npx vitest run src/__tests__/auth-audit.test.ts
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

const mockRecordAuditEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

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
  },
  schools: { id: "schools.id", name: "schools.name" },
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
    recordAuditEvent: mockRecordAuditEvent,
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

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
});

describe("Phase 2 — Task 16: FR-9 audit events in handleLogin and handleResetPassword", () => {
  it("emits 'auth:login' on a successful login", async () => {
    const auth = await import("@reading-advantage/auth");
    vi.mocked(auth.verifyPassword).mockResolvedValue(true);
    vi.mocked(auth.createSession).mockResolvedValue({
      id: "s1",
      token: "session-token",
      userId: "u1",
      expiresAt: new Date(Date.now() + 86400000),
      user: {
        id: "u1",
        username: "student1",
        name: "Student One",
        role: "STUDENT",
        schoolId: "s1",
        xp: 0,
        level: 0,
        cefrLevel: "A1",
      },
    });

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
          { userId: "u1", providerId: "credential", password: "hash" },
        ])
      );

    const response = await handleLogin(
      jsonRequest("/api/auth/login", {
        username: "student1",
        password: "Password123!",
      })
    );

    expect(response.status).toBe(200);
    const calls = mockRecordAuditEvent.mock.calls;
    const loginEvents = calls.filter(
      (c) => (c[1] as { action?: string } | undefined)?.action === "auth:login"
    );
    expect(
      loginEvents.length,
      "Expected handleLogin to call recordAuditEvent with action: 'auth:login' " +
        "after a successful login. The current implementation does not " +
        "emit any audit event, leaving the audit_events table blind to " +
        "successful authentications.",
    ).toBeGreaterThan(0);
  });

  it("emits 'auth:login_failed' on a wrong-password failure", async () => {
    const auth = await import("@reading-advantage/auth");
    vi.mocked(auth.verifyPassword).mockResolvedValue(false);

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
          { userId: "u1", providerId: "credential", password: "hash" },
        ])
      );

    const response = await handleLogin(
      jsonRequest("/api/auth/login", {
        username: "student1",
        password: "wrong-password",
      })
    );

    expect(response.status).toBe(401);
    const calls = mockRecordAuditEvent.mock.calls;
    const failedEvents = calls.filter(
      (c) =>
        (c[1] as { action?: string } | undefined)?.action === "auth:login_failed"
    );
    expect(
      failedEvents.length,
      "Expected handleLogin to call recordAuditEvent with action: 'auth:login_failed' " +
        "after a wrong-password failure. FR-9 closes the audit gap so " +
        "investigators can correlate failed login attempts with sessions, " +
        "IPs, and rate-limit pressure.",
    ).toBeGreaterThan(0);
  });

  it("does NOT emit 'auth:login_failed' on a DB infrastructure error", async () => {
    // The DB error branch must return 503 (FR-5) and NOT call
    // recordAuditEvent with auth:login_failed — that action is reserved
    // for credential failures. A DB blip is not a credential failure.
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

    expect(response.status).toBe(503);
    const failedEvents = mockRecordAuditEvent.mock.calls.filter(
      (c) =>
        (c[1] as { action?: string } | undefined)?.action === "auth:login_failed"
    );
    expect(
      failedEvents.length,
      "Expected handleLogin NOT to emit auth:login_failed on a DB error — " +
        "a DB blip is not a credential failure, and recording it as one " +
        "would pollute the auth:login_failed metric with non-attack noise.",
    ).toBe(0);
  });
});
