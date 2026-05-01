import { describe, expect, it } from 'vitest';

import {
  buildResponseInput,
  calculateMasteryUpdates,
} from '@/lib/ai/mastery-calculator';

describe('calculateMasteryUpdates', () => {
  it('splits weight evenly across multiple standards', () => {
    const responses = [
      buildResponseInput({
        standardIds: ['std1', 'std2'],
        isCorrect: true,
        weight: 2,
        answeredAt: new Date('2025-10-29T00:00:00.000Z'),
      }),
    ];

    const result = calculateMasteryUpdates({
      responses,
      existingMastery: [],
    });

    expect(result.skipped).toBe(0);
    expect(result.updates).toEqual([
      expect.objectContaining({
        standardId: 'std1',
        masteryLevel: 0.65,
        evidenceCount: 1,
      }),
      expect.objectContaining({
        standardId: 'std2',
        masteryLevel: 0.65,
        evidenceCount: 1,
      }),
    ]);
  });

  it('applies recency decay to previous mastery', () => {
    const responses = [
      buildResponseInput({
        standardIds: ['std1'],
        isCorrect: false,
        weight: 1,
        answeredAt: new Date('2025-10-29T01:00:00.000Z'),
      }),
    ];

    const result = calculateMasteryUpdates({
      responses,
      existingMastery: [
        {
          standardId: 'std1',
          masteryLevel: 0.5,
          evidenceCount: 4,
          lastAssessedAt: new Date('2025-10-28T12:00:00.000Z'),
        },
      ],
    });

    expect(result.updates).toHaveLength(1);
    expect(result.updates[0]).toMatchObject({
      standardId: 'std1',
      masteryLevel: 0.175,
      evidenceCount: 5,
      lastAssessedAt: new Date('2025-10-29T01:00:00.000Z'),
    });
  });

  it('clamps mastery level to the [0,1] range', () => {
    const responses = [
      buildResponseInput({
        standardIds: ['std1'],
        isCorrect: true,
        weight: 1,
        answeredAt: new Date('2025-10-29T03:00:00.000Z'),
      }),
    ];

    const result = calculateMasteryUpdates({
      responses,
      existingMastery: [
        {
          standardId: 'std1',
          masteryLevel: 1.2,
          evidenceCount: 2,
          lastAssessedAt: new Date('2025-10-28T05:00:00.000Z'),
        },
      ],
    });

    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].masteryLevel).toBe(1);
  });

  it('returns empty updates for empty responses', () => {
    const result = calculateMasteryUpdates({
      responses: [],
      existingMastery: [],
    });

    expect(result.updates).toHaveLength(0);
    expect(result.skipped).toBe(0);
  });

  it('counts skipped responses with no mapped standards', () => {
    const responses = [
      buildResponseInput({
        standardIds: [],
        isCorrect: true,
        weight: 1,
        answeredAt: new Date('2025-10-29T04:00:00.000Z'),
      }),
      buildResponseInput({
        standardIds: ['std1'],
        isCorrect: true,
        weight: 1,
        answeredAt: new Date('2025-10-29T04:05:00.000Z'),
      }),
    ];

    const result = calculateMasteryUpdates({
      responses,
      existingMastery: [],
    });

    expect(result.skipped).toBe(1);
    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].standardId).toBe('std1');
  });
});
