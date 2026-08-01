import acceptedStandardAssetCatalog from "../../../../../packages/advantage-play-kit/assets/standard/standard-pack-release.json";
import { createExistingActionTask2CanonicalResolver } from "@reading-advantage/advantage-play-kit/assets";
import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";
import {
  EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES,
  materializeExistingActionCandidateSelectedUnion,
} from "@reading-advantage/game-cartridges/existing-action-candidates";
import type { ExistingActionCandidateSelectedUnion } from "@reading-advantage/game-cartridges/existing-action-candidates";

/**
 * Materializes only the five action titles' resolver-issued v2 descriptor registrations for `/qc`.
 * @returns Serialisable selected unions with no physical asset paths or production-catalog registrations.
 */
export async function createExistingActionQcSelections(): Promise<readonly ExistingActionCandidateSelectedUnion[]> {
  const resolver = await createExistingActionTask2CanonicalResolver(
    acceptedStandardAssetCatalog as StandardAssetCatalog,
  );
  return Object.freeze(await Promise.all(EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES.map(
    (candidate) => materializeExistingActionCandidateSelectedUnion(candidate, resolver),
  )));
}
