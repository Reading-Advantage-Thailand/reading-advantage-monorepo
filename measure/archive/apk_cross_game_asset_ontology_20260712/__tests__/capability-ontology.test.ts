import { describe, expect, it } from "vitest";

import corpus from "../game-corpus.json";
import matrix from "../capability-usage-matrix.json";

describe("APK capability ontology", () => {
  it("maps every canonical scene to capabilities", () => {
    const mapped = new Set(
      matrix.flatMap((capability) => capability.consumerSceneIds),
    );
    for (const scene of corpus.scenes)
      expect(mapped.has(scene.id), scene.id).toBe(true);
  });

  it("requires corpus support and acceptance evidence for shared capabilities", () => {
    for (const capability of matrix.filter(
      (item) => item.disposition === "standardize",
    )) {
      expect(
        capability.consumerSceneIds.length,
        capability.id,
      ).toBeGreaterThanOrEqual(2);
      expect(capability.minimumEvidence.length, capability.id).toBeGreaterThan(
        0,
      );
      expect(capability.owner, capability.id).toMatch(/^@reading-advantage\//);
    }
  });

  it("preserves explicit extension boundaries and dispositions", () => {
    for (const capability of matrix) {
      expect([
        "retain",
        "standardize",
        "extend-existing",
        "bespoke",
        "retire",
      ]).toContain(capability.disposition);
      expect(
        capability.extensionBoundary.length,
        capability.id,
      ).toBeGreaterThan(20);
      expect(capability.evidenceIds.length, capability.id).toBeGreaterThan(0);
    }
  });
});
