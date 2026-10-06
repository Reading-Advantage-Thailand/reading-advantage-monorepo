import { describe, expect, it } from 'vitest';
import { SPREAD_GAP, spreadBoxes, type SpreadBox } from '../sim/spread.js';

const box = (x: number, y: number, extra: Partial<SpreadBox> = {}): SpreadBox => ({ x, y, w: 80, h: 30, minY: 30, maxY: 800, ...extra });

describe('label spread', () => {
  it('keeps labels that do not overlap', () => {
    expect(spreadBoxes([box(50, 200), box(200, 200), box(50, 300)])).toEqual([200, 200, 300]);
  });

  it('moves the lower of two overlapping labels below the higher one', () => {
    const [a, b] = spreadBoxes([box(100, 200), box(120, 210)]);
    expect(a).toBe(200);
    expect(b).toBe(200 + 30 + SPREAD_GAP);
  });

  it('separates a stack of labels pinned at one screen edge', () => {
    const ys = spreadBoxes([box(350, 400), box(350, 400), box(350, 400), box(350, 400)]);
    const sorted = [...ys].sort((p, q) => p - q);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThanOrEqual(30 + SPREAD_GAP);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(30);
  });

  it('moves a label up when the range below is full', () => {
    const [, b] = spreadBoxes([box(100, 790, { maxY: 800 }), box(100, 795, { maxY: 800 })]);
    expect(b).toBe(790 - 30 - SPREAD_GAP);
  });

  it('keeps a label in place when no free position is in its range', () => {
    const ys = spreadBoxes([box(100, 60, { minY: 60, maxY: 60 }), box(100, 60, { minY: 60, maxY: 60 })]);
    expect(ys).toEqual([60, 60]);
  });
});
