import {
  parseStandardAssetPath,
  validateStandardAssetCatalog,
} from "./standard-asset-contract.js";
import type {
  AssetCellSize,
  StandardAssetView,
} from "./standard-asset-contract.js";

/** Credit text every consumer of the standard ElvGames pack must display. */
export const STANDARD_ASSET_REQUIRED_CREDIT = "Pixel art assets by ElvGames";

/** Byte-level metadata for one immutable standard-pack file. */
export interface StandardAssetPhysicalMetadata {
  /** Content category derived from the validated file extension. */
  readonly kind: "image" | "audio" | "font";
  /** Exact encoded transfer size in bytes. */
  readonly byteSize: number;
  /** Lowercase SHA-256 digest of the encoded file. */
  readonly sha256: string;
  /** Encoded image dimensions, or null for non-raster files. */
  readonly dimensions: Readonly<{ width: number; height: number }> | null;
  /** Explicit grid declaration only; never inferred from directory names. */
  readonly frameGrid: null;
}

/** One generated, filesystem-derived entry in a released standard asset catalog. */
export interface StandardAssetCatalogEntry {
  readonly path: string;
  readonly key: string;
  readonly view: StandardAssetView;
  readonly cellSize: AssetCellSize | null;
  readonly category: string;
  readonly extension: string;
  /** Verified encoded-file facts, independent of semantic path metadata. */
  readonly physical: StandardAssetPhysicalMetadata;
  /** Immutable receipt row that records how this physical asset entered the pack. */
  readonly sourceReceiptLocator: string;
}

/** Immutable metadata for a catalog generated from the canonical standard-pack filesystem. */
export interface StandardAssetCatalog {
  readonly schemaVersion: 1;
  readonly version: string;
  readonly digest: string;
  readonly sourceReceiptDigest: string;
  readonly requiredCredit: typeof STANDARD_ASSET_REQUIRED_CREDIT;
  readonly assets: readonly StandardAssetCatalogEntry[];
}

/** Inputs gathered by the build-time catalog generator. */
export interface CreateStandardAssetCatalogInput {
  readonly version: string;
  readonly catalogDigest: string;
  readonly sourceReceiptDigest: string;
  readonly paths: readonly string[];
  /** Exact per-path receipt locators derived by the generator from the import ledgers. */
  readonly sourceReceiptLocators: Readonly<Record<string, string>>;
  /** Exact physical metadata derived from the canonical release bytes. */
  readonly physicalAssets: Readonly<Record<string, StandardAssetPhysicalMetadata>>;
}

/** Exact release values a cartridge must pin before resolving standard-pack assets. */
export interface StandardAssetReleaseBinding {
  readonly version: string;
  readonly catalogDigest: string;
  readonly sourceReceiptDigest: string;
}

/** Browser-safe resolver for one exact, accepted standard-pack release. */
export interface StandardAssetResolver {
  /** Resolves a semantic key to its cataloged physical path and attribution. */
  resolve(key: string): StandardAssetCatalogEntry & { readonly requiredCredit: typeof STANDARD_ASSET_REQUIRED_CREDIT };
}

function requireNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new Error(`Standard asset ${label} must not be empty`);
}

function sameCellSize(left: AssetCellSize | null, right: AssetCellSize | null): boolean {
  return left === right || (left !== null && right !== null && left.width === right.width && left.height === right.height);
}

function expectedPhysicalKind(extension: string): StandardAssetPhysicalMetadata["kind"] {
  if (extension === "png") return "image";
  if (extension === "ogg" || extension === "mp3" || extension === "wav") return "audio";
  return "font";
}

function validPhysicalMetadata(value: StandardAssetPhysicalMetadata, extension: string): boolean {
  return Boolean(value)
    && value.kind === expectedPhysicalKind(extension)
    && Number.isInteger(value.byteSize) && value.byteSize > 0
    && /^[a-f0-9]{64}$/u.test(value.sha256)
    && value.frameGrid === null
    && (value.kind === "image"
      ? value.dimensions !== null && Number.isInteger(value.dimensions.width) && value.dimensions.width > 0
        && Number.isInteger(value.dimensions.height) && value.dimensions.height > 0
      : value.dimensions === null);
}

function validateReleasedCatalog(catalog: StandardAssetCatalog): void {
  const keys = new Set<string>();
  for (const asset of catalog.assets) {
    const parsed = parseStandardAssetPath(asset.path);
    if (
      parsed.key !== asset.key
      || parsed.view !== asset.view
      || !sameCellSize(parsed.cellSize, asset.cellSize)
      || parsed.category !== asset.category
      || parsed.extension !== asset.extension
      || typeof asset.sourceReceiptLocator !== "string"
      || !asset.sourceReceiptLocator.trim()
      || !validPhysicalMetadata(asset.physical, parsed.extension)
    ) {
      throw new Error(`Invalid standard asset catalog metadata for ${JSON.stringify(asset.path)}`);
    }
    if (keys.has(asset.key)) throw new Error(`Duplicate standard asset catalog key ${JSON.stringify(asset.key)}`);
    keys.add(asset.key);
  }
}

/**
 * Creates a stable, filesystem-derived catalog after the build generator has calculated its digest.
 * @param input The version, receipt digest, catalog digest, and discovered canonical paths.
 * @returns An immutable catalog sorted by semantic key.
 * @throws When release metadata is missing or paths do not form a unique valid catalog.
 */
export function createStandardAssetCatalog(input: CreateStandardAssetCatalogInput): StandardAssetCatalog {
  requireNonEmpty(input.version, "release version");
  requireNonEmpty(input.catalogDigest, "catalog digest");
  requireNonEmpty(input.sourceReceiptDigest, "source-receipt digest");
  const byKey = validateStandardAssetCatalog(input.paths)
    .map((record) => ({
      path: record.path,
      key: record.key,
      view: record.view,
      cellSize: record.cellSize,
      category: record.category,
      extension: record.extension,
      sourceReceiptLocator: input.sourceReceiptLocators[record.path],
      physical: input.physicalAssets[record.path],
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  return Object.freeze({
    schemaVersion: 1,
    version: input.version,
    digest: input.catalogDigest,
    sourceReceiptDigest: input.sourceReceiptDigest,
    requiredCredit: STANDARD_ASSET_REQUIRED_CREDIT,
    assets: Object.freeze(byKey.map((asset) => {
      if (typeof asset.sourceReceiptLocator !== "string" || !asset.sourceReceiptLocator.trim()) {
        throw new Error(`Missing source receipt locator for ${JSON.stringify(asset.path)}`);
      }
      if (!asset.physical || !validPhysicalMetadata(asset.physical, asset.extension)) {
        throw new Error(`Missing or invalid physical release metadata for ${JSON.stringify(asset.path)}`);
      }
      return asset;
    })),
  });
}

/**
 * Serializes a catalog with explicit field ordering for deterministic generator output.
 * @param catalog The generated catalog to serialize.
 * @returns Stable JSON ending with a newline.
 */
export function serializeStandardAssetCatalog(catalog: StandardAssetCatalog): string {
  return `${JSON.stringify({
    schemaVersion: catalog.schemaVersion,
    version: catalog.version,
    digest: catalog.digest,
    sourceReceiptDigest: catalog.sourceReceiptDigest,
    requiredCredit: catalog.requiredCredit,
    assets: catalog.assets.map((asset) => ({
      path: asset.path,
      key: asset.key,
      view: asset.view,
      cellSize: asset.cellSize,
      category: asset.category,
      extension: asset.extension,
      sourceReceiptLocator: asset.sourceReceiptLocator,
      physical: asset.physical,
    })),
  })}\n`;
}

/**
 * Serializes the digest-independent catalog payload used by the build generator's SHA-256 calculation.
 * @param catalog The catalog whose release metadata should be serialized.
 * @returns Stable JSON that excludes the derived catalog digest.
 */
export function serializeStandardAssetCatalogPayload(catalog: StandardAssetCatalog): string {
  return `${JSON.stringify({
    schemaVersion: catalog.schemaVersion,
    version: catalog.version,
    sourceReceiptDigest: catalog.sourceReceiptDigest,
    requiredCredit: catalog.requiredCredit,
    assets: catalog.assets.map((asset) => ({
      path: asset.path,
      key: asset.key,
      view: asset.view,
      cellSize: asset.cellSize,
      category: asset.category,
      extension: asset.extension,
      sourceReceiptLocator: asset.sourceReceiptLocator,
      physical: asset.physical,
    })),
  })}\n`;
}

/**
 * Creates a browser-safe semantic resolver bound to one exact catalog and source receipt.
 * @param catalog The generated catalog loaded by the browser.
 * @param binding The exact release values supplied by a cartridge manifest.
 * @returns A resolver that fails closed for stale releases and unknown semantic keys.
 * @throws When the binding does not exactly match the catalog.
 */
export function createStandardAssetResolver(
  catalog: StandardAssetCatalog,
  binding: StandardAssetReleaseBinding,
): StandardAssetResolver {
  validateReleasedCatalog(catalog);
  if (catalog.version !== binding.version
    || catalog.digest !== binding.catalogDigest
    || catalog.sourceReceiptDigest !== binding.sourceReceiptDigest) {
    throw new Error("Stale standard asset release binding");
  }
  const assets = new Map(catalog.assets.map((asset) => [asset.key, asset]));
  return Object.freeze({
    resolve(key: string) {
      const asset = assets.get(key);
      if (!asset) throw new Error(`Unknown standard asset semantic key ${JSON.stringify(key)}`);
      return {
        ...asset,
        requiredCredit: STANDARD_ASSET_REQUIRED_CREDIT as typeof STANDARD_ASSET_REQUIRED_CREDIT,
      };
    },
  });
}

/**
 * Selects the minimal deterministic physical output required by cartridge semantic requirements.
 * @param catalog The accepted generated catalog.
 * @param semanticKeys Semantic keys declared by a validated cartridge manifest.
 * @returns Sorted, deduplicated canonical filesystem paths.
 * @throws When a request uses a physical path or an unknown semantic key.
 */
export function materializeStandardAssetUnion(
  catalog: StandardAssetCatalog,
  semanticKeys: readonly string[],
): readonly string[] {
  const assets = new Map(catalog.assets.map((asset) => [asset.key, asset.path]));
  const selected = semanticKeys.map((key) => {
    if (key.includes(".") || key.endsWith("/")) {
      throw new Error("Standard asset materialization requires semantic keys, not physical paths");
    }
    const path = assets.get(key);
    if (!path) {
      try {
        parseStandardAssetPath(key);
        throw new Error("Standard asset materialization requires semantic keys, not physical paths");
      } catch (error) {
        if (error instanceof Error && error.message.includes("semantic keys")) throw error;
        throw new Error(`Unknown standard asset semantic key ${JSON.stringify(key)}`);
      }
    }
    return path;
  });
  return Object.freeze([...new Set(selected)].sort((left, right) => left.localeCompare(right)));
}
