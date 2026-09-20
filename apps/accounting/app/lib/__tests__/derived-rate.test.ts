import { describe, expect, it } from "vitest";
import { derivedRate } from "../derived-rate";

describe("derivedRate", () => {
  it("computes 2dp half-up for $150.00 / ฿5,205.00", () => {
    expect(derivedRate("15000", "520500", "USD")).toBe("34.70");
  });
  it("computes 2dp half-up for $20.00 / ฿692.00 (the original spec example)", () => {
    expect(derivedRate("2000", "69200", "USD")).toBe("34.60");
  });
  it("rounds a repeating decimal half-up at 2dp", () => {
    expect(derivedRate("30000", "100000", "USD")).toBe("3.33");
  });
  it("rounds .005 up at 2dp", () => {
    // source 2000, settled 1010 → 0.505 → half-up to 0.51
    expect(derivedRate("2000", "1010", "USD")).toBe("0.51");
  });
  it("uses zero currency exponent for JPY", () => {
    expect(derivedRate("10000", "230000", "JPY")).toBe("0.23");
  });
  it("uses three-digit currency exponent for KWD", () => {
    expect(derivedRate("1000", "23000", "KWD")).toBe("230.00");
  });
  it("returns an empty string for a non-positive source amount", () => {
    expect(derivedRate("0", "100", "USD")).toBe("");
    expect(derivedRate("-1", "100", "USD")).toBe("");
  });
  it("rejects a non-positive-integer settled amount", () => {
    expect(() => derivedRate("100", "abc", "USD")).toThrow();
    expect(() => derivedRate("100", "0", "USD")).toThrow();
  });
  it("preserves trailing zeros in the fraction", () => {
    expect(derivedRate("100", "20000", "USD")).toBe("200.00");
  });
});
