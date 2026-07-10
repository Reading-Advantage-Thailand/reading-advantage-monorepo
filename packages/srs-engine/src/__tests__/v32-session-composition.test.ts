import { describe, expect, it } from 'vitest';

import {
  balanceDueDate,
  fuzzIntervalDays,
  interleaveReviewItems,
} from '../srs/session-composition.js';

type SelectedReview = {
  cardId: string;
  objectiveId: string;
  objectivePriority: 'essential' | 'supporting' | 'extension';
};

const selected: SelectedReview[] = [
  { cardId: 'A1', objectiveId: 'obj-a', objectivePriority: 'essential' },
  { cardId: 'A2', objectiveId: 'obj-a', objectivePriority: 'essential' },
  { cardId: 'A3', objectiveId: 'obj-a', objectivePriority: 'essential' },
  { cardId: 'B1', objectiveId: 'obj-b', objectivePriority: 'supporting' },
  { cardId: 'B2', objectiveId: 'obj-b', objectivePriority: 'supporting' },
  { cardId: 'C1', objectiveId: 'obj-c', objectivePriority: 'extension' },
];

describe('kst-srs.v3.2 §12.7 deterministic session composition', () => {
  it('round-robins review objectives without changing selection membership', () => {
    const result = interleaveReviewItems(selected);
    expect(result.map((item) => item.cardId)).toEqual(['A1', 'B1', 'C1', 'A2', 'B2', 'A3']);
    expect([...result.map((item) => item.cardId)].sort()).toEqual(
      [...selected.map((item) => item.cardId)].sort(),
    );
  });

  it('uses a stable cardId/reps hash and never exceeds plus or minus five percent', () => {
    const input = { cardId: 'card-v32', reps: 7, intervalDays: 20 };
    const first = fuzzIntervalDays(input);
    const second = fuzzIntervalDays(input);
    expect(second).toBe(first);
    expect(first).toBeGreaterThanOrEqual(19);
    expect(first).toBeLessThanOrEqual(21);
  });

  it('chooses the lightest projected day inside the fuzz window deterministically', () => {
    const result = balanceDueDate({
      baseDueDate: '2026-01-10T00:00:00.000Z',
      minimumDueDate: '2026-01-09T00:00:00.000Z',
      maximumDueDate: '2026-01-11T00:00:00.000Z',
      maximumIntervalDays: 365,
      projectedLoadByDate: {
        '2026-01-09': 5,
        '2026-01-10': 3,
        '2026-01-11': 1,
      },
    });
    expect(result).toBe('2026-01-11T00:00:00.000Z');
  });

  it('uses the earliest date as the deterministic equal-load tie-break', () => {
    const result = balanceDueDate({
      baseDueDate: '2026-01-10T00:00:00.000Z',
      minimumDueDate: '2026-01-09T00:00:00.000Z',
      maximumDueDate: '2026-01-11T00:00:00.000Z',
      maximumIntervalDays: 365,
      projectedLoadByDate: {
        '2026-01-09': 2,
        '2026-01-10': 2,
        '2026-01-11': 2,
      },
    });
    expect(result).toBe('2026-01-09T00:00:00.000Z');
  });
});
