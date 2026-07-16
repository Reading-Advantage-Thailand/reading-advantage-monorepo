/**
 * Compares strings by JavaScript code-unit order without consulting locale data.
 * @param left First string in a deterministic identity comparison.
 * @param right Second string in a deterministic identity comparison.
 * @returns Negative, zero, or positive ordering result independent of locale.
 */
export function compareStableStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
