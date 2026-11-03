import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyIdentityError } from "@reading-advantage/backend";

const { authenticate, cookieSet, getIdentityComposition, headerStore } =
  vi.hoisted(() => ({
    authenticate: vi.fn(),
    cookieSet: vi.fn(),
    getIdentityComposition: vi.fn(),
    headerStore: { value: new Headers() },
  }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(), set: cookieSet })),
  headers: vi.fn(async () => headerStore.value),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { OPTIONS, POST } from "./route";

const ISSUER = "https://accounts.example.test";
const EXPIRES_AT = "2026-11-03T12:00:00.000Z";
const EMPLOYEE = { id: "employee-1", username: "rep", companyRoles: [] };

function loginRequest(
  body: unknown,
  headers: Record<string, string> = { origin: ISSUER },
): Request {
  return new Request(`${ISSUER}/api/session/login`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("Accounts session login route", () => {
  beforeEach(() => {
    authenticate.mockReset();
    cookieSet.mockReset();
    getIdentityComposition.mockReset();
    headerStore.value = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    getIdentityComposition.mockResolvedValue({
      cookie: {
        name: "__Host-ra_company_sso",
        secure: true,
        sameSite: "lax",
        path: "/",
      },
      issuerUrl: ISSUER,
      service: { authenticate },
    });
  });

  it("authenticates with server-derived context and sets the host-only SSO cookie", async () => {
    authenticate.mockResolvedValueOnce({
      employee: EMPLOYEE,
      sessionToken: "opaque-sso-token",
      expiresAt: EXPIRES_AT,
    });

    const response = await POST(
      loginRequest(
        { username: "rep", password: "secret" },
        { origin: ISSUER, "user-agent": "vitest-agent" },
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ employee: EMPLOYEE });
    expect(authenticate).toHaveBeenCalledWith({
      username: "rep",
      password: "secret",
      clientId: "accounts",
      ipAddress: "203.0.113.7",
      userAgent: "vitest-agent",
    });
    expect(cookieSet).toHaveBeenCalledWith("__Host-ra_company_sso", "opaque-sso-token", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(EXPIRES_AT),
    });
  });

  it("keeps a string client id and never trusts body-supplied ip or user agent", async () => {
    authenticate.mockResolvedValueOnce({
      employee: EMPLOYEE,
      sessionToken: "opaque-sso-token",
      expiresAt: EXPIRES_AT,
    });

    await POST(
      loginRequest({
        username: "rep",
        password: "secret",
        clientId: "sales-lms",
        ipAddress: "198.51.100.1",
        userAgent: "spoofed-agent",
      }),
    );

    expect(authenticate).toHaveBeenCalledWith({
      username: "rep",
      password: "secret",
      clientId: "sales-lms",
      ipAddress: "203.0.113.7",
      userAgent: "unknown",
    });
  });

  it("falls back to the accounts client for a non-string client id", async () => {
    authenticate.mockResolvedValueOnce({
      employee: EMPLOYEE,
      sessionToken: "opaque-sso-token",
      expiresAt: EXPIRES_AT,
    });

    await POST(loginRequest({ username: "rep", password: "secret", clientId: 7 }));

    expect(authenticate).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "accounts" }),
    );
  });

  it.each([
    ["missing", {}],
    ["foreign", { origin: "https://evil.example.test" }],
  ])("rejects a %s origin before authenticating", async (_name, headers) => {
    const response = await POST(loginRequest({ username: "rep" }, headers));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: "FORBIDDEN" });
    expect(authenticate).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-object JSON body without authenticating", async () => {
    const response = await POST(loginRequest(["rep", "secret"]));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "INVALID_INPUT" });
    expect(authenticate).not.toHaveBeenCalled();
  });

  it.each([
    ["AUTHENTICATION_FAILED", 401],
    ["RATE_LIMITED", 429],
  ] as const)("maps %s to %i without setting a cookie", async (code, status) => {
    authenticate.mockRejectedValueOnce(new CompanyIdentityError(code, "denied"));

    const response = await POST(loginRequest({ username: "rep", password: "bad" }));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: code, message: "denied" });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("hides an unexpected failure behind INTERNAL_ERROR", async () => {
    authenticate.mockRejectedValueOnce(new Error("connection string leaked"));

    const response = await POST(loginRequest({ username: "rep", password: "x" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "INTERNAL_ERROR",
      message: "The identity operation could not be completed.",
    });
  });

  it("answers preflight with an empty no-store 204", async () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("POST, OPTIONS");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("");
  });
});
