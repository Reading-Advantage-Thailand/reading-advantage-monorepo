import {
  OWNER_APPROVED_CANONICAL_BINDINGS,
  serializeAssetContractV2PhysicalDescriptorPayload,
  validateSemanticProductBindings,
} from "@reading-advantage/advantage-play-kit/assets";
import type {
  AssetContractV2SemanticRegistration,
  AssetContractV2SemanticResolver,
  SemanticAssetRequirement,
} from "@reading-advantage/advantage-play-kit/assets";

import { EXISTING_ACTION_TITLE_EVIDENCE } from "./existing-action-title-evidence.js";
import type {
  ExistingActionClaimEvidence,
  ExistingActionTitleEvidenceFixture,
} from "./existing-action-cutover.evidence.types.js";

/** Classification retained until independent host and retirement acceptance. */
export const EXISTING_ACTION_CANDIDATE_CLASSIFICATION = "per-title-semantic-adoption-candidate" as const;
/** Non-consumable lifecycle status for every title in this cohort. */
export const EXISTING_ACTION_CANDIDATE_STATUS = "candidate" as const;
/** T11 selected-union materialization boundary for each title. */
export const EXISTING_ACTION_CANDIDATE_MATERIALIZATION = "accepted-cartridge-selected-union-only" as const;

/** One title-specific role that maps only to an owner-approved semantic state. */
export interface ExistingActionRoleStateRequirement {
  /** Stable role name scoped to the candidate title rather than a generic game role. */
  readonly titleRole: string;
  /** T11 semantic role. */
  readonly role: string;
  /** T11 semantic state. */
  readonly state: string;
  /** Exact claim that bounds this title-specific role. */
  readonly evidenceClaim: Readonly<{
    claimId: string;
    locator: string;
    temporalScope: "historical-source-only" | "unknown";
  }>;
}

/** One non-consumable action title candidate. */
export interface ExistingActionSemanticAdoptionCandidate {
  /** Candidate classification, never a product binding. */
  readonly classification: typeof EXISTING_ACTION_CANDIDATE_CLASSIFICATION;
  /** Candidate status, never proved or accepted for cutover. */
  readonly status: typeof EXISTING_ACTION_CANDIDATE_STATUS;
  /** Explicit boundary preventing catalog and host consumption. */
  readonly consumable: false;
  /** Stable cartridge-facing title identifier. */
  readonly publicId: string;
  /** Stable evidence identity. */
  readonly canonicalId: string;
  /** Display title. */
  readonly title: string;
  /** Educational content shape. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Exact digest-pinned claim artifact. */
  readonly claimArtifact: Readonly<{ path: string; sha256: string }>;
  /** All evidence remains historical or explicitly unknown until a successor evidence package is accepted. */
  readonly temporalScope: "historical-source-only" | "unknown";
  /** Exact action claims that make synthesized progression fail closed. */
  readonly mechanicEvidence: readonly ExistingActionClaimEvidence[];
  /** Title-specific T11 role/state requirements. */
  readonly roleStateRequirements: readonly ExistingActionRoleStateRequirement[];
  /** Minimal selected-union policy. */
  readonly materialization: typeof EXISTING_ACTION_CANDIDATE_MATERIALIZATION;
}

/** One resolver-issued title role registration without a physical pack path. */
export interface ExistingActionResolvedRoleState {
  /** Stable title-scoped role identifier. */
  readonly titleRole: string;
  /** Owner-approved semantic role. */
  readonly role: string;
  /** Owner-approved semantic state. */
  readonly state: string;
  /** Exact historical or unknown evidence preventing mechanic promotion. */
  readonly evidenceClaim: ExistingActionRoleStateRequirement["evidenceClaim"];
  /** Resolved canonical semantic key. */
  readonly semanticKey: string;
  /** Exact v2 descriptor identity. */
  readonly descriptorId: string;
  /** Stable digest of descriptor presentation payload. */
  readonly descriptorDigest: string;
  /** Accepted release source receipt locator. */
  readonly sourceReceiptLocator: string;
}

/** Deterministic v2 selected-union output for one action title. */
export interface ExistingActionCandidateSelectedUnion {
  /** Stable selected title identity. */
  readonly publicId: string;
  /** Sorted, deduplicated semantic keys. */
  readonly semanticKeys: readonly string[];
  /** Resolver-issued registrations that contain no direct physical path. */
  readonly registrations: readonly AssetContractV2SemanticRegistration[];
  /** Title-specific role resolution and descriptor digests. */
  readonly resolved: readonly ExistingActionResolvedRoleState[];
}

const OWNER_BINDINGS = validateSemanticProductBindings(OWNER_APPROVED_CANONICAL_BINDINGS);
const OWNER_KEY_BY_IDENTITY = new Map(
  OWNER_BINDINGS.bindings.map((binding) => [`${binding.role}:${binding.state}`, binding.semanticKey]),
);

/** Calculates a deterministic browser-safe SHA-256 digest. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Converts title fixture role records to frozen candidate role requirements. */
function toRoleRequirements(
  fixture: ExistingActionTitleEvidenceFixture,
): readonly ExistingActionRoleStateRequirement[] {
  return Object.freeze(fixture.roles.map((role) => {
    const evidence = fixture.mechanicEvidence.find((claim) => claim.claimId === role.claimId);
    const temporalScope = evidence?.temporalScope ?? "historical-source-only";
    if (temporalScope === "current-source") {
      throw new Error(`Existing Action role ${role.titleRole} cannot promote current mechanic evidence into a Task 2 descriptor request`);
    }
    return Object.freeze({
      titleRole: role.titleRole,
      role: role.role,
      state: role.state,
      evidenceClaim: Object.freeze({
        claimId: role.claimId,
        locator: role.locator,
        temporalScope,
      }),
    });
  }));
}

/** Returns the strongest available scope without promoting historical evidence. */
function temporalScopeFor(fixture: ExistingActionTitleEvidenceFixture): "historical-source-only" | "unknown" {
  return fixture.mechanicEvidence.some((evidence) => evidence.temporalScope === "unknown")
    ? "unknown"
    : "historical-source-only";
}

/** Exact five candidates retained outside public catalogs and host registries. */
export const EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES: readonly ExistingActionSemanticAdoptionCandidate[] = Object.freeze(
  EXISTING_ACTION_TITLE_EVIDENCE.map((fixture) => Object.freeze({
    classification: EXISTING_ACTION_CANDIDATE_CLASSIFICATION,
    status: EXISTING_ACTION_CANDIDATE_STATUS,
    consumable: false as const,
    publicId: fixture.publicId,
    canonicalId: fixture.canonicalId,
    title: fixture.title,
    inputMode: fixture.inputMode,
    claimArtifact: Object.freeze({ ...fixture.claimArtifact }),
    temporalScope: temporalScopeFor(fixture),
    mechanicEvidence: Object.freeze(fixture.mechanicEvidence.map((evidence) => Object.freeze({ ...evidence }))),
    roleStateRequirements: toRoleRequirements(fixture),
    materialization: EXISTING_ACTION_CANDIDATE_MATERIALIZATION,
  })),
);

const CANDIDATE_BY_PUBLIC_ID = new Map(
  EXISTING_ACTION_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => [candidate.publicId, candidate]),
);

/** Returns one action candidate without exposing it through the production catalog. */
export function getExistingActionSemanticAdoptionCandidate(
  publicId: string,
): ExistingActionSemanticAdoptionCandidate | undefined {
  return CANDIDATE_BY_PUBLIC_ID.get(publicId);
}

/** Rejects candidates that attempt to bypass the QC-only lifecycle state. */
export function assertExistingActionCandidateNotConsumable(
  candidate: ExistingActionSemanticAdoptionCandidate,
): void {
  if (
    candidate.consumable !== false
    || candidate.status !== EXISTING_ACTION_CANDIDATE_STATUS
    || candidate.classification !== EXISTING_ACTION_CANDIDATE_CLASSIFICATION
  ) {
    throw new Error(`Existing Action candidate ${candidate.publicId} is not consumable before host proof and exact retirement acceptance`);
  }
}

/** Verifies title-specific roles, evidence locators, and owner-approved role/state bindings. */
export function assertExistingActionCandidateRoleStatesOwnerApproved(
  candidate: ExistingActionSemanticAdoptionCandidate,
): void {
  const seen = new Set<string>();
  for (const requirement of candidate.roleStateRequirements) {
    const identity = `${requirement.role}:${requirement.state}`;
    if (
      !requirement.titleRole.startsWith(`${candidate.publicId}-`)
      || !requirement.evidenceClaim.claimId
      || !requirement.evidenceClaim.locator
      || seen.has(identity)
      || !OWNER_KEY_BY_IDENTITY.has(identity)
    ) {
      throw new Error(`Existing Action candidate ${candidate.publicId} has an unmapped, duplicated, or unproven title role ${requirement.titleRole}`);
    }
    seen.add(identity);
  }
}

/** Fails closed unless all mechanic claims are explicitly current and supported. */
export function assertExistingActionProgressionEvidenceCurrent(
  candidate: ExistingActionSemanticAdoptionCandidate,
): void {
  const unsupported = candidate.mechanicEvidence.find((evidence) => (
    evidence.temporalScope !== "current-source" || evidence.disposition !== "supported"
  ));
  if (unsupported) {
    throw new Error(
      `Existing Action ${candidate.publicId} progression is blocked by ${unsupported.claimId} at ${unsupported.locator}: ${unsupported.disposition}`,
    );
  }
}

/** Converts one title's evidence-bound roles to v2 semantic requirements. */
export function toExistingActionSemanticAssetRequirements(
  candidate: ExistingActionSemanticAdoptionCandidate,
): readonly SemanticAssetRequirement[] {
  assertExistingActionCandidateRoleStatesOwnerApproved(candidate);
  return Object.freeze(candidate.roleStateRequirements
    .map((requirement) => Object.freeze({ role: requirement.role, state: requirement.state }))
    .sort((left, right) => `${left.role}:${left.state}`.localeCompare(`${right.role}:${right.state}`)));
}

/** Verifies only the descriptor-aware resolver boundary can materialize action registrations. */
export function buildExistingActionCandidateResolver(
  resolver: AssetContractV2SemanticResolver,
): AssetContractV2SemanticResolver {
  if (typeof resolver.resolve !== "function" || typeof resolver.select !== "function") {
    throw new Error("Existing Action candidates require an Asset Contract v2 descriptor-aware resolver");
  }
  return resolver;
}

/** Materializes one title's registered v2 selected union and descriptor digests. */
export async function materializeExistingActionCandidateSelectedUnion(
  candidate: ExistingActionSemanticAdoptionCandidate,
  resolver: AssetContractV2SemanticResolver,
): Promise<ExistingActionCandidateSelectedUnion> {
  assertExistingActionCandidateNotConsumable(candidate);
  assertExistingActionCandidateRoleStatesOwnerApproved(candidate);
  const descriptorResolver = buildExistingActionCandidateResolver(resolver);
  const selection = descriptorResolver.select(toExistingActionSemanticAssetRequirements(candidate));
  const registrations = Object.freeze([...selection.registrations]);
  const resolved = await Promise.all(candidate.roleStateRequirements.map(async (requirement) => {
    const registration = descriptorResolver.resolve({ role: requirement.role, state: requirement.state });
    const expectedKey = OWNER_KEY_BY_IDENTITY.get(`${requirement.role}:${requirement.state}`);
    if (registration.semanticKey !== expectedKey) {
      throw new Error(`Existing Action descriptor registration drift for ${candidate.publicId}:${requirement.titleRole}`);
    }
    return Object.freeze({
      titleRole: requirement.titleRole,
      role: requirement.role,
      state: requirement.state,
      evidenceClaim: requirement.evidenceClaim,
      semanticKey: registration.semanticKey,
      descriptorId: registration.descriptor.descriptorId,
      descriptorDigest: await sha256(serializeAssetContractV2PhysicalDescriptorPayload(registration.descriptor)),
      sourceReceiptLocator: registration.sourceReceiptLocator,
    });
  }));
  return Object.freeze({
    publicId: candidate.publicId,
    semanticKeys: selection.semanticKeys,
    registrations,
    resolved: Object.freeze(resolved.sort((left, right) => left.titleRole.localeCompare(right.titleRole))),
  });
}
