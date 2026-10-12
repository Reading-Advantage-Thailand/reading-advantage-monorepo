import { describe, expect, it } from "vitest";

import en from "../../../../messages/en.json";
import th from "../../../../messages/th.json";
import cn from "../../../../messages/cn.json";
import tw from "../../../../messages/tw.json";
import vi from "../../../../messages/vi.json";

const KEYS = ["actions.startAgain", "actions.restarting", "restart.title", "restart.body1", "restart.body2", "restart.cancel", "restart.error", "attempt", "attemptXp", "historyNote", "previewNote"];
const read = (tree: unknown, path: string) => path.split(".").reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], (tree as { Lesson: { Summary: unknown } }).Lesson.Summary);

describe("Lesson.Summary restart keys", () => {
  it.each([["en", en], ["th", th], ["cn", cn], ["tw", tw], ["vi", vi]] as const)("has each key as a non-empty string in %s", (_name, messages) => {
    for (const key of KEYS) expect(typeof read(messages, key), key).toBe("string");
    for (const key of KEYS) expect((read(messages, key) as string).length, key).toBeGreaterThan(0);
  });

  it("uses the legacy texts for startAgain and restarting", () => {
    expect(read(th, "actions.startAgain")).toBe("เริ่มเรียนใหม่");
    expect(read(cn, "actions.restarting")).toBe("正在重新开始...");
    expect(read(vi, "actions.startAgain")).toBe("Học lại");
  });
});
