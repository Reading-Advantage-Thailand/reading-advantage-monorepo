import { MASTERY_THRESHOLDS_DEFAULT } from "@reading-advantage/knowledge-space-core";
import { describe, expect, it } from "vitest";

import {
  CODE_REQUIRED_CLUSTERS,
  CodeKnowledgeGraphSchema,
  HARD_GATE_THRESHOLD,
  buildCodeGraphReport,
  buildPublishedKnowledgeSpace,
  codeKnowledgeGraph,
  codeDomainAdapter,
  diffCodeKnowledgeGraphs,
  parseCodeKnowledgeGraph,
  validateCodeGraphTransition,
  validateCodeKnowledgeGraph,
} from "../index.js";
import { edge, node, representativeGraph } from "./fixtures.js";

describe("CodeKnowledgeGraphSchema", () => {
  it("accepts a representative concept-to-application draft subgraph", () => {
    expect(CodeKnowledgeGraphSchema.safeParse(representativeGraph()).success).toBe(true);
  });

  it("is strict at envelope, node, edge, metadata, and reviewer boundaries", () => {
    const mutations = [
      (graph: ReturnType<typeof representativeGraph>) => Object.assign(graph, { surprise: true }),
      (graph: ReturnType<typeof representativeGraph>) => Object.assign(graph.knowledgeSpace.nodes[0]!, { surprise: true }),
      (graph: ReturnType<typeof representativeGraph>) => Object.assign(graph.knowledgeSpace.edges[0]!, { surprise: true }),
      (graph: ReturnType<typeof representativeGraph>) => Object.assign(graph.knowledgeSpace.nodes[2]!.metadata, { surprise: true }),
      (graph: ReturnType<typeof representativeGraph>) => Object.assign(graph.review.graphOwner, { surprise: true }),
    ];
    for (const mutate of mutations) {
      const graph = representativeGraph();
      mutate(graph);
      expect(CodeKnowledgeGraphSchema.safeParse(graph).success).toBe(false);
    }
  });

  it("requires version, provenance, migration, review, and projection metadata", () => {
    const graph = representativeGraph();
    // @ts-expect-error deliberate malformed boundary input
    delete graph.provenance.authoredAgainstRevision;
    expect(() => parseCodeKnowledgeGraph(graph)).toThrow(/authoredAgainstRevision/i);
  });
});

describe("validateCodeKnowledgeGraph", () => {
  it("returns no issues for the representative draft graph", () => {
    expect(validateCodeKnowledgeGraph(representativeGraph())).toEqual({ valid: true, issues: [] });
  });

  it.each([
    ["DUPLICATE_NODE_ID", (graph: ReturnType<typeof representativeGraph>) => graph.knowledgeSpace.nodes.push(structuredClone(graph.knowledgeSpace.nodes[2]!))],
    ["DANGLING_EDGE", (graph: ReturnType<typeof representativeGraph>) => { graph.knowledgeSpace.edges[3]!.targetId = "codecamp.missing.skill"; }],
    ["DISCONNECTED_OBJECTIVE", (graph: ReturnType<typeof representativeGraph>) => graph.knowledgeSpace.nodes.push(node("codecamp.foundation.skill.orphan"))],
    ["INVALID_EDGE_PAIRING", (graph: ReturnType<typeof representativeGraph>) => graph.knowledgeSpace.edges.push(edge("codecamp.edge.bad-transfer", "transfers_to", "codecamp.foundation.concept.variables", "codecamp.foundation.skill.functions"))],
  ])("rejects %s counterexamples", (code, mutate) => {
    const graph = representativeGraph();
    mutate(graph);
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain(code);
  });

  it("rejects prerequisite cycles at high and low confidence", () => {
    for (const confidence of ["high", "low"] as const) {
      const graph = representativeGraph();
      graph.knowledgeSpace.edges.push(edge("codecamp.edge.reverse-cycle", "prerequisite_for", "codecamp.foundation.skill.functions", "codecamp.foundation.concept.variables", { confidence }));
      expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("PREREQUISITE_CYCLE");
    }
  });

  it("uses the exact shared-engine threshold for hard gates", () => {
    expect(HARD_GATE_THRESHOLD).toBe(MASTERY_THRESHOLDS_DEFAULT.hardGateThreshold);
    const graph = representativeGraph();
    graph.knowledgeSpace.edges[3]!.weight = HARD_GATE_THRESHOLD - 0.01;
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("INVALID_HARD_GATE");
  });

  it("rejects support relationships that claim to gate", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.edges.push(edge("codecamp.edge.bad-support", "supports", "codecamp.foundation.concept.variables", "codecamp.foundation.skill.functions", { metadata: { gate: "hard" } }));
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("SUPPORT_CANNOT_GATE");
  });

  it("rejects a prerequisite edge with undeclared gating semantics", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.edges[3]!.metadata = { gate: "none" };
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain(
      "PREREQUISITE_GATE_UNDECLARED",
    );
  });

  it("rejects a standards projection placed in the Codecamp domain without creating a dangling edge", () => {
    const graph = representativeGraph();
    graph.knowledgeSpace.nodes.at(-1)!.domain = "codecamp";
    expect(validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code)).toContain("STANDARD_NOT_PROJECTION");
  });

  it("requires every cluster and approved gate before reviewed publication", () => {
    const graph = representativeGraph();
    graph.releaseStatus = "reviewed";
    graph.knowledgeSpace.edges[3]!.reviewStatus = "draft";
    const codes = validateCodeKnowledgeGraph(graph).issues.map((issue) => issue.code);
    expect(codes).toContain("MISSING_REQUIRED_CLUSTER");
    expect(codes).toContain("UNREVIEWED_GATE");
    expect(CODE_REQUIRED_CLUSTERS).toHaveLength(10);
  });
});

describe("adapter, publication, and deterministic reports", () => {
  it("validates strict metadata through the shared adapter contract", () => {
    expect(codeDomainAdapter.domain).toBe("codecamp");
    const validNode = parseCodeKnowledgeGraph(representativeGraph()).knowledgeSpace.nodes[3]!;
    expect(codeDomainAdapter.validateNodeMetadata(validNode).valid).toBe(true);
    expect(codeDomainAdapter.validateNodeMetadata({ ...validNode, metadata: { cluster: "foundation" } }).valid).toBe(false);
  });

  it("builds a stable topology and governance report", () => {
    expect(buildCodeGraphReport(parseCodeKnowledgeGraph(representativeGraph()))).toMatchObject({
      graphId: "codecamp.core",
      version: "1.0.0",
      nodes: 5,
      edges: 6,
      hardGates: 1,
      standardsProjections: 1,
      disconnectedObjectives: 0,
    });
  });

  it("diffs node and edge changes independently from stable IDs", () => {
    const before = parseCodeKnowledgeGraph(representativeGraph());
    const afterInput = representativeGraph();
    afterInput.version = "1.1.0";
    afterInput.knowledgeSpace.nodes[2]!.title = "Variables and immutable bindings";
    afterInput.knowledgeSpace.nodes.push(node("codecamp.foundation.skill.conditionals"));
    afterInput.knowledgeSpace.edges.push(edge("codecamp.edge.contains-conditionals", "contains", "codecamp.foundation.group", "codecamp.foundation.skill.conditionals"));
    afterInput.knowledgeSpace.edges[3]!.rationale = "Clarified hard-gate rationale.";
    expect(diffCodeKnowledgeGraphs(before, parseCodeKnowledgeGraph(afterInput))).toEqual({
      fromVersion: "1.0.0",
      toVersion: "1.1.0",
      addedNodeIds: ["codecamp.foundation.skill.conditionals"],
      removedNodeIds: [],
      changedNodeIds: ["codecamp.foundation.concept.variables"],
      addedEdgeIds: ["codecamp.edge.contains-conditionals"],
      removedEdgeIds: [],
      changedEdgeIds: ["codecamp.edge.variables-before-functions"],
    });
  });

  it("publishes only active reviewed objectives and approved referentially intact edges", () => {
    expect(() => buildPublishedKnowledgeSpace(parseCodeKnowledgeGraph(representativeGraph()))).toThrow(
      /Only reviewed/,
    );
    const input = structuredClone(codeKnowledgeGraph);
    input.knowledgeSpace.nodes.find(
      (entry) => entry.id === "codecamp.game-development.skill.assets",
    )!.metadata.lifecycle = "retired";
    input.knowledgeSpace.edges.find(
      (entry) => entry.id === "codecamp.edge.assets-support-performance",
    )!.reviewStatus = "draft";
    const published = buildPublishedKnowledgeSpace(parseCodeKnowledgeGraph(input));
    const ids = new Set(published.nodes.map((entry) => entry.id));
    expect(ids).not.toContain("codecamp.game-development.skill.assets");
    expect(published.edges.map((entry) => entry.id)).not.toContain("codecamp.edge.assets-support-performance");
    expect(published.edges.every((entry) => ids.has(entry.sourceId) && ids.has(entry.targetId))).toBe(true);
  });
});

describe("release transition safety", () => {
  it("requires a version bump for authored changes", () => {
    const before = parseCodeKnowledgeGraph(representativeGraph());
    const afterInput = representativeGraph();
    afterInput.knowledgeSpace.nodes[2]!.title = "Changed title";
    expect(validateCodeGraphTransition(before, parseCodeKnowledgeGraph(afterInput)).issues.map((issue) => issue.code)).toContain("VERSION_NOT_BUMPED");
  });

  it("rejects silent deletion of a previously active stable ID", () => {
    const before = parseCodeKnowledgeGraph(representativeGraph());
    const afterInput = representativeGraph();
    afterInput.version = "2.0.0";
    afterInput.migration.previousVersion = "1.0.0";
    afterInput.knowledgeSpace.nodes = afterInput.knowledgeSpace.nodes.filter((entry) => entry.id !== "codecamp.foundation.skill.functions");
    afterInput.knowledgeSpace.edges = afterInput.knowledgeSpace.edges.filter((entry) => entry.sourceId !== "codecamp.foundation.skill.functions" && entry.targetId !== "codecamp.foundation.skill.functions");
    expect(validateCodeGraphTransition(before, parseCodeKnowledgeGraph(afterInput)).issues.map((issue) => issue.code)).toContain("ACTIVE_ID_REMOVED");
  });

  it("requires all reviewers when moving from draft to reviewed", () => {
    const before = parseCodeKnowledgeGraph(representativeGraph());
    const afterInput = representativeGraph();
    afterInput.version = "1.0.1";
    afterInput.migration.previousVersion = "1.0.0";
    afterInput.releaseStatus = "reviewed";
    afterInput.review.curriculumOwner.status = "pending";
    expect(validateCodeGraphTransition(before, parseCodeKnowledgeGraph(afterInput)).issues.map((issue) => issue.code)).toContain("REVIEW_INCOMPLETE");
  });

  it("rejects reviewed-release approval drift even without a status transition", () => {
    const input = structuredClone(codeKnowledgeGraph);
    input.review.technicalMaintainer.status = "pending";
    expect(validateCodeKnowledgeGraph(input).issues.map((issue) => issue.code)).toContain(
      "REVIEW_INCOMPLETE",
    );
  });

  it("rejects version downgrades and semantic reuse of a stable ID", () => {
    const before = parseCodeKnowledgeGraph(representativeGraph());
    const afterInput = representativeGraph();
    afterInput.version = "0.9.0";
    afterInput.migration.previousVersion = "1.0.0";
    afterInput.knowledgeSpace.nodes[2]!.kind = "skill";
    const codes = validateCodeGraphTransition(
      before,
      parseCodeKnowledgeGraph(afterInput),
    ).issues.map((issue) => issue.code);
    expect(codes).toContain("VERSION_NOT_MONOTONIC");
    expect(codes).toContain("BREAKING_ID_REUSE");
  });
});
