import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createMockPracticeSubmissionPart,
  createMockPracticeTimingSummary,
} from '../practice/fixtures.js';
import { practiceTimingSummarySchema } from '../practice/contract.js';
import { PracticeTimingSummarySchema } from '../practice/submission.schema.js';

describe('createMockPracticeTimingSummary', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults submittedAt to 60 seconds after now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T23:59:30.000Z'));
    const timing = createMockPracticeTimingSummary();
    expect(timing.startedAt).toBe('2026-11-03T23:59:30.000Z');
    expect(timing.submittedAt).toBe('2026-11-04T00:00:30.000Z');
    expect(timing.wallClockMs).toBe(60000);
    expect(timing.activeMs).toBe(50000);
    expect(timing.idleMs).toBe(10000);
    expect(timing.confidence).toBe('medium');
  });

  it('applies overrides', () => {
    const timing = createMockPracticeTimingSummary({
      startedAt: 'a',
      submittedAt: 'b',
      confidence: 'low',
      activeMs: 1,
    });
    expect(timing).toMatchObject({ startedAt: 'a', submittedAt: 'b', confidence: 'low', activeMs: 1 });
  });

  it('passes both timing schemas by default', () => {
    const timing = createMockPracticeTimingSummary();
    expect(practiceTimingSummarySchema.safeParse(timing).success).toBe(true);
    expect(PracticeTimingSummarySchema.safeParse(timing).success).toBe(true);
  });
});

describe('createMockPracticeSubmissionPart', () => {
  it('defaults partId and rawAnswer', () => {
    expect(createMockPracticeSubmissionPart()).toEqual({ partId: 'mock-part', rawAnswer: null });
  });

  it('applies overrides', () => {
    expect(createMockPracticeSubmissionPart({ partId: 'q1', isCorrect: true })).toEqual({
      partId: 'q1',
      rawAnswer: null,
      isCorrect: true,
    });
  });
});

describe('PracticeTimingSummarySchema', () => {
  const base = createMockPracticeTimingSummary({ startedAt: 's', submittedAt: 'e' });

  it('accepts activeMs equal to wallClockMs', () => {
    expect(PracticeTimingSummarySchema.safeParse({ ...base, activeMs: 60000 }).success).toBe(true);
  });

  it('rejects activeMs above wallClockMs on the activeMs path', () => {
    const result = PracticeTimingSummarySchema.safeParse({ ...base, activeMs: 60001 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['activeMs']);
    expect(result.error?.issues[0].message).toBe('activeMs cannot exceed wallClockMs');
  });

  it('rejects negative idle time', () => {
    expect(PracticeTimingSummarySchema.safeParse({ ...base, idleMs: -1 }).success).toBe(false);
  });
});
