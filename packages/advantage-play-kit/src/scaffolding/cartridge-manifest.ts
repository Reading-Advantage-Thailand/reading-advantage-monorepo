/**
 * Zod schema for a cartridge manifest that pins the accepted canonical
 * standard-pack release, declares only accepted capabilities, registers
 * attribution, and materializes only the cartridge's selected union.
 *
 * Cartridges request semantic roles/states and cannot import physical files,
 * vendor filenames, or private pack trees. The manifest is the single pinning
 * surface for the canonical standard-pack version, catalog digest, and
 * source-receipt digest.
 */

import { z } from "zod";

import { ACCEPTED_STANDARD_ASSET_RELEASE } from "../assets/accepted-standard-pack-release.js";
import { ACCEPTED_CAPABILITY_IDS } from "../systems/capability-manifest.js";
import { assertAcceptedStandardPackBinding } from "../guards/accepted-inputs.js";
import type { StandardAssetReleaseBinding } from "../assets/standard-pack-release.js";

/** Frozen standard-pack binding that pins the accepted 2026.08.04 release. */
export const ACCEPTED_STANDARD_PACK_BINDING: StandardAssetReleaseBinding = Object.freeze({
  version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
  catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
  sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
});

const semanticKeySchema = z
  .string()
  .min(1)
  .refine((value) => !value.includes(".") && !value.endsWith("/") && !value.startsWith("/"), {
    message: "Semantic asset requirements must be semantic keys, not physical paths",
  });

const standardPackBindingSchema = z
  .object({
    version: z.string().min(1),
    catalogDigest: z.string().min(1),
    sourceReceiptDigest: z.string().min(1),
  })
  .strict()
  .superRefine((binding, ctx) => {
    try {
      assertAcceptedStandardPackBinding(binding);
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : "Standard-pack binding is not accepted",
        path: ["standardPackBinding"],
      });
    }
  });

const attributionRegistrationSchema = z
  .object({
    requiredCredit: z.literal(ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit),
    placement: z.enum(["shared-credits", "about", "end-screen"]),
  })
  .strict();

/** Zod schema for a cartridge manifest bound to the accepted developer kit. */
export const cartridgeManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, {
      message: "Cartridge id must be lowercase kebab-case",
    }),
    title: z.string().min(1),
    description: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/u, {
      message: "Cartridge version must be semver",
    }),
    runtimeApiVersion: z.string().min(1),
    inputMode: z.enum(["vocabulary", "sentence"]),
    capabilities: z.array(z.enum([...ACCEPTED_CAPABILITY_IDS] as [string, ...string[]])).min(1),
    standardPackBinding: standardPackBindingSchema,
    semanticAssetRequirements: z.array(semanticKeySchema),
    responsive: z.object({
      profiles: z.tuple([z.literal("compact"), z.literal("wide")]),
      compactStrategy: z.enum(["reveal", "follow", "reflow", "stage", "panel", "fixed-mechanic"]),
      wideStrategy: z.enum(["reveal", "follow", "reflow", "stage", "panel", "fixed-mechanic"]),
      statePreservation: z.literal("capture-recompose-restore"),
    }).strict().default({
      profiles: ["compact", "wide"],
      compactStrategy: "reflow",
      wideStrategy: "panel",
      statePreservation: "capture-recompose-restore",
    }),
    attributionRegistration: attributionRegistrationSchema,
    selectedUnionMaterialization: z.literal("accepted-cartridge-selected-union-only"),
    qcRegistration: z.object({ route: z.string().min(1) }).strict(),
  })
  .strict();

/** Validated cartridge manifest bound to the accepted developer kit. */
export type CartridgeManifest = z.infer<typeof cartridgeManifestSchema>;

/**
 * Validates a cartridge manifest against the accepted developer-kit contract.
 * @param manifest Untrusted manifest supplied by a cartridge author or scaffold.
 * @returns The validated, frozen cartridge manifest.
 * @throws When the manifest does not pin the accepted release, lists an unsupported capability, omits attribution, or requests physical paths.
 */
export function validateCartridgeManifest(manifest: unknown): CartridgeManifest {
  const parsed = cartridgeManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    throw new Error(
      `Cartridge manifest validation failed: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return Object.freeze(parsed.data);
}
