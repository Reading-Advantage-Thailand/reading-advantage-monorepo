import { z } from "zod";

import type { FinanceAuditEvent, FinanceAuditPort } from "./audit.js";
import {
  financeOperationAuthorizationInputSchema,
  financeOperationScopeSchema,
  financeSourceProvenanceSchema,
  isHistoricalPrivateEvidencePreparation,
  type FinanceOperationAuthorizationInput,
  type FinanceOperationScope,
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
  const r = (
    BigInt(n as string) * 100n +
    BigInt((f + "00").slice(0, 2))
  ).toString();
  return neg && r !== "0" ? `-${r}` : r;
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
    const base = {
        sourceDocumentId: d.sourceDocumentId,
        logicalDocumentId: d.logicalDocumentId,
        sourceDocumentKind: d.sourceDocumentKind,
        thaiTaxDocumentStatus: d.thaiTaxDocumentStatus,
      },
      currency = text(d.currency),
      facts: Record<string, unknown>[] = [];
    const trustedFactValues = preparation.packet.facts.map((fact) => fact.value);
    const add = (f: Record<string, unknown>, id: string, kind?: string) => {
      const amountMinor = minor(f.amountDecimal),
        p = prov(e, batchId, `${base.sourceDocumentId}#${id}`),
        fact = {
          factId: text(id),
          kind: "money",
          amountMinor,
          currency,
          ...(f.sourceText === undefined
            ? {}
            : { sourceText: text(f.sourceText) }),
          ...(kind
            ? {
                moneyKind: kind,
                voucherNumberText: text(f.voucherNumberText),
                sourceDateText: text(f.sourceDateText),
              }
            : {}),
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
    if (d.sourceDocumentKind === "payroll-summary") {
      const voucherRecordIds = new Set<string>();
      for (const v of d.vouchers) {
        const q = v;
        if (voucherRecordIds.has(q.voucherNumberText)) {
          throw new Error("duplicate voucher identity");
        }
        voucherRecordIds.add(q.voucherNumberText);
        add(
          { ...q, amountDecimal: q.grossDecimal },
          `${text(q.voucherNumberText)}:gross`,
          "gross",
        );
        add(
          { ...q, amountDecimal: q.sourceStatedWhtDecimal },
          `${text(q.voucherNumberText)}:source-stated-wht`,
          "source-stated-wht",
        );
        add(
          { ...q, amountDecimal: q.netDecimal },
          `${text(q.voucherNumberText)}:net`,
          "net",
        );
      }
    } else {
      for (const [factIndex, f] of d.facts.entries()) {
        const q = f;
        if (q.kind === "count")
          facts.push({
            factId: text(q.factId),
            kind: "count",
            count: text(q.countText),
            provenance: prov(
              e,
              batchId,
              `${base.sourceDocumentId}#${text(q.factId)}`,
            ),
          });
        else if (q.kind === "money") {
          const trustedValue = trustedFactValues[factIndex];
          add(
            trustedValue === undefined
              ? q
              : { ...q, amountDecimal: trustedValue },
            text(q.factId),
          );
        }
        else throw new Error("invalid fact");
      }
    }
    const tax =
      d.sourceDocumentKind === "foreign-workspace-invoice"
        ? d.sourceStatedTax
        : undefined;
    const variantId =
      d.sourceDocumentKind === "school-billing-invoice"
        ? d.variantId
        : undefined;
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
  const ambiguityGroups = raw.acceptedSourceEnvelopes
    .map((envelope) => envelope.document)
    .filter(
      (
        document,
      ): document is Extract<typeof document, { ambiguityGroupId?: string }> =>
        document.sourceDocumentKind === "school-billing-invoice" &&
        document.ambiguityGroupId !== undefined,
    )
    .map((document) => document.ambiguityGroupId);
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
