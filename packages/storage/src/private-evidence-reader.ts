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

const PRIVATE_EVIDENCE_REFERENCE_PREFIX = "private-evidence://";
const PRIVATE_EVIDENCE_REFERENCE_PATTERN =
  /^private-evidence:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\/[A-Za-z0-9._~-]+)+$/u;
const LOWERCASE_SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/u;

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

/** Returns a scope company identifier without trusting unvalidated caller data. */
function getScopeCompanyId(scope: unknown): string | undefined {
  if (typeof scope !== "object" || scope === null) {
    return undefined;
  }
  const companyId = (scope as Partial<PrivateEvidenceScope>).companyId;
  return typeof companyId === "string" ? companyId : undefined;
}

/** Creates an authorization-gated reader over provider-neutral injected dependencies. */
export function createAuthorizedPrivateEvidenceReader(
  dependencies: AuthorizedPrivateEvidenceReaderDependencies,
): AuthorizedPrivateEvidenceReader {
  const ownerMaxBytes = dependencies.maxBytes;

  return {
    async readAuthorizedEvidence(
      input: AuthorizedPrivateEvidenceReadInput,
    ): Promise<AuthorizedPrivateEvidenceSnapshot> {
      const evidenceCompanyId = parseEvidenceCompanyId(input.evidenceReference);
      assertExpectedDigest(input.expectedPayloadDigest);
      assertMaxBytes(input.maxBytes);
      if (ownerMaxBytes !== undefined && input.maxBytes > ownerMaxBytes) {
        fail("PRIVATE_EVIDENCE_MAX_BYTES_EXCEEDS_OWNER_CEILING");
      }

      if (evidenceCompanyId !== getScopeCompanyId(input.scope)) {
        fail("PRIVATE_EVIDENCE_SCOPE_MISMATCH");
      }

      const authorization = await dependencies.authorizationPort.authorize({
        evidenceReference: input.evidenceReference,
        scope: input.scope,
        authorization: input.authorization,
      });
      if (authorization.decision !== "allow") {
        fail("PRIVATE_EVIDENCE_AUTHORIZATION_DENIED");
      }

      let result: unknown;
      try {
        result = await dependencies.driver.read({
          evidenceReference: input.evidenceReference,
          maxBytes: input.maxBytes,
          signal: input.signal,
        });
      } catch {
        fail("PRIVATE_EVIDENCE_DRIVER_ERROR");
      }
      if (
        typeof result !== "object" ||
        result === null ||
        !((result as { bytes?: unknown }).bytes instanceof Uint8Array) ||
        typeof (result as { contentType?: unknown }).contentType !== "string"
      ) {
        fail("PRIVATE_EVIDENCE_DRIVER_RESULT_INVALID");
      }
      const driverResult = result as {
        readonly bytes: Uint8Array;
        readonly contentType: string;
      };
      if (driverResult.bytes.byteLength > input.maxBytes) {
        fail("PRIVATE_EVIDENCE_CONTENT_TOO_LARGE");
      }

      const payloadDigest = await dependencies.digest(driverResult.bytes);
      if (payloadDigest !== input.expectedPayloadDigest) {
        fail("PRIVATE_EVIDENCE_DIGEST_MISMATCH");
      }

      return {
        evidenceReference: input.evidenceReference,
        payloadDigest,
        bytes: new Uint8Array(driverResult.bytes),
        metadata: {
          contentLength: driverResult.bytes.byteLength,
          contentType: driverResult.contentType,
        },
      };
    },
  };
}
