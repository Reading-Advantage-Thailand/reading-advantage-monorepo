/**
 * Phase 3 Red Test — Calibration review-queue builder (FR6, AC6)
 *
 * Track 3: Edge Calibration Loop.
 *
 * Pin the API surface for the pure review-queue builder that consumes
 * the calibration state (α, β) and authored edge metadata (weight,
 * confidence) and emits a `CalibrationReviewQueueItem` only when the
 * calibrated posterior diverges from the authored values beyond a
 * configurable threshold.
 *
 * Per test-strategy.md §3 and §5 (Phase 3):
 *   - Flag edges diverging from authored weight/confidence beyond
 *     threshold; attach contingency table.
 *   - Divergence threshold (FR6): boundary tests at threshold ε for
 *     both weight and confidence axes.
 *   - Authored weight comparison: edges with `derived: true` in
 *     `KnowledgeSpaceEdge` should be excluded (or flagged separately)
 *     from human-authored edges in the queue.
 *   - `untested` edges must not be flagged — there is no posterior to
 *     compare against, only the confounding guardrail.
 *   - Batch builder `buildReviewQueue` must be a pure mapping (no
 *     shared state) so N+1 protection at the persistence layer is
 *     enforceable.
 */
import { describe, it, expect, vi } from 'vitest';
import type {
  CalibrationObservation,
  CalibrationReviewQueueItem,
  EdgeCalibration,
} from '../srs/edge-calibration.js';
import {
  buildReviewQueueItem,
  buildReviewQueue,
  type ReviewQueueBuildInput,
  type ReviewQueueBuildOptions,
} from '../srs/edge-calibration.js';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Create a default EdgeCalibration with optional overrides.
 * @param {Partial<EdgeCalibration>} overrides - Partial calibration fields to override
 * @returns {EdgeCalibration} - EdgeCalibration with sensible defaults
 */
function makeCalibration(overrides: Partial<EdgeCalibration> = {}): EdgeCalibration {
  return {
    edgeId: 'edge.prereq.a-to-b',
    alpha: 1,
    beta: 1,
    status: 'untested',
    lastUpdated: 1700000000000,
    ...overrides,
  };
}

/**
 * Create a CalibrationObservation with the given verdicts.
 * @param {boolean} a - Proficiency verdict for A
 * @param {boolean} b - Proficiency verdict for B
 * @returns {CalibrationObservation} - CalibrationObservation with a fixed student ID
 */
function makeObs(a: boolean, b: boolean): CalibrationObservation {
  return { studentId: 's', a, b };
}

/**
 * Create a default ReviewQueueBuildInput with optional overrides.
 * @param {Partial<ReviewQueueBuildInput>} overrides - Partial input fields to override
 * @returns {ReviewQueueBuildInput} - ReviewQueueBuildInput with sensible defaults
 */
function makeInput(overrides: Partial<ReviewQueueBuildInput> = {}): ReviewQueueBuildInput {
  return {
    edgeId: 'edge.prereq.a-to-b',
    authoredWeight: 0.9,
    authoredConfidence: 'high',
    calibration: makeCalibration({ alpha: 8, beta: 2, status: 'confirmed' }),
    observations: [
      makeObs(true, true),
      makeObs(true, true),
      makeObs(true, true),
      makeObs(true, false),
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Task 3.1 — buildReviewQueueItem: divergence flagging
// ---------------------------------------------------------------------------

describe('buildReviewQueueItem (FR6, AC6)', () => {
  it('returns a CalibrationReviewQueueItem when the calibrated weight diverges from the authored weight beyond the default threshold', () => {
    const input = makeInput({
      edgeId: 'edge.weight-diverges',
      authoredWeight: 0.9,
      authoredConfidence: 'high',
      calibration: makeCalibration({
        edgeId: 'edge.weight-diverges',
        alpha: 2,
        beta: 8,
        status: 'refuted',
      }),
    });

    const item = buildReviewQueueItem(input);
    expect(item).not.toBeNull();
    expect(item!.edgeId).toBe('edge.weight-diverges');
    expect(item!.authoredWeight).toBe(0.9);
    expect(item!.authoredConfidence).toBe('high');
    expect(item!.calibratedWeight).toBeCloseTo(0.2, 5);
    expect(item!.calibratedConfidence).toBe('low');
    expect(item!.divergence).toBeGreaterThan(0);
  });

  it('returns null when the calibrated posterior matches the authored weight within the default threshold', () => {
    const input = makeInput({
      edgeId: 'edge.matches',
      authoredWeight: 0.8,
      authoredConfidence: 'high',
      calibration: makeCalibration({
        edgeId: 'edge.matches',
        alpha: 8,
        beta: 2,
        status: 'confirmed',
      }),
    });

    const item = buildReviewQueueItem(input);
    expect(item).toBeNull();
  });

  it('returns null for an `untested` edge (FR5 confounding guardrail — no posterior to diverge from)', () => {
    const input = makeInput({
      edgeId: 'edge.untested',
      authoredWeight: 0.9,
      authoredConfidence: 'high',
      calibration: makeCalibration({
        edgeId: 'edge.untested',
        alpha: 0,
        beta: 0,
        status: 'untested',
      }),
    });

    const item = buildReviewQueueItem(input);
    expect(item).toBeNull();
  });

  it('attaches the full contingency table derived from the provided observations', () => {
    const input = makeInput({
      edgeId: 'edge.observed',
      observations: [
        makeObs(true, true),
        makeObs(true, true),
        makeObs(true, false),
        makeObs(false, true),
        makeObs(false, false),
        makeObs(false, false),
      ],
      authoredWeight: 0.9,
      authoredConfidence: 'high',
      calibration: makeCalibration({
        edgeId: 'edge.observed',
        alpha: 2,
        beta: 8,
        status: 'refuted',
      }),
    });

    const item = buildReviewQueueItem(input);
    expect(item).not.toBeNull();
    expect(item!.contingencyTable).toEqual({
      proficientAProficientB: 2,
      proficientANotProficientB: 1,
      notProficientAProficientB: 1,
      notProficientANotProficientB: 2,
    });
  });

  it('exposes necessity and informativeness computed from the contingency table (FR2)', () => {
    const input = makeInput({
      edgeId: 'edge.fr2',
      observations: [
        makeObs(true, true),
        makeObs(true, true),
        makeObs(true, false),
        makeObs(false, true),
        makeObs(false, false),
        makeObs(false, false),
        makeObs(false, false),
        makeObs(false, false),
        makeObs(false, false),
      ],
      authoredWeight: 0.9,
      authoredConfidence: 'high',
      calibration: makeCalibration({
        edgeId: 'edge.fr2',
        alpha: 2,
        beta: 8,
        status: 'refuted',
      }),
    });

    const item = buildReviewQueueItem(input);
    expect(item).not.toBeNull();
    // v2 exposed the violation rate 1/6. v3 exposes necessity as its
    // complement: 1 - P(profB | !A) = 5/6.
    expect(item!.necessity).toBeCloseTo(5 / 6, 5);
    // informativeness = P(profB | A) − P(profB | !A) = 2/3 − 1/6 = 1/2
    expect(item!.informativeness).toBeCloseTo(1 / 2, 5);
  });

  it('records the flaggedAt timestamp from the `now` option (default falls back to Date.now())', () => {
    const input = makeInput();
    const fixedNow = 1_800_000_000_000;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
    const item = buildReviewQueueItem(input, { now: 1_700_000_000_000 });
    expect(item).not.toBeNull();
    expect(item!.flaggedAt).toBe(1_700_000_000_000);
    // Freeze the clock so the default-path boundary is deterministic even on
    // coarse or virtualized clocks.
    const defaulted = buildReviewQueueItem(input);
    expect(defaulted).not.toBeNull();
    expect(defaulted!.flaggedAt).toBe(fixedNow);
    clock.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Task 3.2 — Divergence threshold (FR6): boundary tests on both axes
// ---------------------------------------------------------------------------

describe('divergence threshold (FR6) — boundary tests', () => {
  it('flags when weight divergence strictly exceeds the weight threshold (off-by-one guard)', () => {
    // authored 0.5 vs calibrated 0.75 → |0.25| > 0.2 → flag
    const over = buildReviewQueueItem(
      makeInput({
        edgeId: 'edge.weight-over',
        authoredWeight: 0.5,
        authoredConfidence: 'medium',
        calibration: makeCalibration({
          edgeId: 'edge.weight-over',
          alpha: 3,
          beta: 1,
          status: 'confirmed',
        }),
      }),
      { weightThreshold: 0.2, confidenceThreshold: 1.1 },
    );
    expect(over).not.toBeNull();
  });

  it('does not flag when weight divergence is exactly at the threshold (inclusive lower bound)', () => {
    // authored 0.5 vs calibrated 0.7 → |0.2| === 0.2 → not flagged
    const exact = buildReviewQueueItem(
      makeInput({
        edgeId: 'edge.weight-exact',
        authoredWeight: 0.5,
        authoredConfidence: 'medium',
        calibration: makeCalibration({
          edgeId: 'edge.weight-exact',
          alpha: 7,
          beta: 3,
          status: 'confirmed',
        }),
      }),
      { weightThreshold: 0.2, confidenceThreshold: 1.1 },
    );
    expect(exact).toBeNull();
  });

  it('does not flag when weight divergence is below the threshold', () => {
    const below = buildReviewQueueItem(
      makeInput({
        edgeId: 'edge.weight-below',
        authoredWeight: 0.5,
        authoredConfidence: 'medium',
        calibration: makeCalibration({
          edgeId: 'edge.weight-below',
          alpha: 6,
          beta: 4,
          status: 'confirmed',
        }),
      }),
      { weightThreshold: 0.2, confidenceThreshold: 1.1 },
    );
    expect(below).toBeNull();
  });

  it('flags when confidence ordinal distance exceeds the confidence threshold (independent axis)', () => {
    // weight matches but confidence diverges: 'low' vs 'high' → distance 2/2 = 1
    const conf = buildReviewQueueItem(
      makeInput({
        edgeId: 'edge.conf-diverges',
        authoredWeight: 0.6,
        authoredConfidence: 'high',
        calibration: makeCalibration({
          edgeId: 'edge.conf-diverges',
          alpha: 6,
          beta: 4,
          status: 'confirmed',
        }),
      }),
      { weightThreshold: 0.5, confidenceThreshold: 0.5 },
    );
    expect(conf).not.toBeNull();
  });

  it('does not flag when both weight and confidence divergences are within thresholds', () => {
    const ok = buildReviewQueueItem(
      makeInput({
        edgeId: 'edge.in-bounds',
        authoredWeight: 0.6,
        authoredConfidence: 'medium',
        calibration: makeCalibration({
          edgeId: 'edge.in-bounds',
          alpha: 6,
          beta: 4,
          status: 'confirmed',
        }),
      }),
      { weightThreshold: 0.2, confidenceThreshold: 0.5 },
    );
    expect(ok).toBeNull();
  });

  it('reports the actual numeric divergence on the returned queue item', () => {
    const item = buildReviewQueueItem(
      makeInput({
        edgeId: 'edge.divergence-magnitude',
        authoredWeight: 0.9,
        authoredConfidence: 'high',
        calibration: makeCalibration({
          edgeId: 'edge.divergence-magnitude',
          alpha: 1,
          beta: 9,
          status: 'refuted',
        }),
      }),
      { weightThreshold: 0.2, confidenceThreshold: 0.5 },
    );
    expect(item).not.toBeNull();
    expect(item!.divergence).toBeGreaterThan(0.2);
    expect(item!.divergence).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Task 3.3 — derived edges: exclude or flag separately
// ---------------------------------------------------------------------------

describe('derived edges (KnowledgeSpaceEdge.derived)', () => {
  it('skips a derived edge by default (human-authored edges are what the review queue surfaces)', () => {
    const input = makeInput({
      edgeId: 'edge.derived',
      derived: true,
      authoredWeight: 0.9,
      authoredConfidence: 'high',
      calibration: makeCalibration({
        edgeId: 'edge.derived',
        alpha: 1,
        beta: 9,
        status: 'refuted',
      }),
    });

    const item = buildReviewQueueItem(input);
    expect(item).toBeNull();
  });

  it('includes a derived edge when `includeDerived` is true (opt-in flagging)', () => {
    const input = makeInput({
      edgeId: 'edge.derived-included',
      derived: true,
      authoredWeight: 0.9,
      authoredConfidence: 'high',
      calibration: makeCalibration({
        edgeId: 'edge.derived-included',
        alpha: 1,
        beta: 9,
        status: 'refuted',
      }),
    });

    const item = buildReviewQueueItem(input, { includeDerived: true });
    expect(item).not.toBeNull();
    expect(item!.edgeId).toBe('edge.derived-included');
  });
});

// ---------------------------------------------------------------------------
// Task 3.4 — buildReviewQueue: batch builder
// ---------------------------------------------------------------------------

describe('buildReviewQueue (batch)', () => {
  it('returns an empty array when given no inputs', () => {
    const queue = buildReviewQueue([]);
    expect(queue).toEqual([]);
  });

  it('returns a queue item for each input whose posterior diverges from its authored values', () => {
    const inputs: ReviewQueueBuildInput[] = [
      makeInput({
        edgeId: 'edge.flag-1',
        authoredWeight: 0.9,
        authoredConfidence: 'high',
        calibration: makeCalibration({
          edgeId: 'edge.flag-1',
          alpha: 1,
          beta: 9,
          status: 'refuted',
        }),
      }),
      makeInput({
        edgeId: 'edge.ok',
        authoredWeight: 0.6,
        authoredConfidence: 'medium',
        calibration: makeCalibration({
          edgeId: 'edge.ok',
          alpha: 6,
          beta: 4,
          status: 'confirmed',
        }),
      }),
      makeInput({
        edgeId: 'edge.flag-2',
        authoredWeight: 0.3,
        authoredConfidence: 'low',
        calibration: makeCalibration({
          edgeId: 'edge.flag-2',
          alpha: 9,
          beta: 1,
          status: 'confirmed',
        }),
      }),
    ];

    const queue = buildReviewQueue(inputs);
    expect(queue).toHaveLength(2);
    const ids = queue.map((q) => q.edgeId).sort();
    expect(ids).toEqual(['edge.flag-1', 'edge.flag-2']);
  });

  it('is a pure mapping: does not mutate any input', () => {
    const inputs: ReviewQueueBuildInput[] = [
      makeInput({ edgeId: 'edge.a' }),
      makeInput({ edgeId: 'edge.b' }),
    ];
    const snapshot = JSON.stringify(inputs);
    buildReviewQueue(inputs);
    expect(JSON.stringify(inputs)).toBe(snapshot);
  });

  it('produces queue items in the order their inputs were provided (stable for audit replay)', () => {
    const inputs: ReviewQueueBuildInput[] = [
      makeInput({
        edgeId: 'edge.first',
        authoredWeight: 0.9,
        authoredConfidence: 'high',
        calibration: makeCalibration({
          edgeId: 'edge.first',
          alpha: 1,
          beta: 9,
          status: 'refuted',
        }),
      }),
      makeInput({
        edgeId: 'edge.second',
        authoredWeight: 0.2,
        authoredConfidence: 'low',
        calibration: makeCalibration({
          edgeId: 'edge.second',
          alpha: 9,
          beta: 1,
          status: 'confirmed',
        }),
      }),
    ];

    const queue = buildReviewQueue(inputs);
    expect(queue.map((q) => q.edgeId)).toEqual(['edge.first', 'edge.second']);
  });

  it('propagates a shared options object to every input (single threshold applies to the batch)', () => {
    const inputs: ReviewQueueBuildInput[] = [
      makeInput({
        edgeId: 'edge.tight',
        authoredWeight: 0.6,
        authoredConfidence: 'medium',
        calibration: makeCalibration({
          edgeId: 'edge.tight',
          alpha: 7,
          beta: 3,
          status: 'confirmed',
        }),
      }),
      makeInput({
        edgeId: 'edge.tight-2',
        authoredWeight: 0.6,
        authoredConfidence: 'medium',
        calibration: makeCalibration({
          edgeId: 'edge.tight-2',
          alpha: 7,
          beta: 3,
          status: 'confirmed',
        }),
      }),
    ];

    const opts: ReviewQueueBuildOptions = { weightThreshold: 0.05 };
    const queue = buildReviewQueue(inputs, opts);
    // |0.6 − 0.7| = 0.1 > 0.05 → both should be flagged under the tight threshold
    expect(queue).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Task 3.5 — Type contract: the builder returns the canonical queue shape
// ---------------------------------------------------------------------------

describe('buildReviewQueueItem — type contract', () => {
  it('returns a value assignable to CalibrationReviewQueueItem', () => {
    const item = buildReviewQueueItem(
      makeInput({
        edgeId: 'edge.shape',
        authoredWeight: 0.9,
        authoredConfidence: 'high',
        calibration: makeCalibration({
          edgeId: 'edge.shape',
          alpha: 1,
          beta: 9,
          status: 'refuted',
        }),
      }),
    );
    const asContract: CalibrationReviewQueueItem | null = item;
    expect(asContract).not.toBeNull();
  });
});
