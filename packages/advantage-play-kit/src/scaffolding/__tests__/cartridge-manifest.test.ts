import { describe, expect, it } from "vitest";

import {
  ACCEPTED_STANDARD_PACK_BINDING,
  cartridgeManifestSchema,
  validateCartridgeManifest,
} from "../cartridge-manifest.js";

describe("cartridge manifest schema", () => {
  const validManifest = {
    schemaVersion: 1,
    id: "exemplar-vocab-match",
    title: "Exemplar Vocabulary Match",
    description: "A representative cartridge built entirely through public APK APIs.",
    version: "0.1.0",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    capabilities: ["capability:nonempty-content-precondition", "capability:language-target-progression"],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements: [],
    attributionRegistration: {
      requiredCredit: "Pixel art assets by ElvGames",
      placement: "end-screen",
    },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  };

  it("accepts a manifest that pins the accepted standard-pack release", () => {
    const manifest = validateCartridgeManifest(validManifest);
    expect(manifest.id).toBe("exemplar-vocab-match");
    expect(manifest.standardPackBinding.version).toBe("2026.08.04");
  });

  it("rejects a manifest that does not pin the accepted standard-pack release", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        standardPackBinding: {
          version: "2026.07.22",
          catalogDigest: "535866f258dc9238b48839f9ba7c264417ef104ec586b0c2dfe056a5975fdc33",
          sourceReceiptDigest: "c06bad4bf118bffac14b4469fc54b0ba1c84dda8c8b43a143aaf6caf0f0caf2c",
        },
      }),
    ).toThrow(/accepted release/i);
  });

  it("rejects a manifest listing a capability outside the accepted registry", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        capabilities: ["capability:title-specific-boss-fight"],
      }),
    ).toThrow(/validation failed|capability/i);
  });

  it("rejects a manifest with missing attribution registration", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        attributionRegistration: undefined,
      }),
    ).toThrow(/attribution/i);
  });

  it("rejects a manifest whose attribution credit does not match the accepted text", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        attributionRegistration: {
          requiredCredit: "Art by Someone Else",
          placement: "end-screen",
        },
      }),
    ).toThrow(/ElvGames/i);
  });

  it("rejects a manifest with a non-selected-union materialization policy", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        selectedUnionMaterialization: "full-catalog-load",
      }),
    ).toThrow(/selected-union/i);
  });

  it("rejects semantic asset requirements that look like physical paths", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        semanticAssetRequirements: ["ui/16x16/icons/coin.png"],
      }),
    ).toThrow(/semantic/i);
  });

  it("accepts semantic asset requirements that are semantic keys", () => {
    const manifest = validateCartridgeManifest({
      ...validManifest,
      semanticAssetRequirements: ["ui/16x16/icons/coin"],
    });
    expect(manifest.semanticAssetRequirements).toContain("ui/16x16/icons/coin");
  });

  it("exposes the frozen accepted standard-pack binding for cartridges to pin", () => {
    expect(ACCEPTED_STANDARD_PACK_BINDING.version).toBe("2026.08.04");
    expect(ACCEPTED_STANDARD_PACK_BINDING.catalogDigest).toBe(
      "535866f258dc9238b48839f9ba7c264417ef104ec586b0c2dfe056a5975fdc33",
    );
    expect(Object.isFrozen(ACCEPTED_STANDARD_PACK_BINDING)).toBe(true);
  });

  it("parses with Zod and rejects unknown extra fields", () => {
    expect(
      cartridgeManifestSchema.safeParse({
        ...validManifest,
        unexpectedField: true,
      }).success,
    ).toBe(false);
  });
});
