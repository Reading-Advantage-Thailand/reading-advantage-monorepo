import { NextRequest, NextResponse } from "next/server";

const handleLogin = jest.fn();
const handleLogout = jest.fn();
const handleSession = jest.fn();
const deleteSession = jest.fn();

jest.mock("@reading-advantage/api/routes/auth", () => ({
  handleLogin,
  handleLogout,
  handleSession,
}));

jest.mock("@reading-advantage/auth", () => ({
  deleteSession,
  SESSION_COOKIE_NAME: "session_token",
}));

jest.mock("@reading-advantage/db", () => ({ db: { kind: "mock-db" } }));

describe("Advantage Games server auth adapter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates a student login to the shared handler", async () => {
    const sharedResponse = NextResponse.json({
      success: true,
      user: { id: "student-1", role: "STUDENT" },
    });
    sharedResponse.cookies.set("session_token", "opaque-token", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    handleLogin.mockResolvedValue(sharedResponse);

    const { handleStudentLogin } = await import("./server");
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "student", password: "secret" }),
    });
    const response = await handleStudentLogin(request);

    expect(handleLogin).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    expect(response.cookies.get("session_token")?.value).toBe("opaque-token");
  });

  it("revokes and clears a session created for a non-student account", async () => {
    const sharedResponse = NextResponse.json({
      success: true,
      user: { id: "teacher-1", role: "TEACHER" },
    });
    sharedResponse.cookies.set("session_token", "teacher-token", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    handleLogin.mockResolvedValue(sharedResponse);

    const { handleStudentLogin } = await import("./server");
    const response = await handleStudentLogin(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: "teacher", password: "secret" }),
      }),
    );

    expect(deleteSession).toHaveBeenCalledWith(
      { kind: "mock-db" },
      "teacher-token",
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      message: "A student account is required",
    });
    expect(response.cookies.get("session_token")?.value).toBe("");
  });

  it("passes shared credential failures through unchanged", async () => {
    handleLogin.mockResolvedValue(
      NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 },
      ),
    );

    const { handleStudentLogin } = await import("./server");
    const response = await handleStudentLogin(
      new NextRequest("http://localhost/api/auth/login", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(deleteSession).not.toHaveBeenCalled();
  });

  it("hides non-student sessions while preserving shared session lookup", async () => {
    handleSession.mockResolvedValue(
      NextResponse.json({ session: { user: { id: "admin-1", role: "ADMIN" } } }),
    );

    const { handleStudentSession } = await import("./server");
    const response = await handleStudentSession(
      new NextRequest("http://localhost/api/auth/session"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ session: null });
    expect(response.headers.get("cache-control")).toBe("no-store, private");
  });

  it("delegates logout to the shared handler", async () => {
    const sharedResponse = NextResponse.json({ success: true });
    handleLogout.mockResolvedValue(sharedResponse);

    const { handleStudentLogout } = await import("./server");
    const request = new NextRequest("http://localhost/api/auth/logout", {
      method: "POST",
    });
    await expect(handleStudentLogout(request)).resolves.toBe(sharedResponse);
    expect(handleLogout).toHaveBeenCalledWith(request);
  });
});
