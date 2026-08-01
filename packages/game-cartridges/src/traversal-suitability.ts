import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  OWNER_APPROVED_CANONICAL_BINDINGS,
  createAcceptedStandardAssetResolver,
  createDescriptorAwareSemanticAssetResolver,
  validateAssetContractV2Descriptor,
  type AssetContractV2PhysicalDescriptor,
  type AssetContractV2SemanticResolver,
  type AssetContractV2SemanticSelection,
  type SemanticAssetRequirement,
  type StandardAssetCatalog,
} from "@reading-advantage/advantage-play-kit/assets";

/** Title identifiers accepted by the legacy traversal readiness receipt. */
export const TRAVERSAL_TITLE_IDS = Object.freeze([
  "dragon-rider",
  "spellweavers-run",
  "shadow-gate-dungeon",
  "labyrinth-goblin-king",
  "griffin-riders-escape",
] as const);

/** One identifier included in the accepted legacy traversal cohort. */
export type TraversalTitleId = (typeof TRAVERSAL_TITLE_IDS)[number];

/** One title semantic role selected from the accepted canonical standard pack. */
export interface TraversalRoleSuitability {
  /** Product semantic role. */
  readonly role: "player" | "enemy" | "feedback" | "control" | "audio-feedback";
  /** Product semantic state. */
  readonly state: "idle" | "correct" | "confirm";
  /** Owner-approved standard-pack semantic key. */
  readonly semanticKey: string;
  /** Exact Asset Contract v2 physical behavior boundary for the selected canonical descriptor. */
  readonly descriptor: AssetContractV2PhysicalDescriptor;
}

/** One real canonical-reuse suitability decision for a traversal title. */
export interface TraversalTitleSuitability {
  /** Accepted cartridge identifier. */
  readonly id: TraversalTitleId;
  /** Human-readable game title. */
  readonly title: string;
  /** Input content contract frozen by the title's learning loop. */
  readonly inputMode: "vocabulary" | "sentence";
  /** Exact accepted canonical release identity. */
  readonly release: Readonly<{
    version: string;
    catalogDigest: string;
    sourceReceiptDigest: string;
  }>;
  /** Real canonical descriptor roles needed by the rebuilt loop. */
  readonly roles: readonly TraversalRoleSuitability[];
  /** The title may reuse only the listed canonical semantic roles. */
  readonly decision: "reuse-canonical";
  /** No app-local or historical legacy asset may be ingested in this change. */
  readonly legacyAssetDisposition: "blocked-no-legacy-ingestion";
}

const release = Object.freeze({
  version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
  catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
  sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
});

const nonVisualCollisionEnvelope = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
const nonVisualReadabilityEnvelope = Object.freeze({ minimumRenderPixels: 1, minimumContrastRatio: 1 });

/**
 * Physical Asset Contract v2 descriptors used to resolve the accepted T11 semantic bindings.
 * Atlas clip and direction metadata are deliberately absent because no reviewed traversal behavior assigns them.
 */
export const TRAVERSAL_CANONICAL_DESCRIPTORS: readonly AssetContractV2PhysicalDescriptor[] = Object.freeze([
  validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: "existing-core-hero-01-static-v1",
    catalogEntryKey: "top-down/32x32/characters/hero-01",
    release,
    mediaKind: "image",
    geometry: { width: 192, height: 384, frameWidth: 32, frameHeight: 32, columns: 6, rows: 12 },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: { x: 7 / 32, y: 12 / 32, width: 25 / 32, height: 20 / 32 },
    readabilityEnvelope: { minimumRenderPixels: 32, minimumContrastRatio: 1 },
  }),
  validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: "existing-core-enemy-001-idle-static-v1",
    catalogEntryKey: "side-view/32x32/characters/enemy-001-idle",
    release,
    mediaKind: "image",
    geometry: { width: 192, height: 32, frameWidth: 32, frameHeight: 32, columns: 6, rows: 1 },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: { x: 10 / 32, y: 16 / 32, width: 12 / 32, height: 16 / 32 },
    readabilityEnvelope: { minimumRenderPixels: 16, minimumContrastRatio: 1 },
  }),
  validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: "existing-core-hit-01-static-v1",
    catalogEntryKey: "effects/32x32/combat/hit-01",
    release,
    mediaKind: "image",
    geometry: { width: 192, height: 128, frameWidth: 32, frameHeight: 32, columns: 6, rows: 4 },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: { x: 4 / 32, y: 5 / 32, width: 23 / 32, height: 22 / 32 },
    readabilityEnvelope: { minimumRenderPixels: 16, minimumContrastRatio: 1 },
  }),
  validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: "existing-core-gamepad-buttons-static-v1",
    catalogEntryKey: "ui/16x16/controls/gamepad-buttons",
    release,
    mediaKind: "image",
    geometry: { width: 352, height: 160, frameWidth: 16, frameHeight: 16, columns: 22, rows: 10 },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: { x: 1 / 16, y: 1 / 16, width: 14 / 16, height: 14 / 16 },
    readabilityEnvelope: { minimumRenderPixels: 16, minimumContrastRatio: 1 },
  }),
  validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: "existing-core-inventory-slot-static-v1",
    catalogEntryKey: "ui/20x20/inventory/slot",
    release,
    mediaKind: "image",
    geometry: { width: 20, height: 20, frameWidth: 20, frameHeight: 20, columns: 1, rows: 1 },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: { x: 0, y: 0, width: 1, height: 1 },
    readabilityEnvelope: { minimumRenderPixels: 20, minimumContrastRatio: 1 },
  }),
  validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: "existing-core-armor-icons-static-v1",
    catalogEntryKey: "ui/32x32/items/armor-icons",
    release,
    mediaKind: "image",
    geometry: { width: 512, height: 896, frameWidth: 32, frameHeight: 32, columns: 16, rows: 28 },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: { x: 0, y: 0, width: 1, height: 31 / 32 },
    readabilityEnvelope: { minimumRenderPixels: 32, minimumContrastRatio: 1 },
  }),
  validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: "existing-core-hit-01-audio-v1",
    catalogEntryKey: "audio/native/combat/hit-01",
    release,
    mediaKind: "audio",
    audio: { durationMs: 1667, channels: 2, loop: false },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: nonVisualCollisionEnvelope,
    readabilityEnvelope: nonVisualReadabilityEnvelope,
  }),
]);

const semanticKeyByIdentity = new Map(
  OWNER_APPROVED_CANONICAL_BINDINGS.bindings.map((binding) => [
    `${binding.role}:${binding.state}`,
    binding.semanticKey,
  ]),
);
const descriptorBySemanticKey = new Map(
  TRAVERSAL_CANONICAL_DESCRIPTORS.map((descriptor) => [descriptor.catalogEntryKey, descriptor]),
);

/**
 * Creates one role decision from an owner-approved semantic identity.
 * @param role Product role selected by the title.
 * @param state Product state selected by the title.
 * @returns A frozen semantic role suitability decision.
 * @throws When the requested role/state was not owner approved.
 */
function role(
  role: TraversalRoleSuitability["role"],
  state: TraversalRoleSuitability["state"],
): TraversalRoleSuitability {
  const semanticKey = semanticKeyByIdentity.get(`${role}:${state}`);
  if (!semanticKey) {
    throw new Error(`Traversal suitability requires an owner-approved semantic role/state: ${role}:${state}`);
  }
  const descriptor = descriptorBySemanticKey.get(semanticKey);
  if (!descriptor) {
    throw new Error(`Traversal suitability is missing an Asset Contract v2 descriptor for ${semanticKey}`);
  }
  return Object.freeze({ role, state, semanticKey, descriptor });
}

/** Exact canonical-reuse decisions for all five accepted traversal titles. */
export const TRAVERSAL_TITLE_SUITABILITY: readonly TraversalTitleSuitability[] = Object.freeze([
  Object.freeze({
    id: "dragon-rider",
    title: "Dragon Rider",
    inputMode: "vocabulary",
    release,
    roles: Object.freeze([
      role("player", "idle"),
      role("feedback", "correct"),
      role("audio-feedback", "correct"),
      role("control", "confirm"),
    ]),
    decision: "reuse-canonical",
    legacyAssetDisposition: "blocked-no-legacy-ingestion",
  }),
  Object.freeze({
    id: "spellweavers-run",
    title: "Spellweaver's Run",
    inputMode: "sentence",
    release,
    roles: Object.freeze([
      role("player", "idle"),
      role("feedback", "correct"),
      role("control", "confirm"),
    ]),
    decision: "reuse-canonical",
    legacyAssetDisposition: "blocked-no-legacy-ingestion",
  }),
  Object.freeze({
    id: "shadow-gate-dungeon",
    title: "Shadow Gate Dungeon",
    inputMode: "sentence",
    release,
    roles: Object.freeze([
      role("player", "idle"),
      role("enemy", "idle"),
      role("feedback", "correct"),
      role("control", "confirm"),
    ]),
    decision: "reuse-canonical",
    legacyAssetDisposition: "blocked-no-legacy-ingestion",
  }),
  Object.freeze({
    id: "labyrinth-goblin-king",
    title: "Labyrinth of the Goblin King",
    inputMode: "sentence",
    release,
    roles: Object.freeze([
      role("player", "idle"),
      role("enemy", "idle"),
      role("feedback", "correct"),
      role("control", "confirm"),
    ]),
    decision: "reuse-canonical",
    legacyAssetDisposition: "blocked-no-legacy-ingestion",
  }),
  Object.freeze({
    id: "griffin-riders-escape",
    title: "Griffin Rider's Escape",
    inputMode: "sentence",
    release,
    roles: Object.freeze([
      role("player", "idle"),
      role("enemy", "idle"),
      role("feedback", "correct"),
      role("control", "confirm"),
    ]),
    decision: "reuse-canonical",
    legacyAssetDisposition: "blocked-no-legacy-ingestion",
  }),
]);

const suitabilityById = new Map(TRAVERSAL_TITLE_SUITABILITY.map((title) => [title.id, title]));

/**
 * Returns one accepted title's canonical-reuse suitability decision.
 * @param id Traversal title identifier.
 * @returns The immutable suitability decision.
 * @throws When the identifier is outside the accepted five-title traversal cohort.
 */
export function getTraversalTitleSuitability(id: string): TraversalTitleSuitability {
  const suitability = suitabilityById.get(id as TraversalTitleId);
  if (!suitability) throw new Error(`Title ${id} is not in the traversal cohort`);
  return suitability;
}

/**
 * Returns the minimal sorted canonical semantic-key union for one title.
 * @param id Traversal title identifier.
 * @returns Sorted and deduplicated owner-approved semantic keys.
 * @throws When the title is outside the accepted traversal cohort.
 */
export function getTraversalSelectedSemanticKeys(id: string): readonly string[] {
  const suitability = getTraversalTitleSuitability(id);
  return Object.freeze([...new Set(suitability.roles.map((entry) => entry.semanticKey))]
    .sort((left, right) => left.localeCompare(right)));
}

/**
 * Creates an accepted-release Asset Contract v2 resolver for traversal cartridges.
 * @param catalog Complete generated standard-pack catalog claimed by a traversal host.
 * @returns A descriptor-aware resolver that exposes only verified semantic registrations.
 * @throws When the catalog, T11 role bindings, or canonical descriptor set drift from the accepted release.
 */
export async function createTraversalCanonicalResolver(
  catalog: StandardAssetCatalog,
): Promise<AssetContractV2SemanticResolver> {
  const baseResolver = await createAcceptedStandardAssetResolver(catalog, release);
  return createDescriptorAwareSemanticAssetResolver(
    baseResolver,
    OWNER_APPROVED_CANONICAL_BINDINGS,
    TRAVERSAL_CANONICAL_DESCRIPTORS,
  );
}

/**
 * Resolves one title's selected semantic roles through the accepted Asset Contract v2 boundary.
 * @param resolver Descriptor-aware resolver created for the accepted canonical release.
 * @param id Accepted traversal title identifier.
 * @returns The minimal title-specific descriptor registration union without physical paths.
 */
export function resolveTraversalTitleCanonicalAssets(
  resolver: AssetContractV2SemanticResolver,
  id: TraversalTitleId,
): AssetContractV2SemanticSelection {
  const suitability = getTraversalTitleSuitability(id);
  const requirements: readonly SemanticAssetRequirement[] = suitability.roles.map(({ role, state }) => ({ role, state }));
  return resolver.select(requirements);
}
