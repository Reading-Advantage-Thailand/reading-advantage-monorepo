import { z } from "zod";

import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";
import { assetContractV2ReleaseIdentitySchema } from "./asset-contract-v2.js";
import { parseStandardAssetPath } from "./standard-asset-contract.js";
import {
  validateStandardPackLegacySourcePacket,
} from "./standard-pack-legacy-source-packet.js";
import type { StandardPackLegacySourcePacket } from "./standard-pack-legacy-source-packet.js";
import { createStandardAssetResolver, serializeStandardAssetCatalogPayload } from "./standard-pack-release.js";
import type { StandardAssetCatalog, StandardAssetReleaseBinding } from "./standard-pack-release.js";
import {
  standardPackSuitabilityCreditSchema,
  standardPackSuitabilityLicenseSchema,
  validateStandardPackCanonicalIngestionReceipt,
  validateStandardPackSuitabilityAcceptedDecisionManifest,
  validateStandardPackSuitabilityDossier,
} from "./standard-pack-suitability.js";
import type {
  StandardPackCanonicalIngestionReceipt,
  StandardPackSuitabilityAcceptedDecisionManifest,
  StandardPackSuitabilityDossier,
} from "./standard-pack-suitability.js";

const idSchema = z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const noProductionAuthorizationSchema = z.object({
  productionUseAuthorized: z.literal(false),
  migrationAuthorized: z.literal(false),
  cutoverAuthorized: z.literal(false),
  deploymentAuthorized: z.literal(false),
}).strict();
const safeRepoLocatorSchema = z.string().min(1).superRefine((value, context) => {
  if (
    value.startsWith("/")
    || value.includes("\\")
    || value.includes("//")
    || /^[a-z][a-z0-9+.-]*:/iu.test(value)
    || /%(?:2e|2f|5c)/iu.test(value)
    || value.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Repository locators must be safe relative paths" });
  }
});
const destinationRepoLocatorSchema = safeRepoLocatorSchema.refine(
  (value) => value.startsWith("packages/advantage-play-kit/assets/standard/"),
  "Destination locators must remain beneath the canonical standard-pack root",
);
const catalogSourceReceiptLocatorSchema = z.string().regex(
  /^(?:IMPORT|CURATED)-RECEIPT\.tsv:[1-9]\d*$/u,
  "Catalog source receipt locators must use an approved receipt filename and positive line number",
);
const catalogIdentitySchema = z.object({
  destinationRepoLocator: destinationRepoLocatorSchema,
  catalogEntryKey: z.string().min(1),
  physicalSha256: digestSchema,
  sourceReceiptLocator: catalogSourceReceiptLocatorSchema,
}).strict();
const issuedPredecessorIndexes = new WeakSet<object>();
const issuedLedgerBatches = new WeakSet<object>();
const validatedLedgerPredecessorIndexes = new WeakMap<object, StandardPackIngestionLedgerPredecessorIndex>();
const successorBatchDigests = new WeakMap<object, string>();
const predecessorIndexRegistries = new WeakMap<object, StandardPackIngestionLedgerSuccessorRegistry>();

const normalizedSourceIdentitySchema = z.string().min(1).superRefine((value, context) => {
  if (value !== normalizeSourceIdentity(value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Source identities must be normalized lowercase stable identities" });
  }
});

/** Validates one non-authorizing append-only standard-pack ingestion ledger entry. */
export const standardPackIngestionLedgerEntrySchema = z.object({
  entryId: idSchema,
  dossierId: idSchema,
  dossierDigest: digestSchema,
  manifestId: idSchema,
  manifestDigest: digestSchema,
  receiptId: idSchema,
  receiptDigest: digestSchema,
  destinationRepoLocator: destinationRepoLocatorSchema,
  catalogEntryKey: z.string().min(1).regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/u).refine((value) => !value.includes(".") && !value.includes("//")),
  descriptorId: idSchema,
  descriptorDigest: digestSchema,
  sourcePacketId: idSchema,
  sourcePacketDigest: digestSchema,
  sourceArtifactRepoLocator: safeRepoLocatorSchema,
  normalizedSourceIdentity: normalizedSourceIdentitySchema,
  sourceSha256: digestSchema,
  physicalSha256: digestSchema,
  sourceReceiptIdentity: idSchema,
  sourceReceiptDigest: digestSchema,
  catalogSourceReceiptLocator: catalogSourceReceiptLocatorSchema,
  licenseIdentity: standardPackSuitabilityLicenseSchema,
  creditIdentity: standardPackSuitabilityCreditSchema,
  authorization: noProductionAuthorizationSchema,
}).strict();

/** One hash-bound ledger record for an approved legacy asset that remains non-authorizing. */
export type StandardPackIngestionLedgerEntry = z.infer<typeof standardPackIngestionLedgerEntrySchema>;

/** Validates cumulative historical identities used to reject replay in a new append batch. */
export const standardPackIngestionLedgerHistoricalIdentitySchema = standardPackIngestionLedgerEntrySchema.pick({
  entryId: true,
  dossierId: true,
  dossierDigest: true,
  manifestId: true,
  manifestDigest: true,
  receiptId: true,
  receiptDigest: true,
  destinationRepoLocator: true,
  catalogEntryKey: true,
  descriptorId: true,
  descriptorDigest: true,
  sourcePacketId: true,
  sourcePacketDigest: true,
  sourceArtifactRepoLocator: true,
  normalizedSourceIdentity: true,
  sourceSha256: true,
  physicalSha256: true,
  sourceReceiptIdentity: true,
  catalogSourceReceiptLocator: true,
  sourceReceiptDigest: true,
});

/** One immutable historical identity used exclusively for replay and collision rejection. */
export type StandardPackIngestionLedgerHistoricalIdentity =
  z.infer<typeof standardPackIngestionLedgerHistoricalIdentitySchema>;

/** Validates a digest-bound snapshot of all identities in one predecessor catalog. */
export const standardPackIngestionLedgerPredecessorIndexSchema = z.object({
  schemaVersion: z.literal(1),
  predecessorRelease: assetContractV2ReleaseIdentitySchema,
  catalogDigest: digestSchema,
  entries: z.array(standardPackIngestionLedgerHistoricalIdentitySchema),
  catalogEntries: z.array(catalogIdentitySchema),
  snapshotDigest: digestSchema,
}).strict();

/** A caller-supplied immutable cumulative predecessor catalog identity snapshot. */
export type StandardPackIngestionLedgerPredecessorIndex =
  z.infer<typeof standardPackIngestionLedgerPredecessorIndexSchema>;

/** Validates one durable commitment from an exact predecessor index to its sole accepted successor batch. */
export const standardPackIngestionLedgerSuccessorCommitmentSchema = z.object({
  schemaVersion: z.literal(1),
  predecessorIndexDigest: digestSchema,
  predecessorRelease: assetContractV2ReleaseIdentitySchema,
  successorBatchId: idSchema,
  successorBatchDigest: digestSchema,
  successorRelease: assetContractV2ReleaseIdentitySchema,
  commitmentDigest: digestSchema,
}).strict();

/** A hash-bound restart-safe commitment that prevents a competing successor of one predecessor index. */
export type StandardPackIngestionLedgerSuccessorCommitment =
  z.infer<typeof standardPackIngestionLedgerSuccessorCommitmentSchema>;

/**
 * Defines the durable authority that records the sole successor of every predecessor index.
 * Implementations must persist the reservation atomically and return the already-recorded
 * commitment when another writer has reserved that predecessor first.
 */
export interface StandardPackIngestionLedgerSuccessorRegistry {
  /** Reads the current durable successor commitment, or undefined when the predecessor remains open. */
  readonly readSuccessorCommitment: (
    predecessorIndex: StandardPackIngestionLedgerPredecessorIndex,
  ) => Promise<unknown | undefined>;
  /** Atomically records a candidate successor or returns the commitment already recorded for the predecessor. */
  readonly reserveSuccessorCommitment: (
    predecessorIndex: StandardPackIngestionLedgerPredecessorIndex,
    candidate: StandardPackIngestionLedgerSuccessorCommitment,
  ) => Promise<unknown>;
}

/** Validates one immutable append-only batch of standard-pack legacy-ingestion records. */
export const standardPackIngestionLedgerSchema = z.object({
  schemaVersion: z.literal(1),
  batchId: idSchema,
  createdAt: z.string().datetime({ offset: true }),
  previousBatchDigest: digestSchema.nullable(),
  predecessorRelease: assetContractV2ReleaseIdentitySchema,
  proposedSuccessorRelease: assetContractV2ReleaseIdentitySchema,
  authorization: noProductionAuthorizationSchema,
  entries: z.array(standardPackIngestionLedgerEntrySchema).min(1),
  batchDigest: digestSchema,
}).strict();

/** One immutable append-only batch that records ingestion evidence but grants no product authority. */
export type StandardPackIngestionLedger = z.infer<typeof standardPackIngestionLedgerSchema>;

/**
 * Determines whether a ledger object was returned by this module's complete evidence validator.
 * @param candidate Ledger object supplied to a downstream evidence boundary.
 * @returns Whether the candidate is the exact frozen ledger instance issued by validation.
 */
export function isValidatedStandardPackIngestionLedger(
  candidate: unknown,
): candidate is StandardPackIngestionLedger {
  return typeof candidate === "object" && candidate !== null && issuedLedgerBatches.has(candidate);
}

/**
 * Retrieves the validator-issued immutable predecessor catalog snapshot for an accepted ledger.
 * @param ledger Exact frozen ledger instance returned by evidence validation.
 * @returns The immutable predecessor catalog identity snapshot, or undefined for an unissued ledger.
 */
export function getValidatedStandardPackIngestionLedgerPredecessorIndex(
  ledger: StandardPackIngestionLedger,
): StandardPackIngestionLedgerPredecessorIndex | undefined {
  return isValidatedStandardPackIngestionLedger(ledger)
    ? validatedLedgerPredecessorIndexes.get(ledger)
    : undefined;
}

/** Raw evidence candidates that the ledger cross-links for each appended record. */
export interface StandardPackIngestionLedgerEvidenceBundle {
  /** Untrusted draft suitability dossier candidate. */
  readonly dossierCandidate: unknown;
  /** Untrusted accepted suitability manifest candidate. */
  readonly manifestCandidate: unknown;
  /** Untrusted canonical-ingestion receipt candidate. */
  readonly receiptCandidate: unknown;
  /** Untrusted source-intake packet whose inventory and documents are bound into this admission. */
  readonly sourcePacketCandidate: unknown;
  /** Exact Task-5 inventory row the intake packet must match. */
  readonly sourceInventoryBinding: unknown;
  /** Exact source bytes whose digest must match the packet, dossier, receipt, and ledger entry. */
  readonly sourceBytes: Uint8Array;
}

/** Normalizes a provenance identity before it can be admitted to a ledger record. */
function normalizeSourceIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}

/** Returns deterministic JSON with sorted object keys for integrity serialization. */
function stableJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  throw new Error("Ingestion ledger payload contains a non-JSON value");
}

/** Computes a lowercase SHA-256 integrity digest using browser-safe Web Crypto. */
async function sha256(value: string): Promise<string> {
  return sha256Bytes(new TextEncoder().encode(value));
}

/** Computes a lowercase SHA-256 digest for exact untransformed source bytes. */
async function sha256Bytes(value: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto SHA-256 is required to validate ingestion ledger evidence");
  const digest = await globalThis.crypto.subtle.digest("SHA-256", Uint8Array.from(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Serializes the digest-independent append-only ledger batch payload. */
export function serializeStandardPackIngestionLedgerPayload(ledger: StandardPackIngestionLedger): string {
  const { batchDigest: _batchDigest, ...payload } = ledger;
  return stableJson(payload);
}

/** Serializes the digest-independent cumulative predecessor identity index. */
export function serializeStandardPackIngestionLedgerPredecessorIndexPayload(
  index: StandardPackIngestionLedgerPredecessorIndex,
): string {
  const { snapshotDigest: _snapshotDigest, ...payload } = index;
  return stableJson(payload);
}

/** Serializes the digest-independent persisted successor commitment payload. */
export function serializeStandardPackIngestionLedgerSuccessorCommitmentPayload(
  commitment: StandardPackIngestionLedgerSuccessorCommitment,
): string {
  const { commitmentDigest: _commitmentDigest, ...payload } = commitment;
  return stableJson(payload);
}

/** Validates that a caller supplied the durable authority needed for cross-restart successor reservations. */
function assertStandardPackIngestionLedgerSuccessorRegistry(
  candidate: unknown,
): StandardPackIngestionLedgerSuccessorRegistry {
  if (
    typeof candidate !== "object"
    || candidate === null
    || typeof (candidate as { readonly readSuccessorCommitment?: unknown }).readSuccessorCommitment !== "function"
    || typeof (candidate as { readonly reserveSuccessorCommitment?: unknown }).reserveSuccessorCommitment !== "function"
  ) {
    throw new Error("Ingestion ledger predecessor index requires an authoritative durable successor registry");
  }
  return candidate as StandardPackIngestionLedgerSuccessorRegistry;
}

/** Reads and verifies the durable commitment currently registered for one predecessor index. */
async function readRegisteredSuccessorCommitment(
  registry: StandardPackIngestionLedgerSuccessorRegistry,
  predecessorIndex: StandardPackIngestionLedgerPredecessorIndex,
): Promise<StandardPackIngestionLedgerSuccessorCommitment | undefined> {
  const candidate = await registry.readSuccessorCommitment(predecessorIndex);
  if (candidate === undefined) return undefined;
  const commitment = standardPackIngestionLedgerSuccessorCommitmentSchema.parse(candidate);
  if (await sha256(serializeStandardPackIngestionLedgerSuccessorCommitmentPayload(commitment)) !== commitment.commitmentDigest) {
    throw new Error("Durable ingestion ledger successor registry commitment digest does not match its payload");
  }
  if (
    commitment.predecessorIndexDigest !== predecessorIndex.snapshotDigest
    || !sameRelease(commitment.predecessorRelease, predecessorIndex.predecessorRelease)
  ) {
    throw new Error("Durable ingestion ledger successor registry commitment does not bind the predecessor index");
  }
  return Object.freeze({
    ...commitment,
    predecessorRelease: Object.freeze({ ...commitment.predecessorRelease }),
    successorRelease: Object.freeze({ ...commitment.successorRelease }),
  });
}

/** Creates the exact successor commitment for a validated ledger and its issued predecessor index. */
async function createSuccessorCommitmentForLedger(
  ledger: StandardPackIngestionLedger,
  predecessorIndex: StandardPackIngestionLedgerPredecessorIndex,
): Promise<StandardPackIngestionLedgerSuccessorCommitment> {
  const commitment = {
    schemaVersion: 1 as const,
    predecessorIndexDigest: predecessorIndex.snapshotDigest,
    predecessorRelease: { ...predecessorIndex.predecessorRelease },
    successorBatchId: ledger.batchId,
    successorBatchDigest: ledger.batchDigest,
    successorRelease: { ...ledger.proposedSuccessorRelease },
    commitmentDigest: "",
  };
  commitment.commitmentDigest = await sha256(serializeStandardPackIngestionLedgerSuccessorCommitmentPayload(commitment));
  const parsed = standardPackIngestionLedgerSuccessorCommitmentSchema.parse(commitment);
  return Object.freeze({
    ...parsed,
    predecessorRelease: Object.freeze({ ...parsed.predecessorRelease }),
    successorRelease: Object.freeze({ ...parsed.successorRelease }),
  });
}

/**
 * Creates the durable successor commitment for one exact validated ledger batch.
 * @param ledger Exact issued ledger batch whose sole successor relationship is being persisted.
 * @returns A hash-bound successor commitment recorded by the validator registry.
 * @throws When the ledger was not issued by the evidence validator.
 */
export async function createStandardPackIngestionLedgerSuccessorCommitment(
  ledger: StandardPackIngestionLedger,
): Promise<StandardPackIngestionLedgerSuccessorCommitment> {
  if (!isValidatedStandardPackIngestionLedger(ledger)) {
    throw new Error("Ingestion ledger successor commitment requires an issued validated ledger batch");
  }
  const predecessorIndex = validatedLedgerPredecessorIndexes.get(ledger);
  if (!predecessorIndex) throw new Error("Ingestion ledger successor commitment requires the validator predecessor index");
  return createSuccessorCommitmentForLedger(ledger, predecessorIndex);
}

/**
 * Creates an issued predecessor index after binding it to the authoritative durable successor registry.
 * @param catalog Exact catalog that contributes its immutable identity snapshot.
 * @param binding Exact release identity pinned by the catalog.
 * @param acceptedPriorBatchCandidate Optional exact validated predecessor batch for a successor catalog.
 * @param registry Durable authority that reserves the sole successor across process restarts.
 * @returns A frozen predecessor identity index issued for this process.
 * @throws When catalog, lineage, or durable registry verification fails.
 */
export async function createStandardPackIngestionLedgerPredecessorIndex(
  catalog: StandardAssetCatalog,
  binding: StandardAssetReleaseBinding,
  acceptedPriorBatchCandidate: unknown | undefined,
  registry: StandardPackIngestionLedgerSuccessorRegistry,
): Promise<StandardPackIngestionLedgerPredecessorIndex> {
  const durableRegistry = assertStandardPackIngestionLedgerSuccessorRegistry(registry);
  if (catalog.version !== binding.version || catalog.digest !== binding.catalogDigest || catalog.sourceReceiptDigest !== binding.sourceReceiptDigest) {
    throw new Error("Ingestion ledger predecessor index requires an exact catalog release binding");
  }
  if (await sha256(serializeStandardAssetCatalogPayload(catalog)) !== catalog.digest) {
    throw new Error("Ingestion ledger predecessor catalog payload does not match its digest");
  }
  createStandardAssetResolver(catalog, binding);
  const acceptedPriorBatch = acceptedPriorBatchCandidate as StandardPackIngestionLedger | undefined;
  if (acceptedPriorBatchCandidate !== undefined && (typeof acceptedPriorBatchCandidate !== "object" || acceptedPriorBatchCandidate === null || !issuedLedgerBatches.has(acceptedPriorBatchCandidate))) {
    throw new Error("Ingestion ledger predecessor index requires an issued validated prior batch");
  }
  const priorIndex = acceptedPriorBatchCandidate === undefined ? undefined : validatedLedgerPredecessorIndexes.get(acceptedPriorBatchCandidate as object);
  if (acceptedPriorBatchCandidate !== undefined && !priorIndex) {
    throw new Error("Ingestion ledger predecessor index requires the prior batch validation context");
  }
  if (acceptedPriorBatch && !sameRelease(acceptedPriorBatch.proposedSuccessorRelease, binding)) {
    throw new Error("Ingestion ledger predecessor index must bind the accepted prior batch successor release");
  }
  const historicalEntries = acceptedPriorBatch && priorIndex
    ? [
      ...priorIndex.entries,
      ...acceptedPriorBatch.entries.map((entry) => standardPackIngestionLedgerHistoricalIdentitySchema.strip().parse(entry)),
    ]
    : [];
  const catalogEntries = catalog.assets.map((asset) => Object.freeze({
    destinationRepoLocator: "packages/advantage-play-kit/assets/standard/" + asset.path,
    catalogEntryKey: asset.key, physicalSha256: asset.physical.sha256, sourceReceiptLocator: asset.sourceReceiptLocator,
  })).sort((left, right) => left.catalogEntryKey.localeCompare(right.catalogEntryKey));
  if (acceptedPriorBatch && priorIndex) {
    const requiredCatalogEntries = [
      ...priorIndex.catalogEntries,
      ...acceptedPriorBatch.entries.map((entry) => ({
        destinationRepoLocator: entry.destinationRepoLocator,
        catalogEntryKey: entry.catalogEntryKey,
        physicalSha256: entry.physicalSha256,
        sourceReceiptLocator: entry.catalogSourceReceiptLocator,
      })),
    ];
    const catalogIdentityKeys = new Set(catalogEntries.map((entry) => stableJson(entry)));
    if (!requiredCatalogEntries.every((required) => catalogIdentityKeys.has(stableJson(required)))) {
      throw new Error("Ingestion ledger successor catalog must retain all predecessor and accepted-batch identities");
    }
  }
  const index = {
    schemaVersion: 1 as const, predecessorRelease: { ...binding }, catalogDigest: binding.catalogDigest, entries: historicalEntries,
    catalogEntries, snapshotDigest: "",
  };
  index.snapshotDigest = await sha256(serializeStandardPackIngestionLedgerPredecessorIndexPayload(index));
  const parsedIndex = standardPackIngestionLedgerPredecessorIndexSchema.parse(index);
  const frozen = Object.freeze({
    ...parsedIndex,
    predecessorRelease: Object.freeze({ ...parsedIndex.predecessorRelease }),
    entries: Object.freeze(parsedIndex.entries.map((entry) => Object.freeze({ ...entry }))),
    catalogEntries: Object.freeze(parsedIndex.catalogEntries.map((entry) => Object.freeze({ ...entry }))),
  }) as StandardPackIngestionLedgerPredecessorIndex;
  await readRegisteredSuccessorCommitment(durableRegistry, frozen);
  predecessorIndexRegistries.set(frozen, durableRegistry);
  issuedPredecessorIndexes.add(frozen);
  return frozen;
}

/**
 * Revalidates a serialized predecessor index and reconnects it to the authoritative durable registry after a restart.
 * @param candidate Persisted predecessor-index artifact supplied after process restart.
 * @param catalog Complete catalog whose identity must match the persisted index.
 * @param binding Exact release identity expected for the persisted index.
 * @param registry Durable authority that resolves and atomically reserves the sole successor.
 * @returns A frozen predecessor index issued for this process without granting product authority.
 * @throws When the artifact digest, catalog identities, release binding, or durable registry differs.
 */
export async function rehydrateStandardPackIngestionLedgerPredecessorIndex(
  candidate: unknown,
  catalog: StandardAssetCatalog,
  binding: StandardAssetReleaseBinding,
  registry: StandardPackIngestionLedgerSuccessorRegistry,
): Promise<StandardPackIngestionLedgerPredecessorIndex> {
  const durableRegistry = assertStandardPackIngestionLedgerSuccessorRegistry(registry);
  const parsed = standardPackIngestionLedgerPredecessorIndexSchema.parse(candidate);
  if (await sha256(serializeStandardPackIngestionLedgerPredecessorIndexPayload(parsed)) !== parsed.snapshotDigest) {
    throw new Error("Persisted ingestion ledger predecessor index digest does not match its payload");
  }
  if (!sameRelease(parsed.predecessorRelease, binding) || parsed.catalogDigest !== binding.catalogDigest) {
    throw new Error("Persisted ingestion ledger predecessor index does not match its expected release binding");
  }
  if (catalog.version !== binding.version || catalog.digest !== binding.catalogDigest || catalog.sourceReceiptDigest !== binding.sourceReceiptDigest) {
    throw new Error("Persisted ingestion ledger predecessor index requires the exact catalog release binding");
  }
  if (await sha256(serializeStandardAssetCatalogPayload(catalog)) !== catalog.digest) {
    throw new Error("Persisted ingestion ledger predecessor catalog payload does not match its digest");
  }
  createStandardAssetResolver(catalog, binding);
  const catalogEntries = catalog.assets.map((asset) => ({
    destinationRepoLocator: "packages/advantage-play-kit/assets/standard/" + asset.path,
    catalogEntryKey: asset.key,
    physicalSha256: asset.physical.sha256,
    sourceReceiptLocator: asset.sourceReceiptLocator,
  })).sort((left, right) => left.catalogEntryKey.localeCompare(right.catalogEntryKey));
  if (stableJson(parsed.catalogEntries) !== stableJson(catalogEntries)) {
    throw new Error("Persisted ingestion ledger predecessor index catalog identities do not match the supplied catalog");
  }
  const frozen = Object.freeze({
    ...parsed,
    predecessorRelease: Object.freeze({ ...parsed.predecessorRelease }),
    entries: Object.freeze(parsed.entries.map((entry) => Object.freeze({ ...entry }))),
    catalogEntries: Object.freeze(parsed.catalogEntries.map((entry) => Object.freeze({ ...entry }))),
  }) as StandardPackIngestionLedgerPredecessorIndex;
  await readRegisteredSuccessorCommitment(durableRegistry, frozen);
  predecessorIndexRegistries.set(frozen, durableRegistry);
  issuedPredecessorIndexes.add(frozen);
  return frozen;
}

/** Compares two pinned release identities without accepting a partial match. */
function sameRelease(
  left: { readonly version: string; readonly catalogDigest: string; readonly sourceReceiptDigest: string },
  right: { readonly version: string; readonly catalogDigest: string; readonly sourceReceiptDigest: string },
): boolean {
  return left.version === right.version
    && left.catalogDigest === right.catalogDigest
    && left.sourceReceiptDigest === right.sourceReceiptDigest;
}

/** Returns the canonical root predecessor identity used by this evidence-only ledger. */
function rootPredecessorRelease(): { readonly version: string; readonly catalogDigest: string; readonly sourceReceiptDigest: string } {
  return {
    version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
    catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
    sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
  };
}

/** Parses a standard-pack destination and rejects any locator whose derived key differs from the ledger key. */
function assertDestinationKeyMapping(entry: StandardPackIngestionLedgerEntry): void {
  const prefix = "packages/advantage-play-kit/assets/standard/";
  try {
    if (parseStandardAssetPath(entry.destinationRepoLocator.slice(prefix.length)).key !== entry.catalogEntryKey) {
      throw new Error("mismatch");
    }
  } catch {
    throw new Error("Append-only ingestion ledger destination must map exactly to its standard catalog key");
  }
}

/** Rejects duplicate immutable identities inside a proposed append batch and its optional predecessor batch. */
function assertNoDuplicateEntryIdentities(
  entries: readonly StandardPackIngestionLedgerEntry[],
  priorEntries: readonly StandardPackIngestionLedgerHistoricalIdentity[],
): void {
  const labels: Readonly<Record<string, keyof StandardPackIngestionLedgerHistoricalIdentity>> = {
    destination: "destinationRepoLocator",
    key: "catalogEntryKey",
    entry: "entryId",
    dossier: "dossierId",
    dossierDigest: "dossierDigest",
    manifest: "manifestId",
    manifestDigest: "manifestDigest",
    receipt: "receiptId",
    receiptDigest: "receiptDigest",
    descriptor: "descriptorId",
    descriptorDigest: "descriptorDigest",
    sourcePacket: "sourcePacketId",
    sourcePacketDigest: "sourcePacketDigest",
    sourceLocator: "sourceArtifactRepoLocator",
    sourceIdentity: "normalizedSourceIdentity",
    sourceSha: "sourceSha256",
    physicalSha: "physicalSha256",
    catalogSourceReceiptLocator: "catalogSourceReceiptLocator",
    sourceReceipt: "sourceReceiptIdentity",
    sourceReceiptDigest: "sourceReceiptDigest",
  };
  for (const [label, key] of Object.entries(labels)) {
    const seen = new Set(priorEntries.map((entry) => String(entry[key])));
    for (const entry of entries) {
      const value = String(entry[key]);
      if (seen.has(value)) throw new Error(`Append-only ingestion ledger has duplicate ${label} identity ${JSON.stringify(value)}`);
      seen.add(value);
    }
  }
}

/** Freezes an accepted evidence-only ledger batch and all exposed nested values. */
function freezeLedger(
  ledger: StandardPackIngestionLedger,
  predecessorIndex: StandardPackIngestionLedgerPredecessorIndex,
): StandardPackIngestionLedger {
  const frozen = Object.freeze({
    ...ledger,
    predecessorRelease: Object.freeze({ ...ledger.predecessorRelease }),
    proposedSuccessorRelease: Object.freeze({ ...ledger.proposedSuccessorRelease }),
    authorization: Object.freeze({ ...ledger.authorization }),
    entries: Object.freeze(ledger.entries.map((entry) => Object.freeze({ ...entry, authorization: Object.freeze({ ...entry.authorization }) }))),
  }) as StandardPackIngestionLedger;
  issuedLedgerBatches.add(frozen);
  validatedLedgerPredecessorIndexes.set(frozen, predecessorIndex);
  return frozen;
}

/** Validates one raw dossier/manifest/receipt bundle and returns its accepted records. */
async function validateEvidenceBundle(
  bundle: StandardPackIngestionLedgerEvidenceBundle,
  expectedPredecessorRelease: StandardPackIngestionLedger["predecessorRelease"],
): Promise<{
  readonly dossier: StandardPackSuitabilityDossier;
  readonly manifest: StandardPackSuitabilityAcceptedDecisionManifest;
  readonly receipt: StandardPackCanonicalIngestionReceipt;
  readonly sourcePacket: StandardPackLegacySourcePacket;
  readonly sourceBytesDigest: string;
}> {
  const dossier = await validateStandardPackSuitabilityDossier(bundle.dossierCandidate);
  const manifest = await validateStandardPackSuitabilityAcceptedDecisionManifest(dossier, bundle.manifestCandidate);
  const receipt = await validateStandardPackCanonicalIngestionReceipt(bundle.receiptCandidate, expectedPredecessorRelease);
  const sourcePacket = await validateStandardPackLegacySourcePacket(
    bundle.sourcePacketCandidate,
    bundle.sourceInventoryBinding,
  );
  const sourceBytesDigest = await sha256Bytes(bundle.sourceBytes);
  if (dossier.decision.disposition !== "ingest-canonical" || manifest.decision.disposition !== "ingest-canonical") {
    throw new Error("Append-only ingestion ledger requires an accepted ingest-canonical decision");
  }
  if (sourcePacket.inventoryBinding.sourceSha256 !== sourceBytesDigest || sourcePacket.inventoryBinding.sourceSha256 !== receipt.sourceSha256) {
    throw new Error("Append-only ingestion ledger source packet bytes do not match the accepted receipt source digest");
  }
  const evidenceById = new Map(dossier.sourceEvidence.map((item) => [item.evidenceId, item]));
  const documentByKind = new Map(sourcePacket.documents.map((document) => [document.kind, document]));
  const provenanceDocument = documentByKind.get("provenance");
  const licenseDocument = documentByKind.get("license");
  const creditDocument = documentByKind.get("credit");
  const selectedProvenance = dossier.provenance.find((item) => item.candidateId === receipt.candidateId);
  const selectedLicense = dossier.licensing.find((item) => item.candidateId === receipt.candidateId);
  const selectedCredit = dossier.credits.find((item) => item.candidateId === receipt.candidateId);
  const documentEvidenceMatches = (document: StandardPackLegacySourcePacket["documents"][number] | undefined) => {
    if (!document) return false;
    const dossierEvidence = evidenceById.get(document.documentId);
    return dossierEvidence !== undefined
      && dossierEvidence.kind === document.kind
      && dossierEvidence.locator === document.locator
      && dossierEvidence.sha256 === document.sha256
      && dossierEvidence.sourceReceiptDigest === receipt.sourceReceiptDigest;
  };
  if (
    !documentEvidenceMatches(provenanceDocument)
    || !documentEvidenceMatches(licenseDocument)
    || !documentEvidenceMatches(creditDocument)
    || !selectedProvenance?.chainOfCustody.includes(provenanceDocument!.documentId)
    || selectedLicense?.evidenceId !== licenseDocument!.documentId
    || selectedCredit?.evidenceId !== creditDocument!.documentId
  ) {
    throw new Error("Append-only ingestion ledger source-packet documents do not match accepted dossier provenance, license, and credit evidence");
  }
  return Object.freeze({ dossier, manifest, receipt, sourcePacket, sourceBytesDigest });
}

/** Checks that one ledger entry exactly records one accepted legacy-ingestion evidence bundle. */
function assertEntryMatchesEvidence(
  entry: StandardPackIngestionLedgerEntry,
  ledger: StandardPackIngestionLedger,
  evidence: Awaited<ReturnType<typeof validateEvidenceBundle>>,
): void {
  const { dossier, manifest, receipt, sourcePacket, sourceBytesDigest } = evidence;
  const candidate = dossier.candidates.find((item) => item.candidateId === receipt.candidateId);
  const sourceEvidence = dossier.sourceEvidence.find((item) => item.evidenceId === entry.sourceReceiptIdentity);
  const provenance = dossier.provenance.find((item) => item.candidateId === receipt.candidateId);
  const license = dossier.licensing.find((item) => item.candidateId === receipt.candidateId);
  const credit = dossier.credits.find((item) => item.candidateId === receipt.candidateId);
  if (
    !candidate || candidate.origin !== "legacy" || !candidate.requiresCanonicalIngestion || candidate.descriptor.release !== null
    || manifest.decision.candidateId !== receipt.candidateId || manifest.decision.descriptorId !== receipt.descriptorId
    || candidate.descriptor.descriptorId !== receipt.descriptorId || candidate.descriptor.descriptorDigest !== receipt.descriptorDigest || candidate.descriptor.catalogEntryKey !== receipt.catalogEntryKey
    || !sourceEvidence || sourceEvidence.kind !== "legacy-source" || !candidate.sourceEvidenceIds.includes(sourceEvidence.evidenceId)
    || sourceEvidence.locator !== entry.sourceArtifactRepoLocator || sourceEvidence.locator !== sourcePacket.inventoryBinding.repositoryPath
    || sourceEvidence.sha256 !== receipt.sourceSha256 || sourceEvidence.sha256 !== sourceBytesDigest || sourceEvidence.sourceReceiptDigest !== receipt.sourceReceiptDigest
    || !provenance || !provenance.chainOfCustody.includes(sourceEvidence.evidenceId) || provenance.sourceIdentity !== receipt.sourceIdentity || provenance.sourceSha256 !== receipt.sourceSha256 || provenance.sourceReceiptDigest !== receipt.sourceReceiptDigest
    || !license || !credit || stableJson(license) !== stableJson(receipt.license) || stableJson(credit) !== stableJson(receipt.credit)
  ) throw new Error("Append-only ingestion ledger evidence does not preserve exact accepted legacy lineage");
  if (
    entry.dossierId !== dossier.dossierId || entry.dossierDigest !== dossier.dossierDigest || entry.manifestId !== manifest.manifestId || entry.manifestDigest !== manifest.manifestDigest
    || entry.receiptId !== receipt.receiptId || entry.receiptDigest !== receipt.receiptDigest || entry.catalogEntryKey !== receipt.catalogEntryKey
    || entry.descriptorId !== receipt.descriptorId || entry.descriptorDigest !== receipt.descriptorDigest
    || entry.sourcePacketId !== sourcePacket.packetId || entry.sourcePacketDigest !== sourcePacket.packetDigest
    || entry.normalizedSourceIdentity !== normalizeSourceIdentity(receipt.sourceIdentity) || entry.sourceSha256 !== receipt.sourceSha256 || entry.sourceSha256 !== sourceBytesDigest || entry.physicalSha256 !== receipt.sourceSha256
    || entry.sourceReceiptDigest !== receipt.sourceReceiptDigest || stableJson(entry.licenseIdentity) !== stableJson(receipt.license)
    || stableJson(entry.creditIdentity) !== stableJson(receipt.credit) || stableJson(entry.authorization) !== stableJson(receipt.authorization)
  ) throw new Error("Append-only ingestion ledger entry does not match its accepted evidence identities");
  assertDestinationKeyMapping(entry);
  if (!sameRelease(receipt.predecessorRelease, ledger.predecessorRelease)) throw new Error("Append-only ingestion ledger receipt must retain the exact ledger predecessor release");
  if (sameRelease(ledger.proposedSuccessorRelease, ledger.predecessorRelease) || !sameRelease(receipt.additiveRelease, ledger.proposedSuccessorRelease)) throw new Error("Append-only ingestion ledger requires the receipt-proposed distinct successor release");
}

/**
 * Validates a pure append-only ledger batch against raw accepted ingestion evidence and an optional prior batch.
 * @param ledgerCandidate Untrusted ledger batch candidate.
 * @param evidenceBundles Raw dossier, manifest, and receipt candidates for every appended entry.
 * @param predecessorIndexCandidate Issued index carrying its authoritative durable successor registry.
 * @param priorBatchCandidate Optional raw immediately preceding ledger batch candidate.
 * @returns A frozen evidence-only ledger batch.
 * @throws When integrity, append-only uniqueness, lineage, release pins, or authority constraints fail.
 */
export async function validateStandardPackIngestionLedger(
  ledgerCandidate: unknown,
  evidenceBundles: readonly StandardPackIngestionLedgerEvidenceBundle[],
  predecessorIndexCandidate: unknown,
  priorBatchCandidate?: unknown,
): Promise<StandardPackIngestionLedger> {
  const ledger = standardPackIngestionLedgerSchema.parse(ledgerCandidate);
  const digest = await sha256(serializeStandardPackIngestionLedgerPayload(ledger));
  if (digest !== ledger.batchDigest) throw new Error("Append-only ingestion ledger batch digest does not match its deterministic payload");
  if (stableJson(ledger.authorization) !== stableJson({ productionUseAuthorized: false, migrationAuthorized: false, cutoverAuthorized: false, deploymentAuthorized: false })) {
    throw new Error("Append-only ingestion ledger cannot grant production authority");
  }
  if (typeof predecessorIndexCandidate !== "object" || predecessorIndexCandidate === null || !issuedPredecessorIndexes.has(predecessorIndexCandidate)) {
    throw new Error("Append-only ingestion ledger requires an issued predecessor catalog index");
  }
  const predecessorIndex = predecessorIndexCandidate as StandardPackIngestionLedgerPredecessorIndex;
  const registry = predecessorIndexRegistries.get(predecessorIndex);
  if (!registry) throw new Error("Append-only ingestion ledger predecessor index lacks an authoritative durable successor registry");
  if (!sameRelease(predecessorIndex.predecessorRelease, ledger.predecessorRelease) || predecessorIndex.catalogDigest !== ledger.predecessorRelease.catalogDigest) {
    throw new Error("Append-only ingestion ledger predecessor index does not pin the ledger predecessor catalog digest");
  }
  if (priorBatchCandidate !== undefined && (typeof priorBatchCandidate !== "object" || priorBatchCandidate === null || !issuedLedgerBatches.has(priorBatchCandidate))) {
    throw new Error("Append-only ingestion ledger requires an issued validated predecessor batch");
  }
  const prior = priorBatchCandidate === undefined ? undefined : standardPackIngestionLedgerSchema.parse(priorBatchCandidate);
  if (prior) {
    const priorDigest = await sha256(serializeStandardPackIngestionLedgerPayload(prior));
    if (priorDigest !== prior.batchDigest || ledger.previousBatchDigest !== prior.batchDigest || !sameRelease(ledger.predecessorRelease, prior.proposedSuccessorRelease)) {
      throw new Error("Append-only ingestion ledger batch does not bind its validated predecessor batch");
    }
    const priorHistory = prior.entries.map((entry) => standardPackIngestionLedgerHistoricalIdentitySchema.strip().parse(entry));
    if (!priorHistory.every((entry) => predecessorIndex.entries.some((indexed) => stableJson(indexed) === stableJson(entry)))) {
      throw new Error("Append-only ingestion ledger predecessor index does not retain the validated predecessor batch identities");
    }
    const registeredSuccessorDigest = successorBatchDigests.get(priorBatchCandidate as object);
    if (registeredSuccessorDigest !== undefined && registeredSuccessorDigest !== ledger.batchDigest) {
      throw new Error("Append-only ingestion ledger predecessor batch already has a distinct accepted successor");
    }
  } else if (ledger.previousBatchDigest !== null || !sameRelease(ledger.predecessorRelease, rootPredecessorRelease())) {
    throw new Error("Append-only ingestion ledger requires the preceding batch when previousBatchDigest is declared");
  }
  if (ledger.entries.length !== evidenceBundles.length) throw new Error("Append-only ingestion ledger requires one evidence bundle per appended entry");
  if (ledger.proposedSuccessorRelease.version <= ledger.predecessorRelease.version || ledger.proposedSuccessorRelease.catalogDigest === ledger.predecessorRelease.catalogDigest || ledger.proposedSuccessorRelease.sourceReceiptDigest === ledger.predecessorRelease.sourceReceiptDigest) {
    throw new Error("Append-only ingestion ledger successor version and catalog/source-receipt digests must advance");
  }
  for (let index = 1; index < ledger.entries.length; index += 1) {
    if (ledger.entries[index - 1]!.entryId.localeCompare(ledger.entries[index]!.entryId) >= 0) {
      throw new Error("Append-only ingestion ledger entries must be canonically sorted by entryId");
    }
  }
  for (const entry of ledger.entries) {
    if (predecessorIndex.catalogEntries.some((catalogEntry) => catalogEntry.destinationRepoLocator === entry.destinationRepoLocator || catalogEntry.catalogEntryKey === entry.catalogEntryKey || catalogEntry.physicalSha256 === entry.physicalSha256)) {
      throw new Error("Append-only ingestion ledger entry collides with an existing predecessor catalog identity");
    }
  }
  assertNoDuplicateEntryIdentities(ledger.entries, [...predecessorIndex.entries, ...(prior?.entries ?? [])]);
  const evidence = await Promise.all(evidenceBundles.map((bundle) => validateEvidenceBundle(bundle, ledger.predecessorRelease)));
  const byReceiptId = new Map(evidence.map((item) => [item.receipt.receiptId, item]));
  if (byReceiptId.size !== evidence.length) throw new Error("Append-only ingestion ledger evidence bundles cannot repeat receipt identities");
  for (const entry of ledger.entries) {
    const item = byReceiptId.get(entry.receiptId);
    if (!item) throw new Error(`Append-only ingestion ledger entry references unknown receipt ${JSON.stringify(entry.receiptId)}`);
    assertEntryMatchesEvidence(entry, ledger, item);
  }
  const proposedCommitment = await createSuccessorCommitmentForLedger(ledger, predecessorIndex);
  const reservedCommitment = standardPackIngestionLedgerSuccessorCommitmentSchema.parse(
    await registry.reserveSuccessorCommitment(predecessorIndex, proposedCommitment),
  );
  if (await sha256(serializeStandardPackIngestionLedgerSuccessorCommitmentPayload(reservedCommitment)) !== reservedCommitment.commitmentDigest) {
    throw new Error("Durable ingestion ledger successor registry commitment digest does not match its payload");
  }
  if (
    reservedCommitment.predecessorIndexDigest !== predecessorIndex.snapshotDigest
    || !sameRelease(reservedCommitment.predecessorRelease, predecessorIndex.predecessorRelease)
    || reservedCommitment.successorBatchDigest !== ledger.batchDigest
  ) {
    throw new Error("Append-only ingestion ledger predecessor index already has a distinct accepted successor");
  }
  const frozen = freezeLedger(ledger, predecessorIndex);
  if (priorBatchCandidate !== undefined) successorBatchDigests.set(priorBatchCandidate as object, ledger.batchDigest);
  return frozen;
}
