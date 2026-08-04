import { ACCEPTED_STANDARD_ASSET_RELEASE } from "./accepted-standard-pack-release.js";
import { LEGACY_INGESTION_REQUIRED_FIXTURE } from "./standard-pack-suitability-test-fixtures.test-support.js";
import {
  serializeStandardPackCanonicalIngestionReceiptPayload,
} from "./standard-pack-suitability.js";
import type {
  StandardPackCanonicalIngestionReceipt,
} from "./standard-pack-suitability.js";

const DIGEST_A = "a".repeat(64);
const DIGEST_B = "b".repeat(64);
const DIGEST_C = "c".repeat(64);
const FIXTURE_TIME = "2026-07-29T08:00:00.000Z";

/** One deterministic mutation proving that a required ingestion evidence class fails closed. */
export interface CanonicalIngestionNegativeFixture {
  /** Human-readable evidence omission under test. */
  readonly label: string;
  /** Zod issue path expected from the omission. */
  readonly expectedPath: string;
  /**
   * Removes or invalidates exactly one required evidence class.
   * @param receipt A structurally and cryptographically valid baseline receipt.
   * @returns An untrusted receipt candidate expected to fail validation.
   */
  readonly create: (receipt: StandardPackCanonicalIngestionReceipt) => unknown;
}

/**
 * Computes a deterministic lowercase SHA-256 digest.
 * @param value The serialized evidence payload.
 * @returns The payload digest.
 */
async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Returns an object without the named evidence fields.
 * @param value The complete evidence object.
 * @param keys The fields whose absence is under test.
 * @returns A shallow copy without the selected fields.
 */
function omitFields<T extends object>(
  value: T,
  keys: readonly (keyof T)[],
): Partial<T> {
  const omitted = new Set<PropertyKey>(keys);
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !omitted.has(key)),
  ) as Partial<T>;
}

/**
 * Creates a complete evidence-only ingestion receipt bound to the legacy suitability draft.
 * @returns A cryptographically valid receipt with no production or migration authority.
 */
export async function createCanonicalIngestionReceiptFixture():
Promise<StandardPackCanonicalIngestionReceipt> {
  const candidate = LEGACY_INGESTION_REQUIRED_FIXTURE.candidates[0];
  const provenance = LEGACY_INGESTION_REQUIRED_FIXTURE.provenance[0];
  const license = LEGACY_INGESTION_REQUIRED_FIXTURE.licensing[0];
  const credit = LEGACY_INGESTION_REQUIRED_FIXTURE.credits[0];
  const receipt: StandardPackCanonicalIngestionReceipt = {
    schemaVersion: 1,
    receiptId: "fixture-legacy-hero-ingestion-receipt",
    createdAt: FIXTURE_TIME,
    candidateId: candidate.candidateId,
    sourceIdentity: provenance.sourceIdentity,
    sourceSha256: provenance.sourceSha256,
    sourceReceiptDigest: provenance.sourceReceiptDigest,
    license,
    credit,
    catalogEntryKey: candidate.descriptor.catalogEntryKey,
    descriptorId: candidate.descriptor.descriptorId,
    descriptorDigest: candidate.descriptor.descriptorDigest,
    predecessorRelease: {
      version: ACCEPTED_STANDARD_ASSET_RELEASE.version,
      catalogDigest: ACCEPTED_STANDARD_ASSET_RELEASE.catalogDigest,
      sourceReceiptDigest: ACCEPTED_STANDARD_ASSET_RELEASE.sourceReceiptDigest,
    },
    additiveRelease: {
      version: "2026.08.06",
      catalogDigest: DIGEST_B,
      sourceReceiptDigest: DIGEST_C,
    },
    authorization: {
      productionUseAuthorized: false,
      migrationAuthorized: false,
      cutoverAuthorized: false,
      deploymentAuthorized: false,
    },
    receiptDigest: DIGEST_A,
  };
  const receiptDigest = await sha256(
    serializeStandardPackCanonicalIngestionReceiptPayload(receipt),
  );
  return Object.freeze({ ...receipt, receiptDigest });
}

/**
 * Removes the exact legacy source checksum.
 * @param receipt The complete baseline receipt.
 * @returns A receipt candidate without source checksum evidence.
 */
function withoutSourceChecksum(
  receipt: StandardPackCanonicalIngestionReceipt,
): unknown {
  return omitFields(receipt, ["sourceSha256"]);
}

/**
 * Removes the exact legacy source identity that anchors provenance.
 * @param receipt The complete baseline receipt.
 * @returns A receipt candidate without provenance identity.
 */
function withoutProvenanceIdentity(
  receipt: StandardPackCanonicalIngestionReceipt,
): unknown {
  return omitFields(receipt, ["sourceIdentity"]);
}

/**
 * Replaces the approved license review with a pending review.
 * @param receipt The complete baseline receipt.
 * @returns A receipt candidate without approved licensing.
 */
function withoutApprovedLicense(
  receipt: StandardPackCanonicalIngestionReceipt,
): unknown {
  return {
    ...receipt,
    license: {
      ...receipt.license,
      status: "pending",
      licenseId: null,
      reviewedBy: null,
      reviewedAt: null,
    },
  };
}

/**
 * Removes the proposed canonical taxonomy and key assignment.
 * @param receipt The complete baseline receipt.
 * @returns A receipt candidate without a catalog taxonomy key.
 */
function withoutTaxonomyKey(
  receipt: StandardPackCanonicalIngestionReceipt,
): unknown {
  return omitFields(receipt, ["catalogEntryKey"]);
}

/**
 * Removes the proposed physical descriptor identity and checksum.
 * @param receipt The complete baseline receipt.
 * @returns A receipt candidate without descriptor identity evidence.
 */
function withoutDescriptorIdentity(
  receipt: StandardPackCanonicalIngestionReceipt,
): unknown {
  return omitFields(receipt, ["descriptorId", "descriptorDigest"]);
}

/**
 * Removes the receipt digest linking the legacy source to its source receipt.
 * @param receipt The complete baseline receipt.
 * @returns A receipt candidate without source-receipt linkage.
 */
function withoutSourceReceiptLinkage(
  receipt: StandardPackCanonicalIngestionReceipt,
): unknown {
  return omitFields(receipt, ["sourceReceiptDigest"]);
}

/**
 * Removes the additive successor release evidence.
 * @param receipt The complete baseline receipt.
 * @returns A receipt candidate without additive release evidence.
 */
function withoutAdditiveReleaseEvidence(
  receipt: StandardPackCanonicalIngestionReceipt,
): unknown {
  return omitFields(receipt, ["additiveRelease"]);
}

/** Deterministic negative fixtures for every required canonical-ingestion evidence class. */
export const CANONICAL_INGESTION_NEGATIVE_FIXTURES:
readonly CanonicalIngestionNegativeFixture[] = Object.freeze([
  {
    label: "missing source checksum",
    expectedPath: "sourceSha256",
    create: withoutSourceChecksum,
  },
  {
    label: "missing provenance identity",
    expectedPath: "sourceIdentity",
    create: withoutProvenanceIdentity,
  },
  {
    label: "missing approved license",
    expectedPath: "license",
    create: withoutApprovedLicense,
  },
  {
    label: "missing taxonomy and catalog key",
    expectedPath: "catalogEntryKey",
    create: withoutTaxonomyKey,
  },
  {
    label: "missing descriptor identity",
    expectedPath: "descriptorId",
    create: withoutDescriptorIdentity,
  },
  {
    label: "missing source receipt linkage",
    expectedPath: "sourceReceiptDigest",
    create: withoutSourceReceiptLinkage,
  },
  {
    label: "missing additive release evidence",
    expectedPath: "additiveRelease",
    create: withoutAdditiveReleaseEvidence,
  },
]);
