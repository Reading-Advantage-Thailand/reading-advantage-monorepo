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

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.legacyMode.mockReturnValue(false);
    mocks.handleLogin.mockResolvedValue(successfulSourceLogin());
    mocks.resolveLegacy.mockResolvedValue(mappedPrincipal);
  });

  it("keeps credential login retired in company mode", async () => {
    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(mocks.handleLogin).not.toHaveBeenCalled();
  });

  it("returns a structured failure when the legacy adapter throws", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.handleLogin.mockRejectedValue(new Error("database unavailable"));
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("sales_legacy_login_error"),
    );
    error.mockRestore();
  });

  it("authenticates repaired source credentials and returns only the mapped Sales user", async () => {
    mocks.legacyMode.mockReturnValue(true);
    const loginRequest = request();

    const response = await POST(loginRequest);

    expect(response.status).toBe(200);
    expect(mocks.handleLogin).toHaveBeenCalledWith(loginRequest);
    expect(mocks.resolveLegacy).toHaveBeenCalledWith(
      { kind: "database" },
      "00000000-0000-4000-8000-000000000001",
    );
    await expect(response.json()).resolves.toEqual({
      success: true,
      user: mappedPrincipal.user,
    });
    expect(response.headers.get("set-cookie")).toContain(
      "session_token=legacy-session-token",
    );
  });

  it("passes through an invalid-credential response without mapping access", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.handleLogin.mockResolvedValue(
      NextResponse.json(
        { message: "Invalid username or password" },
        { status: 401 },
      ),
    );

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(mocks.resolveLegacy).not.toHaveBeenCalled();
  });

  it("deletes the new source session and denies a missing or revoked Sales mapping", async () => {
    mocks.legacyMode.mockReturnValue(true);
    mocks.resolveLegacy.mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mocks.deleteSession).toHaveBeenCalledWith(
      { kind: "database" },
      "legacy-session-token",
    );
    expect(response.headers.get("set-cookie")).toContain("session_token=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
