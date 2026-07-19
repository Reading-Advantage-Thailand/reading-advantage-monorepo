import { beforeEach, describe, expect, it, vi } from "vitest";

const { probeDatabase } = vi.hoisted(() => ({
  probeDatabase: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/lib/server/identity", () => ({
  getIdentityComposition: vi.fn(async () => ({ probeDatabase })),
}));

import { GET } from "./route";

describe("Accounts readiness route", () => {
  beforeEach(() => probeDatabase.mockReset());

  it("reports the identity database as ready after a live probe", async () => {
    probeDatabase.mockResolvedValueOnce();

    const response = await GET();

    expect(probeDatabase).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      service: "accounts",
      database: "company_identity",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("reports unavailable when the live database probe fails", async () => {
    probeDatabase.mockRejectedValueOnce(
      new Error("database detail must stay private"),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      service: "accounts",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
