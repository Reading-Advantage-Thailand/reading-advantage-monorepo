import { describe, expect, it } from "vitest";
import { buildKnowledgeStateSeed, type PlacementResult } from "../placement.js";
import type { KnowledgeSpace } from "../types.js";

const NOW = Date.parse("2026-07-10T00:00:00.000Z");

type V3PlacementSeed = {
  nodeId: string;
  masteryEstimate: number;
  confidence: "low" | "medium" | "high";
  evidenceType: "direct" | "inferred";
  source: "placement";
  initialStability: number;
  card: {
    variantKey: string;
    state: "review";
    reps: 1;
    lapses: 0;
    lastReview: number;
    metadata: { source: "placement"; specVersion: "3.0" };
  };
  provisionalState: "mastered" | "inProgress";
};

function graph(): KnowledgeSpace {
  const ids = [
    "test.skill.hard-ancestor",
    "test.skill.soft-ancestor",
    "test.skill.target",
  ];
  return {
    nodes: ids.map((id) => ({
      id,
      kind: "skill" as const,
      title: id,
      domain: "test",
      reviewStatus: "approved" as const,
      metadata: { graphRelease: "placement-v3-1" },
    })),
    edges: [
      {
        id: "edge.hard",
        type: "prerequisite_for",
        sourceId: ids[0],
        targetId: ids[2],
        weight: 1,
        confidence: "high",
        reviewStatus: "approved",
      },
      {
        id: "edge.soft",
        type: "prerequisite_for",
        sourceId: ids[1],
        targetId: ids[2],
        weight: 0.5,
        confidence: "high",
        reviewStatus: "approved",
      },
    ],
  };
}

describe("v3 placement seeding contract (§11.4)", () => {
  it("synthesizes a review card and provisional mastery from a medium estimate", () => {
    const seeds = buildKnowledgeStateSeed(
      [
        {
          nodeId: "test.skill.target",
          masteryEstimate: 0.8,
          confidence: "medium",
        },
      ],
      { now: NOW },
    ) as unknown as V3PlacementSeed[];

    expect(seeds[0]).toMatchObject({
      nodeId: "test.skill.target",
      evidenceType: "direct",
      source: "placement",
      initialStability: 12,
      provisionalState: "mastered",
      card: {
        variantKey: "test.skill.target",
        state: "review",
        reps: 1,
        lapses: 0,
        lastReview: NOW,
        metadata: { source: "placement", specVersion: "3.0" },
      },
    });
  });

  it("accepts high confidence and uses H(high)=30", () => {
    const seeds = buildKnowledgeStateSeed(
      [
        {
          nodeId: "test.skill.target",
          masteryEstimate: 0.95,
          confidence: "high",
        } as unknown as PlacementResult,
      ],
      { now: NOW },
    ) as unknown as V3PlacementSeed[];

    expect(seeds[0]?.initialStability).toBeCloseTo(28.5, 12);
    expect(seeds[0]?.provisionalState).toBe("mastered");
  });

  it("closes only hard ancestors and downgrades inferred confidence per hop", () => {
    const seeds = buildKnowledgeStateSeed(
      [
        {
          nodeId: "test.skill.target",
          masteryEstimate: 0.95,
          confidence: "medium",
        },
      ],
      { now: NOW, graph: graph(), hardGateThreshold: 1 } as never,
    ) as unknown as V3PlacementSeed[];

    expect(seeds).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: "test.skill.hard-ancestor",
          masteryEstimate: 0.95,
          confidence: "low",
          evidenceType: "inferred",
          initialStability: 4.75,
        }),
      ]),
    );
    expect(
      seeds.some((seed) => seed.nodeId === "test.skill.soft-ancestor"),
    ).toBe(false);
  });
});
