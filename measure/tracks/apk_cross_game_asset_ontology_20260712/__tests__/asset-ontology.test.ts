import { describe, expect, it } from "vitest";
import usages from "../game-asset-usage-matrix.json";
import ontology from "../asset-ontology.json";

describe("APK semantic asset ontology", () => {
  it("resolves every scene usage exactly once", () => {
    const resolved = new Map(
      ontology.flatMap((entry) => entry.usageIds.map((id) => [id, entry.id])),
    );
    expect(resolved.size).toBe(usages.length);
    for (const usage of usages)
      expect(resolved.has(usage.id), usage.id).toBe(true);
  });
  it("rejects unsupported ontology entries", () => {
    for (const entry of ontology) {
      expect(entry.usageIds.length, entry.id).toBeGreaterThan(0);
      expect(entry.consumerSceneIds.length, entry.id).toBeGreaterThan(0);
      expect(entry.allowedSubstitutions.length, entry.id).toBeGreaterThan(0);
      expect(entry.prohibitedConflations.length, entry.id).toBeGreaterThan(0);
    }
  });
  it("separates gameplay meaning from theme treatment", () => {
    for (const entry of ontology) {
      expect(entry.themes).toEqual(["chibi-quest", "riven-lands"]);
      expect(entry.id).not.toMatch(/chibi|riven/);
    }
  });
});
