import {
  validateKnowledgeSpace,
  type KnowledgeSpaceEdge,
  type KnowledgeSpaceNode,
} from "@reading-advantage/knowledge-space-core";

import {
  APPROVED_CURRICULUM_DIGEST,
  APPROVED_SEED_ARTIFACT,
  APPROVED_SOURCE_COMMIT,
  APPROVAL_EVIDENCE_DIGEST,
  SalesKnowledgeReleaseSchema,
  type SalesKnowledgeIssue,
  type SalesKnowledgeRelease,
  type SalesKnowledgeValidationResult,
} from "./contracts.js";
import { salesObjectiveId } from "./graph.js";
import { SALES_PROTECTED_INVENTORY } from "./inventory.js";

const ALIGNMENT_EXCEPTION = {
  type: "alignment",
  reason:
    "No owner-approved external standard alignment exists for this Sales release.",
  reviewer: "Project owner",
  date: "2026-07-18",
} as const;

function issue(
  code: string,
  message: string,
  entityId?: string,
  path?: string,
): SalesKnowledgeIssue {
  return {
    code,
    message,
    ...(entityId == null ? {} : { entityId }),
    ...(path == null ? {} : { path }),
  };
}

function schemaIssueCode(message: string): string {
  if (message.includes("Duplicate node ID")) return "DUPLICATE_NODE_ID";
  if (message.includes("Dangling edge")) return "DANGLING_EDGE";
  if (message.includes("Duplicate edge")) return "DUPLICATE_EDGE";
  if (message.includes("cycle")) return "PREREQUISITE_CYCLE";
  return "SCHEMA_INVALID";
}

function sourceValues(refs: unknown): string[] {
  if (!Array.isArray(refs)) return [];
  return refs.flatMap((ref) => {
    if (typeof ref === "string") return [ref];
    if (ref && typeof ref === "object" && "source" in ref) {
      const source = (ref as { source?: unknown }).source;
      return typeof source === "string" ? [source] : [];
    }
    return [];
  });
}

function validateSourceReferences(
  nodes: KnowledgeSpaceNode[],
  edges: KnowledgeSpaceEdge[],
): SalesKnowledgeIssue[] {
  const issues: SalesKnowledgeIssue[] = [];
  for (const entity of [...nodes, ...edges]) {
    const sources = sourceValues(entity.sourceRefs);
    if (sources.length !== 1 || sources[0] !== APPROVED_SEED_ARTIFACT) {
      issues.push(
        issue(
          "UNAPPROVED_SOURCE_REF",
          `${"kind" in entity ? "Node" : "Edge"} ${entity.id} must cite only the exact approved seed source.`,
          entity.id,
        ),
      );
    }
  }
  return issues;
}

function stableIdIssues(release: SalesKnowledgeRelease): SalesKnowledgeIssue[] {
  const issues: SalesKnowledgeIssue[] = [];
  for (const entity of [
    ...release.knowledgeSpace.nodes,
    ...release.knowledgeSpace.edges,
  ]) {
    if (!entity.id.startsWith("sales.")) {
      issues.push(
        issue(
          "NON_SALES_ID",
          `Sales graph entity ${entity.id} is outside the Sales namespace.`,
          entity.id,
        ),
      );
    }
  }
  return issues;
}

function expectedNodes(): Map<
  string,
  {
    kind: KnowledgeSpaceNode["kind"];
    title: string;
    metadata: Record<string, unknown>;
    exceptions?: ReadonlyArray<typeof ALIGNMENT_EXCEPTION>;
  }
> {
  const expected = new Map<
    string,
    {
      kind: KnowledgeSpaceNode["kind"];
      title: string;
      metadata: Record<string, unknown>;
      exceptions?: ReadonlyArray<typeof ALIGNMENT_EXCEPTION>;
    }
  >([
    [
      "sales.domain",
      {
        kind: "domain",
        title: "Sales Advantage",
        metadata: {
          lifecycle: "active",
          releaseId: "knowledge-space-sales-mastery-v1.0.0",
          objectiveType: "domain",
        },
      },
    ],
  ]);
  for (const module of SALES_PROTECTED_INVENTORY) {
    const moduleId = `sales.module.${module.slug}`;
    expected.set(moduleId, {
      kind: "content_group",
      title: `Sales module ${module.slug}`,
      metadata: {
        lifecycle: "active",
        objectiveType: "module",
        moduleOrder: module.order,
      },
    });
    for (const lesson of module.lessons) {
      expected.set(salesObjectiveId(module.slug, lesson.order), {
        kind: "skill",
        title: `Sales objective ${module.slug} lesson ${lesson.order}`,
        metadata: {
          lifecycle: "active",
          objectiveType: "skill",
          moduleSlug: module.slug,
          lessonOrder: lesson.order,
          derivation: "approved-coordinate",
        },
        exceptions: [ALIGNMENT_EXCEPTION],
      });
    }
  }
  return expected;
}

function expectedRelations(): Map<
  string,
  { sourceId: string; targetId: string }
> {
  const expected = new Map<string, { sourceId: string; targetId: string }>();
  for (const module of SALES_PROTECTED_INVENTORY) {
    const moduleId = `sales.module.${module.slug}`;
    expected.set(`sales.edge.contains-domain-module-${module.slug}`, {
      sourceId: "sales.domain",
      targetId: moduleId,
    });
    for (const lesson of module.lessons) {
      expected.set(
        `sales.edge.contains-module-${module.slug}-lesson-${lesson.order}`,
        {
          sourceId: moduleId,
          targetId: salesObjectiveId(module.slug, lesson.order),
        },
      );
    }
  }
  return expected;
}

function exactInventoryIssues(
  release: SalesKnowledgeRelease,
): SalesKnowledgeIssue[] {
  const issues: SalesKnowledgeIssue[] = [];
  const approvedNodes = expectedNodes();
  const seenNodes = new Set<string>();
  for (const node of release.knowledgeSpace.nodes) {
    const approved = approvedNodes.get(node.id);
    seenNodes.add(node.id);
    if (
      approved == null ||
      node.kind !== approved.kind ||
      node.title !== approved.title ||
      node.domain !== "sales" ||
      node.reviewStatus !== "approved" ||
      JSON.stringify(node.metadata) !== JSON.stringify(approved.metadata) ||
      JSON.stringify(node.exceptions) !== JSON.stringify(approved.exceptions)
    ) {
      issues.push(
        issue(
          "UNAPPROVED_NODE",
          `Node ${node.id} is not the exact owner-approved Sales coordinate node.`,
          node.id,
        ),
      );
    }
  }
  for (const nodeId of approvedNodes.keys()) {
    if (!seenNodes.has(nodeId)) {
      issues.push(
        issue(
          "MISSING_APPROVED_NODE",
          `Approved Sales coordinate node ${nodeId} is missing.`,
          nodeId,
        ),
      );
    }
  }

  const approvedRelations = expectedRelations();
  const seenRelations = new Set<string>();
  for (const edge of release.knowledgeSpace.edges) {
    const approved = approvedRelations.get(edge.id);
    seenRelations.add(edge.id);
    if (
      approved == null ||
      edge.type !== "contains" ||
      edge.sourceId !== approved.sourceId ||
      edge.targetId !== approved.targetId ||
      edge.weight !== 1 ||
      edge.confidence !== "high" ||
      edge.reviewStatus !== "approved"
    ) {
      issues.push(
        issue(
          "UNAPPROVED_RELATION",
          `Edge ${edge.id} is not an approved Sales containment relation.`,
          edge.id,
        ),
      );
    }
  }
  for (const edgeId of approvedRelations.keys()) {
    if (!seenRelations.has(edgeId)) {
      issues.push(
        issue(
          "MISSING_APPROVED_RELATION",
          `Approved Sales containment relation ${edgeId} is missing.`,
          edgeId,
        ),
      );
    }
  }
  return issues;
}

/** Validates a Sales graph release against the exact owner-approved graph.
 * @param input Candidate graph release.
 * @returns Deterministically ordered, fail-closed validation issues.
 */
export function validateSalesKnowledgeRelease(
  input: unknown,
): SalesKnowledgeValidationResult {
  const parsed = SalesKnowledgeReleaseSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((item) => ({
      code: schemaIssueCode(item.message),
      message: item.message,
      path: item.path.join("."),
    }));
    return { valid: false, issues };
  }

  const release = parsed.data;
  const issues: SalesKnowledgeIssue[] = [];
  if (
    release.provenance.curriculumGraphSha256 !== APPROVED_CURRICULUM_DIGEST ||
    release.provenance.approvalSha256 !== APPROVAL_EVIDENCE_DIGEST ||
    release.provenance.sourceRepository !== "advantage-pr" ||
    release.provenance.sourceCommit !== APPROVED_SOURCE_COMMIT
  ) {
    issues.push(
      issue(
        "PROVENANCE_DRIFT",
        "Sales graph provenance does not match the approved release evidence.",
      ),
    );
  }
  const core = validateKnowledgeSpace(release.knowledgeSpace);
  issues.push(
    ...core.errors.map((item) =>
      issue(item.code, item.message, item.nodeId ?? item.edgeId),
    ),
  );
  issues.push(...stableIdIssues(release));
  issues.push(
    ...validateSourceReferences(
      release.knowledgeSpace.nodes,
      release.knowledgeSpace.edges,
    ),
  );
  issues.push(...exactInventoryIssues(release));
  issues.sort((left, right) =>
    `${left.code}:${left.entityId ?? left.path ?? ""}`.localeCompare(
      `${right.code}:${right.entityId ?? right.path ?? ""}`,
    ),
  );
  return { valid: issues.length === 0, issues };
}

/** Returns a validated Sales release after enforcing the full graph contract.
 * @param input Candidate graph release.
 * @returns The same graph release after successful validation.
 * @throws When the graph is malformed or differs from the approved release.
 */
export function parseAndValidateSalesKnowledgeRelease(
  input: unknown,
): SalesKnowledgeRelease {
  const result = validateSalesKnowledgeRelease(input);
  if (!result.valid) {
    throw new Error(
      `Invalid Sales knowledge release: ${result.issues.map((item) => item.code).join(", ")}`,
    );
  }
  return SalesKnowledgeReleaseSchema.parse(input);
}
