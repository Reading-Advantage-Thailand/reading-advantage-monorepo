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

/** Canonical sprite-grid and animation contracts. */
export {
  CHARACTER_COLLISION,
  CHARACTER_ORIGIN,
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
