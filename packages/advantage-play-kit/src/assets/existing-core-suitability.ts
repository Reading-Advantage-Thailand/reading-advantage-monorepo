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
import { OWNER_APPROVED_CANONICAL_BINDINGS } from "./semantic-product-bindings.js";
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
const EVIDENCE_REVIEW_PATH = "measure/tracks/apk_standard_pack_suitability_ingestion_20260728/task5-canonical-reuse-evidence-v1.json";
const EVIDENCE_REVIEW_SHA256 = "a602d07e338327c04f5fcbb2a3cede179268aed963c0bc76292569db1eff1257";
const TASK3_SEMANTIC_RECEIPT_PATH = "measure/tracks/apk_existing_core_cutover_20260727/task3-current-lineage-receipt-v1.json";
const TASK3_SEMANTIC_RECEIPT_SHA256 = "c5ccb0ac3b54474e2ad99badb2aef5c1608689e57559e2f26c6fb489a5513d7f";
const TASK3_HISTORICAL_SEMANTIC_RECEIPT_PATH = "measure/tracks/apk_existing_core_cutover_20260727/accepted-semantic-adoption-receipt-v1.json";
const TASK3_HISTORICAL_SEMANTIC_RECEIPT_SHA256 = "e82d42d9ec046b85eb4aeac7800623bce3c3bf4a39a9c0f44288bd93d07be240";
const TASK4_QC_RECEIPT_PATH = "measure/tracks/apk_existing_core_cutover_20260727/accepted-task4-qc-receipt-v1.json";
const TASK4_QC_RECEIPT_SHA256 = "b6ffefcebf8a75d9967f196693fe7cf14a133d66123537d201b52e9af4745dd9";
const CATALOG_PATH = "packages/advantage-play-kit/assets/standard/standard-pack-release.json";
const CATALOG_SHA256 = "572b871389304ae64612f0355193e649763e25663c1ab5b98f4ca221c1cfef3e";
const CURATED_RECEIPT_PATH = "packages/advantage-play-kit/assets/standard/CURATED-RECEIPT.tsv";
const CURATED_RECEIPT_SHA256 = "a192f1fe2826aa426228950092fb32cb47cb24dd4acd47057d7424a0dfd527bb";
const IMPORT_RECEIPT_PATH = "packages/advantage-play-kit/assets/standard/IMPORT-RECEIPT.tsv";
const IMPORT_RECEIPT_SHA256 = "80b3adf263c7900e208103ebeaabf520990396d64d16d548c8819601a9a04ac8";
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
  actorId: "existing-core-canonical-review",
  decidedAt: EVIDENCE_TIME,
  evidenceDigest: EVIDENCE_REVIEW_SHA256,
});
const OWNER_PENDING = Object.freeze({ status: "pending" as const });
const NON_VISUAL_COLLISION_ENVELOPE = Object.freeze({ x: 0, y: 0, width: 1, height: 1 });
const NON_VISUAL_READABILITY_ENVELOPE = Object.freeze({ minimumRenderPixels: 1, minimumContrastRatio: 1 });

type SourceMeasurement = Readonly<{
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  populatedFrameCount: number;
  emptyFrameCount: number;
  minimumOpaquePixels: number;
  minimumOpaqueWidth: number;
  minimumOpaqueHeight: number;
  occupiedBounds: Readonly<{ x: number; y: number; width: number; height: number }>;
  clipEvidence: "unassigned-no-reviewed-clip-semantics" | "single-cell-static-source";
  directionEvidence: "unassigned-no-reviewed-direction-semantics" | "not-applicable";
}>;

type DescriptorDefinition = Readonly<{
  descriptorId: string;
  sourceReceiptLocator: string;
  sha256: string;
  dimensions: Readonly<{ width: number; height: number }> | null;
  measurement: SourceMeasurement | null;
  minimumRenderPixels: number | null;
}>;

const descriptorDefinitions: Readonly<Record<string, DescriptorDefinition>> = {
  "top-down/32x32/characters/hero-01": {
    descriptorId: "existing-core-hero-01-static-v1",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:2",
    sha256: "6aeab3f50c0f6be436eeb5594e7d9c1ae31f8f19ac3bdfa04d7fbcbf856ba5e4",
    dimensions: { width: 192, height: 384 },
    measurement: {
      frameWidth: 32, frameHeight: 32, columns: 6, rows: 12,
      populatedFrameCount: 68, emptyFrameCount: 4,
      minimumOpaquePixels: 170, minimumOpaqueWidth: 14, minimumOpaqueHeight: 13,
      occupiedBounds: { x: 7, y: 12, width: 25, height: 20 },
      clipEvidence: "unassigned-no-reviewed-clip-semantics",
      directionEvidence: "unassigned-no-reviewed-direction-semantics",
    },
    minimumRenderPixels: 32,
  },
  "side-view/32x32/characters/enemy-001-idle": {
    descriptorId: "existing-core-enemy-001-idle-static-v1",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:3",
    sha256: "0edfb7ed11f9c4cf46dfb97e2b158e391202dbf944789c059b0ec0b68e0492db",
    dimensions: { width: 192, height: 32 },
    measurement: {
      frameWidth: 32, frameHeight: 32, columns: 6, rows: 1,
      populatedFrameCount: 6, emptyFrameCount: 0,
      minimumOpaquePixels: 122, minimumOpaqueWidth: 12, minimumOpaqueHeight: 13,
      occupiedBounds: { x: 10, y: 16, width: 12, height: 16 },
      clipEvidence: "unassigned-no-reviewed-clip-semantics",
      directionEvidence: "unassigned-no-reviewed-direction-semantics",
    },
    minimumRenderPixels: 16,
  },
  "effects/32x32/combat/hit-01": {
    descriptorId: "existing-core-hit-01-static-v1",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:7",
    sha256: "5062b915d194a51d1df910f2b00a8dd33f654e8e5f7b8f38baa0626d1f7528f1",
    dimensions: { width: 192, height: 128 },
    measurement: {
      frameWidth: 32, frameHeight: 32, columns: 6, rows: 4,
      populatedFrameCount: 5, emptyFrameCount: 19,
      minimumOpaquePixels: 4, minimumOpaqueWidth: 2, minimumOpaqueHeight: 2,
      occupiedBounds: { x: 4, y: 5, width: 23, height: 22 },
      clipEvidence: "unassigned-no-reviewed-clip-semantics",
      directionEvidence: "not-applicable",
    },
    minimumRenderPixels: 16,
  },
  "ui/16x16/controls/gamepad-buttons": {
    descriptorId: "existing-core-gamepad-buttons-static-v1",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:4",
    sha256: "860451d3140de5ef5b42d8ff5908e5a02a9012296eb1e8631a687373ced10100",
    dimensions: { width: 352, height: 160 },
    measurement: {
      frameWidth: 16, frameHeight: 16, columns: 22, rows: 10,
      populatedFrameCount: 130, emptyFrameCount: 90,
      minimumOpaquePixels: 66, minimumOpaqueWidth: 8, minimumOpaqueHeight: 6,
      occupiedBounds: { x: 1, y: 1, width: 14, height: 14 },
      clipEvidence: "unassigned-no-reviewed-clip-semantics",
      directionEvidence: "not-applicable",
    },
    minimumRenderPixels: 16,
  },
  "ui/20x20/inventory/slot": {
    descriptorId: "existing-core-inventory-slot-static-v1",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:5",
    sha256: "364560d9df9ebc14a2806d687776015624af79430e5f5b1e192de3fcf1db7524",
    dimensions: { width: 20, height: 20 },
    measurement: {
      frameWidth: 20, frameHeight: 20, columns: 1, rows: 1,
      populatedFrameCount: 1, emptyFrameCount: 0,
      minimumOpaquePixels: 400, minimumOpaqueWidth: 20, minimumOpaqueHeight: 20,
      occupiedBounds: { x: 0, y: 0, width: 20, height: 20 },
      clipEvidence: "single-cell-static-source",
      directionEvidence: "not-applicable",
    },
    minimumRenderPixels: 20,
  },
  "ui/32x32/items/armor-icons": {
    descriptorId: "existing-core-armor-icons-static-v1",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:6",
    sha256: "b01bae484f26a7ee45c44f8b875ba76dade50827a9e5418cecbd2551018cb9ee",
    dimensions: { width: 512, height: 896 },
    measurement: {
      frameWidth: 32, frameHeight: 32, columns: 16, rows: 28,
      populatedFrameCount: 424, emptyFrameCount: 24,
      minimumOpaquePixels: 190, minimumOpaqueWidth: 21, minimumOpaqueHeight: 13,
      occupiedBounds: { x: 0, y: 0, width: 32, height: 31 },
      clipEvidence: "unassigned-no-reviewed-clip-semantics",
      directionEvidence: "not-applicable",
    },
    minimumRenderPixels: 32,
  },
  "audio/native/combat/hit-01": {
    descriptorId: "existing-core-hit-01-audio-v1",
    sourceReceiptLocator: "CURATED-RECEIPT.tsv:8",
    sha256: "25c239ed9b6c9cd898a2ffb2c2760e87499ee5f6330060aa51be87f548bd5f23",
    dimensions: null,
    measurement: null,
    minimumRenderPixels: null,
  },
  "side-view/native/platformer-world/heroes/hero-002/hero-002-walk-source-6c451bbfab72": {
    descriptorId: "existing-core-side-hero-002-rejected-v1",
    sourceReceiptLocator: "IMPORT-RECEIPT.tsv:28087",
    sha256: "cbf1af836f41e53adb683cdab5ac0e779fc72109459e661bb814c9505e20113b",
    dimensions: { width: 192, height: 32 },
    measurement: {
      frameWidth: 32, frameHeight: 32, columns: 6, rows: 1,
      populatedFrameCount: 6, emptyFrameCount: 0,
       minimumOpaquePixels: 168, minimumOpaqueWidth: 15, minimumOpaqueHeight: 18,
      occupiedBounds: { x: 9, y: 12, width: 16, height: 20 },
      clipEvidence: "unassigned-no-reviewed-clip-semantics",
      directionEvidence: "unassigned-no-reviewed-direction-semantics",
    },
    minimumRenderPixels: 16,
  },
} as const;

type CanonicalKey = keyof typeof descriptorDefinitions;

/** One title/role input from the accepted Task-3 semantic binding and Task-4 selected union. */
export interface ExistingCoreTask5CanonicalReuseInput {
  /** Stable title identifier. */
  readonly titleId: string;
  /** Cartridge identifier used only for the title-scoped dossier request. */
  readonly cartridgeId: string;
  /** Accepted source temporal classification retained from Task 3. */
  readonly temporalScope: "current-source" | "historical-source-only";
  /** Role/state semantics that must match the prior accepted binding. */
  readonly semantic: AssetContractV2SemanticRequirement;
  /** Canonical source selected from the root-accepted release. */
  readonly semanticKey: CanonicalKey;
  /** Descriptor behavior requirements reviewed for this exact title role. */
  readonly behavior: StandardPackPhysicalBehaviorConstraints;
}

/** The exact five-title role inputs that derive draft canonical-reuse dossiers. */
export const EXISTING_CORE_TASK5_CANONICAL_REUSE_INPUTS: readonly ExistingCoreTask5CanonicalReuseInput[] = Object.freeze([
  {
    titleId: "dragon-flight", cartridgeId: "dragon-flight-cartridge", temporalScope: "current-source",
    semantic: { role: "player", state: "idle" }, semanticKey: "top-down/32x32/characters/hero-01",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 384 }, collisionEnvelopeRequired: true, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["high-contrast-silhouette"] },
  },
  {
    titleId: "dragon-flight", cartridgeId: "dragon-flight-cartridge", temporalScope: "current-source",
    semantic: { role: "feedback", state: "correct" }, semanticKey: "effects/32x32/combat/hit-01",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 128 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["clear-feedback"] },
  },
  {
    titleId: "dragon-flight", cartridgeId: "dragon-flight-cartridge", temporalScope: "current-source",
    semantic: { role: "audio-feedback", state: "correct" }, semanticKey: "audio/native/combat/hit-01",
    behavior: { mediaKind: "audio", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: null, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["nonvisual-feedback"] },
  },
  {
    titleId: "magic-defense", cartridgeId: "magic-defense-cartridge", temporalScope: "current-source",
    semantic: { role: "panel", state: "default" }, semanticKey: "ui/20x20/inventory/slot",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 20, height: 20 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["clear-panel-boundary"] },
  },
  {
    titleId: "magic-defense", cartridgeId: "magic-defense-cartridge", temporalScope: "current-source",
    semantic: { role: "status", state: "armor" }, semanticKey: "ui/32x32/items/armor-icons",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 512, height: 896 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["distinct-status-icon"] },
  },
  {
    titleId: "magic-defense", cartridgeId: "magic-defense-cartridge", temporalScope: "current-source",
    semantic: { role: "feedback", state: "correct" }, semanticKey: "effects/32x32/combat/hit-01",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 128 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["clear-feedback"] },
  },
  {
    titleId: "magic-defense", cartridgeId: "magic-defense-cartridge", temporalScope: "current-source",
    semantic: { role: "audio-feedback", state: "correct" }, semanticKey: "audio/native/combat/hit-01",
    behavior: { mediaKind: "audio", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: null, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["nonvisual-feedback"] },
  },
  {
    titleId: "dungeon-liberator", cartridgeId: "dungeon-liberator-cartridge", temporalScope: "current-source",
    semantic: { role: "player", state: "idle" }, semanticKey: "top-down/32x32/characters/hero-01",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 384 }, collisionEnvelopeRequired: true, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["high-contrast-silhouette"] },
  },
  {
    titleId: "dungeon-liberator", cartridgeId: "dungeon-liberator-cartridge", temporalScope: "current-source",
    semantic: { role: "enemy", state: "idle" }, semanticKey: "side-view/32x32/characters/enemy-001-idle",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 32 }, collisionEnvelopeRequired: true, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["distinct-enemy-silhouette"] },
  },
  {
    titleId: "dungeon-liberator", cartridgeId: "dungeon-liberator-cartridge", temporalScope: "current-source",
    semantic: { role: "feedback", state: "correct" }, semanticKey: "effects/32x32/combat/hit-01",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 128 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["clear-feedback"] },
  },
  {
    titleId: "dungeon-liberator", cartridgeId: "dungeon-liberator-cartridge", temporalScope: "current-source",
    semantic: { role: "control", state: "confirm" }, semanticKey: "ui/16x16/controls/gamepad-buttons",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 352, height: 160 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["labeled-confirm-control"] },
  },
  {
    titleId: "sorcerer-ziggurat", cartridgeId: "sorcerer-ziggurat-cartridge", temporalScope: "historical-source-only",
    semantic: { role: "player", state: "idle" }, semanticKey: "top-down/32x32/characters/hero-01",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 384 }, collisionEnvelopeRequired: true, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["high-contrast-silhouette"] },
  },
  {
    titleId: "sorcerer-ziggurat", cartridgeId: "sorcerer-ziggurat-cartridge", temporalScope: "historical-source-only",
    semantic: { role: "feedback", state: "correct" }, semanticKey: "effects/32x32/combat/hit-01",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 128 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["clear-feedback"] },
  },
  {
    titleId: "sorcerer-ziggurat", cartridgeId: "sorcerer-ziggurat-cartridge", temporalScope: "historical-source-only",
    semantic: { role: "control", state: "confirm" }, semanticKey: "ui/16x16/controls/gamepad-buttons",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 352, height: 160 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["labeled-confirm-control"] },
  },
  {
    titleId: "astral-mage", cartridgeId: "astral-mage-cartridge", temporalScope: "historical-source-only",
    semantic: { role: "player", state: "idle" }, semanticKey: "top-down/32x32/characters/hero-01",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 384 }, collisionEnvelopeRequired: true, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["high-contrast-silhouette"] },
  },
  {
    titleId: "astral-mage", cartridgeId: "astral-mage-cartridge", temporalScope: "historical-source-only",
    semantic: { role: "feedback", state: "correct" }, semanticKey: "effects/32x32/combat/hit-01",
    behavior: { mediaKind: "image", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: { width: 192, height: 128 }, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["clear-feedback"] },
  },
  {
    titleId: "astral-mage", cartridgeId: "astral-mage-cartridge", temporalScope: "historical-source-only",
    semantic: { role: "audio-feedback", state: "correct" }, semanticKey: "audio/native/combat/hit-01",
    behavior: { mediaKind: "audio", requiredDirections: [], requiredClips: [], minimumFramesPerClip: null, minimumGeometry: null, collisionEnvelopeRequired: false, audienceBands: ["grades-3-5"], locales: ["en"], accessibilityNeeds: ["nonvisual-feedback"] },
  },
]);

/** One title-scoped canonical selected-union input, without materializing a pack path. */
export interface ExistingCoreTask5SelectedUnionInput {
  /** Stable requesting title identity. */
  readonly titleId: string;
  /** Sorted, deduplicated semantic keys accepted for the title's Task-4 QC union. */
  readonly semanticKeys: readonly string[];
}

/** One non-authorizing disposition record corresponding to one draft suitability dossier. */
export interface ExistingCoreTask5DispositionRow {
  /** Stable title identity. */
  readonly titleId: string;
  /** Selected semantic role. */
  readonly role: string;
  /** Selected semantic state. */
  readonly state: string;
  /** Selected accepted canonical key. */
  readonly semanticKey: string;
  /** Closed dossier decision. */
  readonly disposition: "reuse-canonical";
  /** Explicitly prevents this canonical-reuse package from accepting legacy ingestion. */
  readonly legacyIngestionAuthorized: false;
}

/** The owner-acceptance state kept literal until an explicit owner message is supplied. */
export interface ExistingCoreTask5OwnerAcceptance {
  /** Acceptance state for these draft dossiers. */
  readonly status: "pending";
  /** Durable user message identity, retained as null when unavailable rather than fabricated. */
  readonly durableUserMessageId: null;
  /** Durable user event identity, retained as null when unavailable rather than fabricated. */
  readonly durableUserEventId: null;
  /** Evidence source for the absent owner decision. */
  readonly source: "no-owner-acceptance-message-supplied";
}

/** Immutable predecessor receipts that authorize the semantic keys and Task-4 selected-union inputs only. */
export interface ExistingCoreTask5SemanticBindingEvidence {
  /** Additive current Task-3 lineage receipt identity. */
  readonly semanticAdoptionReceipt: Readonly<{ path: string; sha256: string }>;
  /** Historical Task-3 receipt retained as an immutable predecessor. */
  readonly historicalSemanticAdoptionReceipt: Readonly<{ path: string; sha256: string }>;
  /** Accepted Task-4 QC receipt identity, which retains the five title-scoped selected unions. */
  readonly task4QcReceipt: Readonly<{ path: string; sha256: string }>;
}

/** Complete evidence-only canonical-reuse data needed to review Existing Core Task 5's asset gate. */
export interface ExistingCoreTask5CanonicalReusePackage {
  /** Root release that every source and descriptor is pinned to. */
  readonly release: Readonly<{ version: string; catalogDigest: string; sourceReceiptDigest: string }>;
  /** Descriptor records generated from the accepted catalog's exact physical entries. */
  readonly descriptors: readonly AssetContractV2PhysicalDescriptor[];
  /** Accepted predecessor receipts that bind semantic keys and title-scoped selected-union inputs. */
  readonly acceptedSemanticBindingEvidence: ExistingCoreTask5SemanticBindingEvidence;
  /** One valid draft suitability dossier for every title/role input. */
  readonly dossiers: readonly StandardPackSuitabilityDossier[];
  /** Per-title selected-union inputs constrained to the already accepted Task-4 key set. */
  readonly selectedUnionInputs: readonly ExistingCoreTask5SelectedUnionInput[];
  /** Per-title/role decisions that retain literal false ingestion authority. */
  readonly dispositionMatrix: readonly ExistingCoreTask5DispositionRow[];
  /** Pending, non-fabricated owner-acceptance boundary. */
  readonly ownerAcceptance: ExistingCoreTask5OwnerAcceptance;
}

/** Computes a browser-safe SHA-256 digest. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Validates the exact expected byte facts for one canonical source entry. */
function assertExpectedCanonicalEntry(
  semanticKey: CanonicalKey,
  entry: StandardAssetCatalogEntry & { readonly requiredCredit: string },
): void {
  const expected = descriptorDefinitions[semanticKey];
  if (
    entry.key !== semanticKey
    || entry.sourceReceiptLocator !== expected.sourceReceiptLocator
    || entry.physical.sha256 !== expected.sha256
    || entry.requiredCredit !== ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit
    || (expected.dimensions === null
      ? entry.physical.kind !== "audio" || entry.physical.dimensions !== null
      : entry.physical.kind !== "image"
        || entry.physical.dimensions?.width !== expected.dimensions.width
        || entry.physical.dimensions?.height !== expected.dimensions.height)
  ) {
    throw new Error(`Existing Core canonical source bytes do not match the reviewed evidence for ${JSON.stringify(semanticKey)}`);
  }
}

/** Converts measured source-pixel bounds into a normalized descriptor envelope. */
function normalizedEnvelope(measurement: SourceMeasurement): AssetContractV2PhysicalDescriptor["collisionEnvelope"] {
  return {
    x: measurement.occupiedBounds.x / measurement.frameWidth,
    y: measurement.occupiedBounds.y / measurement.frameHeight,
    width: measurement.occupiedBounds.width / measurement.frameWidth,
    height: measurement.occupiedBounds.height / measurement.frameHeight,
  };
}

/** Creates a descriptor whose geometry and measured source envelope match an accepted canonical entry. */
function createDescriptor(
  semanticKey: CanonicalKey,
  entry: StandardAssetCatalogEntry & { readonly requiredCredit: string },
): AssetContractV2PhysicalDescriptor {
  const definition = descriptorDefinitions[semanticKey];
  if (definition.dimensions === null || definition.measurement === null) {
    return validateAssetContractV2Descriptor({
      contractVersion: 2,
      descriptorId: definition.descriptorId,
      catalogEntryKey: semanticKey,
      release: ACCEPTED_RELEASE,
      mediaKind: "audio",
      audio: { durationMs: 1667, channels: 2, loop: false },
      anchor: { x: 0.5, y: 0.5 },
      renderScale: 1,
      // The v2 descriptor requires these fields even for audio; both are explicitly non-visual.
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
      frameWidth: definition.measurement.frameWidth,
      frameHeight: definition.measurement.frameHeight,
      columns: definition.measurement.columns,
      rows: definition.measurement.rows,
    },
    anchor: { x: 0.5, y: 0.5 },
    renderScale: 1,
    collisionEnvelope: normalizedEnvelope(definition.measurement),
    readabilityEnvelope: {
      minimumRenderPixels: definition.minimumRenderPixels!,
      // Contrast is not source-independent without a reviewed presentation background.
      // The explicit floor of 1 is conservative rather than a fabricated contrast pass.
      minimumContrastRatio: 1,
    },
  });
}

/** Checks that a title role exactly reuses a semantic binding approved in the Task-3 receipt. */
function assertAcceptedSemanticBinding(input: ExistingCoreTask5CanonicalReuseInput): void {
  const binding = OWNER_APPROVED_CANONICAL_BINDINGS.bindings.find((candidate) => (
    candidate.role === input.semantic.role && candidate.state === input.semantic.state
  ));
  if (!binding || binding.semanticKey !== input.semanticKey) {
    throw new Error(`Existing Core input lacks an accepted semantic binding for ${JSON.stringify(`${input.semantic.role}:${input.semantic.state}`)}`);
  }
}

/** Builds source, receipt, license, credit, visual, and technical evidence for one selected canonical candidate. */
function createCanonicalEvidence(
  dossierPrefix: string,
  entry: StandardAssetCatalogEntry & { readonly requiredCredit: string },
  receipt: "curated" | "import",
): readonly StandardPackSuitabilitySourceEvidence[] {
  const receiptPath = receipt === "curated" ? CURATED_RECEIPT_PATH : IMPORT_RECEIPT_PATH;
  const receiptSha256 = receipt === "curated" ? CURATED_RECEIPT_SHA256 : IMPORT_RECEIPT_SHA256;
  return [
    { evidenceId: `${dossierPrefix}-asset`, kind: "canonical-catalog", locator: `packages/advantage-play-kit/assets/standard/${entry.path}`, sha256: entry.physical.sha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-core-canonical-review" },
    { evidenceId: `${dossierPrefix}-catalog`, kind: "canonical-catalog", locator: CATALOG_PATH, sha256: CATALOG_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-core-canonical-review" },
    { evidenceId: `${dossierPrefix}-receipt`, kind: "canonical-catalog", locator: receiptPath, sha256: receiptSha256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-core-canonical-review" },
    { evidenceId: `${dossierPrefix}-license`, kind: "license", locator: LICENSE_PATH, sha256: LICENSE_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-core-canonical-review" },
    { evidenceId: `${dossierPrefix}-credit`, kind: "credit", locator: CREDIT_PATH, sha256: CREDIT_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-core-canonical-review" },
    { evidenceId: `${dossierPrefix}-visual`, kind: "visual-comparison", locator: `${EVIDENCE_REVIEW_PATH}#visual`, sha256: EVIDENCE_REVIEW_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-core-canonical-review" },
    { evidenceId: `${dossierPrefix}-technical`, kind: "technical-comparison", locator: `${EVIDENCE_REVIEW_PATH}#technical`, sha256: EVIDENCE_REVIEW_SHA256, sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest, capturedAt: EVIDENCE_TIME, recordedBy: "existing-core-canonical-review" },
  ];
}

/** Creates a rejected, behaviorally incompatible side-view candidate for player-role comparison. */
async function createRejectedPlayerCandidate(
  dossierPrefix: string,
  semantic: AssetContractV2SemanticRequirement,
  entry: StandardAssetCatalogEntry & { readonly requiredCredit: string },
): Promise<StandardPackSuitabilityCandidate> {
  const descriptor = createDescriptor("side-view/native/platformer-world/heroes/hero-002/hero-002-walk-source-6c451bbfab72", entry);
  return {
    candidateId: `${dossierPrefix}-side-view-hero-002`,
    origin: "canonical",
    semantic,
    descriptor: {
      descriptorId: descriptor.descriptorId,
      catalogEntryKey: descriptor.catalogEntryKey,
      descriptorDigest: await sha256(serializeAssetContractV2PhysicalDescriptorPayload(descriptor)),
      release: ACCEPTED_RELEASE,
    },
    sourceEvidenceIds: [`${dossierPrefix}-side-view-hero-002-asset`, `${dossierPrefix}-side-view-hero-002-receipt`],
    comparisonEvidenceIds: [`${dossierPrefix}-visual`, `${dossierPrefix}-technical`],
    suitability: {
      semanticFit: "pass",
      visualReadability: "fail",
      frameDirectionCompatibility: "not-applicable",
      animationBehavior: "not-applicable",
      geometry: "fail",
      collisionEnvelope: "pass",
      audienceAppropriateness: "pass",
      localization: "not-applicable",
      accessibility: "fail",
      sourceReceipt: "pass",
      creditObligations: "pass",
    },
    requiresCanonicalIngestion: false,
  };
}

/** Derives a stable task-local identifier for one title/role suitability dossier. */
function dossierPrefix(input: ExistingCoreTask5CanonicalReuseInput): string {
  return `existing-core-${input.titleId}-${input.semantic.role}-${input.semantic.state}`;
}

/** Builds a validated draft dossier for one accepted role without authorizing any operational use. */
async function createDossier(
  input: ExistingCoreTask5CanonicalReuseInput,
  resolvedEntry: StandardAssetCatalogEntry & { readonly requiredCredit: string },
  rejectedPlayerEntry: (StandardAssetCatalogEntry & { readonly requiredCredit: string }) | undefined,
): Promise<StandardPackSuitabilityDossier> {
  const prefix = dossierPrefix(input);
  const descriptor = createDescriptor(input.semanticKey, resolvedEntry);
  const selectedCandidateId = `${prefix}-canonical`;
  const selectedDescriptorDigest = await sha256(serializeAssetContractV2PhysicalDescriptorPayload(descriptor));
  const selectedEvidence = createCanonicalEvidence(prefix, resolvedEntry, "curated");
  const sourceMeasurement = descriptorDefinitions[input.semanticKey].measurement;
  const measuredVisualPass = sourceMeasurement !== null
    && sourceMeasurement.minimumOpaquePixels > 0
    && sourceMeasurement.minimumOpaqueWidth > 0
    && sourceMeasurement.minimumOpaqueHeight > 0;
  const selectedCandidate: StandardPackSuitabilityCandidate = {
    candidateId: selectedCandidateId,
    origin: "canonical" as const,
    semantic: input.semantic,
    descriptor: {
      descriptorId: descriptor.descriptorId,
      catalogEntryKey: descriptor.catalogEntryKey,
      descriptorDigest: selectedDescriptorDigest,
      release: ACCEPTED_RELEASE,
    },
    sourceEvidenceIds: [`${prefix}-asset`, `${prefix}-catalog`, `${prefix}-receipt`],
    comparisonEvidenceIds: [`${prefix}-visual`, `${prefix}-technical`],
    suitability: {
      semanticFit: "pass" as const,
      visualReadability: input.behavior.mediaKind === "audio"
        ? "not-applicable" as const
        : measuredVisualPass ? "pass" as const : "fail" as const,
      frameDirectionCompatibility: "not-applicable" as const,
      animationBehavior: "not-applicable" as const,
      geometry: "pass" as const,
      collisionEnvelope: input.behavior.mediaKind === "audio" || !input.behavior.collisionEnvelopeRequired
        ? "not-applicable" as const
        : measuredVisualPass ? "pass" as const : "fail" as const,
      audienceAppropriateness: "pass" as const,
      localization: "not-applicable" as const,
      accessibility: "pass" as const,
      sourceReceipt: "pass" as const,
      creditObligations: "pass" as const,
    },
    requiresCanonicalIngestion: false,
  };
  const includesRejectedPlayerCandidate = input.semantic.role === "player" && rejectedPlayerEntry !== undefined;
  const rejectedCandidatePrefix = `${prefix}-side-view-hero-002`;
  const rejectedCandidate = includesRejectedPlayerCandidate
    ? await createRejectedPlayerCandidate(prefix, input.semantic, rejectedPlayerEntry)
    : undefined;
  const rejectedEvidence: readonly StandardPackSuitabilitySourceEvidence[] = includesRejectedPlayerCandidate ? [
    {
      evidenceId: `${rejectedCandidatePrefix}-asset`,
      kind: "canonical-catalog",
      locator: `packages/advantage-play-kit/assets/standard/${rejectedPlayerEntry.path}`,
      sha256: rejectedPlayerEntry.physical.sha256,
      sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest,
      capturedAt: EVIDENCE_TIME,
      recordedBy: "existing-core-canonical-review",
    },
    {
      evidenceId: `${rejectedCandidatePrefix}-receipt`,
      kind: "canonical-catalog",
      locator: IMPORT_RECEIPT_PATH,
      sha256: IMPORT_RECEIPT_SHA256,
      sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest,
      capturedAt: EVIDENCE_TIME,
      recordedBy: "existing-core-canonical-review",
    },
  ] : [];
  const candidates: StandardPackSuitabilityCandidate[] = rejectedCandidate === undefined
    ? [selectedCandidate]
    : [selectedCandidate, rejectedCandidate];
  const reviewerFindings = [
    {
      candidateId: selectedCandidateId,
      reviewerId: "existing-core-canonical-review",
      reviewedAt: EVIDENCE_TIME,
      result: "suitable" as const,
      summary: "The root-accepted canonical source meets the title role's descriptor, collision, readability, source-receipt, license, and credit constraints without inferring animation behavior.",
      evidenceIds: [`${prefix}-visual`, `${prefix}-technical`],
      findingDigest: EVIDENCE_REVIEW_SHA256,
    },
    ...(rejectedCandidate === undefined ? [] : [{
      candidateId: rejectedCandidatePrefix,
      reviewerId: "existing-core-canonical-review",
      reviewedAt: EVIDENCE_TIME,
      result: "unsuitable" as const,
      summary: "The visually related side-view hero fails the player idle geometry and accessibility/readability envelope; the selected top-down hero remains a separate canonical source.",
      evidenceIds: [`${prefix}-visual`, `${prefix}-technical`],
      findingDigest: EVIDENCE_REVIEW_SHA256,
    }]),
  ];
  const sourceEvidence = [...selectedEvidence, ...rejectedEvidence];
  const candidateRecords = (
    candidateId: string,
    sourceIdentity: string,
    sourceSha256: string,
    sourceEvidenceId: string,
    evidencePrefix: string,
  ) => ({
    provenance: {
      candidateId,
      sourceIdentity,
      sourceSha256,
      sourceReceiptDigest: ACCEPTED_RELEASE.sourceReceiptDigest,
      chainOfCustody: [sourceEvidenceId],
    },
    license: {
      candidateId,
      status: "approved" as const,
      licenseId: "ElvGames-License-ELVGAMES",
      evidenceId: `${evidencePrefix}-license`,
      reviewedBy: "existing-core-canonical-review",
      reviewedAt: EVIDENCE_TIME,
      obligations: ["retain-credit", "no-generative-ai-training", "no-crypto-nft", "no-resale", "no-authorship-claim"],
    },
    credit: {
      candidateId,
      required: true as const,
      displayText: ACCEPTED_STANDARD_ASSET_RELEASE.requiredCredit,
      evidenceId: `${evidencePrefix}-credit`,
    },
  });
  const selectedRecords = candidateRecords(selectedCandidateId, `standard-pack:${input.semanticKey}`, resolvedEntry.physical.sha256, `${prefix}-asset`, prefix);
  const rejectedRecords = rejectedCandidate === undefined ? undefined : candidateRecords(
    rejectedCandidatePrefix,
    "standard-pack:side-view/native/platformer-world/heroes/hero-002/hero-002-walk-source-6c451bbfab72",
    rejectedPlayerEntry!.physical.sha256,
    `${rejectedCandidatePrefix}-asset`,
    prefix,
  );
  const decision = {
    disposition: "reuse-canonical" as const,
    candidateId: selectedCandidateId,
    descriptorId: descriptor.descriptorId,
    nextStep: "publish-accepted-binding" as const,
    rationale: "The selected accepted-release canonical source passes this title role's semantic, geometry, collision, readability, receipt, license, and credit checks. The draft has no owner acceptance or production authority.",
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
    request: {
      requestId: `${prefix}-request-v1`,
      requestingTitle: input.titleId,
      requestingCartridge: input.cartridgeId,
      requestedAt: EVIDENCE_TIME,
      semantic: input.semantic,
      behavior: input.behavior,
    },
    sourceEvidence,
    candidates,
    reviewerFindings,
    limitations: rejectedCandidate === undefined ? [] : [{
      limitationId: `${prefix}-side-view-hero-rejected`,
      candidateId: rejectedCandidatePrefix,
      severity: "medium" as const,
      summary: "The side-view hero remains documented as a rejected canonical comparison; it is not a fallback and cannot replace the selected top-down player idle source.",
      evidenceIds: [`${prefix}-visual`, `${prefix}-technical`],
    }],
    provenance: [selectedRecords.provenance, ...(rejectedRecords === undefined ? [] : [rejectedRecords.provenance])],
    licensing: [selectedRecords.license, ...(rejectedRecords === undefined ? [] : [rejectedRecords.license])],
    credits: [selectedRecords.credit, ...(rejectedRecords === undefined ? [] : [rejectedRecords.credit])],
    releaseBinding: {
      predecessorRelease: ACCEPTED_RELEASE,
      predecessorDescriptorIds: [descriptor.descriptorId],
      proposedSuccessorRelease: null,
      policy: "successor-evidence-required-before-publication" as const,
    },
    decision,
    dossierDigest: "",
  };
  dossier.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(dossier));
  return validateStandardPackSuitabilityDossier(dossier);
}

/** Creates sorted title-specific selected-union inputs without materializing any physical paths. */
function createSelectedUnionInputs(): readonly ExistingCoreTask5SelectedUnionInput[] {
  const keysByTitle = new Map<string, Set<string>>();
  for (const input of EXISTING_CORE_TASK5_CANONICAL_REUSE_INPUTS) {
    const keys = keysByTitle.get(input.titleId) ?? new Set<string>();
    keys.add(input.semanticKey);
    keysByTitle.set(input.titleId, keys);
  }
  return Object.freeze([...keysByTitle.entries()].map(([titleId, keys]) => Object.freeze({
    titleId,
    semanticKeys: Object.freeze([...keys].sort((left, right) => left.localeCompare(right))),
  })));
}

/**
 * Creates hash-validated draft canonical-reuse dossiers for every Existing Core title role.
 * @param catalog The complete generated standard-pack catalog claimed to be release 2026.08.04.
 * @returns Draft dossiers, descriptor records, selected-union inputs, a disposition matrix, and a pending owner boundary.
 * @throws When the catalog is not the root accepted release, a source byte differs from reviewed evidence, or a Task-3 semantic binding is absent.
 */
export async function createExistingCoreTask5CanonicalReusePackage(
  catalog: StandardAssetCatalog,
): Promise<ExistingCoreTask5CanonicalReusePackage> {
  const resolver = await createAcceptedStandardAssetResolver(catalog, ACCEPTED_RELEASE);
  const resolvedByKey = new Map<CanonicalKey, StandardAssetCatalogEntry & { readonly requiredCredit: string }>();
  for (const semanticKey of Object.keys(descriptorDefinitions) as CanonicalKey[]) {
    const entry = resolver.resolve(semanticKey);
    assertExpectedCanonicalEntry(semanticKey, entry);
    resolvedByKey.set(semanticKey, entry);
  }
  const rejectedPlayerEntry = resolvedByKey.get("side-view/native/platformer-world/heroes/hero-002/hero-002-walk-source-6c451bbfab72");
  const descriptorKeys = [
    "top-down/32x32/characters/hero-01",
    "side-view/32x32/characters/enemy-001-idle",
    "effects/32x32/combat/hit-01",
    "ui/16x16/controls/gamepad-buttons",
    "ui/20x20/inventory/slot",
    "ui/32x32/items/armor-icons",
    "audio/native/combat/hit-01",
  ] as const;
  const descriptors = Object.freeze(descriptorKeys.map((semanticKey) => createDescriptor(semanticKey, resolvedByKey.get(semanticKey)!)));
  const dossiers = [] as StandardPackSuitabilityDossier[];
  for (const input of EXISTING_CORE_TASK5_CANONICAL_REUSE_INPUTS) {
    assertAcceptedSemanticBinding(input);
    const entry = resolvedByKey.get(input.semanticKey);
    if (!entry) throw new Error(`Existing Core selected canonical source is unavailable: ${input.semanticKey}`);
    dossiers.push(await createDossier(input, entry, rejectedPlayerEntry));
  }
  const dispositionMatrix = Object.freeze(EXISTING_CORE_TASK5_CANONICAL_REUSE_INPUTS.map((input) => Object.freeze({
    titleId: input.titleId,
    role: input.semantic.role,
    state: input.semantic.state,
    semanticKey: input.semanticKey,
    disposition: "reuse-canonical" as const,
    legacyIngestionAuthorized: false as const,
  })));
  return Object.freeze({
    release: ACCEPTED_RELEASE,
    descriptors,
    acceptedSemanticBindingEvidence: Object.freeze({
      semanticAdoptionReceipt: Object.freeze({ path: TASK3_SEMANTIC_RECEIPT_PATH, sha256: TASK3_SEMANTIC_RECEIPT_SHA256 }),
      historicalSemanticAdoptionReceipt: Object.freeze({ path: TASK3_HISTORICAL_SEMANTIC_RECEIPT_PATH, sha256: TASK3_HISTORICAL_SEMANTIC_RECEIPT_SHA256 }),
      task4QcReceipt: Object.freeze({ path: TASK4_QC_RECEIPT_PATH, sha256: TASK4_QC_RECEIPT_SHA256 }),
    }),
    dossiers: Object.freeze(dossiers),
    selectedUnionInputs: createSelectedUnionInputs(),
    dispositionMatrix,
    ownerAcceptance: Object.freeze({
      status: "pending" as const,
      durableUserMessageId: null,
      durableUserEventId: null,
      source: "no-owner-acceptance-message-supplied" as const,
    }),
  });
}
