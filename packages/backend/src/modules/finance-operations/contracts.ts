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
