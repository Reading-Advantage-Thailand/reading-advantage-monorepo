/**
 * Unit checks for the WCAG contrast fixture. These pin the arithmetic that
 * the R2 contrast tests rely on, including the fault Review A found.
 */
import { describe, expect, it } from "vitest";
import { contrastRatio, parseColor } from "./fixtures/contrast";

describe("WCAG contrast fixture", () => {
  it("puts rgb(120,120,120) on #faf9f7 below the AA floor", () => {
    const ratio = contrastRatio(
      parseColor("rgb(120, 120, 120)"),
      parseColor("#faf9f7"),
    );
    expect(ratio).toBeLessThan(4.5);
    expect(ratio).toBeGreaterThan(4.1);
  });

  it("gives black on white a ratio of 21", () => {
    expect(
      contrastRatio(parseColor("#000000"), parseColor("#ffffff")),
    ).toBeCloseTo(21, 1);
  });

  it("throws on an unresolved colour", () => {
    expect(() => parseColor("var(--color-slate-400)")).toThrow(/Unresolved/);
  });
});
