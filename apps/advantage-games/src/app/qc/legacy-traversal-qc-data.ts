import acceptedStandardAssetCatalog from "../../../../../packages/advantage-play-kit/assets/standard/standard-pack-release.json";
import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";
import {
  TRAVERSAL_TITLE_IDS,
  createTraversalCanonicalResolver,
  resolveTraversalTitleCanonicalAssets,
} from "@reading-advantage/game-cartridges/traversal-suitability";
import type { LegacyTraversalQcSelectedUnion } from "@reading-advantage/game-cartridges/legacy-traversal-qc";

/** Materializes only the five traversal titles' resolver-issued v2 selected unions for `/qc`. */
export async function createLegacyTraversalQcSelections(): Promise<readonly LegacyTraversalQcSelectedUnion[]> {
  const resolver = await createTraversalCanonicalResolver(acceptedStandardAssetCatalog as StandardAssetCatalog);
  return Object.freeze(await Promise.all(
    TRAVERSAL_TITLE_IDS.map((id) => Object.freeze({
      id,
      ...resolveTraversalTitleCanonicalAssets(resolver, id),
    })),
  ));
}
