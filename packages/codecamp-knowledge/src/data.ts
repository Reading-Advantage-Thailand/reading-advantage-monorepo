import rawCodeKnowledgeGraph from "./data/code-knowledge-space.json" with { type: "json" };

import { parseCodeKnowledgeGraph } from "./contracts.js";

/** Validated, byte-versioned Codecamp graph snapshot shipped to runtime consumers. */
export const codeKnowledgeGraph = parseCodeKnowledgeGraph(rawCodeKnowledgeGraph);
