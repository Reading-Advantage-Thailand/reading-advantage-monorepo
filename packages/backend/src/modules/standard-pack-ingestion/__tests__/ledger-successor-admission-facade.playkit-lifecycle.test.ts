import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  serializeAssetContractV2PhysicalDescriptorPayload,
} from "../../../../../advantage-play-kit/src/assets/asset-contract-v2.js";
import {
  createStandardPackIngestionLedgerPredecessorIndex,
  serializeStandardPackIngestionLedgerPayload,
  validateStandardPackIngestionLedger,
} from "../../../../../advantage-play-kit/src/assets/standard-pack-ingestion-ledger.js";
import {
  serializeStandardPackLegacySourcePacketPayload,
} from "../../../../../advantage-play-kit/src/assets/standard-pack-legacy-source-packet.js";
import {
  serializeStandardPackSuitabilityAcceptedDecisionManifestPayload,
  serializeStandardPackSuitabilityDecisionPayload,
  serializeStandardPackSuitabilityDossierPayload,
  serializeStandardPackCanonicalIngestionReceiptPayload,
} from "../../../../../advantage-play-kit/src/assets/standard-pack-suitability.js";
import {
  createCanonicalIngestionReceiptFixture,
} from "../../../../../advantage-play-kit/src/assets/standard-pack-suitability-ingestion-negative-fixtures.test-support.js";
import {
  LEGACY_INGESTION_REQUIRED_FIXTURE,
} from "../../../../../advantage-play-kit/src/assets/standard-pack-suitability-test-fixtures.test-support.js";
import type {
  StandardAssetCatalog,
} from "../../../../../advantage-play-kit/src/assets/standard-pack-release.js";
import {
  createStandardPackIngestionLedgerSuccessorAdmissionFacade,
  type StandardPackSuccessorAdmissionCommand,
  type StandardPackSuccessorAdmissionInput,
  type StandardPackSuccessorAdmissionTrustedContext,
  type StandardPackSuccessorRegistryPort,
  type StandardPackSuccessorRegistryRecord,
} from "../index.js";

/** Calculates a lowercase SHA-256 digest for deterministic lifecycle fixture bytes. */
function digest(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Reads the generated PlayKit catalog through a location independent of the backend package working directory. */
function readCatalog(): StandardAssetCatalog {
  return JSON.parse(readFileSync(resolve(
    import.meta.dirname,
    "../../../../../advantage-play-kit/assets/standard/standard-pack-release.json",
  ), "utf8")) as StandardAssetCatalog;
}

/** Builds the unreviewed source packet whose immutable bytes are bound into the real ledger validation. */
function createSourcePacket(
  packetId: string,
  repositoryPath: string,
  sourceSha256: string,
): Record<string, unknown> {
  const packet = {
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
      width: 32,
      height: 32,
      observedRole: "character-sprite",
    },
    documents: [
      {
        documentId: packetId + "-provenance",
        kind: "provenance" as const,
        locator: "measure/intake/" + packetId + "/provenance.json",
        sha256: "a".repeat(64),
      },
      {
        documentId: packetId + "-license",
        kind: "license" as const,
        locator: "measure/intake/" + packetId + "/license.txt",
        sha256: "b".repeat(64),
      },
      {
        documentId: packetId + "-credit",
        kind: "credit" as const,
        locator: "measure/intake/" + packetId + "/credit.txt",
        sha256: "c".repeat(64),
      },
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
  return {
    ...packet,
    packetDigest: digest(serializeStandardPackLegacySourcePacketPayload(packet)),
  };
}

/** Builds the physical descriptor projection used to recalculate the accepted legacy descriptor digest. */
function createDescriptor(
  descriptorId: string,
  catalogEntryKey: string,
): Record<string, unknown> {
  return {
    contractVersion: 2 as const,
    descriptorId,
    catalogEntryKey,
    release: {
      version: "2026.07.29",
      catalogDigest: readCatalog().digest,
      sourceReceiptDigest: readCatalog().sourceReceiptDigest,
    },
    mediaKind: "image" as const,
    geometry: {
      width: 32,
      height: 32,
      frameWidth: 32,
      frameHeight: 32,
      columns: 1,
      rows: 1,
    },
    anchor: { x: 0.5, y: 1 },
    renderScale: 1,
    collisionEnvelope: { x: 0.2, y: 0.2, width: 0.6, height: 0.7 },
    readabilityEnvelope: {
      minimumRenderPixels: 16,
      minimumContrastRatio: 3,
    },
  };
}

/** Creates a complete hash-bound accepted dossier, manifest, receipt, and source packet for one ledger entry. */
async function createAcceptedEvidence(): Promise<{
  readonly dossier: Record<string, unknown>;
  readonly manifest: Record<string, unknown>;
  readonly receipt: Record<string, unknown>;
  readonly sourcePacket: Record<string, unknown>;
  readonly sourceInventoryBinding: Record<string, unknown>;
  readonly sourceBytes: Uint8Array;
}> {
  const draft = LEGACY_INGESTION_REQUIRED_FIXTURE;
  const catalogEntryKey = "top-down/32x32/characters/phase4-lifecycle-hero";
  const sourceRepositoryPath = "apps/advantage-games/public/games/fixture/phase4-lifecycle-hero.png";
  const sourceBytes = new TextEncoder().encode("phase 4 lifecycle proof source bytes");
  const sourceSha256 = digest(sourceBytes);
  const rawReceipt = await createCanonicalIngestionReceiptFixture();
  const sourceReceiptDigest = rawReceipt.sourceReceiptDigest;
  const sourcePacket = createSourcePacket(
    "phase4-lifecycle-source-packet",
    sourceRepositoryPath,
    sourceSha256,
  );
  const documents = sourcePacket.documents as readonly Record<string, string>[];
  const documentByKind = new Map(documents.map((document) => [document.kind, document]));
  const packetEvidence = documents.map((document) => ({
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
      ? {
          ...evidence,
          locator: sourceRepositoryPath,
          sha256: sourceSha256,
          sourceReceiptDigest,
        }
      : evidence),
    ...packetEvidence,
  ];
  const descriptorId = draft.candidates[0]!.descriptor.descriptorId;
  const descriptorDigest = digest(serializeAssetContractV2PhysicalDescriptorPayload(
    createDescriptor(descriptorId, catalogEntryKey) as never,
  ));
  const dossierDraft = {
    ...draft,
    sourceEvidence,
    provenance: draft.provenance.map((provenance) => ({
      ...provenance,
      sourceSha256,
      sourceReceiptDigest,
      chainOfCustody: [
        ...provenance.chainOfCustody,
        documentByKind.get("provenance")!.documentId,
      ],
    })),
    licensing: draft.licensing.map((license) => ({
      ...license,
      evidenceId: documentByKind.get("license")!.documentId,
    })),
    credits: draft.credits.map((credit) => ({
      ...credit,
      evidenceId: documentByKind.get("credit")!.documentId,
    })),
    candidates: [{
      ...draft.candidates[0],
      descriptor: {
        ...draft.candidates[0]!.descriptor,
        catalogEntryKey,
        descriptorDigest,
      },
    }],
  };
  const decision = {
    ...dossierDraft.decision,
    decisionDigest: "",
  };
  decision.decisionDigest = digest(
    serializeStandardPackSuitabilityDecisionPayload(decision as never),
  );
  const dossier = {
    ...dossierDraft,
    decision,
    dossierDigest: "",
  };
  dossier.dossierDigest = digest(
    serializeStandardPackSuitabilityDossierPayload(dossier as never),
  );
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
  acceptedDecision.decisionDigest = digest(
    serializeStandardPackSuitabilityDecisionPayload(acceptedDecision as never),
  );
  const manifest = {
    schemaVersion: 1 as const,
    manifestId: "phase4-lifecycle-manifest",
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
  manifest.manifestDigest = digest(
    serializeStandardPackSuitabilityAcceptedDecisionManifestPayload(manifest as never),
  );
  const receipt = {
    ...rawReceipt,
    receiptId: "phase4-lifecycle-receipt",
    catalogEntryKey,
    descriptorId,
    descriptorDigest,
    sourceSha256,
    sourceReceiptDigest,
    license: dossier.licensing[0],
    credit: dossier.credits[0],
    receiptDigest: "",
  };
  receipt.receiptDigest = digest(
    serializeStandardPackCanonicalIngestionReceiptPayload(receipt as never),
  );
  return {
    dossier,
    manifest,
    receipt,
    sourcePacket,
    sourceInventoryBinding: sourcePacket.inventoryBinding as Record<string, unknown>,
    sourceBytes,
  };
}

/** Builds one raw append-only batch accepted by the real PlayKit evidence validator. */
async function createLedger(
  evidence: Awaited<ReturnType<typeof createAcceptedEvidence>>,
): Promise<Record<string, unknown>> {
  const receipt = evidence.receipt as {
    readonly additiveRelease: Record<string, unknown>;
    readonly catalogEntryKey: string;
    readonly descriptorId: string;
    readonly descriptorDigest: string;
    readonly sourceSha256: string;
    readonly sourceReceiptDigest: string;
    readonly sourceIdentity: string;
    readonly receiptId: string;
    readonly receiptDigest: string;
    readonly license: Record<string, unknown>;
    readonly credit: Record<string, unknown>;
  };
  const dossier = evidence.dossier as {
    readonly dossierId: string;
    readonly dossierDigest: string;
    readonly sourceEvidence: readonly Record<string, string>[];
  };
  const manifest = evidence.manifest as {
    readonly manifestId: string;
    readonly manifestDigest: string;
  };
  const sourcePacket = evidence.sourcePacket as {
    readonly packetId: string;
    readonly packetDigest: string;
  };
  const catalog = readCatalog();
  const ledger = {
    schemaVersion: 1 as const,
    batchId: "phase4-lifecycle-batch",
    createdAt: "2026-07-29T10:00:00.000Z",
    previousBatchDigest: null,
    predecessorRelease: {
      version: catalog.version,
      catalogDigest: catalog.digest,
      sourceReceiptDigest: catalog.sourceReceiptDigest,
    },
    proposedSuccessorRelease: receipt.additiveRelease,
    authorization: {
      productionUseAuthorized: false as const,
      migrationAuthorized: false as const,
      cutoverAuthorized: false as const,
      deploymentAuthorized: false as const,
    },
    entries: [{
      entryId: "phase4-lifecycle-entry",
      dossierId: dossier.dossierId,
      dossierDigest: dossier.dossierDigest,
      manifestId: manifest.manifestId,
      manifestDigest: manifest.manifestDigest,
      receiptId: receipt.receiptId,
      receiptDigest: receipt.receiptDigest,
      destinationRepoLocator: "packages/advantage-play-kit/assets/standard/top-down/32x32/characters/phase4-lifecycle-hero.png",
      catalogEntryKey: receipt.catalogEntryKey,
      descriptorId: receipt.descriptorId,
      descriptorDigest: receipt.descriptorDigest,
      sourcePacketId: sourcePacket.packetId,
      sourcePacketDigest: sourcePacket.packetDigest,
      sourceArtifactRepoLocator: dossier.sourceEvidence[0]!.locator,
      normalizedSourceIdentity: receipt.sourceIdentity,
      sourceSha256: receipt.sourceSha256,
      physicalSha256: receipt.sourceSha256,
      sourceReceiptIdentity: dossier.sourceEvidence[0]!.evidenceId,
      catalogSourceReceiptLocator: "CURATED-RECEIPT.tsv:900001",
      sourceReceiptDigest: receipt.sourceReceiptDigest,
      licenseIdentity: receipt.license,
      creditIdentity: receipt.credit,
      authorization: {
        productionUseAuthorized: false as const,
        migrationAuthorized: false as const,
        cutoverAuthorized: false as const,
        deploymentAuthorized: false as const,
      },
    }],
    batchDigest: "",
  };
  ledger.batchDigest = digest(
    serializeStandardPackIngestionLedgerPayload(ledger as never),
  );
  return ledger;
}

/** Builds opaque Phase 3 input from the actual commitment generated by the PlayKit validator. */
function createProof(
  commitment: Readonly<StandardPackSuccessorAdmissionInput["commitment"]>,
): Readonly<{
  readonly input: StandardPackSuccessorAdmissionInput;
  readonly trustedContext: StandardPackSuccessorAdmissionTrustedContext;
}> {
  const candidate = {
    schemaVersion: 1 as const,
    gitCandidate: {
      repositoryId: "reading-advantage-monorepo",
      revision: "a".repeat(40),
      treeDigest: digest("phase4-lifecycle-tree"),
    },
    predecessorIndexDigest: commitment.predecessorIndexDigest,
    predecessorRelease: commitment.predecessorRelease,
    successorBatchId: commitment.successorBatchId,
    successorBatchDigest: commitment.successorBatchDigest,
    successorRelease: commitment.successorRelease,
    descriptorDigest: digest("phase4-lifecycle-descriptor"),
    sourcePacketDigest: digest("phase4-lifecycle-source-packet"),
    candidateDigest: digest("phase4-lifecycle-candidate"),
    commitmentDigest: commitment.commitmentDigest,
  };
  return {
    input: {
      schemaVersion: 1,
      candidate,
      commitment,
      idempotencyKey: "phase4-lifecycle-idempotency-key",
    },
    trustedContext: {
      actorId: "asset-release-admin",
      policyId: "standard-pack.successor-admission",
      correlationId: "fc5fe2c9-1c4e-4d38-8a1c-03f6f1b07da6",
      requestedAt: "2026-07-31T02:00:00.000Z",
    },
  };
}

/** Creates a facade whose command stub simulates the backend's completed durable admission for lifecycle wiring. */
function createLifecycleFacade() {
  const records = new Map<string, StandardPackSuccessorRegistryRecord>();
  const registry: StandardPackSuccessorRegistryPort = {
    read: vi.fn(async ({ predecessorIndexDigest }) => {
      return records.get(predecessorIndexDigest) ?? null;
    }),
    reserve: vi.fn(async () => {
      throw new Error("The PlayKit lifecycle facade must admit through the command boundary.");
    }),
  };
  const admissionCommand: StandardPackSuccessorAdmissionCommand = {
    admit: vi.fn(async (input) => {
      records.set(input.commitment.predecessorIndexDigest, {
        candidate: input.candidate,
        commitment: input.commitment,
        reservedAt: "2026-07-31T02:00:01.000Z",
      });
      return {} as never;
    }),
  };
  const proofResolver = {
    resolve: vi.fn(async ({ commitment }) => createProof(commitment)),
  };
  return {
    facade: createStandardPackIngestionLedgerSuccessorAdmissionFacade({
      admissionCommand,
      registry,
      proofResolver,
    }),
    read: registry.read,
    admissionCommand,
    proofResolver,
  };
}

/** Exercises actual predecessor-index capture and validation reuse of the backend facade without direct facade calls. */
describe("standard-pack ingestion ledger facade PlayKit lifecycle", () => {
  it("captures the facade during real index creation and reuses it when the real validator reserves a synthetic batch", async () => {
    const evidence = await createAcceptedEvidence();
    const ledger = await createLedger(evidence);
    const runtime = createLifecycleFacade();
    const catalog = readCatalog();

    const predecessorIndex = await createStandardPackIngestionLedgerPredecessorIndex(
      catalog,
      ledger.predecessorRelease as never,
      undefined,
      runtime.facade,
    );
    expect(runtime.proofResolver.resolve).not.toHaveBeenCalled();
    expect(runtime.admissionCommand.admit).not.toHaveBeenCalled();

    const accepted = await validateStandardPackIngestionLedger(
      ledger,
      [{
        dossierCandidate: evidence.dossier,
        manifestCandidate: evidence.manifest,
        receiptCandidate: evidence.receipt,
        sourcePacketCandidate: evidence.sourcePacket,
        sourceInventoryBinding: evidence.sourceInventoryBinding,
        sourceBytes: evidence.sourceBytes,
      }],
      predecessorIndex,
    );

    expect(accepted).toMatchObject(ledger);
    expect(runtime.proofResolver.resolve).toHaveBeenCalledTimes(1);
    expect(runtime.proofResolver.resolve).toHaveBeenLastCalledWith({
      predecessorIndex: {
        snapshotDigest: predecessorIndex.snapshotDigest,
        predecessorRelease: predecessorIndex.predecessorRelease,
      },
      commitment: expect.objectContaining({
        predecessorIndexDigest: predecessorIndex.snapshotDigest,
        successorBatchDigest: ledger.batchDigest,
      }),
    });
    expect(runtime.admissionCommand.admit).toHaveBeenCalledTimes(1);

    await expect(createStandardPackIngestionLedgerPredecessorIndex(
      catalog,
      ledger.predecessorRelease as never,
      undefined,
      runtime.facade,
    )).resolves.toMatchObject({
      snapshotDigest: predecessorIndex.snapshotDigest,
    });
    expect(runtime.proofResolver.resolve).toHaveBeenCalledTimes(1);
    expect(runtime.admissionCommand.admit).toHaveBeenCalledTimes(1);
  }, 30_000);
});
