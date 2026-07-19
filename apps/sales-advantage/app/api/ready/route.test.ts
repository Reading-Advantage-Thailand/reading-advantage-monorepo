import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  getSalesAuthMode: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({
  db: { execute: mocks.execute },
  sql: (strings: TemplateStringsArray) => strings.join(""),
}));

vi.mock("@/lib/auth-mode", () => ({
  getSalesAuthMode: mocks.getSalesAuthMode,
}));

import { GET } from "./route";

describe("Sales readiness route", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    mocks.execute.mockReset().mockResolvedValue([{ ready: 1 }]);
    mocks.getSalesAuthMode.mockReset().mockReturnValue("company");
    vi.stubEnv("NODE_ENV", "test");
    process.env.COMPANY_AUTH_ISSUER_URL = "https://accounts.example.test";
    process.env.COMPANY_AUTH_OIDC_CLIENT_ID = "sales-web";
    process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET = "s".repeat(32);
    process.env.COMPANY_AUTH_OIDC_REDIRECT_URI =
      "https://sales.example.test/api/auth/callback";
    process.env.COMPANY_AUTH_EXPECTED_AUDIENCE = "sales";
    process.env.COMPANY_AUTH_CLOCK_SKEW_SECONDS = "30";
  });

  it("checks only the Sales database in legacy rollback mode", async () => {
    mocks.getSalesAuthMode.mockReturnValue("legacy-school");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request("https://sales.example.test/api/ready", {
        headers: { "x-request-id": "legacy-ready-request" },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      status: "ready",
      mode: "legacy-school",
      dependencies: { database: "ready", accounts: "not-required" },
      requestId: "legacy-ready-request",
    });
  });

  it("requires validated Accounts readiness in company mode", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      Response.json({
        status: "ready",
        service: "accounts",
        database: "company_identity",
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request("https://sales.example.test/api/ready", {
        headers: { "x-request-id": "company-ready-request" },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL("https://accounts.example.test/api/ready"),
      expect.objectContaining({ cache: "no-store" }),
    );
    await expect(response.json()).resolves.toMatchObject({
      status: "ready",
      mode: "company",
      dependencies: { database: "ready", accounts: "ready" },
      requestId: "company-ready-request",
    });
  });

  it("classifies a Sales database failure without probing Accounts", async () => {
    mocks.execute.mockRejectedValue(new Error("database unavailable"));
    const fetchSpy = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request("https://sales.example.test/api/ready", {
        headers: { "x-request-id": "database-failure-request" },
      }),
    );

    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      service: "sales-advantage",
      dependency: "database",
      requestId: "database-failure-request",
    });
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      event: "sales_readiness_failed",
      dependency: "database",
      requestId: "database-failure-request",
    });
    errorSpy.mockRestore();
  });

  it("returns a structured configuration failure for an invalid auth mode", async () => {
    mocks.getSalesAuthMode.mockImplementation(() => {
      throw new Error("invalid auth mode");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(
      new Request("https://sales.example.test/api/ready", {
        headers: { "x-request-id": "configuration-failure-request" },
      }),
    );

    expect(response.status).toBe(503);
    expect(mocks.execute).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      service: "sales-advantage",
      dependency: "configuration",
      requestId: "configuration-failure-request",
    });
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      event: "sales_readiness_failed",
      mode: "unknown",
      dependency: "configuration",
      requestId: "configuration-failure-request",
    });
    errorSpy.mockRestore();
  });

  it("rejects an incomplete confidential OIDC client before dependency probes", async () => {
    process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET = "too-short";
    const fetchSpy = vi.fn();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request("https://sales.example.test/api/ready", {
        headers: { "x-request-id": "oidc-configuration-failure-request" },
      }),
    );

    expect(response.status).toBe(503);
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      status: "unavailable",
      dependency: "configuration",
      requestId: "oidc-configuration-failure-request",
    });
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      event: "sales_readiness_failed",
      mode: "company",
      dependency: "configuration",
    });
    errorSpy.mockRestore();
  });

  it.each([
    ["unavailable status", new Response("unavailable", { status: 503 })],
    [
      "invalid database",
      Response.json({
        status: "ready",
        service: "accounts",
        database: "wrong",
      }),
    ],
    [
      "wrong service",
      Response.json({
        status: "ready",
        service: "another-service",
        database: "company_identity",
      }),
    ],
  ])("classifies an Accounts %s as unavailable", async (_label, result) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(result));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(
      new Request("https://sales.example.test/api/ready", {
        headers: { "x-request-id": "accounts-failure-request" },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "unavailable",
      dependency: "accounts",
      requestId: "accounts-failure-request",
    });
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      event: "sales_readiness_failed",
      dependency: "accounts",
      requestId: "accounts-failure-request",
    });
    errorSpy.mockRestore();
  });
});
