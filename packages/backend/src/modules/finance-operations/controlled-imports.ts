import { z } from "zod";

import type { FinanceAuditEvent, FinanceAuditPort } from "./audit.js";
import {
  financeOperationAuthorizationInputSchema,
  financeOperationScopeSchema,
  financeSourceProvenanceSchema,
  isHistoricalPrivateEvidencePreparation,
  type FinanceOperationAuthorizationInput,
  type FinanceOperationScope,
  type HistoricalPrivateEvidenceFact,
} from "./contracts.js";
import type { DurableJobInput } from "./port-contracts.js";
import type * as FinancePorts from "./ports.js";
import { financeRecordSchema, type FinanceRecord } from "./records.js";

const normalVersion = "finance-controlled-import-normalization-v1" as const;
const jobVersion = "finance-controlled-import-job-v1" as const;
const digest = z.string().regex(/^[a-f0-9]{64}$/u);
const safeTextSchema = z
  .string()
  .min(1)
  .max(128)
  .refine(
    (value) =>
      Array.from(value).every((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        return codePoint > 0x1f && codePoint !== 0x7f;
      }) && !/<script|@|[{}]/iu.test(value),
    "Unsafe source text",
  );
const decimalSchema = z
  .string()
  .regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u);
const moneyFactSchema = z.strictObject({
  factId: safeTextSchema,
  kind: z.literal("money"),
  amountDecimal: decimalSchema,
  sourceText: safeTextSchema.optional(),
});
const countFactSchema = z.strictObject({
  factId: safeTextSchema,
  kind: z.literal("count"),
  countText: safeTextSchema,
});
const voucherSchema = z.strictObject({
  voucherNumberText: safeTextSchema,
  sourceDateText: safeTextSchema,
  grossDecimal: decimalSchema,
  sourceStatedWhtDecimal: decimalSchema,
  netDecimal: decimalSchema,
});
const sourceTaxSchema = z.strictObject({
  label: safeTextSchema,
  rateText: safeTextSchema,
});
const documentSchema = z.discriminatedUnion("sourceDocumentKind", [
  z.strictObject({
    sourceDocumentId: safeTextSchema,
    logicalDocumentId: safeTextSchema,
    sourceDocumentKind: z.literal("school-billing-invoice"),
    variantId: safeTextSchema.optional(),
    ambiguityGroupId: safeTextSchema.optional(),
    thaiTaxDocumentStatus: z.literal("unresolved"),
    currency: z.string().regex(/^[A-Z]{3}$/u),
    facts: z.array(z.union([moneyFactSchema, countFactSchema])).min(1),
  }),
  z.strictObject({
    sourceDocumentId: safeTextSchema,
    logicalDocumentId: safeTextSchema,
    sourceDocumentKind: z.literal("payroll-summary"),
    thaiTaxDocumentStatus: z.literal("unresolved"),
    currency: z.string().regex(/^[A-Z]{3}$/u),
    vouchers: z.array(voucherSchema).min(1),
  }),
  z.strictObject({
    sourceDocumentId: safeTextSchema,
    logicalDocumentId: safeTextSchema,
    sourceDocumentKind: z.literal("payment-receipt"),
    thaiTaxDocumentStatus: z.enum(["not-source-asserted", "unresolved"]),
    currency: z.string().regex(/^[A-Z]{3}$/u),
    facts: z.array(moneyFactSchema).min(1),
  }),
  z.strictObject({
    sourceDocumentId: safeTextSchema,
    logicalDocumentId: safeTextSchema,
    sourceDocumentKind: z.literal("foreign-workspace-invoice"),
    thaiTaxDocumentStatus: z.literal("not-source-asserted"),
    sourceStatedTax: sourceTaxSchema,
    currency: z.string().regex(/^[A-Z]{3}$/u),
    facts: z.array(moneyFactSchema).min(1),
  }),
]);
const envelopeSchema = z.strictObject({
  envelopeVersion: z.literal("finance-controlled-source-envelope-v1"),
  scope: financeOperationScopeSchema,
  sourceSystem: safeTextSchema,
  sourceVersion: safeTextSchema,
  sourceRecordId: safeTextSchema,
  sourceAcceptance: z.strictObject({
    port: z.literal("private-evidence-storage"),
    snapshot: z.strictObject({
      evidenceReference: z.string(),
      payloadDigest: digest,
    }),
  }),
  evidenceAuthorization: z.strictObject({
    evidenceReference: z.string(),
    payloadDigest: digest,
  }),
  document: documentSchema,
});
const normalizationSchema = z
  .strictObject({
    normalizationVersion: z.literal(normalVersion),
    scope: financeOperationScopeSchema,
    batchId: safeTextSchema,
    acceptedSourceEnvelopes: z.array(envelopeSchema).min(1),
    trustedPreparation: z.unknown().optional(),
    trustedPreparations: z.array(z.unknown()).optional(),
  })
  .superRefine((value, context) => {
    const preparations =
      value.trustedPreparation === undefined
        ? value.trustedPreparations
        : value.trustedPreparations === undefined
          ? [value.trustedPreparation]
          : undefined;
    if (
      preparations === undefined ||
      preparations.length !== value.acceptedSourceEnvelopes.length
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Trusted preparation count is invalid",
      });
    }
  });
const authorizationDecisionSchema = z.strictObject({
  decision: z.enum(["allow", "deny"]),
});
const preparedPlanCapability = Symbol("controlled-import-plan");
const preparedReadyPlans = new WeakSet<object>();

/** A normalized source snapshot. */
export interface PreparedControlledSourceSnapshot {
  readonly sourceDocumentId: string;
  readonly logicalDocumentId: string;
  readonly sourceDocumentKind: string;
  readonly variantId?: string;
  readonly thaiTaxDocumentStatus: "not-source-asserted" | "unresolved";
  readonly sourceStatedTax?: Readonly<{
    readonly label: string;
    readonly rateText: string;
  }>;
  readonly facts: readonly Record<string, unknown>[];
}
/** An immutable prepared import batch. */
export type PreparedControlledImportBatch =
  | {
      readonly status: "ready";
      readonly normalizationVersion: typeof normalVersion;
      readonly scope: Readonly<FinanceOperationScope>;
      readonly batchId: string;
      readonly batchDigest: string;
      readonly snapshots: readonly PreparedControlledSourceSnapshot[];
      readonly records: readonly FinanceRecord[];
    }
  | {
      readonly status: "unresolved";
      readonly normalizationVersion: typeof normalVersion;
      readonly reason: "source-variant-ambiguity";
      readonly scope: Readonly<FinanceOperationScope>;
      readonly batchId: string;
      readonly variants: readonly PreparedControlledSourceSnapshot[];
      readonly records: readonly [];
    };
/** An accepted batch identity. */
export interface AcceptedControlledImportBatch {
  readonly scope: Readonly<FinanceOperationScope>;
  readonly sourceSystem: string;
  readonly sourceVersion: string;
  readonly importBatchId: string;
  readonly batchDigest: string;
  readonly acceptedRecordIds: readonly string[];
}
/** A replay classification result. */
export type ControlledImportReplayResult =
  | { readonly status: "replay"; readonly acceptedRecordIds: readonly string[] }
  | {
      readonly status: "conflict";
      readonly acceptedRecordIds: readonly string[];
      readonly reason:
        | "scope-mismatch"
        | "source-system-mismatch"
        | "source-version-mismatch"
        | "import-batch-id-mismatch"
        | "payload-digest-mismatch";
    };
/** A durable controlled-import job. */
export interface ControlledImportDurableJobIntent extends DurableJobInput {
  readonly jobContractVersion: typeof jobVersion;
  readonly operation: "controlled-import:apply-batch";
}
/** An atomic repository result. */
export type ControlledImportAtomicResult =
  | {
      readonly status: "accepted" | "replay";
      readonly recordIds: readonly string[];
    }
  | {
      readonly status: "conflict";
      readonly recordIds: readonly string[];
      readonly reason: "payload-digest-mismatch";
    };
const controlledImportAtomicResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("accepted"),
    recordIds: z.array(z.string()),
  }),
  z.strictObject({
    status: z.literal("replay"),
    recordIds: z.array(z.string()),
  }),
  z.strictObject({
    status: z.literal("conflict"),
    recordIds: z.array(z.string()),
    reason: z.literal("payload-digest-mismatch"),
  }),
]);
/** The injected persistence seam. */
export interface ControlledImportAtomicRepository {
  applyBatchAtomically(input: {
    readonly plan: Extract<PreparedControlledImportBatch, { status: "ready" }>;
    readonly durableJob: Readonly<ControlledImportDurableJobIntent>;
    readonly audit: Readonly<FinanceAuditEvent>;
  }): Promise<ControlledImportAtomicResult>;
}
/** Command dependencies. */
export interface AcceptControlledImportBatchRequest {
  readonly plan: Extract<PreparedControlledImportBatch, { status: "ready" }>;
  readonly authorizationInput: FinanceOperationAuthorizationInput;
  readonly authorizationPort: FinancePorts.CompanyIdentityAuthorizationPort;
  readonly auditPort: FinanceAuditPort;
  readonly repository: ControlledImportAtomicRepository;
  readonly requestId: string;
  readonly correlationId: string;
  readonly occurredAt: string;
}
/** A controlled-import command error. */
export class ControlledImportOperationError extends Error {
  /** The machine-readable reason. */ readonly reason:
    | "authorization-denied"
    | "scope-mismatch";
  /** Creates an error. @param reason The rejection reason. */ constructor(
    reason: "authorization-denied" | "scope-mismatch",
  ) {
    super(reason);
    this.reason = reason;
  }
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const item of Object.values(value as object)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
function copy<T>(value: T): T {
  return structuredClone(value);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid controlled import");
  return value as Record<string, unknown>;
}
function scopeEqual(
  a: Readonly<FinanceOperationScope>,
  b: Readonly<FinanceOperationScope>,
): boolean {
  return a.companyId === b.companyId && a.schoolId === b.schoolId;
}
function text(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 128 ||
    [...value].some((x) => (x.codePointAt(0) ?? 0) < 32) ||
    /<script|@|[{}]/iu.test(value)
  )
    throw new Error("unsafe source text");
  return value;
}
function minor(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u.test(value)
  )
    throw new Error("invalid decimal");
  const neg = value[0] === "-",
    [n, f = ""] = (neg ? value.slice(1) : value).split(".");
  if ((n as string).length > 38)
    throw new Error("decimal integer limit exceeded");
  const r = (
    BigInt(n as string) * 100n +
    BigInt((f + "00").slice(0, 2))
  ).toString();
  return neg && r !== "0" ? `-${r}` : r;
}

const trustedDocumentMetadata = {
  "payment-receipt": {
    classFactId: "document-class:payment-receipt",
    logicalReferenceFactId: "document-reference:receipt-number",
  },
  "school-billing-invoice": {
    classFactId: "document-class:school-billing-invoice",
    logicalReferenceFactId: "document-reference:invoice-number",
  },
  "payroll-summary": {
    classFactId: "document-class:payroll-summary",
    logicalReferenceFactId: "document-reference:document-number",
  },
  "foreign-workspace-invoice": {
    classFactId: "document-class:foreign-workspace-invoice",
    logicalReferenceFactId: "document-reference:invoice-number",
  },
} as const;

type ControlledDocumentKind = keyof typeof trustedDocumentMetadata;

const logicalDocumentReferenceFactIds = new Set([
  "document-reference:receipt-number",
  "document-reference:invoice-number",
  "document-reference:document-number",
]);

function requireSingletonFact(
  facts: readonly HistoricalPrivateEvidenceFact[],
  predicate: (fact: HistoricalPrivateEvidenceFact) => boolean,
  description: string,
): HistoricalPrivateEvidenceFact {
  const matches = facts.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(`exactly one ${description} fact is required`);
  }
  return matches[0] as HistoricalPrivateEvidenceFact;
}

function readTrustedDocumentMetadata(input: {
  readonly documentKind: ControlledDocumentKind;
  readonly sourceDocumentId: string;
  readonly logicalDocumentId: string;
  readonly thaiTaxDocumentStatus: "not-source-asserted" | "unresolved";
  readonly variantId?: string;
  readonly ambiguityGroupId?: string;
  readonly sourceIdentity: string;
  readonly sourceRecordId: string;
  readonly facts: readonly HistoricalPrivateEvidenceFact[];
}): {
  readonly sourceDocumentId: string;
  readonly logicalDocumentId: string;
  readonly sourceDocumentKind: ControlledDocumentKind;
  readonly currency: string;
  readonly thaiTaxDocumentStatus: "not-source-asserted" | "unresolved";
  readonly variantId?: string;
  readonly ambiguityGroupId?: string;
  readonly sourceStatedTax?: Readonly<{
    readonly label: string;
    readonly rateText: string;
  }>;
  readonly valueFacts: readonly HistoricalPrivateEvidenceFact[];
} {
  const expected = trustedDocumentMetadata[input.documentKind];
  const classFact = requireSingletonFact(
    input.facts,
    (fact) => fact.factCategory === "document-class",
    "document class",
  );
  if (
    classFact.factId !== expected.classFactId ||
    classFact.value !== input.documentKind
  ) {
    throw new Error("trusted document class does not match the document kind");
  }

  const sourceRecordFact = requireSingletonFact(
    input.facts,
    (fact) =>
      fact.factCategory === "document-reference" &&
      fact.factId === "document-reference:source-record",
    "source record",
  );
  if (
    sourceRecordFact.value !== input.sourceIdentity ||
    sourceRecordFact.value !== input.sourceRecordId ||
    sourceRecordFact.value !== input.sourceDocumentId
  ) {
    throw new Error(
      "trusted source record does not match the document identity",
    );
  }

  const currencyFact = requireSingletonFact(
    input.facts,
    (fact) =>
      fact.factCategory === "currency" &&
      fact.factId === "currency:document-currency",
    "document currency",
  );

  const statusFacts = input.facts.filter(
    (fact) =>
      fact.factCategory === "document-status" &&
      fact.factId === "document-status:thai-tax-document-status",
  );
  if (statusFacts.length === 0) {
    throw new Error("trusted Thai tax document status fact is required");
  }
  if (statusFacts.length > 1) {
    throw new Error("duplicate trusted Thai tax document status fact");
  }
  const thaiTaxDocumentStatus = statusFacts[0]?.value;
  if (
    thaiTaxDocumentStatus !== "unresolved" &&
    thaiTaxDocumentStatus !== "not-source-asserted"
  ) {
    throw new Error("trusted Thai tax document status is invalid");
  }
  if (
    ((input.documentKind === "school-billing-invoice" ||
      input.documentKind === "payroll-summary") &&
      thaiTaxDocumentStatus !== "unresolved") ||
    (input.documentKind === "foreign-workspace-invoice" &&
      thaiTaxDocumentStatus !== "not-source-asserted")
  ) {
    throw new Error("trusted Thai tax document status is invalid");
  }
  if (thaiTaxDocumentStatus !== input.thaiTaxDocumentStatus) {
    throw new Error("trusted Thai tax document status does not match");
  }

  const variantFacts = input.facts.filter(
    (fact) =>
      fact.factCategory === "document-reference" &&
      fact.factId === "document-reference:variant-id",
  );
  const ambiguityGroupFacts = input.facts.filter(
    (fact) =>
      fact.factCategory === "document-reference" &&
      fact.factId === "document-reference:ambiguity-group-id",
  );
  if (variantFacts.length > 1 || ambiguityGroupFacts.length > 1) {
    throw new Error("duplicate trusted school billing metadata fact");
  }
  if (
    input.documentKind !== "school-billing-invoice" &&
    (variantFacts.length !== 0 || ambiguityGroupFacts.length !== 0)
  ) {
    throw new Error(
      "school billing metadata requires a school-billing invoice",
    );
  }
  const variantId = variantFacts[0]?.value;
  const ambiguityGroupId = ambiguityGroupFacts[0]?.value;
  if (
    input.documentKind === "school-billing-invoice" &&
    ((variantId === undefined) !== (input.variantId === undefined) ||
      (ambiguityGroupId === undefined) !==
        (input.ambiguityGroupId === undefined))
  ) {
    throw new Error("trusted school billing metadata is incomplete");
  }
  if (
    input.documentKind === "school-billing-invoice" &&
    (variantId !== input.variantId ||
      ambiguityGroupId !== input.ambiguityGroupId)
  ) {
    throw new Error("trusted school billing metadata does not match");
  }

  const logicalReferenceFacts = input.facts.filter((fact) =>
    logicalDocumentReferenceFactIds.has(fact.factId),
  );
  if (
    logicalReferenceFacts.length > 1 ||
    (logicalReferenceFacts[0] !== undefined &&
      logicalReferenceFacts[0].factId !== expected.logicalReferenceFactId)
  ) {
    throw new Error("trusted logical document reference is invalid");
  }
  const logicalDocumentId =
    logicalReferenceFacts[0]?.value ?? sourceRecordFact.value;
  if (logicalDocumentId !== input.logicalDocumentId) {
    throw new Error("trusted logical document reference does not match");
  }

  const taxFacts = input.facts.filter(
    (fact) => fact.factCategory === "tax-label",
  );
  let sourceStatedTax:
    | Readonly<{ readonly label: string; readonly rateText: string }>
    | undefined;
  if (input.documentKind === "foreign-workspace-invoice") {
    if (taxFacts.length !== 1 || taxFacts[0]?.factId !== "tax-label:gst") {
      throw new Error("exactly one trusted GST fact is required");
    }
    sourceStatedTax = {
      label: text(taxFacts[0].label),
      rateText: text(taxFacts[0].value),
    };
  } else if (taxFacts.length !== 0) {
    throw new Error("tax facts are not allowed for this document kind");
  }

  const valueFacts = input.facts.filter(
    (fact) =>
      fact.factCategory !== "document-class" &&
      fact.factCategory !== "document-status" &&
      fact.factCategory !== "currency" &&
      fact.factCategory !== "tax-label" &&
      fact.factId !== "document-reference:source-record" &&
      fact.factId !== "document-reference:variant-id" &&
      fact.factId !== "document-reference:ambiguity-group-id" &&
      !logicalDocumentReferenceFactIds.has(fact.factId),
  );

  return {
    sourceDocumentId: sourceRecordFact.value,
    logicalDocumentId,
    sourceDocumentKind: input.documentKind,
    currency: currencyFact.value,
    thaiTaxDocumentStatus,
    ...(variantId === undefined ? {} : { variantId }),
    ...(ambiguityGroupId === undefined ? {} : { ambiguityGroupId }),
    ...(sourceStatedTax === undefined ? {} : { sourceStatedTax }),
    valueFacts,
  };
}

type HistoricalNormalizationBinding = NonNullable<
  HistoricalPrivateEvidenceFact["normalizationBinding"]
>;
type DocumentMoneyBinding = Extract<
  HistoricalNormalizationBinding,
  { readonly bindingKind: "document-money" }
>;
type DocumentCountBinding = Extract<
  HistoricalNormalizationBinding,
  { readonly bindingKind: "document-count" }
>;
type PayrollMoneyBinding = Extract<
  HistoricalNormalizationBinding,
  { readonly bindingKind: "payroll-money" }
>;
type PayrollMoneyKind = PayrollMoneyBinding["moneyKind"];

type CallerDocumentFact =
  | Readonly<{
      readonly factId: string;
      readonly kind: "money";
      readonly amountDecimal: string;
      readonly sourceText?: string;
    }>
  | Readonly<{
      readonly factId: string;
      readonly kind: "count";
      readonly countText: string;
    }>;

interface CallerPayrollVoucher {
  readonly voucherNumberText: string;
  readonly sourceDateText: string;
  readonly grossDecimal: string;
  readonly sourceStatedWhtDecimal: string;
  readonly netDecimal: string;
}

type TrustedNormalizedFact =
  | Readonly<{
      readonly kind: "money";
      readonly factId: string;
      readonly amountDecimal: string;
      readonly sourceText?: string;
      readonly payroll?: Readonly<{
        readonly voucherNumberText: string;
        readonly sourceDateText: string;
        readonly moneyKind: PayrollMoneyKind;
      }>;
    }>
  | Readonly<{
      readonly kind: "count";
      readonly factId: string;
      readonly countText: string;
    }>;

const payrollFactIdByMoneyKind: Readonly<Record<PayrollMoneyKind, string>> = {
  gross: "payroll-summary:gross-total",
  "source-stated-wht": "payroll-summary:withholding-total",
  net: "payroll-summary:net-total",
};

const payrollMoneyKinds = [
  "gross",
  "source-stated-wht",
  "net",
] as const satisfies readonly PayrollMoneyKind[];

function requiredNormalizationBinding(
  fact: HistoricalPrivateEvidenceFact,
): HistoricalNormalizationBinding {
  if (fact.normalizationBinding === undefined) {
    throw new Error("trusted normalized fact binding is required");
  }
  return fact.normalizationBinding;
}

function bindTrustedDocumentFacts(input: {
  readonly trustedFacts: readonly HistoricalPrivateEvidenceFact[];
  readonly callerFacts: readonly CallerDocumentFact[];
}): readonly TrustedNormalizedFact[] {
  if (input.trustedFacts.length !== input.callerFacts.length) {
    throw new Error("trusted and caller document fact counts differ");
  }

  const callerFacts = new Map<string, CallerDocumentFact>();
  for (const callerFact of input.callerFacts) {
    if (callerFacts.has(callerFact.factId)) {
      throw new Error("duplicate caller document fact identity");
    }
    callerFacts.set(callerFact.factId, callerFact);
  }

  const trustedFactIds = new Set<string>();
  const matchedCallerFactIds = new Set<string>();
  const normalized: TrustedNormalizedFact[] = [];
  for (const trustedFact of input.trustedFacts) {
    const binding = requiredNormalizationBinding(trustedFact);
    if (binding.bindingKind === "payroll-money") {
      throw new Error("payroll binding is invalid for a document fact");
    }
    if (trustedFactIds.has(binding.normalizedFactId)) {
      throw new Error("duplicate trusted document fact identity");
    }
    trustedFactIds.add(binding.normalizedFactId);

    const callerFact = callerFacts.get(binding.normalizedFactId);
    if (callerFact === undefined) {
      throw new Error("trusted document fact has no caller match");
    }
    matchedCallerFactIds.add(binding.normalizedFactId);

    if (binding.bindingKind === "document-money") {
      const moneyBinding = binding as DocumentMoneyBinding;
      if (
        callerFact.kind !== "money" ||
        callerFact.amountDecimal !== trustedFact.value ||
        callerFact.sourceText !== moneyBinding.sourceText
      ) {
        throw new Error("caller money fact does not match its trusted binding");
      }
      normalized.push({
        kind: "money",
        factId: moneyBinding.normalizedFactId,
        amountDecimal: trustedFact.value,
        ...(moneyBinding.sourceText === undefined
          ? {}
          : { sourceText: moneyBinding.sourceText }),
      });
      continue;
    }

    const countBinding = binding as DocumentCountBinding;
    if (
      callerFact.kind !== "count" ||
      callerFact.countText !== trustedFact.value
    ) {
      throw new Error("caller count fact does not match its trusted binding");
    }
    normalized.push({
      kind: "count",
      factId: countBinding.normalizedFactId,
      countText: trustedFact.value,
    });
  }

  if (matchedCallerFactIds.size !== callerFacts.size) {
    throw new Error("caller document has unbound facts");
  }
  return normalized;
}

function bindTrustedPayrollFacts(input: {
  readonly trustedFacts: readonly HistoricalPrivateEvidenceFact[];
  readonly callerVouchers: readonly CallerPayrollVoucher[];
}): readonly TrustedNormalizedFact[] {
  const trustedVouchers = new Map<
    string,
    {
      readonly sourceDateText: string;
      readonly values: Partial<Record<PayrollMoneyKind, string>>;
    }
  >();

  for (const trustedFact of input.trustedFacts) {
    const binding = requiredNormalizationBinding(trustedFact);
    if (binding.bindingKind !== "payroll-money") {
      throw new Error("document binding is invalid for a payroll fact");
    }
    if (trustedFact.factId !== payrollFactIdByMoneyKind[binding.moneyKind]) {
      throw new Error("payroll fact identifier does not match its money kind");
    }

    const existing = trustedVouchers.get(binding.voucherNumberText);
    const voucher = existing ?? {
      sourceDateText: binding.sourceDateText,
      values: {},
    };
    if (voucher.sourceDateText !== binding.sourceDateText) {
      throw new Error("trusted payroll voucher dates conflict");
    }
    if (voucher.values[binding.moneyKind] !== undefined) {
      throw new Error("duplicate trusted payroll money binding");
    }
    voucher.values[binding.moneyKind] = trustedFact.value;
    if (existing === undefined) {
      trustedVouchers.set(binding.voucherNumberText, voucher);
    }
  }

  const callerVouchers = new Map<string, CallerPayrollVoucher>();
  for (const callerVoucher of input.callerVouchers) {
    if (callerVouchers.has(callerVoucher.voucherNumberText)) {
      throw new Error("duplicate caller payroll voucher identity");
    }
    callerVouchers.set(callerVoucher.voucherNumberText, callerVoucher);
  }
  if (callerVouchers.size !== trustedVouchers.size) {
    throw new Error("trusted and caller payroll voucher counts differ");
  }

  const normalized: TrustedNormalizedFact[] = [];
  const matchedCallerVoucherIds = new Set<string>();
  for (const [voucherNumberText, trustedVoucher] of trustedVouchers) {
    const callerVoucher = callerVouchers.get(voucherNumberText);
    if (callerVoucher === undefined) {
      throw new Error("trusted payroll voucher has no caller match");
    }
    matchedCallerVoucherIds.add(voucherNumberText);
    if (
      trustedVoucher.sourceDateText !== callerVoucher.sourceDateText ||
      trustedVoucher.values.gross === undefined ||
      trustedVoucher.values["source-stated-wht"] === undefined ||
      trustedVoucher.values.net === undefined ||
      trustedVoucher.values.gross !== callerVoucher.grossDecimal ||
      trustedVoucher.values["source-stated-wht"] !==
        callerVoucher.sourceStatedWhtDecimal ||
      trustedVoucher.values.net !== callerVoucher.netDecimal
    ) {
      throw new Error("caller payroll voucher does not match trusted bindings");
    }

    for (const moneyKind of payrollMoneyKinds) {
      normalized.push({
        kind: "money",
        factId: `${voucherNumberText}:${moneyKind}`,
        amountDecimal: trustedVoucher.values[moneyKind] as string,
        payroll: {
          voucherNumberText,
          sourceDateText: trustedVoucher.sourceDateText,
          moneyKind,
        },
      });
    }
  }

  if (matchedCallerVoucherIds.size !== callerVouchers.size) {
    throw new Error("caller payroll has unbound vouchers");
  }
  return normalized;
}

function prov(e: Record<string, unknown>, batch: string, id: string) {
  const a = object(e.sourceAcceptance),
    s = object(a.snapshot),
    v = object(e.evidenceAuthorization);
  if (
    a.port !== "private-evidence-storage" ||
    s.evidenceReference !== v.evidenceReference ||
    s.payloadDigest !== v.payloadDigest
  )
    throw new Error("invalid receipt");
  return financeSourceProvenanceSchema.parse({
    sourceSystem: e.sourceSystem,
    sourceVersion: e.sourceVersion,
    sourceRecordId: id,
    importBatchId: batch,
    payloadDigest: v.payloadDigest,
    evidenceReference: v.evidenceReference,
  });
}

/** Prepares a batch from accepted private-evidence envelopes. @param input The untrusted input. @returns A frozen ready or unresolved batch. */
export function prepareControlledImportBatch(
  input: unknown,
): PreparedControlledImportBatch {
  const raw = normalizationSchema.parse(input);
  const preparations =
    raw.trustedPreparation === undefined
      ? raw.trustedPreparations
      : [raw.trustedPreparation];
  if (preparations === undefined)
    throw new Error("trusted preparation is required");
  const scope = raw.scope,
    batchId = raw.batchId,
    snaps: PreparedControlledSourceSnapshot[] = [],
    records: FinanceRecord[] = [],
    ambiguityGroups: string[] = [],
    ds: string[] = [];
  for (const [index, rawEnvelope] of raw.acceptedSourceEnvelopes.entries()) {
    const preparation = preparations[index];
    if (!isHistoricalPrivateEvidencePreparation(preparation)) {
      throw new Error("trusted preparation is required");
    }
    const e = rawEnvelope,
      d = e.document;
    if (
      !scopeEqual(scope, e.scope) ||
      !scopeEqual(scope, preparation.packet.scope) ||
      !scopeEqual(scope, preparation.evidence.scope) ||
      preparation.packet.source.sourceSystem !== e.sourceSystem ||
      preparation.packet.source.sourceVersion !== e.sourceVersion ||
      preparation.packet.source.sourceIdentity !== e.sourceRecordId ||
      preparation.packet.source.payloadDigest !==
        e.evidenceAuthorization.payloadDigest ||
      preparation.packet.source.evidenceReference !==
        e.evidenceAuthorization.evidenceReference ||
      preparation.evidence.evidenceReference !==
        e.evidenceAuthorization.evidenceReference ||
      preparation.evidence.payloadDigest !==
        e.evidenceAuthorization.payloadDigest
    )
      throw new Error("invalid envelope");
    if (
      e.sourceSystem === "owner-attested-archive" &&
      e.sourceVersion !== "archive-v1"
    )
      throw new Error("invalid source");
    if (
      e.sourceSystem === "sanitized-payroll-summary" &&
      e.sourceRecordId !== "archive-payroll-record-sanitized" &&
      e.sourceRecordId !== d.sourceDocumentId
    )
      throw new Error("invalid source");
    const trustedMetadata = readTrustedDocumentMetadata({
        documentKind: d.sourceDocumentKind,
        sourceDocumentId: d.sourceDocumentId,
        logicalDocumentId: d.logicalDocumentId,
        thaiTaxDocumentStatus: d.thaiTaxDocumentStatus,
        ...(d.sourceDocumentKind === "school-billing-invoice"
          ? {
              variantId: d.variantId,
              ambiguityGroupId: d.ambiguityGroupId,
            }
          : {}),
        sourceIdentity: preparation.packet.source.sourceIdentity,
        sourceRecordId: e.sourceRecordId,
        facts: preparation.packet.facts,
      }),
      base = {
        sourceDocumentId: trustedMetadata.sourceDocumentId,
        logicalDocumentId: trustedMetadata.logicalDocumentId,
        sourceDocumentKind: trustedMetadata.sourceDocumentKind,
        thaiTaxDocumentStatus: trustedMetadata.thaiTaxDocumentStatus,
      },
      currency = text(trustedMetadata.currency),
      facts: Record<string, unknown>[] = [];
    const addMoney = (
      trustedFact: Extract<TrustedNormalizedFact, { readonly kind: "money" }>,
    ) => {
      const id = text(trustedFact.factId),
        amountMinor = minor(trustedFact.amountDecimal),
        p = prov(e, batchId, `${base.sourceDocumentId}#${id}`),
        fact = {
          factId: id,
          kind: "money",
          amountMinor,
          currency,
          ...(trustedFact.sourceText === undefined
            ? {}
            : { sourceText: text(trustedFact.sourceText) }),
          ...(trustedFact.payroll === undefined
            ? {}
            : {
                moneyKind: trustedFact.payroll.moneyKind,
                voucherNumberText: text(trustedFact.payroll.voucherNumberText),
                sourceDateText: text(trustedFact.payroll.sourceDateText),
              }),
          provenance: p,
        };
      facts.push(fact);
      records.push(
        financeRecordSchema.parse({
          scope,
          recordId: `${batchId}:${base.sourceDocumentId}#${id}`,
          money: { amountMinor, currency },
          provenance: p,
        }),
      );
    };
    const normalizedFacts =
      d.sourceDocumentKind === "payroll-summary"
        ? bindTrustedPayrollFacts({
            trustedFacts: trustedMetadata.valueFacts,
            callerVouchers: d.vouchers,
          })
        : bindTrustedDocumentFacts({
            trustedFacts: trustedMetadata.valueFacts,
            callerFacts: d.facts,
          });
    for (const normalizedFact of normalizedFacts) {
      if (normalizedFact.kind === "money") {
        addMoney(normalizedFact);
        continue;
      }
      const factId = text(normalizedFact.factId);
      facts.push({
        factId,
        kind: "count",
        count: text(normalizedFact.countText),
        provenance: prov(e, batchId, `${base.sourceDocumentId}#${factId}`),
      });
    }
    const tax = trustedMetadata.sourceStatedTax;
    const variantId = trustedMetadata.variantId;
    if (trustedMetadata.ambiguityGroupId !== undefined) {
      ambiguityGroups.push(trustedMetadata.ambiguityGroupId);
    }
    snaps.push({
      ...base,
      ...(variantId === undefined ? {} : { variantId: text(variantId) }),
      ...(tax
        ? {
            sourceStatedTax: {
              label: text(tax.label),
              rateText: text(tax.rateText),
            },
          }
        : {}),
      facts,
    });
    ds.push(e.evidenceAuthorization.payloadDigest);
  }
  if (!ds.every((x) => digest.safeParse(x).success))
    throw new Error("invalid digest");
  if (new Set(ambiguityGroups).size !== ambiguityGroups.length)
    return freeze({
      status: "unresolved",
      normalizationVersion: normalVersion,
      reason: "source-variant-ambiguity",
      scope: copy(scope),
      batchId,
      variants: copy(snaps),
      records: [] as const,
    });
  const plan = {
    status: "ready" as const,
    normalizationVersion: normalVersion,
    scope: copy(scope),
    batchId,
    batchDigest: ds.length === 1 ? (ds[0] as string) : ds.join(""),
    snapshots: copy(snaps),
    records: copy(records),
  };
  Object.defineProperty(plan, preparedPlanCapability, { value: true });
  preparedReadyPlans.add(plan);
  return freeze(plan);
}

/** Classifies batch replay. @param input Existing and incoming identities. @returns A frozen classification. */
export function classifyControlledImportBatchReplay(input: {
  readonly existing: AcceptedControlledImportBatch;
  readonly incoming: Omit<AcceptedControlledImportBatch, "acceptedRecordIds">;
}): ControlledImportReplayResult {
  const a = input.existing,
    b = input.incoming,
    r = !scopeEqual(a.scope, b.scope)
      ? "scope-mismatch"
      : a.sourceSystem !== b.sourceSystem
        ? "source-system-mismatch"
        : a.sourceVersion !== b.sourceVersion
          ? "source-version-mismatch"
          : a.importBatchId !== b.importBatchId
            ? "import-batch-id-mismatch"
            : a.batchDigest !== b.batchDigest
              ? "payload-digest-mismatch"
              : undefined;
  return freeze(
    r
      ? {
          status: "conflict" as const,
          acceptedRecordIds: [...a.acceptedRecordIds],
          reason: r,
        }
      : {
          status: "replay" as const,
          acceptedRecordIds: [...a.acceptedRecordIds],
        },
  );
}
/** Prepares a frozen correction. @param input Correction values. @returns A superseding record. */
export function prepareControlledImportCorrection(input: {
  readonly acceptedRecord: FinanceRecord;
  readonly correctionRecordId: string;
  readonly reason: string;
  readonly money: FinanceRecord["money"];
  readonly provenance: FinanceRecord["provenance"];
}): FinanceRecord {
  return freeze(
    financeRecordSchema.parse({
      scope: copy(input.acceptedRecord.scope),
      recordId: input.correctionRecordId,
      money: copy(input.money),
      provenance: copy(input.provenance),
      supersedesRecordId: input.acceptedRecord.recordId,
      correctionReason: input.reason,
    }),
  );
}
/** Creates a durable identity. @param input Scope and batch identity. @returns A collision-free identity. */
export function createControlledImportJobIdentity(input: {
  readonly scope: Readonly<FinanceOperationScope>;
  readonly batchId: string;
}): string {
  const e = (x: string) => `${x.length}:${x}`;
  return [
    jobVersion,
    `company=${e(input.scope.companyId)}`,
    input.scope.schoolId === undefined
      ? "school=none"
      : `school=some:${e(input.scope.schoolId)}`,
    `batch=${e(input.batchId)}`,
  ].join("|");
}
function audit(
  r: AcceptControlledImportBatchRequest,
  outcome: FinanceAuditEvent["outcome"],
): FinanceAuditEvent {
  const s = r.plan.scope,
    p = [
      r.requestId,
      "controlled-import:accept-batch",
      s.companyId,
      s.schoolId ?? "company-scope",
      r.plan.batchId,
      outcome,
    ];
  return freeze({
    eventId: p.map((x) => `${x.length}:${x}`).join("|"),
    actorSubjectId: r.authorizationInput.authorizationEvidence.subjectId,
    operation: "controlled-import:accept-batch",
    objectType: "controlled-import-batch",
    objectId: r.plan.batchId,
    occurredAt: r.occurredAt,
    requestId: r.requestId,
    correlationId: r.correlationId,
    scope: copy(s),
    outcome,
  });
}
/** Authorizes and atomically accepts a batch. @param request Command dependencies. @returns A frozen atomic result. */
export async function acceptControlledImportBatch(
  request: AcceptControlledImportBatchRequest,
): Promise<ControlledImportAtomicResult> {
  if (
    typeof request.plan !== "object" ||
    request.plan === null ||
    Reflect.get(request.plan, preparedPlanCapability) !== true ||
    !preparedReadyPlans.has(request.plan)
  ) {
    throw new Error("prepared plan capability is invalid");
  }
  const auth = financeOperationAuthorizationInputSchema.parse({
    ...request.authorizationInput,
    operation: "controlled-import:accept-batch",
  });
  let decision: z.infer<typeof authorizationDecisionSchema>;
  try {
    decision = authorizationDecisionSchema.parse(
      await request.authorizationPort.authorizeFinanceOperation(
        freeze(copy(auth)),
      ),
    );
  } catch {
    await request.auditPort.append(audit(request, "failed"));
    throw new Error("authorization evaluation failed");
  }
  if (decision.decision === "deny") {
    await request.auditPort.append(audit(request, "denied"));
    throw new ControlledImportOperationError("authorization-denied");
  }
  if (!scopeEqual(auth.scope, request.plan.scope)) {
    await request.auditPort.append(audit(request, "failed"));
    throw new ControlledImportOperationError("scope-mismatch");
  }
  await request.auditPort.append(audit(request, "allowed"));
  const durableJob = freeze({
    jobContractVersion: jobVersion,
    operation: "controlled-import:apply-batch" as const,
    idempotencyKey: createControlledImportJobIdentity({
      scope: request.plan.scope,
      batchId: request.plan.batchId,
    }),
    payloadDigest: request.plan.batchDigest,
    scope: copy(request.plan.scope),
    authorizationEvidence: copy(auth.authorizationEvidence),
  });
  try {
    return freeze(
      copy(
        controlledImportAtomicResultSchema.parse(
          await request.repository.applyBatchAtomically(
            freeze({
              plan: copy(request.plan),
              durableJob,
              audit: audit(request, "succeeded"),
            }),
          ),
        ),
      ),
    );
  } catch (e) {
    await request.auditPort.append(audit(request, "failed"));
    throw e;
  }
}
/** Checks the packet-version contract without a live source action. @param input Packet version input. @returns A no-live-adapter result. */
export async function runHistoricalPrivateEvidencePilot(
  input: unknown,
): Promise<{
  readonly status: "not-admitted";
  readonly packetVersion: "historical-private-evidence-packet.v1";
  readonly liveSourceAdaptersUsed: readonly [];
}> {
  const x = object(input);
  if (
    x.packetVersion !== "historical-private-evidence-packet.v1" ||
    typeof x.sourceSystem !== "string"
  )
    throw new Error("invalid packet");
  return freeze({
    status: "not-admitted" as const,
    packetVersion: "historical-private-evidence-packet.v1" as const,
    liveSourceAdaptersUsed: [] as const,
  });
}
