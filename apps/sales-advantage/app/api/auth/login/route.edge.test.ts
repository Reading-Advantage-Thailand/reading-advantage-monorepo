// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  legacyMode: vi.fn(),
  handleLogin: vi.fn(),
  resolveLegacy: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock("@reading-advantage/api/routes/auth", () => ({
  handleLogin: mocks.handleLogin,
}));
vi.mock("@reading-advantage/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@reading-advantage/auth")>()),
  deleteSession: mocks.deleteSession,
  SESSION_COOKIE_NAME: "session_token",
}));
vi.mock("@reading-advantage/db", () => ({ db: { kind: "database" } }));
vi.mock("@reading-advantage/domain", () => ({
  resolveLegacySalesCompanyPrincipal: mocks.resolveLegacy,
}));
vi.mock("@/lib/auth-mode", () => ({
  isLegacySalesAuthEnabled: mocks.legacyMode,
}));

import { POST } from "./route";

function request(): NextRequest {
  return new NextRequest(
    "https://sales.reading-advantage.com/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username: "rep", password: "pw" }),
    },
  );
}

function successfulSourceLogin(): NextResponse {
  const response = NextResponse.json({
    success: true,
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      role: "ADMIN",
      schoolId: "00000000-0000-4000-8000-000000000099",
    },
  });
  response.cookies.set("session_token", "legacy-session-token", {
    httpOnly: true,
    path: "/",
  });
  return response;
}

const mappedPrincipal = {
  user: {
    id: "sales:00000000-0000-4000-8000-000000000001",
    username: "sales:00000000-0000-4000-8000-000000000001",
    name: "Sales Rep",
    role: "SALES_REP",
    schoolId: null,
    xp: 0,
    level: 1,
    cefrLevel: "N/A",
  },
  scope: {
    kind: "company",
    applicationKey: "sales",
    organizationId: "20000000-0000-4000-8000-000000000003",
    organizationKey: "internal-company",
  },
};

describe("POST /api/auth/login legacy edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mocks.legacyMode.mockReturnValue(true);
    mocks.handleLogin.mockResolvedValue(successfulSourceLogin());
    mocks.resolveLegacy.mockResolvedValue(mappedPrincipal);
    mocks.deleteSession.mockResolvedValue(undefined);
  });

  it("returns the Accounts sign-in contract in company mode", async () => {
    mocks.legacyMode.mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "Sign in through Accounts",
      signInUrl: "/api/auth/company/start",
    });
  });

  it("fails without a session when the source login issues no cookie", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.handleLogin.mockResolvedValue(
      NextResponse.json({
        success: true,
        user: { id: "00000000-0000-4000-8000-000000000001" },
      }),
    );

    const response = await POST(request());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Internal server error",
    });
    expect(mocks.resolveLegacy).not.toHaveBeenCalled();
    expect(mocks.deleteSession).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
    error.mockRestore();
  });

  it("rejects a source login body without a UUID user id", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const source = NextResponse.json({ success: true, user: { id: "rep" } });
    source.cookies.set("session_token", "legacy-session-token");
    mocks.handleLogin.mockResolvedValue(source);

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.resolveLegacy).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
    error.mockRestore();
  });

  it("deletes the issued session when principal resolution throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.resolveLegacy.mockRejectedValue(new Error("mapping lookup failed"));

    const response = await POST(
      new NextRequest("https://sales.reading-advantage.com/api/auth/login", {
        method: "POST",
        headers: { "x-request-id": "req-42" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(500);
    expect(mocks.deleteSession).toHaveBeenCalledWith(
      { kind: "database" },
      "legacy-session-token",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("req-42"));
    error.mockRestore();
  });

  it("still returns 500 when session cleanup also fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.resolveLegacy.mockRejectedValue(new Error("mapping lookup failed"));
    mocks.deleteSession.mockRejectedValue(new Error("delete failed"));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.deleteSession).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("issues a seven-day HttpOnly lax cookie, insecure outside production", async () => {
    const response = await POST(request());
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("session_token=legacy-session-token");
    expect(cookie).toContain("Max-Age=604800");
    expect(cookie).toContain("HttpOnly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).not.toContain("Secure");
  });

  it("marks the session and denial cookies Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const granted = await POST(request());
    expect(granted.headers.get("set-cookie")).toContain("Secure");

    mocks.resolveLegacy.mockResolvedValue(null);
    mocks.handleLogin.mockResolvedValue(successfulSourceLogin());
    const denied = await POST(request());
    expect(denied.status).toBe(403);
    await expect(denied.json()).resolves.toEqual({
      message: "Sales access is not assigned",
    });
    expect(denied.headers.get("set-cookie")).toContain("Secure");
    vi.unstubAllEnvs();
  });

  it("returns 500 and retries cleanup when denial cleanup throws", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.resolveLegacy.mockResolvedValue(null);
    mocks.deleteSession.mockRejectedValue(new Error("delete failed"));

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(mocks.deleteSession).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
