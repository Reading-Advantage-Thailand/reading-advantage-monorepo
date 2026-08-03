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

/** Exact accepted standard-pack keys materialized for Magic Defense. */
export const MAGIC_DEFENSE_HOST_PROOF_ASSET_KEYS = Object.freeze([
  "audio/native/combat/hit-01",
  "effects/32x32/combat/hit-01",
  "ui/20x20/inventory/slot",
  "ui/32x32/items/armor-icons",
] as const);

/** Extra selected-union keys used by multi-title host-proof loaders. */
export const MULTI_TITLE_HOST_PROOF_EXTRA_ASSET_KEYS = Object.freeze([
  "side-view/32x32/characters/enemy-001-idle",
  "ui/16x16/controls/gamepad-buttons",
] as const);

type HostProofAssetKey =
  | (typeof DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS)[number]
  | (typeof MAGIC_DEFENSE_HOST_PROOF_ASSET_KEYS)[number]
  | (typeof MULTI_TITLE_HOST_PROOF_EXTRA_ASSET_KEYS)[number];

const VIEWS_BY_KEY: Readonly<Record<HostProofAssetKey, AssetView>> = {
  "audio/native/combat/hit-01": "ui",
  "effects/32x32/combat/hit-01": "screen",
  "top-down/32x32/characters/hero-01": "top-down",
  "ui/20x20/inventory/slot": "ui",
  "ui/32x32/items/armor-icons": "ui",
  "side-view/32x32/characters/enemy-001-idle": "side-view",
  "ui/16x16/controls/gamepad-buttons": "ui",
};

const SHARED_HIT_AUDIO = Object.freeze({
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
});

const SHARED_HIT_EFFECT = Object.freeze({
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
});

/** Exact, selected-union metadata required by the bounded Dragon Flight host proof. */
const DRAGON_FLIGHT_HOST_PROOF_SELECTED_ASSETS: readonly StandardAssetCatalogEntry[] = Object.freeze([
  SHARED_HIT_AUDIO,
  SHARED_HIT_EFFECT,
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

/** Exact, selected-union metadata required by the bounded Magic Defense host proof. */
const MAGIC_DEFENSE_HOST_PROOF_SELECTED_ASSETS: readonly StandardAssetCatalogEntry[] = Object.freeze([
  SHARED_HIT_AUDIO,
  SHARED_HIT_EFFECT,
  Object.freeze({
    path: "ui/20x20/inventory/slot.png",
    key: "ui/20x20/inventory/slot",
    view: "ui",
    cellSize: Object.freeze({ width: 20, height: 20 }),
    category: "inventory",
    extension: "png",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:5",
    physical: Object.freeze({
      kind: "image",
      byteSize: 212,
      sha256: "364560d9df9ebc14a2806d687776015624af79430e5f5b1e192de3fcf1db7524",
      dimensions: Object.freeze({ width: 20, height: 20 }),
      frameGrid: null,
    }),
  }),
  Object.freeze({
    path: "ui/32x32/items/armor-icons.png",
    key: "ui/32x32/items/armor-icons",
    view: "ui",
    cellSize: Object.freeze({ width: 32, height: 32 }),
    category: "items",
    extension: "png",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:6",
    physical: Object.freeze({
      kind: "image",
      byteSize: 100_563,
      sha256: "b01bae484f26a7ee45c44f8b875ba76dade50827a9e5418cecbd2551018cb9ee",
      dimensions: Object.freeze({ width: 512, height: 896 }),
      frameGrid: null,
    }),
  }),
]);

const ENEMY_IDLE_ASSET = Object.freeze({
  path: "side-view/32x32/characters/enemy-001-idle.png",
  key: "side-view/32x32/characters/enemy-001-idle",
  view: "side-view",
  cellSize: Object.freeze({ width: 32, height: 32 }),
  category: "characters",
  extension: "png",
  sourceReceiptLocator: "CURATED-RECEIPT.tsv:3",
  physical: Object.freeze({
    kind: "image",
    byteSize: 981,
    sha256: "0edfb7ed11f9c4cf46dfb97e2b158e391202dbf944789c059b0ec0b68e0492db",
    dimensions: Object.freeze({ width: 192, height: 32 }),
    frameGrid: null,
  }),
});

const GAMEPAD_BUTTONS_ASSET = Object.freeze({
  path: "ui/16x16/controls/gamepad-buttons.png",
  key: "ui/16x16/controls/gamepad-buttons",
  view: "ui",
  cellSize: Object.freeze({ width: 16, height: 16 }),
  category: "controls",
  extension: "png",
  sourceReceiptLocator: "CURATED-RECEIPT.tsv:4",
  physical: Object.freeze({
    kind: "image",
    byteSize: 4_684,
    sha256: "860451d3140de5ef5b42d8ff5908e5a02a9012296eb1e8631a687373ced10100",
    dimensions: Object.freeze({ width: 352, height: 160 }),
    frameGrid: null,
  }),
});

/** Union of selected assets for multi-title host-proof surfaces. */
const MULTI_TITLE_HOST_PROOF_SELECTED_ASSETS: readonly StandardAssetCatalogEntry[] = Object.freeze([
  ...DRAGON_FLIGHT_HOST_PROOF_SELECTED_ASSETS,
  ...MAGIC_DEFENSE_HOST_PROOF_SELECTED_ASSETS.filter(
    (entry) => entry.key !== "audio/native/combat/hit-01" && entry.key !== "effects/32x32/combat/hit-01",
  ),
  ENEMY_IDLE_ASSET,
  GAMEPAD_BUTTONS_ASSET,
]);

/** Exact keys for the multi-title host-proof edition. */
export const MULTI_TITLE_HOST_PROOF_ASSET_KEYS = Object.freeze(
  Array.from(new Set(MULTI_TITLE_HOST_PROOF_SELECTED_ASSETS.map((entry) => entry.key))) as HostProofAssetKey[],
);

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
 * Builds the selected semantic binding for one host-proof standard-pack asset.
 * @param key Accepted semantic key used by a host-proof cartridge.
 * @returns A runtime binding pointing to the same catalog-keyed physical file.
 */
function toRuntimeBinding(key: HostProofAssetKey): SemanticAssetBinding {
  return Object.freeze({
    key,
    file: key,
    usage: "image",
    view: VIEWS_BY_KEY[key],
  });
}

/**
 * Builds a bounded host-proof runtime edition from an exact selected union.
 * @param editionId Runtime edition identifier.
 * @param title Human-readable edition title.
 * @param keys Exact semantic keys required by the title.
 * @param entries Catalog-shaped records for the selected assets.
 * @returns A validated-shape edition ready for the APK runtime.
 * @throws When a required selected asset is absent from the supplied entries.
 */
function createEditionFromSelectedAssets(
  editionId: string,
  title: string,
  keys: readonly HostProofAssetKey[],
  entries: readonly StandardAssetCatalogEntry[],
): RuntimeEdition {
  const entriesByKey = new Map(entries.map((entry) => [entry.key, entry]));
  const files: Record<string, PhysicalAssetFile> = {};
  const bindings: Record<string, SemanticAssetBinding> = {};

  for (const key of keys) {
    const entry = entriesByKey.get(key);
    if (!entry) {
      throw new Error(`Host-proof asset ${key} is absent from the selected union for ${editionId}`);
    }
    files[key] = toRuntimeFile(entry, VIEWS_BY_KEY[key]);
    bindings[key] = toRuntimeBinding(key);
  }

  return Object.freeze({
    id: editionId,
    title,
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

let dragonFlightEdition: RuntimeEdition | undefined;
let magicDefenseEdition: RuntimeEdition | undefined;
let multiTitleEdition: RuntimeEdition | undefined;

/**
 * Returns the immutable three-asset edition for the bounded Dragon Flight host proof.
 * @returns The selected-union edition without requiring a host to import the complete catalog.
 */
export function getDragonFlightHostProofSelectedEdition(): RuntimeEdition {
  dragonFlightEdition ??= createEditionFromSelectedAssets(
    "dragon-flight-host-proof-standard",
    "Dragon Flight Standard Pack",
    DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS,
    DRAGON_FLIGHT_HOST_PROOF_SELECTED_ASSETS,
  );
  return dragonFlightEdition;
}

/**
 * Returns the immutable selected-union edition for the Magic Defense host proof.
 * @returns The selected-union edition without requiring a host to import the complete catalog.
 */
export function getMagicDefenseHostProofSelectedEdition(): RuntimeEdition {
  magicDefenseEdition ??= createEditionFromSelectedAssets(
    "magic-defense-host-proof-standard",
    "Magic Defense Standard Pack",
    MAGIC_DEFENSE_HOST_PROOF_ASSET_KEYS,
    MAGIC_DEFENSE_HOST_PROOF_SELECTED_ASSETS,
  );
  return magicDefenseEdition;
}

/**
 * Resolves the host-proof selected edition for one vocabulary-gate title.
 * @param gameType Accepted host-proof game type.
 * @returns The matching selected-union edition.
 * @throws When the game type is not a vocabulary-gate host-proof title.
 */
export function getVocabularyGateHostProofSelectedEdition(
  gameType: "dragon-flight" | "magic-defense",
): RuntimeEdition {
  if (gameType === "magic-defense") {
    return getMagicDefenseHostProofSelectedEdition();
  }
  return getDragonFlightHostProofSelectedEdition();
}

/**
 * Returns a selected-union edition covering multi-title host-proof loaders.
 * @returns The multi-title host-proof edition without loading the full standard pack.
 */
export function getMultiTitleHostProofSelectedEdition(): RuntimeEdition {
  multiTitleEdition ??= createEditionFromSelectedAssets(
    "multi-title-host-proof-standard",
    "Multi-Title Host Proof Standard Pack",
    MULTI_TITLE_HOST_PROOF_ASSET_KEYS,
    MULTI_TITLE_HOST_PROOF_SELECTED_ASSETS,
  );
  return multiTitleEdition;
}
