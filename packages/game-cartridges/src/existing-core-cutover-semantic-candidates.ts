/**
 * Per-title semantic-adoption candidates for the existing-core cutover cohort.
 *
 * Five titles — Dragon Flight, Magic Defense, Dungeon Liberator, The Sorcerer
 * Ziggurat, and Astral Mage — are scoped for vertical revalidation and cutover
 * by the accepted readiness receipt `d371fc5d…f1720`. T10 and T11 approve
 * zero legacy asset mappings and zero runtime contracts, so this module emits
 * **candidates only** — never approved, proved, accepted, or consumable
 * bindings. Every role/state requirement must already exist in
 * `OWNER_APPROVED_CANONICAL_BINDINGS`; legacy evidence is used solely to
 * justify why the candidate requests the role/state, never to invent a new
 * binding.
 *
 * Selected-union materialization is performed exclusively through the T11
 * resolver (`createSemanticAssetResolver`) and the accepted standard-pack
 * release (`ACCEPTED_STANDARD_ASSET_RELEASE`, version `2026.07.23`). Direct
 * concrete asset locations and full-pack delivery are rejected by construction.
 *
 * No candidate is added to the public `cartridgeCatalog` or
 * `cartridgeLoaders` exports. They live behind a separate module path so the
 * quarantine remains intact and downstream consumers must explicitly
 * materialize them through the T11 APIs.
 */

import {
  OWNER_APPROVED_CANONICAL_BINDINGS,
  createSemanticAssetResolver,
  validateSemanticProductBindings,
  type SemanticAssetRequirement,
  type SemanticProductAssetResolver,
  type StandardAssetResolver,
} from "@reading-advantage/advantage-play-kit/assets";

import { EXISTING_CORE_FIXTURES_TYPED, type CoreCutoverFixture } from "./existing-core-cutover.evidence.types.js";

/** Classification: per-title semantic-adoption candidate, never approved. */
export const CANDIDATE_CLASSIFICATION = "per-title-semantic-adoption-candidate" as const;

/** Status: candidate, never "proved", "accepted", or "consumable". */
export const CANDIDATE_STATUS = "candidate" as const;

/** Selected-union materialization policy, inherited from T11. */
export const CANDIDATE_MATERIALIZATION = "accepted-cartridge-selected-union-only" as const;

/** Per-title evidence phase recorded by accepted T3/T4/T5/T6/T7 cohorts. */
export type CandidateEvidencePhase = "T3" | "T4" | "T5" | "T6" | "T7";

/** Cartridge input mode (frozen educational ABI). */
export type CandidateInputMode = "vocabulary" | "sentence";

/** Temporal scope of the evidence claim that motivates a role/state. */
export type CandidateTemporalScope = "current-source" | "historical-source-only";

/** One evidence-backed role/state requirement that binds a standard-pack key. */
export interface CandidateRoleStateRequirement {
  /** Semantic role requested by the title (e.g. "player", "feedback"). */
  readonly role: string;
  /** Semantic state requested by the title (e.g. "idle", "correct"). */
  readonly state: string;
  /** Accepted evidence claim identifier that motivates this role/state. */
  readonly evidenceClaimId: string;
  /** Human-readable fact describing why the mechanic needs this role/state. */
  readonly evidenceFact: string;
  /** Temporal scope of the motivating evidence. */
  readonly temporalScope: CandidateTemporalScope;
}

/** Per-title semantic-adoption candidate (never approved or consumable). */
export interface ExistingCoreSemanticAdoptionCandidate {
  readonly classification: typeof CANDIDATE_CLASSIFICATION;
  readonly status: typeof CANDIDATE_STATUS;
  /** Explicit fail-closed flag: candidates are not consumable. */
  readonly consumable: false;
  readonly publicId: string;
  readonly canonicalId: string;
  readonly title: string;
  readonly inputMode: CandidateInputMode;
  readonly evidencePhase: CandidateEvidencePhase;
  /** SHA-256 of the accepted evidence ledger this candidate cites. */
  readonly acceptedEvidenceSha256: string;
  /** Evidence-backed role/state requirements (no invented or legacy bindings). */
  readonly roleStateRequirements: readonly CandidateRoleStateRequirement[];
  /** T11 selected-union materialization policy. */
  readonly materialization: typeof CANDIDATE_MATERIALIZATION;
  /** Optional temporal scope of the strongest evidence available. */
  readonly evidenceTemporalScope: CandidateTemporalScope;
}

/** T11 role/state pair resolved to an owner-approved semantic key. */
export interface CandidateResolvedRoleState {
  readonly role: string;
  readonly state: string;
  readonly evidenceClaimId: string;
  /** Bound standard-pack key. */
  readonly semanticKey: string;
}

/** Deterministic selected-union output for one per-title candidate. */
export interface ExistingCoreCandidateSelectedUnion {
  readonly publicId: string;
  /** Sorted, deduplicated semantic keys required by the candidate. */
  readonly semanticKeys: readonly string[];
  /** Resolved role/state pairs with their owner-approved semantic keys. */
  readonly resolved: readonly CandidateResolvedRoleState[];
}

/** Compile-time fixture list sourced from the accepted evidence JSON. */
const FIXTURES = EXISTING_CORE_FIXTURES_TYPED.titles as readonly CoreCutoverFixture[];

/** Owner-approved canonical role/state binding manifest. */
const OWNER_BINDINGS = validateSemanticProductBindings(OWNER_APPROVED_CANONICAL_BINDINGS);

/** Identity set of every role/state the owner has approved. */
const OWNER_APPROVED_IDENTITIES = new Set(
  OWNER_BINDINGS.bindings.map((binding) => `${binding.role}:${binding.state}`),
);

/** Identity → semantic key lookup. */
const OWNER_APPROVED_KEY_BY_IDENTITY = new Map(
  OWNER_BINDINGS.bindings.map((binding) => [`${binding.role}:${binding.state}`, binding.semanticKey]),
);

/**
 * Builds the role/state requirements for one title from its accepted claim ledger.
 * @param fixture The evidence fixture for the title.
 * @returns One role/state requirement per selected claim, all evidence-anchored.
 */
function deriveRoleStateRequirements(
  fixture: CoreCutoverFixture,
): readonly CandidateRoleStateRequirement[] {
  const mechanics = fixture.mechanicFacts;
  const roleStateByClaim: CandidateRoleStateRequirement[] = [];

  for (const fact of mechanics) {
    if (fixture.publicId === "dragon-flight") {
      // DF: gate-selection reducer; needs a player token, success feedback, and
      // a control affordance to advance gates.
      if (fact.claimId === "DF-MECH-003" || fact.claimId === "DF-MECH-009") {
        roleStateByClaim.push({
          role: "player",
          state: "idle",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
      if (fact.claimId === "DF-MECH-008") {
        roleStateByClaim.push({
          role: "feedback",
          state: "correct",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
        roleStateByClaim.push({
          role: "audio-feedback",
          state: "correct",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
    } else if (fixture.publicId === "magic-defense") {
      // MD: translation-defense with three castles; needs a player, success
      // feedback, a status badge, and a panel slot for the castle HP UI.
      if (fact.claimId === "MD-MECH-005") {
        roleStateByClaim.push({
          role: "panel",
          state: "default",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
        roleStateByClaim.push({
          role: "status",
          state: "armor",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
      if (fact.claimId === "MD-MECH-017") {
        roleStateByClaim.push({
          role: "feedback",
          state: "correct",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
        roleStateByClaim.push({
          role: "audio-feedback",
          state: "correct",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
    } else if (fixture.publicId === "dungeon-liberator") {
      // DL: ordered prisoner collection with monsters and a portal; needs a
      // player, an enemy, success feedback, and a control affordance for the
      // portal entry.
      if (fact.claimId === "DL-COLL-001") {
        roleStateByClaim.push({
          role: "player",
          state: "idle",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
        roleStateByClaim.push({
          role: "feedback",
          state: "correct",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
      if (fact.claimId === "DL-COLL-002") {
        roleStateByClaim.push({
          role: "enemy",
          state: "idle",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
      if (fact.claimId === "DL-TRANS-001") {
        roleStateByClaim.push({
          role: "control",
          state: "confirm",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
    } else if (fixture.publicId === "sorcerer-ziggurat") {
      // SZ: historical step-graph; needs a player, success feedback, and a
      // control affordance for completion. (historical-source-only)
      if (fact.claimId === "SZ-HIST-006") {
        roleStateByClaim.push({
          role: "player",
          state: "idle",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
        roleStateByClaim.push({
          role: "feedback",
          state: "correct",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
      if (fact.claimId === "SZ-HIST-009") {
        roleStateByClaim.push({
          role: "control",
          state: "confirm",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
    } else if (fixture.publicId === "astral-mage") {
      // AM: historical target-action; needs a player, success feedback, and
      // audio feedback for the correct stable-target hit. (historical-source-only)
      if (fact.claimId === "AM-HIST-004") {
        roleStateByClaim.push({
          role: "player",
          state: "idle",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
      if (fact.claimId === "AM-HIST-005") {
        roleStateByClaim.push({
          role: "feedback",
          state: "correct",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
        roleStateByClaim.push({
          role: "audio-feedback",
          state: "correct",
          evidenceClaimId: fact.claimId,
          evidenceFact: fact.fact,
          temporalScope: fact.temporalScope,
        });
      }
    }
  }
  return Object.freeze(roleStateByClaim);
}

/** Per-title candidate definitions, derived from the accepted evidence ledger. */
export const EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES: readonly ExistingCoreSemanticAdoptionCandidate[] = Object.freeze(
  FIXTURES.map((fixture) => {
    const roleStateRequirements = deduplicateRoleStateRequirements(deriveRoleStateRequirements(fixture));
    if (roleStateRequirements.length === 0) {
      throw new Error(
        `Existing-core cutover candidate for ${fixture.publicId} derived zero evidence-backed role/state requirements`,
      );
    }
    return Object.freeze({
      classification: CANDIDATE_CLASSIFICATION,
      status: CANDIDATE_STATUS,
      consumable: false as const,
      publicId: fixture.publicId,
      canonicalId: fixture.canonicalId,
      title: fixture.title,
      inputMode: fixture.inputMode,
      evidencePhase: fixture.evidencePhase as CandidateEvidencePhase,
      acceptedEvidenceSha256: fixture.acceptedEvidence.sha256,
      roleStateRequirements: Object.freeze(roleStateRequirements),
      materialization: CANDIDATE_MATERIALIZATION,
      evidenceTemporalScope: fixture.mechanicFacts.some(
        (fact) => fact.temporalScope === "current-source",
      )
        ? "current-source"
        : "historical-source-only",
    });
  }),
);

/** Build a lookup of publicId → candidate for fast test access. */
const CANDIDATES_BY_PUBLIC_ID = new Map(
  EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => [candidate.publicId, candidate]),
);

/** All publicIds covered by the candidate list. */
export const EXISTING_CORE_CANDIDATE_PUBLIC_IDS: readonly string[] = Object.freeze(
  EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => candidate.publicId),
);

/**
 * Returns the candidate for one publicId, or undefined when absent.
 * @param publicId The cartridge publicId (e.g. "dragon-flight").
 * @returns The matching candidate, or undefined when none is defined.
 */
export function getExistingCoreSemanticAdoptionCandidate(
  publicId: string,
): ExistingCoreSemanticAdoptionCandidate | undefined {
  return CANDIDATES_BY_PUBLIC_ID.get(publicId);
}

/**
 * Asserts that every role/state requirement in a candidate is owner-approved
 * and that its usage is consistent with the owner binding.
 * @param candidate The candidate to validate.
 * @throws When any role/state is unmapped or inconsistent.
 */
export function assertCandidateRoleStatesOwnerApproved(
  candidate: ExistingCoreSemanticAdoptionCandidate,
): void {
  const identities = new Set<string>();
  for (const requirement of candidate.roleStateRequirements) {
    const identity = `${requirement.role}:${requirement.state}`;
    if (identities.has(identity)) {
      throw new Error(
        `Candidate ${candidate.publicId} duplicates role/state ${identity}; owner-approved bindings are deduplicated`,
      );
    }
    identities.add(identity);
    if (!OWNER_APPROVED_IDENTITIES.has(identity)) {
      throw new UnmappedCandidateRoleStateError(candidate.publicId, identity);
    }
    if (!requirement.evidenceClaimId) {
      throw new Error(
        `Candidate ${candidate.publicId} role/state ${identity} lacks an evidence claim id`,
      );
    }
  }
}

/** Deduplicate role/state requirements while preserving the first evidence claim. */
function deduplicateRoleStateRequirements(
  requirements: readonly CandidateRoleStateRequirement[],
): readonly CandidateRoleStateRequirement[] {
  const seen = new Set<string>();
  const deduped: CandidateRoleStateRequirement[] = [];
  for (const requirement of requirements) {
    const identity = `${requirement.role}:${requirement.state}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    deduped.push(requirement);
  }
  return Object.freeze(deduped);
}

/** Rejection for any candidate that misrepresents itself as consumable. */
export class PrematureConsumabilityError extends Error {
  public constructor(publicId: string) {
    super(
      `Existing-core cutover candidate ${publicId} is not consumable; `
      + "host completion, retirement evidence, and product-owner acceptance remain blocking",
    );
    this.name = "PrematureConsumabilityError";
  }
}

/**
 * Rejects any candidate that is misclassified as consumable. The candidate
 * classification is fixed to `candidate` and the consumable flag is fixed to
 * `false`; this guard is a fail-closed double-check before materialization.
 * @param candidate The candidate to guard.
 * @throws Always when the candidate claims consumability.
 */
export function assertCandidateNotConsumable(
  candidate: ExistingCoreSemanticAdoptionCandidate,
): void {
  if (candidate.consumable !== false) {
    throw new PrematureConsumabilityError(candidate.publicId);
  }
  if (candidate.status !== CANDIDATE_STATUS) {
    throw new PrematureConsumabilityError(candidate.publicId);
  }
  if (candidate.classification !== CANDIDATE_CLASSIFICATION) {
    throw new PrematureConsumabilityError(candidate.publicId);
  }
}

/**
 * Converts one candidate's role/state requirements into the T11 input format.
 * @param candidate The candidate to convert.
 * @returns Sorted, deduplicated T11 semantic asset requirements.
 */
export function toSemanticAssetRequirements(
  candidate: ExistingCoreSemanticAdoptionCandidate,
): readonly SemanticAssetRequirement[] {
  const seen = new Set<string>();
  const requirements: SemanticAssetRequirement[] = [];
  for (const requirement of candidate.roleStateRequirements) {
    const identity = `${requirement.role}:${requirement.state}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    requirements.push(Object.freeze({ role: requirement.role, state: requirement.state }));
  }
  return Object.freeze(requirements.sort((left, right) => {
    return `${left.role}:${left.state}`.localeCompare(`${right.role}:${right.state}`);
  }));
}

/**
 * Materializes the deterministic selected union for one candidate through the
 * T11 resolver. The resolver is the only release authority.
 * @param candidate The candidate to materialize.
 * @param resolver A T11 semantic resolver bound to the accepted release.
 * @returns The deterministic selected-union output.
 */
export function materializeCandidateSelectedUnion(
  candidate: ExistingCoreSemanticAdoptionCandidate,
  resolver: SemanticProductAssetResolver,
): ExistingCoreCandidateSelectedUnion {
  assertCandidateNotConsumable(candidate);
  assertCandidateRoleStatesOwnerApproved(candidate);
  const selection = resolver.select(toSemanticAssetRequirements(candidate));
  const resolved: CandidateResolvedRoleState[] = candidate.roleStateRequirements
    .map((requirement) => {
      const identity = `${requirement.role}:${requirement.state}`;
      const entry = resolver.resolve({ role: requirement.role, state: requirement.state });
      const semanticKey = OWNER_APPROVED_KEY_BY_IDENTITY.get(identity);
      if (!semanticKey) {
        throw new Error(
          `Candidate ${candidate.publicId} lost owner-approved binding for ${identity} during materialization`,
        );
      }
      if (semanticKey !== entry.key) {
        throw new Error(
          `Candidate ${candidate.publicId} resolved key ${entry.key} does not match owner binding ${semanticKey}`,
        );
      }
      return Object.freeze({
        role: requirement.role,
        state: requirement.state,
        evidenceClaimId: requirement.evidenceClaimId,
        semanticKey: entry.key,
      });
    })
    .sort((left, right) => `${left.role}:${left.state}`.localeCompare(`${right.role}:${right.state}`));
  return Object.freeze({
    publicId: candidate.publicId,
    semanticKeys: selection.semanticKeys,
    resolved: Object.freeze(resolved),
  });
}

/** Rejection when a role/state identity is not in OWNER_APPROVED_CANONICAL_BINDINGS. */
export class UnmappedCandidateRoleStateError extends Error {
  public constructor(publicId: string, identity: string) {
    super(
      `Candidate ${publicId} requires unmapped role/state ${identity}; `
      + "T10/T11 approve zero legacy asset mappings so this requirement cannot be resolved",
    );
    this.name = "UnmappedCandidateRoleStateError";
  }
}

/**
 * Returns the owner-approved canonical role/state binding manifest, so test
 * code can recompute the identity set without re-validating the manifest.
 * @returns The validated OWNER_APPROVED_CANONICAL_BINDINGS value.
 */
export function getOwnerApprovedCanonicalBindings() {
  return OWNER_BINDINGS;
}

/**
 * Builds a T11 semantic resolver bound to the accepted release. Tests can
 * pass an accepted base resolver produced by the advantage-play-kit release
 * machinery.
 * @param baseResolver An accepted semantic-key resolver.
 * @returns A semantic role/state resolver that materializes selected unions.
 */
export function buildCandidateResolver(
  baseResolver: StandardAssetResolver,
): SemanticProductAssetResolver {
  return createSemanticAssetResolver(baseResolver, OWNER_BINDINGS);
}
