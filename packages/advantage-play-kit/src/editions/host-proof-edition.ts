import { ACCEPTED_STANDARD_ASSET_RELEASE } from "../assets/accepted-standard-pack-release.js";
import type {
  StandardAssetCatalogEntry,
} from "../assets/standard-pack-release.js";
import { APK_RUNTIME_API_VERSION } from "../runtime/types.js";
import type {
  AssetView,
  PhysicalAssetFile,
  RuntimeEdition,
  SemanticAssetBinding,
} from "../runtime/types.js";

/** Stable public-pack identity used by the Dragon Flight host-proof edition. */
export const DRAGON_FLIGHT_HOST_PROOF_PACK_ID = "standard-pack-2026-07-23" as const;

/** Exact accepted standard-pack keys materialized for Dragon Flight. */
export const DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS = Object.freeze([
  "audio/native/combat/hit-01",
  "effects/32x32/combat/hit-01",
  "top-down/32x32/characters/hero-01",
] as const);

type DragonFlightHostProofAssetKey =
  (typeof DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS)[number];

const VIEWS_BY_KEY: Readonly<Record<DragonFlightHostProofAssetKey, AssetView>> = {
  "audio/native/combat/hit-01": "ui",
  "effects/32x32/combat/hit-01": "screen",
  "top-down/32x32/characters/hero-01": "top-down",
};

/** Exact, selected-union metadata required by the bounded Dragon Flight host proof. */
const DRAGON_FLIGHT_HOST_PROOF_SELECTED_ASSETS: readonly StandardAssetCatalogEntry[] = Object.freeze([
  Object.freeze({
    path: "audio/native/combat/hit-01.ogg",
    key: "audio/native/combat/hit-01",
    view: "audio",
    cellSize: null,
    category: "combat",
    extension: "ogg",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:8",
    physical: Object.freeze({
      kind: "audio",
      byteSize: 20_939,
      sha256: "25c239ed9b6c9cd898a2ffb2c2760e87499ee5f6330060aa51be87f548bd5f23",
      dimensions: null,
      frameGrid: null,
    }),
  }),
  Object.freeze({
    path: "effects/32x32/combat/hit-01.png",
    key: "effects/32x32/combat/hit-01",
    view: "effects",
    cellSize: Object.freeze({ width: 32, height: 32 }),
    category: "combat",
    extension: "png",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:7",
    physical: Object.freeze({
      kind: "image",
      byteSize: 780,
      sha256: "5062b915d194a51d1df910f2b00a8dd33f654e8e5f7b8f38baa0626d1f7528f1",
      dimensions: Object.freeze({ width: 192, height: 128 }),
      frameGrid: null,
    }),
  }),
  Object.freeze({
    path: "top-down/32x32/characters/hero-01.png",
    key: "top-down/32x32/characters/hero-01",
    view: "top-down",
    cellSize: Object.freeze({ width: 32, height: 32 }),
    category: "characters",
    extension: "png",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:2",
    physical: Object.freeze({
      kind: "image",
      byteSize: 3_670,
      sha256: "6aeab3f50c0f6be436eeb5594e7d9c1ae31f8f19ac3bdfa04d7fbcbf856ba5e4",
      dimensions: Object.freeze({ width: 192, height: 384 }),
      frameGrid: null,
    }),
  }),
]);

/**
 * Converts one accepted catalog record into the runtime's physical-file shape.
 * @param entry Accepted catalog entry for a selected Dragon Flight asset.
 * @param view Runtime projection assigned to the selected semantic role.
 * @returns Immutable runtime physical-file metadata with catalog-derived bytes.
 */
function toRuntimeFile(entry: StandardAssetCatalogEntry, view: AssetView): PhysicalAssetFile {
  const dimensions = entry.physical.dimensions;
  return Object.freeze({
    id: entry.key,
    path: entry.path,
    kind: entry.physical.kind === "audio" ? "audio" : "image",
    view,
    // Audio has no raster dimensions. The runtime requires positive logical
    // dimensions for all loader records, so its documented non-raster sentinel
    // is 1×1; images retain their catalog-verified encoded dimensions.
    width: dimensions?.width ?? 1,
    height: dimensions?.height ?? 1,
    format: entry.extension === "ogg" ? "ogg" : "png",
    // The catalog records encoded dimensions and digest but not PNG alpha.
    // These three selected release PNGs are rendered as transparent sprites;
    // audio has no alpha channel.
    alpha: entry.physical.kind === "image",
    byteSize: entry.physical.byteSize,
    sha256: entry.physical.sha256,
    provenance: {
      source: `standard-pack-release.json:${entry.sourceReceiptLocator}`,
      license: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit,
      creator: "ElvGames",
    },
  });
}

/**
 * Builds the selected semantic binding for one Dragon Flight standard-pack asset.
 * @param key Accepted semantic key used by the Dragon Flight cartridge.
 * @returns A runtime binding pointing to the same catalog-keyed physical file.
 */
function toRuntimeBinding(key: DragonFlightHostProofAssetKey): SemanticAssetBinding {
  return Object.freeze({
    key,
    file: key,
    usage: "image",
    view: VIEWS_BY_KEY[key],
  });
}

/**
 * Builds the bounded Dragon Flight runtime edition from an exact selected union.
 * @param entries Catalog-shaped records for the three selected Dragon Flight assets.
 * @returns A validated-shape edition ready for the APK runtime.
 * @throws When a required selected asset is absent from the supplied entries.
 */
function createEditionFromSelectedAssets(
  entries: readonly StandardAssetCatalogEntry[],
): RuntimeEdition {
  const entriesByKey = new Map(entries.map((entry) => [entry.key, entry]));
  const files: Record<string, PhysicalAssetFile> = {};
  const bindings: Record<string, SemanticAssetBinding> = {};

  for (const key of DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS) {
    const entry = entriesByKey.get(key);
    if (!entry) {
      throw new Error(`Dragon Flight host-proof asset ${key} is absent from the selected union`);
    }
    files[key] = toRuntimeFile(entry, VIEWS_BY_KEY[key]);
    bindings[key] = toRuntimeBinding(key);
  }

  return Object.freeze({
    id: "dragon-flight-host-proof-standard",
    title: "Dragon Flight Standard Pack",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    pack: Object.freeze({
      id: DRAGON_FLIGHT_HOST_PROOF_PACK_ID,
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      root: `/assets/apk/${DRAGON_FLIGHT_HOST_PROOF_PACK_ID}/`,
      files: Object.freeze(files),
    }),
    bindings: Object.freeze(bindings),
    tuning: Object.freeze({
      speed: 1,
      targetScale: 1,
      collisionScale: 1,
      intensity: 0.6,
    }),
  });
}

let selectedEdition: RuntimeEdition | undefined;

/**
 * Returns the immutable three-asset edition for the bounded Dragon Flight host proof.
 * @returns The selected-union edition without requiring a host to import the complete catalog.
 */
export function getDragonFlightHostProofSelectedEdition(): RuntimeEdition {
  selectedEdition ??= createEditionFromSelectedAssets(DRAGON_FLIGHT_HOST_PROOF_SELECTED_ASSETS);
  return selectedEdition;
}
