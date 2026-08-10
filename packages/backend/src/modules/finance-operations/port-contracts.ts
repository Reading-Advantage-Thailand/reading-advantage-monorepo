import { z } from "zod";

import {
  financeAuthorizationEvidenceSchema,
  nonBlankStringSchema,
  financeOperationScopeSchema,
  privateEvidenceReferenceSchema,
} from "./contracts.js";

const payloadDigestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
function evidenceCompanyId(reference: string): string {
  return reference
    .slice("private-evidence://".length)
    .split("/", 1)[0] as string;
}

function scopedInputSchema<TShape extends z.ZodRawShape>(shape: TShape) {
  return z
    .strictObject({
      ...shape,
      scope: financeOperationScopeSchema,
      authorizationEvidence: financeAuthorizationEvidenceSchema,
    })
    .superRefine((value, context) => {
      const authorizationEvidence =
        financeAuthorizationEvidenceSchema.safeParse(
          value.authorizationEvidence,
        );
      const scope = financeOperationScopeSchema.safeParse(value.scope);
      if (!authorizationEvidence.success || !scope.success) {
        return;
      }
      if (authorizationEvidence.data.organizationId !== scope.data.companyId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["authorizationEvidence", "organizationId"],
          message: "Authorization organization must match the Finance scope",
        });
      }
    });
}

/** Runtime request contract for the CRM customer billing-catalog port. */
export const customerBillingCatalogInputSchema = scopedInputSchema({
  customerId: nonBlankStringSchema,
  sourceVersion: nonBlankStringSchema,
});

/** Runtime response contract for a versioned CRM billing-catalog snapshot. */
export const customerBillingCatalogSnapshotSchema = z.strictObject({
  customerId: nonBlankStringSchema,
  sourceVersion: nonBlankStringSchema,
  payloadDigest: payloadDigestSchema,
});

/** Runtime request contract for the Tutor financial-export port. */
export const tutorFinancialExportInputSchema = scopedInputSchema({
  sourceRecordId: nonBlankStringSchema,
  sourceVersion: nonBlankStringSchema,
});

/** Runtime response contract for an immutable Tutor financial export. */
export const tutorFinancialExportSnapshotSchema = z.strictObject({
  sourceRecordId: nonBlankStringSchema,
  sourceVersion: nonBlankStringSchema,
  payloadDigest: payloadDigestSchema,
  evidenceReference: privateEvidenceReferenceSchema,
});

/** Runtime request contract for the private evidence-storage port. */
export const privateEvidenceStorageInputSchema = scopedInputSchema({
  evidenceReference: privateEvidenceReferenceSchema,
}).superRefine((value, context) => {
  if (evidenceCompanyId(value.evidenceReference) !== value.scope.companyId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evidenceReference"],
      message: "Evidence reference company must match the Finance scope",
    });
  }
});

/** Runtime response contract for private evidence metadata. */
export const privateEvidenceSnapshotSchema = z.strictObject({
  evidenceReference: privateEvidenceReferenceSchema,
  payloadDigest: payloadDigestSchema,
});

/** Runtime request contract for a durable Finance Operations job. */
export const durableJobInputSchema = scopedInputSchema({
  operation: nonBlankStringSchema,
  idempotencyKey: nonBlankStringSchema,
  payloadDigest: payloadDigestSchema,
});

/** Runtime contract for the provider-neutral durable-job receipt. */
export const durableJobReceiptSchema = z.strictObject({
  jobId: nonBlankStringSchema,
  idempotencyKey: nonBlankStringSchema,
});

/** Runtime result contract distinguishing first acceptance, replay, and conflict. */
export const durableJobResultSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("accepted"),
    receipt: durableJobReceiptSchema,
  }),
  z.strictObject({
    status: z.literal("replay"),
    receipt: durableJobReceiptSchema,
  }),
  z.strictObject({
    status: z.literal("conflict"),
    receipt: durableJobReceiptSchema,
    reason: z.enum([
      "operation-mismatch",
      "payload-digest-mismatch",
      "scope-mismatch",
    ]),
  }),
]);

/** Validated CRM billing-catalog request. */
export type CustomerBillingCatalogInput = z.infer<
  typeof customerBillingCatalogInputSchema
>;

/** Validated CRM billing-catalog snapshot. */
export type CustomerBillingCatalogSnapshot = z.infer<
  typeof customerBillingCatalogSnapshotSchema
>;

/** Validated Tutor financial-export request. */
export type TutorFinancialExportInput = z.infer<
  typeof tutorFinancialExportInputSchema
>;

/** Validated Tutor financial-export snapshot. */
export type TutorFinancialExportSnapshot = z.infer<
  typeof tutorFinancialExportSnapshotSchema
>;

/** Validated private evidence-storage request. */
export type PrivateEvidenceStorageInput = z.infer<
  typeof privateEvidenceStorageInputSchema
>;

/** Validated private evidence metadata. */
export type PrivateEvidenceSnapshot = z.infer<
  typeof privateEvidenceSnapshotSchema
>;

/** Validated durable Finance Operations job request. */
export type DurableJobInput = z.infer<typeof durableJobInputSchema>;

/** Provider-neutral durable-job receipt. */
export type DurableJobReceipt = z.infer<typeof durableJobReceiptSchema>;

/** Provider-neutral durable-job acceptance, replay, or conflict result. */
export type DurableJobResult = z.infer<typeof durableJobResultSchema>;

/** Accepted job state used to classify a later idempotent request. */
export interface AcceptedDurableJob {
  /** Validated input accepted for the original job. */
  readonly input: DurableJobInput;
  /** Immutable receipt returned for the original job. */
  readonly receipt: DurableJobReceipt;
}

/**
 * Classifies a request already matched by idempotency key as replay or conflict.
 * @param request Accepted job state and the incoming validated job input.
 * @returns Replay for an identical operation, payload, and scope, otherwise a conflict.
 * @throws When the accepted receipt key does not match the accepted input key or either request fails runtime validation.
 */
export function classifyDurableJobReplay(request: {
  readonly existing: AcceptedDurableJob;
  readonly incoming: DurableJobInput;
}): DurableJobResult {
  const existing = {
    input: durableJobInputSchema.parse(request.existing.input),
    receipt: durableJobReceiptSchema.parse(request.existing.receipt),
  };
  const incoming = durableJobInputSchema.parse(request.incoming);

  if (existing.receipt.idempotencyKey !== existing.input.idempotencyKey) {
    throw new Error(
      "The accepted durable-job receipt idempotency key must match the accepted input idempotency key",
    );
  }

  if (
    existing.input.scope.companyId !== incoming.scope.companyId ||
    existing.input.scope.schoolId !== incoming.scope.schoolId
  ) {
    return {
      status: "conflict",
      receipt: existing.receipt,
      reason: "scope-mismatch",
    };
  }

  if (existing.input.operation !== incoming.operation) {
    return {
      status: "conflict",
      receipt: existing.receipt,
      reason: "operation-mismatch",
    };
  }
  if (existing.input.payloadDigest !== incoming.payloadDigest) {
    return {
      status: "conflict",
      receipt: existing.receipt,
      reason: "payload-digest-mismatch",
    };
  }
  return { status: "replay", receipt: existing.receipt };
}
