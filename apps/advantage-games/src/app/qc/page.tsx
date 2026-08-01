import { AdvantageGamesAuthoringQc } from "@/components/apk/AdvantageGamesAuthoringQc";
import { LegacyDefenseCartridgeQc } from "@/components/apk/LegacyDefenseCartridgeQc";
import { LegacyTraversalCartridgeQc } from "@/components/apk/LegacyTraversalCartridgeQc";
import type { StandardPackQcPreview } from "@/components/apk/StandardPackQc";
import preview from "@/lib/apk/standard-pack-qc-preview.json";

import { createExistingActionQcSelections } from "./existing-action-qc-data";
import { createLegacyDefenseQcSelections } from "./legacy-defense-qc-data";
import { createLegacyPuzzleQcSelections } from "./puzzle-qc-data";
import { createLegacyTraversalQcSelections } from "./legacy-traversal-qc-data";

/**
 * Serves the finite, pinned Standard Pack quality-control preview.
 * @returns The browser QC route backed only by generated preview metadata and materialized media.
 */
export default async function StandardPackQcPage() {
  const [existingActionSelections, legacyDefenseSelections, legacyPuzzleSelections] = await Promise.all([
    createExistingActionQcSelections(),
    createLegacyDefenseQcSelections(),
    createLegacyPuzzleQcSelections(),
  ]);
  const legacyTraversalSelections = await createLegacyTraversalQcSelections();
  return (
    <>
      <AdvantageGamesAuthoringQc
      existingActionSelections={existingActionSelections}
      legacyPuzzleSelections={legacyPuzzleSelections}
        preview={preview as StandardPackQcPreview}
      />
      <LegacyTraversalCartridgeQc
          preview={preview as StandardPackQcPreview}
          selections={legacyTraversalSelections}
        />
      <LegacyDefenseCartridgeQc
        preview={preview as StandardPackQcPreview}
        selections={legacyDefenseSelections}
      />
    </>
  );
}
