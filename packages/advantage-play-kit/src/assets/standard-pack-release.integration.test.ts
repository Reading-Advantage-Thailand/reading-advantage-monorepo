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
    const licenseReceipt = readFileSync(join(STANDARD_ROOT, "LICENSE-RECEIPT.tsv"));

    expect(catalog.digest).toBe(sha256(payload));
    expect(catalog.sourceReceiptDigest).toBe(sha256(Buffer.concat([
      importReceipt,
      Buffer.from("\n"),
      licenseReceipt,
    ])));
    expect(catalog.assets).toHaveLength(43_075);

    const resolver = createStandardAssetResolver(catalog, {
      version: catalog.version,
      catalogDigest: catalog.digest,
      sourceReceiptDigest: catalog.sourceReceiptDigest,
    });
    expect(resolver.resolve(catalog.assets[0]!.key).path).toBe(catalog.assets[0]!.path);
  });
});
