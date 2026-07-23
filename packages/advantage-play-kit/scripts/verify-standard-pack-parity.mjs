import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultStandardRoot = join(packageRoot, "assets", "standard");
const ignoredExtensions = new Set([".md", ".txt", ".tsv", ".json"]);
const receiptHeader = "destination\tsource_archive\tnested_archive_chain\tsource_member\tcell_size";

/** Produces a lower-case SHA-256 digest for an asset byte stream. */
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Reads encoded PNG dimensions without rendering or semantically reviewing an asset. */
function pngDimensions(bytes, path) {
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error(`Invalid PNG header for ${JSON.stringify(path)}`);
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (!width || !height) throw new Error(`Invalid PNG dimensions for ${JSON.stringify(path)}`);
  return { width, height };
}

/** Classifies an importable asset extension using the same release-policy categories as the catalog. */
function kindForPath(path) {
  const extension = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  if (extension === "png") return "image";
  if (extension === "ogg" || extension === "mp3" || extension === "wav") return "audio";
  return "font";
}

/** Discovers the generator's importable asset files below the supplied pack root. */
async function discoverAssets(standardRoot, directory = standardRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverAssets(standardRoot, absolutePath);
    if (!entry.isFile()) throw new Error(`Standard pack must not contain non-file asset entry ${JSON.stringify(relative(standardRoot, absolutePath))}`);
    if (ignoredExtensions.has(entry.name.slice(entry.name.lastIndexOf(".")).toLowerCase())) return [];
    return [relative(standardRoot, absolutePath).replaceAll("\\", "/")];
  }));
  return nested.flat().sort();
}

/** Parses a receipt into a unique asset-path-to-locator mapping. */
function parseReceipt(name, contents) {
  const lines = contents.toString("utf8").trimEnd().split("\n");
  if (lines.shift() !== receiptHeader) throw new Error(`Unexpected ${name} header`);
  const locators = new Map();
  for (const [index, line] of lines.entries()) {
    const destination = line.split("\t", 1)[0];
    if (!destination) throw new Error(`Missing destination in ${name}:${index + 2}`);
    if (locators.has(destination)) throw new Error(`Duplicate receipt destination ${JSON.stringify(destination)}`);
    locators.set(destination, `${name}:${index + 2}`);
  }
  return locators;
}

/** Throws when two sets are not exact one-to-one mappings of the same paths. */
function assertSamePaths(label, actual, expected) {
  const actualPaths = new Set(actual.keys());
  const missing = [...expected].filter((path) => !actualPaths.has(path));
  const extra = [...actualPaths].filter((path) => !expected.has(path));
  if (missing.length || extra.length) {
    throw new Error(`${label} do not match filesystem paths: missing=${JSON.stringify(missing.slice(0, 5))}; extra=${JSON.stringify(extra.slice(0, 5))}`);
  }
}

/** Verifies exact release parity without requiring any visual or semantic asset review. */
export async function verifyStandardPackParity({
  standardRoot = defaultStandardRoot,
  catalogPath = join(defaultStandardRoot, "standard-pack-release.json"),
} = {}) {
  const absoluteRoot = resolve(standardRoot);
  const [filesystemPaths, importReceipt, curatedReceipt, catalogBytes] = await Promise.all([
    discoverAssets(absoluteRoot),
    readFile(join(absoluteRoot, "IMPORT-RECEIPT.tsv")),
    readFile(join(absoluteRoot, "CURATED-RECEIPT.tsv")),
    readFile(catalogPath),
  ]);
  const receiptLocators = parseReceipt("IMPORT-RECEIPT.tsv", importReceipt);
  for (const [path, locator] of parseReceipt("CURATED-RECEIPT.tsv", curatedReceipt)) {
    if (receiptLocators.has(path)) throw new Error(`Duplicate receipt destination ${JSON.stringify(path)}`);
    receiptLocators.set(path, locator);
  }
  const filesystem = new Set(filesystemPaths);
  assertSamePaths("Receipt paths", receiptLocators, filesystem);

  const catalog = JSON.parse(catalogBytes.toString("utf8"));
  if (!Array.isArray(catalog.assets)) throw new Error("Catalog assets must be an array");
  const catalogByPath = new Map();
  for (const asset of catalog.assets) {
    if (!asset || typeof asset.path !== "string") throw new Error("Catalog asset is missing a string path");
    if (catalogByPath.has(asset.path)) throw new Error(`Duplicate catalog asset path ${JSON.stringify(asset.path)}`);
    catalogByPath.set(asset.path, asset);
  }
  assertSamePaths("Catalog paths", catalogByPath, filesystem);

  const validatedKinds = [];
  for (let start = 0; start < filesystemPaths.length; start += 512) {
    const batch = filesystemPaths.slice(start, start + 512);
    const kinds = await Promise.all(batch.map(async (path) => {
      const asset = catalogByPath.get(path);
      const expectedLocator = receiptLocators.get(path);
      if (asset.sourceReceiptLocator !== expectedLocator) throw new Error(`Catalog receipt locator mismatch for ${JSON.stringify(path)}`);
      const bytes = await readFile(join(absoluteRoot, path));
      const physical = asset.physical;
      if (!physical || typeof physical !== "object") throw new Error(`Catalog physical metadata is missing for ${JSON.stringify(path)}`);
      const kind = kindForPath(path);
      if (physical.kind !== kind) throw new Error(`Catalog physical kind mismatch for ${JSON.stringify(path)}`);
      if (physical.byteSize !== bytes.length) throw new Error(`Catalog byte size mismatch for ${JSON.stringify(path)}`);
      if (physical.sha256 !== sha256(bytes)) throw new Error(`Catalog SHA-256 mismatch for ${JSON.stringify(path)}`);
      const dimensions = kind === "image" ? pngDimensions(bytes, path) : null;
      if (JSON.stringify(physical.dimensions) !== JSON.stringify(dimensions)) throw new Error(`Catalog dimensions mismatch for ${JSON.stringify(path)}`);
      if (physical.frameGrid !== null) throw new Error(`Catalog frame grid must be null unless separately declared for ${JSON.stringify(path)}`);
      return kind;
    }));
    validatedKinds.push(...kinds);
  }
  return {
    assets: filesystemPaths.length,
    images: validatedKinds.filter((kind) => kind === "image").length,
    audio: validatedKinds.filter((kind) => kind === "audio").length,
    fonts: validatedKinds.filter((kind) => kind === "font").length,
  };
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const startedAt = performance.now();
  try {
    const totals = await verifyStandardPackParity();
    console.log(`Standard-pack parity verified: ${totals.assets} assets (${totals.images} images, ${totals.audio} audio, ${totals.fonts} fonts) in ${(performance.now() - startedAt).toFixed(0)}ms`);
  } catch (error) {
    console.error(`Standard-pack parity verification failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
