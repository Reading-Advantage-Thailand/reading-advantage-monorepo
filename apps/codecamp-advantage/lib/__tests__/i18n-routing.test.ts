import { describe, it, expect } from "vitest";
import { routing } from "../../i18n/routing";

describe("i18n routing config", () => {
  it("default locale is th", () => {
    expect(routing.defaultLocale).toBe("th");
  });

  it("locales includes th and en", () => {
    expect(routing.locales).toContain("th");
    expect(routing.locales).toContain("en");
    expect(routing.locales).toHaveLength(2);
  });

  it("localePrefix is set to always", () => {
    expect(routing.localePrefix).toBe("always");
  });
});
