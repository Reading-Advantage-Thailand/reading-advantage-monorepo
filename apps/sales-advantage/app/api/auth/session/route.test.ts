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

  it("returns the contracted denial when the selected adapter denies access", async () => {
    const request = new Request(
      "https://sales.reading-advantage.com/api/auth/session",
    );
    const response = await GET(request);

    expect(mocks.authenticateSalesRequest).toHaveBeenCalledWith(request);
    // The SSO parity contract makes a missing app role an explicit denial.
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      session: null,
      denied: true,
    });
  });

  it("returns the principal from the explicitly selected auth adapter", async () => {
    const user = { id: "sales:subject", role: "SALES_REP" };
    mocks.authenticateSalesRequest.mockResolvedValue({
      user,
      scope: { kind: "company", applicationKey: "sales" },
    });

    const response = await GET(
      new Request("https://sales.reading-advantage.com/api/auth/session"),
    );

    await expect(response.json()).resolves.toEqual({ session: { user } });
  });
});
