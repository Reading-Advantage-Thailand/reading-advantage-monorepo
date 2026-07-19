import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("Accounts health route", () => {
  it("reports process liveness without claiming database readiness", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "alive",
      service: "accounts",
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
