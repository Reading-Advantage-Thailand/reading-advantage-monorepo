import { describe, expect, it } from "vitest";
import { assertPrintKitSafe } from "../kit-guard.js";
import { PRINT_KIT } from "../kit.generated.js";
import { printKitSchema } from "../contracts.js";

const base = { ...PRINT_KIT };

describe("print kit guard", () => {
  it("accepts the generated kit", () => {
    expect(() => printKitSchema.parse(PRINT_KIT)).not.toThrow();
    expect(() => assertPrintKitSafe(PRINT_KIT)).not.toThrow();
    expect(PRINT_KIT.fonts.filter((f) => f.endsWith(".woff2"))).toHaveLength(20);
    expect(PRINT_KIT.iconsSource).toContain("ISC License");
  });
  it("refuses a script tag", () => {
    expect(() => assertPrintKitSafe({ ...base, template: "<p></p><script>x()</script>" })).toThrow(/script/);
  });
  it("refuses an external URL", () => {
    expect(() => assertPrintKitSafe({ ...base, template: '<img src="https://evil.test/a.png">' })).toThrow(/external/);
    expect(() => assertPrintKitSafe({ ...base, css: "@import url(x.css);" })).toThrow(/external/);
  });
  it("refuses a font file outside the allowlist", () => {
    expect(() => assertPrintKitSafe({ ...base, fonts: ["Comic Sans MS.ttf"] })).toThrow(/not allowed/);
  });
});
