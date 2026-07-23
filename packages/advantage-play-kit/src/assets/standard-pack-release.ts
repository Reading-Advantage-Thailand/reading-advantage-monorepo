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

/** One generated, filesystem-derived entry in a released standard asset catalog. */
export interface StandardAssetCatalogEntry {
  readonly path: string;
  readonly key: string;
  readonly view: StandardAssetView;
  readonly cellSize: AssetCellSize | null;
  readonly category: string;
  readonly extension: string;
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
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  return Object.freeze({
    schemaVersion: 1,
    version: input.version,
    digest: input.catalogDigest,
    sourceReceiptDigest: input.sourceReceiptDigest,
    requiredCredit: STANDARD_ASSET_REQUIRED_CREDIT,
    assets: Object.freeze(byKey),
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
