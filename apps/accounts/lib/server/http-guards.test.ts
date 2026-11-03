import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyIdentityError } from "@reading-advantage/backend";

const { cookieGet, currentEmployeeService, getIdentityComposition, headerStore } =
  vi.hoisted(() => ({
    cookieGet: vi.fn(),
    currentEmployeeService: vi.fn(),
    getIdentityComposition: vi.fn(),
    headerStore: { value: new Headers() },
  }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
  headers: vi.fn(async () => headerStore.value),
}));

vi.mock("./identity", () => ({ getIdentityComposition }));

import {
  currentEmployee,
  currentSessionToken,
  identityAuthenticationEvidence,
  identityErrorResponse,
  requestIpAddress,
  requireCompanyAdmin,
  requireEmployee,
  requireSameOrigin,
} from "./http";

const COOKIE_NAME = "__Host-ra_company_sso";

function employee(companyRoles: readonly string[]) {
  return { id: "employee-1", username: "rep", companyRoles };
}

function requestWithOrigin(origin?: string): Request {
  return new Request("https://accounts.example.test/api/session/login", {
    method: "POST",
    headers: origin === undefined ? undefined : { origin },
  });
}

describe("Accounts HTTP session guards", () => {
  beforeEach(() => {
    cookieGet.mockReset();
    currentEmployeeService.mockReset();
    getIdentityComposition.mockReset();
    headerStore.value = new Headers();
    getIdentityComposition.mockResolvedValue({
      cookie: { name: COOKIE_NAME },
      issuerUrl: "https://accounts.example.test/base",
      service: { currentEmployee: currentEmployeeService },
    });
  });

  describe("requireSameOrigin", () => {
    it("accepts a request from the issuer origin", async () => {
      await expect(
        requireSameOrigin(requestWithOrigin("https://accounts.example.test")),
      ).resolves.toBeUndefined();
    });

    it.each([
      ["is missing", undefined],
      ["is another host", "https://evil.example.test"],
      ["uses another scheme", "http://accounts.example.test"],
      ["uses another port", "https://accounts.example.test:8443"],
      ["is the literal null origin", "null"],
      ["carries the issuer path", "https://accounts.example.test/base"],
    ])("rejects a request whose origin %s", async (_name, origin) => {
      const rejection = requireSameOrigin(requestWithOrigin(origin));

      await expect(rejection).rejects.toBeInstanceOf(CompanyIdentityError);
      await expect(rejection).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("session token and evidence", () => {
    it("reads the session token from the configured cookie name", async () => {
      cookieGet.mockReturnValue({ value: "opaque-token" });

      await expect(currentSessionToken()).resolves.toBe("opaque-token");
      expect(cookieGet).toHaveBeenCalledWith(COOKIE_NAME);
    });

    it("returns undefined when the session cookie is absent", async () => {
      cookieGet.mockReturnValue(undefined);

      await expect(currentSessionToken()).resolves.toBeUndefined();
    });

    it("builds session evidence from the cookie token", async () => {
      cookieGet.mockReturnValue({ value: "opaque-token" });

      await expect(identityAuthenticationEvidence()).resolves.toEqual({
        kind: "session",
        opaqueSessionRef: "opaque-token",
      });
    });

    it.each([
      ["absent", undefined],
      ["empty", { value: "" }],
    ])("builds anonymous evidence when the cookie is %s", async (_name, cookie) => {
      cookieGet.mockReturnValue(cookie);

      await expect(identityAuthenticationEvidence()).resolves.toEqual({
        kind: "anonymous",
      });
    });
  });

  describe("currentEmployee", () => {
    it("resolves the employee through the service for a session token", async () => {
      cookieGet.mockReturnValue({ value: "opaque-token" });
      currentEmployeeService.mockResolvedValue(employee(["COMPANY_ADMIN"]));

      await expect(currentEmployee()).resolves.toEqual(employee(["COMPANY_ADMIN"]));
      expect(currentEmployeeService).toHaveBeenCalledWith("opaque-token");
    });

    it("returns null without calling the service for an anonymous request", async () => {
      cookieGet.mockReturnValue(undefined);

      await expect(currentEmployee()).resolves.toBeNull();
      expect(currentEmployeeService).not.toHaveBeenCalled();
    });
  });

  describe("requireCompanyAdmin", () => {
    it("returns a company administrator", async () => {
      cookieGet.mockReturnValue({ value: "opaque-token" });
      currentEmployeeService.mockResolvedValue(employee(["COMPANY_ADMIN"]));

      await expect(requireCompanyAdmin()).resolves.toEqual(
        employee(["COMPANY_ADMIN"]),
      );
    });

    it.each([
      ["an anonymous request", undefined, null],
      ["a revoked session", { value: "opaque-token" }, null],
      ["an employee without company roles", { value: "opaque-token" }, employee([])],
      [
        "an employee with another company role",
        { value: "opaque-token" },
        employee(["COMPANY_VIEWER"]),
      ],
    ])("rejects %s with FORBIDDEN", async (_name, cookie, resolved) => {
      cookieGet.mockReturnValue(cookie);
      currentEmployeeService.mockResolvedValue(resolved);

      const rejection = requireCompanyAdmin();

      await expect(rejection).rejects.toBeInstanceOf(CompanyIdentityError);
      await expect(rejection).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("requireEmployee", () => {
    it("returns any live employee without a role check", async () => {
      cookieGet.mockReturnValue({ value: "opaque-token" });
      currentEmployeeService.mockResolvedValue(employee([]));

      await expect(requireEmployee()).resolves.toEqual(employee([]));
    });

    it.each([
      ["an anonymous request", undefined],
      ["a revoked session", { value: "opaque-token" }],
    ])("rejects %s with SESSION_INVALID", async (_name, cookie) => {
      cookieGet.mockReturnValue(cookie);
      currentEmployeeService.mockResolvedValue(null);

      const rejection = requireEmployee();

      await expect(rejection).rejects.toBeInstanceOf(CompanyIdentityError);
      await expect(rejection).rejects.toMatchObject({ code: "SESSION_INVALID" });
    });
  });

  describe("requestIpAddress", () => {
    it.each([
      ["a single address", "203.0.113.7", "203.0.113.7"],
      ["the first address of a chain", "203.0.113.7, 10.0.0.1", "203.0.113.7"],
      ["a padded first address", "  203.0.113.7  ,10.0.0.1", "203.0.113.7"],
    ])("returns %s from x-forwarded-for", async (_name, forwarded, expected) => {
      headerStore.value = new Headers({ "x-forwarded-for": forwarded });

      await expect(requestIpAddress()).resolves.toBe(expected);
    });

    it.each([
      ["is missing", undefined],
      ["is blank", "   "],
      ["starts with an empty entry", ", 10.0.0.1"],
    ])("returns unknown when x-forwarded-for %s", async (_name, forwarded) => {
      headerStore.value = new Headers(
        forwarded === undefined ? undefined : { "x-forwarded-for": forwarded },
      );

      await expect(requestIpAddress()).resolves.toBe("unknown");
    });
  });
});

describe("identityErrorResponse", () => {
  it.each([
    ["FORBIDDEN", 403],
    ["RATE_LIMITED", 429],
    ["EMPLOYEE_NOT_FOUND", 404],
    ["USERNAME_CONFLICT", 409],
    ["LAST_COMPANY_ADMIN_REQUIRED", 409],
    ["SESSION_INVALID", 401],
    ["AUTHENTICATION_FAILED", 401],
    ["CLIENT_INVALID", 400],
    ["AUTHORIZATION_CODE_INVALID", 400],
    ["APPLICATION_SESSION_CONTEXT_INVALID", 400],
  ] as const)(
    "maps the identity error %s to status %i with its public message",
    async (code, status) => {
      const response = identityErrorResponse(
        new CompanyIdentityError(code, `public ${code}`),
      );

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({
        error: code,
        message: `public ${code}`,
      });
    },
  );

  it.each([
    ["FORBIDDEN", 403],
    ["EMPLOYEE_NOT_FOUND", 404],
    ["USERNAME_CONFLICT", 409],
    ["LAST_COMPANY_ADMIN_REQUIRED", 409],
    ["IDEMPOTENCY_REPLAY_REJECTED", 409],
    ["IDEMPOTENCY_IN_PROGRESS", 409],
    ["UNAUTHENTICATED", 401],
    ["INVALID_INPUT", 400],
    ["INVALID_IDEMPOTENCY_KEY", 400],
    ["TIMEOUT", 500],
    ["RATE_LIMITED", 500],
  ])("maps the coded kernel error %s to status %i", async (code, status) => {
    const response = identityErrorResponse(
      Object.assign(new Error(`kernel ${code}`), { code }),
    );

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({
      error: code,
      message: `kernel ${code}`,
    });
  });

  it("uses a generic message when a coded error has no string message", async () => {
    const response = identityErrorResponse({ code: "FORBIDDEN", message: 42 });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "FORBIDDEN",
      message: "The identity operation could not be completed.",
    });
  });

  it.each([
    ["an uncoded error", new Error("database password leaked")],
    ["a non-string code", { code: 500, message: "detail" }],
    ["a string", "boom"],
    ["null", null],
    ["undefined", undefined],
  ])("hides %s behind INTERNAL_ERROR", async (_name, error) => {
    const response = identityErrorResponse(error);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "INTERNAL_ERROR",
      message: "The identity operation could not be completed.",
    });
  });
});
