import { describe, expect, it } from "vitest";

import {
  ACCEPTED_INPUTS_GUARD,
  type AcceptedInputsGuard,
  assertAcceptedInputs,
  assertAcceptedStandardPackBinding,
  isAcceptedCapabilityId,
  rejectBlockedScope,
  rejectUnsupportedCapability,
} from "../accepted-inputs.js";
import { APKUnsupportedCapabilityError } from "../../diagnostics/structured-error.js";

describe("accepted inputs guard", () => {
  it("pins the exact T10 manifest, successor, and owner-acceptance hashes", () => {
    expect(ACCEPTED_INPUTS_GUARD.t10Inputs.acceptedManifestSha256).toBe(
      "e9fc2c9c8074db74670fa2e2929bd4efb5b8d0fd2ef5a8b9819d2f5a6e39ba49",
    );
    expect(ACCEPTED_INPUTS_GUARD.t10Inputs.successorHashesSha256).toBe(
      "c026c0bff62c3d6739c366fa80cb6593c455e96bffd2532a43223c829ec74005",
    );
    expect(ACCEPTED_INPUTS_GUARD.t10Inputs.ownerAcceptanceSha256).toBe(
      "165e21c9ddb5a6e0b2f61f3190d604fbb3133459b5f00331a8c66ee1e7572753",
    );
  });

  it("recognizes the eight accepted capability ids", () => {
    expect(isAcceptedCapabilityId("capability:result-accounting")).toBe(true);
    expect(isAcceptedCapabilityId("multiplayer")).toBe(true);
    expect(isAcceptedCapabilityId("capability:title-specific-boss-fight")).toBe(false);
    expect(isAcceptedCapabilityId("unknown-capability")).toBe(false);
  });

  it("asserts accepted inputs without throwing when the binding is exact", () => {
    expect(() => assertAcceptedInputs()).not.toThrow();
  });

  it.each([
    ["capability count", { manifest: { capabilityIds: [] } }, /exactly eight accepted capabilities/i],
    ["runtime contracts", { t10Inputs: { acceptedRuntimeContracts: 1 } }, /zero accepted runtime contracts/i],
    ["asset mappings", { t10Inputs: { approvedAssetMappings: 1 } }, /zero approved asset mappings/i],
    ["release version", { standardPackRelease: { version: "2026.07.22" } }, /release version/i],
    ["catalog digest", { standardPackRelease: { catalogDigest: "stale" } }, /catalog digest/i],
  ] as const)("rejects a tampered %s", (_condition, changes, message) => {
    const guard = {
      ...ACCEPTED_INPUTS_GUARD,
      manifest: { ...ACCEPTED_INPUTS_GUARD.manifest, ...changes.manifest },
      t10Inputs: { ...ACCEPTED_INPUTS_GUARD.t10Inputs, ...changes.t10Inputs },
      standardPackRelease: { ...ACCEPTED_INPUTS_GUARD.standardPackRelease, ...changes.standardPackRelease },
    } as AcceptedInputsGuard;

    expect(() => assertAcceptedInputs(guard)).toThrow(message);
  });

  it("rejects a standard-pack binding that does not pin the accepted release", () => {
    expect(() =>
      assertAcceptedStandardPackBinding({
        version: "2026.07.22",
        catalogDigest: "535866f258dc9238b48839f9ba7c264417ef104ec586b0c2dfe056a5975fdc33",
        sourceReceiptDigest: "c06bad4bf118bffac14b4469fc54b0ba1c84dda8c8b43a143aaf6caf0f0caf2c",
      }),
    ).toThrow(/accepted release/i);

    expect(() =>
      assertAcceptedStandardPackBinding({
        version: "2026.08.04",
        catalogDigest: "stale-digest",
        sourceReceiptDigest: "c06bad4bf118bffac14b4469fc54b0ba1c84dda8c8b43a143aaf6caf0f0caf2c",
      }),
    ).toThrow(/accepted release/i);
  });

  it("accepts the exact standard-pack release binding", () => {
    expect(() =>
      assertAcceptedStandardPackBinding({
        version: "2026.08.04",
        catalogDigest: "535866f258dc9238b48839f9ba7c264417ef104ec586b0c2dfe056a5975fdc33",
        sourceReceiptDigest: "c06bad4bf118bffac14b4469fc54b0ba1c84dda8c8b43a143aaf6caf0f0caf2c",
      }),
    ).not.toThrow();
  });

  it("rejects blocked scopes with a structured diagnostic", () => {
    expect(() => rejectBlockedScope("responsive")).toThrow(/354 contracts.*5664 cells/s);
    expect(() => rejectBlockedScope("runtime")).toThrow(/zero accepted runtime contracts/i);
    expect(() => rejectBlockedScope("presentation")).toThrow(/blocked.*responsive.*asset mappings/i);
    expect(() => rejectBlockedScope("asset-mappings")).toThrow(/85 mappings.*zero are approved/i);
    expect(() => rejectBlockedScope("unknown-must-haves")).toThrow(/unknown must-have/i);
  });

  it("rejects unsupported capabilities with a structured APKUnsupportedCapabilityError", () => {
    try {
      rejectUnsupportedCapability("capability:title-specific-dash");
      throw new Error("should have thrown for an unknown capability");
    } catch (error) {
      expect(error).toBeInstanceOf(APKUnsupportedCapabilityError);
      expect((error as APKUnsupportedCapabilityError).requestedCapabilityId).toBe(
        "capability:title-specific-dash",
      );
      expect((error as APKUnsupportedCapabilityError).acceptedCapabilityIds).toContain("multiplayer");
      expect((error as Error).message).toMatch(/not in the T10-accepted registry/i);
    }
  });

  it("rejects every blocked scope category with a structured APKBlockedScopeError", () => {
    const scopes: Array<"runtime" | "responsive" | "presentation" | "asset-mappings" | "unknown-must-haves"> = [
      "runtime",
      "responsive",
      "presentation",
      "asset-mappings",
      "unknown-must-haves",
    ];
    for (const scope of scopes) {
      try {
        rejectBlockedScope(scope);
        throw new Error(`should have thrown for ${scope}`);
      } catch (error) {
        expect((error as Error & { scope?: string }).scope).toBe(scope);
      }
    }
  });

  it("accepts the exact standard-pack binding without throwing", () => {
    expect(() => assertAcceptedInputs()).not.toThrow();
  });

  it("exposes the accepted standard-pack release through the guard", () => {
    expect(ACCEPTED_INPUTS_GUARD.standardPackRelease.version).toBe("2026.08.04");
    expect(ACCEPTED_INPUTS_GUARD.standardPackRelease.requiredCredit).toBe(
      "Pixel art assets by ElvGames",
    );
  });
});
