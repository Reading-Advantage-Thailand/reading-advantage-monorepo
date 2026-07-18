// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createContext: vi.fn(),
  readSalesCookie: vi.fn(),
  introspect: vi.fn(),
  salesSessionUser: vi.fn(),
}));

vi.mock("@trpc/server/adapters/fetch", () => ({
  fetchRequestHandler: vi.fn(
    async (options: { createContext: () => Promise<unknown> | unknown }) => {
      await options.createContext();
      return new Response(null, { status: 204 });
    },
  ),
}));

vi.mock("@reading-advantage/api/sales", () => ({ salesAppRouter: {} }));
vi.mock("@reading-advantage/api/context", () => ({
  createContext: mocks.createContext,
}));
vi.mock("@/lib/company-oidc", () => ({
  SALES_SESSION_COOKIE: "__Host-ra_sales_session",
  getSalesOidcClient: () => ({ introspect: mocks.introspect }),
  readSalesCookie: mocks.readSalesCookie,
  salesSessionUser: mocks.salesSessionUser,
}));

import { POST } from "./route";

describe("Sales tRPC company-principal boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createContext.mockResolvedValue({ auth: null });
  });

  it("does not forward raw bearer evidence to shared legacy context fallback", async () => {
    mocks.readSalesCookie.mockReturnValue(undefined);

    const response = await POST(
      new Request("https://sales.reading-advantage.com/api/trpc", {
        method: "POST",
        headers: { authorization: "Bearer legacy-session-token" },
      }),
    );

    expect(response.status).toBe(204);
    expect(mocks.introspect).not.toHaveBeenCalled();
    expect(mocks.createContext).toHaveBeenCalledWith({
      mode: "verified-principal",
      principal: null,
    });
    expect(mocks.createContext.mock.calls[0]?.[0]).not.toHaveProperty(
      "authorization",
    );
  });

  it("passes only a principal resolved from the Sales application session", async () => {
    const principal = { id: "local-sales-principal", role: "SALES_REP" };
    mocks.readSalesCookie.mockReturnValue("opaque-sales-session");
    mocks.introspect.mockResolvedValue({ identity: { sub: "company-account" } });
    mocks.salesSessionUser.mockResolvedValue(principal);

    await POST(
      new Request("https://sales.reading-advantage.com/api/trpc", {
        method: "POST",
        headers: { authorization: "Bearer ignored-legacy-token" },
      }),
    );

    expect(mocks.introspect).toHaveBeenCalledWith("opaque-sales-session");
    expect(mocks.createContext).toHaveBeenCalledWith({
      mode: "verified-principal",
      principal,
    });
    expect(mocks.createContext.mock.calls[0]?.[0]).not.toHaveProperty(
      "authorization",
    );
  });
});
