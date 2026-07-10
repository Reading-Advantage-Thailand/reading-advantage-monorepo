import { describe, expect, it } from "vitest";
import { runPlacementTraversal } from "../placement-engine.js";
import type { ProbeAdapter, ProbeResult } from "../placement.js";
import type { KnowledgeSpace } from "../types.js";

function chain(length: number): KnowledgeSpace {
  const nodes = Array.from({ length }, (_, index) => ({
    id: `test.skill.n${index}`,
    kind: "skill" as const,
    title: `N${index}`,
    domain: "test",
    reviewStatus: "approved" as const,
    metadata: { specVersion: "3.1", graphRelease: "placement-walk-1" },
  }));
  return {
    nodes,
    edges: nodes.slice(1).map((current, index) => ({
      id: `edge.${index}`,
      type: "prerequisite_for" as const,
      sourceId: nodes[index]!.id,
      targetId: current.id,
      weight: 1,
      confidence: "high" as const,
      reviewStatus: "approved" as const,
    })),
  };
}

describe("v3.1 adaptive frontier walk (§11.2)", () => {
  it("uses two probes plus a tie-breaker before resolving a mixed node", async () => {
    const calls: Record<string, number> = {};
    const outcomes: Record<string, ProbeResult[]> = {
      "test.skill.n0": ["pass", "fail", "fail"],
    };
    const adapter: ProbeAdapter = {
      domain: "test",
      probe(nodeId) {
        const index = calls[nodeId] ?? 0;
        calls[nodeId] = index + 1;
        return outcomes[nodeId]?.[index] ?? "fail";
      },
    };

    const result = await runPlacementTraversal(chain(2), adapter, {
      startNodeId: "test.skill.n0",
      maxProbes: 24,
    });

    expect(calls["test.skill.n0"]).toBe(3);
    expect(
      result.results.find((item) => item.nodeId === "test.skill.n0")
        ?.masteryEstimate,
    ).toBeLessThan(0.5);
    expect(result.results.some((item) => item.nodeId === "test.skill.n1")).toBe(
      false,
    );
  });

  it("spends the exact default budget as two probes per resolved decision node", async () => {
    const calls: Record<string, number> = {};
    const adapter: ProbeAdapter = {
      domain: "test",
      probe(nodeId) {
        calls[nodeId] = (calls[nodeId] ?? 0) + 1;
        return "pass";
      },
    };

    const result = await runPlacementTraversal(chain(30), adapter, {
      startNodeId: "test.skill.n0",
      maxProbes: 24,
    });

    expect(result.probesPerformed).toBe(24);
    expect(result.results).toHaveLength(12);
    expect(Object.values(calls).every((count) => count === 2)).toBe(true);
    expect(
      result.results.every((item) => item.confidence !== ("high" as never)),
    ).toBe(true);
  });
});
