import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
}));

vi.mock("@reading-advantage/db", () => ({
  db: { execute: mocks.execute },
  sql: (strings: TemplateStringsArray) => strings.join(""),
}));

import { GET } from "./route";

describe("Marketing readiness route", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    mocks.execute.mockReset().mockResolvedValue([{ ready: 1 }]);
    vi.stubEnv("NODE_ENV", "test");
    process.env.COMPANY_AUTH_ISSUER_URL = "https://accounts.example.test";
    process.env.COMPANY_AUTH_OIDC_CLIENT_ID = "marketing-web";
    process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET = "s".repeat(32);
    process.env.COMPANY_AUTH_OIDC_REDIRECT_URI =
      "https://marketing.example.test/api/auth/callback";
    process.env.COMPANY_AUTH_EXPECTED_AUDIENCE = "marketing";
    process.env.COMPANY_AUTH_CLOCK_SKEW_SECONDS = "30";
  });

  it("requires the Marketing database and exact Accounts service identity", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      Response.json({
        status: "ready",
        service: "accounts",
        database: "company_identity",
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request("https://marketing.example.test/api/ready", {
        headers: { "x-request-id": "marketing-ready-request" },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL("https://accounts.example.test/api/ready"),
      expect.objectContaining({ cache: "no-store" }),
    );
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      service: "marketing",
      dependencies: { database: "ready", accounts: "ready" },
      requestId: "marketing-ready-request",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("fails closed on invalid confidential Accounts configuration", async () => {
    delete process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request("https://marketing.example.test/api/ready", {
        headers: { "x-request-id": "configuration-failure" },
      }),
    );

    expect(response.status).toBe(503);
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      status: "unavailable",
      service: "marketing",
      dependency: "configuration",
      requestId: "configuration-failure",
    });
  });

  it("classifies database failure without probing Accounts", async () => {
    mocks.execute.mockRejectedValue(new Error("database unavailable"));
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await GET(
      new Request("https://marketing.example.test/api/ready", {
        headers: { "x-request-id": "database-failure" },
      }),
    );

    expect(response.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      dependency: "database",
      requestId: "database-failure",
    });
  });

  it("rejects a response that does not identify the Accounts service", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          status: "ready",
          service: "marketing",
          database: "company_identity",
        }),
      ),
    );

    const response = await GET(
      new Request("https://marketing.example.test/api/ready", {
        headers: { "x-request-id": "accounts-identity-failure" },
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      dependency: "accounts",
      requestId: "accounts-identity-failure",
    });
  });
});
