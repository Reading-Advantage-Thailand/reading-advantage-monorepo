import { describe, expect, it } from "vitest";

import { GET, HEAD, OPTIONS } from "./route";

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

describe("Accounts health framework methods", () => {
  it("answers HEAD with an empty no-store 204", async () => {
    const response = HEAD();

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("");
  });

  it("answers preflight with the GET, HEAD, OPTIONS allow list", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
  });
});
