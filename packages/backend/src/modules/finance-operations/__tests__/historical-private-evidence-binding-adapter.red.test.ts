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
      subjectId: "employee-historical-importer",
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
