/**
 * FR-9: the shared login applies the student session policy only when the app opts in
 * and only for the STUDENT role. Staff and other apps keep the 7-day session.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createLoginHandler } from "../routes/auth/login.js";

const mockDb = vi.hoisted(() => ({ select: vi.fn() }));
const authMocks = vi.hoisted(() => ({
  rehashOnLogin: vi.fn().mockResolvedValue({ migrated: false }),
  verifyPassword: vi.fn().mockResolvedValue(true),
  createSession: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({ db: mockDb }));
vi.mock("@reading-advantage/db/schema", () => ({
  users: { id: "users.id", username: "users.username" },
  accounts: { id: "a.id", userId: "a.user_id", providerId: "a.provider_id", password: "a.password" },
  schools: { id: "schools.id", name: "schools.name" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn(() => ({})), and: vi.fn(() => ({})) }));
vi.mock("@reading-advantage/auth", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/auth")>("@reading-advantage/auth");
  return {
    ...actual,
    ...authMocks,
    checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
    resetLimit: vi.fn(),
    recordFailure: vi.fn(),
    SESSION_COOKIE_NAME: "session_token",
    recordAuditEvent: vi.fn().mockResolvedValue(undefined),
  };
});

const rows = (r: unknown[]) => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(r) }) }) });

function queueLogin(role: string) {
  mockDb.select
    .mockReturnValueOnce(rows([{ id: "u1", username: "u", name: "U", role, schoolId: "s1", password: null }]))
    .mockReturnValueOnce(rows([{ password: "$argon2id$x" }]))
    .mockReturnValueOnce(rows([{ xp: 0, level: 1, cefrLevel: "A1-", email: null, image: null }]));
}

const login = (options: Parameters<typeof createLoginHandler>[0]) =>
  createLoginHandler(options)(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "u", password: "pw" }),
      headers: { "Content-Type": "application/json" },
    }),
  );

describe("shared login student session policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T02:00:00Z"));
    authMocks.createSession.mockImplementation(async (_db, _id, opts) => ({ token: "tok", expiresAt: opts?.expiresAt ?? new Date("2026-10-12T02:00:00Z") }));
  });
  afterEach(() => vi.useRealTimers());

  it("gives a student the school-day expiry, idle limit, and single device when enabled", async () => {
    queueLogin("STUDENT");
    const res = await login({ studentSessionPolicy: true });
    expect(res.status).toBe(200);
    expect(authMocks.createSession).toHaveBeenCalledWith(
      mockDb,
      "u1",
      expect.objectContaining({ expiresAt: new Date("2026-10-05T10:00:00Z"), idleTimeoutSeconds: 1800, singleDevice: true }),
    );
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("Expires=Mon, 05 Oct 2026 10:00:00 GMT");
  });

  it("keeps the default session for a teacher when enabled", async () => {
    queueLogin("TEACHER");
    const res = await login({ studentSessionPolicy: true });
    const opts = authMocks.createSession.mock.calls[0]![2];
    expect(opts).not.toHaveProperty("expiresAt");
    expect(opts).not.toHaveProperty("idleTimeoutSeconds");
    expect(res.headers.get("set-cookie") ?? "").toContain("Max-Age=604800");
  });

  it("keeps the default session for a student when the app does not enable it", async () => {
    queueLogin("STUDENT");
    await login({});
    expect(authMocks.createSession.mock.calls[0]![2]).not.toHaveProperty("idleTimeoutSeconds");
  });
});
