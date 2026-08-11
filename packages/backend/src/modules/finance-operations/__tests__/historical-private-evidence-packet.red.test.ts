import { describe, expect, it, vi } from "vitest";

const payloadDigest = "a".repeat(64);
const maxSourceFieldLength = 256;
const maxFactTextLength = 512;
const scope = {
  companyId: "company-historical",
  schoolId: "school-historical",
} as const;
const evidenceReference =
  "private-evidence://company-historical/historical/receipt-001.json";

type RuntimeParseResult =
  | { readonly success: true; readonly data: unknown }
  | { readonly success: false };

interface HistoricalPrivateEvidencePacketSchema {
  /** Parses the versioned, data-minimized historical packet at the Finance boundary. */
  safeParse(input: unknown): RuntimeParseResult;
}

interface FinanceAttestationAuditContext {
  /** Immutable authorization event ID provided by the controlled-import request. */
  readonly eventId: string;
  /** Packet object ID bound to the authorization event. */
  readonly objectId: string;
  /** UTC instant at which the attestation was requested. */
  readonly occurredAt: string;
  /** Request identifier retained in the Company Identity audit. */
  readonly requestId: string;
  /** Correlation identifier shared by the command and attestation audit. */
  readonly correlationId: string;
}

interface CompanyIdentityAuthorizationEvidence {
  /** Owner boundary that authenticated and issued the claims. */
  readonly source: "company-identity";
  /** Version of the verified owner claims. */
  readonly claimsVersion: string;
  /** Authenticated owner subject. */
  readonly subjectId: string;
  /** Authenticated owner organization. */
  readonly organizationId: string;
  /** Application roles issued by Company Identity. */
  readonly appRoleIds: readonly string[];
  /** School attestations issued by Company Identity only when available. */
  readonly schoolIds?: readonly string[];
}

type CompanyIdentityAttestationDecision =
  | {
      readonly decision: "allow";
      readonly evidence: CompanyIdentityAuthorizationEvidence;
    }
  | { readonly decision: "deny"; readonly reason: string };

interface CompanyIdentityFinanceAttestor {
  /** Produces the owner-authenticated Finance authorization result used by the command. */
  attest(input: {
    readonly operation: "historical-private-evidence:import";
    readonly scope: { readonly companyId: string; readonly schoolId?: string };
    readonly credential: {
      readonly kind: "session" | "token";
      readonly value: string;
    };
    readonly audit: FinanceAttestationAuditContext;
  }): Promise<CompanyIdentityAttestationDecision>;
}

interface PrivateEvidenceBindingPort {
  /** Resolves the authorized evidence binding after Company Identity allows this specific packet. */
  verify(input: {
    readonly evidenceReference: string;
    readonly scope: { readonly companyId: string; readonly schoolId?: string };
    readonly expectedPayloadDigest: string;
    readonly authorization: CompanyIdentityAuthorizationEvidence;
  }): Promise<{
    readonly evidenceReference: string;
    readonly scope: { readonly companyId: string; readonly schoolId?: string };
    readonly payloadDigest: string;
  }>;
}

interface HistoricalPrivateEvidenceImportCommand {
  /** Prepares one packet only after owner authentication and private-evidence binding both agree. */
  prepare(input: unknown): Promise<{
    readonly packet: Record<string, unknown>;
    readonly authorizationEvidence: CompanyIdentityAuthorizationEvidence;
    readonly evidence: {
      readonly evidenceReference: string;
      readonly scope: {
        readonly companyId: string;
        readonly schoolId?: string;
      };
      readonly payloadDigest: string;
    };
  }>;
}

interface HistoricalPrivateEvidencePacketModule {
  /** Runtime contract for the owner-attested historical private-evidence packet. */
  readonly historicalPrivateEvidencePacketSchema: HistoricalPrivateEvidencePacketSchema;
  /** Creates the command that calls Company Identity instead of trusting caller-supplied claims. */
  createHistoricalPrivateEvidenceImportCommand(input: {
    readonly companyIdentityAttestor: CompanyIdentityFinanceAttestor;
    readonly privateEvidenceBindingPort: PrivateEvidenceBindingPort;
  }): HistoricalPrivateEvidenceImportCommand;
}

/** Loads the Finance barrel as the future packet and authenticated-command boundary. */
async function loadHistoricalPacketContract(): Promise<HistoricalPrivateEvidencePacketModule> {
  return (await import("../index.js")) as unknown as HistoricalPrivateEvidencePacketModule;
}

/** Requires the runtime packet schema rather than inferring an unvalidated packet from TypeScript alone. */
function requirePacketSchema(
  subject: HistoricalPrivateEvidencePacketModule,
): HistoricalPrivateEvidencePacketSchema {
  expect(
    subject.historicalPrivateEvidencePacketSchema,
    "Finance Operations must export historicalPrivateEvidencePacketSchema for historical-private-evidence-packet.v1.",
  ).toBeDefined();
  return subject.historicalPrivateEvidencePacketSchema;
}

/** Requires the executable command seam that obtains the attestation from Company Identity itself. */
function requireImportCommandFactory(
  subject: HistoricalPrivateEvidencePacketModule,
): HistoricalPrivateEvidencePacketModule["createHistoricalPrivateEvidenceImportCommand"] {
  expect(
    subject.createHistoricalPrivateEvidenceImportCommand,
    "Finance Operations must export createHistoricalPrivateEvidenceImportCommand for authenticated historical-private-evidence imports.",
  ).toBeTypeOf("function");
  return subject.createHistoricalPrivateEvidenceImportCommand;
}

/** Builds a policy-neutral source-stated fact from an explicit low-risk category and identifier pair. */
function sourceStatedFact(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    factCategory: "document-total",
    factId: "document-total:receipt-total",
    kind: "source-stated-value",
    label: "Total as stated on receipt",
    value: "1323.00",
    ...overrides,
  };
}

/** Builds a versioned source packet that preserves only source-native identity and source-stated values. */
function packet(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    packetVersion: "historical-private-evidence-packet.v1",
    scope,
    source: {
      sourceSystem: "owner-attested-archive",
      sourceVersion: "archive-v1",
      sourceIdentity: "legacy-receipt-001",
      payloadDigest,
      evidenceReference,
    },
    facts: [sourceStatedFact()],
    ...overrides,
  };
}

/** Builds a real-shaped allowed result from the Company Identity attestor contract. */
function allowedAttestation(
  overrides: Partial<CompanyIdentityAuthorizationEvidence> = {},
): Extract<CompanyIdentityAttestationDecision, { readonly decision: "allow" }> {
  return {
    decision: "allow",
    evidence: {
      source: "company-identity",
      claimsVersion: "company-identity-claims-v1",
      subjectId: "employee-historical-importer",
      organizationId: scope.companyId,
      appRoleIds: ["role-historical-private-evidence-import"],
      schoolIds: [scope.schoolId],
      ...overrides,
    },
  };
}

/** Creates a request correlation tuple that the command must forward to Company Identity. */
function auditContext(
  overrides: Partial<FinanceAttestationAuditContext> = {},
): FinanceAttestationAuditContext {
  return {
    eventId: "finance-attestation-event-001",
    objectId: "historical-private-evidence-packet-001",
    occurredAt: "2026-08-11T04:00:00.000Z",
    requestId: "finance-import-request-001",
    correlationId: "finance-import-correlation-001",
    ...overrides,
  };
}

/** Creates an external command request that intentionally contains a credential but never caller-supplied claims. */
function commandRequest(
  packetValue: Record<string, unknown> = packet(),
): Record<string, unknown> {
  return {
    packet: packetValue,
    credential: { kind: "token", value: "authenticated-owner-token" },
    audit: auditContext(),
  };
}

/** Creates fakes for the two owner-controlled outputs that Finance must compose rather than recreate. */
function createCommandFakes(
  input: {
    readonly attestation?: CompanyIdentityAttestationDecision;
    readonly evidence?: {
      readonly evidenceReference: string;
      readonly scope: {
        readonly companyId: string;
        readonly schoolId?: string;
      };
      readonly payloadDigest: string;
    };
  } = {},
): {
  readonly companyIdentityAttestor: CompanyIdentityFinanceAttestor;
  readonly attest: ReturnType<typeof vi.fn>;
  readonly privateEvidenceBindingPort: PrivateEvidenceBindingPort;
  readonly verify: ReturnType<typeof vi.fn>;
} {
  const attest = vi.fn(async () => input.attestation ?? allowedAttestation());
  const verify = vi.fn(
    async () =>
      input.evidence ?? {
        evidenceReference,
        scope,
        payloadDigest,
      },
  );
  return {
    companyIdentityAttestor: { attest },
    attest,
    privateEvidenceBindingPort: { verify },
    verify,
  };
}

/** Returns a valid packet source object without coupling assertions to a parser implementation. */
function packetSource(
  packetValue: Record<string, unknown>,
): Record<string, unknown> {
  return packetValue.source as Record<string, unknown>;
}

describe("Finance historical private-evidence packet RED contract", () => {
  it("parses a versioned packet without transforming any source identity, digest, label, or source-stated value", async () => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());
    const input = packet();

    expect(schema.safeParse(input)).toEqual({ success: true, data: input });
    const companyScopedInput = packet({
      scope: { companyId: scope.companyId },
    });
    expect(schema.safeParse(companyScopedInput)).toEqual({
      success: true,
      data: companyScopedInput,
    });
  });

  it.each([
    {
      name: "an unknown packet key",
      value: packet({ unrecognizedPacketProperty: "not allowed" }),
    },
    {
      name: "an unknown source key",
      value: packet({
        source: {
          ...packetSource(packet()),
          unrecognizedSourceProperty: "not allowed",
        },
      }),
    },
    {
      name: "an unknown fact key",
      value: packet({
        facts: [sourceStatedFact({ unrecognizedFactProperty: "not allowed" })],
      }),
    },
  ] as const)("rejects $name", async ({ value }) => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());

    expect(schema.safeParse(value).success).toBe(false);
  });

  it.each([
    { name: "a blank digest", payloadDigest: "" },
    { name: "a non-hex digest", payloadDigest: "not-a-sha256-digest" },
    { name: "an uppercase digest", payloadDigest: "A".repeat(64) },
    { name: "a short digest", payloadDigest: "a".repeat(63) },
    { name: "a long digest", payloadDigest: "a".repeat(65) },
  ] as const)("rejects $name", async ({ payloadDigest: invalidDigest }) => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());
    const value = packet({
      source: { ...packetSource(packet()), payloadDigest: invalidDigest },
    });

    expect(schema.safeParse(value).success).toBe(false);
  });

  it.each([
    { name: "a blank source system", field: "sourceSystem", value: "" },
    {
      name: "an oversized source system",
      field: "sourceSystem",
      value: "x".repeat(maxSourceFieldLength + 1),
    },
    { name: "a blank source version", field: "sourceVersion", value: " " },
    {
      name: "an oversized source version",
      field: "sourceVersion",
      value: "x".repeat(maxSourceFieldLength + 1),
    },
    { name: "a blank source identity", field: "sourceIdentity", value: "" },
    {
      name: "an oversized source identity",
      field: "sourceIdentity",
      value: "x".repeat(maxSourceFieldLength + 1),
    },
  ] as const)("rejects $name", async ({ field, value }) => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());
    const valueWithInvalidSource = packet({
      source: { ...packetSource(packet()), [field]: value },
    });

    expect(schema.safeParse(valueWithInvalidSource).success).toBe(false);
  });

  it.each([
    { name: "a numeric value", value: 1323 },
    { name: "a blank value", value: " " },
    { name: "a value with a control character", value: "1323.00\n" },
    {
      name: "an oversized value",
      value: "x".repeat(maxFactTextLength + 1),
    },
  ] as const)("rejects $name", async ({ value: invalidValue }) => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());

    expect(
      schema.safeParse(
        packet({ facts: [sourceStatedFact({ value: invalidValue })] }),
      ).success,
    ).toBe(false);
  });

  it.each([
    {
      name: "an opaque category outside the explicit allowlist",
      value: packet({
        facts: [
          sourceStatedFact({
            factCategory: "opaque-unlisted-category",
            factId: "opaque-unlisted-category:opaque-unlisted-identifier",
          }),
        ],
      }),
    },
    {
      name: "an opaque identifier under an otherwise allowed category",
      value: packet({
        facts: [
          sourceStatedFact({
            factCategory: "document-total",
            factId: "document-total:opaque-unlisted-identifier",
          }),
        ],
      }),
    },
    {
      name: "an unapproved personal-data fact category",
      value: packet({
        facts: [
          sourceStatedFact({
            factCategory: "person-identity",
            factId: "person-identity:employee-national-id",
          }),
        ],
      }),
    },
    {
      name: "an employee-national-id identifier under an otherwise allowed category",
      value: packet({
        facts: [
          sourceStatedFact({
            factCategory: "document-reference",
            factId: "document-reference:employee-national-id",
          }),
        ],
      }),
    },
    {
      name: "a social-security identifier under an otherwise allowed category",
      value: packet({
        facts: [
          sourceStatedFact({
            factCategory: "document-reference",
            factId: "document-reference:social-security-number",
          }),
        ],
      }),
    },
  ] as const)(
    "rejects $name through the allow-listed fact category/identifier contract",
    async ({ value }) => {
      const schema = requirePacketSchema(await loadHistoricalPacketContract());

      expect(schema.safeParse(value).success).toBe(false);
    },
  );

  it.each([
    {
      name: "a public evidence URL",
      value: packet({
        source: {
          ...packetSource(packet()),
          evidenceReference:
            "https://provider.example.invalid/receipt-001.json",
        },
      }),
    },
    {
      name: "raw private-document content",
      value: packet({ rawPayload: "sensitive payroll material" }),
    },
    {
      name: "a sensitive normalized identifier field",
      value: packet({
        facts: [sourceStatedFact({ employeeTaxId: "sensitive-identifier" })],
      }),
    },
    {
      name: "an invented statutory classification",
      value: packet({ thaiTaxInvoiceStatus: "tax-invoice" }),
    },
  ] as const)("rejects $name", async ({ value }) => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());

    expect(schema.safeParse(value).success).toBe(false);
  });

  it("composes the actual Company Identity attestor output with the authorized evidence binding", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const fakes = createCommandFakes();
    const command = createCommand({
      companyIdentityAttestor: fakes.companyIdentityAttestor,
      privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
    });
    const packetValue = packet();
    const request = commandRequest(packetValue);
    const audit = request.audit as FinanceAttestationAuditContext;
    const credential = request.credential as {
      readonly kind: "token";
      readonly value: string;
    };
    const allowed = allowedAttestation();
    const evidence = { evidenceReference, scope, payloadDigest };

    await expect(command.prepare(request)).resolves.toEqual({
      packet: packetValue,
      authorizationEvidence: allowed.evidence,
      evidence,
    });
    expect(fakes.attest).toHaveBeenCalledTimes(1);
    expect(fakes.attest).toHaveBeenCalledWith({
      operation: "historical-private-evidence:import",
      scope,
      credential,
      audit,
    });
    expect(fakes.verify).toHaveBeenCalledTimes(1);
    expect(fakes.verify).toHaveBeenCalledWith({
      evidenceReference,
      scope,
      expectedPayloadDigest: payloadDigest,
      authorization: allowed.evidence,
    });
  });

  it.each([
    {
      name: "raw private-document content",
      packetValue: packet({ rawPayload: "sensitive payroll material" }),
    },
    {
      name: "a disallowed fact category",
      packetValue: packet({
        facts: [
          sourceStatedFact({
            factCategory: "opaque-unlisted-category",
            factId: "opaque-unlisted-category:opaque-unlisted-identifier",
          }),
        ],
      }),
    },
  ] as const)(
    "rejects nested packet input containing $name before attestation or evidence verification",
    async ({ packetValue }) => {
      const subject = await loadHistoricalPacketContract();
      const createCommand = requireImportCommandFactory(subject);
      const fakes = createCommandFakes();
      const command = createCommand({
        companyIdentityAttestor: fakes.companyIdentityAttestor,
        privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
      });

      await expect(
        command.prepare(commandRequest(packetValue)),
      ).rejects.toThrow("FINANCE_PACKET_INVALID");
      expect(fakes.attest).not.toHaveBeenCalled();
      expect(fakes.verify).not.toHaveBeenCalled();
    },
  );

  it("rejects a self-consistent caller-supplied attestation instead of treating it as authenticated or role-approved", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const fakes = createCommandFakes();
    const command = createCommand({
      companyIdentityAttestor: fakes.companyIdentityAttestor,
      privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
    });

    await expect(
      command.prepare({
        ...commandRequest(),
        attestation: allowedAttestation(),
      }),
    ).rejects.toThrow("FINANCE_COMMAND_INPUT_INVALID");
    expect(fakes.attest).not.toHaveBeenCalled();
    expect(fakes.verify).not.toHaveBeenCalled();
  });

  it("fails closed when the actual Company Identity attestor denies the credential without reading evidence", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const fakes = createCommandFakes({
      attestation: { decision: "deny", reason: "role-not-accepted" },
    });
    const command = createCommand({
      companyIdentityAttestor: fakes.companyIdentityAttestor,
      privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
    });

    await expect(command.prepare(commandRequest())).rejects.toThrow(
      "FINANCE_ATTESTATION_DENIED",
    );
    expect(fakes.attest).toHaveBeenCalledTimes(1);
    expect(fakes.verify).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "the Company Identity organization",
      fakes: {
        attestation: allowedAttestation({ organizationId: "company-other" }),
      },
      bindingCalls: 0,
      error: "FINANCE_ATTESTATION_COMPANY_MISMATCH",
    },
    {
      name: "the Company Identity school attestation",
      fakes: {
        attestation: allowedAttestation({ schoolIds: ["school-other"] }),
      },
      bindingCalls: 0,
      error: "FINANCE_ATTESTATION_SCHOOL_MISMATCH",
    },
    {
      name: "the authorized evidence company scope",
      fakes: {
        evidence: {
          evidenceReference,
          scope: { companyId: "company-other", schoolId: scope.schoolId },
          payloadDigest,
        },
      },
      bindingCalls: 1,
      error: "FINANCE_EVIDENCE_SCOPE_MISMATCH",
    },
    {
      name: "the authorized evidence school scope",
      fakes: {
        evidence: {
          evidenceReference,
          scope: { companyId: scope.companyId, schoolId: "school-other" },
          payloadDigest,
        },
      },
      bindingCalls: 1,
      error: "FINANCE_EVIDENCE_SCOPE_MISMATCH",
    },
    {
      name: "the authorized evidence reference",
      fakes: {
        evidence: {
          evidenceReference:
            "private-evidence://company-historical/historical/receipt-other.json",
          scope,
          payloadDigest,
        },
      },
      bindingCalls: 1,
      error: "FINANCE_EVIDENCE_REFERENCE_MISMATCH",
    },
    {
      name: "the authorized evidence digest",
      fakes: {
        evidence: { evidenceReference, scope, payloadDigest: "b".repeat(64) },
      },
      bindingCalls: 1,
      error: "FINANCE_EVIDENCE_DIGEST_MISMATCH",
    },
  ] as const)(
    "fails closed when $name differs from the packet",
    async ({ fakes: fakeInput, bindingCalls, error }) => {
      const subject = await loadHistoricalPacketContract();
      const createCommand = requireImportCommandFactory(subject);
      const fakes = createCommandFakes(fakeInput);
      const command = createCommand({
        companyIdentityAttestor: fakes.companyIdentityAttestor,
        privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
      });
      const request = commandRequest();

      await expect(command.prepare(request)).rejects.toThrow(error);
      expect(fakes.attest).toHaveBeenCalledTimes(1);
      expect(fakes.verify).toHaveBeenCalledTimes(bindingCalls);
    },
  );
});
