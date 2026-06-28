import { z } from "zod";

// ─── Shared Response Envelopes ────────────────────────────
//
// Source of truth for cross-app response envelopes (CA-003, F-SF-007, F-SF-017).
// These schemas define the canonical shape of every API response so that
// clients can parse responses uniformly regardless of transport (tRPC,
// REST, route handlers). All envelopes use an `ok` discriminator so
// clients can switch on success vs error in a single parser.

/**
 * Shared error code constants for error envelopes.
 *
 * These are intentionally string literal unions rather than an enum so
 * transport layers (tRPC, Next.js route handlers, webhooks) can map them
 * without importing domain error classes. The values are domain-stable
 * identifiers — domain errors should map onto these codes.
 */
export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Schema for a single validation issue inside a VALIDATION_ERROR envelope.
 */
export const validationIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string().min(1),
});

export type ValidationIssue = z.infer<typeof validationIssueSchema>;

/**
 * Schema for the `error` block shared by every error envelope.
 * `code` is required; `issues` is only meaningful for VALIDATION_ERROR;
 * additional fields are intentionally rejected by `.strict()` so internal
 * fields like `stack` cannot leak into the response contract.
 */
export const errorBodySchema = z
  .object({
    code: z.enum(ERROR_CODES),
    message: z.string().min(1),
    issues: z.array(validationIssueSchema).optional(),
  })
  .strict();

export type ErrorBody = z.infer<typeof errorBodySchema>;

/**
 * Generic success envelope: `{ ok: true, data: T }`.
 *
 * Use this when returning a single resource from any API boundary. List
 * responses should use `listEnvelopeSchema` so the pagination shape is
 * enforced.
 */
export const successEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.unknown(),
});

export type SuccessEnvelope<T = unknown> = {
  ok: true;
  data: T;
};

/**
 * Paginated list envelope: `{ ok: true, data: T[], page, pageSize, total }`.
 *
 * Use this for any endpoint that returns a collection. `page` is 1-indexed.
 */
export const listEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.array(z.unknown()),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});

export type ListEnvelope<T = unknown> = {
  ok: true;
  data: T[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Validation error envelope: 400 with field-level issues.
 */
export const validationErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z
    .object({
      code: z.literal("VALIDATION_ERROR"),
      message: z.string().min(1),
      issues: z.array(validationIssueSchema).min(1),
    })
    .strict(),
});

export type ValidationErrorEnvelope = z.infer<
  typeof validationErrorEnvelopeSchema
>;

/**
 * Unauthorized envelope: 401. No payload details beyond the code.
 */
export const unauthorizedEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z
    .object({
      code: z.literal("UNAUTHORIZED"),
      message: z.string().min(1),
    })
    .strict(),
});

export type UnauthorizedEnvelope = z.infer<typeof unauthorizedEnvelopeSchema>;

/**
 * Forbidden envelope: 403.
 */
export const forbiddenEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z
    .object({
      code: z.literal("FORBIDDEN"),
      message: z.string().min(1),
    })
    .strict(),
});

export type ForbiddenEnvelope = z.infer<typeof forbiddenEnvelopeSchema>;

/**
 * Not-found envelope: 404.
 */
export const notFoundEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z
    .object({
      code: z.literal("NOT_FOUND"),
      message: z.string().min(1),
    })
    .strict(),
});

export type NotFoundEnvelope = z.infer<typeof notFoundEnvelopeSchema>;

/**
 * Conflict envelope: 409 (e.g. duplicate, stale-state update).
 */
export const conflictEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z
    .object({
      code: z.literal("CONFLICT"),
      message: z.string().min(1),
    })
    .strict(),
});

export type ConflictEnvelope = z.infer<typeof conflictEnvelopeSchema>;

/**
 * Internal server error envelope: 500.
 *
 * Strict shape — internal fields like `stack` are intentionally rejected
 * by the `.strict()` modifier so stack traces cannot leak into the
 * response contract.
 */
export const internalErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z
    .object({
      code: z.literal("INTERNAL_ERROR"),
      message: z.string().min(1),
    })
    .strict(),
});

export type InternalErrorEnvelope = z.infer<typeof internalErrorEnvelopeSchema>;
