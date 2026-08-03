import { describe, expect, it } from "vitest";

import {
  loadCastleDefenseHostProofCartridge,
  loadLegacyDefenseHostProofCartridge,
  LEGACY_DEFENSE_HOST_PROOF_IDS,
} from "./legacy-defense-host-proof.js";

describe("legacy defense host-proof loaders", () => {
  it.each([...LEGACY_DEFENSE_HOST_PROOF_IDS])("loads %s", async (id) => {
    const cartridge = await loadLegacyDefenseHostProofCartridge(id);
    expect(cartridge.manifest.id).toBe(id);
    expect(cartridge.manifest.requiredAssetBindings.length).toBeGreaterThan(0);
  });

  it("exports castle defense and blocks storm", async () => {
    expect((await loadCastleDefenseHostProofCartridge()).manifest.id).toBe("castle-defense");
    await expect(loadLegacyDefenseHostProofCartridge("storm-castle-tower")).rejects.toThrow(/historical-blocked/);
  });
});
