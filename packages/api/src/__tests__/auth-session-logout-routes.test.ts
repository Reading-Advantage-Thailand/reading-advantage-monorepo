import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { handleSession } from "../routes/auth/session.js";
import { handleLogout } from "../routes/auth/logout.js";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn() },
  validateSession: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({ db: mocks.db }));

vi.mock("@reading-advantage/db/schema", () => ({
  users: {
    id: "users.id",
    xp: "users.xp",
    level: "users.level",
    cefrLevel: "users.cefr_level",
    email: "users.email",
    image: "users.image",
    schoolId: "users.school_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ type: "eq", col, val })),
}));

vi.mock("@reading-advantage/auth", () => ({
  SESSION_COOKIE_NAME: "session_token",
  validateSession: mocks.validateSession,
  deleteSession: mocks.deleteSession,
}));

const sessionUser = {
  id: "user-1",
  username: "alice",
  name: "Alice",
  role: "STUDENT",
  schoolId: "school-1",
};

function request(path: string, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: token === undefined ? {} : { cookie: `session_token=${token}` },
  });
}

function selectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mocks.db.select.mockReturnValue({ from });
  return { from, where, limit };
}

describe("handleSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.select.mockReset();
  });

  it("returns a null session and skips validation without a cookie", async () => {
    const response = await handleSession(request("/api/auth/session"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ session: null });
    expect(mocks.validateSession).not.toHaveBeenCalled();
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("returns a null session and reads no user row for an invalid token", async () => {
    mocks.validateSession.mockResolvedValue(null);

    const response = await handleSession(request("/api/auth/session", "stale"));

    expect(await response.json()).toEqual({ session: null });
    expect(mocks.validateSession).toHaveBeenCalledWith(mocks.db, "stale");
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("enriches the session user from the row of the session user id", async () => {
    mocks.validateSession.mockResolvedValue({ user: sessionUser });
    const chain = selectChain([
      { xp: 120, level: 3, cefrLevel: "A2", email: "a@example.com", image: "/a.png", schoolId: "school-db" },
    ]);

    const response = await handleSession(request("/api/auth/session", "good"));

    expect(chain.where).toHaveBeenCalledWith({ type: "eq", col: "users.id", val: "user-1" });
    expect(chain.limit).toHaveBeenCalledWith(1);
    expect(await response.json()).toEqual({
      session: {
        user: {
          id: "user-1",
          username: "alice",
          name: "Alice",
          role: "STUDENT",
          schoolId: "school-1",
          xp: 120,
          level: 3,
          cefrLevel: "A2",
          email: "a@example.com",
          image: "/a.png",
        },
      },
    });
  });

  it("keeps the session school, not the row school, as the tenant", async () => {
    mocks.validateSession.mockResolvedValue({ user: sessionUser });
    selectChain([{ xp: 1, level: 1, cefrLevel: "A1", email: null, image: null, schoolId: "other-school" }]);

    const body = await (await handleSession(request("/api/auth/session", "good"))).json();

    expect(body.session.user.schoolId).toBe("school-1");
  });

  it("falls back to default progress fields when the user row is missing", async () => {
    mocks.validateSession.mockResolvedValue({ user: sessionUser });
    selectChain([]);

    const body = await (await handleSession(request("/api/auth/session", "good"))).json();

    expect(body.session.user).toMatchObject({ xp: 0, level: 0, cefrLevel: "", email: null, image: null });
  });

  it("falls back per field when the row holds null values", async () => {
    mocks.validateSession.mockResolvedValue({ user: sessionUser });
    selectChain([{ xp: null, level: null, cefrLevel: null, email: null, image: null, schoolId: null }]);

    const body = await (await handleSession(request("/api/auth/session", "good"))).json();

    expect(body.session.user).toMatchObject({ xp: 0, level: 0, cefrLevel: "", email: null, image: null });
  });

  it("propagates a session store failure instead of returning a session", async () => {
    mocks.validateSession.mockRejectedValue(new Error("db down"));

    await expect(handleSession(request("/api/auth/session", "good"))).rejects.toThrow("db down");
  });
});

describe("handleLogout", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
  });

  it("deletes the session of the cookie token and clears the cookie", async () => {
    mocks.deleteSession.mockResolvedValue(undefined);

    const response = await handleLogout(request("/api/auth/logout", "tok-1"));

    expect(mocks.deleteSession).toHaveBeenCalledTimes(1);
    expect(mocks.deleteSession).toHaveBeenCalledWith(mocks.db, "tok-1");
    expect(await response.json()).toEqual({ success: true });
    const cookie = response.cookies.get("session_token");
    expect(cookie?.value).toBe("");
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", maxAge: 0, path: "/", secure: false });
  });

  it("clears the cookie without a delete when no token is present", async () => {
    const response = await handleLogout(request("/api/auth/logout"));

    expect(mocks.deleteSession).not.toHaveBeenCalled();
    expect(response.cookies.get("session_token")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("sets the secure flag on the cleared cookie in production", async () => {
    process.env.NODE_ENV = "production";
    try {
      const response = await handleLogout(request("/api/auth/logout", "tok-1"));
      expect(response.cookies.get("session_token")?.secure).toBe(true);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("propagates a delete failure and does not report success", async () => {
    mocks.deleteSession.mockRejectedValue(new Error("delete failed"));

    await expect(handleLogout(request("/api/auth/logout", "tok-1"))).rejects.toThrow("delete failed");
  });
});
