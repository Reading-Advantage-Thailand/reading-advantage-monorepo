import { describe, it, expect } from 'vitest';
import {
  convexActivityIdSchema,
  type ConvexActivityId,
  practiceSubmissionEnvelopeSchema,
  buildPracticeSubmissionEnvelope,
} from '../practice/contract.js';

describe('convexActivityIdSchema', () => {
  it('parses and brands a valid activity ID', () => {
    const result = convexActivityIdSchema.parse('act_123');
    expect(result).toBe('act_123');
  });

  it('rejects empty strings', () => {
    expect(() => convexActivityIdSchema.parse('')).toThrow();
  });

  it('rejects whitespace-only strings', () => {
    expect(() => convexActivityIdSchema.parse('   ')).toThrow();
  });
});

describe('PracticeSubmissionEnvelope branded activityId', () => {
  it('produces a branded activityId after parsing', () => {
    const envelope = practiceSubmissionEnvelopeSchema.parse({
      contractVersion: 'practice.v1',
      activityId: 'act_123',
      mode: 'independent_practice',
      status: 'submitted',
      attemptNumber: 1,
      submittedAt: '2026-04-17T08:00:00Z',
      answers: {},
      parts: [],
    });

    // Runtime: value is unchanged
    expect(envelope.activityId).toBe('act_123');

    // Compile-time: activityId is ConvexActivityId (string & BRAND<'ConvexId'>)
    const _typeCheck: ConvexActivityId = envelope.activityId;
    expect(_typeCheck).toBe('act_123');
  });

  it('brands activityId through buildPracticeSubmissionEnvelope', () => {
    const envelope = buildPracticeSubmissionEnvelope({
      activityId: 'act_456',
      mode: 'assessment',
      answers: { q1: 42 },
    });

    expect(envelope.activityId).toBe('act_456');

    // Compile-time brand check
    const _typeCheck: ConvexActivityId = envelope.activityId;
    expect(_typeCheck).toBe('act_456');
  });
});
