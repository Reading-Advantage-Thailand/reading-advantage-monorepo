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
  const parseVersion = (version: string): [number, number, number] =>
    version.split(".").map(Number) as [number, number, number];
  const compareVersion = (left: string, right: string): number => {
    const a = parseVersion(left);
    const b = parseVersion(right);
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) return a[index]! - b[index]!;
    }
    return 0;
  };
  if (compareVersion(after.version, before.version) < 0) {
    issues.push({
      code: "VERSION_NOT_MONOTONIC",
      message: `Graph versions cannot move backward from ${before.version} to ${after.version}.`,
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
  const beforeNodes = new Map(before.knowledgeSpace.nodes.map((node) => [node.id, node]));
  const afterNodes = new Map(after.knowledgeSpace.nodes.map((node) => [node.id, node]));
  for (const [id, previous] of beforeNodes) {
    const next = afterNodes.get(id);
    if (
      next != null &&
      (previous.kind !== next.kind ||
        previous.domain !== next.domain ||
        previous.metadata.objectiveType !== next.metadata.objectiveType)
    ) {
      issues.push({
        code: "BREAKING_ID_REUSE",
        entityId: id,
        message: "Stable IDs cannot be reused for a different kind, domain, or objective type.",
      });
    }
  }
  for (const removedId of diff.removedNodeIds.filter((id) => activeBefore.has(id))) {
    issues.push({
      code: "ACTIVE_ID_REMOVED",
      entityId: removedId,
      message: "Published active IDs must be retired in place and cannot be deleted or reused.",
    });
  }

  if (after.releaseStatus === "reviewed") {
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
