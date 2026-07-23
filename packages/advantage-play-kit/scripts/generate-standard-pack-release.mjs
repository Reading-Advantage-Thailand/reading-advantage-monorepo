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

/** Reads validated encoded dimensions from one PNG byte stream. */
function pngDimensions(bytes, path) {
  const signature = "89504e470d0a1a0a";
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== signature || bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error(`Invalid PNG header for ${JSON.stringify(path)}`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height) throw new Error(`Invalid PNG dimensions for ${JSON.stringify(path)}`);
  return { width, height };
}

/** Derives byte-level release metadata without inferring semantic grids. */
async function physicalMetadata(paths) {
  const records = await Promise.all(paths.map(async (path) => {
    const bytes = await readFile(join(standardRoot, path));
    const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
    const kind = extension === "png" ? "image" : extension === "ogg" || extension === "mp3" || extension === "wav" ? "audio" : "font";
    return [path, {
      kind,
      byteSize: bytes.length,
      sha256: sha256(bytes),
      dimensions: kind === "image" ? pngDimensions(bytes, path) : null,
      frameGrid: null,
    }];
  }));
  return Object.fromEntries(records);
}

/** Builds exact, one-to-one receipt locators for every importable asset path. */
function parseAssetReceipt(name, contents) {
  const rows = contents.toString("utf8").trimEnd().split("\n");
  if (rows.shift() !== "destination\tsource_archive\tnested_archive_chain\tsource_member\tcell_size") {
    throw new Error(`Unexpected ${name} header`);
  }
  const locators = new Map();
  for (const [index, row] of rows.entries()) {
    const destination = row.split("\t", 1)[0];
    if (!destination) throw new Error(`Missing destination in ${name}:${index + 2}`);
    if (locators.has(destination)) throw new Error(`Duplicate receipt destination ${JSON.stringify(destination)}`);
    locators.set(destination, `${name}:${index + 2}`);
  }
  return locators;
}

const [importReceipt, curatedReceipt, licenseReceipt, paths] = await Promise.all([
  readFile(join(standardRoot, "IMPORT-RECEIPT.tsv")),
  readFile(join(standardRoot, "CURATED-RECEIPT.tsv")),
  readFile(join(standardRoot, "LICENSE-RECEIPT.tsv")),
  discoverAssets(standardRoot),
]);
const sourceReceiptDigest = sha256(Buffer.concat([
  importReceipt,
  Buffer.from("\n"),
  curatedReceipt,
  Buffer.from("\n"),
  licenseReceipt,
]));
const receiptLocators = parseAssetReceipt("IMPORT-RECEIPT.tsv", importReceipt);
for (const [path, locator] of parseAssetReceipt("CURATED-RECEIPT.tsv", curatedReceipt)) {
  if (receiptLocators.has(path)) throw new Error(`Duplicate receipt destination ${JSON.stringify(path)}`);
  receiptLocators.set(path, locator);
}
if (receiptLocators.size !== paths.length || paths.some((path) => !receiptLocators.has(path))) {
  throw new Error("Import receipts must cover each discovered standard asset exactly once");
}
const sourceReceiptLocators = Object.fromEntries(receiptLocators);
const physicalAssets = await physicalMetadata(paths);
const unsignedCatalog = createStandardAssetCatalog({
  version: process.env.APK_STANDARD_PACK_VERSION ?? "2026.07.23",
  catalogDigest: "pending",
  sourceReceiptDigest,
  paths,
  sourceReceiptLocators,
  physicalAssets,
});
const catalog = createStandardAssetCatalog({
  version: unsignedCatalog.version,
  catalogDigest: sha256(serializeStandardAssetCatalogPayload(unsignedCatalog)),
  sourceReceiptDigest,
  paths,
  sourceReceiptLocators,
  physicalAssets,
});
await writeFile(outputPath, serializeStandardAssetCatalog(catalog));
console.log(`Generated ${relative(packageRoot, outputPath)} with ${catalog.assets.length} assets`);
