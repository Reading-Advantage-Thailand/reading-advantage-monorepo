/** Empty public catalog used while APK cartridges are rebuilt correctly. */
export * from "./catalog";

/** Title-local deterministic replay rules for Dragon Rider host-proof attempts. */
export {
  assertDragonRiderHostProofVictory,
  DRAGON_RIDER_HOST_PROOF_CLAIM_IDS,
  DRAGON_RIDER_HOST_PROOF_REQUIRED_ASSET_BINDINGS,
  dragonRiderHostProofActionSchema,
  dragonRiderHostProofClientActionSubmissionSchema,
  dragonRiderHostProofInputSchema,
  replayDragonRiderHostProofTranscript,
} from "./dragon-rider-host-proof.js";
export type {
  DragonRiderHostProofAction,
  DragonRiderHostProofRecordedAction,
  DragonRiderHostProofReplay,
  DragonRiderHostProofRound,
} from "./dragon-rider-host-proof.js";

/**
 * Per-title semantic-adoption candidates for the existing-core cutover
 * cohort. These are not public cartridges and are never added to
 * `cartridgeCatalog` or `cartridgeLoaders`; downstream consumers must import
 * the candidate module directly and materialize the selected union through
 * the T11 resolver.
 */
export {
  CANDIDATE_CLASSIFICATION,
  CANDIDATE_MATERIALIZATION,
  CANDIDATE_STATUS,
  EXISTING_CORE_CANDIDATE_PUBLIC_IDS,
  EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES,
  PrematureConsumabilityError,
  UnmappedCandidateRoleStateError,
  assertCandidateNotConsumable,
  assertCandidateRoleStatesOwnerApproved,
  buildCandidateResolver,
  getExistingCoreSemanticAdoptionCandidate,
  getOwnerApprovedCanonicalBindings,
  materializeCandidateSelectedUnion,
  toSemanticAssetRequirements,
} from "./existing-core-cutover-semantic-candidates.js";
export type {
  CandidateEvidencePhase,
  CandidateInputMode,
  CandidateResolvedRoleState,
  CandidateRoleStateRequirement,
  CandidateTemporalScope,
  ExistingCoreCandidateSelectedUnion,
  ExistingCoreSemanticAdoptionCandidate,
} from "./existing-core-cutover-semantic-candidates.js";
