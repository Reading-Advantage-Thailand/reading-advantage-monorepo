// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getCurrentSession = vi.hoisted(() => vi.fn());
const domain = vi.hoisted(() => ({
  startClassSession: vi.fn(),
  getNameListForCode: vi.fn(),
  signInWithPicture: vi.fn(),
  signInWithCardToken: vi.fn(),
  rotateCardToken: vi.fn(),
  issueClassCardTokens: vi.fn(),
}));

vi.mock("@reading-advantage/db", async (orig) => ({ ...(await orig<typeof import("@reading-advantage/db")>()), db: {} }));
vi.mock("@/lib/session", () => ({ getCurrentSession }));
vi.mock("@reading-advantage/api/routes/auth", () => ({ getClientIp: () => "1.2.3.4" }));
vi.mock("@reading-advantage/auth", async (orig) => ({
  ...(await orig<typeof import("@reading-advantage/auth")>()),
  createPostgresRateLimitStore: () => ({}),
}));
vi.mock("@reading-advantage/domain", async (orig) => {
  const actual = await orig<typeof import("@reading-advantage/domain")>();
  return { ...actual, studentLogin: { ...actual.studentLogin, ...domain } };
});

import { studentLogin } from "@reading-advantage/domain";
import { startClass, enterCode, pictureSignIn, qrSignIn, rotateCard, issueCards } from "../student-login/handlers";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const post = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const teacherSession = { authStrength: "full", user: { id: "t1", role: "TEACHER", schoolId: "s1" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("teacher handlers", () => {
  it("returns 401 without a session", async () => {
    getCurrentSession.mockResolvedValue(null);
    expect((await startClass(post("/x", { classroomId: CLASS_ID }))).status).toBe(401);
    expect(domain.startClassSession).not.toHaveBeenCalled();
  });

  it("returns 403 for a session that is not full", async () => {
    getCurrentSession.mockResolvedValue({ ...teacherSession, authStrength: "code_only" });
    expect((await startClass(post("/x", { classroomId: CLASS_ID }))).status).toBe(403);
    expect(domain.startClassSession).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    getCurrentSession.mockResolvedValue(teacherSession);
    expect((await startClass(post("/x", { classroomId: "nope" }))).status).toBe(400);
  });

  it("calls the use-case and returns its result", async () => {
    getCurrentSession.mockResolvedValue(teacherSession);
    domain.startClassSession.mockResolvedValue({ sessionId: "s", code: "ABCDEF", expiresAt: "2026-10-05T00:00:00.000Z" });
    const res = await startClass(post("/x", { classroomId: CLASS_ID }));
    expect(res.status).toBe(200);
    expect((await res.json()).code).toBe("ABCDEF");
    expect(domain.startClassSession).toHaveBeenCalledWith(expect.objectContaining({ user: teacherSession.user, actor: { ip: "1.2.3.4", userAgent: null } }));
  });

  it("maps a forbidden error to 403", async () => {
    getCurrentSession.mockResolvedValue(teacherSession);
    domain.startClassSession.mockRejectedValue(new studentLogin.StudentLoginError("forbidden", "Not allowed."));
    expect((await startClass(post("/x", { classroomId: CLASS_ID }))).status).toBe(403);
  });
});

describe("student handlers", () => {
  it("returns the name list for a code", async () => {
    domain.getNameListForCode.mockResolvedValue({ picturePasswordRequired: true, students: [] });
    const res = await enterCode(post("/code", { code: "abcdef" }));
    expect(res.status).toBe(200);
    expect(domain.getNameListForCode).toHaveBeenCalledWith(expect.objectContaining({ ip: "1.2.3.4", input: { code: "ABCDEF" } }));
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    domain.getNameListForCode.mockRejectedValue(new studentLogin.StudentLoginError("rate_limited", "Too many attempts.", 42));
    const res = await enterCode(post("/code", { code: "ABCDEF" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });

  it("sets an HttpOnly session cookie on sign-in and never returns the token in the body", async () => {
    domain.signInWithPicture.mockResolvedValue({
      user: { id: "u1", role: "STUDENT" }, authStrength: "full", token: "secret-token", expiresAt: new Date(Date.now() + 3600_000),
    });
    const res = await pictureSignIn(post("/picture", { code: "ABCDEF", studentId: "h1", pictures: [1, 2, 3] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: "u1", role: "STUDENT" }, authStrength: "full" });
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("secret-token");
    expect(cookie.toLowerCase()).toContain("httponly");
  });

  it("returns 423 with Retry-After when locked", async () => {
    domain.signInWithPicture.mockRejectedValue(new studentLogin.StudentLoginError("locked", "Locked.", 300));
    const res = await pictureSignIn(post("/picture", { code: "ABCDEF", studentId: "h1", pictures: [1, 2, 3] }));
    expect(res.status).toBe(423);
    expect(res.headers.get("Retry-After")).toBe("300");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("returns 400 for pictures outside the grid", async () => {
    const res = await pictureSignIn(post("/picture", { code: "ABCDEF", studentId: "h1", pictures: [1, 2, 99] }));
    expect(res.status).toBe(400);
    expect(domain.signInWithPicture).not.toHaveBeenCalled();
  });
});

describe("QR card handlers", () => {
  const token = "A".repeat(43);

  it("signs in with a scan, sets the cookie to the session expiry, and hides the token", async () => {
    const expiresAt = new Date(Date.now() + 3600_000);
    domain.signInWithCardToken.mockResolvedValue({ user: { id: "u1", role: "STUDENT" }, authStrength: "full", token: "secret-token", expiresAt });
    const res = await qrSignIn(post("/qr", { token }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ user: { id: "u1", role: "STUDENT" }, authStrength: "full" });
    expect(res.headers.get("set-cookie")).toContain("secret-token");
    expect(domain.signInWithCardToken).toHaveBeenCalledWith(expect.objectContaining({ meta: { ip: "1.2.3.4", userAgent: null }, input: { token } }));
  });

  it("returns 401 for a bad card and 429 when limited", async () => {
    domain.signInWithCardToken.mockRejectedValueOnce(new studentLogin.StudentLoginError("invalid_credentials", "Card not valid."));
    expect((await qrSignIn(post("/qr", { token }))).status).toBe(401);
    domain.signInWithCardToken.mockRejectedValueOnce(new studentLogin.StudentLoginError("rate_limited", "Too many.", 9));
    const res = await qrSignIn(post("/qr", { token }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("9");
  });

  it("returns 400 for a malformed token", async () => {
    expect((await qrSignIn(post("/qr", { token: "short" }))).status).toBe(400);
    expect(domain.signInWithCardToken).not.toHaveBeenCalled();
  });

  it("rotates a card for a full teacher session only", async () => {
    getCurrentSession.mockResolvedValue({ ...teacherSession, authStrength: "code_only" });
    expect((await rotateCard(post("/rotate", { classroomId: CLASS_ID, studentUserId: "s1" }))).status).toBe(403);
    getCurrentSession.mockResolvedValue(teacherSession);
    domain.rotateCardToken.mockResolvedValue({ credentialId: "c1", token });
    const res = await rotateCard(post("/rotate", { classroomId: CLASS_ID, studentUserId: "s1" }));
    expect(res.status).toBe(200);
    expect((await res.json()).token).toBe(token);
  });

  it("issues class cards for a teacher and returns 401 without a session", async () => {
    getCurrentSession.mockResolvedValue(null);
    expect((await issueCards(post("/issue", { classroomId: CLASS_ID }))).status).toBe(401);
    getCurrentSession.mockResolvedValue(teacherSession);
    domain.issueClassCardTokens.mockResolvedValue([]);
    expect((await issueCards(post("/issue", { classroomId: CLASS_ID }))).status).toBe(200);
  });
});
