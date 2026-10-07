import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import th from "../../messages/th.json";
import cn from "../../messages/cn.json";
import tw from "../../messages/tw.json";
import vi from "../../messages/vi.json";
import { PUBLIC_NAMESPACES, usesEnglishPublicPages, withPublicFallback } from "../public-fallback";

type Messages = Record<string, unknown>;

/** Lists the key paths of a message tree; an array counts as one key. */
function keyPaths(tree: unknown, prefix = ""): string[] {
  if (tree === null || typeof tree !== "object" || Array.isArray(tree)) return [prefix];
  return Object.entries(tree as Messages).flatMap(([key, value]) => keyPaths(value, prefix ? `${prefix}.${key}` : key));
}

describe("public page namespaces", () => {
  it("have the same keys in en, th, cn, and tw", () => {
    for (const namespace of PUBLIC_NAMESPACES) {
      const expected = keyPaths((en as Messages)[namespace]).sort();
      expect(expected.length).toBeGreaterThan(0);
      for (const locale of [th, cn, tw] as Messages[]) {
        expect(keyPaths(locale[namespace]).sort()).toEqual(expected);
      }
    }
  });

  it("are not in the vi file, and vi reads them in English", () => {
    for (const namespace of PUBLIC_NAMESPACES) expect((vi as Messages)[namespace]).toBeUndefined();
    expect(usesEnglishPublicPages("vi")).toBe(true);
    const merged = withPublicFallback(vi as Messages, en as Messages);
    for (const namespace of PUBLIC_NAMESPACES) expect(merged[namespace]).toEqual((en as Messages)[namespace]);
    expect(merged.MainNav).toEqual((vi as Messages).MainNav);
  });

  it("keep their own strings for the other locales", () => {
    for (const locale of ["en", "th", "cn", "tw"]) expect(usesEnglishPublicPages(locale)).toBe(false);
  });

  it("does not change the input messages", () => {
    const messages: Messages = { MainNav: { home: "Trang chủ" } };
    withPublicFallback(messages, en as Messages);
    expect(messages).toEqual({ MainNav: { home: "Trang chủ" } });
  });
});
