import rawSourceProvenance from "./data/code-knowledge-space.provenance.json" with { type: "json" };

import { CodeGraphSourceProvenanceSchema } from "./source-sync.js";

/** Validated source commit and digest for the packaged Codecamp graph. */
export const codeGraphSourceProvenance = CodeGraphSourceProvenanceSchema.parse(rawSourceProvenance);
