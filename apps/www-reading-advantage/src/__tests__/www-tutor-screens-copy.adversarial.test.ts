/**
 * A-63 Phase 2 adversarial controls: screens copy fidelity and locale robustness.
 * Every case passes on the delivered dictionaries and fails on a wrong or hostile one.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { en, th, zh } from "@/locales/pages/products/tutor-advantage";

type Dict = Record<string, unknown>;
type Loc = "en" | "th" | "zh";
const D: Record<Loc, Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};
const LOCALES: readonly Loc[] = ["en", "th", "zh"];

/** Returns every dotted path whose value is a string under a node. */
function stringPaths(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  const out: string[] = [];
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (Array.isArray(value)) {
        value.forEach((item, i) => out.push(...stringPaths(item, `${path}.${i}`)));
      } else {
        out.push(...stringPaths(value, path));
      }
    }
  }
  return out;
}

/** Reads a dotted path as a string, or undefined when absent or not a string. */
function at(node: unknown, path: string): string | undefined {
  let cur: unknown = node;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

const screens = (loc: Loc) => D[loc].screens as Dict;

describe("tutor screens copy adversarial controls", () => {
  it("ADV-C1 no screens leaf is empty or whitespace", () => {
    for (const loc of LOCALES) {
      const paths = stringPaths(screens(loc));
      expect(paths.length).toBeGreaterThan(0);
      for (const path of paths) {
        const value = at(screens(loc), path);
        expect(typeof value).toBe("string");
        expect(value!.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("ADV-C2 en and th screens captions differ with no untranslated placeholder", () => {
    const enItems = screens("en").items as Dict[];
    const thItems = screens("th").items as Dict[];
    expect(enItems.length).toBe(3);
    expect(thItems.length).toBe(3);
    for (let i = 0; i < 3; i += 1) {
      const enCap = enItems[i]!.caption as string;
      const thCap = thItems[i]!.caption as string;
      expect(enCap.trim().length).toBeGreaterThan(0);
      expect(thCap.trim().length).toBeGreaterThan(0);
      expect(thCap).not.toBe(enCap);
    }
    // Spec 6.3's only intentional cross-locale equality is D-10 (zh == en),
    // asserted in ADV-C3. No en/th screens leaf may be identical.
    for (const path of stringPaths(screens("en"))) {
      expect(at(screens("th"), path)).not.toBe(at(screens("en"), path));
    }
  });

  it("ADV-C3 zh screens and the two new live lines equal en at every path (D-10)", () => {
    for (const path of stringPaths(screens("en"))) {
      expect(at(screens("zh"), path)).toBe(at(screens("en"), path));
    }
    expect(at(D.zh, "tutorRole.points.3")).toBe(at(D.en, "tutorRole.points.3"));
    expect(at(D.zh, "faq.items.5.answer")).toBe(at(D.en, "faq.items.5.answer"));
  });

  it("ADV-C4 the two retired income lines are absent anywhere in the tutor locale file", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "locales", "pages", "products", "tutor-advantage.ts"),
      "utf8",
    );
    const retired = [
      "We do not publish income figures. Ask us for the details.",
      "Tutors earn commission under a unilevel commission model, and the system settles it monthly. We do not publish income figures. Use the contact page to ask about the details.",
    ];
    const detect = (text: string) => retired.filter((line) => text.includes(line));
    expect(detect(source)).toEqual([]);

    // Vacuity control: the exact predicate fires when a retired line is present.
    for (const line of retired) {
      expect(detect(`${source}\n${line}`)).toContain(line);
      // Filter-word probe: a hit beside "do not"/"never" is still preserved.
      expect(detect(`note: do not show, never print -> ${line}`)).toContain(line);
    }
  });

  it("ADV-C5 screens key paths match across en, th, zh and item lengths are equal", () => {
    const enPaths = stringPaths(screens("en")).sort();
    const thPaths = stringPaths(screens("th")).sort();
    const zhPaths = stringPaths(screens("zh")).sort();
    expect(enPaths.length).toBeGreaterThan(0);
    expect(enPaths).toEqual(thPaths);
    expect(enPaths).toEqual(zhPaths);
    for (const loc of LOCALES) {
      const items = screens(loc).items as unknown[];
      expect(items.length).toBe(3);
    }
  });
});
