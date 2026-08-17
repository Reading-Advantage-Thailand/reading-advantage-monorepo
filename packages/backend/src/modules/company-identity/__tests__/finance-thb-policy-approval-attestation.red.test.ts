import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { projectSecretSafeAuditMetadata } from "../protocol.js";

const OPERATION = "finance-thb-policy-approval" as const;
const AUDIT_OPERATION = "finance-thb:policy-approval" as const;
const RECEIPT_VERSION = "finance-thb-owner-decision-receipt.v1" as const;
const CANONICALIZATION_VERSION =
  "finance-thb-owner-decision-canonical.v1" as const;
const POISON = "POISON_FINANCE_THB_DEPENDENCY_91";
const COMPANY_ID = "company-thb-red";
const SCHOOL_ID = "school-thb-red";
const DECISION_ID = "decision-thb-red-001";
const CONTENT_DIGEST =
  "1606bd5b7b241d0d0f8b0b7f31e599371cfc2774d0ed27b57e587225b67ee0eb";
const REPLAY_IDENTITY =
  "79f65c8ad2ecba62445a6cf2f7cf9221afb25fb049b2b860c72049806ca966fd";
const CLAIMS_VERSION = "company-identity-claims-v1";
const POLICY_VERSION = "finance-thb-role-policy-v1";
const ROLE_ID = "finance-thb-policy-approver";

interface Scope {
  readonly companyId: string;
  readonly schoolId?: string;
}

interface Signer {
  readonly source: "company-identity";
  readonly actorKind: "authenticated-owner" | "unauthenticated";
  readonly subjectId: string;
  readonly organizationId: string;
  readonly appRoleIds: readonly string[];
  readonly schoolIds?: readonly string[];
  readonly claimsVersion: string;
  readonly policyVersion: string;
}

interface DecisionEvidence {
  readonly source: "company-identity";
  readonly operation: typeof OPERATION;
  readonly decisionId: string;
  readonly attestationId: string;
  readonly signature: string;
  readonly contentDigest: string;
}

interface PolicyRules {
  readonly rateSourceId: string;
  readonly effectiveDateRuleId: string;
  readonly roundingRuleId: string;
}

interface ReceiptAuditContext {
  readonly eventId: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
}

interface DecisionReceipt {
  readonly receiptVersion: typeof RECEIPT_VERSION;
  readonly canonicalizationVersion: typeof CANONICALIZATION_VERSION;
  readonly operation: "finance-thb-valuation";
  readonly decisionId: string;
  readonly scope: Scope;
  readonly signer: Signer;
  readonly decisionEvidence: DecisionEvidence;
  readonly rules: PolicyRules;
  readonly validFrom: string;
  readonly expiresAt: string;
  readonly supersededByDecisionId?: string;
  readonly contentDigest: string;
  readonly replayIdentity: string;
  readonly audit: ReceiptAuditContext;
}

function appendFramedText(parts: Buffer[], value: string): void {
  const bytes = Buffer.from(value, "utf8");
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(bytes.byteLength, 0);
  parts.push(length, bytes);
}

function appendField(parts: Buffer[], name: string, value: string): void {
  appendFramedText(parts, name);
  appendFramedText(parts, value);
}

function appendOptionalField(
  parts: Buffer[],
  name: string,
  value: string | undefined,
): void {
  appendFramedText(parts, name);
  parts.push(Buffer.from([value === undefined ? 0 : 1]));
  if (value !== undefined) {
    appendFramedText(parts, value);
  }
}

function appendListField(
  parts: Buffer[],
  name: string,
  values: readonly string[] | undefined,
): void {
  appendFramedText(parts, name);
  parts.push(Buffer.from([values === undefined ? 0 : 1]));
  if (values === undefined) {
    return;
  }
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(values.length, 0);
  parts.push(length);
  for (const value of values) {
    appendFramedText(parts, value);
  }
}

function canonicalDigestFor(receipt: DecisionReceipt, domain: string): string {
  const parts: Buffer[] = [];
  appendFramedText(parts, domain);
  appendField(parts, "receiptVersion", receipt.receiptVersion);
  appendField(
    parts,
    "canonicalizationVersion",
    receipt.canonicalizationVersion,
  );
  appendField(parts, "operation", receipt.operation);
  appendField(parts, "decisionId", receipt.decisionId);
  appendField(parts, "scope.companyId", receipt.scope.companyId);
  appendOptionalField(parts, "scope.schoolId", receipt.scope.schoolId);
  appendField(parts, "signer.source", receipt.signer.source);
  appendField(parts, "signer.actorKind", receipt.signer.actorKind);
  appendField(parts, "signer.subjectId", receipt.signer.subjectId);
  appendField(parts, "signer.organizationId", receipt.signer.organizationId);
  appendField(parts, "signer.claimsVersion", receipt.signer.claimsVersion);
  appendField(parts, "signer.policyVersion", receipt.signer.policyVersion);
  appendListField(parts, "signer.appRoleIds", receipt.signer.appRoleIds);
  appendListField(parts, "signer.schoolIds", receipt.signer.schoolIds);
  appendField(
    parts,
    "decisionEvidence.source",
    receipt.decisionEvidence.source,
  );
  appendField(
    parts,
    "decisionEvidence.operation",
    receipt.decisionEvidence.operation,
  );
  appendField(
    parts,
    "decisionEvidence.decisionId",
    receipt.decisionEvidence.decisionId,
  );
  appendField(
    parts,
    "decisionEvidence.attestationId",
    receipt.decisionEvidence.attestationId,
  );
  appendField(
    parts,
    "decisionEvidence.signature",
    receipt.decisionEvidence.signature,
  );
  appendField(parts, "rules.rateSourceId", receipt.rules.rateSourceId);
  appendField(
    parts,
    "rules.effectiveDateRuleId",
    receipt.rules.effectiveDateRuleId,
  );
  appendField(parts, "rules.roundingRuleId", receipt.rules.roundingRuleId);
  appendField(parts, "validFrom", receipt.validFrom);
  appendField(parts, "expiresAt", receipt.expiresAt);
  appendOptionalField(
    parts,
    "supersededByDecisionId",
    receipt.supersededByDecisionId,
  );
  appendField(parts, "audit.eventId", receipt.audit.eventId);
  appendField(parts, "audit.requestId", receipt.audit.requestId);
  appendField(parts, "audit.correlationId", receipt.audit.correlationId);
  appendField(parts, "audit.occurredAt", receipt.audit.occurredAt);
  return createHash("sha256").update(Buffer.concat(parts)).digest("hex");
}

interface AuthorityInput {
  readonly operation: typeof OPERATION;
  readonly decisionId: string;
  readonly expectedScope: Scope;
  readonly contentDigest: string;
  readonly decisionEvidence: DecisionEvidence;
}

type AuthorityDenyReason =
  | "authority-denied"
  | "role-denied"
  | "scope-denied"
  | "signature-invalid"
  | "receipt-not-found";

type AuthorityResult =
  | {
      readonly decision: "allow";
      readonly decisionId: string;
      readonly scope: Scope;
      readonly signer: Signer;
      readonly decisionEvidence: DecisionEvidence;
      readonly contentDigest: string;
      readonly signatureVerified: true;
    }
  | { readonly decision: "deny"; readonly reason: AuthorityDenyReason };

interface AuthorityPort {
  verify(input: AuthorityInput): Promise<AuthorityResult>;
}

interface ReceiptLedgerPort {
  lookup(input: {
    readonly operation: typeof OPERATION;
    readonly decisionId: string;
  }): Promise<DecisionReceipt | undefined>;
}

interface AuditEvent {
  readonly eventId: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly operation: typeof AUDIT_OPERATION;
  readonly outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  readonly reasonCode: string;
  readonly actor:
    | { readonly kind: "authenticated-owner"; readonly subjectId: string }
    | { readonly kind: "unauthenticated" };
  readonly scope: Scope;
  readonly metadata: Readonly<Record<string, unknown>>;
}

interface AuditPort {
  append(event: Readonly<AuditEvent>): Promise<void>;
}

interface TrustedAuditSources {
  createEventId(): string;
  createRequestId(): string;
  createCorrelationId(): string;
  now(): Date;
}

interface AttestorFactoryInput {
  readonly authorityPort: AuthorityPort;
  readonly receiptLedger: ReceiptLedgerPort;
  readonly auditPort: AuditPort;
  readonly trustedAuditSources: TrustedAuditSources;
}

type DenyReason =
  | "authority-denied"
  | "role-denied"
  | "scope-denied"
  | "signature-invalid"
  | "receipt-not-found"
  | "malformed-receipt"
  | "operation-mismatch"
  | "decision-identity-mismatch"
  | "scope-mismatch"
  | "invalid-digest"
  | "invalid-replay-identity"
  | "expired"
  | "not-yet-valid"
  | "superseded";

type VerificationResult =
  | { readonly decision: "allow"; readonly receipt: DecisionReceipt }
  | { readonly decision: "replay"; readonly receipt: DecisionReceipt }
  | { readonly decision: "conflict"; readonly reason: "replay-conflict" }
  | { readonly decision: "deny"; readonly reason: DenyReason };

interface FinanceThbPolicyApprovalAttestor {
  verify(input: {
    readonly operation: typeof OPERATION;
    readonly receipt: unknown;
    readonly expectedScope: Scope;
    readonly existingReceipt?: unknown;
  }): Promise<VerificationResult>;
}

interface CompanyIdentityThbPolicyApprovalModule {
  readonly createFinanceThbPolicyApprovalAttestor: (
    input: AttestorFactoryInput,
  ) => FinanceThbPolicyApprovalAttestor;
}

interface HarnessOptions {
  readonly authorityResult?: AuthorityResult;
  readonly ledgerReceipt?: DecisionReceipt | null;
  readonly authorityError?: unknown;
  readonly ledgerError?: unknown;
  readonly auditError?: unknown;
  readonly now?: Date;
}

interface AgreementMismatch {
  readonly authorityResult?: AuthorityResult;
  readonly ledgerReceipt?: DecisionReceipt;
}

interface Harness {
  readonly attestor: FinanceThbPolicyApprovalAttestor;
  readonly authorityVerify: ReturnType<typeof vi.fn>;
  readonly ledgerLookup: ReturnType<typeof vi.fn>;
  readonly events: AuditEvent[];
}

async function loadCompanyIdentityModule(): Promise<CompanyIdentityThbPolicyApprovalModule> {
  return (await import("../index.js")) as unknown as CompanyIdentityThbPolicyApprovalModule;
}

function requireAttestorFactory(
  subject: CompanyIdentityThbPolicyApprovalModule,
): CompanyIdentityThbPolicyApprovalModule["createFinanceThbPolicyApprovalAttestor"] {
  expect(
    subject.createFinanceThbPolicyApprovalAttestor,
    "Company Identity must export createFinanceThbPolicyApprovalAttestor for finance-thb-policy-approval.",
  ).toBeTypeOf("function");
  return subject.createFinanceThbPolicyApprovalAttestor;
}

function baseScope(): Scope {
  return { companyId: COMPANY_ID };
}

function schoolScope(): Scope {
  return { companyId: COMPANY_ID, schoolId: SCHOOL_ID };
}

function baseSigner(overrides: Partial<Signer> = {}): Signer {
  return {
    source: "company-identity",
    actorKind: "authenticated-owner",
    subjectId: "owner-thb-red",
    organizationId: COMPANY_ID,
    appRoleIds: [ROLE_ID],
    claimsVersion: CLAIMS_VERSION,
    policyVersion: POLICY_VERSION,
    ...overrides,
  };
}

function baseEvidence(
  overrides: Partial<DecisionEvidence> = {},
): DecisionEvidence {
  return {
    source: "company-identity",
    operation: OPERATION,
    decisionId: DECISION_ID,
    attestationId: "attestation-thb-red-001",
    signature: "opaque-signature-secret",
    contentDigest: CONTENT_DIGEST,
    ...overrides,
  };
}

function baseReceipt(
  overrides: Partial<DecisionReceipt> = {},
): DecisionReceipt {
  const decisionId = overrides.decisionId ?? DECISION_ID;
  const decisionEvidence =
    overrides.decisionEvidence ?? baseEvidence({ decisionId });
  const receiptWithoutDigests: DecisionReceipt = {
    receiptVersion: RECEIPT_VERSION,
    canonicalizationVersion: CANONICALIZATION_VERSION,
    operation: "finance-thb-valuation",
    decisionId,
    scope: overrides.scope ?? baseScope(),
    signer: overrides.signer ?? baseSigner(),
    decisionEvidence,
    rules: overrides.rules ?? {
      rateSourceId: "opaque-rate-source-id",
      effectiveDateRuleId: "opaque-effective-date-rule-id",
      roundingRuleId: "opaque-rounding-rule-id",
    },
    validFrom: overrides.validFrom ?? "2026-08-13T00:00:00.000Z",
    expiresAt: overrides.expiresAt ?? "2026-08-15T00:00:00.000Z",
    ...(overrides.supersededByDecisionId === undefined
      ? {}
      : { supersededByDecisionId: overrides.supersededByDecisionId }),
    contentDigest: CONTENT_DIGEST,
    replayIdentity: REPLAY_IDENTITY,
    audit: overrides.audit ?? {
      eventId: "finance-thb-audit-event-001",
      requestId: "finance-thb-request-001",
      correlationId: "finance-thb-correlation-001",
      occurredAt: "2026-08-14T00:00:00.000Z",
    },
  };
  const contentDigest =
    overrides.contentDigest ??
    canonicalDigestFor(
      receiptWithoutDigests,
      "finance-thb-policy-content-digest-v1",
    );
  const evidenceContentDigest =
    overrides.decisionEvidence?.contentDigest !== undefined &&
    overrides.decisionEvidence.contentDigest !== CONTENT_DIGEST
      ? overrides.decisionEvidence.contentDigest
      : contentDigest;
  const receiptWithContentDigest: DecisionReceipt = {
    ...receiptWithoutDigests,
    decisionEvidence: {
      ...decisionEvidence,
      contentDigest: evidenceContentDigest,
    },
    contentDigest,
    replayIdentity: REPLAY_IDENTITY,
  };
  return {
    ...receiptWithContentDigest,
    replayIdentity:
      overrides.replayIdentity ??
      canonicalDigestFor(
        receiptWithContentDigest,
        "finance-thb-policy-replay-identity-v1",
      ),
  };
}

function authorityAllow(
  candidate: DecisionReceipt = baseReceipt(),
): AuthorityResult {
  return {
    decision: "allow",
    decisionId: candidate.decisionId,
    scope: candidate.scope,
    signer: candidate.signer,
    decisionEvidence: candidate.decisionEvidence,
    contentDigest: candidate.contentDigest,
    signatureVerified: true,
  };
}

function authorityDeny(reason: AuthorityDenyReason): AuthorityResult {
  return { decision: "deny", reason };
}

async function createHarness(options: HarnessOptions = {}): Promise<Harness> {
  const subject = await loadCompanyIdentityModule();
  const createAttestor = requireAttestorFactory(subject);
  const events: AuditEvent[] = [];
  const authoritativeReceipt = baseReceipt();
  const authorityVerify = vi.fn(async () => {
    if (options.authorityError !== undefined) {
      throw options.authorityError;
    }
    return options.authorityResult ?? authorityAllow(authoritativeReceipt);
  });
  const ledgerLookup = vi.fn(
    async (lookupInput: {
      readonly operation: typeof OPERATION;
      readonly decisionId: string;
    }) => {
      if (lookupInput.operation !== OPERATION) {
        return undefined;
      }
      if (options.ledgerError !== undefined) {
        throw options.ledgerError;
      }
      if (options.ledgerReceipt !== undefined) {
        return options.ledgerReceipt ?? undefined;
      }
      return authoritativeReceipt;
    },
  );
  const auditPort: AuditPort = {
    append: async (event) => {
      if (options.auditError !== undefined) {
        throw options.auditError;
      }
      events.push(event);
    },
  };
  const trustedAuditSources: TrustedAuditSources = {
    createEventId: () => authoritativeReceipt.audit.eventId,
    createRequestId: () => authoritativeReceipt.audit.requestId,
    createCorrelationId: () => authoritativeReceipt.audit.correlationId,
    now: () => options.now ?? new Date("2026-08-14T00:00:00.000Z"),
  };
  return {
    attestor: createAttestor({
      authorityPort: { verify: authorityVerify },
      receiptLedger: { lookup: ledgerLookup },
      auditPort,
      trustedAuditSources,
    }),
    authorityVerify,
    ledgerLookup,
    events,
  };
}

function verificationInput(
  receiptValue: unknown = baseReceipt(),
  overrides: Partial<{
    readonly operation: typeof OPERATION;
    readonly expectedScope: Scope;
    readonly existingReceipt: unknown;
  }> = {},
): {
  readonly operation: typeof OPERATION;
  readonly receipt: unknown;
  readonly expectedScope: Scope;
  readonly existingReceipt?: unknown;
} {
  return {
    operation: OPERATION,
    receipt: receiptValue,
    expectedScope: baseScope(),
    ...overrides,
  };
}

/** Adds an own enumerable `__proto__` data property without invoking the prototype setter. */
function withOwnEnumerableProto<T extends object>(value: T): T {
  Object.defineProperty(value, "__proto__", {
    configurable: true,
    enumerable: true,
    value: POISON,
    writable: true,
  });
  expect(Object.prototype.propertyIsEnumerable.call(value, "__proto__")).toBe(
    true,
  );
  return value;
}

interface AuditExpectation {
  readonly reasonCode: string;
  readonly receipt?: DecisionReceipt;
  readonly outcome?: AuditEvent["outcome"];
  readonly outcomes?: readonly AuditEvent["outcome"][];
  readonly scope?: Scope;
  readonly idempotencyReplay?: boolean;
}

function expectOneTerminalAudit(
  events: readonly AuditEvent[],
  expected: AuditExpectation,
): AuditEvent {
  expect(events).toHaveLength(1);
  const [event] = events;
  expect(event).toBeDefined();
  expect(event.operation).toBe(AUDIT_OPERATION);
  expect(event.reasonCode).toBe(expected.reasonCode);
  expect(event.reasonCode).toMatch(/^\S.{0,127}$/u);
  expect(event.reasonCode).not.toContain(POISON);
  const allowedOutcomes =
    expected.outcomes ??
    (expected.outcome === undefined ? [event.outcome] : [expected.outcome]);
  expect(allowedOutcomes).toContain(event.outcome);
  if (expected.scope !== undefined) {
    expect(event.scope).toEqual(expected.scope);
  }
  const metadata = event.metadata;
  const expectedKeys = [
    "source",
    "resourceType",
    "objectId",
    "requestId",
    "eventId",
    "occurredAt",
    "actorKind",
    "actorSubjectId",
    "claimsVersion",
    "policyVersion",
    "sourceFingerprint",
    "idempotencyReplay",
    ...(event.scope.schoolId === undefined ? [] : ["schoolId"]),
  ].sort();
  const ownKeys = Reflect.ownKeys(metadata);
  const ownStringKeys = ownKeys
    .filter((key): key is string => typeof key === "string")
    .sort();
  const ownSymbolKeys = ownKeys.filter(
    (key): key is symbol => typeof key === "symbol",
  );
  expect(ownKeys).toHaveLength(expectedKeys.length);
  expect(ownStringKeys).toEqual(expectedKeys);
  expect(ownSymbolKeys).toEqual([]);
  expect(metadata).toEqual(
    projectSecretSafeAuditMetadata({ ...metadata, dependencySecret: POISON }),
  );
  expect(metadata).toMatchObject({
    source: "finance-operations",
    resourceType: "finance-thb-owner-decision",
    requestId: event.requestId,
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    actorKind: event.actor.kind,
    actorSubjectId:
      event.actor.kind === "authenticated-owner" ? event.actor.subjectId : null,
  });
  expect(metadata.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/u);
  expect(metadata.idempotencyReplay).toBeTypeOf("boolean");
  for (const value of Object.values(metadata)) {
    if (typeof value === "string") {
      expect(value.length).toBeGreaterThan(0);
      expect(value.length).toBeLessThanOrEqual(255);
      expect(value).not.toContain(POISON);
      expect(value).not.toContain("opaque-signature-secret");
    }
  }
  if (expected.idempotencyReplay !== undefined) {
    expect(metadata.idempotencyReplay).toBe(expected.idempotencyReplay);
  }
  if (expected.receipt !== undefined) {
    expect(metadata.objectId).toBe(expected.receipt.decisionId);
    expect(metadata.claimsVersion).toBe(expected.receipt.signer.claimsVersion);
    expect(metadata.policyVersion).toBe(expected.receipt.signer.policyVersion);
    expect(metadata.sourceFingerprint).toBe(expected.receipt.contentDigest);
    expect(event.scope).toEqual(expected.receipt.scope);
    if (expected.receipt.signer.actorKind === "authenticated-owner") {
      expect(event.actor).toEqual({
        kind: "authenticated-owner",
        subjectId: expected.receipt.signer.subjectId,
      });
    } else {
      expect(event.actor).toEqual({ kind: "unauthenticated" });
    }
    if (expected.receipt.scope.schoolId === undefined) {
      expect(metadata).not.toHaveProperty("schoolId");
    } else {
      expect(metadata.schoolId).toBe(expected.receipt.scope.schoolId);
    }
  }
  return event!;
}

function expectStableFailure(
  promise: Promise<unknown>,
  code:
    | "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID"
    | "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED",
): Promise<void> {
  return promise.then(
    (value) => {
      throw new Error(`Expected stable failure, received ${String(value)}`);
    },
    (error: unknown) => {
      expect(error).toMatchObject({ code });
      expect(error).not.toHaveProperty("cause");
      expect(String(error)).not.toContain(POISON);
    },
  );
}

describe("Company Identity finance-thb-policy-approval authority RED contract", () => {
  it("requires the reviewed Company Identity authority-extension export", async () => {
    requireAttestorFactory(await loadCompanyIdentityModule());
  });

  it("allows an authoritative company decision and appends one compact audit event", async () => {
    const harness = await createHarness();
    const result = await harness.attestor.verify(verificationInput());

    expect(result).toEqual({ decision: "allow", receipt: baseReceipt() });
    expect(harness.authorityVerify).toHaveBeenCalledWith({
      operation: OPERATION,
      decisionId: DECISION_ID,
      expectedScope: baseScope(),
      contentDigest: CONTENT_DIGEST,
      decisionEvidence: baseEvidence(),
    });
    expect(harness.ledgerLookup).toHaveBeenCalledWith({
      operation: OPERATION,
      decisionId: DECISION_ID,
    });
    const event = expectOneTerminalAudit(harness.events, {
      reasonCode: "authority-accepted",
      receipt: baseReceipt(),
      outcome: "SUCCEEDED",
      scope: baseScope(),
      idempotencyReplay: false,
    });
    expect(event.outcome).toBe("SUCCEEDED");
    expect(event.scope).toEqual(baseScope());
    expect(event.metadata).toEqual({
      source: "finance-operations",
      resourceType: "finance-thb-owner-decision",
      objectId: DECISION_ID,
      requestId: "finance-thb-request-001",
      eventId: "finance-thb-audit-event-001",
      occurredAt: "2026-08-14T00:00:00.000Z",
      actorKind: "authenticated-owner",
      actorSubjectId: "owner-thb-red",
      claimsVersion: CLAIMS_VERSION,
      policyVersion: POLICY_VERSION,
      sourceFingerprint: CONTENT_DIGEST,
      idempotencyReplay: false,
    });
    expect(projectSecretSafeAuditMetadata({ ...event.metadata })).toEqual(
      event.metadata,
    );
  });

  it("binds an optional school scope, signer claims, and role-policy versions", async () => {
    const scopedReceipt = baseReceipt({
      scope: schoolScope(),
      signer: baseSigner({ schoolIds: [SCHOOL_ID] }),
      decisionEvidence: baseEvidence(),
    });
    const harness = await createHarness({
      authorityResult: authorityAllow(scopedReceipt),
      ledgerReceipt: scopedReceipt,
    });

    const result = await harness.attestor.verify(
      verificationInput(scopedReceipt, { expectedScope: schoolScope() }),
    );

    expect(result).toEqual({ decision: "allow", receipt: scopedReceipt });
    const event = expectOneTerminalAudit(harness.events, {
      reasonCode: "authority-accepted",
      receipt: scopedReceipt,
      outcome: "SUCCEEDED",
      scope: schoolScope(),
      idempotencyReplay: false,
    });
    expect(event.scope).toEqual(schoolScope());
    expect(event.metadata).toMatchObject({
      schoolId: SCHOOL_ID,
      claimsVersion: CLAIMS_VERSION,
      policyVersion: POLICY_VERSION,
    });
  });

  it.each([
    ["authority-denied", "authority-denied"],
    ["role-denied", "role-denied"],
    ["scope-denied", "scope-denied"],
    ["signature-invalid", "signature-invalid"],
  ] as const)(
    "returns a stable denied result for %s authority outcome",
    async (_label, reason) => {
      const harness = await createHarness({
        authorityResult: authorityDeny(reason),
      });
      const result = await harness.attestor.verify(verificationInput());

      expect(result).toEqual({ decision: "deny", reason });
      expect(harness.ledgerLookup).not.toHaveBeenCalled();
      const event = expectOneTerminalAudit(harness.events, {
        reasonCode: reason,
        receipt: baseReceipt(),
        outcome: "DENIED",
        scope: baseScope(),
        idempotencyReplay: false,
      });
      expect(event.outcome).toBe("DENIED");
      expect(event.metadata).not.toHaveProperty("signature");
    },
  );

  it("requires server-issued decision identity and authoritative receipt agreement", async () => {
    const serverReceipt = baseReceipt({
      decisionId: "decision-server-issued",
      decisionEvidence: baseEvidence({ decisionId: "decision-server-issued" }),
    });
    const callerReceipt = baseReceipt({
      decisionId: "decision-caller-forged",
      decisionEvidence: baseEvidence({ decisionId: "decision-caller-forged" }),
    });
    const harness = await createHarness({
      authorityResult: authorityAllow(serverReceipt),
      ledgerReceipt: serverReceipt,
    });
    harness.ledgerLookup.mockImplementation(async (lookupInput) =>
      lookupInput.operation === OPERATION &&
      lookupInput.decisionId === serverReceipt.decisionId
        ? serverReceipt
        : undefined,
    );

    const result = await harness.attestor.verify(
      verificationInput(callerReceipt),
    );

    expect(result).toEqual({
      decision: "deny",
      reason: "decision-identity-mismatch",
    });
    expect(harness.ledgerLookup).toHaveBeenCalledTimes(1);
    expect(harness.ledgerLookup).toHaveBeenCalledWith({
      operation: OPERATION,
      decisionId: serverReceipt.decisionId,
    });
    expect(harness.ledgerLookup).not.toHaveBeenCalledWith({
      operation: OPERATION,
      decisionId: callerReceipt.decisionId,
    });
    const event = expectOneTerminalAudit(harness.events, {
      reasonCode: "decision-identity-mismatch",
      receipt: serverReceipt,
      outcomes: ["DENIED", "FAILED"],
      scope: baseScope(),
      idempotencyReplay: false,
    });
    expect(event.metadata.objectId).toBe(serverReceipt.decisionId);
    expect(event.metadata.objectId).not.toBe(callerReceipt.decisionId);
    expect(JSON.stringify(harness.events)).not.toContain(
      callerReceipt.decisionId,
    );
  });

  it("rejects a decision identity detached from its evidence before cross-boundary agreement", async () => {
    const detachedEvidenceDecisionId = "decision-evidence-detached";
    const detachedReceipt = baseReceipt({
      decisionEvidence: baseEvidence({
        decisionId: detachedEvidenceDecisionId,
      }),
    });
    const authorityResult = authorityAllow(detachedReceipt);
    const ledgerReceipt = detachedReceipt;

    expect(detachedReceipt.decisionId).toBe(DECISION_ID);
    expect(detachedReceipt.decisionEvidence.decisionId).toBe(
      detachedEvidenceDecisionId,
    );
    expect(authorityResult).toMatchObject({
      decision: "allow",
      decisionId: DECISION_ID,
      decisionEvidence: { decisionId: detachedEvidenceDecisionId },
    });
    expect(ledgerReceipt.decisionId).toBe(DECISION_ID);
    expect(ledgerReceipt.decisionEvidence.decisionId).toBe(
      detachedEvidenceDecisionId,
    );

    const harness = await createHarness({
      authorityResult,
      ledgerReceipt,
    });
    const result = await harness.attestor.verify(
      verificationInput(detachedReceipt),
    );

    expect(result).toEqual({
      decision: "deny",
      reason: "security-field-mismatch",
    });
    expect(harness.ledgerLookup).not.toHaveBeenCalled();
    expectOneTerminalAudit(harness.events, {
      reasonCode: "security-field-mismatch",
      receipt: detachedReceipt,
      outcomes: ["DENIED", "FAILED"],
      scope: baseScope(),
      idempotencyReplay: false,
    });
  });

  it.each([
    [
      "company scope",
      authorityAllow(baseReceipt({ scope: { companyId: "company-other" } })),
    ],
    [
      "optional school scope",
      authorityAllow(baseReceipt({ scope: schoolScope() })),
    ],
    [
      "signer identity and authority",
      authorityAllow(
        baseReceipt({ signer: baseSigner({ subjectId: "owner-other" }) }),
      ),
    ],
    [
      "signer source",
      authorityAllow(
        baseReceipt({
          signer: baseSigner({
            source: "other-identity" as "company-identity",
          }),
        }),
      ),
    ],
    [
      "signer actor kind",
      authorityAllow(
        baseReceipt({
          signer: baseSigner({
            actorKind: "unauthenticated" as "authenticated-owner",
          }),
        }),
      ),
    ],
    [
      "signer organization authority",
      authorityAllow(
        baseReceipt({
          signer: baseSigner({ organizationId: "company-other" }),
        }),
      ),
    ],
    [
      "signer role authority",
      authorityAllow(
        baseReceipt({ signer: baseSigner({ appRoleIds: ["role-other"] }) }),
      ),
    ],
    [
      "signer school authority",
      authorityAllow(
        baseReceipt({ signer: baseSigner({ schoolIds: ["school-other"] }) }),
      ),
    ],
    [
      "claims version",
      authorityAllow(
        baseReceipt({ signer: baseSigner({ claimsVersion: "claims-other" }) }),
      ),
    ],
    [
      "role-policy version",
      authorityAllow(
        baseReceipt({ signer: baseSigner({ policyVersion: "policy-other" }) }),
      ),
    ],
    [
      "decision evidence attestation",
      authorityAllow(
        baseReceipt({
          decisionEvidence: baseEvidence({
            attestationId: "attestation-other",
          }),
        }),
      ),
    ],
    [
      "decision evidence source",
      authorityAllow(
        baseReceipt({
          decisionEvidence: baseEvidence({
            source: "other-identity" as "company-identity",
          }),
        }),
      ),
    ],
    [
      "decision evidence identity",
      authorityAllow(
        baseReceipt({
          decisionEvidence: baseEvidence({
            decisionId: "authority-evidence-other",
          }),
        }),
      ),
    ],
    [
      "decision evidence operation",
      authorityAllow(
        baseReceipt({
          decisionEvidence: baseEvidence({
            operation: "finance-other-operation" as typeof OPERATION,
          }),
        }),
      ),
    ],
    [
      "decision evidence content digest",
      authorityAllow(
        baseReceipt({
          decisionEvidence: baseEvidence({ contentDigest: "e".repeat(64) }),
        }),
      ),
    ],
    [
      "decision evidence signature",
      authorityAllow(
        baseReceipt({
          decisionEvidence: baseEvidence({ signature: "signature-other" }),
        }),
      ),
    ],
    [
      "content digest",
      authorityAllow(baseReceipt({ contentDigest: "c".repeat(64) })),
    ],
    [
      "signature verification marker",
      {
        ...authorityAllow(),
        signatureVerified: false as unknown as true,
      } as AuthorityResult,
    ],
  ] as const)(
    "rejects authority and receipt disagreement for %s before ledger or allow",
    async (_label, authorityResult) => {
      const harness = await createHarness({ authorityResult });
      const result = await harness.attestor.verify(verificationInput());

      if (result instanceof Error) {
        expect([
          "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID",
          "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED",
        ]).toContain((result as Error & { code?: string }).code);
        expect(String(result)).not.toContain(POISON);
      } else {
        expect(result).not.toMatchObject({ decision: "allow" });
      }
      expect(harness.ledgerLookup).not.toHaveBeenCalled();
      const expectedAuditReceipt =
        _label === "signer actor kind" && authorityResult.decision === "allow"
          ? (authorityResult as unknown as DecisionReceipt)
          : baseReceipt();
      expectOneTerminalAudit(harness.events, {
        reasonCode: "security-field-mismatch",
        receipt: expectedAuditReceipt,
        outcomes: ["DENIED", "FAILED"],
        scope: baseScope(),
        idempotencyReplay: false,
      });
    },
  );

  it.each([
    [
      "company scope",
      { ledgerReceipt: baseReceipt({ scope: { companyId: "company-other" } }) },
    ],
    [
      "optional school scope",
      { ledgerReceipt: baseReceipt({ scope: schoolScope() }) },
    ],
    [
      "signer subject",
      {
        ledgerReceipt: baseReceipt({
          signer: baseSigner({ subjectId: "ledger-owner-other" }),
        }),
      },
    ],
    [
      "signer source",
      {
        ledgerReceipt: baseReceipt({
          signer: baseSigner({
            source: "other-identity" as "company-identity",
          }),
        }),
      },
    ],
    [
      "signer actor kind",
      {
        ledgerReceipt: baseReceipt({
          signer: baseSigner({
            actorKind: "unauthenticated" as "authenticated-owner",
          }),
        }),
      },
    ],
    [
      "signer organization authority",
      {
        ledgerReceipt: baseReceipt({
          signer: baseSigner({ organizationId: "company-other" }),
        }),
      },
    ],
    [
      "signer role authority",
      {
        ledgerReceipt: baseReceipt({
          signer: baseSigner({ appRoleIds: ["role-other"] }),
        }),
      },
    ],
    [
      "signer school authority",
      {
        ledgerReceipt: baseReceipt({
          signer: baseSigner({ schoolIds: ["school-other"] }),
        }),
      },
    ],
    [
      "claims version",
      {
        ledgerReceipt: baseReceipt({
          signer: baseSigner({ claimsVersion: "claims-other" }),
        }),
      },
    ],
    [
      "role-policy version",
      {
        ledgerReceipt: baseReceipt({
          signer: baseSigner({ policyVersion: "policy-other" }),
        }),
      },
    ],
    [
      "decision evidence attestation",
      {
        ledgerReceipt: baseReceipt({
          decisionEvidence: baseEvidence({
            attestationId: "ledger-attestation-other",
          }),
        }),
      },
    ],
    [
      "decision evidence source",
      {
        ledgerReceipt: baseReceipt({
          decisionEvidence: baseEvidence({
            source: "other-identity" as "company-identity",
          }),
        }),
      },
    ],
    [
      "decision evidence signature",
      {
        ledgerReceipt: baseReceipt({
          decisionEvidence: baseEvidence({
            signature: "ledger-signature-other",
          }),
        }),
      },
    ],
    [
      "decision evidence identity",
      {
        ledgerReceipt: baseReceipt({
          decisionEvidence: baseEvidence({
            decisionId: "evidence-decision-other",
          }),
        }),
      },
    ],
    [
      "decision evidence operation",
      {
        ledgerReceipt: baseReceipt({
          decisionEvidence: baseEvidence({
            operation: "finance-other-operation" as typeof OPERATION,
          }),
        }),
      },
    ],
    [
      "decision evidence content digest",
      {
        ledgerReceipt: baseReceipt({
          decisionEvidence: baseEvidence({ contentDigest: "e".repeat(64) }),
        }),
      },
    ],
    [
      "receipt content digest",
      {
        ledgerReceipt: baseReceipt({
          audit: {
            eventId: "finance-thb-audit-event-001",
            requestId: "ledger-request-other",
            correlationId: "finance-thb-correlation-001",
            occurredAt: "2026-08-14T00:00:00.000Z",
          },
        }),
      },
    ],
    [
      "authoritative receipt identity",
      { ledgerReceipt: baseReceipt({ decisionId: "ledger-decision-other" }) },
    ],
    [
      "signature verification marker",
      {
        authorityResult: {
          ...authorityAllow(),
          signatureVerified: false as unknown as true,
        } as AuthorityResult,
      },
    ],
  ] as const satisfies readonly (readonly [string, AgreementMismatch])[])(
    "rejects one independent authority or ledger mismatch for %s",
    async (_label, mismatch) => {
      const harness = await createHarness(mismatch);
      const result = await harness.attestor.verify(verificationInput());

      if (result instanceof Error) {
        expect([
          "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID",
          "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED",
        ]).toContain((result as Error & { code?: string }).code);
        expect(String(result)).not.toContain(POISON);
      } else {
        expect(result).not.toMatchObject({ decision: "allow" });
      }
      const expectedAuditReceipt =
        _label === "signer actor kind" && "ledgerReceipt" in mismatch
          ? mismatch.ledgerReceipt
          : baseReceipt();
      if ("ledgerReceipt" in mismatch) {
        expect(harness.ledgerLookup).toHaveBeenCalledTimes(1);
      } else {
        expect(harness.ledgerLookup).not.toHaveBeenCalled();
      }
      expectOneTerminalAudit(harness.events, {
        reasonCode: "security-field-mismatch",
        receipt: expectedAuditReceipt,
        outcomes: ["DENIED", "FAILED"],
        scope: baseScope(),
        idempotencyReplay: false,
      });
    },
  );

  it.each([
    [
      "authority result",
      Object.assign(authorityAllow(), {
        unexpected: POISON,
      }) as AuthorityResult,
    ],
    [
      "ledger result",
      Object.assign(baseReceipt(), {
        unexpected: POISON,
      }) as unknown as DecisionReceipt,
    ],
    [
      "authority result own enumerable __proto__",
      withOwnEnumerableProto(authorityAllow()),
    ],
    [
      "ledger result own enumerable __proto__",
      withOwnEnumerableProto(baseReceipt()) as unknown as DecisionReceipt,
    ],
  ] as const)(
    "maps malformed %s to a stable terminal failure and safe audit",
    async (_label, malformedResult) => {
      const harness =
        _label === "authority result" ||
        _label === "authority result own enumerable __proto__"
          ? await createHarness({
              authorityResult: malformedResult as AuthorityResult,
            })
          : await createHarness({ ledgerReceipt: malformedResult });
      const result = await harness.attestor.verify(verificationInput());

      if (result instanceof Error) {
        expect([
          "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID",
          "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED",
        ]).toContain((result as Error & { code?: string }).code);
        expect(String(result)).not.toContain(POISON);
      } else {
        expect(result).not.toMatchObject({ decision: "allow" });
      }
      expectOneTerminalAudit(harness.events, {
        reasonCode: "malformed-dependency-result",
        receipt: baseReceipt(),
        outcomes: ["DENIED", "FAILED"],
        scope: baseScope(),
        idempotencyReplay: false,
      });
      expect(JSON.stringify(harness.events)).not.toContain(POISON);
    },
  );

  it("requires a receipt-ledger result and performs no domain write when it is absent", async () => {
    const harness = await createHarness({ ledgerReceipt: null });
    const result = await harness.attestor.verify(verificationInput());

    expect(result).toEqual({ decision: "deny", reason: "receipt-not-found" });
    expect(harness.ledgerLookup).toHaveBeenCalledTimes(1);
    const event = expectOneTerminalAudit(harness.events, {
      reasonCode: "receipt-not-found",
      receipt: baseReceipt(),
      outcome: "DENIED",
      scope: baseScope(),
      idempotencyReplay: false,
    });
    expect(event.outcome).toBe("DENIED");
  });

  it.each([
    ["expired", { expiresAt: "2026-08-13T23:59:59.000Z" }],
    ["not-yet-valid", { validFrom: "2026-08-15T00:00:00.000Z" }],
    ["superseded", { supersededByDecisionId: "decision-thb-red-002" }],
  ] as const)(
    "returns %s for an authoritative lifecycle state",
    async (reason, patch) => {
      const candidate = baseReceipt(patch);
      const harness = await createHarness({
        authorityResult: authorityAllow(candidate),
        ledgerReceipt: candidate,
      });

      const result = await harness.attestor.verify(
        verificationInput(candidate),
      );

      expect(result).toEqual({ decision: "deny", reason });
      expectOneTerminalAudit(harness.events, {
        reasonCode: reason,
        receipt: candidate,
        outcome: "DENIED",
        scope: candidate.scope,
        idempotencyReplay: false,
      });
    },
  );

  it("returns replay for an unchanged authoritative receipt", async () => {
    const existingReceipt = baseReceipt();
    const harness = await createHarness();
    const result = await harness.attestor.verify(
      verificationInput(existingReceipt, { existingReceipt }),
    );

    expect(result).toEqual({ decision: "replay", receipt: existingReceipt });
    const event = expectOneTerminalAudit(harness.events, {
      reasonCode: "replay",
      receipt: existingReceipt,
      outcome: "SUCCEEDED",
      scope: existingReceipt.scope,
      idempotencyReplay: true,
    });
    expect(event.metadata).toMatchObject({
      objectId: DECISION_ID,
      idempotencyReplay: true,
    });
  });

  it.each([
    ["content digest", { contentDigest: "c".repeat(64) }],
    ["replay identity", { replayIdentity: "d".repeat(64) }],
    ["trusted company scope", { scope: { companyId: "company-other" } }],
    [
      "trusted school scope",
      { scope: { companyId: COMPANY_ID, schoolId: "school-other" } },
    ],
    [
      "policy version",
      { signer: baseSigner({ policyVersion: "policy-other" }) },
    ],
  ] as const)(
    "returns replay conflict for changed %s",
    async (_label, patch) => {
      const existingReceipt = baseReceipt(patch);
      const harness = await createHarness();
      const result = await harness.attestor.verify(
        verificationInput(baseReceipt(), { existingReceipt }),
      );

      expect(result).toEqual({
        decision: "conflict",
        reason: "replay-conflict",
      });
      expectOneTerminalAudit(harness.events, {
        reasonCode: "replay-conflict",
        receipt: baseReceipt(),
        outcome: "DENIED",
        scope: baseScope(),
        idempotencyReplay: false,
      });
    },
  );

  it.each([
    ["root", Object.assign(baseReceipt(), { unexpected: POISON })],
    [
      "receipt root own enumerable __proto__",
      withOwnEnumerableProto(baseReceipt()),
    ],
    [
      "scope",
      baseReceipt({
        scope: Object.assign(baseScope(), { unexpected: POISON }),
      }),
    ],
    [
      "scope own enumerable __proto__",
      baseReceipt({ scope: withOwnEnumerableProto(baseScope()) }),
    ],
    [
      "signer",
      baseReceipt({
        signer: Object.assign(baseSigner(), { unexpected: POISON }),
      }),
    ],
    [
      "signer own enumerable __proto__",
      baseReceipt({ signer: withOwnEnumerableProto(baseSigner()) }),
    ],
    [
      "decision evidence",
      baseReceipt({
        decisionEvidence: Object.assign(baseEvidence(), { unexpected: POISON }),
      }),
    ],
    [
      "decision evidence own enumerable __proto__",
      baseReceipt({ decisionEvidence: withOwnEnumerableProto(baseEvidence()) }),
    ],
    [
      "policy rules",
      baseReceipt({
        rules: Object.assign(baseReceipt().rules, { unexpected: POISON }),
      }),
    ],
    [
      "policy rules own enumerable __proto__",
      baseReceipt({ rules: withOwnEnumerableProto(baseReceipt().rules) }),
    ],
    [
      "audit context",
      baseReceipt({
        audit: Object.assign(baseReceipt().audit, { unexpected: POISON }),
      }),
    ],
    [
      "audit context own enumerable __proto__",
      baseReceipt({ audit: withOwnEnumerableProto(baseReceipt().audit) }),
    ],
  ] as const)(
    "rejects unknown keys in the %s object",
    async (_label, candidate) => {
      const harness = await createHarness();
      const result = await harness.attestor.verify(
        verificationInput(candidate),
      );

      expect(result).toEqual({ decision: "deny", reason: "malformed-receipt" });
      expect(harness.authorityVerify).not.toHaveBeenCalled();
      expect(harness.ledgerLookup).not.toHaveBeenCalled();
      expectOneTerminalAudit(harness.events, {
        reasonCode: "malformed-receipt",
        receipt: baseReceipt(),
        outcome: "DENIED",
        scope: baseScope(),
        idempotencyReplay: false,
      });
    },
  );

  it.each([
    [
      "receipt version",
      { receiptVersion: "finance-thb-owner-decision-receipt.v2" },
      "malformed-receipt",
    ],
    [
      "canonicalization version",
      { canonicalizationVersion: "finance-thb-owner-decision-canonical.v2" },
      "malformed-receipt",
    ],
    ["operation", { operation: "finance-usd-valuation" }, "operation-mismatch"],
    [
      "content digest",
      { contentDigest: "not-a-sha256-digest" },
      "invalid-digest",
    ],
    [
      "arbitrary content digest",
      { contentDigest: "c".repeat(64) },
      "invalid-digest",
    ],
    [
      "replay identity",
      { replayIdentity: "forged-replay-identity" },
      "invalid-replay-identity",
    ],
    [
      "arbitrary replay identity",
      { replayIdentity: "d".repeat(64) },
      "invalid-replay-identity",
    ],
  ] as const)(
    "rejects unsupported or forged %s",
    async (_label, patch, reason) => {
      const candidate = Object.assign(baseReceipt(), patch) as unknown;
      const harness = await createHarness();
      const result = await harness.attestor.verify(
        verificationInput(candidate),
      );

      expect(result).toEqual({ decision: "deny", reason });
      expect(harness.authorityVerify).not.toHaveBeenCalled();
      expect(harness.ledgerLookup).not.toHaveBeenCalled();
      expectOneTerminalAudit(harness.events, {
        reasonCode: reason,
        receipt: baseReceipt(),
        outcome: "DENIED",
        scope: baseScope(),
        idempotencyReplay: false,
      });
    },
  );

  it("rejects an expected-scope mismatch before authority approval", async () => {
    const harness = await createHarness();
    const result = await harness.attestor.verify(
      verificationInput(baseReceipt(), {
        expectedScope: { companyId: "company-attacker" },
      }),
    );

    expect(result).toEqual({ decision: "deny", reason: "scope-mismatch" });
    expect(harness.authorityVerify).not.toHaveBeenCalled();
    expect(harness.ledgerLookup).not.toHaveBeenCalled();
    expectOneTerminalAudit(harness.events, {
      reasonCode: "scope-mismatch",
      receipt: baseReceipt(),
      outcome: "DENIED",
      scope: baseScope(),
      idempotencyReplay: false,
    });
  });

  it("uses one immutable receipt snapshot when authority awaits and the caller mutates it", async () => {
    const candidate = baseReceipt();
    const harness = await createHarness();
    harness.authorityVerify.mockImplementationOnce(async () => {
      (candidate.scope as { companyId: string }).companyId = "company-attacker";
      (candidate.signer as { organizationId: string }).organizationId =
        "company-attacker";
      return authorityAllow(baseReceipt());
    });

    const result = await harness.attestor.verify(verificationInput(candidate));

    expect(result).toEqual({ decision: "allow", receipt: baseReceipt() });
    expectOneTerminalAudit(harness.events, {
      reasonCode: "authority-accepted",
      receipt: baseReceipt(),
      outcome: "SUCCEEDED",
      scope: baseScope(),
      idempotencyReplay: false,
    });
    expect(JSON.stringify(harness.events)).not.toContain("company-attacker");
  });

  it("rejects accessor-backed decision identity before dependency calls", async () => {
    const candidate = baseReceipt();
    let reads = 0;
    Object.defineProperty(candidate, "decisionId", {
      enumerable: true,
      configurable: true,
      get: () => {
        reads += 1;
        return reads === 1 ? DECISION_ID : "decision-attacker";
      },
    });
    const harness = await createHarness();
    await expectStableFailure(
      harness.attestor.verify(verificationInput(candidate)),
      "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID",
    );

    expect(reads).toBe(0);
    expect(harness.authorityVerify).not.toHaveBeenCalled();
    expect(harness.ledgerLookup).not.toHaveBeenCalled();
    expect(harness.events).toHaveLength(0);
  });

  it("maps getter and Proxy poison to a stable invalid error with no dependency text", async () => {
    const getterPoison = Object.defineProperty(baseReceipt(), "decisionId", {
      enumerable: true,
      configurable: true,
      get: () => {
        throw new Error(POISON);
      },
    });
    const proxyPoison = new Proxy(baseReceipt(), {
      ownKeys: () => {
        throw new Error(POISON);
      },
    });
    const transparentProxy = new Proxy(baseReceipt(), {});
    const nestedTransparentProxy = baseReceipt({
      scope: new Proxy(baseScope(), {}),
    });

    for (const candidate of [
      getterPoison,
      proxyPoison,
      transparentProxy,
      nestedTransparentProxy,
    ]) {
      const harness = await createHarness();
      await expectStableFailure(
        harness.attestor.verify(verificationInput(candidate)),
        "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID",
      );
      expect(harness.authorityVerify).not.toHaveBeenCalled();
      expect(harness.ledgerLookup).not.toHaveBeenCalled();
      expect(harness.events).toHaveLength(0);
    }
  });

  it("rejects a bound-field mutation when the caller keeps the old digest", async () => {
    const candidate = baseReceipt();
    (candidate.rules as { rateSourceId: string }).rateSourceId =
      "attacker-rate-source";
    const harness = await createHarness();
    const result = await harness.attestor.verify(verificationInput(candidate));

    expect(result).toEqual({ decision: "deny", reason: "invalid-digest" });
    expect(harness.authorityVerify).not.toHaveBeenCalled();
    expect(harness.ledgerLookup).not.toHaveBeenCalled();
    expectOneTerminalAudit(harness.events, {
      reasonCode: "invalid-digest",
      receipt: baseReceipt(),
      outcome: "DENIED",
      scope: baseScope(),
      idempotencyReplay: false,
    });
  });

  it.each([
    [
      "unapproved signer role",
      baseReceipt({ signer: baseSigner({ appRoleIds: ["role-other"] }) }),
      "security-field-mismatch",
    ],
    [
      "unauthenticated actor",
      baseReceipt({
        signer: baseSigner({ actorKind: "unauthenticated" }),
      }),
      "security-field-mismatch",
    ],
  ] as const)(
    "rejects synchronized caller authority data for %s",
    async (_label, candidate, reason) => {
      const harness = await createHarness({
        authorityResult: authorityAllow(candidate),
        ledgerReceipt: candidate,
      });
      const result = await harness.attestor.verify(
        verificationInput(candidate),
      );

      expect(result).toEqual({ decision: "deny", reason });
      expect(harness.authorityVerify).not.toHaveBeenCalled();
      expect(harness.ledgerLookup).not.toHaveBeenCalled();
      const event = expectOneTerminalAudit(harness.events, {
        reasonCode: reason,
        receipt: candidate,
        outcome: "DENIED",
        scope: candidate.scope,
        idempotencyReplay: false,
      });
      if (candidate.signer.actorKind === "unauthenticated") {
        expect(event.actor).toEqual({ kind: "unauthenticated" });
        expect(event.metadata.actorKind).toBe("unauthenticated");
      }
    },
  );

  it("records malformed actor data as unauthenticated", async () => {
    const candidate = Object.assign(baseReceipt(), {
      signer: {
        ...baseSigner(),
        actorKind: "malformed",
      },
    });
    const harness = await createHarness();
    const result = await harness.attestor.verify(verificationInput(candidate));

    expect(result).toEqual({ decision: "deny", reason: "malformed-receipt" });
    expect(harness.authorityVerify).not.toHaveBeenCalled();
    expect(harness.ledgerLookup).not.toHaveBeenCalled();
    const event = expectOneTerminalAudit(harness.events, {
      reasonCode: "malformed-receipt",
      outcome: "DENIED",
      scope: baseScope(),
      idempotencyReplay: false,
    });
    expect(event.actor).toEqual({ kind: "unauthenticated" });
    expect(event.metadata.actorKind).toBe("unauthenticated");
    expect(event.metadata.actorSubjectId).toBeNull();
  });

  it.each([
    ["authority", { authorityError: new Error(POISON) }],
    ["receipt ledger", { ledgerError: new Error(POISON) }],
  ] as const)(
    "maps %s dependency poison to a stable secret-safe failure",
    async (_label, options) => {
      const harness = await createHarness(options);
      await expectStableFailure(
        harness.attestor.verify(verificationInput()),
        "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED",
      );
      expectOneTerminalAudit(harness.events, {
        reasonCode: "dependency-failure",
        receipt: baseReceipt(),
        outcome: "FAILED",
        scope: baseScope(),
        idempotencyReplay: false,
      });
      expect(JSON.stringify(harness.events)).not.toContain(POISON);
    },
  );

  it("maps audit dependency poison to a stable failure without exposing its cause", async () => {
    const harness = await createHarness({ auditError: new Error(POISON) });
    await expectStableFailure(
      harness.attestor.verify(verificationInput()),
      "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED",
    );
    expect(JSON.stringify(harness.events)).not.toContain(POISON);
  });

  it("does not copy signature, attestation, or opaque policy rules into audit metadata", async () => {
    const harness = await createHarness();
    await harness.attestor.verify(verificationInput());
    const event = expectOneTerminalAudit(harness.events, {
      reasonCode: "authority-accepted",
      receipt: baseReceipt(),
      outcome: "SUCCEEDED",
      scope: baseScope(),
      idempotencyReplay: false,
    });
    const metadataKeys = Reflect.ownKeys(event.metadata);
    const stringMetadataKeys = metadataKeys
      .filter((key): key is string => typeof key === "string")
      .sort();
    const symbolMetadataKeys = metadataKeys.filter(
      (key): key is symbol => typeof key === "symbol",
    );

    expect(metadataKeys).toHaveLength(12);
    expect(stringMetadataKeys).toEqual(
      [
        "actorKind",
        "actorSubjectId",
        "claimsVersion",
        "eventId",
        "idempotencyReplay",
        "objectId",
        "occurredAt",
        "policyVersion",
        "requestId",
        "resourceType",
        "source",
        "sourceFingerprint",
      ].sort(),
    );
    expect(symbolMetadataKeys).toEqual([]);
    expect(event.metadata).not.toHaveProperty("attestationId");
    expect(event.metadata).not.toHaveProperty("rateSourceId");
    expect(event.metadata).not.toHaveProperty("effectiveDateRuleId");
    expect(event.metadata).not.toHaveProperty("roundingRuleId");
  });
});
