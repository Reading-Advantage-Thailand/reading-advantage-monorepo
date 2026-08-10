import { z } from "zod";

const nonBlankStringSchema = z.string().regex(/\S/u);
const strictUtcTimestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u)
  .refine((value) => {
    const timestamp = new Date(value);
    return (
      !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value
    );
  }, "Timestamp must be a canonical UTC ISO instant");

/** Strict, provider-neutral audit event for a Finance Operations state change. */
export const financeAuditEventSchema = z.strictObject({
  eventId: nonBlankStringSchema,
  actorSubjectId: nonBlankStringSchema,
  operation: nonBlankStringSchema,
  objectType: nonBlankStringSchema,
  objectId: nonBlankStringSchema,
  occurredAt: strictUtcTimestampSchema,
  requestId: nonBlankStringSchema,
  correlationId: nonBlankStringSchema,
  scope: z.strictObject({
    companyId: nonBlankStringSchema,
    schoolId: nonBlankStringSchema.optional(),
  }),
  outcome: z.enum(["allowed", "denied", "succeeded", "failed"]),
});

/** Validated audit event appended after a Finance Operations decision or change. */
export type FinanceAuditEvent = z.infer<typeof financeAuditEventSchema>;

/** Immutable provider-neutral receipt for one appended finance audit event. */
export interface FinanceAuditReceipt {
  /** Event identity accepted by the audit adapter. */
  readonly eventId: string;
  /** Adapter-neutral identity of the durable append receipt. */
  readonly receiptId: string;
}

/** Internal append-only boundary for durable Finance Operations audit events. */
export interface FinanceAuditPort {
  /**
   * Appends one validated finance audit event to durable storage.
   * @param event Validated event to append exactly once.
   * @returns Immutable provider-neutral receipt for the append.
   */
  append(event: FinanceAuditEvent): Promise<Readonly<FinanceAuditReceipt>>;
}
