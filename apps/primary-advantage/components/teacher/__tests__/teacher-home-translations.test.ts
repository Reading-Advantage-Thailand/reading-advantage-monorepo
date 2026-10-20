import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import th from "@/messages/th.json";
import cn from "@/messages/cn.json";
import tw from "@/messages/tw.json";
import vi from "@/messages/vi.json";

/** Flattens a message tree to dotted keys. */
function flat(tree: Record<string, unknown>, prefix = ""): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "object" && value ? flat(value as Record<string, unknown>, `${prefix}${key}.`) : [[`${prefix}${key}`, String(value)] as [string, string]],
  );
}

const LOCALES = { th, cn, tw, vi } as const;

describe("teacher home messages", () => {
  for (const [code, messages] of Object.entries(LOCALES)) {
    it(`${code}: no TeacherHome string and no start class string stays English`, () => {
      const own = Object.fromEntries(flat(messages.TeacherHome as Record<string, unknown>));
      const same = flat(en.TeacherHome as Record<string, unknown>).filter(([key, value]) => own[key] === value);
      expect(same.map(([key]) => key)).toEqual([]);
      expect(messages.TeacherUi.startClass).not.toBe(en.TeacherUi.startClass);
      expect(messages.TeacherUi.startClassFor).not.toBe(en.TeacherUi.startClassFor);
    });
  }

  it("has no key that no code uses (classes.students, classes.all)", () => {
    for (const messages of [en, th, cn, tw, vi]) {
      expect(messages.TeacherHome.classes).not.toHaveProperty("students");
      expect(messages.TeacherHome.classes).not.toHaveProperty("all");
    }
  });
});
