/**
 * FR-5 (Primary cutover): a temporary password opens no session; the user sets a new password
 * through the change handler first, and then signs in with it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createLoginHandler, PASSWORD_CHANGE_REQUIRED } from "../routes/auth/login.js";
import { createTemporaryPasswordChangeHandler } from "../routes/auth/temporary-password.js";

const mockDb = vi.hoisted(() => ({ select: vi.fn(), update: vi.fn() }));
const authMocks = vi.hoisted(() => ({
  rehashOnLogin: vi.fn().mockResolvedValue({ migrated: false }),
  verifyPassword: vi.fn().mockResolvedValue(true),
  hashPassword: vi.fn().mockResolvedValue("$argon2id$new"),
  createSession: vi.fn().mockResolvedValue({ token: "tok", expiresAt: new Date("2026-10-14T00:00:00Z") }),
  revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
  recordFailure: vi.fn(),
  resetLimit: vi.fn(),
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@reading-advantage/db", () => ({ db: mockDb }));
vi.mock("@reading-advantage/db/schema", () => ({
  users: { id: "users.id", username: "users.username" },
  accounts: { id: "a.id", userId: "a.user_id", providerId: "a.provider_id", password: "a.password", temporaryPasswordIssuedAt: "a.tmp" },
  schools: { id: "schools.id", name: "schools.name" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => ({})), and: vi.fn(() => ({})), isNotNull: vi.fn(() => ({})) }));
vi.mock("@reading-advantage/auth", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/auth")>("@reading-advantage/auth");
  return { ...actual, ...authMocks, checkRateLimit: vi.fn().mockReturnValue({ allowed: true }), SESSION_COOKIE_NAME: "session_token" };
});

const rows = (r: unknown[]) => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(r) }) }) });
const teacher = { id: "t1", username: "kru@school.ac.th", name: "Kru", role: "TEACHER", schoolId: "s1", password: null };
const issued = new Date("2026-10-07T00:00:00Z");

const post = (url: string, body: unknown) =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("login with a temporary password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReset();
  });

  it("opens no session and asks for a new password when the app enables the change", async () => {
    mockDb.select
      .mockReturnValueOnce(rows([teacher]))
      .mockReturnValueOnce(rows([{ password: "$argon2id$tmp", temporaryPasswordIssuedAt: issued }]));

    const res = await createLoginHandler({ temporaryPasswordChange: true })(post("http://localhost/api/auth/login", { username: "kru@school.ac.th", password: "kx7m-p3qa-zt" }));

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: PASSWORD_CHANGE_REQUIRED });
    expect(authMocks.createSession).not.toHaveBeenCalled();
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("keeps the normal login for an app that does not enable the change", async () => {
    mockDb.select
      .mockReturnValueOnce(rows([teacher]))
      .mockReturnValueOnce(rows([{ password: "$argon2id$tmp", temporaryPasswordIssuedAt: issued }]))
      .mockReturnValueOnce(rows([{ xp: 0, level: 1, cefrLevel: "A1-", email: null, image: null }]));

    const res = await createLoginHandler({})(post("http://localhost/api/auth/login", { username: "kru@school.ac.th", password: "pw" }));

    expect(res.status).toBe(200);
    expect(authMocks.createSession).toHaveBeenCalled();
  });
});

describe("temporary password change", () => {
  const returning = vi.fn();
  const change = (body: unknown) => createTemporaryPasswordChangeHandler()(post("http://localhost/api/auth/temporary-password", body));

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReset();
    returning.mockReset().mockResolvedValue([{ id: "acc1" }]);
    mockDb.update.mockReturnValue({ set: () => ({ where: () => ({ returning }) }) });
  });

  it("stores the new password, clears the mark, ends the sessions, and records the change", async () => {
    mockDb.select
      .mockReturnValueOnce(rows([teacher]))
      .mockReturnValueOnce(rows([{ password: "$argon2id$tmp", temporaryPasswordIssuedAt: issued }]));

    const res = await change({ username: "Kru@School.ac.th", password: "kx7m-p3qa-zt", newPassword: "a-new-secret-1" });

    expect(res.status).toBe(200);
    expect(authMocks.hashPassword).toHaveBeenCalledWith("a-new-secret-1");
    expect(authMocks.revokeAllUserSessions).toHaveBeenCalledWith(mockDb, "t1");
    expect(authMocks.recordAuditEvent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "auth:password_changed", targetId: "t1" }));
    expect(authMocks.createSession).not.toHaveBeenCalled();
  });

  it("refuses a wrong temporary password and counts the failure", async () => {
    authMocks.verifyPassword.mockResolvedValueOnce(false);
    mockDb.select
      .mockReturnValueOnce(rows([teacher]))
      .mockReturnValueOnce(rows([{ password: "$argon2id$tmp", temporaryPasswordIssuedAt: issued }]));

    const res = await change({ username: "kru@school.ac.th", password: "wrong-one", newPassword: "a-new-secret-1" });

    expect(res.status).toBe(401);
    expect(authMocks.recordFailure).toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("refuses an account with no pending change, so a normal password cannot be replaced this way", async () => {
    mockDb.select
      .mockReturnValueOnce(rows([teacher]))
      .mockReturnValueOnce(rows([{ password: "$argon2id$own", temporaryPasswordIssuedAt: null }]));

    const res = await change({ username: "kru@school.ac.th", password: "my-own-password", newPassword: "a-new-secret-1" });

    expect(res.status).toBe(401);
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("refuses a short new password or one equal to the temporary password", async () => {
    expect((await change({ username: "kru@school.ac.th", password: "kx7m-p3qa-zt", newPassword: "short" })).status).toBe(400);
    expect((await change({ username: "kru@school.ac.th", password: "kx7m-p3qa-zt", newPassword: "kx7m-p3qa-zt" })).status).toBe(400);
    expect(mockDb.select).not.toHaveBeenCalled();
  });
});
