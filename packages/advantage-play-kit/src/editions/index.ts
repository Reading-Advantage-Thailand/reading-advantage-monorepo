/** Public physical-pack validation and loading API. */
export {
  preloadAssetBindings,
  registerAssetAnimations,
  resolveAssetBinding,
  resolveEdition,
  runtimeEditionSchema,
  validateEdition,
  validateEditionPair,
} from "./editions.js";

/** Selected-union production edition for the bounded Dragon Flight host proof. */
export {
  DRAGON_FLIGHT_HOST_PROOF_ASSET_KEYS,
  DRAGON_FLIGHT_HOST_PROOF_PACK_ID,
  getDragonFlightHostProofSelectedEdition,
} from "./host-proof-edition.js";

/** Canonical complete production-pack inventory and validator. */
export {
  REQUIRED_PHYSICAL_ASSETS,
  validateCompleteAssetPack,
} from "./required-pack.js";
export type { PhysicalAssetRequirement } from "./required-pack.js";

/** Canonical sprite-grid and animation contracts. */
export {
  CHARACTER_COLLISION,
  CHARACTER_ORIGIN,
  DOOR_PROP_GRID,
  FOUR_FRAME_PROP_GRID,
  FOUR_FRAME_VFX_GRID,
  ISOMETRIC_WANG_TILE_GRID,
  SIDE_SCROLL_CHARACTER_ANIMATIONS,
  SIDE_SCROLL_CHARACTER_GRID,
  TOP_DOWN_CHARACTER_ANIMATIONS,
  TOP_DOWN_CHARACTER_GRID,
  WANG_MASK_FRAMES,
  WANG_TILE_GRID,
  createAnimationKey,
  createTextureKey,
} from "./asset-contract.js";

/** Public physical asset resolver types. */
export type {
  AssetUrlResolver,
  PhysicalAnimationManager,
  PhysicalAssetLoader,
  ResolvedAssetBinding,
} from "./editions.js";

/** Public physical pack and semantic binding contracts. */
export type {
  AssetAnimation,
  AssetCollisionBox,
  AssetOrigin,
  AssetPackManifest,
  AssetProvenance,
  AssetView,
  AudienceTuning,
  FrameGrid,
  NineSliceInsets,
  PhysicalAssetFile,
  PhysicalAssetKind,
  RuntimeEdition,
  SemanticAssetBinding,
  SemanticAssetUsage,
} from "../runtime/types.js";
