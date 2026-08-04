import { describe, expect, it } from "vitest";

import {
  DEVELOPER_KIT_API_VERSION,
  DEVELOPER_KIT_COMPATIBILITY,
  buildDeveloperKitCompatibilityReport,
} from "../developer-kit-api.js";

describe("versioned developer kit API and compatibility plan", () => {
  it("pins the developer-kit API version bound to the accepted release", () => {
    expect(DEVELOPER_KIT_API_VERSION).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(DEVELOPER_KIT_COMPATIBILITY.standardPackReleaseVersion).toBe("2026.08.04");
  });

  it("lists the seven accepted capabilities as the supported API surface", () => {
    expect(DEVELOPER_KIT_COMPATIBILITY.acceptedCapabilityIds).toHaveLength(7);
    expect(DEVELOPER_KIT_COMPATIBILITY.acceptedCapabilityIds).toContain(
      "capability:nonempty-content-precondition",
    );
  });

  it("keeps the zero-approved historical T10 mapping boundary distinct from forward bindings", () => {
    expect(DEVELOPER_KIT_COMPATIBILITY.approvedAssetMappings).toBe(0);
    expect(DEVELOPER_KIT_COMPATIBILITY.blockedAssetMappings).toBe(85);
    expect(DEVELOPER_KIT_COMPATIBILITY.historicalT10Boundary.approvedAssetMappings).toBe(0);
    expect(DEVELOPER_KIT_COMPATIBILITY.ownerApprovedProductBindings).toBe(7);
  });

  it("preserves historical blocked-scope evidence while publishing supported forward scopes", () => {
    expect(DEVELOPER_KIT_COMPATIBILITY.blockedScopes.runtime).toBe(false);
    expect(DEVELOPER_KIT_COMPATIBILITY.blockedScopes.responsive).toBe(false);
    expect(DEVELOPER_KIT_COMPATIBILITY.blockedScopes.presentation).toBe(false);
    expect(DEVELOPER_KIT_COMPATIBILITY.blockedScopes.assetMappings).toBe(true);
    expect(DEVELOPER_KIT_COMPATIBILITY.blockedScopes.unknownMustHaves).toBe(true);
    expect(DEVELOPER_KIT_COMPATIBILITY.supportedForwardScopes).toContain("runtime");
    expect(DEVELOPER_KIT_COMPATIBILITY.supportedForwardScopes).toContain("responsive");
    expect(DEVELOPER_KIT_COMPATIBILITY.supportedForwardScopes).toContain("presentation");
  });

  it("builds a frozen compatibility report for downstream cohort tracks", () => {
    const report = buildDeveloperKitCompatibilityReport();

    expect(Object.isFrozen(report)).toBe(true);
    expect(report.apiVersion).toBe(DEVELOPER_KIT_API_VERSION);
    expect(report.standardPackReleaseVersion).toBe("2026.08.04");
    expect(report.trackId).toBe("apk_shared_developer_kit_20260712");
    expect(report.resolverContract).toBe("createAcceptedStandardAssetResolver");
    expect(report.selectedUnionContract).toBe("materializeStandardAssetUnion");
    expect(report.attributionContract).toBe("Pixel art assets by ElvGames");
  });

  it("forbids direct physical asset imports, edition/theme bindings, and copied pack trees", () => {
    for (const rule of DEVELOPER_KIT_COMPATIBILITY.forbiddenPatterns) {
      expect(rule).toMatch(/prohibited|forbidden|rejected/i);
    }
    expect(DEVELOPER_KIT_COMPATIBILITY.forbiddenPatterns.length).toBeGreaterThan(0);
  });
});
