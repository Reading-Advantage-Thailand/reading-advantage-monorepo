import { describe, expect, it } from "vitest";
import {
  MASTERY_THRESHOLDS_DEFAULT,
  masteryThresholdsSchema,
  type KnowledgeStateEntry,
} from "../mastery-state.js";
import type { KnowledgeSpace, KnowledgeSpaceEdge } from "../types.js";
import { computeWeightedReadiness } from "../weighted-readiness.js";

const SPEC_VERSION = "3.0";
const CONFIG_VERSION = "mastery.v3";
const GRAPH_RELEASE = "slice-a-readiness-1";

function node(id: string): KnowledgeSpace["nodes"][number] {
  return {
    id,
    kind: "skill",
    title: id,
    domain: "test",
    reviewStatus: "approved",
    metadata: { specVersion: SPEC_VERSION, graphRelease: GRAPH_RELEASE },
  };
}

function edge(
  sourceId: string,
  targetId: string,
  weight: number,
): KnowledgeSpaceEdge {
  return {
    id: `edge.${sourceId}.${targetId}`,
    type: "prerequisite_for",
    sourceId,
    targetId,
    weight,
    confidence: "high",
    reviewStatus: "approved",
    metadata: { specVersion: SPEC_VERSION, graphRelease: GRAPH_RELEASE },
  };
}

function entry(nodeId: string, mastery: number): KnowledgeStateEntry {
  return {
    nodeId,
    mastery,
    retention: mastery,
    isProficient: mastery >= 0.9,
    state: mastery >= 0.9 ? "mastered" : "inProgress",
  };
}

describe("v3 gated weighted readiness (§2.5-2.6)", () => {
  it("blocks compensation past an unmet hard prerequisite", () => {
    const target = "test.skill.target";
    const graph: KnowledgeSpace = {
      nodes: [
        node("test.skill.hard"),
        node("test.skill.c"),
        node("test.skill.d"),
        node("test.skill.e"),
        node(target),
      ],
      edges: [
        edge("test.skill.hard", target, 1),
        edge("test.skill.c", target, 0.5),
        edge("test.skill.d", target, 0.5),
        edge("test.skill.e", target, 0.5),
      ],
    };
    const state = new Map([
      ["test.skill.hard", entry("test.skill.hard", 0)],
      ["test.skill.c", entry("test.skill.c", 1)],
      ["test.skill.d", entry("test.skill.d", 1)],
      ["test.skill.e", entry("test.skill.e", 1)],
    ]);

    const result = computeWeightedReadiness(target, state, graph, {
      hardGateThreshold: 1,
    } as never);

    expect(result).toEqual({ score: 0, state: "blocked" });
  });

  it("multiplies the weakest hard gate by the weighted soft component", () => {
    const target = "test.skill.target";
    const graph: KnowledgeSpace = {
      nodes: [
        node("test.skill.hard"),
        node("test.skill.c"),
        node("test.skill.d"),
        node(target),
      ],
      edges: [
        edge("test.skill.hard", target, 1),
        edge("test.skill.c", target, 0.5),
        edge("test.skill.d", target, 0.5),
      ],
    };
    const state = new Map([
      ["test.skill.hard", entry("test.skill.hard", 0.92)],
      ["test.skill.c", entry("test.skill.c", 1)],
      ["test.skill.d", entry("test.skill.d", 0.7)],
    ]);

    const result = computeWeightedReadiness(target, state, graph, {
      hardGateThreshold: 1,
    } as never);

    expect(result.score).toBeCloseTo(0.782, 12);
    expect(result.state).toBe("nearly_ready");
  });

  it("adds versioned hard-gate and trend defaults to the public config contract", () => {
    expect(MASTERY_THRESHOLDS_DEFAULT).toMatchObject({
      hardGateThreshold: 1,
      trendThreshold: 3,
    });
    expect(
      masteryThresholdsSchema.safeParse({
        ...MASTERY_THRESHOLDS_DEFAULT,
        hardGateThreshold: 1,
        trendThreshold: 3,
        configVersion: CONFIG_VERSION,
      }).success,
    ).toBe(true);
  });

  it("is bit-identical to v2 when every prerequisite is soft", () => {
    const target = "test.skill.target";
    const graph: KnowledgeSpace = {
      nodes: [node("test.skill.a"), node("test.skill.b"), node(target)],
      edges: [
        edge("test.skill.a", target, 0.75),
        edge("test.skill.b", target, 0.25),
      ],
    };
    const state = new Map([
      ["test.skill.a", entry("test.skill.a", 0.8)],
      ["test.skill.b", entry("test.skill.b", 0.4)],
    ]);

    expect(
      computeWeightedReadiness(target, state, graph, {
        hardGateThreshold: 1,
      } as never).score,
    ).toBeCloseTo(0.7, 12);
  });
});
