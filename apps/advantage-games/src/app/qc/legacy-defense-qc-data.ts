import acceptedStandardAssetCatalog from "../../../../../packages/advantage-play-kit/assets/standard/standard-pack-release.json";
import { createLegacyDefenseTask2CanonicalResolver } from "@reading-advantage/advantage-play-kit/assets";
import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";
import {
  LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES,
  materializeLegacyDefenseSelectedUnion,
} from "@reading-advantage/game-cartridges/legacy-defense-candidates";
import type { LegacyDefenseSelectedUnion } from "@reading-advantage/game-cartridges/legacy-defense-candidates";

/**
 * Materializes only the four defense titles' resolver-issued v2 descriptor registrations for `/qc`.
 * @returns Serializable title selections with no physical paths or production registration.
 */
export async function createLegacyDefenseQcSelections(): Promise<readonly LegacyDefenseSelectedUnion[]> {
  const resolver = await createLegacyDefenseTask2CanonicalResolver(acceptedStandardAssetCatalog as StandardAssetCatalog);
  return Object.freeze(await Promise.all(LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES.map(
    (candidate) => materializeLegacyDefenseSelectedUnion(candidate, resolver),
  )));
}
