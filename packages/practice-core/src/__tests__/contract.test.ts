import { describe, it, expect } from 'vitest';
import {
  normalizePracticeValue,
  buildPracticeSubmissionParts,
  buildPracticeSubmissionEnvelope,
  normalizePracticeSubmissionInput,
  isPracticeSubmissionEnvelope,
  PRACTICE_CONTRACT_VERSION,
  practiceSubmissionEnvelopeSchema,
} from '../practice/contract.js';

describe('normalizePracticeValue (package)', () => {
  describe('strings', () => {
    it('trims and lowercases strings', () => {
      expect(normalizePracticeValue('  Hello ')).toBe('hello');
    });

    it('handles empty strings', () => {
      expect(normalizePracticeValue('')).toBe('');
    });
  });

  describe('numbers', () => {
    it('stringifies numbers', () => {
      expect(normalizePracticeValue(42)).toBe('42');
    });

    it('handles zero', () => {
      expect(normalizePracticeValue(0)).toBe('0');
    });

    it('handles negative numbers', () => {
      expect(normalizePracticeValue(-3.14)).toBe('-3.14');
    });
  });

  describe('booleans', () => {
    it('stringifies true', () => {
      expect(normalizePracticeValue(true)).toBe('true');
    });

    it('stringifies false', () => {
      expect(normalizePracticeValue(false)).toBe('false');
    });
  });

  describe('arrays', () => {
    it('sorts and pipe-delimits arrays of strings', () => {
      expect(normalizePracticeValue(['b', 'a'])).toBe('a|b');
    });

    it('handles nested arrays', () => {
      expect(normalizePracticeValue([['b'], ['a']])).toBe('a|b');
    });

    it('handles empty arrays', () => {
      expect(normalizePracticeValue([])).toBe('');
    });
  });

  describe('null/undefined', () => {
    it('returns empty string for null', () => {
      expect(normalizePracticeValue(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(normalizePracticeValue(undefined)).toBe('');
    });
  });

  describe('objects', () => {
    it('JSON-stringifies plain objects', () => {
      expect(normalizePracticeValue({ x: 3 })).toBe('{"x":3}');
    });
  });
});

describe('buildPracticeSubmissionParts (package)', () => {
  it('creates parts from answers record', () => {
    const parts = buildPracticeSubmissionParts({ a1: 5, a2: 'x' });
    expect(parts).toHaveLength(2);
    expect(parts[0].partId).toBe('a1');
    expect(parts[0].rawAnswer).toBe(5);
    expect(parts[0].normalizedAnswer).toBe('5');
    expect(parts[1].partId).toBe('a2');
    expect(parts[1].normalizedAnswer).toBe('x');
  });

  it('normalizes numeric string answers', () => {
    const parts = buildPracticeSubmissionParts({ q1: '42' });
    expect(parts[0].normalizedAnswer).toBe('42');
  });

  it('handles boolean answers', () => {
    const parts = buildPracticeSubmissionParts({ q1: true });
    expect(parts[0].normalizedAnswer).toBe('true');
  });

  it('handles null answers', () => {
    const parts = buildPracticeSubmissionParts({ q1: null });
    expect(parts[0].normalizedAnswer).toBe('');
  });
});

describe('buildPracticeSubmissionEnvelope (package)', () => {
  it('builds a valid envelope with minimal input', () => {
    const envelope = buildPracticeSubmissionEnvelope({
      activityId: 'act_123',
      mode: 'independent_practice',
      answers: { a1: 42 },
    });

    expect(envelope.contractVersion).toBe(PRACTICE_CONTRACT_VERSION);
    expect(envelope.activityId).toBe('act_123');
    expect(envelope.mode).toBe('independent_practice');
    expect(envelope.status).toBe('submitted');
    expect(envelope.attemptNumber).toBe(1);
    expect(envelope.answers).toEqual({ a1: 42 });
    expect(envelope.parts).toHaveLength(1);
  });

  it('applies custom attempt number', () => {
    const envelope = buildPracticeSubmissionEnvelope({
      activityId: 'act_123',
      mode: 'assessment',
      attemptNumber: 3,
      answers: { a1: 10 },
    });

    expect(envelope.attemptNumber).toBe(3);
  });

  it('accepts Date for submittedAt and converts to ISO string', () => {
    const date = new Date('2026-04-17T10:00:00Z');
    const envelope = buildPracticeSubmissionEnvelope({
      activityId: 'act_123',
      mode: 'independent_practice',
      submittedAt: date,
      answers: { a1: 5 },
    });

    expect(envelope.submittedAt).toBe('2026-04-17T10:00:00.000Z');
  });

  it('throws when required fields missing', () => {
    expect(() =>
      buildPracticeSubmissionEnvelope({
        // @ts-expect-error - testing runtime behavior
        activityId: undefined,
        mode: 'independent_practice',
        answers: {},
      }),
    ).toThrow();
  });

  it('includes timing when provided', () => {
    const timing = {
      startedAt: '2026-04-17T08:00:00Z',
      submittedAt: '2026-04-17T08:01:30Z',
      wallClockMs: 90000,
      activeMs: 75000,
      idleMs: 15000,
      pauseCount: 0,
      focusLossCount: 0,
      visibilityHiddenCount: 0,
      confidence: 'high' as const,
    };

    const envelope = buildPracticeSubmissionEnvelope({
      activityId: 'act_123',
      mode: 'independent_practice',
      answers: { a1: 5 },
      timing,
    });

    expect(envelope.timing).toEqual(timing);
  });
});

describe('normalizePracticeSubmissionInput (package)', () => {
  it('normalizes loose input with defaults', () => {
    const envelope = normalizePracticeSubmissionInput(
      { answers: { q1: 10 } },
      { activityId: 'act_default', mode: 'assessment' },
    );

    expect(envelope.activityId).toBe('act_default');
    expect(envelope.mode).toBe('assessment');
    expect(envelope.status).toBe('submitted');
  });

  it('prefers explicit values over defaults', () => {
    const envelope = normalizePracticeSubmissionInput(
      { activityId: 'act_explicit', mode: 'guided_practice', answers: {} },
      { activityId: 'act_default', mode: 'assessment' },
    );

    expect(envelope.activityId).toBe('act_explicit');
    expect(envelope.mode).toBe('guided_practice');
  });

  it('merges responses into answers if answers missing', () => {
    const envelope = normalizePracticeSubmissionInput(
      { responses: { q1: 20 }, answers: undefined },
      { activityId: 'act_test', mode: 'independent_practice' },
    );

    expect(envelope.answers).toEqual({ q1: 20 });
  });

  it('throws when activityId cannot be resolved', () => {
    expect(() =>
      normalizePracticeSubmissionInput(
        { answers: {} },
        { activityId: undefined },
      ),
    ).toThrow('activityId is required');
  });

  it('handles missing submittedAt with default', () => {
    const before = Date.now();
    const envelope = normalizePracticeSubmissionInput(
      { answers: { q1: 1 } },
      { activityId: 'act_test', mode: 'independent_practice' },
    );
    const after = Date.now();

    const parsed = new Date(envelope.submittedAt).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(after);
  });
});

describe('isPracticeSubmissionEnvelope (package)', () => {
  it('returns true for valid practice.v1 envelope', () => {
    const envelope = {
      contractVersion: 'practice.v1',
      activityId: 'act_123',
      mode: 'independent_practice',
      status: 'submitted',
      attemptNumber: 1,
      submittedAt: '2026-04-17T08:00:00Z',
      answers: {},
      parts: [],
    };

    expect(isPracticeSubmissionEnvelope(envelope)).toBe(true);
  });

  it('returns false for wrong contract version', () => {
    const envelope = {
      contractVersion: 'practice.v2',
      activityId: 'act_123',
      mode: 'independent_practice',
      status: 'submitted',
      attemptNumber: 1,
      submittedAt: '2026-04-17T08:00:00Z',
      answers: {},
      parts: [],
    };

    expect(isPracticeSubmissionEnvelope(envelope)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isPracticeSubmissionEnvelope(null)).toBe(false);
  });

  it('returns false for non-object', () => {
    expect(isPracticeSubmissionEnvelope('string')).toBe(false);
    expect(isPracticeSubmissionEnvelope(42)).toBe(false);
  });

  it('returns false for object without contractVersion', () => {
    expect(isPracticeSubmissionEnvelope({ activityId: 'act_123' })).toBe(false);
  });
});

describe('practiceSubmissionEnvelopeSchema (package)', () => {
  it('validates a complete valid envelope', () => {
    const envelope = {
      contractVersion: 'practice.v1',
      activityId: 'act_123',
      mode: 'independent_practice',
      status: 'submitted',
      attemptNumber: 1,
      submittedAt: '2026-04-17T08:00:00Z',
      answers: {},
      parts: [],
    };

    expect(() => practiceSubmissionEnvelopeSchema.parse(envelope)).not.toThrow();
  });

  it('rejects negative attemptNumber', () => {
    const envelope = {
      contractVersion: 'practice.v1',
      activityId: 'act_123',
      mode: 'independent_practice',
      status: 'submitted',
      attemptNumber: -1,
      submittedAt: '2026-04-17T08:00:00Z',
      answers: {},
      parts: [],
    };

    expect(() => practiceSubmissionEnvelopeSchema.parse(envelope)).toThrow();
  });

  it('rejects invalid mode', () => {
    const envelope = {
      contractVersion: 'practice.v1',
      activityId: 'act_123',
      mode: 'invalid_mode',
      status: 'submitted',
      attemptNumber: 1,
      submittedAt: '2026-04-17T08:00:00Z',
      answers: {},
      parts: [],
    };

    expect(() => practiceSubmissionEnvelopeSchema.parse(envelope)).toThrow();
  });

  it('accepts optional timing field', () => {
    const envelope = {
      contractVersion: 'practice.v1',
      activityId: 'act_123',
      mode: 'independent_practice',
      status: 'submitted',
      attemptNumber: 1,
      submittedAt: '2026-04-17T08:00:00Z',
      answers: {},
      parts: [],
      timing: {
        startedAt: '2026-04-17T08:00:00Z',
        submittedAt: '2026-04-17T08:01:00Z',
        wallClockMs: 60000,
        activeMs: 50000,
        idleMs: 10000,
        pauseCount: 0,
        focusLossCount: 0,
        visibilityHiddenCount: 0,
        confidence: 'high',
      },
    };

    expect(() => practiceSubmissionEnvelopeSchema.parse(envelope)).not.toThrow();
  });
});