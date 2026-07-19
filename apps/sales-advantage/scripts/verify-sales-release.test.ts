// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { verifySalesRelease } from "./verify-sales-release";

describe("Sales public release verification", () => {
  it("accepts company liveness and complete dependency readiness", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ status: "alive", service: "sales-advantage" }),
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "ready",
          service: "sales-advantage",
          mode: "company",
          dependencies: { database: "ready", accounts: "ready" },
        }),
      );

    const result = await verifySalesRelease(
      {
        baseUrl: "https://candidate---sales.example.test",
        expectedMode: "company",
      },
      fetchImplementation,
    );

    expect(result.checks).toEqual(["health", "readiness"]);
    expect(
      fetchImplementation.mock.calls.map(
        ([url]) => new URL(String(url)).pathname,
      ),
    ).toEqual(["/api/health", "/api/ready"]);
  });

  it("rejects company readiness when Accounts is not confirmed ready", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ status: "alive", service: "sales-advantage" }),
      )
      .mockResolvedValueOnce(
        Response.json({
          status: "ready",
          service: "sales-advantage",
          mode: "company",
          dependencies: { database: "ready", accounts: "not-required" },
        }),
      );

    await expect(
      verifySalesRelease(
        {
          baseUrl: "https://candidate---sales.example.test",
          expectedMode: "company",
        },
        fetchImplementation,
      ),
    ).rejects.toThrow();
  });
});
