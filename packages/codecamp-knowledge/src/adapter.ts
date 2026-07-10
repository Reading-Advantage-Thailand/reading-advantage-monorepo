import type { DomainAdapter, KnowledgeSpaceNode } from "@reading-advantage/knowledge-space-core";

import { CodeNodeMetadataSchema } from "./contracts.js";

/** Code-domain metadata adapter consumed through the shared graph-engine contract. */
export const codeDomainAdapter: DomainAdapter = {
  domain: "codecamp",
  validateNodeMetadata(node: KnowledgeSpaceNode) {
    const result = CodeNodeMetadataSchema.safeParse(node.metadata);
    if (result.success) return { valid: true };
    return {
      valid: false,
      errors: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "metadata"}: ${issue.message}`,
      ),
    };
  },
};
