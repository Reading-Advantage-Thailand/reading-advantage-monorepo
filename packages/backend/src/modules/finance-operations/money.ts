import {
  financeMoneyInputSchema,
  type FinanceMoneyInput,
} from "./contracts.js";

/** Reason a policy-neutral exact-money operation was rejected. */
export type FinanceMoneyOperationErrorReason =
  "empty-input" | "currency-mismatch";

/** Structured failure from an exact Finance Operations money calculation. */
export class FinanceMoneyOperationError extends Error {
  /** Stable machine-readable rejection reason. */
  readonly reason: FinanceMoneyOperationErrorReason;

  /**
   * Creates a structured exact-money operation error.
   * @param reason Stable rejection reason for callers and tests.
   */
  constructor(reason: FinanceMoneyOperationErrorReason) {
    super(reason);
    this.name = "FinanceMoneyOperationError";
    this.reason = reason;
  }
}

/**
 * Sums canonical minor-unit strings without floating point, conversion, or rounding.
 * @param values Exact money values that must all use the same currency.
 * @returns A canonical exact-money value in the shared currency.
 * @throws FinanceMoneyOperationError when the input is empty or mixes currencies.
 */
export function sumFinanceMoney(
  values: readonly FinanceMoneyInput[],
): FinanceMoneyInput {
  if (values.length === 0) {
    throw new FinanceMoneyOperationError("empty-input");
  }

  const parsed = values.map((value) => financeMoneyInputSchema.parse(value));
  const currency = parsed[0]?.currency;
  if (currency === undefined) {
    throw new FinanceMoneyOperationError("empty-input");
  }
  if (parsed.some((value) => value.currency !== currency)) {
    throw new FinanceMoneyOperationError("currency-mismatch");
  }

  const amountMinor = parsed
    .reduce((total, value) => total + BigInt(value.amountMinor), 0n)
    .toString();
  return financeMoneyInputSchema.parse({ amountMinor, currency });
}
