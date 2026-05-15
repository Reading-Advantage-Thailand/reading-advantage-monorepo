import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import thMessages from "../../messages/th.json";
import enMessages from "../../messages/en.json";

const badgeNamespaces = ["dashboard", "module"] as const;

describe("lesson-language badge", () => {
  describe("translation keys exist in both locale files", () => {
    for (const ns of badgeNamespaces) {
      it(`has ${ns}.lessonsInEnglish in en.json`, () => {
        expect(
          ((enMessages as Record<string, unknown>)[ns] as Record<string, unknown>)
            .lessonsInEnglish,
        ).toBeDefined();
      });

      it(`has ${ns}.lessonsInEnglish in th.json`, () => {
        expect(
          ((thMessages as Record<string, unknown>)[ns] as Record<string, unknown>)
            .lessonsInEnglish,
        ).toBeDefined();
      });
    }

    it("Thai dashboard translation is not identical to English", () => {
      const enValue = (
        (enMessages as Record<string, unknown>).dashboard as Record<string, unknown>
      ).lessonsInEnglish as string;
      const thValue = (
        (thMessages as Record<string, unknown>).dashboard as Record<string, unknown>
      ).lessonsInEnglish as string;
      expect(enValue).not.toBe(thValue);
    });
  });

  describe("chat system prompt includes lesson content note", () => {
    it("mentions lesson content is English when locale is th", async () => {
      const content = fs.readFileSync(
        path.resolve(__dirname, "../../app/api/chat/route.ts"),
        "utf-8",
      );
      expect(content).toContain("lesson content is written in English");
    });
  });
});
