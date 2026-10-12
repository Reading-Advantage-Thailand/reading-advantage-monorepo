import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const LOCALES = ["en", "th", "cn", "tw", "vi"] as const;

/**
 * Lists every leaf key of a message tree as a dotted path.
 * @param node The tree.
 * @param prefix The path so far.
 * @returns The leaf paths.
 */
function leaves(node: unknown, prefix = ""): string[] {
  if (node === null || typeof node !== "object") return [prefix];
  return Object.entries(node).flatMap(([key, value]) => leaves(value, prefix ? `${prefix}.${key}` : key));
}

/**
 * Reads the AdminDashboard namespace of a locale file.
 * @param locale The locale.
 * @returns The namespace tree.
 */
function load(locale: string): Record<string, unknown> {
  const file = path.join(__dirname, "../../../../messages", `${locale}.json`);
  return JSON.parse(readFileSync(file, "utf8")).AdminDashboard;
}

describe("AdminDashboard messages", () => {
  const en = leaves(load("en"));

  it.each(LOCALES.filter((locale) => locale !== "en"))("%s has every key of en and no extra key", (locale) => {
    const keys = leaves(load(locale));
    expect(en.filter((key) => !keys.includes(key))).toEqual([]);
    expect(keys.filter((key) => !en.includes(key))).toEqual([]);
  });

  it("has no message of a deleted component", () => {
    const tree = load("en");
    for (const gone of ["stats", "quickActions", "recentActivity", "systemStatus", "charts", "subtitle", "actions"]) {
      expect(tree[gone]).toBeUndefined();
    }
  });

  it.each(LOCALES)("%s keeps the ICU placeholders of en", (locale) => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\s*[,}]/g)].map((m) => m[1]).sort();
    const a = load("en");
    const b = load(locale);
    for (const key of leaves(a)) {
      const get = (tree: Record<string, unknown>) => key.split(".").reduce<unknown>((n, k) => (n as Record<string, unknown> | undefined)?.[k], tree);
      const left = get(a);
      const right = get(b);
      if (typeof left === "string" && typeof right === "string") expect(placeholders(right), key).toEqual(placeholders(left));
    }
  });
});
