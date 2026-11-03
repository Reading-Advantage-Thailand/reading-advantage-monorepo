import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import th from "../../messages/th.json";
import { loadMessages, resolveLocale } from "../i18n-messages";

/**
 * Collects every leaf path of a message tree.
 * @param tree Message tree.
 * @param prefix Current dotted path.
 * @returns Dotted leaf paths.
 */
function leafPaths(tree: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? leafPaths(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe("resolveLocale", () => {
  it("keeps a supported locale", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("th")).toBe("th");
  });

  it("falls back to the default Thai locale", () => {
    expect(resolveLocale(undefined)).toBe("th");
    expect(resolveLocale("")).toBe("th");
    expect(resolveLocale("fr")).toBe("th");
    expect(resolveLocale("EN")).toBe("th");
  });
});

describe("loadMessages", () => {
  it("returns the English catalog unchanged for en", async () => {
    await expect(loadMessages("en")).resolves.toEqual(en);
  });

  it("overlays Thai strings on the English catalog for th", async () => {
    const messages = await loadMessages("th");
    const paths = leafPaths(messages);
    expect(paths).toEqual(expect.arrayContaining(leafPaths(en)));
    expect(paths).toEqual(expect.arrayContaining(leafPaths(th)));
    expect(messages).toMatchObject(th);
  });

  it("rejects an unsupported locale", async () => {
    await expect(loadMessages("fr")).rejects.toThrow(
      "Unsupported locale: fr",
    );
  });
});
