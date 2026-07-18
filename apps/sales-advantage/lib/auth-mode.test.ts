import { describe, expect, it } from "vitest";

import { getSalesAuthMode, isLegacySalesAuthEnabled } from "./auth-mode";

describe("Sales auth mode", () => {
  it("defaults to company mode and requires an exact legacy rollback value", () => {
    expect(getSalesAuthMode({})).toBe("company");
    expect(isLegacySalesAuthEnabled({ SALES_AUTH_MODE: "legacy-school" })).toBe(
      true,
    );
    expect(isLegacySalesAuthEnabled({ SALES_AUTH_MODE: "company" })).toBe(
      false,
    );
  });

  it("rejects ambiguous values instead of enabling ambient fallback", () => {
    expect(() => getSalesAuthMode({ SALES_AUTH_MODE: "legacy" })).toThrow(
      "SALES_AUTH_MODE must be company or legacy-school",
    );
  });
});
