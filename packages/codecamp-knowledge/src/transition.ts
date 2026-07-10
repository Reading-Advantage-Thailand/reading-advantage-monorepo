import type { CodeKnowledgeGraph } from "./contracts.js";
import { diffCodeKnowledgeGraphs } from "./report.js";
import type { CodeGraphIssue, CodeGraphValidationResult } from "./validation.js";

/** Validates stable identity, version, migration, and approval transitions.
 * @param before Previously published graph release.
 * @param after Candidate successor release.
 * @returns Fail-closed transition issues suitable for release automation.
 */
export function validateCodeGraphTransition(
  before: CodeKnowledgeGraph,
  after: CodeKnowledgeGraph,
): CodeGraphValidationResult {
  const issues: CodeGraphIssue[] = [];
  const diff = diffCodeKnowledgeGraphs(before, after);
  const changed = [
    ...diff.addedNodeIds,
    ...diff.removedNodeIds,
    ...diff.changedNodeIds,
    ...diff.addedEdgeIds,
    ...diff.removedEdgeIds,
    ...diff.changedEdgeIds,
  ].length > 0;
  if (changed && before.version === after.version) {
    issues.push({
      code: "VERSION_NOT_BUMPED",
      message: "Any authored graph change requires a semantic version bump.",
    });
  }
  if (before.version !== after.version && after.migration.previousVersion !== before.version) {
    issues.push({
      code: "MIGRATION_BASE_MISMATCH",
      message: `Migration previousVersion must equal ${before.version}.`,
    });
  }

  const activeBefore = new Set(
    before.knowledgeSpace.nodes
      .filter((node) => node.metadata.lifecycle === "active")
      .map((node) => node.id),
  );
  for (const removedId of diff.removedNodeIds.filter((id) => activeBefore.has(id))) {
    issues.push({
      code: "ACTIVE_ID_REMOVED",
      entityId: removedId,
      message: "Published active IDs must be retired in place and cannot be deleted or reused.",
    });
  }

  if (before.releaseStatus !== "reviewed" && after.releaseStatus === "reviewed") {
    const incomplete = Object.entries(after.review)
      .filter(([, reviewer]) => reviewer.status !== "approved" || reviewer.reviewedAt == null)
      .map(([role]) => role)
      .sort();
    if (incomplete.length > 0) {
      issues.push({
        code: "REVIEW_INCOMPLETE",
        message: `Reviewed publication requires dated approval from: ${incomplete.join(", ")}.`,
      });
    }
  }
  return { valid: issues.length === 0, issues };
}
