import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRetentionCutoff } from "../audit-retention.js";

describe("getRetentionCutoff", () => {
  it("subtracts retention days from the given date", () => {
    const now = new Date("2026-06-06T00:00:00Z");
    const cutoff = getRetentionCutoff(now, 365);
    expect(cutoff).toEqual(new Date("2025-06-06T00:00:00Z"));
  });

  it("defaults to configured AUDIT_RETENTION_DAYS when not provided", () => {
    const original = process.env.AUDIT_RETENTION_DAYS;
    process.env.AUDIT_RETENTION_DAYS = "1000";
    const now = new Date("2026-06-06T00:00:00Z");
    const cutoff = getRetentionCutoff(now);
    expect(cutoff).toEqual(new Date("2023-09-10T00:00:00Z"));
    if (original !== undefined) {
      process.env.AUDIT_RETENTION_DAYS = original;
    } else {
      delete process.env.AUDIT_RETENTION_DAYS;
    }
  });

  it("uses 2557 days (≈7 years) by default", () => {
    delete process.env.AUDIT_RETENTION_DAYS;
    const now = new Date("2026-06-06T00:00:00Z");
    const cutoff = getRetentionCutoff(now);
    const expected = new Date("2026-06-06T00:00:00Z");
    expected.setDate(expected.getDate() - 2557);
    expect(cutoff).toEqual(expected);
  });

  it("handles UTC correctly", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const cutoff = getRetentionCutoff(now, 1);
    expect(cutoff).toEqual(new Date("2025-12-31T12:00:00Z"));
  });
});
