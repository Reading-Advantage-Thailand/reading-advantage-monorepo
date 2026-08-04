import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  createAcceptedStandardAssetResolver,
} from "./accepted-standard-pack-release.js";
import type { StandardAssetCatalog } from "./standard-pack-release.js";

const STANDARD_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../assets/standard");

interface AcceptedStandardPackRelease {
  readonly schemaVersion: 1;
  readonly status: "accepted";
  readonly version: string;
  readonly catalogDigest: string;
  readonly sourceReceiptDigest: string;
  readonly catalogArtifactSha256: string;
  readonly requiredCredit: string;
  readonly acceptedAt: string;
  readonly acceptedBy: "root-orchestrator";
  readonly downstreamConsumptionRules: {
    readonly requiredBindingFields: readonly string[];
    readonly assetReferences: "semantic-keys-only";
    readonly materialization: "accepted-cartridge-selected-union-only";
    readonly canonicalRoot: "packages/advantage-play-kit/assets/standard";
    readonly privatePackTrees: "prohibited";
    readonly requiredCreditPlacement: "shared-credits-about-or-end-screen";
  };
  readonly acceptanceEvidence: {
    readonly assetCount: number;
    readonly browserQcRoute: "/qc";
    readonly compactViewport: "390x844";
    readonly wideViewport: "wide";
    readonly automatedGate: "pass";
    readonly browserQcGate: "pass";
  };
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("accepted APK standard-pack release", () => {
  it("pins the exact catalog artifact and enforceable downstream rules", async () => {
    const catalogBytes = readFileSync(join(STANDARD_ROOT, "standard-pack-release.json"));
    const catalog = JSON.parse(catalogBytes.toString("utf8")) as StandardAssetCatalog;
    const acceptance = JSON.parse(
      readFileSync(join(STANDARD_ROOT, "accepted-standard-pack-release.json"), "utf8"),
    ) as AcceptedStandardPackRelease;

    expect(acceptance).toMatchObject({
      schemaVersion: 1,
      status: "accepted",
      version: catalog.version,
      catalogDigest: catalog.digest,
      sourceReceiptDigest: catalog.sourceReceiptDigest,
      catalogArtifactSha256: sha256(catalogBytes),
      requiredCredit: catalog.requiredCredit,
      acceptedBy: "root-orchestrator",
      downstreamConsumptionRules: {
        requiredBindingFields: ["version", "catalogDigest", "sourceReceiptDigest"],
        assetReferences: "semantic-keys-only",
        materialization: "accepted-cartridge-selected-union-only",
        canonicalRoot: "packages/advantage-play-kit/assets/standard",
        privatePackTrees: "prohibited",
        requiredCreditPlacement: "shared-credits-about-or-end-screen",
      },
      acceptanceEvidence: {
        assetCount: catalog.assets.length,
        browserQcRoute: "/qc",
        compactViewport: "390x844",
        wideViewport: "wide",
        automatedGate: "pass",
        browserQcGate: "pass",
      },
    });
    expect(acceptance.acceptedAt).toBe("2026-08-04T00:00:00Z");
    expect(ACCEPTED_STANDARD_ASSET_RELEASE).toEqual(acceptance);

    const resolver = await createAcceptedStandardAssetResolver(catalog, {
      version: acceptance.version,
      catalogDigest: acceptance.catalogDigest,
      sourceReceiptDigest: acceptance.sourceReceiptDigest,
    });
    expect(resolver.resolve(catalog.assets[0]!.key).path).toBe(catalog.assets[0]!.path);

    await expect(createAcceptedStandardAssetResolver({
      ...catalog,
      digest: "f".repeat(64),
    }, {
      version: acceptance.version,
      catalogDigest: acceptance.catalogDigest,
      sourceReceiptDigest: acceptance.sourceReceiptDigest,
    })).rejects.toThrow("Standard asset catalog is not the accepted release");

    const firstAsset = catalog.assets[0]!;
    const substitutedCatalog: StandardAssetCatalog = {
      ...catalog,
      assets: [{
        ...firstAsset,
        physical: {
          ...firstAsset.physical,
          sha256: "f".repeat(64),
        },
      }, ...catalog.assets.slice(1)],
    };
    await expect(createAcceptedStandardAssetResolver(substitutedCatalog, {
      version: acceptance.version,
      catalogDigest: acceptance.catalogDigest,
      sourceReceiptDigest: acceptance.sourceReceiptDigest,
    })).rejects.toThrow("Standard asset catalog payload does not match its digest");

    const wrongSchemaCatalog = {
      ...catalog,
      schemaVersion: 2,
    } as unknown as StandardAssetCatalog;
    await expect(createAcceptedStandardAssetResolver(wrongSchemaCatalog, {
      version: acceptance.version,
      catalogDigest: acceptance.catalogDigest,
      sourceReceiptDigest: acceptance.sourceReceiptDigest,
    })).rejects.toThrow("Standard asset catalog is not the accepted release");
  }, 30000);
});
