/**
 * Seeded random numbers for the game core (mulberry32). Every choice the quest makes comes from
 * one of these, so a seed replays the same item order, distractors, and token shuffles.
 */

export interface Rng {
  /** The next number in [0, 1). */
  next(): number;
  /** An integer in [0, n). */
  int(n: number): number;
  /** An integer in [lo, hi] (both ends included). */
  range(lo: number, hi: number): number;
  /** One element of a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** A shuffled copy (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** Up to `count` distinct elements, in random order. */
  sample<T>(items: readonly T[], count: number): T[];
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number): number => Math.floor(next() * n);
  const shuffle = <T>(items: readonly T[]): T[] => {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const t = out[i]!;
      out[i] = out[j]!;
      out[j] = t;
    }
    return out;
  };
  return {
    next,
    int,
    range: (lo, hi) => lo + int(hi - lo + 1),
    pick: (items) => {
      if (items.length === 0) throw new Error('rng.pick: empty list');
      return items[int(items.length)]!;
    },
    shuffle,
    sample: (items, count) => shuffle(items).slice(0, Math.max(0, count)),
  };
}

/** A 32-bit hash of a string (FNV-1a), for seeds derived from ids. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
