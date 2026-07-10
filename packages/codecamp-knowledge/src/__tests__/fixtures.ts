const SHA = "0123456789abcdef0123456789abcdef01234567";

/** Builds one representative strict Codecamp node for contract tests. */
export function node(
  id: string,
  kind: "domain" | "content_group" | "skill" | "concept" | "standard" = "skill",
  overrides: Record<string, unknown> = {},
) {
  const standard = kind === "standard";
  return {
    id,
    kind,
    title: id,
    domain: standard ? "standards.csta" : "codecamp",
    sourceRefs: ["Codecamp curriculum"],
    reviewStatus: "approved",
    metadata: {
      cluster: standard ? "standards" : "foundation",
      objectiveType:
        standard ? "projection" : kind === "domain" || kind === "content_group" ? "container" : "concept",
      priority: "must",
      lifecycle: "active",
      ...(overrides.metadata as Record<string, unknown> | undefined),
    },
    ...overrides,
  };
}

/** Builds one representative strict Codecamp edge for contract tests. */
export function edge(
  id: string,
  type: "contains" | "aligned_to_standard" | "prerequisite_for" | "supports" | "transfers_to",
  sourceId: string,
  targetId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    type,
    sourceId,
    targetId,
    weight: type === "supports" ? 0.5 : 1,
    confidence: "high",
    sourceRefs: ["Codecamp curriculum"],
    reviewStatus: "approved",
    rationale: "Representative sequencing decision.",
    metadata: {
      gate: type === "prerequisite_for" ? "hard" : type === "supports" ? "soft" : "none",
    },
    ...overrides,
  };
}

/** Builds a minimal draft graph that exercises concept-to-application sequencing. */
export function representativeGraph() {
  const domainId = "codecamp.domain";
  const groupId = "codecamp.foundation.group";
  const variablesId = "codecamp.foundation.concept.variables";
  const functionsId = "codecamp.foundation.skill.functions";
  const standardId = "standards.csta.standard.algorithms";
  return {
    schemaVersion: "code-knowledge-space.v1",
    graphId: "codecamp.core",
    version: "1.0.0",
    releaseStatus: "draft",
    provenance: {
      authority: "Mastery Advantage Code domain",
      authorityPath: "code/code-knowledge-space.json",
      sourceRepository: "mastery-advantage",
      authoredAgainstRevision: SHA,
      authoredAt: "2026-07-10T00:00:00.000Z",
    },
    migration: {
      previousVersion: null,
      stableIds: true,
      impact: "Initial Codecamp graph release; no learner records migrated.",
    },
    review: {
      graphOwner: { name: "Codecamp graph owner", status: "approved", reviewedAt: "2026-07-10" },
      curriculumOwner: { name: "Codecamp curriculum owner", status: "approved", reviewedAt: "2026-07-10" },
      technicalMaintainer: { name: "Codecamp technical maintainer", status: "approved", reviewedAt: "2026-07-10" },
      standardsReviewer: { name: "Standards projection reviewer", status: "approved", reviewedAt: "2026-07-10" },
    },
    standardsProjections: [
      { framework: "CSTA-2017", status: "projection", source: "https://csteachers.org/k12standards/" },
    ],
    knowledgeSpace: {
      nodes: [
        node(domainId, "domain"),
        node(groupId, "content_group"),
        node(variablesId, "concept"),
        node(functionsId, "skill", {
          metadata: { cluster: "foundation", objectiveType: "application", priority: "must", lifecycle: "active" },
        }),
        node(standardId, "standard"),
      ],
      edges: [
        edge("codecamp.edge.contains-foundation", "contains", domainId, groupId),
        edge("codecamp.edge.contains-variables", "contains", groupId, variablesId),
        edge("codecamp.edge.contains-functions", "contains", groupId, functionsId),
        edge("codecamp.edge.variables-before-functions", "prerequisite_for", variablesId, functionsId),
        edge("codecamp.edge.align-variables", "aligned_to_standard", variablesId, standardId),
        edge("codecamp.edge.align-functions", "aligned_to_standard", functionsId, standardId),
      ],
    },
  };
}
