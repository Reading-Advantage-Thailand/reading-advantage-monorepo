import acceptedStandardAssetCatalog from "../../../../../packages/advantage-play-kit/assets/standard/standard-pack-release.json";
import { createPuzzleQcSelections } from "@reading-advantage/game-cartridges/puzzle-qc";
import type { PuzzleQcSelectedUnion } from "@reading-advantage/game-cartridges/puzzle-qc";
import type { StandardAssetCatalog } from "@reading-advantage/advantage-play-kit/assets";

let selectionsPromise: Promise<readonly PuzzleQcSelectedUnion[]> | undefined;

/**
 * Creates the five title-specific descriptor selections that may enter the Advantage Games `/qc` surface.
 * @returns Serializable selected unions with no physical paths, catalog registration, or host authority.
 */
export async function createLegacyPuzzleQcSelections(): Promise<readonly PuzzleQcSelectedUnion[]> {
  selectionsPromise ??= createPuzzleQcSelections(acceptedStandardAssetCatalog as StandardAssetCatalog);
  return selectionsPromise;
}
