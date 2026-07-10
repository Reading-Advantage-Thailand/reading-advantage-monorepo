/** Creates a deterministic pseudo-random generator for reproducible game sessions.
 * @param seed Integer seed supplied by the host or APK test kit.
 * @returns A function yielding values in the half-open range zero to one.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Shuffles a copy of an array with the supplied deterministic generator.
 * @param values Values to reorder without mutating the caller's array.
 * @param random Deterministic random function.
 * @returns A shuffled copy of the values.
 */
export function seededShuffle<T>(
  values: readonly T[],
  random: () => number,
): T[] {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target]!, shuffled[index]!];
  }
  return shuffled;
}
