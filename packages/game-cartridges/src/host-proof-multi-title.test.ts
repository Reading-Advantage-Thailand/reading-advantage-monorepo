import { describe, expect, it } from "vitest";

import {
  HostProofSourceBlockedError,
  isHostProofSourceBlocked,
  loadDragonFlightHostProofCartridge,
  loadExistingCoreHostProofCartridge,
  loadMagicDefenseHostProofCartridge,
  MAGIC_DEFENSE_HOST_PROOF_ID,
  MAGIC_DEFENSE_REQUIRED_ASSET_BINDINGS,
  SOURCE_BLOCKED_HOST_PROOF_IDS,
} from "./host-proof.js";

describe("multi-title Existing Core host-proof loaders", () => {
  it("loads Magic Defense with its selected-union bindings", async () => {
    const cartridge = await loadMagicDefenseHostProofCartridge();
    expect(cartridge.manifest.id).toBe(MAGIC_DEFENSE_HOST_PROOF_ID);
    expect(cartridge.manifest.inputMode).toBe("vocabulary");
    expect([...cartridge.manifest.requiredAssetBindings]).toEqual([
      ...MAGIC_DEFENSE_REQUIRED_ASSET_BINDINGS,
    ]);
  });

  it("dispatches Existing Core loaders without exposing the root catalog", async () => {
    const dragonFlight = await loadExistingCoreHostProofCartridge("dragon-flight");
    const magicDefense = await loadExistingCoreHostProofCartridge("magic-defense");
    expect(dragonFlight.manifest.id).toBe((await loadDragonFlightHostProofCartridge()).manifest.id);
    expect(magicDefense.manifest.id).toBe(MAGIC_DEFENSE_HOST_PROOF_ID);
  });

  it("source-blocks historical titles and rejects unknown ids", async () => {
    for (const id of SOURCE_BLOCKED_HOST_PROOF_IDS) {
      expect(isHostProofSourceBlocked(id)).toBe(true);
      await expect(loadExistingCoreHostProofCartridge(id)).rejects.toBeInstanceOf(
        HostProofSourceBlockedError,
      );
    }
    await expect(loadExistingCoreHostProofCartridge("not-a-title")).rejects.toThrow(
      /Unknown host-proof cartridge/,
    );
  });
});
