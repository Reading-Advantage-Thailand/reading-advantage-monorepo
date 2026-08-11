import { describe, expect, it, vi } from "vitest";

const scope = {
  companyId: "company-historical",
  schoolId: "school-historical",
} as const;
const evidenceReference =
  "private-evidence://company-historical/historical/receipt-001.json";
const payloadDigest = "a".repeat(64);

interface PrivateEvidenceAuthorizationPort {
  /** Authorizes a precise private reference, scope, and authenticated evidence tuple. */
  authorize(input: {
    readonly evidenceReference: string;
    readonly scope: { readonly companyId: string; readonly schoolId?: string };
    readonly authorization: Readonly<Record<string, unknown>>;
  }): Promise<{ readonly decision: "allow" | "deny" }>;
}

interface PrivateEvidenceDriver {
  /** Reads bounded private bytes without exposing a public URL or provider SDK object. */
  read(input: {
    readonly evidenceReference: string;
    readonly maxBytes: number;
    readonly signal?: AbortSignal;
  }): Promise<{
    readonly bytes: Uint8Array;
    readonly contentType: string;
    readonly providerObject?: unknown;
    readonly publicUrl?: string;
  }>;
}

interface AuthorizedPrivateEvidenceReader {
  /** Reads one authorized evidence object and returns a bounded provider-neutral snapshot. */
  readAuthorizedEvidence(input: {
    readonly evidenceReference: string;
    readonly scope: { readonly companyId: string; readonly schoolId?: string };
    readonly authorization: Readonly<Record<string, unknown>>;
    readonly expectedPayloadDigest: string;
    readonly maxBytes: number;
    readonly signal?: AbortSignal;
  }): Promise<{
    readonly evidenceReference: string;
    readonly payloadDigest: string;
    readonly bytes: Uint8Array;
    readonly metadata: {
      readonly contentLength: number;
      readonly contentType: string;
    };
  }>;
}

interface StoragePrivateEvidenceModule {
  /** Creates an authorization-gated private-evidence reader over injected provider-neutral dependencies. */
  createAuthorizedPrivateEvidenceReader(input: {
    readonly authorizationPort: PrivateEvidenceAuthorizationPort;
    readonly driver: PrivateEvidenceDriver;
    readonly digest: (bytes: Uint8Array) => Promise<string>;
  }): AuthorizedPrivateEvidenceReader;
}

/** Loads Storage's public boundary as the future private-evidence reader factory. */
async function loadPrivateEvidenceReader(): Promise<StoragePrivateEvidenceModule> {
  return (await import("../index.js")) as unknown as StoragePrivateEvidenceModule;
}

/** Requires the executable factory contract without depending on source text or a provider SDK. */
function requirePrivateEvidenceReaderFactory(
  subject: StoragePrivateEvidenceModule,
): StoragePrivateEvidenceModule["createAuthorizedPrivateEvidenceReader"] {
  expect(
    subject.createAuthorizedPrivateEvidenceReader,
    "Storage must export createAuthorizedPrivateEvidenceReader for the historical private-evidence MVP.",
  ).toBeTypeOf("function");
  return subject.createAuthorizedPrivateEvidenceReader;
}

/** Creates private-read fakes that retain authorization, driver, and digest interactions. */
function createPrivateReadFakes(
  input: {
    readonly authorizationDecision?: "allow" | "deny";
    readonly bytes?: Uint8Array;
    readonly digest?: string;
  } = {},
): {
  readonly authorizationPort: PrivateEvidenceAuthorizationPort;
  readonly authorize: ReturnType<typeof vi.fn>;
  readonly driver: PrivateEvidenceDriver;
  readonly read: ReturnType<typeof vi.fn>;
  readonly digest: (bytes: Uint8Array) => Promise<string>;
  readonly digestSpy: ReturnType<typeof vi.fn>;
} {
  const bytes = input.bytes ?? new TextEncoder().encode("receipt");
  const authorize = vi.fn(async () => {
    const decision: "allow" | "deny" = input.authorizationDecision ?? "allow";
    return { decision };
  });
  const read = vi.fn(async () => ({
    bytes,
    contentType: "application/json",
    providerObject: { internalBucket: "private-finance-evidence" },
    publicUrl: "https://provider.example.invalid/should-not-leak",
  }));
  const digestSpy = vi.fn(
    async (_bytes: Uint8Array): Promise<string> =>
      input.digest ?? payloadDigest,
  );
  return {
    authorizationPort: { authorize },
    authorize,
    driver: { read },
    read,
    digest: (content) => digestSpy(content),
    digestSpy,
  };
}

/** Creates a complete caller request that can be varied without weakening its scope binding. */
function readRequest(
  overrides: Partial<
    Parameters<AuthorizedPrivateEvidenceReader["readAuthorizedEvidence"]>[0]
  > = {},
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

describe("Storage historical private-evidence read RED contract", () => {
  it("authorizes the exact private reference/scope/auth tuple, bounds bytes, computes the digest, and returns only provider-neutral fields", async () => {
    const subject = await loadPrivateEvidenceReader();
    const createReader = requirePrivateEvidenceReaderFactory(subject);
    const fakes = createPrivateReadFakes();
    const reader = createReader({
      authorizationPort: fakes.authorizationPort,
      driver: fakes.driver,
      digest: fakes.digest,
    });
    const request = readRequest();

    const result = await reader.readAuthorizedEvidence(request);

    expect(fakes.authorize).toHaveBeenCalledTimes(1);
    expect(fakes.authorize).toHaveBeenCalledWith({
      evidenceReference,
      scope,
      authorization: request.authorization,
    });
    expect(fakes.read).toHaveBeenCalledWith({
      evidenceReference,
      maxBytes: 64,
      signal: undefined,
    });
    expect(fakes.digestSpy).toHaveBeenCalledWith(
      new TextEncoder().encode("receipt"),
    );
    expect(result).toEqual({
      evidenceReference,
      payloadDigest,
      bytes: new TextEncoder().encode("receipt"),
      metadata: { contentLength: 7, contentType: "application/json" },
    });
    expect(Object.keys(result).sort()).toEqual([
      "bytes",
      "evidenceReference",
      "metadata",
      "payloadDigest",
    ]);
    expect(JSON.stringify(result)).not.toContain("provider.example.invalid");
    expect(JSON.stringify(result)).not.toContain("internalBucket");
  });

  it.each([
    {
      name: "authorization denies the exact request",
      fakes: { authorizationDecision: "deny" as const },
      request: readRequest(),
      authorizationCalls: 1,
      driverCalls: 0,
      error: "PRIVATE_EVIDENCE_AUTHORIZATION_DENIED",
    },
    {
      name: "the evidence company disagrees with the requested scope",
      fakes: {},
      request: readRequest({
        evidenceReference:
          "private-evidence://another-company/historical/receipt-001.json",
      }),
      authorizationCalls: 0,
      driverCalls: 0,
      error: "PRIVATE_EVIDENCE_SCOPE_MISMATCH",
    },
    {
      name: "the provider returns bytes above the requested bound",
      fakes: { bytes: new Uint8Array(65) },
      request: readRequest(),
      authorizationCalls: 1,
      driverCalls: 1,
      error: "PRIVATE_EVIDENCE_CONTENT_TOO_LARGE",
    },
    {
      name: "computed bytes disagree with the expected digest",
      fakes: { digest: "b".repeat(64) },
      request: readRequest(),
      authorizationCalls: 1,
      driverCalls: 1,
      error: "PRIVATE_EVIDENCE_DIGEST_MISMATCH",
    },
  ] as const)(
    "fails closed when $name",
    async ({
      fakes: fakeInput,
      request,
      authorizationCalls,
      driverCalls,
      error,
    }) => {
      const subject = await loadPrivateEvidenceReader();
      const createReader = requirePrivateEvidenceReaderFactory(subject);
      const fakes = createPrivateReadFakes(fakeInput);
      const reader = createReader({
        authorizationPort: fakes.authorizationPort,
        driver: fakes.driver,
        digest: fakes.digest,
      });

      await expect(reader.readAuthorizedEvidence(request)).rejects.toThrow(
        error,
      );
      expect(fakes.authorize).toHaveBeenCalledTimes(authorizationCalls);
      expect(fakes.read).toHaveBeenCalledTimes(driverCalls);
    },
  );

  it.each([
    { name: "a blank reference", evidenceReference: "" },
    {
      name: "a malformed private-evidence reference",
      evidenceReference:
        "private-evidence:/company-historical/historical/receipt-001.json",
    },
    {
      name: "an incomplete private-evidence root",
      evidenceReference: "private-evidence://company-historical/",
    },
    {
      name: "an HTTPS URL",
      evidenceReference: "https://provider.example.invalid/receipt-001.json",
    },
    {
      name: "an S3 URL",
      evidenceReference: "s3://private-finance-evidence/receipt-001.json",
    },
    {
      name: "a Google Storage URL",
      evidenceReference: "gs://private-finance-evidence/receipt-001.json",
    },
    {
      name: "a traversal segment",
      evidenceReference:
        "private-evidence://company-historical/historical/../receipt-001.json",
    },
    {
      name: "a percent-encoded traversal segment",
      evidenceReference:
        "private-evidence://company-historical/historical/%2e%2e/receipt-001.json",
    },
    {
      name: "a double-encoded traversal segment",
      evidenceReference:
        "private-evidence://company-historical/historical/%252e%252e/receipt-001.json",
    },
  ] as const)(
    "rejects $name before authorization or a provider read",
    async ({ evidenceReference: invalidReference }) => {
      const subject = await loadPrivateEvidenceReader();
      const createReader = requirePrivateEvidenceReaderFactory(subject);
      const fakes = createPrivateReadFakes();
      const reader = createReader({
        authorizationPort: fakes.authorizationPort,
        driver: fakes.driver,
        digest: fakes.digest,
      });

      await expect(
        reader.readAuthorizedEvidence(
          readRequest({ evidenceReference: invalidReference }),
        ),
      ).rejects.toThrow("PRIVATE_EVIDENCE_REFERENCE_INVALID");
      expect(fakes.authorize).not.toHaveBeenCalled();
      expect(fakes.read).not.toHaveBeenCalled();
    },
  );

  it("accepts the existing one-segment private-evidence grammar while preserving exact scope authorization", async () => {
    const subject = await loadPrivateEvidenceReader();
    const createReader = requirePrivateEvidenceReaderFactory(subject);
    const fakes = createPrivateReadFakes();
    const reader = createReader({
      authorizationPort: fakes.authorizationPort,
      driver: fakes.driver,
      digest: fakes.digest,
    });
    const singleSegmentReference =
      "private-evidence://company-historical/historical";
    const request = readRequest({ evidenceReference: singleSegmentReference });

    const result = await reader.readAuthorizedEvidence(request);

    expect(result.evidenceReference).toBe(singleSegmentReference);
    expect(fakes.authorize).toHaveBeenCalledWith({
      evidenceReference: singleSegmentReference,
      scope,
      authorization: request.authorization,
    });
    expect(fakes.read).toHaveBeenCalledWith({
      evidenceReference: singleSegmentReference,
      maxBytes: request.maxBytes,
      signal: undefined,
    });
  });

  it.each([
    { name: "a blank expected digest", expectedPayloadDigest: "" },
    {
      name: "a non-hex expected digest",
      expectedPayloadDigest: "not-a-sha256-digest",
    },
    {
      name: "an uppercase expected digest",
      expectedPayloadDigest: "A".repeat(64),
    },
    {
      name: "a short expected digest",
      expectedPayloadDigest: "a".repeat(63),
    },
    {
      name: "a long expected digest",
      expectedPayloadDigest: "a".repeat(65),
    },
  ] as const)(
    "rejects $name before authorization or a provider read",
    async ({ expectedPayloadDigest: invalidExpectedDigest }) => {
      const subject = await loadPrivateEvidenceReader();
      const createReader = requirePrivateEvidenceReaderFactory(subject);
      const fakes = createPrivateReadFakes();
      const reader = createReader({
        authorizationPort: fakes.authorizationPort,
        driver: fakes.driver,
        digest: fakes.digest,
      });

      await expect(
        reader.readAuthorizedEvidence(
          readRequest({ expectedPayloadDigest: invalidExpectedDigest }),
        ),
      ).rejects.toThrow("PRIVATE_EVIDENCE_DIGEST_INVALID");
      expect(fakes.authorize).not.toHaveBeenCalled();
      expect(fakes.read).not.toHaveBeenCalled();
    },
  );

  it.each([
    { name: "an infinite byte bound", maxBytes: Number.POSITIVE_INFINITY },
    { name: "a NaN byte bound", maxBytes: Number.NaN },
    { name: "a zero byte bound", maxBytes: 0 },
    { name: "a negative byte bound", maxBytes: -1 },
    { name: "a fractional byte bound", maxBytes: 1.5 },
  ] as const)(
    "rejects $name before authorization, a provider read, or digesting",
    async ({ maxBytes: invalidMaxBytes }) => {
      const subject = await loadPrivateEvidenceReader();
      const createReader = requirePrivateEvidenceReaderFactory(subject);
      const fakes = createPrivateReadFakes();
      const reader = createReader({
        authorizationPort: fakes.authorizationPort,
        driver: fakes.driver,
        digest: fakes.digest,
      });

      await expect(
        reader.readAuthorizedEvidence(
          readRequest({ maxBytes: invalidMaxBytes }),
        ),
      ).rejects.toThrow("PRIVATE_EVIDENCE_MAX_BYTES_INVALID");
      expect(fakes.authorize).not.toHaveBeenCalled();
      expect(fakes.read).not.toHaveBeenCalled();
      expect(fakes.digestSpy).not.toHaveBeenCalled();
    },
  );
});
