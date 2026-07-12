import { describe, expect, it } from "vitest";
import corpus from "../game-corpus.json";
import usages from "../game-asset-usage-matrix.json";

describe("APK scene asset usage matrix", () => {
  it("covers every canonical scene", () => {
    const covered = new Set(usages.flatMap((item) => item.consumerSceneIds));
    for (const scene of corpus.scenes)
      expect(covered.has(scene.id), scene.id).toBe(true);
  });
  it("defines physical and responsive behavior for every usage", () => {
    for (const usage of usages) {
      expect(usage.states.length, usage.id).toBeGreaterThan(0);
      expect(usage.view.length, usage.id).toBeGreaterThan(0);
      expect(usage.scale.length, usage.id).toBeGreaterThan(0);
      expect(usage.collision.length, usage.id).toBeGreaterThan(0);
      expect(usage.profileUsage.sort(), usage.id).toEqual(["compact", "wide"]);
      expect(usage.evidenceIds.length, usage.id).toBeGreaterThan(0);
    }
  });
});
