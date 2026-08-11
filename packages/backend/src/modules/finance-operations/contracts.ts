import { z } from "zod";

/** Shared Finance boundary predicate that rejects empty and whitespace-only strings. */
export const nonBlankStringSchema = z.string().regex(/\S/u);
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const minorUnitSchema = z.string().regex(/^(?:0|[1-9][0-9]*|-[1-9][0-9]*)$/u);
const currencySchema = z.string().regex(/^[A-Z]{3}$/u);
const internalEvidenceReferencePattern =
  /^private-evidence:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\/[A-Za-z0-9._~-]+)+$/u;

/** Opaque, provider-neutral reference to private Finance Operations evidence. */
export const privateEvidenceReferenceSchema = z
  .string()
  .regex(internalEvidenceReferencePattern)
  .refine(
    (reference) =>
      reference
        .slice("private-evidence://".length)
        .split("/")
        .every((segment) => segment !== "." && segment !== ".."),
    "Evidence references cannot contain traversal segments",
  );

/** Exact money input represented as unsigned or nonzero negative minor-unit digits. */
export const financeMoneyInputSchema = z.strictObject({
  amountMinor: minorUnitSchema,
  currency: currencySchema,
});

/** Money value accepted at a Finance Operations boundary. */
export type FinanceMoneyInput = z.infer<typeof financeMoneyInputSchema>;

/** Immutable source identity and evidence metadata attached to an imported fact. */
export const financeSourceProvenanceSchema = z.strictObject({
  sourceSystem: nonBlankStringSchema,
  sourceVersion: nonBlankStringSchema,
  sourceRecordId: nonBlankStringSchema,
  importBatchId: nonBlankStringSchema,
  payloadDigest: digestSchema,
  evidenceReference: privateEvidenceReferenceSchema,
});

/** Provenance that identifies the source record and its immutable evidence. */
export type FinanceSourceProvenance = z.infer<
  typeof financeSourceProvenanceSchema
>;

/** Accepted Finance Operations record used for replay classification. */
export interface FinanceAcceptedRecord {
  /** Identifier assigned to the accepted record. */
  readonly recordId: string;
  /** Immutable source metadata stored with the accepted record. */
  readonly provenance: FinanceSourceProvenance;
}

/** Result of comparing an incoming source record with an accepted record. */
export type FinanceSourceReplayResult =
  | {
      readonly status: "replay";
      readonly acceptedRecordId: string;
    }
  | {
      readonly status: "conflict";
      readonly acceptedRecordId: string;
      readonly reason: "source-identity-mismatch" | "payload-digest-mismatch";
    };

/**
 * Compares stable source identity and payload digest while retaining accepted provenance.
 * @param input Accepted record and incoming provenance to compare.
 * @returns Replay when content is unchanged even if batch or evidence location differs.
 */
export function classifySourceReplay(input: {
  readonly existing: FinanceAcceptedRecord;
  readonly incoming: FinanceSourceProvenance;
}): FinanceSourceReplayResult {
  const sourceIdentityMatches =
    input.existing.provenance.sourceSystem === input.incoming.sourceSystem &&
    input.existing.provenance.sourceVersion === input.incoming.sourceVersion &&
    input.existing.provenance.sourceRecordId === input.incoming.sourceRecordId;

  if (!sourceIdentityMatches) {
    return {
      status: "conflict",
      acceptedRecordId: input.existing.recordId,
      reason: "source-identity-mismatch",
    };
  }

  if (
    input.existing.provenance.payloadDigest !== input.incoming.payloadDigest
  ) {
    return {
      status: "conflict",
      acceptedRecordId: input.existing.recordId,
      reason: "payload-digest-mismatch",
    };
  }

  return {
    status: "replay",
    acceptedRecordId: input.existing.recordId,
  };
}

/** Append-only correction request that supersedes a distinct accepted record. */
export const appendOnlyCorrectionInputSchema = z
  .strictObject({
    operation: z.literal("append-correction"),
    correctionRecordId: nonBlankStringSchema,
    supersedesRecordId: nonBlankStringSchema,
    reason: nonBlankStringSchema,
  })
  .superRefine((value, context) => {
    if (value.correctionRecordId === value.supersedesRecordId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supersedesRecordId"],
        message: "A correction must supersede a distinct record",
      });
    }
  });

/** Validated append-only correction metadata. */
export type AppendOnlyCorrectionInput = z.infer<
  typeof appendOnlyCorrectionInputSchema
>;

/** Company Identity evidence required for an authorized Finance Operations call. */
export const financeAuthorizationEvidenceSchema = z.strictObject({
  source: z.literal("company-identity"),
  claimsVersion: nonBlankStringSchema,
  subjectId: nonBlankStringSchema,
  organizationId: nonBlankStringSchema,
  appRoleIds: z.array(nonBlankStringSchema).min(1),
  schoolIds: z.array(nonBlankStringSchema).min(1).optional(),
});

/** Explicit Company Identity claims used to authorize a finance operation. */
export type FinanceAuthorizationEvidence = z.infer<
  typeof financeAuthorizationEvidenceSchema
>;

/** Company and optional school boundary for a Finance Operations operation. */
export const financeOperationScopeSchema = z.strictObject({
  companyId: nonBlankStringSchema,
  schoolId: nonBlankStringSchema.optional(),
});

/** Validated company and optional school boundary for a finance operation. */
export type FinanceOperationScope = z.infer<typeof financeOperationScopeSchema>;

/** Authorization request carrying an operation, scope, and Company Identity evidence. */
export const financeOperationAuthorizationInputSchema = z.strictObject({
  operation: nonBlankStringSchema,
  scope: financeOperationScopeSchema,
  authorizationEvidence: financeAuthorizationEvidenceSchema,
});

/** Validated authorization input for a Finance Operations operation. */
export type FinanceOperationAuthorizationInput = z.infer<
  typeof financeOperationAuthorizationInputSchema
>;
const historicalPacketDigestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
function hasNoControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return false;
    }
  }
  return true;
}

const sourceFieldSchema = z
  .string()
  .min(1)
  .max(256)
  .regex(/\S/u)
  .refine(hasNoControlCharacters, "Control characters are not allowed");
const factTextSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/\S/u)
  .refine(hasNoControlCharacters, "Control characters are not allowed");
const identifierSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u);

const historicalFactIdentifierAllowlist = {
  "document-total": [
    "amount-due",
    "amount-paid",
    "gross-total",
    "invoice-total",
    "net-total",
    "receipt-total",
    "subtotal",
    "tax-total",
    "withholding-total",
  ],
  "document-date": [
    "due-date",
    "invoice-date",
    "issue-date",
    "payment-date",
    "receipt-date",
    "transaction-date",
  ],
  "document-class": [
    "billing-statement",
    "credit-note",
    "debit-note",
    "invoice",
    "payroll-summary",
    "receipt",
  ],
  "document-reference": [
    "billing-period",
    "document-number",
    "invoice-number",
    "receipt-number",
    "source-record",
  ],
  "tax-label": [
    "goods-and-services-tax",
    "gst",
    "tax-label",
    "vat",
    "withholding-tax",
    "wht",
  ],
  "payroll-summary": [
    "gross-total",
    "net-total",
    "pay-period",
    "withholding-total",
  ],
  "billing-summary": [
    "amount-due",
    "amount-paid",
    "billing-period",
    "invoice-total",
  ],
} as const;

const historicalFactCategorySchema = z.enum([
  "document-total",
  "document-date",
  "document-class",
  "document-reference",
  "tax-label",
  "payroll-summary",
  "billing-summary",
]);

const historicalPrivateEvidenceScopeSchema = z.strictObject({
  companyId: nonBlankStringSchema,
  schoolId: nonBlankStringSchema.optional(),
});

const historicalPrivateEvidenceSourceSchema = z.strictObject({
  sourceSystem: sourceFieldSchema,
  sourceVersion: sourceFieldSchema,
  sourceIdentity: sourceFieldSchema,
  payloadDigest: historicalPacketDigestSchema,
  evidenceReference: privateEvidenceReferenceSchema,
});

const historicalPrivateEvidenceFactSchema = z
  .strictObject({
    factCategory: historicalFactCategorySchema,
    factId: identifierSchema,
    kind: z.literal("source-stated-value"),
    label: factTextSchema,
    value: factTextSchema,
  })
  .superRefine((fact, context) => {
    const expectedPrefix = `${fact.factCategory}:`;
    if (!fact.factId.startsWith(expectedPrefix)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["factId"],
        message: "The fact identifier must use its category prefix",
      });
      return;
    }

    const identifier = fact.factId.slice(expectedPrefix.length);
    const allowedIdentifiers = historicalFactIdentifierAllowlist[
      fact.factCategory
    ] as readonly string[];
    if (!allowedIdentifiers.includes(identifier)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["factId"],
        message: "The fact identifier is not allow-listed",
      });
    }
  });

function evidenceCompanyId(reference: string): string {
  return reference
    .slice("private-evidence://".length)
    .split("/", 1)[0] as string;
}

/** Runtime contract for a strict, data-minimized historical private-evidence packet. */
export const historicalPrivateEvidencePacketSchema = z
  .strictObject({
    packetVersion: z.literal("historical-private-evidence-packet.v1"),
    scope: historicalPrivateEvidenceScopeSchema,
    source: historicalPrivateEvidenceSourceSchema,
    facts: z.array(historicalPrivateEvidenceFactSchema).min(1).max(128),
  })
  .superRefine((packet, context) => {
    if (
      evidenceCompanyId(packet.source.evidenceReference) !==
      packet.scope.companyId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source", "evidenceReference"],
        message: "Evidence reference company must match the packet scope",
      });
    }
  });

/** A validated source-stated fact retained by a historical private-evidence packet. */
export type HistoricalPrivateEvidenceFact = z.infer<
  typeof historicalPrivateEvidenceFactSchema
>;

/** Source-native identity and immutable private-evidence binding in a historical packet. */
export type HistoricalPrivateEvidenceSource = z.infer<
  typeof historicalPrivateEvidenceSourceSchema
>;

/** A validated versioned historical private-evidence packet. */
export type HistoricalPrivateEvidencePacket = z.infer<
  typeof historicalPrivateEvidencePacketSchema
>;

/** Company Identity evidence issued for one authenticated Finance operation. */
export interface HistoricalPrivateEvidenceAuthorizationEvidence {
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
  /** School attestations issued by Company Identity, when available. */
  readonly schoolIds?: readonly string[];
}

/** Audit correlation fields supplied by the controlled-import caller. */
export interface HistoricalPrivateEvidenceAttestationAudit {
  /** Immutable authorization event identity. */
  readonly eventId: string;
  /** Packet object identity bound to the authorization event. */
  readonly objectId: string;
  /** UTC instant at which attestation was requested. */
  readonly occurredAt: string;
  /** Request identity retained by the owner audit boundary. */
  readonly requestId: string;
  /** Correlation identity shared across the command and owner audit. */
  readonly correlationId: string;
}

/** Credential accepted by the Company Identity attestor boundary. */
export interface HistoricalPrivateEvidenceCredential {
  /** Credential transport kind understood by Company Identity. */
  readonly kind: "session" | "token";
  /** Opaque credential value; Finance never interprets it. */
  readonly value: string;
}

/** Provider-neutral request sent to the actual Company Identity attestor. */
export interface HistoricalPrivateEvidenceAttestationRequest {
  /** Operation being authorized. */
  readonly operation: "historical-private-evidence:import";
  /** Company-first packet scope. */
  readonly scope: Readonly<FinanceOperationScope>;
  /** Opaque owner credential. */
  readonly credential: Readonly<HistoricalPrivateEvidenceCredential>;
  /** Audit correlation supplied by the command caller. */
  readonly audit: Readonly<HistoricalPrivateEvidenceAttestationAudit>;
}

/** Decision returned by Company Identity for one Finance packet attestation. */
export type HistoricalPrivateEvidenceAttestationDecision =
  | {
      readonly decision: "allow";
      readonly evidence: Readonly<HistoricalPrivateEvidenceAuthorizationEvidence>;
    }
  | { readonly decision: "deny"; readonly reason: string };

/** Actual Company Identity boundary used by the Finance import command. */
export interface CompanyIdentityFinanceAttestor {
  /** Produces authenticated owner evidence for one historical packet import. */
  attest(
    input: Readonly<HistoricalPrivateEvidenceAttestationRequest>,
  ): Promise<HistoricalPrivateEvidenceAttestationDecision>;
}

/** Scope and digest binding returned by the authorized private-evidence owner. */
export interface HistoricalPrivateEvidenceBinding {
  /** Immutable private-evidence reference verified by the storage owner. */
  readonly evidenceReference: string;
  /** Scope verified by the storage owner. */
  readonly scope: Readonly<FinanceOperationScope>;
  /** Digest verified against the immutable evidence payload. */
  readonly payloadDigest: string;
}

/** Private-evidence boundary used after Company Identity authorization. */
export interface HistoricalPrivateEvidenceBindingPort {
  /** Verifies the immutable evidence reference, scope, and packet digest. */
  verify(input: {
    readonly evidenceReference: string;
    readonly scope: Readonly<FinanceOperationScope>;
    readonly expectedPayloadDigest: string;
    readonly authorization: Readonly<HistoricalPrivateEvidenceAuthorizationEvidence>;
  }): Promise<HistoricalPrivateEvidenceBinding>;
}

/** Immutable result prepared for the downstream historical-import acceptance boundary. */
export interface HistoricalPrivateEvidencePreparation {
  /** Exact validated packet values retained without normalization. */
  readonly packet: Readonly<HistoricalPrivateEvidencePacket>;
  /** Company Identity evidence used to authorize the packet. */
  readonly authorizationEvidence: Readonly<HistoricalPrivateEvidenceAuthorizationEvidence>;
  /** Storage-owner binding for the packet's private evidence. */
  readonly evidence: Readonly<HistoricalPrivateEvidenceBinding>;
}

/** Finance command that composes owner attestation and private-evidence verification. */
export interface HistoricalPrivateEvidenceImportCommand {
  /** Prepares one packet after validating it and obtaining both owner bindings. */
  prepare(input: unknown): Promise<HistoricalPrivateEvidencePreparation>;
}

const requiredUnknownSchema = z
  .unknown()
  .refine((value) => value !== undefined, "A command input is required.");

const credentialSchema = z.strictObject({
  kind: z.enum(["session", "token"]),
  value: sourceFieldSchema,
});

const auditFieldSchema = sourceFieldSchema;
const attestationAuditSchema = z.strictObject({
  eventId: auditFieldSchema,
  objectId: auditFieldSchema,
  occurredAt: auditFieldSchema,
  requestId: auditFieldSchema,
  correlationId: auditFieldSchema,
});

const commandEnvelopeSchema = z.strictObject({
  packet: requiredUnknownSchema,
  credential: credentialSchema,
  audit: attestationAuditSchema,
});

const authorizationEvidenceSchema = z.strictObject({
  source: z.literal("company-identity"),
  claimsVersion: sourceFieldSchema,
  subjectId: sourceFieldSchema,
  organizationId: sourceFieldSchema,
  appRoleIds: z.array(sourceFieldSchema).min(1),
  schoolIds: z.array(sourceFieldSchema).min(1).optional(),
});

const attestationDecisionSchema = z.discriminatedUnion("decision", [
  z.strictObject({
    decision: z.literal("allow"),
    evidence: authorizationEvidenceSchema,
  }),
  z.strictObject({
    decision: z.literal("deny"),
    reason: sourceFieldSchema,
  }),
]);

const evidenceBindingSchema = z.strictObject({
  evidenceReference: privateEvidenceReferenceSchema,
  scope: historicalPrivateEvidenceScopeSchema,
  payloadDigest: historicalPacketDigestSchema,
});

function commandError(code: string): Error {
  return new Error(code);
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      freezeDeep(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function scopesMatch(
  left: Readonly<FinanceOperationScope>,
  right: Readonly<FinanceOperationScope>,
): boolean {
  return left.companyId === right.companyId && left.schoolId === right.schoolId;
}

/** Creates the Finance command that composes authenticated owner and private-evidence boundaries. */
export function createHistoricalPrivateEvidenceImportCommand(input: {
  /** Actual Company Identity attestor supplied by the owner module. */
  readonly companyIdentityAttestor: CompanyIdentityFinanceAttestor;
  /** Authorized private-evidence binding supplied by the storage owner. */
  readonly privateEvidenceBindingPort: HistoricalPrivateEvidenceBindingPort;
}): HistoricalPrivateEvidenceImportCommand {
  if (
    typeof input.companyIdentityAttestor?.attest !== "function" ||
    typeof input.privateEvidenceBindingPort?.verify !== "function"
  ) {
    throw commandError("FINANCE_COMMAND_DEPENDENCY_INVALID");
  }

  return {
    async prepare(
      rawInput: unknown,
    ): Promise<HistoricalPrivateEvidencePreparation> {
      const envelopeResult = commandEnvelopeSchema.safeParse(rawInput);
      if (!envelopeResult.success) {
        throw commandError("FINANCE_COMMAND_INPUT_INVALID");
      }

      const packetResult = historicalPrivateEvidencePacketSchema.safeParse(
        envelopeResult.data.packet,
      );
      if (!packetResult.success) {
        throw commandError("FINANCE_PACKET_INVALID");
      }

      const packet = packetResult.data;
      const attestationResult = attestationDecisionSchema.safeParse(
        await input.companyIdentityAttestor.attest({
          operation: "historical-private-evidence:import",
          scope: packet.scope,
          credential: envelopeResult.data.credential,
          audit: envelopeResult.data.audit,
        }),
      );
      if (!attestationResult.success) {
        throw commandError("FINANCE_ATTESTATION_INVALID");
      }
      if (attestationResult.data.decision === "deny") {
        throw commandError("FINANCE_ATTESTATION_DENIED");
      }

      const authorizationEvidence = attestationResult.data.evidence;
      if (authorizationEvidence.organizationId !== packet.scope.companyId) {
        throw commandError("FINANCE_ATTESTATION_COMPANY_MISMATCH");
      }
      if (
        packet.scope.schoolId !== undefined &&
        !authorizationEvidence.schoolIds?.includes(packet.scope.schoolId)
      ) {
        throw commandError("FINANCE_ATTESTATION_SCHOOL_MISMATCH");
      }

      const evidenceResult = evidenceBindingSchema.safeParse(
        await input.privateEvidenceBindingPort.verify({
          evidenceReference: packet.source.evidenceReference,
          scope: packet.scope,
          expectedPayloadDigest: packet.source.payloadDigest,
          authorization: authorizationEvidence,
        }),
      );
      if (!evidenceResult.success) {
        throw commandError("FINANCE_EVIDENCE_BINDING_INVALID");
      }

      const evidence = evidenceResult.data;
      if (!scopesMatch(evidence.scope, packet.scope)) {
        throw commandError("FINANCE_EVIDENCE_SCOPE_MISMATCH");
      }
      if (evidence.evidenceReference !== packet.source.evidenceReference) {
        throw commandError("FINANCE_EVIDENCE_REFERENCE_MISMATCH");
      }
      if (evidence.payloadDigest !== packet.source.payloadDigest) {
        throw commandError("FINANCE_EVIDENCE_DIGEST_MISMATCH");
      }

      return freezeDeep({
        packet,
        authorizationEvidence,
        evidence,
      });
    },
  };
}
