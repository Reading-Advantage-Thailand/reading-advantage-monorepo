import { describe, expect, it } from "vitest";

import {
  ACCEPTED_CAPABILITY_IDS,
  ACCEPTED_CAPABILITY_REGISTRY,
  ACCEPTED_T10_INPUTS,
  buildAcceptedCapabilityManifest,
} from "../capability-manifest.js";

describe("accepted capability manifest", () => {
  it("pins exactly the seven T10-accepted capability identifiers", () => {
    expect(ACCEPTED_CAPABILITY_IDS).toEqual([
      "capability:bounded-frame-delta",
      "capability:input-action-normalization",
      "capability:language-target-progression",
      "capability:nonempty-content-precondition",
      "capability:result-accounting",
      "capability:single-completion-emission",
      "capability:time-and-frame-loop",
    ]);
    expect(ACCEPTED_CAPABILITY_IDS).toHaveLength(7);
  });

  it("binds each capability to its owning package, shared-core contract, and source games", () => {
    for (const capability of ACCEPTED_CAPABILITY_REGISTRY) {
      expect(capability.id).toMatch(/^capability:[a-z-]+$/u);
      expect(capability.owningPackage).toBe("@reading-advantage/advantage-play-kit");
      expect(capability.sharedCore).toMatch(/shared/i);
      expect(capability.gameExtensions).toMatch(/game/i);
      expect(capability.interfaceConsequence.length).toBeGreaterThan(0);
      expect(
        /transport|transport-independent|pure|without|never depend|consume|callback/i.test(
          capability.interfaceConsequence,
        ),
      ).toBe(true);
      expect(capability.sourceGameIds.length).toBeGreaterThan(0);
      expect(capability.sourceUseIds.length).toBeGreaterThan(0);
      expect(capability.extensionBoundaryFindingIds.length).toBeGreaterThan(0);
    }
  });

  it("binds the exact T10 accepted manifest, successor hash-set, and owner-acceptance digests", () => {
    expect(ACCEPTED_T10_INPUTS.acceptedManifestSha256).toBe(
      "e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49",
    );
    expect(ACCEPTED_T10_INPUTS.successorHashesSha256).toBe(
      "c026c0bff62c3d6739c366fa80cb6593c455e96bffd2532a43223c829ec74005",
    );
    expect(ACCEPTED_T10_INPUTS.ownerAcceptanceSha256).toBe(
      "165e21c9ddb5a6e0b2f61f3190d604fbb3133459b5f00331a8c66ee1e7572753",
    );
    expect(ACCEPTED_T10_INPUTS.standardPackReleaseVersion).toBe("2026.07.23");
    expect(ACCEPTED_T10_INPUTS.standardPackCatalogDigest).toBe(
      "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
    );
    expect(ACCEPTED_T10_INPUTS.standardPackSourceReceiptDigest).toBe(
      "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
    );
    expect(ACCEPTED_T10_INPUTS.standardPackCatalogArtifactSha256).toBe(
      "ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932",
    );
    expect(ACCEPTED_T10_INPUTS.acceptedRuntimeContracts).toBe(0);
    expect(ACCEPTED_T10_INPUTS.approvedAssetMappings).toBe(0);
    expect(ACCEPTED_T10_INPUTS.blockedAssetMappings).toBe(85);
    expect(ACCEPTED_T10_INPUTS.blockedResponsiveCells).toBe(5664);
    expect(ACCEPTED_T10_INPUTS.browserSuccessClaimed).toBe(false);
  });

  it("builds a deterministic, frozen manifest snapshot for downstream pinning", () => {
    const manifest = buildAcceptedCapabilityManifest();

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.trackId).toBe("apk_shared_developer_kit_20260712");
    expect(manifest.capabilityIds).toEqual(ACCEPTED_CAPABILITY_IDS);
    expect(Object.isFrozen(manifest)).toBe(true);
    expect(Object.isFrozen(manifest.capabilities)).toBe(true);
    expect(Object.isFrozen(manifest.t10Inputs)).toBe(true);
    expect(manifest.blockedScopes.runtime).toBe(false);
    expect(manifest.blockedScopes.responsive).toBe(false);
    expect(manifest.blockedScopes.presentation).toBe(false);
    expect(manifest.blockedScopes.assetMappings).toBe(true);
    expect(manifest.blockedScopes.unknownMustHaves).toBe(true);
  });

  it("rejects any capability id that is not in the accepted registry", () => {
    const registry = ACCEPTED_CAPABILITY_REGISTRY.find(
      (entry) => entry.id === "capability:result-accounting",
    );
    expect(registry?.sourceGameIds).toContain("abyssal-well");
    expect(() => {
      const unknown = ACCEPTED_CAPABILITY_REGISTRY.find(
        (entry) => entry.id === "capability:title-specific-mechanic",
      );
      if (unknown) throw new Error("title-specific capabilities must not be accepted");
    }).not.toThrow();
  });
});
