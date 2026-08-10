import rawSalesCurriculumBindings from "./data/sales-curriculum-bindings.json" with { type: "json" };
import rawSalesKnowledgeRelease from "./data/sales-knowledge-space.json" with { type: "json" };
import rawSalesReleaseEvidence from "./data/sales-release-evidence.json" with { type: "json" };

import {
  loadPackagedSalesEvidenceBytes,
  verifySalesRuntimeArtifacts,
} from "./evidence.js";
import { parseAndValidateSalesKnowledgeRelease } from "./validation.js";

const runtimeValidation = verifySalesRuntimeArtifacts({
  graph: rawSalesKnowledgeRelease,
  bindings: rawSalesCurriculumBindings,
  evidenceManifest: rawSalesReleaseEvidence,
  ...loadPackagedSalesEvidenceBytes(),
});
if (!runtimeValidation.valid) {
  throw new Error(
    `Invalid packaged Sales runtime artifacts: ${runtimeValidation.issues
      .map((item) => item.code)
      .join(", ")}`,
  );
}

/** Checked-in reviewed Sales graph release used by runtime consumers. */
export const salesKnowledgeRelease = parseAndValidateSalesKnowledgeRelease(
  rawSalesKnowledgeRelease,
);
