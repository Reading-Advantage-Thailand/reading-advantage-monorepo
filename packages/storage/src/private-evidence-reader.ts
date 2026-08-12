import {
  PrivateEvidenceReadError,
  type PrivateEvidenceReadErrorCode,
} from "./private-evidence-errors.js";
import type {
  AuthorizedPrivateEvidenceReadInput,
  AuthorizedPrivateEvidenceReader,
  AuthorizedPrivateEvidenceReaderDependencies,
  AuthorizedPrivateEvidenceSnapshot,
  PrivateEvidenceScope,
} from "./private-evidence-contracts.js";

import { z } from "zod";

const PRIVATE_EVIDENCE_REFERENCE_PREFIX = "private-evidence://";
const PRIVATE_EVIDENCE_REFERENCE_PATTERN =
  /^private-evidence:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\/[A-Za-z0-9._~-]+)+$/u;
const LOWERCASE_SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_CONTENT_TYPE_LENGTH = 255;
const MIME_TOKEN = "[a-z0-9!#$%&'*+.^_`|~-]+";
const CANONICAL_MIME_PATTERN = new RegExp(
  `^${MIME_TOKEN}/${MIME_TOKEN}(?:; ${MIME_TOKEN}=${MIME_TOKEN})*$`,
  "u",
);
const requestScopeSchema = z.strictObject({
  companyId: z.string().min(1),
  schoolId: z.string().min(1).optional(),
});
const requestAuthorizationSchema = z.record(z.string(), z.unknown());

/** Raises a stable private evidence boundary error. */
function fail(code: PrivateEvidenceReadErrorCode): never {
  throw new PrivateEvidenceReadError(code);
}

/** Parses and validates the provider-neutral private evidence reference grammar. */
function parseEvidenceCompanyId(reference: unknown): string {
  if (typeof reference !== "string") {
    return fail("PRIVATE_EVIDENCE_REFERENCE_INVALID");
  }

  const match = PRIVATE_EVIDENCE_REFERENCE_PATTERN.exec(reference);
  if (!match) {
    return fail("PRIVATE_EVIDENCE_REFERENCE_INVALID");
  }

  const path = reference.slice(PRIVATE_EVIDENCE_REFERENCE_PREFIX.length);
  const segments = path.split("/").slice(1);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return fail("PRIVATE_EVIDENCE_REFERENCE_INVALID");
  }

  return match[1]!;
}

/** Validates the expected lowercase SHA-256 digest before any boundary call. */
function assertExpectedDigest(digest: unknown): asserts digest is string {
  if (
    typeof digest !== "string" ||
    !LOWERCASE_SHA256_HEX_PATTERN.test(digest)
  ) {
    fail("PRIVATE_EVIDENCE_DIGEST_INVALID");
  }
}

/** Validates the positive finite integer byte bound before any boundary call. */
function assertMaxBytes(maxBytes: unknown): asserts maxBytes is number {
  if (
    typeof maxBytes !== "number" ||
    !Number.isFinite(maxBytes) ||
    !Number.isInteger(maxBytes) ||
    maxBytes <= 0
  ) {
    fail("PRIVATE_EVIDENCE_MAX_BYTES_INVALID");
  }
}

/** Returns true only for a bounded lowercase MIME type with canonical parameters. */
function isCanonicalMimeType(value: string): boolean {
  return (
    value.length <= MAX_CONTENT_TYPE_LENGTH &&
    CANONICAL_MIME_PATTERN.test(value)
  );
}

/** Validates the owner-controlled byte ceiling before creating a reader. */
function assertOwnerMaxBytes(maxBytes: unknown): asserts maxBytes is number {
  if (maxBytes === undefined) {
    fail("PRIVATE_EVIDENCE_OWNER_CEILING_REQUIRED");
  }
  if (
    typeof maxBytes !== "number" ||
    !Number.isFinite(maxBytes) ||
    !Number.isInteger(maxBytes) ||
    maxBytes <= 0
  ) {
    fail("PRIVATE_EVIDENCE_OWNER_CEILING_INVALID");
  }
}

/** Returns a scope company identifier without trusting unvalidated caller data. */
function getScopeCompanyId(scope: unknown): string | undefined {
  if (typeof scope !== "object" || scope === null) {
    return undefined;
  }
  const companyId = (scope as Partial<PrivateEvidenceScope>).companyId;
  return typeof companyId === "string" ? companyId : undefined;
}

/** Copies a request authorization value into an immutable JSON-shaped snapshot. */
function snapshotRequestValue(
  value: unknown,
  seen: WeakSet<object>,
): unknown {
  if (
    value === undefined ||
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
    return value;
  }
  if (typeof value !== "object") {
    fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
  }
  if (seen.has(value)) fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
  seen.add(value);
  if (Array.isArray(value)) {
    const snapshot = value.map((entry) => snapshotRequestValue(entry, seen));
    seen.delete(value);
    return Object.freeze(snapshot);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
  }
  const snapshot: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    snapshot[key] = snapshotRequestValue(entry, seen);
  }
  seen.delete(value);
  return Object.freeze(snapshot);
}

/** Strictly validates and snapshots the caller authorization context. */
function snapshotAuthorization(
  value: unknown,
): Readonly<Record<string, unknown>> {
  const parsed = requestAuthorizationSchema.safeParse(value);
  if (!parsed.success) fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
  return snapshotRequestValue(parsed.data, new WeakSet()) as Readonly<
    Record<string, unknown>
  >;
}

/** Strictly validates the optional signal and captures its original reference. */
function snapshotSignal(value: unknown): AbortSignal | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as { aborted?: unknown }).aborted !== "boolean" ||
    typeof (value as { addEventListener?: unknown }).addEventListener !==
      "function"
  ) {
    fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
  }
  return value as AbortSignal;
}

/**
 * Creates an authorization-gated reader over provider-neutral injected dependencies.
 * @param dependencies Authorization port, bounded driver, digest function, and owner byte ceiling.
 * @returns A reader that authorizes, bounds, validates, and digests private evidence.
 */
export function createAuthorizedPrivateEvidenceReader(
  dependencies: AuthorizedPrivateEvidenceReaderDependencies,
): AuthorizedPrivateEvidenceReader {
  let authorizationPort:
    | AuthorizedPrivateEvidenceReaderDependencies["authorizationPort"]
    | undefined;
  let driver:
    | AuthorizedPrivateEvidenceReaderDependencies["driver"]
    | undefined;
  let authorizeMethod:
    | AuthorizedPrivateEvidenceReaderDependencies["authorizationPort"]["authorize"]
    | undefined;
  let readMethod:
    | AuthorizedPrivateEvidenceReaderDependencies["driver"]["read"]
    | undefined;
  let digest:
    | AuthorizedPrivateEvidenceReaderDependencies["digest"]
    | undefined;
  let ownerMaxBytesValue: unknown;
  try {
    authorizationPort = dependencies?.authorizationPort;
    driver = dependencies?.driver;
    digest = dependencies?.digest;
    ownerMaxBytesValue = dependencies?.maxBytes;
    authorizeMethod = authorizationPort?.authorize;
    readMethod = driver?.read;
  } catch {
    fail("PRIVATE_EVIDENCE_DEPENDENCY_INVALID");
  }
  if (
    authorizationPort === undefined ||
    driver === undefined ||
    typeof authorizeMethod !== "function" ||
    typeof readMethod !== "function" ||
    typeof digest !== "function"
  ) {
    fail("PRIVATE_EVIDENCE_DEPENDENCY_INVALID");
  }
  assertOwnerMaxBytes(ownerMaxBytesValue);
  const ownerMaxBytes = ownerMaxBytesValue;
  const authorize = authorizeMethod.bind(authorizationPort);
  const read = readMethod.bind(driver);

  return {
    async readAuthorizedEvidence(
      input: AuthorizedPrivateEvidenceReadInput,
    ): Promise<AuthorizedPrivateEvidenceSnapshot> {
      let evidenceReferenceValue: unknown;
      let expectedPayloadDigest: unknown;
      let maxBytes: unknown;
      let scopeResult: z.SafeParseReturnType<
        unknown,
        z.infer<typeof requestScopeSchema>
      >;
      let scope: Readonly<{ companyId: string; schoolId?: string }>;
      let callerAuthorization: Readonly<Record<string, unknown>>;
      let signal: AbortSignal | undefined;
      try {
        evidenceReferenceValue = input?.evidenceReference;
        expectedPayloadDigest = input?.expectedPayloadDigest;
        maxBytes = input?.maxBytes;
        scopeResult = requestScopeSchema.safeParse(input?.scope);
        if (!scopeResult.success) fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
        scope = Object.freeze({ ...scopeResult.data });
        callerAuthorization = snapshotAuthorization(input?.authorization);
        signal = snapshotSignal(input?.signal);
      } catch {
        fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
      }
      if (!scopeResult.success) fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
      const effectiveOwnerMaxBytes = ownerMaxBytes;

      if (typeof evidenceReferenceValue !== "string") {
        fail("PRIVATE_EVIDENCE_REQUEST_INVALID");
      }
      const evidenceReference = evidenceReferenceValue;
      const evidenceCompanyId = parseEvidenceCompanyId(evidenceReference);
      assertExpectedDigest(expectedPayloadDigest);
      assertMaxBytes(maxBytes);
      if (maxBytes > effectiveOwnerMaxBytes) {
        fail("PRIVATE_EVIDENCE_MAX_BYTES_EXCEEDS_OWNER_CEILING");
      }

      if (evidenceCompanyId !== getScopeCompanyId(scope)) {
        fail("PRIVATE_EVIDENCE_SCOPE_MISMATCH");
      }

      let authorizationDecision: unknown;
      try {
        authorizationDecision = await authorize({
          evidenceReference,
          scope,
          authorization: callerAuthorization,
        });
      } catch {
        fail("PRIVATE_EVIDENCE_AUTHORIZATION_ERROR");
      }
      let decision: unknown;
      try {
        if (
          typeof authorizationDecision !== "object" ||
          authorizationDecision === null
        ) {
          fail("PRIVATE_EVIDENCE_AUTHORIZATION_ERROR");
        }
        decision = (authorizationDecision as { decision?: unknown }).decision;
      } catch {
        fail("PRIVATE_EVIDENCE_AUTHORIZATION_ERROR");
      }
      if (decision !== "allow" && decision !== "deny") {
        fail("PRIVATE_EVIDENCE_AUTHORIZATION_ERROR");
      }
      if (decision !== "allow") {
        fail("PRIVATE_EVIDENCE_AUTHORIZATION_DENIED");
      }

      let result: unknown;
      try {
        result = await read({
          evidenceReference,
          maxBytes,
          signal,
        });
      } catch {
        fail("PRIVATE_EVIDENCE_DRIVER_ERROR");
      }
      if (typeof result !== "object" || result === null) {
        fail("PRIVATE_EVIDENCE_DRIVER_RESULT_INVALID");
      }
      let driverBytes: unknown;
      let driverContentType: unknown;
      try {
        driverBytes = (result as { bytes?: unknown }).bytes;
        driverContentType = (result as { contentType?: unknown }).contentType;
      } catch {
        fail("PRIVATE_EVIDENCE_DRIVER_RESULT_INVALID");
      }
      if (
        !(driverBytes instanceof Uint8Array) ||
        typeof driverContentType !== "string"
      ) {
        fail("PRIVATE_EVIDENCE_DRIVER_RESULT_INVALID");
      }
      let immutableBytes: Uint8Array;
      try {
        immutableBytes = new Uint8Array(driverBytes);
      } catch {
        fail("PRIVATE_EVIDENCE_DRIVER_RESULT_INVALID");
      }
      const immutableContentType = driverContentType;
      if (immutableBytes.byteLength > maxBytes) {
        fail("PRIVATE_EVIDENCE_CONTENT_TOO_LARGE");
      }
      if (!isCanonicalMimeType(immutableContentType)) {
        fail("PRIVATE_EVIDENCE_CONTENT_TYPE_INVALID");
      }

      let payloadDigest: string;
      try {
        payloadDigest = await digest(new Uint8Array(immutableBytes));
      } catch {
        fail("PRIVATE_EVIDENCE_DIGEST_ERROR");
      }
      if (payloadDigest !== expectedPayloadDigest) {
        fail("PRIVATE_EVIDENCE_DIGEST_MISMATCH");
      }

      const metadata = Object.freeze({
        contentLength: immutableBytes.byteLength,
        contentType: immutableContentType,
      });
      const snapshot = {
        evidenceReference,
        payloadDigest,
        get bytes(): Uint8Array {
          return new Uint8Array(immutableBytes);
        },
        metadata,
      };
      return Object.freeze(snapshot);
    },
  };
}
