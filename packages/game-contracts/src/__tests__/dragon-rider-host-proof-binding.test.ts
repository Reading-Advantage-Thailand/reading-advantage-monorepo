import { describe, expect, it } from "vitest";

import {
  DRAGON_RIDER_HOST_PROOF_BINDING,
  dragonRiderHostProofBindingSchema,
} from "../dragon-rider-host-proof-binding.js";

describe("Dragon Rider host-proof binding", () => {
  it("pins only the owner-admitted title, vocabulary mode, semantic union, claims, and receipt", () => {
    expect(DRAGON_RIDER_HOST_PROOF_BINDING).toEqual({
      id: "dragon-rider",
      title: "Dragon Rider",
      inputMode: "vocabulary",
      selectedSemanticKeys: [
        "audio/native/combat/hit-01",
        "effects/32x32/combat/hit-01",
        "top-down/32x32/characters/hero-01",
        "ui/16x16/controls/gamepad-buttons",
      ],
      claimEvidence: {
        artifactSha256: "826323bd9c9ee754c1c5b029e7c4a1cb1907bb0041296a98f2166033be3ca236",
        claimIds: [
          "DR-SCENE-002A",
          "DR-SCENE-002B",
          "DR-MECH-001",
          "DR-MECH-002",
          "DR-TRANS-001",
          "DR-TRANS-002",
          "DR-TRANS-003",
          "DR-TRANS-004",
          "DR-CONTROL-001",
        ],
        currentResultEvidenceId: "dragon-rider-host-proof-current-result-source-v1",
        currentResultRangeSha256: "9cc91cc3b7d4606bee91e2ec61c91523895fa7a3eeccef610430563dc5a68fb6",
      },
      admissionReceipt: {
        recordId: "apk_legacy_traversal_cutover_20260727_dragon_rider_host_proof_result_admission_correction_20260802",
        sha256: "090ae00dbab193712c1f4c638a59037246d6cc7a66fced4bf422b3a2214268b5",
      },
    });
    expect(dragonRiderHostProofBindingSchema.parse(DRAGON_RIDER_HOST_PROOF_BINDING))
      .toEqual(DRAGON_RIDER_HOST_PROOF_BINDING);
  });

  it("rejects a widened title, legacy path, duplicate, omission, or reordered admission evidence", () => {
    expect(() => dragonRiderHostProofBindingSchema.parse({
      ...DRAGON_RIDER_HOST_PROOF_BINDING,
      id: "dragon-flight",
    })).toThrow();
    expect(() => dragonRiderHostProofBindingSchema.parse({
      ...DRAGON_RIDER_HOST_PROOF_BINDING,
      selectedSemanticKeys: ["/games/vocabulary/dragon-rider/player-3x3-sheet-facing-down.png"],
    })).toThrow();
    expect(() => dragonRiderHostProofBindingSchema.parse({
      ...DRAGON_RIDER_HOST_PROOF_BINDING,
      claimEvidence: { ...DRAGON_RIDER_HOST_PROOF_BINDING.claimEvidence, claimIds: ["DR-MECH-001"] },
    })).toThrow();
    expect(() => dragonRiderHostProofBindingSchema.parse({
      ...DRAGON_RIDER_HOST_PROOF_BINDING,
      selectedSemanticKeys: [
        "audio/native/combat/hit-01",
        "audio/native/combat/hit-01",
        "top-down/32x32/characters/hero-01",
        "ui/16x16/controls/gamepad-buttons",
      ],
    })).toThrow();
    expect(() => dragonRiderHostProofBindingSchema.parse({
      ...DRAGON_RIDER_HOST_PROOF_BINDING,
      claimEvidence: {
        ...DRAGON_RIDER_HOST_PROOF_BINDING.claimEvidence,
        claimIds: [
          "DR-SCENE-002B",
          "DR-SCENE-002A",
          "DR-MECH-001",
          "DR-MECH-002",
          "DR-TRANS-001",
          "DR-TRANS-002",
          "DR-TRANS-003",
          "DR-TRANS-004",
          "DR-CONTROL-001",
        ],
      },
    })).toThrow();
  });
});
