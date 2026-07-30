import { z } from "zod";

import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";
import { isIssuedAssetContractV2SemanticRegistration } from "./asset-contract-v2-provenance.js";
import type { AssetContractV2SemanticRegistration } from "./semantic-product-bindings.js";

/** The public schema version for the additive Asset Contract v2 surface. */
export const ASSET_CONTRACT_V2_VERSION = 2 as const;

/** Stable codes returned by Asset Contract v2 fail-closed validation boundaries. */
export const ASSET_CONTRACT_V2_FAILURE_CODES = [
  "missing-descriptor",
  "incompatible-descriptor",
  "stale-release-identity",
  "unsafe-physical-path",
  "duplicate-physical-source",
  "unsupported-media",
] as const;

/** One stable Asset Contract v2 failure category. */
export type AssetContractV2FailureCode = (typeof ASSET_CONTRACT_V2_FAILURE_CODES)[number];

const roleOrStateSchema = z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const descriptorIdSchema = z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const catalogEntryKeySchema = z.string()
  .min(1)
  .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/u, "Catalog entry keys must be slash-delimited semantic keys")
  .refine((value) => !value.includes("//") && !value.includes("."), "Catalog entry keys must not be direct physical paths");
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u, "Release digests must be lowercase SHA-256 values");

/** Validates the stable role/state identity requested by cartridge gameplay. */
export const assetContractV2SemanticRequirementSchema = z.object({
  role: roleOrStateSchema,
  state: roleOrStateSchema,
}).strict();

/** A semantic role/state identity with no physical source or frame-count assumption. */
export type AssetContractV2SemanticRequirement = z.infer<typeof assetContractV2SemanticRequirementSchema>;

/** Validates the exact accepted-release identity attached to a descriptor. */
export const assetContractV2ReleaseIdentitySchema = z.object({
  version: z.string().min(1),
  catalogDigest: digestSchema,
  sourceReceiptDigest: digestSchema,
}).strict();

/** The release pin that prevents descriptors from silently resolving stale bytes. */
export type AssetContractV2ReleaseIdentity = z.infer<typeof assetContractV2ReleaseIdentitySchema>;

/** Validates one zero-indexed frame coordinate within an atlas. */
export const assetContractV2FrameCoordinateSchema = z.object({
  column: z.number().int().nonnegative(),
  row: z.number().int().nonnegative(),
}).strict();

/** One descriptor-defined atlas coordinate, not a gameplay frame contract. */
export type AssetContractV2FrameCoordinate = z.infer<typeof assetContractV2FrameCoordinateSchema>;

/** Validates encoded image geometry and its explicit atlas grid. */
export const assetContractV2GeometrySchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  frameWidth: z.number().int().positive(),
  frameHeight: z.number().int().positive(),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
}).strict().superRefine((geometry, context) => {
  if (geometry.width !== geometry.frameWidth * geometry.columns) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Atlas width must equal frameWidth multiplied by columns", path: ["width"] });
  }
  if (geometry.height !== geometry.frameHeight * geometry.rows) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Atlas height must equal frameHeight multiplied by rows", path: ["height"] });
  }
});

/** The encoded dimensions and declared frame grid for a visual descriptor. */
export type AssetContractV2Geometry = z.infer<typeof assetContractV2GeometrySchema>;

/** Validates clip playback timing supplied by presentation metadata. */
export const assetContractV2TimingSchema = z.object({
  fps: z.number().finite().positive().max(240),
  loop: z.boolean(),
}).strict();

/** Descriptor-owned animation cadence. */
export type AssetContractV2Timing = z.infer<typeof assetContractV2TimingSchema>;

/** Validates one named clip and its explicitly ordered frame coordinates. */
export const assetContractV2ClipSchema = z.object({
  id: descriptorIdSchema,
  frames: z.array(assetContractV2FrameCoordinateSchema).min(1),
  timing: assetContractV2TimingSchema,
}).strict().superRefine((clip, context) => {
  let previous = -1;
  for (const [index, frame] of clip.frames.entries()) {
    const ordinal = frame.row * 100_000 + frame.column;
    if (ordinal <= previous) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Clip frames must be unique and in ascending atlas order", path: ["frames", index] });
    }
    previous = ordinal;
  }
});

/** A named presentation clip whose duration and frame order are descriptor-owned. */
export type AssetContractV2Clip = z.infer<typeof assetContractV2ClipSchema>;

/** Validates a direction-to-clip mapping for an animated descriptor. */
export const assetContractV2DirectionSchema = z.object({
  direction: z.enum(["up", "down", "left", "right"]),
  clipId: descriptorIdSchema,
}).strict();

/** One directional presentation mapping. */
export type AssetContractV2Direction = z.infer<typeof assetContractV2DirectionSchema>;

/** Validates a normalized point used as an anchor or pivot. */
export const assetContractV2AnchorSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
}).strict();

/** A normalized render anchor or pivot. */
export type AssetContractV2Anchor = z.infer<typeof assetContractV2AnchorSchema>;

/** Validates a normalized collision rectangle that remains within its visual bounds. */
export const assetContractV2CollisionEnvelopeSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
  width: z.number().finite().positive().max(1),
  height: z.number().finite().positive().max(1),
}).strict().superRefine((envelope, context) => {
  if (envelope.x + envelope.width > 1 || envelope.y + envelope.height > 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Collision envelope must remain within normalized visual bounds" });
  }
});

/** A normalized collision/readability footprint supplied by a visual descriptor. */
export type AssetContractV2CollisionEnvelope = z.infer<typeof assetContractV2CollisionEnvelopeSchema>;

/** Validates minimum visual readability metadata. */
export const assetContractV2ReadabilityEnvelopeSchema = z.object({
  minimumRenderPixels: z.number().int().positive(),
  minimumContrastRatio: z.number().finite().min(1).max(21),
}).strict();

/** Minimum render-size and contrast expectations for presentation QC. */
export type AssetContractV2ReadabilityEnvelope = z.infer<typeof assetContractV2ReadabilityEnvelopeSchema>;

const tileMetadataSchema = z.object({
  tileWidth: z.number().int().positive(),
  tileHeight: z.number().int().positive(),
  columns: z.number().int().positive(),
  rows: z.number().int().positive(),
}).strict();
const audioMetadataSchema = z.object({
  durationMs: z.number().int().positive(),
  channels: z.union([z.literal(1), z.literal(2)]),
  loop: z.boolean(),
}).strict();
const nineSliceSchema = z.object({
  left: z.number().int().nonnegative(),
  right: z.number().int().nonnegative(),
  top: z.number().int().nonnegative(),
  bottom: z.number().int().nonnegative(),
}).strict();

/** Validates the full physical presentation descriptor selected for an accepted catalog entry. */
export const assetContractV2PhysicalDescriptorSchema = z.object({
  contractVersion: z.literal(ASSET_CONTRACT_V2_VERSION),
  descriptorId: descriptorIdSchema,
  catalogEntryKey: catalogEntryKeySchema,
  release: assetContractV2ReleaseIdentitySchema,
  mediaKind: z.enum(["image", "animation", "tileset", "ui", "audio"]),
  geometry: assetContractV2GeometrySchema.optional(),
  clips: z.array(assetContractV2ClipSchema).min(1).optional(),
  directions: z.array(assetContractV2DirectionSchema).min(1).optional(),
  tiles: tileMetadataSchema.optional(),
  audio: audioMetadataSchema.optional(),
  nineSlice: nineSliceSchema.optional(),
  anchor: assetContractV2AnchorSchema,
  renderScale: z.number().finite().positive().max(16),
  collisionEnvelope: assetContractV2CollisionEnvelopeSchema,
  readabilityEnvelope: assetContractV2ReadabilityEnvelopeSchema,
}).strict().superRefine((descriptor, context) => {
  const visual = descriptor.mediaKind !== "audio";
  if (visual && !descriptor.geometry) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Visual descriptors require geometry", path: ["geometry"] });
  }
  if (descriptor.mediaKind === "audio") {
    if (!descriptor.audio) context.addIssue({ code: z.ZodIssueCode.custom, message: "Audio descriptors require audio metadata", path: ["audio"] });
    if (descriptor.geometry || descriptor.clips || descriptor.directions || descriptor.tiles || descriptor.nineSlice) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Audio descriptors must not declare visual metadata" });
    }
  }
  if (descriptor.mediaKind === "animation") {
    if (!descriptor.clips) context.addIssue({ code: z.ZodIssueCode.custom, message: "Animation descriptors require clips", path: ["clips"] });
    if (!descriptor.directions) context.addIssue({ code: z.ZodIssueCode.custom, message: "Animation descriptors require direction mappings", path: ["directions"] });
  }
  if (descriptor.mediaKind === "tileset" && !descriptor.tiles) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Tileset descriptors require tile metadata", path: ["tiles"] });
  }
  if (descriptor.mediaKind !== "tileset" && descriptor.tiles) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Only tileset descriptors may declare tile metadata", path: ["tiles"] });
  }
  if (descriptor.geometry && descriptor.clips) {
    for (const clip of descriptor.clips) {
      for (const frame of clip.frames) {
        if (frame.column >= descriptor.geometry.columns || frame.row >= descriptor.geometry.rows) {
          context.addIssue({ code: z.ZodIssueCode.custom, message: "Clip frame lies outside the declared atlas bounds", path: ["clips"] });
        }
      }
    }
  }
  if (descriptor.clips && descriptor.directions) {
    const clipIds = new Set(descriptor.clips.map((clip) => clip.id));
    const directions = new Set<string>();
    for (const mapping of descriptor.directions) {
      if (!clipIds.has(mapping.clipId)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Direction mapping references an unknown clip", path: ["directions"] });
      if (directions.has(mapping.direction)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Direction mappings must be unique", path: ["directions"] });
      directions.add(mapping.direction);
    }
  }
  if (descriptor.geometry && descriptor.tiles && (
    descriptor.tiles.tileWidth !== descriptor.geometry.frameWidth
    || descriptor.tiles.tileHeight !== descriptor.geometry.frameHeight
    || descriptor.tiles.columns !== descriptor.geometry.columns
    || descriptor.tiles.rows !== descriptor.geometry.rows
  )) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Tile metadata must match declared geometry", path: ["tiles"] });
  }
});

/** A validated media-specific descriptor with no direct physical path. */
export type AssetContractV2PhysicalDescriptor = z.infer<typeof assetContractV2PhysicalDescriptorSchema>;

/** Validates the opt-in bridge from a semantic state to a descriptor-driven presentation. */
export const assetContractV2AdapterDeclarationSchema = z.object({
  semantic: assetContractV2SemanticRequirementSchema,
  descriptorId: descriptorIdSchema,
  behavior: z.literal("descriptor-driven"),
}).strict();

/** A declaration that lets presentation own clips while gameplay owns semantic state. */
export type AssetContractV2AdapterDeclaration = z.infer<typeof assetContractV2AdapterDeclarationSchema>;

/** Error raised when untrusted Asset Contract v2 configuration is rejected. */
export class AssetContractV2ValidationError extends Error {
  /** Creates an error with the public code for the failed validation boundary. */
  constructor(readonly code: AssetContractV2FailureCode, message: string) {
    super(message);
    this.name = "AssetContractV2ValidationError";
  }
}

function failureCodeForDescriptorIssues(issues: readonly z.ZodIssue[]): AssetContractV2FailureCode {
  if (issues.some((issue) => issue.path[0] === "catalogEntryKey")) return "unsafe-physical-path";
  if (issues.some((issue) => issue.path[0] === "release")) return "stale-release-identity";
  if (issues.some((issue) => issue.path[0] === "mediaKind")) return "unsupported-media";
  return "incompatible-descriptor";
}

/** Serializes JSON data with stable object-key order for descriptor integrity hashing. */
function stableJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  const record = value as Readonly<Record<string, unknown>>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

/**
 * Serializes presentation-owned descriptor content without its separately pinned release identity.
 * @param candidate Untrusted physical descriptor candidate.
 * @returns Canonical content bytes whose digest can be accepted before the successor release is minted.
 * @throws When the descriptor structure is invalid.
 */
export function serializeAssetContractV2PhysicalDescriptorPayload(candidate: unknown): string {
  const descriptor = assetContractV2PhysicalDescriptorSchema.parse(candidate);
  const { release: _release, ...presentationPayload } = descriptor;
  return stableJson(presentationPayload);
}

/**
 * Validates untrusted descriptor configuration against one exact release identity.
 * @param candidate Untrusted descriptor configuration.
 * @param expectedReleaseCandidate Exact release identity the descriptor must pin.
 * @returns The typed descriptor when all fail-closed invariants pass.
 * @throws When the descriptor has an unsafe key, stale release identity, unsupported media, or incompatible metadata.
 */
export function validateAssetContractV2DescriptorForRelease(
  candidate: unknown,
  expectedReleaseCandidate: unknown,
): AssetContractV2PhysicalDescriptor {
  const result = assetContractV2PhysicalDescriptorSchema.safeParse(candidate);
  if (!result.success) {
    const code = failureCodeForDescriptorIssues(result.error.issues);
    throw new AssetContractV2ValidationError(code, `Asset Contract v2 descriptor is invalid: ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  }
  const expectedRelease = assetContractV2ReleaseIdentitySchema.strip().parse(expectedReleaseCandidate);
  if (
    result.data.release.version !== expectedRelease.version
    || result.data.release.catalogDigest !== expectedRelease.catalogDigest
    || result.data.release.sourceReceiptDigest !== expectedRelease.sourceReceiptDigest
  ) {
    throw new AssetContractV2ValidationError(
      "stale-release-identity",
      "Asset Contract v2 descriptor does not pin the expected accepted release",
    );
  }
  return Object.freeze(result.data);
}

/**
 * Validates a descriptor against the root accepted standard-pack release.
 * @param candidate Untrusted descriptor configuration.
 * @returns The typed root-release descriptor when all fail-closed invariants pass.
 * @throws When the descriptor is invalid or does not pin the root accepted release.
 */
export function validateAssetContractV2Descriptor(candidate: unknown): AssetContractV2PhysicalDescriptor {
  return validateAssetContractV2DescriptorForRelease(candidate, ACCEPTED_STANDARD_ASSET_RELEASE);
}


/** One deterministic descriptor-owned presentation selection. */
export type AssetContractV2PresentationSelection =
  | Readonly<{
    kind: "image";
    semantic: AssetContractV2SemanticRequirement;
    descriptorId: string;
    catalogEntryKey: string;
    anchor: AssetContractV2Anchor;
    renderScale: number;
  }>
  | Readonly<{
    kind: "clip";
    semantic: AssetContractV2SemanticRequirement;
    descriptorId: string;
    catalogEntryKey: string;
    direction: AssetContractV2Direction["direction"];
    clipId: string;
    frames: readonly AssetContractV2FrameCoordinate[];
    fps: number;
    loop: boolean;
    anchor: AssetContractV2Anchor;
    renderScale: number;
  }>
  | Readonly<{
    kind: "tileset";
    semantic: AssetContractV2SemanticRequirement;
    descriptorId: string;
    catalogEntryKey: string;
    tiles: NonNullable<AssetContractV2PhysicalDescriptor["tiles"]>;
    anchor: AssetContractV2Anchor;
    renderScale: number;
  }>
  | Readonly<{
    kind: "ui";
    semantic: AssetContractV2SemanticRequirement;
    descriptorId: string;
    catalogEntryKey: string;
    nineSlice: AssetContractV2PhysicalDescriptor["nineSlice"];
    anchor: AssetContractV2Anchor;
    renderScale: number;
  }>
  | Readonly<{
    kind: "audio";
    semantic: AssetContractV2SemanticRequirement;
    descriptorId: string;
    catalogEntryKey: string;
    durationMs: number;
    channels: 1 | 2;
    loop: boolean;
  }>;

/** A pure adapter that binds semantic requests to descriptor-defined presentation behavior. */
export interface DescriptorDrivenPresentationAdapter {
  /**
   * Selects presentation behavior for one semantic request without mutating gameplay state.
   * @param requirement The gameplay-owned role/state request.
   * @param direction The presentation direction required for an animated descriptor.
   * @returns Immutable descriptor-owned behavior for the semantic request.
   * @throws When the semantic request is unmapped or an animation direction is absent or unsupported.
   */
  select(
    requirement: AssetContractV2SemanticRequirement,
    direction?: AssetContractV2Direction["direction"],
  ): AssetContractV2PresentationSelection;
}

function semanticRequirementIdentity(requirement: AssetContractV2SemanticRequirement): string {
  return `${requirement.role}:${requirement.state}`;
}

function copyAnchor(anchor: AssetContractV2Anchor): AssetContractV2Anchor {
  return Object.freeze({ x: anchor.x, y: anchor.y });
}

function presentationBase(
  semantic: AssetContractV2SemanticRequirement,
  descriptor: AssetContractV2PhysicalDescriptor,
): Readonly<{ semantic: AssetContractV2SemanticRequirement; descriptorId: string; catalogEntryKey: string }> {
  return Object.freeze({
    semantic: Object.freeze({ role: semantic.role, state: semantic.state }),
    descriptorId: descriptor.descriptorId,
    catalogEntryKey: descriptor.catalogEntryKey,
  });
}

/**
 * Creates a deterministic adapter that lets gameplay select semantics while descriptors select playback behavior.
 * @param declarations Untrusted semantic-to-descriptor declarations.
 * @param registrations Resolver-issued semantic registrations that bind descriptors to accepted catalog provenance.
 * @returns A pure, fail-closed presentation adapter with no fixed frame-count contract.
 * @throws When declarations or descriptors are invalid, duplicated, or reference missing descriptors.
 */
export function createDescriptorDrivenPresentationAdapter(
  declarations: readonly unknown[],
  registrations: readonly AssetContractV2SemanticRegistration[],
): DescriptorDrivenPresentationAdapter {
  const validatedDeclarations = declarations.map((candidate) => assetContractV2AdapterDeclarationSchema.parse(candidate));
  const descriptorById = new Map<string, AssetContractV2PhysicalDescriptor>();
  const catalogEntryKeys = new Set<string>();
  for (const registration of registrations) {
    if (!isIssuedAssetContractV2SemanticRegistration(registration)) {
      throw new AssetContractV2ValidationError(
        "missing-descriptor",
        "Descriptor-driven presentation accepts only registrations issued by the descriptor-aware resolver",
      );
    }
    const descriptor = registration.descriptor;
    if (registration.semanticKey !== descriptor.catalogEntryKey) {
      throw new AssetContractV2ValidationError(
        "incompatible-descriptor",
        "Resolver-issued registration does not match its descriptor catalog key",
      );
    }
    if (descriptorById.has(descriptor.descriptorId)) {
      throw new AssetContractV2ValidationError("duplicate-physical-source", `Duplicate descriptor id ${JSON.stringify(descriptor.descriptorId)}`);
    }
    if (catalogEntryKeys.has(descriptor.catalogEntryKey)) {
      throw new AssetContractV2ValidationError(
        "duplicate-physical-source",
        "Multiple descriptors must not alias one catalog source",
      );
    }
    catalogEntryKeys.add(descriptor.catalogEntryKey);
    descriptorById.set(descriptor.descriptorId, descriptor);
  }
  const declarationBySemantic = new Map<string, AssetContractV2AdapterDeclaration>();
  for (const declaration of validatedDeclarations) {
    const identity = semanticRequirementIdentity(declaration.semantic);
    if (declarationBySemantic.has(identity)) {
      throw new AssetContractV2ValidationError("incompatible-descriptor", `Duplicate semantic adapter declaration ${JSON.stringify(identity)}`);
    }
    if (!descriptorById.has(declaration.descriptorId)) {
      throw new AssetContractV2ValidationError("missing-descriptor", `Semantic adapter declaration ${JSON.stringify(identity)} references a missing descriptor`);
    }
    declarationBySemantic.set(identity, declaration);
  }
  return Object.freeze({
    select(requirement: AssetContractV2SemanticRequirement, direction?: AssetContractV2Direction["direction"]) {
      const semantic = assetContractV2SemanticRequirementSchema.parse(requirement);
      const identity = semanticRequirementIdentity(semantic);
      const declaration = declarationBySemantic.get(identity);
      if (!declaration) throw new AssetContractV2ValidationError("missing-descriptor", `Unmapped semantic presentation request ${JSON.stringify(identity)}`);
      const descriptor = descriptorById.get(declaration.descriptorId);
      if (!descriptor) throw new AssetContractV2ValidationError("missing-descriptor", `Descriptor ${JSON.stringify(declaration.descriptorId)} is missing`);
      const base = presentationBase(semantic, descriptor);
      if (descriptor.mediaKind === "audio") {
        if (!descriptor.audio) throw new AssetContractV2ValidationError("incompatible-descriptor", "Audio descriptor lacks audio metadata");
        return Object.freeze({ ...base, kind: "audio" as const, ...descriptor.audio });
      }
      if (descriptor.mediaKind === "tileset") {
        if (!descriptor.tiles) throw new AssetContractV2ValidationError("incompatible-descriptor", "Tileset descriptor lacks tile metadata");
        return Object.freeze({ ...base, kind: "tileset" as const, tiles: Object.freeze({ ...descriptor.tiles }), anchor: copyAnchor(descriptor.anchor), renderScale: descriptor.renderScale });
      }
      if (descriptor.mediaKind === "ui") {
        return Object.freeze({ ...base, kind: "ui" as const, nineSlice: descriptor.nineSlice ? Object.freeze({ ...descriptor.nineSlice }) : undefined, anchor: copyAnchor(descriptor.anchor), renderScale: descriptor.renderScale });
      }
      if (descriptor.mediaKind === "image") {
        return Object.freeze({ ...base, kind: "image" as const, anchor: copyAnchor(descriptor.anchor), renderScale: descriptor.renderScale });
      }
      if (!direction) throw new AssetContractV2ValidationError("incompatible-descriptor", "Descriptor-driven animation requires a direction");
      const mapping = descriptor.directions?.find((candidate) => candidate.direction === direction);
      if (!mapping) throw new AssetContractV2ValidationError("incompatible-descriptor", `Descriptor does not define direction ${JSON.stringify(direction)}`);
      const clip = descriptor.clips?.find((candidate) => candidate.id === mapping.clipId);
      if (!clip) throw new AssetContractV2ValidationError("incompatible-descriptor", `Descriptor direction ${JSON.stringify(direction)} lacks a clip`);
      return Object.freeze({
        ...base,
        kind: "clip" as const,
        direction,
        clipId: clip.id,
        frames: Object.freeze(clip.frames.map((frame) => Object.freeze({ column: frame.column, row: frame.row }))),
        fps: clip.timing.fps,
        loop: clip.timing.loop,
        anchor: copyAnchor(descriptor.anchor),
        renderScale: descriptor.renderScale,
      });
    },
  });
}


/** Immutable compatibility statement for the additive v2 surface. */
export interface AssetContractV2CompatibilityReport {
  /** Public v2 schema version. */
  readonly contractVersion: typeof ASSET_CONTRACT_V2_VERSION;
  /** Exact accepted v1 release identity retained for compatibility evidence. */
  readonly acceptedStandardPackRelease: AssetContractV2ReleaseIdentity;
  /** The T11 fields existing consumers must continue to pin. */
  readonly t11Inputs: readonly ["version", "catalogDigest", "sourceReceiptDigest"];
  /** Explicit migration boundary that prevents silent v1 adoption. */
  readonly adoption: Readonly<{ explicitOptInRequired: true; v1ConsumersRemainV1Only: true }>;
  /** Product work that this contract cannot authorize. */
  readonly prohibitedScopes: readonly ["suitability", "ingestion", "legacy-cartridge-migration", "deployment"];
}

/**
 * Creates an immutable compatibility report that preserves accepted v1/T11 evidence while keeping v2 opt-in.
 * @returns The public compatibility and migration boundary for Asset Contract v2.
 */
export function createAssetContractV2CompatibilityReport(): AssetContractV2CompatibilityReport {
  return Object.freeze({
    contractVersion: ASSET_CONTRACT_V2_VERSION,
    acceptedStandardPackRelease: Object.freeze({
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    }),
    t11Inputs: Object.freeze(["version", "catalogDigest", "sourceReceiptDigest"] as const),
    adoption: Object.freeze({ explicitOptInRequired: true, v1ConsumersRemainV1Only: true }),
    prohibitedScopes: Object.freeze(["suitability", "ingestion", "legacy-cartridge-migration", "deployment"] as const),
  });
}
