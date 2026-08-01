import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  OWNER_APPROVED_CANONICAL_BINDINGS,
  compareCanonicalSuitabilityDescriptor,
  createAcceptedStandardAssetResolver,
  createCanonicalSuitabilitySearch,
  createDescriptorAwareSemanticAssetResolver,
  validateAssetContractV2Descriptor,
  validateSemanticProductBindings,
  type AssetContractV2PhysicalDescriptor,
  type AssetContractV2SemanticResolver,
  type AssetContractV2SemanticSelection,
  type CanonicalSuitabilityTechnicalFactors,
  type SemanticAssetRequirement,
  type StandardAssetCatalog,
  type StandardAssetResolver,
  type StandardPackPhysicalBehaviorConstraints,
  type StandardPackSuitabilityRequest,
} from "@reading-advantage/advantage-play-kit/assets";

/** Stable identifiers for the Legacy Puzzle cutover cohort. */
export type PuzzleTitleId =
  | "enchanted-library"
  | "rune-match"
  | "alchemists-synthesis"
  | "potion-rush"
  | "rune-forge-chamber";

/** One accepted, title-owned semantic requirement and its source claim anchors. */
export interface PuzzleTitleBinding {
  /** Stable title identity. */
  readonly titleId: PuzzleTitleId;
  /** Student-visible title recorded by the v2 dossier. */
  readonly title: string;
  /** Frozen learning-content ABI. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Owner-accepted role/state request resolved only by this cohort's local binding manifest. */
  readonly semantic: SemanticAssetRequirement;
  /** Descriptor selected for the role/state by the accepted v2 decision. */
  readonly descriptorId: string;
  /** Canonical semantic key, never a physical path. */
  readonly semanticKey: string;
  /** Exact legacy claim identifiers that authorize the retained mechanic. */
  readonly claimIds: readonly string[];
}

/** One descriptor comparison retained with its accepted Task 2 QC boundary. */
export interface PuzzleCanonicalSuitabilityAssessment {
  /** Stable cohort title identity. */
  readonly titleId: PuzzleTitleId;
  /** Semantic role and state the selected descriptor serves. */
  readonly semantic: SemanticAssetRequirement;
  /** Descriptor whose behavior and geometry are independently compared with canonical bytes. */
  readonly descriptor: AssetContractV2PhysicalDescriptor;
  /** Canonical semantic key resolved only through the accepted resolver. */
  readonly canonicalKey: string;
  /** Deterministic descriptor and resolver compatibility factors. */
  readonly technicalCompatibility: Readonly<CanonicalSuitabilityTechnicalFactors>;
  /** The v2 owner decision permits only the isolated Advantage Games QC surface. */
  readonly disposition: "accepted-for-advantage-games-qc";
  /** Exact accepted Task 2 selected union for this one title. */
  readonly selectedSemanticKeys: readonly string[];
  /** Legacy physical assets remain unavailable for reuse or ingestion. */
  readonly legacyAssetDisposition: "blocked";
  /** Claim IDs carried into the deterministic runtime contract. */
  readonly claimIds: readonly string[];
}

/** The exact non-production gate retained by each puzzle cartridge candidate. */
export interface PuzzleCartridgeScope {
  /** Stable title identity bound to the candidate. */
  readonly titleId: PuzzleTitleId;
  /** QC sessions are permitted; production play remains unavailable. */
  readonly qcPlayable: true;
  /** Candidate cartridges stay unavailable to production hosts. */
  readonly playable: false;
  /** Registration is limited to the Advantage Games quality-control route. */
  readonly registration: "advantage-games-qc-only";
  /** Production catalogs and root loaders remain unmodified. */
  readonly productionCatalogExposed: false;
  /** Reading integration remains explicitly unauthorized. */
  readonly readingIntegration: false;
  /** Primary integration remains explicitly unauthorized. */
  readonly primaryIntegration: false;
  /** Exact replacement and retirement are not authorized by Tasks 2–5. */
  readonly retirementComplete: false;
  /** The descriptor-aware title-selected union permitted only for QC inspection. */
  readonly selectedSemanticKeys: readonly string[];
  /** The accepted evidence disposition, not a production release decision. */
  readonly disposition: "accepted-for-advantage-games-qc";
}

const ACCEPTED_RELEASE = Object.freeze({
  version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
  catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
  sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
});

/** Canonical six-cell descriptor that owns Enchanted Library walking playback. */
export const ENCHANTED_LIBRARY_WALK_DESCRIPTOR = validateAssetContractV2Descriptor({
  contractVersion: 2,
  descriptorId: "enchanted-library-player-walk-v1",
  catalogEntryKey: "side-view/native/platformer-world/heroes/hero-001/hero-001-walk-source-0c1cbfb7e747",
  release: ACCEPTED_RELEASE,
  mediaKind: "animation",
  geometry: { width: 192, height: 32, frameWidth: 32, frameHeight: 32, columns: 6, rows: 1 },
  clips: [{
    id: "walk",
    frames: [0, 1, 2, 3, 4, 5].map((column) => ({ column, row: 0 })),
    timing: { fps: 12, loop: true },
  }],
  directions: [{ direction: "down", clipId: "walk" }],
  anchor: { x: 0.5, y: 1 },
  renderScale: 2,
  collisionEnvelope: { x: 0.2, y: 0.4, width: 0.6, height: 0.6 },
  readabilityEnvelope: { minimumRenderPixels: 24, minimumContrastRatio: 3 },
});

const STATIC_DESCRIPTOR_SPECS = Object.freeze([
  {
    titleId: "rune-match" as const,
    descriptorId: "rune-match-panel-default-v2",
    semantic: { role: "panel", state: "default" },
    catalogEntryKey: "ui/20x20/inventory/slot",
    geometry: { width: 20, height: 20, frameWidth: 20, frameHeight: 20, columns: 1, rows: 1 },
    minimumRenderPixels: 20,
  },
  {
    titleId: "alchemists-synthesis" as const,
    descriptorId: "alchemists-synthesis-correct-feedback-v2",
    semantic: { role: "feedback", state: "correct" },
    catalogEntryKey: "effects/32x32/combat/hit-01",
    geometry: { width: 192, height: 128, frameWidth: 32, frameHeight: 32, columns: 6, rows: 4 },
    minimumRenderPixels: 16,
  },
  {
    titleId: "potion-rush" as const,
    descriptorId: "potion-rush-confirm-control-v2",
    semantic: { role: "control", state: "confirm" },
    catalogEntryKey: "ui/16x16/controls/gamepad-buttons",
    geometry: { width: 352, height: 160, frameWidth: 16, frameHeight: 16, columns: 22, rows: 10 },
    minimumRenderPixels: 16,
  },
  {
    titleId: "rune-forge-chamber" as const,
    descriptorId: "rune-forge-chamber-player-idle-v2",
    semantic: { role: "player", state: "idle" },
    catalogEntryKey: "top-down/32x32/characters/hero-01",
    geometry: { width: 192, height: 384, frameWidth: 32, frameHeight: 32, columns: 6, rows: 12 },
    minimumRenderPixels: 32,
  },
]);

/** Creates a validated static descriptor from an accepted canonical geometry declaration. */
function createStaticDescriptor(
  specification: typeof STATIC_DESCRIPTOR_SPECS[number],
): AssetContractV2PhysicalDescriptor {
  return validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: specification.descriptorId,
    catalogEntryKey: specification.catalogEntryKey,
    release: ACCEPTED_RELEASE,
    mediaKind: "image",
    geometry: specification.geometry,
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: { x: 0, y: 0, width: 1, height: 1 },
    readabilityEnvelope: { minimumRenderPixels: specification.minimumRenderPixels, minimumContrastRatio: 3 },
  });
}

/** Exact v2 descriptors accepted by the per-title dossiers, never by the public catalog. */
export const PUZZLE_CANONICAL_DESCRIPTORS: readonly AssetContractV2PhysicalDescriptor[] = Object.freeze([
  ENCHANTED_LIBRARY_WALK_DESCRIPTOR,
  ...STATIC_DESCRIPTOR_SPECS.map(createStaticDescriptor),
]);

/** Owner-accepted title bindings are intentionally local to the quarantined puzzle cohort. */
const PUZZLE_QC_BINDINGS = validateSemanticProductBindings({
  ...OWNER_APPROVED_CANONICAL_BINDINGS,
  bindings: [
    {
      role: "player",
      state: "walk",
      semanticKey: ENCHANTED_LIBRARY_WALK_DESCRIPTOR.catalogEntryKey,
      usage: "animation",
      animation: "walk",
    },
    ...OWNER_APPROVED_CANONICAL_BINDINGS.bindings.filter((binding) => (
      ["ui/20x20/inventory/slot", "effects/32x32/combat/hit-01", "ui/16x16/controls/gamepad-buttons", "top-down/32x32/characters/hero-01"]
        .includes(binding.semanticKey)
    )),
  ],
});

/** Accepted per-title runtime and selected-union bindings from Task 2 v2. */
export const PUZZLE_TITLE_BINDINGS: readonly PuzzleTitleBinding[] = Object.freeze([
  {
    titleId: "enchanted-library",
    title: "Enchanted Library",
    inputMode: "vocabulary",
    semantic: { role: "player", state: "walk" },
    descriptorId: ENCHANTED_LIBRARY_WALK_DESCRIPTOR.descriptorId,
    semanticKey: ENCHANTED_LIBRARY_WALK_DESCRIPTOR.catalogEntryKey,
    claimIds: ["EL-COLL-001", "EL-VICTORY-001", "EL-XP-001"],
  },
  {
    titleId: "rune-match",
    title: "Rune Match",
    inputMode: "vocabulary",
    semantic: { role: "panel", state: "default" },
    descriptorId: "rune-match-panel-default-v2",
    semanticKey: "ui/20x20/inventory/slot",
    claimIds: ["RM-CONFIG-001", "RM-MECH-002", "RM-MECH-003", "RM-MECH-004"],
  },
  {
    titleId: "alchemists-synthesis",
    title: "Alchemist's Synthesis",
    inputMode: "vocabulary",
    semantic: { role: "feedback", state: "correct" },
    descriptorId: "alchemists-synthesis-correct-feedback-v2",
    semanticKey: "effects/32x32/combat/hit-01",
    claimIds: ["AS-TRANS-002", "AS-RESULT-001"],
  },
  {
    titleId: "potion-rush",
    title: "Potion Rush",
    inputMode: "sentence",
    semantic: { role: "control", state: "confirm" },
    descriptorId: "potion-rush-confirm-control-v2",
    semanticKey: "ui/16x16/controls/gamepad-buttons",
    claimIds: ["PR-CUR-005", "PR-CUR-008", "PR-CUR-010", "PR-CUR-011", "PR-CUR-013", "PR-CUR-014"],
  },
  {
    titleId: "rune-forge-chamber",
    title: "Rune Forge Chamber",
    inputMode: "sentence",
    semantic: { role: "player", state: "idle" },
    descriptorId: "rune-forge-chamber-player-idle-v2",
    semanticKey: "top-down/32x32/characters/hero-01",
    claimIds: ["RFC-CUR-011", "RFC-CUR-012", "RFC-CUR-013"],
  },
]);

const bindingsByTitleId = new Map(PUZZLE_TITLE_BINDINGS.map((binding) => [binding.titleId, binding]));
const descriptorsById = new Map(PUZZLE_CANONICAL_DESCRIPTORS.map((descriptor) => [descriptor.descriptorId, descriptor]));

/** Builds title-local behavior constraints from a descriptor without reopening asset or host authority. */
function behaviorForDescriptor(descriptor: AssetContractV2PhysicalDescriptor): StandardPackPhysicalBehaviorConstraints {
  return {
    mediaKind: descriptor.mediaKind,
    requiredDirections: descriptor.mediaKind === "animation" ? ["down"] : [],
    requiredClips: descriptor.mediaKind === "animation" ? ["walk"] : [],
    minimumFramesPerClip: descriptor.mediaKind === "animation" ? 6 : null,
    minimumGeometry: descriptor.geometry === undefined
      ? null
      : { width: descriptor.geometry.width, height: descriptor.geometry.height },
    collisionEnvelopeRequired: true,
    audienceBands: ["grades-3-5"],
    locales: ["en"],
    accessibilityNeeds: ["high-contrast-silhouette"],
  };
}

/** Compares one accepted title descriptor against root canonical bytes. */
function assessDescriptor(
  binding: PuzzleTitleBinding,
  descriptor: AssetContractV2PhysicalDescriptor,
  resolver: StandardAssetResolver,
): PuzzleCanonicalSuitabilityAssessment {
  const request: StandardPackSuitabilityRequest = {
    requestId: `${binding.titleId}-${binding.semantic.role}-${binding.semantic.state}-accepted-v2`,
    requestingTitle: binding.titleId,
    requestingCartridge: `${binding.titleId}-qc-cartridge`,
    requestedAt: "2026-08-01T00:00:00.000Z",
    semantic: binding.semantic,
    behavior: behaviorForDescriptor(descriptor),
  };
  const search = createCanonicalSuitabilitySearch(resolver, [descriptor.catalogEntryKey]);
  const comparison = compareCanonicalSuitabilityDescriptor(request, descriptor, search);
  return Object.freeze({
    titleId: binding.titleId,
    semantic: Object.freeze({ ...binding.semantic }),
    descriptor: comparison.descriptor,
    canonicalKey: comparison.canonical.semanticKey,
    technicalCompatibility: comparison.factors,
    disposition: "accepted-for-advantage-games-qc" as const,
    selectedSemanticKeys: Object.freeze([binding.semanticKey]),
    legacyAssetDisposition: "blocked" as const,
    claimIds: Object.freeze([...binding.claimIds]),
  });
}

/**
 * Compares all five accepted puzzle descriptors with canonical bytes while retaining the production quarantine.
 * @param resolver A resolver created by `createAcceptedStandardAssetResolver` for the root accepted standard-pack catalog.
 * @returns One accepted-for-QC-only descriptor assessment for every puzzle title.
 * @throws When the resolver is not accepted, an accepted descriptor drifts, or a canonical key is unavailable.
 */
export function assessPuzzleCanonicalSuitability(
  resolver: StandardAssetResolver,
): readonly PuzzleCanonicalSuitabilityAssessment[] {
  return Object.freeze(PUZZLE_TITLE_BINDINGS.map((binding) => {
    const descriptor = descriptorsById.get(binding.descriptorId);
    if (!descriptor) throw new Error(`Puzzle v2 dossier lost descriptor ${binding.descriptorId}`);
    return assessDescriptor(binding, descriptor, resolver);
  }));
}

/**
 * Returns the frozen accepted binding for one puzzle title.
 * @param titleId Title identity supplied by a cartridge or QC adapter.
 * @returns The accepted title-specific semantic, descriptor, and claim binding.
 * @throws When the identity is outside the five-title Legacy Puzzle cohort.
 */
export function getPuzzleTitleBinding(titleId: string): PuzzleTitleBinding {
  const binding = bindingsByTitleId.get(titleId as PuzzleTitleId);
  if (!binding) throw new Error(`Unknown legacy puzzle title ${JSON.stringify(titleId)}`);
  return binding;
}

/**
 * Creates the accepted descriptor-aware resolver for only the five Task 2 v2 puzzle selections.
 * @param catalog Complete root standard-pack catalog claimed to match the accepted release.
 * @returns A resolver that can issue only descriptor-aware puzzle QC registrations.
 * @throws When the catalog, local owner acceptance, or descriptor facts drift.
 */
export async function createPuzzleTask2CanonicalResolver(
  catalog: StandardAssetCatalog,
): Promise<AssetContractV2SemanticResolver> {
  const baseResolver = await createAcceptedStandardAssetResolver(catalog, ACCEPTED_RELEASE);
  return createDescriptorAwareSemanticAssetResolver(baseResolver, PUZZLE_QC_BINDINGS, PUZZLE_CANONICAL_DESCRIPTORS);
}

/**
 * Materializes one title's minimal descriptor-aware selected union for Advantage Games QC inspection.
 * @param resolver The accepted Task 2 descriptor-aware resolver.
 * @param titleId Title identity supplied by the QC-only adapter.
 * @returns The selected union without any physical path, catalog, or host registration.
 */
export function resolvePuzzleTitleCanonicalAssets(
  resolver: AssetContractV2SemanticResolver,
  titleId: PuzzleTitleId,
): AssetContractV2SemanticSelection {
  const binding = getPuzzleTitleBinding(titleId);
  return resolver.select([binding.semantic]);
}

/**
 * Produces the non-production scope required by a title-specific QC cartridge.
 * @param titleId The title whose isolated QC cartridge is being built.
 * @returns A frozen scope that authorizes `/qc` inspection but rejects all hosts and production catalogs.
 */
export function createPuzzleCartridgeScope(titleId: PuzzleTitleId): PuzzleCartridgeScope {
  const binding = getPuzzleTitleBinding(titleId);
  return Object.freeze({
    titleId,
    qcPlayable: true as const,
    playable: false as const,
    registration: "advantage-games-qc-only" as const,
    productionCatalogExposed: false as const,
    readingIntegration: false as const,
    primaryIntegration: false as const,
    retirementComplete: false as const,
    selectedSemanticKeys: Object.freeze([binding.semanticKey]),
    disposition: "accepted-for-advantage-games-qc" as const,
  });
}

/**
 * Rejects an attempted production host or catalog use of a QC-only title assessment.
 * @param assessment An accepted-for-QC-only technical assessment.
 * @throws Always because Tasks 2–5 do not authorize a production host, catalog, or retirement.
 */
export function assertPuzzleCartridgePlayable(assessment: PuzzleCanonicalSuitabilityAssessment): never {
  throw new Error(
    `Puzzle cartridge ${assessment.titleId} is not playable outside Advantage Games /qc: production host and catalog authority remain blocked`,
  );
}
