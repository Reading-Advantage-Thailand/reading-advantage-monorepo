import { describe, expect, it } from "vitest";

import en from "../../../../messages/en.json";
import th from "../../../../messages/th.json";
import cn from "../../../../messages/cn.json";
import tw from "../../../../messages/tw.json";
import vi from "../../../../messages/vi.json";

/** The key paths of a nested message object, sorted. */
const paths = (value: unknown, prefix = ""): string[] =>
  typeof value === "object" && value !== null
    ? Object.entries(value).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k)).sort()
    : [prefix];

describe("LessonGames key parity", () => {
  it.each([["th", th], ["cn", cn], ["tw", tw], ["vi", vi]] as const)("has the same keys in %s as in en", (_name, messages) => {
    expect(paths(messages.LessonGames)).toEqual(paths(en.LessonGames));
  });

  it("has a pitch for each lesson game and a string for each key", () => {
    for (const id of ["rpg-battle", "rune-match", "dragon-rider", "enchanted-library", "castle-defense", "potion-rush"]) {
      expect(typeof (en.LessonGames.pitch as Record<string, string>)[id]).toBe("string");
    }
    for (const messages of [en, th, cn, tw, vi]) {
      for (const p of paths(messages.LessonGames)) expect(p).not.toBe("");
    }
  });
});
