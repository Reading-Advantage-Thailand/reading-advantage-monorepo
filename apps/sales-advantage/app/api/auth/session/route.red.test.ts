// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateSalesRequest: vi.fn(),
}));

vi.mock("@/lib/company-oidc", () => ({
  authenticateSalesRequest: mocks.authenticateSalesRequest,
}));

import { GET } from "./route";

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authenticateSalesRequest.mockResolvedValue(null);
  });

  it("answers an anonymous request with HTTP 200 and session null", async () => {
    const request = new Request(
      "https://sales.reading-advantage.com/api/auth/session",
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      session: null,
    });
  });

  it("returns the principal from the active auth adapter", async () => {
    const user = { id: "sales:subject", role: "SALES_REP" };
    mocks.authenticateSalesRequest.mockResolvedValue({
      user,
      scope: { kind: "company", applicationKey: "sales" },
    });

    const response = await GET(
      new Request("https://sales.reading-advantage.com/api/auth/session"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ session: { user } });
  });
});
