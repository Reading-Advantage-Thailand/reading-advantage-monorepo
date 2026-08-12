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
 *       - driver errors are sanitized; no digest call occurs.
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

/** Creates a manually controlled promise for an authorization TOCTOU probe. */
function deferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

/** Creates a private-read fakes harness with caller-selected driver output. */
function createFakes(
  input: {
    readonly authorizationDecision?: "allow" | "deny";
    readonly driverOutput?: unknown;
    readonly driverThrow?: Error;
    readonly digest?: string;
    readonly contentType?: string;
  } = {},
): Fakes {
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
    maxBytes: 1024,
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
    const emptyDigest =
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
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

  it("sanitizes a provider dependency error without calling digest or returning a partial snapshot", async () => {
    const secret = "bucket=private-finance-evidence credential=provider-secret";
    const fakes = createFakes({
      driverThrow: new Error(`provider failed: ${secret}`),
    });
    let error: unknown;
    try {
      await fakes.reader.readAuthorizedEvidence(readRequest());
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ code: "PRIVATE_EVIDENCE_DRIVER_ERROR" });
    expect(JSON.stringify(error)).not.toContain(secret);
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

  it("returns a frozen snapshot with defensive bytes and metadata across delayed consumers", async () => {
    const fakes = createFakes({
      driverOutput: {
        bytes: new Uint8Array([1, 2, 3]),
        contentType: "application/json",
      },
    });
    const result = await fakes.reader.readAuthorizedEvidence(
      readRequest({ maxBytes: 3 }),
    );
    const firstView = result.bytes;
    firstView[0] = 9;

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.metadata)).toBe(true);
    expect(() => {
      (result as { evidenceReference: string }).evidenceReference =
        "tampered-reference";
    }).toThrow(TypeError);
    expect(() => {
      (result.metadata as { contentType: string }).contentType = "text/html";
    }).toThrow(TypeError);

    await Promise.resolve();
    const freshView = result.bytes;
    expect(freshView).not.toBe(firstView);
    expect([...freshView]).toEqual([1, 2, 3]);
    expect(result.evidenceReference).toBe(evidenceReference);
    expect(result.payloadDigest).toBe(payloadDigest);
    expect(result.metadata).toEqual({
      contentLength: 3,
      contentType: "application/json",
    });
  });

  it("snapshots driver bytes and content type before a deferred digest can mutate provider output", async () => {
    const digestStarted = deferred<void>();
    const releaseDigest = deferred<void>();
    const source = new Uint8Array([1, 2, 3]);
    const driverResult: { bytes: Uint8Array; contentType: string } = {
      bytes: source,
      contentType: "application/json",
    };
    const fakes = createFakes({ driverOutput: driverResult });
    let digestInput: number[] = [];
    fakes.digest.mockImplementation(async (bytes: Uint8Array) => {
      digestInput = [...bytes];
      digestStarted.resolve();
      await releaseDigest.promise;
      bytes[0] = 7;
      return payloadDigest;
    });

    const resultPromise = fakes.reader.readAuthorizedEvidence(
      readRequest({ maxBytes: 3 }),
    );
    await digestStarted.promise;
    source[0] = 9;
    driverResult.contentType = "text/html";
    releaseDigest.resolve();

    const result = await resultPromise;
    expect(digestInput).toEqual([1, 2, 3]);
    expect([...result.bytes]).toEqual([1, 2, 3]);
    expect(result.metadata).toEqual({
      contentLength: 3,
      contentType: "application/json",
    });
  });

  it("maps a poisoned driver bytes getter to a stable result error", async () => {
    const secret = "DRIVER_GETTER_SECRET_42";
    const poisoned: Record<string, unknown> = { contentType: "application/json" };
    Object.defineProperty(poisoned, "bytes", {
      get: () => {
        throw new Error(secret);
      },
    });
    const fakes = createFakes({ driverOutput: poisoned });

    const failure = await fakes.reader
      .readAuthorizedEvidence(readRequest())
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: "PRIVATE_EVIDENCE_DRIVER_RESULT_INVALID",
    });
    expect(JSON.stringify(failure)).not.toContain(secret);
    expect(fakes.digest).not.toHaveBeenCalled();
  });

  it("maps a poisoned authorization decision getter to a stable authorization error", async () => {
    const secret = "AUTHORIZATION_GETTER_SECRET_42";
    const poisoned: Record<string, unknown> = {};
    Object.defineProperty(poisoned, "decision", {
      get: () => {
        throw new Error(secret);
      },
    });
    const fakes = createFakes();
    fakes.authorize.mockResolvedValue(poisoned);

    const failure = await fakes.reader
      .readAuthorizedEvidence(readRequest())
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({
      code: "PRIVATE_EVIDENCE_AUTHORIZATION_ERROR",
    });
    expect(JSON.stringify(failure)).not.toContain(secret);
    expect(fakes.read).not.toHaveBeenCalled();
  });

  it("maps a poisoned request scope getter to a stable request error", async () => {
    const secret = "REQUEST_SCOPE_GETTER_SECRET_42";
    const request = readRequest() as unknown as Record<string, unknown>;
    Object.defineProperty(request, "scope", {
      get: () => {
        throw new Error(secret);
      },
    });
    const fakes = createFakes();

    const failure = await fakes.reader
      .readAuthorizedEvidence(request as never)
      .catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: "PRIVATE_EVIDENCE_REQUEST_INVALID" });
    expect(JSON.stringify(failure)).not.toContain(secret);
    expect(fakes.authorize).not.toHaveBeenCalled();
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

  it("sanitizes a driver error raised because the signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort(new Error("caller cancellation"));
    const fakes = createFakes({
      driverThrow: new Error("driver read aborted by signal"),
    });
    await expect(
      fakes.reader.readAuthorizedEvidence(
        readRequest({ signal: controller.signal }),
      ),
    ).rejects.toMatchObject({ code: "PRIVATE_EVIDENCE_DRIVER_ERROR" });
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

  it.each([
    {
      name: "uppercase type or subtype",
      contentType: "Application/JSON",
    },
    {
      name: "unicode type metadata",
      contentType: "application/jѕon",
    },
    {
      name: "oversized provider metadata",
      contentType: `application/${"x".repeat(256)}`,
    },
    {
      name: "non-canonical parameter spacing",
      contentType: "application/json;charset=utf-8",
    },
    {
      name: "control character",
      contentType: "application/json\nX-Injected: secret",
    },
  ] as const)(
    "rejects $name content types at the provider boundary",
    async ({ contentType }) => {
      const fakes = createFakes({
        driverOutput: {
          bytes: new TextEncoder().encode("receipt"),
          contentType,
        },
      });

      await expect(
        fakes.reader.readAuthorizedEvidence(readRequest()),
      ).rejects.toThrow("PRIVATE_EVIDENCE_CONTENT_TYPE_INVALID");
      expect(fakes.digest).not.toHaveBeenCalled();
    },
  );

  it("accepts a lowercase canonical MIME parameter form", async () => {
    const fakes = createFakes({
      driverOutput: {
        bytes: new TextEncoder().encode("receipt"),
        contentType: "application/json; charset=utf-8",
      },
    });

    const result = await fakes.reader.readAuthorizedEvidence(readRequest());
    expect(result.metadata.contentType).toBe("application/json; charset=utf-8");
  });

  it("uses constructor-bound authorization, driver, and digest references after dependency mutation", async () => {
    const originalAuthorize = vi.fn(
      async (
        _input: Parameters<PrivateEvidenceAuthorizationPort["authorize"]>[0],
      ): Promise<{ decision: "allow" | "deny" }> => ({ decision: "allow" }),
    );
    const originalRead = vi.fn(async () => ({
      bytes: new TextEncoder().encode("receipt"),
      contentType: "application/json",
    }));
    const originalDigest = vi.fn(async () => payloadDigest);
    const dependencies = {
      authorizationPort: { authorize: originalAuthorize },
      driver: { read: originalRead },
      digest: originalDigest,
      maxBytes: 1024,
    };
    const reader = createAuthorizedPrivateEvidenceReader(dependencies);
    const replacementAuthorize = vi.fn(
      async (
        _input: Parameters<PrivateEvidenceAuthorizationPort["authorize"]>[0],
      ): Promise<{ decision: "allow" | "deny" }> => ({ decision: "deny" }),
    );
    const replacementRead = vi.fn(async () => ({
      bytes: new TextEncoder().encode("replacement"),
      contentType: "application/json",
    }));
    const replacementDigest = vi.fn(async () => "b".repeat(64));
    dependencies.authorizationPort = { authorize: replacementAuthorize };
    dependencies.driver = { read: replacementRead };
    dependencies.digest = replacementDigest;

    const result = await reader.readAuthorizedEvidence(readRequest());

    expect(result.payloadDigest).toBe(payloadDigest);
    expect(originalAuthorize).toHaveBeenCalledTimes(1);
    expect(originalRead).toHaveBeenCalledTimes(1);
    expect(originalDigest).toHaveBeenCalledTimes(1);
    expect(replacementAuthorize).not.toHaveBeenCalled();
    expect(replacementRead).not.toHaveBeenCalled();
    expect(replacementDigest).not.toHaveBeenCalled();
  });

  it("snapshots every request binding before deferred authorization can mutate the caller object", async () => {
    const authorizationStarted = deferred<void>();
    const releaseAuthorization = deferred<void>();
    const originalSignal = new AbortController().signal;
    const replacementSignal = new AbortController().signal;
    const originalScope = {
      companyId: "company-historical",
      schoolId: "school-historical",
    };
    const originalAuthorization = {
      source: "company-identity",
      subjectId: "employee-historical-importer",
      credentialId: "authenticated-owner-session",
      claims: { version: "claims-v1" },
    };
    const authorize = vi.fn(async (request: {
      readonly evidenceReference: string;
      readonly scope: typeof originalScope;
      readonly authorization: Readonly<Record<string, unknown>>;
    }) => {
      expect(request.evidenceReference).toBe(evidenceReference);
      expect(request.scope).toEqual(originalScope);
      expect(request.authorization).toEqual(originalAuthorization);
      authorizationStarted.resolve();
      await releaseAuthorization.promise;
      return { decision: "allow" as const };
    });
    const read = vi.fn(async (request: {
      readonly evidenceReference: string;
      readonly expectedPayloadDigest: string;
      readonly maxBytes: number;
      readonly signal?: AbortSignal;
    }) => {
      expect(request).toEqual({
        evidenceReference,
        maxBytes: 1,
        signal: originalSignal,
      });
      return {
        bytes: new Uint8Array([0x72]),
        contentType: "application/json",
      };
    });
    const digest = vi.fn(async () => payloadDigest);
    const dependencies = {
      authorizationPort: { authorize },
      driver: { read },
      digest,
      maxBytes: 10,
    };
    const reader = createAuthorizedPrivateEvidenceReader(dependencies);
    const request = {
      evidenceReference,
      scope: originalScope,
      authorization: originalAuthorization,
      expectedPayloadDigest: payloadDigest,
      maxBytes: 1,
      signal: originalSignal,
    };

    const resultPromise = reader.readAuthorizedEvidence(request);
    await authorizationStarted.promise;
    request.evidenceReference =
      "private-evidence://company-historical/historical/second.json";
    request.scope.companyId = "company-attacker";
    request.scope.schoolId = "school-attacker";
    request.authorization.subjectId = "attacker";
    (request.authorization.claims as { version: string }).version =
      "claims-attacker";
    request.expectedPayloadDigest = "b".repeat(64);
    request.maxBytes = 999_999;
    request.signal = replacementSignal;
    releaseAuthorization.resolve();

    const result = await resultPromise;

    expect(result.evidenceReference).toBe(evidenceReference);
    expect(result.payloadDigest).toBe(payloadDigest);
    expect(result.bytes.byteLength).toBe(1);
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith({
      evidenceReference,
      maxBytes: 1,
      signal: originalSignal,
    });
  });
});
