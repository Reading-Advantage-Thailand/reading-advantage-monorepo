// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const oidc = vi.hoisted(() => ({
  introspect: vi.fn(),
  accountingSessionUser: vi.fn(),
  readAccountingCookie: vi.fn(),
}));
const cookieStore = vi.hoisted(() => ({ get: vi.fn() }));
const cookies = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

vi.mock("@/app/lib/company-oidc", () => ({
  ACCOUNTING_SESSION_COOKIE: "accounting_session",
  accountingSessionUser: oidc.accountingSessionUser,
  getAccountingOidcClient: () => ({ introspect: oidc.introspect }),
  readAccountingCookie: oidc.readAccountingCookie,
}));
vi.mock("next/headers", () => ({ cookies }));
vi.mock("next/navigation", () => ({ redirect }));

import {
  getAccountingSessionOrRedirect,
  requireAccountingSession,
} from "@/app/lib/auth";

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "OWNER",
  companyId: "33333333-3333-4333-8333-333333333333",
};

describe("requireAccountingSession failure handling", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    oidc.readAccountingCookie.mockReturnValue("opaque-token");
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("reads the session cookie by the accounting cookie name", async () => {
    oidc.introspect.mockResolvedValue({ identity: { sub: "x" } });
    oidc.accountingSessionUser.mockReturnValue(user);
    const request = new Request("https://accounting.test/api/submissions");

    const guard = await requireAccountingSession(request);

    expect(oidc.readAccountingCookie).toHaveBeenCalledWith(
      request,
      "accounting_session",
    );
    expect(oidc.introspect).toHaveBeenCalledWith("opaque-token");
    expect(oidc.accountingSessionUser).toHaveBeenCalledWith({ sub: "x" });
    expect(guard).toEqual({ ok: true, session: { user } });
  });

  it("returns 401 without introspection when the cookie is empty", async () => {
    oidc.readAccountingCookie.mockReturnValue("");

    const guard = await requireAccountingSession(new Request("https://a.test"));

    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.response.status).toBe(401);
      await expect(guard.response.json()).resolves.toEqual({
        message: "Authentication required",
      });
    }
    expect(oidc.introspect).not.toHaveBeenCalled();
  });

  it("returns 503 and logs only the error name when introspection throws", async () => {
    oidc.introspect.mockRejectedValue(
      new TypeError("secret upstream detail token=abc"),
    );

    const guard = await requireAccountingSession(new Request("https://a.test"));

    expect(guard.ok).toBe(false);
    if (!guard.ok) {
      expect(guard.response.status).toBe(503);
      expect(guard.response.headers.get("content-type")).toBe(
        "application/json",
      );
      await expect(guard.response.json()).resolves.toEqual({
        message: "Authentication unavailable",
      });
    }
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const logged = String(errorSpy.mock.calls[0][0]);
    expect(JSON.parse(logged)).toEqual({
      level: "error",
      event: "accounting_session_guard_failed",
      errorName: "TypeError",
    });
    expect(logged).not.toContain("secret upstream detail");
  });

  it("logs UnknownError when a non-Error value is thrown", async () => {
    oidc.introspect.mockRejectedValue("plain string failure");

    const guard = await requireAccountingSession(new Request("https://a.test"));

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(503);
    expect(JSON.parse(String(errorSpy.mock.calls[0][0]))).toMatchObject({
      errorName: "UnknownError",
    });
  });

  it("returns 503 when the role projection throws", async () => {
    oidc.introspect.mockResolvedValue({ identity: {} });
    oidc.accountingSessionUser.mockImplementation(() => {
      throw new RangeError("bad identity shape");
    });

    const guard = await requireAccountingSession(new Request("https://a.test"));

    expect(guard.ok).toBe(false);
    if (!guard.ok) expect(guard.response.status).toBe(503);
  });
});

describe("getAccountingSessionOrRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookies.mockResolvedValue(cookieStore);
  });

  it("returns the session user for an active accounting session", async () => {
    cookieStore.get.mockReturnValue({ value: "opaque-token" });
    oidc.introspect.mockResolvedValue({ identity: { sub: "x" } });
    oidc.accountingSessionUser.mockReturnValue(user);

    await expect(getAccountingSessionOrRedirect()).resolves.toEqual({ user });
    expect(cookieStore.get).toHaveBeenCalledWith("accounting_session");
    expect(oidc.introspect).toHaveBeenCalledWith("opaque-token");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to login when the cookie is missing", async () => {
    cookieStore.get.mockReturnValue(undefined);

    await expect(getAccountingSessionOrRedirect()).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(redirect).toHaveBeenCalledWith("/login");
    expect(oidc.introspect).not.toHaveBeenCalled();
  });

  it("redirects to login when the session is inactive", async () => {
    cookieStore.get.mockReturnValue({ value: "revoked" });
    oidc.introspect.mockResolvedValue(null);

    await expect(getAccountingSessionOrRedirect()).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to login when the identity lacks an accounting role", async () => {
    cookieStore.get.mockReturnValue({ value: "opaque-token" });
    oidc.introspect.mockResolvedValue({ identity: { sub: "x" } });
    oidc.accountingSessionUser.mockReturnValue(null);

    await expect(getAccountingSessionOrRedirect()).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to login when introspection throws", async () => {
    cookieStore.get.mockReturnValue({ value: "opaque-token" });
    oidc.introspect.mockRejectedValue(new Error("accounts unavailable"));

    await expect(getAccountingSessionOrRedirect()).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("redirects to login when reading cookies throws", async () => {
    cookies.mockRejectedValue(new Error("outside request scope"));

    await expect(getAccountingSessionOrRedirect()).rejects.toThrow(
      "NEXT_REDIRECT:/login",
    );
    expect(oidc.introspect).not.toHaveBeenCalled();
  });
});
