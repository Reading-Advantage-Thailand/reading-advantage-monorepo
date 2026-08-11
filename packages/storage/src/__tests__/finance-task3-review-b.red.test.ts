import { describe, expect, it, vi } from "vitest";

const scope = { companyId: "company-historical" } as const;
const evidenceReference =
  "private-evidence://company-historical/historical/receipt-review-b.json";
const payloadDigest = "a".repeat(64);

interface ReaderModule {
  readonly createAuthorizedPrivateEvidenceReader?: (input: {
    readonly authorizationPort: {
      authorize(input: Readonly<Record<string, unknown>>): Promise<{
        readonly decision: "allow" | "deny";
      }>;
    };
    readonly driver: {
      read(input: Readonly<Record<string, unknown>>): Promise<unknown>;
    };
    readonly digest: (bytes: Uint8Array) => Promise<string>;
    readonly maxBytes?: number;
  }) => {
    readAuthorizedEvidence(input: Readonly<{
      readonly evidenceReference: string;
      readonly scope: { readonly companyId: string; readonly schoolId?: string };
      readonly authorization: Readonly<Record<string, unknown>>;
      readonly expectedPayloadDigest: string;
      readonly maxBytes: number;
    }>): Promise<Readonly<Record<string, unknown>>>;
  };
}

/** Loads Storage through its public provider-neutral barrel. */
async function loadStorageModule(): Promise<ReaderModule> {
  return (await import("../index.js")) as unknown as ReaderModule;
}

/** Builds a valid private-evidence read request for each counterexample. */
function readRequest(overrides: Partial<{
  readonly expectedPayloadDigest: string;
  readonly maxBytes: number;
}> = {}) {
  return {
    evidenceReference,
    scope,
    authorization: {
      source: "company-identity",
      subjectId: "employee-historical-importer",
    },
    expectedPayloadDigest: payloadDigest,
    maxBytes: 1024,
    ...overrides,
  };
}

/** Creates injected storage dependencies with a controlled driver result or error. */
function createDependencies(input: {
  readonly driverResult?: unknown;
  readonly driverError?: Error;
} = {}) {
  const authorize = vi.fn(async () => ({ decision: "allow" as const }));
  const read = vi.fn(async () => {
    if (input.driverError !== undefined) throw input.driverError;
    return (
      input.driverResult ?? {
        bytes: new TextEncoder().encode("receipt"),
        contentType: "application/json",
      }
    );
  });
  const digest = vi.fn(async () => payloadDigest);
  return {
    authorizationPort: { authorize },
    driver: { read },
    digest,
    authorize,
    read,
    digestSpy: digest,
  };
}

describe("Finance Task 3 Review B Storage remediation RED contract", () => {
  it("enforces an owner maximum-byte ceiling before authorization or driver access", async () => {
    const subject = await loadStorageModule();
    const factory = subject.createAuthorizedPrivateEvidenceReader;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const dependencies = createDependencies();
    const reader = factory({
      authorizationPort: dependencies.authorizationPort,
      driver: dependencies.driver,
      digest: dependencies.digest,
      maxBytes: 1024,
    });

    await expect(
      reader.readAuthorizedEvidence(readRequest({ maxBytes: 1024 })),
    ).resolves.toBeDefined();
    await expect(
      reader.readAuthorizedEvidence(readRequest({ maxBytes: 1025 })),
    ).rejects.toThrow("PRIVATE_EVIDENCE_MAX_BYTES_EXCEEDS_OWNER_CEILING");
    expect(dependencies.authorize).toHaveBeenCalledTimes(1);
    expect(dependencies.read).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      name: "an absent bytes field",
      driverResult: { contentType: "application/json" },
    },
    {
      name: "a non-Uint8Array bytes field",
      driverResult: { bytes: "provider-payload", contentType: "application/json" },
    },
    {
      name: "a non-string content type",
      driverResult: {
        bytes: new TextEncoder().encode("receipt"),
        contentType: { provider: "internal" },
      },
    },
  ])("rejects $name with a stable sanitized driver-result error", async ({ driverResult }) => {
    const subject = await loadStorageModule();
    const factory = subject.createAuthorizedPrivateEvidenceReader;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const dependencies = createDependencies({ driverResult });
    const reader = factory({
      authorizationPort: dependencies.authorizationPort,
      driver: dependencies.driver,
      digest: dependencies.digest,
      maxBytes: 1024,
    });

    await expect(
      reader.readAuthorizedEvidence(readRequest()),
    ).rejects.toMatchObject({ code: "PRIVATE_EVIDENCE_DRIVER_RESULT_INVALID" });
    expect(dependencies.digestSpy).not.toHaveBeenCalled();
  });

  it("sanitizes a provider dependency error instead of returning its internal message", async () => {
    const subject = await loadStorageModule();
    const factory = subject.createAuthorizedPrivateEvidenceReader;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const secret = "bucket=private-finance-evidence credential=provider-secret";
    const dependencies = createDependencies({
      driverError: new Error(`provider failed: ${secret}`),
    });
    const reader = factory({
      authorizationPort: dependencies.authorizationPort,
      driver: dependencies.driver,
      digest: dependencies.digest,
      maxBytes: 1024,
    });

    let error: unknown;
    try {
      await reader.readAuthorizedEvidence(readRequest());
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({ code: "PRIVATE_EVIDENCE_DRIVER_ERROR" });
    expect(JSON.stringify(error)).not.toContain(secret);
    expect(dependencies.digestSpy).not.toHaveBeenCalled();
  });
});
