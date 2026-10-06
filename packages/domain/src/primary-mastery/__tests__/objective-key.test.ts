import { describe, expect, it } from "vitest";
import { GRAPH_RELEASE, OBJECTIVE_KEY } from "../objective-key.data.js";
import { objectiveKeyEntrySchema } from "../contracts.js";
import { objectiveKeyById, resolveObjective } from "../objective-key.js";

describe("objective key (FR-1)", () => {
  it("holds the 138 Workbooks objectives, each a valid entry with a young-learner GSE node", () => {
    expect(OBJECTIVE_KEY).toHaveLength(138);
    for (const entry of OBJECTIVE_KEY) {
      expect(() => objectiveKeyEntrySchema.parse(entry)).not.toThrow();
      expect(entry.nodeId).toMatch(/^english\.gse\.skill\.young\.(reading|listening)\.\d+\./);
    }
  });

  it("has one entry per short id and a short id that encodes the skill and the GSE score", () => {
    const ids = OBJECTIVE_KEY.map((entry) => entry.shortId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of OBJECTIVE_KEY) {
      expect(entry.shortId).toMatch(/^[RL]\d+\.\d+$/);
      expect(entry.shortId.startsWith(entry.skill === "Reading" ? "R" : "L")).toBe(true);
      expect(entry.shortId).toMatch(new RegExp(`^[RL]${entry.gse}\\.`));
    }
  });

  it("resolves a short id to its node and throws on an unknown id", () => {
    expect(resolveObjective("R10.2")).toMatchObject({
      shortId: "R10.2",
      nodeId: "english.gse.skill.young.reading.10.can-recognise-the-use-of-a-question-mark",
      gse: 10,
      skill: "Reading",
    });
    expect(() => resolveObjective("R99.9")).toThrow(/R99\.9/);
    expect(objectiveKeyById().size).toBe(138);
  });

  it("names the graph releases the tags were authored against", () => {
    expect(GRAPH_RELEASE.gse.file).toContain("gse-knowledge-space.json");
    expect(GRAPH_RELEASE.vocabulary.schemaVersion).toBe("english-vocabulary.v1");
    expect(GRAPH_RELEASE.gse.commit).toMatch(/^[0-9a-f]{7,}$/);
  });
});
