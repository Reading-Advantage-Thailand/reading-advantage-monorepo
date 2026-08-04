import { describe, expect, it } from "vitest";

import {
  createStandardPackAdditiveReleaseReceipt,
  isIssuedStandardPackAdditiveReleaseReceipt,
  rehydrateStandardPackAdditiveReleaseReceipt,
  serializeStandardPackAdditiveReleaseReceiptPayload,
  validateStandardPackAdditiveReleaseReceipt,
} from "./standard-pack-additive-release.js";
import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";
import { serializeAssetContractV2PhysicalDescriptorPayload } from "./asset-contract-v2.js";
import {
  createStandardPackIngestionLedgerPredecessorIndex,
  rehydrateStandardPackIngestionLedgerPredecessorIndex,
  serializeStandardPackIngestionLedgerPayload,
  serializeStandardPackIngestionLedgerPredecessorIndexPayload,
  validateStandardPackIngestionLedger,
} from "./standard-pack-ingestion-ledger.js";
import {
  createStandardAssetCatalog,
  serializeStandardAssetCatalogPayload,
} from "./standard-pack-release.js";
import {
  createReleaseBoundSemanticAssetResolver,
  validateSemanticProductBindings,
} from "./semantic-product-bindings.js";
import {
  serializeStandardPackCanonicalIngestionReceiptPayload,
  serializeStandardPackSuitabilityAcceptedDecisionManifestPayload,
  serializeStandardPackSuitabilityDecisionPayload,
  serializeStandardPackSuitabilityDossierPayload,
} from "./standard-pack-suitability.js";
import { serializeStandardPackLegacySourcePacketPayload } from "./standard-pack-legacy-source-packet.js";
import { createCanonicalIngestionReceiptFixture } from "./standard-pack-suitability-ingestion-negative-fixtures.test-support.js";
import { LEGACY_INGESTION_REQUIRED_FIXTURE } from "./standard-pack-suitability-test-fixtures.test-support.js";
import { readStandardPackCatalogFixture } from "./standard-pack-test-paths.test-support.js";

/** Computes a deterministic lowercase SHA-256 integrity digest for a fixture payload. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Creates an in-memory stand-in for the durable compare-and-reserve successor registry boundary. */
function createDurableSuccessorRegistry() {
  const commitments = new Map<string, unknown>();
  return Object.freeze({
    readSuccessorCommitment: async (predecessorIndex: { readonly snapshotDigest: string }) => commitments.get(predecessorIndex.snapshotDigest),
    reserveSuccessorCommitment: async (predecessorIndex: { readonly snapshotDigest: string }, candidate: unknown) => {
      const existing = commitments.get(predecessorIndex.snapshotDigest);
      if (existing !== undefined) return existing;
      commitments.set(predecessorIndex.snapshotDigest, candidate);
      return candidate;
    },
  });
}

/** Appends one synthetic ingested image to a real catalog and recomputes its release digest. */
async function appendCatalogAsset(predecessor: ReturnType<typeof readStandardPackCatalogFixture>, version: string, sourceReceiptDigest: string, path: string, physicalSha256: string, sourceReceiptLine: number) {
  const sourceReceiptLocators = Object.fromEntries(predecessor.assets.map((asset) => [asset.path, asset.sourceReceiptLocator]));
  const physicalAssets = Object.fromEntries(predecessor.assets.map((asset) => [asset.path, asset.physical]));
  physicalAssets[path] = {
    kind: "image" as const,
    byteSize: 1,
    sha256: physicalSha256,
    dimensions: { width: 32, height: 32 },
    frameGrid: null,
  };
  const input = {
    version,
    catalogDigest: "0",
    sourceReceiptDigest,
    paths: [...predecessor.assets.map((asset) => asset.path), path],
    sourceReceiptLocators: { ...sourceReceiptLocators, [path]: `CURATED-RECEIPT.tsv:${sourceReceiptLine}` },
    physicalAssets,
  };
  const draft = createStandardAssetCatalog(input);
  const digest = await sha256(serializeStandardAssetCatalogPayload(draft));
  return createStandardAssetCatalog({ ...input, catalogDigest: digest });
}
/** Creates a digest-bound unreviewed source packet for exact ledger byte admission. */
async function createSourcePacket(
  packetId: string,
  repositoryPath: string,
  sourceSha256: string,
  width = 32,
  height = 32,
) {
  const draft = {
    schemaVersion: 1 as const,
    packetId,
    receivedAt: "2026-07-29T08:30:00.000Z",
    receivedBy: "fixture-intake",
    inventoryBinding: {
      titleId: "fixture-title",
      assetId: packetId.replace(/-source-packet$/u, ""),
      repositoryPath,
      runtimeUrl: "/fixtures/" + packetId + ".png",
      sourceSha256,
      width,
      height,
      observedRole: "character-sprite",
    },
    documents: [
      { documentId: packetId + "-provenance", kind: "provenance" as const, locator: "measure/intake/" + packetId + "/provenance.json", sha256: "a".repeat(64) },
      { documentId: packetId + "-license", kind: "license" as const, locator: "measure/intake/" + packetId + "/license.txt", sha256: "b".repeat(64) },
      { documentId: packetId + "-credit", kind: "credit" as const, locator: "measure/intake/" + packetId + "/credit.txt", sha256: "c".repeat(64) },
    ],
    lifecycle: "intake-complete-unreviewed" as const,
    authorization: {
      productionUseAuthorized: false as const,
      ingestionAuthorized: false as const,
      migrationAuthorized: false as const,
      cutoverAuthorized: false as const,
      retirementAuthorized: false as const,
      deploymentAuthorized: false as const,
    },
    packetDigest: "",
  };
  const packetDigest = await sha256(serializeStandardPackLegacySourcePacketPayload(draft));
  return { ...draft, packetDigest };
}

/** Creates a descriptor whose content digest deliberately excludes separately pinned release identity. */
function createFixtureDescriptor(
  descriptorId: string,
  catalogEntryKey: string,
  release: { readonly version: string; readonly catalogDigest: string; readonly sourceReceiptDigest: string },
) {
  return {
    contractVersion: 2 as const,
    descriptorId,
    catalogEntryKey,
    release: {
      version: release.version,
      catalogDigest: release.catalogDigest,
      sourceReceiptDigest: release.sourceReceiptDigest,
    },
    mediaKind: "image" as const,
    geometry: { width: 32, height: 32, frameWidth: 32, frameHeight: 32, columns: 1, rows: 1 },
    anchor: { x: 0.5, y: 1 },
    renderScale: 1,
    collisionEnvelope: { x: 0.2, y: 0.2, width: 0.6, height: 0.7 },
    readabilityEnvelope: { minimumRenderPixels: 16, minimumContrastRatio: 3 },
  };
}

/** Produces a valid accepted ingest decision and digest-bound dossier from the shared legacy fixture. */
async function createAcceptedIngestionEvidence() {
  const draft = LEGACY_INGESTION_REQUIRED_FIXTURE;
  const catalogEntryKey = "top-down/32x32/characters/legacy-hero-walk";
  const sourceRepositoryPath = "apps/advantage-games/public/games/fixture/legacy-hero-walk.png";
  const sourceBytes = new TextEncoder().encode("fixture legacy hero source bytes v1");
  const sourceSha256 = await sha256(new TextDecoder().decode(sourceBytes));
  const rawReceipt = await createCanonicalIngestionReceiptFixture();
  const sourceReceiptDigest = rawReceipt.sourceReceiptDigest;
  const sourcePacket = await createSourcePacket(
    "fixture-legacy-hero-source-packet",
    sourceRepositoryPath,
    sourceSha256,
  );
  const documentsByKind = new Map(sourcePacket.documents.map((document) => [document.kind, document]));
  const packetEvidence = sourcePacket.documents.map((document) => ({
    evidenceId: document.documentId,
    kind: document.kind,
    locator: document.locator,
    sha256: document.sha256,
    sourceReceiptDigest,
    capturedAt: draft.sourceEvidence[0]!.capturedAt,
    recordedBy: draft.sourceEvidence[0]!.recordedBy,
  }));
  const sourceEvidence = [
    ...draft.sourceEvidence.map((evidence, index) => index === 0
      ? { ...evidence, locator: sourceRepositoryPath, sha256: sourceSha256, sourceReceiptDigest }
      : evidence),
    ...packetEvidence,
  ];
  const descriptorId = draft.candidates[0]!.descriptor.descriptorId;
  const descriptorDigest = await sha256(serializeAssetContractV2PhysicalDescriptorPayload(
    createFixtureDescriptor(descriptorId, catalogEntryKey, ACCEPTED_STANDARD_ASSET_RELEASE),
  ));
  const draftWithKey = {
    ...draft,
    sourceEvidence,
    provenance: draft.provenance.map((provenance) => ({
      ...provenance,
      sourceSha256,
      sourceReceiptDigest,
      chainOfCustody: [...provenance.chainOfCustody, documentsByKind.get("provenance")!.documentId],
    })),
    licensing: draft.licensing.map((license) => ({
      ...license,
      evidenceId: documentsByKind.get("license")!.documentId,
    })),
    credits: draft.credits.map((credit) => ({
      ...credit,
      evidenceId: documentsByKind.get("credit")!.documentId,
    })),
    candidates: [{
      ...draft.candidates[0],
      descriptor: { ...draft.candidates[0]!.descriptor, catalogEntryKey, descriptorDigest },
    }],
  };
  const decision = { ...draftWithKey.decision, decisionDigest: "" };
  decision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(decision as never));
  const dossier = { ...draftWithKey, decision, dossierDigest: "" };
  dossier.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(dossier as never));
  const acceptedDecision = {
    ...decision,
    ownerApproval: {
      status: "accepted" as const,
      actorId: "fixture-owner",
      decidedAt: "2026-07-29T09:00:00.000Z",
      evidenceDigest: "d".repeat(64),
    },
    decisionDigest: "",
  };
  acceptedDecision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(acceptedDecision as never));
  const manifest = {
    schemaVersion: 1 as const,
    manifestId: "fixture-legacy-ingestion-manifest",
    acceptedAt: "2026-07-29T09:00:00.000Z",
    dossierId: dossier.dossierId,
    dossierDigest: dossier.dossierDigest,
    decision: acceptedDecision,
    reviewerApproval: acceptedDecision.reviewerApproval,
    ownerApproval: acceptedDecision.ownerApproval,
    releaseBinding: dossier.releaseBinding,
    authorization: acceptedDecision.authorization,
    manifestDigest: "",
  };
  manifest.manifestDigest = await sha256(
    serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(manifest as never),
  );
  const receipt = {
    ...rawReceipt,
    catalogEntryKey,
    descriptorId,
    descriptorDigest,
    sourceSha256,
    sourceReceiptDigest,
    license: dossier.licensing[0],
    credit: dossier.credits[0],
    receiptDigest: "",
  };
  receipt.receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(receipt as never));
  return {
    dossier,
    manifest,
    receipt,
    sourcePacket,
    sourceInventoryBinding: sourcePacket.inventoryBinding,
    sourceBytes,
  };
}

/** Creates an independent accepted evidence bundle for the second append-only batch. */
async function createIndependentIngestionEvidence() {
  const base = await createAcceptedIngestionEvidence();
  const candidateId = "legacy-mage-walk";
  const descriptorId = "legacy-mage-walk-proposed";
  const catalogEntryKey = "top-down/32x32/characters/legacy-mage-walk";
  const sourceEvidenceId = "legacy-mage-source";
  const sourceRepositoryPath = "apps/advantage-games/public/games/fixture/legacy-mage-walk.png";
  const sourceBytes = new TextEncoder().encode("fixture legacy mage source bytes v1");
  const sourceSha256 = await sha256(new TextDecoder().decode(sourceBytes));
  const sourceReceiptDigest = "d".repeat(64);
  const sourcePacket = await createSourcePacket(
    "fixture-legacy-mage-source-packet",
    sourceRepositoryPath,
    sourceSha256,
  );
  const documentsByKind = new Map(sourcePacket.documents.map((document) => [document.kind, document]));
  const baseCoreEvidence = base.dossier.sourceEvidence.slice(0, 3);
  const sourceEvidence = [
    { ...baseCoreEvidence[0], evidenceId: sourceEvidenceId, locator: sourceRepositoryPath, sha256: sourceSha256, sourceReceiptDigest },
    { ...baseCoreEvidence[1], evidenceId: candidateId + "-visual", locator: "measure/tracks/apk_standard_pack_suitability_ingestion_20260728/fixtures/legacy-mage-visual.json" },
    { ...baseCoreEvidence[2], evidenceId: candidateId + "-technical", locator: "measure/tracks/apk_standard_pack_suitability_ingestion_20260728/fixtures/legacy-mage-technical.json" },
    ...sourcePacket.documents.map((document) => ({
      evidenceId: document.documentId,
      kind: document.kind,
      locator: document.locator,
      sha256: document.sha256,
      sourceReceiptDigest,
      capturedAt: baseCoreEvidence[0]!.capturedAt,
      recordedBy: baseCoreEvidence[0]!.recordedBy,
    })),
  ];
  const descriptorDigest = await sha256(serializeAssetContractV2PhysicalDescriptorPayload(
    createFixtureDescriptor(descriptorId, catalogEntryKey, ACCEPTED_STANDARD_ASSET_RELEASE),
  ));
  const draft = {
    ...base.dossier,
    dossierId: "fixture-legacy-mage-ingestion",
    sourceEvidence,
    candidates: [{ ...base.dossier.candidates[0], candidateId, descriptor: { ...base.dossier.candidates[0].descriptor, descriptorId, descriptorDigest, catalogEntryKey }, sourceEvidenceIds: [sourceEvidenceId], comparisonEvidenceIds: [candidateId + "-visual", candidateId + "-technical"] }],
    reviewerFindings: [{ ...base.dossier.reviewerFindings[0], candidateId, evidenceIds: [candidateId + "-visual", candidateId + "-technical"] }],
    provenance: [{ ...base.dossier.provenance[0], candidateId, sourceIdentity: "legacy:fixture-title/mage-walk", sourceSha256, sourceReceiptDigest, chainOfCustody: [sourceEvidenceId, documentsByKind.get("provenance")!.documentId] }],
    licensing: [{ ...base.dossier.licensing[0], candidateId, evidenceId: documentsByKind.get("license")!.documentId }],
    credits: [{ ...base.dossier.credits[0], candidateId, evidenceId: documentsByKind.get("credit")!.documentId }],
    releaseBinding: { ...base.dossier.releaseBinding, predecessorDescriptorIds: [descriptorId] },
    decision: { ...base.dossier.decision, candidateId, descriptorId, decisionDigest: "" },
    dossierDigest: "",
  };
  const decision = { ...draft.decision, decisionDigest: "" };
  decision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(decision as never));
  const dossier = { ...draft, decision, dossierDigest: "" };
  dossier.dossierDigest = await sha256(serializeStandardPackSuitabilityDossierPayload(dossier as never));
  const acceptedDecision = { ...decision, ownerApproval: { status: "accepted" as const, actorId: "fixture-owner", decidedAt: "2026-07-29T09:01:00.000Z", evidenceDigest: "f".repeat(64) }, decisionDigest: "" };
  acceptedDecision.decisionDigest = await sha256(serializeStandardPackSuitabilityDecisionPayload(acceptedDecision as never));
  const manifest = { ...base.manifest, manifestId: "fixture-legacy-mage-ingestion-manifest", dossierId: dossier.dossierId, dossierDigest: dossier.dossierDigest, decision: acceptedDecision, reviewerApproval: acceptedDecision.reviewerApproval, ownerApproval: acceptedDecision.ownerApproval, releaseBinding: dossier.releaseBinding, authorization: acceptedDecision.authorization, manifestDigest: "" };
  manifest.manifestDigest = await sha256(serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(manifest as never));
  const receipt = { ...base.receipt, receiptId: "fixture-legacy-mage-ingestion-receipt", candidateId, sourceIdentity: draft.provenance[0].sourceIdentity, sourceSha256, sourceReceiptDigest, license: draft.licensing[0], credit: draft.credits[0], catalogEntryKey, descriptorId, descriptorDigest, receiptDigest: "" };
  receipt.receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(receipt as never));
  return {
    dossier,
    manifest,
    receipt,
    sourcePacket,
    sourceInventoryBinding: sourcePacket.inventoryBinding,
    sourceBytes,
  };
}

/** Creates and seals a complete pure append-only ledger batch for the supplied accepted evidence. */
async function createLedger(evidence: Awaited<ReturnType<typeof createAcceptedIngestionEvidence>>) {
  const ledger = {
    schemaVersion: 1 as const,
    batchId: "fixture-legacy-ingestion-batch",
    createdAt: "2026-07-29T10:00:00.000Z",
    previousBatchDigest: null,
    predecessorRelease: {
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    },
    proposedSuccessorRelease: evidence.receipt.additiveRelease,
    authorization: {
      productionUseAuthorized: false as const,
      migrationAuthorized: false as const,
      cutoverAuthorized: false as const,
      deploymentAuthorized: false as const,
    },
    entries: [{
      entryId: "fixture-legacy-hero-entry",
      dossierId: evidence.dossier.dossierId,
      dossierDigest: evidence.dossier.dossierDigest,
      manifestId: evidence.manifest.manifestId,
      manifestDigest: evidence.manifest.manifestDigest,
      receiptId: evidence.receipt.receiptId,
      receiptDigest: evidence.receipt.receiptDigest,
      destinationRepoLocator: "packages/advantage-play-kit/assets/standard/top-down/32x32/characters/legacy-hero-walk.png",
      catalogEntryKey: evidence.receipt.catalogEntryKey,
      descriptorId: evidence.receipt.descriptorId,
      descriptorDigest: evidence.receipt.descriptorDigest,
      sourcePacketId: evidence.sourcePacket.packetId,
      sourcePacketDigest: evidence.sourcePacket.packetDigest,
      sourceArtifactRepoLocator: evidence.dossier.sourceEvidence[0].locator,
      normalizedSourceIdentity: evidence.receipt.sourceIdentity,
      sourceSha256: evidence.receipt.sourceSha256,
      physicalSha256: evidence.receipt.sourceSha256,
      sourceReceiptIdentity: evidence.dossier.sourceEvidence[0].evidenceId,
      catalogSourceReceiptLocator: "CURATED-RECEIPT.tsv:900001",
      sourceReceiptDigest: evidence.receipt.sourceReceiptDigest,
      licenseIdentity: evidence.receipt.license,
      creditIdentity: evidence.receipt.credit,
      authorization: {
        productionUseAuthorized: false as const,
        migrationAuthorized: false as const,
        cutoverAuthorized: false as const,
        deploymentAuthorized: false as const,
      },
    }],
    batchDigest: "",
  };
  ledger.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(ledger as never));
  return ledger;
}

/** Creates a sealed empty cumulative predecessor index for one initial append batch. */
let issuedRootPredecessorIndex: ReturnType<typeof createStandardPackIngestionLedgerPredecessorIndex> | undefined;
let issuedRootSuccessorRegistry: ReturnType<typeof createDurableSuccessorRegistry> | undefined;

async function createPredecessorIndex(ledger: Awaited<ReturnType<typeof createLedger>>) {
  const registry = issuedRootSuccessorRegistry ??= createDurableSuccessorRegistry();
  return issuedRootPredecessorIndex ??= createStandardPackIngestionLedgerPredecessorIndex(
    readStandardPackCatalogFixture(),
    ledger.predecessorRelease,
    undefined,
    registry,
  );
}

/** Builds the complete required packet, inventory, and source-byte evidence bundle for one fixture. */
function createLedgerEvidenceBundle(
  evidence: Awaited<ReturnType<typeof createAcceptedIngestionEvidence>>,
  receiptCandidate: unknown = evidence.receipt,
) {
  return {
    dossierCandidate: evidence.dossier,
    manifestCandidate: evidence.manifest,
    receiptCandidate,
    sourcePacketCandidate: evidence.sourcePacket,
    sourceInventoryBinding: evidence.sourceInventoryBinding,
    sourceBytes: evidence.sourceBytes,
  };
}

/** Validates a ledger with its digest-bound initial predecessor index. */
async function validateLedger(ledger: Awaited<ReturnType<typeof createLedger>>, bundles: Parameters<typeof validateStandardPackIngestionLedger>[1], index: unknown = undefined, prior?: unknown) {
  return validateStandardPackIngestionLedger(ledger, bundles, index ?? await createPredecessorIndex(ledger), prior);
}

/** Creates one successor-release descriptor whose identity must match an accepted suitability decision. */
function createSuccessorDescriptor(
  evidence: Awaited<ReturnType<typeof createAcceptedIngestionEvidence>>,
  release: { readonly version: string; readonly catalogDigest: string; readonly sourceReceiptDigest: string },
) {
  return createFixtureDescriptor(evidence.receipt.descriptorId, evidence.receipt.catalogEntryKey, release);
}

describe("standard-pack append-only ingestion ledger", () => {
  it("accepts only hash-bound ingest evidence with root predecessor, distinct successor, and no authority", async () => {
    const evidence = await createAcceptedIngestionEvidence();
    const ledger = await createLedger(evidence);

    const validated = await validateLedger(ledger, [createLedgerEvidenceBundle(evidence)]);

    expect(validated).toEqual(ledger);
    expect(Object.isFrozen(validated)).toBe(true);
    expect(validated.authorization).toEqual({
      productionUseAuthorized: false,
      migrationAuthorized: false,
      cutoverAuthorized: false,
      deploymentAuthorized: false,
    });
    await expect(validateLedger(ledger, [{
      ...createLedgerEvidenceBundle(evidence),
      sourceBytes: new TextEncoder().encode("tampered source bytes"),
    }])).rejects.toThrow(/source packet bytes/i);
    const packetWithUnlinkedLicense = {
      ...evidence.sourcePacket,
      documents: evidence.sourcePacket.documents.map((document) => document.kind === "license"
        ? { ...document, locator: "measure/intake/forged-license.txt" }
        : document),
      packetDigest: "",
    };
    packetWithUnlinkedLicense.packetDigest = await sha256(
      serializeStandardPackLegacySourcePacketPayload(packetWithUnlinkedLicense),
    );
    const ledgerWithUnlinkedPacket = {
      ...ledger,
      entries: [{ ...ledger.entries[0], sourcePacketDigest: packetWithUnlinkedLicense.packetDigest }],
      batchDigest: "",
    };
    ledgerWithUnlinkedPacket.batchDigest = await sha256(
      serializeStandardPackIngestionLedgerPayload(ledgerWithUnlinkedPacket as never),
    );
    await expect(validateLedger(ledgerWithUnlinkedPacket, [{
      ...createLedgerEvidenceBundle(evidence),
      sourcePacketCandidate: packetWithUnlinkedLicense,
    }])).rejects.toThrow(/source-packet documents.*dossier provenance, license, and credit evidence/i);
  }, 30_000);

  it("rejects a distinct successor batch fork from a fresh index after restart", async () => {
    const evidence = await createAcceptedIngestionEvidence();
    const ledger = await createLedger(evidence);
    const registry = createDurableSuccessorRegistry();
    const predecessorIndex = await createStandardPackIngestionLedgerPredecessorIndex(
      readStandardPackCatalogFixture(),
      ledger.predecessorRelease,
      undefined,
      registry,
    );
    const evidenceBundles = [createLedgerEvidenceBundle(evidence)];

    await expect(validateStandardPackIngestionLedger(
      ledger,
      evidenceBundles,
      predecessorIndex,
    )).resolves.toEqual(ledger);

    const forkedLedger = {
      ...ledger,
      batchId: "fixture-legacy-ingestion-fork",
      createdAt: "2026-07-29T10:01:00.000Z",
      batchDigest: "",
    };
    forkedLedger.batchDigest = await sha256(
      serializeStandardPackIngestionLedgerPayload(forkedLedger as never),
    );

    await expect(validateStandardPackIngestionLedger(
      forkedLedger,
      evidenceBundles,
      predecessorIndex,
    )).rejects.toThrow(/predecessor index already has a distinct accepted successor/i);

    const rehydratedPredecessorIndex = await rehydrateStandardPackIngestionLedgerPredecessorIndex(
      structuredClone(predecessorIndex),
      readStandardPackCatalogFixture(),
      ledger.predecessorRelease,
      registry,
    );
    await expect(validateStandardPackIngestionLedger(
      forkedLedger,
      evidenceBundles,
      rehydratedPredecessorIndex,
    )).rejects.toThrow(/predecessor index already has a distinct accepted successor/i);

    const freshPredecessorIndex = await createStandardPackIngestionLedgerPredecessorIndex(
      readStandardPackCatalogFixture(),
      ledger.predecessorRelease,
      undefined,
      registry,
    );
    await expect(validateStandardPackIngestionLedger(
      forkedLedger,
      evidenceBundles,
      freshPredecessorIndex,
    )).rejects.toThrow(/predecessor index already has a distinct accepted successor/i);
  }, 180_000);

  it("issues a real B1 successor catalog and carries its accepted identities into the next index", async () => {
    const rawEvidence = await createAcceptedIngestionEvidence();
    const rootCatalog = readStandardPackCatalogFixture();
    const b1Catalog = await appendCatalogAsset(
      rootCatalog,
      "2026.08.06",
      "1".repeat(64),
      "top-down/32x32/characters/legacy-hero-walk.png",
      rawEvidence.receipt.sourceSha256,
      900001,
    );
    const b1Release = {
      version: b1Catalog.version,
      catalogDigest: b1Catalog.digest,
      sourceReceiptDigest: b1Catalog.sourceReceiptDigest,
    };
    const receipt = { ...rawEvidence.receipt, additiveRelease: b1Release, receiptDigest: "" };
    receipt.receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(receipt as never));
    const evidence = { ...rawEvidence, receipt };
    const ledger = await createLedger(evidence);
    const registry = createDurableSuccessorRegistry();
    const rootIndex = await createStandardPackIngestionLedgerPredecessorIndex(
      rootCatalog,
      ledger.predecessorRelease,
      undefined,
      registry,
    );
    const acceptedB1 = await validateStandardPackIngestionLedger(ledger, [createLedgerEvidenceBundle(evidence)], rootIndex);
    const b1Index = await createStandardPackIngestionLedgerPredecessorIndex(
      b1Catalog,
      acceptedB1.proposedSuccessorRelease,
      acceptedB1,
      registry,
    );
    const additiveReceipt = await createStandardPackAdditiveReleaseReceipt(
      acceptedB1,
      b1Catalog,
    );

    expect(acceptedB1.proposedSuccessorRelease).toEqual(b1Release);
    expect(b1Index.entries).toContainEqual(expect.objectContaining({ entryId: acceptedB1.entries[0].entryId }));
    expect(isIssuedStandardPackAdditiveReleaseReceipt(additiveReceipt)).toBe(true);
    await expect(validateStandardPackAdditiveReleaseReceipt(additiveReceipt)).resolves.toEqual(additiveReceipt);

    const successorManifest = validateSemanticProductBindings({
      schemaVersion: 1,
      classification: "owner-approved-product-binding",
      legacyEvidenceClaim: false,
      authority: "t11-owner-authorized-extension-v1",
      release: b1Release,
      bindings: [{
        role: evidence.dossier.request.semantic.role,
        state: evidence.dossier.request.semantic.state,
        semanticKey: evidence.receipt.catalogEntryKey,
        usage: "image",
      }],
    });
    await expect(createReleaseBoundSemanticAssetResolver(
      b1Catalog,
      b1Release,
      successorManifest,
      acceptedB1,
      additiveReceipt,
      [],
      [],
    )).rejects.toThrow(/exactly one accepted suitability evidence bundle/i);
    const successorResolver = await createReleaseBoundSemanticAssetResolver(
      b1Catalog,
      b1Release,
      successorManifest,
      acceptedB1,
      additiveReceipt,
      [createLedgerEvidenceBundle(evidence)],
      [createSuccessorDescriptor(evidence, b1Release)],
    );
    expect(successorResolver.select([{
      role: evidence.dossier.request.semantic.role,
      state: evidence.dossier.request.semantic.state,
    }]).semanticKeys).toEqual([evidence.receipt.catalogEntryKey]);
    await expect(createReleaseBoundSemanticAssetResolver(
      b1Catalog,
      b1Release,
      successorManifest,
      acceptedB1,
      additiveReceipt,
      [createLedgerEvidenceBundle(evidence)],
      [{ ...createSuccessorDescriptor(evidence, b1Release), descriptorId: "wrong-successor-descriptor" }],
    )).rejects.toThrow(/descriptor identity.*accepted suitability/i);
    await expect(createReleaseBoundSemanticAssetResolver(
      b1Catalog,
      b1Release,
      successorManifest,
      acceptedB1,
      additiveReceipt,
      [createLedgerEvidenceBundle(evidence)],
      [{ ...createSuccessorDescriptor(evidence, b1Release), anchor: { x: 0.3, y: 1 } }],
    )).rejects.toThrow(/descriptor content.*accepted suitability/i);
  }, 180_000);

  it("rehydrates persisted B1 evidence without granting production authority", async () => {
    const rawEvidence = await createAcceptedIngestionEvidence();
    const rootCatalog = readStandardPackCatalogFixture();
    const b1Catalog = await appendCatalogAsset(
      rootCatalog,
      "2026.08.06",
      "1".repeat(64),
      "top-down/32x32/characters/legacy-hero-walk.png",
      rawEvidence.receipt.sourceSha256,
      900001,
    );
    const b1Release = {
      version: b1Catalog.version,
      catalogDigest: b1Catalog.digest,
      sourceReceiptDigest: b1Catalog.sourceReceiptDigest,
    };
    const receipt = { ...rawEvidence.receipt, additiveRelease: b1Release, receiptDigest: "" };
    receipt.receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(receipt as never));
    const evidence = { ...rawEvidence, receipt };
    const ledger = await createLedger(evidence);
    const registry = createDurableSuccessorRegistry();
    const index = await createStandardPackIngestionLedgerPredecessorIndex(
      rootCatalog,
      ledger.predecessorRelease,
      undefined,
      registry,
    );
    const acceptedOriginal = await validateStandardPackIngestionLedger(
      ledger,
      [createLedgerEvidenceBundle(evidence)],
      index,
    );
    await expect(rehydrateStandardPackIngestionLedgerPredecessorIndex(
      structuredClone(index),
      rootCatalog,
      ledger.predecessorRelease,
      {} as never,
    )).rejects.toThrow(/authoritative durable successor registry/i);
    const rehydratedIndex = await rehydrateStandardPackIngestionLedgerPredecessorIndex(
      structuredClone(index),
      rootCatalog,
      ledger.predecessorRelease,
      registry,
    );
    const rehydratedLedger = await validateStandardPackIngestionLedger(
      structuredClone(ledger),
      [createLedgerEvidenceBundle(evidence)],
      rehydratedIndex,
    );
    const issuedReceipt = await createStandardPackAdditiveReleaseReceipt(rehydratedLedger, b1Catalog);
    const rehydratedReceipt = await rehydrateStandardPackAdditiveReleaseReceipt(
      structuredClone(issuedReceipt),
      rehydratedLedger,
      b1Catalog,
    );

    expect(isIssuedStandardPackAdditiveReleaseReceipt(rehydratedReceipt)).toBe(true);
    expect(rehydratedReceipt.authorization).toEqual({
      productionUseAuthorized: false,
      migrationAuthorized: false,
      cutoverAuthorized: false,
      deploymentAuthorized: false,
    });
    const catalogMismatch = {
      ...structuredClone(index),
      catalogEntries: structuredClone(index.catalogEntries).map((entry, entryIndex) => entryIndex === 0
        ? { ...entry, catalogEntryKey: "forged-catalog-key" }
        : entry),
      snapshotDigest: "",
    };
    catalogMismatch.snapshotDigest = await sha256(
      serializeStandardPackIngestionLedgerPredecessorIndexPayload(catalogMismatch as never),
    );
    await expect(rehydrateStandardPackIngestionLedgerPredecessorIndex(
      catalogMismatch,
      rootCatalog,
      ledger.predecessorRelease,
      registry,
    )).rejects.toThrow(/catalog identities/i);
    const receiptMismatch = {
      ...structuredClone(issuedReceipt),
      successorCatalogPayloadDigest: "f".repeat(64),
      artifactDigest: "",
    };
    receiptMismatch.artifactDigest = await sha256(
      serializeStandardPackAdditiveReleaseReceiptPayload(receiptMismatch as never),
    );
    await expect(rehydrateStandardPackAdditiveReleaseReceipt(
      receiptMismatch,
      rehydratedLedger,
      b1Catalog,
    )).rejects.toThrow(/does not match/i);
    await expect(createReleaseBoundSemanticAssetResolver(
      b1Catalog,
      b1Release,
      validateSemanticProductBindings({
        schemaVersion: 1,
        classification: "owner-approved-product-binding",
        legacyEvidenceClaim: false,
        authority: "t11-owner-authorized-extension-v1",
        release: b1Release,
        bindings: [{
          role: evidence.dossier.request.semantic.role,
          state: evidence.dossier.request.semantic.state,
          semanticKey: evidence.receipt.catalogEntryKey,
          usage: "image",
        }],
      }),
      rehydratedLedger,
      rehydratedReceipt,
      [createLedgerEvidenceBundle(evidence)],
      [createSuccessorDescriptor(evidence, b1Release)],
    )).resolves.toBeDefined();
  }, 180_000);

  it("rejects a successor catalog that smuggles an unreviewed asset beside a validated ingestion", async () => {
    const rawEvidence = await createAcceptedIngestionEvidence();
    const rootCatalog = readStandardPackCatalogFixture();
    const catalogWithAcceptedIngestion = await appendCatalogAsset(
      rootCatalog,
      "2026.08.06",
      "1".repeat(64),
      "top-down/32x32/characters/legacy-hero-walk.png",
      rawEvidence.receipt.sourceSha256,
      900001,
    );
    const smuggledCatalog = await appendCatalogAsset(
      catalogWithAcceptedIngestion,
      "2026.08.07",
      "2".repeat(64),
      "top-down/32x32/characters/unreviewed-extra.png",
      "f".repeat(64),
      900002,
    );
    const smuggledRelease = {
      version: smuggledCatalog.version,
      catalogDigest: smuggledCatalog.digest,
      sourceReceiptDigest: smuggledCatalog.sourceReceiptDigest,
    };
    const receipt = { ...rawEvidence.receipt, additiveRelease: smuggledRelease, receiptDigest: "" };
    receipt.receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(receipt as never));
    const evidence = { ...rawEvidence, receipt };
    const ledger = await createLedger(evidence);
    const registry = createDurableSuccessorRegistry();
    const rootIndex = await createStandardPackIngestionLedgerPredecessorIndex(
      rootCatalog,
      ledger.predecessorRelease,
      undefined,
      registry,
    );
    const acceptedLedger = await validateStandardPackIngestionLedger(ledger, [createLedgerEvidenceBundle(evidence)], rootIndex);

    await expect(
      createStandardPackAdditiveReleaseReceipt(acceptedLedger, smuggledCatalog),
    ).rejects.toThrow(/only immutable predecessor identities and validated ingestion entries/i);
  }, 30_000);

  it("accepts B2 only when its receipt pins B1 and preserves B1 history", async () => {
    const rawB1 = await createAcceptedIngestionEvidence();
    const rootCatalog = readStandardPackCatalogFixture();
    const b1Catalog = await appendCatalogAsset(rootCatalog, "2026.08.06", "1".repeat(64), "top-down/32x32/characters/legacy-hero-walk.png", rawB1.receipt.sourceSha256, 900001);
    const b1Release = { version: b1Catalog.version, catalogDigest: b1Catalog.digest, sourceReceiptDigest: b1Catalog.sourceReceiptDigest };
    const b1Receipt = { ...rawB1.receipt, additiveRelease: b1Release, receiptDigest: "" };
    b1Receipt.receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(b1Receipt as never));
    const b1Evidence = { ...rawB1, receipt: b1Receipt };
    const b1Ledger = await createLedger(b1Evidence);
    const registry = createDurableSuccessorRegistry();
    const rootIndex = await createStandardPackIngestionLedgerPredecessorIndex(
      rootCatalog,
      b1Ledger.predecessorRelease,
      undefined,
      registry,
    );
    const acceptedB1 = await validateStandardPackIngestionLedger(b1Ledger, [createLedgerEvidenceBundle(b1Evidence)], rootIndex);

    const rawB2 = await createIndependentIngestionEvidence();
    const b2Catalog = await appendCatalogAsset(b1Catalog, "2026.08.07", "d".repeat(64), "top-down/32x32/characters/legacy-mage-walk.png", rawB2.receipt.sourceSha256, 900002);
    const b2Release = { version: b2Catalog.version, catalogDigest: b2Catalog.digest, sourceReceiptDigest: b2Catalog.sourceReceiptDigest };
    const b2Receipt = { ...rawB2.receipt, predecessorRelease: b1Release, additiveRelease: b2Release, receiptDigest: "" };
    b2Receipt.receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(b2Receipt as never));
    const b2Evidence = { ...rawB2, receipt: b2Receipt };
    const b2Ledger = {
      ...b1Ledger,
      batchId: "fixture-legacy-mage-ingestion-batch",
      createdAt: "2026-07-29T10:01:00.000Z",
      previousBatchDigest: acceptedB1.batchDigest,
      predecessorRelease: b1Release,
      proposedSuccessorRelease: b2Release,
      entries: [{
        ...b1Ledger.entries[0],
        entryId: "fixture-legacy-mage-entry",
        dossierId: b2Evidence.dossier.dossierId,
        dossierDigest: b2Evidence.dossier.dossierDigest,
        manifestId: b2Evidence.manifest.manifestId,
        manifestDigest: b2Evidence.manifest.manifestDigest,
        receiptId: b2Evidence.receipt.receiptId,
        receiptDigest: b2Evidence.receipt.receiptDigest,
        destinationRepoLocator: "packages/advantage-play-kit/assets/standard/top-down/32x32/characters/legacy-mage-walk.png",
        catalogEntryKey: b2Evidence.receipt.catalogEntryKey,
        descriptorId: b2Evidence.receipt.descriptorId,
        descriptorDigest: b2Evidence.receipt.descriptorDigest,
        sourcePacketId: b2Evidence.sourcePacket.packetId,
        sourcePacketDigest: b2Evidence.sourcePacket.packetDigest,
        sourceArtifactRepoLocator: b2Evidence.dossier.sourceEvidence[0].locator,
        normalizedSourceIdentity: b2Evidence.receipt.sourceIdentity,
        sourceSha256: b2Evidence.receipt.sourceSha256,
        physicalSha256: b2Evidence.receipt.sourceSha256,
        catalogSourceReceiptLocator: "CURATED-RECEIPT.tsv:900002",
        sourceReceiptIdentity: b2Evidence.dossier.sourceEvidence[0].evidenceId,
        sourceReceiptDigest: b2Evidence.receipt.sourceReceiptDigest,
        licenseIdentity: b2Evidence.receipt.license,
        creditIdentity: b2Evidence.receipt.credit,
      }],
      batchDigest: "",
    };
    b2Ledger.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(b2Ledger as never));
    const b2Index = await createStandardPackIngestionLedgerPredecessorIndex(b1Catalog, b1Release, acceptedB1, registry);
    const acceptedB2 = await validateStandardPackIngestionLedger(b2Ledger, [createLedgerEvidenceBundle(b2Evidence)], b2Index, acceptedB1);
    const forkedB2 = { ...b2Ledger, batchId: "fixture-legacy-mage-fork", proposedSuccessorRelease: { version: "2026.08.08", catalogDigest: "5".repeat(64), sourceReceiptDigest: "6".repeat(64) }, batchDigest: "" };
    forkedB2.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(forkedB2 as never));
    await expect(validateStandardPackIngestionLedger(
      forkedB2,
      [createLedgerEvidenceBundle(b2Evidence)],
      b2Index,
      acceptedB1,
    )).rejects.toThrow(/distinct accepted successor/i);

    expect(acceptedB2.predecessorRelease).toEqual(b1Release);
    const b3Index = await createStandardPackIngestionLedgerPredecessorIndex(b2Catalog, b2Release, acceptedB2, registry);
    expect(b3Index.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ entryId: acceptedB1.entries[0].entryId }),
      expect.objectContaining({ entryId: acceptedB2.entries[0].entryId }),
    ]));

    const staleReceipt = { ...b2Receipt, predecessorRelease: b1Ledger.predecessorRelease, receiptDigest: "" };
    const replayReceipt = { ...b1Evidence.receipt, predecessorRelease: b2Release, additiveRelease: { version: "2026.08.09", catalogDigest: "3".repeat(64), sourceReceiptDigest: "4".repeat(64) }, receiptDigest: "" };
    replayReceipt.receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(replayReceipt as never));
    const replayLedger = {
      ...b1Ledger,
      batchId: "fixture-replayed-hero-batch",
      createdAt: "2026-07-29T10:02:00.000Z",
      previousBatchDigest: acceptedB2.batchDigest,
      predecessorRelease: b2Release,
      proposedSuccessorRelease: replayReceipt.additiveRelease,
      entries: [{ ...b1Ledger.entries[0], receiptId: replayReceipt.receiptId, receiptDigest: replayReceipt.receiptDigest }],
      batchDigest: "",
    };
    replayLedger.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(replayLedger as never));
    await expect(validateStandardPackIngestionLedger(replayLedger, [createLedgerEvidenceBundle(b1Evidence, replayReceipt)], b3Index, acceptedB2)).rejects.toThrow(/collides|duplicate/i);

    staleReceipt.receiptDigest = await sha256(serializeStandardPackCanonicalIngestionReceiptPayload(staleReceipt as never));
    await expect(validateStandardPackIngestionLedger(b2Ledger, [createLedgerEvidenceBundle(b2Evidence, staleReceipt)], b2Index, acceptedB1)).rejects.toThrow(/exact expected predecessor release/i);
  }, 180_000);
  it.each([
    "destinationRepoLocator",
    "catalogEntryKey",
    "descriptorId",
    "sourceArtifactRepoLocator",
    "normalizedSourceIdentity",
    "sourceSha256",
    "physicalSha256",
    "sourceReceiptIdentity",
  ] as const)("rejects a duplicate new-batch %s identity", async (field) => {
    const evidence = await createAcceptedIngestionEvidence();
    const ledger = await createLedger(evidence);
    const duplicate = {
      ...ledger.entries[0],
      entryId: "fixture-legacy-hero-entry-duplicate",
      destinationRepoLocator: field === "destinationRepoLocator" ? ledger.entries[0].destinationRepoLocator : "packages/advantage-play-kit/assets/standard/top-down/characters/legacy-hero-walk-2.png",
      catalogEntryKey: field === "catalogEntryKey" ? ledger.entries[0].catalogEntryKey : "proposed/top-down/characters/legacy-hero-walk-2",
      descriptorId: field === "descriptorId" ? ledger.entries[0].descriptorId : "legacy-hero-walk-proposed-2",
      sourceArtifactRepoLocator: field === "sourceArtifactRepoLocator" ? ledger.entries[0].sourceArtifactRepoLocator : "measure/tracks/apk_standard_pack_suitability_ingestion_20260728/fixtures/legacy-hero-walk-2.png",
      normalizedSourceIdentity: field === "normalizedSourceIdentity" ? ledger.entries[0].normalizedSourceIdentity : "legacy:fixture-title/hero-walk-2",
      sourceSha256: field === "sourceSha256" ? ledger.entries[0].sourceSha256 : "e".repeat(64),
      physicalSha256: field === "physicalSha256" ? ledger.entries[0].physicalSha256 : "f".repeat(64),
      sourceReceiptIdentity: field === "sourceReceiptIdentity" ? ledger.entries[0].sourceReceiptIdentity : "fixture-legacy-source-receipt-2",
    };
    const duplicateLedger = { ...ledger, entries: [ledger.entries[0], duplicate], batchDigest: "" };
    duplicateLedger.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(duplicateLedger as never));

    await expect(validateLedger(duplicateLedger, [
      createLedgerEvidenceBundle(evidence),
      createLedgerEvidenceBundle(evidence),
    ])).rejects.toThrow(/duplicate|replay/i);
  }, 30_000);

  it("rejects unsafe artifact locators, lineage tampering, and authority escalation", async () => {
    const evidence = await createAcceptedIngestionEvidence();
    const ledger = await createLedger(evidence);
    const bundle = [createLedgerEvidenceBundle(evidence)];

    const unsafe = { ...ledger, entries: [{ ...ledger.entries[0], sourceArtifactRepoLocator: "../outside.png" }], batchDigest: "" };
    unsafe.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(unsafe as never));
    await expect(validateLedger(unsafe, bundle)).rejects.toThrow(/safe relative/i);

    const tampered = { ...ledger, entries: [{ ...ledger.entries[0], physicalSha256: "f".repeat(64) }], batchDigest: "" };
    tampered.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(tampered as never));
    await expect(validateLedger(tampered, bundle)).rejects.toThrow(/does not match/i);

    const authorized = { ...ledger, authorization: { ...ledger.authorization, deploymentAuthorized: true }, batchDigest: "" };
    authorized.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(authorized as never));
    await expect(validateLedger(authorized, bundle)).rejects.toThrow();
  }, 30_000);

  it("rejects direct cross-link, index, locator, descriptor, manifest, chain, sorting, and authority attacks", async () => {
    const evidence = await createAcceptedIngestionEvidence();
    const ledger = await createLedger(evidence);
    const bundle = [createLedgerEvidenceBundle(evidence)];

    for (const patch of [
      { sourceArtifactRepoLocator: "measure/tracks/apk_standard_pack_suitability_ingestion_20260728/fixtures/spoof.json" },
      { descriptorDigest: "f".repeat(64) },
      { licenseIdentity: { ...ledger.entries[0].licenseIdentity, evidenceId: "spoof-evidence" } },
      { creditIdentity: { ...ledger.entries[0].creditIdentity, displayText: "substituted credit" } },
    ]) {
      const candidate = { ...ledger, entries: [{ ...ledger.entries[0], ...patch }], batchDigest: "" };
      candidate.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(candidate as never));
      await expect(validateLedger(candidate, bundle)).rejects.toThrow();
    }

    for (const sourceArtifactRepoLocator of ["https://example.test/a.png", "measure/%2e%2e/out.png"]) {
      const candidate = { ...ledger, entries: [{ ...ledger.entries[0], sourceArtifactRepoLocator }], batchDigest: "" };
      candidate.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(candidate as never));
      await expect(validateLedger(candidate, bundle)).rejects.toThrow(/safe relative/i);
    }

    const issuedIndex = await createPredecessorIndex(ledger);
    const forgedIndex = { ...issuedIndex, entries: [...issuedIndex.entries] };
    await expect(validateLedger(ledger, bundle, forgedIndex)).rejects.toThrow(/issued predecessor/i);
    expect(Reflect.set(issuedIndex.catalogEntries[0]!, "catalogEntryKey", "forged-key")).toBe(false);
    await expect(validateLedger(ledger, bundle, issuedIndex)).resolves.toEqual(ledger);

    const existingCatalogIdentity = issuedIndex.catalogEntries[0];
    const catalogCollision = { ...ledger, entries: [{ ...ledger.entries[0],
      destinationRepoLocator: existingCatalogIdentity.destinationRepoLocator,
      catalogEntryKey: existingCatalogIdentity.catalogEntryKey,
      physicalSha256: existingCatalogIdentity.physicalSha256,
    }], batchDigest: "" };
    catalogCollision.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(catalogCollision as never));
    await expect(validateLedger(catalogCollision, bundle, issuedIndex)).rejects.toThrow(/existing predecessor catalog identity/i);

    const manifestMismatch = { ...evidence.manifest, decision: { ...evidence.manifest.decision, candidateId: "other-candidate" }, manifestDigest: "" };
    manifestMismatch.manifestDigest = await sha256(serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(manifestMismatch as never));
    await expect(validateLedger(ledger, [{ ...bundle[0], manifestCandidate: manifestMismatch }])).rejects.toThrow();

    const prior = { ...ledger, proposedSuccessorRelease: { version: "2026.08.05", catalogDigest: "e".repeat(64), sourceReceiptDigest: "f".repeat(64) }, batchDigest: "" };
    prior.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(prior as never));
    const chained = { ...ledger, previousBatchDigest: prior.batchDigest, batchDigest: "" };
    chained.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(chained as never));
    await expect(validateLedger(chained, bundle, await createPredecessorIndex(chained), prior)).rejects.toThrow(/issued validated predecessor batch/i);

    const unsorted = { ...ledger, entries: [{ ...ledger.entries[0], entryId: "z-entry" }, { ...ledger.entries[0], entryId: "a-entry" }], batchDigest: "" };
    unsorted.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(unsorted as never));
    await expect(validateLedger(unsorted, [bundle[0], bundle[0]])).rejects.toThrow(/sorted/i);

    for (const field of ["productionUseAuthorized", "migrationAuthorized", "cutoverAuthorized", "deploymentAuthorized"] as const) {
      const top = { ...ledger, authorization: { ...ledger.authorization, [field]: true }, batchDigest: "" };
      top.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(top as never));
      await expect(validateLedger(top, bundle)).rejects.toThrow();
      const entry = { ...ledger, entries: [{ ...ledger.entries[0], authorization: { ...ledger.entries[0].authorization, [field]: true } }], batchDigest: "" };
      entry.batchDigest = await sha256(serializeStandardPackIngestionLedgerPayload(entry as never));
      await expect(validateLedger(entry, bundle)).rejects.toThrow();
    }
  }, 30_000);
});
