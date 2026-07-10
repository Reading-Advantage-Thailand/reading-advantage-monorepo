export {
  CodeClusterSchema,
  CODE_REQUIRED_CLUSTERS,
  CodeEdgeMetadataSchema,
  CodeKnowledgeGraphSchema,
  CodeNodeMetadataSchema,
  CodeObjectiveTypeSchema,
  parseCodeKnowledgeGraph,
} from "./contracts.js";
export type { CodeKnowledgeGraph } from "./contracts.js";

export { codeDomainAdapter } from "./adapter.js";

export {
  asCodeKnowledgeGraph,
  HARD_GATE_THRESHOLD,
  validateCodeKnowledgeGraph,
} from "./validation.js";
export type {
  CodeGraphIssue,
  CodeGraphValidationResult,
} from "./validation.js";

export { buildPublishedKnowledgeSpace } from "./publication.js";
export { validateCodeGraphTransition } from "./transition.js";

export {
  buildCodeGraphReport,
  diffCodeKnowledgeGraphs,
} from "./report.js";
export type { CodeGraphDiff, CodeGraphReport } from "./report.js";

export { codeKnowledgeGraph } from "./data.js";
export { codeGraphSourceProvenance } from "./provenance.js";
export {
  CodeGraphSourceProvenanceSchema,
  sha256,
  verifySourceSnapshot,
} from "./source-sync.js";
export type {
  CodeGraphSourceProvenance,
  SourceSyncResult,
} from "./source-sync.js";
export {
  defaultCodecampMonorepoRoot,
  defaultMasteryAdvantageRoot,
  runCodeGraphCli,
} from "./cli.js";
export type { CodeGraphCliContext } from "./cli.js";

export {
  CurriculumActivityBindingSchema,
  CurriculumActivitySourceSchema,
  CurriculumBindingReleaseSchema,
  CurriculumModuleSummarySchema,
  CurriculumRubricBindingSchema,
  buildBindingCoverageReport,
  countIndependentEvidenceByObjective,
  parseCurriculumBindingRelease,
  projectMasteryEvidence,
  validateCurriculumBindings,
} from "./bindings.js";
export type {
  BindingCoverageReport,
  BoundMasteryEvidence,
  CurriculumBindingIssue,
  CurriculumBindingRelease,
  CurriculumBindingValidationResult,
} from "./bindings.js";

export {
  CurriculumSourceInventorySchema,
  CurriculumSourceProvenanceSchema,
  collectCurriculumInventory,
  verifyCurriculumSource,
} from "./curriculum-inventory-contract.js";
export type {
  CurriculumInventoryInput,
  CurriculumSourceInventory,
  CurriculumSourceProvenance,
  InventoryLessonInput,
  InventoryModuleInput,
} from "./curriculum-inventory-contract.js";
export {
  curriculumSourceInventory,
  curriculumSourceProvenance,
} from "./curriculum-inventory.js";
export { curriculumBindings } from "./binding-data.js";
