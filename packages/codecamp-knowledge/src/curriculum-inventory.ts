import rawInventory from "./data/curriculum-source-inventory.json" with { type: "json" };
import rawProvenance from "./data/curriculum-source-provenance.json" with { type: "json" };

import {
  CurriculumSourceInventorySchema,
  CurriculumSourceProvenanceSchema,
} from "./curriculum-inventory-contract.js";

/** Validated package snapshot of all protected curriculum activity coordinates. */
export const curriculumSourceInventory = CurriculumSourceInventorySchema.parse(rawInventory);

/** Validated source revision and digests for the curriculum inventory snapshot. */
export const curriculumSourceProvenance = CurriculumSourceProvenanceSchema.parse(rawProvenance);
