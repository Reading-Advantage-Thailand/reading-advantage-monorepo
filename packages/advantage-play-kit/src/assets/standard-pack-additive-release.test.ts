import { describe, expect, it } from "vitest";

import {
  createStandardPackAdditiveReleaseReceipt,
  serializeStandardPackAdditiveReleaseReceiptPayload,
} from "./standard-pack-additive-release.js";
import {
  createStandardAssetCatalog,
  serializeStandardAssetCatalogPayload,
} from "./standard-pack-release.js";
import { serializeStandardPackIngestionLedgerPayload } from "./standard-pack-ingestion-ledger.js";
import type { StandardPackIngestionLedger } from "./standard-pack-ingestion-ledger.js";

/** Computes a deterministic lowercase SHA-256 integrity digest for a fixture payload. */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Creates a digest-bound additive catalog and its corresponding evidence-only ledger batch. */
async function createAdditiveReleaseFixture(): Promise<{
  readonly ledger: StandardPackIngestionLedger;
  readonly successorCatalog: ReturnType<typeof createStandardAssetCatalog>;
}> {
  const path = "top-down/32x32/characters/legacy-hero-walk.png";
  const sourceReceiptDigest = "c".repeat(64);
  const catalogInput = {
    version: "2026.07.30",
    catalogDigest: "0".repeat(64),
    sourceReceiptDigest,
    paths: [path],
    sourceReceiptLocators: { [path]: "CURATED-RECEIPT.tsv:900001" },
    physicalAssets: {
      [path]: {
        kind: "image" as const,
        byteSize: 1,
        sha256: "d".repeat(64),
        dimensions: { width: 32, height: 32 },
        frameGrid: null,
      },
    },
  };
  const draftCatalog = createStandardAssetCatalog(catalogInput);
  const successorCatalog = createStandardAssetCatalog({
    ...catalogInput,
    catalogDigest: await sha256(serializeStandardAssetCatalogPayload(draftCatalog)),
  });
  const ledgerDraft = {
    schemaVersion: 1 as const,
    batchId: "fixture-additive-release-batch",
    createdAt: "2026-07-29T10:00:00.000Z",
    previousBatchDigest: null,
    predecessorRelease: {
      version: "2026.07.29",
      catalogDigest: "a".repeat(64),
      sourceReceiptDigest: "b".repeat(64),
    },
    proposedSuccessorRelease: {
      version: successorCatalog.version,
      catalogDigest: successorCatalog.digest,
      sourceReceiptDigest: successorCatalog.sourceReceiptDigest,
    },
    authorization: {
      productionUseAuthorized: false as const,
      migrationAuthorized: false as const,
      cutoverAuthorized: false as const,
      deploymentAuthorized: false as const,
    },
    entries: [{
      entryId: "fixture-legacy-hero-entry",
      dossierId: "fixture-dossier",
      dossierDigest: "e".repeat(64),
      manifestId: "fixture-manifest",
      manifestDigest: "f".repeat(64),
      receiptId: "fixture-receipt",
      receiptDigest: "1".repeat(64),
      destinationRepoLocator: `packages/advantage-play-kit/assets/standard/${path}`,
      catalogEntryKey: "top-down/32x32/characters/legacy-hero-walk",
      descriptorId: "fixture-descriptor",
      descriptorDigest: "2".repeat(64),
      sourceArtifactRepoLocator: "measure/fixtures/legacy-hero-walk.png",
      normalizedSourceIdentity: "legacy:fixture-title/hero-walk",
      sourceSha256: "d".repeat(64),
      physicalSha256: "d".repeat(64),
      sourceReceiptIdentity: "fixture-source",
      sourceReceiptDigest,
      catalogSourceReceiptLocator: "CURATED-RECEIPT.tsv:900001",
      licenseIdentity: { licenseId: "CC-BY-4.0", reviewedAt: "2026-07-29T09:00:00.000Z", reviewerId: "fixture-reviewer", disposition: "approved" },
      creditIdentity: { creditText: "Fixture credit", required: true, evidenceId: "fixture-source" },
      authorization: {
        productionUseAuthorized: false as const,
        migrationAuthorized: false as const,
        cutoverAuthorized: false as const,
        deploymentAuthorized: false as const,
      },
    }],
    batchDigest: "",
  } as StandardPackIngestionLedger;
  const ledger = {
    ...ledgerDraft,
    batchDigest: await sha256(serializeStandardPackIngestionLedgerPayload(ledgerDraft)),
  } as StandardPackIngestionLedger;
  return { ledger, successorCatalog };
}

describe("standard-pack additive release receipt", () => {
  it("binds a validated batch to one exact successor catalog without granting authority", async () => {
    const { ledger, successorCatalog } = await createAdditiveReleaseFixture();

    await expect(createStandardPackAdditiveReleaseReceipt(ledger, successorCatalog))
      .rejects.toThrow(/issued validated ingestion ledger/i);
  });

  it("rejects a ledger whose claimed physical identity differs from the pinned successor catalog", async () => {
    const { ledger, successorCatalog } = await createAdditiveReleaseFixture();
    const tamperedDraft = {
      ...ledger,
      entries: ledger.entries.map((entry) => ({ ...entry, physicalSha256: "9".repeat(64) })),
      batchDigest: "",
    } as StandardPackIngestionLedger;
    const tamperedLedger = {
      ...tamperedDraft,
      batchDigest: await sha256(serializeStandardPackIngestionLedgerPayload(tamperedDraft)),
    } as StandardPackIngestionLedger;

    await expect(createStandardPackAdditiveReleaseReceipt(tamperedLedger, successorCatalog))
      .rejects.toThrow(/issued validated ingestion ledger/i);
  });
});
