import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

const companyId = "11111111-1111-4111-8111-111111111111";
const evidenceReference =
  "private-evidence://11111111-1111-4111-8111-111111111111/historical/receipt.json";
const payloadDigest = "a".repeat(64);

interface AuthorizedPrivateEvidenceReader {
  readAuthorizedEvidence(input: Readonly<{
    readonly evidenceReference: string;
    readonly scope: { readonly companyId: string; readonly schoolId?: string };
    readonly authorization: Readonly<Record<string, unknown>>;
    readonly expectedPayloadDigest: string;
    readonly maxBytes: number;
  }>): Promise<Readonly<Record<string, unknown>>>;
}

interface BindingPort {
  verify(input: Readonly<{
    readonly evidenceReference: string;
    readonly scope: { readonly companyId: string; readonly schoolId?: string };
    readonly expectedPayloadDigest: string;
    readonly authorization: Readonly<Record<string, unknown>>;
  }>): Promise<Readonly<Record<string, unknown>>>;
}

interface BindingAdapterModule {
  readonly createHistoricalPrivateEvidenceBindingAdapter?: (input: {
    readonly reader: AuthorizedPrivateEvidenceReader;
    readonly maxBytes: number;
  }) => BindingPort;
}

/** Loads the public Finance Operations composition boundary. */
async function loadFinanceModule(): Promise<BindingAdapterModule> {
  return (await import("../index.js")) as unknown as BindingAdapterModule;
}

describe("Finance Task 3 Review B private-evidence binding remediation RED contract", () => {
  it("composes the authorized storage reader into the Finance binding port and strips provider fields", async () => {
    const subject = await loadFinanceModule();
    const factory = subject.createHistoricalPrivateEvidenceBindingAdapter;
    expect(
      factory,
      "Finance must expose a production binding adapter between Storage and the import command.",
    ).toBeTypeOf("function");
    if (typeof factory !== "function") return;

    const readAuthorizedEvidence = vi.fn(async () => ({
      evidenceReference,
      payloadDigest,
      bytes: new Uint8Array([1, 2, 3]),
      metadata: {
        contentLength: 3,
        contentType: "application/json",
      },
      providerObject: { bucket: "private-finance-evidence", objectKey: "secret" },
      publicUrl: "https://provider.example.invalid/private-evidence",
    }));
    const reader: AuthorizedPrivateEvidenceReader = {
      readAuthorizedEvidence,
    };
    const adapter = factory({ reader, maxBytes: 1024 });
    const scope = { companyId } as const;
    const authorization = {
      source: "company-identity",
      claimsVersion: "company-identity-claims-v1",
      policyVersion: "finance-role-policy-v1",
      subjectId: "employee-historical-importer",
      organizationId: companyId,
      appRoleIds: ["role-historical-import"],
      schoolIds: ["school-original"],
    };

    const result = await adapter.verify({
      evidenceReference,
      scope,
      expectedPayloadDigest: payloadDigest,
      authorization,
    });

    expect(readAuthorizedEvidence).toHaveBeenCalledTimes(1);
    expect(readAuthorizedEvidence).toHaveBeenCalledWith({
      evidenceReference,
      scope,
      authorization,
      expectedPayloadDigest: payloadDigest,
      maxBytes: 1024,
    });
    expect(result).toEqual({
      evidenceReference,
      scope,
      payloadDigest,
    });
    expect(Object.keys(result).sort()).toEqual([
      "evidenceReference",
      "payloadDigest",
      "scope",
    ]);
    expect(JSON.stringify(result)).not.toContain("provider.example.invalid");
    expect(JSON.stringify(result)).not.toContain("private-finance-evidence");
  });

  it.each([
    {
      name: "foreign authorization organization",
      evidenceReference,
      scope: { companyId },
      authorization: {
        source: "company-identity",
        claimsVersion: "company-identity-claims-v1",
        policyVersion: "finance-role-policy-v1",
        subjectId: "employee-historical-importer",
        organizationId: "22222222-2222-4222-8222-222222222222",
        appRoleIds: ["role-historical-import"],
      },
    },
    {
      name: "missing requested school attestation",
      evidenceReference,
      scope: { companyId, schoolId: "school-alpha" },
      authorization: {
        source: "company-identity",
        claimsVersion: "company-identity-claims-v1",
        policyVersion: "finance-role-policy-v1",
        subjectId: "employee-historical-importer",
        organizationId: companyId,
        appRoleIds: ["role-historical-import"],
      },
    },
    {
      name: "foreign evidence reference company",
      evidenceReference:
        "private-evidence://22222222-2222-4222-8222-222222222222/historical/receipt.json",
      scope: { companyId },
      authorization: {
        source: "company-identity",
        claimsVersion: "company-identity-claims-v1",
        policyVersion: "finance-role-policy-v1",
        subjectId: "employee-historical-importer",
        organizationId: companyId,
        appRoleIds: ["role-historical-import"],
      },
    },
  ] as const)("rejects $name before invoking the Storage reader", async (input) => {
    const subject = await loadFinanceModule();
    const factory = subject.createHistoricalPrivateEvidenceBindingAdapter;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const readAuthorizedEvidence = vi.fn(async () => ({
      evidenceReference,
      payloadDigest,
    }));
    const adapter = factory({
      reader: { readAuthorizedEvidence },
      maxBytes: 1024,
    });

    await expect(
      adapter.verify({
        evidenceReference: input.evidenceReference,
        scope: input.scope,
        expectedPayloadDigest: payloadDigest,
        authorization: input.authorization,
      }),
    ).rejects.toThrow("FINANCE_PRIVATE_EVIDENCE_BINDING_REQUEST_INVALID");
    expect(readAuthorizedEvidence).not.toHaveBeenCalled();
  });

  it("snapshots the request before a deferred reader can observe caller mutation", async () => {
    const subject = await loadFinanceModule();
    const factory = subject.createHistoricalPrivateEvidenceBindingAdapter;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    let release!: () => void;
    let started!: () => void;
    const readerStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const readerRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalScope = { companyId, schoolId: "school-original" };
    const originalScopeSnapshot = { ...originalScope };
    const originalAuthorization = {
      source: "company-identity",
      claimsVersion: "company-identity-claims-v1",
      policyVersion: "finance-role-policy-v1",
      subjectId: "employee-original",
      organizationId: companyId,
      appRoleIds: ["role-historical-import"],
      schoolIds: ["school-original"],
    };
    const reader = {
      readAuthorizedEvidence: vi.fn(async (input: Readonly<Record<string, unknown>>) => {
        expect(input.scope).toEqual(originalScope);
        expect(input.authorization).toEqual(originalAuthorization);
        started();
        await readerRelease;
        return { evidenceReference, payloadDigest };
      }),
    };
    const adapter = factory({ reader, maxBytes: 1024 });
    const request = {
      evidenceReference,
      scope: originalScope,
      expectedPayloadDigest: payloadDigest,
      authorization: originalAuthorization,
    };
    const verification = adapter.verify(request);
    await readerStarted;
    request.evidenceReference = "private-evidence://other-company/replaced.json";
    request.scope.companyId = "other-company";
    request.scope.schoolId = "school-replaced";
    request.authorization.subjectId = "employee-replaced";
    request.expectedPayloadDigest = "f".repeat(64);
    release();

    await expect(verification).resolves.toEqual({
      evidenceReference,
      scope: originalScopeSnapshot,
      payloadDigest,
    });
    expect(reader.readAuthorizedEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        evidenceReference,
        scope: originalScopeSnapshot,
        expectedPayloadDigest: payloadDigest,
      }),
    );
  });

  it("maps a reader dependency failure to a stable error without exposing its cause", async () => {
    const subject = await loadFinanceModule();
    const factory = subject.createHistoricalPrivateEvidenceBindingAdapter;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const secret = "POISON_DEPENDENCY_SECRET_73f94";
    const adapter = factory({
      reader: {
        readAuthorizedEvidence: vi.fn(async () => {
          throw new Error(secret);
        }),
      },
      maxBytes: 1024,
    });
    const failure = await adapter.verify({
      evidenceReference,
      scope: { companyId },
      expectedPayloadDigest: payloadDigest,
      authorization: {
        source: "company-identity",
        claimsVersion: "company-identity-claims-v1",
        policyVersion: "finance-role-policy-v1",
        subjectId: "employee-historical-importer",
        organizationId: companyId,
        appRoleIds: ["role-historical-import"],
      },
    }).catch((error: unknown) => error);
    expect(failure).toEqual(expect.objectContaining({
      message: "FINANCE_PRIVATE_EVIDENCE_BINDING_DEPENDENCY_FAILED",
    }));
    expect(JSON.stringify(failure)).not.toContain(secret);
  });

  it("rejects a reader result whose optional returned scope disagrees with the immutable request", async () => {
    const subject = await loadFinanceModule();
    const factory = subject.createHistoricalPrivateEvidenceBindingAdapter;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const adapter = factory({
      reader: {
        readAuthorizedEvidence: vi.fn(async () => ({
          evidenceReference,
          payloadDigest,
          scope: { companyId: "other-company" },
        })),
      },
      maxBytes: 1024,
    });
    await expect(
      adapter.verify({
        evidenceReference,
        scope: { companyId },
        expectedPayloadDigest: payloadDigest,
        authorization: {
          source: "company-identity",
          claimsVersion: "company-identity-claims-v1",
          policyVersion: "finance-role-policy-v1",
          subjectId: "employee-historical-importer",
          organizationId: companyId,
          appRoleIds: ["role-historical-import"],
        },
      }),
    ).rejects.toThrow("FINANCE_PRIVATE_EVIDENCE_BINDING_MISMATCH");
  });

  it("sanitizes a poisoned reader-result getter", async () => {
    const subject = await loadFinanceModule();
    const factory = subject.createHistoricalPrivateEvidenceBindingAdapter;
    expect(factory).toBeTypeOf("function");
    if (typeof factory !== "function") return;
    const secret = "POISON_BINDING_RESULT_GETTER_SECRET";
    const poisoned: Record<string, unknown> = { payloadDigest };
    Object.defineProperty(poisoned, "evidenceReference", {
      get: () => {
        throw new Error(secret);
      },
    });
    const adapter = factory({
      reader: {
        readAuthorizedEvidence: vi.fn(async () => poisoned),
      },
      maxBytes: 1024,
    });

    const failure = await adapter
      .verify({
        evidenceReference,
        scope: { companyId },
        expectedPayloadDigest: payloadDigest,
        authorization: {
          source: "company-identity",
          claimsVersion: "company-identity-claims-v1",
          policyVersion: "finance-role-policy-v1",
          subjectId: "employee-historical-importer",
          organizationId: companyId,
          appRoleIds: ["role-historical-import"],
        },
      })
      .catch((error: unknown) => error);
    expect(failure).toEqual(
      expect.objectContaining({
        message: "FINANCE_PRIVATE_EVIDENCE_BINDING_RESULT_INVALID",
      }),
    );
    expect(JSON.stringify(failure)).not.toContain(secret);
  });

  it("keeps the production adapter free of provider SDK, database, and raw SQL imports", () => {
    const adapterPath = resolve(
      fileURLToPath(
        new URL("../historical-private-evidence-binding-adapter.ts", import.meta.url),
      ),
    );
    expect(
      existsSync(adapterPath),
      "The production binding adapter source must exist in the Finance composition boundary.",
    ).toBe(true);
    if (!existsSync(adapterPath)) return;

    const source = readFileSync(adapterPath, "utf8");
    expect(source).not.toMatch(
      /@reading-advantage\/db|drizzle-orm|from ["']postgres|@aws-sdk|@google-cloud|\bsql\s*`/u,
    );
  });
});
