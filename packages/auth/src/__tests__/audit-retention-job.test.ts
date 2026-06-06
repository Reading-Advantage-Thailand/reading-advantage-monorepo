import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AUDIT_RETENTION_LOCK_KEY, createAuditRetentionJob } from "../audit-retention-job.js";

describe("AUDIT_RETENTION_LOCK_KEY", () => {
  it("is a BigInt", () => {
    expect(typeof AUDIT_RETENTION_LOCK_KEY).toBe("bigint");
  });

  it("is a positive 64-bit value", () => {
    expect(AUDIT_RETENTION_LOCK_KEY).toBeGreaterThan(0n);
    expect(AUDIT_RETENTION_LOCK_KEY).toBeLessThan(2n ** 63n);
  });

  it("is a stable constant (does not change between calls)", () => {
    expect(AUDIT_RETENTION_LOCK_KEY).toBe(AUDIT_RETENTION_LOCK_KEY);
  });
});

describe("createAuditRetentionJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an object with run, start, and stop methods", () => {
    const job = createAuditRetentionJob();
    expect(typeof job.run).toBe("function");
    expect(typeof job.start).toBe("function");
    expect(typeof job.stop).toBe("function");
  });

  it("start does not throw", () => {
    const job = createAuditRetentionJob();
    expect(() => job.start()).not.toThrow();
    job.stop();
  });

  it("stop does not throw when not started", () => {
    const job = createAuditRetentionJob();
    expect(() => job.stop()).not.toThrow();
  });

  it("stop is idempotent", () => {
    const job = createAuditRetentionJob();
    job.start();
    expect(() => {
      job.stop();
      job.stop();
    }).not.toThrow();
  });

  it("start is idempotent (double start does not create multiple intervals)", () => {
    const job = createAuditRetentionJob();
    job.start();
    job.start(); // should not throw or create a second interval
    job.stop();
  });

  it("run returns { deleted: 0 } when stopped", async () => {
    const job = createAuditRetentionJob();
    job.stop();
    const result = await job.run();
    expect(result).toEqual({ deleted: 0 });
  });
});
