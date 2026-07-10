import { z } from 'zod';

/**
 * Canonical version identifier for the practice.v1 contract.
 */
export const PRACTICE_CONTRACT_VERSION = 'practice.v1' as const;

/**
 * Valid modes for a practice activity.
 */
export const PRACTICE_MODE_VALUES = [
  'worked_example',
  'guided_practice',
  'independent_practice',
  'assessment',
  'teaching',
] as const;

/**
 * Valid statuses for a practice submission lifecycle.
 */
export const PRACTICE_SUBMISSION_STATUS_VALUES = [
  'draft',
  'submitted',
  'graded',
  'returned',
] as const;

/** Zod schema for practice mode. */
export const practiceModeSchema = z.enum(PRACTICE_MODE_VALUES);

/** Zod schema for practice submission status. */
export const practiceSubmissionStatusSchema = z.enum(PRACTICE_SUBMISSION_STATUS_VALUES);

const jsonRecordSchema = z.record(z.string(), z.unknown());

/**
 * Branded schema for canonical Convex activity IDs.
 *
 * This brand prevents accidental assignment of transient/raw UUIDs
 * where a validated database ID is required. The brand is erased at
 * runtime; it exists only for compile-time safety.
 */
export const convexActivityIdSchema = z.string().trim().min(1).brand<'ConvexId'>();

/**
 * Canonical activity ID type — a string validated to be a Convex document ID.
 *
 * Use `convexActivityIdSchema.parse(id)` to brand a raw string, or
 * `buildPracticeSubmissionEnvelope({ activityId: id, ... })` which brands
 * automatically on output.
 */
export type ConvexActivityId = z.infer<typeof convexActivityIdSchema>;

/**
 * Brand a raw string as a ConvexActivityId at runtime.
 *
 * Use this in test files or adapters when you have a string ID that
 * must satisfy the branded type.
 */
export function toConvexActivityId(id: string): ConvexActivityId {
  return convexActivityIdSchema.parse(id);
}

/**
 * Normalize a submittedAt value to an ISO string.
 * @param {string | Date} value - String or Date to normalize
 * @returns {string} - ISO 8601 date string
 */
function normalizeSubmittedAt(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Normalize a practice answer value into a canonical string representation.
 *
 * Arrays are sorted and pipe-delimited. Strings are trimmed and lowercased.
 * Numbers and booleans are stringified. null/undefined become empty strings.
 *
 * @example
 * ```ts
 * normalizePracticeValue(['b', 'a']); // 'a|b'
 * normalizePracticeValue('  Hello '); // 'hello'
 * normalizePracticeValue(42);        // '42'
 * normalizePracticeValue(null);      // ''
 * ```
 */
export function normalizePracticeValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizePracticeValue(entry)).sort().join('|');
  }

  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim().toLowerCase();
  }

  if (value == null) {
    return '';
  }

  return JSON.stringify(value);
}

/** Zod schema for timing confidence levels. */
export const practiceTimingConfidenceSchema = z.enum(['high', 'medium', 'low']);

/**
 * Confidence level for aggregated timing data.
 *
 * - **high**: No significant interruptions or idle periods.
 * - **medium**: Minor focus losses or short visibility-hidden events.
 * - **low**: Major interruptions, very short sessions, or long idle periods.
 */
export type PracticeTimingConfidence = z.infer<typeof practiceTimingConfidenceSchema>;

/** Zod schema for a practice timing summary. */
export const practiceTimingSummarySchema = z
  .object({
    startedAt: z.string().min(1),
    submittedAt: z.string().min(1),
    wallClockMs: z.number().nonnegative(),
    activeMs: z.number().nonnegative(),
    idleMs: z.number().nonnegative(),
    pauseCount: z.number().int().nonnegative(),
    focusLossCount: z.number().int().nonnegative(),
    visibilityHiddenCount: z.number().int().nonnegative(),
    longestIdleMs: z.number().nonnegative().optional(),
    confidence: practiceTimingConfidenceSchema,
    confidenceReasons: z.array(z.string()).optional(),
  })
  .refine((data) => data.activeMs <= data.wallClockMs, {
    message: 'activeMs cannot exceed wallClockMs',
    path: ['activeMs'],
  });

/**
 * Aggregated timing summary for a practice attempt or session.
 *
 * @example
 * ```ts
 * const timing: PracticeTimingSummary = {
 *   startedAt: '2026-04-17T08:00:00Z',
 *   submittedAt: '2026-04-17T08:01:30Z',
 *   wallClockMs: 90000,
 *   activeMs: 75000,
 *   idleMs: 15000,
 *   pauseCount: 0,
 *   focusLossCount: 1,
 *   visibilityHiddenCount: 0,
 *   confidence: 'medium',
 *   confidenceReasons: ['focus_loss'],
 * };
 * ```
 */
export type PracticeTimingSummary = z.infer<typeof practiceTimingSummarySchema>;

/** Zod schema for a single practice submission part. */
export const practiceSubmissionPartSchema = z.object({
  partId: z.string().trim().min(1),
  rawAnswer: z.unknown(),
  normalizedAnswer: z.string().optional(),
  isCorrect: z.boolean().optional(),
  score: z.number().optional(),
  maxScore: z.number().optional(),
  misconceptionTags: z.array(z.string()).optional(),
  hintsUsed: z.number().int().nonnegative().optional(),
  revealStepsSeen: z.number().int().nonnegative().optional(),
  changedCount: z.number().int().nonnegative().optional(),
  firstInteractionAt: z.string().min(1).optional(),
  answeredAt: z.string().min(1).optional(),
  wallClockMs: z.number().nonnegative().optional(),
  activeMs: z.number().nonnegative().optional(),
});

/**
 * Individual part/answer within a practice submission.
 *
 * @example
 * ```ts
 * const part: PracticeSubmissionPart = {
 *   partId: 'a1',
 *   rawAnswer: { x: 3 },
 *   normalizedAnswer: '{"x":3}',
 *   isCorrect: true,
 *   hintsUsed: 0,
 *   misconceptionTags: [],
 * };
 * ```
 */
export type PracticeSubmissionPart = z.infer<typeof practiceSubmissionPartSchema>;

/** Zod schema for the canonical practice submission envelope. */
export const practiceSubmissionEnvelopeSchema = z.object({
  contractVersion: z.literal(PRACTICE_CONTRACT_VERSION),
  activityId: convexActivityIdSchema,
  mode: practiceModeSchema,
  status: practiceSubmissionStatusSchema,
  attemptNumber: z.number().int().positive(),
  submittedAt: z.string().min(1),
  answers: jsonRecordSchema,
  parts: z.array(practiceSubmissionPartSchema),
  artifact: jsonRecordSchema.optional(),
  interactionHistory: z.array(z.unknown()).optional(),
  analytics: jsonRecordSchema.optional(),
  studentFeedback: z.string().optional(),
  teacherSummary: z.string().optional(),
  timing: practiceTimingSummarySchema.optional(),
});

/**
 * Canonical envelope for a practice.v1 submission.
 *
 * This is the shape that should be persisted, sent to SRS adapters,
 * and passed to grading/analytics pipelines.
 *
 * @example
 * ```ts
 * const envelope: PracticeSubmissionEnvelope = {
 *   contractVersion: 'practice.v1',
 *   activityId: 'act_123',
 *   mode: 'independent_practice',
 *   status: 'submitted',
 *   attemptNumber: 1,
 *   submittedAt: '2026-04-17T08:01:30Z',
 *   answers: { a1: { x: 3 } },
 *   parts: [part],
 *   timing: timingSummary,
 * };
 * ```
 */
export type PracticeSubmissionEnvelope = z.infer<typeof practiceSubmissionEnvelopeSchema>;

/**
 * Alias for the submission envelope when used as a callback payload.
 */
export type PracticeSubmissionCallbackPayload = PracticeSubmissionEnvelope;

/**
 * Narrowing guard that checks whether a value is a practice.v1 envelope.
 *
 * Performs a lightweight check on `contractVersion` only. For full
 * validation, use `practiceSubmissionEnvelopeSchema.parse()`.
 *
 * @example
 * ```ts
 * if (isPracticeSubmissionEnvelope(value)) {
 *   // value.contractVersion === 'practice.v1'
 * }
 * ```
 */
export function isPracticeSubmissionEnvelope(
  value: unknown,
): value is PracticeSubmissionEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'contractVersion' in value &&
    (value as { contractVersion?: unknown }).contractVersion === PRACTICE_CONTRACT_VERSION
  );
}

const practiceSubmissionInputSchema = z.object({
  contractVersion: z.literal(PRACTICE_CONTRACT_VERSION).optional(),
  activityId: convexActivityIdSchema.optional(),
  mode: practiceModeSchema.optional(),
  status: practiceSubmissionStatusSchema.optional(),
  attemptNumber: z.number().int().positive().optional(),
  submittedAt: z.union([z.string().min(1), z.date()]).optional(),
  answers: jsonRecordSchema.optional(),
  responses: jsonRecordSchema.optional(),
  parts: z.array(practiceSubmissionPartSchema).optional(),
  artifact: jsonRecordSchema.optional(),
  interactionHistory: z.array(z.unknown()).optional(),
  analytics: jsonRecordSchema.optional(),
  metadata: jsonRecordSchema.optional(),
  studentFeedback: z.string().optional(),
  teacherSummary: z.string().optional(),
  timing: practiceTimingSummarySchema.optional(),
});

/**
 * Loosely-typed input shape for normalizing a practice submission.
 *
 * Used when parsing incoming data from forms, APIs, or external sources.
 */
export type PracticeSubmissionInput = z.infer<typeof practiceSubmissionInputSchema>;

/**
 * Build `PracticeSubmissionPart` objects from a plain answers record.
 *
 * Automatically normalizes each answer into `normalizedAnswer`.
 *
 * @example
 * ```ts
 * const parts = buildPracticeSubmissionParts({ a1: 5, a2: 'x' });
 * // parts[0].normalizedAnswer === '5'
 * // parts[1].normalizedAnswer === 'x'
 * ```
 */
export function buildPracticeSubmissionParts(
  answers: Record<string, unknown>,
): PracticeSubmissionPart[] {
  return Object.entries(answers).map(([partId, rawAnswer]) => ({
    partId,
    rawAnswer,
    normalizedAnswer: normalizePracticeValue(rawAnswer),
  }));
}

/**
 * Build a fully validated `PracticeSubmissionEnvelope` from structured input.
 *
 * @example
 * ```ts
 * const envelope = buildPracticeSubmissionEnvelope({
 *   activityId: 'act_123',
 *   mode: 'independent_practice',
 *   answers: { a1: 42 },
 *   timing: timingSummary,
 * });
 * ```
 */
export function buildPracticeSubmissionEnvelope(input: {
  activityId: string;
  mode: z.infer<typeof practiceModeSchema>;
  status?: z.infer<typeof practiceSubmissionStatusSchema>;
  attemptNumber?: number;
  submittedAt?: string | Date;
  answers: Record<string, unknown>;
  parts?: PracticeSubmissionPart[];
  artifact?: Record<string, unknown>;
  interactionHistory?: unknown[];
  analytics?: Record<string, unknown>;
  studentFeedback?: string;
  teacherSummary?: string;
  timing?: PracticeTimingSummary;
}): PracticeSubmissionEnvelope {
  return practiceSubmissionEnvelopeSchema.parse({
    contractVersion: PRACTICE_CONTRACT_VERSION,
    activityId: input.activityId,
    mode: input.mode,
    status: input.status ?? 'submitted',
    attemptNumber: input.attemptNumber ?? 1,
    submittedAt: normalizeSubmittedAt(input.submittedAt ?? new Date()),
    answers: input.answers,
    parts: input.parts ?? buildPracticeSubmissionParts(input.answers),
    artifact: input.artifact,
    interactionHistory: input.interactionHistory,
    analytics: input.analytics,
    studentFeedback: input.studentFeedback,
    teacherSummary: input.teacherSummary,
    timing: input.timing,
  });
}

/**
 * Normalize loose input into a validated `PracticeSubmissionEnvelope`.
 *
 * Useful when ingesting data from untrusted sources (forms, APIs, etc.).
 * Falls back to provided defaults for missing required fields.
 *
 * @throws Error if `activityId` cannot be resolved.
 *
 * @example
 * ```ts
 * const envelope = normalizePracticeSubmissionInput(rawBody, {
 *   activityId: 'act_default',
 *   mode: 'assessment',
 * });
 * ```
 */
export function normalizePracticeSubmissionInput(
  input: unknown,
  defaults: {
    activityId?: string;
    mode?: z.infer<typeof practiceModeSchema>;
    status?: z.infer<typeof practiceSubmissionStatusSchema>;
    attemptNumber?: number;
    submittedAt?: string | Date;
  } = {},
): PracticeSubmissionEnvelope {
  const parsed = practiceSubmissionInputSchema.parse(input);

  const activityId = parsed.activityId ?? defaults.activityId;
  if (!activityId) {
    throw new Error('activityId is required to normalize a practice submission.');
  }

  const answers = parsed.answers ?? parsed.responses ?? {};
  const submittedAt = parsed.submittedAt ?? defaults.submittedAt ?? new Date();
  const analytics = parsed.analytics ?? parsed.metadata;

  return practiceSubmissionEnvelopeSchema.parse({
    contractVersion: PRACTICE_CONTRACT_VERSION,
    activityId,
    mode: parsed.mode ?? defaults.mode ?? 'assessment',
    status: parsed.status ?? defaults.status ?? 'submitted',
    attemptNumber: parsed.attemptNumber ?? defaults.attemptNumber ?? 1,
    submittedAt: normalizeSubmittedAt(submittedAt),
    answers,
    parts: parsed.parts ?? buildPracticeSubmissionParts(answers),
    artifact: parsed.artifact,
    interactionHistory: parsed.interactionHistory,
    analytics,
    studentFeedback: parsed.studentFeedback,
    teacherSummary: parsed.teacherSummary,
    timing: parsed.timing,
  });
}
