/**
 * Phase 1 Contract Test — Edge Calibration types
 *
 * Track 3: Edge Calibration Loop.
 *
 * This test asserts the *contract* surface for the calibration types that
 * Phase 1 must establish in `packages/srs-engine/src/srs/edge-calibration.ts`:
 *   - The three-value `CalibrationStatus` enum is exhaustively handled in a
 *     discriminated switch (TypeScript will fail compilation if a case is
 *     added to the enum without a corresponding switch arm).
 *   - The structural shape of the calibration types matches the spec.
 *
 * No feature logic is exercised here — this is the Red-phase contract for
 * the type module that Phase 2 (calibration core) and Phase 3 (persistence)
 * will build on.
 */
import { describe, it, expect } from 'vitest';
import type {
  CalibrationStatus,
  CalibrationVerdict,
  CalibrationObservation,
  CalibrationContingencyTable,
  EdgeCalibration,
  CalibrationNecessityResult,
  CalibrationReviewQueueItem,
} from '../srs/edge-calibration.js';
import { CALIBRATION_STATUS_VALUES } from '../srs/edge-calibration.js';

// ---------------------------------------------------------------------------
// Task 1.1 — Status enum exhaustiveness
// ---------------------------------------------------------------------------

describe('contract — CalibrationStatus enum', () => {
  it('exposes exactly the three values defined in spec FR5', () => {
    expect([...CALIBRATION_STATUS_VALUES].sort()).toEqual(
      ['confirmed', 'refuted', 'untested'].sort(),
    );
  });

  it('has a case in the exhaustive switch for every status value', () => {
    const labelFor = (s: CalibrationStatus): string => {
      switch (s) {
        case 'confirmed':
          return 'evidence supports the authored edge';
        case 'refuted':
          return 'evidence contradicts the authored edge';
        case 'untested':
          return 'no student has attempted B without a verdict on A (FR5 guardrail)';
        default: {
          const _exhaustive: never = s;
          return _exhaustive;
        }
      }
    };

    for (const status of CALIBRATION_STATUS_VALUES) {
      const label = labelFor(status);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 1.2 — Observation type shape
// ---------------------------------------------------------------------------

describe('contract — CalibrationObservation', () => {
  it('carries the student id and the paired (A, B) verdicts', () => {
    const obs: CalibrationObservation = {
      studentId: 'student-1',
      a: true,
      b: false,
    };
    expect(obs.studentId).toBe('student-1');
    expect(obs.a).toBe(true);
    expect(obs.b).toBe(false);
  });

  it('accepts a CalibrationVerdict (boolean) on each side', () => {
    const verdict: CalibrationVerdict = true;
    const obs: CalibrationObservation = { studentId: 's', a: verdict, b: verdict };
    expect(obs.a).toBe(verdict);
    expect(obs.b).toBe(verdict);
  });
});

// ---------------------------------------------------------------------------
// Task 1.3 — Contingency table shape (FR2)
// ---------------------------------------------------------------------------

describe('contract — CalibrationContingencyTable', () => {
  it('exposes the 2x2 counts (A-proficient x B-proficient)', () => {
    const table: CalibrationContingencyTable = {
      proficientAProficientB: 10,
      proficientANotProficientB: 2,
      notProficientAProficientB: 1,
      notProficientANotProficientB: 5,
    };
    expect(table.proficientAProficientB).toBe(10);
    expect(table.proficientANotProficientB).toBe(2);
    expect(table.notProficientAProficientB).toBe(1);
    expect(table.notProficientANotProficientB).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Task 1.4 — EdgeCalibration record shape (FR3, FR7)
// ---------------------------------------------------------------------------

describe('contract — EdgeCalibration', () => {
  it('carries the Beta(α, β) parameters, status, and lastUpdated', () => {
    const rec: EdgeCalibration = {
      edgeId: 'edge.prereq.a-to-b',
      alpha: 12,
      beta: 3,
      status: 'confirmed',
      lastUpdated: 1700000000000,
    };
    expect(rec.edgeId).toBe('edge.prereq.a-to-b');
    expect(rec.alpha).toBe(12);
    expect(rec.beta).toBe(3);
    expect(rec.status).toBe('confirmed');
    expect(rec.lastUpdated).toBe(1700000000000);
  });

  it('permits the "untested" status to distinguish it from "confirmed" (FR5)', () => {
    const rec: EdgeCalibration = {
      edgeId: 'edge.prereq.x-to-y',
      alpha: 1,
      beta: 1,
      status: 'untested',
      lastUpdated: 1700000000000,
    };
    expect(rec.status).toBe('untested');
  });
});

// ---------------------------------------------------------------------------
// Task 1.5 — Necessity / informativeness result shape (FR2)
// ---------------------------------------------------------------------------

describe('contract — CalibrationNecessityResult', () => {
  it('exposes necessity, informativeness, sample size, and a derived status', () => {
    const result: CalibrationNecessityResult = {
      edgeId: 'edge.prereq.a-to-b',
      necessity: 0.83,
      informativeness: 0.41,
      sampleSize: 18,
      status: 'confirmed',
    };
    expect(result.necessity).toBe(0.83);
    expect(result.informativeness).toBe(0.41);
    expect(result.sampleSize).toBe(18);
    expect(result.status).toBe('confirmed');
  });
});

// ---------------------------------------------------------------------------
// Task 1.6 — Review queue item shape (FR6)
// ---------------------------------------------------------------------------

describe('contract — CalibrationReviewQueueItem', () => {
  it('attaches the contingency table and both authored and calibrated weights/confidences', () => {
    const item: CalibrationReviewQueueItem = {
      edgeId: 'edge.prereq.a-to-b',
      contingencyTable: {
        proficientAProficientB: 10,
        proficientANotProficientB: 2,
        notProficientAProficientB: 1,
        notProficientANotProficientB: 5,
      },
      authoredWeight: 0.9,
      authoredConfidence: 'high',
      calibratedWeight: 0.6,
      calibratedConfidence: 'medium',
      necessity: 0.83,
      informativeness: 0.41,
      divergence: 0.3,
      flaggedAt: 1700000000000,
    };
    expect(item.edgeId).toBe('edge.prereq.a-to-b');
    expect(item.contingencyTable.proficientAProficientB).toBe(10);
    expect(item.authoredWeight).toBe(0.9);
    expect(item.authoredConfidence).toBe('high');
    expect(item.calibratedWeight).toBe(0.6);
    expect(item.calibratedConfidence).toBe('medium');
    expect(item.divergence).toBe(0.3);
  });
});
