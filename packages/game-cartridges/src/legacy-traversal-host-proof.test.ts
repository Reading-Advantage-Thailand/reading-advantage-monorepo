import { describe, expect, it } from "vitest";
import {
  LEGACY_TRAVERSAL_HOST_PROOF_IDS,
  loadLegacyTraversalHostProofCartridge,
} from "./legacy-traversal-host-proof.js";

describe("legacy traversal residual host-proof loaders", () => {
  it.each([...LEGACY_TRAVERSAL_HOST_PROOF_IDS])("loads %s", async (id) => {
    const cartridge = await loadLegacyTraversalHostProofCartridge(id);
    expect(cartridge.manifest.id).toBe(id);
    expect(cartridge.manifest.requiredAssetBindings.length).toBeGreaterThan(0);
  });
});
