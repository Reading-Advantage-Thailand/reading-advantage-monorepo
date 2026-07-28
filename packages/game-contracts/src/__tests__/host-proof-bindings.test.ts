import { describe, expect, it } from "vitest";

import {
  EXISTING_CORE_HOST_PROOF_BINDINGS,
  EXISTING_CORE_HOST_PROOF_RECEIPTS,
  existingCoreHostProofBindingSchema,
  existingCoreHostProofCartridgeIdSchema,
  getExistingCoreHostProofBinding,
  isExistingCoreHostProofCartridge,
} from "../host-proof-bindings.js";

/**
 * Accepted Task-4 QC receipt (`accepted-task4-qc-receipt-v1.json`,
 * SHA-256 b6ffefce…5dd9) title proofs. This fixture is the law for the
 * Task-5 Reading/Primary host proof: any drift between the shared contract
 * and the accepted receipt must fail closed here.
 */
const ACCEPTED_TASK4_TITLE_PROOFS = [
  {
    id: "dragon-flight",
    title: "Dragon Flight",
    inputMode: "vocabulary",
    temporalScope: "current-source",
    selectedStandardPackOutput: [
      "audio/native/combat/hit-01",
      "effects/32x32/combat/hit-01",
      "top-down/32x32/characters/hero-01",
    ],
  },
  {
    id: "magic-defense",
    title: "Magic Defense",
    inputMode: "vocabulary",
    temporalScope: "current-source",
    selectedStandardPackOutput: [
      "audio/native/combat/hit-01",
      "effects/32x32/combat/hit-01",
      "ui/20x20/inventory/slot",
      "ui/32x32/items/armor-icons",
    ],
  },
  {
    id: "dungeon-liberator",
    title: "Dungeon Liberator",
    inputMode: "sentence",
    temporalScope: "current-source",
    selectedStandardPackOutput: [
      "effects/32x32/combat/hit-01",
      "side-view/32x32/characters/enemy-001-idle",
      "top-down/32x32/characters/hero-01",
      "ui/16x16/controls/gamepad-buttons",
    ],
  },
  {
    id: "sorcerer-ziggurat",
    title: "The Sorcerer's Ziggurat",
    inputMode: "sentence",
    temporalScope: "historical-source-only",
    selectedStandardPackOutput: [
      "effects/32x32/combat/hit-01",
      "top-down/32x32/characters/hero-01",
      "ui/16x16/controls/gamepad-buttons",
    ],
  },
  {
    id: "astral-mage",
    title: "Astral Mage",
    inputMode: "sentence",
    temporalScope: "historical-source-only",
    selectedStandardPackOutput: [
      "audio/native/combat/hit-01",
      "effects/32x32/combat/hit-01",
      "top-down/32x32/characters/hero-01",
    ],
  },
] as const;

describe("existing-core host-proof binding contract (Task 5)", () => {
  it("pins the accepted Task-3 semantic and Task-4 QC receipt digests", () => {
    expect(EXISTING_CORE_HOST_PROOF_RECEIPTS).toEqual({
      acceptedSemanticAdoptionReceiptSha256:
        "e82d42d9ec046b85eb4aeac7800623bce3c3bf4a39a9c0f44288bd93d07be240",
      acceptedTask4QcReceiptSha256:
        "b6ffefcebf8a75d9967f196693fe7cf14a133d66123537d201b52e9af4745dd9",
    });
    expect(Object.isFrozen(EXISTING_CORE_HOST_PROOF_RECEIPTS)).toBe(true);
  });

  it("contains exactly the five accepted Task-4 cartridges in receipt order", () => {
    expect(EXISTING_CORE_HOST_PROOF_BINDINGS.map((binding) => binding.id)).toEqual([
      "dragon-flight",
      "magic-defense",
      "dungeon-liberator",
      "sorcerer-ziggurat",
      "astral-mage",
    ]);
    expect(EXISTING_CORE_HOST_PROOF_BINDINGS).toHaveLength(5);
    expect(Object.isFrozen(EXISTING_CORE_HOST_PROOF_BINDINGS)).toBe(true);
  });

  it("deep-freezes every binding and its selected standard pack output", () => {
    expect(Object.isFrozen(EXISTING_CORE_HOST_PROOF_BINDINGS)).toBe(true);
    for (const binding of EXISTING_CORE_HOST_PROOF_BINDINGS) {
      expect(Object.isFrozen(binding)).toBe(true);
      expect(Object.isFrozen(binding.selectedStandardPackOutput)).toBe(true);
      for (const nested of Object.values(binding)) {
        if (nested !== null && typeof nested === "object") {
          expect(Object.isFrozen(nested)).toBe(true);
        }
      }
    }
  });

  it("rejects mutation of shared selected standard pack output arrays", () => {
    for (const binding of EXISTING_CORE_HOST_PROOF_BINDINGS) {
      const original = [...binding.selectedStandardPackOutput];
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (binding.selectedStandardPackOutput as any).push("malicious/injection");
      }).toThrow();
      expect([...binding.selectedStandardPackOutput]).toEqual(original);
    }
  });

  it.each(ACCEPTED_TASK4_TITLE_PROOFS)(
    "binds %s exactly as accepted (title, input mode, temporal scope, selected union)",
    (accepted) => {
      const binding = getExistingCoreHostProofBinding(accepted.id);
      expect(binding).toBeDefined();
      expect(binding?.title).toBe(accepted.title);
      expect(binding?.inputMode).toBe(accepted.inputMode);
      expect(binding?.temporalScope).toBe(accepted.temporalScope);
      expect([...(binding?.selectedStandardPackOutput ?? [])]).toEqual([
        ...accepted.selectedStandardPackOutput,
      ]);
      expect(binding?.registration).toBe("reading-primary-host-proof-only");
      expect(binding?.receiptSha256).toBe(
        EXISTING_CORE_HOST_PROOF_RECEIPTS.acceptedSemanticAdoptionReceiptSha256,
      );
    },
  );

  it("validates every binding against the strict schema", () => {
    for (const binding of EXISTING_CORE_HOST_PROOF_BINDINGS) {
      expect(() => existingCoreHostProofBindingSchema.parse(binding)).not.toThrow();
    }
  });

  it("rejects bindings with unknown keys (strict contract)", () => {
    const [binding] = EXISTING_CORE_HOST_PROOF_BINDINGS;
    expect(() =>
      existingCoreHostProofBindingSchema.parse({ ...binding, xp: 100 }),
    ).toThrow();
  });

  it("restricts the cartridge-id schema to exactly the five accepted ids", () => {
    for (const binding of EXISTING_CORE_HOST_PROOF_BINDINGS) {
      expect(existingCoreHostProofCartridgeIdSchema.parse(binding.id)).toBe(binding.id);
    }
    expect(() => existingCoreHostProofCartridgeIdSchema.parse("haunted-library")).toThrow();
    expect(() => existingCoreHostProofCartridgeIdSchema.parse("rune-match")).toThrow();
    expect(() => existingCoreHostProofCartridgeIdSchema.parse("unknown-title")).toThrow();
  });

  it("fails closed for unknown, legacy, or catalog-only cartridges", () => {
    expect(getExistingCoreHostProofBinding("haunted-library")).toBeUndefined();
    expect(getExistingCoreHostProofBinding("castle-defense")).toBeUndefined();
    expect(getExistingCoreHostProofBinding("")).toBeUndefined();
    expect(isExistingCoreHostProofCartridge("dragon-flight")).toBe(true);
    expect(isExistingCoreHostProofCartridge("haunted-library")).toBe(false);
  });
});
