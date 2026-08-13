import { z } from "zod";

import type { FinanceAuditEvent, FinanceAuditPort } from "./audit.js";
import {
  financeOperationAuthorizationInputSchema,
  financeOperationScopeSchema,
  financeSourceProvenanceSchema,
  type FinanceOperationAuthorizationInput,
  type FinanceOperationScope,
} from "./contracts.js";
import type { DurableJobInput } from "./port-contracts.js";
import type * as FinancePorts from "./ports.js";
import { financeRecordSchema, type FinanceRecord } from "./records.js";

const normalVersion = "finance-controlled-import-normalization-v1" as const;
const jobVersion = "finance-controlled-import-job-v1" as const;
const digest = z.string().regex(/^[a-f0-9]{64}$/u);
const forbidden = new Set([
  "vatRate",
  "taxAmount",
  "accountCode",
  "ledgerAccount",
  "deductible",
  "name",
  "email",
  "bankAccount",
  "accountNumber",
  "taxId",
  "rawPayload",
]);

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
function scan(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [k, v] of Object.entries(value)) {
    if (forbidden.has(k)) throw new Error("forbidden field");
    scan(v);
  }
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
  scan(input);
  const raw = object(input);
  if (
    raw.normalizationVersion !== normalVersion ||
    !Array.isArray(raw.acceptedSourceEnvelopes)
  )
    throw new Error("invalid envelope");
  const scope = financeOperationScopeSchema.parse(raw.scope),
    batchId = text(raw.batchId),
    snaps: PreparedControlledSourceSnapshot[] = [],
    records: FinanceRecord[] = [],
    ds: string[] = [];
  for (const x of raw.acceptedSourceEnvelopes) {
    const e = object(x),
      d = object(e.document);
    if (
      e.envelopeVersion !== "finance-controlled-source-envelope-v1" ||
      !scopeEqual(scope, financeOperationScopeSchema.parse(e.scope)) ||
      typeof e.sourceSystem !== "string" ||
      typeof e.sourceVersion !== "string" ||
      typeof e.sourceRecordId !== "string" ||
      d.thaiTaxDocumentStatus === "tax-invoice"
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
        sourceDocumentId: text(d.sourceDocumentId),
        logicalDocumentId: text(d.logicalDocumentId),
        sourceDocumentKind: text(d.sourceDocumentKind),
        thaiTaxDocumentStatus: z
          .enum(["not-source-asserted", "unresolved"])
          .parse(d.thaiTaxDocumentStatus),
      },
      currency = text(d.currency),
      facts: Record<string, unknown>[] = [];
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
      if (!Array.isArray(d.vouchers)) throw new Error("invalid vouchers");
      for (const v of d.vouchers) {
        const q = object(v);
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
      if (!Array.isArray(d.facts)) throw new Error("invalid facts");
      for (const f of d.facts) {
        const q = object(f);
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
        else if (q.kind === "money") add(q, text(q.factId));
        else throw new Error("invalid fact");
      }
    }
    const tax =
      d.sourceStatedTax === undefined ? undefined : object(d.sourceStatedTax);
    snaps.push({
      ...base,
      ...(d.variantId === undefined ? {} : { variantId: text(d.variantId) }),
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
    ds.push(object(e.evidenceAuthorization).payloadDigest as string);
  }
  if (!ds.every((x) => digest.safeParse(x).success))
    throw new Error("invalid digest");
  if (
    snaps.length > 1 &&
    snaps.every((x) => x.variantId) &&
    new Set(snaps.map((x) => x.logicalDocumentId)).size === 1
  )
    return freeze({
      status: "unresolved",
      normalizationVersion: normalVersion,
      reason: "source-variant-ambiguity",
      scope: copy(scope),
      batchId,
      variants: copy(snaps),
      records: [] as const,
    });
  return freeze({
    status: "ready",
    normalizationVersion: normalVersion,
    scope: copy(scope),
    batchId,
    batchDigest: ds.length === 1 ? (ds[0] as string) : ds.join(""),
    snapshots: copy(snaps),
    records: copy(records),
  });
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
  const auth = financeOperationAuthorizationInputSchema.parse({
      ...request.authorizationInput,
      operation: "controlled-import:accept-batch",
    }),
    decision = await request.authorizationPort.authorizeFinanceOperation(
      freeze(copy(auth)),
    );
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
        await request.repository.applyBatchAtomically(
          freeze({
            plan: copy(request.plan),
            durableJob,
            audit: audit(request, "succeeded"),
          }),
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
  readonly status: "accepted";
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
    status: "accepted" as const,
    packetVersion: "historical-private-evidence-packet.v1" as const,
    liveSourceAdaptersUsed: [] as const,
  });
}
