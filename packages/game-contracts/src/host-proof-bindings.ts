import { z } from "zod";

/**
 * Shared Reading/Primary host-proof binding contract for the existing-core
 * cutover cohort (track `apk_existing_core_cutover_20260727`, Task 5).
 *
 * This module is the single source of truth for the exact five cartridges
 * and bindings accepted by the Task-4 Advantage Games QC receipt. The
 * Reading and Primary host-proof surfaces, the server-authoritative domain
 * adapter, and the QC-registry parity guard all consume this contract so
 * the five-title authorization cannot drift between hosts.
 *
 * Boundary: this contract authorizes only the bounded hidden host-proof
 * surfaces. It does not consummate the Task-3 semantic candidates, does not
 * expose the production cartridge catalog or loaders, and authorizes no
 * retirement, cutover, or broader-cohort claim.
 */

/**
 * Recursively freezes a value so nested arrays and plain objects cannot be
 * mutated at runtime.
 * @param value The value to freeze.
 * @returns The same value, deeply frozen.
 */
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const element of value) {
      deepFreeze(element);
    }
  } else {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

/** Accepted receipt digests that authorize the Task-5 host proof. */
export const EXISTING_CORE_HOST_PROOF_RECEIPTS = Object.freeze({
  /**
   * SHA-256 of `accepted-semantic-adoption-receipt-v1.json` — the Task-3
   * acceptance that fixed the five-title semantic mappings.
   */
  acceptedSemanticAdoptionReceiptSha256:
    "e82d42d9ec046b85eb4aeac7800623bce3c3bf4a39a9c0f44288bd93d07be240",
  /**
   * SHA-256 of `accepted-task4-qc-receipt-v1.json` — the Task-4 acceptance
   * that authorized beginning the Reading/Primary host proof with the same
   * five-title binding.
   */
  acceptedTask4QcReceiptSha256:
    "b6ffefcebf8a75d9967f196693fe7cf14a133d66123537d201b52e9af4745dd9",
});

/** Minimum viewport width at which the shared host-proof surface uses wide layout. */
export const HOST_PROOF_RESPONSIVE_WIDE_MIN_WIDTH = 800 as const;

/** Responsive profiles supported by the bounded host-proof surface. */
export const hostProofViewportProfileSchema = z.enum(["compact", "wide"]);

/** Inferred host-proof responsive profile type. */
export type HostProofViewportProfile = z.infer<typeof hostProofViewportProfileSchema>;

/**
 * Resolves the shared host-proof fallback profile at the canonical 800px boundary.
 * @param width Browser viewport width in CSS pixels.
 * @param resolvedProfile Optional profile already resolved by a live cartridge session.
 * @returns The live session profile when available, otherwise the width-based profile.
 * @throws When width or resolvedProfile is not a valid host-proof profile input.
 */
export function resolveHostProofViewportProfile(
  width: number,
  resolvedProfile?: HostProofViewportProfile,
): HostProofViewportProfile {
  const parsedWidth = z.number().int().positive().parse(width);
  if (resolvedProfile !== undefined) {
    return hostProofViewportProfileSchema.parse(resolvedProfile);
  }
  return parsedWidth >= HOST_PROOF_RESPONSIVE_WIDE_MIN_WIDTH ? "wide" : "compact";
}

/** Strict schema for one accepted host-proof binding. */
export const existingCoreHostProofBindingSchema = z
  .object({
    id: z.enum([
      "dragon-flight",
      "magic-defense",
      "dungeon-liberator",
      "sorcerer-ziggurat",
      "astral-mage",
    ]),
    title: z.string().min(1),
    inputMode: z.enum(["vocabulary", "sentence"]),
    temporalScope: z.enum(["current-source", "historical-source-only"]),
    selectedStandardPackOutput: z.array(z.string().min(1)).min(1),
    registration: z.literal("reading-primary-host-proof-only"),
    receiptSha256: z.literal(
      EXISTING_CORE_HOST_PROOF_RECEIPTS.acceptedSemanticAdoptionReceiptSha256,
    ),
  })
  .strict();

/** One accepted Task-4 cartridge binding for the Reading/Primary host proof. */
export type ExistingCoreHostProofBinding = z.infer<
  typeof existingCoreHostProofBindingSchema
>;

/** Cartridge identifiers accepted for the Reading/Primary host proof. */
export type ExistingCoreHostProofCartridgeId =
  ExistingCoreHostProofBinding["id"];

/**
 * The exact five accepted Task-4 bindings, in accepted receipt order.
 * Mirrors `title_proofs` in `task4-advantage-games-qc-evidence-v1.json`
 * (SHA-256 `7a9dae4d…a058`) as accepted by `accepted-task4-qc-receipt-v1.json`.
 *
 * Every entry is deeply frozen at runtime, including each
 * `selectedStandardPackOutput` array; the exported type follows the
 * Zod-inferred mutable shape so parse results and literals stay assignable.
 */
const HOST_PROOF_BINDING_ENTRIES: ExistingCoreHostProofBinding[] = [
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
    registration: "reading-primary-host-proof-only",
    receiptSha256:
      EXISTING_CORE_HOST_PROOF_RECEIPTS.acceptedSemanticAdoptionReceiptSha256,
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
    registration: "reading-primary-host-proof-only",
    receiptSha256:
      EXISTING_CORE_HOST_PROOF_RECEIPTS.acceptedSemanticAdoptionReceiptSha256,
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
    registration: "reading-primary-host-proof-only",
    receiptSha256:
      EXISTING_CORE_HOST_PROOF_RECEIPTS.acceptedSemanticAdoptionReceiptSha256,
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
    registration: "reading-primary-host-proof-only",
    receiptSha256:
      EXISTING_CORE_HOST_PROOF_RECEIPTS.acceptedSemanticAdoptionReceiptSha256,
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
    registration: "reading-primary-host-proof-only",
    receiptSha256:
      EXISTING_CORE_HOST_PROOF_RECEIPTS.acceptedSemanticAdoptionReceiptSha256,
  },
];

/** Frozen accepted bindings exposed to hosts, adapters, and parity guards. */
export const EXISTING_CORE_HOST_PROOF_BINDINGS: readonly ExistingCoreHostProofBinding[] =
  deepFreeze(HOST_PROOF_BINDING_ENTRIES);

/** Strict schema for the five accepted host-proof cartridge identifiers. */
export const existingCoreHostProofCartridgeIdSchema = z.enum([
  "dragon-flight",
  "magic-defense",
  "dungeon-liberator",
  "sorcerer-ziggurat",
  "astral-mage",
]);

const BINDINGS_BY_ID: ReadonlyMap<string, ExistingCoreHostProofBinding> =
  new Map(EXISTING_CORE_HOST_PROOF_BINDINGS.map((binding) => [binding.id, binding]));

/**
 * Looks up one accepted host-proof binding without consulting any production
 * catalog surface.
 * @param cartridgeId Untrusted cartridge identifier.
 * @returns The accepted binding, or undefined for any identifier outside the
 *   five-cartridge Task-4 acceptance.
 */
export function getExistingCoreHostProofBinding(
  cartridgeId: string,
): ExistingCoreHostProofBinding | undefined {
  return BINDINGS_BY_ID.get(cartridgeId);
}

/**
 * Reports whether an untrusted identifier names one of the five accepted
 * host-proof cartridges.
 * @param cartridgeId Untrusted cartridge identifier.
 * @returns True only for the five accepted Task-4 cartridge ids.
 */
export function isExistingCoreHostProofCartridge(cartridgeId: string): boolean {
  return BINDINGS_BY_ID.has(cartridgeId);
}
