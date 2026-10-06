import { describe, expect, it } from 'vitest';
import { createRng, hashString } from '../sim/rng.js';

describe('seeded rng', () => {
  it('replays the same sequence for a seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(new Set(seqA).size).toBeGreaterThan(15);
  });

  it('differs between seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('int and range stay inside their bounds', () => {
    const rng = createRng(7);
    const ints = Array.from({ length: 500 }, () => rng.int(4));
    expect(Math.min(...ints)).toBe(0);
    expect(Math.max(...ints)).toBe(3);
    const ranges = Array.from({ length: 500 }, () => rng.range(5, 25));
    expect(Math.min(...ranges)).toBe(5);
    expect(Math.max(...ranges)).toBe(25);
  });

  it('shuffle keeps every element and does not touch the input', () => {
    const rng = createRng(3);
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = rng.shuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(out.slice().sort((a, b) => a - b)).toEqual(input);
  });

  it('sample returns distinct elements, at most the list size', () => {
    const rng = createRng(9);
    const out = rng.sample(['a', 'b', 'c'], 5);
    expect(out.length).toBe(3);
    expect(new Set(out).size).toBe(3);
    expect(rng.sample(['a', 'b', 'c'], 2).length).toBe(2);
    expect(rng.sample([], 2)).toEqual([]);
  });

  it('pick throws on an empty list', () => {
    expect(() => createRng(1).pick([])).toThrow();
    expect(['x', 'y']).toContain(createRng(1).pick(['x', 'y']));
  });

  it('hashString is stable and differs between strings', () => {
    expect(hashString('pip-is-brave')).toBe(hashString('pip-is-brave'));
    expect(hashString('pip-is-brave')).not.toBe(hashString('the-school-garden'));
  });
});
