/**
 * Private-evidence write port for the accounting submissions route.
 *
 * `@reading-advantage/storage` ships a generic `StorageClient.put`; this
 * adapter is the single place that turns an untrusted upload into a
 * company-scoped `private-evidence://` reference and stores the bytes under
 * exactly that key. Callers receive back only the opaque reference; they never
 * build storage keys themselves.
 */
import { randomUUID } from "node:crypto";

import {
  getStorageClient,
  type StorageClient,
} from "@reading-advantage/storage";

/** Scheme prefix of every private evidence reference. */
const PRIVATE_EVIDENCE_SCHEME = "private-evidence://";

/**
 * Characters allowed in one reference path segment by the DB-enforced
 * reference grammar (`[A-Za-z0-9._~-]`).
 */
const SAFE_SEGMENT_CHARACTER = /^[A-Za-z0-9._~-]$/u;

/**
 * Reduces an untrusted upload file name to one safe reference segment.
 * Path separators are collapsed to the final segment, control characters are
 * dropped, every other disallowed character becomes `-`, and a result that is
 * empty or a traversal segment (`.`/`..`) falls back to a fixed safe name.
 * @param fileName Original, untrusted upload file name.
 * @returns A single path segment safe for a private evidence reference.
 */
function sanitizeFileName(fileName: string): string {
  const segments = fileName.split(/[\\/]+/u);
  const baseName = segments[segments.length - 1] ?? "";
  let sanitized = "";
  for (const character of baseName) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) continue;
    sanitized += SAFE_SEGMENT_CHARACTER.test(character) ? character : "-";
  }
  if (sanitized === "" || sanitized === "." || sanitized === "..") {
    return "evidence";
  }
  return sanitized;
}

/** Input for one private evidence upload. */
export interface PutPrivateEvidenceInput {
  /**
   * Storage port to write through. Defaults to the process-wide
   * `StorageClient` singleton resolved from `STORAGE_*` environment
   * variables; tests inject a fake.
   */
  readonly storage?: StorageClient;
  /** Trusted company scope from the session actor; roots the reference. */
  readonly companyId: string;
  /** Original upload file name (untrusted input; sanitized). */
  readonly fileName: string;
  /** Declared MIME type of the upload. */
  readonly contentType: string;
  /** File bytes to store. */
  readonly body: Uint8Array;
}

/** Result of one private evidence upload. */
export interface PutPrivateEvidenceResult {
  /** Company-scoped opaque reference to hand to the domain. */
  readonly evidenceReference: string;
}

/** Input for deleting one private evidence upload. */
export interface DeletePrivateEvidenceInput {
  /** Storage port to delete through. Defaults to the process-wide singleton. */
  readonly storage?: StorageClient;
  /** Trusted company scope from the session actor. */
  readonly companyId: string;
  /** Private evidence reference returned by the upload port. */
  readonly evidenceReference: string;
}

/** Input for reading one private evidence object. */
export interface ReadPrivateEvidenceInput {
  /** Storage port to read through. Defaults to the process-wide singleton. */
  readonly storage?: StorageClient;
  /** Trusted company scope from the session actor. */
  readonly companyId: string;
  /** Private evidence reference returned by the upload port. */
  readonly evidenceReference: string;
}

/** Checks whether a reference path segment is safe for a storage key. */
function isSafeReferenceSegment(segment: string): boolean {
  return (
    segment !== "" &&
    segment !== "." &&
    segment !== ".." &&
    [...segment].every((character) => SAFE_SEGMENT_CHARACTER.test(character))
  );
}

/**
 * Converts a private evidence reference to a company-scoped storage key.
 * @param companyId Trusted company scope.
 * @param evidenceReference Private evidence reference to validate.
 * @returns The validated storage key.
 * @throws When the reference is outside the caller's company scope.
 */
function privateEvidenceKey(
  companyId: string,
  evidenceReference: string,
): string {
  const key = evidenceReference.startsWith(PRIVATE_EVIDENCE_SCHEME)
    ? evidenceReference.slice(PRIVATE_EVIDENCE_SCHEME.length)
    : "";
  const segments = key.split("/");
  if (
    segments.length < 3 ||
    segments[0] !== companyId ||
    segments[1] !== "submissions" ||
    segments.some((segment) => !isSafeReferenceSegment(segment))
  ) {
    throw new Error("Evidence reference is outside the caller's company scope");
  }
  return key;
}

/**
 * Stores upload bytes once through the storage port and returns the
 * company-scoped `private-evidence://` reference for the stored object. The
 * object is never opted in to a public ACL, and the reference grammar
 * matches the DB-enforced pattern (no traversal segments, no control
 * characters).
 * @param input Storage port, trusted company scope, and untrusted upload data.
 * @returns The private evidence reference the domain persists.
 */
export async function putPrivateEvidence(
  input: PutPrivateEvidenceInput,
): Promise<PutPrivateEvidenceResult> {
  const storage = input.storage ?? getStorageClient();
  const key = `${input.companyId}/submissions/${randomUUID()}/${sanitizeFileName(input.fileName)}`;
  await storage.put(key, input.body, {
    contentType: input.contentType,
    public: false,
  });
  return { evidenceReference: `${PRIVATE_EVIDENCE_SCHEME}${key}` };
}

/** Deletes one uploaded private evidence object within the caller's company scope.
 * @param input Storage port, trusted company scope, and uploaded evidence reference.
 * @returns A promise that resolves after the object is deleted.
 * @throws When the reference does not identify one object created for the company.
 */
export async function deletePrivateEvidence(
  input: DeletePrivateEvidenceInput,
): Promise<void> {
  await (input.storage ?? getStorageClient()).delete(
    privateEvidenceKey(input.companyId, input.evidenceReference),
  );
}

/**
 * Reads one private evidence object within the caller's company scope.
 * @param input Storage port, trusted company scope, and evidence reference.
 * @returns The stored evidence bytes.
 * @throws When the reference is outside the caller's company scope or storage rejects the read.
 */
export async function readPrivateEvidence(
  input: ReadPrivateEvidenceInput,
): Promise<Uint8Array> {
  return (input.storage ?? getStorageClient()).get(
    privateEvidenceKey(input.companyId, input.evidenceReference),
  );
}
