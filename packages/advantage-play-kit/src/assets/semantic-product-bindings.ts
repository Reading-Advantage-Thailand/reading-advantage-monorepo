import { z } from "zod";

import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  createAcceptedStandardAssetResolver,
  isAcceptedStandardAssetResolver,
} from "./accepted-standard-pack-release.js";
import {
  isIssuedStandardPackAdditiveReleaseReceipt,
} from "./standard-pack-additive-release.js";
import type { StandardPackAdditiveReleaseReceipt } from "./standard-pack-additive-release.js";
import {
  isValidatedStandardPackIngestionLedger,
} from "./standard-pack-ingestion-ledger.js";
import type { StandardPackIngestionLedger } from "./standard-pack-ingestion-ledger.js";
import {
  validateStandardPackCanonicalIngestionReceipt,
  validateStandardPackSuitabilityAcceptedDecisionManifest,
  validateStandardPackSuitabilityDossier,
} from "./standard-pack-suitability.js";
import {
  ASSET_CONTRACT_V2_VERSION,
  validateAssetContractV2DescriptorForRelease,
} from "./asset-contract-v2.js";
import { issueAssetContractV2SemanticRegistration } from "./asset-contract-v2-provenance.js";
import type { AssetContractV2PhysicalDescriptor } from "./asset-contract-v2.js";
import { createStandardAssetResolver, serializeStandardAssetCatalogPayload } from "./standard-pack-release.js";
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
    version: z.string().min(1),
    catalogDigest: z.string().regex(/^[a-f0-9]{64}$/u),
    sourceReceiptDigest: z.string().regex(/^[a-f0-9]{64}$/u),
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

/** Raw accepted-suitability artifacts required to publish one successor semantic binding. */
export interface StandardPackSemanticPublicationEvidenceBundle {
  /** Untrusted draft suitability dossier candidate for one published role/state. */
  readonly dossierCandidate: unknown;
  /** Untrusted independently reviewed and owner-accepted manifest candidate. */
  readonly manifestCandidate: unknown;
  /** Required untrusted receipt candidate when the selected asset was canonically ingested. */
  readonly receiptCandidate?: unknown;
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

/** Descriptor-aware registration that deliberately omits the physical pack path. */
export interface AssetContractV2SemanticRegistration {
  /** Canonical semantic catalog key shared by the binding, descriptor, and accepted resolver. */
  readonly semanticKey: string;
  /** Validated descriptor that owns physical presentation behavior. */
  readonly descriptor: AssetContractV2PhysicalDescriptor;
  /** Immutable provenance locator supplied by the accepted release catalog. */
  readonly sourceReceiptLocator: string;
}

/** Deterministic Asset Contract v2 selected union for one requirement set. */
export interface AssetContractV2SemanticSelection {
  /** Public additive contract version. */
  readonly contractVersion: typeof ASSET_CONTRACT_V2_VERSION;
  /** Exact accepted release identity carried into the materialized registration set. */
  readonly release: Readonly<{ version: string; catalogDigest: string; sourceReceiptDigest: string }>;
  /** Sorted and deduplicated semantic keys selected by the cartridge. */
  readonly semanticKeys: readonly string[];
  /** Sorted and deduplicated descriptor registrations with no physical path field. */
  readonly registrations: readonly AssetContractV2SemanticRegistration[];
  /** Required credit carried into host presentation. */
  readonly requiredCredit: "Pixel art assets by ElvGames";
  /** Explicit boundary preventing whole-pack materialization. */
  readonly materialization: "accepted-cartridge-selected-union-only";
}

/** Descriptor-aware semantic resolver layered over the accepted v1 release resolver. */
export interface AssetContractV2SemanticResolver {
  /**
   * Resolves one role/state to a descriptor registration.
   *  requirement Product role and state.
   *  A validated descriptor registration without a physical path.
   */
  resolve(requirement: SemanticAssetRequirement): AssetContractV2SemanticRegistration;
  /**
   * Selects the minimal deterministic descriptor union.
   *  requirements Product role/state requirements.
   *  Release-bound descriptor registrations and required attribution.
   */
  select(requirements: readonly SemanticAssetRequirement[]): AssetContractV2SemanticSelection;
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

function expectedV2MediaKind(
  binding: SemanticProductBindingManifest["bindings"][number],
): AssetContractV2PhysicalDescriptor["mediaKind"] {
  if (binding.usage === "audio") return "audio";
  if (binding.usage === "animation") return "animation";
  if (binding.usage === "tileset") return "tileset";
  if (binding.usage === "nine-slice") return "ui";
  if (binding.usage === "image" || binding.usage === "frame") return "image";
  throw new Error(`Unsupported Asset Contract v2 semantic usage ${JSON.stringify(binding.usage)}`);
}

function assertDescriptorRelease(
  descriptor: AssetContractV2PhysicalDescriptor,
  expectedRelease: StandardAssetReleaseBinding,
): void {
  if (!sameReleaseIdentity(descriptor.release, expectedRelease)) {
    throw new Error(`Stale Asset Contract v2 descriptor release identity for ${JSON.stringify(descriptor.catalogEntryKey)}`);
  }
}

/**
 * Creates a descriptor-aware resolver for one exact catalog release without exposing physical pack paths.
 * @param baseResolver Exact release resolver with source provenance.
 * @param manifest Semantic role/state bindings pinned to that release.
 * @param descriptorCandidates Untrusted v2 descriptor records for exactly the manifest keys.
 * @param expectedRelease Exact release identity every descriptor and binding must pin.
 * @param fullPackAssetCount Catalog asset count used to reject whole-pack descriptor output.
 * @returns A fail-closed descriptor registration resolver and selected-union materializer.
 * @throws When descriptor parity, release identity, source provenance, attribution, path, or selected-union boundaries fail.
 */
function createDescriptorAwareResolverForRelease(
  baseResolver: StandardAssetResolver,
  manifest: SemanticProductBindingManifest,
  descriptorCandidates: readonly unknown[],
  expectedRelease: StandardAssetReleaseBinding,
  fullPackAssetCount: number,
  expectedDescriptorIds?: ReadonlyMap<string, string>,
): AssetContractV2SemanticResolver {
  const validatedManifest = validateSemanticProductBindings(manifest);
  if (!sameReleaseIdentity(validatedManifest.release, expectedRelease)) {
    throw new Error("Asset Contract v2 semantic bindings must pin the exact descriptor release");
  }
  const manifestKeys = new Set(validatedManifest.bindings.map((binding) => binding.semanticKey));
  if (descriptorCandidates.length >= fullPackAssetCount) {
    throw new Error("Asset Contract v2 descriptor registry must not contain full-pack output");
  }

  const descriptorsByKey = new Map<string, AssetContractV2PhysicalDescriptor>();
  for (const candidate of descriptorCandidates) {
    const descriptor = validateAssetContractV2DescriptorForRelease(candidate, expectedRelease);
    assertDescriptorRelease(descriptor, expectedRelease);
    if (!manifestKeys.has(descriptor.catalogEntryKey)) {
      throw new Error(`Asset Contract v2 descriptor registry contains undeclared or full-pack key ${JSON.stringify(descriptor.catalogEntryKey)}`);
    }
    const expectedDescriptorId = expectedDescriptorIds?.get(descriptor.catalogEntryKey);
    if (expectedDescriptorId !== undefined && descriptor.descriptorId !== expectedDescriptorId) {
      throw new Error(`Asset Contract v2 descriptor identity does not match accepted suitability evidence for ${JSON.stringify(descriptor.catalogEntryKey)}`);
    }
    if (descriptorsByKey.has(descriptor.catalogEntryKey)) {
      throw new Error(`Duplicate Asset Contract v2 descriptor for ${JSON.stringify(descriptor.catalogEntryKey)}`);
    }
    descriptorsByKey.set(descriptor.catalogEntryKey, descriptor);
  }
  for (const key of manifestKeys) {
    if (!descriptorsByKey.has(key)) {
      throw new Error(`Missing Asset Contract v2 descriptor for ${JSON.stringify(key)}`);
    }
  }

  const acceptedResolver = createSemanticAssetResolver(baseResolver, validatedManifest);
  const bindingByIdentity = new Map(
    validatedManifest.bindings.map((binding) => [`${binding.role}:${binding.state}`, binding]),
  );
  const resolve = (requirement: SemanticAssetRequirement): AssetContractV2SemanticRegistration => {
    const entry = acceptedResolver.resolve(requirement);
    const binding = bindingByIdentity.get(`${requirement.role}:${requirement.state}`);
    if (!binding) throw new Error("Descriptor-aware semantic resolver lost its validated binding");
    const descriptor = descriptorsByKey.get(entry.key);
    if (!descriptor || descriptor.catalogEntryKey !== binding.semanticKey) {
      throw new Error(`Asset Contract v2 descriptor parity failed for ${JSON.stringify(entry.key)}`);
    }
    if (descriptor.mediaKind !== expectedV2MediaKind(binding)) {
      throw new Error(`Asset Contract v2 descriptor media parity failed for ${JSON.stringify(entry.key)}`);
    }
    if (entry.requiredCredit !== ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit) {
      throw new Error(`Asset Contract v2 attribution drift for ${JSON.stringify(entry.key)}`);
    }
    if (typeof entry.sourceReceiptLocator !== "string" || !entry.sourceReceiptLocator.trim()) {
      throw new Error(`Asset Contract v2 registration ${JSON.stringify(entry.key)} lacks source receipt provenance`);
    }
    if (descriptor.mediaKind === "audio") {
      if (entry.physical.kind !== "audio" || entry.physical.dimensions !== null) {
        throw new Error(`Asset Contract v2 audio descriptor parity failed for ${JSON.stringify(entry.key)}`);
      }
    } else {
      const dimensions = entry.physical.dimensions;
      if (entry.physical.kind !== "image" || !dimensions || !descriptor.geometry
        || descriptor.geometry.width !== dimensions.width
        || descriptor.geometry.height !== dimensions.height) {
        throw new Error(`Asset Contract v2 descriptor dimensions parity failed for ${JSON.stringify(entry.key)}`);
      }
    }
    return issueAssetContractV2SemanticRegistration(Object.freeze({
      semanticKey: entry.key,
      descriptor,
      sourceReceiptLocator: entry.sourceReceiptLocator,
    }));
  };

  return Object.freeze({
    resolve,
    select(requirements: readonly SemanticAssetRequirement[]): AssetContractV2SemanticSelection {
      const registrationsByKey = new Map(
        requirements.map((requirement) => {
          const registration = resolve(requirement);
          return [registration.semanticKey, registration] as const;
        }),
      );
      const registrations = [...registrationsByKey.values()]
        .sort((left, right) => left.semanticKey.localeCompare(right.semanticKey));
      if (registrations.length >= fullPackAssetCount) {
        throw new Error("Asset Contract v2 selected union must not materialize the full pack");
      }
      return Object.freeze({
        contractVersion: ASSET_CONTRACT_V2_VERSION,
        release: Object.freeze({
          version: expectedRelease.version,
          catalogDigest: expectedRelease.catalogDigest,
          sourceReceiptDigest: expectedRelease.sourceReceiptDigest,
        }),
        semanticKeys: Object.freeze(registrations.map((registration) => registration.semanticKey)),
        registrations: Object.freeze(registrations),
        requiredCredit: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit,
        materialization: "accepted-cartridge-selected-union-only",
      });
    },
  });
}

/**
 * Creates an additive descriptor-aware resolver for the root accepted standard-pack release.
 * @param baseResolver Root accepted standard-pack resolver with exact release and source provenance.
 * @param manifest Owner-approved semantic role/state bindings.
 * @param descriptorCandidates Untrusted v2 descriptor records for exactly the manifest keys.
 * @returns A fail-closed root-release descriptor registration resolver and selected-union materializer.
 * @throws When the resolver is not root accepted or descriptor boundaries fail.
 */
export function createDescriptorAwareSemanticAssetResolver(
  baseResolver: StandardAssetResolver,
  manifest: SemanticProductBindingManifest,
  descriptorCandidates: readonly unknown[],
): AssetContractV2SemanticResolver {
  if (!isAcceptedStandardAssetResolver(baseResolver)) {
    throw new Error("Asset Contract v2 requires a resolver created from the actual accepted standard-pack catalog");
  }
  return createDescriptorAwareResolverForRelease(
    baseResolver,
    manifest,
    descriptorCandidates,
    ACCEPTED_STANDARD_ASSET_RELEASE,
    ACCEPTED_STANDARD_ASSET_RELEASE.acceptanceEvidence.assetCount,
  );
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
  if (manifest.release.version !== ACCEPTED_STANDARD_ASSET_RELEASE.version
    || manifest.release.catalogDigest !== ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest
    || manifest.release.sourceReceiptDigest !== ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest) {
    throw new Error("Root accepted semantic resolver requires root-pinned semantic bindings");
  }
  const baseResolver = await createAcceptedStandardAssetResolver(catalog, binding);
  return createSemanticAssetResolver(baseResolver, manifest);
}

/** Compares two release identities without accepting a partial pin. */
/** Computes a SHA-256 digest for a browser-safe stable payload. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sameReleaseIdentity(
  left: { readonly version: string; readonly catalogDigest: string; readonly sourceReceiptDigest: string },
  right: { readonly version: string; readonly catalogDigest: string; readonly sourceReceiptDigest: string },
): boolean {
  return left.version === right.version
    && left.catalogDigest === right.catalogDigest
    && left.sourceReceiptDigest === right.sourceReceiptDigest;
}

/** Checks that one binding is fully supported by one accepted suitability decision. */
async function validateSuccessorSemanticPublicationEvidence(
  bindings: SemanticProductBindingManifest,
  evidenceBundles: readonly StandardPackSemanticPublicationEvidenceBundle[],
  ledger: StandardPackIngestionLedger,
  additiveReceipt: StandardPackAdditiveReleaseReceipt,
): Promise<ReadonlyMap<string, string>> {
  if (evidenceBundles.length !== bindings.bindings.length) {
    throw new Error("Successor semantic publication requires exactly one accepted suitability evidence bundle per binding");
  }
  const seenIdentities = new Set<string>();
  const expectedDescriptorIds = new Map<string, string>();
  for (const [index, binding] of bindings.bindings.entries()) {
    const evidenceBundle = evidenceBundles[index];
    if (!evidenceBundle) throw new Error("Successor semantic publication is missing a required suitability evidence bundle");
    const dossier = await validateStandardPackSuitabilityDossier(evidenceBundle.dossierCandidate);
    const manifest = await validateStandardPackSuitabilityAcceptedDecisionManifest(
      dossier,
      evidenceBundle.manifestCandidate,
    );
    const identity = `${binding.role}:${binding.state}`;
    if (seenIdentities.has(identity)) {
      throw new Error(`Successor semantic publication repeats suitability evidence for ${JSON.stringify(identity)}`);
    }
    seenIdentities.add(identity);
    if (
      dossier.request.semantic.role !== binding.role
      || dossier.request.semantic.state !== binding.state
      || !sameReleaseIdentity(dossier.releaseBinding.predecessorRelease, additiveReceipt.predecessorRelease)
    ) {
      throw new Error(`Successor semantic publication evidence does not match ${JSON.stringify(identity)}`);
    }
    if (manifest.decision.disposition === "blocked" || manifest.decision.candidateId === null || manifest.decision.descriptorId === null) {
      throw new Error(`Successor semantic publication cannot bind blocked suitability evidence for ${JSON.stringify(identity)}`);
    }
    const candidate = dossier.candidates.find((item) => item.candidateId === manifest.decision.candidateId);
    if (
      !candidate
      || candidate.descriptor.descriptorId !== manifest.decision.descriptorId
      || candidate.descriptor.catalogEntryKey !== binding.semanticKey
    ) {
      throw new Error(`Successor semantic publication binding does not match its accepted candidate for ${JSON.stringify(identity)}`);
    }
    if (expectedDescriptorIds.has(binding.semanticKey)) {
      throw new Error(`Successor semantic publication repeats a descriptor catalog key ${JSON.stringify(binding.semanticKey)}`);
    }
    expectedDescriptorIds.set(binding.semanticKey, candidate.descriptor.descriptorId);
    if (manifest.decision.disposition === "reuse-canonical") {
      if (
        candidate.origin !== "canonical"
        || candidate.requiresCanonicalIngestion
        || candidate.descriptor.release === null
        || !sameReleaseIdentity(candidate.descriptor.release, additiveReceipt.predecessorRelease)
        || evidenceBundle.receiptCandidate !== undefined
      ) {
        throw new Error(`Successor semantic publication has invalid canonical-reuse evidence for ${JSON.stringify(identity)}`);
      }
      continue;
    }
    if (candidate.origin !== "legacy" || !candidate.requiresCanonicalIngestion || candidate.descriptor.release !== null || evidenceBundle.receiptCandidate === undefined) {
      throw new Error(`Successor semantic publication requires a canonical-ingestion receipt for ${JSON.stringify(identity)}`);
    }
    const receipt = await validateStandardPackCanonicalIngestionReceipt(
      evidenceBundle.receiptCandidate,
      additiveReceipt.predecessorRelease,
    );
    const ledgerEntry = ledger.entries.find((entry) => entry.receiptId === receipt.receiptId);
    const addedAsset = ledgerEntry === undefined
      ? undefined
      : additiveReceipt.addedAssets.find((asset) => asset.entryId === ledgerEntry.entryId);
    if (
      receipt.candidateId !== candidate.candidateId
      || receipt.catalogEntryKey !== binding.semanticKey
      || receipt.descriptorId !== candidate.descriptor.descriptorId
      || receipt.descriptorDigest !== candidate.descriptor.descriptorDigest
      || !sameReleaseIdentity(receipt.additiveRelease, additiveReceipt.successorRelease)
      || !ledgerEntry
      || ledgerEntry.dossierId !== dossier.dossierId
      || ledgerEntry.dossierDigest !== dossier.dossierDigest
      || ledgerEntry.manifestId !== manifest.manifestId
      || ledgerEntry.manifestDigest !== manifest.manifestDigest
      || ledgerEntry.receiptDigest !== receipt.receiptDigest
      || ledgerEntry.catalogEntryKey !== receipt.catalogEntryKey
      || ledgerEntry.descriptorId !== receipt.descriptorId
      || ledgerEntry.descriptorDigest !== receipt.descriptorDigest
      || !addedAsset
      || addedAsset.catalogEntryKey !== receipt.catalogEntryKey
      || addedAsset.descriptorId !== receipt.descriptorId
      || addedAsset.descriptorDigest !== receipt.descriptorDigest
    ) {
      throw new Error(`Successor semantic publication ingestion evidence is not bound to the accepted additive release for ${JSON.stringify(identity)}`);
    }
  }
  return expectedDescriptorIds;
}

/** Creates a semantic resolver pinned to the exact catalog release declared by its binding manifest.
 * @param catalog The complete successor catalog to resolve.
 * @param binding The exact successor release identity.
 * @param manifest Approved semantic bindings pinned to that same release.
 * @param ledger The exact validated ingestion ledger batch that produced the successor release.
 * @param additiveReceipt The issued additive-release receipt that pins the successor catalog.
 * @param evidenceBundles Exactly one accepted suitability dossier/manifest bundle per semantic binding.
 * @returns A fail-closed semantic resolver over the supplied release.
 * @throws When the release, ledger, receipt, suitability evidence, or manifest binding differs from the supplied catalog.
 */
export async function createReleaseBoundSemanticAssetResolver(
  catalog: StandardAssetCatalog,
  binding: StandardAssetReleaseBinding,
  manifest: SemanticProductBindingManifest,
  ledger: StandardPackIngestionLedger,
  additiveReceipt: StandardPackAdditiveReleaseReceipt,
  evidenceBundles: readonly StandardPackSemanticPublicationEvidenceBundle[],
  descriptorCandidates: readonly unknown[],
): Promise<AssetContractV2SemanticResolver> {
  if (!isValidatedStandardPackIngestionLedger(ledger)) {
    throw new Error("Successor semantic publication requires an issued validated ingestion ledger");
  }
  if (!isIssuedStandardPackAdditiveReleaseReceipt(additiveReceipt)) {
    throw new Error("Successor semantic publication requires an issued additive release receipt");
  }
  if (await sha256(serializeStandardAssetCatalogPayload(catalog)) !== catalog.digest) {
    throw new Error("Successor semantic publication catalog payload does not match its digest");
  }
  if (additiveReceipt.successorRelease.version !== binding.version
    || additiveReceipt.successorRelease.catalogDigest !== binding.catalogDigest
    || additiveReceipt.successorRelease.sourceReceiptDigest !== binding.sourceReceiptDigest
    || additiveReceipt.successorCatalogPayloadDigest !== catalog.digest) {
    throw new Error("Successor semantic publication requires the exact additive release receipt");
  }
  if (
    ledger.batchId !== additiveReceipt.ingestionLedger.batchId
    || ledger.batchDigest !== additiveReceipt.ingestionLedger.batchDigest
    || ledger.previousBatchDigest !== additiveReceipt.ingestionLedger.previousBatchDigest
    || !sameReleaseIdentity(ledger.predecessorRelease, additiveReceipt.predecessorRelease)
    || !sameReleaseIdentity(ledger.proposedSuccessorRelease, additiveReceipt.successorRelease)
  ) {
    throw new Error("Successor semantic publication requires the ledger that issued the additive release receipt");
  }
  const validated = validateSemanticProductBindings(manifest);
  if (validated.release.version !== binding.version || validated.release.catalogDigest !== binding.catalogDigest || validated.release.sourceReceiptDigest !== binding.sourceReceiptDigest) {
    throw new Error("Semantic product bindings must pin the exact supplied release");
  }
  const expectedDescriptorIds = await validateSuccessorSemanticPublicationEvidence(
    validated,
    evidenceBundles,
    ledger,
    additiveReceipt,
  );
  return createDescriptorAwareResolverForRelease(
    createStandardAssetResolver(catalog, binding),
    validated,
    descriptorCandidates,
    binding,
    catalog.assets.length,
    expectedDescriptorIds,
  );
}
