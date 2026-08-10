import rawSalesCurriculumBindings from "./data/sales-curriculum-bindings.json" with { type: "json" };
import rawSalesKnowledgeRelease from "./data/sales-knowledge-space.json" with { type: "json" };
import rawSalesReleaseEvidence from "./data/sales-release-evidence.json" with { type: "json" };

import { parseSalesCurriculumBindingRelease } from "./bindings.js";
import {
  loadPackagedSalesEvidenceBytes,
  verifySalesRuntimeArtifacts,
} from "./evidence.js";

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

/** Checked-in immutable Sales curriculum binding release. */
export const salesCurriculumBindings = parseSalesCurriculumBindingRelease(
  rawSalesCurriculumBindings,
);
