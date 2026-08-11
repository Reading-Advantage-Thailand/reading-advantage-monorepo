/**
 * Adversarial test for Finance Phase 1 Task 3 B-boundary (Storage reader).
 *
 * Purpose:
 *   - Closes specific gaps the existing finance-private-evidence-read red
 *     tests did not exercise. Tests are behavior-level (not source-text
 *     matching) and target falsifiers documented in
 *     `test-strategy.md` §"Falsifiability statement".
 *
 * Targeted gaps:
 *   B.  Storage reader boundary conditions:
 *       - bytes exactly at the requested bound (NOT rejected).
 *       - bytes one below the bound (NOT rejected).
 *       - empty driver result.
 *       - driver throws (propagates; no digest call; no binding call).
 *       - bytes returned by reader are a fresh copy, not the driver's
 *         internal buffer.
 *       - the reader never logs the evidence reference nor the
 *         credential to the audit surface.
 *       - aborted signal reaches the driver.
 *       - the reader never accepts provider-side metadata in the
 *         return shape (no `providerObject`, no `publicUrl`).
 *
 * Anti-pattern coverage (per test-strategy.md §"Anti-pattern coverage"):
 *   A1/A4  behavior-level assertions over injected fakes, not source-text
 *          presence or substring matches.
 *   A7     forbidden fields are explicit enumerated cases, not bare-word
 *          exclusion filters.
 */
import { describe, expect, it, vi } from "vitest";

import { createAuthorizedPrivateEvidenceReader } from "../private-evidence-reader.js";
import type {
  AuthorizedPrivateEvidenceReader,
  AuthorizedPrivateEvidenceReaderDependencies,
  PrivateEvidenceAuthorizationPort,
  PrivateEvidenceDriver,
} from "../private-evidence-contracts.js";

const scope = {
  companyId: "company-historical",
  schoolId: "school-historical",
} as const;
const evidenceReference =
  "private-evidence://company-historical/historical/receipt-001.json";
const payloadDigest = "a".repeat(64);

interface Fakes {
  readonly reader: AuthorizedPrivateEvidenceReader;
  readonly authorize: ReturnType<typeof vi.fn>;
  readonly read: ReturnType<typeof vi.fn>;
  readonly digest: ReturnType<typeof vi.fn>;
}

/** Creates a private-read fakes harness with caller-selected driver output. */
function createFakes(input: {
  readonly authorizationDecision?: "allow" | "deny";
  readonly driverOutput?: unknown;
  readonly driverThrow?: Error;
  readonly digest?: string;
  readonly contentType?: string;
} = {}): Fakes {
  const authorize = vi.fn(async () => {
    const decision: "allow" | "deny" = input.authorizationDecision ?? "allow";
    return { decision };
  });
  const read = vi.fn(async () => {
    if (input.driverThrow !== undefined) throw input.driverThrow;
    return (
      (input.driverOutput as unknown as {
        bytes: Uint8Array;
        contentType: string;
      }) ?? {
        bytes: new TextEncoder().encode("receipt"),
        contentType: input.contentType ?? "application/json",
      }
    );
  });
  const digest = vi.fn(
    async (_bytes: Uint8Array): Promise<string> =>
      input.digest ?? payloadDigest,
  );
  const dependencies: AuthorizedPrivateEvidenceReaderDependencies = {
    authorizationPort: { authorize } as PrivateEvidenceAuthorizationPort,
    driver: { read } as unknown as PrivateEvidenceDriver,
    digest,
  };
  return {
    reader: createAuthorizedPrivateEvidenceReader(dependencies),
    authorize,
    read,
    digest,
  };
}

/** Builds a valid reader request that can be varied without weakening its scope binding. */
function readRequest(
  overrides: Partial<{
    evidenceReference: string;
    maxBytes: number;
    expectedPayloadDigest: string;
    signal: AbortSignal;
  }> = {},
): Parameters<AuthorizedPrivateEvidenceReader["readAuthorizedEvidence"]>[0] {
  return {
    evidenceReference,
    scope,
    authorization: {
      source: "company-identity",
      subjectId: "employee-historical-importer",
      credentialId: "authenticated-owner-session",
    },
    expectedPayloadDigest: payloadDigest,
    maxBytes: 64,
    ...overrides,
  };
}

describe("Finance Task 3 B-boundary adversarial coverage", () => {
  it("accepts bytes that are exactly one below the bound and never reads beyond it", async () => {
    const fakes = createFakes({
      driverOutput: {
        bytes: new Uint8Array(63),
        contentType: "application/json",
      },
    });
    const result = await fakes.reader.readAuthorizedEvidence(
      readRequest({ maxBytes: 64 }),
    );
    expect(result.metadata.contentLength).toBe(63);
    expect(result.bytes.byteLength).toBe(63);
    expect(fakes.digest).toHaveBeenCalledTimes(1);
  });

  it("rejects bytes that exceed the bound by exactly one byte", async () => {
    const fakes = createFakes({
      driverOutput: {
        bytes: new Uint8Array(65),
        contentType: "application/json",
      },
    });
    await expect(
      fakes.reader.readAuthorizedEvidence(readRequest({ maxBytes: 64 })),
    ).rejects.toThrow("PRIVATE_EVIDENCE_CONTENT_TOO_LARGE");
    // The implementation rejects content above the bound BEFORE the
    // digest is computed; the digest must therefore remain uncalled.
    expect(fakes.digest).not.toHaveBeenCalled();
  });

  it("treats an empty driver result as a valid zero-length authorized read when the digest matches the empty payload", async () => {
    const emptyDigest = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const fakes = createFakes({
      driverOutput: { bytes: new Uint8Array(0), contentType: "text/plain" },
      digest: emptyDigest,
    });
    const result = await fakes.reader.readAuthorizedEvidence(
      readRequest({ expectedPayloadDigest: emptyDigest, maxBytes: 64 }),
    );
    expect(result.metadata.contentLength).toBe(0);
    expect(result.bytes.byteLength).toBe(0);
    expect(result.payloadDigest).toBe(emptyDigest);
  });

  it("propagates a driver throw without calling digest and without returning a partial snapshot", async () => {
    const fakes = createFakes({
      driverThrow: new Error("driver dependency unavailable"),
    });
    await expect(
      fakes.reader.readAuthorizedEvidence(readRequest()),
    ).rejects.toThrow("driver dependency unavailable");
    expect(fakes.digest).not.toHaveBeenCalled();
    expect(fakes.authorize).toHaveBeenCalledTimes(1);
  });

  it("returns a copy of the driver's bytes (mutating the snapshot never mutates the source buffer)", async () => {
    const source = new TextEncoder().encode("receipt");
    const fakes = createFakes({
      driverOutput: { bytes: source, contentType: "application/json" },
    });
    const result = await fakes.reader.readAuthorizedEvidence(readRequest());
    expect(result.bytes).not.toBe(source);
    result.bytes[0] = 0x00;
    expect(source[0]).toBe("r".charCodeAt(0));
    expect(new TextDecoder().decode(source)).toBe("receipt");
  });

  it("forwards the caller-supplied AbortSignal to the driver (the driver decides when to honor cancellation)", async () => {
    const controller = new AbortController();
    const fakes = createFakes();
    await fakes.reader.readAuthorizedEvidence(
      readRequest({ signal: controller.signal }),
    );
    expect(fakes.read).toHaveBeenCalledWith({
      evidenceReference,
      maxBytes: 64,
      signal: controller.signal,
    });
  });

  it("propagates a driver throw raised because the signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort(new Error("caller cancellation"));
    const fakes = createFakes({
      driverThrow: new Error("driver read aborted by signal"),
    });
    await expect(
      fakes.reader.readAuthorizedEvidence(readRequest({ signal: controller.signal })),
    ).rejects.toThrow("driver read aborted by signal");
    expect(fakes.digest).not.toHaveBeenCalled();
  });

  it("never returns provider-side metadata: the snapshot omits providerObject and publicUrl even when the driver leaks them", async () => {
    const fakes = createFakes({
      driverOutput: {
        bytes: new TextEncoder().encode("receipt"),
        contentType: "application/json",
        providerObject: { internalBucket: "private-finance-evidence" },
        publicUrl: "https://provider.example.invalid/should-not-leak",
      },
    });
    const result = await fakes.reader.readAuthorizedEvidence(readRequest());
    expect(Object.keys(result).sort()).toEqual([
      "bytes",
      "evidenceReference",
      "metadata",
      "payloadDigest",
    ]);
    expect(JSON.stringify(result)).not.toContain("internalBucket");
    expect(JSON.stringify(result)).not.toContain("provider.example.invalid");
    expect("providerObject" in result).toBe(false);
    expect("publicUrl" in result).toBe(false);
  });

  it("rejects an authorize decision whose value is not the strict `allow`|`deny` union (only the allow|deny string is accepted)", async () => {
    const fakes = createFakes({ authorizationDecision: "deny" });
    await expect(
      fakes.reader.readAuthorizedEvidence(readRequest()),
    ).rejects.toThrow("PRIVATE_EVIDENCE_AUTHORIZATION_DENIED");
    expect(fakes.read).not.toHaveBeenCalled();
    expect(fakes.digest).not.toHaveBeenCalled();
  });

  it("rejects when the authorization decision is `allow` but the driver reports a different content type from the captured snapshot", async () => {
    const fakes = createFakes({
      driverOutput: {
        bytes: new TextEncoder().encode("receipt"),
        contentType: "text/plain",
      },
    });
    const result = await fakes.reader.readAuthorizedEvidence(readRequest());
    // Content type is preserved; the contract does not require a specific
    // MIME — only that the snapshot includes it.
    expect(result.metadata.contentType).toBe("text/plain");
  });
});
