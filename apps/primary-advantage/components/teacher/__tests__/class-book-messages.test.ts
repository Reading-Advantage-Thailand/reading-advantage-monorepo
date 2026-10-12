import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import th from "../../../messages/th.json";
import cn from "../../../messages/cn.json";
import tw from "../../../messages/tw.json";
import vi from "../../../messages/vi.json";

const NEW_KEYS = ["none", "emptyCatalogueTitle", "emptyCatalogueBody", "loadErrorTitle", "loadErrorBody", "retry"];

describe("TeacherUi.classBook key parity (S3)", () => {
  it.each([["th", th], ["cn", cn], ["tw", tw], ["vi", vi]] as const)("has the same keys in %s as in en", (_name, messages) => {
    const mine = messages.TeacherUi.classBook as Record<string, unknown>;
    const base = en.TeacherUi.classBook as Record<string, unknown>;
    expect(Object.keys(mine).sort()).toEqual(Object.keys(base).sort());
    for (const key of NEW_KEYS) expect(typeof mine[key]).toBe("string");
  });
});
