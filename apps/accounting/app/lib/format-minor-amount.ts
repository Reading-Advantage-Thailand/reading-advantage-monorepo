/**
 * Formats a minor-unit amount as a localized currency value.
 * @param amountMinor Amount in the currency's minor units.
 * @param currency ISO 4217 currency code.
 * @returns The major-unit currency string for display.
 */
export function formatMinorAmount(
  amountMinor: string,
  currency: string,
): string {
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  });
  const exponent = formatter.resolvedOptions().maximumFractionDigits ?? 2;
  const amount = BigInt(amountMinor);
  const isNegative = amount < 0n;
  const absoluteAmount = isNegative ? -amount : amount;
  const scale = 10n ** BigInt(exponent);
  const major = absoluteAmount / scale;
  if (exponent === 0) {
    return `${isNegative ? "-" : ""}${formatter.format(major)}`;
  }
  const fraction = absoluteAmount % scale;
  const fractionText = fraction.toString().padStart(exponent, "0");
  const formatted = formatter
    .formatToParts(major)
    .map((part) => (part.type === "fraction" ? fractionText : part.value))
    .join("");
  return `${isNegative ? "-" : ""}${formatted}`;
}
