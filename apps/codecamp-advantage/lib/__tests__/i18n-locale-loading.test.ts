import { describe, it, expect } from "vitest";
import { routing } from "../../i18n/routing";

describe("Thai locale loading", () => {
  it("th is registered as a valid locale in routing config", () => {
    expect(routing.locales).toContain("th");
  });

  it("th is the default locale", () => {
    expect(routing.defaultLocale).toBe("th");
  });

  it("messages/th.json can be dynamically imported", async () => {
    const messages = await import("../../messages/th.json");
    expect(messages.default).toBeDefined();
    expect(messages.default.metadata).toBeDefined();
    expect(messages.default.metadata.title).toBe("CodeCamp Advantage");
  });

  it("messages/th.json has Thai descriptions", async () => {
    const { default: th } = await import("../../messages/th.json");
    expect(th.metadata.description).toContain("เรียนรู้");
    expect(th.navigation.dashboard).toContain("แดชบอร์ด");
  });

  it("request config resolveLocale returns th for th input", async () => {
    const { resolveLocale } = await import("../i18n-messages");
    expect(resolveLocale("th")).toBe("th");
  });

  it("request config returns th as fallback for unknown locale", async () => {
    const { resolveLocale } = await import("../i18n-messages");
    expect(resolveLocale("xyz")).toBe("th");
  });
});
