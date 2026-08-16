import { types as nodeTypes } from "node:util";

import { z } from "zod";

const decimalSchema = z.string().regex(/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u);
const currencySchema = z.string().regex(/^[A-Z]{3}$/u);
const opaqueIdentifierSchema = z.string().min(1).max(255).regex(/\S/u);
const digestSchema = z.string().regex(/^[a-f0-9]{64}$/u);

/** Strict trusted evidence for one source bill's separate THB valuation. */
export const financeThbConversionEvidenceSchema = z.strictObject({
  billId: opaqueIdentifierSchema,
  sourceAmountDecimal: decimalSchema,
  sourceCurrency: currencySchema,
  thbAmountDecimal: decimalSchema,
  conversionRateDecimal: decimalSchema,
  rateEffectiveDate: opaqueIdentifierSchema,
  rateSourceId: opaqueIdentifierSchema,
});

/** Trusted conversion evidence retained separately from the source bill amount. */
export type FinanceThbConversionEvidence = z.infer<
  typeof financeThbConversionEvidenceSchema
>;

/** Company-first scope bound to an approved THB valuation decision. */
export const financeThbPolicyApprovalScopeSchema = z.strictObject({
  companyId: opaqueIdentifierSchema,
  schoolId: opaqueIdentifierSchema.optional(),
});

/** Company-first scope bound to the policy approval. */
export type FinanceThbPolicyApprovalScope = z.infer<
  typeof financeThbPolicyApprovalScopeSchema
>;

// Company Identity validates the complete receipt. Finance projects only its authoritative fields.
const receiptSchema = z.object({
  decisionId: opaqueIdentifierSchema,
  contentDigest: digestSchema,
  scope: financeThbPolicyApprovalScopeSchema,
});

const replayValuationSchema = financeThbConversionEvidenceSchema
  .extend({
    decisionId: opaqueIdentifierSchema,
    contentDigest: digestSchema,
    scope: financeThbPolicyApprovalScopeSchema,
  })
  .strict();

const replayInputSchema = z.strictObject({
  existing: replayValuationSchema,
  incoming: replayValuationSchema,
});

const attestorResultSchema = z.discriminatedUnion("decision", [
  z.strictObject({ decision: z.literal("allow"), receipt: receiptSchema }),
  z.strictObject({ decision: z.literal("replay"), receipt: receiptSchema }),
  z.strictObject({
    decision: z.literal("deny"),
    reason: opaqueIdentifierSchema,
  }),
  z.strictObject({
    decision: z.literal("conflict"),
    reason: opaqueIdentifierSchema,
  }),
]);

const requestSchema = z.strictObject({
  bill: z.strictObject({
    billId: opaqueIdentifierSchema,
    sourceAmountDecimal: decimalSchema,
    sourceCurrency: currencySchema,
  }),
  approvalReceipt: z.unknown(),
  expectedScope: financeThbPolicyApprovalScopeSchema,
  thbAmountDecimal: decimalSchema.optional(),
  conversionRateDecimal: decimalSchema.optional(),
  rateEffectiveDate: opaqueIdentifierSchema.optional(),
  rateSourceId: opaqueIdentifierSchema.optional(),
});

/** Accepted Company Identity boundary for Finance THB policy approval. */
export interface FinanceThbPolicyApprovalAttestor {
  /** Verifies a caller receipt against a trusted Finance policy scope. */
  verify(input: {
    readonly operation: "finance-thb-policy-approval";
    readonly receipt: unknown;
    readonly expectedScope: FinanceThbPolicyApprovalScope;
    readonly existingReceipt?: unknown;
  }): Promise<unknown>;
}

/** Internal Finance port that returns trusted conversion evidence for one bill. */
export interface FinanceThbEvidencePort {
  /** Reads the evidence for the exact source bill fields. */
  getEvidence(input: {
    readonly billId: string;
    readonly sourceAmountDecimal: string;
    readonly sourceCurrency: string;
  }): Promise<unknown>;
}

/** Immutable valuation prepared from approved policy and trusted evidence. */
export interface FinanceThbValuation extends FinanceThbConversionEvidence {
  readonly decisionId: string;
  readonly contentDigest: string;
  readonly scope: FinanceThbPolicyApprovalScope;
}

/** Stable public errors for the Finance THB valuation boundary. */
export type FinanceThbValuationErrorCode =
  | "FINANCE_THB_INPUT_INVALID"
  | "FINANCE_THB_POLICY_APPROVAL_DENIED"
  | "FINANCE_THB_POLICY_APPROVAL_CONFLICT"
  | "FINANCE_THB_POLICY_APPROVAL_INVALID"
  | "FINANCE_THB_POLICY_APPROVAL_FAILED"
  | "FINANCE_THB_CONVERSION_EVIDENCE_INVALID"
  | "FINANCE_THB_CONVERSION_EVIDENCE_CONFLICT";

/** Secret-safe error raised at the Finance THB valuation boundary. */
export class FinanceThbValuationError extends Error {
  readonly code: FinanceThbValuationErrorCode;

  /**
   * Creates a stable secret-safe valuation error.
   * @param code Stable Finance THB valuation error code.
   */
  constructor(code: FinanceThbValuationErrorCode) {
    super(code);
    this.name = "FinanceThbValuationError";
    this.code = code;
    this.stack = `${this.name}: ${code}`;
    Object.freeze(this);
  }
}

/** Finance THB preparer that validates an approved receipt before evidence access. */
export interface FinanceThbValuationPreparer {
  /** Prepares an immutable valuation from one untrusted request. */
  prepare(input: unknown): Promise<FinanceThbValuation>;
}

type PlainRecord = Record<string, unknown>;

function error(code: FinanceThbValuationErrorCode): FinanceThbValuationError {
  return new FinanceThbValuationError(code);
}

function isPlainRecord(value: unknown): value is PlainRecord {
  try {
    return (
      value !== null &&
      typeof value === "object" &&
      Object.getPrototypeOf(value) === Object.prototype &&
      !nodeTypes.isProxy(value)
    );
  } catch {
    return false;
  }
}

function capture(value: unknown, depth = 0): unknown {
  if (depth > 12) throw new Error("boundary depth");
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    if (nodeTypes.isProxy(value)) throw new Error("boundary object");
    const output: unknown[] = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || key === "__proto__" || key === "length") {
        if (key !== "length") throw new Error("boundary array key");
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("boundary accessor");
      }
      output[Number(key)] = capture(descriptor.value, depth + 1);
    }
    return output;
  }
  if (!isPlainRecord(value)) throw new Error("boundary object");
  const output: PlainRecord = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw new Error("boundary symbol");
    if (key === "__proto__") throw new Error("boundary prototype key");
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !("value" in descriptor)) {
      throw new Error("boundary accessor");
    }
    output[key] = capture(descriptor.value, depth + 1);
  }
  return output;
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as PlainRecord))
      freezeDeep(nested);
    Object.freeze(value);
  }
  return value;
}

function scopesMatch(
  left: FinanceThbPolicyApprovalScope,
  right: FinanceThbPolicyApprovalScope,
): boolean {
  return left.companyId === right.companyId && left.schoolId === right.schoolId;
}

function decimalParts(value: string): { coefficient: bigint; scale: number } {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/u, "");
  return {
    coefficient: BigInt(`${negative ? "-" : ""}${digits || "0"}`),
    scale: fraction.length,
  };
}

function decimalProductMatches(
  amount: string,
  rate: string,
  result: string,
): boolean {
  const left = decimalParts(amount);
  const right = decimalParts(rate);
  const target = decimalParts(result);
  const scale = left.scale + right.scale;
  if (target.scale === scale)
    return left.coefficient * right.coefficient === target.coefficient;
  if (target.scale < scale) {
    return (
      left.coefficient * right.coefficient ===
      target.coefficient * 10n ** BigInt(scale - target.scale)
    );
  }
  return (
    left.coefficient *
      right.coefficient *
      10n ** BigInt(target.scale - scale) ===
    target.coefficient
  );
}

function hasOnlyRequestKeys(value: PlainRecord): boolean {
  return Object.keys(value).every((key) =>
    ["bill", "approvalReceipt", "expectedScope"].includes(key),
  );
}

function conversionEvidenceStatus(
  bill: z.infer<typeof requestSchema>["bill"],
  evidence: FinanceThbConversionEvidence,
): "valid" | "invalid" | "conflict" {
  if (
    evidence.billId !== bill.billId ||
    evidence.sourceAmountDecimal !== bill.sourceAmountDecimal ||
    evidence.sourceCurrency !== bill.sourceCurrency
  ) {
    return "conflict";
  }
  if (bill.sourceCurrency === "THB") {
    return decimalParts(evidence.conversionRateDecimal).coefficient === 1n &&
      decimalParts(evidence.conversionRateDecimal).scale === 0 &&
      evidence.thbAmountDecimal === bill.sourceAmountDecimal
      ? "valid"
      : "conflict";
  }
  return decimalProductMatches(
    bill.sourceAmountDecimal,
    evidence.conversionRateDecimal,
    evidence.thbAmountDecimal,
  )
    ? "valid"
    : "invalid";
}

/**
 * Creates a THB valuation preparer over Company Identity and Finance evidence ports.
 * @param input Accepted policy attestor and internal trusted-evidence port.
 * @returns A preparer that returns immutable, separately valued source bills.
 * @throws When a required dependency is invalid.
 */
export function createFinanceThbValuationPreparer(input: {
  readonly attestor: FinanceThbPolicyApprovalAttestor;
  readonly evidencePort: FinanceThbEvidencePort;
}): FinanceThbValuationPreparer {
  let verify: FinanceThbPolicyApprovalAttestor["verify"];
  let getEvidence: FinanceThbEvidencePort["getEvidence"];
  try {
    if (input === null || typeof input !== "object") throw new Error("input");
    if (typeof input.attestor?.verify !== "function")
      throw new Error("attestor");
    if (typeof input.evidencePort?.getEvidence !== "function")
      throw new Error("port");
    verify = input.attestor.verify.bind(input.attestor);
    getEvidence = input.evidencePort.getEvidence.bind(input.evidencePort);
  } catch {
    throw error("FINANCE_THB_POLICY_APPROVAL_INVALID");
  }

  return Object.freeze({
    async prepare(rawInput: unknown): Promise<FinanceThbValuation> {
      let captured: unknown;
      try {
        captured = capture(rawInput);
      } catch {
        throw error("FINANCE_THB_INPUT_INVALID");
      }
      const parsedRequest = requestSchema.safeParse(captured);
      if (!parsedRequest.success) throw error("FINANCE_THB_INPUT_INVALID");
      const request = freezeDeep(parsedRequest.data);

      let attestorOutput: unknown;
      try {
        attestorOutput = await verify(
          freezeDeep({
            operation: "finance-thb-policy-approval" as const,
            receipt: request.approvalReceipt,
            expectedScope: request.expectedScope,
          }),
        );
      } catch {
        throw error("FINANCE_THB_POLICY_APPROVAL_FAILED");
      }
      let capturedAttestor: unknown;
      try {
        capturedAttestor = capture(attestorOutput);
      } catch {
        throw error("FINANCE_THB_POLICY_APPROVAL_INVALID");
      }
      const attestation = attestorResultSchema.safeParse(capturedAttestor);
      if (!attestation.success)
        throw error("FINANCE_THB_POLICY_APPROVAL_INVALID");
      if (attestation.data.decision === "deny") {
        throw error("FINANCE_THB_POLICY_APPROVAL_DENIED");
      }
      if (attestation.data.decision === "conflict") {
        throw error("FINANCE_THB_POLICY_APPROVAL_CONFLICT");
      }
      if (!scopesMatch(attestation.data.receipt.scope, request.expectedScope)) {
        throw error("FINANCE_THB_POLICY_APPROVAL_INVALID");
      }
      if (!isPlainRecord(captured) || !hasOnlyRequestKeys(captured)) {
        throw error("FINANCE_THB_INPUT_INVALID");
      }

      let evidenceOutput: unknown;
      try {
        evidenceOutput = await getEvidence(freezeDeep({ ...request.bill }));
      } catch {
        throw error("FINANCE_THB_CONVERSION_EVIDENCE_INVALID");
      }
      let capturedEvidence: unknown;
      try {
        capturedEvidence = capture(evidenceOutput);
      } catch {
        throw error("FINANCE_THB_CONVERSION_EVIDENCE_INVALID");
      }
      const evidence =
        financeThbConversionEvidenceSchema.safeParse(capturedEvidence);
      if (!evidence.success)
        throw error("FINANCE_THB_CONVERSION_EVIDENCE_INVALID");
      const evidenceStatus = conversionEvidenceStatus(
        request.bill,
        evidence.data,
      );
      if (evidenceStatus === "invalid") {
        throw error("FINANCE_THB_CONVERSION_EVIDENCE_INVALID");
      }
      if (evidenceStatus === "conflict") {
        throw error("FINANCE_THB_CONVERSION_EVIDENCE_CONFLICT");
      }
      return freezeDeep({
        ...evidence.data,
        decisionId: attestation.data.receipt.decisionId,
        contentDigest: attestation.data.receipt.contentDigest,
        scope: { ...attestation.data.receipt.scope },
      });
    },
  });
}

/**
 * Classifies whether two THB valuations retain identical conversion evidence.
 * @param input Existing and incoming valuation values to compare.
 * @returns Replay for unchanged values or conflict for changed conversion evidence.
 */
export function classifyFinanceThbValuationReplay(input: {
  readonly existing: unknown;
  readonly incoming: unknown;
}):
  | { readonly status: "replay" }
  | {
      readonly status: "conflict";
      readonly reason: "conversion-evidence-mismatch";
    } {
  try {
    const capturedInput = capture(input);
    const operands = replayInputSchema.safeParse(capturedInput);
    if (!operands.success) throw new Error("value");
    const { existing, incoming } = operands.data;
    if (
      existing.billId === incoming.billId &&
      existing.sourceAmountDecimal === incoming.sourceAmountDecimal &&
      existing.sourceCurrency === incoming.sourceCurrency &&
      existing.thbAmountDecimal === incoming.thbAmountDecimal &&
      existing.conversionRateDecimal === incoming.conversionRateDecimal &&
      existing.rateEffectiveDate === incoming.rateEffectiveDate &&
      existing.rateSourceId === incoming.rateSourceId &&
      existing.decisionId === incoming.decisionId &&
      existing.contentDigest === incoming.contentDigest &&
      scopesMatch(existing.scope, incoming.scope)
    ) {
      return Object.freeze({ status: "replay" as const });
    }
  } catch {
    // Invalid comparisons fail closed as conflicts.
  }
  return Object.freeze({
    status: "conflict" as const,
    reason: "conversion-evidence-mismatch" as const,
  });
}
