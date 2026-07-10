import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  CODE_REQUIRED_CLUSTERS,
  buildCodeGraphReport,
  buildPublishedKnowledgeSpace,
  codeKnowledgeGraph,
  validateCodeKnowledgeGraph,
} from "../index.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("authored Codecamp graph release", () => {
  it("passes strict schema, topology, gate, cluster, and standards validation", () => {
    expect(validateCodeKnowledgeGraph(codeKnowledgeGraph)).toEqual({ valid: true, issues: [] });
    const report = buildCodeGraphReport(codeKnowledgeGraph);
    expect(report).toMatchObject({
      graphId: "codecamp.core",
      version: "1.0.0",
      nodes: 54,
      edges: 139,
      standardsProjections: 2,
      disconnectedObjectives: 0,
    });
    expect(CODE_REQUIRED_CLUSTERS.every((cluster) => report.clusterCounts[cluster] != null)).toBe(true);
  });

  it("distinguishes concepts, applications, workflows, testing, architecture, and APK skills", () => {
    const byId = new Map(codeKnowledgeGraph.knowledgeSpace.nodes.map((entry) => [entry.id, entry]));
    expect(byId.get("codecamp.foundation.concept.variables")?.metadata.objectiveType).toBe("concept");
    expect(byId.get("codecamp.frontend.skill.react-components")?.metadata.objectiveType).toBe("application");
    expect(byId.get("codecamp.workflow.skill.pull-requests")?.metadata.objectiveType).toBe("workflow");
    expect(byId.has("codecamp.testing.skill.browser-acceptance")).toBe(true);
    expect(byId.has("codecamp.architecture.skill.shared-package")).toBe(true);
    for (const suffix of [
      "concept.game-loop",
      "skill.game-state",
      "skill.phaser-lifecycle",
      "skill.input",
      "skill.physics",
      "skill.apk-contract",
      "skill.react-host",
      "skill.cartridge-testing",
      "skill.accessibility",
      "skill.assets",
      "skill.performance",
    ]) {
      expect(byId.has(`codecamp.game-development.${suffix}`)).toBe(true);
    }
  });

  it("publishes an immutable referentially intact active projection", () => {
    const published = buildPublishedKnowledgeSpace(codeKnowledgeGraph);
    const ids = new Set(published.nodes.map((entry) => entry.id));
    expect(published.nodes.every((entry) => entry.metadata.lifecycle === "active")).toBe(true);
    expect(published.edges.every((entry) => entry.reviewStatus === "approved")).toBe(true);
    expect(published.edges.every((entry) => ids.has(entry.sourceId) && ids.has(entry.targetId))).toBe(true);
  });

  it("keeps the checked-in graph file deterministic JSON", () => {
    const raw = readFileSync(join(packageRoot, "src/data/code-knowledge-space.json"), "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    expect(raw).not.toContain("\r");
    expect(JSON.stringify(JSON.parse(raw))).toBe(JSON.stringify(codeKnowledgeGraph));
  });
});
