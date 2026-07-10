export {
  CodeClusterSchema,
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
  validateCodeKnowledgeGraph,
} from "./validation.js";
export type {
  CodeGraphIssue,
  CodeGraphValidationResult,
} from "./validation.js";

export {
  buildCodeGraphReport,
  diffCodeKnowledgeGraphs,
} from "./report.js";
export type { CodeGraphDiff, CodeGraphReport } from "./report.js";
