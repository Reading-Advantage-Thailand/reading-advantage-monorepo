import { Buffer } from "node:buffer";
import { runInNewContext } from "node:vm";

import { describe, expect, it, vi } from "vitest";

import {
  createCompanyIdentityFinanceAttestationAuditPort,
  createFinanceCompanyIdentityAttestor,
} from "../../company-identity/finance-attestation.js";

const payloadDigest = "a".repeat(64);
const maxSourceFieldLength = 256;
const maxFactTextLength = 512;
const scope = {
  companyId: "company-historical",
  schoolId: "school-historical",
} as const;
const evidenceReference =
  "private-evidence://company-historical/historical/receipt-001.json";

function invalidSha256DigestResults(): ReadonlyArray<{
  readonly name: string;
  readonly value: unknown;
}> {
  const results: Array<{ readonly name: string; readonly value: unknown }> = [
    { name: "undefined", value: undefined },
    {
      name: "plain object",
      value: { byteLength: 32, poison: "POISON_OBJECT_ID_DIGEST_RESULT" },
    },
    { name: "Uint8Array", value: new Uint8Array(32) },
    { name: "DataView", value: new DataView(new ArrayBuffer(32)) },
    { name: "Buffer", value: Buffer.alloc(32) },
  ];
  if (typeof SharedArrayBuffer !== "undefined") {
    const shared = new SharedArrayBuffer(32);
    results.push({ name: "SharedArrayBuffer", value: shared });
    results.push({
      name: "SharedArrayBuffer view",
      value: new Uint8Array(shared),
    });
  }
  return results;
}

function crossRealmSha256Digest(seed: number): {
  readonly buffer: ArrayBuffer;
  readonly hexadecimal: string;
} {
  const buffer = runInNewContext("new ArrayBuffer(32)") as ArrayBuffer;
  const bytes = Uint8Array.from(
    Array.from({ length: 32 }, (_, index) => (seed + index) & 0xff),
  );
  new Uint8Array(buffer).set(bytes);
  return {
    buffer,
    hexadecimal: Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
  };
}

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
  /** Version of the reviewed Company Identity role policy. */
  readonly policyVersion: string;
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
    readonly objectId: string;
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
      policyVersion: "finance-historical-import-role-policy-v1",
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

/** Creates deterministic trusted audit sources for the composed Company Identity boundary. */
function trustedAuditSources(): {
  readonly createEventId: () => string;
  readonly createRequestId: () => string;
  readonly createCorrelationId: () => string;
  readonly now: () => Date;
} {
  return {
    createEventId: vi.fn(() => "33333333-3333-4333-8333-333333333333"),
    createRequestId: vi.fn(() => "44444444-4444-4444-8444-444444444444"),
    createCorrelationId: vi.fn(() => "55555555-5555-4555-8555-555555555555"),
    now: vi.fn(() => new Date("2026-08-11T05:00:00.000Z")),
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
  it("parses a generic legacy packet without a normalization binding", async () => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());
    const input = packet();

    expect((input.facts as readonly unknown[])[0]).not.toHaveProperty(
      "normalizationBinding",
    );
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
      name: "a document money binding",
      fact: sourceStatedFact({
        normalizationBinding: {
          bindingKind: "document-money",
          normalizedFactId: "receipt-total",
          sourceText: "Receipt total as stated",
        },
      }),
    },
    {
      name: "a document count binding",
      fact: sourceStatedFact({
        factCategory: "billing-summary",
        factId: "billing-summary:billing-period",
        label: "Student count as stated",
        value: "147",
        normalizationBinding: {
          bindingKind: "document-count",
          normalizedFactId: "student-count",
        },
      }),
    },
    {
      name: "a payroll money binding",
      fact: sourceStatedFact({
        factCategory: "payroll-summary",
        factId: "payroll-summary:gross-total",
        label: "Gross pay as stated",
        value: "100.00",
        normalizationBinding: {
          bindingKind: "payroll-money",
          voucherNumberText: "PV-2026/071",
          sourceDateText: "08/07/2569",
          moneyKind: "gross",
        },
      }),
    },
  ] as const)("parses $name", async ({ fact }) => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());
    const input = packet({ facts: [fact] });

    expect(schema.safeParse(input)).toEqual({ success: true, data: input });
  });

  it.each([
    sourceStatedFact({
      factCategory: "document-class",
      factId: "document-class:payment-receipt",
      label: "Document class as stated",
      value: "payment-receipt",
    }),
    sourceStatedFact({
      factCategory: "currency",
      factId: "currency:document-currency",
      label: "Document currency as stated",
      value: "THB",
    }),
    sourceStatedFact({
      factCategory: "tax-label",
      factId: "tax-label:gst",
      label: "GST as stated",
      value: "7%",
    }),
    sourceStatedFact({
      factCategory: "document-reference",
      factId: "document-reference:source-record",
      label: "Source record as stated",
      value: "legacy-receipt-001",
    }),
    sourceStatedFact({
      factCategory: "document-status",
      factId: "document-status:thai-tax-document-status",
      label: "Thai tax document status as stated",
      value: "unresolved",
    }),
    sourceStatedFact({
      factCategory: "document-reference",
      factId: "document-reference:variant-id",
      label: "School billing variant as stated",
      value: "term-1",
    }),
    sourceStatedFact({
      factCategory: "document-reference",
      factId: "document-reference:ambiguity-group-id",
      label: "School billing ambiguity group as stated",
      value: "school-group-1",
    }),
  ])("rejects a normalization binding on a metadata fact", async (fact) => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());
    const input = packet({
      facts: [
        {
          ...fact,
          normalizationBinding: {
            bindingKind: "document-money",
            normalizedFactId: "receipt-total",
          },
        },
      ],
    });

    expect(schema.safeParse(input).success).toBe(false);
  });

  it.each([
    {
      name: "an unsupported Thai tax document status",
      fact: sourceStatedFact({
        factCategory: "document-status",
        factId: "document-status:thai-tax-document-status",
        label: "Thai tax document status as stated",
        value: "tax-invoice",
      }),
    },
    {
      name: "an unsafe school variant ID",
      fact: sourceStatedFact({
        factCategory: "document-reference",
        factId: "document-reference:variant-id",
        label: "School billing variant as stated",
        value: "<script>alert(1)</script>",
      }),
    },
    {
      name: "an oversized school ambiguity group ID",
      fact: sourceStatedFact({
        factCategory: "document-reference",
        factId: "document-reference:ambiguity-group-id",
        label: "School billing ambiguity group as stated",
        value: "x".repeat(129),
      }),
    },
  ] as const)("rejects $name", async ({ fact }) => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());

    expect(schema.safeParse(packet({ facts: [fact] })).success).toBe(false);
  });

  it("rejects a payroll binding whose outer fact ID conflicts with moneyKind", async () => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());
    const input = packet({
      facts: [
        sourceStatedFact({
          factCategory: "payroll-summary",
          factId: "payroll-summary:net-total",
          label: "Gross pay as stated",
          value: "100.00",
          normalizationBinding: {
            bindingKind: "payroll-money",
            voucherNumberText: "PV-2026/071",
            sourceDateText: "08/07/2569",
            moneyKind: "gross",
          },
        }),
      ],
    });

    expect(schema.safeParse(input).success).toBe(false);
  });

  it.each(["THB", "USD"] as const)(
    "accepts the allow-listed source-stated %s document currency fact",
    async (currency) => {
      const schema = requirePacketSchema(await loadHistoricalPacketContract());
      const input = packet({
        facts: [
          sourceStatedFact({
            factCategory: "currency",
            factId: "currency:document-currency",
            label: "Document currency as stated",
            value: currency,
          }),
        ],
      });

      expect(schema.safeParse(input)).toEqual({ success: true, data: input });
    },
  );

  it.each([
    {
      name: "an unapproved currency fact identifier",
      fact: sourceStatedFact({
        factCategory: "currency",
        factId: "currency:unreviewed-currency",
        label: "Document currency as stated",
        value: "USD",
      }),
    },
    {
      name: "a lowercase currency value",
      fact: sourceStatedFact({
        factCategory: "currency",
        factId: "currency:document-currency",
        label: "Document currency as stated",
        value: "thb",
      }),
    },
    {
      name: "a short currency value",
      fact: sourceStatedFact({
        factCategory: "currency",
        factId: "currency:document-currency",
        label: "Document currency as stated",
        value: "TH",
      }),
    },
  ] as const)(
    "rejects $name from the strict source-stated currency fact grammar",
    async ({ fact }) => {
      const schema = requirePacketSchema(await loadHistoricalPacketContract());

      expect(schema.safeParse(packet({ facts: [fact] })).success).toBe(false);
    },
  );

  it("rejects duplicate source-stated document currency facts", async () => {
    const schema = requirePacketSchema(await loadHistoricalPacketContract());
    const currencyFact = sourceStatedFact({
      factCategory: "currency",
      factId: "currency:document-currency",
      label: "Document currency as stated",
      value: "THB",
    });

    expect(
      schema.safeParse(packet({ facts: [currencyFact, currencyFact] })).success,
    ).toBe(false);
  });

  it("keeps a poisoned source identity out of composed real-command and durable audit serialization", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const persisted: Array<Readonly<Record<string, unknown>>> = [];
    const poisonedIdentity =
      "bearer-token=source-secret;email=employee@example.invalid";
    const auditPort = createCompanyIdentityFinanceAttestationAuditPort({
      repository: {
        appendAudit: vi.fn(async (input: Readonly<Record<string, unknown>>) => {
          persisted.push(input);
        }),
      },
    });
    const attestor = createFinanceCompanyIdentityAttestor({
      authenticator: {
        authenticate: vi.fn(async () => ({
          claimsVersion: "company-identity-claims-v1",
          subjectId: "employee-historical-importer",
          organizationId: scope.companyId,
          appRoleIds: ["role-historical-private-evidence-import"],
          schoolIds: [scope.schoolId],
        })),
      },
      rolePolicy: {
        policyVersion: "finance-historical-import-role-policy-v1",
        acceptedRoleIds: ["role-historical-private-evidence-import"],
      },
      auditPort,
      trustedAuditSources: trustedAuditSources(),
    });
    const command = createCommand({
      companyIdentityAttestor: attestor,
      privateEvidenceBindingPort: {
        verify: vi.fn(async () => ({
          evidenceReference,
          scope,
          payloadDigest,
        })),
      },
    });
    const poisonedPacket = packet({
      source: { ...packetSource(packet()), sourceIdentity: poisonedIdentity },
    });

    const first = await command.prepare(commandRequest(poisonedPacket));
    const second = await command.prepare(commandRequest(poisonedPacket));
    const firstMetadata = persisted[0]?.metadata as Record<string, unknown>;

    expect(first.objectId).toMatch(
      /^finance-historical-private-evidence-object-v1\|sha256=[a-f0-9]{64}$/u,
    );
    expect(second.objectId).toBe(first.objectId);
    expect(firstMetadata.objectId).toBe(first.objectId);
    expect(JSON.stringify(persisted)).not.toContain(poisonedIdentity);
    expect(JSON.stringify(persisted)).not.toContain("source-secret");
    expect(JSON.stringify(persisted)).not.toContain("employee@example.invalid");
  });

  it("snapshots the complete validated packet before a deferred attestor can mutate its caller alias", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    let release!: () => void;
    let started!: () => void;
    const attestationStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    const attestationRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    const mutableScope: { companyId: string; schoolId?: string } = { ...scope };
    const mutablePacket = packet({ scope: mutableScope });
    const attest = vi.fn(
      async (
        request: Parameters<CompanyIdentityFinanceAttestor["attest"]>[0],
      ) => {
        expect(request.scope).toEqual(scope);
        try {
          (request.scope as { companyId: string }).companyId = "company-b";
        } catch {
          // A frozen validated snapshot is the expected fail-closed behavior.
        }
        started();
        await attestationRelease;
        return allowedAttestation();
      },
    );
    const verify = vi.fn(async () => ({
      evidenceReference,
      scope,
      payloadDigest,
    }));
    const command = createCommand({
      companyIdentityAttestor: { attest },
      privateEvidenceBindingPort: { verify },
    });
    const preparation = command.prepare(commandRequest(mutablePacket));
    await attestationStarted;
    mutableScope.companyId = "company-b";
    mutableScope.schoolId = "school-b";
    (mutablePacket.source as Record<string, unknown>).evidenceReference =
      "private-evidence://company-b/historical/replaced.json";
    (mutablePacket.source as Record<string, unknown>).sourceIdentity =
      "attacker-replaced-source";
    release();

    const prepared = await preparation;
    expect(prepared.packet).toMatchObject({
      scope,
      source: {
        evidenceReference,
        sourceIdentity: "legacy-receipt-001",
      },
    });
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceReference, scope }),
    );
  });

  it("maps attestor dependency failures to a stable public error without exposing the dependency cause", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const secret = "POISON_DEPENDENCY_SECRET_73f94";
    const command = createCommand({
      companyIdentityAttestor: {
        attest: vi.fn(async () => {
          throw new Error(secret);
        }),
      },
      privateEvidenceBindingPort: {
        verify: vi.fn(),
      },
    });

    const failure = await command
      .prepare(commandRequest())
      .catch((error: unknown) => error);
    expect(failure).toEqual(
      expect.objectContaining({
        message: "FINANCE_ATTESTATION_FAILED",
      }),
    );
    expect(JSON.stringify(failure)).not.toContain(secret);
  });

  it("maps a poisoned command-envelope getter to a stable input error", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const fakes = createCommandFakes();
    const command = createCommand({
      companyIdentityAttestor: fakes.companyIdentityAttestor,
      privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
    });
    const secret = "FINANCE_ENVELOPE_GETTER_SECRET";
    const poisoned: Record<string, unknown> = {
      credential: { kind: "token", value: "opaque-owner-token" },
      audit: auditContext(),
    };
    Object.defineProperty(poisoned, "packet", {
      get: () => {
        throw new Error(secret);
      },
    });

    const failure = await command
      .prepare(poisoned)
      .catch((error: unknown) => error);
    expect(failure).toEqual(
      expect.objectContaining({ message: "FINANCE_COMMAND_INPUT_INVALID" }),
    );
    expect(JSON.stringify(failure)).not.toContain(secret);
    expect(fakes.attest).not.toHaveBeenCalled();
  });

  it("maps a poisoned Finance packet getter to a stable packet error", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const fakes = createCommandFakes();
    const command = createCommand({
      companyIdentityAttestor: fakes.companyIdentityAttestor,
      privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
    });
    const secret = "FINANCE_PACKET_GETTER_SECRET";
    const poisonedPacket = packet();
    Object.defineProperty(poisonedPacket, "scope", {
      get: () => {
        throw new Error(secret);
      },
    });

    const failure = await command
      .prepare(commandRequest(poisonedPacket))
      .catch((error: unknown) => error);
    expect(failure).toEqual(
      expect.objectContaining({ message: "FINANCE_PACKET_INVALID" }),
    );
    expect(JSON.stringify(failure)).not.toContain(secret);
    expect(fakes.attest).not.toHaveBeenCalled();
  });

  it("maps the opaque object-identity digest dependency failure without exposing its cause", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const secret = "POISON_DEPENDENCY_SECRET_73f94";
    const attest = vi.fn();
    const command = createCommand({
      companyIdentityAttestor: { attest },
      privateEvidenceBindingPort: { verify: vi.fn() },
    });
    const digestSpy = vi
      .spyOn(globalThis.crypto.subtle, "digest")
      .mockRejectedValue(new Error(secret));

    let failure: unknown;
    try {
      failure = await command
        .prepare(commandRequest())
        .catch((error: unknown) => error);
    } finally {
      digestSpy.mockRestore();
    }

    expect(failure).toEqual(
      expect.objectContaining({
        message: "FINANCE_OBJECT_ID_DERIVATION_FAILED",
      }),
    );
    expect(String(failure)).not.toContain(secret);
    expect(JSON.stringify(failure)).not.toContain(secret);
    expect(attest).not.toHaveBeenCalled();
  });

  it.each([0, 31, 33] as const)(
    "rejects a %s-byte object-identity SHA-256 result before attestation",
    async (byteLength) => {
      const subject = await loadHistoricalPacketContract();
      const createCommand = requireImportCommandFactory(subject);
      const attest = vi.fn();
      const verify = vi.fn();
      const command = createCommand({
        companyIdentityAttestor: { attest },
        privateEvidenceBindingPort: { verify },
      });
      const digest = vi
        .spyOn(globalThis.crypto.subtle, "digest")
        .mockResolvedValue(new ArrayBuffer(byteLength));
      try {
        const failure = await command
          .prepare(commandRequest())
          .catch((error: unknown) => error);
        expect(failure).toEqual(
          expect.objectContaining({
            message: "FINANCE_OBJECT_ID_DERIVATION_FAILED",
          }),
        );
        expect(String(failure)).not.toContain("POISON");
        expect(JSON.stringify(failure)).not.toContain("POISON");
        expect(attest).not.toHaveBeenCalled();
        expect(verify).not.toHaveBeenCalled();
      } finally {
        digest.mockRestore();
      }
    },
  );

  it.each(invalidSha256DigestResults())(
    "rejects a non-ArrayBuffer object-identity digest result ($name) before attestation",
    async ({ value: result }) => {
      const subject = await loadHistoricalPacketContract();
      const createCommand = requireImportCommandFactory(subject);
      const attest = vi.fn();
      const command = createCommand({
        companyIdentityAttestor: { attest },
        privateEvidenceBindingPort: { verify: vi.fn() },
      });
      const digest = vi
        .spyOn(globalThis.crypto.subtle, "digest")
        .mockResolvedValue(result as unknown as ArrayBuffer);
      try {
        const failure = await command
          .prepare(commandRequest())
          .catch((error: unknown) => error);
        expect(failure).toEqual(
          expect.objectContaining({
            message: "FINANCE_OBJECT_ID_DERIVATION_FAILED",
          }),
        );
        expect(JSON.stringify(failure)).not.toContain("POISON");
        expect(attest).not.toHaveBeenCalled();
      } finally {
        digest.mockRestore();
      }
    },
  );

  it("accepts and copies a cross-realm object-identity digest before provider mutation", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const fakes = createCommandFakes();
    const command = createCommand(fakes);
    const digestValue = crossRealmSha256Digest(1);
    expect(digestValue.buffer).not.toBeInstanceOf(ArrayBuffer);
    const digest = vi
      .spyOn(globalThis.crypto.subtle, "digest")
      .mockResolvedValue(digestValue.buffer);
    try {
      const preparation = await command.prepare(commandRequest());
      const expectedObjectId = `finance-historical-private-evidence-object-v1|sha256=${digestValue.hexadecimal}`;
      new Uint8Array(digestValue.buffer).fill(0xff);

      expect(preparation.objectId).toBe(expectedObjectId);
      expect(fakes.attest).toHaveBeenCalledWith(
        expect.objectContaining({
          audit: expect.objectContaining({ objectId: expectedObjectId }),
        }),
      );
      expect(fakes.verify).toHaveBeenCalled();
    } finally {
      digest.mockRestore();
    }
  });

  it.each([
    {
      name: "absent school versus the literal company-scope school",
      first: { scope: { companyId: scope.companyId } },
      second: {
        scope: { companyId: scope.companyId, schoolId: "company-scope" },
      },
    },
    {
      name: "delimiter-adjacent source components",
      first: { source: { sourceSystem: "a|b", sourceVersion: "c" } },
      second: { source: { sourceSystem: "a", sourceVersion: "b|c" } },
    },
    {
      name: "canonically distinct Unicode source identities",
      first: { source: { sourceIdentity: "é" } },
      second: { source: { sourceIdentity: "e\u0301" } },
    },
    {
      name: "case-adjacent source identities",
      first: { source: { sourceIdentity: "Case-sensitive" } },
      second: { source: { sourceIdentity: "case-sensitive" } },
    },
  ] as const)(
    "keeps $name in distinct opaque object identities",
    async ({ first, second }) => {
      const subject = await loadHistoricalPacketContract();
      const createCommand = requireImportCommandFactory(subject);
      const prepareVariant = async (variant: {
        readonly scope?: {
          readonly companyId: string;
          readonly schoolId?: string;
        };
        readonly source?: {
          readonly sourceSystem?: string;
          readonly sourceVersion?: string;
          readonly sourceIdentity?: string;
        };
      }) => {
        const variantScope = variant.scope ?? scope;
        const schoolIds =
          variantScope.schoolId === undefined
            ? undefined
            : [variantScope.schoolId];
        const attestation = allowedAttestation({
          organizationId: variantScope.companyId,
          schoolIds,
        });
        const variantPacket = packet({
          scope: variantScope,
          source: {
            ...packetSource(packet()),
            ...variant.source,
          },
        });
        const command = createCommand({
          companyIdentityAttestor: { attest: vi.fn(async () => attestation) },
          privateEvidenceBindingPort: {
            verify: vi.fn(async () => ({
              evidenceReference,
              scope: variantScope,
              payloadDigest,
            })),
          },
        });
        return command.prepare(commandRequest(variantPacket));
      };
      const firstPrepared = await prepareVariant(first);
      const secondPrepared = await prepareVariant(second);
      expect(firstPrepared.objectId).not.toBe(secondPrepared.objectId);
      expect(firstPrepared.objectId).toMatch(
        /^finance-historical-private-evidence-object-v1\|sha256=[a-f0-9]{64}$/u,
      );
      expect(secondPrepared.objectId).toMatch(
        /^finance-historical-private-evidence-object-v1\|sha256=[a-f0-9]{64}$/u,
      );
    },
  );

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
      objectId: expect.stringMatching(
        /^finance-historical-private-evidence-object-v1\|sha256=[a-f0-9]{64}$/u,
      ),
      authorizationEvidence: allowed.evidence,
      evidence,
    });
    expect(fakes.attest).toHaveBeenCalledTimes(1);
    expect(fakes.attest).toHaveBeenCalledWith({
      operation: "historical-private-evidence:import",
      scope,
      credential,
      audit: {
        ...audit,
        objectId: expect.stringMatching(
          /^finance-historical-private-evidence-object-v1\|sha256=[a-f0-9]{64}$/u,
        ),
      },
    });
    expect(fakes.verify).toHaveBeenCalledTimes(1);
    expect(fakes.verify).toHaveBeenCalledWith({
      evidenceReference,
      scope,
      expectedPayloadDigest: payloadDigest,
      authorization: allowed.evidence,
    });
  });

  it("normalizes empty company-scoped school claims before the command schema and durable audit", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const persisted: Array<Readonly<Record<string, unknown>>> = [];
    const auditPort = createCompanyIdentityFinanceAttestationAuditPort({
      repository: {
        appendAudit: vi.fn(async (input: Readonly<Record<string, unknown>>) => {
          persisted.push(input);
        }),
      },
    });
    const attestor = createFinanceCompanyIdentityAttestor({
      authenticator: {
        authenticate: vi.fn(async () => ({
          claimsVersion: "company-identity-claims-v1",
          subjectId: "employee-historical-importer",
          organizationId: scope.companyId,
          appRoleIds: ["role-historical-private-evidence-import"],
          schoolIds: [],
        })),
      },
      rolePolicy: {
        policyVersion: "finance-historical-import-role-policy-v1",
        acceptedRoleIds: ["role-historical-private-evidence-import"],
      },
      auditPort,
      trustedAuditSources: trustedAuditSources(),
    });
    const fakes = createCommandFakes({
      evidence: {
        evidenceReference,
        scope: { companyId: scope.companyId },
        payloadDigest,
      },
    });
    const command = createCommand({
      companyIdentityAttestor: attestor,
      privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
    });

    const prepared = await command.prepare(
      commandRequest(packet({ scope: { companyId: scope.companyId } })),
    );
    expect(prepared.authorizationEvidence).not.toHaveProperty("schoolIds");
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      outcome: "SUCCEEDED",
      metadata: { policyVersion: "finance-historical-import-role-policy-v1" },
    });
    expect(persisted[0]?.metadata).not.toHaveProperty("schoolId");
  });

  it("binds audit.objectId to a stable opaque projection of validated source identity and never persists a poisoned caller value", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const fakes = createCommandFakes();
    const command = createCommand({
      companyIdentityAttestor: fakes.companyIdentityAttestor,
      privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
    });
    const poisonedObjectId =
      "bearer-token=secret-token; email=employee@example.invalid";

    await command.prepare({
      ...commandRequest(),
      audit: auditContext({ objectId: poisonedObjectId }),
    });

    const attestationInput = fakes.attest.mock.calls[0]?.[0];
    expect(attestationInput?.audit.objectId).toMatch(
      /^finance-historical-private-evidence-object-v1\|sha256=[a-f0-9]{64}$/u,
    );
    expect(attestationInput?.audit.objectId).not.toContain(
      "legacy-receipt-001",
    );
    expect(JSON.stringify(attestationInput)).not.toContain(poisonedObjectId);
    expect(JSON.stringify(attestationInput)).not.toContain("secret-token");
  });

  it("keeps policyVersion enumerable through preparation serialization", async () => {
    const subject = await loadHistoricalPacketContract();
    const createCommand = requireImportCommandFactory(subject);
    const fakes = createCommandFakes();
    const command = createCommand({
      companyIdentityAttestor: fakes.companyIdentityAttestor,
      privateEvidenceBindingPort: fakes.privateEvidenceBindingPort,
    });

    const prepared = await command.prepare(commandRequest());
    expect(Object.keys(prepared.authorizationEvidence)).toContain(
      "policyVersion",
    );
    expect(
      JSON.parse(JSON.stringify(prepared.authorizationEvidence)),
    ).toMatchObject({
      policyVersion: "finance-historical-import-role-policy-v1",
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
