import { isAcceptedStandardAssetResolver } from "./accepted-standard-pack-release.js";
import { validateAssetContractV2Descriptor } from "./asset-contract-v2.js";
import {
  validateStandardPackSuitabilityAcceptedDecisionManifest,
  validateStandardPackSuitabilityDossier,
} from "./standard-pack-suitability.js";
import type {
  AssetContractV2PhysicalDescriptor,
} from "./asset-contract-v2.js";
import type {
  StandardPackPhysicalBehaviorConstraints,
  StandardPackSuitabilityAcceptedDecisionManifest,
  StandardPackSuitabilityComparison,
  StandardPackSuitabilityDossier,
  StandardPackSuitabilityRequest,
} from "./standard-pack-suitability.js";
import type { StandardAssetResolver } from "./standard-pack-release.js";

type ResolvedCanonicalAsset = ReturnType<StandardAssetResolver["resolve"]>;

/** Module-private provenance for search facades issued from accepted resolvers. */
const issuedCanonicalSuitabilitySearches = new WeakSet<object>();

/** One canonical asset resolved exclusively through an accepted standard-pack resolver. */
export interface CanonicalSuitabilitySearchResult {
  /** Semantic key supplied by the caller-owned key index. */
  readonly semanticKey: string;
  /** Immutable canonical entry returned by the accepted resolver. */
  readonly asset: ResolvedCanonicalAsset;
}

/** Read-only search facade over caller-supplied semantic keys and accepted resolver output. */
export interface CanonicalSuitabilitySearch {
  /** Returns the exact accepted canonical entry for one indexed semantic key. */
  readonly resolve: (semanticKey: string) => CanonicalSuitabilitySearchResult;
  /** Returns indexed canonical entries whose semantic keys start with the supplied prefix. */
  readonly search: (prefix: string) => readonly CanonicalSuitabilitySearchResult[];
}

/** The technical comparison factors deterministically derived from a descriptor and canonical entry. */
export type CanonicalSuitabilityTechnicalFactors = Pick<
  StandardPackSuitabilityComparison,
  | "frameDirectionCompatibility"
  | "animationBehavior"
  | "geometry"
  | "collisionEnvelope"
  | "sourceReceipt"
>;

/** A descriptor-aware technical comparison that intentionally omits human visual and social judgments. */
export interface CanonicalSuitabilityTechnicalComparison {
  /** Canonical entry resolved through the accepted resolver. */
  readonly canonical: CanonicalSuitabilitySearchResult;
  /** Validated descriptor used for the technical comparison. */
  readonly descriptor: AssetContractV2PhysicalDescriptor;
  /** Deterministic behavior and provenance factors only. */
  readonly factors: Readonly<CanonicalSuitabilityTechnicalFactors>;
}

/** A validated accepted-reuse record that remains non-authorizing for product migration or deployment. */
export interface AcceptedCanonicalReuseSelection {
  /** Hash-bound draft dossier validated against the accepted manifest. */
  readonly dossier: StandardPackSuitabilityDossier;
  /** Owner- and reviewer-accepted manifest bound to the exact dossier digest. */
  readonly manifest: StandardPackSuitabilityAcceptedDecisionManifest;
  /** The selected canonical candidate semantic identity. */
  readonly semantic: StandardPackSuitabilityDossier["request"]["semantic"];
  /** The selected descriptor identity, without generating a semantic binding. */
  readonly descriptor: StandardPackSuitabilityDossier["candidates"][number]["descriptor"];
  /** Canonical entry resolved through the accepted resolver. */
  readonly canonical: CanonicalSuitabilitySearchResult;
}

/** Checks a caller-provided semantic key before any accepted resolver lookup. */
function assertSemanticKey(value: string): void {
  if (
    !value.trim()
    || value.startsWith("/")
    || value.includes("\\")
    || value.includes(".")
    || value.includes("//")
    || value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error("Canonical suitability search requires safe semantic keys, not physical paths");
  }
}

/** Ensures a caller can only use an accepted resolver instance issued after catalog verification. */
function assertAcceptedResolver(resolver: StandardAssetResolver): void {
  if (!isAcceptedStandardAssetResolver(resolver)) {
    throw new Error("Canonical suitability helpers require an accepted standard asset resolver");
  }
}

/** Ensures a facade was issued by this module from an accepted resolver. */
function assertIssuedCanonicalSuitabilitySearch(search: CanonicalSuitabilitySearch): void {
  if (!issuedCanonicalSuitabilitySearches.has(search)) {
    throw new Error("Canonical suitability helpers require an issued accepted-resolver search facade");
  }
}

/** Freezes a resolver-issued result without reading any catalog entry directly. */
function freezeSearchResult(semanticKey: string, asset: ResolvedCanonicalAsset): CanonicalSuitabilitySearchResult {
  return Object.freeze({ semanticKey, asset: Object.freeze(asset) });
}

/** Determines whether a visual descriptor physically matches the canonical entry returned by the resolver. */
function descriptorMatchesCanonicalAsset(
  descriptor: AssetContractV2PhysicalDescriptor,
  asset: ResolvedCanonicalAsset,
): boolean {
  if (descriptor.mediaKind === "audio") return asset.physical.kind === "audio";
  return asset.physical.kind === "image"
    && asset.physical.dimensions !== null
    && descriptor.geometry !== undefined
    && asset.physical.dimensions.width === descriptor.geometry.width
    && asset.physical.dimensions.height === descriptor.geometry.height;
}

/** Computes deterministic animation behavior compatibility without supplying visual or audience judgment. */
function compareAnimationBehavior(
  behavior: StandardPackPhysicalBehaviorConstraints,
  descriptor: AssetContractV2PhysicalDescriptor,
  physicalMatch: boolean,
): CanonicalSuitabilityTechnicalFactors["animationBehavior"] {
  if (behavior.mediaKind !== descriptor.mediaKind || !physicalMatch) return "fail";
  if (behavior.mediaKind !== "animation") return "not-applicable";
  const clips = descriptor.clips ?? [];
  return behavior.requiredClips.every((requiredClip) => clips.some((clip) => clip.id === requiredClip))
    ? "pass"
    : "fail";
}

/** Computes descriptor-owned direction and frame-count compatibility for one requested behavior. */
function compareFrameDirectionCompatibility(
  behavior: StandardPackPhysicalBehaviorConstraints,
  descriptor: AssetContractV2PhysicalDescriptor,
): CanonicalSuitabilityTechnicalFactors["frameDirectionCompatibility"] {
  if (behavior.mediaKind !== "animation") return "not-applicable";
  const clips = new Map((descriptor.clips ?? []).map((clip) => [clip.id, clip]));
  const directions = new Map((descriptor.directions ?? []).map((direction) => [direction.direction, direction.clipId]));
  const directionsMatch = behavior.requiredDirections.every((direction) => directions.has(direction));
  const frameCountMatches = behavior.requiredClips.every((requiredClip) => {
    const clip = clips.get(requiredClip);
    return clip !== undefined && (behavior.minimumFramesPerClip === null || clip.frames.length >= behavior.minimumFramesPerClip);
  });
  return directionsMatch && frameCountMatches ? "pass" : "fail";
}

/** Computes geometry compatibility from descriptor geometry and resolver-issued encoded dimensions. */
function compareGeometry(
  behavior: StandardPackPhysicalBehaviorConstraints,
  descriptor: AssetContractV2PhysicalDescriptor,
  physicalMatch: boolean,
): CanonicalSuitabilityTechnicalFactors["geometry"] {
  if (behavior.minimumGeometry === null) return "not-applicable";
  if (!physicalMatch || !descriptor.geometry) return "fail";
  return descriptor.geometry.width >= behavior.minimumGeometry.width
    && descriptor.geometry.height >= behavior.minimumGeometry.height
    ? "pass"
    : "fail";
}

/** Creates an accepted-resolver-only index from semantic keys without reading catalog records directly.
 * @param resolver Resolver instance issued after accepted-release verification.
 * @param semanticKeys Caller-owned semantic key index to resolve through the accepted resolver.
 * @returns An immutable index-constrained canonical search facade.
 * @throws When the resolver is unaccepted, a key is unsafe or unknown, or the index duplicates a key.
 */
export function createCanonicalSuitabilitySearch(
  resolver: StandardAssetResolver,
  semanticKeys: readonly string[],
): CanonicalSuitabilitySearch {
  assertAcceptedResolver(resolver);
  const entries = new Map<string, CanonicalSuitabilitySearchResult>();
  for (const semanticKey of semanticKeys) {
    assertSemanticKey(semanticKey);
    if (entries.has(semanticKey)) {
      throw new Error(`Canonical suitability search cannot index duplicate semantic key ${JSON.stringify(semanticKey)}`);
    }
    entries.set(semanticKey, freezeSearchResult(semanticKey, resolver.resolve(semanticKey)));
  }
  const indexed = Object.freeze([...entries.values()].sort((left, right) => left.semanticKey.localeCompare(right.semanticKey)));
  const search = Object.freeze({
    resolve(semanticKey: string): CanonicalSuitabilitySearchResult {
      assertSemanticKey(semanticKey);
      const entry = entries.get(semanticKey);
      if (!entry) throw new Error(`Canonical suitability search key is not indexed: ${JSON.stringify(semanticKey)}`);
      return entry;
    },
    search(prefix: string): readonly CanonicalSuitabilitySearchResult[] {
      assertSemanticKey(prefix);
      return Object.freeze(indexed.filter((entry) => entry.semanticKey.startsWith(prefix)));
    },
  });
  issuedCanonicalSuitabilitySearches.add(search);
  return search;
}

/** Compares requested technical behavior against one validated descriptor and caller-indexed canonical entry.
 * @param request Requested semantic and physical behavior constraints.
 * @param descriptorCandidate Untrusted Asset Contract v2 descriptor candidate.
 * @param search Accepted resolver-backed search facade that constrains physical lookup to indexed keys.
 * @returns Immutable deterministic technical factors without visual, audience, or localization verdicts.
 * @throws When the descriptor is invalid, stale, or its semantic key is not indexed.
 */
export function compareCanonicalSuitabilityDescriptor(
  request: StandardPackSuitabilityRequest,
  descriptorCandidate: unknown,
  search: CanonicalSuitabilitySearch,
): CanonicalSuitabilityTechnicalComparison {
  assertIssuedCanonicalSuitabilitySearch(search);
  const descriptor = validateAssetContractV2Descriptor(descriptorCandidate);
  const canonical = search.resolve(descriptor.catalogEntryKey);
  const physicalMatch = descriptorMatchesCanonicalAsset(descriptor, canonical.asset);
  const factors: CanonicalSuitabilityTechnicalFactors = {
    frameDirectionCompatibility: compareFrameDirectionCompatibility(request.behavior, descriptor),
    animationBehavior: compareAnimationBehavior(request.behavior, descriptor, physicalMatch),
    geometry: compareGeometry(request.behavior, descriptor, physicalMatch),
    collisionEnvelope: request.behavior.collisionEnvelopeRequired
      ? descriptor.collisionEnvelope ? "pass" : "fail"
      : "not-applicable",
    sourceReceipt: canonical.asset.sourceReceiptLocator.trim() ? "pass" : "fail",
  };
  return Object.freeze({ canonical, descriptor, factors: Object.freeze(factors) });
}

/** Validates and resolves the only accepted decision disposition that can reuse an indexed canonical entry.
 * @param dossierCandidate Untrusted draft suitability dossier.
 * @param manifestCandidate Untrusted owner-accepted suitability manifest.
 * @param search Accepted resolver-backed search facade that constrains physical lookup to indexed keys.
 * @returns A non-authorizing accepted canonical reuse selection.
 * @throws When evidence is stale, unaccepted, tampered, non-reuse, or selects a key outside the index.
 */
export async function resolveAcceptedCanonicalReuse(
  dossierCandidate: unknown,
  manifestCandidate: unknown,
  search: CanonicalSuitabilitySearch,
): Promise<AcceptedCanonicalReuseSelection> {
  assertIssuedCanonicalSuitabilitySearch(search);
  const dossier = await validateStandardPackSuitabilityDossier(dossierCandidate);
  const manifest = await validateStandardPackSuitabilityAcceptedDecisionManifest(dossier, manifestCandidate);
  if (manifest.decision.disposition !== "reuse-canonical") {
    throw new Error("Accepted suitability decision does not authorize canonical reuse");
  }
  const selected = dossier.candidates.find((candidate) => candidate.candidateId === manifest.decision.candidateId);
  if (
    !selected
    || selected.origin !== "canonical"
    || selected.requiresCanonicalIngestion
    || selected.descriptor.descriptorId !== manifest.decision.descriptorId
    || selected.descriptor.release === null
  ) {
    throw new Error("Accepted suitability decision does not select an exact canonical candidate");
  }
  const canonical = search.resolve(selected.descriptor.catalogEntryKey);
  return Object.freeze({
    dossier,
    manifest,
    semantic: Object.freeze({ ...selected.semantic }),
    descriptor: Object.freeze({ ...selected.descriptor }),
    canonical,
  });
}
