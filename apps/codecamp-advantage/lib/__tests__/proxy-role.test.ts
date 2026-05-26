import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireRoleMock } = vi.hoisted(() => ({
  requireRoleMock: vi.fn(),
}));

vi.mock("@reading-advantage/auth", async () => {
  const actual = await vi.importActual<typeof import("@reading-advantage/auth")>(
    "@reading-advantage/auth"
  );
  return {
    ...actual,
    requireRole: requireRoleMock,
  };
});

vi.mock("@reading-advantage/db", () => ({
  db: {},
}));

vi.mock("next-intl/middleware", async () => {
  const { NextResponse } = await import("next/server");
  return {
    default: vi.fn(() => () => NextResponse.next()),
  };
});

import { NextRequest } from "next/server";
import { proxy } from "../../proxy";
import { AuthError } from "@reading-advantage/auth";

function createRequest(pathname: string, cookies?: Record<string, string>, headers?: HeadersInit) {
  const url = new URL(pathname, "http://localhost:3000");
  const req = new NextRequest(url, { headers });
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      req.cookies.set(name, value);
    }
  }
  return req;
}

beforeEach(() => {
  requireRoleMock.mockReset();
});

describe("proxy admin role enforcement", () => {
  it("redirects STUDENT users hitting /admin to home (FORBIDDEN)", async () => {
    requireRoleMock.mockRejectedValue(new AuthError("Requires role ADMIN or higher", "FORBIDDEN"));

    const req = createRequest("/admin", { session_token: "student-token" });
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/?error=forbidden");
    expect(res.headers.get("location")).not.toContain("redirectTo");
  });

  it("redirects STUDENT users hitting /th/admin/cohorts to home (FORBIDDEN)", async () => {
    requireRoleMock.mockRejectedValue(new AuthError("Requires role ADMIN or higher", "FORBIDDEN"));

    const req = createRequest("/th/admin/cohorts", { session_token: "student-token" });
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/?error=forbidden");
  });

  it("redirects invalid-token users hitting /admin to signin and clears cookie (UNAUTHORIZED)", async () => {
    requireRoleMock.mockRejectedValue(new AuthError("Authentication required", "UNAUTHORIZED"));

    const req = createRequest("/admin", { session_token: "invalid-token" });
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("redirectTo=%2Fadmin");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/session_token=;.*Max-Age=0/i);
  });

  it("allows ADMIN users through to /th/admin", async () => {
    requireRoleMock.mockResolvedValue({
      user: { id: "u1", role: "ADMIN", schoolId: "s1", email: "a@b.com", username: "a" },
      token: "admin-token",
    });

    const req = createRequest("/th/admin", { session_token: "admin-token" });
    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(requireRoleMock).toHaveBeenCalledWith(expect.anything(), "admin-token", "ADMIN");
  });

  it("allows SYSTEM users through to /th/admin (hierarchy)", async () => {
    requireRoleMock.mockResolvedValue({
      user: { id: "u2", role: "SYSTEM", schoolId: "s1", email: "s@b.com", username: "s" },
      token: "system-token",
    });

    const req = createRequest("/th/admin", { session_token: "system-token" });
    const res = await proxy(req);

    expect(res.status).toBe(200);
    expect(requireRoleMock).toHaveBeenCalledWith(expect.anything(), "system-token", "ADMIN");
  });

  it("fails closed on DB unreachable (redirects to signin with session_check_failed error)", async () => {
    requireRoleMock.mockRejectedValue(new Error("Connection refused"));

    const req = createRequest("/admin", { session_token: "any-token" });
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("error=session_check_failed");
  });

  it("does not call requireRole for non-admin routes", async () => {
    const req = createRequest("/th/lessons/intro");
    await proxy(req);

    expect(requireRoleMock).not.toHaveBeenCalled();
  });

  it("does not call requireRole when no session_token cookie is present on /admin (redirects to home)", async () => {
    const req = createRequest("/admin");
    const res = await proxy(req);

    expect(requireRoleMock).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("redirectTo=%2Fadmin");
  });
});
