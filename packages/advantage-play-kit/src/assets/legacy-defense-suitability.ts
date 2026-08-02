import {
  ACCEPTED_STANDARD_ASSET_RELEASE,
  createAcceptedStandardAssetResolver,
} from "./accepted-standard-pack-release.js";
import {
  serializeAssetContractV2PhysicalDescriptorPayload,
  validateAssetContractV2Descriptor,
} from "./asset-contract-v2.js";
import type {
  AssetContractV2PhysicalDescriptor,
  AssetContractV2SemanticRequirement,
} from "./asset-contract-v2.js";
import {
  OWNER_APPROVED_CANONICAL_BINDINGS,
  createDescriptorAwareSemanticAssetResolver,
  validateSemanticProductBindings,
} from "./semantic-product-bindings.js";
import type { AssetContractV2SemanticResolver } from "./semantic-product-bindings.js";
import {
  serializeStandardPackSuitabilityDecisionPayload,
  serializeStandardPackSuitabilityDossierPayload,
  validateStandardPackSuitabilityDossier,
} from "./standard-pack-suitability.js";
import type {
  StandardPackPhysicalBehaviorConstraints,
  StandardPackSuitabilityCandidate,
  StandardPackSuitabilityDossier,
  StandardPackSuitabilitySourceEvidence,
} from "./standard-pack-suitability.js";
import type { StandardAssetCatalog, StandardAssetCatalogEntry } from "./standard-pack-release.js";

const REVIEW_TIME = "2026-08-01T00:00:00.000Z";
const ACCEPTED_RELEASE = Object.freeze({
  version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
  catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
  sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
});
const CATALOG_PATH = "packages/advantage-play-kit/assets/standard/standard-pack-release.json";
const CATALOG_SHA256 = "ef432a798a78585df3416d60aca30fe11a2d1d8b833e0d65ceb7fac5c8b19932";
const RECEIPT_PATH = "packages/advantage-play-kit/assets/standard/CURATED-RECEIPT.tsv";
const RECEIPT_SHA256 = "a192f1fe2826aa426228950092fb32cb47cb24dd4acd47057d7424a0dfd527bb";
const LICENSE_PATH = "packages/advantage-play-kit/assets/standard/LICENSE-ELVGAMES.txt";
const LICENSE_SHA256 = "3efc9b9a88752a089fa07de4fac43cabe6283b0051466661c55a97c1c625c48f";
const CREDIT_PATH = "packages/advantage-play-kit/assets/standard/README.md";
const CREDIT_SHA256 = "6ace14005c2d155ed24376e6dbd6e02a53906db660866eccb1ba38868f0e04cb";
const ASSET_GOVERNANCE_REVIEW = Object.freeze({
  path: "measure/tracks/apk_standard_pack_suitability_ingestion_20260728/current-byte-independent-review-v1.json",
  sha256: "b55be6fbba3526f70ac29930b6f7ae2f55011d19ef7f9ec1d41a7786c4b2873d",
});
const DEFENSE_TECHNICAL_REVIEW = Object.freeze({
  path: "measure/tracks/apk_legacy_defense_cutover_20260727/task2-standard-pack-suitability-dossiers-v2.json",
  sha256: "d9a8d86f7bdf84df0eec1a8d05c5d8b3238c458986a035fe810060d144a75e67",
});

type SemanticKey =
  | "top-down/32x32/characters/hero-01"
  | "side-view/32x32/characters/enemy-001-idle"
  | "effects/32x32/combat/hit-01"
  | "ui/16x16/controls/gamepad-buttons"
  | "audio/native/combat/hit-01";

interface DescriptorDefinition {
  readonly descriptorId: string;
  readonly mediaKind: "image" | "audio";
  readonly geometry?: Readonly<{ width: number; height: number; frameWidth: number; frameHeight: number; columns: number; rows: number }>;
  readonly collisionEnvelope: AssetContractV2PhysicalDescriptor["collisionEnvelope"];
  readonly minimumRenderPixels: number;
}

const DESCRIPTOR_DEFINITIONS: Readonly<Record<SemanticKey, DescriptorDefinition>> = Object.freeze({
  "top-down/32x32/characters/hero-01": {
    descriptorId: "legacy-defense-hero-01-static-v2",
    mediaKind: "image",
    geometry: { width: 192, height: 384, frameWidth: 32, frameHeight: 32, columns: 6, rows: 12 },
    collisionEnvelope: { x: 7 / 32, y: 12 / 32, width: 25 / 32, height: 20 / 32 },
    minimumRenderPixels: 32,
  },
  "side-view/32x32/characters/enemy-001-idle": {
    descriptorId: "legacy-defense-enemy-001-idle-static-v2",
    mediaKind: "image",
    geometry: { width: 192, height: 32, frameWidth: 32, frameHeight: 32, columns: 6, rows: 1 },
    collisionEnvelope: { x: 10 / 32, y: 16 / 32, width: 12 / 32, height: 16 / 32 },
    minimumRenderPixels: 16,
  },
  "effects/32x32/combat/hit-01": {
    descriptorId: "legacy-defense-hit-01-static-v2",
    mediaKind: "image",
    geometry: { width: 192, height: 128, frameWidth: 32, frameHeight: 32, columns: 6, rows: 4 },
    collisionEnvelope: { x: 4 / 32, y: 5 / 32, width: 23 / 32, height: 22 / 32 },
    minimumRenderPixels: 16,
  },
  "ui/16x16/controls/gamepad-buttons": {
    descriptorId: "legacy-defense-gamepad-buttons-static-v2",
    mediaKind: "image",
    geometry: { width: 352, height: 160, frameWidth: 16, frameHeight: 16, columns: 22, rows: 10 },
    collisionEnvelope: { x: 1 / 16, y: 1 / 16, width: 14 / 16, height: 14 / 16 },
    minimumRenderPixels: 16,
  },
  "audio/native/combat/hit-01": {
    descriptorId: "legacy-defense-hit-01-audio-v2",
    mediaKind: "audio",
    collisionEnvelope: { x: 0, y: 0, width: 1, height: 1 },
    minimumRenderPixels: 1,
  },
});

/** Hash-pinned source ledgers retained for title provenance and legacy-art blocking. */
export interface LegacyDefenseSourceManifest {
  /** Stable defense title identifier. */
  readonly titleId: string;
  /** Immutable archived claim-ledger path. */
  readonly path: string;
  /** SHA-256 of the exact archived ledger bytes. */
  readonly sha256: string;
  /** Source temporal scope recorded by the ledger. */
  readonly temporalScope: "current-source" | "historical-source-only";
}

/** Exact source-ledger manifests that keep every legacy physical asset blocked. */
export const LEGACY_DEFENSE_SOURCE_MANIFESTS: readonly LegacyDefenseSourceManifest[] = Object.freeze([
  { titleId: "castle-defense", path: "measure/archive/apk_corpus_audit_action_defense_20260712/castle-defense-claim-ledger.json", sha256: "ddb98a7c61f73cf4b5dc71dafa21ce652aeccaea2fc36dcf4f604aabd0848df3", temporalScope: "current-source" },
  { titleId: "wizard-vs-zombie", path: "measure/archive/apk_corpus_audit_action_defense_20260712/wizard-vs-zombie-claim-ledger-v2.json", sha256: "28320b36f18645d476b6e353275d7cf3f07bc0f73bea719da1e50537e8e8b635", temporalScope: "current-source" },
  { titleId: "village-guardian", path: "measure/archive/apk_corpus_audit_action_defense_20260712/village-guardian-claim-ledger-batch-b-v3.json", sha256: "3be82cd7a9ddb144ae82ae220c36b439c6d14bbd58e1c988c897af6156b20484", temporalScope: "current-source" },
  { titleId: "storm-castle-tower", path: "measure/archive/apk_corpus_audit_action_defense_20260712/storm-castle-tower-claim-ledger-batch-b.json", sha256: "9f9337ec9b86161337553a8b8ab92e57cc954d2a0deb42018dad0ed99394e9d9", temporalScope: "historical-source-only" },
]);

/** One title-role request that selects an accepted canonical descriptor without adopting legacy art. */
export interface LegacyDefenseTask2RoleInput {
  /** Stable title identifier. */
  readonly titleId: string;
  /** Stable title-scoped role identity. */
  readonly titleRole: string;
  /** Owner-approved semantic role and state. */
  readonly semantic: AssetContractV2SemanticRequirement;
  /** Root-release semantic key. */
  readonly semanticKey: SemanticKey;
  /** Exact source claim used only to name this QC presentation role. */
  readonly claimId: string;
  /** JSON locator within the source-ledger artifact. */
  readonly claimLocator: string;
  /** Technical comparison requirements. */
  readonly behavior: StandardPackPhysicalBehaviorConstraints;
}

const ROLE_BEHAVIOR: Readonly<Record<SemanticKey, StandardPackPhysicalBehaviorConstraints>> = Object.freeze({
  "top-down/32x32/characters/hero-01": { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 384 }, collisionEnvelopeRequired: true, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["high-contrast-silhouette"] },
  "side-view/32x32/characters/enemy-001-idle": { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 32 }, collisionEnvelopeRequired: true, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["distinct-enemy-silhouette"] },
  "effects/32x32/combat/hit-01": { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 128 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["clear-feedback"] },
  "ui/16x16/controls/gamepad-buttons": { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 352, height: 160 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["input-affordance"] },
  "audio/native/combat/hit-01": { mediaKind: "audio", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: null, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["nonvisual-feedback"] },
});

function roleInput(titleId: string, titleRole: string, role: string, state: string, semanticKey: SemanticKey, claimId: string): LegacyDefenseTask2RoleInput {
  return Object.freeze({
    titleId,
    titleRole,
    semantic: Object.freeze({ role, state }),
    semanticKey,
    claimId,
    claimLocator: `$.claims[?(@.claim_id == '${claimId}')]`,
    behavior: ROLE_BEHAVIOR[semanticKey],
  });
}

/** Every accepted title-role canonical reuse input, with no implicit generic fallback roles. */
export const LEGACY_DEFENSE_TASK2_ROLE_INPUTS: readonly LegacyDefenseTask2RoleInput[] = Object.freeze([
  roleInput("castle-defense", "castle-defense-player", "player", "idle", "top-down/32x32/characters/hero-01", "CD-MECH-009"),
  roleInput("castle-defense", "castle-defense-enemy", "enemy", "idle", "side-view/32x32/characters/enemy-001-idle", "CD-MECH-012"),
  roleInput("castle-defense", "castle-defense-correct-feedback", "feedback", "correct", "effects/32x32/combat/hit-01", "CD-TRANS-007"),
  roleInput("castle-defense", "castle-defense-controls", "control", "confirm", "ui/16x16/controls/gamepad-buttons", "CD-MECH-011"),
  roleInput("wizard-vs-zombie", "wizard-vs-zombie-player", "player", "idle", "top-down/32x32/characters/hero-01", "WVZ-MECH-003"),
  roleInput("wizard-vs-zombie", "wizard-vs-zombie-enemy", "enemy", "idle", "side-view/32x32/characters/enemy-001-idle", "WVZ-MECH-006"),
  roleInput("wizard-vs-zombie", "wizard-vs-zombie-correct-feedback", "feedback", "correct", "effects/32x32/combat/hit-01", "WVZ-MECH-005"),
  roleInput("wizard-vs-zombie", "wizard-vs-zombie-controls", "control", "confirm", "ui/16x16/controls/gamepad-buttons", "WVZ-MECH-013"),
  roleInput("wizard-vs-zombie", "wizard-vs-zombie-correct-audio", "audio-feedback", "correct", "audio/native/combat/hit-01", "WVZ-MECH-005"),
  roleInput("village-guardian", "village-guardian-player", "player", "idle", "top-down/32x32/characters/hero-01", "VG3-MODEL-004"),
  roleInput("village-guardian", "village-guardian-enemy", "enemy", "idle", "side-view/32x32/characters/enemy-001-idle", "VG3-MODEL-009"),
  roleInput("village-guardian", "village-guardian-correct-feedback", "feedback", "correct", "effects/32x32/combat/hit-01", "VG3-MODEL-010"),
  roleInput("village-guardian", "village-guardian-controls", "control", "confirm", "ui/16x16/controls/gamepad-buttons", "VG3-COMP-010"),
  roleInput("storm-castle-tower", "storm-castle-tower-player", "player", "idle", "top-down/32x32/characters/hero-01", "SCT-SCENE-H006"),
  roleInput("storm-castle-tower", "storm-castle-tower-correct-feedback", "feedback", "correct", "effects/32x32/combat/hit-01", "SCT-TRANS-H003"),
  roleInput("storm-castle-tower", "storm-castle-tower-controls", "control", "confirm", "ui/16x16/controls/gamepad-buttons", "SCT-MECH-H008"),
]);

/** A title-scoped selected union with a digest independent of any physical asset path. */
export interface LegacyDefenseSelectedUnionInput {
  /** Stable title identifier. */
  readonly titleId: string;
  /** Sorted owner-approved semantic keys. */
  readonly semanticKeys: readonly string[];
  /** SHA-256 of the sorted semantic-key payload. */
  readonly selectedUnionDigest: string;
}

/** Complete Task 2 validation result used only by the quarantined defense QC flow. */
export interface LegacyDefenseTask2SuitabilityPackage {
  /** Root accepted release pinned by every dossier. */
  readonly release: typeof ACCEPTED_RELEASE;
  /** Exactly five physical descriptors used by the sixteen title-role dossiers. */
  readonly descriptors: readonly AssetContractV2PhysicalDescriptor[];
  /** Validated per-title/per-role canonical reuse dossiers. */
  readonly dossiers: readonly StandardPackSuitabilityDossier[];
  /** Deterministic per-title selected unions. */
  readonly selectedUnionInputs: readonly LegacyDefenseSelectedUnionInput[];
  /** Provenance manifests that preserve the legacy-art block. */
  readonly sourceManifests: readonly LegacyDefenseSourceManifest[];
}

/** Computes a browser-safe SHA-256 digest. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Creates one reviewed Asset Contract v2 descriptor for a canonical semantic key. */
function createDescriptor(key: SemanticKey): AssetContractV2PhysicalDescriptor {
  const definition = DESCRIPTOR_DEFINITIONS[key];
  if (definition.mediaKind === "audio") {
    return validateAssetContractV2Descriptor({
      contractVersion: 2,
      descriptorId: definition.descriptorId,
      catalogEntryKey: key,
      release: ACCEPTED_RELEASE,
      mediaKind: "audio",
      audio: { durationMs: 1667, channels: 2, loop: false },
      anchor: { x: 0.5, y: 0.5 },
      renderScale: 1,
      collisionEnvelope: definition.collisionEnvelope,
      readabilityEnvelope: { minimumRenderPixels: definition.minimumRenderPixels, minimumContrastRatio: 1 },
    });
  }
  return validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: definition.descriptorId,
    catalogEntryKey: key,
    release: ACCEPTED_RELEASE,
    mediaKind: "image",
    geometry: definition.geometry!,
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: definition.collisionEnvelope,
    readabilityEnvelope: { minimumRenderPixels: definition.minimumRenderPixels, minimumContrastRatio: 1 },
  });
}

/** Root-release descriptors used by every defense title-role dossier. */
export const LEGACY_DEFENSE_CANONICAL_DESCRIPTORS: readonly AssetContractV2PhysicalDescriptor[] = Object.freeze(
  (Object.keys(DESCRIPTOR_DEFINITIONS) as SemanticKey[]).map(createDescriptor),
);

const DEFENSE_BINDINGS = validateSemanticProductBindings({
  ...OWNER_APPROVED_CANONICAL_BINDINGS,
  bindings: OWNER_APPROVED_CANONICAL_BINDINGS.bindings.filter((binding) => Object.hasOwn(DESCRIPTOR_DEFINITIONS, binding.semanticKey)),
});

/** Verifies a root-release entry before it can participate in a dossier. */
function assertEntry(key: SemanticKey, entry: StandardAssetCatalogEntry & { readonly requiredCredit: string }): void {
  const definition = DESCRIPTOR_DEFINITIONS[key];
  const dimensions = definition.geometry;
  if (
    entry.key !== key
    || entry.requiredCredit !== ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit
    || !entry.sourceReceiptLocator.startsWith("CURATED-RECEIPT.tsv:")
    || (definition.mediaKind === "audio" ? entry.physical.kind !== "audio" : entry.physical.kind !== "image")
    || (dimensions && (entry.physical.dimensions?.width !== dimensions.width || entry.physical.dimensions?.height !== dimensions.height))
  ) {
    throw new Error(`Legacy Defense canonical source bytes do not match the accepted descriptor for ${key}`);
  }
}

/** Ensures the requested title role matches the accepted owner semantic binding. */
function assertOwnerBinding(input: LegacyDefenseTask2RoleInput): void {
  const binding = OWNER_APPROVED_CANONICAL_BINDINGS.bindings.find((candidate) => candidate.role === input.semantic.role && candidate.state === input.semantic.state);
  if (!binding || binding.semanticKey !== input.semanticKey) {
    throw new Error(`Legacy Defense role ${input.titleRole} lacks the accepted owner binding for ${input.semantic.role}:${input.semantic.state}`);
  }
}

/** Builds provenance, license, credit, and legacy-block evidence for one title role. */
function createEvidence(prefix: string, entry: StandardAssetCatalogEntry & { readonly requiredCredit: string }, sourceManifest: LegacyDefenseSourceManifest): StandardPackSuitabilitySourceEvidence[] {
  return [
    { evidenceId: `${prefix}-asset`, kind: "canonical-catalog", locator: `packages/advantage-play-kit/assets/standard/${entry.path}`, sha256: entry.physical.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: REVIEW_TIME, recordedBy: "legacy-defense-task2-review" },
    { evidenceId: `${prefix}-catalog`, kind: "canonical-catalog", locator: CATALOG_PATH, sha256: CATALOG_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: REVIEW_TIME, recordedBy: "legacy-defense-task2-review" },
    { evidenceId: `${prefix}-receipt`, kind: "canonical-catalog", locator: RECEIPT_PATH, sha256: RECEIPT_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: REVIEW_TIME, recordedBy: "legacy-defense-task2-review" },
    { evidenceId: `${prefix}-source-ledger`, kind: "legacy-source", locator: sourceManifest.path, sha256: sourceManifest.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: REVIEW_TIME, recordedBy: "legacy-defense-task2-review" },
    { evidenceId: `${prefix}-license`, kind: "license", locator: LICENSE_PATH, sha256: LICENSE_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: REVIEW_TIME, recordedBy: "legacy-defense-task2-review" },
    { evidenceId: `${prefix}-credit`, kind: "credit", locator: CREDIT_PATH, sha256: CREDIT_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: REVIEW_TIME, recordedBy: "legacy-defense-task2-review" },
    { evidenceId: `${prefix}-visual`, kind: "visual-comparison", locator: ASSET_GOVERNANCE_REVIEW.path, sha256: ASSET_GOVERNANCE_REVIEW.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: REVIEW_TIME, recordedBy: "legacy-defense-task2-review" },
    { evidenceId: `${prefix}-technical`, kind: "technical-comparison", locator: DEFENSE_TECHNICAL_REVIEW.path, sha256: DEFENSE_TECHNICAL_REVIEW.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: REVIEW_TIME, recordedBy: "legacy-defense-task2-review" },
  ];
}

/** Creates one pending-owner dossier; acceptance is persisted separately in the Task 2 v2 owner record. */
async function createDossier(input: LegacyDefenseTask2RoleInput, entry: StandardAssetCatalogEntry & { readonly requiredCredit: string }): Promise<StandardPackSuitabilityDossier> {
  const sourceManifest = LEGACY_DEFENSE_SOURCE_MANIFESTS.find((candidate) => candidate.titleId === input.titleId);
  if (!sourceManifest || !sourceManifest.sha256) throw new Error(`Legacy Defense source manifest is incomplete for ${input.titleId}`);
  const descriptor = createDescriptor(input.semanticKey);
  const prefix = `legacy-defense-${input.titleId}-${input.semantic.role}-${input.semantic.state}`;
  const candidateId = `${prefix}-canonical`;
  const sourceEvidence = createEvidence(prefix, entry, sourceManifest);
  const candidate: StandardPackSuitabilityCandidate = {
    candidateId,
    origin: "canonical",
    semantic: input.semantic,
    descriptor: { descriptorId: descriptor.descriptorId, catalogEntryKey: descriptor.catalogEntryKey, descriptorDigest: await sha256(serializeAssetContractV2PhysicalDescriptorPayload(descriptor)), release: ACCEPTED_RELEASE },
    sourceEvidenceIds: [`${prefix}-asset`, `${prefix}-catalog`, `${prefix}-receipt`],
    comparisonEvidenceIds: [`${prefix}-visual`, `${prefix}-technical`],
    suitability: { semanticFit: "pass", visualReadability: input.behavior.mediaKind === "audio" ? "not-applicable" : "pass", frameDirectionCompatibility: "not-applicable", animationBehavior: "not-applicable", geometry: input.behavior.mediaKind === "audio" ? "not-applicable" : "pass", collisionEnvelope: input.behavior.collisionEnvelopeRequired ? "pass" : "not-applicable", audienceAppropriateness: "pass", localization: "not-applicable", accessibility: "pass", sourceReceipt: "pass", creditObligations: "pass" },
    requiresCanonicalIngestion: false,
  };
  const decision = {
    disposition: "reuse-canonical" as const,
    candidateId,
    descriptorId: descriptor.descriptorId,
    nextStep: "publish-accepted-binding" as const,
    rationale: "The accepted standard-pack descriptor supplies the title role with provenance, license, and credit. Legacy physical art remains blocked for reuse and ingestion.",
    reviewerApproval: { status: "accepted" as const, actorId: "legacy-defense-task2-review", decidedAt: REVIEW_TIME, evidenceDigest: RECEIPT_SHA256 },
    ownerApproval: { status: "pending" as const },
    authorization: { productionUseAuthorized: false as const, migrationAuthorized: false as const, cutoverAuthorized: false as const, deploymentAuthorized: false as const },
    decisionDigest: "",
  };
  decision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(decision));
  const dossier = {
    schemaVersion: 1 as const,
    dossierId: `${prefix}-canonical-reuse-v2`,
    createdAt: REVIEW_TIME,
    request: { requestId: `${prefix}-request-v2`, requestingTitle: input.titleId, requestingCartridge: `${input.titleId}-qc`, requestedAt: REVIEW_TIME, semantic: input.semantic, behavior: input.behavior },
    sourceEvidence,
    candidates: [candidate],
    reviewerFindings: [{ candidateId, reviewerId: "legacy-defense-task2-review", reviewedAt: REVIEW_TIME, result: "suitable" as const, summary: "The root-release descriptor is suitable for this isolated QC role without using legacy artwork.", evidenceIds: [`${prefix}-visual`, `${prefix}-technical`], findingDigest: ASSET_GOVERNANCE_REVIEW.sha256 }],
    limitations: [{ limitationId: `${prefix}-legacy-art-blocked`, candidateId: null, severity: "blocking" as const, summary: "Legacy artwork has no accepted title-specific lawful provenance, license, credit, or ingestion receipt.", evidenceIds: [`${prefix}-source-ledger`] }],
    provenance: [{ candidateId, sourceIdentity: `standard-pack:${input.semanticKey}`, sourceSha256: entry.physical.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, chainOfCustody: [`${prefix}-asset`, `${prefix}-catalog`, `${prefix}-receipt`] }],
    licensing: [{ candidateId, status: "approved" as const, licenseId: "ElvGames-License-ELVGAMES", evidenceId: `${prefix}-license`, reviewedBy: "legacy-defense-task2-review", reviewedAt: REVIEW_TIME, obligations: ["retain-credit", "no-generative-ai-training", "no-crypto-nft", "no-resale", "no-authorship-claim"] }],
    credits: [{ candidateId, required: true as const, displayText: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, evidenceId: `${prefix}-credit` }],
    releaseBinding: { predecessorRelease: ACCEPTED_RELEASE, predecessorDescriptorIds: [descriptor.descriptorId], proposedSuccessorRelease: null, policy: "successor-evidence-required-before-publication" as const },
    decision,
    dossierDigest: "",
  };
  dossier.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(dossier));
  return validateStandardPackSuitabilityDossier(dossier);
}

/** Creates title-scoped semantic unions and deterministic hashes from the reviewed role inputs. */
async function createSelectedUnions(): Promise<readonly LegacyDefenseSelectedUnionInput[]> {
  return Object.freeze(await Promise.all(LEGACY_DEFENSE_SOURCE_MANIFESTS.map(async (manifest) => {
    const semanticKeys = Object.freeze(LEGACY_DEFENSE_TASK2_ROLE_INPUTS
      .filter((input) => input.titleId === manifest.titleId)
      .map((input) => input.semanticKey)
      .filter((key, index, values) => values.indexOf(key) === index)
      .sort((left, right) => left.localeCompare(right)));
    return Object.freeze({ titleId: manifest.titleId, semanticKeys, selectedUnionDigest: await sha256(semanticKeys.join("\n")) });
  })));
}

/**
 * Creates the Task 2 defense dossier package against the root accepted standard-pack release.
 * @param catalog Complete generated standard-pack catalog.
 * @returns Validated descriptors, dossiers, and title-specific selected unions.
 * @throws When the catalog or an owner binding drifts from the accepted release.
 */
export async function createLegacyDefenseTask2SuitabilityPackage(catalog: StandardAssetCatalog): Promise<LegacyDefenseTask2SuitabilityPackage> {
  const resolver = await createAcceptedStandardAssetResolver(catalog, ACCEPTED_RELEASE);
  const resolved = new Map<SemanticKey, StandardAssetCatalogEntry & { readonly requiredCredit: string }>();
  for (const key of Object.keys(DESCRIPTOR_DEFINITIONS) as SemanticKey[]) {
    const entry = resolver.resolve(key);
    assertEntry(key, entry);
    resolved.set(key, entry);
  }
  const dossiers: StandardPackSuitabilityDossier[] = [];
  for (const input of LEGACY_DEFENSE_TASK2_ROLE_INPUTS) {
    assertOwnerBinding(input);
    dossiers.push(await createDossier(input, resolved.get(input.semanticKey)!));
  }
  return Object.freeze({
    release: ACCEPTED_RELEASE,
    descriptors: LEGACY_DEFENSE_CANONICAL_DESCRIPTORS,
    dossiers: Object.freeze(dossiers),
    selectedUnionInputs: await createSelectedUnions(),
    sourceManifests: LEGACY_DEFENSE_SOURCE_MANIFESTS,
  });
}

/**
 * Creates the descriptor-aware resolver used exclusively by the isolated legacy-defense QC cohort.
 * @param catalog Complete standard-pack catalog.
 * @returns A resolver with only the five accepted defense descriptors.
 * @throws When the accepted release or approved semantic bindings do not match.
 */
export async function createLegacyDefenseTask2CanonicalResolver(catalog: StandardAssetCatalog): Promise<AssetContractV2SemanticResolver> {
  const resolver = await createAcceptedStandardAssetResolver(catalog, ACCEPTED_RELEASE);
  return createDescriptorAwareSemanticAssetResolver(resolver, DEFENSE_BINDINGS, LEGACY_DEFENSE_CANONICAL_DESCRIPTORS);
}
