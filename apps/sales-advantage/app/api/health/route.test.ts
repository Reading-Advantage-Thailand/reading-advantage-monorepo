import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("Sales health route", () => {
  it("reports process liveness without claiming readiness", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "alive",
      service: "sales-advantage",
    });
  });
});
