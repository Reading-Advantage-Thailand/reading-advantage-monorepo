import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  createStandardAssetCatalog,
  serializeStandardAssetCatalog,
  serializeStandardAssetCatalogPayload,
} from "../dist/assets/index.js";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const standardRoot = join(packageRoot, "assets", "standard");
const outputPath = join(standardRoot, "standard-pack-release.json");
const ignoredExtensions = new Set([".md", ".txt", ".tsv", ".json"]);

/** Returns every supported asset path below one canonical pack root. */
async function discoverAssets(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverAssets(absolutePath);
    if (ignoredExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase())) return [];
    return [relative(standardRoot, absolutePath).replaceAll("\\", "/")];
  }));
  return nested.flat();
}

/** Produces a lower-case SHA-256 digest for deterministic release inputs. */
function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const [importReceipt, licenseReceipt, paths] = await Promise.all([
  readFile(join(standardRoot, "IMPORT-RECEIPT.tsv")),
  readFile(join(standardRoot, "LICENSE-RECEIPT.tsv")),
  discoverAssets(standardRoot),
]);
const sourceReceiptDigest = sha256(Buffer.concat([importReceipt, Buffer.from("\n"), licenseReceipt]));
const unsignedCatalog = createStandardAssetCatalog({
  version: process.env.APK_STANDARD_PACK_VERSION ?? "2026.07.23",
  catalogDigest: "pending",
  sourceReceiptDigest,
  paths,
});
const catalog = createStandardAssetCatalog({
  version: unsignedCatalog.version,
  catalogDigest: sha256(serializeStandardAssetCatalogPayload(unsignedCatalog)),
  sourceReceiptDigest,
  paths,
});
await writeFile(outputPath, serializeStandardAssetCatalog(catalog));
console.log(`Generated ${relative(packageRoot, outputPath)} with ${catalog.assets.length} assets`);
