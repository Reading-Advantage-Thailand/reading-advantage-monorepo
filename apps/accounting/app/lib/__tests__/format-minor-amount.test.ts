import { describe, expect, it } from "vitest";
import { formatMinorAmount } from "../format-minor-amount";

describe("formatMinorAmount", () => {
  it("formats a two-digit currency from minor units", () => {
    expect(formatMinorAmount("15000", "THB")).toBe("THB\u00a0150.00");
    expect(formatMinorAmount("2005", "USD")).toBe("$20.05");
  });

  it("pads a short fraction with leading zeros", () => {
    expect(formatMinorAmount("1", "USD")).toBe("$0.01");
    expect(formatMinorAmount("0", "USD")).toBe("$0.00");
  });

  it("groups thousands in the major part", () => {
    expect(formatMinorAmount("123456789", "USD")).toBe("$1,234,567.89");
  });

  it("keeps a negative sign for refunds and credit notes", () => {
    expect(formatMinorAmount("-15050", "USD")).toBe("-$150.50");
    expect(formatMinorAmount("-1", "USD")).toBe("-$0.01");
  });

  it("uses a zero exponent for JPY without a fraction", () => {
    expect(formatMinorAmount("230000", "JPY")).toBe("¥230,000");
    expect(formatMinorAmount("-5", "JPY")).toBe("-¥5");
  });

  it("uses a three-digit exponent for KWD", () => {
    expect(formatMinorAmount("1234", "KWD")).toBe("KWD\u00a01.234");
    expect(formatMinorAmount("5", "KWD")).toBe("KWD\u00a00.005");
  });

  it("keeps exact cents above the safe integer range", () => {
    expect(formatMinorAmount("900719925474099199", "USD")).toBe(
      "$9,007,199,254,740,991.99",
    );
  });

  it("never rounds the fraction through floating point", () => {
    expect(formatMinorAmount("999", "USD")).toBe("$9.99");
    expect(formatMinorAmount("10000000000000001", "USD")).toBe(
      "$100,000,000,000,000.01",
    );
  });

  it("throws on a non-integer amount string", () => {
    expect(() => formatMinorAmount("1.5", "USD")).toThrow(SyntaxError);
    expect(() => formatMinorAmount("abc", "USD")).toThrow(SyntaxError);
  });

  it("throws on an invalid currency code", () => {
    expect(() => formatMinorAmount("100", "US")).toThrow(RangeError);
  });
});
