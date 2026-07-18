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
      productScope: null,
    });
    expect(mocks.createContext.mock.calls[0]?.[0]).not.toHaveProperty(
      "authorization",
    );
  });

  it("uses anonymous verified-principal context when the Sales role was removed", async () => {
    mocks.readSalesCookie.mockReturnValue("opaque-sales-session");
    mocks.introspect.mockResolvedValue({ identity: { roles: [] } });
    mocks.salesSessionUser.mockResolvedValue(null);

    const response = await POST(new Request(
      "https://sales.reading-advantage.com/api/trpc",
      { method: "POST" },
    ));

    expect(response.status).toBe(204);
    expect(mocks.createContext).toHaveBeenCalledWith({
      mode: "verified-principal",
      principal: null,
      productScope: null,
    });
  });

  it("stays anonymous when Accounts reports a suspended application session", async () => {
    mocks.readSalesCookie.mockReturnValue("opaque-sales-session");
    mocks.introspect.mockResolvedValue(null);

    await POST(new Request(
      "https://sales.reading-advantage.com/api/trpc",
      { method: "POST" },
    ));

    expect(mocks.salesSessionUser).not.toHaveBeenCalled();
    expect(mocks.createContext).toHaveBeenCalledWith({
      mode: "verified-principal",
      principal: null,
      productScope: null,
    });
  });

  it("passes only a principal resolved from the Sales application session", async () => {
    const user = { id: "local-sales-principal", role: "SALES_REP" };
    const scope = {
      kind: "company",
      applicationKey: "sales",
      organizationId: "20000000-0000-4000-8000-000000000003",
      organizationKey: "internal-company",
    };
    const principal = { user, scope };
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
      principal: user,
      productScope: scope,
    });
    expect(mocks.createContext.mock.calls[0]?.[0]).not.toHaveProperty(
      "authorization",
    );
  });
});
