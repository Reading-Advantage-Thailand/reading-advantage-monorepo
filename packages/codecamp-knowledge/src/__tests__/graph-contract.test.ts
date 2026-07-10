import { describe, expect, it } from "vitest";

import {
  CodeKnowledgeGraphSchema,
  buildCodeGraphReport,
  codeDomainAdapter,
  diffCodeKnowledgeGraphs,
  parseCodeKnowledgeGraph,
  validateCodeKnowledgeGraph,
} from "../index.js";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const DIGEST = "a".repeat(64);

function node(
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
      objectiveType: standard ? "projection" : kind === "domain" || kind === "content_group" ? "container" : "concept",
      priority: "must",
      lifecycle: "active",
      ...(overrides.metadata as Record<string, unknown> | undefined),
    },
    ...overrides,
  };
}

function edge(
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
    metadata: { gate: type === "prerequisite_for" ? "hard" : type === "supports" ? "soft" : "none" },
    ...overrides,
  };
}

function representativeGraph() {
  const domainId = "codecamp.domain";
  const groupId = "codecamp.foundation.group";
  const variablesId = "codecamp.foundation.concept.variables";
  const functionsId = "codecamp.foundation.skill.functions";
  const standardId = "standards.csta.standard.algorithms";
  return {
    schemaVersion: "code-knowledge-space.v1",
    graphId: "codecamp.core",
    version: "1.0.0",
    releaseStatus: "reviewed",
    provenance: {
      authority: "Mastery Advantage Code domain",
      authorityPath: "code/code-knowledge-space.json",
      sourceRepository: "mastery-advantage",
      sourceRevision: SHA,
      sourceDigest: DIGEST,
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
        node(functionsId),
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

describe("CodeKnowledgeGraphSchema", () => {
  it("accepts a representative language-agnostic to applied-code subgraph", () => {
    expect(CodeKnowledgeGraphSchema.safeParse(representativeGraph()).success).toBe(true);
  });

  it("is strict at the envelope boundary", () => {
    expect(CodeKnowledgeGraphSchema.safeParse({ ...representativeGraph(), surprise: true }).success).toBe(false);
  });

  it("is strict at the Code-domain metadata boundary", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.nodes[2]!.metadata = {
      ...graph.knowledgeSpace.nodes[2]!.metadata,
      surprise: true,
    };
    expect(CodeKnowledgeGraphSchema.safeParse(graph).success).toBe(false);
  });

  it("requires complete version, provenance, migration, review, and projection metadata", () => {
    const graph = representativeGraph();
    // @ts-expect-error deliberate malformed boundary input
    delete graph.provenance.sourceRevision;
    expect(() => parseCodeKnowledgeGraph(graph)).toThrow(/sourceRevision/i);
  });
});

describe("validateCodeKnowledgeGraph", () => {
  it("returns no issues for a representative graph", () => {
    expect(validateCodeKnowledgeGraph(representativeGraph())).toEqual({ valid: true, issues: [] });
  });

  it("rejects duplicate objective IDs", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.nodes.push(structuredClone(graph.knowledgeSpace.nodes[2]!));
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("DUPLICATE_NODE_ID");
  });

  it("rejects dangling prerequisites", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.edges[3]!.targetId = "codecamp.missing.skill";
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("DANGLING_EDGE");
  });

  it("rejects prerequisite cycles", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.edges.push(
      edge("codecamp.edge.functions-before-variables", "prerequisite_for", "codecamp.foundation.skill.functions", "codecamp.foundation.concept.variables"),
    );
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("PREREQUISITE_CYCLE");
  });

  it("rejects low-weight hard gates", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.edges[3]!.weight = 0.79;
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("INVALID_HARD_GATE");
  });

  it("rejects support relationships that claim to be hard gates", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.edges.push(
      edge("codecamp.edge.variables-support-functions", "supports", "codecamp.foundation.concept.variables", "codecamp.foundation.skill.functions", { metadata: { gate: "hard" } }),
    );
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("SUPPORT_CANNOT_GATE");
  });

  it("rejects active objectives disconnected from the domain containment tree", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.nodes.push(node("codecamp.foundation.skill.orphan"));
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("DISCONNECTED_OBJECTIVE");
  });

  it("rejects intra-domain transfer edges", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.edges.push(
      edge("codecamp.edge.bad-transfer", "transfers_to", "codecamp.foundation.concept.variables", "codecamp.foundation.skill.functions"),
    );
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("INVALID_EDGE_PAIRING");
  });

  it("rejects a standards node presented as a Codecamp objective", () => {
    const graph = representativeGraph();
    const standard = graph.knowledgeSpace.nodes.at(-1)!;
    standard.id = "codecamp.foundation.standard.algorithms";
    standard.domain = "codecamp";
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("STANDARD_NOT_PROJECTION");
  });

  it("rejects unreviewed hard prerequisites in a reviewed release", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.edges[3]!.reviewStatus = "draft";
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("UNREVIEWED_GATE");
  });
});

describe("Code domain adapter and deterministic reports", () => {
  it("validates domain metadata independently through the shared adapter contract", () => {
    expect(codeDomainAdapter.domain).toBe("codecamp");
    expect(codeDomainAdapter.validateNodeMetadata(node("codecamp.foundation.skill.functions")).valid).toBe(true);
    expect(
      codeDomainAdapter.validateNodeMetadata({
        ...node("codecamp.foundation.skill.functions"),
        metadata: { cluster: "foundation" },
      }).valid,
    ).toBe(false);
  });

  it("builds a stable report with topology and governance counts", () => {
    const report = buildCodeGraphReport(parseCodeKnowledgeGraph(representativeGraph()));
    expect(report).toMatchObject({
      graphId: "codecamp.core",
      version: "1.0.0",
      nodes: 5,
      edges: 6,
      hardGates: 1,
      softSupports: 0,
      standardsProjections: 1,
      disconnectedObjectives: 0,
    });
    expect(Object.keys(report.clusterCounts)).toEqual(["foundation", "standards"]);
  });

  it("diffs releases deterministically without treating title edits as ID changes", () => {
    const before = parseCodeKnowledgeGraph(representativeGraph());
    const afterInput = representativeGraph();
    afterInput.version = "1.1.0";
    afterInput.knowledgeSpace.nodes[2]!.title = "Variables and immutable bindings";
    afterInput.knowledgeSpace.nodes.push(node("codecamp.foundation.skill.conditionals"));
    afterInput.knowledgeSpace.edges.push(edge("codecamp.edge.contains-conditionals", "contains", "codecamp.foundation.group", "codecamp.foundation.skill.conditionals"));
    const diff = diffCodeKnowledgeGraphs(before, parseCodeKnowledgeGraph(afterInput));
    expect(diff).toEqual({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      addedNodeIds: ["codecamp.foundation.skill.conditionals"],
      removedNodeIds: [],
      changedNodeIds: ["codecamp.foundation.concept.variables"],
      addedEdgeIds: ["codecamp.edge.contains-conditionals"],
      removedEdgeIds: [],
    });
  });
});
