import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyIdentityError } from "@reading-advantage/backend";

const { authorize, cookieGet, getIdentityComposition } = vi.hoisted(() => ({
  authorize: vi.fn(),
  cookieGet: vi.fn(),
  getIdentityComposition: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { GET, HEAD, OPTIONS } from "./route";

const ISSUER = "https://accounts.example.test";
const QUERY =
  "?client_id=sales-lms&redirect_uri=https%3A%2F%2Flms.example.test%2Fcallback" +
  "&response_type=code&scope=openid+profile&state=xyz&nonce=n-1" +
  "&code_challenge=challenge&code_challenge_method=S256";

function authorizeRequest(query = QUERY): Request {
  return new Request(`${ISSUER}/api/oidc/authorize${query}`);
}

describe("Accounts OIDC authorize route", () => {
  beforeEach(() => {
    authorize.mockReset();
    cookieGet.mockReset();
    getIdentityComposition.mockReset();
    getIdentityComposition.mockResolvedValue({
      cookie: { name: "__Host-ra_company_sso" },
      issuerUrl: ISSUER,
      service: { authorize },
    });
  });

  it("redirects an anonymous request to sign-in with a local returnTo", async () => {
    cookieGet.mockReturnValue(undefined);

    const response = await GET(authorizeRequest());

    expect(authorize).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe(ISSUER);
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("returnTo")).toBe(`/api/oidc/authorize${QUERY}`);
  });

  it("passes every protocol parameter and the SSO token to the service", async () => {
    cookieGet.mockReturnValue({ value: "opaque-sso-token" });
    authorize.mockResolvedValueOnce({
      redirectUri: "https://lms.example.test/callback",
      code: "one-time-code",
      state: "xyz",
    });

    await GET(authorizeRequest());

    expect(authorize).toHaveBeenCalledWith({
      clientId: "sales-lms",
      redirectUri: "https://lms.example.test/callback",
      responseType: "code",
      scope: "openid profile",
      state: "xyz",
      nonce: "n-1",
      codeChallenge: "challenge",
      codeChallengeMethod: "S256",
      ssoSessionToken: "opaque-sso-token",
    });
  });

  it("passes null for absent protocol parameters", async () => {
    cookieGet.mockReturnValue({ value: "opaque-sso-token" });
    authorize.mockRejectedValueOnce(
      new CompanyIdentityError("CLIENT_INVALID", "Client is invalid."),
    );

    await GET(authorizeRequest(""));

    expect(authorize).toHaveBeenCalledWith({
      clientId: null,
      redirectUri: null,
      responseType: null,
      scope: null,
      state: null,
      nonce: null,
      codeChallenge: null,
      codeChallengeMethod: null,
      ssoSessionToken: "opaque-sso-token",
    });
  });

  it("redirects to the service-approved callback with code and state", async () => {
    cookieGet.mockReturnValue({ value: "opaque-sso-token" });
    authorize.mockResolvedValueOnce({
      redirectUri: "https://lms.example.test/callback?tenant=1",
      code: "one-time-code",
      state: "xyz",
    });

    const response = await GET(authorizeRequest());

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(`${location.origin}${location.pathname}`).toBe(
      "https://lms.example.test/callback",
    );
    expect(location.searchParams.get("tenant")).toBe("1");
    expect(location.searchParams.get("code")).toBe("one-time-code");
    expect(location.searchParams.get("state")).toBe("xyz");
  });

  it("replaces a code or state already present on the registered callback", async () => {
    cookieGet.mockReturnValue({ value: "opaque-sso-token" });
    authorize.mockResolvedValueOnce({
      redirectUri: "https://lms.example.test/callback?code=stale&state=stale",
      code: "one-time-code",
      state: "xyz",
    });

    const response = await GET(authorizeRequest());

    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.getAll("code")).toEqual(["one-time-code"]);
    expect(location.searchParams.getAll("state")).toEqual(["xyz"]);
  });

  it.each([
    ["CLIENT_INVALID", 400],
    ["SESSION_INVALID", 401],
    ["FORBIDDEN", 403],
  ] as const)(
    "returns JSON for %s and never redirects to an unverified callback",
    async (code, status) => {
      cookieGet.mockReturnValue({ value: "opaque-sso-token" });
      authorize.mockRejectedValueOnce(new CompanyIdentityError(code, "denied"));

      const response = await GET(authorizeRequest());

      expect(response.status).toBe(status);
      expect(response.headers.get("location")).toBeNull();
      await expect(response.json()).resolves.toEqual({ error: code, message: "denied" });
    },
  );

  it("answers HEAD without issuing a code", async () => {
    const response = HEAD();

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(authorize).not.toHaveBeenCalled();
    expect(getIdentityComposition).not.toHaveBeenCalled();
  });

  it("answers preflight with the GET, HEAD, OPTIONS allow list", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
  });
});
