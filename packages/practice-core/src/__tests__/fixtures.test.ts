import { describe, it, expect } from 'vitest';
import {
  createMockPracticeEnvelope,
  PRACTICE_CONTRACT_VERSION,
} from '../practice/fixtures.js';
import { practiceSubmissionEnvelopeSchema } from '../practice/contract.js';

describe('createMockPracticeEnvelope', () => {
  it('produces a valid envelope with defaults', () => {
    const envelope = createMockPracticeEnvelope();

    expect(envelope.contractVersion).toBe(PRACTICE_CONTRACT_VERSION);
    expect(envelope.activityId).toBe('mock-activity-id');
    expect(envelope.mode).toBe('independent_practice');
    expect(envelope.status).toBe('submitted');
    expect(envelope.attemptNumber).toBe(1);
    expect(envelope.answers).toEqual({});
    expect(envelope.parts).toEqual([]);
    expect(envelope.submittedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Must pass schema validation
    expect(() => practiceSubmissionEnvelopeSchema.parse(envelope)).not.toThrow();
  });

  it('accepts overrides for all fields', () => {
    const envelope = createMockPracticeEnvelope({
      activityId: 'act_override',
      mode: 'assessment',
      status: 'graded',
      attemptNumber: 3,
      answers: { q1: 42 },
      parts: [
        {
          partId: 'q1',
          rawAnswer: 42,
          normalizedAnswer: '42',
          isCorrect: true,
        },
      ],
      studentFeedback: 'Great job',
    });

    expect(envelope.activityId).toBe('act_override');
    expect(envelope.mode).toBe('assessment');
    expect(envelope.status).toBe('graded');
    expect(envelope.attemptNumber).toBe(3);
    expect(envelope.answers).toEqual({ q1: 42 });
    expect(envelope.parts).toHaveLength(1);
    expect(envelope.studentFeedback).toBe('Great job');

    expect(() => practiceSubmissionEnvelopeSchema.parse(envelope)).not.toThrow();
  });

  it('accepts timing override', () => {
    const envelope = createMockPracticeEnvelope({
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
    });

    expect(envelope.timing?.confidence).toBe('high');
    expect(() => practiceSubmissionEnvelopeSchema.parse(envelope)).not.toThrow();
  });

  it('accepts artifact and analytics overrides', () => {
    const envelope = createMockPracticeEnvelope({
      artifact: { kind: 'snapshot' },
      analytics: { source: 'test' },
      interactionHistory: [{ type: 'focus' }],
    });

    expect(envelope.artifact).toEqual({ kind: 'snapshot' });
    expect(envelope.analytics).toEqual({ source: 'test' });
    expect(envelope.interactionHistory).toEqual([{ type: 'focus' }]);

    expect(() => practiceSubmissionEnvelopeSchema.parse(envelope)).not.toThrow();
  });
});
