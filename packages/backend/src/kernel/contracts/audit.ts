import { z } from "zod";

import {
  capabilityIdSchema,
  referenceIdSchema,
} from "./primitives.js";
import {
  projectionReferenceSchema,
  projectedDataEnvelopeSchema,
  type ProjectionReference,
  type StructuredDataProjectorDefinition,
  type ValidatedProjectedData,
} from "./projections.js";

/** Runtime contract for audit requirements declared by a capability. */
export const auditPolicySchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("none") }),
  z.strictObject({
    mode: z.literal("required"),
    eventType: referenceIdSchema,
    metadataProjection: projectionReferenceSchema,
    immutable: z.literal(true),
  }),
]);

/** Immutable audit behavior declared by a capability. */
export type AuditPolicy = z.infer<typeof auditPolicySchema>;

/** Structural audit-metadata candidate requiring registered projector validation. */
export const auditMetadataEnvelopeSchema = projectedDataEnvelopeSchema;

/** Audit metadata proven against the descriptor-declared reviewed projection. */
export type SafeAuditMetadata = ValidatedProjectedData;

/** Runtime contract for an immutable capability audit event. */
export const auditEventSchema = z.strictObject({
  eventId: z.string().min(1).max(200),
  eventType: referenceIdSchema,
  occurredAt: z.string().datetime({ offset: true }),
  capabilityId: capabilityIdSchema,
  correlationId: z.string().min(1).max(200),
  actor: z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("anonymous") }),
    z.strictObject({ type: z.literal("user"), id: z.string().min(1).max(200) }),
    z.strictObject({ type: z.literal("system"), id: z.string().min(1).max(200) }),
  ]),
  tenant: z.discriminatedUnion("mode", [
    z.strictObject({ mode: z.literal("global") }),
    z.strictObject({ mode: z.literal("school"), schoolId: z.string().min(1) }),
    z.strictObject({
      mode: z.literal("referential"),
      schoolId: z.string().min(1),
      referenceId: z.string().min(1),
    }),
  ]),
  outcome: z.enum(["success", "denied", "failure"]),
  metadata: auditMetadataEnvelopeSchema,
});

/** Immutable audit event accepted by the append-only audit adapter. */
export type AuditEvent = Omit<z.infer<typeof auditEventSchema>, "metadata"> &
  Readonly<{ metadata: SafeAuditMetadata }>;

/** Registered typed audit metadata projector with its strict reviewed contract. */
export type AuditMetadataProjectorDefinition<TSource> =
  StructuredDataProjectorDefinition<TSource, z.ZodRawShape>;

/** Read-only registry dedicated to reviewed audit metadata projectors. */
export interface AuditMetadataProjectorRegistryReadHandle {
  /**
   * Resolves the exact projector declared by an audit policy.
   * @param reference Projector ID, schema identity, and reviewed allowed keys.
   * @returns Matching typed projector definition, or undefined when unresolved.
   */
  getAuditProjector(
    reference: Readonly<ProjectionReference>,
  ): AuditMetadataProjectorDefinition<unknown> | undefined;
}

/** Runtime contract for a durable immutable-audit append receipt. */
export const auditAppendReceiptSchema = z.strictObject({
  eventId: z.string().min(1).max(200),
  persistedAt: z.string().datetime({ offset: true }),
});

/** Receipt proving that an immutable audit event was appended. */
export type AuditAppendReceipt = Readonly<
  z.infer<typeof auditAppendReceiptSchema>
>;

/** Append-only internal adapter used for immutable capability audit evidence. */
export interface ImmutableAuditPort {
  /**
   * Appends one validated event without permitting update or deletion.
   * @param event Event whose metadata carries executor validation evidence.
   * @returns Durable receipt for the appended event.
   */
  append(event: Readonly<AuditEvent>): Promise<Readonly<AuditAppendReceipt>>;
}
