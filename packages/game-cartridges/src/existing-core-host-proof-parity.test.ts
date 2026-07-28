import { describe, expect, it } from "vitest";
import {
  EXISTING_CORE_HOST_PROOF_BINDINGS,
  EXISTING_CORE_HOST_PROOF_RECEIPTS,
} from "@reading-advantage/game-contracts";

import {
  EXISTING_CORE_QC_LOADERS,
  EXISTING_CORE_QC_REGISTRY,
  getExistingCoreQcRegistryEntry,
} from "./existing-core-cutover-qc.js";
import { cartridgeCatalog, cartridgeLoaders } from "./catalog.js";

/**
 * Task 5 binding-parity guard: the quarantined Advantage Games QC registry
 * (accepted Task-4 bytes) and the shared Reading/Primary host-proof contract
 * must describe exactly the same five cartridges and bindings. Any drift
 * fails closed here before a host can load a divergent binding.
 */
describe("existing-core host-proof binding parity (Task 5)", () => {
  it("QC registry contains exactly the five shared-contract ids in order", () => {
    expect(EXISTING_CORE_QC_REGISTRY.map((entry) => entry.id)).toEqual(
      EXISTING_CORE_HOST_PROOF_BINDINGS.map((binding) => binding.id),
    );
  });

  it.each(EXISTING_CORE_HOST_PROOF_BINDINGS)(
    "QC entry %s matches the shared binding title, input mode, and temporal scope",
    (binding) => {
      const entry = getExistingCoreQcRegistryEntry(binding.id);
      expect(entry).toBeDefined();
      expect(entry?.title).toBe(binding.title);
      expect(entry?.inputMode).toBe(binding.inputMode);
      expect(entry?.temporalScope).toBe(binding.temporalScope);
      expect(entry?.registration).toBe("advantage-games-qc-only");
      expect(binding.registration).toBe("reading-primary-host-proof-only");
    },
  );

  it.each(EXISTING_CORE_HOST_PROOF_BINDINGS)(
    "QC cartridge %s pins the accepted receipt and the exact selected union",
    async (binding) => {
      const cartridge = await EXISTING_CORE_QC_LOADERS[binding.id]();
      expect(cartridge.semanticAdoption.receiptSha256).toBe(
        EXISTING_CORE_HOST_PROOF_RECEIPTS.acceptedSemanticAdoptionReceiptSha256,
      );
      expect(cartridge.semanticAdoption.temporalScope).toBe(binding.temporalScope);
      expect([...cartridge.semanticAdoption.selectedStandardPackOutput]).toEqual(
        [...binding.selectedStandardPackOutput],
      );
      expect([...cartridge.manifest.semanticAssetRequirements]).toEqual(
        [...binding.selectedStandardPackOutput],
      );
      expect(cartridge.manifest.id).toBe(binding.id);
      expect(cartridge.manifest.title).toBe(binding.title);
      expect(cartridge.manifest.inputMode).toBe(binding.inputMode);
      // The Task-4 QC adapter remains non-consumable; Task 5 consumes the
      // same binding through the host-proof contract, not the QC taskScope.
      expect(cartridge.taskScope.consumable).toBe(false);
      expect(cartridge.taskScope.productionCatalogExposed).toBe(false);
    },
  );

  it("shared host-proof bindings are deeply frozen at parity boundary", () => {
    for (const binding of EXISTING_CORE_HOST_PROOF_BINDINGS) {
      expect(Object.isFrozen(binding)).toBe(true);
      expect(Object.isFrozen(binding.selectedStandardPackOutput)).toBe(true);
    }
  });

  it("production catalog and loaders stay quarantined", () => {
    expect(cartridgeCatalog).toEqual([]);
    expect(Object.keys(cartridgeLoaders)).toEqual([]);
  });
});
