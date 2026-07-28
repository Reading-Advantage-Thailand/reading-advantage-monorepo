import { z } from "zod";

import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  createAcceptedStandardAssetResolver,
} from "./accepted-standard-pack-release.js";
import type {
  StandardAssetCatalog,
  StandardAssetCatalogEntry,
  StandardAssetReleaseBinding,
  StandardAssetResolver,
} from "./standard-pack-release.js";

const semanticBindingManifestSchema = z.object({
  schemaVersion: z.literal(1),
  classification: z.literal("owner-approved-product-binding"),
  legacyEvidenceClaim: z.literal(false),
  authority: z.literal("t11-owner-authorized-extension-v1"),
  release: z.object({
    version: z.literal(ACCEPTED_STANDARD_ASSET_RELEASE.version),
    catalogDigest: z.literal(ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest),
    sourceReceiptDigest: z.literal(ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest),
  }).strict(),
  bindings: z.array(z.object({
    role: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    state: z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    semanticKey: z.string().min(1).refine((value) => !value.includes(".") && !value.startsWith("/"), {
      message: "Canonical bindings require semantic keys rather than physical paths",
    }),
    usage: z.enum(["image", "frame", "animation", "tileset", "nine-slice", "audio", "font"]),
    frame: z.number().int().nonnegative().optional(),
    animation: z.string().min(1).optional(),
    tileSize: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict().optional(),
    nineSlice: z.object({
      left: z.number().int().nonnegative(),
      right: z.number().int().nonnegative(),
      top: z.number().int().nonnegative(),
      bottom: z.number().int().nonnegative(),
    }).strict().optional(),
  }).strict()).min(1),
}).strict().superRefine((manifest, context) => {
  const identities = new Set<string>();
  for (const binding of manifest.bindings) {
    const identity = `${binding.role}:${binding.state}`;
    if (identities.has(identity)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate semantic role/state ${identity}`, path: ["bindings"] });
    }
    identities.add(identity);
    if (binding.usage === "frame" && binding.frame === undefined) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `${identity} frame usage requires a frame index`, path: ["bindings"] });
    }
    if (binding.usage === "animation" && !binding.animation) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `${identity} animation usage requires an animation name`, path: ["bindings"] });
    }
    if (binding.usage === "tileset" && !binding.tileSize) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `${identity} tileset usage requires tileSize`, path: ["bindings"] });
    }
    if (binding.usage === "nine-slice" && !binding.nineSlice) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: `${identity} nine-slice usage requires insets`, path: ["bindings"] });
    }
  }
});

/** Owner-approved forward semantic binding manifest. */
export type SemanticProductBindingManifest = z.infer<typeof semanticBindingManifestSchema>;

/** Semantic role and state requested by presentation or cartridge code. */
export interface SemanticAssetRequirement {
  /** Product-facing role independent of a pack path. */
  readonly role: string;
  /** Product-facing role state. */
  readonly state: string;
}

/** Loader registration derived from a selected semantic binding. */
export interface SemanticAssetRegistration {
  /** Stable semantic key used as the loader identity. */
  readonly key: string;
  /** Canonical selected physical path returned by the accepted resolver. */
  readonly path: string;
  /** Physical loader kind. */
  readonly kind: "image" | "frame" | "animation" | "tileset" | "nine-slice" | "audio" | "font";
  /** Optional frame index for a static frame binding. */
  readonly frame?: number;
  /** Optional named animation registration. */
  readonly animation?: string;
  /** Optional explicit tile dimensions. */
  readonly tileSize?: Readonly<{ width: number; height: number }>;
  /** Optional explicit stretch-safe insets. */
  readonly nineSlice?: Readonly<{ left: number; right: number; top: number; bottom: number }>;
}

/** Minimal selected union returned for one set of role/state requirements. */
export interface SemanticAssetSelection {
  /** Sorted, deduplicated semantic keys. */
  readonly semanticKeys: readonly string[];
  /** Sorted, deduplicated loader registrations. */
  readonly registrations: readonly SemanticAssetRegistration[];
  /** Required credit carried into host presentation. */
  readonly requiredCredit: "Pixel art assets by ElvGames";
}

/** Role/state resolver layered over the accepted canonical pack resolver. */
export interface SemanticProductAssetResolver {
  /**
   * Resolves one semantic role/state.
   * @param requirement Product role and state.
   * @returns Accepted canonical catalog entry.
   */
  resolve(requirement: SemanticAssetRequirement): StandardAssetCatalogEntry & { readonly requiredCredit: "Pixel art assets by ElvGames" };
  /**
   * Selects the deduplicated physical union for role/state requirements.
   * @param requirements Product role/state requirements.
   * @returns Minimal loader registrations plus required attribution.
   */
  select(requirements: readonly SemanticAssetRequirement[]): SemanticAssetSelection;
}

/** Canonical bindings authorized as forward product decisions by the T11 extension. */
export const OWNER_APPROVED_CANONICAL_BINDINGS: SemanticProductBindingManifest = Object.freeze(
  semanticBindingManifestSchema.parse({
    schemaVersion: 1,
    classification: "owner-approved-product-binding",
    legacyEvidenceClaim: false,
    authority: "t11-owner-authorized-extension-v1",
    release: {
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    },
    bindings: [
      { role: "player", state: "idle", semanticKey: "top-down/32x32/characters/hero-01", usage: "image" },
      { role: "enemy", state: "idle", semanticKey: "side-view/32x32/characters/enemy-001-idle", usage: "image" },
      { role: "feedback", state: "correct", semanticKey: "effects/32x32/combat/hit-01", usage: "image" },
      { role: "control", state: "confirm", semanticKey: "ui/16x16/controls/gamepad-buttons", usage: "image" },
      { role: "panel", state: "default", semanticKey: "ui/20x20/inventory/slot", usage: "image" },
      { role: "status", state: "armor", semanticKey: "ui/32x32/items/armor-icons", usage: "image" },
      { role: "audio-feedback", state: "correct", semanticKey: "audio/native/combat/hit-01", usage: "audio" },
    ],
  }),
);

/**
 * Validates a semantic product binding manifest at an external configuration boundary.
 * @param candidate Untrusted owner binding configuration.
 * @returns Strictly validated immutable product bindings.
 * @throws When release identity, classification, role/state identity, or semantic keys are invalid.
 */
export function validateSemanticProductBindings(candidate: unknown): SemanticProductBindingManifest {
  const result = semanticBindingManifestSchema.safeParse(candidate);
  if (!result.success) {
    throw new Error(`Semantic product bindings are invalid: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  return Object.freeze(result.data);
}

/**
 * Creates a role/state resolver over an already accepted standard-pack resolver.
 * @param baseResolver Accepted standard-pack semantic-key resolver.
 * @param manifest Owner-approved forward product bindings.
 * @returns A fail-closed role/state resolver with selected-union and attribution behavior.
 * @throws When bindings or resolved key, descriptor, source, usage, or physical-source identity are invalid.
 */
export function createSemanticAssetResolver(
  baseResolver: StandardAssetResolver,
  manifest: SemanticProductBindingManifest,
): SemanticProductAssetResolver {
  const validated = validateSemanticProductBindings(manifest);
  const byIdentity = new Map(validated.bindings.map((binding) => [`${binding.role}:${binding.state}`, binding]));
  const resolve = (requirement: SemanticAssetRequirement) => {
    if (!requirement.role.trim() || !requirement.state.trim()) throw new Error("Semantic role and state must not be blank");
    const identity = `${requirement.role}:${requirement.state}`;
    const binding = byIdentity.get(identity);
    if (!binding) throw new Error(`Unmapped semantic asset role/state ${JSON.stringify(identity)}`);
    const entry = baseResolver.resolve(binding.semanticKey);
    if (entry.key !== binding.semanticKey) {
      throw new Error(`Resolved key ${JSON.stringify(entry.key)} does not match semantic binding ${JSON.stringify(binding.semanticKey)}`);
    }
    if (entry.path !== `${entry.key}.${entry.extension}`) {
      throw new Error(`Resolved descriptor path ${JSON.stringify(entry.path)} does not match semantic key ${JSON.stringify(entry.key)}`);
    }
    if (typeof entry.sourceReceiptLocator !== "string" || !entry.sourceReceiptLocator.trim()) {
      throw new Error(`Resolved semantic asset ${JSON.stringify(entry.key)} lacks a source receipt binding`);
    }
    if ((binding.usage === "audio" && entry.physical.kind !== "audio")
      || (binding.usage === "font" && entry.physical.kind !== "font")
      || (!["audio", "font"].includes(binding.usage) && entry.physical.kind !== "image")) {
      throw new Error(`Semantic asset usage ${binding.usage} is incompatible with ${entry.physical.kind}`);
    }
    return entry;
  };
  return Object.freeze({
    resolve,
    select(requirements: readonly SemanticAssetRequirement[]): SemanticAssetSelection {
      const entries = requirements.map((requirement) => {
        const entry = resolve(requirement);
        const binding = byIdentity.get(`${requirement.role}:${requirement.state}`)!;
        return { entry, binding };
      });
      const keyByPhysicalPath = new Map<string, string>();
      const keyBySourceReceipt = new Map<string, string>();
      for (const { entry } of entries) {
        const pathOwner = keyByPhysicalPath.get(entry.path);
        const sourceOwner = keyBySourceReceipt.get(entry.sourceReceiptLocator);
        if ((pathOwner && pathOwner !== entry.key) || (sourceOwner && sourceOwner !== entry.key)) {
          throw new Error(
            `Duplicate physical source rejected during semantic asset materialization: ${JSON.stringify(entry.key)}`,
          );
        }
        keyByPhysicalPath.set(entry.path, entry.key);
        keyBySourceReceipt.set(entry.sourceReceiptLocator, entry.key);
      }
      const byKey = new Map(entries.map((selection) => [selection.entry.key, selection]));
      const selected = [...byKey.values()].sort((left, right) => left.entry.key.localeCompare(right.entry.key));
      return Object.freeze({
        semanticKeys: Object.freeze(selected.map(({ entry }) => entry.key)),
        registrations: Object.freeze(selected.map(({ entry, binding }) => Object.freeze({
          key: entry.key,
          path: entry.path,
          kind: binding.usage,
          ...(binding.frame === undefined ? {} : { frame: binding.frame }),
          ...(binding.animation === undefined ? {} : { animation: binding.animation }),
          ...(binding.tileSize === undefined ? {} : { tileSize: binding.tileSize }),
          ...(binding.nineSlice === undefined ? {} : { nineSlice: binding.nineSlice }),
        }))),
        requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit,
      });
    },
  });
}

/**
 * Verifies the complete accepted catalog before creating the owner-approved role/state resolver.
 * @param catalog Complete generated accepted standard-pack catalog.
 * @param binding Exact release identity pinned by the cartridge.
 * @param manifest Owner-approved forward product bindings.
 * @returns A semantic role/state resolver after digest and release verification.
 * @throws When catalog, release binding, or owner product bindings fail closed validation.
 */
export async function createAcceptedSemanticAssetResolver(
  catalog: StandardAssetCatalog,
  binding: StandardAssetReleaseBinding,
  manifest: SemanticProductBindingManifest = OWNER_APPROVED_CANONICAL_BINDINGS,
): Promise<SemanticProductAssetResolver> {
  const baseResolver = await createAcceptedStandardAssetResolver(catalog, binding);
  return createSemanticAssetResolver(baseResolver, manifest);
}
