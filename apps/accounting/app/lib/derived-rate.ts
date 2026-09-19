/**
 * Returns settled THB ÷ source-amount as a 2dp half-up decimal string.
 * Pure display-time helper; never authoritative, never persisted.
 * @param sourceAmountMinor Positive integer source amount in minor units.
 * @param settledThbMinor Positive integer settled THB amount in minor units.
 * @returns The derived rate as a fixed 2dp decimal string, or an empty string when the source amount is not positive.
 * @throws When the settled amount is not a positive integer string.
 */
export function derivedRate(
  sourceAmountMinor: string,
  settledThbMinor: string,
): string {
  if (!/^[1-9][0-9]*$/u.test(sourceAmountMinor)) {
    return "";
  }
  if (!/^[1-9][0-9]*$/u.test(settledThbMinor)) {
    throw new Error("settledThbMinor must be a positive integer string");
  }
  const source = BigInt(sourceAmountMinor);
  const settled = BigInt(settledThbMinor);
  // Round settled/source to 2dp half-up, integer arithmetic only.
  const hundredths = (settled * 100n + source / 2n) / source;
  const integerPart = hundredths / 100n;
  const fractionPart = hundredths % 100n;
  return `${integerPart}.${fractionPart.toString().padStart(2, "0")}`;
}
