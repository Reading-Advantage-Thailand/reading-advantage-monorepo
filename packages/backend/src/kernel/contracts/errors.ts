import { z } from "zod";

import {
  projectionReferenceSchema,
  projectedDataEnvelopeSchema,
  type ValidatedProjectedData,
} from "./projections.js";

/** Runtime contract for a stable platform error code. */
export const errorCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]+$/);

/** Stable platform error code shared by declarations and normalized errors. */
export type ErrorCode = z.infer<typeof errorCodeSchema>;

/** Runtime contract for transport-neutral job error outcomes. */
export const jobErrorOutcomeSchema = z.enum(["retry", "terminal"]);

/** Job settlement behavior associated with a platform error. */
export type JobErrorOutcome = z.infer<typeof jobErrorOutcomeSchema>;

/** Runtime contract for optional transport mappings of a declared error. */
export const errorTransportMappingSchema = z.strictObject({
  httpStatus: z.number().int().min(400).max(599).optional(),
  trpcCode: z
    .enum([
      "BAD_REQUEST",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "TOO_MANY_REQUESTS",
      "INTERNAL_SERVER_ERROR",
      "TIMEOUT",
    ])
    .optional(),
  jobOutcome: jobErrorOutcomeSchema,
});

/** Runtime contract for a safe, declared capability error. */
export const declaredErrorSchema = z.strictObject({
  code: errorCodeSchema,
  safeMessage: z.string().min(1).max(300),
  retryable: z.boolean(),
  transport: errorTransportMappingSchema,
  detailsProjection: projectionReferenceSchema.optional(),
});

/** Safe error declaration published by a capability descriptor. */
export type DeclaredError = z.infer<typeof declaredErrorSchema>;

/** Structural error-details candidate requiring registered projector validation. */
export const errorDetailsEnvelopeSchema = projectedDataEnvelopeSchema;

/** Error details proven against the declaration's reviewed projection. */
export type SafeErrorDetails = ValidatedProjectedData;

/** Runtime contract for the normalized error returned by the executor. */
export const platformErrorSchema = z.strictObject({
  code: errorCodeSchema,
  message: z.string().min(1).max(300),
  retryable: z.boolean(),
  details: errorDetailsEnvelopeSchema.optional(),
  correlationId: z.string().min(1).max(200).optional(),
});

/** Stable platform error whose details carry executor validation evidence. */
export type PlatformErrorData = Omit<
  z.infer<typeof platformErrorSchema>,
  "details"
> &
  Readonly<{ details?: SafeErrorDetails }>;
