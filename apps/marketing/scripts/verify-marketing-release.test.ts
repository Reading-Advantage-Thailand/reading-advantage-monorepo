// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { verifyMarketingRelease } from "./verify-marketing-release";

describe("Marketing public release verification", () => {
  it("accepts database health and exact Accounts-backed readiness", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ status: "ok" }))
      .mockResolvedValueOnce(
        Response.json({
          status: "ready",
          service: "marketing",
          dependencies: { database: "ready", accounts: "ready" },
          requestId: "service-request",
        }),
      );

    const result = await verifyMarketingRelease(
      { baseUrl: "https://candidate-build---marketing.example.test" },
      fetchImplementation,
    );

    expect(result.checks).toEqual(["health", "readiness"]);
    expect(
      fetchImplementation.mock.calls.map(
        ([url]) => new URL(String(url)).pathname,
      ),
    ).toEqual(["/api/health/db", "/api/ready"]);
  });

  it("rejects readiness that does not confirm Accounts", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ status: "ok" }))
      .mockResolvedValueOnce(
        Response.json({
          status: "ready",
          service: "marketing",
          dependencies: { database: "ready", accounts: "unavailable" },
          requestId: "service-request",
        }),
      );

    await expect(
      verifyMarketingRelease(
        { baseUrl: "https://candidate-build---marketing.example.test" },
        fetchImplementation,
      ),
    ).rejects.toThrow();
  });

  it("rejects a non-HTTPS release origin before transport", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();

    await expect(
      verifyMarketingRelease(
        { baseUrl: "http://marketing.example.test" },
        fetchImplementation,
      ),
    ).rejects.toThrow("Marketing release URL must use HTTPS");
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
