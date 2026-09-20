import { describe, expect, it } from "vitest";

import { financeMoneyInputSchema } from "../contracts.js";

describe("finance operations foundation contracts", () => {
  it("accepts signed base-10 integer minor units and settled currencies only", () => {
    for (const amountMinor of ["0", "250", "-250"]) {
      for (const currency of ["THB", "USD", "JPY"]) {
        expect(
          financeMoneyInputSchema.safeParse({ amountMinor, currency }).success,
        ).toBe(true);
      }
    }

    for (const amountMinor of [
      250,
      12.5,
      "+250",
      "01",
      "-0",
      " 250",
      "250 ",
      "\t250\n",
      "12.5",
      "1e2",
    ]) {
      expect(
        financeMoneyInputSchema.safeParse({ amountMinor, currency: "THB" })
          .success,
      ).toBe(false);
    }

    for (const currency of ["thb", "TH", "THBB", "TH$", "KWD", "XXX", "EUR"]) {
      expect(
        financeMoneyInputSchema.safeParse({ amountMinor: "250", currency })
          .success,
      ).toBe(false);
    }
  });
});
