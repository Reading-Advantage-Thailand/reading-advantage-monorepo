import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "inter-font", variable: "--font-inter" }),
  Noto_Sans_Thai: () => ({
    className: "noto-sans-thai-font",
    variable: "--font-noto-sans-thai",
  }),
}));

const { getBodyFontClass } = await import("../i18n-font");

describe("getBodyFontClass", () => {
  it("includes noto-sans-thai class for th locale", () => {
    const fontClass = getBodyFontClass("th");
    expect(fontClass).toContain("noto-sans-thai-font");
  });

  it("includes inter class for th locale", () => {
    const fontClass = getBodyFontClass("th");
    expect(fontClass).toContain("inter-font");
  });

  it("returns only inter class for en locale", () => {
    const fontClass = getBodyFontClass("en");
    expect(fontClass).toBe("inter-font");
  });
});
