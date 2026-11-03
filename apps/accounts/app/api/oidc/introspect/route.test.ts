import { beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyIdentityError } from "@reading-advantage/backend";

const { getIdentityComposition, introspect } = vi.hoisted(() => ({
  getIdentityComposition: vi.fn(),
  introspect: vi.fn(),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { OPTIONS, POST } from "./route";

function basic(credentials: string): string {
  return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

function introspectRequest(
  authorization: string | undefined,
  form: Record<string, string> = { token: "opaque-app-token" },
): Request {
  return new Request("https://accounts.example.test/api/oidc/introspect", {
    method: "POST",
    body: new URLSearchParams(form),
    headers: authorization === undefined ? undefined : { authorization },
  });
}

describe("Accounts OIDC introspection route", () => {
  beforeEach(() => {
    getIdentityComposition.mockReset();
    introspect.mockReset();
    getIdentityComposition.mockResolvedValue({ service: { introspect } });
  });

  it("introspects with the basic client credentials and a no-store response", async () => {
    introspect.mockResolvedValueOnce({ active: true, sub: "employee-1" });

    const response = await POST(introspectRequest(basic("sales-lms:s3cr:et")));

    expect(introspect).toHaveBeenCalledWith({
      accessToken: "opaque-app-token",
      clientId: "sales-lms",
      clientSecret: "s3cr:et",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ active: true, sub: "employee-1" });
  });

  it("passes an empty token when the form omits it", async () => {
    introspect.mockResolvedValueOnce({ active: false });

    await POST(introspectRequest(basic("sales-lms:secret"), {}));

    expect(introspect).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "" }),
    );
  });

  it.each([
    ["missing", undefined],
    ["a bearer scheme", "Bearer opaque-app-token"],
    ["a lower-case basic scheme", `basic ${Buffer.from("a:b").toString("base64")}`],
  ])("challenges %s authorization with 401", async (_name, authorization) => {
    const response = await POST(introspectRequest(authorization));

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Basic realm="accounts-introspection"',
    );
    await expect(response.json()).resolves.toEqual({ error: "invalid_client" });
    expect(introspect).not.toHaveBeenCalled();
  });

  it.each([
    ["no separator", "sales-lms"],
    ["an empty client id", ":secret"],
  ])("rejects credentials with %s", async (_name, credentials) => {
    const response = await POST(introspectRequest(basic(credentials)));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "invalid_client" });
    expect(introspect).not.toHaveBeenCalled();
  });

  it.each(["CLIENT_INVALID", "SESSION_INVALID"] as const)(
    "returns 401 for the service error %s",
    async (code) => {
      introspect.mockRejectedValueOnce(new CompanyIdentityError(code, "denied"));

      const response = await POST(introspectRequest(basic("sales-lms:wrong")));

      expect(response.status).toBe(401);
    },
  );

  it("collapses a 400 service error into invalid_client", async () => {
    introspect.mockRejectedValueOnce(
      new CompanyIdentityError("CLIENT_INVALID", "Client is invalid."),
    );

    const response = await POST(introspectRequest(basic("sales-lms:wrong")));

    await expect(response.json()).resolves.toEqual({ error: "invalid_client" });
  });

  it("keeps a non-400 service error status", async () => {
    introspect.mockRejectedValueOnce(
      new CompanyIdentityError("FORBIDDEN", "Client may not introspect."),
    );

    const response = await POST(introspectRequest(basic("sales-lms:secret")));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "FORBIDDEN",
      message: "Client may not introspect.",
    });
  });

  it("answers preflight with the POST allow list", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("POST, OPTIONS");
  });
});
