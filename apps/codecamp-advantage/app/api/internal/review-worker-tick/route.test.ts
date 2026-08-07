import { beforeEach, describe, expect, it, vi } from "vitest";

const runWorkerTick = vi.fn();

vi.mock("@reading-advantage/webhooks/review-worker", () => ({
  runWorkerTick,
}));

describe("POST /api/internal/review-worker-tick", () => {
  beforeEach(() => {
    vi.resetModules();
    runWorkerTick.mockReset();
    delete process.env.REVIEW_WORKER_TICK_TOKEN;
  });

  it("returns 503 when the tick token is not configured", async () => {
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/internal/review-worker-tick", { method: "POST" }));
    expect(response.status).toBe(503);
    expect(runWorkerTick).not.toHaveBeenCalled();
  });

  it("returns 401 when the bearer token does not match", async () => {
    process.env.REVIEW_WORKER_TICK_TOKEN = "a".repeat(32);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/internal/review-worker-tick", {
      method: "POST",
      headers: { authorization: "Bearer wrong-token-value-xxxxxxxx" },
    }));
    expect(response.status).toBe(401);
    expect(runWorkerTick).not.toHaveBeenCalled();
  });

  it("runs one worker tick when authorized", async () => {
    process.env.REVIEW_WORKER_TICK_TOKEN = "b".repeat(32);
    runWorkerTick.mockResolvedValue(undefined);
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/internal/review-worker-tick", {
      method: "POST",
      headers: { authorization: `Bearer ${"b".repeat(32)}` },
    }));
    expect(response.status).toBe(200);
    const body = await response.json() as { ok: boolean; durationMs: number };
    expect(body.ok).toBe(true);
    expect(typeof body.durationMs).toBe("number");
    expect(runWorkerTick).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the worker tick throws", async () => {
    process.env.REVIEW_WORKER_TICK_TOKEN = "c".repeat(32);
    runWorkerTick.mockRejectedValue(new Error("claim failed"));
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/api/internal/review-worker-tick", {
      method: "POST",
      headers: { authorization: `Bearer ${"c".repeat(32)}` },
    }));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({ error: "claim failed" });
  });
});
