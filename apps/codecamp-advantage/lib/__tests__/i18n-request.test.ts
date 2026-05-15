import { describe, it, expect } from "vitest";
import { resolveLocale, loadMessages } from "../i18n-messages";
import type { NestedMessages } from "../i18n-messages";

describe("i18n request config", () => {
  describe("resolveLocale", () => {
    it("resolves 'th' when requested locale is th", () => {
      expect(resolveLocale("th")).toBe("th");
    });

    it("resolves 'en' when requested locale is en", () => {
      expect(resolveLocale("en")).toBe("en");
    });

    it("falls back to default locale for unknown locales", () => {
      expect(resolveLocale("fr")).toBe("th");
      expect(resolveLocale("de")).toBe("th");
    });

    it("falls back to default locale when locale is undefined", () => {
      expect(resolveLocale(undefined)).toBe("th");
    });
  });

  describe("loadMessages", () => {
    it("loads Thai messages with English fallback for th locale", async () => {
      const messages = (await loadMessages("th")) as NestedMessages;
      const metadata = messages.metadata as NestedMessages;
      expect(metadata.title as string).toBe("CodeCamp Advantage");
      expect(metadata.description as string).toBe(
        "เรียนรู้ Next.js และรูปแบบการทำงานของ Reading Advantage ด้วย AI"
      );
    });

    it("loads English messages for en locale", async () => {
      const messages = (await loadMessages("en")) as NestedMessages;
      const metadata = messages.metadata as NestedMessages;
      expect(metadata.title as string).toBe("CodeCamp Advantage");
      expect(metadata.description as string).toBe(
        "Learn Next.js and the Reading Advantage monorepo patterns with AI"
      );
    });

    it("falls back to English keys for missing Thai keys", async () => {
      const messages = (await loadMessages("th")) as NestedMessages;
      const navigation = messages.navigation as NestedMessages;
      expect(navigation.dashboard as string).toBe("แดชบอร์ด");
      expect(navigation.modules as string).toBe("โมดูล");
    });
  });
});
