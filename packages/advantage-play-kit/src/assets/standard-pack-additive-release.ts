import { z } from "zod";

import {
  getValidatedStandardPackIngestionLedgerPredecessorIndex,
  isValidatedStandardPackIngestionLedger,
  serializeStandardPackIngestionLedgerPayload,
} from "./standard-pack-ingestion-ledger.js";
import { createStandardAssetResolver, serializeStandardAssetCatalogPayload } from "./standard-pack-release.js";
import type { StandardPackIngestionLedger } from "./standard-pack-ingestion-ledger.js";
import type { StandardAssetCatalog, StandardAssetReleaseBinding } from "./standard-pack-release.js";

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const releaseSchema = z.object({ version: z.string().min(1), catalogDigest: digestSchema, sourceReceiptDigest: digestSchema }).strict();
const authorizationSchema = z.object({ productionUseAuthorized: z.literal(false), migrationAuthorized: z.literal(false), cutoverAuthorized: z.literal(false), deploymentAuthorized: z.literal(false) }).strict();

const issuedAdditiveReleaseReceipts = new WeakSet<object>();
/** An immutable evidence-only receipt for one validated additive standard-pack release. */
export interface StandardPackAdditiveReleaseReceipt {
  readonly schemaVersion: 1;
  readonly status: "evidence-only";
  readonly predecessorRelease: StandardAssetReleaseBinding;
  readonly successorRelease: StandardAssetReleaseBinding;
  readonly successorCatalogPayloadDigest: string;
  readonly ingestionLedger: Readonly<{ batchId: string; batchDigest: string; previousBatchDigest: string | null }>;
  readonly addedAssets: readonly Readonly<{ entryId: string; catalogEntryKey: string; destinationRepoLocator: string; physicalSha256: string; sourceReceiptLocator: string; descriptorId: string; descriptorDigest: string }>[];
  readonly authorization: Readonly<{ productionUseAuthorized: false; migrationAuthorized: false; cutoverAuthorized: false; deploymentAuthorized: false }>;
  readonly artifactDigest: string;
}

/** Validates the independently reviewable shape of one additive-release receipt artifact. */
export const standardPackAdditiveReleaseReceiptSchema = z.object({
  schemaVersion: z.literal(1), status: z.literal("evidence-only"), predecessorRelease: releaseSchema, successorRelease: releaseSchema,
  successorCatalogPayloadDigest: digestSchema,
  ingestionLedger: z.object({ batchId: z.string().min(1), batchDigest: digestSchema, previousBatchDigest: digestSchema.nullable() }).strict(),
  addedAssets: z.array(z.object({ entryId: z.string().min(1), catalogEntryKey: z.string().min(1), destinationRepoLocator: z.string().min(1), physicalSha256: digestSchema, sourceReceiptLocator: z.string().min(1), descriptorId: z.string().min(1), descriptorDigest: digestSchema }).strict()).min(1),
  authorization: authorizationSchema,
  artifactDigest: digestSchema,
}).strict();


/**
 * Validates the receipt structure and deterministic artifact digest without granting issuance trust.
 * @param candidate Untrusted additive-release receipt artifact.
 * @returns A digest-verified receipt record.
 * @throws When the receipt does not match its strict schema or deterministic artifact digest.
 */
export async function validateStandardPackAdditiveReleaseReceipt(candidate: unknown): Promise<StandardPackAdditiveReleaseReceipt> {
  const receipt = standardPackAdditiveReleaseReceiptSchema.parse(candidate) as StandardPackAdditiveReleaseReceipt;
  if (await sha256(serializeStandardPackAdditiveReleaseReceiptPayload(receipt)) !== receipt.artifactDigest) {
    throw new Error("Additive release receipt artifact digest does not match its payload");
  }
  return receipt;
}

/**
 * Revalidates a serialized additive-release receipt and reissues it for a restarted process.
 * @param candidate Persisted receipt artifact supplied after process restart.
 * @param ledger Exact revalidated ledger that must have issued the receipt.
 * @param successorCatalog Complete revalidated successor catalog pinned by the receipt.
 * @returns A fresh issued evidence-only receipt with the same deterministic payload.
 * @throws When the persisted receipt differs from the ledger-derived receipt or grants authority.
 */
export async function rehydrateStandardPackAdditiveReleaseReceipt(
  candidate: unknown,
  ledger: StandardPackIngestionLedger,
  successorCatalog: StandardAssetCatalog,
): Promise<StandardPackAdditiveReleaseReceipt> {
  const persisted = await validateStandardPackAdditiveReleaseReceipt(candidate);
  const reissued = await createStandardPackAdditiveReleaseReceipt(ledger, successorCatalog);
  if (
    persisted.artifactDigest !== reissued.artifactDigest
    || serializeStandardPackAdditiveReleaseReceiptPayload(persisted)
      !== serializeStandardPackAdditiveReleaseReceiptPayload(reissued)
  ) {
    throw new Error("Persisted additive release receipt does not match the revalidated ledger and successor catalog");
  }
  return reissued;
}

/**
 * Determines whether a receipt object was created from an issued validated ledger in this module.
 * @param candidate Receipt object supplied to a successor semantic publication boundary.
 * @returns Whether the candidate is an exact receipt instance issued by this factory.
 */
export function isIssuedStandardPackAdditiveReleaseReceipt(candidate: unknown): candidate is StandardPackAdditiveReleaseReceipt {
  return typeof candidate === "object" && candidate !== null && issuedAdditiveReleaseReceipts.has(candidate);
}
function stableJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Serializes the digest-independent additive-release receipt payload.
 * @param receipt The evidence-only additive-release receipt to serialize.
 * @returns Stable deterministic JSON with the artifact digest omitted.
 */
export function serializeStandardPackAdditiveReleaseReceiptPayload(receipt: StandardPackAdditiveReleaseReceipt): string {
  const { artifactDigest: _artifactDigest, ...payload } = receipt;
  return stableJson(payload);
}

/**
 * Creates a non-authorizing receipt from one issued validated ledger batch and its exact successor catalog.
 * @param ledger The exact frozen ledger instance returned by evidence validation.
 * @param successorCatalog The complete successor catalog pinned by that ledger.
 * @returns An immutable evidence-only receipt bound to the validated batch and successor catalog.
 * @throws When the ledger was not issued by validation or any release identity, catalog, or authority check fails.
 */
export async function createStandardPackAdditiveReleaseReceipt(
  ledger: StandardPackIngestionLedger,
  successorCatalog: StandardAssetCatalog,
): Promise<StandardPackAdditiveReleaseReceipt> {
  const successorRelease = releaseSchema.parse(ledger.proposedSuccessorRelease);
  if (!isValidatedStandardPackIngestionLedger(ledger)) throw new Error("Additive release receipt requires an issued validated ingestion ledger");
  const predecessorIndex = getValidatedStandardPackIngestionLedgerPredecessorIndex(ledger);
  if (!predecessorIndex) throw new Error("Additive release receipt requires the validated ledger predecessor snapshot");
  const predecessorRelease = releaseSchema.parse(ledger.predecessorRelease);
  if (stableJson(successorRelease) === stableJson(predecessorRelease)) throw new Error("Additive release receipt requires a distinct successor release");
  if (successorCatalog.version !== successorRelease.version || successorCatalog.digest !== successorRelease.catalogDigest || successorCatalog.sourceReceiptDigest !== successorRelease.sourceReceiptDigest) throw new Error("Additive release receipt requires the exact ledger successor catalog");
  if (await sha256(serializeStandardAssetCatalogPayload(successorCatalog)) !== successorCatalog.digest) throw new Error("Additive release receipt catalog payload digest does not match its release");
  if (await sha256(serializeStandardPackIngestionLedgerPayload(ledger)) !== ledger.batchDigest) throw new Error("Additive release receipt ledger digest does not match its payload");
  const resolver = createStandardAssetResolver(successorCatalog, successorRelease);
  const addedAssets = ledger.entries.map((entry) => {
    const resolved = resolver.resolve(entry.catalogEntryKey);
    if (`packages/advantage-play-kit/assets/standard/${resolved.path}` !== entry.destinationRepoLocator || resolved.physical.sha256 !== entry.physicalSha256 || resolved.sourceReceiptLocator !== entry.catalogSourceReceiptLocator) throw new Error("Additive release receipt ledger entry does not match successor catalog identity");
    return Object.freeze({ entryId: entry.entryId, catalogEntryKey: entry.catalogEntryKey, destinationRepoLocator: entry.destinationRepoLocator, physicalSha256: entry.physicalSha256, sourceReceiptLocator: entry.catalogSourceReceiptLocator, descriptorId: entry.descriptorId, descriptorDigest: entry.descriptorDigest });
  }).sort((left, right) => left.entryId.localeCompare(right.entryId));
  const expectedCatalogIdentities = new Set([
    ...predecessorIndex.catalogEntries.map((entry) => stableJson({
      destinationRepoLocator: entry.destinationRepoLocator,
      catalogEntryKey: entry.catalogEntryKey,
      physicalSha256: entry.physicalSha256,
      sourceReceiptLocator: entry.sourceReceiptLocator,
    })),
    ...addedAssets.map((entry) => stableJson({
      destinationRepoLocator: entry.destinationRepoLocator,
      catalogEntryKey: entry.catalogEntryKey,
      physicalSha256: entry.physicalSha256,
      sourceReceiptLocator: entry.sourceReceiptLocator,
    })),
  ]);
  const actualCatalogIdentities = successorCatalog.assets.map((asset) => stableJson({
    destinationRepoLocator: "packages/advantage-play-kit/assets/standard/" + asset.path,
    catalogEntryKey: asset.key,
    physicalSha256: asset.physical.sha256,
    sourceReceiptLocator: asset.sourceReceiptLocator,
  }));
  if (
    actualCatalogIdentities.length !== expectedCatalogIdentities.size
    || actualCatalogIdentities.some((identity) => !expectedCatalogIdentities.has(identity))
  ) {
    throw new Error("Additive release receipt successor catalog must contain only immutable predecessor identities and validated ingestion entries");
  }
  const authorization = authorizationSchema.parse(ledger.authorization);
  const draft = { schemaVersion: 1 as const, status: "evidence-only" as const, predecessorRelease, successorRelease, successorCatalogPayloadDigest: successorCatalog.digest, ingestionLedger: { batchId: ledger.batchId, batchDigest: ledger.batchDigest, previousBatchDigest: ledger.previousBatchDigest }, addedAssets: Object.freeze(addedAssets), authorization, artifactDigest: "" };
  const artifactDigest = await sha256(serializeStandardPackAdditiveReleaseReceiptPayload(draft));
  const frozen = Object.freeze({ ...draft, predecessorRelease: Object.freeze(predecessorRelease), successorRelease: Object.freeze(successorRelease), ingestionLedger: Object.freeze(draft.ingestionLedger), authorization: Object.freeze(authorization), artifactDigest });
  issuedAdditiveReleaseReceipts.add(frozen);
  return frozen;
}
