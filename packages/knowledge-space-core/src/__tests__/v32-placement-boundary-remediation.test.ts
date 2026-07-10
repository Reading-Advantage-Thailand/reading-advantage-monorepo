import { describe, expect, it, vi } from "vitest";
import { runPlacementTraversal } from "../placement-engine.js";
import {
  buildKnowledgeStateSeed,
  isPlacementResult,
  type PlacementCardScheduler,
  type ProbeAdapter,
} from "../placement.js";
import type { KnowledgeSpace } from "../types.js";

const NOW = Date.parse("2026-07-10T00:00:00.000Z");

function node(
  id: string,
  kind: KnowledgeSpace["nodes"][number]["kind"] = "skill",
) {
  return {
    id,
    kind,
    title: id,
    domain: "test",
    reviewStatus: "approved" as const,
    metadata: {},
  };
}

function chain(): KnowledgeSpace {
  return {
    nodes: [node("test.skill.a"), node("test.skill.b")],
    edges: [
      {
        id: "edge.a-b",
        type: "prerequisite_for",
        sourceId: "test.skill.a",
        targetId: "test.skill.b",
        weight: 1,
        confidence: "high",
        reviewStatus: "approved",
      },
    ],
  };
}

describe("placement boundary remediation", () => {
  it("uses masteryEnter 0.90 and validates high confidence before scheduling", () => {
    const schedulePlacementCard = vi.fn(() => ({
      difficulty: 4.2,
      dueDate: NOW + 1234,
    }));
    const scheduler: PlacementCardScheduler = { schedulePlacementCard };
    const medium = buildKnowledgeStateSeed(
      [{ nodeId: "test.skill.a", masteryEstimate: 0.85, confidence: "medium" }],
      { now: NOW, scheduler },
    );
    expect(medium[0]?.provisionalState).toBe("inProgress");
    expect(medium[0]?.card).toMatchObject({
      difficulty: 4.2,
      dueDate: NOW + 1234,
    });

    expect(() =>
      buildKnowledgeStateSeed(
        [{ nodeId: "test.skill.a", masteryEstimate: 0.95, confidence: "high" }],
        { now: NOW, scheduler },
      ),
    ).toThrow(/high-fidelity/i);
    expect(schedulePlacementCard).toHaveBeenCalledTimes(1);
  });

  it("accepts instrument-authorized high confidence and rejects non-finite estimates first", () => {
    const schedulePlacementCard = vi.fn(() => ({
      difficulty: 4,
      dueDate: NOW + 1000,
    }));
    expect(
      isPlacementResult({
        nodeId: "test.skill.a",
        masteryEstimate: Number.NaN,
        confidence: "low",
      }),
    ).toBe(false);
    expect(() =>
      buildKnowledgeStateSeed(
        [
          {
            nodeId: "test.skill.a",
            masteryEstimate: Number.NaN,
            confidence: "low",
          },
        ],
        { now: NOW, scheduler: { schedulePlacementCard } },
      ),
    ).toThrow();
    expect(schedulePlacementCard).not.toHaveBeenCalled();

    const [seed] = buildKnowledgeStateSeed(
      [{ nodeId: "test.skill.a", masteryEstimate: 0.95, confidence: "high" }],
      {
        now: NOW,
        highFidelityProbeInstrument: true,
        scheduler: { schedulePlacementCard },
      },
    );
    expect(seed?.confidence).toBe("high");
  });

  it("validates traversal options and graph membership before invoking the provider", () => {
    const probe = vi.fn(() => "pass" as const);
    const adapter: ProbeAdapter = { domain: "test", probe };
    expect(() =>
      runPlacementTraversal(chain(), adapter, {
        startNodeId: "test.skill.missing",
      }),
    ).toThrow(/startNodeId/);
    expect(() =>
      runPlacementTraversal(chain(), adapter, { maxProbes: Number.NaN }),
    ).toThrow();
    expect(() =>
      runPlacementTraversal(chain(), adapter, { hardGateThreshold: 2 }),
    ).toThrow();
    expect(probe).not.toHaveBeenCalled();
  });

  it("reports a probe budget exhausted mid-node as non-converged", async () => {
    const result = await runPlacementTraversal(
      chain(),
      { domain: "test", probe: () => "pass" },
      {
        startNodeId: "test.skill.a",
        maxProbes: 1,
      },
    );
    expect(result).toMatchObject({
      probesPerformed: 1,
      reason: "max-probes",
      converged: false,
      results: [],
    });
  });

  it("does not probe a child until every hard parent is resolved", async () => {
    const graph: KnowledgeSpace = {
      nodes: [
        node("test.skill.a"),
        node("test.skill.b"),
        node("test.skill.child"),
      ],
      edges: [
        {
          id: "a-c",
          type: "prerequisite_for",
          sourceId: "test.skill.a",
          targetId: "test.skill.child",
          weight: 1,
          confidence: "high",
          reviewStatus: "approved",
        },
        {
          id: "b-c",
          type: "prerequisite_for",
          sourceId: "test.skill.b",
          targetId: "test.skill.child",
          weight: 1,
          confidence: "high",
          reviewStatus: "approved",
        },
      ],
    };
    const calls: string[] = [];
    await runPlacementTraversal(
      graph,
      {
        domain: "test",
        probe(id) {
          calls.push(id);
          return "pass";
        },
      },
      {
        startNodeId: "test.skill.a",
        maxProbes: 6,
      },
    );
    expect(calls).toEqual(["test.skill.a", "test.skill.a"]);
  });

  it("uses the group cap and unlock ordering", async () => {
    const graph: KnowledgeSpace = {
      nodes: [
        node("test.skill.root"),
        node("test.group.one", "content_group"),
        node("test.skill.low"),
        node("test.skill.high"),
      ],
      edges: [
        {
          id: "root-low",
          type: "prerequisite_for",
          sourceId: "test.skill.root",
          targetId: "test.skill.low",
          weight: 1,
          confidence: "high",
          reviewStatus: "approved",
        },
        {
          id: "root-high",
          type: "prerequisite_for",
          sourceId: "test.skill.root",
          targetId: "test.skill.high",
          weight: 1,
          confidence: "high",
          reviewStatus: "approved",
        },
        {
          id: "group-low",
          type: "contains",
          sourceId: "test.group.one",
          targetId: "test.skill.low",
          weight: 1,
          confidence: "high",
          reviewStatus: "approved",
        },
        {
          id: "group-high",
          type: "contains",
          sourceId: "test.group.one",
          targetId: "test.skill.high",
          weight: 1,
          confidence: "high",
          reviewStatus: "approved",
        },
      ],
    };
    const calls: string[] = [];
    await runPlacementTraversal(
      graph,
      {
        domain: "test",
        probe(id) {
          calls.push(id);
          return "pass";
        },
      },
      {
        startNodeId: "test.skill.root",
        maxProbes: 4,
        maxRepresentativesPerContentGroup: 1,
        unlockValueByNode: { "test.skill.low": 0.1, "test.skill.high": 0.9 },
      },
    );
    expect(calls.slice(2)).toEqual(["test.skill.high", "test.skill.high"]);
  });

  it("stalls after four unchanged frontier probes across complete decisions", async () => {
    const graph: KnowledgeSpace = {
      nodes: [
        node("test.skill.root"),
        node("test.skill.a"),
        node("test.skill.b"),
        node("test.skill.c"),
      ],
      edges: ["a", "b", "c"].map((suffix) => ({
        id: `root-${suffix}`,
        type: "prerequisite_for" as const,
        sourceId: "test.skill.root",
        targetId: `test.skill.${suffix}`,
        weight: 1,
        confidence: "high" as const,
        reviewStatus: "approved" as const,
      })),
    };
    const calls: Record<string, number> = {};
    const rootOutcomes = ["pass", "fail", "pass"] as const;

    const stalled = await runPlacementTraversal(
      graph,
      {
        domain: "test",
        probe(nodeId) {
          const call = calls[nodeId] ?? 0;
          calls[nodeId] = call + 1;
          return nodeId === "test.skill.root"
            ? (rootOutcomes[call] ?? "pass")
            : "pass";
        },
      },
      { startNodeId: "test.skill.root" },
    );

    expect(stalled).toMatchObject({
      probesPerformed: 7,
      reason: "frontier-stalled",
      converged: false,
    });
    expect(calls).toEqual({
      "test.skill.root": 3,
      "test.skill.a": 2,
      "test.skill.b": 2,
    });
    expect(stalled.results.map((result) => result.nodeId)).toEqual([
      "test.skill.root",
      "test.skill.a",
      "test.skill.b",
    ]);
  });
});
