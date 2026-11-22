import { describe, expect, it } from "vitest";
import en from "@/locales/en";
import th from "@/locales/th";
import zh from "@/locales/zh";
import { buildMarketingMetadata } from "@/lib/seo";
import { expectKeysInEveryLocale } from "@/__tests__/fixtures/locale-key-check";

type Dict = Record<string, unknown>;

const MESSAGES: Record<"en" | "th" | "zh", Dict> = {
  en: en as unknown as Dict,
  th: th as unknown as Dict,
  zh: zh as unknown as Dict,
};

/**
 * Reads one locale string by its dotted path.
 * @param locale The locale of the dictionary.
 * @param path The dotted path of the string.
 * @returns The string, or undefined when the path is not a string.
 */
function read(locale: "en" | "th" | "zh", path: string): string | undefined {
  let value: unknown = MESSAGES[locale];
  for (const part of path.split(".")) {
    if (value === null || typeof value !== "object" || !(part in value)) return undefined;
    value = (value as Dict)[part];
  }
  return typeof value === "string" ? value : undefined;
}

/**
 * Collects every string under the STEM Advantage page scope.
 * @param locale The locale of the dictionary.
 * @returns The path and text of each string in the scope.
 */
function stemStrings(locale: "en" | "th" | "zh"): { path: string; text: string }[] {
  const found: { path: string; text: string }[] = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") {
      found.push({ path, text: value });
      return;
    }
    if (value === null || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Dict)) walk(child, `${path}.${key}`);
  };
  walk(MESSAGES[locale].pages, "pages");
  return found.filter((row) => row.path.startsWith("pages.products.stemAdvantage."));
}

/** The en and th date phrases that this change deletes. */
const REMOVED = {
  en: ["release date", "launch date", "no date", "No launch date", "It has no release date"],
  th: ["กำหนดวัน", "วันเปิดตัว"],
} as const;

/**
 * PM decision 2026-11-16: the STEM Advantage page keeps no release or launch date text in en
 * and th. The line before and after each deletion proves the kept text word for word.
 */
const PLACES = [
  {
    key: "pages.products.stemAdvantage.metadata.description",
    line: 4,
    en: "STEM Advantage is on the Reading Advantage product roadmap — planned K-12 coding and STEM book line.",
    th: "STEM Advantage อยู่ในแผนงานผลิตภัณฑ์ของ Reading Advantage — ชุดหนังสือการเขียนโค้ดและ STEM ที่วางแผนไว้",
    removed: { en: " No launch date.", th: " ยังไม่มีกำหนดวันเปิดตัว" },
  },
  {
    key: "pages.products.stemAdvantage.hero.description",
    line: 9,
    en: "STEM Advantage is on our product roadmap — planned K-12 coding and STEM book line. Not to be confused with CodeCamp Advantage, our live adult bootcamp.",
    th: "STEM Advantage อยู่ในแผนงานผลิตภัณฑ์ของเรา — ชุดหนังสือการเขียนโค้ดและ STEM สำหรับ K-12 ที่วางแผนไว้ ไม่ใช่ CodeCamp Advantage ซึ่งเป็นบูตแคมป์สำหรับผู้ใหญ่ที่เปิดให้บริการแล้ว",
    removed: { en: " with no release date", th: " ยังไม่มีกำหนดวันเปิดตัว" },
  },
  {
    key: "pages.products.stemAdvantage.cta.description",
    line: 100,
    en: "STEM Advantage is on our roadmap. Tell us what you need.",
    th: "STEM Advantage อยู่ในแผนงานของเรา บอกเราว่าคุณต้องการอะไร",
    removed: { en: " It has no release date.", th: " ยังไม่มีกำหนดวันเปิดตัว" },
  },
] as const;

describe("www STEM Advantage release-date line (PM decision 2026-11-16)", () => {
  it("holds the STEM kept-line keys in every shipped locale", () => {
    expectKeysInEveryLocale(PLACES.map(({ key }) => key));
  });

  it("keeps the roadmap claim limit on the three kept lines", () => {
    for (const { key } of PLACES) {
      expect(read("en", key)).toContain("roadmap");
      expect(read("th", key)).toContain("แผนงาน");
    }
  });

  it.each(PLACES)("holds no deleted date phrase at $key", ({ key, removed }) => {
    expect(read("en", key)).not.toContain(removed.en);
    expect(read("th", key)).not.toContain(removed.th);
  });

  it("holds no release or launch date text anywhere on the en STEM page", () => {
    const rows = stemStrings("en");
    expect(rows.length).toBeGreaterThan(20);
    for (const row of rows) {
      for (const phrase of REMOVED.en) expect(row.text).not.toContain(phrase);
    }
  });

  it("holds no release or launch date text anywhere on the th STEM page", () => {
    const rows = stemStrings("th");
    expect(rows.length).toBeGreaterThan(20);
    for (const row of rows) {
      for (const phrase of REMOVED.th) expect(row.text).not.toContain(phrase);
    }
  });

  it("keeps the zh STEM lines as they are", () => {
    expectKeysInEveryLocale([
      "pages.products.stemAdvantage.metadata.description",
      "pages.products.stemAdvantage.hero.description",
      "pages.products.stemAdvantage.cta.description",
    ]);
    expect(read("zh", "pages.products.stemAdvantage.metadata.description")).toContain(
      "暂无发布日期",
    );
    expect(read("zh", "pages.products.stemAdvantage.hero.description")).toContain("暂无发布日期");
    expect(read("zh", "pages.products.stemAdvantage.cta.description")).toContain("暂无发布日期");
  });

  it("keeps every other STEM page line key in every shipped locale", () => {
    expectKeysInEveryLocale([
      "pages.products.stemAdvantage.metadata.title",
      "pages.products.stemAdvantage.hero.title",
      "pages.products.stemAdvantage.hero.comingSoon",
      "pages.products.stemAdvantage.cta.heading",
    ]);
  });

  it("keeps the roadmap claim limit on the STEM titles and badge", () => {
    expect(read("en", "pages.products.stemAdvantage.metadata.title")).toMatch(/roadmap/i);
    expect(read("th", "pages.products.stemAdvantage.metadata.title")).toContain("แผนงาน");
    expect(read("en", "pages.products.stemAdvantage.hero.comingSoon")).toMatch(/roadmap/i);
    expect(read("th", "pages.products.stemAdvantage.hero.comingSoon")).toContain("แผนงาน");
  });

  it("keeps the date text out of the meta, og, and twitter descriptions", () => {
    for (const locale of ["en", "th"] as const) {
      const description = read(locale, "pages.products.stemAdvantage.hero.description") ?? "";
      const metadata = buildMarketingMetadata({
        description,
        locale,
        path: "/products/stem-advantage",
        title: read(locale, "pages.products.stemAdvantage.hero.title") ?? "",
      });
      for (const phrase of REMOVED[locale]) {
        expect(description).not.toContain(phrase);
        expect(metadata.description).not.toContain(phrase);
        expect(metadata.openGraph?.description).not.toContain(phrase);
        expect(metadata.twitter?.description).not.toContain(phrase);
      }
    }
  });
});
