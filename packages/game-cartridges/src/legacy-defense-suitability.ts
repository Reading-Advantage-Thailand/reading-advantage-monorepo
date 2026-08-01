import {
  LEGACY_DEFENSE_CANONICAL_DESCRIPTORS,
  LEGACY_DEFENSE_SOURCE_MANIFESTS,
  LEGACY_DEFENSE_TASK2_ROLE_INPUTS,
  createLegacyDefenseTask2CanonicalResolver,
  serializeAssetContractV2PhysicalDescriptorPayload,
  type AssetContractV2SemanticRegistration,
  type AssetContractV2SemanticResolver,
  type AssetContractV2SemanticSelection,
  type SemanticAssetRequirement,
  type StandardAssetCatalog,
} from "@reading-advantage/advantage-play-kit/assets";

/** Stable identifier for one evidence-bounded legacy-defense title. */
export type LegacyDefenseTitleId =
  | "castle-defense"
  | "wizard-vs-zombie"
  | "village-guardian"
  | "storm-castle-tower";

/** Exact source claim backing a mechanism or visual role. */
export interface LegacyDefenseClaimReference {
  /** Stable claim identifier from the pinned source ledger. */
  readonly claimId: string;
  /** Exact JSON locator in the pinned source ledger. */
  readonly locator: string;
  /** Scope that determines whether the rule can execute in QC. */
  readonly temporalScope: "current-source" | "historical-source-only" | "current-absence";
  /** Whether the rule is executable or deliberately blocked. */
  readonly disposition: "supported" | "blocked-historical" | "blocked-absence";
}

/** One title-specific semantic role selected only through an accepted descriptor resolver. */
export interface LegacyDefenseRoleStateRequirement {
  /** Stable title-scoped role identity. */
  readonly titleRole: string;
  /** Owner-approved semantic role. */
  readonly role: string;
  /** Owner-approved semantic state. */
  readonly state: string;
  /** Exact source claim that names this title role. */
  readonly evidenceClaim: LegacyDefenseClaimReference;
}

/** One isolated defense candidate that cannot enter the product catalog or a host. */
export interface LegacyDefenseSemanticAdoptionCandidate {
  /** Stable title identifier. */
  readonly publicId: LegacyDefenseTitleId;
  /** Student-visible title. */
  readonly title: string;
  /** Educational input mode. */
  readonly inputMode: "sentence" | "vocabulary";
  /** Hash-pinned source-ledger artifact. */
  readonly claimArtifact: Readonly<{ path: string; sha256: string }>;
  /** Exact mechanics available or blocked for this title. */
  readonly mechanicEvidence: Readonly<Record<string, LegacyDefenseClaimReference>>;
  /** Title-specific roles issued by the v2 descriptor resolver. */
  readonly roleStateRequirements: readonly LegacyDefenseRoleStateRequirement[];
  /** Candidate cannot be exposed through a product catalog or host. */
  readonly consumable: false;
}

/** Descriptor registration resolved for one title-specific visual role. */
export interface LegacyDefenseResolvedRoleState {
  /** Stable title-scoped role identity. */
  readonly titleRole: string;
  /** Canonical semantic key selected by the resolver. */
  readonly semanticKey: string;
  /** Exact Asset Contract v2 descriptor identity. */
  readonly descriptorId: string;
  /** SHA-256 of the descriptor payload. */
  readonly descriptorDigest: string;
  /** Root pack receipt locator. */
  readonly sourceReceiptLocator: string;
  /** Exact source claim for the role. */
  readonly evidenceClaim: LegacyDefenseClaimReference;
}

/** Resolver-issued selected union for one defense title. */
export interface LegacyDefenseSelectedUnion {
  /** Stable selected title identity. */
  readonly publicId: LegacyDefenseTitleId;
  /** Sorted, deduplicated semantic keys. */
  readonly semanticKeys: readonly string[];
  /** Descriptor registrations without exposed physical paths. */
  readonly registrations: readonly AssetContractV2SemanticRegistration[];
  /** Resolved title-role descriptor metadata. */
  readonly resolved: readonly LegacyDefenseResolvedRoleState[];
}

const TITLE_METADATA: Readonly<Record<LegacyDefenseTitleId, Readonly<{ title: string; inputMode: "sentence" | "vocabulary" }>>> = Object.freeze({
  "castle-defense": { title: "Castle Defense", inputMode: "sentence" },
  "wizard-vs-zombie": { title: "Wizard vs Zombie", inputMode: "vocabulary" },
  "village-guardian": { title: "Village Guardian", inputMode: "sentence" },
  "storm-castle-tower": { title: "Storm the Castle Tower", inputMode: "sentence" },
});

const CLAIMS: Readonly<Record<LegacyDefenseTitleId, Readonly<Record<string, LegacyDefenseClaimReference>>>> = Object.freeze({
  "castle-defense": {
    initialState: { claimId: "CD-MECH-009", locator: "$.claims[?(@.claim_id == 'CD-MECH-009')]", temporalScope: "current-source", disposition: "supported" },
    collectOrderedWord: { claimId: "CD-MECH-018", locator: "$.claims[?(@.claim_id == 'CD-MECH-018')]", temporalScope: "current-source", disposition: "supported" },
    resetInvalidSentence: { claimId: "CD-MECH-021", locator: "$.claims[?(@.claim_id == 'CD-MECH-021')]", temporalScope: "current-source", disposition: "supported" },
    towerSlotProximity: { claimId: "CD-MECH-022", locator: "$.claims[?(@.claim_id == 'CD-MECH-022')]", temporalScope: "current-source", disposition: "supported" },
    buildTower: { claimId: "CD-MECH-023", locator: "$.claims[?(@.claim_id == 'CD-MECH-023')]", temporalScope: "current-source", disposition: "supported" },
    waveComposition: { claimId: "CD-MECH-005", locator: "$.claims[?(@.claim_id == 'CD-MECH-005')]", temporalScope: "current-source", disposition: "supported" },
    waveSpawning: { claimId: "CD-MECH-029", locator: "$.claims[?(@.claim_id == 'CD-MECH-029')]", temporalScope: "current-source", disposition: "supported" },
    waveTransition: { claimId: "CD-MECH-030", locator: "$.claims[?(@.claim_id == 'CD-MECH-030')]", temporalScope: "current-source", disposition: "supported" },
    finalVictory: { claimId: "CD-MECH-031", locator: "$.claims[?(@.claim_id == 'CD-MECH-031')]", temporalScope: "current-source", disposition: "supported" },
    baseDefense: { claimId: "CD-MECH-027", locator: "$.claims[?(@.claim_id == 'CD-MECH-027')]", temporalScope: "current-source", disposition: "supported" },
    baseGameover: { claimId: "CD-MECH-032", locator: "$.claims[?(@.claim_id == 'CD-MECH-032')]", temporalScope: "current-source", disposition: "supported" },
  },
  "wizard-vs-zombie": {
    coreConstants: { claimId: "WVZ-MECH-001", locator: "$.claims[?(@.claim_id == 'WVZ-MECH-001')]", temporalScope: "current-source", disposition: "supported" },
    initialOrbs: { claimId: "WVZ-MECH-003", locator: "$.claims[?(@.claim_id == 'WVZ-MECH-003')]", temporalScope: "current-source", disposition: "supported" },
    correctOrbHealing: { claimId: "WVZ-MECH-005", locator: "$.claims[?(@.claim_id == 'WVZ-MECH-005')]", temporalScope: "current-source", disposition: "supported" },
    decoyLayout: { claimId: "WVZ-MECH-007", locator: "$.claims[?(@.claim_id == 'WVZ-MECH-007')]", temporalScope: "current-source", disposition: "supported" },
    hordeDamage: { claimId: "WVZ-MECH-005", locator: "$.claims[?(@.claim_id == 'WVZ-MECH-005')]", temporalScope: "current-source", disposition: "supported" },
  },
  "village-guardian": {
    statusInitialization: { claimId: "VG3-MODEL-004", locator: "$.claims[?(@.claim_id == 'VG3-MODEL-004')]", temporalScope: "current-source", disposition: "supported" },
    timerDefeat: { claimId: "VG3-MODEL-006", locator: "$.claims[?(@.claim_id == 'VG3-MODEL-006')]", temporalScope: "current-source", disposition: "supported" },
    orderedVillager: { claimId: "VG3-MODEL-010", locator: "$.claims[?(@.claim_id == 'VG3-MODEL-010')]", temporalScope: "current-source", disposition: "supported" },
    wrongOrderAddsTime: { claimId: "VG3-MODEL-011", locator: "$.claims[?(@.claim_id == 'VG3-MODEL-011')]", temporalScope: "current-source", disposition: "supported" },
    monsterTrailReset: { claimId: "VG3-MODEL-012", locator: "$.claims[?(@.claim_id == 'VG3-MODEL-012')]", temporalScope: "current-source", disposition: "supported" },
    monsterLifeLoss: { claimId: "VG3-MODEL-013", locator: "$.claims[?(@.claim_id == 'VG3-MODEL-013')]", temporalScope: "current-source", disposition: "supported" },
    sanctuaryLevelTransition: { claimId: "VG3-MODEL-014", locator: "$.claims[?(@.claim_id == 'VG3-MODEL-014')]", temporalScope: "current-source", disposition: "supported" },
  },
  "storm-castle-tower": {
    missingCurrentImplementation: { claimId: "SCT-ABS-001", locator: "$.claims[?(@.claim_id == 'SCT-ABS-001')]", temporalScope: "current-absence", disposition: "blocked-absence" },
    historicalWindowCollection: { claimId: "SCT-MECH-H005", locator: "$.claims[?(@.claim_id == 'SCT-MECH-H005')]", temporalScope: "historical-source-only", disposition: "blocked-historical" },
    historicalCompletion: { claimId: "SCT-TRANS-H002", locator: "$.claims[?(@.claim_id == 'SCT-TRANS-H002')]", temporalScope: "historical-source-only", disposition: "blocked-historical" },
  },
});

function roleRequirements(titleId: LegacyDefenseTitleId): readonly LegacyDefenseRoleStateRequirement[] {
  const sourceManifest = LEGACY_DEFENSE_SOURCE_MANIFESTS.find((manifest) => manifest.titleId === titleId);
  if (!sourceManifest) throw new Error(`Missing source manifest for ${titleId}`);
  return Object.freeze(LEGACY_DEFENSE_TASK2_ROLE_INPUTS
    .filter((input) => input.titleId === titleId)
    .map((input) => Object.freeze({
      titleRole: input.titleRole,
      role: input.semantic.role,
      state: input.semantic.state,
      evidenceClaim: Object.freeze({
        claimId: input.claimId,
        locator: input.claimLocator,
        temporalScope: sourceManifest.temporalScope,
        disposition: titleId === "storm-castle-tower" ? "blocked-historical" : "supported",
      }),
    })));
}

/** Isolated defense title candidates; none are product catalog or host registrations. */
export const LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES: readonly LegacyDefenseSemanticAdoptionCandidate[] = Object.freeze(
  (Object.keys(TITLE_METADATA) as LegacyDefenseTitleId[]).map((publicId) => {
    const sourceManifest = LEGACY_DEFENSE_SOURCE_MANIFESTS.find((manifest) => manifest.titleId === publicId);
    if (!sourceManifest) throw new Error(`Missing source manifest for ${publicId}`);
    return Object.freeze({
      publicId,
      title: TITLE_METADATA[publicId].title,
      inputMode: TITLE_METADATA[publicId].inputMode,
      claimArtifact: Object.freeze({ path: sourceManifest.path, sha256: sourceManifest.sha256 }),
      mechanicEvidence: CLAIMS[publicId],
      roleStateRequirements: roleRequirements(publicId),
      consumable: false as const,
    });
  }),
);

const candidateById = new Map(LEGACY_DEFENSE_SEMANTIC_ADOPTION_CANDIDATES.map((candidate) => [candidate.publicId, candidate]));

/** Returns one defense candidate without adding it to the production cartridge catalog. */
export function getLegacyDefenseSemanticAdoptionCandidate(titleId: string): LegacyDefenseSemanticAdoptionCandidate | undefined {
  return candidateById.get(titleId as LegacyDefenseTitleId);
}

/** Returns sorted selected semantic keys for one exact defense title. */
export function getLegacyDefenseSelectedSemanticKeys(titleId: string): readonly string[] {
  const candidate = getLegacyDefenseSemanticAdoptionCandidate(titleId);
  if (!candidate) throw new Error(`Unknown legacy-defense title ${JSON.stringify(titleId)}`);
  return Object.freeze(candidate.roleStateRequirements
    .map((requirement) => {
      const input = LEGACY_DEFENSE_TASK2_ROLE_INPUTS.find((candidateInput) => candidateInput.titleRole === requirement.titleRole);
      if (!input) throw new Error(`Missing selected union role ${requirement.titleRole}`);
      return input.semanticKey;
    })
    .filter((key, index, values) => values.indexOf(key) === index)
    .sort((left, right) => left.localeCompare(right)));
}

/**
 * Creates the accepted descriptor-aware defense resolver.
 * @param catalog Complete standard-pack catalog.
 * @returns A resolver that cannot expose a physical standard-pack path.
 */
export async function createLegacyDefenseCanonicalResolver(catalog: StandardAssetCatalog): Promise<AssetContractV2SemanticResolver> {
  return createLegacyDefenseTask2CanonicalResolver(catalog);
}

/**
 * Resolves one defense title's selected Asset Contract v2 registration union.
 * @param resolver Accepted descriptor-aware resolver.
 * @param titleId Exact defense title identifier.
 * @returns The title-scoped resolver selection.
 */
export function resolveLegacyDefenseTitleCanonicalAssets(
  resolver: AssetContractV2SemanticResolver,
  titleId: LegacyDefenseTitleId,
): AssetContractV2SemanticSelection {
  const candidate = getLegacyDefenseSemanticAdoptionCandidate(titleId);
  if (!candidate) throw new Error(`Unknown legacy-defense title ${JSON.stringify(titleId)}`);
  return resolver.select(candidate.roleStateRequirements.map((role) => ({ role: role.role, state: role.state })) as readonly SemanticAssetRequirement[]);
}

/** Computes a browser-safe descriptor digest. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Materializes one title's descriptor registrations for the isolated QC route.
 * @param candidate Exact non-consumable defense candidate.
 * @param resolver Accepted descriptor-aware resolver.
 * @returns Resolver-issued selected metadata with no physical paths.
 * @throws When a title role or owner-selected descriptor drifts.
 */
export async function materializeLegacyDefenseSelectedUnion(
  candidate: LegacyDefenseSemanticAdoptionCandidate,
  resolver: AssetContractV2SemanticResolver,
): Promise<LegacyDefenseSelectedUnion> {
  if (candidate.consumable || !candidate.claimArtifact.sha256) throw new Error(`Legacy Defense candidate ${candidate.publicId} is not QC-only`);
  const selection = resolveLegacyDefenseTitleCanonicalAssets(resolver, candidate.publicId);
  const resolved = await Promise.all(candidate.roleStateRequirements.map(async (requirement) => {
    const registration = resolver.resolve({ role: requirement.role, state: requirement.state });
    return Object.freeze({
      titleRole: requirement.titleRole,
      semanticKey: registration.semanticKey,
      descriptorId: registration.descriptor.descriptorId,
      descriptorDigest: await sha256(serializeAssetContractV2PhysicalDescriptorPayload(registration.descriptor)),
      sourceReceiptLocator: registration.sourceReceiptLocator,
      evidenceClaim: requirement.evidenceClaim,
    });
  }));
  return Object.freeze({
    publicId: candidate.publicId,
    semanticKeys: selection.semanticKeys,
    registrations: Object.freeze([...selection.registrations]),
    resolved: Object.freeze(resolved.sort((left, right) => left.titleRole.localeCompare(right.titleRole))),
  });
}

/** Root-release v2 descriptor registry used by the four defense titles. */
export { LEGACY_DEFENSE_CANONICAL_DESCRIPTORS };
