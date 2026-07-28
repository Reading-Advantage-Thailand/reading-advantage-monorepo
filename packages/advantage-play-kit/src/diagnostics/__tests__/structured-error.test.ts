import { describe, expect, it } from "vitest";

import { APKBlockedScopeError, APKUnsupportedCapabilityError } from "../structured-error.js";

describe("APK structured diagnostics", () => {
  it("builds a blocked-scope error with the exact T10 boundary counts", () => {
    const error = new APKBlockedScopeError(
      "responsive",
      "Responsive composition requires accepted responsive contracts; 354 contracts / 5664 cells remain blocked by T10.",
      { blockedContracts: 354, blockedCells: 5664, acceptedContracts: 0 },
    );

    expect(error.name).toBe("APKBlockedScopeError");
    expect(error.scope).toBe("responsive");
    expect(error.message).toContain("354 contracts");
    expect(error.details).toEqual({ blockedContracts: 354, blockedCells: 5664, acceptedContracts: 0 });
    expect(error instanceof Error).toBe(true);
  });

  it("builds an unsupported-capability error for any id outside the accepted registry", () => {
    const error = new APKUnsupportedCapabilityError(
      "capability:title-specific-boss-fight",
      ["capability:bounded-frame-delta", "capability:result-accounting"],
    );

    expect(error.name).toBe("APKUnsupportedCapabilityError");
    expect(error.requestedCapabilityId).toBe("capability:title-specific-boss-fight");
    expect(error.acceptedCapabilityIds).toContain("capability:result-accounting");
    expect(error.message).toContain("title-specific-boss-fight");
  });
});
