import {
  PRACTICE_CONTRACT_VERSION,
  practiceSubmissionEnvelopeSchema,
  type PracticeSubmissionEnvelope,
  type PracticeTimingSummary,
  type PracticeSubmissionPart,
} from './contract.js';

/**
 * Create a mock practice.v1 submission envelope for testing.
 *
 * Always emits data compliant with the current contract version.
 * Accepts partial overrides for any field.
 *
 * @example
 * ```ts
 * const envelope = createMockPracticeEnvelope({
 *   activityId: 'act_test',
 *   mode: 'assessment',
 *   answers: { q1: 42 },
 * });
 * ```
 */
export type MockPracticeEnvelopeOverrides = {
  [K in keyof PracticeSubmissionEnvelope]?: K extends 'activityId'
    ? string
    : PracticeSubmissionEnvelope[K];
};

/**
 * Create a mock practice.v1 submission envelope for testing.
 * @param {MockPracticeEnvelopeOverrides} overrides - Partial overrides for any envelope field
 * @returns {PracticeSubmissionEnvelope} - Validated practice submission envelope
 */
export function createMockPracticeEnvelope(
  overrides: MockPracticeEnvelopeOverrides = {},
): PracticeSubmissionEnvelope {
  const now = new Date().toISOString();

  const defaults = {
    contractVersion: PRACTICE_CONTRACT_VERSION,
    activityId: 'mock-activity-id',
    mode: 'independent_practice' as const,
    status: 'submitted' as const,
    attemptNumber: 1,
    submittedAt: now,
    answers: {},
    parts: [],
  };

  const merged = { ...defaults, ...overrides };

  // Re-parse through the canonical schema to ensure the branded activityId
  // and all refinements are applied correctly.
  return practiceSubmissionEnvelopeSchema.parse(merged);
}

/**
 * Create a mock practice timing summary for testing.
 *
 * @example
 * ```ts
 * const timing = createMockPracticeTimingSummary({ confidence: 'low' });
 * ```
 */
export function createMockPracticeTimingSummary(
  overrides: Partial<PracticeTimingSummary> = {},
): PracticeTimingSummary {
  const startedAt = overrides.startedAt ?? new Date().toISOString();
  const submittedAt =
    overrides.submittedAt ?? new Date(Date.now() + 60_000).toISOString();

  return {
    startedAt,
    submittedAt,
    wallClockMs: 60_000,
    activeMs: 50_000,
    idleMs: 10_000,
    pauseCount: 0,
    focusLossCount: 0,
    visibilityHiddenCount: 0,
    confidence: 'medium',
    ...overrides,
  };
}

/**
 * Create a mock practice submission part for testing.
 *
 * @example
 * ```ts
 * const part = createMockPracticeSubmissionPart({
 *   partId: 'q1',
 *   rawAnswer: 42,
 *   isCorrect: true,
 * });
 * ```
 */
export function createMockPracticeSubmissionPart(
  overrides: Partial<PracticeSubmissionPart> = {},
): PracticeSubmissionPart {
  return {
    partId: 'mock-part',
    rawAnswer: null,
    ...overrides,
  };
}

export { PRACTICE_CONTRACT_VERSION };
