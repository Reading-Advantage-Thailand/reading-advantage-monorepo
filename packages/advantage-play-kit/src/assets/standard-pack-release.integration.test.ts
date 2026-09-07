import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createStandardAssetResolver,
  type StandardAssetCatalog,
} from "./standard-pack-release.js";

const STANDARD_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../assets/standard");

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Reconstructs the immutable receipt prefix bound to the published catalog. */
function releasedReceipt(
  name: "IMPORT-RECEIPT.tsv" | "CURATED-RECEIPT.tsv",
  contents: Buffer,
  assets: StandardAssetCatalog["assets"],
): Readonly<{ bytes: Buffer; entries: readonly string[] }> {
  const lines = contents.toString("utf8").split("\n");
  expect(lines[0]).toBe("destination\tsource_archive\tnested_archive_chain\tsource_member\tcell_size");

  const releasedAssets = assets.flatMap((asset) => {
    const match = asset.sourceReceiptLocator.match(new RegExp(`^${name.replace(".", "\\.")}:([0-9]+)$`));
    return match ? [{ asset, line: Number(match[1]) }] : [];
  });
  const releasedLines = releasedAssets.map(({ line }) => line).sort((left, right) => left - right);
  const lastReleasedLine = releasedLines.at(-1)!;

  expect(releasedLines).toEqual(Array.from({ length: lastReleasedLine - 1 }, (_, index) => index + 2));
  expect(lines.length).toBeGreaterThan(lastReleasedLine);

  return {
    bytes: Buffer.from(`${lines.slice(0, lastReleasedLine).join("\n")}\n`),
    entries: releasedAssets.map(({ asset, line }) => (
      `${lines[line - 1]!.split("\t", 1)[0]}\0${asset.sourceReceiptLocator}`
    )),
  };
}

describe("generated APK standard-pack release", () => {
  it("binds the generated catalog to its exact catalog and source-receipt SHA-256 digests", () => {
    const catalog = JSON.parse(readFileSync(join(STANDARD_ROOT, "standard-pack-release.json"), "utf8")) as StandardAssetCatalog;
    const payload = `${JSON.stringify({
      schemaVersion: catalog.schemaVersion,
      version: catalog.version,
      sourceReceiptDigest: catalog.sourceReceiptDigest,
      requiredCredit: catalog.requiredCredit,
      assets: catalog.assets,
    })}\n`;
    const importReceipt = readFileSync(join(STANDARD_ROOT, "IMPORT-RECEIPT.tsv"));
    const curatedReceipt = readFileSync(join(STANDARD_ROOT, "CURATED-RECEIPT.tsv"));
    const licenseReceipt = readFileSync(join(STANDARD_ROOT, "LICENSE-RECEIPT.tsv"));
    const releasedImportReceipt = releasedReceipt("IMPORT-RECEIPT.tsv", importReceipt, catalog.assets);
    const releasedCuratedReceipt = releasedReceipt("CURATED-RECEIPT.tsv", curatedReceipt, catalog.assets);

    expect(catalog.digest).toBe(sha256(payload));
    expect(catalog.sourceReceiptDigest).toBe(sha256(Buffer.concat([
      releasedImportReceipt.bytes,
      Buffer.from("\n"),
      releasedCuratedReceipt.bytes,
      Buffer.from("\n"),
      licenseReceipt,
    ])));
    const expectedReceiptEntries = [
      ...releasedImportReceipt.entries,
      ...releasedCuratedReceipt.entries,
    ].sort();
    const catalogReceiptEntries = catalog.assets
      .map((asset) => `${asset.path}\0${asset.sourceReceiptLocator}`)
      .sort();

    expect(catalogReceiptEntries).toEqual(expectedReceiptEntries);
    expect(catalog.assets).toHaveLength(expectedReceiptEntries.length);
    expect(catalog.assets.every((asset) => /^(IMPORT|CURATED)-RECEIPT\.tsv:\d+$/.test(asset.sourceReceiptLocator))).toBe(true);
    expect(catalog.assets.every((asset) => /^[a-f0-9]{64}$/.test(asset.physical.sha256) && asset.physical.byteSize > 0)).toBe(true);
    expect(catalog.assets.filter((asset) => asset.physical.kind === "image").every((asset) => asset.physical.dimensions !== null)).toBe(true);
    expect(catalog.assets.filter((asset) => asset.physical.kind !== "image").every((asset) => asset.physical.dimensions === null)).toBe(true);

    const resolver = createStandardAssetResolver(catalog, {
      version: catalog.version,
      catalogDigest: catalog.digest,
      sourceReceiptDigest: catalog.sourceReceiptDigest,
    });
    expect(resolver.resolve(catalog.assets[0]!.key).path).toBe(catalog.assets[0]!.path);
  }, 20_000);
});
