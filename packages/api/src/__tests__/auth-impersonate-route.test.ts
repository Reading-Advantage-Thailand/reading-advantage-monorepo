import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { handleImpersonate } from "../routes/auth/impersonate.js";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), transaction: vi.fn() },
  hashPassword: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({ db: mocks.db }));

vi.mock("@reading-advantage/db/schema", () => ({
  users: { id: "users.id", __table: "users" },
  accounts: { __table: "accounts" },
  schools: { id: "schools.id", name: "schools.name", __table: "schools" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ type: "eq", col, val })),
}));

vi.mock("@reading-advantage/auth", () => ({
  SESSION_COOKIE_NAME: "session_token",
  hashPassword: mocks.hashPassword,
  createSession: mocks.createSession,
}));

function jsonRequest(body: string) {
  return new NextRequest("http://localhost/api/auth/impersonate", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

function selectReturning(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  return { from: vi.fn().mockReturnValue({ where }), where };
}

function insertReturning(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  return { values, returning };
}

const existingTeacher = {
  id: "teacher_demo",
  username: "teacher_demo",
  name: "Teacher Demo",
  role: "TEACHER",
  schoolId: "dev-school",
  email: "secret@example.com",
};

describe("handleImpersonate with impersonation enabled", () => {
  const savedEnv = { node: process.env.NODE_ENV, flag: process.env.IMPERSONATION_ENABLED };
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.select.mockReset();
    mocks.db.insert.mockReset();
    mocks.db.transaction.mockReset();
    process.env.NODE_ENV = "test";
    process.env.IMPERSONATION_ENABLED = "true";
    mocks.hashPassword.mockResolvedValue("hashed-pw");
    mocks.createSession.mockResolvedValue({ token: "new-token" });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = savedEnv.node;
    if (savedEnv.flag === undefined) delete process.env.IMPERSONATION_ENABLED;
    else process.env.IMPERSONATION_ENABLED = savedEnv.flag;
    errorSpy.mockRestore();
  });

  it("returns 404 when the flag holds a value other than the exact string true", async () => {
    process.env.IMPERSONATION_ENABLED = "1";

    const response = await handleImpersonate(jsonRequest(JSON.stringify({ userId: "admin_demo" })));

    expect(response.status).toBe(404);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("rejects a body without a userId with 400 and no database access", async () => {
    const response = await handleImpersonate(jsonRequest(JSON.stringify({ userId: "" })));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Invalid input" });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("rejects a real user id that is not a demo user with 400", async () => {
    const response = await handleImpersonate(jsonRequest(JSON.stringify({ userId: "real-admin-id" })));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Invalid demo user" });
    expect(mocks.db.select).not.toHaveBeenCalled();
    expect(mocks.createSession).not.toHaveBeenCalled();
  });

  it("returns 500 without a session for a malformed JSON body", async () => {
    const response = await handleImpersonate(jsonRequest("{not json"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "Internal server error" });
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(errorSpy.mock.calls[0][0]))).toMatchObject({ level: "error", event: "impersonate_error" });
  });

  it("reuses an existing school and user and sets the session cookie", async () => {
    const school = selectReturning([{ id: "dev-school" }]);
    const user = selectReturning([existingTeacher]);
    mocks.db.select.mockReturnValueOnce(school).mockReturnValueOnce(user);

    const response = await handleImpersonate(jsonRequest(JSON.stringify({ userId: "teacher_demo" })));

    expect(response.status).toBe(200);
    expect(school.where).toHaveBeenCalledWith({ type: "eq", col: "schools.name", val: "Development Demo School" });
    expect(user.where).toHaveBeenCalledWith({ type: "eq", col: "users.id", val: "teacher_demo" });
    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(mocks.db.transaction).not.toHaveBeenCalled();
    expect(mocks.hashPassword).not.toHaveBeenCalled();
    expect(mocks.createSession).toHaveBeenCalledWith(mocks.db, "teacher_demo");
    expect(await response.json()).toEqual({
      success: true,
      user: { id: "teacher_demo", username: "teacher_demo", name: "Teacher Demo", role: "TEACHER", schoolId: "dev-school" },
    });
    expect(response.cookies.get("session_token")).toMatchObject({
      value: "new-token",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
      secure: false,
    });
  });

  it("creates the demo school and the demo user with a credential account", async () => {
    const schoolInsert = insertReturning([{ id: "new-school" }]);
    mocks.db.select.mockReturnValueOnce(selectReturning([])).mockReturnValueOnce(selectReturning([]));
    mocks.db.insert.mockReturnValueOnce(schoolInsert);
    const created = { id: "student_demo", username: "student_demo", name: "Student Demo", role: "STUDENT", schoolId: "new-school" };
    const userInsert = insertReturning([created]);
    const accountValues = vi.fn().mockResolvedValue(undefined);
    const tx = { insert: vi.fn().mockReturnValueOnce(userInsert).mockReturnValueOnce({ values: accountValues }) };
    mocks.db.transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

    const response = await handleImpersonate(jsonRequest(JSON.stringify({ userId: "student_demo" })));

    expect(response.status).toBe(200);
    expect(schoolInsert.values).toHaveBeenCalledWith({ name: "Development Demo School" });
    expect(mocks.hashPassword).toHaveBeenCalledWith("Password123!");
    expect(userInsert.values).toHaveBeenCalledWith({
      id: "student_demo",
      username: "student_demo",
      displayUsername: "student_demo",
      name: "Student Demo",
      email: "demo_student_demo@dev.local",
      role: "STUDENT",
      schoolId: "new-school",
    });
    expect(accountValues).toHaveBeenCalledWith({
      id: "student_demo_credential",
      userId: "student_demo",
      providerId: "credential",
      password: "hashed-pw",
    });
    expect(mocks.createSession).toHaveBeenCalledWith(mocks.db, "student_demo");
    expect((await response.json()).user).toEqual(created);
  });

  it("assigns the fixed role of each demo user, including SYSTEM", async () => {
    mocks.db.select.mockReturnValueOnce(selectReturning([{ id: "dev-school" }])).mockReturnValueOnce(selectReturning([]));
    const userInsert = insertReturning([{ id: "system_demo", username: "system_demo", name: "System Demo", role: "SYSTEM", schoolId: "dev-school" }]);
    const tx = { insert: vi.fn().mockReturnValueOnce(userInsert).mockReturnValueOnce({ values: vi.fn().mockResolvedValue(undefined) }) };
    mocks.db.transaction.mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx));

    const response = await handleImpersonate(jsonRequest(JSON.stringify({ userId: "system_demo" })));

    expect(response.status).toBe(200);
    expect(mocks.db.insert).not.toHaveBeenCalled();
    expect(userInsert.values).toHaveBeenCalledWith(expect.objectContaining({ role: "SYSTEM", schoolId: "dev-school" }));
  });

  it("returns 500 and sets no cookie when the user transaction fails", async () => {
    mocks.db.select.mockReturnValueOnce(selectReturning([{ id: "dev-school" }])).mockReturnValueOnce(selectReturning([]));
    mocks.db.transaction.mockRejectedValue(new Error("unique violation"));

    const response = await handleImpersonate(jsonRequest(JSON.stringify({ userId: "admin_demo" })));

    expect(response.status).toBe(500);
    expect(response.cookies.get("session_token")).toBeUndefined();
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(JSON.parse(String(errorSpy.mock.calls[0][0]))).toMatchObject({ message: "unique violation" });
  });

  it("logs Unknown when a non-Error value is thrown", async () => {
    mocks.db.select.mockImplementation(() => {
      throw "boom";
    });

    const response = await handleImpersonate(jsonRequest(JSON.stringify({ userId: "admin_demo" })));

    expect(response.status).toBe(500);
    expect(JSON.parse(String(errorSpy.mock.calls[0][0]))).toMatchObject({ message: "Unknown" });
  });
});
