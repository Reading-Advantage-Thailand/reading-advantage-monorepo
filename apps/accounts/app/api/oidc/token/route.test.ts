import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyIdentityError } from "@reading-advantage/backend";

const { exchangeCode, getIdentityComposition, warn } = vi.hoisted(() => ({
  exchangeCode: vi.fn(),
  getIdentityComposition: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { OPTIONS, POST } from "./route";

describe("Accounts OIDC token route", () => {
  beforeEach(() => {
    exchangeCode.mockReset();
    getIdentityComposition.mockReset();
    warn.mockReset();
    getIdentityComposition.mockResolvedValue({
      logger: { warn },
      service: { exchangeCode },
    });
  });

  it("logs unexpected token failures before returning invalid_request", async () => {
    exchangeCode.mockRejectedValueOnce(new Error("database failure"));

    const response = await POST(
      new Request("https://accounts.example.test/api/oidc/token", {
        method: "POST",
        body: new URLSearchParams({ grant_type: "authorization_code" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(warn).toHaveBeenCalledWith("accounts.oidc.token.unexpected_failure");
  });
});

function basic(credentials: string): string {
  return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

function tokenRequest(
  form: Record<string, string>,
  authorization?: string,
): Request {
  return new Request("https://accounts.example.test/api/oidc/token", {
    method: "POST",
    body: new URLSearchParams(form),
    headers: authorization === undefined ? undefined : { authorization },
  });
}

const CODE_FORM = {
  grant_type: "authorization_code",
  code: "one-time-code",
  redirect_uri: "https://lms.example.test/callback",
  code_verifier: "verifier",
};

describe("Accounts OIDC token exchange", () => {
  beforeEach(() => {
    exchangeCode.mockReset();
    getIdentityComposition.mockReset();
    warn.mockReset();
    getIdentityComposition.mockResolvedValue({
      logger: { warn },
      service: { exchangeCode },
    });
  });

  it("returns the OAuth token response with no-store caching", async () => {
    exchangeCode.mockResolvedValueOnce({
      accessToken: "opaque-app-token",
      tokenType: "Bearer",
      expiresIn: 3600,
      idToken: "signed.id.token",
    });

    const response = await POST(tokenRequest(CODE_FORM, basic("sales-lms:secret")));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    await expect(response.json()).resolves.toEqual({
      access_token: "opaque-app-token",
      token_type: "Bearer",
      expires_in: 3600,
      id_token: "signed.id.token",
    });
  });

  it("prefers basic credentials over form credentials", async () => {
    exchangeCode.mockResolvedValueOnce({});

    await POST(
      tokenRequest(
        { ...CODE_FORM, client_id: "form-client", client_secret: "form-secret" },
        basic("sales-lms:s3cr:et"),
      ),
    );

    expect(exchangeCode).toHaveBeenCalledWith({
      grantType: "authorization_code",
      code: "one-time-code",
      clientId: "sales-lms",
      clientSecret: "s3cr:et",
      redirectUri: "https://lms.example.test/callback",
      codeVerifier: "verifier",
    });
  });

  it("uses form credentials for a public client without basic auth", async () => {
    exchangeCode.mockResolvedValueOnce({});

    await POST(tokenRequest({ ...CODE_FORM, client_id: "public-app" }));

    expect(exchangeCode).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "public-app", clientSecret: undefined }),
    );
  });

  it("ignores a basic header without a separator", async () => {
    exchangeCode.mockResolvedValueOnce({});

    await POST(
      tokenRequest({ ...CODE_FORM, client_id: "public-app" }, basic("no-separator")),
    );

    expect(exchangeCode).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "public-app", clientSecret: undefined }),
    );
  });

  it("challenges an invalid client with 401", async () => {
    exchangeCode.mockRejectedValueOnce(
      new CompanyIdentityError("CLIENT_INVALID", "Client is invalid."),
    );

    const response = await POST(tokenRequest(CODE_FORM, basic("sales-lms:wrong")));

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe('Basic realm="accounts-token"');
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: "invalid_client" });
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(["AUTHORIZATION_CODE_INVALID", "SESSION_INVALID"] as const)(
    "maps %s to invalid_grant without an unexpected-failure log",
    async (code) => {
      exchangeCode.mockRejectedValueOnce(new CompanyIdentityError(code, "denied"));

      const response = await POST(tokenRequest(CODE_FORM));

      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      await expect(response.json()).resolves.toEqual({ error: "invalid_grant" });
      expect(warn).not.toHaveBeenCalled();
    },
  );

  it("returns invalid_request when the composition fails before logging is ready", async () => {
    getIdentityComposition.mockRejectedValueOnce(new Error("missing secret"));

    const response = await POST(tokenRequest(CODE_FORM));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("answers preflight with the POST allow list", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("POST, OPTIONS");
  });
});
