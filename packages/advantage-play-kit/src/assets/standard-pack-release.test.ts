import { describe, expect, it } from "vitest";

import {
  createStandardAssetCatalog,
  createStandardAssetResolver,
  materializeStandardAssetUnion,
  serializeStandardAssetCatalog,
} from "./standard-pack-release.js";

const firstPath = "ui/16x16/icons/coin.png";
const secondPath = "effects/8x8/combat/hit-spark.png";

function receiptLocators(paths: readonly string[]): Readonly<Record<string, string>> {
  return Object.fromEntries(paths.map((path) => [path, `IMPORT-RECEIPT.tsv:${path}`]));
}

function physicalAssets(paths: readonly string[]): Readonly<Record<string, { kind: "image"; byteSize: number; sha256: string; dimensions: { width: number; height: number }; frameGrid: null }>> {
  return Object.fromEntries(paths.map((path) => [path, {
    kind: "image",
    byteSize: 1,
    sha256: "a".repeat(64),
    dimensions: { width: 16, height: 16 },
    frameGrid: null,
  }]));
}

describe("standard APK pack releases", () => {
  it("serializes a catalog deterministically regardless of discovery order", () => {
    const first = createStandardAssetCatalog({
      version: "2026.08.04",
      sourceReceiptDigest: "source-receipt-sha256",
      catalogDigest: "catalog-sha256",
      paths: [secondPath, firstPath],
      sourceReceiptLocators: receiptLocators([secondPath, firstPath]),
      physicalAssets: physicalAssets([secondPath, firstPath]),
    });
    const second = createStandardAssetCatalog({
      version: "2026.08.04",
      sourceReceiptDigest: "source-receipt-sha256",
      catalogDigest: "catalog-sha256",
      paths: [firstPath, secondPath],
      sourceReceiptLocators: receiptLocators([firstPath, secondPath]),
      physicalAssets: physicalAssets([firstPath, secondPath]),
    });

    expect(serializeStandardAssetCatalog(first)).toBe(serializeStandardAssetCatalog(second));
    expect(first.assets.map((asset) => asset.key)).toEqual([
      "effects/8x8/combat/hit-spark",
      "ui/16x16/icons/coin",
    ]);
  });

  it("rejects duplicate semantic keys before a catalog can be released", () => {
    expect(() => createStandardAssetCatalog({
      version: "2026.08.04",
      sourceReceiptDigest: "source-receipt-sha256",
      catalogDigest: "catalog-sha256",
      paths: [firstPath, firstPath],
      sourceReceiptLocators: receiptLocators([firstPath]),
      physicalAssets: physicalAssets([firstPath]),
    })).toThrow(/duplicate/i);
  });

  it("requires a source receipt locator for every released physical asset", () => {
    expect(() => createStandardAssetCatalog({
      version: "2026.08.04",
      sourceReceiptDigest: "source-receipt-sha256",
      catalogDigest: "catalog-sha256",
      paths: [firstPath],
      sourceReceiptLocators: {},
      physicalAssets: {},
    })).toThrow(/receipt locator/i);
  });

  it("resolves only cataloged semantic keys with an exact pinned release binding", () => {
    const catalog = createStandardAssetCatalog({
      version: "2026.08.04",
      sourceReceiptDigest: "source-receipt-sha256",
      catalogDigest: "catalog-sha256",
      paths: [firstPath],
      sourceReceiptLocators: receiptLocators([firstPath]),
      physicalAssets: physicalAssets([firstPath]),
    });
    const resolver = createStandardAssetResolver(catalog, {
      version: "2026.08.04",
      catalogDigest: catalog.digest,
      sourceReceiptDigest: "source-receipt-sha256",
    });

    expect(resolver.resolve("ui/16x16/icons/coin")).toMatchObject({
      key: "ui/16x16/icons/coin",
      path: firstPath,
      requiredCredit: "Pixel art assets by ElvGames",
    });
    expect(() => resolver.resolve("ui/16x16/icons/missing")).toThrow(/unknown/i);
    expect(() => createStandardAssetResolver(catalog, {
      version: "2026.08.04",
      catalogDigest: "stale-digest",
      sourceReceiptDigest: "source-receipt-sha256",
    })).toThrow(/stale/i);
  });

  it("rejects a hand-constructed catalog with an unsafe or inconsistent physical path", () => {
    const unsafeCatalog = {
      schemaVersion: 1,
      version: "2026.08.04",
      digest: "catalog-sha256",
      sourceReceiptDigest: "source-receipt-sha256",
      requiredCredit: "Pixel art assets by ElvGames",
      assets: [{
        path: "../../outside.png",
        key: "ui/16x16/icons/coin",
        view: "ui",
        cellSize: { width: 16, height: 16 },
        category: "icons",
        extension: "png",
        sourceReceiptLocator: "IMPORT-RECEIPT.tsv:2",
        physical: { kind: "image", byteSize: 1, sha256: "a".repeat(64), dimensions: { width: 16, height: 16 }, frameGrid: null },
      }],
    } as const;

    expect(() => createStandardAssetResolver(unsafeCatalog, {
      version: unsafeCatalog.version,
      catalogDigest: unsafeCatalog.digest,
      sourceReceiptDigest: unsafeCatalog.sourceReceiptDigest,
    })).toThrow(/invalid|unsafe|path/i);
  });

  it("rejects forged physical metadata even when the semantic path is valid", () => {
    const catalog = createStandardAssetCatalog({
      version: "2026.08.04",
      sourceReceiptDigest: "source-receipt-sha256",
      catalogDigest: "catalog-sha256",
      paths: [firstPath],
      sourceReceiptLocators: receiptLocators([firstPath]),
      physicalAssets: physicalAssets([firstPath]),
    });
    const forgedCatalog = {
      ...catalog,
      assets: [{ ...catalog.assets[0]!, physical: { ...catalog.assets[0]!.physical, dimensions: null } }],
    };

    expect(() => createStandardAssetResolver(forgedCatalog, {
      version: catalog.version,
      catalogDigest: catalog.digest,
      sourceReceiptDigest: catalog.sourceReceiptDigest,
    })).toThrow(/physical|metadata/i);
  });

  it("materializes a sorted deduplicated union and rejects physical paths", () => {
    const catalog = createStandardAssetCatalog({
      version: "2026.08.04",
      sourceReceiptDigest: "source-receipt-sha256",
      catalogDigest: "catalog-sha256",
      paths: [firstPath, secondPath],
      sourceReceiptLocators: receiptLocators([firstPath, secondPath]),
      physicalAssets: physicalAssets([firstPath, secondPath]),
    });

    expect(materializeStandardAssetUnion(catalog, [
      "ui/16x16/icons/coin",
      "effects/8x8/combat/hit-spark",
      "ui/16x16/icons/coin",
    ])).toEqual([secondPath, firstPath]);
    expect(() => materializeStandardAssetUnion(catalog, [firstPath])).toThrow(/semantic key/i);
  });
});
