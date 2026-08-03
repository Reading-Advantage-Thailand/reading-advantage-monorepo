import { describe, expect, it } from "vitest";
import { LEGACY_PUZZLE_HOST_PROOF_IDS, loadLegacyPuzzleHostProofCartridge } from "./legacy-puzzle-host-proof.js";

describe("legacy puzzle host-proof loaders", () => {
  it.each([...LEGACY_PUZZLE_HOST_PROOF_IDS])("loads %s", async (id) => {
    const cartridge = await loadLegacyPuzzleHostProofCartridge(id);
    expect(cartridge.manifest.id).toBe(id);
  });
});
