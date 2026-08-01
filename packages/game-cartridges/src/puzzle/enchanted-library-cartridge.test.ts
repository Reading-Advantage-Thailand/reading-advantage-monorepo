import { describe, expect, it, vi } from "vitest";

import { buildEnchantedLibraryPuzzleCartridge } from "./enchanted-library-cartridge.js";

describe("Enchanted Library puzzle cartridge", () => {
  it("consumes the accepted six-frame 12fps walk descriptor, preserves two correct collections per vocabulary item, and reports the source-bound result once", () => {
    const complete = vi.fn();
    const cartridge = buildEnchantedLibraryPuzzleCartridge();
    const session = cartridge.createSession([{ term: "moon", translation: "luna" }], complete);

    expect(session.dispatchPhysicalInput({ modality: "keyboard", code: "KeyD" })).toEqual(["move-right"]);
    expect(session.dispatchPhysicalInput({ modality: "pointer", phase: "drag", x: 0, y: 0, deltaX: 24 })).toEqual(["move-right"]);
    expect(session.walkPlayback()).toMatchObject({
      descriptorId: "enchanted-library-player-walk-v1",
      clipId: "walk",
      direction: "down",
      fps: 12,
      loop: true,
      frames: [
        { column: 0, row: 0 },
        { column: 1, row: 0 },
        { column: 2, row: 0 },
        { column: 3, row: 0 },
        { column: 4, row: 0 },
        { column: 5, row: 0 },
      ],
      claimIds: ["EL-COLL-001", "EL-VICTORY-001", "EL-XP-001"],
    });
    expect(session.advanceWalk(250)).toEqual({ column: 3, row: 0 });
    expect(session.collect("sun")).toMatchObject({ progress: 0, status: "playing" });
    expect(session.collect("moon")).toMatchObject({ progress: 1, status: "playing" });
    expect(session.collect("moon")).toMatchObject({ progress: 2, status: "victory" });
    expect(session.results()).toEqual({ accuracy: 2 / 3, xp: 4, score: 20, correctAnswers: 2, totalAttempts: 3 });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(cartridge.manifest.semanticAssetRequirements).toEqual([
      "side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747",
    ]);
    expect(cartridge.scope.playable).toBe(false);
  });

  it("keeps puzzle state through compact and wide QC composition", () => {
    const session = buildEnchantedLibraryPuzzleCartridge().createSession([{ term: "moon", translation: "luna" }]);
    session.collect("moon");
    const before = session.snapshot();

    expect(session.resolveQcComposition({ width: 390, height: 844 }).profile).toBe("compact");
    expect(session.resolveQcComposition({ width: 1440, height: 900 }).profile).toBe("wide");
    expect(session.snapshot()).toEqual(before);
  });
});
