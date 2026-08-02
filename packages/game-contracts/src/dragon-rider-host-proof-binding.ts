import { z } from "zod";

/** Exact selected semantic keys admitted for the bounded Dragon Rider proof. */
export const dragonRiderHostProofSemanticKeySchema = z.enum([
  "audio/native/combat/hit-01",
  "effects/32x32/combat/hit-01",
  "top-down/32x32/characters/hero-01",
  "ui/16x16/controls/gamepad-buttons",
]);

/** Exact ordered selected union admitted for the bounded Dragon Rider proof. */
export const dragonRiderHostProofSelectedSemanticKeysSchema = z.tuple([
  z.literal("audio/native/combat/hit-01"),
  z.literal("effects/32x32/combat/hit-01"),
  z.literal("top-down/32x32/characters/hero-01"),
  z.literal("ui/16x16/controls/gamepad-buttons"),
]);

/** Exact owner-admitted Dragon Rider replay claim identifiers. */
export const dragonRiderHostProofClaimIdSchema = z.enum([
  "DR-SCENE-002A",
  "DR-SCENE-002B",
  "DR-MECH-001",
  "DR-MECH-002",
  "DR-TRANS-001",
  "DR-TRANS-002",
  "DR-TRANS-003",
  "DR-TRANS-004",
  "DR-CONTROL-001",
]);

/** Exact ordered source-claim set admitted for Dragon Rider server replay. */
export const dragonRiderHostProofClaimIdsSchema = z.tuple([
  z.literal("DR-SCENE-002A"),
  z.literal("DR-SCENE-002B"),
  z.literal("DR-MECH-001"),
  z.literal("DR-MECH-002"),
  z.literal("DR-TRANS-001"),
  z.literal("DR-TRANS-002"),
  z.literal("DR-TRANS-003"),
  z.literal("DR-TRANS-004"),
  z.literal("DR-CONTROL-001"),
]);

/** Validates the owner-admitted Dragon Rider host-proof binding. */
export const dragonRiderHostProofBindingSchema = z.object({
  id: z.literal("dragon-rider"),
  title: z.literal("Dragon Rider"),
  inputMode: z.literal("vocabulary"),
  selectedSemanticKeys: dragonRiderHostProofSelectedSemanticKeysSchema,
  claimEvidence: z.object({
    artifactSha256: z.literal("826323bd9c9ee754c1c5b029e7c4a1cb1907bb0041296a98f2166033be3ca236"),
    claimIds: dragonRiderHostProofClaimIdsSchema,
    currentResultEvidenceId: z.literal("dragon-rider-host-proof-current-result-source-v1"),
    currentResultRangeSha256: z.literal("9cc91cc3b7d4606bee91e2ec61c91523895fa7a3eeccef610430563dc5a68fb6"),
  }),
  admissionReceipt: z.object({
    recordId: z.literal("apk_legacy_traversal_cutover_20260727_dragon_rider_host_proof_result_admission_correction_20260802"),
    sha256: z.literal("090ae00dbab193712c1f4c638a59037246d6cc7a66fced4bf422b3a2214268b5"),
  }),
}).strict();

/** The immutable owner-admitted contract for the Dragon Rider hidden host proof. */
export type DragonRiderHostProofBinding = z.infer<typeof dragonRiderHostProofBindingSchema>;

/** Pins the only title, selected union, claims, and admission receipt allowed by Task 6A. */
export const DRAGON_RIDER_HOST_PROOF_BINDING: DragonRiderHostProofBinding = Object.freeze({
  id: "dragon-rider",
  title: "Dragon Rider",
  inputMode: "vocabulary",
  selectedSemanticKeys: Object.freeze([
    "audio/native/combat/hit-01",
    "effects/32x32/combat/hit-01",
    "top-down/32x32/characters/hero-01",
    "ui/16x16/controls/gamepad-buttons",
  ]),
  claimEvidence: Object.freeze({
    artifactSha256: "826323bd9c9ee754c1c5b029e7c4a1cb1907bb0041296a98f2166033be3ca236",
    claimIds: Object.freeze([
      "DR-SCENE-002A",
      "DR-SCENE-002B",
      "DR-MECH-001",
      "DR-MECH-002",
      "DR-TRANS-001",
      "DR-TRANS-002",
      "DR-TRANS-003",
      "DR-TRANS-004",
      "DR-CONTROL-001",
    ]),
    currentResultEvidenceId: "dragon-rider-host-proof-current-result-source-v1",
    currentResultRangeSha256: "9cc91cc3b7d4606bee91e2ec61c91523895fa7a3eeccef610430563dc5a68fb6",
  }),
  admissionReceipt: Object.freeze({
    recordId: "apk_legacy_traversal_cutover_20260727_dragon_rider_host_proof_result_admission_correction_20260802",
    sha256: "090ae00dbab193712c1f4c638a59037246d6cc7a66fced4bf422b3a2214268b5",
  }),
});
