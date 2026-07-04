import { describe, it, expect } from "vitest";
import { settleJob } from "../review-worker.js";

interface SettleJobInput {
  id: string;
  attempts: number;
  maxAttempts: number;
  status?: string;
}

describe("Phase 3 — retry backoff", () => {
  it("failure increments attempts and keeps status pending with exponential backoff", () => {
    const baseDelayMs = 1000;
    const job = {
      id: "job-1",
      attempts: 1,
      maxAttempts: 5,
      status: "claimed",
    } as unknown as SettleJobInput;

    const settled = settleJob(job, new Error("model timeout"), {
      baseDelayMs,
      maxJitterMs: 0,
    });

    expect(settled.status, "retry status").toBe("pending");
    expect(settled.attempts, "retry attempts").toBe(2);
    expect(settled.lastError, "retry lastError").toBe("model timeout");

    const expectedMin = baseDelayMs * Math.pow(2, 1);
    const actualDelay = settled.nextAttemptAt.getTime() - Date.now();
    expect(actualDelay, "backoff delay ms").toBeGreaterThanOrEqual(expectedMin - 50);
  });

  it("backoff includes bounded jitter", () => {
    const baseDelayMs = 1000;
    const maxJitterMs = 200;
    const job = {
      id: "job-1",
      attempts: 2,
      maxAttempts: 5,
    } as unknown as SettleJobInput;

    const settled = settleJob(job, new Error("model timeout"), {
      baseDelayMs,
      maxJitterMs,
    });

    const expectedMin = baseDelayMs * Math.pow(2, 2);
    const expectedMax = expectedMin + maxJitterMs;
    const actualDelay = settled.nextAttemptAt.getTime() - Date.now();

    expect(actualDelay, "jittered backoff lower bound").toBeGreaterThanOrEqual(expectedMin - 50);
    expect(actualDelay, "jittered backoff upper bound").toBeLessThanOrEqual(expectedMax + 50);
  });
});
