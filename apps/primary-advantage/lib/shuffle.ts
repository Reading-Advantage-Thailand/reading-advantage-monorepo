/**
 * Returns a shuffled copy of the array using Fisher-Yates.
 * @param array Source array to shuffle.
 * @returns A new array with the same items in random order.
 */
export function shuffle<T>(array: readonly T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; --i) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
