import type { SrsCardState, SrsReviewLogEntry, SrsRating } from './contract.js';
import { validateSrsTransition } from './transition-validator.js';

/**
 * Generate a unique card ID using crypto-safe random bytes.
 */
function generateCardId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `card_${hex}`;
}

/**
 * Generate a unique review ID using crypto-safe random bytes.
 */
function generateReviewId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `review_${hex}`;
}

/**
 * Create a mock SRS card state for testing.
 *
 * Always emits data compliant with the srs.contract.v1 card state shape.
 *
 * @example
 * ```ts
 * const card = createMockSrsCard({
 *   studentId: 'stu_001',
 *   objectiveId: 'obj_quadratic',
 *   state: 'review',
 *   reps: 3,
 * });
 * ```
 */
export function createMockSrsCard(
  overrides: Partial<SrsCardState> = {},
): SrsCardState {
  const now = new Date().toISOString();

  return {
    cardId: generateCardId(),
    studentId: 'mock-student',
    objectiveId: 'mock-objective',
    variantKey: 'mock-family',
    stability: 0,
    difficulty: 0,
    state: 'new',
    dueDate: now,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create a mock SRS review log entry for testing.
 *
 * Always emits data compliant with the srs.contract.v1 review log shape.
 *
 * @example
 * ```ts
 * const log = createMockSrsReviewLog({
 *   rating: 'Again',
 *   stateAfter: { state: 'relearning', reps: 2, lapses: 1, stability: 1, difficulty: 5 },
 * });
 * ```
 */
export function createMockSrsReviewLog(
  overrides: Partial<SrsReviewLogEntry> = {},
): SrsReviewLogEntry {
  const now = new Date().toISOString();

  const defaultEvidence: SrsReviewLogEntry['evidence'] = {
    baseRating: 'Good' as SrsRating,
    timingAdjusted: false,
    reasons: ['correct'],
  };

  const entry: SrsReviewLogEntry = {
    reviewId: generateReviewId(),
    cardId: 'mock-card',
    studentId: 'mock-student',
    rating: 'Good',
    submissionId: 'mock-submission',
    evidence: defaultEvidence,
    stateBefore: {
      stability: 0,
      difficulty: 0,
      state: 'new',
      reps: 0,
      lapses: 0,
    },
    stateAfter: {
      stability: 1,
      difficulty: 0,
      state: 'learning',
      reps: 1,
      lapses: 0,
    },
    reviewedAt: now,
    ...overrides,
  };

  // Validate transition invariants unless this is a teacher reset (administrative override).
  if (!('action' in entry.evidence)) {
    validateSrsTransition(entry.stateBefore, entry.stateAfter);
  }

  return entry;
}
