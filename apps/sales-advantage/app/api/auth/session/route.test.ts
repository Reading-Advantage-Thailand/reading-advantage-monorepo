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
    mocks.authenticateSalesRequest.mockResolvedValue({ kind: "no-session" });
  });

  it("returns 200 with session null when the adapter finds no session", async () => {
    const request = new Request(
      "https://sales.reading-advantage.com/api/auth/session",
    );
    const response = await GET(request);

    expect(mocks.authenticateSalesRequest).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      session: null,
    });
  });

  it("returns the principal from the explicitly selected auth adapter", async () => {
    const user = { id: "sales:subject", role: "SALES_REP" };
    mocks.authenticateSalesRequest.mockResolvedValue({
      kind: "authenticated",
      principal: {
        user,
        scope: { kind: "company", applicationKey: "sales" },
      },
    });

    const response = await GET(
      new Request("https://sales.reading-advantage.com/api/auth/session"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ session: { user } });
  });

  it("returns 403 with session null when the Sales role is absent", async () => {
    mocks.authenticateSalesRequest.mockResolvedValue({
      kind: "no-sales-role",
    });

    const response = await GET(
      new Request("https://sales.reading-advantage.com/api/auth/session"),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ session: null });
  });
});
