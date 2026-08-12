import { describe, expect, it, vi } from "vitest";

const scope = { companyId: "company-historical" } as const;
const evidenceReference =
  "private-evidence://company-historical/historical/receipt-review-a-v2.json";
const payloadDigest = "a".repeat(64);

interface StorageModule {
  readonly createAuthorizedPrivateEvidenceReader?: (input: {
    readonly authorizationPort: {
      authorize(input: Readonly<Record<string, unknown>>): Promise<unknown>;
    };
    readonly driver: {
      read(input: Readonly<Record<string, unknown>>): Promise<unknown>;
    };
    readonly digest: (bytes: Uint8Array) => Promise<string>;
    readonly maxBytes?: number;
  }) => {
    readAuthorizedEvidence(input: Readonly<Record<string, unknown>>): Promise<unknown>;
  };
}

/** Loads Storage through its public provider-neutral barrel. */
async function loadStorageModule(): Promise<StorageModule> {
  return (await import("../index.js")) as unknown as StorageModule;
}

/** Builds a complete request for the private-evidence boundary. */
function readRequest(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    evidenceReference,
    scope,
    authorization: {
      source: "company-identity",
      subjectId: "employee-historical-importer",
    },
    expectedPayloadDigest: payloadDigest,
    maxBytes: 64,
    ...overrides,
  };
}

/** Creates provider-neutral dependencies with one controlled failure point. */
function createDependencies(input: {
  readonly authorize?: () => Promise<unknown>;
  readonly digest?: (bytes: Uint8Array) => Promise<string>;
  readonly contentType?: string;
} = {}) {
  const authorize = vi.fn(
    input.authorize ?? (async () => ({ decision: "allow" as const })),
  );
  const read = vi.fn(async () => ({
    bytes: new TextEncoder().encode("receipt"),
    contentType: input.contentType ?? "application/json",
  }));
  const digest = vi.fn(
    input.digest ?? (async () => payloadDigest),
  );
  return {
    authorizationPort: { authorize },
    driver: { read },
    digest,
    authorize,
    read,
    digestSpy: digest,
  };
}

describe("Finance Task 3 security Review A v2 RED contract", () => {
  it("requires a positive finite integer owner byte ceiling at reader construction", async () => {
    const subject = await loadStorageModule();
    const factory = subject.createAuthorizedPrivateEvidenceReader;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const dependencies = createDependencies();
    expect(() =>
      factory({
        authorizationPort: dependencies.authorizationPort,
        driver: dependencies.driver,
        digest: dependencies.digest,
      }),
    ).toThrow("PRIVATE_EVIDENCE_OWNER_CEILING_REQUIRED");

    expect(() =>
      factory({
        authorizationPort: dependencies.authorizationPort,
        driver: dependencies.driver,
        digest: dependencies.digest,
        maxBytes: 0,
      }),
    ).toThrow("PRIVATE_EVIDENCE_OWNER_CEILING_INVALID");
  });

  it("sanitizes authorization dependency errors without exposing the provider message", async () => {
    const subject = await loadStorageModule();
    const factory = subject.createAuthorizedPrivateEvidenceReader;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const secret = "authorization-provider=company-secret";
    const dependencies = createDependencies({
      authorize: async () => {
        throw new Error(secret);
      },
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
    expect(error).toMatchObject({ code: "PRIVATE_EVIDENCE_AUTHORIZATION_ERROR" });
    expect(JSON.stringify(error)).not.toContain(secret);
    expect(dependencies.read).not.toHaveBeenCalled();
  });

  it("sanitizes digest dependency errors without exposing the provider message", async () => {
    const subject = await loadStorageModule();
    const factory = subject.createAuthorizedPrivateEvidenceReader;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const secret = "digest-provider=private-secret";
    const dependencies = createDependencies({
      digest: async () => {
        throw new Error(secret);
      },
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
    expect(error).toMatchObject({ code: "PRIVATE_EVIDENCE_DIGEST_ERROR" });
    expect(JSON.stringify(error)).not.toContain(secret);
  });

  it("rejects control characters in contentType before digesting untrusted metadata", async () => {
    const subject = await loadStorageModule();
    const factory = subject.createAuthorizedPrivateEvidenceReader;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const dependencies = createDependencies({
      contentType: "application/json\nprovider-secret",
    });
    const reader = factory({
      authorizationPort: dependencies.authorizationPort,
      driver: dependencies.driver,
      digest: dependencies.digest,
      maxBytes: 1024,
    });

    await expect(reader.readAuthorizedEvidence(readRequest())).rejects.toMatchObject({
      code: "PRIVATE_EVIDENCE_CONTENT_TYPE_INVALID",
    });
    expect(dependencies.digestSpy).not.toHaveBeenCalled();
  });
});
