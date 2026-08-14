import { createHash } from "node:crypto";
import { types as nodeTypes } from "node:util";

import { z } from "zod";

import { projectSecretSafeAuditMetadata } from "./protocol.js";

const POLICY_APPROVAL_OPERATION = "finance-thb-policy-approval" as const;
const VALUATION_OPERATION = "finance-thb-valuation" as const;
const AUDIT_OPERATION = "finance-thb:policy-approval" as const;
const RECEIPT_VERSION = "finance-thb-owner-decision-receipt.v1" as const;
const CANONICALIZATION_VERSION =
  "finance-thb-owner-decision-canonical.v1" as const;
const MAX_ARRAY_ITEMS = 128;
const APPROVED_SIGNER_ROLE_ID = "finance-thb-policy-approver";
const CONTENT_DIGEST_DOMAIN = "finance-thb-policy-content-digest-v1";
const REPLAY_IDENTITY_DOMAIN = "finance-thb-policy-replay-identity-v1";
const DEFAULT_SAFE_DECISION_ID = "finance-thb-invalid-decision";
const DEFAULT_SAFE_COMPANY_ID = "finance-thb-invalid-company";
const DEFAULT_SAFE_POLICY_VERSION = "finance-thb-invalid-policy";
const DEFAULT_SAFE_DIGEST = "a".repeat(64);

const authorityDenyReasonSchema = z.enum([
  "authority-denied",
  "role-denied",
  "scope-denied",
  "signature-invalid",
  "receipt-not-found",
]);

function isSafeText(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 255 ||
    !/\S/u.test(value)
  ) {
    return false;
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return false;
    }
  }
  return true;
}

const boundedTextSchema = z.string().min(1).max(255).refine(isSafeText);
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const dateTimeSchema = z.string().datetime({ offset: true });

const scopeSchema = z.strictObject({
  companyId: boundedTextSchema,
  schoolId: boundedTextSchema.optional(),
});

const signerSchema = z.strictObject({
  source: boundedTextSchema,
  actorKind: z.enum(["authenticated-owner", "unauthenticated"]),
  subjectId: boundedTextSchema,
  organizationId: boundedTextSchema,
  appRoleIds: z.array(boundedTextSchema).min(1).max(MAX_ARRAY_ITEMS),
  schoolIds: z.array(boundedTextSchema).max(MAX_ARRAY_ITEMS).optional(),
  claimsVersion: boundedTextSchema,
  policyVersion: boundedTextSchema,
});

const decisionEvidenceSchema = z.strictObject({
  source: boundedTextSchema,
  operation: boundedTextSchema,
  decisionId: boundedTextSchema,
  attestationId: boundedTextSchema,
  signature: boundedTextSchema,
  contentDigest: digestSchema,
});

const policyRulesSchema = z.strictObject({
  rateSourceId: boundedTextSchema,
  effectiveDateRuleId: boundedTextSchema,
  roundingRuleId: boundedTextSchema,
});

const receiptAuditSchema = z.strictObject({
  eventId: boundedTextSchema,
  requestId: boundedTextSchema,
  correlationId: boundedTextSchema,
  occurredAt: dateTimeSchema,
});

const receiptSchema = z.strictObject({
  receiptVersion: z.literal(RECEIPT_VERSION),
  canonicalizationVersion: z.literal(CANONICALIZATION_VERSION),
  operation: boundedTextSchema,
  decisionId: boundedTextSchema,
  scope: scopeSchema,
  signer: signerSchema,
  decisionEvidence: decisionEvidenceSchema,
  rules: policyRulesSchema,
  validFrom: dateTimeSchema,
  expiresAt: dateTimeSchema,
  supersededByDecisionId: boundedTextSchema.optional(),
  contentDigest: digestSchema,
  replayIdentity: digestSchema,
  audit: receiptAuditSchema,
});

const authorityResultSchema = z.union([
  z.strictObject({
    decision: z.literal("allow"),
    decisionId: boundedTextSchema,
    scope: scopeSchema,
    signer: signerSchema,
    decisionEvidence: decisionEvidenceSchema,
    contentDigest: digestSchema,
    signatureVerified: z.boolean(),
  }),
  z.strictObject({
    decision: z.literal("deny"),
    reason: authorityDenyReasonSchema,
  }),
]);

type Receipt = z.infer<typeof receiptSchema>;
type Scope = z.infer<typeof scopeSchema>;
type DecisionEvidence = z.infer<typeof decisionEvidenceSchema>;
type AuthorityResult = z.infer<typeof authorityResultSchema>;

/** Stable public error codes for the Finance THB policy approval boundary. */
export type FinanceThbPolicyApprovalErrorCode =
  | "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID"
  | "COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED";

/** Stable error returned by the Finance THB policy approval boundary. */
export class FinanceThbPolicyApprovalError extends Error {
  readonly code: FinanceThbPolicyApprovalErrorCode;

  /**
   * Creates a secret-safe Finance policy approval error.
   * @param code Stable public error code.
   */
  constructor(code: FinanceThbPolicyApprovalErrorCode) {
    super(code);
    this.name = "FinanceThbPolicyApprovalError";
    this.code = code;
    this.stack = `${this.name}: ${code}`;
    Object.freeze(this);
  }
}

/** Scope bound to a Finance THB policy decision. */
export type FinanceThbPolicyApprovalScope = Scope;

/** Receipt returned by the Company Identity policy authority and ledger. */
export type FinanceThbPolicyApprovalReceipt = Receipt;

/** Input sent to the server-owned Finance THB policy authority. */
export interface FinanceThbPolicyApprovalAuthorityInput {
  readonly operation: typeof POLICY_APPROVAL_OPERATION;
  readonly decisionId: string;
  readonly expectedScope: FinanceThbPolicyApprovalScope;
  readonly contentDigest: string;
  readonly decisionEvidence: DecisionEvidence;
}

/** Result returned by the server-owned Finance THB policy authority. */
export type FinanceThbPolicyApprovalAuthorityResult = AuthorityResult;

/** Port for server-side Finance THB policy authority verification. */
export interface FinanceThbPolicyApprovalAuthorityPort {
  /**
   * Verifies one caller receipt against the server-owned policy authority.
   * @param input Snapshot of the validated caller decision identity and scope.
   * @returns A raw authority result that the attestor validates again.
   */
  verify(input: FinanceThbPolicyApprovalAuthorityInput): Promise<unknown>;
}

/** Lookup key for the authoritative Finance THB receipt ledger. */
export interface FinanceThbPolicyApprovalReceiptLookup {
  readonly operation: typeof POLICY_APPROVAL_OPERATION;
  readonly decisionId: string;
}

/** Port for authoritative Finance THB receipt lookup. */
export interface FinanceThbPolicyApprovalReceiptLedgerPort {
  /**
   * Loads the receipt bound to the server-issued decision identity.
   * @param input Server-issued operation and decision identity.
   * @returns A raw ledger receipt or no receipt.
   */
  lookup(input: FinanceThbPolicyApprovalReceiptLookup): Promise<unknown>;
}

/** Actor retained in the compact Finance THB audit event. */
export type FinanceThbPolicyApprovalAuditActor =
  | { readonly kind: "authenticated-owner"; readonly subjectId: string }
  | { readonly kind: "unauthenticated" };

/** Compact terminal audit event emitted by the Finance THB attestor. */
export interface FinanceThbPolicyApprovalAuditEvent {
  readonly eventId: string;
  readonly requestId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
  readonly operation: typeof AUDIT_OPERATION;
  readonly outcome: "SUCCEEDED" | "DENIED" | "FAILED";
  readonly reasonCode: string;
  readonly actor: FinanceThbPolicyApprovalAuditActor;
  readonly scope: FinanceThbPolicyApprovalScope;
  readonly metadata: Readonly<Record<string, boolean | number | string | null>>;
}

/** Append-only audit port for terminal Finance THB policy decisions. */
export interface FinanceThbPolicyApprovalAuditPort {
  /**
   * Persists one validated terminal policy decision event.
   * @param event Immutable, secret-safe terminal event.
   * @returns A promise that resolves after durable append.
   */
  append(event: Readonly<FinanceThbPolicyApprovalAuditEvent>): Promise<void>;
}

/** Trusted server-owned sources for Finance THB audit identifiers and time. */
export interface FinanceThbPolicyApprovalTrustedAuditSources {
  /** Creates a server-owned audit event identity. */
  readonly createEventId: () => string;
  /** Creates a server-owned request identity. */
  readonly createRequestId: () => string;
  /** Creates a server-owned correlation identity. */
  readonly createCorrelationId: () => string;
  /** Returns the trusted current time. */
  readonly now: () => Date;
}

/** Input used to construct the Finance THB policy approval attestor. */
export interface FinanceThbPolicyApprovalFactoryInput {
  readonly authorityPort: FinanceThbPolicyApprovalAuthorityPort;
  readonly receiptLedger: FinanceThbPolicyApprovalReceiptLedgerPort;
  readonly auditPort: FinanceThbPolicyApprovalAuditPort;
  readonly trustedAuditSources: FinanceThbPolicyApprovalTrustedAuditSources;
}

/** Input accepted by the Finance THB policy approval verifier. */
export interface FinanceThbPolicyApprovalVerificationInput {
  readonly operation: typeof POLICY_APPROVAL_OPERATION;
  readonly receipt: unknown;
  readonly expectedScope: FinanceThbPolicyApprovalScope;
  readonly existingReceipt?: unknown;
}

/** Stable denial reasons returned by the Finance THB policy verifier. */
export type FinanceThbPolicyApprovalDenyReason =
  | "authority-denied"
  | "role-denied"
  | "scope-denied"
  | "signature-invalid"
  | "receipt-not-found"
  | "malformed-receipt"
  | "operation-mismatch"
  | "decision-identity-mismatch"
  | "security-field-mismatch"
  | "scope-mismatch"
  | "invalid-digest"
  | "invalid-replay-identity"
  | "expired"
  | "not-yet-valid"
  | "superseded";

/** Result returned by the Finance THB policy verifier. */
export type FinanceThbPolicyApprovalVerificationResult =
  | { readonly decision: "allow"; readonly receipt: Receipt }
  | { readonly decision: "replay"; readonly receipt: Receipt }
  | { readonly decision: "conflict"; readonly reason: "replay-conflict" }
  | {
      readonly decision: "deny";
      readonly reason: FinanceThbPolicyApprovalDenyReason;
    }
  | FinanceThbPolicyApprovalError;

/** Public Company Identity Finance THB policy approval attestor. */
export interface FinanceThbPolicyApprovalAttestor {
  /**
   * Verifies one policy receipt and records exactly one terminal audit event.
   * @param input Caller receipt, trusted scope, and optional replay receipt.
   * @returns A frozen allow, replay, conflict, or denial result.
   * @throws A stable error when a dependency or audit append fails.
   */
  verify(
    input: FinanceThbPolicyApprovalVerificationInput,
  ): Promise<FinanceThbPolicyApprovalVerificationResult>;
}

type PlainRecord = Record<string, unknown>;

function isPlainRecord(value: unknown): value is PlainRecord {
  try {
    return (
      value !== null &&
      typeof value === "object" &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  } catch {
    return false;
  }
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as PlainRecord)) {
      freezeDeep(nested);
    }
    Object.freeze(value);
  }
  return value;
}

function isRuntimeProxy(value: object): boolean {
  try {
    return nodeTypes.isProxy(value);
  } catch {
    return true;
  }
}

function readOwnDataValue(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !("value" in descriptor)) {
    throw new Error("accessor-backed boundary value");
  }
  return descriptor.value;
}

function captureExternalValue(value: unknown, depth = 0): unknown {
  if (depth > 12) {
    throw new Error("boundary nesting limit");
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (isRuntimeProxy(value)) {
    throw new Error("proxy-backed boundary value");
  }
  if (Array.isArray(value)) {
    const lengthValue = readOwnDataValue(value, "length");
    if (typeof lengthValue !== "number") {
      throw new Error("boundary array length");
    }
    const length = lengthValue;
    if (!Number.isSafeInteger(length) || length > MAX_ARRAY_ITEMS) {
      throw new Error("boundary array limit");
    }
    const keys = Reflect.ownKeys(value);
    const keySet = new Set(keys);
    if (!keySet.has("length") || keys.length !== length + 1) {
      throw new Error("boundary array keys");
    }
    const result: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const key = String(index);
      if (!keySet.has(key)) {
        throw new Error("boundary array hole");
      }
      result.push(
        captureExternalValue(readOwnDataValue(value, key), depth + 1),
      );
    }
    return result;
  }
  if (!isPlainRecord(value)) {
    throw new Error("boundary object prototype");
  }
  const keys = Reflect.ownKeys(value);
  const stringKeys = keys.filter(
    (key): key is string => typeof key === "string",
  );
  if (stringKeys.length !== keys.length) {
    throw new Error("boundary symbol key");
  }
  const result: PlainRecord = {};
  for (const key of stringKeys) {
    result[key] = captureExternalValue(readOwnDataValue(value, key), depth + 1);
  }
  return result;
}

function parseReceipt(value: unknown): Receipt | undefined {
  try {
    const result = receiptSchema.safeParse(value);
    return result.success ? freezeDeep(result.data) : undefined;
  } catch {
    return undefined;
  }
}

function parseAuthorityResult(value: unknown): AuthorityResult | undefined {
  try {
    const result = authorityResultSchema.safeParse(value);
    return result.success ? freezeDeep(result.data) : undefined;
  } catch {
    return undefined;
  }
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
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

/**
 * Encodes the reviewed receipt fields with length framing and explicit optionality.
 * @param receipt Validated receipt whose output digests are excluded from the input.
 * @param domain Domain separator for content or replay identity.
 * @returns Canonical UTF-8 bytes for SHA-256.
 */
function encodeCanonicalReceipt(receipt: Receipt, domain: string): Buffer {
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
  return Buffer.concat(parts);
}

function calculateCanonicalDigest(receipt: Receipt, domain: string): string {
  const digest = createHash("sha256")
    .update(encodeCanonicalReceipt(receipt, domain))
    .digest();
  if (digest.byteLength !== 32) {
    throw new Error("canonical digest length");
  }
  const hexadecimal = digest.toString("hex");
  if (!/^[a-f0-9]{64}$/u.test(hexadecimal)) {
    throw new Error("canonical digest format");
  }
  return hexadecimal;
}

function canonicalDigestReason(
  receipt: Receipt,
): "invalid-digest" | "invalid-replay-identity" | undefined {
  try {
    if (
      receipt.contentDigest !==
      calculateCanonicalDigest(receipt, CONTENT_DIGEST_DOMAIN)
    ) {
      return "invalid-digest";
    }
    if (
      receipt.replayIdentity !==
      calculateCanonicalDigest(receipt, REPLAY_IDENTITY_DOMAIN)
    ) {
      return "invalid-replay-identity";
    }
    return undefined;
  } catch {
    return "invalid-digest";
  }
}

function valueAt(record: unknown, key: string): unknown {
  return isPlainRecord(record) ? record[key] : undefined;
}

function classifyReceiptFailure(
  value: unknown,
): Extract<
  FinanceThbPolicyApprovalDenyReason,
  | "malformed-receipt"
  | "operation-mismatch"
  | "invalid-digest"
  | "invalid-replay-identity"
  | "security-field-mismatch"
> {
  const receipt = isPlainRecord(value) ? value : undefined;
  if (receipt?.operation !== VALUATION_OPERATION) {
    return "operation-mismatch";
  }
  if (!isDigest(receipt?.contentDigest)) {
    return "invalid-digest";
  }
  if (!isDigest(receipt?.replayIdentity)) {
    return "invalid-replay-identity";
  }
  const evidence = valueAt(receipt?.decisionEvidence, "decisionId");
  if (
    typeof receipt?.decisionId === "string" &&
    typeof evidence === "string" &&
    receipt.decisionId !== evidence
  ) {
    return "security-field-mismatch";
  }
  return "malformed-receipt";
}

function scopeEquals(left: Scope, right: Scope): boolean {
  return (
    left.companyId === right.companyId &&
    (left.schoolId === undefined
      ? right.schoolId === undefined
      : left.schoolId === right.schoolId)
  );
}

function jsonEquals(left: unknown, right: unknown): boolean {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function receiptIsInternallyBound(receipt: Receipt): boolean {
  if (
    receipt.operation !== VALUATION_OPERATION ||
    receipt.signer.source !== "company-identity" ||
    receipt.decisionEvidence.source !== "company-identity" ||
    receipt.decisionEvidence.operation !== POLICY_APPROVAL_OPERATION
  ) {
    return false;
  }
  if (
    receipt.signer.actorKind !== "authenticated-owner" ||
    !receipt.signer.appRoleIds.includes(APPROVED_SIGNER_ROLE_ID)
  ) {
    return false;
  }
  if (receipt.decisionId !== receipt.decisionEvidence.decisionId) {
    return false;
  }
  if (receipt.contentDigest !== receipt.decisionEvidence.contentDigest) {
    return false;
  }
  if (receipt.signer.organizationId !== receipt.scope.companyId) {
    return false;
  }
  if (
    receipt.scope.schoolId !== undefined &&
    !receipt.signer.schoolIds?.includes(receipt.scope.schoolId)
  ) {
    return false;
  }
  return true;
}

function authorityMatchesReceipt(
  authority: Extract<AuthorityResult, { decision: "allow" }>,
  receipt: Receipt,
): boolean {
  return (
    scopeEquals(authority.scope, receipt.scope) &&
    jsonEquals(authority.signer, receipt.signer) &&
    authority.decisionEvidence.source === receipt.decisionEvidence.source &&
    authority.decisionEvidence.operation ===
      receipt.decisionEvidence.operation &&
    authority.decisionEvidence.attestationId ===
      receipt.decisionEvidence.attestationId &&
    authority.decisionEvidence.signature ===
      receipt.decisionEvidence.signature &&
    authority.decisionEvidence.contentDigest ===
      receipt.decisionEvidence.contentDigest &&
    authority.contentDigest === receipt.contentDigest
  );
}

function authorityMatchesLedger(
  authority: Extract<AuthorityResult, { decision: "allow" }>,
  receipt: Receipt,
): boolean {
  return (
    authority.decisionId === receipt.decisionId &&
    authorityMatchesReceipt(authority, receipt)
  );
}

interface SafeAuditReceipt {
  readonly decisionId: string;
  readonly scope: Scope;
  readonly actor: FinanceThbPolicyApprovalAuditActor;
  readonly claimsVersion: string | null;
  readonly policyVersion: string;
  readonly contentDigest: string;
}

function safeText(value: unknown, fallback: string): string {
  return isSafeText(value) ? value : fallback;
}

function safeDigest(value: unknown): string {
  return isDigest(value) ? value : DEFAULT_SAFE_DIGEST;
}

function auditValueForActor(value: unknown, fallback: unknown): unknown {
  return valueAt(valueAt(value, "signer"), "actorKind") ===
    "authenticated-owner"
    ? fallback
    : value;
}

function createSafeAuditReceipt(value: unknown): SafeAuditReceipt {
  const receipt = isPlainRecord(value) ? value : {};
  const scopeValue = valueAt(receipt.scope, "companyId");
  const schoolValue = valueAt(receipt.scope, "schoolId");
  const signer = isPlainRecord(receipt.signer) ? receipt.signer : {};
  const evidence = isPlainRecord(receipt.decisionEvidence)
    ? receipt.decisionEvidence
    : {};
  const actorKind = signer.actorKind;
  const actor: FinanceThbPolicyApprovalAuditActor =
    actorKind === "authenticated-owner" && isSafeText(signer.subjectId)
      ? {
          kind: "authenticated-owner",
          subjectId: signer.subjectId,
        }
      : { kind: "unauthenticated" };
  return Object.freeze({
    decisionId: safeText(receipt.decisionId, DEFAULT_SAFE_DECISION_ID),
    scope: Object.freeze({
      companyId: safeText(scopeValue, DEFAULT_SAFE_COMPANY_ID),
      ...(isSafeText(schoolValue) ? { schoolId: schoolValue } : {}),
    }),
    actor,
    claimsVersion: isSafeText(signer.claimsVersion)
      ? signer.claimsVersion
      : null,
    policyVersion: safeText(signer.policyVersion, DEFAULT_SAFE_POLICY_VERSION),
    contentDigest: safeDigest(valueAt(evidence, "contentDigest")),
  });
}

function createError(
  code: FinanceThbPolicyApprovalErrorCode,
): FinanceThbPolicyApprovalError {
  return new FinanceThbPolicyApprovalError(code);
}

function reasonToOutcome(
  reason: string,
): FinanceThbPolicyApprovalAuditEvent["outcome"] {
  return reason === "authority-accepted" || reason === "replay"
    ? "SUCCEEDED"
    : reason === "dependency-failure" ||
        reason === "malformed-dependency-result"
      ? "FAILED"
      : "DENIED";
}

/** Creates a Company Identity-owned Finance THB policy approval attestor.
 * @param input Captured authority, receipt ledger, audit, and trusted-source ports.
 * @returns A frozen policy approval attestor with stable boundary errors.
 * @throws When a required dependency or dependency method is invalid.
 */
export function createFinanceThbPolicyApprovalAttestor(
  input: FinanceThbPolicyApprovalFactoryInput,
): FinanceThbPolicyApprovalAttestor {
  let authorityPort: FinanceThbPolicyApprovalAuthorityPort | undefined;
  let receiptLedger: FinanceThbPolicyApprovalReceiptLedgerPort | undefined;
  let auditPort: FinanceThbPolicyApprovalAuditPort | undefined;
  let trustedAuditSources:
    | FinanceThbPolicyApprovalTrustedAuditSources
    | undefined;
  try {
    authorityPort = input?.authorityPort;
    receiptLedger = input?.receiptLedger;
    auditPort = input?.auditPort;
    trustedAuditSources = input?.trustedAuditSources;
  } catch {
    throw createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID");
  }

  let authorityVerify: unknown;
  let ledgerLookup: unknown;
  let auditAppend: unknown;
  let createEventId: unknown;
  let createRequestId: unknown;
  let createCorrelationId: unknown;
  let now: unknown;
  try {
    authorityVerify = authorityPort?.verify;
    ledgerLookup = receiptLedger?.lookup;
    auditAppend = auditPort?.append;
    createEventId = trustedAuditSources?.createEventId;
    createRequestId = trustedAuditSources?.createRequestId;
    createCorrelationId = trustedAuditSources?.createCorrelationId;
    now = trustedAuditSources?.now;
  } catch {
    throw createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID");
  }
  if (
    typeof authorityVerify !== "function" ||
    typeof ledgerLookup !== "function" ||
    typeof auditAppend !== "function" ||
    typeof createEventId !== "function" ||
    typeof createRequestId !== "function" ||
    typeof createCorrelationId !== "function" ||
    typeof now !== "function" ||
    authorityPort === undefined ||
    receiptLedger === undefined ||
    auditPort === undefined ||
    trustedAuditSources === undefined
  ) {
    throw createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID");
  }

  const verifyAuthority = (
    authorityVerify as FinanceThbPolicyApprovalAuthorityPort["verify"]
  ).bind(authorityPort);
  const lookupReceipt = (
    ledgerLookup as FinanceThbPolicyApprovalReceiptLedgerPort["lookup"]
  ).bind(receiptLedger);
  const appendAudit = (
    auditAppend as FinanceThbPolicyApprovalAuditPort["append"]
  ).bind(auditPort);
  const createEvent = (createEventId as () => string).bind(trustedAuditSources);
  const createRequest = (createRequestId as () => string).bind(
    trustedAuditSources,
  );
  const createCorrelation = (createCorrelationId as () => string).bind(
    trustedAuditSources,
  );
  const readNow = (now as () => Date).bind(trustedAuditSources);

  async function appendTerminalAudit(
    receiptValue: unknown,
    reasonCode: string,
    idempotencyReplay: boolean,
  ): Promise<void> {
    try {
      const receipt = createSafeAuditReceipt(receiptValue);
      const eventId = createEvent();
      const requestId = createRequest();
      const correlationId = createCorrelation();
      const currentTime = readNow();
      if (
        !isSafeText(eventId) ||
        !isSafeText(requestId) ||
        !isSafeText(correlationId) ||
        !(currentTime instanceof Date) ||
        Number.isNaN(currentTime.getTime()) ||
        !isSafeText(reasonCode)
      ) {
        throw new Error("trusted audit source invalid");
      }
      const occurredAt = currentTime.toISOString();
      const metadata = projectSecretSafeAuditMetadata({
        source: "finance-operations",
        resourceType: "finance-thb-owner-decision",
        objectId: receipt.decisionId,
        requestId,
        eventId,
        occurredAt,
        actorKind: receipt.actor.kind,
        actorSubjectId:
          receipt.actor.kind === "authenticated-owner"
            ? receipt.actor.subjectId
            : null,
        claimsVersion: receipt.claimsVersion,
        policyVersion: receipt.policyVersion,
        sourceFingerprint: receipt.contentDigest,
        idempotencyReplay,
        ...(receipt.scope.schoolId === undefined
          ? {}
          : { schoolId: receipt.scope.schoolId }),
      });
      const event = freezeDeep({
        eventId,
        requestId,
        correlationId,
        occurredAt,
        operation: AUDIT_OPERATION,
        outcome: reasonToOutcome(reasonCode),
        reasonCode,
        actor: receipt.actor,
        scope: receipt.scope,
        metadata,
      } satisfies FinanceThbPolicyApprovalAuditEvent);
      await appendAudit(event);
    } catch {
      throw createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED");
    }
  }

  async function verify(
    rawInput: FinanceThbPolicyApprovalVerificationInput,
  ): Promise<FinanceThbPolicyApprovalVerificationResult> {
    let capturedInput: unknown;
    try {
      capturedInput = captureExternalValue(rawInput);
    } catch {
      throw createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_INVALID");
    }

    const envelope = z
      .strictObject({
        operation: z.literal(POLICY_APPROVAL_OPERATION),
        receipt: z.unknown(),
        expectedScope: scopeSchema,
        existingReceipt: z.unknown().optional(),
      })
      .safeParse(capturedInput);
    if (!envelope.success) {
      const receiptValue = valueAt(capturedInput, "receipt");
      const reason =
        valueAt(capturedInput, "operation") !== POLICY_APPROVAL_OPERATION
          ? "operation-mismatch"
          : classifyReceiptFailure(receiptValue);
      await appendTerminalAudit(receiptValue, reason, false);
      return Object.freeze({ decision: "deny", reason });
    }

    const receiptValue = envelope.data.receipt;
    const receipt = parseReceipt(receiptValue);
    if (receipt === undefined) {
      const reason = classifyReceiptFailure(receiptValue);
      await appendTerminalAudit(receiptValue, reason, false);
      return Object.freeze({ decision: "deny", reason });
    }
    if (receipt.operation !== VALUATION_OPERATION) {
      await appendTerminalAudit(receipt, "operation-mismatch", false);
      return Object.freeze({ decision: "deny", reason: "operation-mismatch" });
    }
    const digestReason = canonicalDigestReason(receipt);
    if (digestReason !== undefined) {
      await appendTerminalAudit(receipt, digestReason, false);
      return Object.freeze({ decision: "deny", reason: digestReason });
    }
    if (!receiptIsInternallyBound(receipt)) {
      await appendTerminalAudit(receipt, "security-field-mismatch", false);
      return Object.freeze({
        decision: "deny",
        reason: "security-field-mismatch",
      });
    }
    if (!scopeEquals(receipt.scope, envelope.data.expectedScope)) {
      await appendTerminalAudit(receipt, "scope-mismatch", false);
      return Object.freeze({ decision: "deny", reason: "scope-mismatch" });
    }

    const authorityInput: FinanceThbPolicyApprovalAuthorityInput = freezeDeep({
      operation: POLICY_APPROVAL_OPERATION,
      decisionId: receipt.decisionId,
      expectedScope: receipt.scope,
      contentDigest: receipt.contentDigest,
      decisionEvidence: receipt.decisionEvidence,
    });
    let authorityRaw: unknown;
    try {
      authorityRaw = await verifyAuthority(authorityInput);
    } catch {
      await appendTerminalAudit(receipt, "dependency-failure", false);
      throw createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED");
    }

    let capturedAuthority: unknown;
    try {
      capturedAuthority = captureExternalValue(authorityRaw);
    } catch {
      await appendTerminalAudit(receipt, "malformed-dependency-result", false);
      return createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED");
    }
    const authority = parseAuthorityResult(capturedAuthority);
    if (authority === undefined) {
      await appendTerminalAudit(
        auditValueForActor(capturedAuthority, receipt),
        "malformed-dependency-result",
        false,
      );
      return createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED");
    }
    if (authority.decision === "deny") {
      await appendTerminalAudit(receipt, authority.reason, false);
      return Object.freeze({ decision: "deny", reason: authority.reason });
    }
    if (
      authority.signatureVerified !== true ||
      authority.decisionEvidence.decisionId !== authority.decisionId ||
      authority.signer.actorKind !== "authenticated-owner" ||
      !authority.signer.appRoleIds.includes(APPROVED_SIGNER_ROLE_ID) ||
      authority.decisionEvidence.contentDigest !== authority.contentDigest ||
      (authority.decisionId === receipt.decisionId &&
        !authorityMatchesReceipt(authority, receipt)) ||
      (authority.scope.schoolId !== undefined &&
        !authority.signer.schoolIds?.includes(authority.scope.schoolId)) ||
      authority.signer.organizationId !== authority.scope.companyId
    ) {
      await appendTerminalAudit(
        auditValueForActor(authority, receipt),
        "security-field-mismatch",
        false,
      );
      return Object.freeze({
        decision: "deny",
        reason: "security-field-mismatch",
      });
    }

    let ledgerRaw: unknown;
    try {
      ledgerRaw = await lookupReceipt({
        operation: POLICY_APPROVAL_OPERATION,
        decisionId: authority.decisionId,
      });
    } catch {
      await appendTerminalAudit(receipt, "dependency-failure", false);
      throw createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED");
    }
    if (ledgerRaw === undefined || ledgerRaw === null) {
      await appendTerminalAudit(receipt, "receipt-not-found", false);
      return Object.freeze({ decision: "deny", reason: "receipt-not-found" });
    }

    let capturedLedger: unknown;
    try {
      capturedLedger = captureExternalValue(ledgerRaw);
    } catch {
      await appendTerminalAudit(receipt, "malformed-dependency-result", false);
      return createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED");
    }
    const ledgerReceipt = parseReceipt(capturedLedger);
    if (ledgerReceipt === undefined) {
      await appendTerminalAudit(
        auditValueForActor(capturedLedger, receipt),
        "malformed-dependency-result",
        false,
      );
      return createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED");
    }
    if (canonicalDigestReason(ledgerReceipt) !== undefined) {
      await appendTerminalAudit(
        auditValueForActor(ledgerReceipt, receipt),
        "malformed-dependency-result",
        false,
      );
      return createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED");
    }
    if (!receiptIsInternallyBound(ledgerReceipt)) {
      await appendTerminalAudit(
        auditValueForActor(ledgerReceipt, receipt),
        "security-field-mismatch",
        false,
      );
      return Object.freeze({
        decision: "deny",
        reason: "security-field-mismatch",
      });
    }
    if (!authorityMatchesLedger(authority, ledgerReceipt)) {
      await appendTerminalAudit(receipt, "security-field-mismatch", false);
      return Object.freeze({
        decision: "deny",
        reason: "security-field-mismatch",
      });
    }
    if (ledgerReceipt.decisionId !== receipt.decisionId) {
      await appendTerminalAudit(
        ledgerReceipt,
        "decision-identity-mismatch",
        false,
      );
      return Object.freeze({
        decision: "deny",
        reason: "decision-identity-mismatch",
      });
    }
    if (!jsonEquals(ledgerReceipt, receipt)) {
      await appendTerminalAudit(receipt, "security-field-mismatch", false);
      return Object.freeze({
        decision: "deny",
        reason: "security-field-mismatch",
      });
    }

    let currentTime: Date;
    try {
      currentTime = readNow();
      if (
        !(currentTime instanceof Date) ||
        Number.isNaN(currentTime.getTime())
      ) {
        throw new Error("invalid trusted time");
      }
    } catch {
      await appendTerminalAudit(receipt, "dependency-failure", false);
      throw createError("COMPANY_IDENTITY_FINANCE_THB_POLICY_APPROVAL_FAILED");
    }
    const validFrom = new Date(ledgerReceipt.validFrom);
    const expiresAt = new Date(ledgerReceipt.expiresAt);
    if (currentTime < validFrom) {
      await appendTerminalAudit(ledgerReceipt, "not-yet-valid", false);
      return Object.freeze({ decision: "deny", reason: "not-yet-valid" });
    }
    if (currentTime >= expiresAt) {
      await appendTerminalAudit(ledgerReceipt, "expired", false);
      return Object.freeze({ decision: "deny", reason: "expired" });
    }
    if (ledgerReceipt.supersededByDecisionId !== undefined) {
      await appendTerminalAudit(ledgerReceipt, "superseded", false);
      return Object.freeze({ decision: "deny", reason: "superseded" });
    }

    const hasExistingReceipt =
      isPlainRecord(envelope.data) &&
      Object.prototype.hasOwnProperty.call(envelope.data, "existingReceipt");
    if (hasExistingReceipt && envelope.data.existingReceipt !== undefined) {
      const existingReceipt = parseReceipt(envelope.data.existingReceipt);
      if (existingReceipt === undefined) {
        await appendTerminalAudit(receipt, "malformed-receipt", false);
        return Object.freeze({ decision: "deny", reason: "malformed-receipt" });
      }
      if (jsonEquals(existingReceipt, receipt)) {
        await appendTerminalAudit(existingReceipt, "replay", true);
        return Object.freeze({ decision: "replay", receipt: existingReceipt });
      }
      await appendTerminalAudit(receipt, "replay-conflict", false);
      return Object.freeze({
        decision: "conflict",
        reason: "replay-conflict",
      });
    }

    await appendTerminalAudit(ledgerReceipt, "authority-accepted", false);
    return Object.freeze({ decision: "allow", receipt: ledgerReceipt });
  }

  return Object.freeze({ verify });
}
