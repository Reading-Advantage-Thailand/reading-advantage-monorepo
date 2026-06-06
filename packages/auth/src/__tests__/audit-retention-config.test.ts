import { describe, it, expect, beforeEach } from "vitest";
import { retentionConfigSchema, getRetentionDays } from "../audit-retention-config.js";

describe("retentionConfigSchema", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AUDIT_RETENTION_DAYS;
  });

  it("defaults AUDIT_RETENTION_DAYS to 2557 (≈7 years)", () => {
    const result = retentionConfigSchema.parse({});
    expect(result.AUDIT_RETENTION_DAYS).toBe(2557);
  });

  it("accepts a valid integer ≥ 365", () => {
    const result = retentionConfigSchema.parse({ AUDIT_RETENTION_DAYS: "365" });
    expect(result.AUDIT_RETENTION_DAYS).toBe(365);
  });

  it("accepts large values", () => {
    const result = retentionConfigSchema.parse({ AUDIT_RETENTION_DAYS: "3650" });
    expect(result.AUDIT_RETENTION_DAYS).toBe(3650);
  });

  it("rejects values < 365", () => {
    expect(() =>
      retentionConfigSchema.parse({ AUDIT_RETENTION_DAYS: "364" })
    ).toThrow();
  });

  it("rejects zero", () => {
    expect(() =>
      retentionConfigSchema.parse({ AUDIT_RETENTION_DAYS: "0" })
    ).toThrow();
  });

  it("rejects negative values", () => {
    expect(() =>
      retentionConfigSchema.parse({ AUDIT_RETENTION_DAYS: "-1" })
    ).toThrow();
  });

  it("rejects non-integer values (NaN)", () => {
    expect(() =>
      retentionConfigSchema.parse({ AUDIT_RETENTION_DAYS: "abc" })
    ).toThrow();
  });

  it("rejects fractional values", () => {
    expect(() =>
      retentionConfigSchema.parse({ AUDIT_RETENTION_DAYS: "365.5" })
    ).toThrow();
  });
});

describe("getRetentionDays", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AUDIT_RETENTION_DAYS;
  });

  it("returns the default 2557 when env is unset", () => {
    expect(getRetentionDays()).toBe(2557);
  });

  it("returns the configured value when env is set", () => {
    process.env.AUDIT_RETENTION_DAYS = "500";
    expect(getRetentionDays()).toBe(500);
  });
});
