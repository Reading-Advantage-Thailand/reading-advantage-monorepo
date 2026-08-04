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

const EVIDENCE_TIME = "2026-07-31T12:00:00.000Z";
const ACCEPTED_RELEASE = Object.freeze({
  version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
  catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
  sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
});
const ASSET_GOVERNANCE_REVIEW = Object.freeze({
  path: "measure/tracks/apk_standard_pack_suitability_ingestion_20260728/current-byte-independent-review-v1.json",
  sha256: "b55be6fbba3526f70ac29930b6f7ae2f55011d19ef7f9ec1d41a7786c4b2873d",
});
const CATALOG_PATH = "packages/advantage-play-kit/assets/standard/standard-pack-release.json";
const CATALOG_SHA256 = "572b871389304ae64612f0355193e649763e25663c1ab5b98f4ca221c1cfef3e";
const CURATED_RECEIPT_PATH = "packages/advantage-play-kit/assets/standard/CURATED-RECEIPT.tsv";
const CURATED_RECEIPT_SHA256 = "a192f1fe2826aa426228950092fb32cb47cb24dd4acd47057d7424a0dfd527bb";
const LICENSE_PATH = "packages/advantage-play-kit/assets/standard/LICENSE-ELVGAMES.txt";
const LICENSE_SHA256 = "3efc9b9a88752a089fa07de4fac43cabe6283b0051466661c55a97c1c625c48f";
const CREDIT_PATH = "packages/advantage-play-kit/assets/standard/README.md";
const CREDIT_SHA256 = "6ace14005c2d155ed24376e6dbd6e02a53906db660866eccb1ba38868f0e04cb";

const NO_PRODUCTION_AUTHORIZATION = Object.freeze({
  productionUseAuthorized: false as const,
  migrationAuthorized: false as const,
  cutoverAuthorized: false as const,
  deploymentAuthorized: false as const,
});
const REVIEWER_APPROVAL = Object.freeze({
  status: "accepted" as const,
  actorId: "existing-action-standard-pack-review",
  decidedAt: EVIDENCE_TIME,
  evidenceDigest: ASSET_GOVERNANCE_REVIEW.sha256,
});
const OWNER_PENDING = Object.freeze({ status: "pending" as const });
const NON_VISUAL_COLLISION_ENVELOPE = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
const NON_VISUAL_READABILITY_ENVELOPE = Object.freeze({ minimumRenderPixels: 1, minimumContrastRatio: 1 });

type SemanticKey =
  | "top-down/32x32/characters/hero-01"
  | "side-view/32x32/characters/enemy-001-idle"
  | "effects/32x32/combat/hit-01"
  | "audio/native/combat/hit-01";

type DescriptorDefinition = Readonly<{
  descriptorId: string;
  sha256: string;
  dimensions: Readonly<{ width: number; height: number }> | null;
  geometry: Readonly<{ frameWidth: number; frameHeight: number; columns: number; rows: number }> | null;
  collisionEnvelope: AssetContractV2PhysicalDescriptor["collisionEnvelope"];
  minimumRenderPixels: number | null;
}>;

const DESCRIPTOR_DEFINITIONS: Readonly<Record<SemanticKey, DescriptorDefinition>> = Object.freeze({
  "top-down/32x32/characters/hero-01": {
    descriptorId: "existing-action-player-idle-static-v1",
    sha256: "6aeab3f50c0f6be436eeb5594e7d9c1ae31f8f19ac3bdfa04d7fbcbf856ba5e4",
    dimensions: { width: 192, height: 384 },
    geometry: { frameWidth: 32, frameHeight: 32, columns: 6, rows: 12 },
    collisionEnvelope: { x: 7 / 32, y: 12 / 32, width: 25 / 32, height: 20 / 32 },
    minimumRenderPixels: 32,
  },
  "side-view/32x32/characters/enemy-001-idle": {
    descriptorId: "existing-action-enemy-idle-static-v1",
    sha256: "0edfb7ed11f9c4cf46dfb97e2b158e391202dbf944789c059b0ec0b68e0492db",
    dimensions: { width: 192, height: 32 },
    geometry: { frameWidth: 32, frameHeight: 32, columns: 6, rows: 1 },
    collisionEnvelope: { x: 10 / 32, y: 16 / 32, width: 12 / 32, height: 16 / 32 },
    minimumRenderPixels: 16,
  },
  "effects/32x32/combat/hit-01": {
    descriptorId: "existing-action-feedback-correct-static-v1",
    sha256: "5062b915d194a51d1df910f2b00a8dd33f654e8e5f7b8f38baa0626d1f7528f1",
    dimensions: { width: 192, height: 128 },
    geometry: { frameWidth: 32, frameHeight: 32, columns: 6, rows: 4 },
    collisionEnvelope: { x: 4 / 32, y: 5 / 32, width: 23 / 32, height: 22 / 32 },
    minimumRenderPixels: 16,
  },
  "audio/native/combat/hit-01": {
    descriptorId: "existing-action-feedback-correct-audio-v1",
    sha256: "25c239ed9b6c9cd898a2ffb2c2760e87499ee5f6330060aa51be87f548bd5f23",
    dimensions: null,
    geometry: null,
    collisionEnvelope: NON_VISUAL_COLLISION_ENVELOPE,
    minimumRenderPixels: null,
  },
});

/** Creates one frozen descriptor definition for a reviewed canonical semantic key. */
function createDescriptorDefinition(semanticKey: SemanticKey): AssetContractV2PhysicalDescriptor {
  const definition = DESCRIPTOR_DEFINITIONS[semanticKey];
  if (definition.dimensions === null || definition.geometry === null) {
    return validateAssetContractV2Descriptor({
      contractVersion: 2,
      descriptorId: definition.descriptorId,
      catalogEntryKey: semanticKey,
      release: ACCEPTED_RELEASE,
      mediaKind: "audio",
      audio: { durationMs: 1667, channels: 2, loop: false },
      anchor: { x: 0.5, y: 0.5 },
      renderScale: 1,
      collisionEnvelope: NON_VISUAL_COLLISION_ENVELOPE,
      readabilityEnvelope: NON_VISUAL_READABILITY_ENVELOPE,
    });
  }
  return validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: definition.descriptorId,
    catalogEntryKey: semanticKey,
    release: ACCEPTED_RELEASE,
    mediaKind: "image",
    geometry: {
      width: definition.dimensions.width,
      height: definition.dimensions.height,
      ...definition.geometry,
    },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: definition.collisionEnvelope,
    readabilityEnvelope: { minimumRenderPixels: definition.minimumRenderPixels!, minimumContrastRatio: 1 },
  });
}

/** Asset Contract v2 descriptors selected by the Existing Action Task 2 dossiers. */
export const EXISTING_ACTION_CANONICAL_DESCRIPTORS: readonly AssetContractV2PhysicalDescriptor[] = Object.freeze(
  (Object.keys(DESCRIPTOR_DEFINITIONS) as SemanticKey[]).map(createDescriptorDefinition),
);

/** Minimal owner-approved binding manifest needed by the action QC selected union. */
const EXISTING_ACTION_DESCRIPTOR_BINDINGS = validateSemanticProductBindings({
  ...OWNER_APPROVED_CANONICAL_BINDINGS,
  bindings: OWNER_APPROVED_CANONICAL_BINDINGS.bindings.filter((binding) => (
    Object.hasOwn(DESCRIPTOR_DEFINITIONS, binding.semanticKey)
  )),
});

/** Immutable historical manifest retained to block legacy art reuse and ingestion. */
export interface ExistingActionLegacySourceManifest {
  /** Stable title identity. */
  readonly titleId: string;
  /** Archive path containing the exact source-ledger bytes. */
  readonly path: string;
  /** SHA-256 of the archived source-ledger bytes. */
  readonly sha256: string;
  /** Source temporal class retained from the historical evidence record. */
  readonly temporalScope: "historical-source-only";
  /** The legacy manifest cannot select a physical asset for reuse. */
  readonly legacyReuseDecision: "blocked";
  /** The legacy manifest cannot admit a physical asset for canonical ingestion. */
  readonly legacyIngestionDecision: "blocked";
}

/** Hash-pinned historical source manifests for the exact five-title action cohort. */
export const EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS: readonly ExistingActionLegacySourceManifest[] = Object.freeze([
  { titleId: "archers-revenge", path: "measure/archive/apk_corpus_audit_action_defense_20260712/archers-revenge-claim-ledger-batch-b-v8.json", sha256: "1fedca7dffa8897a3bb0f5482a1c74c484bc3f16e5361ddd06dcc89ec8ec1ca3", temporalScope: "historical-source-only", legacyReuseDecision: "blocked", legacyIngestionDecision: "blocked" },
  { titleId: "paladins-twin-soul", path: "measure/archive/apk_corpus_audit_action_defense_20260712/paladins-twin-soul-claim-ledger-batch-c-v4.json", sha256: "809e51d319294a3cd4c7e6727a442382b831f4b18b40a900c0a900ebddfa7d8d", temporalScope: "historical-source-only", legacyReuseDecision: "blocked", legacyIngestionDecision: "blocked" },
  { titleId: "griffin-sky-joust", path: "measure/archive/apk_corpus_audit_special_historical_20260712/packages/griffin-sky-joust/claim-ledger-v2.json", sha256: "dbe69391387b5ae8bae2fe0e6d1a0e3b6a687ed9f372b3259cd00c9f92958905", temporalScope: "historical-source-only", legacyReuseDecision: "blocked", legacyIngestionDecision: "blocked" },
  { titleId: "gryphon-patrol", path: "measure/archive/apk_corpus_audit_action_defense_20260712/gryphon-patrol-claim-ledger-batch-c-v4.json", sha256: "d3e0de2a047d59ba5a128cb3780d1e5f42f04c8ae0361cb04e633ef8f671e4eb", temporalScope: "historical-source-only", legacyReuseDecision: "blocked", legacyIngestionDecision: "blocked" },
  { titleId: "realm-carver", path: "measure/archive/apk_corpus_audit_special_historical_20260712/packages/realm-carver/claim-ledger-v2.json", sha256: "259b821e88143665203830814292ad19a78397d9974f2dee6edd9e92051e8afc", temporalScope: "historical-source-only", legacyReuseDecision: "blocked", legacyIngestionDecision: "blocked" },
]);

/** One title-role request that can only reuse a root-accepted canonical descriptor. */
export interface ExistingActionTask2CanonicalReuseInput {
  /** Stable title identifier. */
  readonly titleId: string;
  /** Isolated QC cartridge identifier. */
  readonly cartridgeId: string;
  /** Semantic role and state selected through the T11 owner binding. */
  readonly semantic: AssetContractV2SemanticRequirement;
  /** Root-release semantic key required by the owner binding. */
  readonly semanticKey: SemanticKey;
  /** Physical behavior constraints tested against the selected descriptor. */
  readonly behavior: StandardPackPhysicalBehaviorConstraints;
}

type RoleInputDefinition = Readonly<{
  semantic: AssetContractV2SemanticRequirement;
  semanticKey: SemanticKey;
  behavior: StandardPackPhysicalBehaviorConstraints;
}>;

const ROLE_INPUTS: readonly RoleInputDefinition[] = Object.freeze([
  { semantic: { role: "player", state: "idle" }, semanticKey: "top-down/32x32/characters/hero-01", behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 384 }, collisionEnvelopeRequired: true, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["high-contrast-silhouette"] } },
  { semantic: { role: "enemy", state: "idle" }, semanticKey: "side-view/32x32/characters/enemy-001-idle", behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 32 }, collisionEnvelopeRequired: true, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["distinct-enemy-silhouette"] } },
  { semantic: { role: "feedback", state: "correct" }, semanticKey: "effects/32x32/combat/hit-01", behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 128 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["clear-feedback"] } },
  { semantic: { role: "audio-feedback", state: "correct" }, semanticKey: "audio/native/combat/hit-01", behavior: { mediaKind: "audio", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: null, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["nonvisual-feedback"] } },
] as const);

/** Exact title-role inputs used to create Task 2 canonical-reuse dossiers. */
export const EXISTING_ACTION_TASK2_CANONICAL_REUSE_INPUTS: readonly ExistingActionTask2CanonicalReuseInput[] = Object.freeze(
  EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS.flatMap((manifest) => ROLE_INPUTS.map((role) => Object.freeze({
    titleId: manifest.titleId,
    cartridgeId: `${manifest.titleId}-qc-cartridge`,
    semantic: role.semantic,
    semanticKey: role.semanticKey,
    behavior: role.behavior,
  }))),
);

/** Deterministic selected-union input for one title with no physical asset path. */
export interface ExistingActionTask2SelectedUnionInput {
  /** Stable title identity. */
  readonly titleId: string;
  /** Sorted semantic keys selected for this title only. */
  readonly semanticKeys: readonly string[];
}

/** The complete non-authorizing Task 2 suitability package. */
export interface ExistingActionTask2SuitabilityPackage {
  /** Exact root accepted release every dossier pins. */
  readonly release: Readonly<{ version: string; catalogDigest: string; sourceReceiptDigest: string }>;
  /** Descriptor facts for the root-release sources selected by the dossier set. */
  readonly descriptors: readonly AssetContractV2PhysicalDescriptor[];
  /** Real, validated draft suitability dossiers with pending owner acceptance. */
  readonly dossiers: readonly StandardPackSuitabilityDossier[];
  /** Title-scoped selected semantic outputs. */
  readonly selectedUnionInputs: readonly ExistingActionTask2SelectedUnionInput[];
  /** Historical source ledgers that remain blocked for asset reuse and ingestion. */
  readonly legacySourceManifests: readonly ExistingActionLegacySourceManifest[];
}

/** Computes a browser-safe SHA-256 digest. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Asserts that an owner-approved semantic binding exactly matches a title request. */
function assertOwnerBinding(input: ExistingActionTask2CanonicalReuseInput): void {
  const binding = OWNER_APPROVED_CANONICAL_BINDINGS.bindings.find((candidate) => (
    candidate.role === input.semantic.role && candidate.state === input.semantic.state
  ));
  if (!binding || binding.semanticKey !== input.semanticKey) {
    throw new Error(`Existing Action input lacks the accepted T11 binding for ${input.semantic.role}:${input.semantic.state}`);
  }
}

/** Verifies the resolved canonical entry against exact reviewed standard-pack facts. */
function assertExpectedEntry(semanticKey: SemanticKey, entry: StandardAssetCatalogEntry & { readonly requiredCredit: string }): void {
  const definition = DESCRIPTOR_DEFINITIONS[semanticKey];
  if (
    entry.key !== semanticKey
    || entry.physical.sha256 !== definition.sha256
    || entry.sourceReceiptLocator !== CURATED_RECEIPT_PATH.split("/").slice(-1)[0] + ":" + ({
      "top-down/32x32/characters/hero-01": 2,
      "side-view/32x32/characters/enemy-001-idle": 3,
      "effects/32x32/combat/hit-01": 7,
      "audio/native/combat/hit-01": 8,
    } as const)[semanticKey]
    || entry.requiredCredit !== ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit
    || (definition.dimensions === null
      ? entry.physical.kind !== "audio" || entry.physical.dimensions !== null
      : entry.physical.kind !== "image"
        || entry.physical.dimensions?.width !== definition.dimensions.width
        || entry.physical.dimensions?.height !== definition.dimensions.height)
  ) {
    throw new Error(`Existing Action canonical source bytes do not match reviewed evidence for ${semanticKey}`);
  }
}

/** Builds a descriptor from measured root-release bytes without asserting animation behavior. */
function createDescriptor(semanticKey: SemanticKey, entry: StandardAssetCatalogEntry & { readonly requiredCredit: string }): AssetContractV2PhysicalDescriptor {
  const definition = DESCRIPTOR_DEFINITIONS[semanticKey];
  if (definition.dimensions === null || definition.geometry === null) {
    return validateAssetContractV2Descriptor({
      contractVersion: 2,
      descriptorId: definition.descriptorId,
      catalogEntryKey: semanticKey,
      release: ACCEPTED_RELEASE,
      mediaKind: "audio",
      audio: { durationMs: 1667, channels: 2, loop: false },
      anchor: { x: 0.5, y: 0.5 },
      renderScale: 1,
      collisionEnvelope: NON_VISUAL_COLLISION_ENVELOPE,
      readabilityEnvelope: NON_VISUAL_READABILITY_ENVELOPE,
    });
  }
  return validateAssetContractV2Descriptor({
    contractVersion: 2,
    descriptorId: definition.descriptorId,
    catalogEntryKey: semanticKey,
    release: ACCEPTED_RELEASE,
    mediaKind: "image",
    geometry: {
      width: entry.physical.dimensions!.width,
      height: entry.physical.dimensions!.height,
      ...definition.geometry,
    },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: definition.collisionEnvelope,
    readabilityEnvelope: { minimumRenderPixels: definition.minimumRenderPixels!, minimumContrastRatio: 1 },
  });
}

/** Creates source, historical-manifest, provenance, licensing, and comparison evidence for one candidate. */
function createEvidence(
  prefix: string,
  entry: StandardAssetCatalogEntry & { readonly requiredCredit: string },
  legacyManifest: ExistingActionLegacySourceManifest,
): StandardPackSuitabilitySourceEvidence[] {
  return [
    { evidenceId: `${prefix}-asset`, kind: "canonical-catalog", locator: `packages/advantage-play-kit/assets/standard/${entry.path}`, sha256: entry.physical.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-action-standard-pack-review" },
    { evidenceId: `${prefix}-catalog`, kind: "canonical-catalog", locator: CATALOG_PATH, sha256: CATALOG_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-action-standard-pack-review" },
    { evidenceId: `${prefix}-receipt`, kind: "canonical-catalog", locator: CURATED_RECEIPT_PATH, sha256: CURATED_RECEIPT_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-action-standard-pack-review" },
    { evidenceId: `${prefix}-legacy-manifest`, kind: "legacy-source", locator: legacyManifest.path, sha256: legacyManifest.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-action-standard-pack-review" },
    { evidenceId: `${prefix}-license`, kind: "license", locator: LICENSE_PATH, sha256: LICENSE_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-action-standard-pack-review" },
    { evidenceId: `${prefix}-credit`, kind: "credit", locator: CREDIT_PATH, sha256: CREDIT_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-action-standard-pack-review" },
    { evidenceId: `${prefix}-visual`, kind: "visual-comparison", locator: ASSET_GOVERNANCE_REVIEW.path, sha256: ASSET_GOVERNANCE_REVIEW.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-action-standard-pack-review" },
    { evidenceId: `${prefix}-technical`, kind: "technical-comparison", locator: "measure/tracks/apk_existing_action_cutover_20260727/task2-standard-pack-suitability-dossiers-v1.json", sha256: "ed1e75f3c8537db0dae020f2209060800dba3c349a13e29190cdd2b7ab8c7c0a", sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-action-standard-pack-review" },
  ];
}

/** Builds a title-role draft dossier while preserving pending owner authority. */
async function createDossier(
  input: ExistingActionTask2CanonicalReuseInput,
  entry: StandardAssetCatalogEntry & { readonly requiredCredit: string },
): Promise<StandardPackSuitabilityDossier> {
  const legacyManifest = EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS.find((candidate) => candidate.titleId === input.titleId);
  if (!legacyManifest) throw new Error(`Existing Action source manifest is missing for ${input.titleId}`);
  const prefix = `existing-action-${input.titleId}-${input.semantic.role}-${input.semantic.state}`;
  const descriptor = createDescriptor(input.semanticKey, entry);
  const candidateId = `${prefix}-canonical`;
  const sourceEvidence = createEvidence(prefix, entry, legacyManifest);
  const candidate: StandardPackSuitabilityCandidate = {
    candidateId,
    origin: "canonical",
    semantic: input.semantic,
    descriptor: {
      descriptorId: descriptor.descriptorId,
      catalogEntryKey: descriptor.catalogEntryKey,
      descriptorDigest: await sha256(serializeAssetContractV2PhysicalDescriptorPayload(descriptor)),
      release: ACCEPTED_RELEASE,
    },
    sourceEvidenceIds: [`${prefix}-asset`, `${prefix}-catalog`, `${prefix}-receipt`],
    comparisonEvidenceIds: [`${prefix}-visual`, `${prefix}-technical`],
    suitability: {
      semanticFit: "pass",
      visualReadability: input.behavior.mediaKind === "audio" ? "not-applicable" : "pass",
      frameDirectionCompatibility: "not-applicable",
      animationBehavior: "not-applicable",
      geometry: input.behavior.mediaKind === "audio" ? "not-applicable" : "pass",
      collisionEnvelope: input.behavior.collisionEnvelopeRequired ? "pass" : "not-applicable",
      audienceAppropriateness: "pass",
      localization: "not-applicable",
      accessibility: "pass",
      sourceReceipt: "pass",
      creditObligations: "pass",
    },
    requiresCanonicalIngestion: false,
  };
  const decision = {
    disposition: "reuse-canonical" as const,
    candidateId,
    descriptorId: descriptor.descriptorId,
    nextStep: "publish-accepted-binding" as const,
    rationale: "The root-accepted canonical asset passes the descriptor, geometry, source-receipt, credit, and accessibility constraints. Historical source records remain blocked for both reuse and ingestion.",
    reviewerApproval: REVIEWER_APPROVAL,
    ownerApproval: OWNER_PENDING,
    authorization: NO_PRODUCTION_AUTHORIZATION,
    decisionDigest: "",
  };
  decision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(decision));
  const dossier = {
    schemaVersion: 1 as const,
    dossierId: `${prefix}-canonical-reuse-v1`,
    createdAt: EVIDENCE_TIME,
    request: { requestId: `${prefix}-request-v1`, requestingTitle: input.titleId, requestingCartridge: input.cartridgeId, requestedAt: EVIDENCE_TIME, semantic: input.semantic, behavior: input.behavior },
    sourceEvidence,
    candidates: [candidate],
    reviewerFindings: [{ candidateId, reviewerId: "existing-action-standard-pack-review", reviewedAt: EVIDENCE_TIME, result: "suitable" as const, summary: "The selected root-release canonical descriptor satisfies this title role without using private or historical artwork.", evidenceIds: [`${prefix}-visual`, `${prefix}-technical`], findingDigest: ASSET_GOVERNANCE_REVIEW.sha256 }],
    limitations: [{ limitationId: `${prefix}-legacy-source-blocked`, candidateId: null, severity: "blocking" as const, summary: "The historical source manifest is retained as evidence only; no legacy artwork is suitable for reuse or ingestion without separately accepted lawful source-packet evidence.", evidenceIds: [`${prefix}-legacy-manifest`] }],
    provenance: [{ candidateId, sourceIdentity: `standard-pack:${input.semanticKey}`, sourceSha256: entry.physical.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, chainOfCustody: [`${prefix}-asset`, `${prefix}-catalog`, `${prefix}-receipt`] }],
    licensing: [{ candidateId, status: "approved" as const, licenseId: "ElvGames-License-ELVGAMES", evidenceId: `${prefix}-license`, reviewedBy: "existing-action-standard-pack-review", reviewedAt: EVIDENCE_TIME, obligations: ["retain-credit", "no-generative-ai-training", "no-crypto-nft", "no-resale", "no-authorship-claim"] }],
    credits: [{ candidateId, required: true as const, displayText: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit, evidenceId: `${prefix}-credit` }],
    releaseBinding: { predecessorRelease: ACCEPTED_RELEASE, predecessorDescriptorIds: [descriptor.descriptorId], proposedSuccessorRelease: null, policy: "successor-evidence-required-before-publication" as const },
    decision,
    dossierDigest: "",
  };
  dossier.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(dossier));
  return validateStandardPackSuitabilityDossier(dossier);
}

/** Groups title role selections into deterministic minimal semantic unions. */
function createSelectedUnionInputs(): readonly ExistingActionTask2SelectedUnionInput[] {
  return Object.freeze(EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS.map((manifest) => Object.freeze({
    titleId: manifest.titleId,
    semanticKeys: Object.freeze(EXISTING_ACTION_TASK2_CANONICAL_REUSE_INPUTS
      .filter((input) => input.titleId === manifest.titleId)
      .map((input) => input.semanticKey)
      .sort((left, right) => left.localeCompare(right))),
  })));
}

/**
 * Creates the Task 2 real root-release dossier package for the Existing Action cohort.
 * @param catalog Complete generated standard-pack catalog that must match the root accepted release.
 * @returns Validated draft dossiers, descriptors, selected-union inputs, and blocked historical source manifests.
 * @throws When the catalog, a selected byte, or an owner-approved T11 semantic role binding does not match the accepted release.
 */
export async function createExistingActionTask2SuitabilityPackage(
  catalog: StandardAssetCatalog,
): Promise<ExistingActionTask2SuitabilityPackage> {
  const resolver = await createAcceptedStandardAssetResolver(catalog, ACCEPTED_RELEASE);
  const resolved = new Map<SemanticKey, StandardAssetCatalogEntry & { readonly requiredCredit: string }>();
  for (const key of Object.keys(DESCRIPTOR_DEFINITIONS) as SemanticKey[]) {
    const entry = resolver.resolve(key);
    assertExpectedEntry(key, entry);
    resolved.set(key, entry);
  }
  const dossiers: StandardPackSuitabilityDossier[] = [];
  for (const input of EXISTING_ACTION_TASK2_CANONICAL_REUSE_INPUTS) {
    assertOwnerBinding(input);
    dossiers.push(await createDossier(input, resolved.get(input.semanticKey)!));
  }
  return Object.freeze({
    release: ACCEPTED_RELEASE,
    descriptors: Object.freeze((Object.keys(DESCRIPTOR_DEFINITIONS) as SemanticKey[]).map((key) => createDescriptor(key, resolved.get(key)!))),
    dossiers: Object.freeze(dossiers),
    selectedUnionInputs: createSelectedUnionInputs(),
    legacySourceManifests: EXISTING_ACTION_LEGACY_SOURCE_MANIFESTS,
  });
}

/**
 * Creates the descriptor-aware resolver required by Existing Action candidates and QC.
 * @param catalog Complete standard-pack catalog claimed to be the accepted release.
 * @returns A resolver-issued Asset Contract v2 registration boundary for the four approved semantic keys.
 * @throws When the catalog, owner bindings, or recorded descriptor facts differ from the accepted release.
 */
export async function createExistingActionTask2CanonicalResolver(
  catalog: StandardAssetCatalog,
): Promise<AssetContractV2SemanticResolver> {
  const resolver = await createAcceptedStandardAssetResolver(catalog, ACCEPTED_RELEASE);
  return createDescriptorAwareSemanticAssetResolver(
    resolver,
    EXISTING_ACTION_DESCRIPTOR_BINDINGS,
    EXISTING_ACTION_CANONICAL_DESCRIPTORS,
  );
}
