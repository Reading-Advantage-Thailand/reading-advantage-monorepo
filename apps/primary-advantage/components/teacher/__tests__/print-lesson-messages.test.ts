import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import th from "../../../messages/th.json";
import cn from "../../../messages/cn.json";
import tw from "../../../messages/tw.json";
import vi from "../../../messages/vi.json";

const PRINT_KEYS = ["print", "printNow", "printLoading", "printNotReady", "printHint", "printFrameTitle", "printBubbleWait", "printBubbleReady", "printBubbleNotYet", "printNotReadyTitle", "printNotReadyBody"];

describe("TeacherUi.classBook.lesson print keys (S4)", () => {
  it.each([["en", en], ["th", th], ["cn", cn], ["tw", tw], ["vi", vi]] as const)("has every print key as a string in %s", (_name, messages) => {
    const lesson = messages.TeacherUi.classBook.lesson as Record<string, unknown>;
    for (const key of PRINT_KEYS) expect(typeof lesson[key], key).toBe("string");
  });

  it.each([["th", th], ["cn", cn], ["tw", tw], ["vi", vi]] as const)("keeps the lesson keys of %s equal to en", (_name, messages) => {
    expect(Object.keys(messages.TeacherUi.classBook.lesson).sort()).toEqual(Object.keys(en.TeacherUi.classBook.lesson).sort());
  });
});
