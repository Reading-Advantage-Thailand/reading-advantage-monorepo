// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  introspect: vi.fn(),
  readSalesCookie: vi.fn(),
  salesSessionUser: vi.fn(),
}));

vi.mock("@/lib/company-oidc", () => ({
  SALES_SESSION_COOKIE: "__Host-ra_sales_session",
  getSalesOidcClient: () => ({ introspect: mocks.introspect }),
  readSalesCookie: mocks.readSalesCookie,
  salesSessionUser: mocks.salesSessionUser,
}));

import { GET } from "./route";

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readSalesCookie.mockReturnValue("opaque-session");
    mocks.introspect.mockResolvedValue({ identity: { roles: [] } });
  });

  it("returns an anonymous session when Accounts reports suspension", async () => {
    mocks.introspect.mockResolvedValue(null);

    const response = await GET(
      new Request("https://sales.reading-advantage.com/api/auth/session"),
    );

    expect(mocks.salesSessionUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ session: null });
  });

  it("returns an anonymous session when the Sales role was removed", async () => {
    mocks.salesSessionUser.mockResolvedValue(null);

    const response = await GET(
      new Request("https://sales.reading-advantage.com/api/auth/session"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ session: null });
  });
});
