import { describe, expect, it } from "vitest";

import {
  assertPresentationBlocked,
  assertResponsiveCompositionBlocked,
  createResponsiveCompositionGuard,
  PRESENTATION_BLOCKED_DIAGNOSTIC,
  RESPONSIVE_BLOCKED_DIAGNOSTIC,
} from "../blocked-scopes.js";

describe("blocked scopes fail-closed guard", () => {
  it("documents the exact T10 responsive boundary counts", () => {
    expect(RESPONSIVE_BLOCKED_DIAGNOSTIC.blockedContracts).toBe(354);
    expect(RESPONSIVE_BLOCKED_DIAGNOSTIC.blockedCells).toBe(5664);
    expect(RESPONSIVE_BLOCKED_DIAGNOSTIC.acceptedContracts).toBe(0);
  });

  it("throws when any code attempts to initialize responsive composition", () => {
    expect(() => assertResponsiveCompositionBlocked()).toThrow(/354 contracts.*5664 cells/s);
  });

  it("returns a guard whose resolve method always fails closed", () => {
    const guard = createResponsiveCompositionGuard();
    expect(() => guard.resolveProfile({ width: 390, height: 844 })).toThrow(/responsive/i);
    expect(() => guard.planRegions({ width: 390, height: 844 })).toThrow(/responsive/i);
  });

  it("emits a structured APKBlockedScopeError with machine-readable scope", () => {
    try {
      assertResponsiveCompositionBlocked();
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error & { scope?: string }).scope).toBe("responsive");
    }
  });

  it("throws when any code attempts to initialize standard presentation components", () => {
    expect(() => assertPresentationBlocked()).toThrow(/blocked.*responsive.*asset mappings/i);
  });

  it("documents the exact blocked presentation boundary", () => {
    expect(PRESENTATION_BLOCKED_DIAGNOSTIC.blockedResponsiveCells).toBe(5664);
    expect(PRESENTATION_BLOCKED_DIAGNOSTIC.blockedAssetMappings).toBe(85);
  });

  it("fails closed on every responsive guard method", () => {
    const guard = createResponsiveCompositionGuard();
    expect(() => guard.resolveSafeAreas()).toThrow(/responsive/i);
    expect(() => guard.measureText()).toThrow(/responsive/i);
  });
});
