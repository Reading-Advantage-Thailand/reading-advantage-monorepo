import { z } from "zod";

/** Shared Finance boundary predicate that rejects empty and whitespace-only strings. */
const nonBlankStringSchema = z.string().regex(/\S/u);
const minorUnitSchema = z.string().regex(/^(?:0|[1-9][0-9]*|-[1-9][0-9]*)$/u);
/** Currencies the business settles; every other ISO-4217 code is rejected. */
const settledCurrencies = ["THB", "USD", "JPY"] as const;
const currencySchema = z.enum(settledCurrencies);
const internalEvidenceReferencePattern =
  /^private-evidence:\/\/([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\/[A-Za-z0-9._~-]+)+$/u;

/** Opaque, provider-neutral reference to private Finance Operations evidence. */
export const privateEvidenceReferenceSchema = z
  .string()
  .regex(internalEvidenceReferencePattern)
  .refine(
    (reference) =>
      reference
        .slice("private-evidence://".length)
        .split("/")
        .every((segment) => segment !== "." && segment !== ".."),
    "Evidence references cannot contain traversal segments",
  );

/** Exact money input represented as unsigned or nonzero negative minor-unit digits. */
export const financeMoneyInputSchema = z.strictObject({
  amountMinor: minorUnitSchema,
  currency: currencySchema,
});

/** Money value accepted at a Finance Operations boundary. */
export type FinanceMoneyInput = z.infer<typeof financeMoneyInputSchema>;

/** Company and optional school boundary for a Finance Operations operation. */
export const financeOperationScopeSchema = z.strictObject({
  companyId: nonBlankStringSchema,
  schoolId: nonBlankStringSchema.optional(),
});

/** Validated company and optional school boundary for a finance operation. */
export type FinanceOperationScope = z.infer<typeof financeOperationScopeSchema>;
