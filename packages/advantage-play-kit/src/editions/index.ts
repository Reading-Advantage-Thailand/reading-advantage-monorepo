/** Public edition validation and asset loading API. */
export {
  preloadSemanticAssets,
  resolveEdition,
  resolveSemanticAsset,
  runtimeEditionSchema,
  validateEdition,
} from "./editions.js";

/** Public edition resolver types. */
export type { AssetUrlResolver, SemanticAssetLoader } from "./editions.js";

/** Public edition contracts. */
export type {
  AssetProvenance,
  AudienceTuning,
  RuntimeEdition,
  SemanticAsset,
  SemanticAssetType,
} from "../runtime/types.js";
