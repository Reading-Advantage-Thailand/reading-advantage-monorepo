import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import th from "../../../messages/th.json";
import cn from "../../../messages/cn.json";
import tw from "../../../messages/tw.json";
import vi from "../../../messages/vi.json";

const CASE_KEYS = [
  "bubbleOhNo", "bubbleOops", "bubbleNotYet", "toHome", "toClasses", "toStart", "retry",
  "unknownBookTitle", "unknownBookBody", "noLessonTitle", "noLessonBody", "notReadyTitle", "notReadyBody",
  "noClassTitle", "noClassBody", "teacherOnlyTitle", "teacherOnlyBody", "wrongAccountTitle", "wrongAccountBody",
  "unknownAddressTitle", "unknownAddressBody", "retryTitle", "retryBody",
];

describe("BookLink key parity (S4)", () => {
  it("has every case key as a string in en", () => {
    for (const key of CASE_KEYS) expect(typeof (en.BookLink as Record<string, unknown>)[key]).toBe("string");
  });

  it.each([["th", th], ["cn", cn], ["tw", tw], ["vi", vi]] as const)("has the same keys in %s as in en", (_name, messages) => {
    const mine = (messages as unknown as { BookLink: Record<string, unknown> }).BookLink;
    expect(Object.keys(mine).sort()).toEqual(Object.keys(en.BookLink).sort());
    for (const key of CASE_KEYS) expect(typeof mine[key]).toBe("string");
  });

  it("keeps the placeholders of the no-lesson and no-class texts in every file", () => {
    for (const messages of [en, th, cn, tw, vi] as unknown as { BookLink: Record<string, string> }[]) {
      expect(messages.BookLink.noLessonBody).toContain("{book}");
      expect(messages.BookLink.noLessonBody).toContain("{count}");
      expect(messages.BookLink.noClassBody).toContain("{book}");
    }
  });
});
