import { describe, expect, it } from "vitest";

import {
  createIsometricStepGraph,
  getAdjacentStepNodes,
  isAdjacentStep,
} from "./step-graph";

const tokens = [
  { id: "0:0", text: "The" },
  { id: "0:1", text: "mage" },
  { id: "0:2", text: "returns" },
] as const;

describe("isometric step graph", () => {
  it("creates the same reachable graph from the same seed", () => {
    const first = createIsometricStepGraph(tokens, 47);
    const second = createIsometricStepGraph(tokens, 47);

    expect(first).toEqual(second);
    expect(first.levels).toHaveLength(tokens.length);
    expect(first.levels.every((level) => level.length === 3)).toBe(true);

    let currentNodeId = first.originNodeId;
    for (const level of first.levels) {
      const adjacent = getAdjacentStepNodes(first, currentNodeId);
      expect(adjacent.map((node) => node.id).sort()).toEqual(
        level.map((node) => node.id).sort(),
      );
      const correct = adjacent.filter((node) => node.correct);
      expect(correct).toHaveLength(1);
      currentNodeId = correct[0]!.id;
    }
  });

  it("keeps duplicate words distinct with stable token and node IDs", () => {
    const graph = createIsometricStepGraph(
      [
        { id: "0:0", text: "very" },
        { id: "0:1", text: "very" },
        { id: "0:2", text: "bright" },
      ],
      9,
    );

    expect(graph.levels[0]!.find((node) => node.correct)?.tokenId).toBe("0:0");
    expect(graph.levels[1]!.find((node) => node.correct)?.tokenId).toBe("0:1");
    expect(new Set(graph.levels.flat().map((node) => node.id)).size).toBe(9);
    for (const level of graph.levels) {
      const expectedText = level.find((node) => node.correct)!.text
        .normalize("NFKC")
        .toLocaleLowerCase();
      expect(
        level.filter((node) => !node.correct).every(
          (node) => node.text.normalize("NFKC").toLocaleLowerCase() !== expectedText,
        ),
      ).toBe(true);
    }
  });

  it("uses visible decoys when every supplied word is the same", () => {
    const graph = createIsometricStepGraph(
      [
        { id: "0:0", text: "Echo" },
        { id: "0:1", text: "echo" },
      ],
      3,
    );

    for (const level of graph.levels) {
      expect(new Set(level.filter((node) => !node.correct).map((node) => node.text))).toEqual(
        new Set(["◇", "◆"]),
      );
    }
  });

  it("rejects empty token fields and distinguishes adjacent from future nodes", () => {
    expect(() => createIsometricStepGraph([], 1)).toThrow(/at least one token/i);

    const graph = createIsometricStepGraph(tokens, 1);
    const first = graph.levels[0]![0]!;
    const future = graph.levels[1]![0]!;

    expect(isAdjacentStep(graph, graph.originNodeId, first.id)).toBe(true);
    expect(isAdjacentStep(graph, graph.originNodeId, future.id)).toBe(false);
    expect(isAdjacentStep(graph, graph.originNodeId, "missing")).toBe(false);
  });
});
