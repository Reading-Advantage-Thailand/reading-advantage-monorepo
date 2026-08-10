import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runWorkerTick: vi.fn(),
}));

vi.mock("@reading-advantage/webhooks/review-worker", () => mocks);

import { POST } from "./route";

const routeToken = "test-review-worker-tick-token";
let originalToken: string | undefined;

describe("POST /api/internal/review-worker-tick", () => {
  beforeEach(() => {
    originalToken = process.env.REVIEW_WORKER_TICK_TOKEN;
    process.env.REVIEW_WORKER_TICK_TOKEN = routeToken;
    mocks.runWorkerTick.mockReset();
  });

  afterEach(() => {
    if (originalToken === undefined) delete process.env.REVIEW_WORKER_TICK_TOKEN;
    else process.env.REVIEW_WORKER_TICK_TOKEN = originalToken;
  });

  it("rejects missing or incorrect bearer credentials without running the worker", async () => {
    const missingCredential = await POST(new Request("http://localhost/api/internal/review-worker-tick", {
      method: "POST",
    }));
    const incorrectCredential = await POST(new Request("http://localhost/api/internal/review-worker-tick", {
      method: "POST",
      headers: { authorization: "Bearer incorrect" },
    }));

    expect(missingCredential.status).toBe(401);
    expect(incorrectCredential.status).toBe(401);
    expect(mocks.runWorkerTick).not.toHaveBeenCalled();
  });

  it("runs one tick and returns success for the configured scheduler bearer credential", async () => {
    mocks.runWorkerTick.mockResolvedValue(undefined);

    const response = await POST(new Request("http://localhost/api/internal/review-worker-tick", {
      method: "POST",
      headers: { authorization: `Bearer ${routeToken}` },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.runWorkerTick).toHaveBeenCalledTimes(1);
  });

  it("returns a server error when the worker tick fails after authentication", async () => {
    mocks.runWorkerTick.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(new Request("http://localhost/api/internal/review-worker-tick", {
      method: "POST",
      headers: { authorization: `Bearer ${routeToken}` },
    }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Worker tick failed" });
    expect(mocks.runWorkerTick).toHaveBeenCalledTimes(1);
  });
});
